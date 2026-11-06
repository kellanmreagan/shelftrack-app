import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import "@fontsource/outfit/latin-400.css";
import "@fontsource/outfit/latin-500.css";
import "@fontsource/outfit/latin-600.css";
import "@fontsource/fraunces/latin-600.css";

type BoundaryProps = { children: React.ReactNode };
type BoundaryState = { message: string | null };

class Boundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { message: null };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { message: error instanceof Error ? error.message : "Something broke." };
  }

  render() {
    if (this.state.message) {
      return (
        <div className="boot">
          <p className="brand-mark" aria-hidden="true">
            St
          </p>
          <h1>ShelfTrack hit a problem</h1>
          <p>{this.state.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element.");

createRoot(root).render(
  <React.StrictMode>
    <Boundary>
      <App />
    </Boundary>
  </React.StrictMode>,
);
