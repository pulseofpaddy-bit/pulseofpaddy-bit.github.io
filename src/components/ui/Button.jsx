import { palette, tokens } from "../../theme/tokens.js";

export function Button({ children, onClick, variant = "primary", disabled, type = "button", isDark, style }) {
  const c = palette(isDark);
  const styles = {
    primary: { background: c.accent, color: "#fff", border: "none" },
    ghost: { background: "transparent", color: c.text, border: `1px solid ${c.border}` },
    danger: { background: "transparent", color: c.danger, border: `1px solid ${c.border}` },
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        minHeight: tokens.tap,
        padding: "0 18px",
        borderRadius: tokens.radius.pill,
        fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        ...styles,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
