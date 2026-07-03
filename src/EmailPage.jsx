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

// ============================================================
// TEMPLATE LIBRARY — loaded from localStorage (user-editable)
// ============================================================

const DEFAULT_TEMPLATE_LIBRARY = {}

const loadTemplateLibrary = () => {
  try {
    const saved = localStorage.getItem("bi_template_library")
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Object.keys(parsed).length > 0) return parsed
    }
  } catch {}
  return DEFAULT_TEMPLATE_LIBRARY
}

const saveTemplateLibrary = (lib) => {
  try { localStorage.setItem("bi_template_library", JSON.stringify(lib)) } catch {}
}

// ============================================================
// BREVO API FUNCTIONS===========================
// BREVO CONFIG — add these to your .env
// VITE_BREVO_API_KEY=xkeysib-xxxx   (Settings → API Keys in Brevo)
// Sender IDs configured in Brevo dashboard under Senders & IPs
// ============================================================


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
// GROQ AI — inbox score + spam-trigger analysis
// VITE_INBOX_GROQ_KEY_1 / _2 / _3 — multiple keys rotate for extra headroom
// ============================================================

const GROQ_KEYS = [
  import.meta.env.VITE_INBOX_GROQ_KEY_1 || "",
  import.meta.env.VITE_INBOX_GROQ_KEY_2 || "",
  import.meta.env.VITE_INBOX_GROQ_KEY_3 || "",
].filter(Boolean)

let groqKeyIdx = Math.floor(Math.random() * Math.max(GROQ_KEYS.length, 1))

const groqAnalyzeEmail = async (subject, body) => {
  if (GROQ_KEYS.length === 0) throw new Error("Koi VITE_INBOX_GROQ_KEY_* .env mein nahi mila")

  const prompt = `You are an email deliverability expert. Analyze this cold outreach email and respond ONLY with valid JSON, no markdown, no preamble.

Subject: ${subject}
Body: ${body}

Return exactly this JSON structure:
{
  "score": <number 0-100, chance of landing in primary inbox, higher is better>,
  "criticalIssues": [<array of short strings, specific spam-trigger phrases or patterns found in THIS email, empty array if none>],
  "suggestions": [<array of short, actionable improvement suggestions specific to THIS email's actual text>]
}`

  let lastError = null
  for (let attempt = 0; attempt < GROQ_KEYS.length; attempt++) {
    const key = GROQ_KEYS[groqKeyIdx % GROQ_KEYS.length]
    groqKeyIdx++
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 429) { lastError = new Error(data.error?.message || "Rate limited"); continue }
        throw new Error(data.error?.message || `Groq error ${res.status}`)
      }
      const raw = data.choices?.[0]?.message?.content || "{}"
      return JSON.parse(raw)
    } catch (err) {
      lastError = err
      continue
    }
  }
  throw lastError || new Error("Saari Groq keys fail ho gayi")
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
  const [templateLibrary, setTemplateLibrary] = useState(() => loadTemplateLibrary())
  const [selectedIndustry, setSelectedIndustry] = useState(() => { const lib = loadTemplateLibrary(); return Object.keys(lib)[0] || "" })
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
  const [addCityInput, setAddCityInput] = useState("")

  const [bulkPasteText, setBulkPasteText] = useState("")
  const [showBulkPaste, setShowBulkPaste] = useState(true)

  // ── Sending ──
  const [sending, setSending] = useState(false)
  const [sendProgress, setSendProgress] = useState(null) // {current, total, waitingSec}
  const [scheduleMode, setScheduleMode] = useState(false)
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [rotateVariants, setRotateVariants] = useState(true) // randomize draft per recipient by default
const [sentLog, setSentLog] = useState(() => {
  try { return JSON.parse(localStorage.getItem("email_sent_log") || "[]") } catch { return [] }
})
const [dailySentCount, setDailySentCount] = useState(() => {
  try {
    const saved = JSON.parse(localStorage.getItem("email_daily_count") || "null")
    if (saved && saved.date === new Date().toDateString()) return saved.count
    return 0
  } catch { return 0 }
})

