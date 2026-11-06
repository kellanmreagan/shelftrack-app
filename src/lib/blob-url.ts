export async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const size = 0x8000;
  for (let i = 0; i < bytes.length; i += size) {
    const slice = bytes.subarray(i, i + size);
    binary += String.fromCharCode(...slice);
  }
  const mime = blob.type || "application/octet-stream";
  return `data:${mime};base64,${btoa(binary)}`;
}

export function dataUrlToBlob(dataUrl: string, mimeHint?: string): Blob {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
  if (!match) throw new Error("Photo data was not a base64 image.");
  const mime = match[1];
  if (mimeHint && mimeHint !== mime) {
    throw new Error("Photo mime type does not match its data.");
  }
  const binary = atob(match[2].replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
