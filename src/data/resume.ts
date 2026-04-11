import { Award, Briefcase, CheckCircle2, Cloud, FileText, GraduationCap, Shield, User, Server } from "lucide-react";
import type { CategoryMeta, CompanyFormValues, CompanyProfile, ExperienceFormValues, ExperienceItem, Profile, ResumeCategory } from "@/types/resume";

export const categoryOptions: ResumeCategory[] = ["모의해킹", "취약점 진단", "보안 컨설팅", "클라우드 보안", "개발/자동화", "인증"];

export const categoryMeta: Record<ResumeCategory, CategoryMeta> = {
  "모의해킹": { label: "모의해킹", icon: Shield },
  "취약점 진단": { label: "취약점 진단", icon: Server },
  "보안 컨설팅": { label: "보안 컨설팅", icon: FileText },
  "클라우드 보안": { label: "클라우드 보안", icon: Cloud },
  "개발/자동화": { label: "개발/자동화", icon: Briefcase },
  "인증": { label: "인증", icon: Award },
};

export const profileInfoItems = [
  { key: "education", label: "학력", icon: GraduationCap },
  { key: "career", label: "경력", icon: Briefcase },
  { key: "specialty", label: "전문분야", icon: Shield },
  { key: "certifications", label: "자격 사항", icon: Award },
  { key: "military", label: "병역 사항", icon: FileText },
  { key: "industries", label: "산업 군", icon: CheckCircle2 },
] as const;

export const profileHeaderIcon = User;

