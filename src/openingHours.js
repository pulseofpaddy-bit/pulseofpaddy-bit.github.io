// Parses a subset of the OSM opening_hours spec:
//   "Mo-Fr 11:00-22:00; Sa-Su 12:00-23:00"
//   "24/7"
//   "Mo-Su 09:00-21:00"
// Returns: true (open), false (closed), or null (unknown).
// `now` is injectable so tests can pin a weekday.

const DAY_NAMES = ["su", "mo", "tu", "we", "th", "fr", "sa"];
const DAY_ORDER = ["mo", "tu", "we", "th", "fr", "sa", "su"];

function expandDays(spec) {
  spec = spec.toLowerCase().trim();
  if (spec.includes("-")) {
    const [from, to] = spec.split("-").map((d) => d.trim());
    const fi = DAY_ORDER.indexOf(from);
    const ti = DAY_ORDER.indexOf(to);
    if (fi < 0 || ti < 0) return [];
    const days = [];
    let i = fi;
    while (true) {
      days.push(DAY_ORDER[i]);
      if (i === ti) break;
      i = (i + 1) % 7;
      if (days.length > 7) break;
    }
    return days;
  }
  return [spec];
}

export function checkIsOpen(ohStr, now = new Date()) {
  if (!ohStr || ohStr === "Hours not listed") return null;
  const s = ohStr.trim();
  if (s === "24/7" || s === "open") return true;
  if (s === "closed") return false;

  const curDay = DAY_NAMES[now.getDay()];
  const curMins = now.getHours() * 60 + now.getMinutes();

  const parseMins = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };

  const rules = s.split(";").map((r) => r.trim()).filter(Boolean);
  for (const rule of rules) {
    const m = rule.match(/^([a-zA-Z,\-]+)?\s*(\d{1,2}:\d{2})\s*[-→]\s*(\d{1,2}:\d{2})/);
    if (!m) continue;
    const daySpec = m[1] ? m[1].trim() : "mo-su";
    const open = parseMins(m[2]);
    const close = parseMins(m[3]);
    const applicableDays = daySpec.split(",").map((d) => d.trim()).flatMap((g) => expandDays(g));

    if (applicableDays.includes(curDay)) {
      if (close < open) {
        if (curMins >= open || curMins < close) return true;
      } else if (curMins >= open && curMins < close) {
        return true;
      }
      return false;
    }
  }
  return false;
}
