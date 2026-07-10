import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import MainLayout from "./layout/MainLayout";
import AppProviders from "./context/AppProviders";

const container = document.getElementById("root");

if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <AppProviders>
        <MainLayout />
      </AppProviders>
    </React.StrictMode>
  );
}