export const defaultCompanyProfiles: CompanyProfile[] = [
  {
    organization: "(주)무하유",
    department: "정보보호 유닛",
    position: "Leader / CISO / CPO",
    period: "2024.06 - 현재",
    summary: "AI 서비스 기업에서 CISO/CPO로 정보보호 관리체계 수립 및 운영, ISMS 인증 준비, 보안시스템 기획과 운영을 총괄했습니다.",
    responsibilities: [
      "ISMS 기준 정보보안 정책 및 지침 제정",
      "법적 준거성 검토와 개인정보처리방침 개정",
      "위험평가와 위험 대응 계획 수립",
      "보안성 검토, 침해사고 대응, 취약점 점검 절차 수립",
      "DLP, 백신, Trivy, SonarQube, Datadog 기반 보안 운영",
    ],
  },
  {
    organization: "알체라(Alchera Inc.)",
    department: "Platform Engineering (Security)",
    position: "Manager",
    period: "2023.06 - 2024.04",
    summary: "영상인식 AI 솔루션 기업에서 정보보호 관리자 역할을 수행하며 정보보호 관리체계 운영, 인증 대응, 보안 운영, 업무용 소프트웨어 관리 체계를 고도화했습니다.",
    responsibilities: [
      "정보보호 규정, 지침, 절차 제정 및 운영",
      "임직원 보안 인식 교육과 보안 캠페인 운영",
      "보안성 검토 절차 수립 및 실무 운영",
      "VPN, 방화벽, DLP, 백신 등 보안시스템 운영",
      "CSAP 및 ISO 27001/27017 인증 준비",
      "Google Workspace, GitHub, Atlassian, Slack 등 업무용 소프트웨어 운영",
    ],
  },
  {
    organization: "삼정회계법인(KPMG)",
    department: "Digital Tech - Cyber Security / Internal Audit & Forensic",
    position: "부장 / S.Senior",
    period: "2014.07 - 2016.09 / 2020.01 - 2023.06",
    summary: "컨설팅 펌에서 IT·OT 보안 컨설팅과 국내외 정보보호 인증 컨설팅을 수행하며 PM·PL 역할로 제조, 유통, 금융, 공공, 발전 분야 프로젝트를 리드했습니다.",
    responsibilities: [
      "ISMS, ISMS-P, ISO 27001 인증 컨설팅 수행",
      "위험 분석 및 평가, 법적 준거성 검토",
      "IT 및 OT 보안 마스터플랜과 아키텍처 설계",
      "모의해킹, 시스템 하드닝, 보안성 검토 리뷰",
      "글로벌 컴플라이언스 검토와 중장기 과제 정의",
    ],
  },
  {
    organization: "위메프",
    department: "정보보호실 보안기술팀",
    position: "Leader",
    period: "2019.05 - 2019.12",
    summary: "이커머스 환경에서 보안기술팀을 이끌며 보안시스템 기획, 운영 현황 관리, 보안성 검토 절차 정립과 보안관제 고도화를 수행했습니다.",
    responsibilities: [
      "DB 접근제어, 소스코드 취약점 점검 솔루션 도입 기획",
      "보안 정기 점검과 보안시스템 정책 검토",
      "보안성 검토 절차 및 체크리스트 수립",
      "관문/내부 방화벽 정책 개선과 탐지 범위 확대",
    ],
  },
  {
    organization: "대정에이앤지(주)",
    department: "ICS 보안솔루션팀",
    position: "Leader",
    period: "2016.09 - 2019.05",
    summary: "OT 보안솔루션 팀장으로 제어시스템 보안 리서치, 솔루션 구축·운영, 프리세일즈와 데모 시스템 구축을 수행했습니다.",
    responsibilities: [
      "OT 보안 솔루션 PoC, 데모 시연, 프리세일즈",
      "제어시스템 보안 리서치와 데모 환경 구축",
      "PLC 레더 프로그램 작성 및 Modbus 해킹 도구 개발",
      "국내 기반시설 대상 OT 보안시스템 구축 및 운영",
    ],
  },
  {
    organization: "씨제이올리브네트웍스(주)",
    department: "IT 보안팀 - 침해예방보안 부문",
    position: "대리",
    period: "2013.09 - 2014.06",
    summary: "송도 IDC IT 보안 담당자로 보안시스템 구축과 운영, 침해사고 분석, 그룹 계열사 대상 웹 모의해킹을 수행했습니다.",
    responsibilities: [
      "침해사고 분석 및 대응 매뉴얼 작성",
      "FireEye, ShellMonitor, ESM 탐지 룰 고도화",
      "CJ 그룹 정기 웹 모의해킹 수행",
      "웹 서비스 취약점 점검 및 하드닝 수행",
    ],
  },
  {
    organization: "주식회사 윈스",
    department: "침해사고대응팀",
    position: "대리",
    period: "2012.06 - 2013.09",
    summary: "침해사고대응팀에서 침해사고 분석 및 대응, 웹 서비스 모의해킹, SQLMAP 패턴과 WAF 우회 패턴 연구를 수행했습니다.",
    responsibilities: [
      "3.20 전산대란, 6.25 사이버테러 등 침해사고 분석 및 대응",
      "대학교, 언론사, 공공기관 대상 웹 서비스 모의해킹 수행",
      "SQLMAP Injection 패턴 및 WAF 우회 패턴 연구",
      "침해사고대응컨퍼런스 D-Day 2013 발표",
    ],
  },
  {
    organization: "한전케이디엔(주)",
    department: "취약점분석평가팀",
    position: "대리",
    period: "2010.07 - 2012.06",
    summary: "지식경제부 사이버안전센터 소속으로 에너지 기관 기반시설을 대상으로 취약점 분석과 평가, 망분리 적정성 검토를 수행했습니다.",
    responsibilities: [
      "기반시설 워크스테이션 취약점 점검",
      "방화벽 정책 분석 및 외부 인입 접점 검토",
      "Multi Homed Network 자산 식별",
      "망분리와 망연계 시스템 적정성 검토",
    ],
  },
  {
    organization: "엔코딩패스 주식회사",
    department: "보안컨설팅사업부",
    position: "대리",
    period: "2008.07 - 2010.07",
    summary: "SKT IT 보안팀 파견 인력으로 인프라 취약점 점검, 웹 서비스 모의해킹, 점검 가이드와 자동화 스크립트 고도화를 수행했습니다.",
    responsibilities: [
      "서버, WEB/WAS, DBMS, 네트워크 취약점 진단",
      "내·외부 웹 서비스 모의해킹",
      "분기별 취약점 점검 가이드 제·개정",
      "자동화 스크립트 고도화 및 exploit test",
    ],
  },
  {
    organization: "(주)모니터랩",
    department: "위협분석팀",
    position: "연구원",
    period: "2007.01 - 2008.07",
    summary: "웹 서비스 해킹 패턴 연구를 기반으로 웹방화벽 시그니처 룰 개발, 웹 취약점 스캐너 개발, 보안 교육을 수행했습니다.",
    responsibilities: [
      "웹 취약점 및 공격 패턴 리서치",
      "웹방화벽 시그니처 룰 개발",
      "허니팟 운영을 통한 공격 패턴 분석",
      "웹 취약점 스캐너 개발 및 GS 인증 참여",
    ],
  },
];

