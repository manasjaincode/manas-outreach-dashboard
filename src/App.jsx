import { useState, useEffect, useContext, createContext, useCallback, useRef } from "react";
import { searchPlacesMulti, getPlaceDetails, enrichLead } from "./config.js";
import EmailPage from "./EmailPage.jsx";
import ProposalGenerator from "./ProposalGenerator.jsx";   // 👈 ye add karo
import AuthGate from "./AuthGate.jsx";   // 👈 ye add karo
import { logout } from "./lib/auth.js";   // 👈 ye add karo
import AdminPanel from "./AdminPanel.jsx";
import { getCurrentUser } from "./lib/auth.js";
import { startLeadScrapeRadius, pollJob, listLeads, startAdvancedSearch, getAdvancedSearchQuota } from "./lib/api.js";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});
const COLORS = {
  bg: "#FFFFFF",
  surface: "#FFF7FA",
  card: "#FFFFFF",
  border: "#F1D9E5",
  borderHover: "#FF9EC4",
  accent: "#00BCD4",        // cyan — primary buttons/active states
  accentDim: "#00BCD41A",
  accentHover: "#00A5BD",
  pink: "#FF5FA2",          // 👈 NEW — creative highlight color
  pinkDim: "#FF5FA21A",
  green: "#0DB88E",
  greenDim: "#0DB88E15",
  amber: "#F5A524",
  amberDim: "#F5A52415",
  red: "#EF4462",
  redDim: "#EF446215",
  text: "#1B1F27",
  textSecondary: "#6B7280",
  textMuted: "#AAB2BD",
};
// ==================== FEEDBACK SYSTEM (toast + confirm modal) ====================
// Native alert()/confirm() ki jagah — ek baar banaya, poori app mein use hoga.

const FeedbackContext = createContext(null);

function useFeedback() {
  return useContext(FeedbackContext);
}

function FeedbackProvider({ children }) {
  const [toast, setToast] = useState(null);       // { message, type }
  const [confirmState, setConfirmState] = useState(null); // { message, resolve }

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const showConfirm = useCallback((message) => {
    return new Promise((resolve) => setConfirmState({ message, resolve }));
  }, []);

  const handleConfirm = (result) => {
    confirmState?.resolve(result);
    setConfirmState(null);
  };

  const toastColors = {
    info: { bg: "#00BCD4", text: "#fff" },
    success: { bg: "#0DB88E", text: "#fff" },
    error: { bg: "#EF4462", text: "#fff" },
  };

  return (
    <FeedbackContext.Provider value={{ showToast, showConfirm }}>
      <style>{`@keyframes nectar-spin { to { transform: rotate(360deg); } } @keyframes nectar-toast-in { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }`}</style>
      {children}

      {toast && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          background: toastColors[toast.type]?.bg || toastColors.info.bg,
          color: toastColors[toast.type]?.text || "#fff",
          padding: "12px 22px", borderRadius: 10, fontSize: 13, fontWeight: 500,
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)", zIndex: 9999, maxWidth: "80vw",
          animation: "nectar-toast-in 0.2s ease-out",
        }}>
          {toast.message}
        </div>
      )}

      {confirmState && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(20,20,25,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000,
        }} onClick={() => handleConfirm(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "#fff", borderRadius: 14, padding: "24px 26px", maxWidth: 360,
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          }}>
            <p style={{ fontSize: 14, color: "#1B1F27", margin: "0 0 20px", lineHeight: 1.5 }}>{confirmState.message}</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => handleConfirm(false)} style={{
                padding: "8px 16px", borderRadius: 8, border: "1px solid #F1D9E5",
                background: "transparent", color: "#6B7280", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              }}>Cancel</button>
              <button onClick={() => handleConfirm(true)} style={{
                padding: "8px 16px", borderRadius: 8, border: "none",
                background: "#EF4462", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

function Spinner({ size = 14, color = "#fff" }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size,
      border: `2px solid ${color}55`, borderTopColor: color,
      borderRadius: "50%", animation: "nectar-spin 0.7s linear infinite", flexShrink: 0,
    }} />
  );
}
const currentUser = getCurrentUser();
const NAV_ITEMS = [
  { id: "overview",  icon: "⬡", label: "Analytics" },
  { id: "leads",     icon: "◈", label: "Lead scraping" },
  { id: "totalLeads", icon: "📋", label: "Total Leads" },
  { id: "email",     icon: "✉", label: "Email" },
  { id: "proposals", icon: "✎", label: "Proposal Generator" },   // 👈 ye add karo

 ...(currentUser?.role === "admin" ? [{ id: "admin", icon: "⚙", label: "Admin Panel" }] : []),
];

const STAT_CARDS = [
  { label: "Total leads", value: "0", sub: "across all campaigns", color: COLORS.accent },
  { label: "Emails sent", value: "0", sub: "last 30 days", color: COLORS.green },
  { label: "Open rate", value: "—", sub: "avg across campaigns", color: COLORS.amber },
  { label: "Replies", value: "0", sub: "awaiting follow-up", color: COLORS.red },
];

export default function Dashboard() {
  return (
    <FeedbackProvider>
      <DashboardInner />
    </FeedbackProvider>
  );
}

