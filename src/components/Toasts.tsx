export type ToastItem = {
  id: string;
  message: string;
  onUndo?: () => Promise<void>;
};

type ToastsProps = {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  onUndo: (id: string) => void;
};

export function Toasts({ toasts, onDismiss, onUndo }: ToastsProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-region" data-focus-root="" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div className="toast" key={toast.id}>
          <p>{toast.message}</p>
          <div className="toast-actions">
            {toast.onUndo ? (
              <button type="button" className="btn btn-small btn-ink" onClick={() => onUndo(toast.id)}>
                Undo
              </button>
            ) : null}
            <button type="button" className="btn btn-small btn-ghost-ink" onClick={() => onDismiss(toast.id)}>
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
