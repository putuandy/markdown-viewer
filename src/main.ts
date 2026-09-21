import { mount } from "svelte";
import App from "./App.svelte";
import { loadSettings, resolveTheme } from "./lib/settings";
import "./app.css";

const settings = loadSettings(localStorage);

document.documentElement.dataset.theme = resolveTheme(
  settings.theme,
  window.matchMedia("(prefers-color-scheme: dark)").matches,
);

const target = document.getElementById("app");

if (!target) {
  throw new Error("Root element #app not found");
}

export default mount(App, { target });
