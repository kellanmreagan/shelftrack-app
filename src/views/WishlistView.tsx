import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { WishlistEntry } from "../types";
import { formatDate } from "../lib/dates";
import { FigureSearch } from "../lib/figure-search";
import { lineShort } from "../lib/text";
import { useShelf } from "../state/shelf";
import { useOverlays, useTitle } from "../hooks";
import { EmptyState } from "../components/EmptyState";
import { GeneratedPlate } from "../components/GeneratedPlate";

export function WishlistView() {
  useTitle("Wishlist");
  const shelf = useShelf();
  const overlays = useOverlays();
  const [line, setLine] = useState<string>("all");
  const [sort, setSort] = useState<"added-desc" | "name">("added-desc");

  const visible = useMemo(() => {
    const filtered = shelf.wishlist.filter((entry) => {
      if (line === "all") return true;
      return FigureSearch.get(entry.figureId)?.line === line;
    });
    return sortWishes(filtered, sort);
  }, [shelf.wishlist, line, sort]);

  return (
    <div className="page">
      <div className="page-head">
        <h1 id="page-title" tabIndex={-1}>
          Wishlist
        </h1>
        <p>Figures you want. When one comes home, move it into your collection.</p>
      </div>
      {shelf.wishlist.length === 0 ? (
        <EmptyState
          title="No hunts yet"
          body="Save figures from the catalog, then add them to your collection when you bring them home."
          action={
            <Link className="btn btn-primary" to="/">
              Browse the catalog
            </Link>
          }
        />
      ) : (
        <>
          <div className="tools">
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
                <select value={sort} onChange={(event) => setSort(event.target.value as "added-desc" | "name")}>
                  <option value="added-desc">Recently saved</option>
                  <option value="name">Name</option>
                </select>
              </label>
            </div>
            <p className="result-count" aria-live="polite">
              {visible.length} {visible.length === 1 ? "wish" : "wishes"}
            </p>
          </div>
          {visible.length === 0 ? (
            <EmptyState
              title="Nothing in this line"
              body="No saved figures match this filter."
              action={
                <button type="button" className="btn btn-primary" onClick={() => setLine("all")}>
                  Show all wishes
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
                    <button type="button" className="entry-open" onClick={() => overlays.openFigure(figure.id)}>
                      <GeneratedPlate figure={figure} photoUrl={shelf.photos[figure.id]} variant="thumb" />
                      <span>
                        <span className="card-name">{figure.name}</span>
                        <span className="card-meta">
                          {figure.number ? `${figure.number} · ` : ""}
                          {figure.year} · {lineShort(figure.line)} · {figure.wave}
                        </span>
                        <span className="card-character">Saved {formatDate(entry.dateAdded)}</span>
                      </span>
                    </button>
                    <div className="entry-actions">
                      <button type="button" className="btn btn-small btn-primary" onClick={() => overlays.openAcquire(entry.id)}>
                        Add to collection
                      </button>
                      <button type="button" className="btn btn-small btn-danger" onClick={() => void shelf.removeWishlist(entry.id)}>
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

function sortWishes(entries: WishlistEntry[], sort: "added-desc" | "name"): WishlistEntry[] {
  const copy = [...entries];
  copy.sort((a, b) => {
    if (sort === "name") {
      const an = FigureSearch.get(a.figureId)?.name ?? "";
      const bn = FigureSearch.get(b.figureId)?.name ?? "";
      return an.localeCompare(bn) || a.id.localeCompare(b.id);
    }
    return b.dateAdded.localeCompare(a.dateAdded) || b.id.localeCompare(a.id);
  });
  return copy;
}
