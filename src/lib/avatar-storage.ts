import { unlink, mkdir, writeFile } from "fs/promises";
import path from "path";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  avatarDiskPath,
  avatarExtensionFromMime,
  avatarPublicPath,
  AVATAR_ALLOWED_TYPES,
  AVATAR_MAX_BYTES,
} from "@/lib/avatar";

const AVATAR_EXTENSIONS = ["jpg", "png", "webp"] as const;

export type AvatarStorageMode = "local" | "s3";

export function getAvatarStorageMode(): AvatarStorageMode {
  if (process.env.AVATAR_STORAGE === "s3") return "s3";
  if (process.env.AVATAR_STORAGE === "local") return "local";
  return process.env.S3_BUCKET?.trim() ? "s3" : "local";
}

function s3ObjectKey(userId: string, ext: string): string {
  return `avatars/${userId}.${ext}`;
}

function s3PublicUrl(userId: string, ext: string): string {
  const base = (process.env.S3_PUBLIC_URL ?? "").replace(/\/$/, "");
  if (!base) {
    throw new Error("S3_PUBLIC_URL is required when using S3 avatar storage");
  }
  return `${base}/${s3ObjectKey(userId, ext)}`;
}

let s3Client: S3Client | undefined;

function getS3Client(): S3Client {
  if (s3Client) return s3Client;

  const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
  const region = process.env.S3_REGION?.trim() || "auto";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();

  if (!process.env.S3_BUCKET?.trim()) {
    throw new Error("S3_BUCKET is not set");
  }
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required");
  }

  s3Client = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  });

  return s3Client;
}

async function uploadAvatarLocal(
  userId: string,
  buffer: Buffer,
  mime: string,
  ext: string,
): Promise<string> {
  const dir = path.join(process.cwd(), "public", "avatars");
  await mkdir(dir, { recursive: true });
  await removeAvatarStored(userId);
  await writeFile(avatarDiskPath(userId, ext), buffer);
  return avatarPublicPath(userId, ext);
}

async function uploadAvatarS3(
  userId: string,
  buffer: Buffer,
  mime: string,
  ext: string,
): Promise<string> {
  const bucket = process.env.S3_BUCKET!.trim();
  const key = s3ObjectKey(userId, ext);

  await removeAvatarStored(userId);

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mime,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return s3PublicUrl(userId, ext);
}

async function removeAvatarLocal(userId: string): Promise<void> {
  await Promise.all(
    AVATAR_EXTENSIONS.map(async (ext) => {
      try {
        await unlink(avatarDiskPath(userId, ext));
      } catch {
        // file may not exist
      }
    }),
  );
}

async function removeAvatarS3(userId: string): Promise<void> {
  const bucket = process.env.S3_BUCKET!.trim();
  const client = getS3Client();

  await Promise.all(
    AVATAR_EXTENSIONS.map((ext) =>
      client
        .send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: s3ObjectKey(userId, ext),
          }),
        )
        .catch(() => undefined),
    ),
  );
}

/** Загрузка аватара; в БД сохраняется `/avatars/...` (local) или полный URL (S3). */
export async function storeAvatar(userId: string, file: File): Promise<string> {
  if (!AVATAR_ALLOWED_TYPES.has(file.type)) {
    throw new Error("Допустимы JPEG, PNG или WebP.");
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error("Файл не больше 5 МБ.");
  }

  const ext = avatarExtensionFromMime(file.type);
  if (!ext) {
    throw new Error("Неподдерживаемый формат.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mode = getAvatarStorageMode();

  if (mode === "s3") {
    return uploadAvatarS3(userId, buffer, file.type, ext);
  }
  return uploadAvatarLocal(userId, buffer, file.type, ext);
}

export async function removeAvatarStored(userId: string): Promise<void> {
  if (getAvatarStorageMode() === "s3") {
    await removeAvatarS3(userId);
  } else {
    await removeAvatarLocal(userId);
  }
}
