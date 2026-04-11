import { categoryMeta } from "@/data/resume";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExperienceItem } from "@/types/resume";

type ExperienceCardProps = {
  item: ExperienceItem;
  isEditMode: boolean;
  onEdit: (item: ExperienceItem) => void;
  onRemove: (id: number) => void;
};

export function ExperienceCard({ item, isEditMode, onEdit, onRemove }: ExperienceCardProps) {
  const linkPreview = getLinkPreview(item.url);

  return (
    <div className="rounded-[10px] border border-slate-200 p-3.5 sm:p-4" data-export-project-card>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h4 className="text-base font-semibold leading-6 text-slate-900">{item.title}</h4>
          <p className="mt-1 text-[13px] leading-5 text-slate-500">{item.period}</p>
        </div>

        {isEditMode ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="w-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 sm:w-auto" onClick={() => onEdit(item)}>
              <Pencil className="mr-2 h-4 w-4" />
              수정
            </Button>
            <Button className="w-full border border-slate-200 bg-white px-3 py-2 text-sm text-rose-600 sm:w-auto" onClick={() => onRemove(item.id)}>
              <Trash2 className="mr-2 h-4 w-4" />
              삭제
            </Button>
          </div>
        ) : null}
      </div>

      <div className={`mt-3 grid gap-3 ${item.image ? "lg:grid-cols-[minmax(0,1fr)_320px]" : "grid-cols-1"}`}>
        <div>
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.description}</p>

          {item.url ? (
            <div className="mt-3 space-y-2">
              {linkPreview ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-[10px] border border-slate-200 bg-slate-50 px-2.5 py-2"
                >
                  <img
                    src={linkPreview.favicon}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-[8px] border border-slate-200 bg-white object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium leading-4 text-slate-900">{linkPreview.hostname}</p>
                    <p className="truncate text-[11px] leading-4 text-slate-500">{item.url}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-slate-500" />
                </a>
              ) : (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 underline underline-offset-4"
                >
                  프로젝트 링크
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          ) : null}
        </div>

        {item.image ? (
          <div className="overflow-hidden rounded-[10px] border border-slate-200 bg-slate-50">
            <img src={item.image} alt={`${item.title} 이미지`} className="h-auto max-h-72 w-full object-contain" />
          </div>
        ) : null}
      </div>

      {item.highlight.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-1">
          <span className="inline-flex min-h-5 items-center justify-center rounded-[5px] border border-slate-200 bg-slate-900 px-1.5 py-0.5 text-[10px] leading-none text-white">
            {categoryMeta[item.category].label}
          </span>
          {item.highlight.map((tag) => (
            <span
              key={`${item.id}-${tag}`}
              className="inline-flex min-h-5 items-center justify-center rounded-[5px] border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] leading-none text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-1">
          <span className="inline-flex min-h-5 items-center justify-center rounded-[5px] border border-slate-200 bg-slate-900 px-1.5 py-0.5 text-[10px] leading-none text-white">
            {categoryMeta[item.category].label}
          </span>
        </div>
      )}
    </div>
  );
}

function getLinkPreview(url?: string) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");
    return {
      hostname,
      favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=64`,
    };
  } catch {
    return null;
  }
}
