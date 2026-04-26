import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { ImagePlus, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Profile } from "@/types/resume";
import { getPhotoTransformStyle } from "@/lib/photo-style";
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
            className="min-h-[88px] w-full rounded-[10px] border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm leading-5 text-slate-700 outline-none"
            value={profile.summary}
            readOnly
          />
          <p className="mt-1 text-[12px] leading-4 text-slate-500">경력, 산업 군, 수행 업무, 태그를 기준으로 자동 생성됩니다.</p>
        </FormField>
        <div className="grid gap-3 lg:grid-cols-[288px_minmax(0,1fr)] lg:items-start">
          <FormField label="명함사진" className="h-fit self-start rounded-[16px] border border-slate-200 bg-slate-50/60 p-2.5 shadow-[0_1px_0_rgba(255,255,255,0.85)_inset]">
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-[13px] font-medium leading-5 text-slate-700">
                <ImagePlus className="h-4 w-4" />
                {isUploading ? "사진 업로드 중" : "사진 업로드"}
                <input type="file" accept="image/*,.gif" className="hidden" onChange={(event) => void handlePhotoChange(event)} disabled={isUploading} />
              </label>
              <p className="text-[12px] leading-4 text-slate-500">PNG, JPG, GIF를 지원하며 공개 이력서 상단 명함사진으로 노출됩니다.</p>
              {profile.photo ? (
                <div className="relative mx-auto flex h-40 w-40 items-center justify-center overflow-hidden rounded-[18px] border border-slate-200 bg-slate-100">
                  <img
                    src={profile.photo}
                    alt={`${profile.name} 명함사진`}
                    className="h-full w-full object-cover"
                    style={getPhotoTransformStyle(profile)}
                  />
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-0 rounded-[18px] border-2 border-white/90 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.2)]" />
                    <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/60" />
                    <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/60" />
                    <div className="absolute left-2 top-2 rounded-full bg-slate-950/75 px-2 py-0.5 text-[10px] font-semibold leading-4 text-white">
                      실제 출력 경계
                    </div>
                  </div>
                </div>
              ) : null}
              {profile.photo ? (
                <div className="space-y-2.5 rounded-[10px] border border-slate-200 bg-white p-2.5">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[12px] leading-4 text-slate-500">
                      <span>좌우 위치</span>
                      <span>{profile.photoPositionX}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={profile.photoPositionX}
                      onChange={(e) => updateField("photoPositionX", Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[12px] leading-4 text-slate-500">
                      <span>상하 위치</span>
                      <span>{profile.photoPositionY}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={profile.photoPositionY}
                      onChange={(e) => updateField("photoPositionY", Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[12px] leading-4 text-slate-500">
                      <span>확대</span>
                      <span>{profile.photoScale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="2"
                      step="0.01"
                      value={profile.photoScale}
                      onChange={(e) => updateField("photoScale", Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              ) : null}
              {profile.photo ? (
                <Button
                  className="w-full border border-slate-200 bg-white px-4 py-2 text-slate-700 sm:w-auto"
                  onClick={() => {
                    updateField("photo", "");
                    updateField("photoPositionX", 50);
                    updateField("photoPositionY", 50);
                    updateField("photoScale", 1.08);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  사진 제거
                </Button>
              ) : null}
            </div>
          </FormField>

          <div className="h-fit self-start rounded-[16px] border border-slate-200 bg-white p-2.5 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="학력" className="h-full min-h-[80px]">
                <textarea
                  className="h-[80px] w-full self-start rounded-[10px] border border-slate-200 px-2.5 py-1.5 text-sm leading-5 outline-none"
                  value={profile.education}
                  onChange={(e) => updateField("education", e.target.value)}
                  placeholder={"학교별로 줄바꿈 입력\n예: 한국산업기술대학교 컴퓨터공학과\n건국대학교 정보통신대학원 정보시스템감리학과(휴학)"}
                />
              </FormField>
              <FormField label="경력" className="h-full min-h-[80px]">
                <textarea
                  className="h-[80px] w-full self-start rounded-[10px] border border-slate-200 px-2.5 py-1.5 text-sm leading-5 outline-none"
                  value={profile.career}
                  onChange={(e) => updateField("career", e.target.value)}
                />
              </FormField>
              <FormField label="전문분야" className="h-full min-h-[80px]">
                <textarea
                  className="h-[80px] w-full self-start rounded-[10px] border border-slate-200 px-2.5 py-1.5 text-sm leading-5 outline-none"
                  value={profile.specialty}
                  onChange={(e) => updateField("specialty", e.target.value)}
                />
              </FormField>
              <FormField label="자격 사항" className="h-full min-h-[80px]">
                <textarea
                  className="h-[80px] w-full self-start rounded-[10px] border border-slate-200 px-2.5 py-1.5 text-sm leading-5 outline-none"
                  value={profile.certifications}
                  onChange={(e) => updateField("certifications", e.target.value)}
                />
              </FormField>
              <FormField label="병역 사항" className="h-full min-h-[80px]">
                <textarea
                  className="h-[80px] w-full self-start rounded-[10px] border border-slate-200 px-2.5 py-1.5 text-sm leading-5 outline-none"
                  value={profile.military}
                  onChange={(e) => updateField("military", e.target.value)}
                  placeholder="예: 육군 / 보병 / 2001.08.04 ~ 2004.07.13 / 병역특례(소집해제)"
                />
              </FormField>
              <FormField label="산업 군" className="h-full min-h-[80px]">
                <textarea
                  className="h-[80px] w-full self-start rounded-[10px] border border-slate-200 px-2.5 py-1.5 text-sm leading-5 outline-none"
                  value={profile.industries}
                  onChange={(e) => updateField("industries", e.target.value)}
                />
              </FormField>
              <FormField label="취미" className="h-full min-h-[80px]">
                <textarea
                  className="h-[80px] w-full self-start rounded-[10px] border border-slate-200 px-2.5 py-1.5 text-sm leading-5 outline-none"
                  value={profile.hobby}
                  onChange={(e) => updateField("hobby", e.target.value)}
                  placeholder="예: 러닝 / 캠핑 / 독서"
                />
              </FormField>
              <FormField label="취미 링크" className="h-full min-h-[80px]">
                <Input
                  value={profile.hobbyUrl}
                  onChange={(e) => updateField("hobbyUrl", e.target.value)}
                  placeholder="https://..."
                />
                <p className="mt-1 text-[12px] leading-4 text-slate-500">공개 보기의 취미 박스를 클릭 가능한 링크로 표시합니다.</p>
              </FormField>
              <FormField label="연락처" className="h-full min-h-[80px]">
                <Input
                  type="email"
                  value={profile.contactEmail}
                  onChange={(e) => updateField("contactEmail", e.target.value)}
                  placeholder="name@example.com"
                />
                <p className="mt-1 text-[12px] leading-4 text-slate-500">공개 보기에서 이메일 링크로 표시됩니다.</p>
              </FormField>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
