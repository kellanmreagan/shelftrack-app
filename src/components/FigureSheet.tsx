import { useRef, useState } from "react";
import type { CollectionEntry, Condition, Figure } from "../types";
import { formatDate } from "../lib/dates";
import { useShelf } from "../state/shelf";
import { GeneratedPlate } from "./GeneratedPlate";
import { Sheet } from "./Sheet";
import { IconCamera } from "./icons";

type FigureSheetProps = {
  figure: Figure;
  editId: string | null;
  onClose: () => void;
  onCloseEdit: () => void;
  onEdit: (entryId: string) => void;
};

export function FigureSheet({ figure, editId, onClose, onCloseEdit, onEdit }: FigureSheetProps) {
  const shelf = useShelf();
  const copies = shelf.collection.filter((entry) => entry.figureId === figure.id);
  const wish = shelf.wishlist.find((entry) => entry.figureId === figure.id);
  const editing = editId ? copies.find((entry) => entry.id === editId) : undefined;
  const photoUrl = shelf.photos[figure.id];
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    await shelf.setPhoto(figure.id, file);
  }

  return (
    <Sheet title={editing ? `Edit ${figure.name}` : figure.name} onClose={onClose}>
      <div className="detail-hero">
        <GeneratedPlate figure={figure} photoUrl={photoUrl} variant="detail" labelled />
        {!photoUrl ? (
          <p className="caption">Generated catalog plate. Not a product photo.</p>
        ) : (
          <div className="photo-note">
            <GeneratedPlate figure={figure} variant="thumb" />
            <p className="caption">Your photo stays in this browser. The plate is the catalog image.</p>
          </div>
        )}
      </div>
      {editing ? null : (
        <div className="button-row">
          <button type="button" className="btn btn-primary" onClick={() => void shelf.addToCollection(figure.id)}>
            {copies.length > 0 ? "Add another copy" : "Add to collection"}
          </button>
          <button
            type="button"
            className="btn"
            aria-pressed={Boolean(wish)}
            onClick={() => void shelf.toggleWishlist(figure.id)}
          >
            {wish ? "On wishlist" : "Add to wishlist"}
          </button>
        </div>
      )}
      <div className="button-row">
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          Upload photo
        </button>
        <button type="button" className="btn" onClick={() => cameraRef.current?.click()}>
          <IconCamera /> Take photo
        </button>
        {photoUrl ? (
          <button type="button" className="btn btn-danger" onClick={() => void shelf.removePhoto(figure.id)}>
            Remove photo
          </button>
        ) : null}
      </div>
      <dl className="meta-grid">
        <div>
          <dt>Line</dt>
          <dd>{figure.line}</dd>
        </div>
        <div>
          <dt>Year</dt>
          <dd>{figure.year}</dd>
        </div>
        <div>
          <dt>Wave</dt>
          <dd>{figure.wave}</dd>
        </div>
        <div>
          <dt>Number</dt>
          <dd>{figure.number ?? "None on card"}</dd>
        </div>
        {figure.character !== figure.name ? (
          <div>
            <dt>Character</dt>
            <dd>{figure.character}</dd>
          </div>
        ) : null}
        <div>
          <dt>Scale</dt>
          <dd>3.75″</dd>
        </div>
      </dl>
      <p className="fine-print">{figure.image.license}</p>
      <input
        ref={fileRef}
        className="sr-only"
        type="file"
        accept="image/*"
        aria-label={`Upload a photo of ${figure.name}`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void onFile(file);
        }}
      />
      <input
        ref={cameraRef}
        className="sr-only"
        type="file"
        accept="image/*"
        capture="environment"
        aria-label={`Take a photo of ${figure.name}`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void onFile(file);
        }}
      />
      {editing ? (
        <EntryForm
          entry={editing}
          onCancel={onCloseEdit}
          onSave={async (patch) => {
            await shelf.updateEntry(editing.id, patch);
            onCloseEdit();
          }}
        />
      ) : (
        <>
          {copies.length > 0 ? (
            <section className="copy-list" aria-label="Copies in your collection">
              <h3>In your collection</h3>
              <ul>
                {copies.map((entry) => (
                  <li key={entry.id}>
                    <p>
                      <strong>{entry.condition === "loose" ? "Loose" : "Carded"}</strong>
                      {" · "}
                      {entry.accessoriesComplete ? "Accessories complete" : "Accessories missing"}
                      {entry.location ? ` · ${entry.location}` : ""}
                      {" · "}
                      {formatDate(entry.dateAdded)}
                    </p>
                    {entry.notes ? <p className="muted">{entry.notes}</p> : null}
                    <div className="button-row">
                      <button type="button" className="btn btn-small" onClick={() => onEdit(entry.id)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-small btn-danger"
                        onClick={() => void shelf.removeEntry(entry.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </Sheet>
  );
}

function EntryForm({
  entry,
  onSave,
  onCancel,
}: {
  entry: CollectionEntry;
  onSave: (patch: {
    condition: Condition;
    accessoriesComplete: boolean;
    location: string;
    notes: string;
    dateAdded: string;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [condition, setCondition] = useState<Condition>(entry.condition);
  const [accessoriesComplete, setAccessoriesComplete] = useState(entry.accessoriesComplete);
  const [location, setLocation] = useState(entry.location);
  const [notes, setNotes] = useState(entry.notes);
  const [dateAdded, setDateAdded] = useState(entry.dateAdded);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="entry-form"
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        void onSave({ condition, accessoriesComplete, location, notes, dateAdded }).finally(() => setBusy(false));
      }}
    >
      <fieldset>
        <legend>Condition</legend>
        <div className="segmented" role="radiogroup" aria-label="Condition">
          {(["loose", "carded"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={condition === value}
              className={condition === value ? "is-selected" : ""}
              onClick={() => setCondition(value)}
            >
              {value === "loose" ? "Loose" : "Carded"}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="check">
        <input
          type="checkbox"
          checked={accessoriesComplete}
          onChange={(event) => setAccessoriesComplete(event.target.checked)}
        />
        <span>
          Accessories complete
          <small>Weapons, capes, and other pieces that came with this release.</small>
        </span>
      </label>
      <label className="field">
        <span>Location</span>
        <input
          value={location}
          maxLength={120}
          autoComplete="off"
          placeholder="Shelf, bin, closet"
          onChange={(event) => setLocation(event.target.value)}
        />
      </label>
      <label className="field">
        <span>Notes</span>
        <textarea
          value={notes}
          maxLength={2000}
          rows={3}
          placeholder="Yellowed bubble, repro weapon, opened to display"
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>
      <label className="field">
        <span>Date added</span>
        <input type="date" required value={dateAdded} onChange={(event) => setDateAdded(event.target.value)} />
      </label>
      <div className="button-row">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          Save
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
