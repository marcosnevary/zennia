const SIZE = 256;

/** Crops a picked image to its centered square and scales it to the size of a profile photo, as JPEG. */
export async function toAvatar(file: File): Promise<Blob> {
  const image = await createImageBitmap(file).catch(() => {
    throw new Error("This file is not an image the browser can read.");
  });
  const side = Math.min(image.width, image.height);
  const canvas = new OffscreenCanvas(SIZE, SIZE);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not process the image.");
  // Safari can't encode WebP, so JPEG, which every browser can; it has no transparency, which would otherwise turn black
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, SIZE, SIZE);
  context.drawImage(
    image,
    (image.width - side) / 2,
    (image.height - side) / 2,
    side,
    side,
    0,
    0,
    SIZE,
    SIZE,
  );
  image.close();
  return canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
}
