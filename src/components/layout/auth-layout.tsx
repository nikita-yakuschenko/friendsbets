import { BrandLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

export function AuthLayout({
  children,
  title,
  /** Всегда две строки (блоки), не переносится браузером произвольно */
  titleLines,
  subtitle,
  wide = false,
  /** Фоны main_bg / vertical_bg / iphone_bg — только стартовая страница с входом */
  landingBackground = false,
}: {
  children: React.ReactNode;
  title: string;
  titleLines?: readonly [string, string];
  subtitle?: string;
  wide?: boolean;
  landingBackground?: boolean;
}) {
  return (
    <div
      className="relative min-h-dvh overflow-x-hidden bg-brand-bg text-white"
    >
      {landingBackground ? (
        <>
          <div className="landing-page-bg" aria-hidden="true" />
          <div className="landing-page-bg-scrim" aria-hidden="true" />
        </>
      ) : (
        <div
          className="brand-dot-pattern pointer-events-none absolute inset-0 opacity-20"
          aria-hidden="true"
        />
      )}

      <div className="relative z-10 flex min-h-dvh flex-col">
        <header
          className={cn(
            "px-4 py-5 pt-[max(1.25rem,env(safe-area-inset-top))] md:px-6",
            landingBackground && "hidden lg:block",
          )}
        >
          {landingBackground ? (
            <div className="landing-logo-spot">
              <BrandLogo />
            </div>
          ) : (
            <BrandLogo />
          )}
        </header>

        <main
          className={cn(
            "flex flex-1 justify-center px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] md:px-6",
            landingBackground
              ? "landing-main-top lg:pt-10"
              : "pt-6 md:pt-10",
          )}
        >
          <div className={cn("w-full", wide ? "max-w-2xl" : "max-w-md")}>
            <div className="mb-6 text-center md:mb-8">
              {landingBackground ? (
                <div className="mb-5 flex justify-center lg:hidden">
                  <div className="landing-logo-spot">
                    <BrandLogo size="lg" />
                  </div>
                </div>
              ) : (
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-brand-lime">
                  friendsbets
                </p>
              )}
              <h1
                className={cn(
                  "brand-display leading-tight",
                  titleLines
                    ? "landing-hero-title w-full"
                    : "text-3xl md:text-4xl",
                )}
                aria-label={title}
              >
                {titleLines ? (
                  <>
                    <span className="landing-hero-title__line">
                      {titleLines[0]}
                    </span>
                    <span className="landing-hero-title__line">
                      {titleLines[1]}
                    </span>
                  </>
                ) : (
                  title
                )}
              </h1>
              {subtitle ? (
                <p className="mt-3 text-sm leading-relaxed text-brand-muted md:text-base">
                  {subtitle}
                </p>
              ) : null}
            </div>

            <div
              className={cn(
                "rounded-2xl border p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:p-6",
                landingBackground
                  ? "border-brand-neutral/80 bg-brand-surface/95 backdrop-blur-sm"
                  : "border-brand-neutral bg-brand-surface",
              )}
            >
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
