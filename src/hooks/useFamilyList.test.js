import { describe, expect, test } from "vitest";
import { mergeFamilyItems, readStoredList } from "./useFamilyList.js";

if (typeof globalThis.localStorage === "undefined") {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
}

describe("mergeFamilyItems", () => {
  test("keeps unsynced local rows and does not treat a failed payload as rows", () => {
    const prev = [
      { id: "local", text: "Milk", createdAt: 2 },
      { id: "old", fbId: "a", text: "Eggs", createdAt: 1 },
    ];
    const remote = [{ id: "old", fbId: "a", text: "Eggs", createdAt: 3 }];
    const merged = mergeFamilyItems(prev, remote);
    expect(merged.map((item) => item.text)).toEqual(["Eggs", "Milk"]);
    expect(mergeFamilyItems(prev, [])).toEqual([{ id: "local", text: "Milk", createdAt: 2 }]);
  });

  test("drops blank text", () => {
    expect(mergeFamilyItems([], [{ id: "x", text: "  ", createdAt: 1 }])).toEqual([]);
  });
});

describe("readStoredList", () => {
  test("returns an empty list when storage is missing or broken", () => {
    expect(readStoredList("pulse-test-missing")).toEqual([]);
    localStorage.setItem("pulse-test-bad", "{");
    expect(readStoredList("pulse-test-bad")).toEqual([]);
    localStorage.removeItem("pulse-test-bad");
  });
});
