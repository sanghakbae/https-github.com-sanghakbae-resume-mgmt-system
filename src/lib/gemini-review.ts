import type { ProjectReviewResult } from "@/types/resume";

const geminiApiKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim();
const geminiModel = ((import.meta.env.VITE_GEMINI_MODEL as string | undefined)?.trim() || "gemini-2.5-flash").trim();

const PROJECT_TAG_SCHEMA = {
  type: "OBJECT",
  properties: {
    tags: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
  },
  required: ["tags"],
} as const;

const PROJECT_REVIEW_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    suggestedDescription: { type: "STRING" },
    suggestedTags: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
  },
  required: ["summary", "suggestedDescription", "suggestedTags"],
} as const;

export function isGeminiReviewConfigured() {
  return Boolean(geminiApiKey);
}

export async function requestProjectTags({
  title,
  organization,
  category,
  description,
  existingTags,
}: {
  title: string;
  organization: string;
  category: string;
  description: string;
  existingTags?: string[];
}) {
  const result = await requestGeminiJson<{ tags?: string[] }>({
    prompt: [
      "당신은 한국어 보안 이력서 태깅 도우미다.",
      "입력된 프로젝트 설명을 읽고 채용담당자가 빠르게 이해할 수 있는 핵심 태그를 가능한 한 충분히 추출하라.",
      "반드시 JSON만 반환하라.",
      "태그는 짧은 명사형으로 작성하라.",
      "중복 태그, 너무 일반적인 태그, 조사 포함 문장은 제외하라.",
      "보안, 인증, 클라우드, 아키텍처, 운영, 자동화, 진단, 컴플라이언스, 도구명, 역할명 중 의미 있는 것만 선택하라.",
      "",
      `[프로젝트명] ${title}`,
      `[조직] ${organization}`,
      `[카테고리] ${category}`,
      `[설명] ${description}`,
      `[기존태그] ${(existingTags ?? []).join(", ")}`,
    ].join("\n"),
    schema: PROJECT_TAG_SCHEMA,
  });

  return normalizeProjectTags(result.tags ?? []);
}

export async function requestProjectReview({
  title,
  organization,
  category,
  description,
  existingTags,
}: {
  title: string;
  organization: string;
  category: string;
  description: string;
  existingTags?: string[];
}): Promise<ProjectReviewResult> {
  const result = await requestGeminiJson<Partial<ProjectReviewResult>>({
    prompt: [
      "당신은 한국어 이력서 프로젝트 문장 리뷰어다.",
      "입력된 프로젝트 설명을 채용담당자 관점에서 더 간결하고 설득력 있게 다듬어라.",
      "반드시 JSON만 반환하라.",
      "suggestedDescription은 이력서 본문에 바로 붙여넣는 최종 결과물이어야 한다.",
      "suggestedDescription은 2~4문장 길이의 완성 문장으로 작성하라.",
      "suggestedDescription에 가이드, 설명, 메모, 작성요령, 태그 안내, 항목명, 접두사, 따옴표를 절대 넣지 마라.",
      "금지 예시: '가이드:', '태그:', '추천 태그:', '다음과 같이 작성', '핵심 역량 태그는'.",
      "allowed output은 오직 자연스러운 한국어 경력 기술 문장뿐이다.",
      "suggestedTags는 핵심 역량 태그를 가능한 한 충분히 작성하라.",
      "",
      `[프로젝트명] ${title}`,
      `[조직] ${organization}`,
      `[카테고리] ${category}`,
      `[현재 설명] ${description}`,
      `[현재 태그] ${(existingTags ?? []).join(", ")}`,
    ].join("\n"),
    schema: PROJECT_REVIEW_SCHEMA,
  });

  return {
    summary: typeof result.summary === "string" ? result.summary.trim() : "",
    suggestedDescription: normalizeProjectDescription(
      typeof result.suggestedDescription === "string" ? result.suggestedDescription.trim() : description,
      description,
    ),
    suggestedTags: normalizeProjectTags(Array.isArray(result.suggestedTags) ? result.suggestedTags : existingTags ?? []),
  };
}

async function requestGeminiJson<T>({ prompt, schema }: { prompt: string; schema: object }): Promise<T> {
  if (!geminiApiKey) {
    throw new Error("Gemini API key is not configured.");
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": geminiApiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini request failed with status ${response.status}: ${errorText.slice(0, 400)}`);
  }

  const data = (await response.json()) as GeminiGenerateContentResponse;
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return JSON.parse(text) as T;
}

function normalizeProjectTags(tags: string[]) {
  const seen = new Set<string>();

  return tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0 && tag.length <= 24)
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeProjectDescription(value: string, fallback: string) {
  const cleaned = value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !containsMetaGuideText(line))
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return cleaned || fallback;
}

function containsMetaGuideText(line: string) {
  const normalized = line.toLowerCase();
  const blockedPatterns = [
    "가이드",
    "태그:",
    "추천 태그",
    "핵심 역량 태그",
    "다음과 같이",
    "작성 예시",
    "작성 가이드",
    "설명:",
    "메모:",
    "예시:",
  ];

  return blockedPatterns.some((pattern) => normalized.includes(pattern));
}

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};
