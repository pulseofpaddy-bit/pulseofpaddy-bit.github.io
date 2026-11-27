// Calendar dates stay on the local day. `Date#toISOString()` shifts
// evening-US local midnights onto the previous UTC date.

export function formatLocalDate(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

// Reservation emails: "Thu, May 7, 2026" or "May 7" (current year if omitted).
export function parseDate(str) {
  if (!str) return "";
  let ds = str.trim();
  ds = ds.replace(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s*/i, "");
  if (!/\d{4}/.test(ds)) ds += " " + new Date().getFullYear();
  return formatLocalDate(new Date(ds));
}

// Appointment emails. ISO dates are already a calendar day (parsed as UTC by
// `new Date("YYYY-MM-DD")`), so they are kept as written. Other forms are local.
export function calendarDateFromText(raw) {
  if (!raw) return "";
  const text = String(raw).trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const year = Number(iso[1]);
    if (year < 2020 || year > 2030) return "";
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  if (year < 2020 || year > 2030) return "";
  return formatLocalDate(d);
}
