import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { ImagePlus, Plus, Save, Trash2, X } from "lucide-react";
import { categoryOptions } from "@/data/resume";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ExperienceFormValues, ExperienceValidationErrors } from "@/types/resume";
import { FormField } from "./form-field";

type ExperienceFormProps = {
  ownerId: string;
  form: ExperienceFormValues;
  errors: ExperienceValidationErrors;
  editingId: number | null;
  organizations?: string[];
  isUploading?: boolean;
  onChange: Dispatch<SetStateAction<ExperienceFormValues>>;
  onSubmit: () => void;
  onCancel: () => void;
  onUploadImage?: (file: File) => Promise<void>;
};

export function ExperienceForm({
  ownerId,
  form,
  errors,
  editingId,
  organizations = [],
  isUploading = false,
  onChange,
  onSubmit,
  onCancel,
  onUploadImage,
}: ExperienceFormProps) {
  const updateField = <K extends keyof ExperienceFormValues>(key: K, value: ExperienceFormValues[K]) => {
    onChange((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      event.target.value = "";
      return;
    }

    if (onUploadImage && ownerId) {
      await onUploadImage(file);
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateField("image", typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <Card className="rounded-[10px] border border-slate-200 bg-white shadow-sm">
      <CardContent className="space-y-3 p-3.5 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-slate-900 text-white">
            {editingId === null ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          </div>
          <div>
            <h2 className="text-base font-semibold leading-6">{editingId === null ? "수행 업무 추가" : "수행 업무 수정"}</h2>
            <p className="text-[13px] leading-5 text-slate-500">카테고리에 따라 공개 이력서 섹션으로 자동 분류됩니다.</p>
          </div>
        </div>

        <FormField label="업무명 / 프로젝트명" error={errors.title}>
          <Input value={form.title} onChange={(e) => updateField("title", e.target.value)} />
        </FormField>
        <FormField label="고객사 / 조직명" error={errors.organization}>
          <>
            <Input value={form.organization} onChange={(e) => updateField("organization", e.target.value)} list="experience-organizations" />
            {organizations.length ? (
              <datalist id="experience-organizations">
                {organizations.map((organization) => (
                  <option key={organization} value={organization} />
                ))}
              </datalist>
            ) : null}
          </>
        </FormField>
        <FormField label="기간" error={errors.period}>
          <Input value={form.period} onChange={(e) => updateField("period", e.target.value)} placeholder="예: 2025.01 - 2025.03" />
        </FormField>
        <FormField label="카테고리">
          <select
            className="h-9 w-full rounded-[10px] border border-slate-200 bg-white px-2.5 text-sm outline-none"
            value={form.category}
            onChange={(e) => updateField("category", e.target.value as ExperienceFormValues["category"])}
          >
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="수행 업무 설명" error={errors.description}>
          <textarea
            className="min-h-[96px] w-full rounded-[10px] border border-slate-200 px-2.5 py-1.5 text-sm leading-5 outline-none"
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
          />
        </FormField>
        <FormField label="핵심 키워드">
          <Input
            value={form.highlight}
            onChange={(e) => updateField("highlight", e.target.value)}
            placeholder="쉼표로 구분 예: AWS, IAM, 아키텍처"
          />
        </FormField>
        <FormField label="업무 이미지">
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-[13px] font-medium leading-5 text-slate-700">
              <ImagePlus className="h-4 w-4" />
              {isUploading ? "이미지 업로드 중" : "이미지 업로드"}
              <input type="file" accept="image/*,.gif" className="hidden" onChange={(event) => void handleImageChange(event)} disabled={isUploading} />
            </label>
            <p className="text-[12px] leading-4 text-slate-500">PNG, JPG, GIF 모두 가능하며 폼 안에서 바로 미리보기 됩니다.</p>
            {form.image ? (
              <div className="overflow-hidden rounded-[10px] border border-slate-200 bg-slate-50">
                <img src={form.image} alt="업무 미리보기" className="h-auto max-h-56 w-full object-contain" />
              </div>
            ) : null}
            {form.image ? (
              <Button className="w-full border border-slate-200 bg-white px-4 py-2 text-slate-700 sm:w-auto" onClick={() => updateField("image", "")}>
                <Trash2 className="mr-2 h-4 w-4" />
                이미지 제거
              </Button>
            ) : null}
          </div>
        </FormField>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="flex w-full flex-1 items-center justify-center bg-slate-900 px-4 py-2 text-white" onClick={onSubmit}>
            {editingId === null ? <Plus className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
            {editingId === null ? "수행 업무 추가" : "수정 내용 저장"}
          </Button>
          {editingId !== null ? (
            <Button className="w-full border border-slate-200 bg-white px-4 py-2 text-slate-700 sm:w-auto" onClick={onCancel}>
              <X className="mr-2 h-4 w-4" />
              취소
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
