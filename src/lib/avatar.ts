import path from "path";

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function avatarExtensionFromMime(mime: string): string | null {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
}

export function avatarPublicPath(userId: string, ext: string): string {
  return `/avatars/${userId}.${ext}`;
}

export function avatarDiskPath(userId: string, ext: string): string {
  return path.join(process.cwd(), "public", "avatars", `${userId}.${ext}`);
}

export function avatarSrc(
  avatarUrl: string | null | undefined,
  updatedAt?: Date | string | number,
): string | null {
  if (!avatarUrl) return null;
  if (!updatedAt) return avatarUrl;
  const version =
    updatedAt instanceof Date ? updatedAt.getTime() : new Date(updatedAt).getTime();
  return `${avatarUrl}?v=${version}`;
}

export function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}
