import { palette, tokens } from "../../theme/tokens.js";

export function Sheet({ title, children, onClose, isDark }) {
  const c = palette(isDark);
  return (
    <div role="presentation" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(16,12,22,0.55)", zIndex: 300, display: "flex", alignItems: "flex-end" }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          background: c.bgElevated,
          color: c.text,
          borderRadius: "22px 22px 0 0",
          padding: "12px 16px calc(20px + env(safe-area-inset-bottom))",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 4, background: c.border, margin: "4px auto 12px" }} />
        {title && <h2 style={{ fontSize: 18, margin: "0 0 12px" }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
}
