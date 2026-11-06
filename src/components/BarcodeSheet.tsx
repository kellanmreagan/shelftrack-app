import { Sheet } from "./Sheet";

type BarcodeSheetProps = {
  onClose: () => void;
  onSearch: () => void;
};

export function BarcodeSheet({ onClose, onSearch }: BarcodeSheetProps) {
  return (
    <Sheet title="Barcode scan" onClose={onClose}>
      <p>
        Barcode lookup is not in this release. The web app does not read UPCs. Search by name, wave, or
        figure number instead — for example, VC304 or 12-back.
      </p>
      <div className="button-row">
        <button type="button" className="btn btn-primary" onClick={onSearch}>
          Go to search
        </button>
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    </Sheet>
  );
}
