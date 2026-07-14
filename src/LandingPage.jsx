import { useState, useEffect, useRef } from "react"
import { login } from "./lib/auth"
import logo from "./assets/braininventory_logo.jpg"

// ============================================================
// BRAND — change this one block if naam/tagline kabhi badalna ho
// ============================================================
const BRAND = {
  name: "Nectar",
  tagline: "Where cold leads turn warm.",
  parent: "Brain Inventory",
  author: "Manas Jain",
}

const C = {
  bg: "#FFFDF9",
  hive: "#1B1F27",       // hero panel — dark, honeycomb lives here
  card: "#FFFFFF",
  border: "#F1D9E5",
  cyan: "#00BCD4",
  cyanDim: "#00BCD41A",
  pink: "#FF5FA2",
  pinkDim: "#FF5FA21A",
  text: "#1B1F27",
  textMuted: "#6B7280",
  textDim: "#AAB2BD",
  red: "#EF4462",
  redDim: "#EF446215",
}

// A handful of specimen-style feature notes — this is a lead-collection
// tool, so the copy leans into "cataloguing" rather than generic SaaS talk.
const SPECIMENS = [
  { tag: "01 · Field", label: "Scrape & tag leads straight off Google Maps" },
  { tag: "02 · Signal", label: "AI reads every website, pulls the pitch-ready facts" },
  { tag: "03 · Flight", label: "Send, rotate senders, and watch inboxes in real time" },
]

