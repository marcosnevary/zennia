const DEV_MODE_KEY = "zennia:dev-mode";

/** Only the local dev server offers developer mode, so users of the published app never see it. */
export const DEV_MODE_AVAILABLE = import.meta.env.DEV;

function readDevMode(): boolean {
  try {
    return localStorage.getItem(DEV_MODE_KEY) === "true";
  } catch {
    return false;
  }
}

/** Developer tools, such as the draw details in Practice. A per-browser convenience, so it isn't a saved setting. */
class DevMode {
  on = $state(DEV_MODE_AVAILABLE && readDevMode());

  toggle(): void {
    this.on = !this.on;
    try {
      localStorage.setItem(DEV_MODE_KEY, String(this.on));
    } catch {
      // storage blocked: developer mode lasts until the page reloads
    }
  }
}

export const devMode = new DevMode();
