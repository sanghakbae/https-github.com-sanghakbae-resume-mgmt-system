import { AlertCircle, LockKeyhole } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import type { GoogleCredentialResponse } from "@/types/google";

type LoginPageProps = {
  clientId?: string;
  isReady: boolean;
  error: string | null;
  onLogin: (response: GoogleCredentialResponse) => void;
};

export function LoginPage({ clientId, isReady, error, onLogin }: LoginPageProps) {
  const configError = clientId ? null : "`.env`에 `VITE_GOOGLE_CLIENT_ID`를 설정해야 Google 로그인을 사용할 수 있습니다.";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#dfe2ea]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.8)_0%,rgba(223,226,234,0.92)_36%,rgba(217,220,229,1)_100%)]" />
      <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/35 blur-[120px]" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <section className="w-full max-w-[360px] rounded-[28px] border border-white/60 bg-white/18 p-3 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-[28px]">
          <div className="rounded-[22px] border border-white/40 bg-white/22 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] sm:p-5">
            <div className="h-2.5 w-full rounded-full bg-white/65 shadow-[inset_0_1px_2px_rgba(15,23,42,0.05)]" />

            <div className="mt-4 flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#11142b] text-white shadow-[0_10px_30px_rgba(17,20,43,0.28)]">
              <LockKeyhole className="h-5 w-5" />
            </div>

            <div className="mt-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Career Workspace</p>
              <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-slate-950">커리어 관리 시스템</h1>
              <p className="mt-2 text-[13px] leading-5 text-slate-600">Google 계정으로 로그인해 이력서, 경력 정보, 수행 업무를 안전하게 관리하세요.</p>
            </div>

            <div className="mt-4 rounded-[18px] border border-white/55 bg-white/55 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium text-slate-500">접근 방식</p>
                  <p className="mt-1 text-[13px] font-semibold text-slate-900">Google OAuth</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-medium text-slate-500">저장 방식</p>
                  <p className="mt-1 text-[13px] font-semibold text-slate-900">개인 작업공간</p>
                </div>
              </div>
            </div>

            {(error || configError) && (
              <div className="mt-4 flex gap-3 rounded-[18px] border border-rose-200/80 bg-rose-50/80 px-3 py-3 text-[13px] leading-5 text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error ?? configError}</p>
              </div>
            )}

            <div className="mt-4 min-h-[44px]">
              {clientId ? <GoogleSignInButton clientId={clientId} disabled={!isReady} onSuccess={onLogin} /> : null}
              {!isReady && clientId ? <p className="text-[12px] text-slate-500">로그인 버튼을 불러오는 중입니다.</p> : null}
            </div>

            <p className="mt-4 text-center text-[11px] leading-4 text-slate-500">로그인 후 개인 이력서 데이터와 편집 권한이 계정 기준으로 연결됩니다.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
