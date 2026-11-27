import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { palette, tokens } from "../../theme/tokens.js";

const ToastContext = createContext(null);

export function ToastProvider({ children, isDark = true }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);
  const push = useCallback((message, tone = "error") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((list) => [...list.slice(-2), { id, message, tone }]);
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);
  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);
  const c = palette(isDark);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" style={{ position: "fixed", left: 12, right: 12, bottom: "calc(76px + env(safe-area-inset-bottom))", zIndex: 400, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map((t) => (
          <div key={t.id} role="status" style={{
            background: t.tone === "error" ? "#3f1d2a" : c.bgElevated,
            color: "#fff",
            borderRadius: tokens.radius.md,
            padding: "12px 14px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}>
            <span style={{ flex: 1, fontSize: 14, lineHeight: 1.4 }}>{t.message}</span>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss notice" style={{ background: "transparent", color: "#fff", border: "none", minHeight: 44, minWidth: 44 }}>Close</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { push() {}, dismiss() {} };
  return ctx;
}
