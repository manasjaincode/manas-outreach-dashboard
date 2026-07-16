import { useState, useEffect } from "react";
import * as api from "./lib/api.js";
import { getCurrentUser } from "./lib/auth.js";
// ============================================================
// COLORS — matches the rest of the dashboard (Dashboard.jsx / EmailPage.jsx)
// ============================================================
const C = {
  bg: "#FFFFFF", surface: "#FFF7FA", card: "#FFFFFF",
  border: "#F1D9E5", border2: "#E3AFC7",
  accent: "#00BCD4", accentDim: "#00BCD41A",
  green: "#0DB88E", greenDim: "#0DB88E15",
  red: "#EF4462", redDim: "#EF446215",
  yellow: "#F5A524", yellowDim: "#F5A52415",
  pink: "#FF5FA2",
  text: "#1B1F27", textMuted: "#6B7280", textDim: "#AAB2BD",
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [toast])
  if (!toast) return null
  const isError = toast.type === "error"
  return (
    <div style={{
      position: "fixed", bottom: 28, right: 28, zIndex: 3000,
      display: "flex", alignItems: "center", gap: 10,
      background: isError ? C.red : C.green,
      color: "#fff", padding: "13px 20px", borderRadius: 10,
      fontSize: 13, fontWeight: 600, boxShadow: "0 14px 36px rgba(0,0,0,0.35)",
    }}>
      <span style={{ fontSize: 16 }}>{isError ? "⚠️" : "✅"}</span>
      <span>{toast.message}</span>
    </div>
  )
}

