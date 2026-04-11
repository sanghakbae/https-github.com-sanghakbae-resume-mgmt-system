import type { CompanyProfile, ExperienceItem, Profile, ResumeWorkspace, WorkspaceSummary } from "@/types/resume";
import { generateSecurityTags, inferExperienceCategory } from "@/lib/security-tags";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const WORKSPACE_KEY_PREFIX = "resume.workspace.";

function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL as string | undefined;
}

function getLocalWorkspaceKey(ownerId: string) {
  return `${WORKSPACE_KEY_PREFIX}${ownerId}`;
}

function loadLocalWorkspace(ownerId: string) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(getLocalWorkspaceKey(ownerId));
    if (!raw) return null;
    return JSON.parse(raw) as ResumeWorkspace;
  } catch {
    return null;
  }
}

function createWorkspace(ownerId: string, profile: Profile, companies: CompanyProfile[], experiences: ExperienceItem[]): ResumeWorkspace {
  return {
    ownerId,
    editorEmail: null,
    profile,
    companies,
    experiences,
    updatedAt: new Date().toISOString(),
  };
}

function mergeCompanyProfiles(existing: CompanyProfile[], defaults: CompanyProfile[]) {
  const seen = new Set(existing.map((company) => company.organization));
  return [...existing, ...defaults.filter((company) => !seen.has(company.organization))];
}

function normalizeCompanyName(name: string) {
  return name === "무하유" ? "(주)무하유" : name;
}

function normalizeCompanyPosition(position?: string) {
  if (!position) return position;
  if (position === "팀장" || position === "과장(팀장)") return "Leader";
  return position;
}

function mergeExperiences(existing: ExperienceItem[], defaults: ExperienceItem[]) {
  const seen = new Set(existing.map((item) => `${item.organization}::${item.title}::${item.period}`));
  return [...existing, ...defaults.filter((item) => !seen.has(`${item.organization}::${item.title}::${item.period}`))];
}

function restoreProtectedDefaultExperiences(existing: ExperienceItem[], defaults: ExperienceItem[]) {
  const protectedDefaults = defaults.filter((item) => item.title === "ITGC 통제 관리시스템 개발 및 운영");
  return mergeExperiences(existing, protectedDefaults);
}

function ensureUniqueExperienceIds(items: ExperienceItem[]) {
  const seen = new Set<number>();
  let nextId = items.reduce((max, item) => Math.max(max, item.id), 0) + 1;

  return items.map((item) => {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      return item;
    }

    const nextItem = { ...item, id: nextId };
    seen.add(nextId);
    nextId += 1;
    return nextItem;
  });
}

function normalizeExperienceCategory(item: ExperienceItem): ExperienceItem {
  const normalizedItem: ExperienceItem = {
    ...item,
    organization: normalizeCompanyName(item.organization),
  };
  const highlight = generateSecurityTags({
    title: normalizedItem.title,
    organization: normalizedItem.organization,
    description: normalizedItem.description,
    existingTags: normalizedItem.highlight,
  });

  return {
    ...normalizedItem,
    category: inferExperienceCategory({
      title: normalizedItem.title,
      organization: normalizedItem.organization,
      description: normalizedItem.description,
      existingTags: highlight,
    }),
    highlight,
  };
}

function mergeWorkspaceWithDefaults(
  workspace: ResumeWorkspace,
  defaultProfile: Profile,
  defaultCompanies: CompanyProfile[],
  defaultExperiences: ExperienceItem[],
): ResumeWorkspace {
  const existingCompanies = workspace.companies ?? [];
  const normalizedCompanies = existingCompanies.map((company) => ({
    ...company,
    organization: normalizeCompanyName(company.organization),
    position: normalizeCompanyPosition(company.position),
  }));
  const normalizedExperiences = (workspace.experiences ?? []).map(normalizeExperienceCategory);
  const migratedExperiences = restoreProtectedDefaultExperiences(normalizedExperiences, defaultExperiences).map(normalizeExperienceCategory);

  return {
    ...workspace,
    profile: { ...defaultProfile, ...(workspace.profile ?? {}) },
    companies:
      existingCompanies.length > 0
        ? normalizedCompanies.filter(
            (company, index, array) => array.findIndex((candidate) => candidate.organization === company.organization) === index,
          )
        : mergeCompanyProfiles([], defaultCompanies),
    experiences:
      normalizedExperiences.length > 0
        ? ensureUniqueExperienceIds(migratedExperiences)
        : ensureUniqueExperienceIds(defaultExperiences.map(normalizeExperienceCategory)),
  };
}

