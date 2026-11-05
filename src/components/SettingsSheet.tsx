import { useState } from "react";
import { Link } from "react-router-dom";
import type { BackupFile } from "../types";
import { BackupService } from "../lib/backup-service";
import { useShelf } from "../state/shelf";
import { Sheet } from "./Sheet";

type SettingsSheetProps = {
  onClose: () => void;
};

export function SettingsSheet({ onClose }: SettingsSheetProps) {
  const shelf = useShelf();
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<BackupFile | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);

  async function readFile(file: File | undefined) {
    setConfirmClear(false);
    if (!file) return;
    try {
      const parsed = BackupService.parse(await file.text());
      const result = BackupService.validate(parsed);
      if (!result.ok) {
        setPreview(null);
        setErrors(result.errors);
        return;
      }
      setErrors([]);
      setPreview(result.backup);
    } catch (error) {
      setPreview(null);
      setErrors([error instanceof Error ? error.message : "Could not read that file."]);
    }
  }

  return (
    <Sheet title="Settings" onClose={onClose}>
      <section className="settings-block">
        <h3>This device</h3>
        <p>
          There is no account. Your collection, wishlist, and photos stay in this browser. Sync across
          devices is not available yet.
        </p>
      </section>
      <section className="settings-block">
        <h3>Backup</h3>
        <p>Export a JSON file of everything stored here, or restore one. Import replaces this device.</p>
        <div className="button-row">
          <button type="button" className="btn btn-primary" onClick={() => void shelf.exportBackup()}>
            Export backup
          </button>
          <label className="btn">
            Import backup
            <input
              className="sr-only"
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                void readFile(file);
              }}
            />
          </label>
        </div>
        {errors.length > 0 ? (
          <div className="form-errors" role="alert">
            <p>That backup can’t be imported.</p>
            <ul>
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {preview ? (
          <div className="import-preview">
            <p>
              Ready to restore {preview.collection.length} collection{" "}
              {preview.collection.length === 1 ? "entry" : "entries"}, {preview.wishlist.length} wishlist{" "}
              {preview.wishlist.length === 1 ? "item" : "items"}, and {preview.photos.length}{" "}
              {preview.photos.length === 1 ? "photo" : "photos"}.
            </p>
            <div className="button-row">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void shelf.commitImport(preview).then(() => {
                    setPreview(null);
                    onClose();
                  }).finally(() => setBusy(false));
                }}
              >
                Replace data on this device
              </button>
              <button type="button" className="btn" onClick={() => setPreview(null)}>
                Cancel import
              </button>
            </div>
          </div>
        ) : null}
      </section>
      <section className="settings-block">
        <h3>About the catalog</h3>
        <p>Names, waves, and numbers come from public checklists. See credits for sources and image rules.</p>
        <Link className="btn" to="/credits" onClick={onClose}>
          Credits and image policy
        </Link>
      </section>
      <section className="settings-block">
        <h3>Reset</h3>
        <p>Removes your collection, wishlist, and photos from this browser. Export a backup first if you want one.</p>
        {confirmClear ? (
          <div className="button-row">
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                void shelf.clearAll();
                setConfirmClear(false);
                onClose();
              }}
            >
              Delete local data
            </button>
            <button type="button" className="btn" onClick={() => setConfirmClear(false)}>
              Keep data
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-danger" onClick={() => setConfirmClear(true)}>
            Reset this device
          </button>
        )}
      </section>
    </Sheet>
  );
}
