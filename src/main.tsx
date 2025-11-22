import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { UiSettingsProvider } from "./contexts/UiSettingsContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <UiSettingsProvider>
    <App />
  </UiSettingsProvider>
);