export const defaultProfile: Profile = {
  name: "배상학",
  role: "CISO / CPO / 정보보호 관리자 / 보안 컨설턴트",
  summary:
    "지난 18년 이상 정보보안 전문가로서 보안시스템 개발 기업의 보안 리서처, 다양한 산업군의 보안 컨설턴트, 그리고 AI 서비스 기업의 정보보호 책임자 역할을 수행해왔습니다. ISMS, ISMS-P, ISO 27001, CSAP 인증 컨설팅과 정보보호 관리체계 구축 및 운영, 웹 모의해킹과 시스템 취약점 진단, OT 보안 아키텍처 설계와 보안 마스터플랜 수립 경험을 보유하고 있습니다.",
  photo: "",
  photoPositionX: 50,
  photoPositionY: 20,
  photoScale: 1,
  education: "한국산업기술대학교 컴퓨터공학과\n건국대학교 정보통신대학원 정보시스템감리학과(휴학)",
  career: "2007.01 ~ 현재",
  specialty: "ISMS / ISMS-P / ISO 27001 / CSAP / IT·OT 보안 / 모의해킹 / 취약점 진단",
  military: "육군 / 보병 / 2001.08.04 ~ 2004.07.13 / 병역특례(소집해제)",
  industries: "AI 서비스 / 제조 / 유통 / 금융 / 공공 / 발전 / 에너지 / 이커머스",
  certifications: "CISSP / LPIC Level 1 / 정보처리기사 / 전자계산기기능사 / 전자기기기능사 / Nozomi Networks Certified Engineer",
};

