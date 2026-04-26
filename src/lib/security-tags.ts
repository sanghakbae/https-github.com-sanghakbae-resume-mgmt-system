import type { ResumeCategory } from "@/types/resume";

type ProjectTagInput = {
  title: string;
  organization: string;
  description: string;
  existingTags?: string[];
};

type TagRule = {
  tag: string;
  synonyms: string[];
  categories?: ResumeCategory[];
};

const MAX_SECURITY_TAGS = 5;

const CURATED_PROJECT_TAGS: Record<string, string[]> = {
  "CISO/CPO 기반 정보보호 관리체계 수립 및 ISMS 준비": ["ISMS", "보안 정책", "위험평가", "개인정보보호", "보안 운영"],
  "대외 웹 서비스 모의해킹 및 보안 교육 체계 운영": ["웹 모의해킹", "Burp Suite", "보안 교육", "개발보안", "점검 가이드"],
  "ITGC 통제 관리시스템 개발 및 운영": ["ITGC", "통제 관리", "증적 관리", "운영 자동화", "관리체계 구축"],
  "정보보호 관리체계 운영 및 CSAP·ISO 인증 대응": ["CSAP", "ISO 27001", "ISO 27017", "보안성 검토", "보안 운영"],
  "업무용 소프트웨어 보안 및 비용 관리 체계 운영": ["Google Workspace", "GitHub", "Atlassian", "2FA", "IP ACL"],
  "롯데면세점 ISMS-P 인증(사후) 컨설팅 PM": ["ISMS-P", "Gap 분석", "위험평가", "법적 준거성", "현장 점검"],
  "메디트 ISO 27001 갱신 및 글로벌 컴플라이언스 검토 PM": ["ISO 27001", "GDPR", "HIPAA", "하드닝", "컴플라이언스"],
  "CJ 푸드빌 ISMS-P 최초 인증 컨설팅 PM": ["ISMS-P", "Gap 분석", "웹 모의해킹", "하드닝", "보안 정책"],
  "롯데 마트·슈퍼 ISMS 사후 인증 컨설팅 PM": ["ISMS", "Gap 분석", "위험평가", "하드닝", "인증 대응"],
  "발전소 OT 보안 마스터플랜 및 아키텍처 설계": ["OT 보안", "Nozomi Guardian", "망분리", "Purdue 모델", "보안 아키텍처"],
  "LS산전 OT 보안체계 수립 컨설팅 PM": ["OT 보안", "Nozomi Guardian", "이상징후 분석", "보안 마스터플랜", "보안 아키텍처"],
  "SK실트론 OT 보안 마스터플랜 수립 PM": ["OT 보안", "망분리", "보안 운영", "보안 마스터플랜", "OA/FA"],
  "위메프 보안기술팀 운영 및 보안성 검토 체계 수립": ["보안성 검토", "DB 접근제어", "소스코드 진단", "보안관제", "방화벽 정책"],
  "평창동계올림픽 EMS 구축 및 OT 보안 솔루션 프리세일즈": ["OT 보안", "EMS", "PLC", "Modbus", "프리세일즈"],
  "한국수자원공사 천안정수장 OT 보안솔루션 구축 및 운영": ["SCADA", "기반시설 보안", "OT 보안", "Multi Homed Network", "망분리"],
  "금융·항공·공공 분야 모의해킹 및 개인정보보호 컨설팅": ["PCI-DSS", "개인정보보호", "웹 모의해킹", "보안성 검토", "보안 컨설팅"],
  "CJ 그룹 웹 모의해킹 및 보안시스템 운영": ["FireEye", "침해사고 분석", "ESM", "웹 모의해킹", "탐지 룰"],
  "침해사고 대응 및 대학·언론사 모의해킹": ["침해사고 대응", "웹 모의해킹", "취약점 진단", "SQL Injection", "WAF 우회"],
  "국가 기반시설 취약점 분석 및 평가": ["기반시설 보안", "시스템 취약점 진단", "방화벽 정책", "망분리", "망연계"],
  "SKT 인프라 보안 취약점 진단 및 웹 모의해킹": ["인프라 보안", "시스템 취약점 진단", "웹 모의해킹", "자동화 스크립트", "SQL Injection"],
  "웹방화벽 시그니처 룰 개발 및 웹 취약점 연구": ["WAF", "탐지 룰", "허니팟", "웹 취약점 진단", "보안 교육"],
};

