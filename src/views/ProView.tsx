import { useTitle } from "../hooks";

const FEATURES = [
  {
    title: "Value over time",
    body: "A place to record what you paid and watch that history. ShelfTrack does not estimate a market value.",
  },
  {
    title: "Price alerts",
    body: "A notification when a figure you own changes price. No price feed is connected.",
  },
  {
    title: "Wishlist drops",
    body: "A note when a saved figure is discounted. Retailer feeds are not hooked up.",
  },
];

export function ProView() {
  useTitle("Pro");
  return (
    <div className="page">
      <div className="page-head">
        <h1 id="page-title" tabIndex={-1}>
          ShelfTrack Pro
        </h1>
        <p>A locked preview. Payments are off, and this app never invents a dollar value for your shelf.</p>
      </div>
      <div className="pro-hero">
        <p className="price">
          <span>$4</span>/mo
        </p>
        <p className="lock-pill">Not available</p>
      </div>
      <ul className="pro-list">
        {FEATURES.map((feature) => (
          <li key={feature.title}>
            <h2>{feature.title}</h2>
            <p>{feature.body}</p>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-primary" disabled aria-describedby="pro-note">
        Pro is not available yet
      </button>
      <p id="pro-note" className="fine-print">
        There is no checkout and no card form. The $4/mo price is the planned subscription, not a charge.
      </p>
    </div>
  );
}
