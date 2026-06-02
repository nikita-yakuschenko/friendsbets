import { Badge } from "@/components/ui/badge";

const PLATFORM_ROLE_LABELS = {
  ADMIN: "Суперадмин",
  PARTICIPANT: "Участник",
} as const;

export type PlatformRole = keyof typeof PLATFORM_ROLE_LABELS;

/** Бейдж роли на уровне платформы (не организатор турнира). */
export function UserRoleBadge({
  role,
  className,
}: {
  role: PlatformRole;
  className?: string;
}) {
  return (
    <Badge
      variant={role === "ADMIN" ? "default" : "secondary"}
      className={className}
    >
      {PLATFORM_ROLE_LABELS[role]}
    </Badge>
  );
}
