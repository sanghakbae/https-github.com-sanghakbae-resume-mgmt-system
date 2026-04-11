import type { Dispatch, SetStateAction } from "react";
import { Building2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CompanyFormValues, CompanyProfile, CompanyValidationErrors } from "@/types/resume";
import { FormField } from "./form-field";

type CompanyFormProps = {
  form: CompanyFormValues;
  errors: CompanyValidationErrors;
  editingOrganization: string | null;
  companies: CompanyProfile[];
  onChange: Dispatch<SetStateAction<CompanyFormValues>>;
  onSubmit: () => void;
  onEdit: (company: CompanyProfile) => void;
  onRemove: (organization: string) => void;
  onCancel: () => void;
};

export function CompanyForm({
  form,
  errors,
  editingOrganization,
  companies,
  onChange,
  onSubmit,
  onEdit,
  onRemove,
  onCancel,
}: CompanyFormProps) {
  const updateField = <K extends keyof CompanyFormValues>(key: K, value: CompanyFormValues[K]) => {
    onChange((prev) => ({ ...prev, [key]: value }));
  };
  const sortedCompanies = [...companies].sort((left, right) => getCompanyPeriodScore(right.period) - getCompanyPeriodScore(left.period));

  return (
    <Card className="rounded-[10px] border border-slate-200 bg-white shadow-sm">
      <CardContent className="space-y-4 p-3.5 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-slate-900 text-white">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold leading-6">{editingOrganization ? "회사 수정" : "회사 추가"}</h2>
            <p className="text-[13px] leading-5 text-slate-500">회사별 경력 정보와 핵심 업무를 먼저 등록합니다.</p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] xl:items-start">
          <div className="space-y-3">
            <FormField label="회사명" error={errors.organization}>
              <Input value={form.organization} onChange={(e) => updateField("organization", e.target.value)} />
            </FormField>
            <FormField label="부서 / 조직">
              <Input value={form.department} onChange={(e) => updateField("department", e.target.value)} />
            </FormField>
            <FormField label="직책 / 역할">
              <Input value={form.position} onChange={(e) => updateField("position", e.target.value)} />
            </FormField>
            <FormField label="재직 기간" error={errors.period}>
              <Input value={form.period} onChange={(e) => updateField("period", e.target.value)} placeholder="예: 2023.06 - 현재" />
            </FormField>
            <FormField label="회사 요약" error={errors.summary}>
              <textarea
                className="min-h-[84px] w-full rounded-[10px] border border-slate-200 px-2.5 py-1.5 text-sm leading-5 outline-none"
                value={form.summary}
                onChange={(e) => updateField("summary", e.target.value)}
              />
            </FormField>
            <FormField label="핵심 업무" error={errors.responsibilities}>
              <textarea
                className="min-h-[84px] w-full rounded-[10px] border border-slate-200 px-2.5 py-1.5 text-sm leading-5 outline-none"
                value={form.responsibilities}
                onChange={(e) => updateField("responsibilities", e.target.value)}
                placeholder="줄바꿈으로 구분해 입력"
              />
            </FormField>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex w-full flex-1 items-center justify-center bg-slate-900 px-4 py-2 text-white" onClick={onSubmit}>
                {editingOrganization ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                {editingOrganization ? "회사 정보 저장" : "회사 추가"}
              </Button>
              {editingOrganization ? (
                <Button className="w-full border border-slate-200 bg-white px-4 py-2 text-slate-700 sm:w-auto" onClick={onCancel}>
                  <X className="mr-2 h-4 w-4" />
                  취소
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-2 rounded-[10px] border border-slate-200 bg-slate-50 p-3 xl:border-l xl:border-slate-200 xl:bg-transparent xl:pl-4">
            <p className="text-[13px] font-medium leading-5 text-slate-700">등록된 회사</p>
            {companies.length ? (
              <div className="space-y-2">
                {sortedCompanies.map((company) => (
                  <div
                    key={company.organization}
                    className={
                      editingOrganization === company.organization
                        ? "flex flex-col gap-2 rounded-[10px] border border-slate-300 bg-slate-100 px-3 py-3"
                        : "flex flex-col gap-2 rounded-[10px] border border-slate-200 bg-white px-3 py-3"
                    }
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{company.organization}</p>
                      <p className="text-[12px] leading-4 text-slate-500">{[company.department, company.position, company.period].filter(Boolean).join(" / ")}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button className="w-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 sm:w-auto" onClick={() => onEdit(company)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        수정
                      </Button>
                      <Button className="w-full border border-slate-200 bg-white px-3 py-2 text-sm text-rose-600 sm:w-auto" onClick={() => onRemove(company.organization)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        삭제
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] leading-5 text-slate-500">등록된 회사가 없습니다.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getCompanyPeriodScore(period?: string) {
  if (!period) return 0;

  return period
    .split("/")
    .map((range) => range.trim())
    .reduce((highest, range) => Math.max(highest, getRangeEndScore(range)), 0);
}

function getRangeEndScore(range: string) {
  const parts = range.split("-").map((value) => value.trim());
  const end = parts[1] ?? parts[0] ?? "";
  return toNumericPeriod(end);
}

function toNumericPeriod(value: string) {
  if (value.includes("현재")) {
    return 999999;
  }

  const normalized = value.replace(/[^0-9.]/g, "");
  const [year = "0", month = "0"] = normalized.split(".");
  return Number(year) * 100 + Number(month);
}
