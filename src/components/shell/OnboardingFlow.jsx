import { Button } from "../ui/Button.jsx";
import { Input } from "../ui/Input.jsx";
import { Spinner } from "../ui/Spinner.jsx";
import { palette, tokens } from "../../theme/tokens.js";

const c = palette(true);

function Chip({ selected, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      style={{
        flex: 1,
        minHeight: tokens.tap,
        borderRadius: tokens.radius.md,
        border: `1px solid ${selected ? c.accent : c.border}`,
        background: selected ? c.accentSoft : "transparent",
        color: selected ? c.accent : c.textMuted,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Frame({ children }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100dvh", background: c.bg, color: c.text, padding: "calc(24px + env(safe-area-inset-top)) 20px calc(24px + env(safe-area-inset-bottom))" }}>
      {children}
    </div>
  );
}

export function OnboardingFlow({
  step, user, loading, gender, setGender, onSelectRole,
  emails, names, genders, relations,
  setEmails, setNames, setGenders, setRelations,
  inviting, onInvite, onSkip, memberError, onBack, onSignOut, onSaveGender,
}) {
  if (step === "role" && user) {
    return (
      <Frame>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 420, width: "100%", margin: "0 auto" }}>
          <h2 style={{ fontSize: 28, margin: "0 0 6px", letterSpacing: "-0.03em" }}>Welcome, {user.name?.split(" ")[0]}</h2>
          <p style={{ margin: "0 0 20px", color: c.textMuted }}>How will you use Pulse?</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <Chip selected={gender === "male"} onClick={() => setGender("male")}>Male</Chip>
            <Chip selected={gender === "female"} onClick={() => setGender("female")}>Female</Chip>
          </div>
          {loading ? <Spinner label="Setting up" /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, opacity: gender ? 1 : 0.45 }}>
              <Button isDark disabled={!gender} onClick={() => onSelectRole("head")}>I'm the family head</Button>
              <Button isDark variant="ghost" disabled={!gender} onClick={() => onSelectRole("member")}>I'm a family member</Button>
              <p style={{ margin: 0, color: c.textFaint, fontSize: 13, lineHeight: 1.5 }}>The head creates the shared workspace. A member joins the head's lists.</p>
            </div>
          )}
        </div>
      </Frame>
    );
  }

  if (step === "add_members" && user) {
    return (
      <Frame>
        <h2 style={{ fontSize: 28, margin: "0 0 6px", letterSpacing: "-0.03em" }}>Add family members</h2>
        <p style={{ margin: "0 0 16px", color: c.textMuted }}>Invite them by email so they can open the same lists.</p>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {emails.map((email, i) => (
            <div key={i} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <Input id={`member-name-${i}`} isDark label="Name" value={names[i] || ""} onChange={(e) => { const n = [...names]; n[i] = e.target.value; setNames(n); }} />
                <Input id={`member-email-${i}`} isDark label="Email" type="email" value={email} onChange={(e) => { const n = [...emails]; n[i] = e.target.value; setEmails(n); }} />
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {[["male", "Male"], ["female", "Female"], ["boy", "Boy"], ["girl", "Girl"]].map(([id, label]) => (
                  <Chip key={id} selected={genders[i] === id} onClick={() => { const n = [...genders]; n[i] = id; setGenders(n); }}>{label}</Chip>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {[["spouse", "Spouse"], ["child", "Child"]].map(([id, label]) => (
                  <Chip key={id} selected={relations[i] === id} onClick={() => { const n = [...relations]; n[i] = id; setRelations(n); }}>{label}</Chip>
                ))}
              </div>
            </div>
          ))}
          <Button isDark variant="ghost" onClick={() => { setEmails((p) => [...p, ""]); setNames((p) => [...p, ""]); setGenders((p) => [...p, ""]); setRelations((p) => [...p, ""]); }}>Add another</Button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {emails.some((e) => e.includes("@")) && (
            <Button isDark disabled={inviting} onClick={onInvite}>{inviting ? "Inviting…" : "Add members and continue"}</Button>
          )}
          <Button isDark variant="ghost" onClick={onSkip}>Skip for now</Button>
        </div>
      </Frame>
    );
  }

  if (step === "gender" && user) {
    return (
      <Frame>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h2 style={{ fontSize: 28, margin: "0 0 6px" }}>Welcome back, {user.name?.split(" ")[0]}</h2>
          <p style={{ margin: "0 0 20px", color: c.textMuted }}>Choose a gender so Pulse can apply the right privacy rules.</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <Chip selected={gender === "male"} onClick={() => setGender("male")}>Male</Chip>
            <Chip selected={gender === "female"} onClick={() => setGender("female")}>Female</Chip>
          </div>
          <Button isDark disabled={!gender} onClick={onSaveGender}>Continue</Button>
        </div>
      </Frame>
    );
  }

  if (step === "member_wait" && user) {
    return (
      <Frame>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h2 style={{ fontSize: 28, margin: "0 0 8px" }}>Not registered yet</h2>
          <p role="alert" style={{ color: c.textMuted, lineHeight: 1.5 }}>{memberError}</p>
          <p style={{ color: c.textFaint, fontSize: 13 }}>Signed in as {user.email}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            <Button isDark variant="ghost" onClick={onBack}>Go back</Button>
            <Button isDark variant="danger" onClick={onSignOut}>Sign out</Button>
          </div>
        </div>
      </Frame>
    );
  }

  return null;
}
