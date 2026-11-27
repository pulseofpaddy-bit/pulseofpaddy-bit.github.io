import { palette, tokens } from "../../theme/tokens.js";

const ITEMS = [
  { key: null, label: "Home" },
  { key: "movies", label: "Movies" },
  { key: "grocery", label: "Shop" },
  { key: "settings", label: "Settings" },
];

export function BottomNav({ active, onChange, isDark }) {
  const c = palette(isDark);
  return (
    <nav aria-label="Primary" style={{
      position: "fixed",
      left: 0, right: 0, bottom: 0,
      display: "flex",
      justifyContent: "space-around",
      padding: "6px 8px calc(6px + env(safe-area-inset-bottom))",
      background: c.nav,
      borderTop: `1px solid ${c.border}`,
      backdropFilter: "blur(16px)",
      zIndex: 100,
    }}>
      {ITEMS.map((item) => {
        const selected = active === item.key || (item.key === null && (active === null || active === undefined));
        return (
          <button
            key={item.label}
            type="button"
            aria-current={selected ? "page" : undefined}
            onClick={() => onChange(item.key)}
            style={{
              minWidth: tokens.tap,
              minHeight: tokens.tap,
              border: "none",
              background: "transparent",
              color: selected ? c.text : c.textMuted,
              fontWeight: selected ? 700 : 500,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
