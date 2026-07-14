import { useState } from "react"
import { isAuthenticated, changePassword, logout } from "./lib/auth"
import LandingPage from "./LandingPage"

// Wrap your app entry with this: <AuthGate><Dashboard /></AuthGate>
// Session now lives as a signed token from the real backend (7 days),
// checked server-side on every request — not a fake local JWT anymore.
export default function AuthGate({ children }) {
  const [authed, setAuthed] = useState(() => isAuthenticated())
  const [mustChangePassword, setMustChangePassword] = useState(false)

  if (!authed) {
    return (
      <LandingPage
        onLoginSuccess={(mustChange) => {
          setAuthed(true)
          setMustChangePassword(!!mustChange)
        }}
      />
    )
  }

  if (mustChangePassword) {
    return <ForcePasswordChange onDone={() => setMustChangePassword(false)} />
  }

  return children
}

function ForcePasswordChange({ onDone }) {
  const [pw, setPw] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (pw.length < 6) return setError("Password kam se kam 6 characters ka hona chahiye")
    if (pw !== confirm) return setError("Dono password match nahi ho rahe")
    setSaving(true)
    const res = await changePassword(pw)
    setSaving(false)
    if (res.ok) onDone()
    else setError(res.error)
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FFFDF9", fontFamily: "Inter, system-ui, sans-serif" }}>
      <form onSubmit={submit} style={{ width: 340, background: "#fff", border: "1px solid #F1D9E5", borderRadius: 16, padding: 32 }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 20 }}>Naya password set karo</h2>
        <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 20px" }}>Pehli baar login kiya hai — apna password badal do.</p>
        <input type="password" placeholder="Naya password" value={pw} onChange={e => { setPw(e.target.value); setError("") }}
          style={{ width: "100%", boxSizing: "border-box", padding: "11px 14px", marginBottom: 12, borderRadius: 9, border: "1px solid #F1D9E5", fontSize: 14 }} autoFocus />
        <input type="password" placeholder="Confirm password" value={confirm} onChange={e => { setConfirm(e.target.value); setError("") }}
          style={{ width: "100%", boxSizing: "border-box", padding: "11px 14px", marginBottom: 16, borderRadius: 9, border: "1px solid #F1D9E5", fontSize: 14 }} />
        {error && <div style={{ background: "#EF446215", color: "#EF4462", fontSize: 12, padding: "8px 12px", borderRadius: 7, marginBottom: 16 }}>⚠ {error}</div>}
        <button type="submit" disabled={saving || !pw || !confirm} style={{
          width: "100%", padding: "12px 0", borderRadius: 9, border: "none",
          background: (!pw || !confirm) ? "#F1D9E5" : "linear-gradient(135deg, #FF5FA2, #00BCD4)",
          color: "#fff", fontSize: 14, fontWeight: 700, cursor: (!pw || !confirm) ? "not-allowed" : "pointer",
        }}>{saving ? "Saving..." : "Set password →"}</button>
      </form>
    </div>
  )
}