import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Building2, BriefcaseBusiness, Download, ExternalLink, Eye, FileText, FolderKanban, LogOut, Pencil, RotateCcw, Settings2, ShieldAlert, ShieldCheck, Smartphone, UserRound, X } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CompanyForm } from "@/components/resume/company-form";
import { ExperienceCard } from "@/components/resume/experience-card";
import { ExperienceForm } from "@/components/resume/experience-form";
import { ProfileForm } from "@/components/resume/profile-form";
import { CareerDashboard, ResumePreview } from "@/components/resume/resume-preview";
import { defaultCompanyProfiles, defaultExperiences, defaultProfile, emptyCompanyForm, emptyExperienceForm } from "@/data/resume";
import { useGoogleAuth } from "@/hooks/use-google-auth";
import { useResumeWorkspace } from "@/hooks/use-resume-workspace";
import { prepareProfilePhoto } from "@/lib/profile-photo";
import { buildProfileSummary } from "@/lib/profile-summary";
import { generateSecurityTags, inferExperienceCategory } from "@/lib/security-tags";
import { getLatestResumePdfSnapshot, isAssetUploadConfigured, isFirebaseConfigured, uploadResumeAsset, uploadResumePdfSnapshot } from "@/lib/firebase";
import { isEmptyRichText, listToHtml } from "@/lib/rich-text";
import { fetchPublicVisitLogs, getPublicVisitCount, getVisitorNetworkInfo, incrementPublicVisitCount, recordPublicDownloadLog, recordPublicVisitLog, shouldCountPublicVisit } from "@/lib/visit-counter";
import type {
  CompanyFormValues,
  CompanyProfile,
  CompanyValidationErrors,
  ExperienceFormValues,
  ExperienceDocumentType,
  ExperienceItem,
  ExperienceValidationErrors,
  SkillView,
  VisitLogItem,
} from "@/types/resume";

