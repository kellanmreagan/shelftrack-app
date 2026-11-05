import seed from "../../data/figures-seed.json";
import type { CatalogMeta, Figure, SearchFilters } from "../types";

export function groupByLine(figures: Figure[]): { line: string; figures: Figure[] }[] {
  const groups: { line: string; figures: Figure[] }[] = [];
  for (const figure of figures) {
    const last = groups[groups.length - 1];
    if (last && last.line === figure.line) last.figures.push(figure);
    else groups.push({ line: figure.line, figures: [figure] });
  }
  return groups;
}
import { compactSearch, lineShort, naturalCompare, normalizeSearch } from "./text";

type SeedFile = CatalogMeta & { figures: Figure[] };

const data = seed as SeedFile;

function assertSeed(file: SeedFile): void {
  if (file.scale !== '3.75"') {
    throw new Error(`Unexpected catalog scale: ${file.scale}`);
  }
  if (file.imagePolicy.permittedRealProductImages !== 0) {
    throw new Error("Seed permits real product images; refusing to load.");
  }
  if (file.figures.length !== file.imagePolicy.generatedFallbacks) {
    throw new Error("Generated fallback count does not match figure count.");
  }
  for (const figure of file.figures) {
    if (figure.scale !== '3.75"') {
      throw new Error(`Figure ${figure.id} is not 3.75-inch.`);
    }
    if (figure.image.kind !== "generated-fallback" || figure.image.url !== null) {
      throw new Error(`Figure ${figure.id} is not a generated fallback.`);
    }
    if (!file.lines.includes(figure.line)) {
      throw new Error(`Figure ${figure.id} has an unknown line.`);
    }
  }
  const ids = new Set(file.figures.map((figure) => figure.id));
  if (ids.size !== file.figures.length) {
    throw new Error("Duplicate figure ids in seed.");
  }
}

assertSeed(data);

type IndexedFigure = {
  figure: Figure;
  blob: string;
  compact: string;
};

const lineOrder = new Map(data.lines.map((line, index) => [line, index]));

function waveRank(wave: string): string {
  return wave;
}

const indexed: IndexedFigure[] = data.figures.map((figure) => {
  const number = figure.number ?? "";
  // Year stays out of the text blob. The Kenner line name contains "1978–1985",
  // which would otherwise make every Kenner figure match a search for 1978.
  const blob = normalizeSearch(
    [figure.name, figure.character, figure.line, lineShort(figure.line), figure.wave, number].join(
      " ",
    ),
  );
  const compact = compactSearch(
    [figure.name, figure.character, number, figure.wave, lineShort(figure.line)].join(" "),
  );
  return { figure, blob, compact };
});

indexed.sort((a, b) => compareFigures(a.figure, b.figure));

function compareFigures(a: Figure, b: Figure): number {
  const lineDelta = (lineOrder.get(a.line) ?? 99) - (lineOrder.get(b.line) ?? 99);
  if (lineDelta !== 0) return lineDelta;
  if (a.year !== b.year) return a.year - b.year;
  const waveDelta = naturalCompare(waveRank(a.wave), waveRank(b.wave));
  if (waveDelta !== 0) return waveDelta;
  if (a.number && b.number) {
    const numberDelta = naturalCompare(a.number, b.number);
    if (numberDelta !== 0) return numberDelta;
  } else if (a.number || b.number) {
    return a.number ? -1 : 1;
  }
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

const byId = new Map(indexed.map((item) => [item.figure.id, item.figure]));
const lineByQuery = new Map(data.lines.map((line) => [normalizeSearch(line), line]));

function matchesQuery(item: IndexedFigure, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;
  const tokens = normalizeSearch(trimmed).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const tokenMatch = tokens.every((token) => tokenMatches(item, token));
  if (tokenMatch) return true;
  const compactQuery = compactSearch(trimmed);
  return compactQuery.length >= 3 && item.compact.includes(compactQuery);
}

function tokenMatches(item: IndexedFigure, token: string): boolean {
  if (/^(19|20)\d{2}$/.test(token)) {
    return String(item.figure.year) === token;
  }
  if (item.blob.includes(token)) return true;
  const compactToken = compactSearch(token);
  return compactToken.length >= 2 && item.compact.includes(compactToken);
}

export class FigureSearch {
  static meta(): CatalogMeta {
    return {
      scale: data.scale,
      lines: [...data.lines],
      sources: data.sources.map((source) => ({ ...source })),
      imagePolicy: { ...data.imagePolicy },
    };
  }

  static all(): Figure[] {
    return indexed.map((item) => item.figure);
  }

  static get(id: string): Figure | undefined {
    return byId.get(id);
  }

  static lines(): string[] {
    return [...data.lines];
  }

  static countLine(line: string): number {
    return indexed.reduce((count, item) => count + (item.figure.line === line ? 1 : 0), 0);
  }

  static total(): number {
    return indexed.length;
  }

  static years(line?: string | null): number[] {
    const years = new Set<number>();
    for (const item of indexed) {
      if (!line || item.figure.line === line) years.add(item.figure.year);
    }
    return [...years].sort((a, b) => a - b);
  }

  static waves(line?: string | null): string[] {
    const waves = new Set<string>();
    for (const item of indexed) {
      if (!line || item.figure.line === line) waves.add(item.figure.wave);
    }
    return [...waves].sort(naturalCompare);
  }

  static licenses(): string[] {
    return [...new Set(indexed.map((item) => item.figure.image.license))];
  }

  static search(query: string, filters: SearchFilters = {}): Figure[] {
    let line = filters.line || null;
    let text = query;
    const namedLine = lineByQuery.get(normalizeSearch(query));
    if (!line && namedLine) {
      line = namedLine;
      text = "";
    }
    const year = filters.year ?? null;
    const wave = filters.wave || null;
    const results: Figure[] = [];
    for (const item of indexed) {
      if (line && item.figure.line !== line) continue;
      if (year !== null && item.figure.year !== year) continue;
      if (wave && item.figure.wave !== wave) continue;
      if (!matchesQuery(item, text)) continue;
      results.push(item.figure);
    }
    return results;
  }
}