export const defaultExperiences: ExperienceItem[] = [
  {
    id: 1001,
    title: "CISO/CPO 기반 정보보호 관리체계 수립 및 ISMS 준비",
    organization: "(주)무하유",
    period: "2024.06 - 현재",
    category: "인증",
    description:
      "CISO/CPO로서 ISMS 기준 정보보안 정책과 지침을 제정하고, 법적 준거성 검토, 위험평가, 보안성 검토 절차, 개인정보 위수탁 및 침해사고 대응 절차를 수립했습니다. 또한 DLP, 백신, Trivy, SonarQube, Datadog 기반의 보안 운영 체계를 구축했습니다.",
    highlight: ["CISO", "CPO", "ISMS", "위험평가", "보안 운영"],
  },
  {
    id: 1002,
    title: "대외 웹 서비스 모의해킹 및 보안 교육 체계 운영",
    organization: "(주)무하유",
    period: "2024.06 - 현재",
    category: "모의해킹",
    description:
      "대외 웹 서비스 18개 사이트를 대상으로 Burp Suite 기반 모의해킹을 수행하고, 연간 정보보호 교육 계획 수립, 신규 입사자 보안 교육, 개발보안 가이드 작성과 개발자 대상 교육을 운영했습니다.",
    highlight: ["Burp Suite", "웹 모의해킹", "보안 교육", "개발보안", "18개 사이트"],
  },
  {
    id: 1003,
    title: "ITGC 통제 관리시스템 개발 및 운영",
    organization: "(주)무하유",
    period: "2024.06 - 현재",
    category: "개발/자동화",
    description:
      "사내 정보보호 관리체계 운영 효율화를 위해 ITGC 통제 관리시스템을 설계하고 등록 프로세스를 정비했습니다. 통제 항목 관리, 점검 이력 추적, 증적 관리, 운영 현황 가시화를 중심으로 실무 운영 체계를 구축했습니다.",
    highlight: ["ITGC", "통제 관리", "개발", "증적 관리", "운영 자동화"],
  },
  {
    id: 1004,
    title: "정보보호 관리체계 운영 및 CSAP·ISO 인증 대응",
    organization: "알체라(Alchera Inc.)",
    period: "2023.06 - 2024.04",
    category: "인증",
    description:
      "기업 정보보호 관리자 역할로 정보보호 규정 및 절차 제정, 임직원 보안 인식 교육, 개인정보처리방침 및 서약서 개정, 보안성 검토 절차 수립, VPN·방화벽·DLP·백신 운영과 함께 CSAP 및 ISO 27001/27017 인증 준비를 수행했습니다.",
    highlight: ["정보보호 관리체계", "CSAP", "ISO 27001", "ISO 27017", "보안 운영"],
  },
  {
    id: 1005,
    title: "업무용 소프트웨어 보안 및 비용 관리 체계 운영",
    organization: "알체라(Alchera Inc.)",
    period: "2023.06 - 2024.04",
    category: "개발/자동화",
    description:
      "Google Workspace, GitHub, Atlassian, Slack, 그룹웨어, JetBrains, Figma 등 업무용 소프트웨어 라이선스를 관리하고, IP ACL 및 2단계 인증 강제 적용을 통해 접근 통제를 강화했습니다.",
    highlight: ["Google Workspace", "GitHub", "Atlassian", "2FA", "IP ACL"],
  },
  {
    id: 1006,
    title: "롯데면세점 ISMS-P 인증(사후) 컨설팅 PM",
    organization: "삼정회계법인(KPMG)",
    period: "2023.03 - 2023.05",
    category: "인증",
    description:
      "ISMS-P 322개 통제항목 기준 Gap 분석, 위험 분석 및 평가, 법적 준거성 검토, 결함 조치 가이드 검토와 영업점 현장 점검 체크리스트 개정을 주도했습니다.",
    highlight: ["ISMS-P", "PM", "위험분석", "법적 준거성", "Gap 분석"],
  },
  {
    id: 1007,
    title: "메디트 ISO 27001 갱신 및 글로벌 컴플라이언스 검토 PM",
    organization: "삼정회계법인(KPMG)",
    period: "2023.01 - 2023.03",
    category: "인증",
    description:
      "ISO 27001 통제항목 기준 Gap 분석과 위험평가, 모의해킹 및 시스템 하드닝 리뷰를 수행하고 GDPR, HIPPA, CPRA, JP APPI 등 글로벌 컴플라이언스 준거성을 검토했습니다.",
    highlight: ["ISO 27001", "GDPR", "HIPPA", "하드닝 리뷰", "컴플라이언스"],
  },
  {
    id: 1008,
    title: "CJ 푸드빌 ISMS-P 최초 인증 컨설팅 PM",
    organization: "삼정회계법인(KPMG)",
    period: "2022.10 - 2022.12",
    category: "인증",
    description:
      "ISMS-P 322개 통제항목 기준 Gap 분석과 위험평가, 웹 서비스 모의해킹, 시스템 하드닝 리뷰, 정책 및 지침 개정, 시스템·개인정보 흐름도 작성을 수행했습니다.",
    highlight: ["ISMS-P", "초기 인증", "웹 모의해킹", "하드닝", "PM"],
  },
  {
    id: 1009,
    title: "롯데 마트·슈퍼 ISMS 사후 인증 컨설팅 PM",
    organization: "삼정회계법인(KPMG)",
    period: "2022.04 - 2022.08",
    category: "인증",
    description:
      "ISMS 통제항목 234개 기준 Gap 분석과 위험평가, 모의해킹 및 시스템 하드닝 리뷰, 정보보안 규정 개정, 법적 준거성 검토, 인증심사 대응 교육을 수행했습니다.",
    highlight: ["ISMS", "사후 인증", "위험평가", "인증심사", "PM"],
  },
  {
    id: 1010,
    title: "발전소 OT 보안 마스터플랜 및 아키텍처 설계",
    organization: "삼정회계법인(KPMG)",
    period: "2021.08 - 2021.12",
    category: "클라우드 보안",
    description:
      "대륜발전 및 별내에너지 발전소를 대상으로 관문 방화벽 정책 분석, Nozomi Guardian 기반 패킷 분석, 자산 식별, 네트워크 구성도 작성, OA/FA 망분리와 Purdue 모델 기반 OT 보안 아키텍처를 설계했습니다.",
    highlight: ["OT 보안", "Nozomi Guardian", "망분리", "Purdue 모델", "마스터플랜"],
  },
  {
    id: 1011,
    title: "LS산전 OT 보안체계 수립 컨설팅 PM",
    organization: "삼정회계법인(KPMG)",
    period: "2020.11 - 2021.02",
    category: "클라우드 보안",
    description:
      "Nozomi Guardian 기반 OA/FA 네트워크 패킷 분석과 이상징후 분석을 수행하고, 중장기 OT 보안 마스터플랜과 글로벌 표준 기반 FA 보안 아키텍처 모델을 수립했습니다.",
    highlight: ["LS산전", "OT 보안", "Nozomi Guardian", "OA/FA", "PM"],
  },
  {
    id: 1012,
    title: "SK실트론 OT 보안 마스터플랜 수립 PM",
    organization: "삼정회계법인(KPMG)",
    period: "2020.08 - 2020.09",
    category: "클라우드 보안",
    description:
      "OA/FA 네트워크 분석과 보안 운영 현황 검토를 통해 망분리 설계안을 포함한 중장기 OT 보안 마스터플랜을 수립했습니다.",
    highlight: ["SK실트론", "OT 보안", "망분리", "마스터플랜", "PM"],
  },
  {
    id: 1013,
    title: "위메프 보안기술팀 운영 및 보안성 검토 체계 수립",
    organization: "위메프",
    period: "2019.05 - 2019.12",
    category: "개발/자동화",
    description:
      "보안기술팀 팀장으로 DB 접근제어와 소스코드 취약점 점검 솔루션 도입을 기획하고, 보안성 검토 절차와 체크리스트를 수립했으며 보안관제 고도화와 방화벽 정책 개선을 수행했습니다.",
    highlight: ["보안성 검토", "DB 접근제어", "소스코드 진단", "보안관제", "팀장"],
  },
  {
    id: 1014,
    title: "평창동계올림픽 EMS 구축 및 OT 보안 솔루션 프리세일즈",
    organization: "대정에이앤지(주)",
    period: "2017.10 - 2018.03",
    category: "개발/자동화",
    description:
      "OT 보안솔루션팀 팀장으로 제어시스템 보안 리서치와 프리세일즈를 수행했으며, 2018 평창동계올림픽 에너지 모니터링 시스템 구축 프로젝트를 리드했습니다. 또한 PLC 레더 프로그램과 Modbus 해킹 도구 개발 경험을 보유하고 있습니다.",
    highlight: ["OT 솔루션", "EMS", "PLC", "Modbus", "프리세일즈"],
  },
  {
    id: 1015,
    title: "한국수자원공사 천안정수장 OT 보안솔루션 구축 및 운영",
    organization: "대정에이앤지(주)",
    period: "2017.01 - 2017.12",
    category: "클라우드 보안",
    description:
      "국내 최초 기반시설 SCADA 시스템 보안솔루션 구축과 운영을 수행하고, 솔루션 데이터와 네트워크 패킷 분석으로 비식별 자산과 Multi Homed Network를 식별해 네트워크 분리를 강화했습니다.",
    highlight: ["SCADA", "기반시설", "OT 보안솔루션", "Multi Homed Network", "운영"],
  },
  {
    id: 1016,
    title: "금융·항공·공공 분야 모의해킹 및 개인정보보호 컨설팅",
    organization: "삼정회계법인(KPMG)",
    period: "2014.07 - 2016.09",
    category: "모의해킹",
    description:
      "아시아나 에바카스 PCI-DSS, NH농협 개인정보보호, KB국민은행 보안 컨설팅, KT 차세대 시스템 보안성 검토, 라이나생명 및 BNP 파리바카디프 모의해킹 등 다양한 프로젝트를 PL/PM으로 수행했습니다.",
    highlight: ["PCI-DSS", "개인정보보호", "웹 모의해킹", "PL", "PM"],
  },
  {
    id: 1017,
    title: "CJ 그룹 웹 모의해킹 및 보안시스템 운영",
    organization: "씨제이올리브네트웍스(주)",
    period: "2013.09 - 2014.06",
    category: "모의해킹",
    description:
      "송도 IDC IT 보안팀에서 FireEye, ShellMonitor, ESM 탐지 룰 고도화, 침해사고 분석 보고서 작성과 함께 CJ 계열사 정기 웹 모의해킹과 YTN 통합보도정보시스템 모의해킹을 수행했습니다.",
    highlight: ["FireEye", "침해사고 분석", "ESM", "웹 모의해킹", "하드닝"],
  },
  {
    id: 1018,
    title: "침해사고 대응 및 대학·언론사 모의해킹",
    organization: "주식회사 윈스",
    period: "2012.06 - 2013.09",
    category: "모의해킹",
    description:
      "3.20 전산대란과 6.25 사이버테러 대응 분석에 참여하고, 한양대학교와 언론사, 공공기관, 기업 웹 서비스를 대상으로 모의해킹과 취약점 진단을 수행했습니다. SQLMAP Injection 패턴과 WAF 우회 패턴 연구도 병행했습니다.",
    highlight: ["침해사고 대응", "한양대학교", "언론사", "SQLMAP", "WAF 우회"],
  },
  {
    id: 1019,
    title: "국가 기반시설 취약점 분석 및 평가",
    organization: "한전케이디엔(주)",
    period: "2010.07 - 2012.06",
    category: "취약점 진단",
    description:
      "지식경제부 사이버안전센터 소속으로 발전기관과 에너지 공기업 기반시설을 대상으로 워크스테이션 시스템 취약점 점검, 방화벽 정책 분석, Multi Homed Network 식별, 망분리 적정성 검토를 수행했습니다.",
    highlight: ["기반시설", "취약점 분석", "방화벽 정책", "망분리", "에너지"],
  },
  {
    id: 1020,
    title: "SKT 인프라 보안 취약점 진단 및 웹 모의해킹",
    organization: "엔코딩패스 주식회사",
    period: "2008.07 - 2010.07",
    category: "취약점 진단",
    description:
      "SKT IT 보안팀 파견 인력으로 서버, WEB/WAS, DBMS, 네트워크 취약점 진단과 내·외부 웹 서비스 모의해킹을 수행하고 점검 가이드와 자동화 스크립트를 고도화했습니다.",
    highlight: ["SKT", "WEB/WAS", "DBMS", "자동화 스크립트", "SQL Injection"],
  },
  {
    id: 1021,
    title: "웹방화벽 시그니처 룰 개발 및 웹 취약점 연구",
    organization: "(주)모니터랩",
    period: "2007.01 - 2008.07",
    category: "개발/자동화",
    description:
      "위협분석팀 연구원으로 웹 취약점 스캐너 개발, GS 인증 참여, 허니팟 기반 공격 패턴 분석, ModSecurity 및 WebKnight 시그니처 룰 개발과 개발자 대상 보안 교육을 수행했습니다.",
    highlight: ["WAF", "시그니처 룰", "허니팟", "GS 인증", "보안 교육"],
  },
];

export const emptyExperienceForm: ExperienceFormValues = {
  title: "",
  organization: "",
  period: "",
  category: "모의해킹",
  description: "",
  highlight: "",
  url: "",
  image: "",
};

export const emptyCompanyForm: CompanyFormValues = {
  organization: "",
  department: "",
  position: "",
  period: "",
  summary: "",
  responsibilities: "",
};
