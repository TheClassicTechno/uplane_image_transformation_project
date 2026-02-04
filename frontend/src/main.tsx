// App entry for the client bundle.
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles.css";

const container = document.getElementById("root");

if (container) {
  // StrictMode helps surface side effects in dev.
  createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
