import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Building2, BriefcaseBusiness, Eye, LogOut, Pencil, RotateCcw, Settings2, ShieldAlert, ShieldCheck, UserRound } from "lucide-react";
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
import { prepareProfilePhoto } from "@/lib/profile-photo";
import { buildProfileSummary } from "@/lib/profile-summary";
import { generateSecurityTags, inferExperienceCategory } from "@/lib/security-tags";
import { isSupabaseConfigured, uploadResumeAsset } from "@/lib/supabase";
import type {
  CompanyFormValues,
  CompanyProfile,
  CompanyValidationErrors,
  ExperienceFormValues,
  ExperienceItem,
  ExperienceValidationErrors,
  ResumeCategory,
  VisitLogItem,
} from "@/types/resume";

const DEFAULT_GOOGLE_CLIENT_ID = "924920443826-k59m97pgabmdb42qv9cq63plmuuvvn7s.apps.googleusercontent.com";
const DEFAULT_PRIMARY_WORKSPACE_ID = "public-resume";
const FONT_STORAGE_KEY = "resume.font-family";
const FONT_OPTIONS = [
  {
    value: "korpub-dotum",
    label: "KorPub 돋움체",
    stack: '"KorPub 돋움체", "KorPub Dotum", "Pretendard", "Noto Sans KR", "Malgun Gothic", sans-serif',
  },
  {
    value: "pretendard",
    label: "Pretendard",
    stack: '"Pretendard", "Noto Sans KR", "Malgun Gothic", sans-serif',
  },
  {
    value: "noto-sans-kr",
    label: "Noto Sans KR",
    stack: '"Noto Sans KR", "Pretendard", "Malgun Gothic", sans-serif',
  },
  {
    value: "malgun-gothic",
    label: "맑은 고딕",
    stack: '"Malgun Gothic", "Noto Sans KR", "Pretendard", sans-serif',
  },
  {
    value: "apple-sd-gothic-neo",
    label: "Apple SD Gothic Neo",
    stack: '"Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", sans-serif',
  },
] as const;

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
  const adminEmails = parseEnvEmailList(import.meta.env.VITE_ADMIN_EMAILS as string | undefined);
  const editorEmails = parseEnvEmailList(import.meta.env.VITE_EDITOR_EMAILS as string | undefined);
  const primaryWorkspaceId = (editorEmails[0] ?? adminEmails[0] ?? DEFAULT_PRIMARY_WORKSPACE_ID).toLowerCase();
  const allowedEmails = isPublicResumeMode ? [] : adminEmails;
  const isLocalEditorMode = !isPublicResumeMode;
  const { user, isReady, error: authError, signIn, signOut } = useGoogleAuth({
    allowedEmails,
    enabled: !isLocalEditorMode,
  });
  const normalizedUserEmail = user?.email.toLowerCase() ?? null;
  const currentWorkspaceId = normalizedUserEmail ?? primaryWorkspaceId;
  const isAdmin = isLocalEditorMode || (Boolean(user) && (adminEmails.length === 0 || adminEmails.includes(normalizedUserEmail!)));
  const isPublicEditor = isPublicResumeMode && Boolean(user) && editorEmails.includes(normalizedUserEmail!);
  const canEdit = isLocalEditorMode || isPublicEditor;
  const [isEditMode, setIsEditMode] = useState(true);
  const [companyForm, setCompanyForm] = useState<CompanyFormValues>(emptyCompanyForm);
  const [companyErrors, setCompanyErrors] = useState<CompanyValidationErrors>({});
  const [editingCompanyOrganization, setEditingCompanyOrganization] = useState<string | null>(null);
  const [form, setForm] = useState<ExperienceFormValues>(emptyExperienceForm);
  const [formErrors, setFormErrors] = useState<ExperienceValidationErrors>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedEditorSection, setSelectedEditorSection] = useState<"dashboard" | "profile" | "company" | "experience" | "visit-log" | "settings">("dashboard");
  const [isUploadingProfilePhoto, setIsUploadingProfilePhoto] = useState(false);
  const [isUploadingExperienceImage, setIsUploadingExperienceImage] = useState(false);
  const [assetUploadError, setAssetUploadError] = useState<string | null>(null);
  const [visitCount, setVisitCount] = useState(0);
  const [visitLogs, setVisitLogs] = useState<VisitLogItem[]>([]);
  const [fontFamily, setFontFamily] = useState<string>(() => getSavedFontFamily());
  const visitOwnerRef = useRef<string | null>(null);
  const activeOwnerId = isPublicResumeMode ? primaryWorkspaceId : currentWorkspaceId;
  const effectiveIsEditMode = canEdit && isEditMode;
  const canSaveWorkspace = canEdit;
  const fallbackOwnerIds = useMemo(() => (user ? [user.sub, "public-resume"] : ["public-resume"]), [user]);
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
  } = useResumeWorkspace({
    ownerId: activeOwnerId,
    fallbackOwnerIds,
    defaultProfile,
    defaultCompanies: defaultCompanyProfiles,
    defaultExperiences,
    canSave: canSaveWorkspace,
  });
  const headerButtonClass = "min-h-7 px-2.5 py-0.5 text-[10px] leading-4 md:text-[11px]";
  const mobileHeaderChipClass = "h-7 shrink-0 whitespace-nowrap rounded-[9px] border px-2 py-0 text-[10px] leading-4";

  useEffect(() => {
    if (typeof document === "undefined") return;

    const selectedOption = FONT_OPTIONS.find((option) => option.value === fontFamily) ?? FONT_OPTIONS[0];
    document.documentElement.style.setProperty("--resume-font-family", selectedOption.stack);
    window.localStorage.setItem(FONT_STORAGE_KEY, selectedOption.value);
  }, [fontFamily]);

  useEffect(() => {
    if (isLoading || !activeOwnerId || typeof window === "undefined") {
      visitOwnerRef.current = null;
      setVisitCount(0);
      setVisitLogs([]);
      return;
    }

    const countKey = getVisitCountKey(activeOwnerId);
    const logKey = getVisitLogKey(activeOwnerId);
    const raw = window.localStorage.getItem(countKey);
    const currentCount = raw ? Number.parseInt(raw, 10) : 0;
    const safeCount = Number.isFinite(currentCount) && currentCount > 0 ? currentCount : 0;
    const rawLogs = window.localStorage.getItem(logKey);
    const parsedLogs = safeParseVisitLogs(rawLogs);

    setVisitCount(safeCount);
    setVisitLogs(parsedLogs);

    if (visitOwnerRef.current === activeOwnerId) {
      return;
    }

    visitOwnerRef.current = activeOwnerId;

    const nextCount = safeCount + 1;
    window.localStorage.setItem(countKey, String(nextCount));
    setVisitCount(nextCount);

    const nextLog = createVisitLogEntry({
      ownerName: profile.name,
      isPublicResumeMode,
      userName: user?.name ?? "게스트",
      userEmail: user?.email ?? "",
    });
    const nextLogs = [nextLog, ...parsedLogs].slice(0, 200);
    window.localStorage.setItem(logKey, JSON.stringify(nextLogs));
    setVisitLogs(nextLogs);
  }, [activeOwnerId, isLoading, isPublicResumeMode]);

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
  const derivedProfile = useMemo(
    () => ({ ...profile, summary: buildProfileSummary(profile, companies, allExperiences) }),
    [allExperiences, companies, profile],
  );
  const sidebarSections = [
    { key: "dashboard", label: "대시보드", icon: BarChart3 },
    { key: "profile", label: "기본 정보", icon: UserRound },
    { key: "company", label: "회사 추가", icon: Building2 },
    { key: "experience", label: "수행 업무 추가", icon: BriefcaseBusiness },
    { key: "visit-log", label: "방문 로그", icon: Eye },
    { key: "settings", label: "설정", icon: Settings2 },
  ] as const;

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

    const manualHighlights = form.highlight
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const inferredCategory = inferExperienceCategory({
      title: form.title.trim(),
      organization: form.organization.trim(),
      description: form.description,
      existingTags: manualHighlights,
    });
    const autoTags = generateSecurityTags({
      title: form.title.trim(),
      organization: form.organization.trim(),
      description: form.description,
      existingTags: manualHighlights,
    });
    const nextItem: ExperienceItem = {
      id: editingId ?? Date.now(),
      title: form.title.trim(),
      organization: form.organization.trim(),
      period: form.period.trim(),
      category: inferredCategory,
      description: form.description,
      highlight: autoTags,
      url: form.url.trim() || undefined,
      image: form.image || undefined,
    };

    commitExperience(nextItem);
  };

  const commitExperience = (nextItem: ExperienceItem) => {
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
        if (isPublicResumeMode) {
          throw new Error("Supabase 저장소가 설정되지 않아 사진을 저장할 수 없습니다.");
        }
        const dataUrl = await readFileAsDataUrl(preparedFile);
        setProfile((prev) => ({ ...prev, photo: dataUrl, photoPositionX: 50, photoPositionY: 50, photoScale: 1.08 }));
        return;
      }

      const publicUrl = await uploadResumeAsset(preparedFile, activeOwnerId, "profile");
      setProfile((prev) => ({ ...prev, photo: publicUrl, photoPositionX: 50, photoPositionY: 50, photoScale: 1.08 }));
    } catch (uploadError) {
      setAssetUploadError(uploadError instanceof Error ? uploadError.message : "프로필 사진을 업로드하지 못했습니다. 잠시 후 다시 시도하세요.");
    } finally {
      setIsUploadingProfilePhoto(false);
    }
  };

  const uploadExperienceImage = async (file: File) => {
    setIsUploadingExperienceImage(true);
    setAssetUploadError(null);

    try {
      if (!isSupabaseConfigured) {
        if (isPublicResumeMode) {
          throw new Error("Supabase 저장소가 설정되지 않아 이미지를 저장할 수 없습니다.");
        }
        const dataUrl = await readFileAsDataUrl(file);
        setForm((prev) => ({ ...prev, image: dataUrl }));
        return;
      }

      const publicUrl = await uploadResumeAsset(file, activeOwnerId, "experience");
      setForm((prev) => ({ ...prev, image: publicUrl }));
    } catch (uploadError) {
      setAssetUploadError(uploadError instanceof Error ? uploadError.message : "업무 이미지를 업로드하지 못했습니다. 잠시 후 다시 시도하세요.");
    } finally {
      setIsUploadingExperienceImage(false);
    }
  };

  return (
    <div className="resume-app min-h-[100dvh] overflow-x-hidden bg-slate-100 px-2 py-2 sm:px-4 md:px-6 md:py-6 lg:h-[100dvh] lg:overflow-hidden">
      {showSavedNotice ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4 screen-only">
          <div className="rounded-[16px] border border-emerald-200 bg-white/95 px-6 py-4 text-center shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur">
            <p className="text-base font-semibold text-slate-900">저장되었습니다</p>
          </div>
        </div>
      ) : null}
      <div className="flex h-full flex-col gap-2 md:gap-5">
        <Card className="z-30 shrink-0 rounded-[10px] border border-slate-200 bg-white/95 shadow-sm backdrop-blur screen-only">
          <CardContent className="flex flex-col gap-2.5 p-2.5 sm:p-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">이력서 관리 시스템</h1>
            </div>

            <div className="flex w-full flex-nowrap items-center gap-1 overflow-x-auto pb-1 md:w-auto md:flex-wrap md:overflow-visible md:pb-0">
              {!isPublicResumeMode ? (
                <>
                  {user ? (
                    <div className={`${mobileHeaderChipClass} flex min-w-[140px] items-center gap-1.5 border-slate-200 bg-slate-50 text-slate-600 md:h-auto md:w-auto md:min-w-0 md:px-2.5 md:py-1 md:text-[12px]`}>
                      {user.picture ? <img src={user.picture} alt={user.name} className="h-5 w-5 rounded-full md:h-8 md:w-8" referrerPolicy="no-referrer" /> : null}
                      <div className="min-w-0 text-left">
                        <p className="truncate text-[10px] font-medium leading-4 text-slate-900 md:text-[13px]">{user.name}</p>
                        <p className="truncate text-[9px] leading-3 text-slate-500 md:text-[12px]">{user.email}</p>
                      </div>
                    </div>
                  ) : (
                    <div className={`${mobileHeaderChipClass} flex items-center gap-1 border-slate-200 bg-slate-50 font-medium text-slate-600 md:h-auto md:w-auto md:px-2.5 md:py-1 md:text-[12px]`}>
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 md:h-4 md:w-4" />
                      로컬 편집 모드
                    </div>
                  )}
                  {isAdmin ? (
                    <div className={`${mobileHeaderChipClass} flex items-center gap-1 border-emerald-200 bg-emerald-50 font-medium text-emerald-700 md:h-auto md:w-auto md:px-2.5 md:py-1 md:text-[12px]`}>
                      <ShieldCheck className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      관리자
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div className={`${mobileHeaderChipClass} min-w-[110px] items-center gap-1 border-slate-200 bg-slate-50 font-medium text-slate-600 md:h-auto md:min-w-[180px] md:w-auto md:px-2.5 md:py-1 md:text-[12px]`}>
                    방문 횟수: {visitCount}
                  </div>
                  {user ? (
                    <div className={`${mobileHeaderChipClass} flex min-w-[120px] items-center gap-1.5 border-slate-200 bg-slate-50 text-slate-600 md:h-auto md:w-auto md:px-2.5 md:py-1 md:text-[12px]`}>
                      {user.picture ? <img src={user.picture} alt={user.name} className="h-5 w-5 rounded-full md:h-8 md:w-8" referrerPolicy="no-referrer" /> : null}
                      <div className="min-w-0 text-left">
                        <p className="truncate text-[10px] font-medium leading-4 text-slate-900 md:text-[13px]">{user.name}</p>
                      </div>
                    </div>
                  ) : null}
                  {!user && googleClientId ? (
                    <div className="min-w-[220px] shrink-0 md:w-[280px]">
                      <GoogleSignInButton clientId={googleClientId} disabled={!isReady} onSuccess={signIn} />
                    </div>
                  ) : null}
                  {!user && !googleClientId ? (
                    <div className={`${mobileHeaderChipClass} flex items-center border-amber-200 bg-amber-50 text-[10px] leading-4 text-amber-700 md:h-auto md:w-auto md:px-2.5 md:py-1 md:text-[12px]`}>
                      현재 배포본에 Google 로그인 설정이 연결되지 않아 편집 로그인을 사용할 수 없습니다.
                    </div>
                  ) : null}
                  {authError && !user ? (
                    <div className={`${mobileHeaderChipClass} flex items-center border-rose-200 bg-rose-50 text-[10px] leading-4 text-rose-700 md:h-auto md:w-auto md:px-2.5 md:py-1 md:text-[12px]`}>
                      {authError}
                    </div>
                  ) : null}
                  {assetUploadError ? (
                    <div className={`${mobileHeaderChipClass} flex items-center border-rose-200 bg-rose-50 text-[10px] leading-4 text-rose-700 md:h-auto md:w-auto md:px-2.5 md:py-1 md:text-[12px]`}>
                      {assetUploadError}
                    </div>
                  ) : null}
                </>
              )}
              {canEdit ? (
                <>
                  <Button
                    className={`${headerButtonClass} shrink-0 whitespace-nowrap ${isEditMode ? "border border-slate-900 bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"}`}
                    onClick={() => setIsEditMode(true)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    편집 모드
                  </Button>
                  <Button
                    className={`${headerButtonClass} shrink-0 whitespace-nowrap ${!isEditMode ? "border border-slate-900 bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"}`}
                    onClick={() => {
                      setSelectedEditorSection("dashboard");
                      setIsEditMode(false);
                    }}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    공개 보기
                  </Button>
                  {!isPublicResumeMode ? (
                    <Button className={`${headerButtonClass} shrink-0 whitespace-nowrap border border-slate-200 bg-white text-slate-700`} onClick={restoreSampleData}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      샘플 복원
                    </Button>
                  ) : null}
                </>
              ) : null}
              {user ? (
                <Button className={`${headerButtonClass} shrink-0 whitespace-nowrap border border-slate-200 bg-white text-slate-700`} onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {isPublicResumeMode ? "편집 로그아웃" : "로그아웃"}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0 sm:pr-1">
          <div className="space-y-3 pb-3 md:space-y-5 md:pb-4">
            <div className={`grid gap-4 pt-1 md:gap-5 ${effectiveIsEditMode ? "xl:grid-cols-[200px_minmax(0,1fr)]" : "grid-cols-1"}`}>
              {effectiveIsEditMode ? (
                <div className="screen-only">
                  <Card className="rounded-[10px] border border-slate-200 bg-white shadow-sm">
                    <CardContent className="flex flex-col items-start gap-3 p-2.5 sm:p-3">
                      <div className="w-full text-center">
                        <h2 className="text-base font-semibold leading-6 text-slate-900">이력 수정</h2>
                      </div>
                      <div className="grid w-full gap-2">
                        {sidebarSections.map(({ key, label, icon: Icon }) => {
                          const isActive = selectedEditorSection === key;

                          return (
                            <Button
                              key={label}
                              className={isActive ? "w-full !justify-start border border-slate-900 bg-slate-900 text-left text-white" : "w-full !justify-start border border-slate-200 bg-white text-left text-slate-700"}
                              onClick={() => setSelectedEditorSection(key)}
                            >
                              <Icon className="mr-2 h-4 w-4" />
                              {label}
                            </Button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : null}

              <div className="space-y-4 md:space-y-5">
                {effectiveIsEditMode ? (
                  <>
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
                  </>
                ) : null}

                <div className="space-y-4 md:space-y-5 print-content">
                  {selectedEditorSection === "dashboard" ? (
                    effectiveIsEditMode ? (
                      <div data-export-dashboard>
                        <CareerDashboard items={allExperiences} profile={derivedProfile} companies={companies} />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Card className="rounded-[10px] border border-slate-200 bg-white shadow-sm">
                          <CardContent className="space-y-4 p-3.5 sm:p-4 md:p-5">
                            <div>
                              <h2 className="text-base font-semibold leading-6">경력 대시보드</h2>
                              <p className="text-[13px] leading-5 text-slate-500">공개 보기에서 경력 흐름과 핵심 지표를 확인합니다.</p>
                            </div>
                            <CareerDashboard items={allExperiences} profile={derivedProfile} companies={companies} />
                          </CardContent>
                        </Card>
                        <Card className="rounded-[10px] border border-slate-200 bg-white shadow-sm">
                          <CardContent className="space-y-4 p-3.5 sm:p-4 md:p-5">
                            <div>
                              <h2 className="text-2xl font-extrabold leading-7 tracking-tight text-slate-950 drop-shadow-[0_1px_0_rgba(255,255,255,0.7)]">
                                배상학 이력서
                              </h2>
                            </div>
                            <ResumePreview
                              isEditMode={effectiveIsEditMode}
                              profile={derivedProfile}
                              companies={companies}
                              experiences={allExperiences}
                              onEditExperience={startEditingExperience}
                              onRemoveExperience={removeExperience}
                            />
                          </CardContent>
                        </Card>
                      </div>
                    )
                  ) : null}
                  {selectedEditorSection === "profile" ? (
                    <ProfileForm
                      ownerId={activeOwnerId}
                      profile={derivedProfile}
                      isUploading={isUploadingProfilePhoto}
                      onChange={setProfile}
                      onUploadPhoto={uploadProfilePhoto}
                    />
                  ) : null}
                  {selectedEditorSection === "company" ? (
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
                  ) : null}
                  {selectedEditorSection === "experience" ? (
                    <ExperienceForm
                      ownerId={activeOwnerId}
                      form={form}
                      errors={formErrors}
                      editingId={editingId}
                      organizations={companies.map((company) => company.organization)}
                      experiences={allExperiences}
                      isUploading={isUploadingExperienceImage}
                      onChange={setForm}
                      onSubmit={submitExperience}
                      onCancel={resetExperienceForm}
                      onEdit={startEditingExperience}
                      onRemove={removeExperience}
                      onUploadImage={uploadExperienceImage}
                    />
                  ) : null}
                  {selectedEditorSection === "visit-log" ? <VisitLogPanel logs={visitLogs} /> : null}
                  {selectedEditorSection === "settings" ? <SettingsPanel fontFamily={fontFamily} onFontFamilyChange={setFontFamily} /> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VisitLogPanel({ logs }: { logs: VisitLogItem[] }) {
  return (
    <Card className="rounded-[10px] border border-slate-200 bg-white shadow-sm screen-only">
      <CardContent className="space-y-3 p-3.5 sm:p-4">
        <div>
          <h2 className="text-base font-semibold leading-6">방문 로그</h2>
          <p className="text-[13px] leading-5 text-slate-500">이 브라우저에서 기록된 방문 이력을 확인합니다.</p>
        </div>

        <div className="overflow-x-auto rounded-[12px] border border-slate-200">
          <table className="min-w-[640px] w-full border-collapse text-center text-[13px] leading-5">
            <thead className="bg-slate-50">
              <tr className="text-slate-500">
                <th className="border-b border-slate-200 px-3 py-2 font-bold">방문 시각</th>
                <th className="border-b border-slate-200 px-3 py-2 font-bold">모드</th>
                <th className="border-b border-slate-200 px-3 py-2 font-bold">사용자</th>
                <th className="border-b border-slate-200 px-3 py-2 font-bold">대상</th>
                <th className="border-b border-slate-200 px-3 py-2 font-bold">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.length ? (
                logs.map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{formatVisitAt(log.visitedAt)}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{log.mode}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{log.userLabel}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{log.ownerName}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-500">{log.ipAddress ?? "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={5}>
                    아직 방문 로그가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsPanel({
  fontFamily,
  onFontFamilyChange,
}: {
  fontFamily: string;
  onFontFamilyChange: (value: string) => void;
}) {
  return (
    <Card className="rounded-[10px] border border-slate-200 bg-white shadow-sm screen-only">
      <CardContent className="space-y-3 p-3.5 sm:p-4">
        <div>
          <h2 className="text-base font-semibold leading-6">설정</h2>
          <p className="text-[13px] leading-5 text-slate-500">폰트와 화면 표시 방식을 조정합니다.</p>
        </div>

        <div className="space-y-2">
          <label className="text-[13px] font-medium leading-5 text-slate-700">폰트</label>
          <select
            className="w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-[13px] leading-5 text-slate-700 outline-none"
            value={fontFamily}
            onChange={(event) => onFontFamilyChange(event.target.value)}
          >
            {FONT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] leading-4 text-slate-500">선택값은 이 브라우저에 저장됩니다. 설치되지 않은 폰트는 다음 대체 폰트로 표시됩니다.</p>
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

function formatVisitAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function createVisitLogEntry({
  ownerName,
  isPublicResumeMode,
  userName,
  userEmail,
}: {
  ownerName: string;
  isPublicResumeMode: boolean;
  userName: string;
  userEmail: string;
}): VisitLogItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    visitedAt: new Date().toISOString(),
    mode: isPublicResumeMode ? "공개 보기" : "편집 모드",
    ownerName: ownerName.trim() || "이력서",
    userLabel: userName.trim() || userEmail.trim() || "게스트",
  };
}

function safeParseVisitLogs(value: string | null): VisitLogItem[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as VisitLogItem[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is VisitLogItem => Boolean(item && typeof item.id === "string" && typeof item.visitedAt === "string"))
      .slice(0, 200);
  } catch {
    return [];
  }
}


function getVisitCountKey(ownerId: string) {
  return `resume.visit-count.${ownerId}`;
}

function getVisitLogKey(ownerId: string) {
  return `resume.visit-log.${ownerId}`;
}

function getSavedFontFamily() {
  if (typeof window === "undefined") return FONT_OPTIONS[0].value;

  const saved = window.localStorage.getItem(FONT_STORAGE_KEY);
  return FONT_OPTIONS.some((option) => option.value === saved) ? (saved as string) : FONT_OPTIONS[0].value;
}

function parseEnvEmailList(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}
