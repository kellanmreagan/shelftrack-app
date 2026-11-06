import type { CollectionEntry, Figure } from "../types";

export type CollectionStats = {
  total: number;
  unique: number;
  loose: number;
  carded: number;
  accessoriesComplete: number;
  accessoriesMissing: number;
  lines: number;
  byLine: { line: string; count: number }[];
};

export function collectionStats(
  entries: CollectionEntry[],
  lookup: (figureId: string) => Figure | undefined,
  lineOrder: string[],
): CollectionStats {
  const unique = new Set<string>();
  const lineCounts = new Map<string, number>();
  let loose = 0;
  let carded = 0;
  let accessoriesComplete = 0;
  for (const entry of entries) {
    unique.add(entry.figureId);
    if (entry.condition === "loose") loose += 1;
    if (entry.condition === "carded") carded += 1;
    if (entry.accessoriesComplete) accessoriesComplete += 1;
    const line = lookup(entry.figureId)?.line;
    if (line) lineCounts.set(line, (lineCounts.get(line) ?? 0) + 1);
  }
  const byLine = lineOrder
    .filter((line) => lineCounts.has(line))
    .map((line) => ({ line, count: lineCounts.get(line) ?? 0 }));
  for (const [line, count] of lineCounts) {
    if (!lineOrder.includes(line)) byLine.push({ line, count });
  }
  return {
    total: entries.length,
    unique: unique.size,
    loose,
    carded,
    accessoriesComplete,
    accessoriesMissing: entries.length - accessoriesComplete,
    lines: lineCounts.size,
    byLine,
  };
}