function DashboardInner() {
  const [active, setActive] = useState("overview");
  const [hovered, setHovered] = useState(null);
  const { showConfirm } = useFeedback();
  const handleLogout = async () => {
    const ok = await showConfirm("Log out karna hai?");
    if (ok) {
      logout();
      window.location.reload();
    }
  };
 return (
    <AuthGate>
    <div style={{ display: "flex", height: "100vh", background: COLORS.bg, fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif", color: COLORS.text, overflow: "hidden" }}>
      <aside style={{ width: 220, background: COLORS.surface, borderRight: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "24px 20px 20px", borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
<div style={{ width: 28, height: 28, background: `linear-gradient(135deg, ${COLORS.pink}, ${COLORS.accent})`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>B</div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Brain Inventory</span>
          </div>
          <p style={{ fontSize: 10, color: COLORS.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Cold outreach suite</p>
        </div> 

        <nav style={{ flex: 1, padding: "12px 10px" }}>
          {NAV_ITEMS.map(item => {
            const isActive = active === item.id;
            return (
              <button key={item.id} onClick={() => setActive(item.id)}
                onMouseEnter={() => setHovered(item.id)} onMouseLeave={() => setHovered(null)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px",
                  borderRadius: 8, border: "none",
background: isActive ? COLORS.accentDim : hovered === item.id ? COLORS.pinkDim : "transparent",
                  color: isActive ? COLORS.accent : COLORS.textSecondary,
                  fontSize: 13, fontWeight: isActive ? 500 : 400, cursor: "pointer", textAlign: "left",
                  marginBottom: 2, transition: "all 0.15s ease",
                  borderLeft: isActive ? `2px solid ${COLORS.accent}` : "2px solid transparent",
                }}>
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                {item.label}
                {["leads", "proposals"].includes(item.id) && (
                  <span style={{
                    marginLeft: "auto", fontSize: 9, padding: "1px 6px", borderRadius: 10, fontWeight: 600,
                    background: COLORS.accent,
                    color: "#fff",
                  }}>NEW</span>
                )}
              </button>
            );
          })}
        </nav>

     <div style={{ padding: "16px 20px", borderTop: `1px solid ${COLORS.border}` }}>
  <p style={{ fontSize: 10, color: COLORS.textMuted, lineHeight: 1.6 }}>Built for Brain Inventory</p>
  <p style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 10 }}>by <span style={{ color: COLORS.accent }}>Manas Jain</span></p>
  <button onClick={handleLogout} style={{
    display: "flex", alignItems: "center", gap: 6, width: "100%",
    padding: "7px 10px", borderRadius: 7, border: `1px solid ${COLORS.border}`,
    background: "transparent", color: COLORS.textSecondary, fontSize: 12,
    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s ease",
  }}
    onMouseEnter={e => { e.currentTarget.style.background = COLORS.redDim; e.currentTarget.style.color = COLORS.red; e.currentTarget.style.borderColor = COLORS.red + "44"; }}
    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = COLORS.textSecondary; e.currentTarget.style.borderColor = COLORS.border; }}
  >
    ⏻ Log out
  </button>
</div>
      </aside>

      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        <header style={{ padding: "18px 32px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: COLORS.surface, flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.4px", margin: 0 }}>
              {NAV_ITEMS.find(n => n.id === active)?.label}
            </h1>
            <p style={{ fontSize: 12, color: COLORS.textSecondary, margin: "3px 0 0" }}>
              {active === "overview" && "Real-time performance across your outreach campaigns"}
              {active === "leads" && "Scrape targeted leads from Google Maps"}
              {active === "email" && "Compose, send and track cold emails via Brevo"}
                            {active === "totalLeads" && "Poori lead history — sab search se aaye leads ek jagah"}
              {active === "proposals" && "Generate psychology-driven proposals for client job posts"}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.green, boxShadow: `0 0 6px ${COLORS.green}` }} />
            <span style={{ fontSize: 12, color: COLORS.textSecondary }}>System ready</span>
          </div>
        </header>

        <div style={{ flex: 1, padding: "28px 32px" }}>
          {active === "overview"  && <OverviewPage setActive={setActive} />}
          {active === "leads"     && <LeadsPage />}
          {active === "totalLeads" && <TotalLeadsPage />}

{active === "email"     && <EmailPage leads={[]} />}
{active === "proposals" && <ProposalGenerator />}
        {active === "admin" && <AdminPanel />} 
        </div>
      </main>
    </div>  </AuthGate>
  );
}

// ==================== OVERVIEW / ANALYTICS ====================

function OverviewPage({ setActive }) {
  const [hoveredCard, setHoveredCard] = useState(null);

  const userName = "Manas";
  const initials = "MJ";
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  const funnelStages = [
    { label: "Leads scraped", value: 0, icon: "◈", color: COLORS.accent },
    { label: "Enriched",      value: 0, icon: "✦", color: COLORS.pink   },
    { label: "Emails sent",   value: 0, icon: "✉", color: COLORS.green  },
    { label: "Replies",       value: 0, icon: "↩", color: COLORS.amber  },
  ];

  const integrations = [
    { label: "Google Maps API",            status: "Connected",     live: true  },
    { label: "Website + email enrichment", status: "Active",        live: true  },
    { label: "Brevo SMTP",                 status: "Not connected", live: false },
  ];

  const eyebrow = { fontSize: 11, color: COLORS.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 };

  return (
    <div>
      {/* Greeting */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 46, height: 46, borderRadius: "50%",
            background: `linear-gradient(135deg, ${COLORS.pink}, ${COLORS.accent})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 15, fontWeight: 700, letterSpacing: "-0.3px",
            boxShadow: `0 6px 16px ${COLORS.accent}30`, flexShrink: 0,
          }}>{initials}</div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: "-0.3px" }}>Heyy {userName} 👋</h2>
            <p style={{ fontSize: 12.5, color: COLORS.textSecondary, margin: "3px 0 0" }}>
              Here's how your outreach engine is performing.
            </p>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: COLORS.textMuted, letterSpacing: "0.06em" }}>{today}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, justifyContent: "flex-end" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.green, boxShadow: `0 0 6px ${COLORS.green}` }} />
            <span style={{ fontSize: 11, color: COLORS.textSecondary }}>All systems live</span>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        {STAT_CARDS.map((card, i) => (
          <div key={i} onMouseEnter={() => setHoveredCard(i)} onMouseLeave={() => setHoveredCard(null)}
            style={{
              background: COLORS.card, border: `1px solid ${hoveredCard === i ? COLORS.borderHover : COLORS.border}`,
              borderRadius: 12, padding: "18px 20px", transition: "border-color 0.15s ease, transform 0.15s ease",
              transform: hoveredCard === i ? "translateY(-2px)" : "none",
            }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: card.color, boxShadow: `0 0 8px ${card.color}` }} />
              <span style={{ fontSize: 10, color: COLORS.textMuted, background: COLORS.surface, padding: "2px 7px", borderRadius: 20 }}>No data yet</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.8px" }}>{card.value}</div>
            <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 4 }}>{card.label}</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Outreach funnel — signature element, mirrors the product's real pipeline */}
      <p style={eyebrow}>Outreach funnel</p>
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "24px 28px", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {funnelStages.map((stage, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", flex: i < funnelStages.length - 1 ? 1 : "none" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 90 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", background: stage.color + "15",
                  border: `1.5px solid ${stage.color}44`, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, color: stage.color,
                }}>{stage.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{stage.value}</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted, textAlign: "center", whiteSpace: "nowrap" }}>{stage.label}</div>
              </div>
              {i < funnelStages.length - 1 && (
                <div style={{ flex: 1, height: 1, background: COLORS.border, margin: "0 6px 26px" }} />
              )}
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11.5, color: COLORS.textMuted, textAlign: "center", marginTop: 18, marginBottom: 0 }}>
          This fills in automatically as leads move from scraping → enrichment → email → reply.
        </p>
      </div>

      {/* Activity trend + system status */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "26px 28px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", minHeight: 220 }}>
          <div style={{ fontSize: 32, marginBottom: 10, color: COLORS.textMuted }}>◎</div>
          <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>No campaign activity yet</p>
          <p style={{ fontSize: 12, color: COLORS.textSecondary, margin: "6px 0 18px", maxWidth: 320 }}>
            Once you scrape leads and send your first emails, activity trends will show up here.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setActive("leads")} style={{ padding: "8px 18px", background: COLORS.accent, border: "none", borderRadius: 8, color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Scrape leads</button>
            <button onClick={() => setActive("email")} style={{ padding: "8px 18px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textSecondary, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Compose email</button>
          </div>
        </div>

        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "18px 22px" }}>
          <p style={{ ...eyebrow, marginBottom: 16 }}>System status</p>
          {integrations.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: i < integrations.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
              <span style={{ fontSize: 12.5, color: COLORS.textSecondary }}>{item.label}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: item.live ? COLORS.green : COLORS.textMuted }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: item.live ? COLORS.green : COLORS.textMuted }} />
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== EDITABLE CELL ====================

function EditableCell({ value, onChange, placeholder, minWidth = 140, multiline = false, color }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const commit = () => { onChange(draft); setEditing(false); };

  if (editing) {
    return multiline ? (
      <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={commit} onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) commit(); if (e.key === "Escape") setEditing(false); }}
        style={{ width: "100%", minWidth, minHeight: 60, background: COLORS.bg, border: `1px solid ${COLORS.accent}`, borderRadius: 4, color: COLORS.text, fontSize: 11, padding: 6, fontFamily: "inherit", outline: "none", resize: "vertical" }} />
    ) : (
      <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={commit} onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
        style={{ width: "100%", minWidth, background: COLORS.bg, border: `1px solid ${COLORS.accent}`, borderRadius: 4, color: COLORS.text, fontSize: 12, padding: "4px 6px", fontFamily: "inherit", outline: "none" }} />
    );
  }
  return (
    <div onClick={() => { setDraft(value || ""); setEditing(true); }} title="Click to edit"
      style={{ minWidth, minHeight: 20, cursor: "text", padding: "2px 4px", borderRadius: 4, color: value ? (color || COLORS.textSecondary) : COLORS.textMuted, fontSize: 12, whiteSpace: multiline ? "pre-wrap" : "nowrap", border: "1px solid transparent" }}
      onMouseEnter={e => e.currentTarget.style.border = `1px dashed ${COLORS.borderHover}`}
      onMouseLeave={e => e.currentTarget.style.border = "1px solid transparent"}>
      {value || placeholder || "—"}
    </div>
  );
}

// ==================== LEADS PAGE ====================
function confidenceColor(tier) {
  if (tier === "direct") return COLORS.green;
  if (tier === "pattern_mx") return COLORS.amber;
  if (tier === "pattern_only") return "#FF8A3D";
  if (tier === "web_search") return COLORS.accent;
  return COLORS.textMuted;
}
function confidenceLabel(tier) {
  if (tier === "direct") return "🟢 Direct";
  if (tier === "pattern_mx") return "🟡 Pattern+MX";
  if (tier === "pattern_only") return "🟠 Pattern only";
  if (tier === "web_search") return "🔵 Web search";
  return "—";
}
const ACTIVE_JOB_KEY = "nectar_active_lead_job";
const saveActiveJob = (job) => { try { localStorage.setItem(ACTIVE_JOB_KEY, JSON.stringify(job)); } catch {} };
const loadActiveJob = () => { try { return JSON.parse(localStorage.getItem(ACTIVE_JOB_KEY) || "null"); } catch { return null; } };
const clearActiveJob = () => { try { localStorage.removeItem(ACTIVE_JOB_KEY); } catch {} };
function LeadsPage() {
  const { showToast } = useFeedback();
  const [keywords, setKeywords] = useState([]);
  const [kwInput, setKwInput] = useState("");
  const [category, setCategory] = useState("");
  const [cities, setCities] = useState("");
  const [maxResults, setMaxResults] = useState(20);
  const [leads, setLeads] = useState([]);
  const [status, setStatus] = useState(null);
  const [filter, setFilter] = useState("");
// existing useState() ke saath add karo:
const [mode, setMode] = useState("city"); // "city" | "radius"
const [pincode, setPincode] = useState("");
const [radiusKm, setRadiusKm] = useState(4);
const [jobStatus, setJobStatus] = useState(null);
const [advancedSubMode, setAdvancedSubMode] = useState("city"); // reuses category/cities/pincode/radiusKm above
const [advStatus, setAdvStatus] = useState(null);
const [advElapsedSec, setAdvElapsedSec] = useState(0);
const [advQuota, setAdvQuota] = useState(null); // { used, cap }
const pollCleanupRef = useRef(null);
const secsTimerRef = useRef(null);

// Shared resume/attach logic — jobId + jobType diya, chahe naya job ho ya
// resume kiya gaya purana job, dono isi function se guzarte hain.
const resumeJobPolling = (jobId, jobType, startedAt) => {
  const isAdvanced = jobType === "advanced";

  if (secsTimerRef.current) clearInterval(secsTimerRef.current);
  secsTimerRef.current = setInterval(() => {
    const secs = Math.floor((Date.now() - startedAt) / 1000);
    if (isAdvanced) setAdvElapsedSec(secs); else setElapsedSec(secs);
  }, 1000);

  if (pollCleanupRef.current) pollCleanupRef.current();
  pollCleanupRef.current = pollJob(
    jobId,
    (job) => {
      let progressText = job.status;
      try {
        const p = JSON.parse(job.progress || "{}");
        if (jobType === "radius") {
          if (p.phase === "searching") progressText = `Searching area ${p.gridIndex ?? 0}/${(p.gridPoints||[]).length || 1}...`;
          else if (p.phase === "enriching") progressText = `Enriching ${p.enrichIndex ?? 0}/${(p.queue||[]).length ?? 0} leads...`;
        } else if (jobType === "advanced") {
          if (p.phase === "searching") progressText = "Searching...";
          else if (p.phase === "enriching") progressText = `Finding emails ${p.enrichIndex ?? 0}/${(p.queue||[]).length ?? 0} (3-layer)...`;
        }
      } catch {}
      if (isAdvanced) setAdvStatus(progressText); else setJobStatus(progressText);
    },
    async (job) => {
      clearInterval(secsTimerRef.current);
      clearActiveJob();
      if (job.status === "error") {
        showToast(`Error: ${job.resultSummary || "job failed"}`, "error");
      } else {
        const safeParseArray = (str) => { try { const p = JSON.parse(str); return Array.isArray(p) ? p : []; } catch { return []; } };
        const { leads: allLeads } = await listLeads();
        const jobLeads = allLeads.filter(l => l.searchJobId === jobId).map(l => ({
          ...l,
          points: typeof l.points === "string" ? l.points.split(" | ").filter(Boolean) : (l.points || []),
          people: typeof l.people === "string" ? safeParseArray(l.people) : (l.people || []),
          allEmails: typeof l.allEmails === "string" ? l.allEmails.split("; ").filter(Boolean) : (l.allEmails || []),
          keywords_found: l.keywords_found || [],
        }));
        setLeads(jobLeads);
        if (job.resultSummary) showToast(job.resultSummary, job.resultSummary.includes("limit khatam") ? "error" : "success");
      }
      if (isAdvanced) { setAdvStatus(null); getAdvancedSearchQuota().then(({ quota }) => setAdvQuota(quota)).catch(() => {}); }
      else setJobStatus(null);
    },
    3000
  );
};

// Mount pe (refresh ke baad YA tab switch karke wapas Leads pe aane par) —
// check karo koi job chal to nahi raha tha, agar haan to resume karo.
useEffect(() => {
  const saved = loadActiveJob();
  if (!saved) return;
  const { jobId, jobType, startedAt, category: c, cities: ct, pincode: pc, radiusKm: rk, maxResults: mr } = saved;

  setCategory(c || "");
  if (jobType === "city") setCities(ct || "");
  if (jobType === "radius" || jobType === "advanced") { setPincode(pc || ""); setRadiusKm(rk || 4); }
  setMode(jobType === "advanced" ? "advanced" : jobType === "radius" ? "radius" : "city");
  setMaxResults(mr || 20);

  const elapsedAtLoad = Math.floor((Date.now() - startedAt) / 1000);
  if (jobType === "advanced") { setAdvStatus("Resuming..."); setAdvElapsedSec(elapsedAtLoad); }
  else { setJobStatus("Resuming..."); setElapsedSec(elapsedAtLoad); }

  resumeJobPolling(jobId, jobType, startedAt);
}, []);

// Component hatte waqt (tab switch) intervals clean karo — duplicate na banein
useEffect(() => () => {
  if (pollCleanupRef.current) pollCleanupRef.current();
  if (secsTimerRef.current) clearInterval(secsTimerRef.current);
}, []);

useEffect(() => {
  getAdvancedSearchQuota().then(({ quota }) => setAdvQuota(quota)).catch(() => {});
}, []);
  const addKw = (e) => {
    if ((e.key === "Enter" || e.key === ",") && kwInput.trim()) {
      e.preventDefault();
      const kw = kwInput.trim().replace(/,$/, "");
      if (!keywords.includes(kw)) setKeywords([...keywords, kw]);
      setKwInput("");
    }
  };

  const updateLead = (index, patch) => setLeads(prev => prev.map((l, i) => i === index ? { ...l, ...patch } : l));
  const editField = (index, field) => (val) => updateLead(index, { [field]: val });
  const editPerson = (index, pi, field) => (val) => {
    setLeads(prev => prev.map((l, i) => {
      if (i !== index) return l;
      const people = [...(l.people || [])];
      while (people.length <= pi) people.push({ name: "", title: "", email: "" });
      people[pi] = { ...people[pi], [field]: val };
      return { ...l, people };
    }));
  };
  const addPersonSlot = (index) => setLeads(prev => prev.map((l, i) => i !== index ? l : { ...l, people: [...(l.people || []), { name: "", title: "", email: "" }] }));

  const startScrape = async () => {
if (!category || !cities) return showToast("Category aur cities daalo", "error");    
const target = parseInt(maxResults) || 20;
    const cityList = cities.split(",").map(c => c.trim()).filter(Boolean);
    setLeads([]);
    setStatus("Starting...");
    let runningIndex = 0;

    for (const city of cityList) {
      try {
        const places = await searchPlacesMulti(category, city, target, setStatus);
        if (!places.length) { setStatus(`${city}: koi result nahi mila`); continue; }
        setStatus(`${city}: ${places.length} places mile — details fetch ho raha hai...`);

        const basicLeads = [];
        for (const place of places) {
          const det = await getPlaceDetails(place.place_id);
          const details = det.result || {};
          basicLeads.push({
            name: place.name, category, city,
            phone: details.formatted_phone_number || details.international_phone_number || "",
            website: details.website || "", email: "", allEmails: [], points: [], people: [], linkedinUrl: "",
            address: details.formatted_address || "", rating: place.rating || "",
            keywords_found: keywords.filter(kw => JSON.stringify(details).toLowerCase().includes(kw.toLowerCase())),
            enriched: false, enriching: false,
          });
        }
        setLeads(prev => [...prev, ...basicLeads]);

        for (let i = 0; i < basicLeads.length; i++) {
          const idx = runningIndex + i;
          setStatus(`${city}: enriching ${i + 1}/${basicLeads.length} — ${basicLeads[i].name}`);
          updateLead(idx, { enriching: true });
          try {
            const enriched = await enrichLead(basicLeads[i]);
            updateLead(idx, { ...enriched, enriching: false });
          } catch { updateLead(idx, { enriching: false }); }
          await new Promise(r => setTimeout(r, 400));
        }
        runningIndex += basicLeads.length;
      } catch (err) {
if (err.message === 'REQUEST_DENIED') { showToast("Google Maps API key issue", "error"); setStatus(null); return; }
        setStatus(`Error: ${err.message}`);
      }
    }
    setStatus(null);
  };
  const [elapsedSec, setElapsedSec] = useState(0);

const startRadiusScrape = async () => {
  if (!category || !pincode) return showToast("Category aur pincode daalo", "error");
  setLeads([]);
  setJobStatus("Starting...");
  setElapsedSec(0);

  let jobId;
  try {
    const res = await startLeadScrapeRadius(pincode, radiusKm, category, parseInt(maxResults) || 20);
    jobId = res.jobId;
  } catch (err) {
    setJobStatus(null);
    return showToast(err.message, "error");
  }

  const startedAt = Date.now();
  const params = { category, pincode, radiusKm, maxResults: parseInt(maxResults) || 20 };
  saveActiveJob({ jobId, jobType: "radius", startedAt, ...params });
  resumeJobPolling(jobId, "radius", startedAt);
};
const startAdvancedSearchRun = async () => {
  if (!category) return showToast("Category daalo", "error");
  if (advancedSubMode === "city" && !cities) return showToast("Cities daalo", "error");
  if (advancedSubMode === "radius" && !pincode) return showToast("Pincode daalo", "error");

  setLeads([]);
  setAdvStatus("Starting...");
  setAdvElapsedSec(0);

  let jobId;
  try {
    const res = await startAdvancedSearch({
      searchMode: advancedSubMode,
      category,
      cities: advancedSubMode === "city" ? cities.split(",").map(c => c.trim()).filter(Boolean) : [],
      pincode: advancedSubMode === "radius" ? pincode : "",
      radiusKm: advancedSubMode === "radius" ? radiusKm : 0,
      maxResults: parseInt(maxResults) || 20,
    });
    jobId = res.jobId;
  } catch (err) {
    clearInterval(timer);
    setAdvStatus(null);
    return showToast(err.message, "error");
  }
const startedAt = Date.now();
  saveActiveJob({
    jobId, jobType: "advanced", startedAt,
    category, cities: advancedSubMode === "city" ? cities : "", pincode: advancedSubMode === "radius" ? pincode : "",
    radiusKm, maxResults: parseInt(maxResults) || 20,
  });
  resumeJobPolling(jobId, "advanced", startedAt);
};
  const maxPeopleCount = Math.max(1, ...leads.map(l => (l.people || []).length));

  const exportCSV = () => {
    const ph = []; for (let p = 0; p < maxPeopleCount; p++) ph.push(`Person ${p+1} Name`, `Person ${p+1} Designation`, `Person ${p+1} Email`);
    const headers = ["Business Name","Category","City","Keywords","Best Email","All Emails","Phone","Website","LinkedIn","Company Insights",...ph,"Address","Rating"];
    const rows = leads.map(l => {
      const pc = []; for (let p = 0; p < maxPeopleCount; p++) { const per = (l.people||[])[p]||{}; pc.push(per.name||"",per.title||"",per.email||""); }
      return [l.name,l.category,l.city,(l.keywords_found||[]).join("; "),l.email,(l.allEmails||[]).join("; "),l.phone,l.website,l.linkedinUrl||"",(l.points||[]).join(" | "),...pc,l.address||"",l.rating||""].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",");
    });
    const blob = new Blob([[headers.join(","),...rows].join("\n")],{type:"text/csv"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="leads.csv"; a.click();
  };

  const copyForSheets = () => {
    const ph = []; for (let p = 0; p < maxPeopleCount; p++) ph.push(`Person ${p+1} Name`, `Person ${p+1} Designation`, `Person ${p+1} Email`);
    const headers = ["Business Name","Category","City","Keywords","Best Email","All Emails","Phone","Website","LinkedIn","Company Insights",...ph,"Address","Rating","Status","Notes"];
    const rows = leads.map(l => {
      const pc = []; for (let p = 0; p < maxPeopleCount; p++) { const per = (l.people||[])[p]||{}; pc.push(per.name||"",per.title||"",per.email||""); }
      return [l.name,l.category,l.city,(l.keywords_found||[]).join("; "),l.email,(l.allEmails||[]).join("; "),l.phone,l.website,l.linkedinUrl||"",(l.points||[]).join(" | "),...pc,l.address||"",l.rating||"","New",""].join("\t");
    });
navigator.clipboard.writeText([headers.join("\t"),...rows].join("\n")).then(()=>showToast("Copied! Google Sheets → A1 → Ctrl+V", "success"));  };

  const filtered = leads.map((l,i)=>({...l,originalIndex:i})).filter(l=>{
    const q=filter.toLowerCase();
    return !q||l.name.toLowerCase().includes(q)||l.city.toLowerCase().includes(q)||(l.keywords_found||[]).some(k=>k.includes(q));
  });

  const iS = { width:"100%",padding:"9px 12px",background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:8,color:COLORS.text,fontSize:13,fontFamily:"inherit",outline:"none" };
  const lS = { fontSize:11,color:COLORS.textMuted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6,display:"block" };
  const thS = { padding:"9px 14px",textAlign:"left",fontSize:10,color:COLORS.textMuted,fontWeight:500,letterSpacing:"0.08em",textTransform:"uppercase",borderBottom:`1px solid ${COLORS.border}`,whiteSpace:"nowrap",position:"sticky",top:0,background:COLORS.surface,zIndex:1 };
  const tdS = { padding:"10px 14px",borderRight:`1px solid ${COLORS.border}`,verticalAlign:"top" };

  return (
    <div>
      <div style={{ background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"22px 24px",marginBottom:20 }}>
               {/* 👇 YAHAN — toggle daalo, card ke andar sabse pehli cheez */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["city", "radius", "advanced"].map(m => (
  <button key={m} onClick={() => setMode(m)}
    style={{
      padding: "7px 16px", borderRadius: 8, border: `1px solid ${mode===m?COLORS.accent:COLORS.border}`,
      background: mode===m ? COLORS.accentDim : "transparent",
      color: mode===m ? COLORS.accent : COLORS.textSecondary,
      fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
    }}>
    {m === "city" ? "🏙 City search" : m === "radius" ? "📍 Pincode + Radius" : "🔬 Advanced Search"}
  </button>
))}
        </div>
   {mode === "city" && (
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16 }}>
            <div><label style={lS}>Industry / Category</label><input style={iS} value={category} onChange={e=>setCategory(e.target.value)} placeholder="e.g. interior designers, CA firms, gyms" /></div>
            <div><label style={lS}>Cities (comma separated)</label><input style={iS} value={cities} onChange={e=>setCities(e.target.value)} placeholder="e.g. Indore, Bhopal, Pune" /></div>
          </div>
        )}

       {mode === "radius" && (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
    <div>
      <label style={lS}>Industry / Category</label>
      <input style={iS} value={category} onChange={e=>setCategory(e.target.value)} placeholder="e.g. interior designers, CA firms, gyms" />
    </div>
    <div>
      <label style={lS}>Pincode</label>
      <input style={iS} value={pincode} onChange={e => setPincode(e.target.value)} placeholder="e.g. 452001" maxLength={6} />
    </div>
    <div>
      <label style={lS}>Radius (km)</label>
      <select style={iS} value={radiusKm} onChange={e => setRadiusKm(Number(e.target.value))}>
        {[2,4,6,8,10].map(r => <option key={r} value={r}>{r} km</option>)}
      </select>
    </div>
  </div>
)}
{mode === "advanced" && (
  <div>
    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      {["city", "radius"].map(sm => (
        <button key={sm} onClick={() => setAdvancedSubMode(sm)} style={{
          padding: "5px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer",
          border: `1px solid ${advancedSubMode===sm?COLORS.accent:COLORS.border}`,
          background: advancedSubMode===sm ? COLORS.accentDim : "transparent",
          color: advancedSubMode===sm ? COLORS.accent : COLORS.textSecondary,
        }}>{sm === "city" ? "By city" : "By pincode + radius"}</button>
      ))}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: advancedSubMode === "city" ? "1fr 1fr" : "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
      <div><label style={lS}>Industry / Category</label><input style={iS} value={category} onChange={e=>setCategory(e.target.value)} placeholder="e.g. interior designers, CA firms, gyms" /></div>
      {advancedSubMode === "city" ? (
        <div><label style={lS}>Cities (comma separated)</label><input style={iS} value={cities} onChange={e=>setCities(e.target.value)} placeholder="e.g. Indore, Bhopal, Pune" /></div>
      ) : (
        <>
          <div><label style={lS}>Pincode</label><input style={iS} value={pincode} onChange={e=>setPincode(e.target.value)} placeholder="e.g. 452001" maxLength={6} /></div>
          <div><label style={lS}>Radius (km)</label><select style={iS} value={radiusKm} onChange={e=>setRadiusKm(Number(e.target.value))}>{[2,4,6,8,10].map(r=><option key={r} value={r}>{r} km</option>)}</select></div>
        </>
      )}
    </div>
    <div style={{ background: COLORS.accentDim, border: `1px solid ${COLORS.accent}33`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.6 }}>
      🔬 Multi-page crawl (contact/about/team pages) → pattern-guessed emails (MX-verified) → limited web-search fallback.
      Slower than the other modes — emails are <b>confidence-scored, never "verified."</b>
      {advQuota && <div style={{ marginTop: 6, color: advQuota.used >= advQuota.cap ? COLORS.red : COLORS.textSecondary }}>Web-search fallback used today: <b>{advQuota.used}/{advQuota.cap}</b></div>}
    </div>
  </div>
)}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16 }}>
          <div>
            <label style={lS}>Keywords to match on website</label>
            <div onClick={()=>document.getElementById("kwi").focus()} style={{ display:"flex",flexWrap:"wrap",gap:6,alignItems:"center",padding:"6px 10px",minHeight:40,background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:8,cursor:"text" }}>
              {keywords.map((kw,i)=>(
                <span key={i} style={{ background:COLORS.accentDim,color:COLORS.accent,fontSize:12,padding:"2px 8px",borderRadius:4,display:"flex",alignItems:"center",gap:4 }}>
                  {kw}<button onClick={()=>setKeywords(keywords.filter((_,j)=>j!==i))} style={{ background:"none",border:"none",color:COLORS.accent,cursor:"pointer",fontSize:14,lineHeight:1,padding:0 }}>×</button>
                </span>
              ))}
              <input id="kwi" value={kwInput} onChange={e=>setKwInput(e.target.value)} onKeyDown={addKw} style={{ border:"none",background:"none",color:COLORS.text,fontSize:13,outline:"none",minWidth:100,fontFamily:"inherit" }} placeholder={keywords.length?"":"Type + Enter..."} />
            </div>
          </div>
          <div><label style={lS}>Google Maps API Key</label><input style={iS} type="password" placeholder="AIza..." /></div>
        </div>

        <div style={{ display:"flex",alignItems:"center",gap:12,flexWrap:"wrap" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <label style={{ ...lS,margin:0,whiteSpace:"nowrap" }}>Leads per city</label>
            <input type="number" min="1" max="500" value={maxResults} onChange={e=>setMaxResults(Math.max(1,parseInt(e.target.value)||1))} style={{ ...iS,width:90,padding:"8px 10px",textAlign:"center" }} />
            {maxResults > 60 && <span style={{ fontSize:11,color:COLORS.amber }}>⚡ 60+ mode — multiple area searches chalenge</span>}
          </div>
<button
  onClick={mode === "city" ? startScrape : mode === "radius" ? startRadiusScrape : startAdvancedSearchRun}
  disabled={!!status || !!jobStatus || !!advStatus}
  style={{ padding:"9px 22px",background:COLORS.accent,border:"none",borderRadius:8,color:"#fff",fontSize:13,fontWeight:600,cursor:(status||jobStatus||advStatus)?"not-allowed":"pointer",fontFamily:"inherit",opacity:(status||jobStatus||advStatus)?0.7:1,display:"inline-flex",alignItems:"center",gap:8 }}>
  {(status||jobStatus||advStatus) && <Spinner size={13} />}
  {(status||jobStatus||advStatus) ? "Running..." : "◈ Start scraping"}
</button>
          {leads.length > 0 && <>
            <button onClick={exportCSV} style={{ padding:"9px 16px",background:"transparent",border:`1px solid ${COLORS.border}`,borderRadius:8,color:COLORS.textSecondary,fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>Export CSV</button>
            <button onClick={copyForSheets} style={{ padding:"9px 16px",background:"transparent",border:`1px solid ${COLORS.border}`,borderRadius:8,color:COLORS.textSecondary,fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>Copy for Sheets</button>
          </>}
        </div>
        {status && <div style={{ marginTop:12,fontSize:12,color:COLORS.amber,display:"flex",alignItems:"center",gap:8 }}><span style={{ width:6,height:6,borderRadius:"50%",background:COLORS.amber,display:"inline-block" }}/>{status}</div>}
{jobStatus && (
  <div style={{ marginTop:12,fontSize:12,color:COLORS.amber,display:"flex",alignItems:"center",gap:8 }}>
    <span style={{ width:6,height:6,borderRadius:"50%",background:COLORS.amber,display:"inline-block" }}/>
    {jobStatus} — {Math.floor(elapsedSec/60)}m {elapsedSec%60}s elapsed
  </div>
)}   
{advStatus && (
  <div style={{ marginTop:12,fontSize:12,color:COLORS.amber,display:"flex",alignItems:"center",gap:8 }}>
    <span style={{ width:6,height:6,borderRadius:"50%",background:COLORS.amber,display:"inline-block" }}/>
    {advStatus} — {Math.floor(advElapsedSec/60)}m {advElapsedSec%60}s elapsed
  </div>
)}

   </div>
  {/* 👇 YAHAN paste karo */}
      {mode === "radius" && leads.length > 0 && (
        <div style={{ height: 400, borderRadius: 12, overflow: "hidden", marginBottom: 20, border: `1px solid ${COLORS.border}` }}>
<MapContainer center={[leads.find(l=>l.lat)?.lat || 22.7196, leads.find(l=>l.lng)?.lng || 75.8577]} zoom={13} style={{ height: "100%", width: "100%" }}>            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            {leads.map((l, i) => l.lat && l.lng ? (
              <Marker key={i} position={[l.lat, l.lng]}>
                <Popup><b>{l.name}</b><br/>{l.address}<br/>{l.phone}</Popup>
              </Marker>
            ) : null)}
          </MapContainer>
        </div>
      )}
      {/* 👆 yahan tak */}

      {leads.length > 0 && (
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:12,marginBottom:20 }}>
          {[{label:"Total leads",value:leads.length,color:COLORS.accent},{label:"Emails found",value:leads.filter(l=>l.email).length,color:COLORS.green},{label:"Phones found",value:leads.filter(l=>l.phone).length,color:COLORS.amber},{label:"LinkedIn found",value:leads.filter(l=>l.linkedinUrl).length,color:COLORS.red}].map((s,i)=>(
            <div key={i} style={{ background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:10,padding:"14px 18px" }}>
              <div style={{ fontSize:24,fontWeight:600,color:s.color }}>{s.value}</div>
              <div style={{ fontSize:11,color:COLORS.textMuted,marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {leads.length > 0 && (
        <div style={{ background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,overflow:"hidden" }}>
          <div style={{ padding:"12px 16px",borderBottom:`1px solid ${COLORS.border}`,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <input style={{ ...iS,width:220,padding:"7px 12px" }} value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filter leads..." />
            <span style={{ fontSize:12,color:COLORS.textMuted }}>{filtered.length} leads — scroll horizontally for all columns →</span>
          </div>
          <div style={{ overflowX:"auto",overflowY:"auto",maxHeight:"65vh" }}>
            <table style={{ borderCollapse:"collapse",fontSize:12,tableLayout:"fixed" }}>
              <thead>
                <tr>
                  <th style={{ ...thS,minWidth:160 }}>Business</th>
                  <th style={{ ...thS,minWidth:100 }}>City</th>
                  <th style={{ ...thS,minWidth:140 }}>Keywords</th>
                  <th style={{ ...thS,minWidth:170 }}>Best email</th>
                  <th style={{ ...thS,minWidth:130 }}>Phone</th>
                  <th style={{ ...thS,minWidth:90 }}>Website</th>
                  <th style={{ ...thS,minWidth:90 }}>LinkedIn</th>
                  <th style={{ ...thS,minWidth:320 }}>Company insights</th>
                  <th style={{ ...thS,minWidth:130 }}>Confidence</th>
                  {Array.from({length:maxPeopleCount}).map((_,p)=>(
                    <th key={p} style={{ ...thS,minWidth:220 }}>Person {p+1} — Name / Title / Email</th>
                  ))}
                  <th style={{ ...thS,minWidth:90 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead=>{
                  const idx=lead.originalIndex;
                  const score=(lead.email?1:0)+(lead.phone?1:0)+(lead.website?1:0);
                  const badgeColor=lead.enriching?COLORS.amber:score===3?COLORS.green:score>0?COLORS.amber:COLORS.textMuted;
                  const badgeLabel=lead.enriching?"Enriching...":score===3?"Full":score>0?"Partial":"Low";
                  return (
                  <tr key={idx} style={{ borderBottom:`1px solid ${COLORS.border}` }}>
  <td style={tdS}><EditableCell value={lead.name} onChange={editField(idx,"name")} minWidth={150} color={COLORS.text}/></td>
  <td style={tdS}><EditableCell value={lead.city} onChange={editField(idx,"city")} minWidth={90}/></td>
  <td style={tdS}>
    <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
      {lead.keywords_found?.length?lead.keywords_found.map((k,j)=>(<span key={j} style={{ background:COLORS.accentDim,color:COLORS.accent,fontSize:10,padding:"1px 6px",borderRadius:3 }}>{k}</span>)):<span style={{ color:COLORS.textMuted }}>—</span>}
    </div>
  </td>
  <td style={tdS}>
    <EditableCell value={lead.email} onChange={editField(idx,"email")} minWidth={160} color={COLORS.green} placeholder={lead.enriching?"searching...":"click to add"}/>
    {lead.allEmails?.length>1&&<div style={{ fontSize:10,color:COLORS.textMuted,marginTop:2 }}>+{lead.allEmails.length-1} more found</div>}
  </td>
  <td style={tdS}><EditableCell value={lead.phone} onChange={editField(idx,"phone")} minWidth={120}/></td>
  <td style={tdS}>{lead.website?<a href={lead.website} target="_blank" rel="noreferrer" style={{ color:COLORS.accent,textDecoration:"none",fontSize:11 }}>Open ↗</a>:<EditableCell value={lead.website} onChange={editField(idx,"website")} minWidth={80} placeholder="add url"/>}</td>
  <td style={tdS}>{lead.linkedinUrl?<a href={lead.linkedinUrl} target="_blank" rel="noreferrer" style={{ color:COLORS.accent,textDecoration:"none",fontSize:11 }}>Open ↗</a>:<EditableCell value={lead.linkedinUrl} onChange={editField(idx,"linkedinUrl")} minWidth={80} placeholder={lead.enriching?"searching...":"add url"}/>}</td>
  <td style={tdS}><EditableCell value={(lead.points||[]).join("\n")} onChange={val=>updateLead(idx,{points:val.split("\n").filter(Boolean)})} minWidth={300} multiline placeholder={lead.enriching?"Analyzing website...":"click to add insights"}/></td>
  <td style={tdS}>
    {lead.confidenceTier ? (
      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 5, background: confidenceColor(lead.confidenceTier) + "20", color: confidenceColor(lead.confidenceTier) }}>
        {confidenceLabel(lead.confidenceTier)} {lead.confidenceScore ? `(${lead.confidenceScore})` : ""}
      </span>
    ) : <span style={{ color: COLORS.textMuted }}>—</span>}
  </td>
  {Array.from({length:maxPeopleCount}).map((_,p)=>{
    const person=(lead.people||[])[p]||{name:"",title:"",email:""};
    return (
      <td key={p} style={tdS}>
        <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
          <EditableCell value={person.name} onChange={editPerson(idx,p,"name")} minWidth={200} placeholder="Name" color={COLORS.text}/>
          <EditableCell value={person.title} onChange={editPerson(idx,p,"title")} minWidth={200} placeholder="Designation"/>
          <EditableCell value={person.email} onChange={editPerson(idx,p,"email")} minWidth={200} placeholder="Email" color={COLORS.green}/>
        </div>
      </td>
    );
  })}
  <td style={tdS}>
    <span style={{ fontSize:10,color:badgeColor,fontWeight:600 }}>{badgeLabel}</span>
    <div><button onClick={()=>addPersonSlot(idx)} style={{ background:"none",border:"none",color:COLORS.accent,fontSize:10,cursor:"pointer",padding:0,marginTop:6 }}>+ person</button></div>
  </td>
</tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {leads.length === 0 && (
        <div style={{ textAlign:"center",padding:"60px 20px",color:COLORS.textMuted }}>
          <div style={{ fontSize:40,marginBottom:12 }}>◈</div>
          <p style={{ fontSize:14,color:COLORS.textSecondary }}>Category, cities daalo aur scraping shuru karo</p>
          <p style={{ fontSize:12,marginTop:6 }}>Har cell editable hai — click karke directly type kar sakte ho</p>
        </div>
      )}
    </div>
  );
}
// ==================== TOTAL LEADS PAGE (poori history, unfiltered) ====================

function TotalLeadsPage() {
  const [allLeads, setAllLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    const safeParseArray = (str) => {
      try { const p = JSON.parse(str); return Array.isArray(p) ? p : []; } catch { return []; }
    };
    (async () => {
      try {
        setLoading(true);
        const { leads } = await listLeads();
        const normalized = (leads || []).map(l => ({
          ...l,
          allEmails: typeof l.allEmails === "string" ? l.allEmails.split("; ").filter(Boolean) : (l.allEmails || []),
        }));
        setAllLeads(normalized);
      } catch (err) {
        setError(err.message || "Leads load nahi ho paaye");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const iS = { width:"100%",padding:"9px 12px",background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:8,color:COLORS.text,fontSize:13,fontFamily:"inherit",outline:"none" };
  const thS = { padding:"9px 14px",textAlign:"left",fontSize:10,color:COLORS.textMuted,fontWeight:500,letterSpacing:"0.08em",textTransform:"uppercase",borderBottom:`1px solid ${COLORS.border}`,whiteSpace:"nowrap",position:"sticky",top:0,background:COLORS.surface,zIndex:1 };
  const tdS = { padding:"10px 14px",borderRight:`1px solid ${COLORS.border}`,verticalAlign:"top" };
const highlight = (text) => {
    const q = filter.trim();
    const str = String(text ?? "");
    if (q.length < 2) return str;
    const idx = str.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return str;
    return (
      <>
        {str.slice(0, idx)}
        <mark style={{ background: COLORS.amber + "55", color: COLORS.text, padding: "0 1px", borderRadius: 2 }}>
          {str.slice(idx, idx + q.length)}
        </mark>
        {str.slice(idx + q.length)}
      </>
    );
  };

  const filtered = allLeads.filter(l => {
    const q = filter.toLowerCase();
    if (!q) return true;
    return String(l.name||"").toLowerCase().includes(q)
      || String(l.city||"").toLowerCase().includes(q)
      || String(l.category||"").toLowerCase().includes(q)
      || String(l.email||"").toLowerCase().includes(q);
  });

  if (loading) {
    return <div style={{ textAlign:"center",padding:"60px 20px",color:COLORS.textMuted }}>Loading poori lead history...</div>;
  }
  if (error) {
    return <div style={{ textAlign:"center",padding:"60px 20px",color:COLORS.red }}>Error: {error}</div>;
  }

  return (
    <div>
      {allLeads.length > 0 && (
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:12,marginBottom:20 }}>
          {[
            { label:"Total leads (all time)", value: allLeads.length, color: COLORS.accent },
            { label:"With email", value: allLeads.filter(l=>l.email).length, color: COLORS.green },
            { label:"With phone", value: allLeads.filter(l=>l.phone).length, color: COLORS.amber },
            { label:"Unique search jobs", value: new Set(allLeads.map(l=>l.searchJobId).filter(Boolean)).size, color: COLORS.red },
          ].map((s,i)=>(
            <div key={i} style={{ background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:10,padding:"14px 18px" }}>
              <div style={{ fontSize:24,fontWeight:600,color:s.color }}>{s.value}</div>
              <div style={{ fontSize:11,color:COLORS.textMuted,marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,overflow:"hidden" }}>
        <div style={{ padding:"12px 16px",borderBottom:`1px solid ${COLORS.border}`,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <input style={{ ...iS,width:260,padding:"7px 12px" }} value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Naam, city, category ya email se search karo..." />
          <span style={{ fontSize:12,color:COLORS.textMuted }}>{filtered.length} / {allLeads.length} leads</span>
        </div>
        <div style={{ overflowX:"auto",overflowY:"auto",maxHeight:"70vh" }}>
          <table style={{ borderCollapse:"collapse",fontSize:12,tableLayout:"fixed",width:"100%" }}>
            <thead>
              <tr>
                <th style={{ ...thS,minWidth:160 }}>Business</th>
                <th style={{ ...thS,minWidth:120 }}>Category</th>
                <th style={{ ...thS,minWidth:100 }}>City / Pincode</th>
                <th style={{ ...thS,minWidth:170 }}>Best email</th>
                <th style={{ ...thS,minWidth:120 }}>Phone</th>
                <th style={{ ...thS,minWidth:90 }}>Website</th>
                <th style={{ ...thS,minWidth:70 }}>Rating</th>
                <th style={{ ...thS,minWidth:140 }}>Search Job ID</th>
                <th style={{ ...thS,minWidth:140 }}>Created At</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => (
                <tr key={l.id || i} style={{ borderBottom:`1px solid ${COLORS.border}` }}>
             <td style={tdS}>{highlight(l.name)}</td>
                  <td style={tdS}>{highlight(l.category)}</td>
                  <td style={tdS}>{highlight(l.city)}</td>
                  <td style={{ ...tdS, color: l.email ? COLORS.green : COLORS.textMuted }}>{l.email ? highlight(l.email) : "—"}</td>
                  <td style={tdS}>{l.phone || "—"}</td>
                  <td style={tdS}>{l.website ? <a href={l.website} target="_blank" rel="noreferrer" style={{ color:COLORS.accent,textDecoration:"none" }}>Open ↗</a> : "—"}</td>
                  <td style={tdS}>{l.rating || "—"}</td>
                  <td style={{ ...tdS, fontSize:10, color:COLORS.textMuted }}>{l.searchJobId || "—"}</td>
                  <td style={{ ...tdS, fontSize:10, color:COLORS.textMuted }}>{l.createdAt || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {allLeads.length === 0 && (
        <div style={{ textAlign:"center",padding:"60px 20px",color:COLORS.textMuted }}>
          <div style={{ fontSize:40,marginBottom:12 }}>📋</div>
          <p style={{ fontSize:14,color:COLORS.textSecondary }}>Abhi tak koi lead scrape nahi hua</p>
        </div>
      )}
    </div>
  );
}    