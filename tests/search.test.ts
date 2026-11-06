import { describe, expect, it } from "vitest";
import { FigureSearch } from "../src/lib/figure-search";
import { collectionStats } from "../src/lib/stats";
import type { CollectionEntry } from "../src/types";

describe("FigureSearch", () => {
  it("loads the 3.75-inch seed without real product photos", () => {
    const meta = FigureSearch.meta();
    expect(meta.scale).toBe('3.75"');
    expect(meta.imagePolicy.permittedRealProductImages).toBe(0);
    expect(meta.imagePolicy.generatedFallbacks).toBe(343);
    expect(FigureSearch.total()).toBe(343);
    expect(FigureSearch.lines()).toEqual([
      "Kenner (1978–1985)",
      "Retro Collection",
      "The Vintage Collection",
    ]);
    expect(FigureSearch.countLine("Kenner (1978–1985)")).toBe(95);
    expect(FigureSearch.countLine("Retro Collection")).toBe(90);
    expect(FigureSearch.countLine("The Vintage Collection")).toBe(158);
    expect(FigureSearch.licenses()).toEqual([
      "Original work © ShelfTrack (app-generated). Not a product photo.",
    ]);
    for (const figure of FigureSearch.all()) {
      expect(figure.scale).toBe('3.75"');
      expect(figure.image.kind).toBe("generated-fallback");
      expect(figure.image.url).toBeNull();
      expect(figure.image.initials).toHaveLength(2);
    }
  });

  it("searches name, character, number, wave, year, and line", () => {
    expect(FigureSearch.search("").length).toBe(343);
    expect(FigureSearch.search("luke").length).toBe(18);
    expect(FigureSearch.search("VC304").map((figure) => figure.name)).toEqual([
      "Chopper (C1-10P)",
    ]);
    expect(FigureSearch.search("vc 304")[0]?.id).toBe("the-vintage-collection-VC304-2024");
    expect(FigureSearch.search("chopper").length).toBe(2);
    expect(FigureSearch.search("c3po").length).toBe(4);
    expect(FigureSearch.search("c-3po").length).toBe(4);
    expect(FigureSearch.search("r2d2").length).toBeGreaterThan(0);
    expect(FigureSearch.search("12-back").length).toBe(12);
    expect(FigureSearch.search("1978").length).toBe(20);
    expect(FigureSearch.search("2019").length).toBe(104);
    expect(FigureSearch.search("Kenner (1978–1985)").length).toBe(95);
    expect(FigureSearch.search("the vintage collection").length).toBe(158);
    expect(FigureSearch.search("EV-9D9")[0]?.wave).toBe("92-back");
    expect(FigureSearch.search("sandtrooper").map((figure) => figure.id)).toEqual(
      expect.arrayContaining([
        "the-vintage-collection-VC014-2011",
        "the-vintage-collection-VC409-2026",
      ]),
    );
  });

  it("filters by line, year, and wave without inventing lines", () => {
    const kenner1978 = FigureSearch.search("", {
      line: "Kenner (1978–1985)",
      year: 1978,
    });
    expect(kenner1978).toHaveLength(20);
    expect(new Set(kenner1978.map((figure) => figure.line))).toEqual(
      new Set(["Kenner (1978–1985)"]),
    );
    expect(
      FigureSearch.search("", { line: "Kenner (1978–1985)", wave: "12-back" }),
    ).toHaveLength(12);
    expect(FigureSearch.search("", { year: 2027 })).toHaveLength(4);
    expect(FigureSearch.search("boba", { line: "Retro Collection" }).length).toBeGreaterThan(0);
    expect(FigureSearch.search("black series")).toHaveLength(0);
    expect(FigureSearch.search("marvel")).toHaveLength(0);
    expect(FigureSearch.search("wikimedia")).toHaveLength(0);
    expect(FigureSearch.search("zzz-not-a-figure")).toHaveLength(0);
  });

  it("sorts Kenner before Retro before Vintage Collection", () => {
    const all = FigureSearch.all();
    expect(all[0]?.line.startsWith("Kenner")).toBe(true);
    expect(all.at(-1)?.line).toBe("The Vintage Collection");
    const retroAt = all.findIndex((figure) => figure.line === "Retro Collection");
    const vintageAt = all.findIndex((figure) => figure.line === "The Vintage Collection");
    expect(retroAt).toBeGreaterThan(90);
    expect(vintageAt).toBeGreaterThan(retroAt);
  });
});

describe("collectionStats", () => {
  it("counts condition and completeness, not value", () => {
    const entries: CollectionEntry[] = [
      entry("1", "kenner-1978-1985-luke-skywalker-1978", "loose", true),
      entry("2", "kenner-1978-1985-luke-skywalker-1978", "carded", false),
      entry("3", "the-vintage-collection-VC304-2024", "loose", true),
    ];
    const stats = collectionStats(entries, (id) => FigureSearch.get(id), FigureSearch.lines());
    expect(stats.total).toBe(3);
    expect(stats.unique).toBe(2);
    expect(stats.loose).toBe(2);
    expect(stats.carded).toBe(1);
    expect(stats.accessoriesComplete).toBe(2);
    expect(stats.accessoriesMissing).toBe(1);
    expect(stats.lines).toBe(2);
    expect(stats.byLine.map((line) => line.line)).toEqual([
      "Kenner (1978–1985)",
      "The Vintage Collection",
    ]);
    expect(JSON.stringify(stats)).not.toMatch(/price|value|dollar/i);
  });
});

function entry(
  id: string,
  figureId: string,
  condition: "loose" | "carded",
  accessoriesComplete: boolean,
): CollectionEntry {
  return {
    id,
    figureId,
    condition,
    accessoriesComplete,
    location: "",
    notes: "",
    dateAdded: "2026-01-02",
  };
}
