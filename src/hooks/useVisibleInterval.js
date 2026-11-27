import { useEffect, useRef } from "react";

// Runs `callback` on an interval only while the tab is visible.
// The callback is read from a ref so callers can pass a fresh closure
// without resetting the timer every render.
export function useVisibleInterval(callback, delay) {
  const saved = useRef(callback);
  saved.current = callback;
  useEffect(() => {
    if (delay == null) return undefined;
    let timer = null;
    const stop = () => {
      if (timer != null) clearInterval(timer);
      timer = null;
    };
    const start = () => {
      stop();
      timer = setInterval(() => {
        if (document.visibilityState === "hidden") return;
        saved.current();
      }, delay);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") stop();
      else {
        saved.current();
        start();
      }
    };
    if (typeof document !== "undefined" && document.visibilityState !== "hidden") start();
    document?.addEventListener?.("visibilitychange", onVisibility);
    return () => {
      stop();
      document?.removeEventListener?.("visibilitychange", onVisibility);
    };
  }, [delay]);
}
