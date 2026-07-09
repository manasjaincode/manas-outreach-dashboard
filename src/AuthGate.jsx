import { useState } from "react"
import { isAuthenticated } from "./lib/auth"
import LandingPage from "./LandingPage"

// Wrap your existing app entry with this:
//   <AuthGate><Dashboard /></AuthGate>
// Session localStorage mein rehta hai (7 din), so refresh pe dobara login
// nahi maangna padega. Jab Sanity/backend auth aayega, sirf lib/auth.js
// replace karna — yeh file waisa hi rahega.
export default function AuthGate({ children }) {
  const [authed, setAuthed] = useState(() => isAuthenticated())

  if (!authed) {
    return <LandingPage onLoginSuccess={() => setAuthed(true)} />
  }
  return children
}