/**
 * Centre-crops an image to a square and scales it down, so uploads are small
 * (~20–40 KB) regardless of what the camera produced. Honours EXIF rotation.
 */
export async function toSquareJpeg(file: File, size = 256, quality = 0.88): Promise<Blob> {
  const source = await load(file);
  const side = Math.min(source.width, source.height);
  const sx = (source.width - side) / 2;
  const sy = (source.height - side) / 2;
  const target = Math.min(size, side);

  const canvas = document.createElement("canvas");
  canvas.width = target;
  canvas.height = target;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't process this image.");
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#ffffff"; // flatten transparent PNGs
  ctx.fillRect(0, 0, target, target);
  ctx.drawImage(source.image, sx, sy, side, side, 0, 0, target, target);
  if ("close" in source.image) source.image.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't prepare the image."))), "image/jpeg", quality),
  );
}

type Loaded = { image: ImageBitmap | HTMLImageElement; width: number; height: number };

async function load(file: File): Promise<Loaded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { image: bmp, width: bmp.width, height: bmp.height };
    } catch {
      /* fall back below (e.g. older Safari) */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That file isn't an image we can read."));
      el.src = url;
    });
    return { image: img, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}
