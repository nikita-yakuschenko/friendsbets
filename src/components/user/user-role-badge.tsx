import { Badge } from "@/components/ui/badge";
import { getRoleLabel, isAdmin } from "@/lib/roles";
import type { UserRole } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

export function UserRoleBadge({
  role,
  className,
}: {
  role: UserRole;
  className?: string;
}) {
  return (
    <Badge
      variant={isAdmin(role) ? "default" : "secondary"}
      className={cn("font-normal", className)}
    >
      {getRoleLabel(role)}
    </Badge>
  );
}
