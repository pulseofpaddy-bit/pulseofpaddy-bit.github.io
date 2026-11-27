import { Button } from "../ui/Button.jsx";
import { Spinner } from "../ui/Spinner.jsx";
import { palette, tokens } from "../../theme/tokens.js";

export function SignInScreen({ loading, error, onGoogle }) {
  const c = palette(true);
  return (
    <div style={{ flex: 1, minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "calc(24px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom))", background: c.bg, color: c.text, textAlign: "center" }}>
      <div aria-hidden="true" style={{ width: 72, height: 72, borderRadius: 22, background: c.accentSoft, color: c.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 18 }}>♥</div>
      <h1 style={{ fontSize: 36, margin: "0 0 8px", letterSpacing: "-0.03em" }}>Pulse</h1>
      <p style={{ margin: "0 0 28px", color: c.textMuted, maxWidth: 280, lineHeight: 1.5 }}>A calm home for the lists, trips, and notes your household shares.</p>
      {loading ? <Spinner label="Signing in" /> : (
        <Button isDark onClick={onGoogle} style={{ minWidth: 260 }}>Continue with Google</Button>
      )}
      {error && <p role="alert" style={{ color: c.danger, marginTop: 16 }}>{error}</p>}
      <p style={{ marginTop: tokens.space.xl, fontSize: 12, color: c.textFaint }}>Google is used to sync your family workspace.</p>
    </div>
  );
}
