"use client";

import { useEffect } from "react";

export function HashScroller() {
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;

    // Element might already be in the DOM
    const existing = document.getElementById(hash);
    if (existing) {
      existing.scrollIntoView({ behavior: "smooth" });
      return;
    }

    // Content may not be in the DOM yet (streamed via Suspense),
    // so watch for it with a MutationObserver.
    const observer = new MutationObserver(() => {
      const el = document.getElementById(hash);
      if (el) {
        observer.disconnect();
        el.scrollIntoView({ behavior: "smooth" });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Stop observing after 5 seconds to avoid leaking
    const timeout = setTimeout(() => observer.disconnect(), 5000);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, []);

  return null;
}
