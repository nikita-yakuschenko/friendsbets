import { avatarSrc, userInitials } from "@/lib/avatar";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-12 text-sm",
  lg: "size-20 text-lg",
  xl: "size-28 text-xl",
} as const;

export function UserAvatar({
  name,
  avatarUrl,
  updatedAt,
  size = "md",
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  updatedAt?: Date | string | number;
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  const src = avatarSrc(avatarUrl, updatedAt);

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={cn(
          "shrink-0 rounded-full object-cover ring-1 ring-brand-neutral",
          sizeClasses[size],
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-brand-neutral font-semibold text-white ring-1 ring-brand-neutral",
        sizeClasses[size],
        className,
      )}
      aria-hidden
    >
      {userInitials(name)}
    </span>
  );
}
