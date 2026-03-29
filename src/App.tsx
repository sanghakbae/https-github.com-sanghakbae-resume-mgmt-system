import { useEffect, useMemo, useRef, useState } from "react";
import { CodeXml, Download, Eye, LogOut, Pencil, RotateCcw, Save, ShieldCheck } from "lucide-react";
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
import type {
  CompanyFormValues,
  CompanyProfile,
  CompanyValidationErrors,
  ExperienceFormValues,
  ExperienceItem,
  ExperienceValidationErrors,
  ResumeCategory,
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
  const googleClientId = ((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? DEFAULT_GOOGLE_CLIENT_ID).trim();
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
  const [isExportingHtml, setIsExportingHtml] = useState(false);
  const exportSectionRef = useRef<HTMLDivElement | null>(null);
  const activeOwnerId = isPublicResumeMode ? "public-resume" : isAdmin ? selectedOwnerId ?? user?.sub ?? "" : user?.sub ?? "";
  const effectiveIsEditMode = isPublicResumeMode ? isPublicEditor && isEditMode : isEditMode;
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
    storageMode,
    resetWorkspace,
    listWorkspaces,
    saveNow,
  } = useResumeWorkspace({
    ownerId: activeOwnerId,
    defaultProfile,
    defaultCompanies: defaultCompanyProfiles,
    defaultExperiences,
  });
  const [workspaceSummaries, setWorkspaceSummaries] = useState<WorkspaceSummary[]>([]);

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

  const submitExperience = () => {
    const errors = validateExperience(form);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const nextItem: ExperienceItem = {
      id: editingId ?? Date.now(),
      title: form.title.trim(),
      organization: form.organization.trim(),
      period: form.period.trim(),
      category: form.category,
      description: form.description.trim(),
      highlight: form.highlight
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      image: form.image || undefined,
    };

    setExperiences((prev) => {
      if (editingId === null) {
        return [nextItem, ...prev];
      }

      return prev.map((item) => (item.id === editingId ? nextItem : item));
    });

    resetExperienceForm();
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

  const exportPdf = () => {
    const exportNode = exportSectionRef.current;
    if (!exportNode || isExportingPdf) return;

    setIsExportingPdf(true);

    window.setTimeout(async () => {
      const snapshotNode = createExportSnapshotNode(exportNode);
      document.body.appendChild(snapshotNode);

      try {
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

  const exportHtml = async () => {
    const exportNode = exportSectionRef.current;
    if (!exportNode || isExportingHtml) return;

    setIsExportingHtml(true);

    try {
      const styles = [...document.querySelectorAll('style, link[rel="stylesheet"]')]
        .map((node) => node.outerHTML)
        .join("\n");

      const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${profile.name || "resume"} HTML Export</title>
  ${styles}
  <style>
    body {
      margin: 0;
      background: #f1f5f9;
      color: #0f172a;
      font-family: "Pretendard", "Noto Sans KR", system-ui, sans-serif;
    }
    .export-wrap {
      max-width: 1280px;
      margin: 0 auto;
      padding: 24px;
    }
  </style>
</head>
<body>
  <div class="export-wrap">
    ${exportNode.innerHTML}
  </div>
</body>
</html>`;

      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${profile.name || "resume"}-dashboard.html`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsExportingHtml(false);
    }
  };

  if (!isPublicResumeMode && !user) {
    return <LoginPage clientId={googleClientId} isReady={isReady} error={authError} onLogin={signIn} />;
  }

  return (
    <div className="resume-app h-screen overflow-hidden bg-slate-100 px-3 py-4 sm:px-4 md:px-6 md:py-6">
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
                </>
              )}
              {!isPublicResumeMode || isPublicEditor ? (
                <>
                  <Button
                    className={isEditMode ? "w-full border border-slate-900 bg-slate-900 px-4 py-2 text-white md:w-auto" : "w-full border border-slate-200 bg-white px-4 py-2 text-slate-700 md:w-auto"}
                    onClick={() => setIsEditMode(true)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    편집 모드
                  </Button>
                  <Button
                    className={!isEditMode ? "w-full border border-slate-900 bg-slate-900 px-4 py-2 text-white md:w-auto" : "w-full border border-slate-200 bg-white px-4 py-2 text-slate-700 md:w-auto"}
                    onClick={() => setIsEditMode(false)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    공개 보기
                  </Button>
                  {!isPublicResumeMode ? (
                    <Button className="w-full border border-slate-200 bg-white px-4 py-2 text-slate-700 md:w-auto" onClick={restoreSampleData}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      샘플 복원
                    </Button>
                  ) : null}
                  <Button className="w-full border border-slate-200 bg-white px-4 py-2 text-slate-700 md:w-auto" onClick={() => void saveNow()} disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "저장 중" : "임시저장"}
                  </Button>
                </>
              ) : null}
              <Button className="w-full border border-slate-200 bg-white px-4 py-2 text-slate-700 md:w-auto" onClick={() => void exportHtml()} disabled={isExportingHtml}>
                <CodeXml className="mr-2 h-4 w-4" />
                {isExportingHtml ? "HTML 생성 중" : "HTML 출력"}
              </Button>
              <Button className="w-full border border-slate-200 bg-white px-4 py-2 text-slate-700 md:w-auto" onClick={exportPdf} disabled={isExportingPdf}>
                <Download className="mr-2 h-4 w-4" />
                {isExportingPdf ? "PDF 생성 중" : "PDF 저장"}
              </Button>
              {!isPublicResumeMode || user ? (
                <Button className="w-full border border-slate-200 bg-white px-4 py-2 text-slate-700 md:w-auto" onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {isPublicResumeMode ? "편집 로그아웃" : "로그아웃"}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <div ref={exportSectionRef} className="space-y-4 md:space-y-5 pb-4">
            {allExperiences.length ? <CareerDashboard items={allExperiences} profile={profile} companies={companies} /> : null}

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
                  <ProfileForm profile={profile} onChange={setProfile} />
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
                    form={form}
                    errors={formErrors}
                    editingId={editingId}
                    organizations={companies.map((company) => company.organization)}
                    onChange={setForm}
                    onSubmit={submitExperience}
                    onCancel={resetExperienceForm}
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
  snapshotRoot.style.width = "1280px";
  snapshotRoot.style.padding = "24px";
  snapshotRoot.style.background = "#f1f5f9";
  snapshotRoot.style.color = "#0f172a";
  snapshotRoot.style.fontFamily = '"Pretendard", "Noto Sans KR", system-ui, sans-serif';

  const content = exportNode.cloneNode(true);
  snapshotRoot.appendChild(content);

  return snapshotRoot;
}