export default function AdminPanel() {
const currentUser = getCurrentUser()
  const [toast, setToast] = useState(null)
  const showToast = (message, type = "success") => setToast({ id: Date.now(), message, type })
  const showApiError = (err) => showToast(err?.message || "Kuch galat ho gaya", "error")

  const [tab, setTab] = useState("team") // "team" | "analytics"

  // ── Team list ──
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  const loadUsers = async () => {
    setLoadingUsers(true)
    try { const { users: rows } = await api.listUsers(); setUsers(rows) }
    catch (err) { showApiError(err) }
    setLoadingUsers(false)
  }
  useEffect(() => { loadUsers() }, [])

  // ── Add member form ──
  const [showAddForm, setShowAddForm] = useState(false)
  const [newUsername, setNewUsername] = useState("")
  const [newTempPassword, setNewTempPassword] = useState("")
  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newRole, setNewRole] = useState("member")
  const [creating, setCreating] = useState(false)

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
    let pw = ""
    for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)]
    setNewTempPassword(pw + "!")
  }

  const handleCreateMember = async () => {
    if (!newUsername.trim() || !newTempPassword.trim() || !newName.trim()) {
      showToast("Username, temp password aur naam — teeno zaroori hain", "error")
      return
    }
    setCreating(true)
    try {
      await api.createTeamMember({
        username: newUsername.trim(),
        tempPassword: newTempPassword.trim(),
        name: newName.trim(),
        role: newRole,
        email: newEmail.trim(),
      })
      showToast(`${newName} add ho gaya! Unhe batao: username "${newUsername.trim()}", temp password "${newTempPassword.trim()}"`, "success")
      setNewUsername(""); setNewTempPassword(""); setNewName(""); setNewEmail(""); setNewRole("member")
      setShowAddForm(false)
      loadUsers()
    } catch (err) { showApiError(err) }
    setCreating(false)
  }

  // ── Reset password modal ──
  const [resetTarget, setResetTarget] = useState(null) // user object
  const [resetPassword, setResetPassword] = useState("")
  const [resetting, setResetting] = useState(false)

  const openResetModal = (user) => {
    setResetTarget(user)
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
    let pw = ""
    for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)]
    setResetPassword(pw + "!")
  }

  const handleResetPassword = async () => {
    if (!resetTarget || !resetPassword.trim()) return
    setResetting(true)
    try {
      await api.resetUserPassword(resetTarget.id, resetPassword.trim())
      showToast(`Password reset ho gaya ${resetTarget.name} ke liye. Naya temp password: "${resetPassword.trim()}"`, "success")
      setResetTarget(null)
      loadUsers()
    } catch (err) { showApiError(err) }
    setResetting(false)
  }

  // ── Analytics ──
  const [analytics, setAnalytics] = useState(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  const loadAnalytics = async () => {
    setLoadingAnalytics(true)
    try { const { analytics: a } = await api.getAnalytics(); setAnalytics(a) }
    catch (err) { showApiError(err) }
    setLoadingAnalytics(false)
  }
  useEffect(() => { if (tab === "analytics") loadAnalytics() }, [tab])

  const StatCard = ({ label, value, sub, color }) => (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || C.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>{sub}</div>}
    </div>
  )

  return (
    <div style={{ padding: 0 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab("team")} style={{
          padding: "8px 18px", borderRadius: 8, fontSize: 13, cursor: "pointer",
          border: `1px solid ${tab === "team" ? C.accent : C.border}`,
          background: tab === "team" ? C.accentDim : "transparent",
          color: tab === "team" ? C.accent : C.textMuted, fontWeight: tab === "team" ? 600 : 400,
        }}>👥 Team</button>
        <button onClick={() => setTab("analytics")} style={{
          padding: "8px 18px", borderRadius: 8, fontSize: 13, cursor: "pointer",
          border: `1px solid ${tab === "analytics" ? C.accent : C.border}`,
          background: tab === "analytics" ? C.accentDim : "transparent",
          color: tab === "analytics" ? C.accent : C.textMuted, fontWeight: tab === "analytics" ? 600 : 400,
        }}>📊 Team Analytics</button>
      </div>

      {/* ── TEAM TAB ── */}
      {tab === "team" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: C.textMuted }}>{users.length} team member{users.length !== 1 ? "s" : ""}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={loadUsers} disabled={loadingUsers} style={{ padding: "8px 14px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.card, color: C.text, cursor: "pointer", fontSize: 12 }}>
                {loadingUsers ? "..." : "🔄 Refresh"}
              </button>
              <button onClick={() => setShowAddForm(v => !v)} style={{ padding: "8px 16px", borderRadius: 7, border: "none", background: C.accent, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                {showAddForm ? "✕ Cancel" : "+ Add Team Member"}
              </button>
            </div>
          </div>

          {showAddForm && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 22px", marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>New team member</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4, textTransform: "uppercase" }}>Full Name</div>
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Priya Sharma"
                    style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 7, border: `1px solid ${C.border2}`, fontSize: 13 }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4, textTransform: "uppercase" }}>Username</div>
                  <input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="priya"
                    style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 7, border: `1px solid ${C.border2}`, fontSize: 13 }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4, textTransform: "uppercase" }}>Email (optional)</div>
                  <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="priya@braininventory.com"
                    style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 7, border: `1px solid ${C.border2}`, fontSize: 13 }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4, textTransform: "uppercase" }}>Role</div>
                  <select value={newRole} onChange={e => setNewRole(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 7, border: `1px solid ${C.border2}`, fontSize: 13, cursor: "pointer" }}>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4, textTransform: "uppercase" }}>Temporary Password</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={newTempPassword} onChange={e => setNewTempPassword(e.target.value)} placeholder="Auto-generate ya khud likho"
                    style={{ flex: 1, boxSizing: "border-box", padding: "9px 12px", borderRadius: 7, border: `1px solid ${C.border2}`, fontSize: 13, fontFamily: "monospace" }} />
                  <button onClick={generatePassword} style={{ padding: "9px 14px", borderRadius: 7, border: `1px solid ${C.border2}`, background: C.surface, color: C.text, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}>🎲 Generate</button>
                </div>
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>Woh pehli baar login karke khud apna password badal denge.</div>
              </div>
              <button onClick={handleCreateMember} disabled={creating} style={{
                padding: "10px 24px", borderRadius: 8, border: "none", background: C.green, color: "#fff",
                cursor: creating ? "wait" : "pointer", fontSize: 13, fontWeight: 700, opacity: creating ? 0.7 : 1,
              }}>{creating ? "Adding..." : "✅ Create Account"}</button>
            </div>
          )}

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            {users.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: C.textMuted, fontSize: 13 }}>
                {loadingUsers ? "Loading..." : "Koi team member nahi mila."}
              </div>
            ) : users.map((u, i) => (
              <div key={u.id} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "14px 20px",
                borderBottom: i < users.length - 1 ? `1px solid ${C.border}` : "none",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: u.role === "admin" ? `linear-gradient(135deg, ${C.pink}, ${C.accent})` : C.accentDim,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: u.role === "admin" ? "#fff" : C.accent, fontWeight: 700, fontSize: 14, flexShrink: 0,
                }}>{(u.name || u.username)[0]?.toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</span>
                    <span style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 600, textTransform: "uppercase",
                      background: u.role === "admin" ? C.pink + "1A" : C.greenDim,
                      color: u.role === "admin" ? C.pink : C.green,
                    }}>{u.role}</span>
                    {u.mustChangePassword && (
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: C.yellowDim, color: C.yellow, fontWeight: 600 }}>
                        ⚠️ password not changed yet
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                    @{u.username}{u.email ? ` · ${u.email}` : ""} · joined {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                  </div>
                </div>
                {u.username !== currentUser?.username && (
                  <button onClick={() => openResetModal(u)} style={{
                    fontSize: 12, padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.border2}`,
                    background: "transparent", color: C.textMuted, cursor: "pointer",
                  }}>🔑 Reset Password</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ANALYTICS TAB ── */}
      {tab === "analytics" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: C.textMuted }}>Company-wide outreach performance</div>
            <button onClick={loadAnalytics} disabled={loadingAnalytics} style={{ padding: "8px 14px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.card, color: C.text, cursor: "pointer", fontSize: 12 }}>
              {loadingAnalytics ? "..." : "🔄 Refresh"}
            </button>
          </div>

          {!analytics ? (
            <div style={{ color: C.textMuted, textAlign: "center", padding: 60 }}>{loadingAnalytics ? "Loading..." : "Click Refresh"}</div>
          ) : (
            <>
              <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Global (all team members combined)</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 28 }}>
                <StatCard label="Total Leads" value={analytics.global.totalLeads} color={C.accent} />
                <StatCard label="Emails Sent" value={analytics.global.emailsSent} color={C.green} />
                <StatCard label="Failed" value={analytics.global.emailsFailed} color={analytics.global.emailsFailed > 0 ? C.red : C.textMuted} />
                <StatCard label="Opened" value={analytics.global.opened} sub={`${analytics.global.openRate}% open rate`} color={C.accent} />
                <StatCard label="Bounced" value={analytics.global.bounced} color={analytics.global.bounced > 0 ? C.yellow : C.textMuted} />
                <StatCard label="Spam Reports" value={analytics.global.spam} color={analytics.global.spam > 0 ? C.red : C.textMuted} />
              </div>

              <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Per-member breakdown</div>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(6, 1fr)", padding: "10px 20px", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
                  {["Member", "Leads", "Sent", "Failed", "Opened", "Open %", "Spam/Bounce"].map(h => (
                    <div key={h} style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>{h}</div>
                  ))}
                </div>
                {analytics.perMember.length === 0 ? (
                  <div style={{ padding: 30, textAlign: "center", color: C.textDim, fontSize: 12 }}>Koi member data nahi.</div>
                ) : analytics.perMember.map((m, i) => (
                  <div key={m.username} style={{
                    display: "grid", gridTemplateColumns: "1.4fr repeat(6, 1fr)", padding: "12px 20px", alignItems: "center",
                    borderBottom: i < analytics.perMember.length - 1 ? `1px solid ${C.border}` : "none",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}<div style={{ fontSize: 11, color: C.textMuted, fontWeight: 400 }}>@{m.username}</div></div>
                    <div style={{ fontSize: 13 }}>{m.totalLeads}</div>
                    <div style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>{m.emailsSent}</div>
                    <div style={{ fontSize: 13, color: m.emailsFailed > 0 ? C.red : C.textMuted }}>{m.emailsFailed}</div>
                    <div style={{ fontSize: 13 }}>{m.opened}</div>
                    <div style={{ fontSize: 13, color: C.accent }}>{m.openRate}%</div>
                    <div style={{ fontSize: 12 }}>
                      {m.spam > 0 && <span style={{ color: C.red, fontWeight: 700, marginRight: 8 }}>🚨 {m.spam}</span>}
                      {m.bounced > 0 && <span style={{ color: C.yellow }}>⚠️ {m.bounced}</span>}
                      {m.spam === 0 && m.bounced === 0 && <span style={{ color: C.textDim }}>—</span>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── RESET PASSWORD MODAL ── */}
      {resetTarget && (
        <>
          <div onClick={() => setResetTarget(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000 }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            width: "min(420px, 90vw)", background: C.card, border: `1px solid ${C.border2}`, borderRadius: 14,
            padding: 24, zIndex: 1001, boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>🔑 Reset password for {resetTarget.name}</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>Naya temp password set hoga — unko login karke khud change karna hoga.</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              <input value={resetPassword} onChange={e => setResetPassword(e.target.value)}
                style={{ flex: 1, padding: "9px 12px", borderRadius: 7, border: `1px solid ${C.border2}`, fontSize: 13, fontFamily: "monospace" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleResetPassword} disabled={resetting} style={{
                flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: C.accent, color: "#fff",
                cursor: resetting ? "wait" : "pointer", fontSize: 13, fontWeight: 700,
              }}>{resetting ? "Resetting..." : "Confirm Reset"}</button>
              <button onClick={() => setResetTarget(null)} style={{
                flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${C.border2}`, background: "transparent",
                color: C.textMuted, cursor: "pointer", fontSize: 13,
              }}>Cancel</button>
            </div>
          </div>
        </>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}