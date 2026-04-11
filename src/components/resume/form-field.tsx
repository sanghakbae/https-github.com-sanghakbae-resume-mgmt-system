import type { ReactNode } from "react";

type FormFieldProps = {
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
};

export function FormField({ label, error, children, className = "" }: FormFieldProps) {
  return (
    <label className={`flex h-full flex-col space-y-1 ${className}`.trim()}>
      <span className="text-[13px] font-medium leading-5 text-slate-700">{label}</span>
      {children}
      {error ? <p className="text-[12px] leading-4 text-rose-600">{error}</p> : null}
    </label>
  );
}
