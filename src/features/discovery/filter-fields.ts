/*
  Filter field data - JAAN BOOJH KAR bina kisi directive ke.

  Yeh file na "use client" hai na "use server". Wajah yeh hai: `filter-controls.tsx`
  ek client component hai ("use client"). Jab koi server component us client file se
  ek plain constant (jaise PEOPLE_FILTER_FIELDS) import karta hai, to RSC us export ko
  ek "client reference" proxy bana deta hai - asli array nahi. Us par `.filter()`
  chalane se runtime crash hota hai:
  "Attempted to call filter() from the server but filter is on the client."

  Is liye jo cheez dono taraf (server + client) chahiye - type aur constants - wo
  yahan rakhi hai. Directive na hone se yeh mehfooz taur par dono jagah import hoti hai.
*/

export type FilterField =
  | "department"
  | "course"
  | "semester"
  | "rating"
  | "teacherType"
  | "sort";

export const PEOPLE_FILTER_FIELDS: readonly FilterField[] = [
  "department",
  "course",
  "semester",
  "rating",
  "teacherType",
  "sort",
];

export const COURSE_FILTER_FIELDS: readonly FilterField[] = ["department", "semester"];
