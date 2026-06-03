"use client";

import { Toaster } from "sonner";

const navClearance =
  "calc(6rem + env(safe-area-inset-bottom, 0px))";

export function AppToaster() {
  return (
    <Toaster
      theme="dark"
      richColors
      closeButton={false}
      duration={2800}
      position="bottom-center"
      className="app-toaster"
      offset={{ bottom: navClearance }}
      mobileOffset={{ bottom: navClearance }}
      toastOptions={{
        classNames: {
          toast: "fb-toast",
          success: "fb-toast fb-toast--success",
          error: "fb-toast fb-toast--error",
          info: "fb-toast fb-toast--info",
        },
      }}
    />
  );
}
