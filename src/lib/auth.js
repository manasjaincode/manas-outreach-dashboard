// lib/auth.js — now just a thin wrapper around the backend.
// Real password checking, hashing, and session signing all happen
// server-side (Apps Script Auth.gs). This file only manages the
// token in localStorage and exposes the same function names the
// rest of the app already expects, so AuthGate/LandingPage barely change.

import { login as apiLogin, logout as apiLogout, isAuthenticated as apiIsAuthenticated, changePassword as apiChangePassword } from "./api"

export const login = async (username, password) => {
  try {
    const data = await apiLogin(username, password) // throws on bad credentials
    setCurrentUser(data.user)
    return { ok: true, user: data.user, mustChangePassword: data.mustChangePassword }
  } catch (err) {
    return { ok: false, error: err.message || "Username ya password galat hai" }
  }
}

export const logout = () => apiLogout()

export const isAuthenticated = () => apiIsAuthenticated()

export const changePassword = async (newPassword) => {
  try {
    await apiChangePassword(newPassword)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// Current user info — stored alongside the token so the UI can show
// "logged in as X" / branch on role without an extra API call.
export const getCurrentUser = () => {
  try { return JSON.parse(localStorage.getItem("nectar_user") || "null") } catch { return null }
}
export const setCurrentUser = (user) => localStorage.setItem("nectar_user", JSON.stringify(user))