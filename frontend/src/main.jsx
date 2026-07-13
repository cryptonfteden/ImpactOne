import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import AppRoot from "./AppRoot";
import AppProviders from "./context/AppProviders";

const container = document.getElementById("root");

if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <AppProviders>
        <AppRoot />
      </AppProviders>
    </React.StrictMode>
  );
}