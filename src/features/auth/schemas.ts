import { z } from "zod";

/*
  Auth ke Zod schemas - validation ka SINGLE source.

  SECURITY: yeh schemas server actions me chalte hain, is liye yeh asli validation
  hain (browser me koi copy nahi chalti jise bypass kiya ja sake). Phir bhi yeh
  aakhri authority nahi - email domain ka asli lock DB trigger
  `enforce_university_email()` me hai. Yahan wala check sirf user ko jaldi, saaf
  error dikhane ke liye hai.

  BARI TABDEELI (README §11): student apna email TYPE nahi karta. Wo sirf Student
  ID deta hai aur email system banata hai:

      bit23f011  ->  bit23f011@stu.smiu.edu.pk

  Fayda do hain: (1) student ko domain yaad rakhne ki zaroorat nahi, aur (2) email
  ka domain hissa user input se aata hi nahi, is liye koi doosre domain se signup
  ki koshish hi nahi kar sakta. Domain system-controlled hai.
*/

/** System-controlled student email domain. DB ke `universities.email_domains` me bhi yehi hai. */
export const STUDENT_EMAIL_DOMAIN = "stu.smiu.edu.pk";

/*
  Student ID ka shape.

  Sirf letters aur digits allowed hain: yeh email ka local part banta hai, is liye
  '@', '+', '.', quotes waghera ko andar aane hi nahi dena. Lambai ki haddein
  absurd input (aur bcrypt/DoS-type) masail rokne ke liye hain.
*/
const STUDENT_ID_PATTERN = /^[a-z0-9]{4,32}$/;

export const studentIdSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your student ID.")
  .max(32, "That student ID is too long.")
  .refine(
    (value) => STUDENT_ID_PATTERN.test(value),
    "Use only the letters and numbers of your student ID, for example bit23f011.",
  );

/** Student ID -> official university email. Domain kabhi user se nahi aata. */
export function studentIdToEmail(studentId: string): string {
  return `${studentId.trim().toLowerCase()}@${STUDENT_EMAIL_DOMAIN}`;
}

/*
  Password rule jaan boojh kar "lamba" hai, "ajeeb" nahi.
  12 characters minimum >> "1 capital + 1 symbol" wale rules, jo log
  Password1! bana kar tod dete hain. Upper limit is liye ke bohot lambi string
  bcrypt par DoS bana sakti hai.
*/
const MIN_PASSWORD = 12;
const MAX_PASSWORD = 72;

const passwordSchema = z
  .string()
  .min(MIN_PASSWORD, `Use at least ${MIN_PASSWORD} characters.`)
  .max(MAX_PASSWORD, `Keep it under ${MAX_PASSWORD} characters.`);

export const signUpSchema = z
  .object({
    studentId: studentIdSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    // Checkbox: HTML form me "on" bhejta hai, warna field hoti hi nahi.
    acceptTerms: z.literal("on", {
      errorMap: () => ({ message: "Please confirm you understand how reviews are used." }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Both passwords must match.",
    path: ["confirmPassword"],
  });

/*
  Login par password ki lambai check JAAN BOOJH KAR nahi hai.
  Purane accounts ka password rule alag ho sakta hai, aur "password too short"
  jaisa message attacker ko batata hai ke account mojood hai.

  Student ID ka pattern check bhi yahan nahi hai - usi wajah se. Login par sirf
  "khali nahi hona chahiye" dekhte hain.
*/
export const signInSchema = z.object({
  studentId: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Enter your student ID.")
    .max(32, "That student ID is too long."),
  password: z.string().min(1, "Enter your password."),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
