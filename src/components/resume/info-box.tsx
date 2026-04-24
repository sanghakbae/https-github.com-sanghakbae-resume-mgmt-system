import type { LucideIcon } from "lucide-react";

type InfoBoxProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  className?: string;
};

export function InfoBox({ icon: Icon, label, value, className = "" }: InfoBoxProps) {
  const displayValue = label === "학력" ? value.split("/").map((item) => item.trim()).filter(Boolean).join("\n") : value;
  const isSingleLine = !displayValue.includes("\n") && displayValue.length <= 70;

  return (
    <div className={`flex ${isSingleLine ? "min-h-[62px] py-2" : "min-h-[80px] py-2.5"} flex-col rounded-[10px] border border-slate-200 bg-slate-50 px-3 ${className}`.trim()}>
      <div className={`${isSingleLine ? "mb-1" : "mb-1.5"} flex items-center gap-2 text-slate-500`}>
        <Icon className="h-4 w-4" />
        <span className="text-[12px] leading-4">{label}</span>
      </div>
      <div className="flex flex-1 items-center">
        <p className="whitespace-pre-wrap text-[13px] font-medium leading-5 text-slate-900">{displayValue}</p>
      </div>
    </div>
  );
}
