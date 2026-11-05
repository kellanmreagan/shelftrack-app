export function lineShort(line: string): string {
  if (line.startsWith("Kenner")) return "Kenner";
  if (line.startsWith("Retro")) return "Retro";
  if (line.startsWith("The Vintage")) return "Vintage";
  return line;
}

export function lineSlug(line: string): string {
  return lineShort(line)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function compactSearch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}
