import { useEffect, useRef } from "react";
import type { GoogleCredentialResponse, GoogleWindow } from "@/types/google";

type GoogleSignInButtonProps = {
  clientId: string;
  disabled?: boolean;
  onSuccess: (response: GoogleCredentialResponse) => void | Promise<void>;
};

export function GoogleSignInButton({ clientId, disabled, onSuccess }: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (disabled || !buttonRef.current) return;

    const googleWindow = window as GoogleWindow;
    const google = googleWindow.google;
    if (!google) return;

    buttonRef.current.innerHTML = "";
    const isMobileViewport = window.matchMedia("(max-width: 767px)").matches;
    const buttonWidth = Math.min(Math.max(buttonRef.current.clientWidth, 160), 360);

    google.accounts.id.disableAutoSelect();
    google.accounts.id.initialize({
      client_id: clientId,
      callback: onSuccess,
      auto_select: false,
      ux_mode: "popup",
    });

    google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: isMobileViewport ? "small" : "medium",
      text: isMobileViewport ? "signin" : "signin_with",
      shape: isMobileViewport ? "rectangular" : "pill",
      width: buttonWidth,
    });
  }, [clientId, disabled, onSuccess]);

  return <div ref={buttonRef} className={`google-sign-in-button h-7 w-full ${disabled ? "pointer-events-none opacity-60" : ""}`} />;
}