useEffect(() => {
  try { localStorage.setItem("email_daily_count", JSON.stringify({ date: new Date().toDateString(), count: dailySentCount })) } catch {}
}, [dailySentCount])
  const senderIdxRef = useRef(Math.floor(Math.random() * Math.max(senders.length, 1)))

  // ── Analytics ──
  const [stats, setStats] = useState(null)
  const [events, setEvents] = useState([])
  const [loadingStats, setLoadingStats] = useState(false)
  const [trackingFilter, setTrackingFilter] = useState("all") // all | opened | clicked | spam | bounced

  // ── Preview ──
  const [previewRecipient, setPreviewRecipient] = useState(null)
  // ── AI Analysis ──
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [analyzingAi, setAnalyzingAi] = useState(false)
  const [aiError, setAiError] = useState("")
  const [lastAnalyzedContent, setLastAnalyzedContent] = useState(null) // {subject, body} jo last analyze hua tha

  const DAILY_LIMIT = 500

  // Derived
  const categories = Object.keys(templateLibrary[selectedIndustry] || {})
  const activeCategory = selectedCategory || categories[0] || ""
  const templates = templateLibrary[selectedIndustry]?.[activeCategory] || []
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

  // ── Template Manager states ──
  const [tmIndustryInput, setTmIndustryInput] = useState("")
  const [tmSelectedIndustry, setTmSelectedIndustry] = useState("")
  const [tmCategoryInput, setTmCategoryInput] = useState("")
  const [tmSelectedCategory, setTmSelectedCategory] = useState("")
  const [tmEditingVariant, setTmEditingVariant] = useState(null) // {industryKey, categoryKey, variantIdx}
  const [tmVariantSubject, setTmVariantSubject] = useState("")
  const [tmVariantBody, setTmVariantBody] = useState("")

  // Save templateLibrary to localStorage whenever it changes
  useEffect(() => { saveTemplateLibrary(templateLibrary) }, [templateLibrary])

  // Template manager helpers
  const tmAddIndustry = () => {
    const name = tmIndustryInput.trim()
    if (!name || templateLibrary[name]) return
    const updated = { ...templateLibrary, [name]: {} }
    setTemplateLibrary(updated)
    setTmSelectedIndustry(name)
    setTmIndustryInput("")
  }

  const tmDeleteIndustry = (ind) => {
    if (!window.confirm(`Delete industry "${ind}" and all its templates?`)) return
    const updated = { ...templateLibrary }
    delete updated[ind]
    setTemplateLibrary(updated)
    if (tmSelectedIndustry === ind) setTmSelectedIndustry(Object.keys(updated)[0] || "")
  }

  const tmAddCategory = () => {
    if (!tmSelectedIndustry || !tmCategoryInput.trim()) return
    const name = tmCategoryInput.trim()
    if (templateLibrary[tmSelectedIndustry]?.[name]) return
    // Create 5 blank variants
    const blankVariants = [1,2,3,4,5].map(i => ({
      id: `${tmSelectedIndustry}_${name}_v${i}_${Date.now()}`,
      subject: "",
      body: "",
    }))
    const updated = {
      ...templateLibrary,
      [tmSelectedIndustry]: { ...templateLibrary[tmSelectedIndustry], [name]: blankVariants }
    }
    setTemplateLibrary(updated)
    setTmSelectedCategory(name)
    setTmCategoryInput("")
    // Auto-open first variant for editing
    setTmEditingVariant({ industryKey: tmSelectedIndustry, categoryKey: name, variantIdx: 0 })
    setTmVariantSubject("")
    setTmVariantBody("")
  }

  const tmDeleteCategory = (ind, cat) => {
    if (!window.confirm(`Delete category "${cat}" and all its variants?`)) return
    const updated = { ...templateLibrary, [ind]: { ...templateLibrary[ind] } }
    delete updated[ind][cat]
    setTemplateLibrary(updated)
    if (tmSelectedCategory === cat) setTmSelectedCategory("")
  }

  const tmOpenVariant = (ind, cat, idx) => {
    const variant = templateLibrary[ind]?.[cat]?.[idx]
    if (!variant) return
    setTmEditingVariant({ industryKey: ind, categoryKey: cat, variantIdx: idx })
    setTmVariantSubject(variant.subject || "")
    setTmVariantBody(variant.body || "")
  }

  const tmSaveVariant = () => {
    if (!tmEditingVariant) return
    const { industryKey, categoryKey, variantIdx } = tmEditingVariant
    const updated = JSON.parse(JSON.stringify(templateLibrary))
    updated[industryKey][categoryKey][variantIdx].subject = tmVariantSubject
    updated[industryKey][categoryKey][variantIdx].body = tmVariantBody
    setTemplateLibrary(updated)
    // Also update compose view if currently viewing same industry/category
    if (selectedIndustry === industryKey && activeCategory === categoryKey && selectedTemplateIdx === variantIdx) {
      setSubjectOverride(tmVariantSubject)
      setBodyOverride(tmVariantBody)
    }
  }

  // Save senders to localStorage when changed
  useEffect(() => {
    try { localStorage.setItem("email_senders", JSON.stringify(senders)) } catch {}
  }, [senders])
  useEffect(() => {
  try { localStorage.setItem("email_sent_log", JSON.stringify(sentLog)) } catch {}
}, [sentLog])

  const addSender = () => {
    if (!newSenderEmail.trim() || !newSenderEmail.includes("@")) return
    if (senders.find(s => s.email === newSenderEmail.trim())) return
    setSenders(prev => [...prev, { id: Date.now(), name: newSenderName.trim() || "Manas Jain", email: newSenderEmail.trim() }])
    setNewSenderEmail(""); setNewSenderName("")
  }

  const removeSender = (id) => setSenders(prev => prev.filter(s => s.id !== id))
const runAiAnalysis = async () => {
    if (!subjectOverride.trim() && !bodyOverride.trim()) return
    setAnalyzingAi(true)
    setAiError("")
    try {
      const result = await groqAnalyzeEmail(subjectOverride, bodyOverride)
      setAiAnalysis(result)
      setLastAnalyzedContent({ subject: subjectOverride, body: bodyOverride })
    } catch (err) {
      setAiError(err.message)
      setAiAnalysis(null)
    }
    setAnalyzingAi(false)
  }

