import { useState, useEffect, useRef } from "react";
import * as api from "./lib/api.js";

// ============================================================
// TEMPLATE ENGINE — kept client-side for accurate live preview.
// The actual send-time fill happens server-side in Email.gs using
// the identical logic; this is just a mirror for the Preview modal.
// ============================================================

const fillTemplate = (text, vars) =>
  (text || "")
    .replace(/\{\{company\}\}/g, vars.company || "your company")
    .replace(/\{\{contact\}\}/g, vars.contact || "there")
    .replace(/\{\{city\}\}/g, vars.city || "your city")
    .replace(/\{\{custom_line\}\}/g, vars.customLine || "")
    .replace(/\{\{sender_name\}\}/g, vars.senderName || "")

const textToHtml = (text) => {
  const escaped = (text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  const lines = escaped.split("\n")
  let html = '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#222;max-width:600px;">'
  for (let line of lines) {
    line = line.replace(/\[\[(\d+)\]\](.+?)\[\[\/\]\]/g, '<span style="font-size:$1px">$2</span>')
    line = line.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    line = line.replace(/\*(.+?)\*/g, "<i>$1</i>")
    if (line.trim().startsWith("•")) html += `<div style="margin:2px 0 2px 16px;">• ${line.trim().slice(1).trim()}</div>`
    else if (line.trim() === "") html += "<br/>"
    else html += `<div style="margin:2px 0;">${line}</div>`
  }
  html += "</div>"
  return html
}

// ============================================================
// CSV IMPORT — pure client-side parsing (no keys involved), same
// as before. Rows still get funneled through api.addRecipients().
// ============================================================

const parseCSV = (text) => {
  const rows = []
  let row = [], field = "", inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1]
    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++ }
      else if (c === '"') { inQuotes = false }
      else field += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === ",") { row.push(field); field = "" }
      else if (c === "\r") { /* skip */ }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = "" }
      else field += c
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows.filter(r => r.some(c => c.trim() !== ""))
}

const guessColumnIndex = (headers, patterns) => {
  const lower = headers.map(h => (h || "").toLowerCase().trim())
  for (const pat of patterns) { const idx = lower.findIndex(h => h === pat); if (idx !== -1) return idx }
  for (const pat of patterns) { const idx = lower.findIndex(h => h.includes(pat)); if (idx !== -1) return idx }
  return -1
}

const mapCsvToRecipients = (rows) => {
  if (rows.length < 2) return []
  const headers = rows[0]
  const emailIdx = guessColumnIndex(headers, ["best email", "email address", "email"])
  const allEmailsIdx = guessColumnIndex(headers, ["all emails"])
  const companyIdx = guessColumnIndex(headers, ["business name", "company name", "company"])
  const nameIdx = guessColumnIndex(headers, ["person 1 name", "contact name", "full name", "name"])
  const cityIdx = guessColumnIndex(headers, ["city"])
  const customLineIdx = guessColumnIndex(headers, ["custom line", "custom_line", "personalization", "custom message", "note"])

  return rows.slice(1).map(r => {
    let email = emailIdx !== -1 ? (r[emailIdx] || "").trim() : ""
    if (!email && allEmailsIdx !== -1) email = (r[allEmailsIdx] || "").split(";")[0].trim()
    return {
      email,
      name: nameIdx !== -1 ? (r[nameIdx] || "").trim() : "",
      company: companyIdx !== -1 ? (r[companyIdx] || "").trim() : "",
      city: cityIdx !== -1 ? (r[cityIdx] || "").trim() : "",
      customLine: customLineIdx !== -1 ? (r[customLineIdx] || "").trim() : "",
    }
  }).filter(r => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email))
}

// ============================================================
// COLORS
// ============================================================
const C = {
  bg: "#FFFFFF", surface: "#FFF7FA", card: "#FFFFFF",
  border: "#F1D9E5", border2: "#E3AFC7",
  accent: "#00BCD4", accentDim: "#00BCD41A",
  green: "#0DB88E", greenDim: "#0DB88E15",
  red: "#EF4462", redDim: "#EF446215",
  yellow: "#F5A524", yellowDim: "#F5A52415",
  cyan: "#FF5FA2", cyanDim: "#FF5FA21A",
  text: "#1B1F27", textMuted: "#6B7280", textDim: "#AAB2BD",
}

// ============================================================
// TOAST
// ============================================================
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
      animation: "toastSlideIn 0.25s ease both", maxWidth: 380,
    }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{isError ? "⚠️" : "✅"}</span>
      <span>{toast.message}</span>
    </div>
  )
}

