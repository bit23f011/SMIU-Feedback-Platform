import { describe, expect, it } from "vitest";

import {
  STUDENT_EMAIL_DOMAIN,
  signInSchema,
  signUpSchema,
  studentIdSchema,
  studentIdToEmail,
} from "@/features/auth/schemas";

/*
  Auth validation ka SINGLE source (README §11). Yeh server actions me chalta hai,
  is liye asli check yahi hai (browser copy bypass nahi hoti). Domain user input se
  nahi aata - system lagata hai - is liye koi doosre domain se signup nahi kar sakta.
*/

describe("studentIdSchema", () => {
  it("trim + lowercase karke normalize karta hai", () => {
    expect(studentIdSchema.parse("  BIT23F011  ")).toBe("bit23f011");
  });

  it("sirf letters/digits maanta hai, length 4..32", () => {
    expect(studentIdSchema.safeParse("abc").success).toBe(false); // bohot chhota (3)
    expect(studentIdSchema.safeParse("bit+23").success).toBe(false); // symbol
    expect(studentIdSchema.safeParse("bit.23@x").success).toBe(false); // email injection
    expect(studentIdSchema.safeParse("a".repeat(33)).success).toBe(false); // bohot lamba
    expect(studentIdSchema.safeParse("bit23f011").success).toBe(true);
  });
});

describe("studentIdToEmail", () => {
  it("domain system se aata hai, user input se nahi", () => {
    expect(studentIdToEmail("BIT23F011")).toBe(`bit23f011@${STUDENT_EMAIL_DOMAIN}`);
    expect(studentIdToEmail("  bit23f011  ")).toBe(`bit23f011@${STUDENT_EMAIL_DOMAIN}`);
  });
});

describe("signUpSchema", () => {
  const base = {
    studentId: "bit23f011",
    password: "correct-horse-battery",
    confirmPassword: "correct-horse-battery",
    acceptTerms: "on",
  };

  it("sahi payload pass hota hai", () => {
    expect(signUpSchema.safeParse(base).success).toBe(true);
  });

  it("dono passwords match hone zaroori hain", () => {
    const result = signUpSchema.safeParse({ ...base, confirmPassword: "different-passphrase" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("confirmPassword");
    }
  });

  it("chhota password (12 se kam) rad hota hai", () => {
    expect(signUpSchema.safeParse({ ...base, password: "short", confirmPassword: "short" }).success).toBe(
      false,
    );
  });

  it("terms accept karna lazmi hai", () => {
    expect(signUpSchema.safeParse({ ...base, acceptTerms: "off" }).success).toBe(false);
    const { acceptTerms: _omit, ...withoutTerms } = base;
    expect(signUpSchema.safeParse(withoutTerms).success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("dono fields khali nahi ho sakte", () => {
    expect(signInSchema.safeParse({ studentId: "", password: "" }).success).toBe(false);
    expect(signInSchema.safeParse({ studentId: "bit23f011", password: "" }).success).toBe(false);
  });

  it("login par pattern/length check nahi (account enumeration se bachne ke liye)", () => {
    // Purane / chhote passwords bhi accept hote hain: "too short" message account leak karta.
    expect(signInSchema.safeParse({ studentId: "bit23f011", password: "x" }).success).toBe(true);
  });
});
