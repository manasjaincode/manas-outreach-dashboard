// ============================================================
// api.js — drop this in your React project (e.g. src/lib/api.js)
// Replaces all the direct fetch() calls to Google Maps / Groq /
// Gemini / Brevo that used to live in config.js and EmailPage.jsx.
//
// Set this in your .env (frontend):
//   VITE_BACKEND_URL=https://script.google.com/macros/s/XXXXX/exec
// (you get this URL after deploying the Apps Script as a Web App)
// ============================================================
//
// ── REQUEST QUEUE + RETRY ──────────────────────────────────
// Apps Script Web Apps only reliably handle ONE request at a time per
// user. When several calls fire at once (multiple useEffects loading
// data, or a user clicking fast / bulk-deleting), some of them fail —
// and because Apps Script's error response often arrives without CORS
// headers, the browser reports this as a misleading "CORS policy"
// error even though the real cause is just too many simultaneous hits.
//
// Fix: every single callBackend() goes through one shared queue that
// runs requests strictly one-after-another, and any transient
// (network/CORS-looking) failure gets retried automatically with a
// short backoff. Genuine backend errors (wrong password, bad input,
// etc.) are NOT retried — they'll just fail the same way again.

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const getToken = () => localStorage.getItem("nectar_token");
const setToken = (t) => localStorage.setItem("nectar_token", t);
const clearToken = () => localStorage.removeItem("nectar_token");

// ---------------- queue + retry machinery ----------------

let requestQueue = [];
let queueRunning = false;

function enqueue(task) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ task, resolve, reject });
    runQueue();
  });
}

async function runQueue() {
  if (queueRunning) return;
  queueRunning = true;
  while (requestQueue.length) {
    const { task, resolve, reject } = requestQueue.shift();
    try {
      resolve(await task());
    } catch (err) {
      reject(err);
    }
  }
  queueRunning = false;
}

async function withRetry(task, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await task();
    } catch (err) {
      lastErr = err;
      if (!err.transient || i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 500 * (i + 1))); // 500ms, 1000ms backoff
    }
  }
  throw lastErr;
}

// Does the actual fetch + JSON parse. Marks failures as "transient" so
// withRetry knows they're worth retrying (as opposed to a valid backend
// response that just happens to say ok:false).
async function rawCallBackend(action, payload) {
  let res;
  try {
    res = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, token: getToken(), payload }),
    });
  } catch (networkErr) {
    const err = new Error(`Backend se connect nahi ho paya: ${networkErr.message}`);
    err.transient = true;
    throw err;
  }

  let data;
  try {
    data = await res.json();
  } catch {
    const err = new Error("Backend se invalid response mila (JSON parse fail)");
    err.transient = true;
    throw err;
  }

  return data;
}

/**
 * Every call goes through here. Content-Type is deliberately
 * text/plain — sending application/json from the browser would
 * trigger a CORS preflight (OPTIONS request), which Apps Script
 * Web Apps don't support. text/plain avoids the preflight while
 * we still send well-formed JSON as the body string.
 */
async function callBackend(action, payload = {}) {
  const data = await enqueue(() => withRetry(() => rawCallBackend(action, payload)));
  if (!data.ok) {
    if (data.code === 401) clearToken(); // session expired — force re-login
    throw new Error(data.error || "Request failed");
  }
  return data;
}

// ---- Auth ----
export const login = async (username, password) => {
  const data = await callBackend("login", { username, password });
  setToken(data.token);
  return data; // { user, mustChangePassword }
};
export const logout = () => clearToken();
export const isAuthenticated = () => !!getToken();
export const changePassword = (newPassword) => callBackend("changePassword", { newPassword });
export const createTeamMember = (member) => callBackend("createTeamMember", member);
export const listUsers = () => callBackend("listUsers");
export const resetUserPassword = (userId, newPassword) =>
  callBackend("resetUserPassword", { userId, newTempPassword: newPassword });// ---- Leads ----
export const startLeadScrape = (category, cities, maxResults) =>
  callBackend("startLeadScrape", { category, cities, maxResults });
export const startLeadScrapeRadius = (pincode, radiusKm, category, maxResults) =>
  callBackend("startLeadScrapeRadius", { pincode, radiusKm, category, maxResults });
