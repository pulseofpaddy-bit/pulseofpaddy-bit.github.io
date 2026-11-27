import { palette, tokens } from "../../theme/tokens.js";

export function Input({ label, isDark, id, ...props }) {
  const c = palette(isDark);
  const inputId = id || (label ? label.replace(/\s+/g, "-").toLowerCase() : undefined);
  return (
    <label htmlFor={inputId} style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      {label && <span style={{ fontSize: 12, fontWeight: 700, color: c.textMuted }}>{label}</span>}
      <input
        id={inputId}
        {...props}
        style={{
          minHeight: tokens.tap,
          borderRadius: tokens.radius.md,
          border: `1px solid ${c.border}`,
          background: isDark ? "#241c30" : "#fff",
          color: c.text,
          padding: "0 14px",
          width: "100%",
          boxSizing: "border-box",
          ...(props.style || {}),
        }}
      />
    </label>
  );
}
