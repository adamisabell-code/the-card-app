import { useSyncExternalStore } from "react";

/** `history.pushState` / `replaceState` do not emit `popstate` — use after SPA URL changes. */
export const APP_PATHNAME_CHANGED = "app:path";

function subscribe(callback) {
  const onAppPath = () => callback();
  window.addEventListener("popstate", callback);
  window.addEventListener(APP_PATHNAME_CHANGED, onAppPath);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(APP_PATHNAME_CHANGED, onAppPath);
  };
}

function getPathname() {
  return window.location.pathname;
}

export function usePathname() {
  return useSyncExternalStore(subscribe, getPathname, getPathname);
}
