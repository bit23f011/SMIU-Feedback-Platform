import { describe, expect, it } from "vitest";

import {
  PERSON_CATEGORY_ORDER,
  PERSON_GENDER_ORDER,
  TEACHER_TYPE_ORDER,
  isPeopleStatus,
  isPersonCategory,
  isPersonGender,
  isTeacherType,
} from "@/features/admin/people/types";
import { isStudentStatus } from "@/features/admin/students/types";

/*
  Yeh type guards untrusted searchParams (URL se) ko trusted enum me badalte hain.
  Agar koi ajeeb value bheje to guard false de - server usay reject/normalize karta
  hai, warna filter bypass ho sakta tha. Isi liye guards ka test zaroori hai.
*/

describe("enum guards asli values accept karte hain", () => {
  it("category / gender / teacher-type ke pehle enum member par true", () => {
    expect(isPersonCategory(PERSON_CATEGORY_ORDER[0])).toBe(true);
    expect(isPersonGender(PERSON_GENDER_ORDER[0])).toBe(true);
    expect(isTeacherType(TEACHER_TYPE_ORDER[0])).toBe(true);
  });
});

describe("enum guards kachra rad karte hain", () => {
  it("na-maloom string aur non-string par false", () => {
    expect(isPersonCategory("__nope__")).toBe(false);
    expect(isPersonCategory(42)).toBe(false);
    expect(isPersonGender("other")).toBe(false);
    expect(isTeacherType("visiting")).toBe(false);
    expect(isTeacherType(null)).toBe(false);
  });
});

describe("status guards", () => {
  it("people status: all/active/inactive/unverified", () => {
    expect(isPeopleStatus("unverified")).toBe(true);
    expect(isPeopleStatus("active")).toBe(true);
    expect(isPeopleStatus("banned")).toBe(false);
  });

  it("student status sirf all/active/inactive (unverified NAHI)", () => {
    expect(isStudentStatus("inactive")).toBe(true);
    expect(isStudentStatus("unverified")).toBe(false);
    expect(isStudentStatus("")).toBe(false);
  });
});
