"use client";

import { useEffect, useState } from "react";
import { TRACKED_PARAMS } from "./tracking";

const STORAGE_KEY = "qes_tracking_params";

/**
 * Captures UTM and gclid params on first paint and mirrors them into
 * sessionStorage, so they survive to whichever form the visitor actually
 * submits — the hero one or the one at the bottom of the page. Without this
 * you learn that leads came from Google Ads but never which keyword paid.
 */
export function useTrackingParams(): Record<string, string> {
  const [params, setParams] = useState<Record<string, string>>({});

  useEffect(() => {
    const captured: Record<string, string> = {};

    // Anything stashed on a previous page view in this session.
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) Object.assign(captured, JSON.parse(stored));
    } catch {
      // Private mode or disabled storage — the URL below still works.
    }

    // The current URL wins; it is the freshest click.
    const search = new URLSearchParams(window.location.search);
    for (const key of TRACKED_PARAMS) {
      const value = search.get(key);
      if (value) captured[key] = value;
    }

    if (Object.keys(captured).length === 0) return;

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(captured));
    } catch {
      // Non-fatal.
    }

    setParams(captured);
  }, []);

  return params;
}
