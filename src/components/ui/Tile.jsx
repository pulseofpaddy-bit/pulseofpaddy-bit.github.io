import { palette, tokens } from "../../theme/tokens.js";

export function Tile({ label, hint, icon, onClick, isDark }) {
  const c = palette(isDark);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={hint ? `${label}. ${hint}` : label}
      style={{
        minHeight: 108,
        padding: "16px 10px 14px",
        borderRadius: tokens.radius.lg,
        border: `1px solid ${c.border}`,
        background: c.bgElevated,
        boxShadow: c.shadow,
        color: c.text,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        cursor: "pointer",
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{label}</span>
      {hint && <span style={{ fontSize: 11, color: c.textMuted, letterSpacing: "0.04em" }}>{hint}</span>}
    </button>
  );
}