export default function LandingPage({ onLoginSuccess }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [shake, setShake] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const pwRef = useRef(null)

  useEffect(() => {
    if (!document.getElementById("nectar-fonts")) {
      const link = document.createElement("link")
      link.id = "nectar-fonts"
      link.rel = "stylesheet"
      link.href = "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,650;1,9..144,500&family=Inter:wght@400;500;600;700&display=swap"
      document.head.appendChild(link)
    }
  }, [])

  // 👇 login() now hits the real backend (network call), so this is async.
  // No more artificial setTimeout delay — the real request IS the delay.
  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError("")
    try {
      const data = await login(username, password)
      // data = { ok, token, user, mustChangePassword }
      onLoginSuccess?.(data)
    } catch (err) {
      setError(err.message || "Login fail ho gaya")
      setShake(true)
      setTimeout(() => setShake(false), 420)
    }
    setSubmitting(false)
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @keyframes drift { from { transform: translate(0,0); } to { transform: translate(-60px,-40px); } }
        @keyframes shakeX {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
        @keyframes floatUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .nectar-input:focus { outline: none; border-color: ${C.cyan} !important; box-shadow: 0 0 0 3px ${C.cyanDim}; }
        .nectar-shake { animation: shakeX 0.4s ease; }
        ::selection { background: ${C.pinkDim}; }
      `}</style>

      {/* ── LEFT — hero / hive panel ── */}
      <div style={{
        flex: "1.15", position: "relative", overflow: "hidden",
        background: C.hive, color: "#fff",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "48px 56px", minWidth: 0,
      }}>
        {/* honeycomb texture — the signature element */}
        <svg
          width="640" height="640" viewBox="0 0 640 640"
          style={{ position: "absolute", top: "-120px", right: "-160px", opacity: 0.14, animation: "drift 26s ease-in-out infinite alternate" }}
        >
          <defs>
            <pattern id="hex" width="58" height="100.5" patternUnits="userSpaceOnUse" patternTransform="scale(1)">
              <path d="M29 0 L58 16.75 L58 50.25 L29 67 L0 50.25 L0 16.75 Z"
                fill="none" stroke={C.pink} strokeWidth="1.5" />
              <path d="M29 67 L58 83.75 L58 117.25 L29 134 L0 117.25 L0 83.75 Z"
                fill="none" stroke={C.cyan} strokeWidth="1.5" />
            </pattern>
          </defs>
          <rect width="640" height="640" fill="url(#hex)" />
        </svg>

        {/* top — brand mark */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10 }}>
          <img src={logo} alt={BRAND.parent} style={{
            width: 34, height: 34, borderRadius: 9, objectFit: "cover",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.15)",
          }} />
          <div style={{ fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>
            {BRAND.parent}
          </div>
        </div>

        {/* middle — the thesis */}
        <div style={{ position: "relative", maxWidth: 460 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: C.pink, marginBottom: 18, fontWeight: 600 }}>
            Outreach, catalogued
          </div>
          <h1 style={{
            fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic", fontWeight: 500,
            fontSize: "clamp(40px, 5vw, 60px)", lineHeight: 1.04, margin: "0 0 20px", letterSpacing: "-0.01em",
          }}>
            {BRAND.name}
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: "rgba(255,255,255,0.72)", margin: "0 0 36px", fontWeight: 400 }}>
            {BRAND.tagline} One dashboard to find leads, write to them, and know exactly who opened the door.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {SPECIMENS.map((s, i) => (
              <div key={s.tag} style={{
                display: "flex", alignItems: "baseline", gap: 14,
                animation: `floatUp 0.5s ease ${0.1 + i * 0.08}s both`,
                paddingBottom: 14, borderBottom: i < SPECIMENS.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
              }}>
                <span style={{ fontFamily: "'Fraunces', serif", fontSize: 12, color: C.cyan, letterSpacing: "0.06em", flexShrink: 0, width: 74 }}>{s.tag}</span>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* bottom — credit */}
        <div style={{ position: "relative", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          Built for {BRAND.parent} · by <span style={{ color: C.pink }}>{BRAND.author}</span>
        </div>
      </div>

      {/* ── RIGHT — auth card ── */}
      <div style={{ flex: "0.85", display: "flex", alignItems: "center", justifyContent: "center", padding: 32, minWidth: 380 }}>
        <form
          onSubmit={handleSubmit}
          className={shake ? "nectar-shake" : ""}
          style={{
            width: "100%", maxWidth: 340, background: C.card,
            border: `1px solid ${C.border}`, borderRadius: 18,
            padding: "36px 32px", boxShadow: "0 24px 60px rgba(27,31,39,0.06)",
          }}
        >
          <img src={logo} alt={BRAND.parent} style={{
            width: 40, height: 40, borderRadius: 11, marginBottom: 20, objectFit: "cover",
            boxShadow: `0 0 0 1px ${C.border}`,
          }} />

          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, margin: "0 0 6px", color: C.text }}>
            Welcome back
          </h2>
          <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 26px", lineHeight: 1.5 }}>
            Sign in to open the {BRAND.name} dashboard.
          </p>

          <label style={{ display: "block", fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            Username
          </label>
          <input
            className="nectar-input"
            value={username}
            onChange={e => { setUsername(e.target.value); setError("") }}
            onKeyDown={e => e.key === "Enter" && pwRef.current?.focus()}
            placeholder="admin"
            autoFocus
            style={{
              width: "100%", boxSizing: "border-box", padding: "11px 14px", marginBottom: 16,
              borderRadius: 9, border: `1px solid ${error ? C.red : C.border}`, fontSize: 14,
              fontFamily: "inherit", color: C.text, transition: "border-color .15s",
            }}
          />

          <label style={{ display: "block", fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            Password
          </label>
          <input
            ref={pwRef}
            className="nectar-input"
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError("") }}
            placeholder="••••••••"
            style={{
              width: "100%", boxSizing: "border-box", padding: "11px 14px", marginBottom: error ? 10 : 22,
              borderRadius: 9, border: `1px solid ${error ? C.red : C.border}`, fontSize: 14,
              fontFamily: "inherit", color: C.text, transition: "border-color .15s",
            }}
          />

          {error && (
            <div style={{
              background: C.redDim, color: C.red, fontSize: 12, padding: "8px 12px",
              borderRadius: 7, marginBottom: 16,
            }}>
              ⚠ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !username || !password}
            style={{
              width: "100%", padding: "12px 0", borderRadius: 9, border: "none",
              background: (!username || !password) ? C.border : `linear-gradient(135deg, ${C.pink}, ${C.cyan})`,
              color: "#fff", fontSize: 14, fontWeight: 700, cursor: (!username || !password) ? "not-allowed" : "pointer",
              fontFamily: "inherit", transition: "opacity .15s", opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "Opening the hive..." : "Sign in →"}
          </button>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: C.textDim }}>
            Session ke saath signed in — no need to log in daily.
          </div>
        </form>
      </div>
    </div>
  )
}