import { useCallback, useEffect, useMemo, useState } from "react";
import { loadWorkspace, saveWorkspace, getStorageMode, listLocalWorkspaceSummaries } from "@/lib/resume-workspace";
import type { CompanyProfile, ExperienceItem, Profile, ResumeWorkspace, WorkspaceSummary } from "@/types/resume";

type UseResumeWorkspaceArgs = {
  ownerId: string;
  defaultProfile: Profile;
  defaultCompanies: CompanyProfile[];
  defaultExperiences: ExperienceItem[];
  canSave?: boolean;
};

export function useResumeWorkspace({ ownerId, defaultProfile, defaultCompanies, defaultExperiences, canSave = true }: UseResumeWorkspaceArgs) {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [companies, setCompanies] = useState<CompanyProfile[]>(defaultCompanies);
  const [experiences, setExperiences] = useState<ExperienceItem[]>(defaultExperiences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const storageMode = useMemo(() => getStorageMode(), []);

  useEffect(() => {
    if (!ownerId) {
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);

    loadWorkspace(ownerId, defaultProfile, defaultCompanies, defaultExperiences)
      .then((workspace) => {
        if (!active) return;
        setProfile(workspace.profile);
        setCompanies(workspace.companies);
        setExperiences(workspace.experiences);
        setUpdatedAt(workspace.updatedAt);
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setError("이력서 데이터를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [defaultCompanies, defaultExperiences, defaultProfile, ownerId]);

  useEffect(() => {
    if (!ownerId || isLoading) return;
    if (!canSave) return;

    const timer = window.setTimeout(() => {
      const workspace: ResumeWorkspace = {
        ownerId,
        editorEmail: null,
        profile,
        companies,
        experiences,
        updatedAt: new Date().toISOString(),
      };

      setIsSaving(true);

      saveWorkspace(workspace)
        .then(() => {
          setUpdatedAt(workspace.updatedAt);
          setError(null);
        })
        .catch(() => {
          setError("이력서 데이터를 저장하지 못했습니다.");
        })
        .finally(() => {
          setIsSaving(false);
        });
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [canSave, companies, experiences, isLoading, ownerId, profile]);

  const resetWorkspace = () => {
    setProfile(defaultProfile);
    setCompanies(defaultCompanies);
    setExperiences(defaultExperiences);
  };

  const listWorkspaces = useCallback(() => listLocalWorkspaceSummaries(), []);

  const saveNow = useCallback(async () => {
    if (!ownerId || !canSave) return;

    const workspace: ResumeWorkspace = {
      ownerId,
      editorEmail: null,
      profile,
      companies,
      experiences,
      updatedAt: new Date().toISOString(),
    };

    setIsSaving(true);

    try {
      await saveWorkspace(workspace);
      setUpdatedAt(workspace.updatedAt);
      setError(null);
    } catch {
      setError("이력서 데이터를 저장하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }, [canSave, companies, experiences, ownerId, profile]);

  return {
    profile,
    setProfile,
    companies,
    setCompanies,
    experiences,
    setExperiences,
    isLoading,
    isSaving,
    error,
    updatedAt,
    storageMode,
    resetWorkspace,
    listWorkspaces,
    saveNow,
  };
}
