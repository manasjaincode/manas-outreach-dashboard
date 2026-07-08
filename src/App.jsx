import { useState } from "react";
import { searchPlacesMulti, getPlaceDetails, enrichLead, ALL_FUNDING_SOURCES, fetchUpworkJobs, getUpworkSearchUrl, UPWORK_CATEGORIES } from "./config.js";
import EmailPage from "./EmailPage.jsx";
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

const NAV_ITEMS = [
  { id: "overview",  icon: "⬡", label: "Overview" },
  { id: "leads",     icon: "◈", label: "Lead scraping" },
  { id: "startups",  icon: "◉", label: "Startup Funding" },
  { id: "freelance", icon: "◐", label: "Freelance Jobs" },
  { id: "email",     icon: "✉", label: "Email" },

];

const STAT_CARDS = [
  { label: "Total leads", value: "0", sub: "across all campaigns", color: COLORS.accent },
  { label: "Emails sent", value: "0", sub: "last 30 days", color: COLORS.green },
  { label: "Open rate", value: "—", sub: "avg across campaigns", color: COLORS.amber },
  { label: "Replies", value: "0", sub: "awaiting follow-up", color: COLORS.red },
];

export default function Dashboard() {
  const [active, setActive] = useState("overview");
  const [hovered, setHovered] = useState(null);

  return (
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
                {["leads","startups","freelance"].includes(item.id) && (
                  <span style={{
                    marginLeft: "auto", fontSize: 9, padding: "1px 6px", borderRadius: 10, fontWeight: 600,
                    background: item.id === "leads" ? COLORS.accent : item.id === "startups" ? COLORS.green : COLORS.amber,
                    color: item.id === "freelance" ? "#000" : "#fff",
                  }}>NEW</span>
                )}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: "16px 20px", borderTop: `1px solid ${COLORS.border}` }}>
          <p style={{ fontSize: 10, color: COLORS.textMuted, lineHeight: 1.6 }}>Built for Brain Inventory</p>
          <p style={{ fontSize: 10, color: COLORS.textMuted }}>by <span style={{ color: COLORS.accent }}>Manas Jain</span></p>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        <header style={{ padding: "18px 32px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: COLORS.surface, flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.4px", margin: 0 }}>
              {NAV_ITEMS.find(n => n.id === active)?.label}
            </h1>
            <p style={{ fontSize: 12, color: COLORS.textSecondary, margin: "3px 0 0" }}>
              {active === "overview" && "Your cold email automation hub"}
              {active === "leads" && "Scrape targeted leads from Google Maps"}
              {active === "startups" && "Newly funded startups — company info, founder, email, phone auto-extracted"}
              {active === "freelance" && "Find remote freelance projects — Remotive, Arbeitnow, Himalayas"}
              {active === "email" && "Compose, send and track cold emails via Brevo"}
          
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
          {active === "startups"  && <StartupFundingPage />}
          {active === "freelance" && <FreelancePage />}
{active === "email"     && <EmailPage leads={[]} />}
         
        </div>
      </main>
    </div>
  );
}

// ==================== OVERVIEW ====================

