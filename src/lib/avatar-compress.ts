import { AVATAR_MAX_BYTES } from "@/lib/avatar";

const AVATAR_HEIGHT = 512;
const AVATAR_TARGET_BYTES = 600 * 1024;
const AVATAR_DECODE_MAX_SIDE = 4096;
const AVATAR_MAX_INPUT_BYTES = 50 * 1024 * 1024;
const OUTPUT_TYPE = "image/webp";

export type PrepareAvatarResult =
  | { ok: true; file: File; previewUrl: string }
  | { ok: false; error: string };

type AvatarSource = HTMLImageElement | ImageBitmap;

function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(file.name);
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("load"));
    };
    img.src = url;
  });
}

function scaledSizeByMaxSide(
  width: number,
  height: number,
  maxSide: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function loadAvatarSource(file: File): Promise<AvatarSource> {
  if (typeof createImageBitmap !== "function") {
    return loadImageElement(file);
  }

  const bitmap = await createImageBitmap(file);
  const maxSide = Math.max(bitmap.width, bitmap.height);

  if (maxSide <= AVATAR_DECODE_MAX_SIDE) {
    return bitmap;
  }

  const { width, height } = scaledSizeByMaxSide(
    bitmap.width,
    bitmap.height,
    AVATAR_DECODE_MAX_SIDE,
  );
  bitmap.close();

  return createImageBitmap(file, {
    resizeWidth: width,
    resizeHeight: height,
    resizeQuality: "high",
  });
}

function releaseSource(source: AvatarSource) {
  if (source instanceof ImageBitmap) {
    source.close();
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("blob"))),
      OUTPUT_TYPE,
      quality,
    );
  });
}

/**
 * Высота → targetHeight px (без увеличения), затем центральный квадрат.
 */
function centerSquareFromHeightScaled(
  width: number,
  height: number,
  targetHeight: number,
): { side: number; sx: number; sy: number; cropSize: number } {
  const scale = Math.min(1, targetHeight / height);
  const scaledW = width * scale;
  const scaledH = height * scale;
  const side = Math.min(scaledW, scaledH);
  const cropSize = side / scale;
  const sx = (width - cropSize) / 2;
  const sy = (height - cropSize) / 2;

  return {
    side: Math.max(1, Math.round(side)),
    sx,
    sy,
    cropSize,
  };
}

async function renderAvatarSquare(
  source: AvatarSource,
  targetHeight: number,
  quality: number,
): Promise<Blob> {
  const { side, sx, sy, cropSize } = centerSquareFromHeightScaled(
    source.width,
    source.height,
    targetHeight,
  );

  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("canvas");
  }

  ctx.drawImage(source, sx, sy, cropSize, cropSize, 0, 0, side, side);
  return canvasToBlob(canvas, quality);
}

async function compressToTarget(source: AvatarSource): Promise<Blob> {
  let targetHeight = AVATAR_HEIGHT;

  for (let pass = 0; pass < 6; pass += 1) {
    for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42]) {
      const blob = await renderAvatarSquare(source, targetHeight, quality);
      if (blob.size <= AVATAR_TARGET_BYTES) {
        return blob;
      }
    }
    targetHeight = Math.max(192, Math.round(targetHeight * 0.85));
  }

  return renderAvatarSquare(source, 192, 0.4);
}

export async function prepareAvatarFile(file: File): Promise<PrepareAvatarResult> {
  if (!isImageFile(file)) {
    return { ok: false, error: "Выберите изображение (JPEG, PNG, WebP и др.)." };
  }

  if (file.size > AVATAR_MAX_INPUT_BYTES) {
    return {
      ok: false,
      error: "Файл слишком большой для обработки в браузере (больше 50 МБ).",
    };
  }

  let source: AvatarSource | null = null;

  try {
    source = await loadAvatarSource(file);
    const blob = await compressToTarget(source);

    if (blob.size > AVATAR_MAX_BYTES) {
      return {
        ok: false,
        error: "Не удалось сжать фото. Попробуйте другой снимок.",
      };
    }

    const compressed = new File([blob], "avatar.webp", { type: OUTPUT_TYPE });
    const previewUrl = URL.createObjectURL(blob);

    return { ok: true, file: compressed, previewUrl };
  } catch {
    return {
      ok: false,
      error: "Не удалось открыть изображение. Попробуйте JPEG или PNG.",
    };
  } finally {
    if (source) releaseSource(source);
  }
}
