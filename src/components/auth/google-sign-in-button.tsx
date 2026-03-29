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
    const buttonWidth = Math.min(Math.max(buttonRef.current.clientWidth, 220), 360);

    google.accounts.id.initialize({
      client_id: clientId,
      callback: onSuccess,
      ux_mode: "popup",
    });

    google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "pill",
      width: buttonWidth,
    });
  }, [clientId, disabled, onSuccess]);

  return <div ref={buttonRef} className={`w-full ${disabled ? "pointer-events-none opacity-60" : ""}`} />;
}
