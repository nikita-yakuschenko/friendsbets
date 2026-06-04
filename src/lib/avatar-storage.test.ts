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
});
