import { Award, BarChart3, BriefcaseBusiness, ShieldCheck, Sparkles, Target, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { categoryMeta, categoryOptions, profileHeaderIcon, profileInfoItems } from "@/data/resume";
import type { CompanyProfile, ExperienceItem, Profile } from "@/types/resume";
import { getPhotoTransformStyle } from "@/lib/photo-style";
import { ExperienceCard } from "./experience-card";
import { InfoBox } from "./info-box";

type ResumePreviewProps = {
  isEditMode: boolean;
  profile: Profile;
  companies: CompanyProfile[];
  experiences: ExperienceItem[];
  onEditExperience: (item: ExperienceItem) => void;
  onRemoveExperience: (id: number) => void;
};

export function ResumePreview({
  isEditMode,
  profile,
  companies,
  experiences,
  onEditExperience,
  onRemoveExperience,
}: ResumePreviewProps) {
  const HeaderIcon = profileHeaderIcon;
  const companyGroups = buildCompanyGroups(experiences, companies);
  const profileInfoValues = {
    ...profile,
    career: formatCareerRange(profile.career),
  };
  const isCompactHeader = !isEditMode;

  return (
    <Card className="rounded-[10px] border border-slate-200 bg-white shadow-sm" data-export-resume>
      <CardContent className="p-2.5 sm:p-4 md:p-5" data-export-resume-content>
        <div
          className={`border-b border-slate-200 pb-4 sm:pb-5 ${isCompactHeader ? "grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-start" : "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"}`}
          data-export-intro
        >
          <div className={`flex flex-col ${isCompactHeader ? "items-center gap-0.5" : "gap-3"}`}>
            <div className="mx-auto flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-slate-200 bg-slate-100 sm:mx-0 sm:h-40 sm:w-40">
              {profile.photo ? (
                <img
                  src={profile.photo}
                  alt={`${profile.name} 프로필 사진`}
                  className="h-full w-full object-cover"
                  style={getPhotoTransformStyle(profile)}
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-slate-900 text-white">
                  <HeaderIcon className="h-5 w-5" />
                </div>
              )}
            </div>
            {isCompactHeader ? null : (
              <h2 className="break-words text-center text-lg font-semibold leading-[1.05] tracking-tight sm:text-xl">{profile.name}</h2>
            )}
          </div>

          <div className={`grid items-start ${isCompactHeader ? "w-full gap-2 grid-cols-1 sm:gap-3 sm:grid-cols-2" : "gap-3 grid-cols-1 sm:grid-cols-2"}`}>
            {profileInfoItems.map(({ key, label, icon }) => (
              <InfoBox
                key={key}
                icon={icon}
                label={label}
                value={profileInfoValues[key]}
              />
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {companyGroups.map(({ company, items }) => (
            <section key={company.organization} className="rounded-[18px] border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4" data-export-company>
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-3.5">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold leading-6 text-slate-950">{company.organization}</h3>
                    <p className="mt-1 text-[13px] leading-5 text-slate-600">
                      {[company.department, company.position].filter(Boolean).join(" / ")}
                    </p>
                  </div>
                  <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-medium leading-4 text-slate-600">
                    {company.period}
                  </div>
                </div>
                <p className="text-sm leading-6 text-slate-600">{company.summary}</p>
                <div className="grid gap-1 sm:grid-cols-2 md:grid-cols-3">
                  {company.responsibilities.map((responsibility) => (
                    <div
                      key={responsibility}
                      className="flex min-h-[38px] items-center justify-center rounded-[10px] border border-slate-200 bg-white px-2 py-1 text-center text-[12px] font-semibold leading-4 text-slate-700"
                    >
                      {responsibility}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-slate-900 text-white">
                    <BriefcaseBusiness className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold leading-6 text-slate-950">대표 프로젝트</h4>
                    <p className="text-[13px] leading-5 text-slate-500">해당 회사에서 수행한 핵심 업무와 프로젝트</p>
                  </div>
                </div>

                {items.length ? (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <ExperienceCard
                        key={item.id}
                        item={item}
                        isEditMode={isEditMode}
                        onEdit={onEditExperience}
                        onRemove={onRemoveExperience}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[12px] border border-dashed border-slate-300 bg-white px-3 py-4 text-[13px] leading-5 text-slate-500">
                    아직 연결된 수행 업무가 없습니다. 편집 모드에서 이 회사에 프로젝트를 추가하면 여기에 표시됩니다.
                  </div>
                )}
              </div>
            </section>
          ))}

          {!companyGroups.length ? (
            <div className="rounded-[10px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              등록된 수행 업무가 없습니다. 편집 모드에서 항목을 추가하면 여기에 표시됩니다.
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function buildCompanyGroups(items: ExperienceItem[], companies: CompanyProfile[]) {
  const groups = new Map<string, ExperienceItem[]>();
  const companyLookup = new Map(companies.map((company) => [company.organization, company]));

  for (const company of companies) {
    groups.set(company.organization, []);
  }

  for (const item of items) {
    const current = groups.get(item.organization) ?? [];
    current.push(item);
    groups.set(item.organization, current);
  }

  return [...groups.entries()]
    .map(([organization, companyItems]) => {
      const company = companyLookup.get(organization) ?? createFallbackCompanyProfile(organization, companyItems);
      const sortedItems = [...companyItems].sort((left, right) => getPeriodScore(right.period) - getPeriodScore(left.period));
      return { company, items: sortedItems };
    })
    .sort((left, right) => getCompanyPeriodScore(right.company.period) - getCompanyPeriodScore(left.company.period));
}

function createFallbackCompanyProfile(organization: string, items: ExperienceItem[]): CompanyProfile {
  const sortedItems = [...items].sort((left, right) => getPeriodScore(right.period) - getPeriodScore(left.period));
  return {
    organization,
    period: `${sortedItems.at(-1)?.period ?? ""} ~ ${sortedItems[0]?.period ?? ""}`,
    summary: `${organization}에서 다양한 보안 업무와 프로젝트를 수행했습니다.`,
    responsibilities: ["보안 프로젝트 수행", "보안 운영 및 점검", "이력서 데이터 기반 자동 생성"],
  };
}

export function CareerDashboard({
  items,
  profile,
  companies,
}: {
  items: ExperienceItem[];
  profile: Profile;
  companies: CompanyProfile[];
}) {
  const totalProjects = items.length;
  const activeCategories = categoryOptions.filter((category) => items.some((item) => item.category === category)).length;
  const topCategory = categoryOptions
    .map((category) => ({
      category,
      count: items.filter((item) => item.category === category).length,
    }))
    .sort((left, right) => right.count - left.count)[0];
  const keywordCounts = new Map<string, number>();

  for (const item of items) {
    for (const keyword of item.highlight) {
      const normalizedKeyword = normalizeHighlightKeyword(keyword);
      if (!normalizedKeyword) continue;
      keywordCounts.set(normalizedKeyword, (keywordCounts.get(normalizedKeyword) ?? 0) + 1);
    }
  }

  const topKeywords = [...keywordCounts.entries()].sort((left, right) => right[1] - left[1]);
  const specialties = profile.specialty
    .split("/")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 6);
  const certifications = profile.certifications
    .split("/")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 6);
  const roleTimeline = companies
    .filter((company) => company.position)
    .slice()
    .sort((left, right) => getCompanyPeriodScore(right.period) - getCompanyPeriodScore(left.period))
    .map((company) => ({
      label: company.position ?? "",
      organization: company.organization,
      period: company.period ?? "",
    }));
  const highlightProjects = [...items]
    .sort((left, right) => {
      const scoreGap = right.highlight.length - left.highlight.length;
      if (scoreGap !== 0) return scoreGap;
      return getPeriodScore(right.period) - getPeriodScore(left.period);
    })
    .slice(0, 4);
  const tagDistribution = [...keywordCounts.entries()].sort((left, right) => right[1] - left[1]);
  const complianceCoverage = collectCoverageKeywords(items, profile);

  return (
    <section className="overflow-hidden rounded-[20px] border-2 border-black bg-white">
      <div className="rounded-[16px] bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 sm:p-5">
        <div className="flex flex-col gap-2 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-slate-950 text-white shadow-[0_10px_30px_rgba(15,23,42,0.18)]">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-lg font-semibold leading-6 text-slate-950">경력 대시보드</h3>
              <p className="text-[13px] leading-5 text-slate-500">현재 입력된 수행 업무 기준으로 경력 흐름을 요약합니다.</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2" data-export-dashboard-upper>
          <div className="flex h-full w-full flex-col rounded-[18px] border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_52%,#334155_100%)] p-5 text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Positioning</p>
            <div className="flex flex-1 flex-col">
              <h4 className="mt-3 w-full text-xl font-semibold leading-8 sm:text-2xl">{profile.role}</h4>
              <p className="mt-3 w-full text-[13px] leading-6 text-slate-300">{profile.summary}</p>
              <div className="mt-auto flex flex-wrap gap-1 pt-4">
                {specialties.map((item) => (
                  <span key={item} className="rounded-[5px] border border-white/15 bg-white/10 px-1.5 py-0.5 text-[11px] leading-4 text-slate-100">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <AccentPanel icon={ShieldCheck} title="인증 / 컴플라이언스">
              <div className="flex flex-wrap gap-1">
                {complianceCoverage.map((item) => (
                  <span key={item} className="whitespace-nowrap rounded-[5px] border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] leading-4 text-slate-700">
                    {item}
                  </span>
                ))}
              </div>
            </AccentPanel>
            <AccentPanel icon={Award} title="주요 자격">
              <div className="flex flex-wrap gap-1">
                {certifications.map((item) => (
                  <span key={item} className="whitespace-nowrap rounded-[5px] border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] leading-4 text-slate-700">
                    {item}
                  </span>
                ))}
              </div>
            </AccentPanel>
            <AccentPanel icon={BriefcaseBusiness} title="병역사항">
              <p className="text-[12px] leading-5 text-slate-700">{profile.military}</p>
            </AccentPanel>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4" data-export-kpis>
          <DashboardStat icon={BriefcaseBusiness} label="총 프로젝트" value={`${totalProjects}건`} tone="from-slate-900 via-slate-700 to-slate-500" />
          <DashboardStat icon={Sparkles} label="활성 분야" value={`${activeCategories}개`} tone="from-cyan-700 via-sky-600 to-blue-500" />
          <DashboardStat
            icon={BarChart3}
            label="주력 분야"
            value={topCategory ? categoryMeta[topCategory.category].label : "-"}
            tone="from-violet-700 via-purple-600 to-fuchsia-500"
          />
          <DashboardStat icon={Sparkles} label="주요 태그" value={`${topKeywords.length}개`} tone="from-emerald-700 via-teal-600 to-lime-500" />
        </div>

        <div className="mt-5 grid gap-4 items-stretch xl:grid-cols-[minmax(220px,max-content)_minmax(0,1fr)_minmax(260px,max-content)]" data-export-dashboard-lower data-export-dashboard-panels>
          <div className="h-full p-1 xl:max-w-[320px]" data-export-role-timeline>
            <AccentPanel icon={TrendingUp} title="역할 변화 타임라인">
              <div className="flex h-full flex-col justify-between space-y-3">
                {roleTimeline.slice(0, 4).map((item) => (
                  <div key={`${item.organization}-${item.label}`} className="flex items-start gap-3">
                    <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-slate-900" />
                    <div>
                      <p className="text-[13px] font-medium leading-5 text-slate-900">{item.label}</p>
                      <p className="text-[12px] leading-4 text-slate-500">{item.organization}</p>
                      <p className="text-[12px] leading-4 text-slate-400">{item.period}</p>
                    </div>
                  </div>
                ))}
              </div>
            </AccentPanel>
          </div>

          <div className="flex h-full min-w-0 flex-col p-1" data-export-tag-distribution>
            <p className="text-center text-sm font-semibold text-slate-900">핵심 역량 분포</p>
            <div className="resume-skill-shield mt-2 flex min-h-[220px] flex-1 justify-center sm:min-h-[260px]">
              {tagDistribution.length ? (
                <div className="resume-skill-shield__frame mx-auto">
                  {tagDistribution.slice(0, 28).map(([tag, count], index) => {
                    const strongestCount = Math.max(tagDistribution[0]?.[1] ?? 1, 1);
                    const emphasis = count / strongestCount;
                    const fontSize = index === 0 ? 18 + Math.round(emphasis * 6) : 11 + Math.round(emphasis * 4);
                    const palette = ["#1d4ed8", "#2563eb", "#3b82f6", "#1e40af", "#60a5fa", "#0f172a"];

                    return (
                      <span
                        key={tag}
                        className="resume-skill-shield__item"
                        style={{
                          fontSize: `${fontSize}px`,
                          color: palette[index % palette.length],
                          opacity: index === 0 ? 0.96 : 0.72 + emphasis * 0.18,
                          fontWeight: index === 0 ? 700 : index < 6 ? 600 : 500,
                          letterSpacing: index === 0 ? "-0.05em" : "-0.03em",
                        }}
                      >
                        {tag}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[13px] leading-5 text-slate-500">프로젝트를 등록하면 설명 기반 자동 태그로 역량 분포가 표시됩니다.</p>
              )}
            </div>
          </div>

          <div className="h-full p-1 xl:max-w-[360px]" data-export-highlight-projects>
            <AccentPanel icon={Target} title="대표 성과 하이라이트">
              <div className="flex h-full flex-col space-y-2.5">
                {highlightProjects.map((item) => (
                  <div key={item.id} className="rounded-[12px] border border-slate-200 bg-white px-3 py-2.5">
                    <p className="text-[13px] font-medium leading-5 text-slate-900">{item.title}</p>
                    <p className="mt-1 text-[12px] leading-4 text-slate-500">
                      {item.organization} · {item.period}
                    </p>
                  </div>
                ))}
              </div>
            </AccentPanel>
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof BriefcaseBusiness;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className={`rounded-[14px] border border-white/20 bg-gradient-to-br ${tone} bg-opacity-70 p-4 text-white shadow-[0_14px_36px_rgba(15,23,42,0.12)]`}>
      <div className="flex items-center gap-2 text-white/80">
        <Icon className="h-4 w-4" />
        <span className="text-[12px] leading-4">{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold leading-6 text-white">{value}</p>
    </div>
  );
}

function AccentPanel({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof BriefcaseBusiness;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-[16px] border border-slate-200 bg-white/90 p-4 shadow-[0_10px_30px_rgba(148,163,184,0.12)]">
      <div className="flex items-center gap-2 text-slate-900">
        <Icon className="h-4 w-4 text-slate-600" />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <div className="mt-3 flex-1">{children}</div>
    </div>
  );
}

function collectCoverageKeywords(items: ExperienceItem[], profile: Profile) {
  const source = [profile.specialty, profile.certifications, ...items.flatMap((item) => [item.title, item.description, ...item.highlight])].join(" ");
  const keywords = ["ISMS", "ISMS-P", "ISO 27001", "ISO 27017", "CSAP", "PCI-DSS", "OT Security", "GDPR"];
  return keywords.filter((keyword) => source.toLowerCase().includes(keyword.toLowerCase())).slice(0, 8);
}

function normalizeHighlightKeyword(keyword: string) {
  const trimmed = keyword.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  const lowSignalKeywords = new Set(["pm", "pl", "leader", "팀장", "운영"]);
  if (lowSignalKeywords.has(lower)) return null;

  if (lower.includes("isms-p")) return "ISMS-P";
  if (lower === "isms") return "ISMS";
  if (lower.includes("iso 27017") || lower.includes("iso27017")) return "ISO 27017";
  if (lower.includes("iso 27001") || lower.includes("iso27001")) return "ISO 27001";
  if (lower.includes("csap")) return "CSAP";
  if (lower.includes("ot")) return "OT 보안";
  if (lower.includes("nozomi")) return "Nozomi";
  if (lower.includes("웹 모의해킹")) return "웹 모의해킹";
  if (lower.includes("관리체계")) return "정보보호 관리체계";
  if (lower.includes("위험")) return "위험평가";
  if (lower.includes("망분리")) return "망분리";
  if (lower.includes("하드닝")) return "하드닝";
  if (lower.includes("개인정보")) return "개인정보보호";

  return trimmed;
}

function formatCareerRange(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const [rawStart = "", rawEnd = ""] = normalized.split("~").map((part) => part.trim());
  const start = parseCareerPoint(rawStart);
  const end = parseCareerPoint(rawEnd || "현재");

  if (!start || !end) {
    return value;
  }

  const totalMonths = Math.max(0, (end.year - start.year) * 12 + (end.month - start.month));
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  return `${start.year}년 ${start.month}월 ~ ${end.year}년 ${end.month}월 (${years}년 ${months}개월)`;
}

function parseCareerPoint(value: string) {
  if (!value) return null;

  if (value.includes("현재")) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    };
  }

  const matched = value.match(/(\d{4})\D+(\d{1,2})/);
  if (!matched) return null;

  return {
    year: Number(matched[1]),
    month: Number(matched[2]),
  };
}

function getPeriodScore(period: string) {
  const [start = "0.00", end = start] = period.split("-").map((part) => part.trim());
  return toNumericPeriod(end || start);
}

function getCompanyPeriodScore(period?: string) {
  if (!period) return 0;

  return period
    .split("/")
    .map((range) => range.trim())
    .reduce((highest, range) => Math.max(highest, getPeriodScore(range)), 0);
}

function toNumericPeriod(value: string) {
  if (value.includes("현재")) {
    return 999999;
  }

  const normalized = value.replace(/[^0-9.]/g, "");
  const [year = "0", month = "0"] = normalized.split(".");
  return Number(year) * 100 + Number(month);
}
