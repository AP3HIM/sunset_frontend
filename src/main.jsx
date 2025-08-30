import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// Base styles (always load for web + electron)
import "./css/app.css";
import "./css/globals.css";
import "./css/hero.css";
import "./css/features.css";
import "./css/testimonials.css";
import "./css/footer.css";

// Electron-only overrides
if (window.electronEnv?.isElectron) {
  import("./css/electron.css");
  document.body.classList.add("electron");
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
