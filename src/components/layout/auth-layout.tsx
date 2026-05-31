import { BrandLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

export function AuthLayout({
  children,
  title,
  subtitle,
  wide = false,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  wide?: boolean;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-brand-bg text-white">
      <div
        className="pointer-events-none absolute -right-16 top-0 h-64 w-64 opacity-40"
        aria-hidden="true"
      >
        <div className="absolute inset-0 rotate-45 bg-gradient-to-br from-brand-blue/30 via-brand-cyan/20 to-transparent" />
        <div className="absolute right-8 top-8 h-24 w-2 rotate-45 bg-brand-lime/60" />
        <div className="absolute right-16 top-16 h-16 w-2 rotate-45 bg-brand-red/50" />
      </div>

      <div
        className="brand-dot-pattern pointer-events-none absolute inset-0 opacity-20"
        aria-hidden="true"
      />

      <div className="relative flex min-h-screen flex-col">
        <header className="px-4 py-5 md:px-6">
          <BrandLogo />
        </header>

        <main className="flex flex-1 justify-center px-4 pb-10 pt-6 md:px-6 md:pt-10">
          <div className={cn("w-full", wide ? "max-w-2xl" : "max-w-md")}>
            <div className="mb-6 text-center md:mb-8">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-brand-lime">
                friendsbets
              </p>
              <h1 className="brand-display text-3xl leading-tight md:text-4xl">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-3 text-sm leading-relaxed text-brand-muted md:text-base">
                  {subtitle}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-brand-neutral bg-brand-surface p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:p-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
