// ==========================================================================
// TEMP AUTH — hardcoded credentials + fake JWT-style session token
// ==========================================================================
// Jab Sanity/backend integrate hoga, sirf yeh file replace karni hai —
// login()/getSession()/logout() ka shape same rakhna taaki AuthGate.jsx
// ya kahin aur kuch badalna na pade.
// ==========================================================================

const HARDCODED_USER = {
  username: "Manas@Bi",
  password: "1234",
}

const SESSION_KEY = "bi_session_token"
const SESSION_HOURS = 24 * 7 // 7 din tak session valid rahega ("session tak rahe" wali requirement)

// ---- base64url helpers (browser-safe, no Buffer) ----
const b64urlEncode = (obj) =>
  btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")

const b64urlDecode = (str) => {
  try {
    const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4))
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad
    return JSON.parse(decodeURIComponent(escape(atob(base64))))
  } catch {
    return null
  }
}

// Fake JWT — header.payload.signature. Signature yahan sirf placeholder hai,
// cryptographically signed NAHI hai. Yeh sirf "session ka shape JWT jaisa
// rahe" ke liye hai jab tak real backend (Sanity ya koi aur) real signed
// JWT issue na kare.
const createFakeJWT = (payload) => {
  const header = { alg: "none", typ: "JWT" }
  const body = { ...payload, iat: Date.now(), exp: Date.now() + SESSION_HOURS * 60 * 60 * 1000 }
  const headerEnc = b64urlEncode(header)
  const payloadEnc = b64urlEncode(body)
  const signature = b64urlEncode({ len: `${headerEnc}.${payloadEnc}`.length })
  return `${headerEnc}.${payloadEnc}.${signature}`
}

const decodeFakeJWT = (token) => {
  if (!token || token.split(".").length !== 3) return null
  const [, payloadEnc] = token.split(".")
  return b64urlDecode(payloadEnc)
}

export const login = (username, password) => {
  if (username.trim() === HARDCODED_USER.username && password === HARDCODED_USER.password) {
    const token = createFakeJWT({ sub: username, role: "admin" })
    localStorage.setItem(SESSION_KEY, token)
    return { ok: true, token }
  }
  return { ok: false, error: "Username ya password galat hai" }
}

export const logout = () => localStorage.removeItem(SESSION_KEY)

export const getSession = () => {
  const token = localStorage.getItem(SESSION_KEY)
  if (!token) return null
  const payload = decodeFakeJWT(token)
  if (!payload || !payload.exp || Date.now() > payload.exp) {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
  return payload
}

export const isAuthenticated = () => !!getSession()