"use client";

import { Toaster } from "sonner";

const topOffset = "calc(4.25rem + env(safe-area-inset-top, 0px))";

export function AppToaster() {
  return (
    <Toaster
      theme="dark"
      richColors
      closeButton={false}
      duration={2800}
      position="top-center"
      className="app-toaster"
      offset={{ top: topOffset }}
      mobileOffset={{ top: topOffset }}
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
