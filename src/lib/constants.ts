import type { NavItem, PersonCategoryMeta } from "@/lib/types";

// Poore app ki central site config. UI-facing text English me hai (professional,
// multi-university extensible). Code COMMENTS Roman Urdu me hain (team preference).
export const SITE = {
  name: "SMIU Feedback Platform",
  // Wordmark ke +/- animation ke liye base word.
  wordmark: "SMIU Feedback Platform",
  tagline: "Understand your learning experience.",
  description:
    "Verified SMIU students share anonymous, structured feedback about teaching and campus services.",
  /** Navbar/footer ka chhota secondary line. Yahi wo line hai jo brand ke sath aati hai. */
  platformLine: "SMIU Feedback Platform",
  // Pehli university - SMIU. Architecture multi-university extensible hai.
  university: {
    shortName: "SMIU",
    fullName: "Sindh Madressatul Islam University",
    city: "Karachi",
    country: "Pakistan",
    line: "Sindh Madressatul Islam University, Karachi",
  },
} as const;

// Review edit limit - server bhi yehi enforce karega (2 edits ke baad lock).
export const REVIEW_LIMITS = {
  maxEditsPerReview: 2,
} as const;

/*
  Ranking threshold.

  Koi profile top spot par tab hi aa sakti hai jab uske paas itni verified
  reviews hon. Is se pehle rating dikhti hai magar ranking me shamil nahi hoti,
  warna ek hi review poora average bana deti.

  YAAD RAHE: yeh UI ka honest threshold hai, security boundary nahi. Asli
  ranking logic server par hoti hai; frontend sirf wahi dikhata hai jo DB deti hai.
*/
export const RANKING = {
  minReviews: 5,
} as const;

/*
  Paanch categories ka master list (order = UI order).
  `slug` seedha public route se match karta hai: /teachers, /lab-instructors,
  /faculty, /uni-staff, /hr-staff. Agar yahan slug badla to route folder bhi badlega.
*/
export const PERSON_CATEGORIES: readonly PersonCategoryMeta[] = [
  {
    value: "teacher",
    label: "Teachers",
    shortLabel: "Teachers",
    singular: "Teacher",
    slug: "teachers",
    description: "Teachers who deliver courses across departments and programs.",
  },
  {
    value: "lab_instructor",
    label: "Lab Instructors",
    shortLabel: "Labs",
    singular: "Lab Instructor",
    slug: "lab-instructors",
    description: "Instructors who run practical and laboratory sessions.",
  },
  {
    value: "faculty",
    label: "Faculty",
    shortLabel: "Faculty",
    singular: "Faculty member",
    slug: "faculty",
    description: "Department faculty members and academic leadership.",
  },
  {
    value: "university_staff",
    label: "University Staff",
    shortLabel: "Uni staff",
    singular: "Staff member",
    slug: "uni-staff",
    description: "Administrative and support staff who assist students on campus.",
  },
  {
    value: "hr_staff",
    label: "HR Staff",
    shortLabel: "HR",
    singular: "HR staff member",
    slug: "hr-staff",
    description: "Human resources and staff-relations personnel.",
  },
] as const;

/** Category slug -> meta (route params ke liye). */
export function getCategoryBySlug(slug: string): PersonCategoryMeta | undefined {
  return PERSON_CATEGORIES.find((category) => category.slug === slug);
}

/** Category enum value -> meta. */
export function getCategoryMeta(value: PersonCategoryMeta["value"]): PersonCategoryMeta {
  const meta = PERSON_CATEGORIES.find((category) => category.value === value);
  // Har enum value ka meta upar mojood hai; yeh sirf TypeScript ke liye fallback hai.
  return meta ?? PERSON_CATEGORIES[0]!;
}

/*
  Navbar navigation. Jaan boojh kar chhoti rakhi hai - paanch categories "Browse"
  dropdown me hain, taake top bar overcrowd na ho.
*/
export const PRIMARY_NAV: readonly NavItem[] = [
  { label: "Rankings", href: "/rankings" },
  { label: "Courses", href: "/courses" },
  { label: "Recommendations", href: "/recommendations" },
] as const;

/** Browse dropdown / mobile nav ke category links. */
export const CATEGORY_NAV: readonly NavItem[] = PERSON_CATEGORIES.map((category) => ({
  label: category.label,
  href: `/${category.slug}`,
}));

/*
  Footer navigation. Jaan boojh kar ek hi chhoti qatar hai.
  Poori category list yahan dobara nahi aati (wo navbar me pehle se hai) aur
  koi product description bhi nahi. Sirf wo links jo footer se dhoonde jate hain.
*/
export const FOOTER_NAV: readonly NavItem[] = [
  { label: "Teachers", href: "/teachers" },
  { label: "Rankings", href: "/rankings" },
  { label: "Courses", href: "/courses" },
  { label: "Recommendations", href: "/recommendations" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Privacy", href: "/#privacy" },
  { label: "Feedback", href: "/feedback" },
] as const;
