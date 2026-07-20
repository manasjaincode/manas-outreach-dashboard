// ============================================================
// api.js — drop this in your React project (e.g. src/lib/api.js)
// Replaces all the direct fetch() calls to Google Maps / Groq /
// Gemini / Brevo that used to live in config.js and EmailPage.jsx.
//
// Set this in your .env (frontend):
//   VITE_BACKEND_URL=https://script.google.com/macros/s/XXXXX/exec
// (you get this URL after deploying the Apps Script as a Web App)
// ============================================================

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const getToken = () => localStorage.getItem("nectar_token");
const setToken = (t) => localStorage.setItem("nectar_token", t);
const clearToken = () => localStorage.removeItem("nectar_token");

/**
 * Every call goes through here. Content-Type is deliberately
 * text/plain — sending application/json from the browser would
 * trigger a CORS preflight (OPTIONS request), which Apps Script
 * Web Apps don't support. text/plain avoids the preflight while
 * we still send well-formed JSON as the body string.
 */
async function callBackend(action, payload = {}) {
  const res = await fetch(BACKEND_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, token: getToken(), payload }),
  });
  const data = await res.json();
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