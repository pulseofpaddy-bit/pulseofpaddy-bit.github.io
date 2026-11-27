export const RTDB_ROOT = "https://pulse-family-default-rtdb.firebaseio.com";

// Head / member-lookup keys. Matches the existing `. # $ [ ] @` → comma replacement.
export function emailKey(email) {
  return String(email || "").replace(/[.#$[\]@]/g, ",");
}

// Reservation and clothing nodes. `@` stays, same as the existing list URLs.
export function userNodeKey(email) {
  return String(email || "shared").replace(/[.#$[\]]/g, ",");
}

// Drive folder ids used as a household id when an email key is not ready yet.
export function folderKey(id) {
  return String(id || "").replace(/[.#$[\]]/g, ",");
}

// PingMe notification inbox. Dots and @ become underscores, same as before.
export function pingSafeEmail(email) {
  return String(email || "").replace(/[.@]/g, "_");
}

let householdId = "";

export function setHouseholdId(id) {
  householdId = id || "";
}

export function getHouseholdId() {
  return householdId;
}

export function householdPingRoot() {
  if (!householdId) return null;
  return `${RTDB_ROOT}/households/${householdId}/pingme`;
}

// Chat data lives under the household so another household can be added later
// without moving grocery, travel, or clothing paths.
export function pingCollection(path) {
  const root = householdPingRoot();
  if (!root) return null;
  const clean = String(path || "").replace(/^\/+/, "");
  return clean ? `${root}/${clean}` : root;
}

export function legacyPingUrl() {
  return `${RTDB_ROOT}/pingme.json`;
}

export function withAuth(url, token) {
  const parsed = new URL(url);
  if (token) parsed.searchParams.set("auth", token);
  return parsed.toString();
}
