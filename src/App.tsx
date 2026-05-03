import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Building2, BriefcaseBusiness, Eye, FileText, FolderKanban, LogOut, Pencil, RotateCcw, Settings2, ShieldAlert, ShieldCheck, UserRound } from "lucide-react";
import { LoginPage } from "@/components/auth/login-page";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CompanyForm } from "@/components/resume/company-form";
import { ExperienceCard } from "@/components/resume/experience-card";
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
import { getPublicVisitCount, incrementPublicVisitCount, shouldCountPublicVisit } from "@/lib/visit-counter";
import type {
  CompanyFormValues,
  CompanyProfile,
  CompanyValidationErrors,
  ExperienceFormValues,
  ExperienceDocumentType,
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

function isExperienceVisibleInDocument(item: ExperienceItem, documentType: ExperienceDocumentType) {
  return (item.documentType ?? "technical") === documentType;
}

function getExperienceDedupeKey(item: ExperienceItem) {
  return [item.organization.trim(), item.title.trim(), item.period.trim(), item.description.trim().replace(/\s+/g, " ")].join("::");
}

function dedupeExperienceItems(items: ExperienceItem[]) {
  const seen = new Set<string>();
  const deduped: ExperienceItem[] = [];

  for (const item of items) {
    const key = getExperienceDedupeKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

export default function App() {
  const googleClientId = ((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || DEFAULT_GOOGLE_CLIENT_ID).trim();
  const isPublicResumeMode = ((import.meta.env.VITE_PUBLIC_RESUME_MODE as string | undefined) ?? "false") === "true";
  const isMobilePreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mobilePreview") === "1";
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
  const [selectedEditorSection, setSelectedEditorSection] = useState<"dashboard" | "profile" | "company" | "experience" | "portfolio" | "technical" | "visit-log" | "settings">("dashboard");
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
  const publicHeaderControlClass = "h-7 w-full min-w-0 md:w-[180px]";

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

    let isCancelled = false;
    const isCountableVisit = shouldCountPublicVisit(isPublicResumeMode, Boolean(user));
    const countKey = getVisitCountKey(activeOwnerId);
    const logKey = getVisitLogKey(activeOwnerId);
    const rawLogs = window.localStorage.getItem(logKey);
    const parsedLogs = safeParseVisitLogs(rawLogs);

    setVisitLogs(parsedLogs);

    async function syncVisitCount() {
      try {
        const currentRemoteCount = await getPublicVisitCount(activeOwnerId);
        if (isCancelled) return;

        if (!isCountableVisit) {
          setVisitCount(currentRemoteCount ?? 0);
          return;
        }

        if (visitOwnerRef.current === activeOwnerId) {
          setVisitCount(currentRemoteCount ?? readLocalVisitCount(countKey));
          return;
        }

        visitOwnerRef.current = activeOwnerId;

        const nextCount = currentRemoteCount === null ? readLocalVisitCount(countKey) + 1 : await incrementPublicVisitCount(activeOwnerId);
        if (isCancelled) return;

        const safeNextCount = nextCount ?? 0;
        if (currentRemoteCount === null) {
          window.localStorage.setItem(countKey, String(safeNextCount));
        }
        setVisitCount(safeNextCount);

        const nextLog = createVisitLogEntry({
          ownerName: profile.name,
          isPublicResumeMode,
          userName: user?.name ?? "게스트",
          userEmail: user?.email ?? "",
        });
        const nextLogs = [nextLog, ...parsedLogs].slice(0, 200);
        window.localStorage.setItem(logKey, JSON.stringify(nextLogs));
        setVisitLogs(nextLogs);
      } catch (error) {
        console.warn("방문 횟수 동기화에 실패했습니다.", error);
        if (!isCancelled) {
          setVisitCount(0);
        }
      }
    }

    void syncVisitCount();

    return () => {
      isCancelled = true;
    };
  }, [activeOwnerId, isLoading, isPublicResumeMode, profile.name, user]);

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
  const portfolioExperiences = useMemo(() => dedupeExperienceItems(allExperiences), [allExperiences]);
  const technicalExperiences = useMemo(() => dedupeExperienceItems(allExperiences.filter((item) => isExperienceVisibleInDocument(item, "technical"))), [allExperiences]);
  const derivedProfile = useMemo(
    () => ({ ...profile, summary: buildProfileSummary(profile, companies, allExperiences) }),
    [allExperiences, companies, profile],
  );
  const sidebarSections = [
    { key: "dashboard", label: "대시보드", icon: BarChart3 },
    { key: "profile", label: "기본 정보", icon: UserRound },
    { key: "company", label: "회사 추가", icon: Building2 },
    { key: "experience", label: "수행 업무 추가", icon: BriefcaseBusiness },
    { key: "portfolio", label: "포트폴리오", icon: FolderKanban },
    { key: "technical", label: "경력기술서", icon: FileText },
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

    const inferredCategory = inferExperienceCategory({
      title: form.title.trim(),
      organization: form.organization.trim(),
      description: form.description,
      existingTags: [],
    });
    const autoTags = generateSecurityTags({
      title: form.title.trim(),
      organization: form.organization.trim(),
      description: form.description,
      existingTags: [],
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
      featured: form.featured,
      documentType: form.documentType,
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
      url: item.url ?? "",
      image: item.image ?? "",
      featured: item.featured ?? false,
      documentType: item.documentType ?? "technical",
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
    <div className="resume-app min-h-[100dvh] overflow-x-hidden bg-slate-100 px-2 py-2 sm:px-4 md:px-6 md:py-6">
      {showSavedNotice ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4 screen-only">
          <div className="rounded-[16px] border border-emerald-200 bg-white/95 px-6 py-4 text-center shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur">
            <p className="text-base font-semibold text-slate-900">저장되었습니다</p>
          </div>
        </div>
      ) : null}
      <div className="flex min-h-[inherit] flex-col gap-1 md:gap-5">
        <Card className="z-30 shrink-0 rounded-[10px] border border-slate-200 bg-white/95 shadow-sm backdrop-blur screen-only">
          <CardContent className="p-2 sm:p-2.5">
            <div className={isPublicResumeMode ? "grid w-full grid-cols-2 items-center gap-1.5 md:flex md:flex-wrap md:justify-end md:overflow-visible" : "flex w-full flex-nowrap items-center gap-1 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0"}>
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
                  <div className={`${mobileHeaderChipClass} ${publicHeaderControlClass} flex items-center justify-center gap-1 border-slate-200 bg-slate-50 text-[12px] font-medium text-slate-600 md:px-2.5 md:text-[12px]`}>
                    방문 횟수: {visitCount}
                  </div>
                  {user ? (
                    <div className={`${mobileHeaderChipClass} ${publicHeaderControlClass} flex items-center gap-1.5 border-slate-200 bg-slate-50 text-slate-600 md:px-2.5 md:text-[12px]`}>
                      {user.picture ? <img src={user.picture} alt={user.name} className="h-5 w-5 rounded-full md:h-8 md:w-8" referrerPolicy="no-referrer" /> : null}
                      <div className="min-w-0 text-left">
                        <p className="truncate text-[10px] font-medium leading-4 text-slate-900 md:text-[13px]">{user.name}</p>
                      </div>
                    </div>
                  ) : null}
                  {!user && googleClientId ? (
                    <div className={`${publicHeaderControlClass} shrink`}>
                      <GoogleSignInButton clientId={googleClientId} compact={isMobilePreview} disabled={!isReady} onSuccess={signIn} />
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

        <div className="min-h-0 flex-1 pr-0 sm:pr-1">
          <div className="space-y-1.5 pb-2 md:space-y-5 md:pb-4">
            <div className={`grid gap-2 pt-1 md:gap-5 ${effectiveIsEditMode ? "xl:grid-cols-[200px_minmax(0,1fr)]" : "grid-cols-1"}`}>
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

                <div className="space-y-2 md:space-y-5 print-content">
                  {selectedEditorSection === "dashboard" ? (
                    effectiveIsEditMode ? (
                      <div data-export-dashboard>
                        <CareerDashboard items={allExperiences} profile={derivedProfile} companies={companies} />
                      </div>
                    ) : (
                      <div className="space-y-2 md:space-y-4">
                        <Card className="rounded-[10px] border border-slate-200 bg-white shadow-sm">
                          <CardContent className="space-y-2 p-3.5 sm:p-4 md:space-y-4 md:p-5">
                            <CareerDashboard items={allExperiences} profile={derivedProfile} companies={companies} />
                          </CardContent>
                        </Card>
                        <div className="space-y-2 md:space-y-4">
                          <h2 className="text-2xl font-extrabold leading-7 tracking-tight text-slate-950 drop-shadow-[0_1px_0_rgba(255,255,255,0.7)]">
                            배상학 이력서
                          </h2>
                          <ResumePreview
                            isEditMode={effectiveIsEditMode}
                            profile={derivedProfile}
                            companies={companies}
                            experiences={allExperiences}
                            onEditExperience={startEditingExperience}
                            onRemoveExperience={removeExperience}
                          />
                        </div>
                        <GeneratedExperiencePanel
                          variant="portfolio"
                          title="포트폴리오"
                          description=""
                          emptyMessage="포트폴리오에 표시할 수행 이력이 없습니다."
                          items={portfolioExperiences}
                          isEditMode={effectiveIsEditMode}
                          onEdit={startEditingExperience}
                          onRemove={removeExperience}
                        />
                        <GeneratedExperiencePanel
                          variant="technical"
                          title="경력기술서"
                          description=""
                          emptyMessage="경력기술서에 표시할 수행 이력이 없습니다."
                          items={technicalExperiences}
                          isEditMode={effectiveIsEditMode}
                          onEdit={startEditingExperience}
                          onRemove={removeExperience}
                        />
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
                  {selectedEditorSection === "portfolio" ? (
                    <GeneratedExperiencePanel
                      variant="portfolio"
                      title="포트폴리오"
                      description=""
                      emptyMessage="포트폴리오에 표시할 수행 이력이 없습니다."
                      items={portfolioExperiences}
                      isEditMode
                      onEdit={startEditingExperience}
                      onRemove={removeExperience}
                    />
                  ) : null}
                  {selectedEditorSection === "technical" ? (
                    <GeneratedExperiencePanel
                      variant="technical"
                      title="경력기술서"
                      description=""
                      emptyMessage="경력기술서에 표시할 수행 이력이 없습니다."
                      items={technicalExperiences}
                      isEditMode
                      onEdit={startEditingExperience}
                      onRemove={removeExperience}
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

function GeneratedExperiencePanel({
  variant,
  title,
  description,
  emptyMessage,
  items,
  isEditMode,
  onEdit,
  onRemove,
}: {
  variant: "portfolio" | "technical";
  title: string;
  description: string;
  emptyMessage: string;
  items: ExperienceItem[];
  isEditMode: boolean;
  onEdit: (experience: ExperienceItem) => void;
  onRemove: (id: number) => void;
}) {
  if (variant === "portfolio") {
    return (
      <Card className="overflow-hidden rounded-[10px] border border-sky-100 bg-white shadow-sm screen-only">
        <CardContent className="space-y-3 p-0">
          <div className="flex items-center justify-between gap-3 border-b border-sky-900 bg-sky-900 px-3.5 py-3 text-white sm:px-4">
            <h2 className="text-lg font-semibold leading-6">{title}</h2>
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold leading-4 text-sky-50">{items.length}건</span>
          </div>

          <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4">
            {items.length ? (
              <div className="grid gap-2">
                {items.map((item) => (
                  <PortfolioArtifactCard key={`${title}-${item.id}`} item={item} isEditMode={isEditMode} onEdit={onEdit} onRemove={onRemove} />
                ))}
              </div>
            ) : (
              <div className="rounded-[10px] border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-[13px] leading-5 text-slate-500">
                {emptyMessage}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const panelTone =
    {
      card: "border-slate-300 bg-slate-50",
      header: "border-slate-300 bg-slate-950 text-white",
      badge: "bg-white/15 text-slate-50",
      body: "bg-white",
    };

  return (
    <Card className={`overflow-hidden rounded-[10px] border shadow-sm ${panelTone.card}`}>
      <CardContent className="space-y-3 p-0">
        <div className={`flex flex-col gap-1 border-b px-3.5 py-3 sm:px-4 ${panelTone.header}`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold leading-6">{title}</h2>
            {variant === "portfolio" ? (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4 ${panelTone.badge}`}>{items.length}건</span>
            ) : null}
          </div>
          {description ? <p className="text-[13px] leading-5 text-white/75">{description}</p> : null}
        </div>

        <div className={`px-3.5 pb-3.5 sm:px-4 sm:pb-4 ${panelTone.body}`}>
          {items.length ? (
            <TechnicalCareerNarrative items={items} />
          ) : (
            <div className="rounded-[10px] border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-[13px] leading-5 text-slate-500">
              {emptyMessage}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PortfolioArtifactCard({
  item,
  isEditMode,
  onEdit,
  onRemove,
}: {
  item: ExperienceItem;
  isEditMode: boolean;
  onEdit: (experience: ExperienceItem) => void;
  onRemove: (id: number) => void;
}) {
  return (
    <div className="rounded-[10px] border border-sky-100 bg-white p-3.5 sm:p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,34%)] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-base font-semibold leading-6 text-slate-950">{item.title}</h3>
              <p className="mt-0.5 text-[13px] leading-5 text-slate-500">
                {item.organization} · {item.period}
              </p>
            </div>
            {isEditMode ? (
              <Button className="shrink-0 border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] text-slate-700" onClick={() => onEdit(item)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                수정
              </Button>
            ) : null}
          </div>

          <div className="mt-3">
          <p className="text-sm leading-6 text-slate-700">{summarizePortfolioDescription(item.description)}</p>
          {item.highlight.length ? (
            <div className="mt-3 flex flex-wrap gap-1">
              {item.highlight.slice(0, 6).map((tag) => (
                <span key={`${item.id}-portfolio-${tag}`} className="rounded-[5px] border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] leading-none text-slate-600">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          </div>

          {isEditMode ? (
            <div className="mt-3 flex justify-end">
              <Button className="border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] text-rose-600" onClick={() => onRemove(item.id)}>
                삭제
              </Button>
            </div>
          ) : null}
        </div>

        <div className="grid gap-2">
          {item.url ? <PortfolioLink url={item.url} /> : null}
          {item.image ? (
            <div className="overflow-hidden rounded-[10px] border border-slate-200 bg-slate-50">
              <img src={item.image} alt={`${item.title} 이미지`} className="h-auto max-h-[320px] w-full object-contain" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PortfolioLink({ url }: { url: string }) {
  let hostname = url;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    hostname = url;
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 rounded-[10px] border border-slate-200 bg-slate-50 px-2.5 py-2 text-[12px] leading-4 text-slate-700">
      <span className="min-w-0 truncate font-medium">{hostname}</span>
      <span className="shrink-0 text-sky-700">열기</span>
    </a>
  );
}

function summarizePortfolioDescription(description: string) {
  const firstParagraph = description
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)[0];

  return firstParagraph || "수행 산출물과 관련 자료를 확인할 수 있는 포트폴리오 항목입니다.";
}

function TechnicalCareerNarrative({ items }: { items: ExperienceItem[] }) {
  const { summary, companies } = buildTechnicalCareerNarrative(items);

  return (
    <article className="rounded-[10px] border border-slate-200 bg-white px-4 pb-6 pt-4 sm:px-5 sm:pb-7 sm:pt-5">
      <div>
        <h3 className="text-base font-semibold leading-6 text-slate-950">Summary</h3>
        <p className="mt-2 text-sm leading-7 text-slate-700">{summary}</p>
      </div>

      <div className="mt-5 space-y-5">
        {companies.map((company) => (
          <section key={company.organization} className="border-t border-slate-100 pt-4 last:pb-1">
            <h4 className="text-sm font-semibold leading-5 text-slate-950">{company.organization}</h4>
            <p className="mt-1.5 text-sm leading-7 text-slate-700">{company.description}</p>
          </section>
        ))}
      </div>
    </article>
  );
}

function buildTechnicalCareerNarrative(items: ExperienceItem[]) {
  const sortedItems = [...items].sort((left, right) => getExperiencePeriodScore(right.period) - getExperiencePeriodScore(left.period));
  const grouped = new Map<string, ExperienceItem[]>();

  for (const item of sortedItems) {
    grouped.set(item.organization, [...(grouped.get(item.organization) ?? []), item]);
  }

  const topTags = getTopTechnicalTags(sortedItems, 8);
  const tagSummary = topTags.length ? ` 특히 ${topTags.join(", ")} 영역을 중심으로 실무 경험을 확장해 왔습니다.` : "";
  const summary = `정보보호 관리자 및 CISO/CPO 역할을 수행하며 보안 거버넌스, 인증 대응, 웹 모의해킹, 취약점 진단, OT·인프라 보안, 보안시스템 운영까지 폭넓게 경험했습니다.${tagSummary} 정책과 절차 수립에 그치지 않고 점검 자동화, 운영 체계 구축, 리스크 식별, 개선 과제 실행까지 이어가며 조직의 보안 수준을 실제 운영 관점에서 높여 왔습니다.`;
  const companies = [...grouped.entries()].map(([organization, organizationItems]) => {
    const titles = uniqueKoreanList(organizationItems.map((item) => item.title.trim()).filter(Boolean)).slice(0, 5);
    const tags = getTopTechnicalTags(organizationItems, 5);
    const titleSentence = titles.length ? `${titles.join(", ")} 등을 맡았습니다.` : "정보보호 관련 업무를 맡았습니다.";
    const tagSentence = tags.length ? `주요 업무는 ${tags.join(", ")}를 중심으로 진행했습니다.` : "";

    return {
      organization,
      description: `${organization}에서는 ${titleSentence} ${tagSentence}`.trim(),
    };
  });

  return { summary, companies };
}

function uniqueKoreanList(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function getTopTechnicalTags(items: ExperienceItem[], limit: number) {
  const counts = new Map<string, number>();

  for (const item of items) {
    for (const tag of item.highlight) {
      const normalizedTag = tag.trim();
      if (!normalizedTag) continue;
      counts.set(normalizedTag, (counts.get(normalizedTag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "ko-KR"))
    .slice(0, limit)
    .map(([tag]) => tag);
}

function getExperiencePeriodScore(period: string) {
  const matches = period.match(/\d{4}[./-]?\d{0,2}[./-]?\d{0,2}/g);
  const target = matches?.[matches.length - 1] ?? period;
  const digits = target.replace(/\D/g, "").padEnd(8, "0").slice(0, 8);
  const score = Number.parseInt(digits, 10);
  return Number.isFinite(score) ? score : 0;
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

function readLocalVisitCount(key: string) {
  if (typeof window === "undefined") return 0;

  const raw = window.localStorage.getItem(key);
  const currentCount = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(currentCount) && currentCount > 0 ? currentCount : 0;
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
