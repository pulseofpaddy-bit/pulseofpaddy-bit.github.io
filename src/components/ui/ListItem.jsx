import { palette } from "../../theme/tokens.js";

export function ListItem({ title, subtitle, action, onClick, isDark }) {
  const c = palette(isDark);
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        gap: 12,
        minHeight: 56,
        padding: "10px 14px",
        background: "transparent",
        border: "none",
        borderBottom: `1px solid ${c.border}`,
        color: c.text,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontWeight: 700 }}>{title}</span>
        {subtitle && <span style={{ display: "block", fontSize: 12, color: c.textMuted, marginTop: 2 }}>{subtitle}</span>}
      </span>
      {action}
    </Tag>
  );
}
