export function Spinner({ label = "Loading" }) {
  return (
    <div role="status" aria-live="polite" style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{
        width: 18, height: 18, borderRadius: "50%",
        border: "2px solid currentColor", borderRightColor: "transparent",
        display: "inline-block", animation: "pulse-spin 0.7s linear infinite",
      }} />
      <span>{label}</span>
      <style>{`@keyframes pulse-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