function OverviewPage({ setActive }) {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredAction, setHoveredAction] = useState(null);

  const quickActions = [
    { id: "leads",    icon: "◈", title: "Scrape leads",      desc: "Google Maps se targeted businesses nikalo — category aur city ke basis pe", color: COLORS.accent, dimColor: COLORS.accentDim, badge: "Start here" },
    { id: "startups", icon: "◉", title: "Startup funding",   desc: "Newly funded startups — founder, email, phone automatically extract hoga", color: COLORS.green,  dimColor: COLORS.greenDim,  badge: null },
    { id: "freelance",icon: "◐", title: "Freelance projects",desc: "Remote jobs from Remotive, Arbeitnow, Himalayas — direct apply links", color: COLORS.amber, dimColor: COLORS.amberDim, badge: null },
{ id: "analytics",icon: "◎", title: "View analytics",    desc: "Brevo se real-time open rate, clicks, bounces track karo", color: COLORS.pink, dimColor: COLORS.pinkDim, badge: null },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 32 }}>
        {STAT_CARDS.map((card, i) => (
          <div key={i} onMouseEnter={() => setHoveredCard(i)} onMouseLeave={() => setHoveredCard(null)}
            style={{ background: COLORS.card, border: `1px solid ${hoveredCard === i ? COLORS.borderHover : COLORS.border}`, borderRadius: 12, padding: "18px 20px", transition: "border-color 0.15s ease" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: card.color, marginBottom: 14, boxShadow: `0 0 8px ${card.color}` }} />
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.8px" }}>{card.value}</div>
            <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 4 }}>{card.label}</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11, color: COLORS.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Quick actions</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
        {quickActions.map(action => (
          <button key={action.id} onClick={() => setActive(action.id)}
            onMouseEnter={() => setHoveredAction(action.id)} onMouseLeave={() => setHoveredAction(null)}
            style={{ background: hoveredAction === action.id ? action.dimColor : COLORS.card, border: `1px solid ${hoveredAction === action.id ? action.color + "44" : COLORS.border}`, borderRadius: 12, padding: "20px 22px", cursor: "pointer", textAlign: "left", transition: "all 0.15s ease", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 20, color: action.color }}>{action.icon}</span>
              {action.badge && <span style={{ fontSize: 9, background: action.color, color: "#fff", padding: "2px 8px", borderRadius: 10, fontWeight: 600, textTransform: "uppercase" }}>{action.badge}</span>}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{action.title}</div>
            <div style={{ fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.5 }}>{action.desc}</div>
          </button>
        ))}
      </div>

      <p style={{ fontSize: 11, color: COLORS.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Pipeline status</p>
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "18px 22px" }}>
        {[
          { label: "Google Maps API", status: "Connected", color: COLORS.green },
          { label: "Website + Email enrichment", status: "Active (Gemini)", color: COLORS.green },
          { label: "Startup news (Google News RSS)", status: "Active", color: COLORS.green },
          { label: "Brevo SMTP", status: "Not configured", color: COLORS.textMuted },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 3 ? `1px solid ${COLORS.border}` : "none" }}>
            <span style={{ fontSize: 13, color: COLORS.textSecondary }}>{item.label}</span>
            <span style={{ fontSize: 12, color: item.color }}>{item.status}</span>
          </div>
        ))}
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