const TAG_RULES: TagRule[] = [
  { tag: "OT 보안", synonyms: ["ot", "ics", "scada", "plc", "dcs", "hmi", "제어시스템", "산업제어", "스마트팩토리"], categories: ["클라우드 보안"] },
  { tag: "ICS 보안", synonyms: ["ics", "산업제어", "제어시스템", "plc", "scada"], categories: ["클라우드 보안"] },
  { tag: "SCADA", synonyms: ["scada"], categories: ["클라우드 보안"] },
  { tag: "PLC", synonyms: ["plc", "레더"], categories: ["클라우드 보안", "개발/자동화"] },
  { tag: "Modbus", synonyms: ["modbus"], categories: ["클라우드 보안", "개발/자동화"] },
  { tag: "Purdue 모델", synonyms: ["purdue"], categories: ["클라우드 보안"] },
  { tag: "망분리", synonyms: ["망분리", "network separation"], categories: ["클라우드 보안", "보안 컨설팅"] },
  { tag: "망연계", synonyms: ["망연계"], categories: ["클라우드 보안", "보안 컨설팅"] },
  { tag: "방화벽", synonyms: ["방화벽", "firewall"], categories: ["보안 컨설팅", "클라우드 보안"] },
  { tag: "방화벽 정책", synonyms: ["방화벽 정책", "firewall policy"], categories: ["보안 컨설팅", "취약점 진단"] },
  { tag: "WAF", synonyms: ["waf", "웹방화벽", "modsecurity", "webknight"], categories: ["모의해킹", "개발/자동화"] },
  { tag: "웹 모의해킹", synonyms: ["모의해킹", "웹 해킹", "web hacking", "침투 테스트", "pentest", "penetration"], categories: ["모의해킹"] },
  { tag: "모의해킹", synonyms: ["모의해킹", "침투 테스트", "penetration", "pentest"], categories: ["모의해킹"] },
  { tag: "취약점 진단", synonyms: ["취약점 진단", "취약점 점검", "취약점 분석", "vulnerability"], categories: ["취약점 진단"] },
  { tag: "시스템 취약점 진단", synonyms: ["시스템 취약점", "서버 취약점", "워크스테이션 취약점"], categories: ["취약점 진단"] },
  { tag: "웹 취약점 진단", synonyms: ["웹 취약점", "web 취약점"], categories: ["취약점 진단", "모의해킹"] },
  { tag: "소스코드 진단", synonyms: ["소스코드 진단", "코드 진단", "sonarqube", "sast"], categories: ["취약점 진단", "개발/자동화"] },
  { tag: "SQL Injection", synonyms: ["sql injection", "sqlmap", "sqli"], categories: ["모의해킹", "취약점 진단"] },
  { tag: "WAF 우회", synonyms: ["waf 우회"], categories: ["모의해킹"] },
  { tag: "하드닝", synonyms: ["하드닝", "hardening"], categories: ["취약점 진단", "보안 컨설팅"] },
  { tag: "시스템 하드닝", synonyms: ["시스템 하드닝", "hardening"], categories: ["취약점 진단", "보안 컨설팅"] },
  { tag: "침해사고 대응", synonyms: ["침해사고 대응", "incident response", "ir", "사고 대응"], categories: ["모의해킹", "보안 컨설팅"] },
  { tag: "침해사고 분석", synonyms: ["침해사고 분석", "포렌식", "forensic"], categories: ["모의해킹"] },
  { tag: "보안관제", synonyms: ["보안관제", "관제", "esm", "siem", "soc"], categories: ["개발/자동화", "보안 컨설팅"] },
  { tag: "탐지 룰", synonyms: ["탐지 룰", "시그니처 룰", "signature"], categories: ["개발/자동화", "모의해킹"] },
  { tag: "허니팟", synonyms: ["허니팟", "honeypot"], categories: ["개발/자동화", "모의해킹"] },
  { tag: "자동화 스크립트", synonyms: ["자동화 스크립트", "스크립트 고도화", "automation"], categories: ["개발/자동화"] },
  { tag: "보안 자동화", synonyms: ["자동화", "자동화 스크립트", "운영 자동화"], categories: ["개발/자동화"] },
  { tag: "ITGC", synonyms: ["itgc"], categories: ["개발/자동화", "인증"] },
  { tag: "통제 관리", synonyms: ["통제 관리", "통제항목"], categories: ["인증", "개발/자동화"] },
  { tag: "증적 관리", synonyms: ["증적 관리", "증적"], categories: ["인증", "개발/자동화"] },
  { tag: "보안 운영", synonyms: ["보안 운영", "운영 체계", "보안시스템 운영"], categories: ["보안 컨설팅", "인증"] },
  { tag: "보안성 검토", synonyms: ["보안성 검토"], categories: ["보안 컨설팅", "인증"] },
  { tag: "위험평가", synonyms: ["위험평가", "risk assessment", "위험 분석"], categories: ["인증", "보안 컨설팅"] },
  { tag: "Gap 분석", synonyms: ["gap 분석", "갭 분석"], categories: ["인증", "보안 컨설팅"] },
  { tag: "법적 준거성", synonyms: ["법적 준거성", "준거성"], categories: ["인증", "보안 컨설팅"] },
  { tag: "컴플라이언스", synonyms: ["컴플라이언스", "compliance"], categories: ["인증", "보안 컨설팅"] },
  { tag: "개인정보보호", synonyms: ["개인정보", "privacy", "cpo", "개인정보처리방침"], categories: ["인증", "보안 컨설팅"] },
  { tag: "개인정보 위수탁", synonyms: ["위수탁"], categories: ["인증"] },
  { tag: "보안 교육", synonyms: ["보안 교육", "인식 교육", "캠페인"], categories: ["보안 컨설팅", "인증"] },
  { tag: "개발보안", synonyms: ["개발보안", "secure coding"], categories: ["개발/자동화", "보안 컨설팅"] },
  { tag: "인증 대응", synonyms: ["인증 준비", "인증 대응", "인증 심사", "인증"], categories: ["인증"] },
  { tag: "ISMS", synonyms: ["isms"], categories: ["인증"] },
  { tag: "ISMS-P", synonyms: ["isms-p", "ismsp"], categories: ["인증"] },
  { tag: "ISO 27001", synonyms: ["iso 27001", "iso27001"], categories: ["인증"] },
  { tag: "ISO 27017", synonyms: ["iso 27017", "iso27017"], categories: ["인증"] },
  { tag: "CSAP", synonyms: ["csap"], categories: ["인증"] },
  { tag: "PCI-DSS", synonyms: ["pci-dss", "pcidss"], categories: ["인증"] },
  { tag: "GDPR", synonyms: ["gdpr"], categories: ["인증"] },
  { tag: "HIPAA", synonyms: ["hipaa", "hippa"], categories: ["인증"] },
  { tag: "CPRA", synonyms: ["cpra"], categories: ["인증"] },
  { tag: "JP APPI", synonyms: ["appi", "jp appi"], categories: ["인증"] },
  { tag: "CISO", synonyms: ["ciso"], categories: ["인증", "보안 컨설팅"] },
  { tag: "CPO", synonyms: ["cpo"], categories: ["인증", "보안 컨설팅"] },
  { tag: "PM", synonyms: [" pm ", "프로젝트 매니저", "project manager"], categories: ["보안 컨설팅", "인증"] },
  { tag: "PL", synonyms: [" pl ", "project leader"], categories: ["보안 컨설팅", "인증"] },
  { tag: "프리세일즈", synonyms: ["프리세일즈", "presales", "pre-sales"], categories: ["보안 컨설팅", "클라우드 보안"] },
  { tag: "PoC", synonyms: ["poc", "개념검증"], categories: ["클라우드 보안", "개발/자동화"] },
  { tag: "Nozomi Guardian", synonyms: ["nozomi"], categories: ["클라우드 보안"] },
  { tag: "DLP", synonyms: ["dlp"], categories: ["보안 컨설팅", "인증"] },
  { tag: "Trivy", synonyms: ["trivy"], categories: ["개발/자동화", "인증"] },
  { tag: "SonarQube", synonyms: ["sonarqube"], categories: ["개발/자동화", "인증"] },
  { tag: "Datadog", synonyms: ["datadog"], categories: ["개발/자동화"] },
  { tag: "Google Workspace", synonyms: ["google workspace"], categories: ["개발/자동화"] },
  { tag: "GitHub", synonyms: ["github"], categories: ["개발/자동화"] },
  { tag: "Atlassian", synonyms: ["atlassian", "jira", "confluence"], categories: ["개발/자동화"] },
  { tag: "Slack", synonyms: ["slack"], categories: ["개발/자동화"] },
  { tag: "2FA", synonyms: ["2fa", "2단계 인증", "mfa"], categories: ["인증", "개발/자동화"] },
  { tag: "IP ACL", synonyms: ["ip acl", "acl"], categories: ["보안 컨설팅", "개발/자동화"] },
  { tag: "VPN", synonyms: ["vpn"], categories: ["보안 컨설팅", "개발/자동화"] },
  { tag: "DB 접근제어", synonyms: ["db 접근제어"], categories: ["보안 컨설팅", "개발/자동화"] },
  { tag: "인프라 보안", synonyms: ["infra", "인프라", "server", "was", "web/was", "dbms", "네트워크"], categories: ["취약점 진단", "보안 컨설팅"] },
  { tag: "기반시설 보안", synonyms: ["기반시설", "에너지", "발전", "공기업"], categories: ["클라우드 보안", "취약점 진단"] },
];

