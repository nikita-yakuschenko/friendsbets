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

export type AvatarStorageMode = "local" | "s3" | "supabase";

function avatarObjectPath(userId: string, ext: string): string {
  return `avatars/${userId}.${ext}`;
}

export function getAvatarStorageMode(): AvatarStorageMode {
  const mode = process.env.AVATAR_STORAGE?.trim();
  if (mode === "s3") return "s3";
  if (mode === "supabase") return "supabase";
  if (mode === "local") return "local";
  if (process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    if (process.env.SUPABASE_STORAGE_BUCKET?.trim()) return "supabase";
  }
  return process.env.S3_BUCKET?.trim() ? "s3" : "local";
}

function s3ObjectKey(userId: string, ext: string): string {
  return avatarObjectPath(userId, ext);
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

function supabaseConfig() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim();
  if (!url || !key || !bucket) {
    throw new Error(
      "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_STORAGE_BUCKET are required",
    );
  }
  const publicBase = (
    process.env.SUPABASE_PUBLIC_URL?.trim() || url
  ).replace(/\/$/, "");
  return { url, key, bucket, publicBase };
}

function supabasePublicUrl(userId: string, ext: string): string {
  const { publicBase, bucket } = supabaseConfig();
  return `${publicBase}/storage/v1/object/public/${bucket}/${avatarObjectPath(userId, ext)}`;
}

async function uploadAvatarSupabase(
  userId: string,
  buffer: Buffer,
  mime: string,
  ext: string,
): Promise<string> {
  const { url, key, bucket } = supabaseConfig();
  const objectPath = avatarObjectPath(userId, ext);

  await removeAvatarStored(userId);

  const res = await fetch(
    `${url}/storage/v1/object/${bucket}/${objectPath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": mime,
        "x-upsert": "true",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      body: new Uint8Array(buffer),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Supabase Storage upload failed (${res.status}): ${detail || res.statusText}`,
    );
  }

  return supabasePublicUrl(userId, ext);
}

async function removeAvatarSupabase(userId: string): Promise<void> {
  const { url, key, bucket } = supabaseConfig();

  await Promise.all(
    AVATAR_EXTENSIONS.map(async (ext) => {
      const objectPath = avatarObjectPath(userId, ext);
      await fetch(`${url}/storage/v1/object/${bucket}/${objectPath}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${key}` },
      }).catch(() => undefined);
    }),
  );
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

  if (mode === "supabase") {
    return uploadAvatarSupabase(userId, buffer, file.type, ext);
  }
  if (mode === "s3") {
    return uploadAvatarS3(userId, buffer, file.type, ext);
  }
  return uploadAvatarLocal(userId, buffer, file.type, ext);
}

export async function removeAvatarStored(userId: string): Promise<void> {
  const mode = getAvatarStorageMode();
  if (mode === "supabase") {
    await removeAvatarSupabase(userId);
  } else if (mode === "s3") {
    await removeAvatarS3(userId);
  } else {
    await removeAvatarLocal(userId);
  }
}
