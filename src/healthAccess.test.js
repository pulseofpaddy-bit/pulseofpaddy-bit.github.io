import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { canViewHealthLogs, inferRelation } from "./healthAccess.js";

describe("inferRelation", () => {
  test("keeps a saved relation and fills one in for older members", () => {
    expect(inferRelation({ relation: "child", gender: "female", role: "member" })).toBe("child");
    expect(inferRelation({ gender: "girl", role: "member" })).toBe("child");
    expect(inferRelation({ gender: "boy", role: "member" })).toBe("child");
    expect(inferRelation({ gender: "female", role: "head" })).toBe("head");
    expect(inferRelation({ gender: "female", role: "member" })).toBe("spouse");
    expect(inferRelation({ gender: "male", role: "member" })).toBe("spouse");
  });
});

describe("canViewHealthLogs", () => {
  test("mother and daughter can see logs", () => {
    expect(canViewHealthLogs({ gender: "female", role: "head" })).toBe(true);
    expect(canViewHealthLogs({ gender: "female", relation: "spouse", role: "member" })).toBe(true);
    expect(canViewHealthLogs({ gender: "female", relation: "child", role: "member" })).toBe(true);
    expect(canViewHealthLogs({ gender: "girl", role: "member" })).toBe(true);
  });

  test("male head, male spouse, and boys cannot see logs", () => {
    expect(canViewHealthLogs({ gender: "male", role: "head" })).toBe(false);
    expect(canViewHealthLogs({ gender: "male", relation: "spouse", role: "member" })).toBe(false);
    expect(canViewHealthLogs({ gender: "boy", role: "member" })).toBe(false);
    expect(canViewHealthLogs(null)).toBe(false);
  });
});

describe("health rules", () => {
  const rules = JSON.parse(readFileSync(new URL("../database.rules.json", import.meta.url), "utf8")).rules;

  test("health logs require female head, spouse, daughter, or girl", () => {
    const read = rules.households.$householdId.health[".read"];
    expect(read).toContain("gender");
    expect(read).toContain("'girl'");
    expect(read).toContain("'female'");
    expect(read).toContain("'child'");
    expect(read).toContain("'spouse'");
    expect(rules.households.$householdId.health[".write"]).toBe(read);
    expect(rules[".read"]).toBe(false);
  });
});
