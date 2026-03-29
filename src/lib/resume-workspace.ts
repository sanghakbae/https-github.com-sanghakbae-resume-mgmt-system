import type { CompanyProfile, ExperienceItem, Profile, ResumeWorkspace, WorkspaceSummary } from "@/types/resume";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const WORKSPACE_KEY_PREFIX = "resume.workspace.";

function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL as string | undefined;
}

function getLocalWorkspaceKey(ownerId: string) {
  return `${WORKSPACE_KEY_PREFIX}${ownerId}`;
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
      return createWorkspace(ownerId, defaultProfile, defaultCompanies, defaultExperiences);
    }

    return {
      ownerId: data.owner_id,
      editorEmail: data.editor_email ?? null,
      profile: (data.profile as Profile) ?? defaultProfile,
      companies: (data.companies as CompanyProfile[]) ?? defaultCompanies,
      experiences: (data.experiences as ExperienceItem[]) ?? defaultExperiences,
      updatedAt: data.updated_at ?? new Date().toISOString(),
    };
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
    return {
      ...workspace,
      companies: workspace.companies ?? defaultCompanies,
    };
  }

  try {
    const raw = window.localStorage.getItem(getLocalWorkspaceKey(ownerId));
    if (!raw) return createWorkspace(ownerId, defaultProfile, defaultCompanies, defaultExperiences);
    const workspace = JSON.parse(raw) as ResumeWorkspace;
    return {
      ...workspace,
      companies: workspace.companies ?? defaultCompanies,
    };
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
