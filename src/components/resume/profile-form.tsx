import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { ImagePlus, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Profile } from "@/types/resume";
import { FormField } from "./form-field";

type ProfileFormProps = {
  ownerId: string;
  profile: Profile;
  isUploading?: boolean;
  onChange: Dispatch<SetStateAction<Profile>>;
  onUploadPhoto?: (file: File) => Promise<void>;
};

export function ProfileForm({ ownerId, profile, isUploading = false, onChange, onUploadPhoto }: ProfileFormProps) {
  const updateField = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    onChange((prev) => ({ ...prev, [key]: value }));
  };

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      event.target.value = "";
      return;
    }

    if (onUploadPhoto && ownerId) {
      await onUploadPhoto(file);
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateField("photo", typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <Card className="rounded-[10px] border border-slate-200 bg-white shadow-sm">
      <CardContent className="space-y-3 p-3.5 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-slate-900 text-white">
            <UserRound className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold leading-6">기본 정보</h2>
            <p className="text-[13px] leading-5 text-slate-500">공개 이력서 상단 프로필 영역에 표시됩니다.</p>
          </div>
        </div>

        <FormField label="이름">
          <Input value={profile.name} onChange={(e) => updateField("name", e.target.value)} />
        </FormField>
        <FormField label="직무 / 역할">
          <Input value={profile.role} onChange={(e) => updateField("role", e.target.value)} />
        </FormField>
        <FormField label="소개">
          <textarea
            className="min-h-[88px] w-full rounded-[10px] border border-slate-200 px-2.5 py-1.5 text-sm leading-5 outline-none"
            value={profile.summary}
            onChange={(e) => updateField("summary", e.target.value)}
          />
        </FormField>
        <FormField label="이력서 사진">
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-[13px] font-medium leading-5 text-slate-700">
              <ImagePlus className="h-4 w-4" />
              {isUploading ? "사진 업로드 중" : "사진 업로드"}
              <input type="file" accept="image/*,.gif" className="hidden" onChange={(event) => void handlePhotoChange(event)} disabled={isUploading} />
            </label>
            <p className="text-[12px] leading-4 text-slate-500">PNG, JPG, GIF를 지원하며 공개 이력서 상단 프로필에 노출됩니다.</p>
            {profile.photo ? (
              <div className="overflow-hidden rounded-[10px] border border-slate-200 bg-slate-50 p-2">
                <div className="mx-auto aspect-square max-h-48 w-full max-w-48 overflow-hidden rounded-[8px] bg-slate-100">
                  <img src={profile.photo} alt={`${profile.name} 프로필`} className="h-full w-full object-cover [object-position:center_20%]" />
                </div>
              </div>
            ) : null}
            {profile.photo ? (
              <Button className="w-full border border-slate-200 bg-white px-4 py-2 text-slate-700 sm:w-auto" onClick={() => updateField("photo", "")}>
                <Trash2 className="mr-2 h-4 w-4" />
                사진 제거
              </Button>
            ) : null}
          </div>
        </FormField>
        <FormField label="학력">
          <Input value={profile.education} onChange={(e) => updateField("education", e.target.value)} />
        </FormField>
        <FormField label="경력">
          <Input value={profile.career} onChange={(e) => updateField("career", e.target.value)} />
        </FormField>
        <FormField label="전문분야">
          <Input value={profile.specialty} onChange={(e) => updateField("specialty", e.target.value)} />
        </FormField>
        <FormField label="주요 경험">
          <Input value={profile.certifications} onChange={(e) => updateField("certifications", e.target.value)} />
        </FormField>
      </CardContent>
    </Card>
  );
}
