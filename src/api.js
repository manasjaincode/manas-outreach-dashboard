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
//
// ── REQUEST QUEUE + RETRY ──────────────────────────────────
// Apps Script Web Apps only reliably handle ONE request at a time per
// user. When several calls fire at once (multiple useEffects loading
// data, or a user clicking fast), some of them fail — and because Apps
// Script's error response often arrives without CORS headers, the
// browser reports this as a misleading "CORS policy" error even though
// the real cause is just too many simultaneous hits.
//
// Fix: every single call() goes through one shared queue that runs
// requests strictly one-after-another, and any transient (network/CORS-
// looking) failure gets retried automatically with a short backoff.
// Genuine backend errors (wrong password, bad input, etc.) are NOT
// retried — they'll just fail the same way again.

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

// ---------------- queue + retry machinery ----------------

let requestQueue = []
let queueRunning = false

function enqueue(task) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ task, resolve, reject })
    runQueue()
  })
}

async function runQueue() {
  if (queueRunning) return
  queueRunning = true
  while (requestQueue.length) {
    const { task, resolve, reject } = requestQueue.shift()
    try {
      resolve(await task())
    } catch (err) {
      reject(err)
    }
  }
  queueRunning = false
}

async function withRetry(task, attempts = 3) {
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try {
      return await task()
    } catch (err) {
      lastErr = err
      if (!err.transient || i === attempts - 1) throw err
      await new Promise(r => setTimeout(r, 500 * (i + 1))) // 500ms, 1000ms backoff
    }
  }
  throw lastErr
}

// Does the actual fetch + JSON parse. Marks failures as "transient" so
// withRetry knows they're worth retrying (as opposed to a valid backend
// response that just happens to say ok:false).
async function rawCall(action, payload, token) {
  let res
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, token, payload }),
    })
  } catch (networkErr) {
    const err = new Error(`Backend se connect nahi ho paya: ${networkErr.message}`)
    err.transient = true
    throw err
  }

  let data
  try {
    data = await res.json()
  } catch {
    const err = new Error("Backend se invalid response mila (JSON parse fail)")
    err.transient = true
    throw err
  }

  return data
}

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

  const data = await enqueue(() => withRetry(() => rawCall(action, payload, token)))

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

// Admin-only: full team member list
export const listUsers = () => call("listUsers")

// Admin-only: reset an existing member's password (forces change on next login)
export const resetUserPassword = (userId, newTempPassword) => call("resetUserPassword", { userId, newTempPassword })

// ============================================================
// LEADS
// ============================================================

// payload: { category, cities: ["Indore","Bhopal"], maxResults, keywords: [...] }
// Returns { ok, jobId } — backend queues this, processQueue trigger runs it
// chunk-by-chunk. Poll with getJob(jobId) for progress.
export const startLeadScrape = (payload) => call("startLeadScrape", payload)
export const startLeadScrapeRadius = (pincode, radiusKm, category, maxResults) =>
  call("startLeadScrapeRadius", { pincode, radiusKm, category, maxResults })
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

// Pauses a running/queued job. Takes effect after the current in-flight
// chunk finishes (up to ~4.5 min) — Apps Script executions can't be
// interrupted mid-run from an outside call. Any recipients already sent
// to Brevo with a future scheduledAt will still deliver at that time.
export const pauseJob = (jobId) => call("pauseJob", { jobId })

// Resumes a paused job — continues from the exact recipient index it
// left off at (progress is stored server-side, not re-shuffled).
export const resumeJob = (jobId) => call("resumeJob", { jobId })

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

export const updateRecipient = (payload) => call("updateRecipient", payload)
// payload: { id, email, name, company, city, customLine }

export const deleteRecipient = (id) => call("deleteRecipient", { id })

export const deleteRecipientsBatch = (ids) => call("deleteRecipientsBatch", { ids })
export const listSentLog = () => call("listSentLog")

// ============================================================
// EMAIL
// ============================================================

export const getSenders = () => call("getSenders")

// payload: { subject, body, templates: [{subject,body}] (optional, up to 5),
//            rotateVariants: bool, recipients, senders, ccEmail,
//            attachments: [{name,base64}] }
// Returns { ok, jobId, batchId } — background job, poll with getJob/pollJob.
// Pause/resume it anytime with pauseJob(jobId) / resumeJob(jobId).
export const startEmailSend = (payload) => call("startEmailSend", payload)

export const getEmailStats = () => call("getEmailStats")
// Returns { ok, stats, events }

export const analyzeInboxScore = (subject, body) => call("analyzeInboxScore", { subject, body })

// ============================================================
// ANALYTICS
// ============================================================

// Returns { ok, analytics } where analytics is either:
//   { scope: "member", me: { totalLeads, emailsSent, emailsFailed, opened, spam, bounced, openRate } }
// or (for admins):
//   { scope: "admin", global: {...same shape...}, perMember: [{ username, name, ...same shape }] }
export const getAnalytics = () => call("getAnalytics")