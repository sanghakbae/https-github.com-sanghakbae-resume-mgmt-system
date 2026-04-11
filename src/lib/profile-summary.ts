import type { CompanyProfile, ExperienceItem, Profile } from "@/types/resume";

const CATEGORY_LABELS: Record<ExperienceItem["category"], string> = {
  "모의해킹": "웹 모의해킹",
  "취약점 진단": "시스템 취약점 진단",
  "보안 컨설팅": "보안 컨설팅",
  "클라우드 보안": "OT·인프라 보안",
  "개발/자동화": "보안 자동화",
  "인증": "정보보호 인증",
};

export function buildProfileSummary(profile: Profile, companies: CompanyProfile[], experiences: ExperienceItem[]) {
  const careerText = formatCareerLead(profile.career);
  const roleText = profile.role.split("/").map((item) => item.trim()).filter(Boolean).slice(0, 3).join(", ");
  const industries = profile.industries.split("/").map((item) => item.trim()).filter(Boolean).slice(0, 5);

  const categoryCounts = new Map<ExperienceItem["category"], number>();
  for (const item of experiences) {
    categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1);
  }

  const topCategories = [...categoryCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([category]) => CATEGORY_LABELS[category]);

  const source = [profile.specialty, profile.certifications, ...companies.map((company) => company.summary), ...experiences.flatMap((item) => [item.title, item.description, ...item.highlight])]
    .join(" ")
    .toLowerCase();

  const capabilitySegments: string[] = [];
  if (source.includes("isms") || source.includes("iso 27001") || source.includes("csap")) {
    capabilitySegments.push("ISMS, ISMS-P, ISO 27001, CSAP 중심의 인증 및 관리체계 구축");
  }
  if (source.includes("모의해킹") || source.includes("sql injection") || source.includes("burp")) {
    capabilitySegments.push("웹 모의해킹과 취약점 진단");
  }
  if (source.includes("ot") || source.includes("ics") || source.includes("scada") || source.includes("망분리")) {
    capabilitySegments.push("OT 보안 아키텍처와 망분리 및 마스터플랜 수립");
  }
  if (source.includes("dlp") || source.includes("sonarqube") || source.includes("trivy") || source.includes("datadog")) {
    capabilitySegments.push("보안 운영 체계와 도구 기반 운영 고도화");
  }

  const firstSentenceParts = [careerText, roleText ? `${roleText} 역할을 수행해왔습니다.` : "정보보안 업무를 수행해왔습니다."].filter(Boolean);
  const firstSentence = firstSentenceParts.join(" ");

  const secondSentenceParts: string[] = [];
  if (industries.length) {
    secondSentenceParts.push(`${industries.join(", ")} 산업군 경험을 바탕으로`);
  }
  if (topCategories.length) {
    secondSentenceParts.push(`${topCategories.join(", ")} 영역을 중심으로`);
  }
  const secondSentence = secondSentenceParts.length ? `${secondSentenceParts.join(" ")} 커리어를 확장했습니다.` : "";

  const thirdSentence = capabilitySegments.length ? `${capabilitySegments.slice(0, 3).join(", ")} 경험을 보유하고 있습니다.` : "";

  return [firstSentence, secondSentence, thirdSentence].filter(Boolean).join(" ").replace(/\s{2,}/g, " ").trim();
}

function formatCareerLead(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const [rawStart = "", rawEnd = ""] = normalized.split("~").map((part) => part.trim());
  const start = parseCareerPoint(rawStart);
  const end = parseCareerPoint(rawEnd || "현재");

  if (!start || !end) {
    return "정보보안 전문가로서";
  }

  const totalMonths = Math.max(0, (end.year - start.year) * 12 + (end.month - start.month));
  const years = Math.max(1, Math.floor(totalMonths / 12));
  const months = totalMonths % 12;

  return months > 0 ? `지난 ${years}년 ${months}개월 동안 정보보안 전문가로서` : `지난 ${years}년 동안 정보보안 전문가로서`;
}

function parseCareerPoint(value: string) {
  if (!value) return null;
  if (value.includes("현재")) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  const matched = value.match(/(\d{4})\D+(\d{1,2})/);
  if (!matched) return null;

  return {
    year: Number(matched[1]),
    month: Number(matched[2]),
  };
}
