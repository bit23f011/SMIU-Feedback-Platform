import { describe, expect, it } from "vitest";

import {
  GENERIC_ADMIN_ERROR,
  isSlug,
  isUuid,
  pickSafeMessage,
} from "@/features/admin/shared";

/*
  Pure helpers - koi DB, koi network. Yeh admin error-leak defence ki pehli line
  hai (README §30, §103): sirf allowlist wala message user tak jata hai, baaki sab
  generic ho jata hai; UUID/slug shape check untrusted input par.
*/

describe("isUuid", () => {
  it("sahi uuid ko accept karta hai (upper/lower dono)", () => {
    expect(isUuid("3f2504e0-4f89-41d3-9a0c-0305e82c3301")).toBe(true);
    expect(isUuid("3F2504E0-4F89-41D3-9A0C-0305E82C3301")).toBe(true);
  });

  it("ghalat shakal aur non-string ko rad karta hai", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("3f2504e0-4f89-41d3-9a0c")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid(123)).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});

describe("isSlug", () => {
  it("lowercase, digits aur hyphen allow karta hai", () => {
    expect(isSlug("ayesha-khan-2")).toBe(true);
    expect(isSlug("professor")).toBe(true);
  });

  it("uppercase / underscore / space / khali ko rad karta hai", () => {
    expect(isSlug("Ayesha")).toBe(false);
    expect(isSlug("a_b")).toBe(false);
    expect(isSlug("a b")).toBe(false);
    expect(isSlug("")).toBe(false);
    expect(isSlug(42)).toBe(false);
  });
});

describe("pickSafeMessage", () => {
  const allow = new Set<string>(["A reason is required."]);

  it("sirf allowlist wala message hi wapas karta hai", () => {
    expect(pickSafeMessage("A reason is required.", allow)).toBe("A reason is required.");
  });

  it("allowlist se bahar har cheez generic ban jati hai", () => {
    // Yeh wo raw DB text hai jo user tak KABHI nahi jana chahiye (table/constraint naam).
    expect(
      pickSafeMessage('duplicate key value violates unique constraint "people_slug_key"', allow),
    ).toBe(GENERIC_ADMIN_ERROR);
    expect(pickSafeMessage("", allow)).toBe(GENERIC_ADMIN_ERROR);
    expect(pickSafeMessage(undefined, allow)).toBe(GENERIC_ADMIN_ERROR);
  });
});
