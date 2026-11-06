import { useEffect, useRef, useState } from "react";
import { BrowserRouter, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { FigureSearch } from "./lib/figure-search";
import { ShelfProvider, useShelf } from "./state/shelf";
import { useOverlays } from "./hooks";
import { AcquireSheet } from "./components/AcquireSheet";
import { BarcodeSheet } from "./components/BarcodeSheet";
import { FigureSheet } from "./components/FigureSheet";
import { Sheet } from "./components/Sheet";
import { SettingsSheet } from "./components/SettingsSheet";
import { IconBookmark, IconGear, IconGrid, IconLock, IconScan, IconShelf } from "./components/icons";
import { CatalogView } from "./views/CatalogView";
import { CollectionView } from "./views/CollectionView";
import { CreditsView } from "./views/CreditsView";
import { ProView } from "./views/ProView";
import { WishlistView } from "./views/WishlistView";

export function App() {
  return (
    <ShelfProvider>
      <BrowserRouter basename="/shelftrack-app">
        <Shell />
      </BrowserRouter>
    </ShelfProvider>
  );
}

function Shell() {
  const shelf = useShelf();
  const navigate = useNavigate();
  const overlays = useOverlays();
  const shellRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const sheetOpen = Boolean(settingsOpen || barcodeOpen || overlays.figureId || overlays.acquireId);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    if (sheetOpen) shell.setAttribute("inert", "");
    else shell.removeAttribute("inert");
  }, [sheetOpen]);

  useEffect(() => {
    if (overlays.figureId || overlays.acquireId) {
      setSettingsOpen(false);
      setBarcodeOpen(false);
    }
  }, [overlays.figureId, overlays.acquireId]);

  const figure = overlays.figureId ? FigureSearch.get(overlays.figureId) : undefined;

  function goToSearch() {
    setBarcodeOpen(false);
    setSettingsOpen(false);
    navigate("/");
    window.setTimeout(() => document.getElementById("catalog-search")?.focus(), 60);
  }

  return (
    <>
      <div className="shell" ref={shellRef}>
        <a className="skip" href="#content">
          Skip to content
        </a>
        <nav className="tabbar" aria-label="Primary">
          <div className="nav-links">
            <NavLink to="/" end>
              <IconGrid /> Catalog
            </NavLink>
            <NavLink to="/collection">
              <IconShelf /> Collection
              {shelf.collection.length > 0 ? <span className="nav-count">{shelf.collection.length}</span> : null}
            </NavLink>
            <NavLink to="/wishlist">
              <IconBookmark /> Wishlist
              {shelf.wishlist.length > 0 ? <span className="nav-count">{shelf.wishlist.length}</span> : null}
            </NavLink>
            <NavLink to="/pro">
              <IconLock /> Pro <span className="sr-only">locked</span>
            </NavLink>
          </div>
          <p className="nav-foot">Stored on this device</p>
        </nav>
        <div className="column">
          <header className="app-header">
            <div className="header-inner">
              <div className="brand">
                <span className="brand-mark" aria-hidden="true">
                  St
                </span>
                <span>
                  <span className="brand-name">ShelfTrack</span>
                  <span className="brand-sub">3.75″ Star Wars</span>
                </span>
              </div>
              <div className="header-actions">
                <button type="button" className="icon-btn" onClick={() => { setSettingsOpen(false); setBarcodeOpen(true); overlays.close(); }}>
                  <IconScan /> <span>Scan</span>
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => {
                    overlays.close();
                    setBarcodeOpen(false);
                    setSettingsOpen(true);
                  }}
                >
                  <IconGear /> <span>Settings</span>
                </button>
              </div>
            </div>
          </header>
          <main id="content" className="content">
            <Routes>
              <Route index element={<CatalogView />} />
              <Route path="collection" element={<CollectionView />} />
              <Route path="wishlist" element={<WishlistView />} />
              <Route path="pro" element={<ProView />} />
              <Route path="credits" element={<CreditsView />} />
              <Route
                path="*"
                element={
                  <div className="page">
                    <h1 id="page-title" tabIndex={-1}>
                      Page not found
                    </h1>
                    <p>That screen is not part of ShelfTrack.</p>
                    <NavLink to="/">Back to catalog</NavLink>
                  </div>
                }
              />
            </Routes>
          </main>
        </div>
      </div>
      {overlays.figureId && figure ? (
        <FigureSheet
          figure={figure}
          editId={overlays.editId}
          onClose={overlays.close}
          onCloseEdit={overlays.closeEdit}
          onEdit={(entryId) => overlays.openEdit(figure.id, entryId)}
        />
      ) : null}
      {overlays.figureId && !figure ? (
        <MissingFigure onClose={overlays.close} />
      ) : null}
      {overlays.acquireId ? <AcquireSheet wishlistId={overlays.acquireId} onClose={overlays.close} /> : null}
      {settingsOpen ? <SettingsSheet onClose={() => setSettingsOpen(false)} /> : null}
      {barcodeOpen ? <BarcodeSheet onClose={() => setBarcodeOpen(false)} onSearch={goToSearch} /> : null}
    </>
  );
}

function MissingFigure({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Figure not in the catalog" onClose={onClose}>
      <p>That id is not one of the 3.75″ figures in this app.</p>
      <button type="button" className="btn" onClick={onClose}>
        Close
      </button>
    </Sheet>
  );
}
