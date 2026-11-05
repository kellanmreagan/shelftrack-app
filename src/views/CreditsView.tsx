import { Link } from "react-router-dom";
import { FigureSearch } from "../lib/figure-search";
import { lineShort } from "../lib/text";
import { useTitle } from "../hooks";

export function CreditsView() {
  useTitle("Credits");
  const meta = FigureSearch.meta();
  const licenses = FigureSearch.licenses();

  return (
    <div className="page credits">
      <div className="page-head">
        <h1 id="page-title" tabIndex={-1}>
          Credits
        </h1>
        <p>
          ShelfTrack catalogs {meta.scale} Star Wars figures: {meta.lines.join(", ")}.{" "}
          {FigureSearch.total()} entries. Six-inch lines are outside this catalog.
        </p>
      </div>
      <section>
        <h2>What’s in the file</h2>
        <ul className="plain-list">
          {FigureSearch.lines().map((line) => (
            <li key={line}>
              {line}: {FigureSearch.countLine(line)}
            </li>
          ))}
        </ul>
        <p className="fine-print">Counts come from the bundled checklist. Nothing here was added by hand in the app.</p>
      </section>
      <section>
        <h2>Data sources</h2>
        <ul className="source-list">
          {meta.sources.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.name}
              </a>
              <p>{source.usedFor}</p>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Images</h2>
        <p>{meta.imagePolicy.summary}</p>
        <ul className="plain-list">
          <li>Permitted real product images: {meta.imagePolicy.permittedRealProductImages}</li>
          <li>Generated fallbacks: {meta.imagePolicy.generatedFallbacks}</li>
          <li>User photos: {meta.imagePolicy.userPhotos}</li>
        </ul>
        <h3>License</h3>
        {licenses.map((license) => (
          <p key={license}>{license}</p>
        ))}
        <p className="fine-print">
          Each plate uses the figure’s initials and a line color from the catalog file ({FigureSearch.lines()
            .map((line) => `${lineShort(line)}`)
            .join(", ")}
          ). ShelfTrack does not download or hotlink retailer, auction, or fan-site photos.
        </p>
      </section>
      <section>
        <h2>Your data</h2>
        <p>
          Collection entries, wishes, and photos you add are stored in IndexedDB on this device. There is no
          account sync in this version. Use Settings to export a JSON backup.
        </p>
      </section>
      <p>
        <Link to="/">Back to the catalog</Link>
      </p>
    </div>
  );
}
