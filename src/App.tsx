import { useEffect, useMemo, useState } from "react";
import { BarChart3, Building2, BriefcaseBusiness, Eye, LogOut, Pencil, RotateCcw, ShieldAlert, ShieldCheck, UserRound } from "lucide-react";
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
import type { CompanyFormValues, CompanyProfile, CompanyValidationErrors, ExperienceFormValues, ExperienceItem, ExperienceValidationErrors, ResumeCategory, WorkspaceSummary } from "@/types/resume";

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
  const [selectedEditorSection, setSelectedEditorSection] = useState<"dashboard" | "profile" | "company" | "experience">("dashboard");
  const [isUploadingProfilePhoto, setIsUploadingProfilePhoto] = useState(false);
  const [isUploadingExperienceImage, setIsUploadingExperienceImage] = useState(false);
  const [assetUploadError, setAssetUploadError] = useState<string | null>(null);
  const [visitCount, setVisitCount] = useState(0);
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

  useEffect(() => {
    if (!activeOwnerId || typeof window === "undefined") {
      setVisitCount(0);
      return;
    }

    const countKey = getVisitCountKey(activeOwnerId);
    const sessionKey = getVisitSessionKey(activeOwnerId);
    const raw = window.localStorage.getItem(countKey);
    const currentCount = raw ? Number.parseInt(raw, 10) : 0;
    const safeCount = Number.isFinite(currentCount) && currentCount > 0 ? currentCount : 0;

    setVisitCount(safeCount);

    if (!window.sessionStorage.getItem(sessionKey)) {
      const nextCount = safeCount + 1;
      window.localStorage.setItem(countKey, String(nextCount));
      window.sessionStorage.setItem(sessionKey, "1");
      setVisitCount(nextCount);
    }
  }, [activeOwnerId]);

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
        const dataUrl = await readFileAsDataUrl(preparedFile);
        setProfile((prev) => ({ ...prev, photo: dataUrl, photoPositionX: 50, photoPositionY: 20, photoScale: 1 }));
        return;
      }

      const publicUrl = await uploadResumeAsset(preparedFile, activeOwnerId, "profile");
      setProfile((prev) => ({ ...prev, photo: publicUrl, photoPositionX: 50, photoPositionY: 20, photoScale: 1 }));
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

  if (!isPublicResumeMode && !user) {
    return <LoginPage clientId={googleClientId} isReady={isReady} error={authError} onLogin={signIn} />;
  }

  return (
    <div className="resume-app h-screen overflow-hidden bg-slate-100 px-3 py-4 sm:px-4 md:px-6 md:py-6">
      {showSavedNotice ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4 screen-only">
          <div className="rounded-[16px] border border-emerald-200 bg-white/95 px-6 py-4 text-center shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur">
            <p className="text-base font-semibold text-slate-900">저장되었습니다</p>
          </div>
        </div>
      ) : null}
      <div className="flex h-full flex-col gap-3 md:gap-5">
        <Card className="z-30 shrink-0 rounded-[10px] border border-slate-200 bg-white/95 shadow-sm backdrop-blur screen-only">
          <CardContent className="flex flex-col gap-2.5 p-2.5 sm:p-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">이력서 관리 시스템</h1>
            </div>

            <div className="grid w-full gap-1 md:flex md:w-auto md:flex-wrap">
              {!isPublicResumeMode ? (
                <>
                  <div className="flex w-full items-center gap-2 rounded-[10px] border border-slate-200 bg-slate-50 px-2.5 py-1 md:w-auto">
                    {user?.picture ? <img src={user.picture} alt={user.name} className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" /> : null}
                    <div className="min-w-0 text-left">
                      <p className="truncate text-[13px] font-medium leading-4 text-slate-900">{user?.name}</p>
                      <p className="truncate text-[12px] leading-3 text-slate-500">{user?.email}</p>
                    </div>
                  </div>
                  {isAdmin ? (
                    <div className="flex w-full items-center gap-2 rounded-[10px] border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[12px] font-medium leading-4 text-emerald-700 md:w-auto">
                      <ShieldCheck className="h-4 w-4" />
                      관리자
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="flex w-full min-w-[180px] items-center gap-2 rounded-[10px] border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-medium leading-4 text-slate-600 md:w-auto">
                    방문 회수: {visitCount}
                  </div>
                  {user ? (
                    <div className="flex w-full items-center gap-2 rounded-[10px] border border-slate-200 bg-slate-50 px-2.5 py-1 md:w-auto">
                      {user.picture ? <img src={user.picture} alt={user.name} className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" /> : null}
                      <div className="min-w-0 text-left">
                        <p className="truncate text-[13px] font-medium leading-4 text-slate-900">{user.name}</p>
                      </div>
                    </div>
                  ) : null}
                  {!user && googleClientId ? (
                    <div className="w-full min-w-[220px] md:w-[280px]">
                      <GoogleSignInButton clientId={googleClientId} disabled={!isReady} onSuccess={signIn} />
                    </div>
                  ) : null}
                  {!user && !googleClientId ? (
                    <div className="flex w-full items-center rounded-[10px] border border-amber-200 bg-amber-50 px-2.5 py-1 text-[12px] leading-4 text-amber-700 md:w-auto">
                      현재 배포본에 Google 로그인 설정이 연결되지 않아 편집 로그인을 사용할 수 없습니다.
                    </div>
                  ) : null}
                  {authError ? (
                    <div className="flex w-full items-center rounded-[10px] border border-rose-200 bg-rose-50 px-2.5 py-1 text-[12px] leading-4 text-rose-700 md:w-auto">
                      {authError}
                    </div>
                  ) : null}
                  {assetUploadError ? (
                    <div className="flex w-full items-center rounded-[10px] border border-rose-200 bg-rose-50 px-2.5 py-1 text-[12px] leading-4 text-rose-700 md:w-auto">
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
                    onClick={() => {
                      setSelectedEditorSection("dashboard");
                      setIsEditMode(false);
                    }}
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
                </>
              ) : null}
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
          <div className="space-y-4 md:space-y-5 pb-4">
            <div className={`grid gap-4 pt-1 md:gap-5 ${effectiveIsEditMode ? "xl:grid-cols-[200px_minmax(0,1fr)]" : "grid-cols-1"}`}>
              {effectiveIsEditMode && user ? (
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
                    {isAdmin ? (
                      <AdminWorkspacePanel
                        currentUserId={user.sub}
                        activeOwnerId={activeOwnerId}
                        workspaces={workspaceSummaries}
                        onSelect={setSelectedOwnerId}
                      />
                    ) : null}
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
                </div>
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


function getVisitCountKey(ownerId: string) {
  return `resume.visit-count.${ownerId}`;
}

function getVisitSessionKey(ownerId: string) {
  return `resume.visit-count.session.${ownerId}`;
}
