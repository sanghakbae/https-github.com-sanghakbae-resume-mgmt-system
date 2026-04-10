import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Download, Eye, FileUp, LogOut, Pencil, RotateCcw, Save, ShieldAlert, ShieldCheck } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { LoginPage } from "@/components/auth/login-page";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CompanyForm } from "@/components/resume/company-form";
import { ExperienceForm } from "@/components/resume/experience-form";
import { ProfileForm } from "@/components/resume/profile-form";
import { CareerDashboard, ResumePreview } from "@/components/resume/resume-preview";
import { categoryOptions, defaultCompanyProfiles, defaultExperiences, defaultProfile, emptyCompanyForm, emptyExperienceForm } from "@/data/resume";
import { useGoogleAuth } from "@/hooks/use-google-auth";
import { useResumeWorkspace } from "@/hooks/use-resume-workspace";
import { isGeminiReviewConfigured, requestProjectReview } from "@/lib/gemini-review";
import { prepareProfilePhoto } from "@/lib/profile-photo";
import { isSupabaseConfigured, uploadResumeAsset } from "@/lib/supabase";
import type {
  CompanyFormValues,
  CompanyProfile,
  CompanyValidationErrors,
  ExperienceFormValues,
  ExperienceItem,
  ExperienceValidationErrors,
  ProjectReviewResult,
  ResumeCategory,
  ResumeWorkspace,
  WorkspaceSummary,
} from "@/types/resume";

const DEFAULT_GOOGLE_CLIENT_ID = "924920443826-lo1msns5cgvnh7u1714ikcqj2fq4srji.apps.googleusercontent.com";

function validateExperience(form: ExperienceFormValues): ExperienceValidationErrors {
  const errors: ExperienceValidationErrors = {};

  if (!form.title.trim()) errors.title = "업무명 또는 프로젝트명을 입력하세요.";
  if (!form.organization.trim()) errors.organization = "고객사 또는 조직명을 입력하세요.";
  if (!form.period.trim()) errors.period = "기간을 입력하세요.";
  if (!form.description.trim()) errors.description = "업무 설명을 입력하세요.";

  return errors;
}

function validateCompany(form: CompanyFormValues): CompanyValidationErrors {
  const errors: CompanyValidationErrors = {};

  if (!form.organization.trim()) errors.organization = "회사명을 입력하세요.";
  if (!form.period.trim()) errors.period = "재직 기간을 입력하세요.";
  if (!form.summary.trim()) errors.summary = "회사 요약을 입력하세요.";
  if (!form.responsibilities.trim()) errors.responsibilities = "핵심 업무를 입력하세요.";

  return errors;
}