const isAlreadyAnalyzed = lastAnalyzedContent
    ? lastAnalyzedContent.subject === subjectOverride && lastAnalyzedContent.body === bodyOverride
    : false
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
      // Toggle is the single source of truth. If it's ON, always rotate across
      // variants regardless of any manual edits — editing a draft doesn't pause
      // randomization anymore. If it's OFF, current editor content goes to everyone.
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
// Per-recipient breakdown for the animated dashboard
const perRecipientBreakdown = Object.values(eventsByEmailBatch).map(({ email, batchId, events: evs }) => {
 // Per-sender health — one card + slice per verified sender email
const senderStats = senders.map(sdr => {
  const theirSends = sentLog.filter(log => log.sender === sdr.email && log.status === "sent")
  const batchKeys = [...new Set(theirSends.map(log => `${log.email}__${log.batchId}`))]
  let delivered = 0, opened = 0, clicked = 0, bounced = 0, spam = 0, unsub = 0
  batchKeys.forEach(key => {
    const evs = eventsByEmailBatch[key]?.events || []
    if (evs.some(e => e.event === "delivered")) delivered++
    if (evs.some(e => e.event === "opened")) opened++
    if (evs.some(e => e.event === "clicked")) clicked++
    if (evs.some(e => e.event === "bounced" || e.event === "hardBounce" || e.event === "softBounce")) bounced++
    if (evs.some(e => e.event === "spam")) spam++
    if (evs.some(e => e.event === "unsubscribed")) unsub++
  })
  const totalSent = theirSends.length
  const openRate = delivered > 0 ? (opened / delivered) * 100 : 0
  const bounceRate = totalSent > 0 ? (bounced / totalSent) * 100 : 0
  const spamRate = delivered > 0 ? (spam / delivered) * 100 : 0

  let score = 100
  if (openRate < 5) score -= 30; else if (openRate < 15) score -= 15; else if (openRate < 20) score -= 5
  if (bounceRate > 5) score -= 30; else if (bounceRate > 2) score -= 15; else if (bounceRate > 1) score -= 5
  if (spamRate > 0.5) score -= 35; else if (spamRate > 0.1) score -= 20; else if (spamRate > 0.05) score -= 10
  score = totalSent > 0 ? Math.max(0, Math.min(100, score)) : 100

  const color = totalSent === 0 ? C.textDim : score >= 75 ? C.green : score >= 50 ? C.yellow : C.red
  return { ...sdr, totalSent, delivered, opened, clicked, bounced, spam, unsub, openRate, bounceRate, spamRate, score, color }
})
const totalSentAll = senderStats.reduce((sum, s) => sum + s.totalSent, 0)
  const isSpam = evs.some(e => e.event === "spam")
  const isBounced = evs.some(e => e.event === "bounced" || e.event === "hardBounce" || e.event === "softBounce")
  const isDelivered = evs.some(e => e.event === "delivered")
  const isOpened = evs.some(e => e.event === "opened")
  const isClicked = evs.some(e => e.event === "clicked")
  const isUnsub = evs.some(e => e.event === "unsubscribed")
  let riskLevel = "safe"
  if (isSpam) riskLevel = "critical"
  else if (isBounced || isUnsub) riskLevel = "warning"
  else if (!isDelivered) riskLevel = "pending"
  const lastSeen = evs.reduce((latest, e) => (!latest || new Date(e.date) > new Date(latest)) ? e.date : latest, null)
  return { email, batchId, isDelivered, isOpened, isClicked, isSpam, isBounced, isUnsub, riskLevel, lastSeen }
}).sort((a, b) => new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0))

const riskCounts = perRecipientBreakdown.reduce((acc, r) => {
  acc[r.riskLevel] = (acc[r.riskLevel] || 0) + 1
  return acc
}, {})
  // ── RENDER ──
const senderStats = senders.map(sdr => {
  const theirSends = sentLog.filter(log => log.sender === sdr.email && log.status === "sent")
  const batchKeys = [...new Set(theirSends.map(log => `${log.email}__${log.batchId}`))]
  let delivered = 0, opened = 0, clicked = 0, bounced = 0, spam = 0, unsub = 0
  batchKeys.forEach(key => {
    const evs = eventsByEmailBatch[key]?.events || []
    if (evs.some(e => e.event === "delivered")) delivered++
    if (evs.some(e => e.event === "opened")) opened++
    if (evs.some(e => e.event === "clicked")) clicked++
    if (evs.some(e => e.event === "bounced" || e.event === "hardBounce" || e.event === "softBounce")) bounced++
    if (evs.some(e => e.event === "spam")) spam++
    if (evs.some(e => e.event === "unsubscribed")) unsub++
  })
  const totalSent = theirSends.length
  const openRate = delivered > 0 ? (opened / delivered) * 100 : 0
  const bounceRate = totalSent > 0 ? (bounced / totalSent) * 100 : 0
  const spamRate = delivered > 0 ? (spam / delivered) * 100 : 0

  let score = 100
  if (openRate < 5) score -= 30; else if (openRate < 15) score -= 15; else if (openRate < 20) score -= 5
  if (bounceRate > 5) score -= 30; else if (bounceRate > 2) score -= 15; else if (bounceRate > 1) score -= 5
  if (spamRate > 0.5) score -= 35; else if (spamRate > 0.1) score -= 20; else if (spamRate > 0.05) score -= 10
  score = totalSent > 0 ? Math.max(0, Math.min(100, score)) : 100

  const color = totalSent === 0 ? C.textDim : score >= 75 ? C.green : score >= 50 ? C.yellow : C.red
  return { ...sdr, totalSent, delivered, opened, clicked, bounced, spam, unsub, openRate, bounceRate, spamRate, score, color }
})
const totalSentAll = senderStats.reduce((sum, s) => sum + s.totalSent, 0)

