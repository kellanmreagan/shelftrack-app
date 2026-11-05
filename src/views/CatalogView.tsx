import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FigureSearch, groupByLine } from "../lib/figure-search";
import { lineShort, lineSlug } from "../lib/text";
import { useShelf } from "../state/shelf";
import { useOverlays, useTitle } from "../hooks";
import { EmptyState } from "../components/EmptyState";
import { GeneratedPlate } from "../components/GeneratedPlate";
import type { Figure } from "../types";

export function CatalogView() {
  useTitle("Catalog");
  const shelf = useShelf();
  const overlays = useOverlays();
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [line, setLine] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [wave, setWave] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const meta = FigureSearch.meta();

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(text), 120);
    return () => window.clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }
      if (document.querySelector("[role='dialog']")) return;
      event.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const years = useMemo(() => FigureSearch.years(line), [line]);
  const waves = useMemo(() => FigureSearch.waves(line), [line]);

  useEffect(() => {
    if (year !== null && !years.includes(year)) setYear(null);
  }, [year, years]);

  useEffect(() => {
    if (wave && !waves.includes(wave)) setWave(null);
  }, [wave, waves]);

  const results = useMemo(
    () => FigureSearch.search(query, { line, year, wave }),
    [query, line, year, wave],
  );
  const groups = useMemo(() => groupByLine(results), [results]);
  const filtered = Boolean(text || line || year || wave);

  return (
    <div className="page">
      <div className="page-head">
        <h1 id="page-title" tabIndex={-1}>
          Catalog
        </h1>
        <p>
          {meta.imagePolicy.generatedFallbacks} figures at {meta.scale}. Kenner, Vintage Collection, and Retro.
          Generated plates, not product photos.
        </p>
      </div>
      <div className="tools">
        <form
          role="search"
          className="search"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(text);
          }}
        >
          <label className="sr-only" htmlFor="catalog-search">
            Search figures by name, character, wave, year, number, or line
          </label>
          <input
            id="catalog-search"
            ref={inputRef}
            type="search"
            placeholder="Search name, VC number, wave, year"
            value={text}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            onChange={(event) => setText(event.target.value)}
          />
          {text ? (
            <button
              type="button"
              className="btn btn-small"
              onClick={() => {
                setText("");
                setQuery("");
                inputRef.current?.focus();
              }}
            >
              Clear
            </button>
          ) : null}
        </form>
        <div className="chips" role="toolbar" aria-label="Line">
          <button type="button" className="chip" aria-pressed={line === null} onClick={() => setLine(null)}>
            All {FigureSearch.total()}
          </button>
          {FigureSearch.lines().map((item) => (
            <button
              key={item}
              type="button"
              className="chip"
              aria-pressed={line === item}
              onClick={() => setLine(line === item ? null : item)}
            >
              {lineShort(item)} {FigureSearch.countLine(item)}
            </button>
          ))}
        </div>
        <div className="selects">
          <label>
            <span>Year</span>
            <select
              value={year ?? ""}
              onChange={(event) => setYear(event.target.value ? Number(event.target.value) : null)}
            >
              <option value="">Any year</option>
              {years.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Wave</span>
            <select value={wave ?? ""} onChange={(event) => setWave(event.target.value || null)}>
              <option value="">Any wave</option>
              {waves.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          {filtered ? (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setText("");
                setQuery("");
                setLine(null);
                setYear(null);
                setWave(null);
              }}
            >
              Reset
            </button>
          ) : null}
        </div>
        <p className="result-count" aria-live="polite">
          {results.length} {results.length === 1 ? "figure" : "figures"}
        </p>
      </div>
      {results.length === 0 ? (
        <EmptyState
          title="No matches"
          body={
            query.trim()
              ? `Nothing in the 3.75″ catalog matches “${query.trim()}”.`
              : "No figures match these filters."
          }
          action={
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setText("");
                setQuery("");
                setLine(null);
                setYear(null);
                setWave(null);
              }}
            >
              Clear filters
            </button>
          }
        />
      ) : (
        groups.map((group) => (
          <section key={group.line} aria-labelledby={`line-${lineSlug(group.line)}`} className="line-section">
            <div className="section-head">
              <h2 id={`line-${lineSlug(group.line)}`}>{group.line}</h2>
              <p>{group.figures.length}</p>
            </div>
            <div className="grid">
              {group.figures.map((figure) => (
                <CatalogCard
                  key={figure.id}
                  figure={figure}
                  owned={shelf.collection.filter((entry) => entry.figureId === figure.id).length}
                  wished={shelf.wishlist.some((entry) => entry.figureId === figure.id)}
                  photoUrl={shelf.photos[figure.id]}
                  onOpen={() => overlays.openFigure(figure.id)}
                  onAdd={() => void shelf.addToCollection(figure.id)}
                  onWish={() => void shelf.toggleWishlist(figure.id)}
                />
              ))}
            </div>
          </section>
        ))
      )}
      <p className="page-end">
        <Link to="/credits">Image policy and sources</Link>
      </p>
    </div>
  );
}

function CatalogCard({
  figure,
  owned,
  wished,
  photoUrl,
  onOpen,
  onAdd,
  onWish,
}: {
  figure: Figure;
  owned: number;
  wished: boolean;
  photoUrl?: string;
  onOpen: () => void;
  onAdd: () => void;
  onWish: () => void;
}) {
  const meta = [String(figure.year), figure.wave, figure.number].filter(Boolean).join(" · ");
  return (
    <article className="card" data-figure-id={figure.id}>
      <button type="button" className="card-open" onClick={onOpen}>
        <span className="plate-frame">
          <GeneratedPlate figure={figure} photoUrl={photoUrl} />
          {owned > 0 ? (
            <span className="owned-pill" aria-hidden="true">
              {owned} owned
            </span>
          ) : null}
        </span>
        <span className="card-name">{figure.name}</span>
        <span className="card-meta">{meta}</span>
        {figure.character !== figure.name ? <span className="card-character">{figure.character}</span> : null}
        {owned > 0 ? <span className="sr-only">{owned} in collection</span> : null}
      </button>
      <div className="card-actions">
        <button type="button" onClick={onAdd} aria-label={`Add ${figure.name} to collection`}>
          Add
        </button>
        <button
          type="button"
          aria-pressed={wished}
          aria-label={wished ? `Remove ${figure.name} from wishlist` : `Save ${figure.name} to wishlist`}
          onClick={onWish}
        >
          {wished ? "Saved" : "Wish"}
        </button>
      </div>
    </article>
  );
}
