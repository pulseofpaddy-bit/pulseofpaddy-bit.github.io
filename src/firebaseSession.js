import { RTDB_ROOT, withAuth } from "./rtdbPaths.js";

const ID_KEY = "pulse_fb_id";
const REFRESH_KEY = "pulse_fb_refresh";
const EXP_KEY = "pulse_fb_exp";
const UID_KEY = "pulse_fb_uid";
const EMAIL_KEY = "pulse_fb_email";

let configPromise = null;
let authMessage = "";
const listeners = new Set();
const sessionListeners = new Set();
let nativeFetch = null;

export function subscribeFirebaseNotice(listener) {
  listeners.add(listener);
  if (authMessage) listener(authMessage);
  return () => listeners.delete(listener);
}

export function subscribeFirebaseSession(listener) {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

function notifySession() {
  const uid = localStorage.getItem(UID_KEY) || "";
  sessionListeners.forEach((fn) => fn(uid));
}

function setAuthMessage(message) {
  if (authMessage === message) return;
  authMessage = message || "";
  listeners.forEach((fn) => fn(authMessage));
}

export function loadFirebaseConfig() {
  if (!configPromise) {
    configPromise = fetch("/firebase-config.json")
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
  }
  return configPromise;
}

export function resetFirebaseConfigCache() {
  configPromise = null;
}

function decodeJwtPart(part) {
  const pad = (4 - (part.length % 4)) % 4;
  const b64 = part.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
  return JSON.parse(atob(b64));
}

export function idTokenNonceOk(idToken, expected) {
  if (!expected) return true;
  try {
    const payload = decodeJwtPart(String(idToken || "").split(".")[1] || "");
    return !payload.nonce || payload.nonce === expected;
  } catch {
    return false;
  }
}

function rememberSession(idToken, refreshToken, expiresIn, uid, email) {
  const expiresAt = Date.now() + Number(expiresIn || 3600) * 1000;
  localStorage.setItem(ID_KEY, idToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(EXP_KEY, String(expiresAt));
  if (uid) localStorage.setItem(UID_KEY, uid);
  if (email) localStorage.setItem(EMAIL_KEY, email);
  setAuthMessage("");
  notifySession();
  return idToken;
}

export function clearFirebaseSession() {
  [ID_KEY, REFRESH_KEY, EXP_KEY, UID_KEY, EMAIL_KEY].forEach((key) => localStorage.removeItem(key));
  setAuthMessage("");
  notifySession();
}

export function firebaseEmail() {
  return localStorage.getItem(EMAIL_KEY) || "";
}

export function firebaseUid() {
  return localStorage.getItem(UID_KEY) || "";
}

function signedInLocally() {
  try {
    return !!localStorage.getItem("pulse_fw_user");
  } catch {
    return false;
  }
}

async function refreshIdToken(config) {
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh || !config?.apiKey) return null;
  const res = await nativeFetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(config.apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refresh)}`,
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.id_token) return null;
  return rememberSession(data.id_token, data.refresh_token || refresh, data.expires_in, data.user_id || firebaseUid());
}

export async function getFirebaseIdToken(force = false) {
  const config = await loadFirebaseConfig();
  if (!config?.apiKey) {
    if (signedInLocally()) setAuthMessage("Family sync needs the Firebase web API key in firebase-config.json. Saved lists stay on this phone.");
    return null;
  }
  const current = localStorage.getItem(ID_KEY);
  const exp = Number(localStorage.getItem(EXP_KEY) || 0);
  if (!force && current && Date.now() < exp - 60_000) return current;
  const refreshed = await refreshIdToken(config);
  if (refreshed) return refreshed;
  if (signedInLocally()) setAuthMessage("Sign in again to sync family data. Lists already on this phone stay here.");
  return null;
}

export async function signInWithGoogleIdToken(idToken, expectedNonce) {
  if (!idTokenNonceOk(idToken, expectedNonce)) {
    setAuthMessage("Sign in again to sync family data. Lists already on this phone stay here.");
    return null;
  }
  const config = await loadFirebaseConfig();
  if (!config?.apiKey) {
    setAuthMessage("Family sync needs the Firebase web API key in firebase-config.json. Saved lists stay on this phone.");
    return null;
  }
  const requestUri = window.location.origin + window.location.pathname;
  const res = await nativeFetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${encodeURIComponent(config.apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      postBody: `id_token=${encodeURIComponent(idToken)}&providerId=google.com`,
      requestUri,
      returnSecureToken: true,
      returnIdpCredential: true,
    }),
  });
  if (!res.ok) {
    setAuthMessage("Sign in again to sync family data. Lists already on this phone stay here.");
    return null;
  }
  const data = await res.json();
  if (!data.idToken) return null;
  return rememberSession(data.idToken, data.refreshToken, data.expiresIn, data.localId, data.email);
}

function unauthorized(message) {
  if (signedInLocally()) setAuthMessage(message);
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

async function authedFirebaseFetch(url, init) {
  let token = await getFirebaseIdToken(false);
  if (!token) return unauthorized("Sign in again to sync family data. Lists already on this phone stay here.");
  const first = await nativeFetch(withAuth(url, token), { ...init, referrer: "no-referrer" });
  if (first.status !== 401) return first;
  token = await getFirebaseIdToken(true);
  if (!token) return first;
  const second = await nativeFetch(withAuth(url, token), { ...init, referrer: "no-referrer" });
  if (second.status === 401 && signedInLocally()) {
    setAuthMessage("Sign in again to sync family data. Lists already on this phone stay here.");
  }
  return second;
}

export function installRtdbFetch() {
  if (typeof window === "undefined" || nativeFetch) return;
  nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input?.url;
    if (typeof url === "string" && url.includes("firebaseio.com") && !url.includes("auth=")) {
      return authedFirebaseFetch(url, init);
    }
    return nativeFetch(input, init);
  };
}

export async function registerHouseholdMember({ householdId, email, role, gender, relation }) {
  const uid = firebaseUid();
  if (!householdId || !uid || !email) return false;
  const res = await fetch(`${RTDB_ROOT}/households/${householdId}/members/${uid}.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      role: role || "member",
      gender: gender || "",
      relation: relation || "",
      uid,
      updatedAt: Date.now(),
    }),
  });
  return res.ok;
}