// ADD right after startLeadScrapeRadius:
export const startAdvancedSearch = (payload) => callBackend("startAdvancedSearch", payload);
// payload: { searchMode: "city"|"radius", category, cities, pincode, radiusKm, maxResults }
export const getAdvancedSearchQuota = () => callBackend("getAdvancedSearchQuota");
export const listLeads = () => callBackend("listLeads");
export const updateLead = (id, patch) => callBackend("updateLead", { id, patch });

// ---- Startups ----
export const startStartupSearch = (industry) => callBackend("startStartupSearch", { industry });
export const listStartups = () => callBackend("listStartups");
export const updateStartup = (id, patch) => callBackend("updateStartup", { id, patch });

// ---- Freelance ----
export const getFreelanceJobs = (keyword) => callBackend("getFreelanceJobs", { keyword });

// ---- Jobs (poll this every few seconds while a job is running) ----
export const getJob = (jobId) => callBackend("getJob", { jobId });

// ---- Templates ----
export const listTemplates = () => callBackend("listTemplates");
export const saveTemplate = (template) => callBackend("saveTemplate", template);
export const deleteTemplate = (id) => callBackend("deleteTemplate", { id });

// ---- Recipients ----
export const listRecipients = () => callBackend("listRecipients");
export const addRecipients = (recipients) => callBackend("addRecipients", { recipients });
export const updateRecipient = (payload) => callBackend("updateRecipient", payload); // { id, email, name, company, city, customLine }
export const deleteRecipient = (id) => callBackend("deleteRecipient", { id });
export const deleteRecipientsBatch = (ids) => callBackend("deleteRecipientsBatch", { ids });

// ---- Email ----
export const getSenders = () => callBackend("getSenders");
export const startEmailSend = (payload) => callBackend("startEmailSend", payload);
export const analyzeInboxScore = (subject, body) => callBackend("analyzeInboxScore", { subject, body });
export const listSentLog = () => callBackend("listSentLog");
export const pauseJob = (jobId) => callBackend("pauseJob", { jobId });
export const resumeJob = (jobId) => callBackend("resumeJob", { jobId });
export const getEmailStats = (range = "30d") => callBackend("getEmailStats", { range });
export const syncEmailEvents = () => callBackend("syncEmailEvents");
// ---- Analytics ----
export const getAnalytics = () => callBackend("getAnalytics");

/**
 * Simple polling helper for job-based endpoints (leads scrape,
 * startup search, email send). Call this after starting a job to
 * update UI progress until it's done.
 *
 * Usage:
 *   const { jobId } = await startLeadScrape(...)
 *   pollJob(jobId, (job) => setStatus(job.status), (job) => setDone(job))
 */
export const pollJob = (jobId, onUpdate, onDone, intervalMs = 4000) => {
  const timer = setInterval(async () => {
    const { job } = await getJob(jobId);
    if (!job) return;
    onUpdate?.(job);
    if (job.status === "done" || job.status === "error") {
      clearInterval(timer);
      onDone?.(job);
    }
  }, intervalMs);
  return () => clearInterval(timer); // caller can cancel if component unmounts
};
export const listDriveAttachments = () => callBackend("listDriveAttachments");

// ---- Follow-ups ----
export const addToFollowUp = (items) => callBackend("addToFollowUp", { items });
export const listFollowUps = () => callBackend("listFollowUps");
export const updateFollowUp = (id, patch) => callBackend("updateFollowUp", { id, patch });
export const pauseFollowUp = (id) => callBackend("pauseFollowUp", { id });
export const resumeFollowUp = (id) => callBackend("resumeFollowUp", { id });
export const deleteFollowUp = (id) => callBackend("deleteFollowUp", { id });
export const sendFollowUpNow = (payload) => callBackend("sendFollowUpNow", payload); // { id, subject?, body?, variantIdx? }
export const listFollowUpTemplates = () => callBackend("listFollowUpTemplates");
export const saveFollowUpTemplate = (template) => callBackend("saveFollowUpTemplate", template);
export const deleteFollowUpTemplate = (id) => callBackend("deleteFollowUpTemplate", { id });