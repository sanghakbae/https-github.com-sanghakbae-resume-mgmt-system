import { useEffect, useRef } from "react";
import type { GoogleCredentialResponse, GoogleWindow } from "@/types/google";

type GoogleSignInButtonProps = {
  clientId: string;
  disabled?: boolean;
  compact?: boolean;
  onSuccess: (response: GoogleCredentialResponse) => void | Promise<void>;
};

export function GoogleSignInButton({ clientId, disabled, compact = false, onSuccess }: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const googleRef = useRef<GoogleWindow["google"] | null>(null);

  useEffect(() => {
    if (disabled || (compact ? false : !buttonRef.current)) return;

    const googleWindow = window as GoogleWindow;
    const google = googleWindow.google;
    if (!google) return;
    googleRef.current = google;

    if (buttonRef.current) {
      buttonRef.current.innerHTML = "";
    }
    const isMobileViewport = window.matchMedia("(max-width: 767px)").matches;
    const buttonWidth = buttonRef.current ? Math.min(Math.max(buttonRef.current.clientWidth, 160), 360) : 160;

    google.accounts.id.disableAutoSelect();
    google.accounts.id.initialize({
      client_id: clientId,
      callback: onSuccess,
      auto_select: false,
      ux_mode: "popup",
    });

    if (compact) return;

    google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: isMobileViewport ? "small" : "medium",
      text: isMobileViewport ? "signin" : "signin_with",
      shape: isMobileViewport ? "rectangular" : "pill",
      width: buttonWidth,
    });
  }, [clientId, compact, disabled, onSuccess]);

  if (compact) {
    return (
      <button
        type="button"
        className={`google-sign-in-button flex h-7 w-full items-center justify-center gap-1 rounded-[6px] border border-slate-200 bg-white px-2 text-[12px] font-medium leading-4 text-slate-600 ${disabled ? "pointer-events-none opacity-60" : ""}`}
        onClick={() => googleRef.current?.accounts.id.prompt()}
      >
        <span className="font-semibold text-blue-600">G</span>
        로그인
      </button>
    );
  }

  return <div ref={buttonRef} className={`google-sign-in-button h-7 w-full ${disabled ? "pointer-events-none opacity-60" : ""}`} />;
}
