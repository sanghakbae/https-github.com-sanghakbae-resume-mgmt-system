export type GoogleCredentialResponse = {
  credential: string;
  select_by: string;
};

export type GoogleRenderButtonConfig = {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: string | number;
};

export type GoogleWindow = Window & {
  google?: {
    accounts: {
      id: {
        initialize: (config: {
          client_id: string;
          callback: (response: GoogleCredentialResponse) => void | Promise<void>;
          auto_select?: boolean;
          ux_mode?: "popup" | "redirect";
        }) => void;
        renderButton: (element: HTMLElement, options: GoogleRenderButtonConfig) => void;
        prompt: () => void;
        disableAutoSelect: () => void;
      };
    };
  };
};
