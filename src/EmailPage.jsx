import { useState, useEffect, useRef } from "react";

// ============================================================
// BREVO CONFIG — add these to your .env
// VITE_BREVO_API_KEY=xkeysib-xxxx   (Settings → API Keys in Brevo)
// Sender IDs configured in Brevo dashboard under Senders & IPs
// ============================================================

const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY || "";

// Your sending identities — add/edit here
// Each must be verified in Brevo dashboard (Settings → Senders & IPs)
const SENDER_ACCOUNTS = [
  { id: 1, name: "Manas Jain", email: import.meta.env.VITE_SENDER_1 || "", label: "Sender 1" },
  { id: 2, name: "Manas Jain", email: import.meta.env.VITE_SENDER_2 || "", label: "Sender 2" },
  { id: 3, name: "Manas Jain", email: import.meta.env.VITE_SENDER_3 || "", label: "Sender 3" },
  { id: 4, name: "Manas Jain", email: import.meta.env.VITE_SENDER_4 || "", label: "Sender 4" },
  { id: 5, name: "Manas Jain", email: import.meta.env.VITE_SENDER_5 || "", label: "Sender 5" },
].filter((s) => s.email);

// Industries → Categories → 5 draft templates each
const TEMPLATE_LIBRARY = {
  "IT & Software": {
    "Web Development": [
      {
        id: "wd1",
        subject: "Quick question about {{company}}'s website",
        body: `Hi {{contact}},

Came across {{company}} while researching {{city}}-based businesses — noticed your website and had a thought.

{{custom_line}}

We help businesses like yours convert more visitors into leads through performance-focused web development. A few things we typically improve:
• Page speed (most sites lose 40% visitors after 3s load time)
• Mobile experience
• Clear CTAs that actually convert

Would a 15-min call make sense this week? Happy to share what we've seen work for similar companies.

Best,
{{sender_name}}`,
      },
      {
        id: "wd2",
        subject: "{{company}} — website opportunity I spotted",
        body: `Hi {{contact}},

{{custom_line}}

I work with 20+ businesses in {{city}} on their web presence. Most of them had one thing in common before we worked together — their website wasn't doing any selling for them.

We build websites that work as a 24/7 salesperson. Interested in a quick look at what's possible for {{company}}?

Regards,
{{sender_name}}`,
      },
      {
        id: "wd3",
        subject: "Helping {{company}} get more from their online presence",
        body: `Hi {{contact}},

{{custom_line}}

We've been working with several firms in {{industry}} on redesigning their web experience — the results have been solid (happy to share specifics on a call).

Would {{company}} be open to a complimentary audit of your current site? No pitch, just honest feedback.

{{sender_name}}`,
      },
      {
        id: "wd4",
        subject: "{{company}} — 3 things I noticed on your site",
        body: `Hi {{contact}},

Spent 10 mins on {{company}}'s website. {{custom_line}}

Three quick observations:
1. [Speed/mobile/UX observation — fill before sending]
2. [CTA or lead capture observation]
3. [Trust signals observation]

We fix these regularly for businesses in {{city}}. Worth a 20-min conversation?

{{sender_name}}`,
      },
      {
        id: "wd5",
        subject: "Your competitors' websites are pulling ahead",
        body: `Hi {{contact}},

{{custom_line}}

We track web presence for businesses across {{city}} in {{industry}}. The ones growing fastest have one thing in common — a website built to generate leads, not just look good.

If {{company}} wants to see how you stack up, I can put together a quick competitive snapshot. Free, no strings.

{{sender_name}}`,
      },
    ],
    "App Development": [
      {
        id: "ad1",
        subject: "App idea for {{company}}?",
        body: `Hi {{contact}},

{{custom_line}}

We build mobile apps for businesses that want to give their customers a better experience — and reduce manual workload internally.

Curious: does {{company}} have a mobile touchpoint for your clients yet? If not, there might be a real opportunity here.

Happy to share 2-3 concepts specific to your business if you're open to it.

{{sender_name}}`,
      },
      {
        id: "ad2",
        subject: "{{company}} — could an app 10x your customer retention?",
        body: `Hi {{contact}},

{{custom_line}}

Most businesses in {{industry}} underestimate what a well-built app can do for retention and repeat business. We've seen 30-40% improvement in customer LTV for clients who made the switch.

Would love to show you what we've built for similar businesses. 15 mins?

{{sender_name}}`,
      },
      {
        id: "ad3",
        subject: "Reducing manual work at {{company}} with tech",
        body: `Hi {{contact}},

{{custom_line}}

We recently built an internal app for a {{industry}} company in {{city}} that saved their team ~15 hours/week. The ROI showed up in month 2.

Is there a process at {{company}} that still runs on WhatsApp, Excel, or calls that could be streamlined?

{{sender_name}}`,
      },
      {
        id: "ad4",
        subject: "Quick app audit for {{company}}",
        body: `Hi {{contact}},

{{custom_line}}

We're doing free digital audits for businesses in {{city}} this month — specifically looking at where an app or automation could save time or grow revenue.

Can I send you a short questionnaire? Takes 5 mins, and we'll share our findings for free.

{{sender_name}}`,
      },
      {
        id: "ad5",
        subject: "{{company}} — mobile-first strategy worth discussing",
        body: `Hi {{contact}},

{{custom_line}}

70%+ of your customers are on mobile. If your engagement with them isn't mobile-first, you're leaving money on the table.

We help {{industry}} businesses build apps that customers actually use. Worth exploring for {{company}}?

{{sender_name}}`,
      },
    ],
    "AI & Automation": [
      {
        id: "ai1",
        subject: "What AI could do for {{company}}",
        body: `Hi {{contact}},

{{custom_line}}

We're working with businesses in {{city}} to implement practical AI — not the hype, but real tools that cut costs and save time.

Common wins we deliver:
• AI chatbots for customer queries (reduces support load 60%)
• Automated lead qualification
• Smart document processing

Would {{company}} be open to a 20-min discovery call? I'll come with 3 specific ideas for your business.

{{sender_name}}`,
      },
      {
        id: "ai2",
        subject: "Automating the repetitive work at {{company}}",
        body: `Hi {{contact}},

{{custom_line}}

Most businesses we talk to have 3-5 tasks that eat hours every week but don't need a human to do them. We find those and automate them.

For {{company}}, I'm guessing it could be [data entry / reporting / follow-ups / scheduling — edit before sending].

Can we spend 15 mins exploring this?

{{sender_name}}`,
      },
      {
        id: "ai3",
        subject: "{{company}} — AI tools your competitors are already using",
        body: `Hi {{contact}},

{{custom_line}}

Businesses in {{industry}} are quietly adopting AI to move faster with smaller teams. The gap between early adopters and others is widening.

We help companies like {{company}} identify the highest-ROI AI implementations. Not theory — actual tools, actual results.

Interested in a quick overview?

{{sender_name}}`,
      },
      {
        id: "ai4",
        subject: "Free AI audit for {{company}}",
        body: `Hi {{contact}},

{{custom_line}}

We're offering complimentary AI readiness audits to {{industry}} businesses in {{city}} this quarter. We look at your current workflows and identify where AI can create the most impact.

Takes 30 minutes. Would {{contact}} be the right person to connect with, or should I reach out to someone else?

{{sender_name}}`,
      },
      {
        id: "ai5",
        subject: "Cut {{company}}'s operational costs with AI",
        body: `Hi {{contact}},

{{custom_line}}

We've helped businesses in {{city}} reduce operational costs by 20-35% using targeted AI automation. The payback period is usually under 6 months.

Happy to share a case study relevant to {{industry}} if that would be useful.

{{sender_name}}`,
      },
    ],
    Blockchain: [
      {
        id: "bc1",
        subject: "Blockchain use case for {{company}}",
        body: `Hi {{contact}},

{{custom_line}}

We help businesses in {{industry}} explore practical blockchain applications — supply chain transparency, smart contracts, tokenization, or secure document verification.

Most of our clients were skeptical at first. After a 30-min session, they usually walk away with 2-3 concrete use cases specific to their business.

Worth a conversation for {{company}}?

{{sender_name}}`,
      },
      {
        id: "bc2",
        subject: "{{company}} — is blockchain relevant for you?",
        body: `Hi {{contact}},

{{custom_line}}

Honest answer: blockchain isn't right for every business. But for companies in {{industry}} dealing with multi-party transactions, document authenticity, or supply chains — it often is.

We do a free 30-min assessment to figure out if there's a genuine fit. No commitment, just clarity.

Interested?

{{sender_name}}`,
      },
      {
        id: "bc3",
        subject: "Smart contracts could save {{company}} time and money",
        body: `Hi {{contact}},

{{custom_line}}

We've built smart contract systems for businesses that reduced contract processing time by 70% and eliminated disputes over terms.

For a {{industry}} company like {{company}}, the applications could be significant. Happy to walk you through a real example.

{{sender_name}}`,
      },
      {
        id: "bc4",
        subject: "Web3 strategy for {{company}}",
        body: `Hi {{contact}},

{{custom_line}}

Whether it's NFTs, tokenized loyalty programs, or decentralized identity — Web3 is creating new business models in {{industry}}.

We help companies figure out what's relevant and build it properly. Would {{company}} be open to a strategic conversation?

{{sender_name}}`,
      },
      {
        id: "bc5",
        subject: "Securing {{company}}'s data with blockchain",
        body: `Hi {{contact}},

{{custom_line}}

Data integrity and audit trails are becoming critical in {{industry}}. Blockchain provides tamper-proof records that hold up to scrutiny.

We've implemented this for several {{city}}-based businesses. Happy to share how it could apply to {{company}}.

{{sender_name}}`,
      },
    ],
  },
  "CA & Finance": {
    "Accounting Software": [
      {
        id: "as1",
        subject: "Streamlining accounting at {{company}}",
        body: `Hi {{contact}},

{{custom_line}}

We work with CA firms and finance businesses in {{city}} to implement and customize accounting software — Tally, Zoho Books, or custom ERP depending on the need.

Most firms we work with save 8-10 hours/week after the switch. Would that be worth a 20-min call?

{{sender_name}}`,
      },
      {
        id: "as2",
        subject: "{{company}} — are your accounting workflows as efficient as they could be?",
        body: `Hi {{contact}},

{{custom_line}}

We've helped 15+ CA firms in {{city}} modernize their back-office. The biggest wins usually come from automating reconciliation, GST filing prep, and client reporting.

Happy to share what's worked. Quick call this week?

{{sender_name}}`,
      },
      {
        id: "as3",
        subject: "Tech for CA firms — what's actually worth it",
        body: `Hi {{contact}},

{{custom_line}}

There's a lot of software out there claiming to help CA practices. Most of it adds complexity. We cut through that and implement only what actually moves the needle.

Would {{company}} be open to a free tech stack review?

{{sender_name}}`,
      },
      {
        id: "as4",
        subject: "Helping {{company}} go paperless",
        body: `Hi {{contact}},

{{custom_line}}

We've helped CA firms in {{city}} move from paper-heavy workflows to fully digital operations — document management, e-signatures, client portals.

The transition is smoother than most expect. Want to see how it would look for {{company}}?

{{sender_name}}`,
      },
      {
        id: "as5",
        subject: "Client portal for {{company}}?",
        body: `Hi {{contact}},

{{custom_line}}

We build secure client portals for CA firms — document sharing, task tracking, communication, all in one place. Clients love it, and it reduces back-and-forth emails by 60%.

Worth showing you a demo for {{company}}?

{{sender_name}}`,
      },
    ],
  },
  "Real Estate": {
    "Property Tech": [
      {
        id: "pt1",
        subject: "Tech to help {{company}} close more deals",
        body: `Hi {{contact}},

{{custom_line}}

We build CRM and lead management tools specifically for real estate businesses in {{city}}. The goal: no lead slips through, and follow-ups happen automatically.

Would {{company}} be open to seeing how it works?

{{sender_name}}`,
      },
      {
        id: "pt2",
        subject: "{{company}} — are you losing leads to slow follow-up?",
        body: `Hi {{contact}},

{{custom_line}}

Studies show 78% of real estate leads go with the first company that responds. We build automated follow-up systems that make sure {{company}} is always first.

15-min call to show you the system?

{{sender_name}}`,
      },
      {
        id: "pt3",
        subject: "Virtual tours and 3D walkthroughs for {{company}}",
        body: `Hi {{contact}},

{{custom_line}}

We build virtual tour and 3D walkthrough solutions for real estate companies. Buyers from anywhere can explore properties — reducing site visits for serious buyers only.

This is becoming standard in {{city}}'s top agencies. Want to see a live demo?

{{sender_name}}`,
      },
      {
        id: "pt4",
        subject: "Automating {{company}}'s property listings",
        body: `Hi {{contact}},

{{custom_line}}

We integrate real estate portals (99acres, MagicBricks, Housing) with a central dashboard so your team manages everything from one place. No duplicate data entry.

Saves 5+ hours/week for most agencies. Worth exploring?

{{sender_name}}`,
      },
      {
        id: "pt5",
        subject: "Website that generates leads for {{company}}",
        body: `Hi {{contact}},

{{custom_line}}

Most real estate websites are brochures. We build lead engines — with property search, EMI calculators, instant inquiry forms, and WhatsApp integration.

Happy to show you examples from {{city}}-based agencies.

{{sender_name}}`,
      },
    ],
  },
};

