import { palette } from "../../theme/tokens.js";

export function EmptyState({ title, body, isDark }) {
  const c = palette(isDark);
  return (
    <div style={{ textAlign: "center", padding: "48px 20px", color: c.textMuted }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: c.text, marginBottom: 6 }}>{title}</div>
      {body && <div style={{ fontSize: 14, lineHeight: 1.5 }}>{body}</div>}
    </div>
  );
}