function LeadsPage() {
  const [keywords, setKeywords] = useState([]);
  const [kwInput, setKwInput] = useState("");
  const [category, setCategory] = useState("");
  const [cities, setCities] = useState("");
  const [maxResults, setMaxResults] = useState(20);
  const [leads, setLeads] = useState([]);
  const [status, setStatus] = useState(null);
  const [filter, setFilter] = useState("");

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
    if (!category || !cities) return alert("Category aur cities daalo");
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
        if (err.message === 'REQUEST_DENIED') { alert("Google Maps API key issue"); setStatus(null); return; }
        setStatus(`Error: ${err.message}`);
      }
    }
    setStatus(null);
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
    navigator.clipboard.writeText([headers.join("\t"),...rows].join("\n")).then(()=>alert("Copied! Google Sheets → A1 → Ctrl+V"));
  };

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
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16 }}>
          <div><label style={lS}>Industry / Category</label><input style={iS} value={category} onChange={e=>setCategory(e.target.value)} placeholder="e.g. interior designers, CA firms, gyms" /></div>
          <div><label style={lS}>Cities (comma separated)</label><input style={iS} value={cities} onChange={e=>setCities(e.target.value)} placeholder="e.g. Indore, Bhopal, Pune" /></div>
        </div>
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
          <button onClick={startScrape} disabled={!!status} style={{ padding:"9px 22px",background:COLORS.accent,border:"none",borderRadius:8,color:"#fff",fontSize:13,fontWeight:600,cursor:status?"not-allowed":"pointer",fontFamily:"inherit",opacity:status?0.7:1 }}>
            {status?"◈ Running...":"◈ Start scraping"}
          </button>
          {leads.length > 0 && <>
            <button onClick={exportCSV} style={{ padding:"9px 16px",background:"transparent",border:`1px solid ${COLORS.border}`,borderRadius:8,color:COLORS.textSecondary,fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>Export CSV</button>
            <button onClick={copyForSheets} style={{ padding:"9px 16px",background:"transparent",border:`1px solid ${COLORS.border}`,borderRadius:8,color:COLORS.textSecondary,fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>Copy for Sheets</button>
          </>}
        </div>
        {status && <div style={{ marginTop:12,fontSize:12,color:COLORS.amber,display:"flex",alignItems:"center",gap:8 }}><span style={{ width:6,height:6,borderRadius:"50%",background:COLORS.amber,display:"inline-block" }}/>{status}</div>}
      </div>

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

// ==================== STARTUP FUNDING PAGE ====================


function StartupFundingPage() {
  const [industry, setIndustry] = useState("");

  // Key rotation — only valid AIza keys used
  const _keys = [
    import.meta.env.VITE_GEMINI_KEY,
    import.meta.env.VITE_GEMINI_KEY_1,
    import.meta.env.VITE_GEMINI_KEY_2,
    import.meta.env.VITE_GEMINI_KEY_3,
    import.meta.env.VITE_GEMINI_KEY_4,
  ].filter(k => k && k.length > 10);
  let _kidx = 0;
  const getKey = () => { const k = _keys[_kidx % (_keys.length || 1)]; _kidx++; return k; };
  const [geminiKey, setGeminiKey] = useState(_keys[0] || "");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState(null);
  const [filter, setFilter] = useState("");

  const updateRow = (i, patch) => setResults(prev => prev.map((r, j) => j === i ? { ...r, ...patch } : r));

  const run = async () => {
    if (!industry.trim()) return alert("Industry ya keyword daalo — e.g. AI, SaaS, Fintech");
    if (!_keys.length) return alert("Gemini API key daalo .env mein — VITE_GEMINI_KEY=...");
    setResults([]);
    setStatus("Gemini se funded startups dhundh raha hai...");

    try {
      // Step 1: Use Gemini with web search to get funded startups list
      const searchRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${getKey()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tools: [{ google_search: {} }],
            contents: [{
              parts: [{
                text: `Find 20 recently funded ${industry} startups in India (last 6 months). For each startup provide:
1. Company name
2. Funding amount raised
3. Funding round (Seed/Series A/B/C)
4. Sector/industry
5. Investor names
6. What the company does (1 line)
7. Official website URL
8. Founder/CEO name if mentioned
9. Year founded if known

Format as a numbered list with clear labels for each field.`
              }]
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 4000 }
          })
        }
      );

      const searchData = await searchRes.json();
      if (searchData.error) throw new Error(searchData.error.message);

      const rawText = searchData.candidates?.[0]?.content?.parts
        ?.filter(p => p.text)
        ?.map(p => p.text)
        ?.join("\n") || "";

      if (!rawText) throw new Error("Gemini se koi response nahi aaya");

      setStatus("List mil gayi — structured data extract ho raha hai...");

      // Step 2: Parse the raw text into structured JSON
      const parseRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${getKey()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Convert this startup funding information into a JSON array. Return ONLY the JSON array, no markdown, no explanation:

[{
  "company": "company name",
  "amount": "funding amount e.g. $5M or Rs 50 Cr",
  "round": "Seed or Series A or Series B or Series C or Pre-Seed or Bridge",
  "sector": "sector name",
  "investors": "investor names comma separated",
  "summary": "one line what they do",
  "website": "website URL or empty string",
  "founder": "founder/CEO name or empty string",
  "founded": "year or empty string"
}]

Source text:
${rawText}`
              }]
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 3000 }
          })
        }
      );

      const parseData = await parseRes.json();
      const parseText = (parseData.candidates?.[0]?.content?.parts?.[0]?.text || "")
        .replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

      let parsed = [];
      try { parsed = JSON.parse(parseText); }
      catch {
        const m = parseText.match(/\[[\s\S]*\]/);
        if (m) try { parsed = JSON.parse(m[0]); } catch {}
      }

      if (!parsed.length) throw new Error("Data parse nahi hua — dobara try karo");

      setResults(parsed.map(r => ({ ...r, email: "", phone: "", enriched: false, enriching: false })));
      setStatus(null);
    } catch (e) {
      setStatus("Error: " + e.message);
    }
  };

  const enrichRow = async (i) => {
    const item = results[i];
    if (item.enriching || item.enriched) return;
    updateRow(i, { enriching: true });
    setStatus(`Enriching ${item.company}...`);

    try {
      // Use Gemini web search to find email/phone/founder for this specific company
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${getKey()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tools: [{ google_search: {} }],
            contents: [{
              parts: [{
                text: `Find contact information for the startup "${item.company}" (${item.sector} startup in India):
1. Official website URL
2. Contact email address
3. Phone number
4. Founder/CEO full name and their email if available
5. LinkedIn company page URL

Search their official website and LinkedIn. Provide exact details only, no guesses.`
              }]
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
          })
        }
      );

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.filter(p => p.text)?.map(p => p.text)?.join("\n") || "";

      // Extract from raw text
      const parseRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${getKey()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Extract contact details from this text about "${item.company}". Return ONLY JSON:
{"website":"url or empty","email":"email or empty","phone":"phone or empty","founder":"name or empty","founderTitle":"title or empty","founderEmail":"email or empty","linkedin":"linkedin url or empty"}

Text: ${rawText}`
              }]
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 300 }
          })
        }
      );

      const pd = await parseRes.json();
      const pt = (pd.candidates?.[0]?.content?.parts?.[0]?.text || "").replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      let contact = {};
      try { contact = JSON.parse(pt); }
      catch { const m = pt.match(/\{[\s\S]*\}/); if (m) try { contact = JSON.parse(m[0]); } catch {} }

      updateRow(i, {
        ...contact,
        enriched: true,
        enriching: false,
        website: contact.website || item.website || "",
        founder: contact.founder || item.founder || "",
      });
    } catch {
      updateRow(i, { enriching: false });
    }
    setStatus(null);
  };

  const enrichAll = async () => {
    for (let i = 0; i < results.length; i++) {
      if (results[i].enriched || !results[i].company) continue;
      await enrichRow(i);
      await new Promise(r => setTimeout(r, 800));
    }
  };

  const exportCSV = () => {
    const headers = ["Company","Amount","Round","Sector","What they do","Investors","Founder","Founder Email","Email","Phone","Website","LinkedIn","Founded"];
    const rows = results.map(r => [
      r.company||"", r.amount||"", r.round||"", r.sector||"", r.summary||"",
      r.investors||"", r.founder||"", r.founderEmail||"", r.email||"",
      r.phone||"", r.website||"", r.linkedin||"", r.founded||""
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(","));
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "funded_startups.csv"; a.click();
  };

  const filtered = results.filter(r => {
    const q = filter.toLowerCase();
    return !q || [r.company, r.sector, r.round, r.investors, r.summary, r.founder].some(f => (f||"").toLowerCase().includes(q));
  });

  const QUICK_TAGS = ["AI / ML", "SaaS B2B", "Fintech", "Edtech", "D2C", "Healthtech", "Logistics", "Agritech", "Proptech", "Cleantech", "Gaming", "Web3"];
  const ROUND_COLORS = { "Seed": COLORS.green, "Pre-Seed": COLORS.green, "Series A": COLORS.accent, "Series B": COLORS.amber, "Series C": COLORS.red, "Bridge": COLORS.red };

  const iS = { padding: "9px 12px", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontSize: 13, fontFamily: "inherit", outline: "none" };
  const lS = { fontSize: 11, color: COLORS.textMuted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6, display: "block" };
  const thS = { padding: "9px 14px", textAlign: "left", fontSize: 10, color: COLORS.textMuted, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: `1px solid ${COLORS.border}`, whiteSpace: "nowrap", position: "sticky", top: 0, background: COLORS.surface, zIndex: 1 };
  const tdS = { padding: "10px 14px", borderRight: `1px solid ${COLORS.border}`, verticalAlign: "top", fontSize: 12 };

  return (
    <div>
      {/* ---- Controls ---- */}
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "22px 24px", marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
          <div>
            <label style={lS}>Target Industry</label>
            <input style={{ ...iS, width: "100%", fontSize: 15 }}
              value={industry} onChange={e => setIndustry(e.target.value)}
              placeholder="e.g. AI startups, Fintech, SaaS, D2C..."
              onKeyDown={e => e.key === "Enter" && run()} />
          </div>
          <div>
            <label style={lS}>Gemini API Key</label>
            {_keys.length > 0 ? (
              <div style={{ padding: "9px 12px", background: COLORS.greenDim, border: `1px solid ${COLORS.green}44`, borderRadius: 8, fontSize: 12, color: COLORS.green }}>
                ✓ {_keys.length} valid key{_keys.length > 1 ? "s" : ""} loaded from .env — rotation active
              </div>
            ) : (
              <div>
                <input style={{ ...iS, width: "100%" }} type="password"
                  value={geminiKey} onChange={e => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy... (aistudio.google.com se lo)" />
                <p style={{ fontSize: 11, color: COLORS.red, marginTop: 4 }}>⚠ .env mein VITE_GEMINI_KEY set karo</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick tag buttons */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {QUICK_TAGS.map(tag => (
            <button key={tag} onClick={() => setIndustry(tag)}
              style={{ padding: "5px 14px", borderRadius: 20, border: `1px solid ${industry === tag ? COLORS.green : COLORS.border}`, background: industry === tag ? COLORS.greenDim : "transparent", color: industry === tag ? COLORS.green : COLORS.textMuted, fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
              {tag}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={run} disabled={!!status}
            style={{ padding: "10px 28px", background: COLORS.green, border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: status ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: status ? 0.7 : 1 }}>
            {status ? "◉ Searching..." : "◉ Find Funded Startups"}
          </button>
          {results.length > 0 && !status && (
            <button onClick={enrichAll}
              style={{ padding: "10px 20px", background: COLORS.accentDim, border: `1px solid ${COLORS.accent}`, borderRadius: 8, color: COLORS.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              ✦ Enrich All — Email + Phone + Founder
            </button>
          )}
          {results.length > 0 && (
            <button onClick={exportCSV}
              style={{ padding: "10px 16px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textSecondary, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              Export CSV
            </button>
          )}
        </div>

        {status && (
          <div style={{ marginTop: 14, padding: "12px 16px", background: COLORS.amberDim, borderRadius: 8, border: `1px solid ${COLORS.amber}44`, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.amber, flexShrink: 0, animation: "pulse 1s infinite" }} />
            <span style={{ fontSize: 12, color: COLORS.amber }}>{status}</span>
          </div>
        )}
      </div>

      {/* ---- Stats ---- */}
      {results.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Startups found", value: results.length, color: COLORS.accent },
            { label: "Enriched", value: results.filter(r => r.enriched).length, color: COLORS.green },
            { label: "Emails found", value: results.filter(r => r.email || r.founderEmail).length, color: COLORS.green },
            { label: "Founders found", value: results.filter(r => r.founder).length, color: COLORS.amber },
            { label: "Websites found", value: results.filter(r => r.website).length, color: COLORS.red },
          ].map((s, i) => (
            <div key={i} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ---- Table ---- */}
      {results.length > 0 && (
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 12 }}>
            <input style={{ ...iS, width: 220, padding: "7px 12px" }} value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter startups..." />
            <span style={{ fontSize: 12, color: COLORS.textMuted, marginLeft: "auto" }}>
              {filtered.length} startups — "Enrich ↗" dabao per row for email/phone/founder
            </span>
          </div>
          <div style={{ overflowX: "auto", maxHeight: "65vh", overflowY: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: 12, minWidth: "100%" }}>
              <thead>
                <tr>
                  <th style={{ ...thS, minWidth: 160 }}>Company</th>
                  <th style={{ ...thS, minWidth: 95 }}>Amount</th>
                  <th style={{ ...thS, minWidth: 95 }}>Round</th>
                  <th style={{ ...thS, minWidth: 100 }}>Sector</th>
                  <th style={{ ...thS, minWidth: 200 }}>What they do</th>
                  <th style={{ ...thS, minWidth: 180 }}>Investors</th>
                  <th style={{ ...thS, minWidth: 150 }}>Founder / CEO</th>
                  <th style={{ ...thS, minWidth: 175 }}>Email</th>
                  <th style={{ ...thS, minWidth: 125 }}>Phone</th>
                  <th style={{ ...thS, minWidth: 90 }}>Website</th>
                  <th style={{ ...thS, minWidth: 90 }}>Enrich</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, fi) => {
                  const i = results.findIndex(x => x === r);
                  const email = r.founderEmail || r.email || "";
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}`, background: r.enriched ? "#10B98106" : "transparent" }}>
                      <td style={{ ...tdS, fontWeight: 600, color: COLORS.text }}>
                        {r.company || "—"}
                        {r.founded && <div style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 400, marginTop: 2 }}>Est. {r.founded}</div>}
                      </td>
                      <td style={{ ...tdS, color: COLORS.green, fontWeight: 700, whiteSpace: "nowrap" }}>{r.amount || "—"}</td>
                      <td style={{ ...tdS }}>
                        {r.round ? (
                          <span style={{ background: (ROUND_COLORS[r.round] || COLORS.accent) + "22", color: ROUND_COLORS[r.round] || COLORS.accent, padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
                            {r.round}
                          </span>
                        ) : "—"}
                      </td>
                      <td style={{ ...tdS, color: COLORS.textSecondary }}>{r.sector || "—"}</td>
                      <td style={{ ...tdS, color: COLORS.textSecondary, maxWidth: 200, whiteSpace: "normal", lineHeight: 1.5, fontSize: 11 }}>{r.summary || "—"}</td>
                      <td style={{ ...tdS, color: COLORS.textSecondary, maxWidth: 180, whiteSpace: "normal", lineHeight: 1.5, fontSize: 11 }}>{r.investors || "—"}</td>
                      <td style={{ ...tdS }}>
                        {r.founder ? (
                          <div>
                            <div style={{ color: COLORS.text, fontWeight: 500 }}>{r.founder}</div>
                            {r.founderTitle && <div style={{ color: COLORS.textMuted, fontSize: 10, marginTop: 2 }}>{r.founderTitle}</div>}
                          </div>
                        ) : <span style={{ color: COLORS.textMuted }}>—</span>}
                      </td>
                      <td style={{ ...tdS }}>
                        {email ? (
                          <a href={`mailto:${email}`} style={{ color: COLORS.green, textDecoration: "none", fontSize: 11 }}>{email}</a>
                        ) : <span style={{ color: COLORS.textMuted }}>—</span>}
                      </td>
                      <td style={{ ...tdS, color: COLORS.amber, fontSize: 11 }}>{r.phone || <span style={{ color: COLORS.textMuted }}>—</span>}</td>
                      <td style={{ ...tdS }}>
                        {r.website ? (
                          <a href={r.website} target="_blank" rel="noreferrer" style={{ color: COLORS.accent, textDecoration: "none", fontSize: 11 }}>Open ↗</a>
                        ) : <span style={{ color: COLORS.textMuted }}>—</span>}
                      </td>
                      <td style={{ ...tdS }}>
                        {r.enriched ? (
                          <span style={{ color: COLORS.green, fontSize: 11, fontWeight: 600 }}>✓ Done</span>
                        ) : r.enriching ? (
                          <span style={{ color: COLORS.amber, fontSize: 11 }}>Searching...</span>
                        ) : (
                          <button onClick={() => enrichRow(i)}
                            style={{ padding: "4px 12px", background: COLORS.accentDim, border: `1px solid ${COLORS.accent}55`, borderRadius: 5, color: COLORS.accent, fontSize: 11, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                            Enrich ↗
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- Empty state ---- */}
      {!results.length && !status && (
        <div style={{ textAlign: "center", padding: "70px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>◉</div>
          <p style={{ fontSize: 16, color: COLORS.textSecondary, marginBottom: 6 }}>Kaunsi industry ke startups dhundne hain?</p>
          <p style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 24 }}>Upar tag click karo ya apna keyword likho → Gemini web search se recently funded startups ki list aayegi</p>
          <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: 8, padding: "16px 20px", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, textAlign: "left" }}>
            <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>How it works</div>
            {["1. Industry type karo (e.g. 'AI startups')", "2. Gemini web search se 20 recently funded startups milenge", "3. Amount, round, sector, investors automatically fill", "4. Per row 'Enrich ↗' dabao → email, phone, founder milega"].map((s, i) => (
              <div key={i} style={{ fontSize: 12, color: COLORS.textSecondary }}>{s}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FreelancePage() {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("Any");
  const [jobs, setJobs] = useState([]);
  const [status, setStatus] = useState(null);
  const [filter, setFilter] = useState("");

  const run = async () => {
    if (!keyword && category === "Any") return alert("Keyword ya category daalo");
    setJobs([]);
    setStatus("Fetching jobs...");
    try {
      const results = await fetchUpworkJobs(keyword, category, setStatus);
      setJobs(results);
      if (!results.length) setStatus("Koi job nahi mili — keyword ya category badlo");
      else setStatus(null);
    } catch (e) {
      setStatus("Error: " + e.message);
    }
  };

  const exportCSV = () => {
    const headers = ["Title","Company","Source","Budget","Hourly","Skills","Country","Posted","Description","Link"];
    const rows = jobs.map(j=>[j.title,j.company||"",j.source||"",j.budget||"",j.hourly||"",j.skills||"",j.country||"",j.pubDate||"",j.description||"",j.link||""].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(","));
    const blob=new Blob([[headers.join(","),...rows].join("\n")],{type:"text/csv"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="freelance_jobs.csv";a.click();
  };

  const filtered = jobs.filter(j=>{
    const q=filter.toLowerCase();
    return !q||[j.title,j.skills,j.country,j.description,j.company].some(f=>(f||"").toLowerCase().includes(q));
  });

  const iS = { padding:"9px 12px",background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:8,color:COLORS.text,fontSize:13,fontFamily:"inherit",outline:"none" };
  const lS = { fontSize:11,color:COLORS.textMuted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6,display:"block" };
  const thS = { padding:"9px 14px",textAlign:"left",fontSize:10,color:COLORS.textMuted,fontWeight:500,letterSpacing:"0.08em",textTransform:"uppercase",borderBottom:`1px solid ${COLORS.border}`,whiteSpace:"nowrap",position:"sticky",top:0,background:COLORS.surface,zIndex:1 };
  const tdS = { padding:"10px 14px",borderRight:`1px solid ${COLORS.border}`,verticalAlign:"top",fontSize:12 };

  return (
    <div>
      <div style={{ background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"22px 24px",marginBottom:20 }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16 }}>
          <div><label style={lS}>Search keyword</label><input style={{ ...iS,width:"100%" }} value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder="e.g. React, SEO, logo design..." onKeyDown={e=>e.key==="Enter"&&run()}/></div>
          <div>
            <label style={lS}>Category</label>
            <select value={category} onChange={e=>setCategory(e.target.value)} style={{ ...iS,width:"100%",cursor:"pointer" }}>
              {UPWORK_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display:"flex",gap:12,alignItems:"center" }}>
          <button onClick={run} disabled={!!status} style={{ padding:"9px 22px",background:COLORS.amber,border:"none",borderRadius:8,color:"#000",fontSize:13,fontWeight:600,cursor:status?"not-allowed":"pointer",fontFamily:"inherit",opacity:status?0.7:1 }}>
            {status?"◐ Fetching...":"◐ Find Freelance Jobs"}
          </button>
          {jobs.length>0&&<button onClick={exportCSV} style={{ padding:"9px 16px",background:"transparent",border:`1px solid ${COLORS.border}`,borderRadius:8,color:COLORS.textSecondary,fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>Export CSV</button>}
          {keyword&&<a href={getUpworkSearchUrl(keyword,category)} target="_blank" rel="noreferrer" style={{ padding:"9px 16px",background:"transparent",border:`1px solid ${COLORS.amber}44`,borderRadius:8,color:COLORS.amber,fontSize:13,textDecoration:"none" }}>Search on Upwork ↗</a>}
        </div>
        {status&&<div style={{ marginTop:12,fontSize:12,color:COLORS.amber,display:"flex",alignItems:"center",gap:8 }}><span style={{ width:6,height:6,borderRadius:"50%",background:COLORS.amber,display:"inline-block" }}/>{status}</div>}
      </div>

      {jobs.length > 0 && (
        <>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:12,marginBottom:20 }}>
            {[{label:"Total jobs",value:jobs.length,color:COLORS.accent},{label:"With fixed budget",value:jobs.filter(j=>j.budget).length,color:COLORS.green},{label:"With hourly rate",value:jobs.filter(j=>j.hourly).length,color:COLORS.amber},{label:"Filtered",value:filtered.length,color:COLORS.red}].map((s,i)=>(
              <div key={i} style={{ background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:10,padding:"14px 18px" }}>
                <div style={{ fontSize:24,fontWeight:600,color:s.color }}>{s.value}</div>
                <div style={{ fontSize:11,color:COLORS.textMuted,marginTop:4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,overflow:"hidden" }}>
            <div style={{ padding:"12px 16px",borderBottom:`1px solid ${COLORS.border}`,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <input style={{ ...iS,width:220,padding:"7px 12px" }} value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filter jobs..." />
              <span style={{ fontSize:12,color:COLORS.textMuted }}>{filtered.length} jobs — click title to open directly</span>
            </div>
            <div style={{ overflowX:"auto",maxHeight:"65vh",overflowY:"auto" }}>
              <table style={{ borderCollapse:"collapse",fontSize:12,width:"100%" }}>
                <thead>
                  <tr>
                    <th style={{ ...thS,minWidth:240 }}>Job Title</th>
                    <th style={{ ...thS,minWidth:130 }}>Company</th>
                    <th style={{ ...thS,minWidth:90 }}>Source</th>
                    <th style={{ ...thS,minWidth:100 }}>Budget</th>
                    <th style={{ ...thS,minWidth:110 }}>Hourly</th>
                    <th style={{ ...thS,minWidth:200 }}>Skills</th>
                    <th style={{ ...thS,minWidth:100 }}>Country</th>
                    <th style={{ ...thS,minWidth:90 }}>Posted</th>
                    <th style={{ ...thS,minWidth:260 }}>Description</th>
                    <th style={{ ...thS,minWidth:75 }}>Apply</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((j,i)=>(
                    <tr key={i} style={{ borderBottom:`1px solid ${COLORS.border}` }}>
                      <td style={{ ...tdS,maxWidth:240 }}>
                        <a href={j.link} target="_blank" rel="noreferrer" style={{ color:COLORS.text,textDecoration:"none",fontWeight:500,lineHeight:1.4,display:"block" }}
                          onMouseEnter={e=>e.currentTarget.style.color=COLORS.amber} onMouseLeave={e=>e.currentTarget.style.color=COLORS.text}>{j.title}</a>
                      </td>
                      <td style={{ ...tdS,color:COLORS.textSecondary,fontWeight:500 }}>{j.company||"—"}</td>
                      <td style={tdS}><span style={{ background:COLORS.accentDim,color:COLORS.accent,padding:"2px 7px",borderRadius:4,fontSize:10 }}>{j.source||"—"}</span></td>
                      <td style={{ ...tdS,color:COLORS.green,fontWeight:600 }}>{j.budget||<span style={{ color:COLORS.textMuted }}>—</span>}</td>
                      <td style={{ ...tdS,color:COLORS.amber }}>{j.hourly||<span style={{ color:COLORS.textMuted }}>—</span>}</td>
                      <td style={{ ...tdS,color:COLORS.textSecondary,maxWidth:200,whiteSpace:"normal",lineHeight:1.5 }}>
                        {j.skills?j.skills.split(",").slice(0,5).map((s,k)=>(<span key={k} style={{ background:COLORS.accentDim,color:COLORS.accent,fontSize:10,padding:"1px 6px",borderRadius:3,marginRight:4,marginBottom:3,display:"inline-block" }}>{s.trim()}</span>)):<span style={{ color:COLORS.textMuted }}>—</span>}
                      </td>
                      <td style={{ ...tdS,color:COLORS.textSecondary }}>{j.country||"—"}</td>
                      <td style={{ ...tdS,color:COLORS.textMuted,fontSize:11 }}>{j.pubDate?new Date(j.pubDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"—"}</td>
                      <td style={{ ...tdS,color:COLORS.textSecondary,maxWidth:260,whiteSpace:"normal",lineHeight:1.5,fontSize:11 }}>{j.description||"—"}</td>
                      <td style={tdS}><a href={j.link} target="_blank" rel="noreferrer" style={{ display:"inline-block",padding:"4px 10px",background:COLORS.amber+"22",color:COLORS.amber,borderRadius:5,textDecoration:"none",fontSize:11,fontWeight:600 }}>Apply ↗</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!jobs.length&&!status&&(
        <div style={{ textAlign:"center",padding:"60px 20px",color:COLORS.textMuted }}>
          <div style={{ fontSize:40,marginBottom:12 }}>◐</div>
          <p style={{ fontSize:14,color:COLORS.textSecondary }}>Keyword daalo — Remotive, Arbeitnow, Himalayas se live jobs aa jaayenge</p>
        </div>
      )}
    </div>
  );
}
