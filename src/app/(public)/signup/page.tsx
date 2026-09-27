import { permanentRedirect } from "next/navigation";

/*
  Purana route. Signup ab /auth/signup par hai. Yeh redirect stub purane links
  ko zinda rakhta hai.

  NOTE: is sandbox me file delete karne ki permission nahi thi, warna yeh folder
  hata diya jata. Windows par isko safely delete kiya ja sakta hai.
*/
export default function LegacySignupPage(): never {
  permanentRedirect("/auth/signup");
}
