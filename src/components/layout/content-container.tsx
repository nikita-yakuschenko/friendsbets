import { cn } from "@/lib/utils";

/** Узкая колонка на мобилке; с md — как таблицы админки (до max-w-6xl контейнера). */
export const CONTENT_NARROW_MOBILE = "max-w-md md:max-w-6xl";
export const CONTENT_NARROW_MOBILE_LG = "max-w-lg md:max-w-6xl";

export function ContentContainer({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 py-4 md:px-6 md:py-6", className)}>
      {children}
    </div>
  );
}
