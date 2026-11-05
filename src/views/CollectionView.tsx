import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CollectionEntry } from "../types";
import { formatDate } from "../lib/dates";
import { FigureSearch } from "../lib/figure-search";
import { collectionStats } from "../lib/stats";
import { lineShort } from "../lib/text";
import { useShelf } from "../state/shelf";
import { useOverlays, useTitle } from "../hooks";
import { EmptyState } from "../components/EmptyState";
import { GeneratedPlate } from "../components/GeneratedPlate";

type ConditionFilter = "all" | "loose" | "carded";
type AccessoryFilter = "all" | "complete" | "missing";
type SortKey = "added-desc" | "added-asc" | "name" | "year" | "line";

export function CollectionView() {
  useTitle("Collection");
  const shelf = useShelf();
  const overlays = useOverlays();
  const [condition, setCondition] = useState<ConditionFilter>("all");
  const [accessories, setAccessories] = useState<AccessoryFilter>("all");
  const [line, setLine] = useState<string | "all">("all");
  const [sort, setSort] = useState<SortKey>("added-desc");

  const stats = useMemo(
    () => collectionStats(shelf.collection, (id) => FigureSearch.get(id), FigureSearch.lines()),
    [shelf.collection],
  );

  const visible = useMemo(() => {
    const filtered = shelf.collection.filter((entry) => {
      const figure = FigureSearch.get(entry.figureId);
      if (condition !== "all" && entry.condition !== condition) return false;
      if (accessories === "complete" && !entry.accessoriesComplete) return false;
      if (accessories === "missing" && entry.accessoriesComplete) return false;
      if (line !== "all" && figure?.line !== line) return false;
      return true;
    });
    return sortEntries(filtered, sort);
  }, [shelf.collection, condition, accessories, line, sort]);

  return (
    <div className="page">
      <div className="page-head">
        <h1 id="page-title" tabIndex={-1}>
          Collection
        </h1>
        <p>Condition, accessories, and where each figure lives. No prices.</p>
      </div>
      {shelf.collection.length === 0 ? (
        <EmptyState
          title="Your shelf is clear"
          body="Add a figure from the catalog. Track it loose or carded, note missing accessories, and record where it sits."
          action={
            <Link className="btn btn-primary" to="/">
              Browse the catalog
            </Link>
          }
        />
      ) : (
        <>
          <div className="tools">
            <div className="stats" aria-label="Collection stats">
              <button type="button" className="stat" aria-pressed={condition === "all" && accessories === "all"} onClick={() => { setCondition("all"); setAccessories("all"); }}>
                <strong>{stats.total}</strong>
                <span>{stats.total === 1 ? "Figure" : "Figures"}</span>
              </button>
              <button type="button" className="stat" aria-pressed={condition === "loose"} onClick={() => setCondition(condition === "loose" ? "all" : "loose")}>
                <strong>{stats.loose}</strong>
                <span>Loose</span>
              </button>
              <button type="button" className="stat" aria-pressed={condition === "carded"} onClick={() => setCondition(condition === "carded" ? "all" : "carded")}>
                <strong>{stats.carded}</strong>
                <span>Carded</span>
              </button>
              <button type="button" className="stat" aria-pressed={accessories === "complete"} onClick={() => setAccessories(accessories === "complete" ? "all" : "complete")}>
                <strong>{stats.accessoriesComplete}</strong>
                <span>Full set</span>
              </button>
              <button type="button" className="stat" aria-pressed={accessories === "missing"} onClick={() => setAccessories(accessories === "missing" ? "all" : "missing")}>
                <strong>{stats.accessoriesMissing}</strong>
                <span>Missing</span>
              </button>
            </div>
            <p className="fine-print">
              {stats.unique} unique · {stats.lines} {stats.lines === 1 ? "line" : "lines"}
              {stats.byLine.length > 0
                ? ` · ${stats.byLine.map((item) => `${lineShort(item.line)} ${item.count}`).join(" · ")}`
                : ""}
            </p>
            <div className="selects">
              <label>
                <span>Line</span>
                <select value={line} onChange={(event) => setLine(event.target.value)}>
                  <option value="all">All lines</option>
                  {FigureSearch.lines().map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Sort</span>
                <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
                  <option value="added-desc">Recently added</option>
                  <option value="added-asc">Oldest added</option>
                  <option value="name">Name</option>
                  <option value="year">Year</option>
                  <option value="line">Line</option>
                </select>
              </label>
              <button type="button" className="btn" onClick={() => void shelf.exportBackup()}>
                Export backup
              </button>
            </div>
          </div>
          {visible.length === 0 ? (
            <EmptyState
              title="Nothing in this view"
              body="No collection entries match these filters."
              action={
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setCondition("all");
                    setAccessories("all");
                    setLine("all");
                  }}
                >
                  Clear filters
                </button>
              }
            />
          ) : (
            <ul className="entry-list">
              {visible.map((entry) => {
                const figure = FigureSearch.get(entry.figureId);
                if (!figure) return null;
                return (
                  <li key={entry.id} className="entry">
                    <button
                      type="button"
                      className="entry-open"
                      onClick={() => overlays.openFigure(figure.id)}
                    >
                      <GeneratedPlate figure={figure} photoUrl={shelf.photos[figure.id]} variant="thumb" />
                      <span>
                        <span className="card-name">{figure.name}</span>
                        <span className="card-meta">
                          {figure.number ? `${figure.number} · ` : ""}
                          {figure.year} · {lineShort(figure.line)}
                        </span>
                        <span className="card-meta">
                          {entry.condition === "loose" ? "Loose" : "Carded"}
                          {" · "}
                          {entry.accessoriesComplete ? "Accessories complete" : "Accessories missing"}
                          {entry.location ? ` · ${entry.location}` : ""}
                        </span>
                        <span className="card-character">Added {formatDate(entry.dateAdded)}</span>
                      </span>
                    </button>
                    <div className="entry-actions">
                      <button type="button" className="btn btn-small" onClick={() => overlays.openEdit(figure.id, entry.id)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-small btn-danger" onClick={() => void shelf.removeEntry(entry.id)}>
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function sortEntries(entries: CollectionEntry[], sort: SortKey): CollectionEntry[] {
  const copy = [...entries];
  copy.sort((a, b) => {
    const fa = FigureSearch.get(a.figureId);
    const fb = FigureSearch.get(b.figureId);
    if (sort === "name") return (fa?.name ?? "").localeCompare(fb?.name ?? "") || a.id.localeCompare(b.id);
    if (sort === "year") return (fa?.year ?? 0) - (fb?.year ?? 0) || (fa?.name ?? "").localeCompare(fb?.name ?? "");
    if (sort === "line") {
      return (fa?.line ?? "").localeCompare(fb?.line ?? "") || (fa?.name ?? "").localeCompare(fb?.name ?? "");
    }
    if (sort === "added-asc") return a.dateAdded.localeCompare(b.dateAdded) || a.id.localeCompare(b.id);
    return b.dateAdded.localeCompare(a.dateAdded) || b.id.localeCompare(a.id);
  });
  return copy;
}
