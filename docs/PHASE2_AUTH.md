# Phase 2 — Student Authentication (apply & verify)

Yeh Phase 2 ka deployment checklist hai. Code likha ja chuka hai; neeche wale
steps **Supabase dashboard aur Windows par** karne hain.

---

## 1. Migration apply karo

```
supabase/migrations/20260921080000_auth_foundation.sql
```

Yeh migration chaar cheezein banati hai:

1. `universities.email_domains` (text[]) — kis university ka kaun sa email domain
   allowed hai. SMIU ke liye `{smiu.edu.pk}` seed ho jata hai.
2. `public.profiles` — har auth user ki ek row (`id` = `auth.users.id`), role
   `student` ya `admin`.
3. `auth.users` par do trigger:
   - `enforce_university_email` (BEFORE INSERT) — non-university email par signup
     hi fail ho jata hai. **Yeh sab se ahem control hai**: yeh Supabase API ko
     seedha hit karne par bhi lagta hai, sirf humare form par nahi.
   - `handle_new_user` (AFTER INSERT) — profile banata hai, role **hardcoded
     `student`**. Client ka bheja hua metadata jaan boojh kar ignore hota hai.
4. RLS + grants (neeche section 4).

Apply karne ke baad verify karo ke dono trigger mojood hain:

```sql
select tgname from pg_trigger
 where tgrelid = 'auth.users'::regclass and not tgisinternal;
-- expected: enforce_university_email, handle_new_user
```

---

## 2. Supabase Auth settings (dashboard)

| Setting | Value | Kyun |
|---|---|---|
| Authentication → Providers → Email → **Confirm email** | **ON** | Agar OFF hua to signup auto-confirm ho jata hai aur poora verification flow bekaar. |
| Authentication → Providers → Email → Secure email change | ON | Email badalne par dono taraf confirm. |
| Authentication → URL Configuration → Site URL | `NEXT_PUBLIC_SITE_URL` jaisa | Confirmation link isi par banta hai. |
| Authentication → URL Configuration → Redirect URLs | `http://localhost:3000/auth/callback` aur production ka `/auth/callback` | Allow-list me na ho to link kaam nahi karega. |
| Authentication → Providers → Email → Minimum password length | 12 | Zod schema bhi 12 maangta hai; dono jagah same rakho. |
| Authentication → Rate limits → Email sent | kam rakho (default theek hai) | Email bombing se bachao. |

**Anonymous sign-ins, Phone, aur baaki providers OFF rehne chahiye.** Phase 2 me
sirf email + password hai.

### Custom SMTP (Brevo)

Authentication → Emails → SMTP Settings me Brevo ke credentials daalo
(`.env.example` me naam likhe hain, magar values **dashboard** me jati hain —
app code SMTP ko khud touch nahi karta). Default Supabase SMTP sirf testing ke
liye hai aur bohot kam emails bhejta hai.

---

## 3. EK HI EMAIL wala wada

Product rule: **signup par sirf ek verification email jata hai.**

Is liye code me jaan boojh kar:

- koi `resend` server action **nahi** hai,
- `/auth/verify-email` page par koi "Resend email" button **nahi** hai,
- baad me agar resend chahiye to wo alag se, rate-limited aur explicitly design
  karke aayega — abhi ise "chhota sa feature" samajh kar add mat karna.

---

## 4. Security model (yaad rakhne wali baatein)

**Boundary ki tarteeb — upar se neeche, sab se kamzor se sab se mazboot:**

1. `src/middleware.ts` — sirf UX redirect (`/student`, `/admin` par cookie na ho
   to login bhejo). Yeh **security nahi** hai.
2. Server layouts — `requireStudent()` / `requireAdmin()`
   (`src/features/auth/session.ts`). Server par chalte hain, browser me bypass
   nahi hote.
3. **Postgres RLS + grants** — asli boundary. Upar wali dono layers hata bhi den
   to DB ghalat row wapas nahi karegi.

**`profiles` par jaan boojh kar koi INSERT / UPDATE / DELETE grant ya policy
nahi hai.** Sirf `select` hai (`authenticated` ko), aur wo bhi apni row par
(ya admin ko sab par). Iska matlab koi user khud ko `admin` nahi bana sakta,
chahe wo REST API seedha hit kare. Role sirf DB side se badalta hai.

Baaki tay shuda cheezein:

- `supabase.auth.getUser()` use hota hai, `getSession()` **nahi** —
  getSession cookie ka bina-verify data deta hai.
- Har SECURITY DEFINER function par `set search_path` laga hai aur
  `revoke all on function ... from public, anon` chala hai.
- `is_verified_student()` verification `auth.users.email_confirmed_at` se parhta
  hai — hum ne wo flag `profiles` me **copy nahi kiya**, warna do jagah sach
  rakhna parta aur wo kabhi na kabhi alag ho jata.
- Login ka error hamesha ek hi hai ("That email address and password do not
  match"), aur signup hamesha `/auth/verify-email` par bhejta hai — chahe email
  pehle se mojood ho. Yeh **user enumeration** rokne ke liye hai.
- `?next=` par `safeNextPath()` lagta hai (`//evil.com`, backslash, absolute URL
  sab reject) — open redirect band.
- DB / Supabase ka asli error message kabhi user tak nahi jata.

---

## 5. Windows par build

Sandbox me `next build` chal nahi sakta (native SWC binary + network font fetch).
Apne PC par:

```powershell
cd C:\ProfAura
Remove-Item -Recurse -Force .next   # sandbox yeh folder delete nahi kar saka
npm run build
```

Typecheck aur lint dono yahan clean hain:

```
npx tsc --noEmit            # exit 0
npx next lint --max-warnings=0   # clean
```

---

## 6. Manual test (migration apply karne ke baad)

1. `you@gmail.com` se signup — **fail hona chahiye** (safe generic message).
2. `you@smiu.edu.pk` se signup — verify-email page, inbox me **ek** email.
3. Email confirm kiye baghair `/student` — verify-email par redirect.
4. Link kholo → `/auth/callback` → session bane → `/student` khule.
5. `/admin` kholo (normal student) — chup chaap home par redirect.
6. Sign out → `/student` → login par redirect with `?next=/student`.
7. SQL: `update profiles set role = 'admin'` ek non-admin session se chalao —
   **permission denied** aana chahiye.
