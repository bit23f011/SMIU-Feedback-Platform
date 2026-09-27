import { permanentRedirect } from "next/navigation";

/*
  Purana route. Auth ab /auth/login par hai (apne alag layout ke saath), is liye
  yeh sirf redirect stub hai taake koi bhi purana link ya bookmark toote na.

  NOTE: is sandbox me file delete karne ki permission nahi thi, warna yeh folder
  hata diya jata. Windows par isko safely delete kiya ja sakta hai.
*/
export default function LegacyLoginPage(): never {
  permanentRedirect("/auth/login");
}
