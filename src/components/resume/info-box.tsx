import { ExternalLink } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type InfoBoxProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  href?: string;
  className?: string;
};

export function InfoBox({ icon: Icon, label, value, href, className = "" }: InfoBoxProps) {
  const displayValue = label === "학력" ? value.split("/").map((item) => item.trim()).filter(Boolean).join("\n") : value;
  const normalizedHref = normalizeUrl(href);

  return (
    <div className={`flex h-full min-h-[56px] flex-col rounded-[10px] border border-slate-200 bg-slate-50 px-2 py-1.5 md:min-h-[80px] md:px-3 md:py-2.5 ${className}`.trim()}>
      <div className="mb-1 flex items-center gap-1.5 text-slate-500 md:mb-1.5 md:gap-2">
        <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
        <span className="text-[12px] leading-4">{label}</span>
      </div>
      <div className="flex flex-1 items-center">
        {normalizedHref ? (
          <a
            href={normalizedHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 whitespace-pre-wrap text-[13px] font-medium leading-5 text-slate-900 underline-offset-4 hover:underline"
          >
            <span>{displayValue || normalizedHref}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          </a>
        ) : (
          <p className="whitespace-pre-wrap text-[13px] font-medium leading-5 text-slate-900">{displayValue}</p>
        )}
      </div>
    </div>
  );
}

function normalizeUrl(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  if (/^mailto:/i.test(trimmed)) return trimmed;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return `mailto:${trimmed}`;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
