import { useState } from "react";
import type { Condition } from "../types";
import { FigureSearch } from "../lib/figure-search";
import { todayISODate } from "../lib/dates";
import { useShelf } from "../state/shelf";
import { Sheet } from "./Sheet";

type AcquireSheetProps = {
  wishlistId: string;
  onClose: () => void;
};

export function AcquireSheet({ wishlistId, onClose }: AcquireSheetProps) {
  const shelf = useShelf();
  const wish = shelf.wishlist.find((entry) => entry.id === wishlistId);
  const figure = wish ? FigureSearch.get(wish.figureId) : undefined;
  const [condition, setCondition] = useState<Condition>("loose");
  const [accessoriesComplete, setAccessoriesComplete] = useState(true);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState(wish?.notes ?? "");
  const [dateAdded, setDateAdded] = useState(todayISODate());
  const [busy, setBusy] = useState(false);

  if (!wish || !figure) {
    return (
      <Sheet title="Wish unavailable" onClose={onClose}>
        <p>That figure is no longer on your wishlist.</p>
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      </Sheet>
    );
  }

  return (
    <Sheet title={`Add ${figure.name}`} onClose={onClose}>
      <p className="lede">Move this wish into your collection. You can edit it later.</p>
      <form
        className="entry-form"
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
          void shelf
            .acquireWishlist(wish.id, { condition, accessoriesComplete, location, notes, dateAdded })
            .then(() => onClose())
            .finally(() => setBusy(false));
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
            <small>Uncheck this if a weapon, cape, or other piece is missing.</small>
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
          <textarea value={notes} maxLength={2000} rows={3} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <label className="field">
          <span>Date added</span>
          <input type="date" required value={dateAdded} onChange={(event) => setDateAdded(event.target.value)} />
        </label>
        <div className="button-row">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            Add to collection
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Sheet>
  );
}
