import { describe, expect, test } from "vitest";
import { checkIsOpen } from "./openingHours.js";

const fridayNoon = new Date(2026, 4, 8, 12, 0, 0);
const sundayNoon = new Date(2026, 4, 10, 12, 0, 0);
const mondayMorning = new Date(2026, 4, 4, 10, 0, 0);

describe("checkIsOpen", () => {
  test("Friday noon is inside Mo-Fr 11:00-22:00", () => {
    expect(fridayNoon.getDay()).toBe(5);
    expect(checkIsOpen("Mo-Fr 11:00-22:00", fridayNoon)).toBe(true);
  });

  test("Sunday noon is outside Mo-Fr 11:00-22:00", () => {
    expect(sundayNoon.getDay()).toBe(0);
    expect(checkIsOpen("Mo-Fr 11:00-22:00", sundayNoon)).toBe(false);
  });

  test("Monday before opening is closed", () => {
    expect(checkIsOpen("Mo-Fr 11:00-22:00", mondayMorning)).toBe(false);
  });

  test("weekend rule and 24/7", () => {
    expect(checkIsOpen("Mo-Fr 11:00-22:00; Sa-Su 12:00-23:00", sundayNoon)).toBe(true);
    expect(checkIsOpen("24/7", fridayNoon)).toBe(true);
    expect(checkIsOpen("Hours not listed", fridayNoon)).toBe(null);
    expect(checkIsOpen("", fridayNoon)).toBe(null);
  });

  test("overnight hours count late evening and the early morning", () => {
    const fridayLate = new Date(2026, 4, 8, 23, 0, 0);
    const saturdayEarly = new Date(2026, 4, 9, 1, 0, 0);
    const saturdayMid = new Date(2026, 4, 9, 3, 0, 0);
    expect(checkIsOpen("Mo-Su 22:00-02:00", fridayLate)).toBe(true);
    expect(checkIsOpen("Mo-Su 22:00-02:00", saturdayEarly)).toBe(true);
    expect(checkIsOpen("Mo-Su 22:00-02:00", saturdayMid)).toBe(false);
  });
});
