import { palette, tokens } from "../../theme/tokens.js";

export function Card({ children, isDark, style }) {
  const c = palette(isDark);
  return (
    <div style={{
      background: c.bgElevated,
      border: `1px solid ${c.border}`,
      borderRadius: tokens.radius.lg,
      boxShadow: c.shadow,
      padding: tokens.space.md,
      ...style,
    }}>
      {children}
    </div>
  );
}
