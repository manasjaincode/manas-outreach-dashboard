// ============================================================
// API CLIENT — talks to the Apps Script backend (Nectar Backend)
// All third-party keys (Maps, Groq, Brevo) live server-side now.
// This file is the ONLY place that should ever fetch() the backend URL.
// ============================================================
//
// .env needs:
//   VITE_BACKEND_URL=https://script.google.com/macros/s/XXXX/exec
//
// Every backend action lives in Code.gs's doPost() switch statement.
// If a new action is added there, add a matching wrapper here.

const API_URL = import.meta.env.VITE_BACKEND_URL

const SESSION_KEY = "bi_session_token"
const USER_KEY = "bi_user_info"

// ---------------- session storage helpers ----------------

export const getToken = () => localStorage.getItem(SESSION_KEY)

export const getUser = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || "null") } catch { return null }
}

export const setSession = (token, user) => {
  localStorage.setItem(SESSION_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user || {}))
}

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(USER_KEY)
}

export const isAuthenticated = () => !!getToken()

// ---------------- core request fn ----------------
//
// IMPORTANT: Content-Type must stay "text/plain" — Apps Script Web Apps
// can't handle CORS preflight, so application/json would break in the
// browser. The action name + auth token + payload all travel inside the
// JSON-stringified text body instead. See Code.gs's top comment.

async function call(action, payload = {}, { withAuth = true } = {}) {
  if (!API_URL) {
    throw new Error("VITE_BACKEND_URL missing — set it in your .env (and in Vercel's project env vars)")
  }

  const token = withAuth ? getToken() : null

  let res
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, token, payload }),
    })
  } catch (networkErr) {
    throw new Error(`Backend se connect nahi ho paya: ${networkErr.message}`)
  }

  let data
  try {
    data = await res.json()
  } catch {
    throw new Error("Backend se invalid response mila (JSON parse fail)")
  }

  if (!data.ok) {
    // 401 = session expired/invalid — force logout so AuthGate kicks back to login
    if (data.code === 401) clearSession()
    const err = new Error(data.error || `${action} failed`)
    err.code = data.code
    throw err
  }

  return data
}

// ============================================================
// AUTH
// ============================================================

export const login = async (username, password) => {
  const data = await call("login", { username, password }, { withAuth: false })
  setSession(data.token, data.user)
  return data // { ok, token, user, mustChangePassword }
}

export const logout = () => clearSession()

export const changePassword = (newPassword) => call("changePassword", { newPassword })

export const createTeamMember = (payload) => call("createTeamMember", payload)
// payload: { username, tempPassword, name, role, email }

export const whoAmI = () => call("whoAmI")

// ============================================================
// LEADS
// ============================================================

// payload: { category, cities: ["Indore","Bhopal"], maxResults, keywords: [...] }
// Returns { ok, jobId } — backend queues this, processQueue trigger runs it
// chunk-by-chunk. Poll with getJob(jobId) for progress.
export const startLeadScrape = (payload) => call("startLeadScrape", payload)

export const listLeads = () => call("listLeads")

// ============================================================
// STARTUPS
// ============================================================

export const startStartupSearch = (payload) => call("startStartupSearch", payload)
// payload: { industry }

export const listStartups = () => call("listStartups")

// ============================================================
// FREELANCE (synchronous — no job/polling needed)
// ============================================================

export const getFreelanceJobs = (keyword) => call("getFreelanceJobs", { keyword })

// ============================================================
// JOBS (polling for async/background tasks)
// ============================================================

export const getJob = (jobId) => call("getJob", { jobId })

// Simple poll helper: calls getJob every `intervalMs` until status is
// "done" or "failed", or until maxWaitMs is exceeded. Pass onUpdate to
// get live progress (e.g. update a status bar in the UI).
export const pollJob = async (jobId, { intervalMs = 3000, maxWaitMs = 10 * 60 * 1000, onUpdate } = {}) => {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    const { job } = await getJob(jobId)
    if (onUpdate) onUpdate(job)
    if (job.status === "done" || job.status === "failed") return job
    await new Promise(r => setTimeout(r, intervalMs))
  }
  throw new Error("Job polling timed out — check the Jobs sheet manually")
}

// ============================================================
// TEMPLATES
// ============================================================

export const listTemplates = () => call("listTemplates")

export const saveTemplate = (payload) => call("saveTemplate", payload)
// payload shape depends on TemplatesAndRecipients.gs — likely
// { id?, industry, category, variantIdx, subject, body }

export const deleteTemplate = (id) => call("deleteTemplate", { id })

// ============================================================
// RECIPIENTS
// ============================================================

export const listRecipients = () => call("listRecipients")

export const addRecipients = (recipients) => call("addRecipients", { recipients })
// recipients: [{ email, name, company, city, customLine }]

export const deleteRecipient = (id) => call("deleteRecipient", { id })

// ============================================================
// EMAIL
// ============================================================

export const getSenders = () => call("getSenders")

// payload: { recipients, subject, body, industry, category, ccEmail,
//            attachments, scheduleMode, scheduleDate, scheduleTime, rotateVariants }
// Returns { ok, jobId } — background job, poll with getJob/pollJob
export const startEmailSend = (payload) => call("startEmailSend", payload)

export const getEmailStats = () => call("getEmailStats")
// Returns { ok, stats, events }

export const analyzeInboxScore = (subject, body) => call("analyzeInboxScore", { subject, body })

// ============================================================
// ANALYTICS
// ============================================================

export const getAnalytics = () => call("getAnalytics")