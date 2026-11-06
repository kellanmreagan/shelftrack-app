const MAX_EDGE = 1280;
const MAX_INPUT_BYTES = 12 * 1024 * 1024;

export async function compressImageFile(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("That photo is over 12 MB. Try a smaller one.");
  }
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not read that image.");
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.86);
    });
    if (!blob) throw new Error("Could not save that image.");
    return blob;
  } finally {
    bitmap.close();
  }
}