// ── RENDER ──
return (

    
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "Inter,sans-serif", fontSize: 14 }}>
    <style>{`
      @keyframes fadeSlideIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
        50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
      }
    `}</style>
      {/* Top nav */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "0 24px", display: "flex", alignItems: "center", gap: 4, background: C.surface }}>
        {[
          { id: "compose", label: "✍️ Compose & Send" },
          { id: "templates", label: "📚 My Templates" },
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
                {Object.keys(templateLibrary).map(ind => (
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
                      <input placeholder="City" value={addCityInput} onChange={e => setAddCityInput(e.target.value)}
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
            {/* AI Inbox Score & Suggestions */}
<div style={{ padding: "0 24px 16px" }}>
<button onClick={runAiAnalysis} disabled={analyzingAi || (!subjectOverride.trim() && !bodyOverride.trim()) || isAlreadyAnalyzed} style={{    display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 8,
    border: `1px solid ${C.accent}44`, background: C.accentDim, color: C.accent,
    cursor: analyzingAi ? "wait" : "pointer", fontSize: 13, fontWeight: 600,
  }}>
    {analyzingAi ? "🧠 Analyzing..." : isAlreadyAnalyzed ? "✅ Analyzed — edit to re-check" : "🧠 Check Inbox Score & Get Suggestions"}
  </button>

  {aiError && (
    <div style={{ marginTop: 10, fontSize: 12, color: C.red, background: C.redDim, padding: "8px 12px", borderRadius: 6 }}>
      {aiError}
    </div>
  )}

  {aiAnalysis && !analyzingAi && (
    <div style={{ marginTop: 12, background: C.card, border: `1px solid ${C.border2}`, borderRadius: 10, padding: 16, animation: "fadeSlideIn 0.3s ease both" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: 36, fontWeight: 900, lineHeight: 1,
            color: aiAnalysis.score >= 75 ? C.green : aiAnalysis.score >= 50 ? C.yellow : C.red,
          }}>{aiAnalysis.score}</div>
          <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>Primary Inbox Score</div>
        </div>
        <div style={{ flex: 1, background: C.border, borderRadius: 6, height: 8, overflow: "hidden" }}>
          <div style={{
            width: `${aiAnalysis.score}%`, height: "100%", borderRadius: 6, transition: "width 0.6s ease",
            background: aiAnalysis.score >= 75 ? C.green : aiAnalysis.score >= 50 ? C.yellow : C.red,
          }} />
        </div>
      </div>

      {aiAnalysis.criticalIssues?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: C.red, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>🚨 Critical Points</div>
          {aiAnalysis.criticalIssues.map((issue, i) => (
            <div key={i} style={{ fontSize: 12, color: C.text, background: C.redDim, padding: "6px 10px", borderRadius: 6, marginBottom: 4 }}>{issue}</div>
          ))}
        </div>
      )}

      {aiAnalysis.suggestions?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>💡 Suggestions</div>
          {aiAnalysis.suggestions.map((s, i) => (
            <div key={i} style={{ fontSize: 12, color: C.text, background: C.accentDim, padding: "6px 10px", borderRadius: 6, marginBottom: 4 }}>{s}</div>
          ))}
        </div>
      )}
    </div>
  )}
</div>
{/* Variables reference — helps new users avoid typos like {{Customline}} */}
<div style={{ padding: "0 24px 16px" }}>
  <div style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 8, padding: "12px 16px" }}>
    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
      📌 Available Variables (case-sensitive, exact spelling zaroori hai)
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
      {[
        { code: "{{company}}", desc: "Recipient ka company name" },
        { code: "{{contact}}", desc: "Recipient ka naam" },
        { code: "{{city}}", desc: "Recipient ki city" },
        { code: "{{custom_line}}", desc: "Us recipient ke liye likha custom line" },
        { code: "{{sender_name}}", desc: "Jis sender se bhej rahe ho uska naam" },
      ].map(v => (
        <div key={v.code} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <code style={{
            fontSize: 12, fontWeight: 700, color: C.accent, background: C.accentDim,
            padding: "3px 8px", borderRadius: 5, width: "fit-content", fontFamily: "monospace",
          }}>{v.code}</code>
          <span style={{ fontSize: 11, color: C.textMuted }}>{v.desc}</span>
        </div>
      ))}
    </div>
  </div>
</div>
            {/* Preview panel */}
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
               {isManuallyEdited && !rotateVariants && (
                  <span style={{ color: C.cyan, fontSize: 11, background: C.cyanDim, padding: "3px 8px", borderRadius: 5 }}>
                    ✏️ Randomize toggle off hai — yeh edited version hi sabko jaayega
                  </span>
                )}
                {isManuallyEdited && rotateVariants && (
                  <span style={{ color: C.yellow, fontSize: 11, background: C.yellowDim, padding: "3px 8px", borderRadius: 5 }}>
                    ℹ️ Draft edit hua hai, lekin Randomize ON hai — sabhi variants rotate hongi (yeh edit sirf abhi ke liye editor mein hai)
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
        <div style={{ background: C.card, border: `2px solid ${healthColor}44`, borderRadius: 12, padding: 20, marginBottom: 16, display: "flex", gap: 24, alignItems: "center", animation: "fadeSlideIn 0.4s ease both" }}>
          <div style={{ textAlign: "center", minWidth: 80 }}>
            <div style={{ fontSize: 52, fontWeight: 900, color: healthColor, lineHeight: 1 }}>{healthScore}</div>
            <div style={{ fontSize: 11, color: healthColor, fontWeight: 700, marginTop: 4 }}>{healthScore >= 75 ? "HEALTHY" : healthScore >= 50 ? "AT RISK" : "POOR"}</div>
            <div style={{ fontSize: 10, color: C.textMuted }}>Inbox Health</div>
            <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>(combined across all senders)</div>

          </div>
          <div style={{ flex: 1 }}>
            <div style={{ background: C.border, borderRadius: 6, height: 8, marginBottom: 10, overflow: "hidden" }}>
              <div style={{ background: healthColor, width: `${healthScore}%`, height: "100%", borderRadius: 6, transition: "width 0.8s ease" }} />
            </div>
            {warnings.map((w, i) => (
              <div key={i} style={{ fontSize: 12, padding: "7px 12px", borderRadius: 7, marginBottom: 6,
                background: w.level === "red" ? C.redDim : w.level === "yellow" ? C.yellowDim : C.greenDim,
                color: w.level === "red" ? C.red : w.level === "yellow" ? C.yellow : C.green,
              }}>{w.msg}</div>
            ))}
          </div>
        </div>

        {/* Risk summary strip — quick visual of spam chances across all recipients */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {[
            { key: "critical", label: "🚨 Spam Risk", color: C.red, bg: C.redDim },
            { key: "warning", label: "⚠️ Bounced/Unsub", color: C.yellow, bg: C.yellowDim },
            { key: "pending", label: "⏳ Not Delivered Yet", color: C.textMuted, bg: "#ffffff08" },
            { key: "safe", label: "✅ Healthy", color: C.green, bg: C.greenDim },
          ].map((r, idx) => (
            <div key={r.key} style={{
              flex: 1, background: r.bg, border: `1px solid ${r.color}33`, borderRadius: 10, padding: "14px 16px",
              animation: `fadeSlideIn 0.4s ease ${idx * 0.08}s both`,
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: r.color }}>{riskCounts[r.key] || 0}</div>
              <div style={{ fontSize: 11, color: r.color, marginTop: 2 }}>{r.label}</div>
            </div>
          ))}
        </div>
        {/* Sender Health — pie chart + per-sender breakdown */}
<div style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 12, padding: 20, marginBottom: 16, display: "flex", gap: 28, alignItems: "flex-start", flexWrap: "wrap" }}>

  {/* Donut chart — send distribution across senders, sliced by that sender's health color */}
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 160 }}>
    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Send Distribution</div>
    {totalSentAll === 0 ? (
      <div style={{ width: 140, height: 140, borderRadius: "50%", border: `10px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.textDim, fontSize: 11, textAlign: "center" }}>
        No sends yet
      </div>
    ) : (
      <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
        {(() => {
          const r = 55, cx = 70, cy = 70, circumference = 2 * Math.PI * r
          let cumulative = 0
          return senderStats.filter(s => s.totalSent > 0).map((s, i) => {
            const fraction = s.totalSent / totalSentAll
            const dash = fraction * circumference
            const offset = -cumulative
            cumulative += dash
            return (
              <circle
                key={s.id} cx={cx} cy={cy} r={r} fill="none"
                stroke={s.color} strokeWidth="18"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={offset}
                style={{ transition: "stroke-dasharray 0.6s ease" }}
              />
            )
          })
        })()}
      </svg>
    )}
    <div style={{ marginTop: -95, fontSize: 20, fontWeight: 800, pointerEvents: "none" }}>{totalSentAll}</div>
    <div style={{ marginTop: 65, fontSize: 10, color: C.textDim, pointerEvents: "none" }}>total sent</div>
  </div>

  {/* Per-sender cards */}
  <div style={{ flex: 1, minWidth: 260, display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2, textTransform: "uppercase", letterSpacing: 1 }}>Per-Sender Health</div>
    {senderStats.length === 0 ? (
      <div style={{ color: C.textDim, fontSize: 12 }}>Koi sender add nahi kiya abhi.</div>
    ) : senderStats.map((s, idx) => (
      <div key={s.id} style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8,
        background: C.surface, border: `1px solid ${s.color}44`,
        animation: `fadeSlideIn 0.35s ease ${idx * 0.06}s both`,
      }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.email}</div>
          <div style={{ fontSize: 10, color: C.textDim, display: "flex", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
            <span>{s.totalSent} sent</span>
            <span>{s.delivered} delivered</span>
            <span style={{ color: C.accent }}>{s.opened} opened ({s.openRate.toFixed(0)}%)</span>
            {s.bounced > 0 && <span style={{ color: C.yellow }}>{s.bounced} bounced</span>}
            {s.spam > 0 && <span style={{ color: C.red, fontWeight: 700 }}>{s.spam} spam 🚨</span>}
          </div>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.score}</div>
          <div style={{ fontSize: 9, color: C.textDim }}>score</div>
        </div>
      </div>
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
          ].map((s, idx) => (
            <div key={s.label} style={{
              background: C.card, border: `1px solid ${C.border2}`, borderRadius: 10, padding: "14px 16px",
              animation: `fadeSlideIn 0.4s ease ${idx * 0.05}s both`,
            }}>
              <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Per-recipient breakdown — every mail, its status, and a direct Gmail link */}
        <div style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 13 }}>📋 Per-Recipient Breakdown ({perRecipientBreakdown.length})</div>
          {perRecipientBreakdown.length === 0 ? (
            <div style={{ color: C.textDim, fontSize: 12, textAlign: "center", padding: 20 }}>Koi data nahi abhi — email bhejo, phir yahan refresh karo.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 420, overflowY: "auto" }}>
              {perRecipientBreakdown.map((r, i) => (
                <div key={`${r.email}_${r.batchId}`} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8,
                  background: C.surface, border: `1px solid ${r.riskLevel === "critical" ? C.red + "44" : C.border2}`,
                  animation: `fadeSlideIn 0.3s ease ${Math.min(i * 0.03, 0.6)}s both`,
                }}>
                  <div style={{
                    width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
                    background: r.riskLevel === "critical" ? C.red : r.riskLevel === "warning" ? C.yellow : r.riskLevel === "pending" ? C.textDim : C.green,
                    animation: r.riskLevel === "critical" ? "pulseGlow 1.5s infinite" : "none",
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.email}</div>
                    <div style={{ fontSize: 10, color: C.textDim }}>{r.lastSeen ? new Date(r.lastSeen).toLocaleString() : "—"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {r.isDelivered && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: C.greenDim, color: C.green }}>✓ Delivered</span>}
                    {r.isOpened && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: C.accentDim, color: C.accent }}>👁 Opened</span>}
                    {r.isClicked && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: C.cyanDim, color: C.cyan }}>🖱 Clicked</span>}
                    {r.isSpam && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: C.redDim, color: C.red, fontWeight: 700 }}>🚨 Spam</span>}
                    {r.isBounced && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: C.yellowDim, color: C.yellow }}>⚠️ Bounced</span>}
                    {r.isUnsub && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: C.yellowDim, color: C.yellow }}>🚫 Unsub</span>}
                  </div>
                  
                  <a  href={`https://mail.google.com/mail/u/0/#search/from%3A${encodeURIComponent(r.email)}+OR+to%3A${encodeURIComponent(r.email)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 10, color: C.accent, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0, border: `1px solid ${C.accent}44`, padding: "3px 8px", borderRadius: 5 }}
                  >📬 Gmail</a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info box */}
        <div style={{ background: "#ffffff06", border: `1px solid ${C.border2}`, borderRadius: 10, padding: 16, fontSize: 12, color: C.textMuted, lineHeight: 1.8 }}>
          <div style={{ fontWeight: 700, color: C.text, marginBottom: 6 }}>ℹ️ About spam tracking</div>
          <b style={{ color: C.text }}>What Brevo tracks:</b> When someone actively clicks "Report Spam" in Gmail/Outlook (via feedback loop). Also tracks hard bounces (email doesn't exist) and soft bounces (inbox full).<br/>
          <b style={{ color: C.text }}>What can't be tracked:</b> Gmail/Outlook silently moving mail to spam folder — this is invisible to all ESPs including Brevo.<br/>
          <b style={{ color: C.text }}>Key signal:</b> If open rate drops below 5% on a fresh list → your mails are likely landing in spam/promotions.
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

      {/* ── TEMPLATE MANAGER ── */}
      {activeView === "templates" && (
        <div style={{ display: "grid", gridTemplateColumns: "220px 220px 1fr", height: "calc(100vh - 49px)" }}>

          {/* Column 1 — Industries */}
          <div style={{ borderRight: `1px solid ${C.border}`, overflowY: "auto", background: C.surface }}>
            <div style={{ padding: 14, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Industries</div>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={tmIndustryInput} onChange={e => setTmIndustryInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && tmAddIndustry()}
                  placeholder="New industry..."
                  style={{ flex: 1, background: C.card, border: `1px solid ${C.border2}`, color: C.text, padding: "6px 9px", borderRadius: 6, fontSize: 12 }} />
                <button onClick={tmAddIndustry} style={{ background: C.accent, border: "none", color: "#fff", padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>+</button>
              </div>
            </div>
            <div style={{ padding: 10 }}>
              {Object.keys(templateLibrary).length === 0 ? (
                <div style={{ color: C.textDim, fontSize: 12, padding: "20px 10px", textAlign: "center" }}>
                  Koi industry nahi — upar add karo<br/>
                  <span style={{ fontSize: 11 }}>e.g. "IT & Software", "CA Firms", "Real Estate"</span>
                </div>
              ) : Object.keys(templateLibrary).map(ind => (
                <div key={ind} onClick={() => { setTmSelectedIndustry(ind); setTmSelectedCategory(""); setTmEditingVariant(null) }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 7, marginBottom: 3, cursor: "pointer",
                    background: tmSelectedIndustry === ind ? C.accentDim : "transparent",
                    border: `1px solid ${tmSelectedIndustry === ind ? C.accent : "transparent"}`,
                  }}>
                  <div style={{ fontSize: 13, color: tmSelectedIndustry === ind ? C.accent : C.text, fontWeight: tmSelectedIndustry === ind ? 600 : 400, flex: 1 }}>{ind}</div>
                  <div style={{ fontSize: 10, color: C.textDim, marginRight: 6 }}>{Object.keys(templateLibrary[ind] || {}).length} cat</div>
                  <button onClick={e => { e.stopPropagation(); tmDeleteIndustry(ind) }} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 13, padding: "0 2px" }}>×</button>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2 — Categories */}
          <div style={{ borderRight: `1px solid ${C.border}`, overflowY: "auto", background: C.surface }}>
            <div style={{ padding: 14, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                {tmSelectedIndustry ? `Categories — ${tmSelectedIndustry}` : "Categories"}
              </div>
              {tmSelectedIndustry ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={tmCategoryInput} onChange={e => setTmCategoryInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && tmAddCategory()}
                    placeholder="New category..."
                    style={{ flex: 1, background: C.card, border: `1px solid ${C.border2}`, color: C.text, padding: "6px 9px", borderRadius: 6, fontSize: 12 }} />
                  <button onClick={tmAddCategory} style={{ background: C.accent, border: "none", color: "#fff", padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>+</button>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: C.textDim }}>Pehle industry select karo</div>
              )}
            </div>
            <div style={{ padding: 10 }}>
              {!tmSelectedIndustry ? null : Object.keys(templateLibrary[tmSelectedIndustry] || {}).length === 0 ? (
                <div style={{ color: C.textDim, fontSize: 12, padding: "20px 10px", textAlign: "center" }}>
                  Koi category nahi<br/>
                  <span style={{ fontSize: 11 }}>e.g. "Web Dev", "App Dev", "AI"</span>
                </div>
              ) : Object.keys(templateLibrary[tmSelectedIndustry]).map(cat => {
                const variants = templateLibrary[tmSelectedIndustry][cat] || []
                const filled = variants.filter(v => v.subject && v.body).length
                
                return (
                  <div key={cat} onClick={() => { setTmSelectedCategory(cat); setTmEditingVariant(null) }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 7, marginBottom: 3, cursor: "pointer",
                      background: tmSelectedCategory === cat ? C.accentDim : "transparent",
                      border: `1px solid ${tmSelectedCategory === cat ? C.accent : "transparent"}`,
                    }}>
                    <div>
                      <div style={{ fontSize: 13, color: tmSelectedCategory === cat ? C.accent : C.text, fontWeight: tmSelectedCategory === cat ? 600 : 400 }}>{cat}</div>
                      <div style={{ fontSize: 10, color: filled === 5 ? C.green : C.yellow, marginTop: 2 }}>
                        {filled}/5 variants {filled === 5 ? "✓" : "⚠️"}
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); tmDeleteCategory(tmSelectedIndustry, cat) }} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 13, padding: "0 2px" }}>×</button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Column 3 — Variant editor */}
          <div style={{ overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {!tmSelectedIndustry || !tmSelectedCategory ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.textDim, textAlign: "center", padding: 40 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📝</div>
                <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 6 }}>Industry aur category select karo</div>
                <div style={{ fontSize: 12 }}>Phir kisi bhi variant pe click karke subject + body type karo</div>
              </div>
            ) : (
              <>
                {/* Variant selector tabs */}
                <div style={{ padding: "16px 20px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
                    <span style={{ color: C.accent }}>{tmSelectedIndustry}</span> → <span style={{ color: C.text }}>{tmSelectedCategory}</span>
                    <span style={{ marginLeft: 8, color: C.textDim }}>5 variants (sabko alag subject + body chahiye)</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 0 }}>
                    {(templateLibrary[tmSelectedIndustry]?.[tmSelectedCategory] || []).map((v, idx) => {
                      const isFilled = v.subject && v.body
                      const isEditing = tmEditingVariant?.industryKey === tmSelectedIndustry && tmEditingVariant?.categoryKey === tmSelectedCategory && tmEditingVariant?.variantIdx === idx
                      return (
                        <button key={idx} onClick={() => tmOpenVariant(tmSelectedIndustry, tmSelectedCategory, idx)} style={{
                          padding: "7px 16px", borderRadius: "6px 6px 0 0", border: `1px solid ${isEditing ? C.accent : C.border2}`,
                          borderBottom: isEditing ? `1px solid ${C.bg}` : `1px solid ${C.border2}`,
                          background: isEditing ? C.bg : C.surface,
                          color: isEditing ? C.accent : isFilled ? C.text : C.textDim,
                          cursor: "pointer", fontSize: 13, fontWeight: isEditing ? 700 : 400,
                          position: "relative",
                        }}>
                          Variant {idx + 1}
                          {isFilled && <span style={{ position: "absolute", top: 3, right: 3, width: 5, height: 5, borderRadius: "50%", background: C.green }} />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Editor */}
                {tmEditingVariant ? (
                  <div style={{ flex: 1, padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                        Subject — Variant {tmEditingVariant.variantIdx + 1}
                      </div>
                      <input value={tmVariantSubject} onChange={e => setTmVariantSubject(e.target.value)}
                        placeholder="e.g. Quick question about {{company}}'s website"
                        style={{ width: "100%", background: C.card, border: `1px solid ${C.border2}`, color: C.text, padding: "10px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600, boxSizing: "border-box" }} />
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Body</div>
                      <textarea value={tmVariantBody} onChange={e => setTmVariantBody(e.target.value)}
                        placeholder={`Hi {{contact}},\n\n{{custom_line}}\n\n[apna pitch yahan likho]\n\nBest,\n{{sender_name}}`}
                        style={{ flex: 1, minHeight: 320, background: C.card, border: `1px solid ${C.border2}`, color: C.text, padding: 14, borderRadius: 8, fontSize: 13, lineHeight: 1.7, resize: "vertical", boxSizing: "border-box", fontFamily: "monospace", width: "100%" }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button onClick={tmSaveVariant} style={{ padding: "10px 24px", background: C.accent, border: "none", color: "#fff", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                        ✅ Save Variant {tmEditingVariant.variantIdx + 1}
                      </button>
                      {tmEditingVariant.variantIdx < 4 && (
                        <button onClick={() => { tmSaveVariant(); tmOpenVariant(tmSelectedIndustry, tmSelectedCategory, tmEditingVariant.variantIdx + 1) }}
                          style={{ padding: "10px 20px", background: C.accentDim, border: `1px solid ${C.accent}44`, color: C.accent, borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
                          Save & Next →
                        </button>
                      )}
                      <div style={{ fontSize: 11, color: C.textDim }}>
                        Variables: {'{{company}}'} {'{{contact}}'} {'{{city}}'} {'{{custom_line}}'} {'{{sender_name}}'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.textDim, fontSize: 13 }}>
                    Upar koi variant tab click karo to edit
                  </div>
                )}
              </>
            )}
          </div>
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

      {/* ── PREVIEW MODAL — fixed overlay, full screen ── */}
      {previewRecipient && (() => {
        const p = getPreviewFor(previewRecipient)
        const sender = senders[Math.floor(Math.random() * Math.max(senders.length, 1))]
        return (
          <>
            {/* Backdrop */}
            <div onClick={() => setPreviewRecipient(null)} style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
              zIndex: 1000, backdropFilter: "blur(4px)",
            }} />

            {/* Modal */}
            <div style={{
              position: "fixed",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(720px, 92vw)",
              maxHeight: "88vh",
              background: C.surface,
              border: `1px solid ${C.border2}`,
              borderRadius: 16,
              zIndex: 1001,
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 32px 96px rgba(0,0,0,0.6)",
              overflow: "hidden",
            }}>
              {/* Modal header */}
              <div style={{
                padding: "16px 24px",
                borderBottom: `1px solid ${C.border}`,
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: C.card, flexShrink: 0,
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    📧 Email Preview
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                    {previewRecipient.company || previewRecipient.name || previewRecipient.email}
                  </div>
                </div>
                <button onClick={() => setPreviewRecipient(null)} style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: C.border2, border: "none", color: C.text,
                  cursor: "pointer", fontSize: 16, display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}>✕</button>
              </div>

              {/* Email meta — From / To / Subject */}
              <div style={{
                padding: "16px 24px",
                borderBottom: `1px solid ${C.border}`,
                background: C.surface, flexShrink: 0,
              }}>
                {/* From / To row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div style={{ background: C.card, borderRadius: 8, padding: "10px 14px", border: `1px solid ${C.border2}` }}>
                    <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>From</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{sender?.name || "—"}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{sender?.email || "—"}</div>
                  </div>
                  <div style={{ background: C.card, borderRadius: 8, padding: "10px 14px", border: `1px solid ${C.border2}` }}>
                    <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>To</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{previewRecipient.name || previewRecipient.company || "—"}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{previewRecipient.email}</div>
                  </div>
                </div>

                {/* Subject */}
                <div style={{ background: C.card, borderRadius: 8, padding: "10px 14px", border: `1px solid ${C.border2}` }}>
                  <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Subject</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{p.subject}</div>
                </div>
              </div>

              {/* Email body — scrollable */}
              <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
                <div style={{
                  background: "#ffffff",
                  borderRadius: 10,
                  padding: "28px 32px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  minHeight: 200,
                }} dangerouslySetInnerHTML={{ __html: textToHtml(p.body) }} />
              </div>

              {/* Footer */}
              <div style={{
                padding: "14px 24px",
                borderTop: `1px solid ${C.border}`,
                background: C.card,
                display: "flex", justifyContent: "space-between", alignItems: "center",
                flexShrink: 0,
              }}>
                <div style={{ fontSize: 11, color: C.textDim }}>
                  Backdrop click karo ya ✕ press karo to close · Esc bhi kaam karta hai
                </div>
                <button onClick={() => setPreviewRecipient(null)} style={{
                  padding: "8px 20px", borderRadius: 7,
                  background: C.accent, border: "none",
                  color: "#fff", fontSize: 13, fontWeight: 600,
                  cursor: "pointer",
                }}>Close</button>
              </div>
            </div>
          </>
        )
      })()}
    </div>
  )
}