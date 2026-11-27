import { useCallback, useEffect, useRef, useState } from "react";
import { useVisibleInterval } from "./useVisibleInterval.js";

export function readStoredList(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function mergeFamilyItems(prev, remote) {
  const localOnly = (prev || []).filter((item) => item && !item.fbId && item.text && String(item.text).trim());
  const seen = new Set();
  const merged = [...localOnly, ...(remote || [])].filter((item) => {
    if (!item?.text || !String(item.text).trim()) return false;
    const key = item.id || item.fbId;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return merged;
}

async function readFirebaseList(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Firebase HTTP ${res.status}`);
  const data = await res.json();
  if (data && typeof data === "object" && !Array.isArray(data) && typeof data.error === "string" && Object.keys(data).length === 1) {
    throw new Error(data.error);
  }
  if (!data || typeof data !== "object") return [];
  return Object.entries(data)
    .map(([fbId, val]) => ({ fbId, ...val }))
    .filter((item) => item.text && String(item.text).trim());
}

// localStorage cache, Firebase list, and safe failure. Drive stays with the caller.
export function useFamilyList({ storageKey, url, active = true, pollMs = 10000 }) {
  const [items, setItems] = useState(() => readStoredList(storageKey));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const writePending = useRef(false);

  const reload = useCallback(async () => {
    if (!url || writePending.current) return;
    setLoading(true);
    try {
      const remote = await readFirebaseList(url);
      setItems((prev) => {
        const merged = mergeFamilyItems(prev, remote);
        localStorage.setItem(storageKey, JSON.stringify(merged));
        return merged;
      });
      setError("");
    } catch (err) {
      setError(err?.message || "Could not refresh");
    } finally {
      setLoading(false);
    }
  }, [storageKey, url]);

  useEffect(() => {
    if (active && url) reload();
  }, [active, url, reload]);

  useVisibleInterval(() => { reload(); }, active && url ? pollMs : null);

  const replaceItems = useCallback((next) => {
    const list = typeof next === "function" ? null : next;
    setItems((prev) => {
      const resolved = typeof next === "function" ? next(prev) : list;
      localStorage.setItem(storageKey, JSON.stringify(resolved));
      return resolved;
    });
  }, [storageKey]);

  return { items, setItems: replaceItems, loading, error, reload, writePending };
}