export default function App() {
  const googleClientId = ((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || DEFAULT_GOOGLE_CLIENT_ID).trim();
  const isPublicResumeMode = ((import.meta.env.VITE_PUBLIC_RESUME_MODE as string | undefined) ?? "false") === "true";
  const { user, isReady, error: authError, signIn, signOut } = useGoogleAuth();
  const adminEmails = ((import.meta.env.VITE_ADMIN_EMAILS as string | undefined) ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const editorEmails = ((import.meta.env.VITE_EDITOR_EMAILS as string | undefined) ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = !isPublicResumeMode && user ? adminEmails.includes(user.email.toLowerCase()) : false;
  const isPublicEditor = isPublicResumeMode && user ? editorEmails.includes(user.email.toLowerCase()) : false;
  const [isEditMode, setIsEditMode] = useState(true);
  const [companyForm, setCompanyForm] = useState<CompanyFormValues>(emptyCompanyForm);
  const [companyErrors, setCompanyErrors] = useState<CompanyValidationErrors>({});
  const [editingCompanyOrganization, setEditingCompanyOrganization] = useState<string | null>(null);
  const [form, setForm] = useState<ExperienceFormValues>(emptyExperienceForm);
  const [formErrors, setFormErrors] = useState<ExperienceValidationErrors>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isUploadingProfilePhoto, setIsUploadingProfilePhoto] = useState(false);
  const [isUploadingExperienceImage, setIsUploadingExperienceImage] = useState(false);
  const [assetUploadError, setAssetUploadError] = useState<string | null>(null);
  const [isAutoTaggingProject, setIsAutoTaggingProject] = useState(false);
  const [projectReviewError, setProjectReviewError] = useState<string | null>(null);
  const [projectReviewChoice, setProjectReviewChoice] = useState<{
    mode: "create" | "update";
    original: ExperienceItem;
    suggested: ExperienceItem;
    review: ProjectReviewResult;
    geminiAvailable: boolean;
  } | null>(null);
  const importWorkspaceInputRef = useRef<HTMLInputElement | null>(null);
  const exportSectionRef = useRef<HTMLDivElement | null>(null);
  const activeOwnerId = isPublicResumeMode ? "public-resume" : isAdmin ? selectedOwnerId ?? user?.sub ?? "" : user?.sub ?? "";
  const effectiveIsEditMode = isPublicResumeMode ? isPublicEditor && isEditMode : isEditMode;
  const canSaveWorkspace = !isPublicResumeMode || isPublicEditor;
  const {
    profile,
    setProfile,
    companies,
    setCompanies,
    experiences,
    setExperiences,
    isLoading,
    isSaving,
    error: workspaceError,
    updatedAt,
    showSavedNotice,
    storageMode,
    resetWorkspace,
    listWorkspaces,
    saveNow,
    replaceWorkspace,
  } = useResumeWorkspace({
    ownerId: activeOwnerId,
    defaultProfile,
    defaultCompanies: defaultCompanyProfiles,
    defaultExperiences,
    canSave: canSaveWorkspace,
  });
  const [workspaceSummaries, setWorkspaceSummaries] = useState<WorkspaceSummary[]>([]);
  const headerButtonClass = "min-h-7 px-2.5 py-0.5 text-[11px] leading-4 md:text-[11px]";

  useEffect(() => {
    if (isPublicResumeMode) return;
    if (!user) return;
    setSelectedOwnerId(user.sub);
  }, [isPublicResumeMode, user]);

  useEffect(() => {
    if (!isAdmin || storageMode !== "local") return;
    setWorkspaceSummaries(listWorkspaces());
  }, [experiences, isAdmin, listWorkspaces, profile, storageMode, updatedAt]);

  const groupedExperiences = useMemo(() => {
    const groups = new Map<ResumeCategory, ExperienceItem[]>();

    for (const item of experiences) {
      const current = groups.get(item.category) ?? [];
      current.push(item);
      groups.set(item.category, current);
    }

    return groups;
  }, [experiences]);
  const allExperiences = useMemo(
    () => categoryOptions.flatMap((category) => groupedExperiences.get(category) ?? []),
    [groupedExperiences],
  );

  const resetExperienceForm = () => {
    setForm(emptyExperienceForm);
    setFormErrors({});
    setProjectReviewError(null);
    setEditingId(null);
  };

  const resetCompanyForm = () => {
    setCompanyForm(emptyCompanyForm);
    setCompanyErrors({});
    setEditingCompanyOrganization(null);
  };

  const submitCompany = () => {
    const errors = validateCompany(companyForm);
    setCompanyErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const nextCompany: CompanyProfile = {
      organization: companyForm.organization.trim(),
      department: companyForm.department.trim() || undefined,
      position: companyForm.position.trim() || undefined,
      period: companyForm.period.trim(),
      summary: companyForm.summary.trim(),
      responsibilities: companyForm.responsibilities
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
    };

    setCompanies((prev) => {
      if (!editingCompanyOrganization) {
        return [nextCompany, ...prev.filter((item) => item.organization !== nextCompany.organization)];
      }

      return prev.map((item) => (item.organization === editingCompanyOrganization ? nextCompany : item));
    });

    if (editingCompanyOrganization && editingCompanyOrganization !== nextCompany.organization) {
      setExperiences((prev) =>
        prev.map((item) =>
          item.organization === editingCompanyOrganization ? { ...item, organization: nextCompany.organization } : item,
        ),
      );
    }

    resetCompanyForm();
  };

  const submitExperience = async () => {
    const errors = validateExperience(form);
    setFormErrors(errors);
    setProjectReviewError(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const manualHighlights = form.highlight
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const nextItem: ExperienceItem = {
      id: editingId ?? Date.now(),
      title: form.title.trim(),
      organization: form.organization.trim(),
      period: form.period.trim(),
      category: form.category,
      description: form.description,
      highlight: manualHighlights,
      url: form.url.trim() || undefined,
      image: form.image || undefined,
    };

    setIsAutoTaggingProject(true);

    try {
      if (!isGeminiReviewConfigured()) {
        commitExperience(nextItem);
        return;
      }

      const review = await retryProjectReview(nextItem, 3);

      setProjectReviewChoice({
        mode: editingId === null ? "create" : "update",
        original: nextItem,
        suggested: {
          ...nextItem,
          description: review.suggestedDescription || nextItem.description,
          highlight: [...new Set([...nextItem.highlight, ...review.suggestedTags])],
        },
        review,
        geminiAvailable: true,
      });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gemini 검토에 실패했습니다.";
      setProjectReviewError(`${message} 현재 작성 내용으로 저장합니다.`);
      commitExperience(nextItem);
      return;
    } finally {
      setIsAutoTaggingProject(false);
    }
  };

  const commitExperience = (nextItem: ExperienceItem) => {
    setExperiences((prev) => {
      if (editingId === null) {
        return [nextItem, ...prev];
      }

      return prev.map((item) => (item.id === editingId ? nextItem : item));
    });

    setProjectReviewChoice(null);
    resetExperienceForm();
  };

  const retryProjectReview = async (item: ExperienceItem, attempts: number): Promise<ProjectReviewResult> => {
    let lastError: unknown;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await requestProjectReview({
          title: item.title,
          organization: item.organization,
          category: item.category,
          description: item.description,
          existingTags: item.highlight,
        });
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error("Gemini review failed");
  };

  const startEditingExperience = (item: ExperienceItem) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      organization: item.organization,
      period: item.period,
      category: item.category,
      description: item.description,
      highlight: item.highlight.join(", "),
      url: item.url ?? "",
      image: item.image ?? "",
    });
    setFormErrors({});
    setIsEditMode(true);
  };

  const removeExperience = (id: number) => {
    setExperiences((prev) => prev.filter((item) => item.id !== id));

    if (editingId === id) {
      resetExperienceForm();
    }
  };

  const startEditingCompany = (company: CompanyProfile) => {
    setEditingCompanyOrganization(company.organization);
    setCompanyForm({
      organization: company.organization,
      department: company.department ?? "",
      position: company.position ?? "",
      period: company.period ?? "",
      summary: company.summary,
      responsibilities: company.responsibilities.join("\n"),
    });
    setCompanyErrors({});
    setIsEditMode(true);
  };

  const removeCompany = (organization: string) => {
    setCompanies((prev) => prev.filter((company) => company.organization !== organization));

    if (editingCompanyOrganization === organization) {
      resetCompanyForm();
    }
  };

  const restoreSampleData = () => {
    resetWorkspace();
    resetCompanyForm();
    resetExperienceForm();
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }

        reject(new Error("Failed to read file"));
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  const uploadProfilePhoto = async (file: File) => {
    setIsUploadingProfilePhoto(true);
    setAssetUploadError(null);

    try {
      const preparedFile = await prepareProfilePhoto(file);

      if (!isSupabaseConfigured) {
        const dataUrl = await readFileAsDataUrl(preparedFile);
        setProfile((prev) => ({ ...prev, photo: dataUrl }));
        return;
      }

      const publicUrl = await uploadResumeAsset(preparedFile, activeOwnerId, "profile");
      setProfile((prev) => ({ ...prev, photo: publicUrl }));
    } catch {
      setAssetUploadError("프로필 사진을 업로드하지 못했습니다. 잠시 후 다시 시도하세요.");
    } finally {
      setIsUploadingProfilePhoto(false);
    }
  };

  const uploadExperienceImage = async (file: File) => {
    setIsUploadingExperienceImage(true);
    setAssetUploadError(null);

    try {
      if (!isSupabaseConfigured) {
        const dataUrl = await readFileAsDataUrl(file);
        setForm((prev) => ({ ...prev, image: dataUrl }));
        return;
      }

      const publicUrl = await uploadResumeAsset(file, activeOwnerId, "experience");
      setForm((prev) => ({ ...prev, image: publicUrl }));
    } catch {
      setAssetUploadError("업무 이미지를 업로드하지 못했습니다. 잠시 후 다시 시도하세요.");
    } finally {
      setIsUploadingExperienceImage(false);
    }
  };

  const buildWorkspaceSnapshot = (): ResumeWorkspace => ({
    ownerId: activeOwnerId,
    editorEmail: null,
    profile,
    companies,
    experiences,
    updatedAt: new Date().toISOString(),
  });

  const exportWorkspaceJson = () => {
    const snapshot = buildWorkspaceSnapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = (profile.name || "resume").replace(/\s+/g, "-").toLowerCase();

    link.href = downloadUrl;
    link.download = `${safeName}-workspace.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
  };

  const isValidImportedWorkspace = (value: unknown): value is Partial<ResumeWorkspace> & Pick<ResumeWorkspace, "profile" | "companies" | "experiences"> => {
    if (!value || typeof value !== "object") return false;

    const candidate = value as Record<string, unknown>;

    return Boolean(
      candidate.profile &&
        typeof candidate.profile === "object" &&
        Array.isArray(candidate.companies) &&
        Array.isArray(candidate.experiences),
    );
  };

  const importWorkspaceJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as unknown;

      if (!isValidImportedWorkspace(parsed)) {
        throw new Error("invalid-workspace");
      }

      await replaceWorkspace({
        ownerId: activeOwnerId,
        editorEmail: parsed.editorEmail ?? null,
        profile: parsed.profile,
        companies: parsed.companies,
        experiences: parsed.experiences,
        updatedAt: new Date().toISOString(),
      });

      resetCompanyForm();
      resetExperienceForm();
      setAssetUploadError(null);
    } catch {
      setAssetUploadError("작업공간 JSON을 불러오지 못했습니다. 형식을 확인하세요.");
    }
  };

  const exportPdf = () => {
    const exportNode = exportSectionRef.current;
    if (!exportNode || isExportingPdf) return;

    setIsExportingPdf(true);

    window.setTimeout(async () => {
      const snapshotNode = createExportSnapshotNode(exportNode);
      document.body.appendChild(snapshotNode);

      try {
        paginateExportSnapshot(snapshotNode);

        const canvas = await html2canvas(snapshotNode, {
          backgroundColor: "#f1f5f9",
          scale: 2,
          useCORS: true,
          scrollX: 0,
          scrollY: 0,
          width: snapshotNode.scrollWidth,
          height: snapshotNode.scrollHeight,
          windowWidth: snapshotNode.scrollWidth,
          windowHeight: snapshotNode.scrollHeight,
        });

        const pdf = new jsPDF("p", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imageWidth = pageWidth;
        const imageHeight = (canvas.height * imageWidth) / canvas.width;
        let remainingHeight = imageHeight;
        let position = 0;

        const imageData = canvas.toDataURL("image/png");
        pdf.addImage(imageData, "PNG", 0, position, imageWidth, imageHeight);
        remainingHeight -= pageHeight;

        while (remainingHeight > 0) {
          position = remainingHeight - imageHeight;
          pdf.addPage();
          pdf.addImage(imageData, "PNG", 0, position, imageWidth, imageHeight);
          remainingHeight -= pageHeight;
        }

        pdf.save(`${profile.name || "resume"}-dashboard.pdf`);
      } finally {
        snapshotNode.remove();
        setIsExportingPdf(false);
      }
    }, 50);
  };

  if (!isPublicResumeMode && !user) {
    return <LoginPage clientId={googleClientId} isReady={isReady} error={authError} onLogin={signIn} />;
  }

  return (
    <div className="resume-app h-screen overflow-hidden bg-slate-100 px-3 py-4 sm:px-4 md:px-6 md:py-6">
      <input ref={importWorkspaceInputRef} type="file" accept="application/json" className="hidden" onChange={importWorkspaceJson} />
      {showSavedNotice ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4 screen-only">
          <div className="rounded-[16px] border border-emerald-200 bg-white/95 px-6 py-4 text-center shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur">
            <p className="text-base font-semibold text-slate-900">저장되었습니다</p>
          </div>
        </div>
      ) : null}
      {projectReviewChoice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 screen-only">
          <div className="max-h-full w-full max-w-5xl overflow-y-auto rounded-[20px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="text-lg font-semibold text-slate-950">
                {projectReviewChoice.mode === "create" ? "등록 내용 선택" : "수정 내용 선택"}
              </p>
              <p className="mt-1 text-[13px] leading-5 text-slate-500">
                작성한 내용과 Gemini 제안을 비교한 뒤 등록할 버전을 선택하세요.
              </p>
            </div>
            <div className="grid gap-4 p-5 lg:grid-cols-2">
              <ProjectReviewOptionCard
                title="As-Is"
                description={projectReviewChoice.original.description}
                tags={projectReviewChoice.original.highlight}
                buttonLabel={projectReviewChoice.mode === "create" ? "As-Is로 등록" : "As-Is로 저장"}
                onSelect={() => commitExperience(projectReviewChoice.original)}
              />
              <ProjectReviewOptionCard
                title="To-Be"
                helper={projectReviewChoice.geminiAvailable ? projectReviewChoice.review.summary : "Gemini 제안을 받지 못해 현재 내용 기준으로 표시합니다."}
                description={projectReviewChoice.suggested.description}
                tags={projectReviewChoice.suggested.highlight}
                buttonLabel={projectReviewChoice.mode === "create" ? "To-Be로 등록" : "To-Be로 저장"}
                onSelect={() => commitExperience(projectReviewChoice.suggested)}
              />
            </div>
            <div className="flex justify-end border-t border-slate-200 px-5 py-4">
              <Button className="border border-slate-200 bg-white text-slate-700" onClick={() => setProjectReviewChoice(null)}>
                계속 수정
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex h-full flex-col gap-3 md:gap-5">
        <Card className="z-30 shrink-0 rounded-[10px] border border-slate-200 bg-white/95 shadow-sm backdrop-blur screen-only">
          <CardContent className="flex flex-col gap-3 p-3.5 sm:p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[13px] leading-5 text-slate-500">이력 관리</p>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">이력서 페이지</h1>
              <p className="mt-1 text-[13px] leading-5 text-slate-500">
                {isPublicResumeMode
                  ? isPublicEditor
                    ? "공개 이력서 페이지입니다. 본인 계정으로 로그인되어 현재 브라우저에서 편집할 수 있습니다."
                    : "공개 이력서 페이지입니다. 접속한 누구나 동일한 이력서를 볼 수 있습니다."
                  : `${user?.name ?? ""} 계정으로 로그인되어 있습니다. ${isAdmin ? "관리자 권한으로 작업공간 전환이 가능합니다." : "내용은 사용자별 작업 공간에 저장됩니다."}`}
              </p>
            </div>

            <div className="grid w-full gap-2 md:flex md:w-auto md:flex-wrap">
              {!isPublicResumeMode ? (
                <>
                  <div className="flex w-full items-center gap-3 rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-2 md:w-auto">
                    {user?.picture ? <img src={user.picture} alt={user.name} className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" /> : null}
                    <div className="min-w-0 text-left">
                      <p className="truncate text-[13px] font-medium leading-5 text-slate-900">{user?.name}</p>
                      <p className="truncate text-[12px] leading-4 text-slate-500">{user?.email}</p>
                    </div>
                  </div>
                  {isAdmin ? (
                    <div className="flex w-full items-center gap-2 rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-medium leading-4 text-emerald-700 md:w-auto">
                      <ShieldCheck className="h-4 w-4" />
                      관리자
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="flex w-full items-center gap-2 rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-medium leading-4 text-slate-600 md:w-auto">
                    {isPublicEditor ? "공개용 레주메 · 편집 가능" : "공개용 레주메"}
                  </div>
                  {user ? (
                    <div className="flex w-full items-center gap-3 rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-2 md:w-auto">
                      {user.picture ? <img src={user.picture} alt={user.name} className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" /> : null}
                      <div className="min-w-0 text-left">
                        <p className="truncate text-[13px] font-medium leading-5 text-slate-900">{user.name}</p>
                        <p className="truncate text-[12px] leading-4 text-slate-500">
                          {isPublicEditor ? "편집 권한 계정" : "읽기 전용 계정"}
                        </p>
                      </div>
                    </div>
                  ) : null}
                  {!user && googleClientId ? (
                    <div className="w-full min-w-[220px] md:w-[280px]">
                      <GoogleSignInButton clientId={googleClientId} disabled={!isReady} onSuccess={signIn} />
                    </div>
                  ) : null}
                  {!user && !googleClientId ? (
                    <div className="flex w-full items-center rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-4 text-amber-700 md:w-auto">
                      현재 배포본에 Google 로그인 설정이 연결되지 않아 편집 로그인을 사용할 수 없습니다.
                    </div>
                  ) : null}
                  {authError ? (
                    <div className="flex w-full items-center rounded-[10px] border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] leading-4 text-rose-700 md:w-auto">
                      {authError}
                    </div>
                  ) : null}
                  {assetUploadError ? (
                    <div className="flex w-full items-center rounded-[10px] border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] leading-4 text-rose-700 md:w-auto">
                      {assetUploadError}
                    </div>
                  ) : null}
                </>
              )}
              {!isPublicResumeMode || isPublicEditor ? (
                <>
                  <Button
                    className={`${headerButtonClass} ${isEditMode ? "w-full border border-slate-900 bg-slate-900 text-white md:w-auto" : "w-full border border-slate-200 bg-white text-slate-700 md:w-auto"}`}
                    onClick={() => setIsEditMode(true)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    편집 모드
                  </Button>
                  <Button
                    className={`${headerButtonClass} ${!isEditMode ? "w-full border border-slate-900 bg-slate-900 text-white md:w-auto" : "w-full border border-slate-200 bg-white text-slate-700 md:w-auto"}`}
                    onClick={() => setIsEditMode(false)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    공개 보기
                  </Button>
                  {!isPublicResumeMode ? (
                    <Button className={`${headerButtonClass} w-full border border-slate-200 bg-white text-slate-700 md:w-auto`} onClick={restoreSampleData}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      샘플 복원
                    </Button>
                  ) : null}
                  <Button className={`${headerButtonClass} w-full border border-slate-200 bg-white text-slate-700 md:w-auto`} onClick={exportWorkspaceJson}>
                    <Download className="mr-2 h-4 w-4" />
                    JSON 내보내기
                  </Button>
                  <Button
                    className={`${headerButtonClass} w-full border border-slate-200 bg-white text-slate-700 md:w-auto`}
                    onClick={() => importWorkspaceInputRef.current?.click()}
                  >
                    <FileUp className="mr-2 h-4 w-4" />
                    JSON 가져오기
                  </Button>
                  <Button
                    className={`${headerButtonClass} ${effectiveIsEditMode ? "w-full border border-sky-900 bg-sky-900 text-white md:w-auto" : "w-full border border-slate-200 bg-white text-slate-700 md:w-auto"}`}
                    onClick={() => void saveNow()}
                    disabled={isSaving}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "저장 중" : effectiveIsEditMode ? "저장" : "임시저장"}
                  </Button>
                </>
              ) : null}
              <Button className={`${headerButtonClass} w-full border border-slate-200 bg-white text-slate-700 md:w-auto`} onClick={exportPdf} disabled={isExportingPdf}>
                <Download className="mr-2 h-4 w-4" />
                {isExportingPdf ? "PDF 생성 중" : "PDF 저장"}
              </Button>
              {!isPublicResumeMode || user ? (
                <Button className={`${headerButtonClass} w-full border border-slate-200 bg-white text-slate-700 md:w-auto`} onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {isPublicResumeMode ? "편집 로그아웃" : "로그아웃"}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <div ref={exportSectionRef} className="space-y-4 md:space-y-5 pb-4">
            {allExperiences.length ? (
              <div data-export-dashboard>
                <CareerDashboard items={allExperiences} profile={profile} companies={companies} />
              </div>
            ) : null}

            <div className={`grid gap-4 pt-1 md:gap-5 ${effectiveIsEditMode ? "xl:grid-cols-[360px_1fr]" : "grid-cols-1"}`}>
              {effectiveIsEditMode && (
                <div className="space-y-4 md:space-y-5">
                  <Card className="rounded-[10px] border border-slate-200 bg-white shadow-sm screen-only">
                    <CardContent className="space-y-3 p-3.5 sm:p-4">
                      <div>
                        <h2 className="text-base font-semibold leading-6">저장 상태</h2>
                        <p className="text-[13px] leading-5 text-slate-500">
                          {workspaceError
                            ? workspaceError
                            : isLoading
                              ? "작업공간을 불러오는 중입니다."
                              : isSaving
                                ? `저장 중입니다. (${storageMode.toUpperCase()})`
                                : `저장됨 · ${storageMode.toUpperCase()}${updatedAt ? ` · ${formatUpdatedAt(updatedAt)}` : ""}`}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  {isAdmin ? (
                    <AdminWorkspacePanel
                      currentUserId={user.sub}
                      activeOwnerId={activeOwnerId}
                      workspaces={workspaceSummaries}
                      onSelect={setSelectedOwnerId}
                    />
                  ) : null}
                  {isPublicResumeMode ? (
                    <Card className="rounded-[10px] border border-amber-200 bg-amber-50 shadow-sm screen-only">
                      <CardContent className="space-y-2 p-3.5 sm:p-4">
                        <h2 className="text-base font-semibold leading-6 text-amber-900">공개 페이지 편집 안내</h2>
                        <p className="text-[13px] leading-5 text-amber-800">
                          현재 편집은 이 브라우저 작업공간에 저장됩니다. GitHub Pages 정적 배포본 특성상 수정 내용이 모든 방문자에게 즉시 공유되지는 않습니다.
                        </p>
                      </CardContent>
                    </Card>
                  ) : null}
                  <ProfileForm
                    ownerId={activeOwnerId}
                    profile={profile}
                    isUploading={isUploadingProfilePhoto}
                    onChange={setProfile}
                    onUploadPhoto={uploadProfilePhoto}
                  />
                  <CompanyForm
                    form={companyForm}
                    errors={companyErrors}
                    editingOrganization={editingCompanyOrganization}
                    companies={companies}
                    onChange={setCompanyForm}
                    onSubmit={submitCompany}
                    onEdit={startEditingCompany}
                    onRemove={removeCompany}
                    onCancel={resetCompanyForm}
                  />
                  <ExperienceForm
                    ownerId={activeOwnerId}
                    form={form}
                    errors={formErrors}
                    editingId={editingId}
                    organizations={companies.map((company) => company.organization)}
                    isUploading={isUploadingExperienceImage}
                    isAutoTagging={isAutoTaggingProject}
                    reviewError={projectReviewError}
                    onChange={setForm}
                    onSubmit={() => void submitExperience()}
                    onCancel={resetExperienceForm}
                    onUploadImage={uploadExperienceImage}
                  />
                </div>
              )}

              <div className="space-y-4 md:space-y-5 print-content">
              <ResumePreview
                isEditMode={effectiveIsEditMode}
                profile={profile}
                companies={companies}
                experiences={allExperiences}
                onEditExperience={startEditingExperience}
                onRemoveExperience={removeExperience}
              />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminWorkspacePanel({
  currentUserId,
  activeOwnerId,
  workspaces,
  onSelect,
}: {
  currentUserId: string;
  activeOwnerId: string;
  workspaces: WorkspaceSummary[];
  onSelect: (ownerId: string) => void;
}) {
  return (
    <Card className="rounded-[10px] border border-slate-200 bg-white shadow-sm screen-only">
      <CardContent className="space-y-3 p-3.5 sm:p-4">
        <div>
          <h2 className="text-base font-semibold leading-6">관리자 작업공간</h2>
          <p className="text-[13px] leading-5 text-slate-500">로컬에 저장된 사용자 이력서를 전환해서 볼 수 있습니다.</p>
        </div>

        <div className="grid gap-2">
          <Button
            className={activeOwnerId === currentUserId ? "justify-start border border-slate-900 bg-slate-900 text-white" : "justify-start border border-slate-200 bg-white text-slate-700"}
            onClick={() => onSelect(currentUserId)}
          >
            내 작업공간
          </Button>
          {workspaces
            .filter((workspace) => workspace.ownerId !== currentUserId)
            .map((workspace) => (
              <Button
                key={workspace.ownerId}
                className={
                  activeOwnerId === workspace.ownerId
                    ? "justify-start border border-slate-900 bg-slate-900 text-white"
                    : "justify-start border border-slate-200 bg-white text-slate-700"
                }
                onClick={() => onSelect(workspace.ownerId)}
              >
                <span className="truncate">{workspace.name}</span>
              </Button>
            ))}
          {!workspaces.filter((workspace) => workspace.ownerId !== currentUserId).length ? (
            <p className="text-[12px] leading-4 text-slate-500">아직 같은 브라우저에 저장된 다른 작업공간이 없습니다.</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectReviewOptionCard({
  title,
  helper,
  description,
  tags,
  buttonLabel,
  onSelect,
}: {
  title: string;
  helper?: string;
  description: string;
  tags: string[];
  buttonLabel: string;
  onSelect: () => void;
}) {
  return (
    <div className="rounded-[16px] border border-slate-200 bg-slate-50/70 p-4">
      <p className="text-base font-semibold text-slate-950">{title}</p>
      {helper ? <p className="mt-1 text-[13px] leading-5 text-slate-500">{helper}</p> : null}
      <div className="mt-4 rounded-[12px] border border-slate-200 bg-white p-3">
        <p className="text-[12px] font-semibold leading-4 text-slate-500">설명</p>
        <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-slate-700">{description}</p>
      </div>
      <div className="mt-3 rounded-[12px] border border-slate-200 bg-white p-3">
        <p className="text-[12px] font-semibold leading-4 text-slate-500">태그</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.length ? (
            tags.map((tag) => (
              <span key={`${title}-${tag}`} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] leading-4 text-slate-700">
                {tag}
              </span>
            ))
          ) : (
            <p className="text-[13px] leading-5 text-slate-500">태그가 없습니다.</p>
          )}
        </div>
      </div>
      <Button className="mt-4 w-full border border-slate-900 bg-slate-900 text-white" onClick={onSelect}>
        {buttonLabel}
      </Button>
    </div>
  );
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function createExportSnapshotNode(exportNode: HTMLDivElement) {
  const snapshotRoot = document.createElement("div");
  snapshotRoot.style.position = "fixed";
  snapshotRoot.style.left = "-100000px";
  snapshotRoot.style.top = "0";
  snapshotRoot.style.width = "1120px";
  snapshotRoot.style.padding = "24px";
  snapshotRoot.style.background = "#f1f5f9";
  snapshotRoot.style.color = "#0f172a";
  snapshotRoot.style.fontFamily = '"Pretendard", "Noto Sans KR", system-ui, sans-serif';
  snapshotRoot.style.boxSizing = "border-box";
  const dashboardNode = exportNode.querySelector("[data-export-dashboard]")?.cloneNode(true) as HTMLElement | null;
  const previewNode = exportNode.querySelector("[data-export-resume]")?.cloneNode(true) as HTMLElement | null;

  if (dashboardNode) snapshotRoot.appendChild(dashboardNode);
  if (previewNode) snapshotRoot.appendChild(previewNode);

  return snapshotRoot;
}

function paginateExportSnapshot(snapshotRoot: HTMLDivElement) {
  const rawDashboard = snapshotRoot.querySelector("[data-export-dashboard]") as HTMLElement | null;
  const rawResume = snapshotRoot.querySelector("[data-export-resume]") as HTMLElement | null;

  snapshotRoot.innerHTML = "";

  if (rawDashboard) {
    const firstPage = createExportPage();
    firstPage.appendChild(rawDashboard);
    snapshotRoot.appendChild(firstPage);
  }

  if (!rawResume) {
    return;
  }

  const intro = rawResume.querySelector("[data-export-intro]")?.cloneNode(true) as HTMLElement | null;
  const companySections = Array.from(rawResume.querySelectorAll("[data-export-company]")) as HTMLElement[];
  const maxPageHeight = 1450;

  let page = createResumeExportPage(rawResume);
  snapshotRoot.appendChild(page.outer);

  if (intro) {
    page.content.appendChild(intro);
  }

  for (const section of companySections) {
    const clonedSection = section.cloneNode(true) as HTMLElement;
    page.content.appendChild(clonedSection);

    if (page.outer.scrollHeight > maxPageHeight && page.content.children.length > (intro ? 1 : 0)) {
      clonedSection.remove();
      page = createResumeExportPage(rawResume);
      snapshotRoot.appendChild(page.outer);
      page.content.appendChild(clonedSection);
    }
  }
}

function createExportPage() {
  const page = document.createElement("section");
  page.style.marginBottom = "24px";
  page.style.breakAfter = "page";
  return page;
}

function createResumeExportPage(resumeTemplate: HTMLElement) {
  const outer = resumeTemplate.cloneNode(false) as HTMLElement;
  const contentTemplate = resumeTemplate.querySelector("[data-export-resume-content]") as HTMLElement | null;
  const content = contentTemplate ? (contentTemplate.cloneNode(false) as HTMLElement) : document.createElement("div");

  outer.appendChild(content);
  outer.style.marginBottom = "24px";
  outer.style.breakAfter = "page";

  return { outer, content };
}
