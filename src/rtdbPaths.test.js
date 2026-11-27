import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  emailKey,
  folderKey,
  getHouseholdId,
  healthCollection,
  setHouseholdId,
  userNodeKey,
  withAuth,
} from "./rtdbPaths.js";
import { idTokenNonceOk } from "./firebaseSession.js";

describe("household keys", () => {
  test("emailKey matches the head and member-lookup replacement", () => {
    expect(emailKey("Ada.Smith@gmail.com")).toBe("Ada,Smith,gmail,com");
    expect(emailKey("")).toBe("");
  });

  test("reservation and clothing keys keep @", () => {
    expect(userNodeKey("Ada.Smith@gmail.com")).toBe("Ada,Smith@gmail,com");
  });

  test("folder keys strip Firebase-forbidden characters and keep @", () => {
    expect(folderKey("ab.cd$ef")).toBe("ab,cd,ef");
  });

});

describe("paths and auth query", () => {
  test("health URLs stay under the household and are absent until an id is set", () => {
    setHouseholdId("");
    expect(healthCollection("periods")).toBeNull();
    setHouseholdId("ada,gmail,com");
    expect(getHouseholdId()).toBe("ada,gmail,com");
    expect(healthCollection("periods")).toBe(
      "https://pulse-family-default-rtdb.firebaseio.com/households/ada,gmail,com/health/periods.json"
    );
    setHouseholdId("");
  });

  test("withAuth adds the Firebase id token without dropping an existing query", () => {
    const url = withAuth(
      "https://pulse-family-default-rtdb.firebaseio.com/family/ada,gmail,com/grocery.json?print=silent",
      "header.payload.sig"
    );
    const parsed = new URL(url);
    expect(parsed.searchParams.get("auth")).toBe("header.payload.sig");
    expect(parsed.searchParams.get("print")).toBe("silent");
  });
});

describe("google id token nonce", () => {
  test("accepts a matching nonce and rejects a different one", () => {
    const part = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
    const token = `${part({ alg: "none" })}.${part({ nonce: "abc" })}.x`;
    expect(idTokenNonceOk(token, "abc")).toBe(true);
    expect(idTokenNonceOk(token, "nope")).toBe(false);
    expect(idTokenNonceOk(token, "")).toBe(true);
  });
});

describe("database rules", () => {
  const rules = JSON.parse(readFileSync(new URL("../database.rules.json", import.meta.url), "utf8")).rules;

  test("the database is closed unless a rule below allows it", () => {
    expect(rules[".read"]).toBe(false);
    expect(rules[".write"]).toBe(false);
  });

  test("household membership guards family data and chat rules are gone", () => {
    expect(rules.households.$householdId.members.$uid[".write"]).toContain("auth.uid == $uid");
    expect(rules.family.$householdId[".read"]).toContain("members");
    expect(rules.reservations.$userKey[".read"]).toContain("auth.token.email");
    expect(rules.clothing.$userKey[".write"]).toContain("auth.token.email");
    expect(rules.pingme).toBeUndefined();
    expect(rules.households.$householdId.pingme).toBeUndefined();
    expect(rules.meta).toBeUndefined();
  });
});