const DEFAULT_PRIMARY_WORKSPACE_ID = "public-resume";
const FONT_STORAGE_KEY = "resume.font-family";
const PWA_INSTALL_DISMISSED_KEY = "resume.pwa-install-dismissed";
const FONT_OPTIONS = [
  {
    value: "pretendard",
    label: "Pretendard",
    stack: '"Pretendard", "Noto Sans KR", "Malgun Gothic", sans-serif',
  },
  {
    value: "korpub-dotum",
    label: "KorPub 돋움체",
    stack: '"KorPub 돋움체", "KorPub Dotum", "Pretendard", "Noto Sans KR", "Malgun Gothic", sans-serif',
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

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function validateExperience(form: ExperienceFormValues): ExperienceValidationErrors {
  const errors: ExperienceValidationErrors = {};

  if (!form.title.trim()) errors.title = "업무명 또는 프로젝트명을 입력하세요.";
  if (!form.organization.trim()) errors.organization = "고객사 또는 조직명을 입력하세요.";
  if (!form.period.trim()) errors.period = "기간을 입력하세요.";
  if (isEmptyRichText(form.description)) errors.description = "업무 설명을 입력하세요.";

  return errors;
}

function validateCompany(form: CompanyFormValues): CompanyValidationErrors {
  const errors: CompanyValidationErrors = {};

  if (!form.organization.trim()) errors.organization = "회사명을 입력하세요.";
  if (!form.period.trim()) errors.period = "재직 기간을 입력하세요.";
  if (isEmptyRichText(form.summary)) errors.summary = "회사 요약을 입력하세요.";
  if (isEmptyRichText(form.responsibilitiesHtml)) errors.responsibilitiesHtml = "핵심 업무를 입력하세요.";

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

function getExperienceImages(item: ExperienceItem) {
  return Array.from(new Set([...(item.images ?? []), item.image].filter((image): image is string => Boolean(image))));
}

function getPdfSnapshotMonthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  downloadUrl(url, fileName);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadUrl(url: string, fileName: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function getPwaInstallDismissed() {
  try {
    return window.localStorage.getItem(PWA_INSTALL_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

function setPwaInstallDismissed() {
  try {
    window.localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, "true");
  } catch {
    // Storage may be unavailable in strict private browsing modes.
  }
}

function PwaInstallPrompt({
  canInstall,
  onInstall,
  onDismiss,
}: {
  canInstall: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}) {
  return (
    <div data-testid="pwa-install-prompt" className="screen-only md:hidden rounded-[9px] border border-sky-100 bg-white px-2.5 py-2 shadow-sm">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-slate-950 text-white">
          <Smartphone className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-5 text-slate-950">홈 화면에 설치</p>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
            {canInstall ? "설치하면 앱처럼 바로 열 수 있습니다." : "브라우저 메뉴나 공유 버튼에서 홈 화면에 추가할 수 있습니다."}
          </p>
        </div>
        {canInstall ? (
          <button
            type="button"
            onClick={onInstall}
            className="h-7 shrink-0 rounded-[8px] border border-slate-950 bg-slate-950 px-2.5 text-[11px] font-semibold leading-4 text-white"
          >
            설치
          </button>
        ) : null}
        <button
          type="button"
          onClick={onDismiss}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] border border-slate-200 bg-white text-slate-500"
          aria-label="홈 화면 설치 안내 닫기"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const isPublicResumeMode = ((import.meta.env.VITE_PUBLIC_RESUME_MODE as string | undefined) ?? "false") === "true";
  const adminEmails = parseEnvEmailList(import.meta.env.VITE_ADMIN_EMAILS as string | undefined);
  const editorEmails = parseEnvEmailList(import.meta.env.VITE_EDITOR_EMAILS as string | undefined);
  const configuredWorkspaceId = (import.meta.env.VITE_PRIMARY_WORKSPACE_ID as string | undefined)?.trim();
  const primaryWorkspaceId = (configuredWorkspaceId || DEFAULT_PRIMARY_WORKSPACE_ID).toLowerCase();
  // In public mode, restrict sign-in itself to the editor accounts (e.g. totoriverce@gmail.com);
  // other Google accounts are rejected at login rather than allowed in as view-only.
  const allowedEmails = isPublicResumeMode ? editorEmails : adminEmails;
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
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [linkPopupUrl, setLinkPopupUrl] = useState<string | null>(null);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isPwaInstallVisible, setIsPwaInstallVisible] = useState(false);
  const [isStandaloneApp, setIsStandaloneApp] = useState(false);
  const visitOwnerRef = useRef<string | null>(null);
  const activeOwnerId = isPublicResumeMode ? primaryWorkspaceId : currentWorkspaceId;
  const effectiveIsEditMode = canEdit && isEditMode;
  const canSaveWorkspace = canEdit;
  const fallbackOwnerIds = useMemo(
    () =>
      [primaryWorkspaceId, normalizedUserEmail, user?.sub]
        .filter((ownerId): ownerId is string => Boolean(ownerId))
        .filter((ownerId, index, ownerIds) => ownerIds.indexOf(ownerId) === index),
    [normalizedUserEmail, primaryWorkspaceId, user?.sub],
  );
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
  const mobileHeaderChipClass = "h-7 shrink-0 whitespace-nowrap rounded-[9px] border px-1.5 py-0 text-[10px] leading-4 sm:px-2";
  const publicHeaderControlClass = "h-7 w-full min-w-0 md:w-[180px]";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const getIsStandalone = () => standaloneQuery.matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    const updateStandaloneState = () => {
      const nextIsStandalone = getIsStandalone();
      setIsStandaloneApp(nextIsStandalone);
      if (nextIsStandalone) setIsPwaInstallVisible(false);
    };
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event as BeforeInstallPromptEvent);
      if (!getIsStandalone() && !getPwaInstallDismissed()) {
        setIsPwaInstallVisible(true);
      }
    };
    const handleAppInstalled = () => {
      setDeferredInstallPrompt(null);
      setIsPwaInstallVisible(false);
      setPwaInstallDismissed();
    };

    updateStandaloneState();
    if (!getIsStandalone() && !getPwaInstallDismissed()) {
      setIsPwaInstallVisible(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    if ("addEventListener" in standaloneQuery) {
      standaloneQuery.addEventListener("change", updateStandaloneState);
    } else {
      standaloneQuery.addListener(updateStandaloneState);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      if ("removeEventListener" in standaloneQuery) {
        standaloneQuery.removeEventListener("change", updateStandaloneState);
      } else {
        standaloneQuery.removeListener(updateStandaloneState);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const selectedOption = FONT_OPTIONS.find((option) => option.value === fontFamily) ?? FONT_OPTIONS[0];
    document.documentElement.style.setProperty("--resume-font-family", selectedOption.stack);
    window.localStorage.setItem(FONT_STORAGE_KEY, selectedOption.value);
  }, [fontFamily]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ url?: string }>).detail;
      if (detail?.url) setLinkPopupUrl(detail.url);
    };
    window.addEventListener("resume:openLink", handler);
    return () => window.removeEventListener("resume:openLink", handler);
  }, []);

  useEffect(() => {
    if (!linkPopupUrl) {
      document.body.style.overflow = "";
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLinkPopupUrl(null);
    };
    const previousOverflow = document.body.style.overflow;
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [linkPopupUrl]);

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

    async function refreshRemoteLogs() {
      if (!canEdit) {
        setVisitLogs([]);
        return;
      }

      try {
        const remoteLogs = await fetchPublicVisitLogs(activeOwnerId);
        if (isCancelled) return;
        setVisitLogs(remoteLogs);
      } catch (error) {
        console.warn("방문 로그 동기화에 실패했습니다.", error);
      }
    }

    async function syncVisitCount() {
      try {
        const currentRemoteCount = await getPublicVisitCount(activeOwnerId);
        if (isCancelled) return;

        if (!isCountableVisit) {
          setVisitCount(currentRemoteCount ?? 0);
          await refreshRemoteLogs();
          return;
        }

        if (visitOwnerRef.current === activeOwnerId) {
          setVisitCount(currentRemoteCount ?? readLocalVisitCount(countKey));
          await refreshRemoteLogs();
          return;
        }

        visitOwnerRef.current = activeOwnerId;

        let nextCount: number | null = null;
        try {
          const visitorInfo = await getVisitorNetworkInfo();
          nextCount = await recordPublicVisitLog({
            ownerId: activeOwnerId,
            mode: isPublicResumeMode ? "공개 보기" : "편집 모드",
            ownerName: profile.name.trim() || "이력서",
            userLabel: (user?.name ?? "").trim() || (user?.email ?? "").trim() || "게스트",
            userEmail: user?.email ?? "",
            visitorInfo,
          });
        } catch (logError) {
          console.warn("방문 로그 기록에 실패했습니다.", logError);
        }

        if (nextCount === null) {
          nextCount = currentRemoteCount === null ? readLocalVisitCount(countKey) + 1 : await incrementPublicVisitCount(activeOwnerId);
        }
        if (isCancelled) return;

        const safeNextCount = nextCount ?? 0;
        if (currentRemoteCount === null) {
          window.localStorage.setItem(countKey, String(safeNextCount));
        }
        setVisitCount(safeNextCount);

        await refreshRemoteLogs();
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
  }, [activeOwnerId, canEdit, isLoading, isPublicResumeMode, profile.name, user]);

  const allExperiences = useMemo(
    () => dedupeExperienceItems(experiences).sort((left, right) => getExperiencePeriodScore(right.period) - getExperiencePeriodScore(left.period)),
    [experiences],
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
    { key: "visit-log", label: "로그", icon: Eye },
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

  const dismissPwaInstallPrompt = () => {
    setPwaInstallDismissed();
    setIsPwaInstallVisible(false);
  };

  const installPwa = async () => {
    if (!deferredInstallPrompt) return;
    const installPrompt = deferredInstallPrompt;
    setDeferredInstallPrompt(null);
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setPwaInstallDismissed();
        setIsPwaInstallVisible(false);
      }
    } catch (error) {
      console.warn("PWA 설치 프롬프트를 표시하지 못했습니다.", error);
      setIsPwaInstallVisible(true);
    }
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
      responsibilities: [],
      responsibilitiesHtml: companyForm.responsibilitiesHtml.trim(),
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
      existingTags: form.highlight,
    });
    const userHighlight = form.highlight.map((tag) => tag.trim()).filter(Boolean);
    const mergedHighlight = userHighlight.length
      ? Array.from(new Set(userHighlight))
      : generateSecurityTags({
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
      highlight: mergedHighlight,
      url: form.url.trim() || undefined,
      image: form.images[0] || form.image || undefined,
      images: form.images.length ? form.images : form.image ? [form.image] : undefined,
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
      image: getExperienceImages(item)[0] ?? "",
      images: getExperienceImages(item),
      featured: item.featured ?? false,
      documentType: item.documentType ?? "technical",
      highlight: item.highlight ?? [],
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
      responsibilitiesHtml: company.responsibilitiesHtml ?? listToHtml(company.responsibilities),
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

  const downloadResumePdf = async () => {
    if (isDownloadingPdf) return;
    const isMobilePdfDownload = window.matchMedia("(max-width: 767px)").matches;
    if (isMobilePdfDownload && !window.confirm("PDF를 다운로드 하시겠습니까?")) return;

    setIsDownloadingPdf(true);
    const safeName = (derivedProfile.name ?? "이력서").replace(/\s+/g, "_");
    const pdfFileName = `${safeName}_이력서.pdf`;
    const recordPdfDownload = async () => {
      const visitorInfo = await getVisitorNetworkInfo();
      await recordPublicDownloadLog({
        ownerId: activeOwnerId,
        ownerName: derivedProfile.name?.trim() || "이력서",
        userLabel: (user?.name ?? "").trim() || (user?.email ?? "").trim() || "게스트",
        userEmail: user?.email ?? "",
        visitorInfo,
      });
    };

    try {
      const snapshot = await getLatestResumePdfSnapshot(activeOwnerId);
      if (snapshot?.publicUrl) {
        const snapshotUrl = new URL(snapshot.publicUrl);
        snapshotUrl.searchParams.set("downloadName", pdfFileName);
        downloadUrl(snapshotUrl.toString(), pdfFileName);
        await recordPdfDownload();
        setIsDownloadingPdf(false);
        return;
      }
    } catch (snapshotError) {
      console.warn("PDF 스냅샷 다운로드 준비에 실패했습니다. 즉시 생성으로 전환합니다.", snapshotError);
    }

    // The full resume (resume/portfolio/technical sections) only renders in
    // preview mode on the dashboard tab; force that so the PDF contains the whole
    // résumé and not just the editor's "경력 요약" dashboard. Restored afterwards.
    const previousEditMode = isEditMode;
    const previousSection = selectedEditorSection;
    setIsEditMode(false);
    setSelectedEditorSection("dashboard");

    // Let the forced layout render before capturing.
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await new Promise<void>((resolve) => window.setTimeout(resolve, 60));

    const originalSrcs = new Map<HTMLImageElement, string>();

    try {
      const target = document.querySelector(".print-content") as HTMLElement | null;
      if (!target) throw new Error("이력서 콘텐츠를 찾을 수 없습니다.");

      if (document.fonts?.ready) await document.fonts.ready;

      const images = Array.from(target.querySelectorAll("img"));
      const blobToDataUrl = (blob: Blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
      await Promise.all(
        images.map(async (img) => {
          if (!img.src || img.src.startsWith("data:")) return;
          const originalSrc = img.src;
          const candidates = [
            originalSrc,
            `https://images.weserv.nl/?url=${encodeURIComponent(originalSrc.replace(/^https?:\/\//, ""))}`,
          ];
          for (const candidate of candidates) {
            try {
              const res = await fetch(candidate, { mode: "cors", cache: "force-cache" });
              if (!res.ok) continue;
              const blob = await res.blob();
              const dataUrl = await blobToDataUrl(blob);
              originalSrcs.set(img, originalSrc);
              img.src = dataUrl;
              return;
            } catch {
              // try next candidate
            }
          }
        }),
      );

      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const sectionEls = Array.from(target.querySelectorAll<HTMLElement>("[data-pdf-section]"));
      const captureTargets: HTMLElement[] = (() => {
        const targets: HTMLElement[] = [];
        const sourceSections = sectionEls.length ? sectionEls : [target];
        sourceSections.forEach((sectionEl) => {
          if (sectionEl.dataset.pdfSection === "resume") {
            const dashboard = sectionEl.querySelector<HTMLElement>("[data-export-dashboard]");
            const dashboardParts = [
              dashboard?.querySelector<HTMLElement>("[data-export-dashboard-upper]"),
              dashboard?.querySelector<HTMLElement>("[data-export-kpis]"),
              ...(dashboard ? Array.from(dashboard.querySelectorAll<HTMLElement>("[data-export-dashboard-panels] > *")) : []),
            ].filter((el): el is HTMLElement => Boolean(el));

            const resumeParts = [
              ...dashboardParts,
              ...Array.from(
                sectionEl.querySelectorAll<HTMLElement>(
                  "[data-export-intro], [data-export-company] [data-export-block], [data-export-company] [data-export-company-summary], [data-export-company] [data-export-project-card]",
                ),
              ),
            ];

            targets.push(...resumeParts);
            return;
          }

          const blocks = Array.from(sectionEl.querySelectorAll<HTMLElement>("[data-export-block], [data-export-project-card]"));
          targets.push(...(blocks.length ? blocks : [sectionEl]));
        });

        return targets.length ? targets : sourceSections;
      })();

      const captureOptions = {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        onclone: (clonedDoc: Document) => {
          clonedDoc.documentElement.classList.add("is-exporting");
          clonedDoc.querySelectorAll<HTMLElement>(".print-content [class*='min-h-[']").forEach((el) => {
            el.style.setProperty("min-height", "0", "important");
            el.style.setProperty("align-items", "flex-start", "important");
            el.style.setProperty("padding-top", "0.45em", "important");
            el.style.setProperty("padding-bottom", "0.45em", "important");
          });
          clonedDoc.querySelectorAll<HTMLElement>(".print-content .grid").forEach((grid) => {
            grid.style.setProperty("align-items", "start", "important");
          });
          clonedDoc.querySelectorAll<HTMLElement>(".print-content .resume-responsibility-pill").forEach((el) => {
            el.style.setProperty("text-align", "left", "important");
            el.style.setProperty("align-items", "flex-start", "important");
            el.style.setProperty("justify-content", "flex-start", "important");
          });
          clonedDoc.querySelectorAll<HTMLElement>(".print-content [class*='leading-none']").forEach((el) => {
            el.style.setProperty("line-height", "1.4", "important");
          });
          clonedDoc.querySelectorAll<HTMLImageElement>(".print-content img").forEach((img) => {
            img.style.setProperty("height", "auto", "important");
            img.style.setProperty("max-height", "none", "important");
            img.style.setProperty("object-fit", "contain", "important");
          });
        },
      };

      const PAGE_WIDTH_MM = 210; // A4 width
      const PAGE_HEIGHT_MM = 297; // A4 height
      const margin = 5;
      const contentWidthMm = PAGE_WIDTH_MM - margin * 2;
      const contentHeightMm = PAGE_HEIGHT_MM - margin * 2;
      const blockGapMm = 2;
      // Render at a fixed desktop width so a download from a phone still uses the
      // desktop layout. Chrome handles very large canvases (scale 2 stays crisp);
      // Safari/iOS cap at ~16k px and return an empty 0×0 canvas, so step down then.
      const EXPORT_WIDTH = 1024;
      const scaleCandidates = isMobilePdfDownload ? [1, 0.75, 0.5] : [2, 1.5, 1, 0.75, 0.5];

      let pdf: InstanceType<typeof jsPDF> | null = null;
      let currentPageYmm = margin;

      const addA4Page = () => {
        if (!pdf) {
          pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "p" });
        } else {
          pdf.addPage("a4", "p");
        }
        currentPageYmm = margin;
      };

      for (const sectionEl of captureTargets) {
        const shouldStartCompanyPage =
          sectionEl.matches("[data-export-company] > [data-export-block]") &&
          sectionEl.closest("[data-export-company]")?.classList.contains("resume-company-page-break");

        if (shouldStartCompanyPage && pdf) {
          addA4Page();
        }

        let sectionCanvas: HTMLCanvasElement | null = null;
        for (const scale of scaleCandidates) {
          const candidate = await html2canvas(sectionEl, {
            ...captureOptions,
            scale,
            windowWidth: EXPORT_WIDTH,
          });
          if (candidate.width && candidate.height) {
            sectionCanvas = candidate;
            break;
          }
        }

        if (!sectionCanvas) continue;
        const blockHeightMm = (sectionCanvas.height * contentWidthMm) / sectionCanvas.width;
        if (!Number.isFinite(blockHeightMm) || blockHeightMm <= 0) continue;

        if (blockHeightMm <= contentHeightMm) {
          if (!pdf || currentPageYmm + blockHeightMm > PAGE_HEIGHT_MM - margin) {
            addA4Page();
          }

          pdf.addImage(sectionCanvas.toDataURL("image/jpeg", 0.95), "JPEG", margin, currentPageYmm, contentWidthMm, blockHeightMm);
          currentPageYmm += blockHeightMm + blockGapMm;
          continue;
        }

        addA4Page();
        const fittedWidthMm = Math.min(contentWidthMm, (sectionCanvas.width * contentHeightMm) / sectionCanvas.height);
        const fittedHeightMm = (sectionCanvas.height * fittedWidthMm) / sectionCanvas.width;
        const fittedXmm = (PAGE_WIDTH_MM - fittedWidthMm) / 2;
        pdf.addImage(sectionCanvas.toDataURL("image/jpeg", 0.95), "JPEG", fittedXmm, margin, fittedWidthMm, fittedHeightMm);
        currentPageYmm = margin + fittedHeightMm + blockGapMm;
      }

      if (!pdf) throw new Error("이력서 콘텐츠를 캡처하지 못했습니다.");

      const pdfBlob = pdf.output("blob") as Blob;
      downloadBlob(pdfBlob, pdfFileName);

      try {
        await recordPdfDownload();
      } catch (logError) {
        console.warn("PDF 다운로드 로그 기록에 실패했습니다.", logError);
      }

      try {
        await uploadResumePdfSnapshot(pdfBlob, activeOwnerId, getPdfSnapshotMonthKey());
      } catch (snapshotError) {
        console.warn("PDF 월간 스냅샷 저장에 실패했습니다.", snapshotError);
      }
    } catch (pdfError) {
      setAssetUploadError(pdfError instanceof Error ? pdfError.message : "PDF 다운로드에 실패했습니다.");
    } finally {
      originalSrcs.forEach((src, img) => {
        img.src = src;
      });
      document.documentElement.classList.remove("is-exporting");
      setIsEditMode(previousEditMode);
      setSelectedEditorSection(previousSection);
      setIsDownloadingPdf(false);
    }
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

      if (!isAssetUploadConfigured) {
        if (isPublicResumeMode) {
          throw new Error("첨부 파일 저장소가 설정되지 않아 사진을 저장할 수 없습니다.");
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

  const uploadExperienceImages = async (files: File[]) => {
    if (!files.length) return;
    setIsUploadingExperienceImage(true);
    setAssetUploadError(null);

    try {
      if (!isAssetUploadConfigured) {
        if (isPublicResumeMode) {
          throw new Error("첨부 파일 저장소가 설정되지 않아 이미지를 저장할 수 없습니다.");
        }
        const dataUrls = await Promise.all(files.map((file) => readFileAsDataUrl(file)));
        setForm((prev) => {
          const images = [...(prev.images ?? []), ...dataUrls];
          return { ...prev, image: images[0] ?? "", images };
        });
        return;
      }

      const publicUrls = await Promise.all(files.map((file) => uploadResumeAsset(file, activeOwnerId, "experience")));
      setForm((prev) => {
        const images = [...(prev.images ?? []), ...publicUrls];
        return { ...prev, image: images[0] ?? "", images };
      });
    } catch (uploadError) {
      setAssetUploadError(uploadError instanceof Error ? uploadError.message : "업무 이미지를 업로드하지 못했습니다. 잠시 후 다시 시도하세요.");
    } finally {
      setIsUploadingExperienceImage(false);
    }
  };

  return (
    <div className="resume-app min-h-[100dvh] w-full overflow-x-hidden bg-slate-100 px-2 py-2 sm:px-4 md:px-6 md:py-6">
      {linkPopupUrl ? <ProjectLinkPopup url={linkPopupUrl} onClose={() => setLinkPopupUrl(null)} /> : null}
      {showSavedNotice ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4 screen-only">
          <div className="rounded-[10px] border border-emerald-200 bg-white/95 px-6 py-4 text-center shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur">
            <p className="text-base font-semibold text-slate-900">저장되었습니다</p>
          </div>
        </div>
      ) : null}
      <div className="flex min-h-[inherit] flex-col gap-1 md:gap-5">
        <Card className="z-30 shrink-0 rounded-[10px] border border-slate-200 bg-white/95 shadow-sm backdrop-blur screen-only">
          <CardContent className="p-2 sm:p-2.5">
            <div className={isPublicResumeMode ? "grid w-full grid-cols-3 items-center gap-1 md:flex md:flex-wrap md:justify-end md:gap-1.5 md:overflow-visible" : "flex w-full flex-nowrap items-center gap-1 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0"}>
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
                  <button
                    type="button"
                    onClick={downloadResumePdf}
                    disabled={isDownloadingPdf}
                    className={`${mobileHeaderChipClass} ${publicHeaderControlClass} flex items-center justify-center gap-1 border-slate-200 bg-white text-[12px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 md:px-2.5 md:text-[12px]`}
                    aria-label="이력서 PDF 다운로드"
                  >
                    <Download className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span className="sm:hidden">{isDownloadingPdf ? "생성중" : "PDF"}</span>
                    <span className="hidden sm:inline">{isDownloadingPdf ? "생성 중..." : "PDF 다운로드"}</span>
                  </button>
                  <div className={`${mobileHeaderChipClass} ${publicHeaderControlClass} flex items-center justify-center gap-1 border-slate-200 bg-slate-50 text-[12px] font-medium text-slate-600 md:px-2.5 md:text-[12px]`}>
                    <span className="sm:hidden">방문 {visitCount}</span>
                    <span className="hidden sm:inline">방문 횟수: {visitCount}</span>
                  </div>
                  {user ? (
                    <div className={`${mobileHeaderChipClass} ${publicHeaderControlClass} flex items-center gap-1.5 border-slate-200 bg-slate-50 text-slate-600 md:px-2.5 md:text-[12px]`}>
                      {user.picture ? <img src={user.picture} alt={user.name} className="h-5 w-5 rounded-full md:h-8 md:w-8" referrerPolicy="no-referrer" /> : null}
                      <div className="min-w-0 text-left">
                        <p className="truncate text-[10px] font-medium leading-4 text-slate-900 md:text-[13px]">{user.name}</p>
                      </div>
                    </div>
                  ) : null}
                  {!user && isFirebaseConfigured ? (
                    <div className={`${publicHeaderControlClass} shrink-0`}>
                      <GoogleSignInButton compact disabled={!isReady} onSuccess={signIn} />
                    </div>
                  ) : null}
                  {!user && !isFirebaseConfigured ? (
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

        {isPublicResumeMode && !effectiveIsEditMode && isPwaInstallVisible && !isStandaloneApp ? (
          <PwaInstallPrompt
            canInstall={Boolean(deferredInstallPrompt)}
            onInstall={installPwa}
            onDismiss={dismissPwaInstallPrompt}
          />
        ) : null}

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
                        <CareerDashboard items={allExperiences} profile={derivedProfile} companies={companies} isEditable />
                      </div>
                    ) : (
                      <div className="space-y-2 md:space-y-4">
                        <div data-pdf-section="resume" className="space-y-2 md:space-y-4">
                          <div className="bg-transparent" data-export-dashboard>
                            <CareerDashboard items={allExperiences} profile={derivedProfile} companies={companies} />
                          </div>
                          <div className="space-y-2 md:space-y-4">
                            <h2 className="mt-3 text-[16px] font-extrabold leading-5 tracking-tight text-slate-950 drop-shadow-[0_1px_0_rgba(255,255,255,0.7)] md:mt-0 md:text-2xl md:leading-7" data-export-block>
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
                        </div>
                        <div data-pdf-section="portfolio">
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
                        </div>
                        <div data-pdf-section="technical">
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
                      onUploadImages={uploadExperienceImages}
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
                  {selectedEditorSection === "settings" ? (
                    <SettingsPanel
                      fontFamily={fontFamily}
                      onFontFamilyChange={setFontFamily}
                      skillView={profile.defaultSkillView ?? "orbit"}
                      onSkillViewChange={(value) => setProfile((prev) => ({ ...prev, defaultSkillView: value }))}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectLinkPopup({ url, onClose }: { url: string; onClose: () => void }) {
  let hostname = url;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    hostname = url;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.32)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 sm:px-4">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-5 text-slate-900">{hostname}</p>
            <p className="truncate text-[11px] leading-4 text-slate-500">{url}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <a
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 rounded-[8px] border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />새 탭
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <iframe
          src={url}
          title={`${hostname} 프리뷰`}
          className="h-full w-full flex-1 border-0 bg-white"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}

function VisitLogPanel({ logs }: { logs: VisitLogItem[] }) {
  const [filter, setFilter] = useState<"all" | "visit" | "download">("all");

  const totalCount = logs.length;
  const visitCount = logs.filter((log) => log.mode !== "PDF 다운로드").length;
  const downloadCount = logs.filter((log) => log.mode === "PDF 다운로드").length;

  const filteredLogs = logs.filter((log) => {
    if (filter === "visit") return log.mode !== "PDF 다운로드";
    if (filter === "download") return log.mode === "PDF 다운로드";
    return true;
  });

  const filters: { key: "all" | "visit" | "download"; label: string; count: number }[] = [
    { key: "all", label: "전체", count: totalCount },
    { key: "visit", label: "방문", count: visitCount },
    { key: "download", label: "다운로드", count: downloadCount },
  ];

  return (
    <Card className="rounded-[10px] border border-slate-200 bg-white shadow-sm screen-only">
      <CardContent className="space-y-3 p-3.5 sm:p-4">
        <div>
          <h2 className="text-base font-semibold leading-6">로그</h2>
          <p className="text-[13px] leading-5 text-slate-500">공개 보기 접속과 PDF 다운로드 이력을 모두 표시합니다.</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {filters.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
              className={
                filter === option.key
                  ? "inline-flex items-center gap-1.5 rounded-[8px] border border-slate-950 bg-slate-950 px-3 py-1 text-[12px] font-medium leading-4 text-white"
                  : "inline-flex items-center gap-1.5 rounded-[8px] border border-slate-200 bg-white px-3 py-1 text-[12px] font-medium leading-4 text-slate-700 hover:bg-slate-50"
              }
            >
              {option.label}
              <span
                className={
                  filter === option.key
                    ? "rounded-full bg-white/15 px-1.5 text-[10px] leading-4 text-white"
                    : "rounded-full bg-slate-100 px-1.5 text-[10px] leading-4 text-slate-500"
                }
              >
                {option.count}
              </span>
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-[10px] border border-slate-200">
          <table className="min-w-[920px] w-full border-collapse text-center text-[13px] leading-5">
            <thead className="bg-slate-50">
              <tr className="text-slate-500">
                <th className="border-b border-slate-200 px-3 py-2 font-bold">시각</th>
                <th className="border-b border-slate-200 px-3 py-2 font-bold">모드</th>
                <th className="border-b border-slate-200 px-3 py-2 font-bold">사용자</th>
                <th className="border-b border-slate-200 px-3 py-2 font-bold">대상</th>
                <th className="border-b border-slate-200 px-3 py-2 font-bold">IP</th>
                <th className="border-b border-slate-200 px-3 py-2 font-bold">위치</th>
                <th className="border-b border-slate-200 px-3 py-2 font-bold">레퍼럴</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{formatVisitAt(log.visitedAt)}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{log.mode}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{log.userLabel}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{log.ownerName}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-500">{log.ipAddress ?? "-"}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-500">{log.locationLabel ?? log.countryCode ?? "-"}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-500">{log.referrer ?? "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={7}>
                    아직 로그가 없습니다.
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
      <Card className="overflow-hidden rounded-[10px] border border-sky-100 bg-white shadow-sm">
        <CardContent className="space-y-3 p-0">
          <div className="flex items-center justify-between gap-3 border-b border-sky-900 bg-sky-900 px-3.5 py-3 text-white sm:px-4" data-export-block>
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
        <div className={`flex flex-col gap-1 border-b px-3.5 py-3 sm:px-4 ${panelTone.header}`} data-export-block>
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
  const images = getExperienceImages(item);

  return (
    <div className="min-w-0 overflow-hidden rounded-[10px] border border-sky-100 bg-white p-3.5 sm:p-4" data-export-block>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="break-keep text-base font-semibold leading-6 text-slate-950">{item.title}</h3>
          <p className="mt-0.5 break-keep text-[13px] leading-5 text-slate-500">
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

      <div className="mt-3 min-w-0">
        <p className="break-keep break-words text-sm leading-6 text-slate-700">{summarizePortfolioDescription(item.description)}</p>
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

      {item.url ? (
        <div className="mt-3">
          <PortfolioLink url={item.url} />
        </div>
      ) : null}

      {images.length ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {images.map((image, index) => (
            <div key={`${item.id}-portfolio-image-${index}`} className="w-full overflow-hidden rounded-[10px] border border-slate-200 bg-slate-50">
              <img src={image} alt={`${item.title} 이미지 ${index + 1}`} className="h-auto max-h-[374px] w-full object-contain" />
            </div>
          ))}
        </div>
      ) : null}

      {isEditMode ? (
        <div className="mt-3 flex justify-end">
          <Button className="border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] text-rose-600" onClick={() => onRemove(item.id)}>
            삭제
          </Button>
        </div>
      ) : null}
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
  // description may be rich HTML; reduce to plain text for the short card preview.
  const plain = description
    .replace(/<\/(p|div|li|h[1-3]|tr)>/gi, "\n")
    .replace(/<br\s*\/?>(?=)/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

  const firstParagraph = plain
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)[0];

  return firstParagraph || "수행 산출물과 관련 자료를 확인할 수 있는 포트폴리오 항목입니다.";
}

function TechnicalCareerNarrative({ items }: { items: ExperienceItem[] }) {
  const { summary, companies } = buildTechnicalCareerNarrative(items);

  return (
    <article className="rounded-[10px] border border-slate-200 bg-white px-2.5 pb-5 pt-3 sm:px-5 sm:pb-7 sm:pt-5">
      <div data-export-block>
        <h3 className="text-base font-semibold leading-6 text-slate-950">Summary</h3>
        <p className="mt-2 text-sm leading-7 text-slate-700">{summary}</p>
      </div>

      <div className="mt-5 space-y-5">
        {companies.map((company) => (
          <section key={company.organization} className="border-t border-slate-100 pt-4 last:pb-1" data-export-block>
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
  skillView,
  onSkillViewChange,
}: {
  fontFamily: string;
  onFontFamilyChange: (value: string) => void;
  skillView: SkillView;
  onSkillViewChange: (value: SkillView) => void;
}) {
  const skillViewOptions: { value: SkillView; label: string; description: string }[] = [
    { value: "orbit", label: "회전 (Orbit)", description: "태그 24개를 그라데이션 클라우드로 보여줍니다." },
    { value: "chips", label: "칩 (Chips)", description: "태그 40개를 빈도 강조 칩으로 정렬합니다." },
    { value: "bars", label: "막대 (Bars)", description: "전체 태그를 사용 빈도 막대 그래프로 표시합니다." },
    { value: "list", label: "목록 (List)", description: "전체 태그를 순위 목록으로 나열합니다." },
  ];

  return (
    <Card className="rounded-[10px] border border-slate-200 bg-white shadow-sm screen-only">
      <CardContent className="space-y-4 p-3.5 sm:p-4">
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

        <div className="space-y-2">
          <label className="text-[13px] font-medium leading-5 text-slate-700">핵심 역량 분포 기본 보기</label>
          <select
            className="w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-[13px] leading-5 text-slate-700 outline-none"
            value={skillView}
            onChange={(event) => onSkillViewChange(event.target.value as SkillView)}
          >
            {skillViewOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] leading-4 text-slate-500">{skillViewOptions.find((option) => option.value === skillView)?.description}</p>
          <p className="text-[11px] leading-4 text-slate-500">방문자에게 처음 노출될 화면을 결정합니다. 저장하면 모든 접속자에게 동일하게 적용됩니다.</p>
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

function readLocalVisitCount(key: string) {
  if (typeof window === "undefined") return 0;

  const raw = window.localStorage.getItem(key);
  const currentCount = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(currentCount) && currentCount > 0 ? currentCount : 0;
}

function getVisitCountKey(ownerId: string) {
  return `resume.visit-count.${ownerId}`;
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
