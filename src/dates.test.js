import { describe, expect, test } from "vitest";
import { calendarDateFromText, formatLocalDate, parseDate } from "./dates.js";

describe("local calendar dates", () => {
  test("May 7 stays May 7 east of UTC (toISOString would be May 6)", () => {
    const localMidnight = new Date("May 7, 2026");
    expect(formatLocalDate(localMidnight)).toBe("2026-05-07");
    expect(localMidnight.toISOString().slice(0, 10)).toBe("2026-05-06");
  });

  test("parseDate strips a weekday and keeps the local day", () => {
    expect(parseDate("Thu, May 7, 2026")).toBe("2026-05-07");
    expect(parseDate("May 7, 2026")).toBe("2026-05-07");
  });

  test("parseDate fills the current year when the email omits it", () => {
    const year = new Date().getFullYear();
    expect(parseDate("May 7")).toBe(`${year}-05-07`);
  });

  test("parseDate returns empty for a blank value", () => {
    expect(parseDate("")).toBe("");
    expect(parseDate(null)).toBe("");
  });

  test("appointment dates use the local day and keep ISO dates as written", () => {
    expect(calendarDateFromText("June 10, 2026")).toBe("2026-06-10");
    expect(calendarDateFromText("2026-05-07")).toBe("2026-05-07");
    expect(calendarDateFromText("2019-05-07")).toBe("");
    expect(calendarDateFromText("")).toBe("");
  });
});