export function getStorageMode() {
  if (isSupabaseConfigured) return "supabase";
  return getApiBaseUrl() ? "api" : "local";
}

export async function loadWorkspace(ownerId: string, defaultProfile: Profile, defaultCompanies: CompanyProfile[], defaultExperiences: ExperienceItem[]) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("resume_workspaces")
      .select("owner_id, editor_email, profile, companies, experiences, updated_at")
      .eq("owner_id", ownerId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      const localWorkspace = loadLocalWorkspace(ownerId);
      if (localWorkspace) {
        return mergeWorkspaceWithDefaults(localWorkspace, defaultProfile, defaultCompanies, defaultExperiences);
      }

      return createWorkspace(ownerId, defaultProfile, defaultCompanies, defaultExperiences);
    }

    return mergeWorkspaceWithDefaults({
      ownerId: data.owner_id,
      editorEmail: data.editor_email ?? null,
      profile: (data.profile as Profile) ?? defaultProfile,
      companies: (data.companies as CompanyProfile[]) ?? defaultCompanies,
      experiences: (data.experiences as ExperienceItem[]) ?? defaultExperiences,
      updatedAt: data.updated_at ?? new Date().toISOString(),
    }, defaultProfile, defaultCompanies, defaultExperiences);
  }

  const apiBaseUrl = getApiBaseUrl();

  if (apiBaseUrl) {
    const response = await fetch(`${apiBaseUrl}/resume/${encodeURIComponent(ownerId)}`);

    if (response.status === 404) {
      return createWorkspace(ownerId, defaultProfile, defaultCompanies, defaultExperiences);
    }

    if (!response.ok) {
      throw new Error("Failed to load workspace");
    }

    const workspace = (await response.json()) as ResumeWorkspace;
    return mergeWorkspaceWithDefaults(workspace, defaultProfile, defaultCompanies, defaultExperiences);
  }

  try {
    const workspace = loadLocalWorkspace(ownerId);
    if (!workspace) return createWorkspace(ownerId, defaultProfile, defaultCompanies, defaultExperiences);
    return mergeWorkspaceWithDefaults(workspace, defaultProfile, defaultCompanies, defaultExperiences);
  } catch {
    return createWorkspace(ownerId, defaultProfile, defaultCompanies, defaultExperiences);
  }
}

export async function saveWorkspace(workspace: ResumeWorkspace) {
  if (isSupabaseConfigured && supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const editorEmail = user?.email ?? workspace.editorEmail ?? null;

    const { error } = await supabase.from("resume_workspaces").upsert(
      {
        owner_id: workspace.ownerId,
        editor_email: editorEmail,
        profile: workspace.profile,
        companies: workspace.companies,
        experiences: workspace.experiences,
        updated_at: workspace.updatedAt,
      },
      { onConflict: "owner_id" },
    );

    if (error) {
      throw error;
    }

    return;
  }

  const apiBaseUrl = getApiBaseUrl();

  if (apiBaseUrl) {
    const response = await fetch(`${apiBaseUrl}/resume/${encodeURIComponent(workspace.ownerId)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(workspace),
    });

    if (!response.ok) {
      throw new Error("Failed to save workspace");
    }

    return;
  }

  window.localStorage.setItem(getLocalWorkspaceKey(workspace.ownerId), JSON.stringify(workspace));
}

export function listLocalWorkspaceSummaries(): WorkspaceSummary[] {
  if (typeof window === "undefined") return [];

  const items: WorkspaceSummary[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith(WORKSPACE_KEY_PREFIX)) continue;

    const raw = window.localStorage.getItem(key);
    if (!raw) continue;

    try {
      const workspace = JSON.parse(raw) as ResumeWorkspace;
      items.push({
        ownerId: workspace.ownerId,
        name: workspace.profile.name,
        updatedAt: workspace.updatedAt,
      });
    } catch {
      // Ignore malformed workspace entries.
    }
  }

  return items.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