function ConfirmModal({ state, onResult }) {
  if (!state) return null
  return (
    <>
      <div onClick={() => onResult(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 4000 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: "min(380px, 90vw)", background: C.card, border: `1px solid ${C.border2}`, borderRadius: 14,
        padding: 24, zIndex: 4001, boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
      }}>
        <p style={{ fontSize: 14, color: C.text, margin: "0 0 20px", lineHeight: 1.5 }}>{state.message}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={() => onResult(false)} style={{
            padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border2}`,
            background: "transparent", color: C.textMuted, fontSize: 13, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={() => onResult(true)} style={{
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: C.red, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>Confirm</button>
        </div>
      </div>
    </>
  )
}

function Spinner({ size = 13, color = "#fff" }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size,
      border: `2px solid ${color}55`, borderTopColor: color,
      borderRadius: "50%", animation: "nectarSpin 0.7s linear infinite", flexShrink: 0,
    }} />
  )
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function EmailPage({ leads = [] }) {
  const [toast, setToast] = useState(null)
  const showToast = (message, type = "success") => setToast({ id: Date.now(), message, type })
  const showApiError = (err) => showToast(err?.message || "Kuch galat ho gaya", "error")

 const [confirmState, setConfirmState] = useState(null)
  const showConfirm = (message) => new Promise((resolve) => setConfirmState({ message, resolve }))
  const handleConfirmResult = (result) => { confirmState?.resolve(result); setConfirmState(null) }

  const [clearingAll, setClearingAll] = useState(false)
  const [deletingIds, setDeletingIds] = useState(new Set())

  // Retry wrapper — Apps Script backend ek time pe ek hi request reliably handle karta hai,
  // isliye parallel deletes (Promise.all) kabhi-kabhi fail ho jaate hain. Retry se ye fix hota hai.
  const deleteWithRetry = async (id, attempts = 3) => {
    for (let i = 0; i < attempts; i++) {
      try { await api.deleteRecipient(id); return }
      catch (err) {
        if (i === attempts - 1) throw err
        await new Promise(r => setTimeout(r, 500 * (i + 1)))
      }
    }
  }

  // ── Senders — fetched from backend (which fetches from Brevo server-side) ──
  const [allSenders, setAllSenders] = useState([])
  const [loadingSenders, setLoadingSenders] = useState(false)
  const [sendersError, setSendersError] = useState("")
  const [activeSenderEmails, setActiveSenderEmails] = useState(() => {
    try { return JSON.parse(localStorage.getItem("email_active_senders") || "null") } catch { return null }
  })
  const [senderDropdownOpen, setSenderDropdownOpen] = useState(false)
  const senderDropdownRef = useRef(null)

  const senders = activeSenderEmails === null ? allSenders : allSenders.filter(s => activeSenderEmails.includes(s.email))

  const loadSenders = async () => {
    setLoadingSenders(true); setSendersError("")
    try { const { senders: rows } = await api.getSenders(); setAllSenders(rows) }
    catch (err) { setSendersError(err.message) }
    setLoadingSenders(false)
  }

  useEffect(() => { loadSenders() }, [])

  useEffect(() => {
    const handler = (e) => { if (senderDropdownRef.current && !senderDropdownRef.current.contains(e.target)) setSenderDropdownOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const toggleSenderActive = (email) => {
    setActiveSenderEmails(prev => {
      const base = prev === null ? allSenders.map(s => s.email) : prev
      return base.includes(email) ? base.filter(e => e !== email) : [...base, email]
    })
  }
  const isSenderActive = (email) => activeSenderEmails === null || activeSenderEmails.includes(email)

  useEffect(() => {
    try { localStorage.setItem("email_active_senders", JSON.stringify(activeSenderEmails)) } catch {}
  }, [activeSenderEmails])

  const [ccEmail, setCcEmail] = useState(() => { try { return localStorage.getItem("email_cc") || "" } catch { return "" } })
  useEffect(() => { try { localStorage.setItem("email_cc", ccEmail) } catch {} }, [ccEmail])

  const [attachments, setAttachments] = useState([])
  const attachmentInputRef = useRef(null)

  // ── Templates — now persisted in Sheets, fetched flat and grouped client-side ──
  const [activeView, setActiveView] = useState("compose")
  const [templateLibrary, setTemplateLibrary] = useState({})
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [selectedIndustry, setSelectedIndustry] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedTemplateIdx, setSelectedTemplateIdx] = useState(0)
  const [subjectOverride, setSubjectOverride] = useState("")
  const [bodyOverride, setBodyOverride] = useState("")
// ============================================================
const [driveFiles, setDriveFiles] = useState([])
const [loadingDriveFiles, setLoadingDriveFiles] = useState(false)
const [attachmentDropdownOpen, setAttachmentDropdownOpen] = useState(false)

const loadDriveFiles = async () => {
  setLoadingDriveFiles(true)
  try { const { files } = await api.listDriveAttachments(); setDriveFiles(files) }
  catch (err) { showApiError(err) }
  setLoadingDriveFiles(false)
}
useEffect(() => { loadDriveFiles() }, [])

const toggleAttachment = (file) => {
  setAttachments(prev =>
    prev.some(a => a.id === file.id) ? prev.filter(a => a.id !== file.id) : [...prev, { id: file.id, name: file.name, url: file.url }]
  )
}
  const groupTemplates = (rows) => {
    const grouped = {}
    rows.forEach(r => {
      if (!grouped[r.industry]) grouped[r.industry] = {}
      if (!grouped[r.industry][r.category]) grouped[r.industry][r.category] = [null, null, null, null, null]
      const idx = Number(r.variantIdx) || 0
      grouped[r.industry][r.category][idx] = { id: r.id, subject: r.subject, body: r.body }
    })
    Object.values(grouped).forEach(cats => Object.values(cats).forEach(arr => {
      for (let i = 0; i < 5; i++) if (!arr[i]) arr[i] = { id: null, subject: "", body: "" }
    }))
    return grouped
  }

  const loadTemplates = async () => {
    setLoadingTemplates(true)
    try {
      const { templates: rows } = await api.listTemplates()
      const grouped = groupTemplates(rows)
      setTemplateLibrary(grouped)
      setSelectedIndustry(prev => prev || Object.keys(grouped)[0] || "")
    } catch (err) { showApiError(err) }
    setLoadingTemplates(false)
  }

  useEffect(() => { loadTemplates() }, [])

  // ── Recipients — persisted in Sheets now (survives refresh/logout) ──
  const [recipients, setRecipients] = useState([])
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [customLineDrafts, setCustomLineDrafts] = useState({})
  const [addEmailInput, setAddEmailInput] = useState("")
  const [addNameInput, setAddNameInput] = useState("")
  const [addCompanyInput, setAddCompanyInput] = useState("")
  const [addCityInput, setAddCityInput] = useState("")
  const [bulkPasteText, setBulkPasteText] = useState("")
  const [recipientMode, setRecipientMode] = useState("bulk")
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ id: "", email: "", name: "", company: "", city: "" })

  const loadRecipients = async () => {
    setLoadingRecipients(true)
    try { const { recipients: rows } = await api.listRecipients(); setRecipients(rows) }
    catch (err) { showApiError(err) }
    setLoadingRecipients(false)
  }
  useEffect(() => { loadRecipients() }, [])

const [addingRecipients, setAddingRecipients] = useState(false)

  const addRecipientsBackend = async (list) => {
    if (!list.length) return 0
    setAddingRecipients(true)
    try { await api.addRecipients(list); await loadRecipients(); return list.length }
    catch (err) { showApiError(err); return 0 }
    finally { setAddingRecipients(false) }
  }

  // ── CSV import ──
  const [csvParsedRows, setCsvParsedRows] = useState([])
  const [csvFileName, setCsvFileName] = useState("")
  const [showCsvModal, setShowCsvModal] = useState(false)
  const [csvModalFilter, setCsvModalFilter] = useState("")
  const csvFileInputRef = useRef(null)
  const bodyRef = useRef(null)

  const [showRecipientsModal, setShowRecipientsModal] = useState(false)
  const [recipientsModalFilter, setRecipientsModalFilter] = useState("")

  // ── Sending — job-based now, with server-side pause/resume ──
  const [sendJob, setSendJob] = useState(null)
  const pollRef = useRef(null)
  const [rotateVariants, setRotateVariants] = useState(true)

  const [sentLog, setSentLog] = useState([])
  const loadSentLog = async () => {
    try { const { sentLog: rows } = await api.listSentLog(); setSentLog(rows) } catch {}
  }
  useEffect(() => { loadSentLog() }, [])

  const dailySentCount = sentLog.filter(l =>
    (l.status === "sent" || l.status === "scheduled") && new Date(l.time).toDateString() === new Date().toDateString()
  ).length
  const DAILY_LIMIT = 500

  const senderIdxRef = useRef(Math.floor(Math.random() * Math.max(senders.length, 1)))

  // ── Analytics (Brevo, via backend) ──
  const [stats, setStats] = useState(null)
  const [events, setEvents] = useState([])
  const [loadingStats, setLoadingStats] = useState(false)
  const [trackingFilter, setTrackingFilter] = useState("all")

  const [previewRecipient, setPreviewRecipient] = useState(null)
const [hoveredSender, setHoveredSender] = useState(null)
  // ── AI Analysis (via backend Groq) ──
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [analyzingAi, setAnalyzingAi] = useState(false)
  const [aiError, setAiError] = useState("")
  const [lastAnalyzedContent, setLastAnalyzedContent] = useState(null)

  // Derived
  const categories = Object.keys(templateLibrary[selectedIndustry] || {})
  const activeCategory = selectedCategory || categories[0] || ""
  const templates = templateLibrary[selectedIndustry]?.[activeCategory] || []
  const activeTemplate = templates[selectedTemplateIdx] || templates[0]

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
  const [tmEditingVariant, setTmEditingVariant] = useState(null)
  const [tmVariantSubject, setTmVariantSubject] = useState("")
  const [tmVariantBody, setTmVariantBody] = useState("")
const [selectedLogEntry, setSelectedLogEntry] = useState(null)
  const tmAddIndustry = () => {
    const name = tmIndustryInput.trim()
    if (!name || templateLibrary[name]) return
    setTemplateLibrary(prev => ({ ...prev, [name]: {} }))
    setTmSelectedIndustry(name)
    setTmIndustryInput("")
  }

 const tmDeleteIndustry = async (ind) => {
    const ok = await showConfirm(`Delete industry "${ind}" and all its templates?`)
    if (!ok) return
    const cats = templateLibrary[ind] || {}
    const ids = Object.values(cats).flat().filter(v => v.id).map(v => v.id)
    try {
      await Promise.all(ids.map(id => api.deleteTemplate(id)))
      setTemplateLibrary(prev => { const u = { ...prev }; delete u[ind]; return u })
      if (tmSelectedIndustry === ind) { setTmSelectedIndustry(""); setTmSelectedCategory("") }
      showToast("Industry deleted", "success")
    } catch (err) { showApiError(err) }
  }

  const tmAddCategory = () => {
    if (!tmSelectedIndustry || !tmCategoryInput.trim()) return
    const name = tmCategoryInput.trim()
    if (templateLibrary[tmSelectedIndustry]?.[name]) return
    const blankVariants = [0, 1, 2, 3, 4].map(() => ({ id: null, subject: "", body: "" }))
    setTemplateLibrary(prev => ({
      ...prev,
      [tmSelectedIndustry]: { ...prev[tmSelectedIndustry], [name]: blankVariants }
    }))
    setTmSelectedCategory(name)
    setTmCategoryInput("")
    setTmEditingVariant({ industryKey: tmSelectedIndustry, categoryKey: name, variantIdx: 0 })
    setTmVariantSubject("")
    setTmVariantBody("")
  }

const tmDeleteCategory = async (ind, cat) => {
    const ok = await showConfirm(`Delete category "${cat}" and all its variants?`)
    if (!ok) return
    const ids = (templateLibrary[ind]?.[cat] || []).filter(v => v.id).map(v => v.id)
    try {
      await Promise.all(ids.map(id => api.deleteTemplate(id)))
      setTemplateLibrary(prev => { const u = { ...prev, [ind]: { ...prev[ind] } }; delete u[ind][cat]; return u })
      if (tmSelectedCategory === cat) setTmSelectedCategory("")
      showToast("Category deleted", "success")
    } catch (err) { showApiError(err) }
  }

  const tmOpenVariant = (ind, cat, idx) => {
    const variant = templateLibrary[ind]?.[cat]?.[idx]
    if (!variant) return
    setTmEditingVariant({ industryKey: ind, categoryKey: cat, variantIdx: idx })
    setTmVariantSubject(variant.subject || "")
    setTmVariantBody(variant.body || "")
  }

  const tmSaveVariant = async () => {
    if (!tmEditingVariant) return
    if (!tmVariantSubject.trim() || !tmVariantBody.trim()) {
      showToast(
        !tmVariantSubject.trim() && !tmVariantBody.trim() ? "Subject aur Body dono khali hain — variant save nahi hua!"
          : !tmVariantSubject.trim() ? "Subject khali hai — variant save nahi hua!"
          : "Body khali hai — variant save nahi hua!",
        "error"
      )
      return
    }
    const { industryKey, categoryKey, variantIdx } = tmEditingVariant
    const existing = templateLibrary[industryKey]?.[categoryKey]?.[variantIdx]
    try {
      const { template } = await api.saveTemplate({
        id: existing?.id || undefined,
        industry: industryKey, category: categoryKey, variantIdx,
        subject: tmVariantSubject, body: tmVariantBody,
      })
      setTemplateLibrary(prev => {
        const updated = JSON.parse(JSON.stringify(prev))
        updated[industryKey][categoryKey][variantIdx] = { id: template.id, subject: tmVariantSubject, body: tmVariantBody }
        return updated
      })
      if (selectedIndustry === industryKey && activeCategory === categoryKey && selectedTemplateIdx === variantIdx) {
        setSubjectOverride(tmVariantSubject)
        setBodyOverride(tmVariantBody)
      }
      showToast(`Variant ${variantIdx + 1} saved!`, "success")
    } catch (err) { showApiError(err) }
  }

  const wrapSelection = (before, after = before) => {
    const el = bodyRef.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e, value } = el
    const selected = value.slice(s, e) || "text"
    const newVal = value.slice(0, s) + before + selected + after + value.slice(e)
    setBodyOverride(newVal)
    setTimeout(() => { el.focus(); el.setSelectionRange(s + before.length, s + before.length + selected.length) }, 0)
  }

  const runAiAnalysis = async () => {
    if (!subjectOverride.trim() && !bodyOverride.trim()) return
    setAnalyzingAi(true); setAiError("")
    try {
      const { analysis } = await api.analyzeInboxScore(subjectOverride, bodyOverride)
      setAiAnalysis(analysis)
      setLastAnalyzedContent({ subject: subjectOverride, body: bodyOverride })
    } catch (err) { setAiError(err.message); setAiAnalysis(null) }
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
      senderName: senders[senderIdxRef.current % Math.max(senders.length, 1)]?.name || "",
      customLine: recipient.customLine || "",
    }
    if (templateIdxOverride !== null && templates[templateIdxOverride]) {
      const t = templates[templateIdxOverride]
      return { subject: fillTemplate(t.subject, vars), body: fillTemplate(t.body, vars) }
    }
    return { subject: fillTemplate(subjectOverride, vars), body: fillTemplate(bodyOverride, vars) }
  }

  const importFromLeads = async () => {
    const enriched = leads.filter(l => l.email || l.allEmails?.length)
    const mapped = enriched.map(l => ({
      email: l.email || l.allEmails?.[0] || "",
      name: l.people?.[0]?.name || "",
      company: l.name || "",
      city: l.city || "",
    })).filter(r => r.email)
    const existing = new Set(recipients.map(r => r.email))
    const newOnes = mapped.filter(r => !existing.has(r.email))
    const count = await addRecipientsBackend(newOnes)
    if (count) showToast(`${count} recipient${count !== 1 ? "s" : ""} imported from leads!`, "success")
  }

  const addManualRecipient = async () => {
    if (!addEmailInput.trim()) { showToast("Email khali hai — bharo pehle!", "error"); return }
    const count = await addRecipientsBackend([{
      email: addEmailInput.trim(), name: addNameInput.trim(), company: addCompanyInput.trim(), city: addCityInput.trim(),
    }])
    if (count) {
      showToast("Recipient added!", "success")
      setAddEmailInput(""); setAddNameInput(""); setAddCompanyInput(""); setAddCityInput("")
    }
  }

  const handleBulkAdd = async () => {
    if (!bulkPasteText.trim()) return
    const lines = bulkPasteText.split("\n").map(l => l.trim()).filter(Boolean)
    const newOnes = []
    for (const line of lines) {
      const parts = line.split(/[,|\t]/).map(p => p.trim()).filter(Boolean)
      const emailPart = parts.find(p => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p))
      if (!emailPart) continue
      const rest = parts.filter(p => p !== emailPart)
      newOnes.push({ email: emailPart, name: rest[0] || "", company: rest[1] || "", city: rest[2] || "" })
    }
    if (!newOnes.length) { showToast("Koi valid email nahi mila paste mein!", "error"); return }
    const existing = new Set(recipients.map(r => r.email))
    const filtered = newOnes.filter(r => !existing.has(r.email))
    const count = await addRecipientsBackend(filtered)
    if (count) { setBulkPasteText(""); showToast(`${count} recipient${count !== 1 ? "s" : ""} added!`, "success") }
  }

  const handleCsvFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = String(ev.target.result || "")
      const rows = parseCSV(text)
      const mapped = mapCsvToRecipients(rows).map(r => ({ ...r, _selected: true }))
      setCsvParsedRows(mapped)
      setShowCsvModal(true)
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const toggleCsvRow = (idx) => setCsvParsedRows(prev => prev.map((r, i) => i === idx ? { ...r, _selected: !r._selected } : r))
  const toggleCsvAll = (val) => setCsvParsedRows(prev => prev.map(r => ({ ...r, _selected: val })))
  const csvSelectedCount = csvParsedRows.filter(r => r._selected).length

  const confirmCsvImport = async () => {
    const selected = csvParsedRows.filter(r => r._selected)
    const existing = new Set(recipients.map(r => r.email))
    const newOnes = selected.filter(r => !existing.has(r.email)).map(({ _selected, ...rest }) => rest)
    const count = await addRecipientsBackend(newOnes)
    setShowCsvModal(false); setCsvParsedRows([]); setCsvModalFilter("")
    if (count) showToast(`${count} recipient${count !== 1 ? "s" : ""} imported!`, "success")
  }

  const updateRecipientBackend = async (id, updated) => {
    try {
      await api.updateRecipient({ id, ...updated })
      setRecipients(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r))
    } catch (err) { showApiError(err) }
  }

const removeRecipient = async (id) => {
    if (deletingIds.has(id)) return // already deleting — ignore repeat clicks
    setDeletingIds(prev => new Set(prev).add(id))
    try {
      await deleteWithRetry(id)
      setRecipients(prev => prev.filter(r => r.id !== id))
    } catch (err) { showApiError(err) }
    setDeletingIds(prev => { const n = new Set(prev); n.delete(id); return n })
  }
 

  // ── Job polling ──
  const startPolling = (jobId, total) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const { job } = await api.getJob(jobId)
        let progress = {}
        try { progress = JSON.parse(job.progress || "{}") } catch {}
        setSendJob({ jobId, status: job.status, index: progress.index || 0, total, resultSummary: job.resultSummary })
        if (job.status === "done" || job.status === "error") {
          clearInterval(pollRef.current); pollRef.current = null
          if (job.status === "done") showToast(job.resultSummary || "Batch complete!", "success")
          else showToast(`Job failed: ${job.resultSummary}`, "error")
          loadSentLog()
        }
      } catch { /* transient — try again next tick */ }
    }, 4000)
  }

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const sendAll = async () => {
    if (!subjectOverride.trim() || !bodyOverride.trim()) {
      showToast(
        !subjectOverride.trim() && !bodyOverride.trim() ? "Subject aur Body dono khali hain — pehle bharo!"
          : !subjectOverride.trim() ? "Subject khali hai — mail bhejne se pehle bharo!"
          : "Body khali hai — mail bhejne se pehle bharo!",
        "error"
      )
      return
    }
    if (senders.length === 0) { showToast("Add at least one sender email", "error"); return }
    if (recipients.length === 0) { showToast("No recipients added", "error"); return }
    if (dailySentCount + recipients.length > DAILY_LIMIT) { showToast(`Daily limit: ${DAILY_LIMIT}`, "error"); return }

    try {
      const { jobId } = await api.startEmailSend({
        subject: subjectOverride,
        body: bodyOverride,
        templates: templates.filter(t => t.subject && t.body).map(t => ({ subject: t.subject, body: t.body })),
        rotateVariants,
        recipients: recipients.map(r => ({ email: r.email, name: r.name, company: r.company, city: r.city, customLine: r.customLine })),
        senders,
        ccEmail: ccEmail.trim(),
        attachments,
      })
      setSendJob({ jobId, status: "queued", index: 0, total: recipients.length })
      showToast(`Batch queued — ${recipients.length} recipient${recipients.length !== 1 ? "s" : ""}`, "success")
      startPolling(jobId, recipients.length)
    } catch (err) { showApiError(err) }
  }

  const handlePause = async () => {
    if (!sendJob) return
    try {
      await api.pauseJob(sendJob.jobId)
      showToast("Pause requested — takes effect once the current chunk finishes (up to ~4.5 min)", "success")
    } catch (err) { showApiError(err) }
  }

  const handleResume = async () => {
    if (!sendJob) return
    try {
      await api.resumeJob(sendJob.jobId)
      showToast("Resumed", "success")
      startPolling(sendJob.jobId, sendJob.total)
    } catch (err) { showApiError(err) }
  }

  const loadStats = async () => {
    setLoadingStats(true)
    try { const { stats: s, events: e } = await api.getEmailStats(); setStats(s); setEvents(e) }
    catch (err) { showApiError(err) }
    setLoadingStats(false)
  }

  useEffect(() => { if (activeView === "analytics") loadStats() }, [activeView])
  useEffect(() => { if (activeView === "sent") loadSentLog() }, [activeView])

  const extractBatchId = (ev) => {
    const tags = ev.tags || []
    const found = tags.find(t => typeof t === "string" && t.startsWith("batch_"))
    return found || "untagged"
  }
  const eventsByEmailBatch = events.reduce((acc, ev) => {
    const key = `${ev.email}__${extractBatchId(ev)}`
    if (!acc[key]) acc[key] = { email: ev.email, batchId: extractBatchId(ev), events: [] }
    acc[key].events.push(ev)
    return acc
  }, {})

  const sent = stats?.requests || 0
  const delivered = stats?.delivered || 0
  const opened = stats?.uniqueOpens || 0
  const clicked = stats?.uniqueClicks || 0
  const bounced = (stats?.hardBounces || 0) + (stats?.softBounces || 0)
  const spam = stats?.spamReports || 0
  const openRate = delivered > 0 ? (opened / delivered) * 100 : 0
  const bounceRate = sent > 0 ? (bounced / sent) * 100 : 0
  const spamRate = delivered > 0 ? (spam / delivered) * 100 : 0

let healthScore = null
if (delivered > 0) {
  healthScore = 100
  if (openRate < 5) healthScore -= 30; else if (openRate < 15) healthScore -= 15; else if (openRate < 20) healthScore -= 5
  if (bounceRate > 5) healthScore -= 30; else if (bounceRate > 2) healthScore -= 15; else if (bounceRate > 1) healthScore -= 5
  if (spamRate > 0.5) healthScore -= 35; else if (spamRate > 0.1) healthScore -= 20; else if (spamRate > 0.05) healthScore -= 10
  healthScore = Math.max(0, Math.min(100, healthScore))
}
const healthColor = healthScore === null ? C.textMuted : healthScore >= 75 ? C.green : healthScore >= 50 ? C.yellow : C.red

  const warnings = []
  if (spam > 0) warnings.push({ level: "red", msg: `🚨 ${spam} spam report${spam > 1 ? "s" : ""} — ${spamRate.toFixed(3)}% spam rate. Gmail threshold is 0.1%. Pause and review immediately.` })
  if (bounceRate > 2) warnings.push({ level: bounceRate > 5 ? "red" : "yellow", msg: `⚠️ Bounce rate ${bounceRate.toFixed(1)}% — remove invalid emails. Safe limit: <2%.` })
  if (openRate < 5 && delivered > 20) warnings.push({ level: "yellow", msg: `⚠️ Open rate ${openRate.toFixed(1)}% is very low — mails likely going to spam/promotions folder.` })
  if (warnings.length === 0 && delivered > 0) warnings.push({ level: "green", msg: "✅ All metrics healthy. Keep monitoring after each campaign." })

  const perRecipientBreakdown = Object.values(eventsByEmailBatch).map(({ email, batchId, events: evs }) => {
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

  const riskCounts = perRecipientBreakdown.reduce((acc, r) => { acc[r.riskLevel] = (acc[r.riskLevel] || 0) + 1; return acc }, {})

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

  const sending = sendJob && (sendJob.status === "queued" || sendJob.status === "running")
  const isPaused = sendJob && sendJob.status === "paused"

  // ── RENDER ──
  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "Inter,sans-serif", fontSize: 14 }}>
   <style>{`
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); } 50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); } }
        @keyframes toastSlideIn { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes nectarSpin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Top nav */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "0 24px", display: "flex", alignItems: "center", gap: 4, background: C.surface }}>
        {[
          { id: "compose", label: "✍️ Compose & Send" },
          { id: "templates", label: "📚 My Templates" },
          { id: "tracking", label: `👁 Per-Email Tracking` },
          { id: "analytics", label: "📊 Analytics" },
          { id: "senders", label: `📮 Senders (${senders.length}/${allSenders.length})` },
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
        </div>
      </div>

      {/* ── COMPOSE ── */}
      {activeView === "compose" && (
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", height: "calc(100vh - 49px)" }}>
          {/* Left */}
          <div style={{ borderRight: `1px solid ${C.border}`, overflowY: "auto", background: C.surface }}>
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
                {loadingTemplates && <span style={{ fontSize: 11, color: C.textDim }}>Loading...</span>}
              </div>
            </div>

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

            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Draft Variant</div>
              <div style={{ display: "flex", gap: 6 }}>
                {templates.map((t, i) => (
                  <button key={i} onClick={() => setSelectedTemplateIdx(i)} style={{
                    width: 34, height: 34, borderRadius: 6,
                    border: `1px solid ${selectedTemplateIdx === i ? C.accent : C.border2}`,
                    background: selectedTemplateIdx === i ? C.accentDim : "transparent",
                    color: selectedTemplateIdx === i ? C.accent : C.textMuted, cursor: "pointer", fontWeight: 700,
                  }}>{i + 1}</button>
                ))}
              </div>
            </div>

            {/* Sender info */}
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, position: "relative" }} ref={senderDropdownRef}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>Sending From</div>
                <button onClick={loadSenders} disabled={loadingSenders} style={{ fontSize: 11, color: C.accent, background: "none", border: "none", cursor: "pointer" }}>
                  {loadingSenders ? "..." : "🔄 Refresh"}
                </button>
              </div>

              {sendersError && (
                <div style={{ fontSize: 11, color: C.red, background: C.redDim, padding: "6px 8px", borderRadius: 5, marginBottom: 6 }}>{sendersError}</div>
              )}

              {allSenders.length === 0 && !loadingSenders && !sendersError ? (
                <div style={{ fontSize: 12, color: C.yellow }}>Brevo mein koi verified sender nahi mila.</div>
              ) : (
                <>
                  <button onClick={() => setSenderDropdownOpen(o => !o)} style={{
                    width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: C.card, border: `1px solid ${C.border2}`, color: C.text,
                    padding: "8px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12,
                  }}>
                    <span>🔀 {senders.length} of {allSenders.length} selected</span>
                    <span style={{ color: C.textMuted }}>{senderDropdownOpen ? "▲" : "▼"}</span>
                  </button>

                  {senderDropdownOpen && (
                    <div style={{
                      position: "absolute", left: 16, right: 16, marginTop: 4, zIndex: 50,
                      background: C.card, border: `1px solid ${C.border2}`, borderRadius: 8,
                      maxHeight: 240, overflowY: "auto", boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
                    }}>
                      {allSenders.map(s => (
                        <label key={s.id || s.email} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", fontSize: 12 }}>
                          <input type="checkbox" checked={isSenderActive(s.email)} onChange={() => toggleSenderActive(s.email)} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: C.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name || s.email}</div>
                            <div style={{ color: C.textMuted, fontSize: 10 }}>{s.email}</div>
                          </div>
                          {s.active === false && <span style={{ fontSize: 9, color: C.yellow }}>unverified</span>}
                        </label>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {senders.map(s => (
                      <div key={s.id || s.email} style={{ fontSize: 10, background: C.accentDim, color: C.accent, padding: "2px 6px", borderRadius: 4 }}>{s.email}</div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Recipients */}
            <div style={{ padding: "12px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>Recipients ({recipients.length}){loadingRecipients ? "…" : ""}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {recipients.length > 0 && (
                    <button onClick={() => setShowRecipientsModal(true)} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 5, border: `1px solid ${C.border2}`, background: "transparent", color: C.textMuted, cursor: "pointer" }}>🔍 View all</button>
                  )}
                  {leads.some(l => l.email || l.allEmails?.length) && (
                    <button onClick={importFromLeads} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 5, border: `1px solid ${C.accent}44`, background: C.accentDim, color: C.accent, cursor: "pointer" }}>+ From leads</button>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  <button onClick={() => setRecipientMode("bulk")} style={{
                    flex: 1, padding: "6px 8px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                    border: `1px solid ${recipientMode === "bulk" ? C.accent : C.border2}`,
                    background: recipientMode === "bulk" ? C.accentDim : "transparent",
                    color: recipientMode === "bulk" ? C.accent : C.textMuted,
                  }}>📋 Bulk Paste</button>
                  <button onClick={() => setRecipientMode("single")} style={{
                    flex: 1, padding: "6px 8px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                    border: `1px solid ${recipientMode === "single" ? C.accent : C.border2}`,
                    background: recipientMode === "single" ? C.accentDim : "transparent",
                    color: recipientMode === "single" ? C.accent : C.textMuted,
                  }}>➕ Single Add</button>
                  <button onClick={() => setRecipientMode("csv")} style={{
                    flex: 1, padding: "6px 8px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                    border: `1px solid ${recipientMode === "csv" ? C.accent : C.border2}`,
                    background: recipientMode === "csv" ? C.accentDim : "transparent",
                    color: recipientMode === "csv" ? C.accent : C.textMuted,
                  }}>📁 Import CSV</button>
                </div>

                {recipientMode === "bulk" && (
                  <div>
                    <textarea
                      value={bulkPasteText}
                      onChange={e => setBulkPasteText(e.target.value)}
                      placeholder={`Paste multiple emails — ek line mein ek:\n\nemail1@x.com, Name, Company, City\nemail2@x.com, Name2, Company2\nemail3@x.com\n\n(comma, pipe ya tab se separate kar sakte ho — sirf email bhi chalega)`}
                      style={{
                        width: "100%", height: 110, background: C.card, border: `1px solid ${C.border2}`,
                        color: C.text, padding: "8px 10px", borderRadius: 6, fontSize: 11,
                        fontFamily: "monospace", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6,
                      }}
                    />
                  <button onClick={handleBulkAdd} disabled={addingRecipients} style={{
                      width: "100%", marginTop: 6, background: C.accentDim, border: `1px solid ${C.accent}44`,
                      color: C.accent, padding: 8, borderRadius: 6, cursor: addingRecipients ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600,
                      opacity: addingRecipients ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>{addingRecipients ? <><Spinner size={11} color={C.accent} /> Adding...</> : "📥 Add All from Paste"}</button>
                  </div>
                )}

                {recipientMode === "single" && (
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
<button onClick={addManualRecipient} disabled={addingRecipients} style={{ background: C.accentDim, border: `1px solid ${C.accent}44`, color: C.accent, padding: 7, borderRadius: 6, cursor: addingRecipients ? "not-allowed" : "pointer", fontSize: 12, opacity: addingRecipients ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>{addingRecipients ? <><Spinner size={11} color={C.accent} /> Adding...</> : "+ Add Recipient"}</button>                  </div>
                )}

                {recipientMode === "csv" && (
                  <div>
                    <input ref={csvFileInputRef} type="file" accept=".csv" onChange={handleCsvFile} style={{ display: "none" }} />
                    <div onClick={() => csvFileInputRef.current?.click()} style={{
                      border: `1.5px dashed ${C.border2}`, borderRadius: 8, padding: "22px 14px", textAlign: "center",
                      cursor: "pointer", background: C.card,
                    }}>
                      <div style={{ fontSize: 22, marginBottom: 6 }}>📁</div>
                      <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>Click to choose a CSV file</div>
                      <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4, lineHeight: 1.5 }}>
                        Leads tab se export ki hui CSV bhi chalegi — email, name, company, city columns automatically detect ho jaayenge
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: C.textDim, marginTop: 6 }}>
                      Import ke baad ek list khulegi jahan se select kar sakte ho kis-kisko bhejna hai.
                    </div>
                  </div>
                )}
              </div>

              {/* List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {recipients.map(r => (
                  <div key={r.id} style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>{r.company || r.name || r.email}</div>
                        <div style={{ color: C.textMuted, fontSize: 11 }}>{r.email}</div>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => setPreviewRecipient(previewRecipient?.id === r.id ? null : r)} style={{ fontSize: 10, padding: "3px 7px", borderRadius: 4, border: `1px solid ${C.border2}`, background: "transparent", color: C.textMuted, cursor: "pointer" }}>👁</button>
<button onClick={() => removeRecipient(r.id)} disabled={deletingIds.has(r.id)} style={{ fontSize: 10, padding: "3px 7px", borderRadius: 4, border: `1px solid ${C.redDim}`, background: "transparent", color: C.red, cursor: deletingIds.has(r.id) ? "not-allowed" : "pointer", opacity: deletingIds.has(r.id) ? 0.5 : 1, display: "inline-flex", alignItems: "center" }}>
                          {deletingIds.has(r.id) ? <Spinner size={9} color={C.red} /> : "✕"}
                        </button>                      </div>
                    </div>
                    <input placeholder="Custom line for this company..."
                      value={customLineDrafts[r.id] !== undefined ? customLineDrafts[r.id] : (r.customLine || "")}
                      onChange={e => setCustomLineDrafts(prev => ({ ...prev, [r.id]: e.target.value }))}
                      onBlur={() => {
                        const val = customLineDrafts[r.id]
                        if (val !== undefined && val !== r.customLine) updateRecipientBackend(r.id, { email: r.email, name: r.name, company: r.company, city: r.city, customLine: val })
                      }}
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
                style={{ width: "100%", background: C.card, border: `1px solid ${subjectOverride.trim() ? C.border2 : C.red + "77"}`, color: C.text, padding: "10px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600, boxSizing: "border-box" }} />
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>Variables: {'{{company}}'} {'{{contact}}'} {'{{city}}'} {'{{custom_line}}'} {'{{sender_name}}'}</div>
            </div>

            <div style={{ padding: "16px 24px", flex: 1 }}>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Body</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <button onClick={() => wrapSelection("**")} style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${C.border2}`, background: C.card, color: C.text, fontWeight: 700, cursor: "pointer" }}>B</button>
                <button onClick={() => wrapSelection("*")} style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${C.border2}`, background: C.card, color: C.text, fontStyle: "italic", cursor: "pointer" }}>I</button>
                <select onChange={e => { if (e.target.value) wrapSelection(`[[${e.target.value}]]`, "[[/]]"); e.target.value = "" }}
                  defaultValue="" style={{ height: 30, borderRadius: 6, border: `1px solid ${C.border2}`, background: C.card, color: C.text, fontSize: 12, cursor: "pointer", padding: "0 8px" }}>
                  <option value="">Size</option>
                  <option value="12">Small</option>
                  <option value="18">Medium</option>
                  <option value="28">Large</option>
                </select>
              </div>
              <textarea ref={bodyRef} value={bodyOverride} onChange={e => setBodyOverride(e.target.value)}
                style={{ width: "100%", height: 340, background: C.card, border: `1px solid ${bodyOverride.trim() ? C.border2 : C.red + "77"}`, color: C.text, padding: 14, borderRadius: 8, fontSize: 13, lineHeight: 1.7, resize: "vertical", boxSizing: "border-box", fontFamily: "monospace" }} />
            </div>

            {/* AI Inbox Score */}
            <div style={{ padding: "0 24px 16px" }}>
              <button onClick={runAiAnalysis} disabled={analyzingAi || (!subjectOverride.trim() && !bodyOverride.trim()) || isAlreadyAnalyzed} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 8,
                border: `1px solid ${C.accent}44`, background: C.accentDim, color: C.accent,
                cursor: analyzingAi ? "wait" : "pointer", fontSize: 13, fontWeight: 600,
              }}>
                {analyzingAi ? "🧠 Analyzing..." : isAlreadyAnalyzed ? "✅ Analyzed — edit to re-check" : "🧠 Check Inbox Score & Get Suggestions"}
              </button>

              {aiError && (
                <div style={{ marginTop: 10, fontSize: 12, color: C.red, background: C.redDim, padding: "8px 12px", borderRadius: 6 }}>{aiError}</div>
              )}

              {aiAnalysis && !analyzingAi && (
                <div style={{ marginTop: 12, background: C.card, border: `1px solid ${C.border2}`, borderRadius: 10, padding: 16, animation: "fadeSlideIn 0.3s ease both" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, color: aiAnalysis.score >= 75 ? C.green : aiAnalysis.score >= 50 ? C.yellow : C.red }}>{aiAnalysis.score}</div>
                      <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>Primary Inbox Score</div>
                    </div>
                    <div style={{ flex: 1, background: C.border, borderRadius: 6, height: 8, overflow: "hidden" }}>
                      <div style={{ width: `${aiAnalysis.score}%`, height: "100%", borderRadius: 6, transition: "width 0.6s ease", background: aiAnalysis.score >= 75 ? C.green : aiAnalysis.score >= 50 ? C.yellow : C.red }} />
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

            {/* Variables reference */}
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
                      <code style={{ fontSize: 12, fontWeight: 700, color: C.accent, background: C.accentDim, padding: "3px 8px", borderRadius: 5, width: "fit-content", fontFamily: "monospace" }}>{v.code}</code>
                      <span style={{ fontSize: 11, color: C.textMuted }}>{v.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Send bar */}
            <div style={{ padding: "16px 24px 24px", borderTop: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 12 }}>
                <button onClick={() => setRotateVariants(!rotateVariants)} style={{
                  width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", position: "relative",
                  background: rotateVariants ? C.accent : C.border2, transition: "background .15s",
                }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: rotateVariants ? 19 : 3, transition: "left .15s" }} />
                </button>
                <span style={{ color: rotateVariants ? C.text : C.textMuted }}>
                  🎲 Randomize draft per recipient {rotateVariants && templates.filter(t => t.subject && t.body).length > 1 ? `(rotating across all ${templates.filter(t => t.subject && t.body).length} variants)` : ""}
                </span>
                {!rotateVariants && <span style={{ color: C.yellow, fontSize: 11 }}>⚠️ everyone gets the exact same subject/body — riskier for spam filters</span>}
                {isManuallyEdited && !rotateVariants && (
                  <span style={{ color: C.cyan, fontSize: 11, background: C.cyanDim, padding: "3px 8px", borderRadius: 5 }}>✏️ Randomize toggle off hai — yeh edited version hi sabko jaayega</span>
                )}
                {isManuallyEdited && rotateVariants && (
                  <span style={{ color: C.yellow, fontSize: 11, background: C.yellowDim, padding: "3px 8px", borderRadius: 5 }}>ℹ️ Draft edit hua hai, lekin Randomize ON hai — sabhi variants rotate hongi (yeh edit sirf abhi ke liye editor mein hai)</span>
                )}
              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>CC (every email)</div>
                  <input value={ccEmail} onChange={e => setCcEmail(e.target.value)} placeholder="cc@example.com"
                    style={{ width: "100%", background: C.card, border: `1px solid ${C.border2}`, color: C.text, padding: "7px 10px", borderRadius: 6, fontSize: 12, boxSizing: "border-box" }} />
                </div>
            <div style={{ flex: 1, position: "relative" }}>
  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Attachments (PDF, Drive se)</div>
  <button onClick={() => setAttachmentDropdownOpen(o => !o)} style={{ width: "100%", background: C.card, border: `1px solid ${C.border2}`, color: C.textMuted, padding: "7px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between" }}>
    <span>📎 {attachments.length > 0 ? `${attachments.length} selected` : "Select from Drive"}</span>
    <span>{attachmentDropdownOpen ? "▲" : "▼"}</span>
  </button>
  {attachmentDropdownOpen && (
    <div style={{ position: "absolute", left: 0, right: 0, marginTop: 4, zIndex: 50, background: C.card, border: `1px solid ${C.border2}`, borderRadius: 8, maxHeight: 260, overflowY: "auto" }}>
      {driveFiles.map(f => (
        <label key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
          <input type="checkbox" checked={attachments.some(a => a.id === f.id)} onChange={() => toggleAttachment(f)} />
          <div style={{ flex: 1 }}>{f.name}</div><span style={{ color: C.textDim, fontSize: 10 }}>{f.sizeLabel}</span>
        </label>
      ))}
    </div>
  )}
</div>
              </div>

              {attachments.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  {attachments.map((a, i) => (
                    <div key={i} style={{ fontSize: 11, background: C.accentDim, color: C.accent, padding: "4px 8px", borderRadius: 5, display: "flex", alignItems: "center", gap: 6 }}>
                      📄 {a.name}
                      <button onClick={() => setAttachments(prev => prev.filter(x => x.id !== a.id))} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 12 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <button onClick={sendAll} disabled={sending || isPaused || recipients.length === 0 || senders.length === 0} style={{
                  padding: "12px 28px", borderRadius: 8, border: "none",
                  background: (sending || isPaused || recipients.length === 0 || senders.length === 0) ? C.border2 : C.accent,
                  color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
                }}>
                  {isPaused ? `⏸ Paused at ${sendJob.index}/${sendJob.total}`
                    : sending ? `⏳ Sending ${sendJob.index}/${sendJob.total}...`
                    : `🚀 Send to ${recipients.length} recipient${recipients.length !== 1 ? "s" : ""}`}
                </button>

                {sending && (
                  <button onClick={handlePause} style={{
                    padding: "12px 20px", borderRadius: 8, border: `1px solid ${C.yellow}44`,
                    background: C.yellowDim, color: C.yellow, fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}>⏸ Pause</button>
                )}

                {isPaused && (
                  <button onClick={handleResume} style={{
                    padding: "12px 20px", borderRadius: 8, border: "none",
                    background: C.green, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}>▶ Resume ({sendJob.total - sendJob.index} left)</button>
                )}

                <div style={{ fontSize: 12, color: C.textMuted }}>
                  {senders.length > 1 ? `🔀 Random across ${senders.length} senders` : "Single sender"}
                </div>

                {sentLog.length > 0 && (
                  <div style={{ marginLeft: "auto", fontSize: 12 }}>
                    <span style={{ color: C.green }}>✓ {sentLog.filter(s => s.status === "sent" || s.status === "scheduled").length} sent</span>
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
              {["all", "opened", "clicked", "spam", "bounced", "unsubscribed"].map(f => (
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

          {Object.keys(eventsByEmailBatch).length === 0 ? (
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
                          <div style={{ fontSize: 11, color: C.textMuted }}>Last activity: {lastSeen ? new Date(lastSeen).toLocaleString() : "—"}</div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {isSpam && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, background: C.redDim, color: C.red, fontWeight: 700 }}>🚨 SPAM</span>}
                          {isUnsub && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, background: C.yellowDim, color: C.yellow, fontWeight: 700 }}>🚫 UNSUBSCRIBED</span>}
                          {isBounced && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, background: C.yellowDim, color: C.yellow, fontWeight: 700 }}>BOUNCED</span>}
                          {opens.length > 0 && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, background: C.accentDim, color: C.accent, fontWeight: 700 }}>👁 {opens.length}x opened</span>}
                          {clicks.length > 0 && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, background: C.cyanDim, color: C.cyan, fontWeight: 700 }}>🖱 {clicks.length}x clicked</span>}
                        </div>
                      </div>
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

          {!stats ? (
            <div style={{ color: C.textMuted, textAlign: "center", padding: 60 }}>{loadingStats ? "Loading..." : "Click Refresh"}</div>
          ) : (
            <>
              <div style={{ background: C.card, border: `2px solid ${healthColor}44`, borderRadius: 12, padding: 20, marginBottom: 16, display: "flex", gap: 24, alignItems: "center", animation: "fadeSlideIn 0.4s ease both" }}>
                <div style={{ textAlign: "center", minWidth: 80 }}>
                  <div style={{ fontSize: 52, fontWeight: 900, color: healthColor, lineHeight: 1 }}>{healthScore === null ? "—" : healthScore}</div>
<div style={{ fontSize: 11, color: healthColor, fontWeight: 700, marginTop: 4 }}>{healthScore === null ? "NO DATA YET" : healthScore >= 75 ? "HEALTHY" : healthScore >= 50 ? "AT RISK" : "POOR"}</div>                  <div style={{ fontSize: 10, color: C.textMuted }}>Inbox Health</div>
                  <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>(combined across all senders)</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ background: C.border, borderRadius: 6, height: 8, marginBottom: 10, overflow: "hidden" }}>
<div style={{ background: healthColor, width: `${healthScore || 0}%`, height: "100%", borderRadius: 6, transition: "width 0.8s ease" }} />                  </div>
                  {warnings.map((w, i) => (
                    <div key={i} style={{
                      fontSize: 12, padding: "7px 12px", borderRadius: 7, marginBottom: 6,
                      background: w.level === "red" ? C.redDim : w.level === "yellow" ? C.yellowDim : C.greenDim,
                      color: w.level === "red" ? C.red : w.level === "yellow" ? C.yellow : C.green,
                    }}>{w.msg}</div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                {[
                  { key: "critical", label: "🚨 Spam Risk", color: C.red, bg: C.redDim },
                  { key: "warning", label: "⚠️ Bounced/Unsub", color: C.yellow, bg: C.yellowDim },
                  { key: "pending", label: "⏳ Not Delivered Yet", color: C.textMuted, bg: "#00000006" },
                  { key: "safe", label: "✅ Healthy", color: C.green, bg: C.greenDim },
                ].map((r, idx) => (
                  <div key={r.key} style={{ flex: 1, background: r.bg, border: `1px solid ${r.color}33`, borderRadius: 10, padding: "14px 16px", animation: `fadeSlideIn 0.4s ease ${idx * 0.08}s both` }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: r.color }}>{riskCounts[r.key] || 0}</div>
                    <div style={{ fontSize: 11, color: r.color, marginTop: 2 }}>{r.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 12, padding: 20, marginBottom: 16, display: "flex", gap: 28, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 160 }}>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Send Distribution</div>
                  {totalSentAll === 0 ? (
                    <div style={{ width: 140, height: 140, borderRadius: "50%", border: `10px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.textDim, fontSize: 11, textAlign: "center" }}>No sends yet</div>
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
                           <circle key={s.id} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth="18"
  strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={offset}
  onMouseEnter={() => setHoveredSender(s)} onMouseLeave={() => setHoveredSender(null)}
  style={{ cursor: "pointer", transition: "stroke-dasharray 0.6s ease" }} />
                          )
                        })
                      })()}
                    </svg>
                  )}
                 <div style={{ marginTop: -95, fontSize: 20, fontWeight: 800, pointerEvents: "none" }}>{hoveredSender ? hoveredSender.totalSent : totalSentAll}</div>
<div style={{ marginTop: 65, fontSize: 10, color: C.textDim, pointerEvents: "none", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hoveredSender ? hoveredSender.email : "total sent"}</div>
                </div>

                <div style={{ flex: 1, minWidth: 260, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2, textTransform: "uppercase", letterSpacing: 1 }}>Per-Sender Health</div>
                  {senderStats.length === 0 ? (
                    <div style={{ color: C.textDim, fontSize: 12 }}>Koi sender add nahi kiya abhi.</div>
                  ) : senderStats.map((s, idx) => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, background: C.surface, border: `1px solid ${s.color}44`, animation: `fadeSlideIn 0.35s ease ${idx * 0.06}s both` }}>
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

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(145px, 1fr))", gap: 10, marginBottom: 16 }}>
                {[
                  { label: "Sent", value: sent, sub: "requests", color: C.textMuted },
                  { label: "Delivered", value: delivered, sub: `${delivered > 0 ? ((delivered / sent) * 100).toFixed(1) : 0}%`, color: C.green },
                  { label: "Opened", value: opened, sub: `${openRate.toFixed(1)}% of delivered`, color: C.accent },
                  { label: "Clicked", value: clicked, sub: `${opened > 0 ? ((clicked / opened) * 100).toFixed(1) : 0}% of opened`, color: C.cyan },
                  { label: "Bounced", value: bounced, sub: `${bounceRate.toFixed(1)}%`, color: bounceRate > 2 ? C.red : C.textMuted },
                  { label: "Spam Reports", value: spam, sub: `${spamRate.toFixed(3)}%`, color: spam > 0 ? C.red : C.textMuted },
                  { label: "Unsubscribed", value: stats?.unsubscribed || 0, sub: "opt-outs", color: C.textMuted },
                ].map((s, idx) => (
                  <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 10, padding: "14px 16px", animation: `fadeSlideIn 0.4s ease ${idx * 0.05}s both` }}>
                    <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 13 }}>📋 Per-Recipient Breakdown ({perRecipientBreakdown.length})</div>
                {perRecipientBreakdown.length === 0 ? (
                  <div style={{ color: C.textDim, fontSize: 12, textAlign: "center", padding: 20 }}>Koi data nahi abhi — email bhejo, phir yahan refresh karo.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 420, overflowY: "auto" }}>
                    {perRecipientBreakdown.map((r, i) => (
                      <div key={`${r.email}_${r.batchId}`} onClick={() => setSelectedLogEntry(r)} style={{
  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, cursor: "pointer",
  background: selectedLogEntry?.email === r.email && selectedLogEntry?.batchId === r.batchId ? C.accentDim : C.surface,
  border: `1px solid ${selectedLogEntry?.email === r.email ? C.accent : r.riskLevel === "critical" ? C.red + "44" : C.border2}`,
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
                        <a href={`https://mail.google.com/mail/u/0/#search/from%3A${encodeURIComponent(r.email)}+OR+to%3A${encodeURIComponent(r.email)}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 10, color: C.accent, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0, border: `1px solid ${C.accent}44`, padding: "3px 8px", borderRadius: 5 }}
                        >📬 Gmail</a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
{selectedLogEntry && (() => {
                const evs = eventsByEmailBatch[`${selectedLogEntry.email}__${selectedLogEntry.batchId}`]?.events || []
                const sentMeta = sentLog.find(s => s.batchId === selectedLogEntry.batchId && s.email === selectedLogEntry.email)
                return (
                  <div style={{ background: C.card, border: `2px solid ${C.accent}44`, borderRadius: 10, padding: 18, marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedLogEntry.email}</div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                          {sentMeta?.company ? `${sentMeta.company} · ` : ""}Sent: {sentMeta?.time ? new Date(sentMeta.time).toLocaleString() : "—"} · via {sentMeta?.sender || "—"}
                        </div>
                      </div>
                      <button onClick={() => setSelectedLogEntry(null)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 16 }}>✕</button>
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Timeline</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {evs.length === 0 ? (
                        <div style={{ color: C.textDim, fontSize: 12 }}>Koi event nahi mila is mail ke liye.</div>
                      ) : evs.sort((a, b) => new Date(a.date) - new Date(b.date)).map((ev, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, padding: "6px 0", borderBottom: i < evs.length - 1 ? `1px solid ${C.border}` : "none" }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: ev.event === "opened" ? C.accent : ev.event === "clicked" ? C.cyan : ev.event === "delivered" ? C.green : ev.event === "spam" ? C.red : C.yellow }} />
                          <span style={{ textTransform: "capitalize", fontWeight: 500 }}>{ev.event}</span>
                          <span style={{ color: C.textDim, marginLeft: "auto" }}>{new Date(ev.date).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <a href={`https://mail.google.com/mail/u/0/#search/from%3A${encodeURIComponent(selectedLogEntry.email)}+OR+to%3A${encodeURIComponent(selectedLogEntry.email)}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ display: "inline-block", marginTop: 14, fontSize: 12, color: C.accent, border: `1px solid ${C.accent}44`, padding: "6px 14px", borderRadius: 6, textDecoration: "none" }}>
                      📬 Open in Gmail
                    </a>
                  </div>
                )
              })()}
              <div style={{ background: "#00000005", border: `1px solid ${C.border2}`, borderRadius: 10, padding: 16, fontSize: 12, color: C.textMuted, lineHeight: 1.8 }}>
                <div style={{ fontWeight: 700, color: C.text, marginBottom: 6 }}>ℹ️ About spam tracking</div>
                <b style={{ color: C.text }}>What Brevo tracks:</b> When someone actively clicks "Report Spam" in Gmail/Outlook (via feedback loop). Also tracks hard bounces (email doesn't exist) and soft bounces (inbox full).<br />
                <b style={{ color: C.text }}>What can't be tracked:</b> Gmail/Outlook silently moving mail to spam folder — this is invisible to all ESPs including Brevo.<br />
                <b style={{ color: C.text }}>Key signal:</b> If open rate drops below 5% on a fresh list → your mails are likely landing in spam/promotions.
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SENDERS MANAGEMENT ── */}
      {activeView === "senders" && (
        <div style={{ padding: 24, maxWidth: 640 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <h2 style={{ margin: 0, fontWeight: 700, fontSize: 20 }}>Sender Emails</h2>
            <button onClick={loadSenders} disabled={loadingSenders} style={{ padding: "8px 16px", borderRadius: 7, border: `1px solid ${C.border2}`, background: C.card, color: C.text, cursor: "pointer", fontSize: 13 }}>
              {loadingSenders ? "Loading..." : "🔄 Refresh from Brevo"}
            </button>
          </div>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 20 }}>
            Ye list backend se aa rahi hai (jo Brevo se fetch karta hai — Settings → Senders & IPs). Yahan se select karo kaunse rotation mein use hone chahiye.
          </div>

          {sendersError && (
            <div style={{ background: C.redDim, border: `1px solid ${C.red}44`, borderRadius: 10, padding: 16, color: C.red, fontSize: 13, marginBottom: 16 }}>⚠️ {sendersError}</div>
          )}

          {allSenders.length === 0 ? (
            <div style={{ color: C.textMuted, textAlign: "center", padding: 40 }}>
              {loadingSenders ? "Loading senders..." : "Brevo mein koi verified sender nahi mila. Pehle Brevo dashboard → Settings → Senders & IPs mein verify karo."}
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button onClick={() => setActiveSenderEmails(allSenders.map(s => s.email))} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.border2}`, background: "transparent", color: C.textMuted, cursor: "pointer" }}>Select All</button>
                <button onClick={() => setActiveSenderEmails([])} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.border2}`, background: "transparent", color: C.textMuted, cursor: "pointer" }}>Select None</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {allSenders.map(s => {
                  const active = isSenderActive(s.email)
                  return (
                    <div key={s.id || s.email} style={{ background: C.card, border: `1px solid ${active ? C.accent + "44" : C.border2}`, borderRadius: 9, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                      <input type="checkbox" checked={active} onChange={() => toggleSenderActive(s.email)} style={{ cursor: "pointer" }} />
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.accentDim, display: "flex", alignItems: "center", justifyContent: "center", color: C.accent, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                        {(s.name || s.email)[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: C.textMuted }}>{s.email}</div>
                      </div>
                      {s.active === false ? (
                        <span style={{ fontSize: 11, color: C.yellow, background: C.yellowDim, padding: "3px 8px", borderRadius: 5 }}>⚠️ unverified</span>
                      ) : (
                        <span style={{ fontSize: 11, color: C.green, background: C.greenDim, padding: "3px 8px", borderRadius: 5 }}>✓ verified</span>
                      )}
                    </div>
                  )
                })}
              </div>
              {senders.length > 0 && (
                <div style={{ marginTop: 16, fontSize: 12, color: C.textMuted, background: C.greenDim, border: `1px solid ${C.green}33`, borderRadius: 8, padding: "10px 14px" }}>
                  ✅ {senders.length} of {allSenders.length} selected for rotation.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TEMPLATE MANAGER ── */}
      {activeView === "templates" && (
        <div style={{ display: "grid", gridTemplateColumns: "220px 220px 1fr", height: "calc(100vh - 49px)" }}>
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
                  Koi industry nahi — upar add karo<br /><span style={{ fontSize: 11 }}>e.g. "IT & Software", "CA Firms", "Real Estate"</span>
                </div>
              ) : Object.keys(templateLibrary).map(ind => (
                <div key={ind} onClick={() => { setTmSelectedIndustry(ind); setTmSelectedCategory(""); setTmEditingVariant(null) }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 7, marginBottom: 3, cursor: "pointer",
                    background: tmSelectedIndustry === ind ? C.accentDim : "transparent", border: `1px solid ${tmSelectedIndustry === ind ? C.accent : "transparent"}` }}>
                  <div style={{ fontSize: 13, color: tmSelectedIndustry === ind ? C.accent : C.text, fontWeight: tmSelectedIndustry === ind ? 600 : 400, flex: 1 }}>{ind}</div>
                  <div style={{ fontSize: 10, color: C.textDim, marginRight: 6 }}>{Object.keys(templateLibrary[ind] || {}).length} cat</div>
                  <button onClick={e => { e.stopPropagation(); tmDeleteIndustry(ind) }} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 13, padding: "0 2px" }}>×</button>
                </div>
              ))}
            </div>
          </div>

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
              ) : (<div style={{ fontSize: 12, color: C.textDim }}>Pehle industry select karo</div>)}
            </div>
            <div style={{ padding: 10 }}>
              {!tmSelectedIndustry ? null : Object.keys(templateLibrary[tmSelectedIndustry] || {}).length === 0 ? (
                <div style={{ color: C.textDim, fontSize: 12, padding: "20px 10px", textAlign: "center" }}>
                  Koi category nahi<br /><span style={{ fontSize: 11 }}>e.g. "Web Dev", "App Dev", "AI"</span>
                </div>
              ) : Object.keys(templateLibrary[tmSelectedIndustry]).map(cat => {
                const variants = templateLibrary[tmSelectedIndustry][cat] || []
                const filled = variants.filter(v => v.subject && v.body).length
                return (
                  <div key={cat} onClick={() => { setTmSelectedCategory(cat); setTmEditingVariant(null) }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 7, marginBottom: 3, cursor: "pointer",
                      background: tmSelectedCategory === cat ? C.accentDim : "transparent", border: `1px solid ${tmSelectedCategory === cat ? C.accent : "transparent"}` }}>
                    <div>
                      <div style={{ fontSize: 13, color: tmSelectedCategory === cat ? C.accent : C.text, fontWeight: tmSelectedCategory === cat ? 600 : 400 }}>{cat}</div>
                      <div style={{ fontSize: 10, color: filled === 5 ? C.green : C.yellow, marginTop: 2 }}>{filled}/5 variants {filled === 5 ? "✓" : "⚠️"}</div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); tmDeleteCategory(tmSelectedIndustry, cat) }} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 13, padding: "0 2px" }}>×</button>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {!tmSelectedIndustry || !tmSelectedCategory ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.textDim, textAlign: "center", padding: 40 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📝</div>
                <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 6 }}>Industry aur category select karo</div>
                <div style={{ fontSize: 12 }}>Phir kisi bhi variant pe click karke subject + body type karo</div>
              </div>
            ) : (
              <>
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
                          cursor: "pointer", fontSize: 13, fontWeight: isEditing ? 700 : 400, position: "relative",
                        }}>
                          Variant {idx + 1}
                          {isFilled && <span style={{ position: "absolute", top: 3, right: 3, width: 5, height: 5, borderRadius: "50%", background: C.green }} />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {tmEditingVariant ? (
                  <div style={{ flex: 1, padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Subject — Variant {tmEditingVariant.variantIdx + 1}</div>
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
                      <button onClick={tmSaveVariant} style={{ padding: "10px 24px", background: C.accent, border: "none", color: "#fff", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>✅ Save Variant {tmEditingVariant.variantIdx + 1}</button>
                      {tmEditingVariant.variantIdx < 4 && (
                        <button onClick={() => { tmSaveVariant(); tmOpenVariant(tmSelectedIndustry, tmSelectedCategory, tmEditingVariant.variantIdx + 1) }}
                          style={{ padding: "10px 20px", background: C.accentDim, border: `1px solid ${C.accent}44`, color: C.accent, borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Save & Next →</button>
                      )}
                      <div style={{ fontSize: 11, color: C.textDim }}>Variables: {'{{company}}'} {'{{contact}}'} {'{{city}}'} {'{{custom_line}}'} {'{{sender_name}}'}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.textDim, fontSize: 13 }}>Upar koi variant tab click karo to edit</div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── SENT LOG ── */}
      {activeView === "sent" && (
        <div style={{ padding: 24 }}>
          <h2 style={{ margin: "0 0 20px", fontWeight: 700, fontSize: 20 }}>Sent Log</h2>
          {sentLog.length === 0 ? (
            <div style={{ color: C.textMuted, textAlign: "center", padding: 60 }}>No emails sent yet.</div>
          ) : (
            <div style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 10, overflow: "hidden" }}>
              {sentLog.map((log, i) => (
                <div key={log.id || i} style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{
                    fontSize: 11, padding: "3px 8px", borderRadius: 5, fontWeight: 700,
                    background: log.status === "error" ? C.redDim : C.greenDim,
                    color: log.status === "error" ? C.red : C.green,
                  }}>{log.status === "error" ? "✗ FAILED" : log.status === "scheduled" ? "🕓 SCHEDULED" : "✓ SENT"}</div>
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

      {/* ── CSV IMPORT PREVIEW MODAL ── */}
      {showCsvModal && (
        <>
<div onClick={() => { if (!addingRecipients) { setShowCsvModal(false); setCsvParsedRows([]) } }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, backdropFilter: "blur(4px)" }} />          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            width: "min(820px, 94vw)", maxHeight: "88vh", background: C.surface,
            border: `1px solid ${C.border2}`, borderRadius: 16, zIndex: 1001,
            display: "flex", flexDirection: "column", boxShadow: "0 32px 96px rgba(0,0,0,0.6)", overflow: "hidden",
          }}>
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: C.card, flexShrink: 0 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>📁 Import from CSV — {csvFileName}</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{csvParsedRows.length} valid email row{csvParsedRows.length !== 1 ? "s" : ""} detected · {csvSelectedCount} selected</div>
              </div>
<button onClick={() => { setShowCsvModal(false); setCsvParsedRows([]) }} disabled={addingRecipients} style={{ width: 32, height: 32, borderRadius: "50%", background: C.border2, border: "none", color: C.text, cursor: addingRecipients ? "not-allowed" : "pointer", fontSize: 16, opacity: addingRecipients ? 0.5 : 1 }}>✕</button>            </div>
            <div style={{ padding: "12px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
              <input placeholder="Search rows..." value={csvModalFilter} onChange={e => setCsvModalFilter(e.target.value)}
                style={{ flex: 1, background: C.card, border: `1px solid ${C.border2}`, color: C.text, padding: "7px 12px", borderRadius: 6, fontSize: 12 }} />
             <button onClick={() => toggleCsvAll(true)} disabled={addingRecipients} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.border2}`, background: "transparent", color: C.textMuted, cursor: addingRecipients ? "not-allowed" : "pointer", opacity: addingRecipients ? 0.5 : 1 }}>Select All</button>
              <button onClick={() => toggleCsvAll(false)} disabled={addingRecipients} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.border2}`, background: "transparent", color: C.textMuted, cursor: addingRecipients ? "not-allowed" : "pointer", opacity: addingRecipients ? 0.5 : 1 }}>Select None</button>
            </div>
         <div style={{ flex: 1, overflowY: "auto", padding: "8px 24px", opacity: addingRecipients ? 0.5 : 1, pointerEvents: addingRecipients ? "none" : "auto" }}>
              {csvParsedRows.length === 0 ? (
                <div style={{ color: C.textDim, textAlign: "center", padding: 40, fontSize: 13 }}>Is CSV mein koi valid email row nahi mili. Check karo ki koi column "email" ya "Best Email" naam se ho.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "6px 0" }}>
                  {csvParsedRows.map((r, i) => {
                    const q = csvModalFilter.toLowerCase()
                    if (q && !(r.email + r.name + r.company + r.city).toLowerCase().includes(q)) return null
                    return (
                      <div key={i} onClick={() => toggleCsvRow(i)} style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "9px 12px", borderRadius: 8, cursor: "pointer",
                        background: r._selected ? C.accentDim : C.card, border: `1px solid ${r._selected ? C.accent + "55" : C.border2}`,
                      }}>
                        <input type="checkbox" checked={r._selected} onChange={() => toggleCsvRow(i)} onClick={e => e.stopPropagation()} style={{ cursor: "pointer" }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{r.company || r.name || r.email}</div>
                          <div style={{ fontSize: 11, color: C.textMuted }}>{r.email}{r.name ? ` · ${r.name}` : ""}{r.city ? ` · ${r.city}` : ""}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div style={{ padding: "14px 24px", borderTop: `1px solid ${C.border}`, background: C.card, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: C.textDim }}>Already-added emails duplicate check mein automatically skip ho jaayenge</div>
            <button onClick={confirmCsvImport} disabled={csvSelectedCount === 0 || addingRecipients} style={{
                padding: "9px 22px", borderRadius: 7, border: "none", cursor: (csvSelectedCount === 0 || addingRecipients) ? "not-allowed" : "pointer",
                background: (csvSelectedCount === 0 || addingRecipients) ? C.border2 : C.accent, color: "#fff", fontSize: 13, fontWeight: 700,
                display: "inline-flex", alignItems: "center", gap: 8,
              }}>
                {addingRecipients && <Spinner size={13} />}
                {addingRecipients ? "Adding..." : `📥 Add ${csvSelectedCount} Selected Recipient${csvSelectedCount !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── RECIPIENTS MANAGEMENT MODAL ── */}
      {showRecipientsModal && (
        <>
<div onClick={() => !clearingAll && setShowRecipientsModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, backdropFilter: "blur(4px)" }} />          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            width: "min(820px, 94vw)", maxHeight: "88vh", background: C.surface,
            border: `1px solid ${C.border2}`, borderRadius: 16, zIndex: 1001,
            display: "flex", flexDirection: "column", boxShadow: "0 32px 96px rgba(0,0,0,0.6)", overflow: "hidden",
          }}>
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: C.card, flexShrink: 0 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>👥 All Recipients ({recipients.length})</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Bulk send mein inhi sabko mail jaayega — yahan se remove kar sakte ho</div>
              </div>
<button onClick={() => setShowRecipientsModal(false)} disabled={clearingAll} style={{ width: 32, height: 32, borderRadius: "50%", background: C.border2, border: "none", color: C.text, cursor: clearingAll ? "not-allowed" : "pointer", fontSize: 16, opacity: clearingAll ? 0.5 : 1 }}>✕</button>            </div>
            <div style={{ padding: "12px 24px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <input placeholder="Search recipients..." value={recipientsModalFilter} onChange={e => setRecipientsModalFilter(e.target.value)}
                style={{ width: "100%", background: C.card, border: `1px solid ${C.border2}`, color: C.text, padding: "8px 12px", borderRadius: 6, fontSize: 12, boxSizing: "border-box" }} />
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 24px" }}>
            {recipients.length === 0 ? (
                <div style={{ color: C.textDim, textAlign: "center", padding: 40, fontSize: 13 }}>Koi recipient add nahi hua abhi.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, opacity: clearingAll ? 0.5 : 1, pointerEvents: clearingAll ? "none" : "auto" }}>
                  {recipients.map((r, i) => {
                    const q = recipientsModalFilter.toLowerCase()
                    if (q && !(r.email + (r.name || "") + (r.company || "") + (r.city || "")).toLowerCase().includes(q)) return null
                    const isEditing = editingId === r.id
                    return (
                      <div key={r.id} style={{ background: C.card, border: `1px solid ${isEditing ? C.accent : C.border2}`, borderRadius: 8, padding: "10px 14px" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <input placeholder="Email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                              style={{ background: C.surface, border: `1px solid ${C.border2}`, color: C.text, padding: "6px 9px", borderRadius: 5, fontSize: 12 }} />
                            <input placeholder="Name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                              style={{ background: C.surface, border: `1px solid ${C.border2}`, color: C.text, padding: "6px 9px", borderRadius: 5, fontSize: 12 }} />
                            <input placeholder="Company" value={editForm.company} onChange={e => setEditForm(f => ({ ...f, company: e.target.value }))}
                              style={{ background: C.surface, border: `1px solid ${C.border2}`, color: C.text, padding: "6px 9px", borderRadius: 5, fontSize: 12 }} />
                            <input placeholder="City" value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
                              style={{ background: C.surface, border: `1px solid ${C.border2}`, color: C.text, padding: "6px 9px", borderRadius: 5, fontSize: 12 }} />
                            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                              <button onClick={async () => {
                                if (!editForm.email.trim()) { showToast("Email khali hai — save nahi hoga!", "error"); return }
                                await updateRecipientBackend(editForm.id, { email: editForm.email, name: editForm.name, company: editForm.company, city: editForm.city })
                                setEditingId(null)
                                showToast("Recipient updated!", "success")
                              }} style={{ flex: 1, background: C.accent, border: "none", color: "#fff", padding: 7, borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>✅ Save</button>
                              <button onClick={() => setEditingId(null)} style={{ flex: 1, background: "transparent", border: `1px solid ${C.border2}`, color: C.textMuted, padding: 7, borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.accentDim, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{r.company || r.name || r.email}</div>
                              <div style={{ fontSize: 11, color: C.textMuted }}>{r.email}{r.name ? ` · ${r.name}` : ""}{r.city ? ` · ${r.city}` : ""}</div>
                            </div>
                            <button onClick={() => { setEditingId(r.id); setEditForm({ id: r.id, email: r.email, name: r.name || "", company: r.company || "", city: r.city || "" }) }} style={{ fontSize: 10, padding: "4px 8px", borderRadius: 4, border: `1px solid ${C.border2}`, background: "transparent", color: C.textMuted, cursor: "pointer" }}>✏️</button>
                            <button onClick={() => setPreviewRecipient(r)} style={{ fontSize: 10, padding: "4px 8px", borderRadius: 4, border: `1px solid ${C.border2}`, background: "transparent", color: C.textMuted, cursor: "pointer" }}>👁</button>
<button onClick={() => removeRecipient(r.id)} disabled={deletingIds.has(r.id)} style={{ fontSize: 10, padding: "4px 8px", borderRadius: 4, border: `1px solid ${C.redDim}`, background: "transparent", color: C.red, cursor: deletingIds.has(r.id) ? "not-allowed" : "pointer", opacity: deletingIds.has(r.id) ? 0.5 : 1, display: "inline-flex", alignItems: "center" }}>
                              {deletingIds.has(r.id) ? <Spinner size={9} color={C.red} /> : "✕"}
                            </button>                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div style={{ padding: "14px 24px", borderTop: `1px solid ${C.border}`, background: C.card, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
  <button onClick={async () => {
                if (clearingAll) return
                const ok = await showConfirm("Sab recipients clear kar dein?")
                if (!ok) return
                setClearingAll(true)
                try {
                  const ids = recipients.map(r => r.id)
                  await api.deleteRecipientsBatch(ids)
                  await loadRecipients()
                  showToast("All recipients cleared!", "success")
                } catch (err) {
                  showApiError(err)
                }
                setClearingAll(false)
              }} disabled={clearingAll || recipients.length === 0} style={{
                fontSize: 12, padding: "8px 16px", borderRadius: 7, border: `1px solid ${C.redDim}`,
                background: "transparent", color: C.red,
                cursor: (clearingAll || recipients.length === 0) ? "not-allowed" : "pointer",
                opacity: (clearingAll || recipients.length === 0) ? 0.6 : 1,
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>
                {clearingAll && <Spinner size={11} color={C.red} />}
                {clearingAll ? "Clearing..." : "Clear All"}
              </button>
<button onClick={() => setShowRecipientsModal(false)} disabled={clearingAll} style={{ padding: "8px 20px", borderRadius: 7, background: clearingAll ? C.border2 : C.accent, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: clearingAll ? "not-allowed" : "pointer", opacity: clearingAll ? 0.6 : 1 }}>Done</button>            </div>
          </div>
        </>
      )}

      {/* ── PREVIEW MODAL ── */}
      {previewRecipient && (() => {
        const p = getPreviewFor(previewRecipient)
        const sender = senders[Math.floor(Math.random() * Math.max(senders.length, 1))]
        return (
          <>
            <div onClick={() => setPreviewRecipient(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, backdropFilter: "blur(4px)" }} />
            <div style={{
              position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
              width: "min(720px, 92vw)", maxHeight: "88vh", background: C.surface,
              border: `1px solid ${C.border2}`, borderRadius: 16, zIndex: 1001,
              display: "flex", flexDirection: "column", boxShadow: "0 32px 96px rgba(0,0,0,0.6)", overflow: "hidden",
            }}>
              <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: C.card, flexShrink: 0 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>📧 Email Preview</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{previewRecipient.company || previewRecipient.name || previewRecipient.email}</div>
                </div>
                <button onClick={() => setPreviewRecipient(null)} style={{ width: 32, height: 32, borderRadius: "50%", background: C.border2, border: "none", color: C.text, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
              <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
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
                <div style={{ background: C.card, borderRadius: 8, padding: "10px 14px", border: `1px solid ${C.border2}`, marginBottom: attachments.length > 0 ? 12 : 0 }}>
                  <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Subject</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{p.subject}</div>
                </div>
                {attachments.length > 0 && (
                  <div style={{ background: C.card, borderRadius: 8, padding: "10px 14px", border: `1px solid ${C.border2}` }}>
                    <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>📎 Attachments ({attachments.length})</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {attachments.map((a, i) => (<div key={i} style={{ fontSize: 12, background: C.accentDim, color: C.accent, padding: "4px 10px", borderRadius: 5 }}>📄 {a.name}</div>))}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
                <div style={{ background: "#ffffff", borderRadius: 10, padding: "28px 32px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", minHeight: 200 }} dangerouslySetInnerHTML={{ __html: textToHtml(p.body) }} />
              </div>
              <div style={{ padding: "14px 24px", borderTop: `1px solid ${C.border}`, background: C.card, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: C.textDim }}>Backdrop click karo ya ✕ press karo to close · Esc bhi kaam karta hai</div>
                <button onClick={() => setPreviewRecipient(null)} style={{ padding: "8px 20px", borderRadius: 7, background: C.accent, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Close</button>
              </div>
            </div>
          </>
        )
      })()}

   <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmModal state={confirmState} onResult={handleConfirmResult} />
    </div>
  )
}