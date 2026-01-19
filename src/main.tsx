import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

function resolveUiMode(): "default" | "snapshot" {
  try {
    const params = new URLSearchParams(window.location.search);
    const uiParam = params.get("ui");
    const snapshotParam = params.get("snapshot");

    if (uiParam === "snapshot" || snapshotParam === "1" || snapshotParam === "true") {
      return "snapshot";
    }

    const stored = localStorage.getItem("ooprompt_ui_mode");
    if (stored === "snapshot") return "snapshot";
  } catch {
    // ignore (e.g. storage disabled)
  }

  return "default";
}

// Apply before first render to avoid layout flash.
document.documentElement.dataset.ui = resolveUiMode();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