// ============================================================
// BREVO API FUNCTIONS
// ============================================================
// ============================================================
// BREVO API
// ============================================================

const brevoSendEmail = async ({ fromEmail, fromName, toEmail, toName, subject, htmlContent, tags, scheduledAt }) => {
  if (!BREVO_API_KEY) throw new Error("VITE_BREVO_API_KEY not set in .env")
  const body = {
    sender: { name: fromName, email: fromEmail },
    to: [{ email: toEmail, name: toName || toEmail }],
    subject, htmlContent,
    tags: tags || [],
    trackOpens: true,
    trackClicks: true,
  }
  // Brevo holds the email on their server and sends it at this exact time —
  // works even if your laptop/browser is closed afterward.
  if (scheduledAt) body.scheduledAt = scheduledAt
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `Brevo error ${res.status}`)
  return data
}

const brevoGetStats = async () => {
  if (!BREVO_API_KEY) return null
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/statistics/aggregatedReport?days=7", {
      headers: { "api-key": BREVO_API_KEY },
    })
    return res.ok ? await res.json() : null
  } catch { return null }
}

// Get all events — per email tracking
const brevoGetEvents = async () => {
  if (!BREVO_API_KEY) return []
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/statistics/events?limit=100&sort=desc", {
      headers: { "api-key": BREVO_API_KEY },
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.events || []
  } catch { return [] }
}

// ============================================================
// TEMPLATE ENGINE
// ============================================================

const fillTemplate = (text, vars) =>
  text
    .replace(/\{\{company\}\}/g, vars.company || "your company")
    .replace(/\{\{contact\}\}/g, vars.contact || "there")
    .replace(/\{\{city\}\}/g, vars.city || "your city")
    .replace(/\{\{industry\}\}/g, vars.industry || "your industry")
    .replace(/\{\{sender_name\}\}/g, vars.senderName || "")
    .replace(/\{\{custom_line\}\}/g, vars.customLine || "")

