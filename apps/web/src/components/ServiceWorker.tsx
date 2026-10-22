"use client";

import { useEffect } from "react";

/**
 * Registers the app-shell service worker in production builds only (dev servers rebuild
 * assets constantly, and a stale shell there only confuses). See `public/sw.js`.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Offline support is best-effort; the app works online without it.
    });
  }, []);
  return null;
}
