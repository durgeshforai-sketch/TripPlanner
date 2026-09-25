"use client";

export interface PreparedImage {
  blob: Blob;
  width: number;
  height: number;
}

/** Well under Vercel's 4.5 MB request cap, with room for the form fields. */
const TARGET_BYTES = 3.5 * 1024 * 1024;

async function decode(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  // createImageBitmap applies EXIF rotation, so phone portraits stay upright.
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall through: Safari decodes some formats (HEIC) only via <img>.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return Object.assign(image, { width: image.naturalWidth, height: image.naturalHeight });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("encode failed"))),
      "image/jpeg",
      quality,
    ),
  );
}

/**
 * Phone photos are often 5–12 MB. Resize to a sensible long edge and re-encode
 * as JPEG in the browser, so uploads are quick on mobile data and fit the
 * server's limits. Throws a readable message if the format cannot be read.
 */
export async function prepareImage(file: File, maxEdge = 2048): Promise<PreparedImage> {
  let source: Awaited<ReturnType<typeof decode>>;
  try {
    source = await decode(file);
  } catch {
    throw new Error(`${file.name} could not be read. Try saving it as a JPG first.`);
  }

  for (const [edge, quality] of [
    [maxEdge, 0.85],
    [Math.round(maxEdge * 0.75), 0.78],
    [Math.round(maxEdge * 0.5), 0.72],
  ] as const) {
    const scale = Math.min(1, edge / Math.max(source.width, source.height));
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not process that photo.");
    context.drawImage(source, 0, 0, width, height);

    const blob = await toBlob(canvas, quality);
    if (blob.size <= TARGET_BYTES) {
      if ("close" in source && typeof source.close === "function") source.close();
      return { blob, width, height };
    }
  }
  throw new Error(`${file.name} is too large even after resizing.`);
}