const textToHtml = (text) => {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  const lines = escaped.split("\n")
  let html = '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#222;max-width:600px;">'
  for (const line of lines) {
    if (line.trim().startsWith("•")) html += `<div style="margin:2px 0 2px 16px;">• ${line.trim().slice(1).trim()}</div>`
    else if (line.trim() === "") html += "<br/>"
    else html += `<div style="margin:2px 0;">${line}</div>`
  }
  html += "</div>"
  return html
}

// ============================================================
// COLORS
// ============================================================
const C = {
  bg: "#0A0A0A", surface: "#111111", card: "#161616",
  border: "#222222", border2: "#2a2a2a",
  accent: "#7C5CFC", accentDim: "#7C5CFC22",
  green: "#22c55e", greenDim: "#22c55e18",
  red: "#ef4444", redDim: "#ef444418",
  yellow: "#f59e0b", yellowDim: "#f59e0b18",
  cyan: "#06b6d4", cyanDim: "#06b6d418",
  text: "#ffffff", textMuted: "#888888", textDim: "#444444",
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function EmailPage({ leads = [] }) {
  // ── Sender management (dynamic — add/remove in UI) ──
  const [senders, setSenders] = useState(() => {
    const fromEnv = [
      { id: 1, name: "Manas Jain", email: import.meta.env.VITE_SENDER_1 || "" },
      { id: 2, name: "Manas Jain", email: import.meta.env.VITE_SENDER_2 || "" },
      { id: 3, name: "Manas Jain", email: import.meta.env.VITE_SENDER_3 || "" },
      { id: 4, name: "Manas Jain", email: import.meta.env.VITE_SENDER_4 || "" },
      { id: 5, name: "Manas Jain", email: import.meta.env.VITE_SENDER_5 || "" },
    ].filter(s => s.email)
    // Also load any saved from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem("email_senders") || "[]")
      const all = [...fromEnv]
      saved.forEach(s => { if (!all.find(x => x.email === s.email)) all.push(s) })
      return all
    } catch { return fromEnv }
  })
  const [newSenderEmail, setNewSenderEmail] = useState("")
  const [newSenderName, setNewSenderName] = useState("")
  const [showSenderMgr, setShowSenderMgr] = useState(false)

  // ── Template state ──
  const [activeView, setActiveView] = useState("compose")
  const [selectedIndustry, setSelectedIndustry] = useState(Object.keys(TEMPLATE_LIBRARY)[0])
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedTemplateIdx, setSelectedTemplateIdx] = useState(0)
  const [subjectOverride, setSubjectOverride] = useState("")
  const [bodyOverride, setBodyOverride] = useState("")

  // ── Recipients ──
  const [recipients, setRecipients] = useState([])
  const [customLines, setCustomLines] = useState({})
  const [addEmailInput, setAddEmailInput] = useState("")
  const [addNameInput, setAddNameInput] = useState("")
  const [addCompanyInput, setAddCompanyInput] = useState("")
  const [bulkPasteText, setBulkPasteText] = useState("")
  const [showBulkPaste, setShowBulkPaste] = useState(true)

  // ── Sending ──
  const [sending, setSending] = useState(false)
  const [sendProgress, setSendProgress] = useState(null) // {current, total, waitingSec}
  const [scheduleMode, setScheduleMode] = useState(false)
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [rotateVariants, setRotateVariants] = useState(true) // randomize draft per recipient by default
  const [sentLog, setSentLog] = useState([])
  const [dailySentCount, setDailySentCount] = useState(0)
  const senderIdxRef = useRef(Math.floor(Math.random() * Math.max(senders.length, 1)))

  // ── Analytics ──
  const [stats, setStats] = useState(null)
  const [events, setEvents] = useState([])
  const [loadingStats, setLoadingStats] = useState(false)
  const [trackingFilter, setTrackingFilter] = useState("all") // all | opened | clicked | spam | bounced

  // ── Preview ──
  const [previewRecipient, setPreviewRecipient] = useState(null)

  const DAILY_LIMIT = 500

  // Derived
  const categories = Object.keys(TEMPLATE_LIBRARY[selectedIndustry] || {})
  const activeCategory = selectedCategory || categories[0] || ""
  const templates = TEMPLATE_LIBRARY[selectedIndustry]?.[activeCategory] || []
  const activeTemplate = templates[selectedTemplateIdx] || templates[0]

  // True if the person manually changed subject/body away from the selected
  // template's original text. When this is true, "Randomize draft" should NOT
  // overwrite their edit with a random template — their edit wins for everyone.
  const isManuallyEdited = activeTemplate
    ? (subjectOverride !== activeTemplate.subject || bodyOverride !== activeTemplate.body)
    : false

  useEffect(() => {
    if (activeTemplate) { setSubjectOverride(activeTemplate.subject); setBodyOverride(activeTemplate.body) }
    setSelectedTemplateIdx(0)
  }, [selectedIndustry, activeCategory])

  useEffect(() => {
    if (activeTemplate) { setSubjectOverride(activeTemplate.subject); setBodyOverride(activeTemplate.body) }
  }, [selectedTemplateIdx])

  // Save senders to localStorage when changed
  useEffect(() => {
    try { localStorage.setItem("email_senders", JSON.stringify(senders)) } catch {}
  }, [senders])

  const addSender = () => {
    if (!newSenderEmail.trim() || !newSenderEmail.includes("@")) return
    if (senders.find(s => s.email === newSenderEmail.trim())) return
    setSenders(prev => [...prev, { id: Date.now(), name: newSenderName.trim() || "Manas Jain", email: newSenderEmail.trim() }])
    setNewSenderEmail(""); setNewSenderName("")
  }

  const removeSender = (id) => setSenders(prev => prev.filter(s => s.id !== id))

  const getPreviewFor = (recipient, templateIdxOverride = null) => {
    const vars = {
      company: recipient.company || recipient.name || "Company",
      contact: recipient.name || "there",
      city: recipient.city || "your city",
      industry: activeCategory || selectedIndustry,
      senderName: senders[senderIdxRef.current % Math.max(senders.length, 1)]?.name || "",
      customLine: customLines[recipient.email] || "",
    }
    // If rotating variants and a specific template index is given, use that
    // template's raw subject/body instead of whatever's in the editor —
    // this is what makes each recipient get a genuinely different draft.
    if (templateIdxOverride !== null && templates[templateIdxOverride]) {
      const t = templates[templateIdxOverride]
      return { subject: fillTemplate(t.subject, vars), body: fillTemplate(t.body, vars) }
    }
    return { subject: fillTemplate(subjectOverride, vars), body: fillTemplate(bodyOverride, vars) }
  }

  const importFromLeads = () => {
    const enriched = leads.filter(l => l.email || l.allEmails?.length)
    const mapped = enriched.map(l => ({
      email: l.email || l.allEmails?.[0] || "",
      name: l.people?.[0]?.name || "",
      company: l.name || "",
      city: l.city || "",
    })).filter(r => r.email)
    setRecipients(prev => {
      const existing = new Set(prev.map(r => r.email))
      return [...prev, ...mapped.filter(r => !existing.has(r.email))]
    })
  }

  const addManualRecipient = () => {
    if (!addEmailInput.trim()) return
    setRecipients(prev => [...prev, { email: addEmailInput.trim(), name: addNameInput.trim(), company: addCompanyInput.trim(), city: "" }])
    setAddEmailInput(""); setAddNameInput(""); setAddCompanyInput("")
  }

  // Bulk paste — accepts lines like:
  // email@x.com, Name, Company
  // email@x.com
  // email@x.com | Name | Company
  const addBulkRecipients = (text) => {
    if (!text.trim()) return
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
    const newOnes = []
    for (const line of lines) {
      // Try comma, pipe, or tab separated. First valid email-looking token wins as email.
      const parts = line.split(/[,|\t]/).map(p => p.trim()).filter(Boolean)
      const emailPart = parts.find(p => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p))
      if (!emailPart) continue
      const rest = parts.filter(p => p !== emailPart)
      newOnes.push({
        email: emailPart,
        name: rest[0] || "",
        company: rest[1] || "",
        city: rest[2] || "",
      })
    }
    if (newOnes.length === 0) return
    setRecipients(prev => {
      const existing = new Set(prev.map(r => r.email))
      return [...prev, ...newOnes.filter(r => !existing.has(r.email))]
    })
    return newOnes.length
  }

  const removeRecipient = (email) => setRecipients(prev => prev.filter(r => r.email !== email))

  const sendAll = async () => {
    if (!BREVO_API_KEY) { alert("Add VITE_BREVO_API_KEY to .env"); return }
    if (senders.length === 0) { alert("Add at least one sender email"); return }
    if (recipients.length === 0) { alert("No recipients added"); return }
    if (dailySentCount + recipients.length > DAILY_LIMIT) { alert(`Daily limit: ${DAILY_LIMIT}`); return }

    // Build a shuffled, no-repeat-until-exhausted sequence of variant indices.
    // e.g. with 5 templates and 12 recipients: shuffle [0-4] fully, then
    // reshuffle [0-4] again, then partial — guarantees no two consecutive
    // recipients ever get the same draft, and every variant gets used evenly.
    const buildVariantSequence = (count) => {
      // User manually changed the editor's subject/body — that edit wins.
      // Don't let randomization silently overwrite it with a stock template.
      if (isManuallyEdited) return Array(count).fill(null)
      if (!rotateVariants || templates.length === 0) return Array(count).fill(null)
      const seq = []
      while (seq.length < count) {
        const shuffled = templates.map((_, i) => i).sort(() => Math.random() - 0.5)
        seq.push(...shuffled)
      }
      return seq.slice(0, count)
    }
    const variantSequence = buildVariantSequence(recipients.length)

    // Unique ID for this specific batch — lets us tell apart "email sent to
    // X on Monday" vs "email sent to X again on Wednesday" in tracking,
    // since Brevo groups events by recipient email otherwise.
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    // ── SCHEDULED MODE ──
    // Sends all "send commands" to Brevo right now, but each carries a scheduledAt
    // timestamp. Brevo holds them on their server and releases each one at its
    // own time. Your laptop/browser can close immediately after this loop finishes —
    // Brevo does the actual sending independently.
    if (scheduleMode) {
      if (!scheduleDate || !scheduleTime) { alert("Date aur time dono select karo"); return }
      const baseTime = new Date(`${scheduleDate}T${scheduleTime}:00`)
      if (baseTime.getTime() <= Date.now()) { alert("Schedule time future mein hona chahiye"); return }

      setSending(true)
      setSendProgress({ current: 0, total: recipients.length, scheduling: true })
      const queue = [...recipients]

      for (let i = 0; i < queue.length; i++) {
        const recipient = queue[i]
        setSendProgress({ current: i + 1, total: queue.length, scheduling: true })
        const sender = senders[Math.floor(Math.random() * senders.length)]
        // Pick a random draft variant per recipient (unless rotation is off) so
        // not everyone gets byte-identical subject/body — much safer for spam filters
        const variantIdx = variantSequence[i]
        const preview = getPreviewFor(recipient, variantIdx)
        // Stagger each recipient by 15-20s from the base time so they don't all
        // land in inboxes at the exact same second (looks more human to spam filters)
        const sendAt = new Date(baseTime.getTime() + i * (15000 + Math.floor(Math.random() * 5000)))
        try {
          await brevoSendEmail({
            fromEmail: sender.email, fromName: sender.name,
            toEmail: recipient.email, toName: recipient.name || recipient.company,
            subject: preview.subject, htmlContent: textToHtml(preview.body),
            tags: [selectedIndustry, activeCategory, batchId],
            scheduledAt: sendAt.toISOString(),
          })
          setSentLog(prev => [...prev, { email: recipient.email, company: recipient.company, status: "scheduled", scheduledFor: sendAt.toLocaleString(), time: new Date().toLocaleTimeString(), sender: sender.email, batchId, variantUsed: variantIdx !== null ? variantIdx + 1 : "current editor" }])
        } catch (err) {
          setSentLog(prev => [...prev, { email: recipient.email, company: recipient.company, status: "error", error: err.message, time: new Date().toLocaleTimeString(), sender: sender.email, batchId }])
        }
        await new Promise(r => setTimeout(r, 200)) // tiny gap just for API calls, not the actual send
      }
      setSending(false)
      setSendProgress(null)
      setRecipients([])
      alert(`✅ ${queue.length} emails scheduled. Brevo will send them automatically starting ${baseTime.toLocaleString()} — laptop band kar sakte ho.`)
      return
    }

    // ── IMMEDIATE MODE (existing behavior) ──
    setSending(true)
    setSendProgress({ current: 0, total: recipients.length })
    const queue = [...recipients]

    for (let i = 0; i < queue.length; i++) {
      const recipient = queue[i]
      setSendProgress({ current: i + 1, total: queue.length })
      // Random sender selection
      const sender = senders[Math.floor(Math.random() * senders.length)]
      const variantIdx = variantSequence[i]
      const preview = getPreviewFor(recipient, variantIdx)
      try {
        await brevoSendEmail({
          fromEmail: sender.email, fromName: sender.name,
          toEmail: recipient.email, toName: recipient.name || recipient.company,
          subject: preview.subject, htmlContent: textToHtml(preview.body),
          tags: [selectedIndustry, activeCategory, batchId],
        })
        setSentLog(prev => [...prev, { email: recipient.email, company: recipient.company, status: "sent", time: new Date().toLocaleTimeString(), sender: sender.email, batchId, variantUsed: variantIdx !== null ? variantIdx + 1 : "current editor" }])
        setDailySentCount(c => c + 1)
      } catch (err) {
        setSentLog(prev => [...prev, { email: recipient.email, company: recipient.company, status: "error", error: err.message, time: new Date().toLocaleTimeString(), sender: sender.email, batchId }])
      }
      // Random 15-20s human-like gap between sends (skip after last one)
      if (i < queue.length - 1) {
        const gapMs = 15000 + Math.floor(Math.random() * 5000) // 15-20s
        for (let remaining = Math.ceil(gapMs / 1000); remaining > 0; remaining--) {
          setSendProgress({ current: i + 1, total: queue.length, waitingSec: remaining })
          await new Promise(r => setTimeout(r, 1000))
        }
      }
    }
    setSending(false)
    setSendProgress(null)
    setRecipients([]) // clear queue after successful batch send
  }


  const loadStats = async () => {
    setLoadingStats(true)
    const [s, e] = await Promise.all([brevoGetStats(), brevoGetEvents()])
    setStats(s); setEvents(e)
    setLoadingStats(false)
  }

  useEffect(() => { if (activeView === "analytics") loadStats() }, [activeView])

  // Group events by email + batch (campaign send) so that sending the same
  // person 2 separate emails shows as 2 separate cards instead of merging.
  // Brevo returns our custom tags array on each event — the batchId we sent
  // is in there, so we extract it to tell sends apart.
  const extractBatchId = (ev) => {
    const tags = ev.tags || []
    const found = tags.find(t => typeof t === "string" && t.startsWith("batch_"))
    return found || "untagged" // events from before this feature existed, or sent outside this tool
  }
  const eventsByEmailBatch = events.reduce((acc, ev) => {
    const key = `${ev.email}__${extractBatchId(ev)}`
    if (!acc[key]) acc[key] = { email: ev.email, batchId: extractBatchId(ev), events: [] }
    acc[key].events.push(ev)
    return acc
  }, {})
  // Kept for backward compatibility with anything still using the old grouping
  const eventsByEmail = events.reduce((acc, ev) => {
    if (!acc[ev.email]) acc[ev.email] = []
    acc[ev.email].push(ev)
    return acc
  }, {})

  // Analytics computed
  const sent = stats?.requests || 0
  const delivered = stats?.delivered || 0
  const opened = stats?.uniqueOpens || 0
  const clicked = stats?.uniqueClicks || 0
  const bounced = (stats?.hardBounces || 0) + (stats?.softBounces || 0)
  const spam = stats?.spamReports || 0
  const openRate = delivered > 0 ? (opened / delivered) * 100 : 0
  const bounceRate = sent > 0 ? (bounced / sent) * 100 : 0
  const spamRate = delivered > 0 ? (spam / delivered) * 100 : 0

  let healthScore = 100
  if (openRate < 5) healthScore -= 30; else if (openRate < 15) healthScore -= 15; else if (openRate < 20) healthScore -= 5
  if (bounceRate > 5) healthScore -= 30; else if (bounceRate > 2) healthScore -= 15; else if (bounceRate > 1) healthScore -= 5
  if (spamRate > 0.5) healthScore -= 35; else if (spamRate > 0.1) healthScore -= 20; else if (spamRate > 0.05) healthScore -= 10
  healthScore = Math.max(0, Math.min(100, healthScore))
  const healthColor = healthScore >= 75 ? C.green : healthScore >= 50 ? C.yellow : C.red

  const warnings = []
  if (spam > 0) warnings.push({ level: "red", msg: `🚨 ${spam} spam report${spam > 1 ? "s" : ""} — ${spamRate.toFixed(3)}% spam rate. Gmail threshold is 0.1%. Pause and review immediately.` })
  if (bounceRate > 2) warnings.push({ level: bounceRate > 5 ? "red" : "yellow", msg: `⚠️ Bounce rate ${bounceRate.toFixed(1)}% — remove invalid emails. Safe limit: <2%.` })
  if (openRate < 5 && delivered > 20) warnings.push({ level: "yellow", msg: `⚠️ Open rate ${openRate.toFixed(1)}% is very low — mails likely going to spam/promotions folder.` })
  if (warnings.length === 0 && delivered > 0) warnings.push({ level: "green", msg: "✅ All metrics healthy. Keep monitoring after each campaign." })

  // Filter events for tracking tab
  const filteredEvents = trackingFilter === "all" ? events : events.filter(e => e.event === trackingFilter)

  // ── RENDER ──

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "Inter,sans-serif", fontSize: 14 }}>

      {/* Top nav */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "0 24px", display: "flex", alignItems: "center", gap: 4, background: C.surface }}>
        {[
          { id: "compose", label: "✍️ Compose & Send" },
          { id: "tracking", label: `👁 Per-Email Tracking` },
          { id: "analytics", label: "📊 Analytics" },
          { id: "senders", label: `📮 Senders (${senders.length})` },
          { id: "sent", label: `📤 Sent Log (${sentLog.length})` },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveView(tab.id)} style={{
            padding: "14px 16px", background: "none", border: "none", cursor: "pointer",
            color: activeView === tab.id ? C.accent : C.textMuted,
            borderBottom: activeView === tab.id ? `2px solid ${C.accent}` : "2px solid transparent",
            fontWeight: activeView === tab.id ? 600 : 400, fontSize: 13, whiteSpace: "nowrap",
          }}>{tab.label}</button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: C.textMuted }}>
            Today: <span style={{ color: dailySentCount > 400 ? C.red : C.green, fontWeight: 700 }}>{dailySentCount}</span>/{DAILY_LIMIT}
          </div>
          {!BREVO_API_KEY && <div style={{ fontSize: 11, background: C.yellowDim, color: C.yellow, padding: "4px 10px", borderRadius: 6 }}>⚠️ Add VITE_BREVO_API_KEY to .env</div>}
        </div>
      </div>

      {/* ── COMPOSE ── */}
      {activeView === "compose" && (
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", height: "calc(100vh - 49px)" }}>

          {/* Left */}
          <div style={{ borderRight: `1px solid ${C.border}`, overflowY: "auto", background: C.surface }}>

            {/* Industry */}
            <div style={{ padding: 16, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Industry</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {Object.keys(TEMPLATE_LIBRARY).map(ind => (
                  <button key={ind} onClick={() => { setSelectedIndustry(ind); setSelectedCategory(""); setSelectedTemplateIdx(0) }} style={{
                    padding: "5px 10px", borderRadius: 6,
                    border: `1px solid ${selectedIndustry === ind ? C.accent : C.border2}`,
                    background: selectedIndustry === ind ? C.accentDim : "transparent",
                    color: selectedIndustry === ind ? C.accent : C.textMuted, cursor: "pointer", fontSize: 12,
                  }}>{ind}</button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Category</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {categories.map(cat => (
                  <button key={cat} onClick={() => { setSelectedCategory(cat); setSelectedTemplateIdx(0) }} style={{
                    padding: "5px 10px", borderRadius: 6,
                    border: `1px solid ${activeCategory === cat ? C.accent : C.border2}`,
                    background: activeCategory === cat ? C.accentDim : "transparent",
                    color: activeCategory === cat ? C.accent : C.textMuted, cursor: "pointer", fontSize: 12,
                  }}>{cat}</button>
                ))}
              </div>
            </div>

            {/* Draft variants */}
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Draft Variant</div>
              <div style={{ display: "flex", gap: 6 }}>
                {templates.map((t, i) => (
                  <button key={t.id} onClick={() => setSelectedTemplateIdx(i)} style={{
                    width: 34, height: 34, borderRadius: 6,
                    border: `1px solid ${selectedTemplateIdx === i ? C.accent : C.border2}`,
                    background: selectedTemplateIdx === i ? C.accentDim : "transparent",
                    color: selectedTemplateIdx === i ? C.accent : C.textMuted, cursor: "pointer", fontWeight: 700,
                  }}>{i + 1}</button>
                ))}
              </div>
            </div>

            {/* Sender info */}
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>Sending From</div>
                <button onClick={() => setActiveView("senders")} style={{ fontSize: 11, color: C.accent, background: "none", border: "none", cursor: "pointer" }}>Manage →</button>
              </div>
              {senders.length === 0 ? (
                <div style={{ fontSize: 12, color: C.yellow }}>No senders — go to Senders tab to add</div>
              ) : (
                <div style={{ fontSize: 12, color: C.textMuted }}>
                  🔀 Random from <span style={{ color: C.text, fontWeight: 600 }}>{senders.length} sender{senders.length > 1 ? "s" : ""}</span>
                  <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {senders.map(s => (
                      <div key={s.id} style={{ fontSize: 10, background: C.accentDim, color: C.accent, padding: "2px 6px", borderRadius: 4 }}>{s.email}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Recipients */}
            <div style={{ padding: "12px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>Recipients ({recipients.length})</div>
                {leads.some(l => l.email || l.allEmails?.length) && (
                  <button onClick={importFromLeads} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 5, border: `1px solid ${C.accent}44`, background: C.accentDim, color: C.accent, cursor: "pointer" }}>+ From leads</button>
                )}
              </div>

              {/* Bulk paste — main entry point */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  <button onClick={() => setShowBulkPaste(true)} style={{
                    flex: 1, padding: "6px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                    border: `1px solid ${showBulkPaste ? C.accent : C.border2}`,
                    background: showBulkPaste ? C.accentDim : "transparent",
                    color: showBulkPaste ? C.accent : C.textMuted,
                  }}>📋 Bulk Paste</button>
                  <button onClick={() => setShowBulkPaste(false)} style={{
                    flex: 1, padding: "6px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                    border: `1px solid ${!showBulkPaste ? C.accent : C.border2}`,
                    background: !showBulkPaste ? C.accentDim : "transparent",
                    color: !showBulkPaste ? C.accent : C.textMuted,
                  }}>➕ Single Add</button>
                </div>

                {showBulkPaste ? (
                  <div>
                    <textarea
                      value={bulkPasteText}
                      onChange={e => setBulkPasteText(e.target.value)}
                      placeholder={`Paste multiple emails — ek line mein ek:\n\nemail1@x.com, Name, Company\nemail2@x.com, Name2, Company2\nemail3@x.com\n\n(comma, pipe ya tab se separate kar sakte ho — sirf email bhi chalega)`}
                      style={{
                        width: "100%", height: 110, background: C.card, border: `1px solid ${C.border2}`,
                        color: C.text, padding: "8px 10px", borderRadius: 6, fontSize: 11,
                        fontFamily: "monospace", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6,
                      }}
                    />
                    <button onClick={() => {
                      const count = addBulkRecipients(bulkPasteText)
                      if (count) { setBulkPasteText(""); }
                    }} style={{
                      width: "100%", marginTop: 6, background: C.accentDim, border: `1px solid ${C.accent}44`,
                      color: C.accent, padding: 8, borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600,
                    }}>📥 Add All from Paste</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <input placeholder="Email *" value={addEmailInput} onChange={e => setAddEmailInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addManualRecipient()}
                      style={{ background: C.card, border: `1px solid ${C.border2}`, color: C.text, padding: "7px 10px", borderRadius: 6, fontSize: 12 }} />
                    <input placeholder="Name" value={addNameInput} onChange={e => setAddNameInput(e.target.value)}
                      style={{ background: C.card, border: `1px solid ${C.border2}`, color: C.text, padding: "7px 10px", borderRadius: 6, fontSize: 12 }} />
                    <input placeholder="Company" value={addCompanyInput} onChange={e => setAddCompanyInput(e.target.value)}
                      style={{ background: C.card, border: `1px solid ${C.border2}`, color: C.text, padding: "7px 10px", borderRadius: 6, fontSize: 12 }} />
                    <button onClick={addManualRecipient} style={{ background: C.accentDim, border: `1px solid ${C.accent}44`, color: C.accent, padding: 7, borderRadius: 6, cursor: "pointer", fontSize: 12 }}>+ Add Recipient</button>
                  </div>
                )}
              </div>

              {/* List */}

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {recipients.map(r => (
                  <div key={r.email} style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>{r.company || r.name || r.email}</div>
                        <div style={{ color: C.textMuted, fontSize: 11 }}>{r.email}</div>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => setPreviewRecipient(previewRecipient?.email === r.email ? null : r)} style={{ fontSize: 10, padding: "3px 7px", borderRadius: 4, border: `1px solid ${C.border2}`, background: "transparent", color: C.textMuted, cursor: "pointer" }}>👁</button>
                        <button onClick={() => removeRecipient(r.email)} style={{ fontSize: 10, padding: "3px 7px", borderRadius: 4, border: `1px solid ${C.redDim}`, background: "transparent", color: C.red, cursor: "pointer" }}>✕</button>
                      </div>
                    </div>
                    <input placeholder="Custom line for this company..."
                      value={customLines[r.email] || ""}
                      onChange={e => setCustomLines(prev => ({ ...prev, [r.email]: e.target.value }))}
                      style={{ marginTop: 8, width: "100%", background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: "5px 8px", borderRadius: 5, fontSize: 11, boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — editor */}
          <div style={{ display: "flex", flexDirection: "column", overflowY: "auto" }}>
            <div style={{ padding: "20px 24px 0" }}>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Subject</div>
              <input value={subjectOverride} onChange={e => setSubjectOverride(e.target.value)}
                style={{ width: "100%", background: C.card, border: `1px solid ${C.border2}`, color: C.text, padding: "10px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600, boxSizing: "border-box" }} />
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>Variables: {'{{company}}'} {'{{contact}}'} {'{{city}}'} {'{{custom_line}}'} {'{{sender_name}}'}</div>
            </div>

            <div style={{ padding: "16px 24px", flex: 1 }}>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Body</div>
              <textarea value={bodyOverride} onChange={e => setBodyOverride(e.target.value)}
                style={{ width: "100%", height: 340, background: C.card, border: `1px solid ${C.border2}`, color: C.text, padding: 14, borderRadius: 8, fontSize: 13, lineHeight: 1.7, resize: "vertical", boxSizing: "border-box", fontFamily: "monospace" }} />
            </div>

            {/* Preview panel */}
            {previewRecipient && (() => {
              const p = getPreviewFor(previewRecipient)
              return (
                <div style={{ margin: "0 24px 16px", background: C.card, border: `1px solid ${C.border2}`, borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>Preview — {previewRecipient.company || previewRecipient.email}</div>
                    <button onClick={() => setPreviewRecipient(null)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer" }}>✕</button>
                  </div>
                  <div style={{ padding: 16 }}>
                    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>SUBJECT</div>
                    <div style={{ fontWeight: 700, marginBottom: 14 }}>{p.subject}</div>
                    <div style={{ background: "#fff", borderRadius: 6, padding: 16 }} dangerouslySetInnerHTML={{ __html: textToHtml(p.body) }} />
                  </div>
                </div>
              )
            })()}

            {/* Send bar */}
            <div style={{ padding: "16px 24px 24px", borderTop: `1px solid ${C.border}` }}>

              {/* Now vs Schedule toggle */}
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button onClick={() => setScheduleMode(false)} style={{
                  padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                  border: `1px solid ${!scheduleMode ? C.accent : C.border2}`,
                  background: !scheduleMode ? C.accentDim : "transparent",
                  color: !scheduleMode ? C.accent : C.textMuted,
                }}>⚡ Send Now</button>
                <button onClick={() => setScheduleMode(true)} style={{
                  padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                  border: `1px solid ${scheduleMode ? C.green : C.border2}`,
                  background: scheduleMode ? C.greenDim : "transparent",
                  color: scheduleMode ? C.green : C.textMuted,
                }}>📅 Schedule for Later</button>
              </div>

              {/* Variant rotation toggle — prevents everyone getting identical email */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 12 }}>
                <button onClick={() => setRotateVariants(!rotateVariants)} style={{
                  width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", position: "relative",
                  background: rotateVariants ? C.accent : C.border2, transition: "background .15s",
                }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 3,
                    left: rotateVariants ? 19 : 3, transition: "left .15s",
                  }} />
                </button>
                <span style={{ color: rotateVariants ? C.text : C.textMuted }}>
                  🎲 Randomize draft per recipient {rotateVariants && templates.length > 1 ? `(rotating across all ${templates.length} variants)` : ""}
                </span>
                {!rotateVariants && <span style={{ color: C.yellow, fontSize: 11 }}>⚠️ everyone gets the exact same subject/body — riskier for spam filters</span>}
                {isManuallyEdited && (
                  <span style={{ color: C.cyan, fontSize: 11, background: C.cyanDim, padding: "3px 8px", borderRadius: 5 }}>
                    ✏️ You edited this draft — your version will be used for everyone (randomization paused)
                  </span>
                )}
              </div>

              {scheduleMode && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, background: C.card, border: `1px solid ${C.border2}`, borderRadius: 8, padding: "10px 14px" }}>
                  <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    style={{ background: C.surface, border: `1px solid ${C.border2}`, color: C.text, padding: "6px 10px", borderRadius: 6, fontSize: 12 }} />
                  <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                    style={{ background: C.surface, border: `1px solid ${C.border2}`, color: C.text, padding: "6px 10px", borderRadius: 6, fontSize: 12 }} />
                  <span style={{ fontSize: 11, color: C.textMuted }}>
                    Brevo apne server pe hold karega aur exact time pe khud bhej dega — laptop band ho sakta hai
                  </span>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={sendAll} disabled={sending || recipients.length === 0 || !BREVO_API_KEY || senders.length === 0} style={{
                  padding: "12px 28px", borderRadius: 8, border: "none",
                  background: (sending || recipients.length === 0 || !BREVO_API_KEY || senders.length === 0) ? C.border2 : (scheduleMode ? C.green : C.accent),
                  color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
                }}>
                  {sending && sendProgress
                    ? sendProgress.scheduling
                      ? `📅 Scheduling ${sendProgress.current}/${sendProgress.total}...`
                      : sendProgress.waitingSec
                        ? `⏳ Sent ${sendProgress.current}/${sendProgress.total} — next in ${sendProgress.waitingSec}s`
                        : `⏳ Sending ${sendProgress.current}/${sendProgress.total}...`
                    : scheduleMode
                      ? `📅 Schedule ${recipients.length} email${recipients.length !== 1 ? "s" : ""}`
                      : `🚀 Send to ${recipients.length} recipient${recipients.length !== 1 ? "s" : ""}`}
                </button>
                <div style={{ fontSize: 12, color: C.textMuted }}>
                  {senders.length > 1 ? `🔀 Random across ${senders.length} senders` : "Single sender"}
                </div>
                {sentLog.length > 0 && (
                  <div style={{ marginLeft: "auto", fontSize: 12 }}>
                    <span style={{ color: C.green }}>✓ {sentLog.filter(s => s.status === "sent" || s.status === "scheduled").length} {scheduleMode ? "scheduled" : "sent"}</span>
                    {sentLog.some(s => s.status === "error") && <span style={{ color: C.red, marginLeft: 8 }}>✗ {sentLog.filter(s => s.status === "error").length} failed</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      )}

      {/* ── PER-EMAIL TRACKING ── */}
      {activeView === "tracking" && (
        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontWeight: 700, fontSize: 20 }}>Per-Email Tracking</h2>
            <div style={{ display: "flex", gap: 8 }}>
              {["all","opened","clicked","spam","bounced","unsubscribed"].map(f => (
                <button key={f} onClick={() => setTrackingFilter(f)} style={{
                  padding: "6px 12px", borderRadius: 6, border: `1px solid ${trackingFilter === f ? C.accent : C.border2}`,
                  background: trackingFilter === f ? C.accentDim : "transparent",
                  color: trackingFilter === f ? C.accent : C.textMuted, cursor: "pointer", fontSize: 12, textTransform: "capitalize",
                }}>{f}</button>
              ))}
              <button onClick={loadStats} disabled={loadingStats} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.border2}`, background: C.card, color: C.text, cursor: "pointer", fontSize: 12 }}>
                {loadingStats ? "..." : "🔄"}
              </button>
            </div>
          </div>

          {!BREVO_API_KEY ? (
            <div style={{ background: C.yellowDim, border: `1px solid ${C.yellow}44`, borderRadius: 10, padding: 24, color: C.yellow, fontSize: 13 }}>
              Add <code>VITE_BREVO_API_KEY</code> to .env to see tracking data.
            </div>
          ) : Object.keys(eventsByEmailBatch).length === 0 ? (
            <div style={{ color: C.textMuted, textAlign: "center", padding: 60 }}>
              {loadingStats ? "Loading..." : "No events yet. Send some emails first, then refresh."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.values(eventsByEmailBatch)
                .filter(({ events: evs }) => trackingFilter === "all" || evs.some(e => e.event === trackingFilter))
                .sort((a, b) => new Date(b.events[0]?.date) - new Date(a.events[0]?.date))
                .map(({ email, batchId, events: evs }) => {
                  const opens = evs.filter(e => e.event === "opened")
                  const clicks = evs.filter(e => e.event === "clicked")
                  const isSpam = evs.some(e => e.event === "spam")
                  const isBounced = evs.some(e => e.event === "bounced" || e.event === "hardBounce" || e.event === "softBounce")
                  const isUnsub = evs.some(e => e.event === "unsubscribed")
                  const lastSeen = evs.reduce((latest, e) => (!latest || new Date(e.date) > new Date(latest)) ? e.date : latest, null)
                  // Match this batch back to our sentLog to show which draft/sender was used
                  const sentMeta = sentLog.find(s => s.batchId === batchId && s.email === email)

                  return (
                    <div key={`${email}__${batchId}`} style={{ background: C.card, border: `2px solid ${isSpam ? C.red : isUnsub ? C.yellow : isBounced ? C.yellow : C.border2}`, borderRadius: 10, padding: "14px 18px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{email}</div>
                          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                            {batchId === "untagged" ? "Sent before tracking upgrade — can't separate from other sends to this person" : `Send batch: ${batchId.replace("batch_", "").split("_")[0]}`}
                            {sentMeta?.variantUsed && <span> · Draft variant {sentMeta.variantUsed}</span>}
                          </div>
                          <div style={{ fontSize: 11, color: C.textMuted }}>
                            Last activity: {lastSeen ? new Date(lastSeen).toLocaleString() : "—"}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {isSpam && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, background: C.redDim, color: C.red, fontWeight: 700 }}>🚨 SPAM</span>}
                          {isUnsub && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, background: C.yellowDim, color: C.yellow, fontWeight: 700 }}>🚫 UNSUBSCRIBED</span>}
                          {isBounced && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, background: C.yellowDim, color: C.yellow, fontWeight: 700 }}>BOUNCED</span>}
                          {opens.length > 0 && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, background: C.accentDim, color: C.accent, fontWeight: 700 }}>👁 {opens.length}x opened</span>}
                          {clicks.length > 0 && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, background: C.cyanDim, color: C.cyan, fontWeight: 700 }}>🖱 {clicks.length}x clicked</span>}
                        </div>
                      </div>

                      {/* Timeline of events */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {evs.sort((a, b) => new Date(a.date) - new Date(b.date)).map((ev, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                            <div style={{
                              width: 8, height: 8, borderRadius: "50%",
                              background: ev.event === "opened" ? C.accent : ev.event === "clicked" ? C.cyan : ev.event === "delivered" ? C.green : ev.event === "spam" ? C.red : ev.event === "unsubscribed" ? C.yellow : C.yellow,
                              flexShrink: 0,
                            }} />
                            <div style={{ color: ev.event === "spam" ? C.red : ev.event === "unsubscribed" ? C.yellow : ev.event === "opened" ? C.accent : C.textMuted, fontWeight: (ev.event === "spam" || ev.event === "unsubscribed") ? 700 : 400, textTransform: "capitalize" }}>
                              {ev.event === "spam" ? "🚨 Marked as Spam" : ev.event === "unsubscribed" ? "🚫 Unsubscribed" : ev.event}
                            </div>
                            <div style={{ color: C.textDim, marginLeft: "auto" }}>{new Date(ev.date).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}

      {/* ── ANALYTICS ── */}
      {activeView === "analytics" && (
        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontWeight: 700, fontSize: 20 }}>Analytics (last 7 days)</h2>
            <button onClick={loadStats} disabled={loadingStats} style={{ padding: "8px 16px", borderRadius: 7, border: `1px solid ${C.border2}`, background: C.card, color: C.text, cursor: "pointer", fontSize: 13 }}>
              {loadingStats ? "Loading..." : "🔄 Refresh"}
            </button>
          </div>

          {!BREVO_API_KEY ? (
            <div style={{ background: C.yellowDim, border: `1px solid ${C.yellow}44`, borderRadius: 10, padding: 24, color: C.yellow, fontSize: 13 }}>
              Add <code>VITE_BREVO_API_KEY=your-key</code> to .env. Get it at <b>app.brevo.com</b> → Settings → API Keys.
            </div>
          ) : !stats ? (
            <div style={{ color: C.textMuted, textAlign: "center", padding: 60 }}>{loadingStats ? "Loading..." : "Click Refresh"}</div>
          ) : (
            <>
              {/* Health score */}
              <div style={{ background: C.card, border: `2px solid ${healthColor}44`, borderRadius: 12, padding: 20, marginBottom: 16, display: "flex", gap: 24, alignItems: "center" }}>
                <div style={{ textAlign: "center", minWidth: 80 }}>
                  <div style={{ fontSize: 52, fontWeight: 900, color: healthColor, lineHeight: 1 }}>{healthScore}</div>
                  <div style={{ fontSize: 11, color: healthColor, fontWeight: 700, marginTop: 4 }}>{healthScore >= 75 ? "HEALTHY" : healthScore >= 50 ? "AT RISK" : "POOR"}</div>
                  <div style={{ fontSize: 10, color: C.textMuted }}>Inbox Health</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ background: C.border, borderRadius: 6, height: 8, marginBottom: 10, overflow: "hidden" }}>
                    <div style={{ background: healthColor, width: `${healthScore}%`, height: "100%", borderRadius: 6 }} />
                  </div>
                  {warnings.map((w, i) => (
                    <div key={i} style={{ fontSize: 12, padding: "7px 12px", borderRadius: 7, marginBottom: 6,
                      background: w.level === "red" ? C.redDim : w.level === "yellow" ? C.yellowDim : C.greenDim,
                      color: w.level === "red" ? C.red : w.level === "yellow" ? C.yellow : C.green,
                    }}>{w.msg}</div>
                  ))}
                </div>
              </div>

              {/* Stat cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(145px, 1fr))", gap: 10, marginBottom: 16 }}>
                {[
                  { label: "Sent", value: sent, sub: "requests", color: C.textMuted },
                  { label: "Delivered", value: delivered, sub: `${delivered > 0 ? ((delivered/sent)*100).toFixed(1) : 0}%`, color: C.green },
                  { label: "Opened", value: opened, sub: `${openRate.toFixed(1)}% of delivered`, color: C.accent },
                  { label: "Clicked", value: clicked, sub: `${opened > 0 ? ((clicked/opened)*100).toFixed(1) : 0}% of opened`, color: C.cyan },
                  { label: "Bounced", value: bounced, sub: `${bounceRate.toFixed(1)}%`, color: bounceRate > 2 ? C.red : C.textMuted },
                  { label: "Spam Reports", value: spam, sub: `${spamRate.toFixed(3)}%`, color: spam > 0 ? C.red : C.textMuted },
                  { label: "Unsubscribed", value: stats?.unsubscribed || 0, sub: "opt-outs", color: C.textMuted },
                ].map(s => (
                  <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Info box */}
              <div style={{ background: "#ffffff06", border: `1px solid ${C.border2}`, borderRadius: 10, padding: 16, fontSize: 12, color: C.textMuted, lineHeight: 1.8 }}>
                <div style={{ fontWeight: 700, color: C.text, marginBottom: 6 }}>ℹ️ About spam tracking</div>
                <b style={{ color: C.text }}>What Brevo tracks:</b> When someone actively clicks "Report Spam" in Gmail/Outlook (via feedback loop). Also tracks hard bounces (email doesn't exist) and soft bounces (inbox full).<br/>
                <b style={{ color: C.text }}>What can't be tracked:</b> Gmail/Outlook silently moving mail to spam folder — this is invisible to all ESPs including Brevo.<br/>
                <b style={{ color: C.text }}>Key signal:</b> If open rate drops below 5% on a fresh list → your mails are likely landing in spam/promotions. Go to Per-Email Tracking tab for individual details.
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SENDERS MANAGEMENT ── */}
      {activeView === "senders" && (
        <div style={{ padding: 24, maxWidth: 600 }}>
          <h2 style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 20 }}>Sender Emails</h2>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 24 }}>
            Each email is randomly selected when sending. All must be verified in Brevo dashboard (Settings → Senders & IPs).
          </div>

          {/* Add new */}
          <div style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Add Sender Email</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input placeholder="Email address *" value={newSenderEmail} onChange={e => setNewSenderEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addSender()}
                style={{ background: C.surface, border: `1px solid ${C.border2}`, color: C.text, padding: "9px 12px", borderRadius: 7, fontSize: 13 }} />
              <input placeholder="Display name (default: Manas Jain)" value={newSenderName} onChange={e => setNewSenderName(e.target.value)}
                style={{ background: C.surface, border: `1px solid ${C.border2}`, color: C.text, padding: "9px 12px", borderRadius: 7, fontSize: 13 }} />
              <button onClick={addSender} style={{ background: C.accent, border: "none", color: "#fff", padding: "10px", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                + Add Sender
              </button>
            </div>
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 10 }}>
              💡 Tip: Use emails from different domains for better deliverability (e.g. @gmail.com, @yourdomain.com)
            </div>
          </div>

          {/* List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {senders.length === 0 ? (
              <div style={{ color: C.textMuted, textAlign: "center", padding: 40 }}>No senders added yet.</div>
            ) : senders.map((s, i) => (
              <div key={s.id} style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 9, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.accentDim, display: "flex", alignItems: "center", justifyContent: "center", color: C.accent, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  {(s.name || s.email)[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{s.email}</div>
                </div>
                <div style={{ fontSize: 11, color: C.textDim, marginRight: 8 }}>#{i + 1}</div>
                <button onClick={() => removeSender(s.id)} style={{ background: C.redDim, border: `1px solid ${C.red}33`, color: C.red, padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                  Remove
                </button>
              </div>
            ))}
          </div>

          {senders.length > 0 && (
            <div style={{ marginTop: 16, fontSize: 12, color: C.textMuted, background: C.greenDim, border: `1px solid ${C.green}33`, borderRadius: 8, padding: "10px 14px" }}>
              ✅ {senders.length} sender{senders.length > 1 ? "s" : ""} configured. Emails will be sent from a randomly selected sender each time.
            </div>
          )}
        </div>
      )}

      {/* ── SENT LOG ── */}
      {activeView === "sent" && (
        <div style={{ padding: 24 }}>
          <h2 style={{ margin: "0 0 20px", fontWeight: 700, fontSize: 20 }}>Sent Log (this session)</h2>
          {sentLog.length === 0 ? (
            <div style={{ color: C.textMuted, textAlign: "center", padding: 60 }}>No emails sent yet.</div>
          ) : (
            <div style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 10, overflow: "hidden" }}>
              {sentLog.map((log, i) => (
                <div key={i} style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, fontWeight: 700,
                    background: log.status === "sent" ? C.greenDim : C.redDim,
                    color: log.status === "sent" ? C.green : C.red,
                  }}>{log.status === "sent" ? "✓ SENT" : "✗ FAILED"}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{log.company || log.email}</div>
                    <div style={{ color: C.textMuted, fontSize: 11 }}>{log.email} · via {log.sender}</div>
                    {log.error && <div style={{ color: C.red, fontSize: 11 }}>{log.error}</div>}
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: 11, color: C.textMuted }}>{log.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}