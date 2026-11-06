# ShelfTrack

Local-first tracker for **3.75-inch Star Wars** figures. The catalog is Kenner (1978–1985), The Vintage Collection, and the Retro Collection. Collection data, wishlist items, and photos you add stay in this browser.

There is no account sync in this version. A later release may add it. The separate landing page at [kellanmreagan.github.io/shelftrack](https://kellanmreagan.github.io/shelftrack/) is a different repository and is not part of this app.

App: https://kellanmreagan.github.io/shelftrack-app/

## What you can do

- Search the catalog by name, character, line, wave, year, or figure number (including VC numbers).
- Quick-add a figure to your collection or wishlist.
- Record loose or carded condition, whether accessories are complete, a location, notes, and the date added.
- Move a wishlist figure into the collection.
- See counts by condition and completeness. ShelfTrack does not show dollar values.
- Attach your own photo from a file or the camera. Photos stay on this device.
- Export and import a JSON backup.
- Read credits, checklist sources, and the image policy.

Barcode lookup, Pro checkout, cloud sync, and a Capacitor iOS build are stubs.

## Images

The seed file allows **0** real product photos. Wikimedia Commons does not allow action-figure photos as derivative works, and retailer or fan-site photos are not scraped or hotlinked. Every figure uses an original generated plate (line color and initials). See Credits in the app.

## Develop

```bash
npm install
npm test
npm run lint
npm run build
npm run dev
```

The dev server uses the `/shelftrack-app/` base path. Production is a Vite PWA deployed from the `gh-pages` branch.

Feature work stays on `mvp`. Do not merge to `main` without the owner.
