import { palette, tokens } from "../../theme/tokens.js";
import { Tile } from "../ui/Tile.jsx";
import { WorldClock } from "./WorldClock.jsx";
import { canViewHealthLogs } from "../../healthAccess.js";

const TILES = [
  { key: "movies", label: "Movies", hint: "Theater and streaming", icon: "🎬" },
  { key: "restaurants", label: "Eats", hint: "Nearby", icon: "🍴" },
  { key: "grocery", label: "Grocery", hint: "Shared list", icon: "🛒" },
  { key: "doctor", label: "Doctors", hint: "Visits", icon: "🩺" },
  { key: "todo", label: "To-Do", hint: "Tasks", icon: "✓" },
  { key: "reservations", label: "Travel", hint: "Bookings", icon: "🧳" },
  { key: "clothing", label: "Clothing", hint: "Wishlist", icon: "👕" },
  { key: "calc", label: "Calc", hint: "Tools", icon: "∑" },
  { key: "contacts", label: "Contacts", hint: "Directory", icon: "👤" },
  { key: "securefolder", label: "Secure", hint: "Vault", icon: "🔒" },
  { key: "finance", label: "Finance", hint: "Money", icon: "$" },
];

export function HomeScreen({ isDark, onOpen, onTheme, secondCountry, homeWeather, awayWeather, me }) {
  const c = palette(isDark);
  const tiles = [...TILES];
  if (canViewHealthLogs(me)) tiles.splice(8, 0, { key: "periodcal", label: "Cycle", hint: "Private", icon: "♥" });
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: c.bg, color: c.text, minHeight: "100dvh" }}>
      <header style={{ padding: "calc(12px + env(safe-area-inset-top)) 20px 8px" }}>
        <WorldClock secondCountry={secondCountry} homeWeather={homeWeather} awayWeather={awayWeather} isDark={isDark} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 14 }}>
          <div>
            <h1 style={{ fontSize: 34, lineHeight: 1, margin: 0, letterSpacing: "-0.03em" }}>Pulse</h1>
            <p style={{ margin: "6px 0 0", color: c.textMuted, fontSize: 13 }}>Your world, at a glance</p>
          </div>
          <button
            type="button"
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            onClick={() => onTheme(isDark ? "light" : "dark")}
            style={{ minWidth: tokens.tap, minHeight: tokens.tap, borderRadius: tokens.radius.pill, border: `1px solid ${c.border}`, background: c.bgElevated, color: c.text, cursor: "pointer" }}
          >
            {isDark ? "Light" : "Dark"}
          </button>
        </div>
      </header>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 108px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {tiles.map((tile) => (
            <Tile key={tile.key} {...tile} isDark={isDark} onClick={() => onOpen(tile.key)} />
          ))}
        </div>
      </div>
    </div>
  );
}
