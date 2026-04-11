import type { LucideIcon } from "lucide-react";

export type ResumeCategory = "모의해킹" | "취약점 진단" | "보안 컨설팅" | "클라우드 보안" | "개발/자동화" | "인증";

export type ExperienceItem = {
  id: number;
  title: string;
  organization: string;
  period: string;
  category: ResumeCategory;
  description: string;
  highlight: string[];
  url?: string;
  image?: string;
};

export type Profile = {
  name: string;
  role: string;
  summary: string;
  photo?: string;
  photoPositionX: number;
  photoPositionY: number;
  photoScale: number;
  education: string;
  career: string;
  specialty: string;
  industries: string;
  certifications: string;
};

export type ExperienceFormValues = {
  title: string;
  organization: string;
  period: string;
  category: ResumeCategory;
  description: string;
  highlight: string;
  url: string;
  image: string;
};

export type ExperienceValidationErrors = Partial<Record<keyof ExperienceFormValues, string>>;

export type CategoryMeta = {
  label: string;
  icon: LucideIcon;
};

export type GoogleUser = {
  sub: string;
  email: string;
  name: string;
  picture?: string;
};

export type ResumeWorkspace = {
  ownerId: string;
  editorEmail?: string | null;
  profile: Profile;
  companies: CompanyProfile[];
  experiences: ExperienceItem[];
  updatedAt: string;
};

export type WorkspaceSummary = {
  ownerId: string;
  name: string;
  updatedAt: string;
};

export type CompanyProfile = {
  organization: string;
  department?: string;
  position?: string;
  period?: string;
  summary: string;
  responsibilities: string[];
};

export type CompanyFormValues = {
  organization: string;
  department: string;
  position: string;
  period: string;
  summary: string;
  responsibilities: string;
};

export type CompanyValidationErrors = Partial<Record<keyof CompanyFormValues, string>>;
