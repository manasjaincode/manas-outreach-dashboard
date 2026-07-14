// ============================================================
// AUTH — thin re-export layer over api.js
// ============================================================
// This used to hold the hardcoded-credentials + fake-JWT logic.
// Now that the real backend (Apps Script) handles auth, this file
// just re-exports the relevant pieces from api.js — so AuthGate.jsx,
// Dashboard.jsx, and LandingPage.jsx don't need their import paths
// changed at all.
//
// NOTE ON isAuthenticated(): this now only checks "is there a token
// saved locally", not "is that token cryptographically valid" (we
// can't verify a server-signed token in the browser). If the token
// is actually expired/invalid, the first real API call will get a
// 401 back, api.js will clear the session automatically, and the
// user gets bounced to the login screen on their next action.
// ============================================================

export { login, logout, isAuthenticated, getUser, getToken, changePassword } from "./api.js"