const CATEGORY_DEFAULT: ResumeCategory = "보안 컨설팅";

function normalizeText(value: string) {
  return ` ${value.toLowerCase().replace(/\s+/g, " ").trim()} `;
}

function includesSynonym(source: string, synonym: string) {
  const normalizedSynonym = synonym.toLowerCase().trim();
  if (!normalizedSynonym) return false;
  if (/^[a-z0-9.+-]+$/.test(normalizedSynonym)) {
    return source.includes(` ${normalizedSynonym} `) || source.includes(normalizedSynonym);
  }
  return source.includes(normalizedSynonym);
}

function dedupeTags(tags: string[]) {
  const seen = new Set<string>();
  return tags.filter((tag) => {
    const key = tag.trim().toLowerCase();
    if (!key || key.length > 24 || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractInlineProductTags(source: string) {
  const tags: string[] = [];
  const englishTerms = source.match(/\b[A-Z][A-Za-z0-9.+-]{1,23}\b/g) ?? [];
  for (const term of englishTerms) {
    if (["AI", "IT", "OT", "IR", "PL", "PM"].includes(term)) continue;
    if (/[0-9]/.test(term) && term.length < 4) continue;
    tags.push(term);
  }

  const koreanTerms = source.match(/[가-힣A-Za-z0-9/+-]{2,24}\s?(?:보안|인증|진단|점검|운영|분석|대응|관리체계|컴플라이언스|아키텍처|마스터플랜|프리세일즈)/g) ?? [];
  tags.push(...koreanTerms.map((term) => term.trim()));
  return dedupeTags(tags);
}

export function inferExperienceCategory(input: ProjectTagInput): ResumeCategory {
  const source = normalizeText([input.title, input.organization, input.description, ...(input.existingTags ?? [])].join(" "));
  const scores = new Map<ResumeCategory, number>([
    ["모의해킹", 0],
    ["취약점 진단", 0],
    ["보안 컨설팅", 0],
    ["클라우드 보안", 0],
    ["개발/자동화", 0],
    ["인증", 0],
  ]);

  for (const rule of TAG_RULES) {
    if (!rule.categories?.length) continue;
    if (!rule.synonyms.some((synonym) => includesSynonym(source, synonym))) continue;
    for (const category of rule.categories) {
      scores.set(category, (scores.get(category) ?? 0) + 2);
    }
  }

  if (source.includes("진단")) scores.set("취약점 진단", (scores.get("취약점 진단") ?? 0) + 1);
  if (source.includes("모의해킹")) scores.set("모의해킹", (scores.get("모의해킹") ?? 0) + 2);
  if (source.includes("인증") || source.includes("준거성")) scores.set("인증", (scores.get("인증") ?? 0) + 2);
  if (source.includes("개발") || source.includes("자동화")) scores.set("개발/자동화", (scores.get("개발/자동화") ?? 0) + 1);
  if (source.includes("ot") || source.includes("ics") || source.includes("scada")) {
    scores.set("클라우드 보안", (scores.get("클라우드 보안") ?? 0) + 3);
  }

  return [...scores.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? CATEGORY_DEFAULT;
}

export function generateSecurityTags(input: ProjectTagInput) {
  const curatedTags = CURATED_PROJECT_TAGS[input.title.trim()];
  if (curatedTags) {
    return curatedTags.slice(0, MAX_SECURITY_TAGS);
  }

  const rawSource = [input.title, input.organization, input.description, ...(input.existingTags ?? [])].join(" ");
  const source = normalizeText(rawSource);
  const scoredTags = new Map<string, number>();
  const addScore = (tag: string, score: number) => {
    scoredTags.set(tag, (scoredTags.get(tag) ?? 0) + score);
  };

  for (const rule of TAG_RULES) {
    const matchedSynonyms = rule.synonyms.filter((synonym) => includesSynonym(source, synonym));
    if (matchedSynonyms.length > 0) {
      addScore(rule.tag, matchedSynonyms.length * 3);
    }
  }

  const hasStrongSecuritySignal =
    /모의해킹|취약점|인증|준거성|보안|risk|security|isms|csap|iso 27001|iso 27017|pci-dss|gdpr|hipaa|cpra|appi|ot|ics|scada|waf|hardening|hardening|aut?omation/i.test(rawSource);

  if (!hasStrongSecuritySignal && scoredTags.size === 0) {
    return dedupeTags(dedupeTags(input.existingTags ?? [])).slice(0, MAX_SECURITY_TAGS);
  }

  if (source.includes("정책") || source.includes("지침") || source.includes("절차")) {
    addScore("보안 정책", 2);
    addScore("보안 프로세스", 2);
  }
  if (source.includes("위험")) addScore("위험관리", 2);
  if (source.includes("가이드")) addScore("점검 가이드", 2);
  if (source.includes("체계")) addScore("관리체계 구축", 2);
  if (source.includes("운영")) addScore("운영 체계", 1);
  if (source.includes("교육")) addScore("보안 인식 제고", 2);
  if (source.includes("점검")) addScore("보안 점검", 1);
  if (source.includes("리뷰")) addScore("보안 리뷰", 1);
  if (source.includes("아키텍처")) addScore("보안 아키텍처", 2);
  if (source.includes("마스터플랜")) addScore("보안 마스터플랜", 2);

  const inlineTags = extractInlineProductTags(rawSource);
  if (scoredTags.size > 0 || hasStrongSecuritySignal) {
    for (const tag of inlineTags) {
      addScore(tag, 1);
    }
  }

  const manualTags = dedupeTags(input.existingTags ?? []).slice(0, MAX_SECURITY_TAGS);
  const scoredMatches = [...scoredTags.entries()]
    .filter(([tag]) => !manualTags.some((manualTag) => manualTag.toLowerCase() === tag.toLowerCase()))
    .sort((left, right) => {
      const scoreGap = right[1] - left[1];
      if (scoreGap !== 0) return scoreGap;
      return left[0].length - right[0].length;
    })
    .map(([tag]) => tag);

  return dedupeTags([...manualTags, ...scoredMatches]).slice(0, MAX_SECURITY_TAGS);
}
