import { afterEach, describe, expect, it } from "vitest";
import { getAvatarStorageMode } from "@/lib/avatar-storage";

describe("avatar-storage mode", () => {
  const env = process.env;

  afterEach(() => {
    process.env = env;
  });

  it("defaults to local without S3_BUCKET", () => {
    delete process.env.S3_BUCKET;
    delete process.env.AVATAR_STORAGE;
    expect(getAvatarStorageMode()).toBe("local");
  });

  it("uses s3 when S3_BUCKET is set", () => {
    process.env.S3_BUCKET = "friendsbets";
    delete process.env.AVATAR_STORAGE;
    expect(getAvatarStorageMode()).toBe("s3");
  });

  it("AVATAR_STORAGE=local overrides bucket", () => {
    process.env.S3_BUCKET = "friendsbets";
    process.env.AVATAR_STORAGE = "local";
    expect(getAvatarStorageMode()).toBe("local");
  });

  it("uses supabase when bucket and keys are set", () => {
    delete process.env.S3_BUCKET;
    delete process.env.AVATAR_STORAGE;
    process.env.SUPABASE_URL = "https://supabase.example.com";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    process.env.SUPABASE_STORAGE_BUCKET = "avatars";
    expect(getAvatarStorageMode()).toBe("supabase");
  });

  it("AVATAR_STORAGE=supabase is explicit", () => {
    process.env.AVATAR_STORAGE = "supabase";
    expect(getAvatarStorageMode()).toBe("supabase");
  });
});
