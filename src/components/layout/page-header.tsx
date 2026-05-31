import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
  keepTitleOnDesktop = false,
}: {
  title: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  /** Game home keeps the title in page content on desktop. */
  keepTitleOnDesktop?: boolean;
}) {
  const hideTitleOnDesktop = !keepTitleOnDesktop;
  const showBlockOnDesktop = Boolean(description || action || keepTitleOnDesktop);

  return (
    <div
      className={cn(
        "mb-5 flex items-start justify-between gap-4",
        hideTitleOnDesktop && !showBlockOnDesktop && "md:hidden",
      )}
    >
      <div className="min-w-0">
        <h1
          className={cn(
            "brand-display text-2xl leading-tight text-white md:text-3xl",
            hideTitleOnDesktop && "md:hidden",
          )}
        >
          {title}
        </h1>
        {description && (
          <p
            className={cn(
              "mt-2 text-sm text-brand-muted md:text-base",
              hideTitleOnDesktop && "md:mt-0",
            )}
          >
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
