import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export function useTitle(page: string): void {
  useEffect(() => {
    document.title = page === "ShelfTrack" ? page : `${page} · ShelfTrack`;
  }, [page]);
}

export function useOverlays() {
  const [params, setParams] = useSearchParams();
  const figureId = params.get("figure");
  const editId = params.get("edit");
  const acquireId = params.get("acquire");

  function update(mutate: (next: URLSearchParams) => void) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        mutate(next);
        return next;
      },
      { replace: true },
    );
  }

  return {
    figureId,
    editId,
    acquireId,
    openFigure(id: string) {
      update((next) => {
        next.set("figure", id);
        next.delete("edit");
        next.delete("acquire");
      });
    },
    openEdit(id: string, entryId: string) {
      update((next) => {
        next.set("figure", id);
        next.set("edit", entryId);
        next.delete("acquire");
      });
    },
    closeEdit() {
      update((next) => {
        next.delete("edit");
      });
    },
    openAcquire(wishlistId: string) {
      update((next) => {
        next.set("acquire", wishlistId);
        next.delete("figure");
        next.delete("edit");
      });
    },
    close() {
      update((next) => {
        next.delete("figure");
        next.delete("edit");
        next.delete("acquire");
      });
    },
  };
}
