# SMIU Feedback Platform

> **Understand Your Learning Experience.**
>
> SMIU Feedback Platform is an independent university student platform for discovering, reviewing, comparing, and understanding the academic experience associated with teachers and other university-related roles.

---

## 1. Product Overview

**SMIU Feedback Platform** is a structured student feedback and discovery platform.

The initial university is:

**Sindh Madressatul Islam University, Karachi (SMIU)**

SMIU Feedback Platform is designed to help students:

- discover teachers and university-related roles
- search people by name
- search teachers by course
- view public profiles
- submit structured reviews
- optionally share a short written experience
- compare teachers
- see course-wise and semester-wise ratings
- explore category-specific rankings
- receive teacher recommendations based on academic context
- save/favorite profiles

The platform is intentionally respectful of teachers, faculty, university staff, and the institution.

SMIU Feedback Platform must not be positioned as a tool for attacking, humiliating, or publicly exposing individuals. Its purpose is structured student feedback, academic insight, and transparency.

**SMIU Feedback Platform is an independent platform and must not imply official SMIU affiliation unless explicitly configured later.**

---

# 2. CRITICAL AI/CLAUDE CONTINUATION RULE

This repository may be developed across multiple Claude sessions.

## NEVER RESTART THE PROJECT

When Claude receives a new task for this project:

1. Read this `README.md` completely.
2. Inspect the current repository and current codebase.
3. Inspect `supabase/migrations/`.
4. Inspect existing documentation under `docs/`.
5. Inspect the current routes and implemented features.
6. Determine what phases/features are already completed.
7. Continue from the current implementation state.
8. Do NOT recreate completed work.
9. Do NOT reset or replace the project just because a new Claude conversation has started.
10. Preserve all finalized product decisions in this document unless the project owner explicitly changes them.

### Before writing code in a new Claude session

Claude must first understand:

- what already exists
- what is partially implemented
- what is still pending
- what is broken
- which phase is currently active

If a feature is already implemented, improve/fix it where needed instead of rebuilding it from scratch.

### Source of truth

For product requirements:

**`README.md` = Product Requirements / PRD source of truth**

For database:

**`supabase/migrations/` = Database source of truth**

For security requirements:

**`SECURITY.md` + the approved security requirements in this PRD**

For implementation-specific details:

**current codebase + migrations + docs**

Do not assume that a new Claude session means a new project.

---

# 3. Brand Identity

## Brand Name

**SMIU Feedback Platform**

Meaning:

- **Prof** = Professor
- **Aura** = reputation, impression, perception, and overall academic experience
- **+** = Aura Plus / positive experience
- **-** = Aura Minus / negative experience

The actual brand name is always:

**SMIU Feedback Platform**

## Brand Animation

The logo/wordmark may subtly animate:

`SMIU Feedback Platform-`

then

`SMIU Feedback Platform+`

then repeat.

Only the `+ / -` element changes.

The actual brand remains **SMIU Feedback Platform**.

Animation must be:

- subtle
- smooth
- lightweight
- professional
- non-distracting
- accessible

Respect:

`prefers-reduced-motion`

---

# 4. SMIU Feedback Platform Loader

The loading experience uses:

```text
A
Au
Aur
Aura
Aura-
Aura+
Aura-
Aura+
```

Then repeat.

The `Aura` part appears like a typing animation.

The `- / +` part connects the loader with the core brand identity.

Loader requirements:

- simple
- smooth
- lightweight
- premium
- professional
- non-flashy
- reduced-motion aware

---

# 5. UI/UX Design Direction

SMIU Feedback Platform must look like a real-world product designed by a professional human UI/UX designer.

## Target Feel

- modern SaaS
- academic
- professional
- trustworthy
- simple
- clean
- lightweight
- polished
- premium but understated
- natural
- human-designed

The interface should feel **0% AI/vibe-coded**.

## Visual Principles

The UI should look simple at first glance.

Its quality should come from:

- spacing
- typography
- proportions
- alignment
- hierarchy
- subtle depth
- interaction quality
- consistency
- micro-interactions

Not from excessive visual decoration.

## Avoid

Do not use:

- gradients
- gradient buttons
- gradient text
- gradient cards
- dark-heavy UI
- neon
- glowing effects
- giant illustrations
- decorative blobs
- futuristic AI-style visuals
- excessive glassmorphism
- giant floating panels
- excessive shadows
- oversized headings
- unnecessary pill-shaped elements
- excessive rounded cards
- crowded screens
- unnecessary decoration

## Colors

Approved SMIU Feedback Platform palette:

```text
#D1964A
#F4675E
#C658A1
#4858A3
```

Use only **2–3 active accent colors** in the UI at one time.

Most of the interface should be:

- white
- off-white
- very light neutral
- very light tinted surfaces

Dark colors must not dominate the interface.

Accent colors can be used for:

- buttons
- active navigation
- small highlights
- borders
- ratings
- tags
- icons
- selected states

**No gradients.**

## Glass

Very subtle glass effects are allowed only where useful, such as:

- navbar
- small floating controls
- dialogs/modals

Use:

- very light transparency
- subtle backdrop blur
- thin border

Do not make glass the main visual language.

## Cards

Cards should be:

- compact
- clean
- lightweight
- scannable
- thin bordered
- subtly elevated

Avoid oversized floating-card layouts.

## Buttons

Buttons should have:

- relevant accent
- outlined/secondary variants
- thin borders where useful
- hover states
- focus states
- active/pressed states
- subtle transitions

Do not make every button a giant pill.

## Tags/Badges

Use:

- thin border
- very light tinted background
- small size
- clean typography
- subtle hover states

Avoid rainbow-like badges.

## Animation

Use subtle:

- hover transitions
- border transitions
- card elevation
- button press feedback
- search focus
- dropdown transitions
- modal transitions
- tooltip transitions
- page transitions where appropriate

Animations should be short, smooth, purposeful, and lightweight.

---

# 6. Typography

Use a modern, professional sans-serif typeface.

Avoid:

- decorative fonts
- oversized editorial typography
- excessive font weights

Use clear hierarchy:

`label → heading → description → action`

---

# 7. Multi-Page Website

SMIU Feedback Platform is **not a one-page website**.

It must be a real multi-page application with reusable layouts and reusable feature components.

Public routes should include or support:

```text
/
 /teachers
 /faculty
 /lab-instructors
 /uni-staff
 /hr-staff
 /rankings
 /courses
 /recommendations
 /people/[id]
```

Authentication:

```text
/auth/login
/auth/signup
/auth/verify-email
/auth/callback
```

Student:

```text
/student
/student/teacher-reviews
/student/lab-reviews
/student/faculty-reviews
/student/uni-staff-reviews
/student/hr-staff-reviews
/student/favorites
```

Admin:

```text
/admin
/admin/reviews
/admin/reports
/admin/website-feedback
/admin/notifications
/admin/settings
```

Future Phase 8:

```text
/campus-feedback
/complaints
/harassment-safety
```

Phase 8 pages may initially show an intentional **"feature under development"** experience until the feature is implemented.

---

# 8. Navbar

Navbar branding:

**SMIU Feedback Platform**

Small university text:

**Sindh Madressatul Islam University, Karachi**

Public navigation should remain concise.

Student navigation should expose the authenticated student areas.

Admin navigation must only be visible to admins.

---

# 9. Homepage

The homepage must be:

- simple
- light
- scrollable
- concise
- visually polished

## Hero

Preferred messaging direction:

### Understand Your Learning Experience.

Supporting message:

> Student perspectives on teachers, courses, and academic life — shared respectfully.

Do not use language that implies students control teacher assignment.

Do not use:

> Find the right teacher for your course.

Primary action:

**Search teacher or course**

## Suggested Homepage Sections

Keep the number of sections low.

Possible sections:

- Hero
- Search
- Category shortcuts
- Best Teacher
- Selected profiles
- How SMIU Feedback Platform works
- Privacy
- Student CTA
- Feedback
- Footer

Do not overload the homepage.

---

# 10. Website Open Notification

When the website opens, show an admin-controlled notification explaining:

- what SMIU Feedback Platform is
- why it exists
- who it is for
- how structured feedback works
- respectful use
- privacy

This content must be database-driven.

Admin can:

- create notifications
- edit notifications
- activate/deactivate
- schedule
- set start time
- set end time
- set priority
- create multiple notifications

Do not hardcode production notifications in frontend source code.

---

# 11. Student Account Model

Only verified SMIU students can submit reviews.

## Signup

Student provides:

- Student ID
- Password
- Confirm Password

Student does NOT manually type the university email.

Example:

```text
Student ID:
bit23f011
```

System generates:

```text
bit23f011@stu.smiu.edu.pk
```

Initial domain:

```text
stu.smiu.edu.pk
```

The domain is system-controlled.

Admin may manage the domain later, but it must be locked and protected by server-side authorization.

---

# 12. Student Email Verification

Verification exists specifically to establish that the reviewer has access to the official university student email.

Flow:

```text
Student ID
↓
System generates university email
↓
Create account
↓
Send one verification email
↓
Student enters OTP or uses verification link
↓
Account becomes verified
↓
Review capability unlocks
```

## One-Time Verification Rule

Only one verification email is sent during signup.

There must be:

- no resend button
- no resend endpoint
- no automatic resend
- no second OTP generation from frontend

The verification token/code must be:

- random
- single-use
- time-limited
- server-side validated

## Failed Delivery

If email delivery fails:

- the account may still exist
- the account remains unverified
- the student can log in
- the student can browse
- the student can search
- the student can view profiles
- the student cannot submit reviews
- the student cannot edit reviews

Show:

> Your account is not verified. Please verify your university email.

Do not add a resend button.

---

# 13. Normal Login

OTP is NOT required on every login.

Normal login:

```text
Student ID
+
Password
```

OTP is only for initial account verification.

---

# 14. Review Eligibility

Only:

**OTP-verified SMIU students**

can submit reviews.

No:

- anonymous reviews
- guest reviews
- Gmail-based review verification
- Student-ID-only verification
- alternative verification codes

This decision is final unless explicitly changed by the project owner.

---

# 15. Review Categories

## Teacher Review

### Course Knowledge
1–5 stars

### Teaching Way
1–5 stars

### Nature
1–5 stars

### Strictness
YES / NO

### Communication
1–5 stars

### Grading/Marking
1–5 stars

### Helpfulness / Student Support
1–5 stars

### Overall Rating
1–10

Recommendations:

- Recommend for Freshers? YES / NO
- Recommend for Other Courses? YES / NO

Students may use the full rating range.

Do not restrict ratings to only high values.

---

# 16. Lab Instructor Review

Lab Instructor is a separate role/category.

Lab Instructor has no dependency on Teacher Type.

Default categories are the same as Teacher:

- Course Knowledge
- Teaching Way
- Nature
- Strictness YES/NO
- Communication
- Grading/Marking
- Helpfulness / Student Support
- Overall 1–10
- Recommend for Freshers
- Recommend for Other Courses

---

# 17. Faculty Review

Default categories:

- Academic / Role Knowledge
- Nature / Professional Behavior
- Communication
- Responsiveness
- Helpfulness / Student Support
- Fairness
- Leadership / Administration

All category ratings:

1–5 stars

Overall:

1–10

These criteria must be admin-editable.

---

# 18. University Staff Review

Default categories:

- Nature / Respect
- Communication
- Helpfulness
- Responsiveness
- Professionalism
- Guidance / Process Knowledge

1–5 stars

Overall:

1–10

Admin-editable.

Examples:

- security staff
- peons
- admission office staff
- office/support staff
- other university support staff

---

# 19. HR Staff Review

Default categories:

- Professionalism
- Communication
- Responsiveness
- Helpfulness
- Fairness
- Issue Resolution

1–5 stars

Overall:

1–10

Admin-editable.

---

# 20. Admin-Editable Review Criteria

Admin can:

- create criteria
- edit criteria
- reorder criteria
- activate/deactivate criteria
- configure rating type

Supported types:

- 1–5 stars
- YES/NO
- Overall 1–10

If a criterion has already been used in historical reviews:

**Do not hard-delete it.**

Deactivate/archive it instead.

Historical reviews must remain interpretable.

---

# 21. Optional Text Review

A verified student may submit:

### Option A
Ratings only

### Option B
Ratings + optional text

Text is optional.

UI:

> Optional — share your experience (max 150 words)

Maximum:

**150 words**

Use a live counter:

```text
0 / 150 words
```

Enforce the limit:

- client-side
- server-side

Text must be:

- plain text
- no HTML
- no rich text
- safely rendered
- treated as untrusted input

Prevent XSS and unsafe content injection.

---

# 22. Text Moderation

Structured ratings and written text are separate concerns.

A verified student may submit valid ratings without writing text.

If text is included:

```text
moderation_status = pending
```

The written review must NOT appear publicly until admin approval.

Admin actions:

- Approve
- Reject
- Hide
- Feature
- Unfeature

Only approved text becomes publicly visible.

Moderation actions must be audit logged.

---

# 23. 200+ Text Reviews

Never display hundreds of text reviews simultaneously.

For a public person profile:

### Featured Reviews

Show only approximately:

**3–5 approved featured reviews**

Then:

**View All Reviews**

All approved text reviews must use:

- server-side pagination
- approximately 10–20 reviews per page
- lazy loading only where beneficial

Filters may include:

- course
- semester
- relevant category

Sorting may include:

- newest
- oldest

Never fetch all 200+ review texts into the browser.

Keep profile pages lightweight.

---

# 24. Featured Reviews

Only approved text reviews may be featured.

Admin can:

- feature
- unfeature

Featured review count should remain limited.

---

# 25. Review Uniqueness

For Teacher and Lab Instructor reviews:

One student may submit only one review for:

```text
Student
+
Person
+
Course
+
Semester
```

Example:

```text
Ali
Ameen Ahmed
DBMS
Fall 2026
```

= one review

The same student may review the same person/course again in another semester.

Example:

```text
Ali
Ameen Ahmed
DBMS
Spring 2027
```

= allowed

This rule MUST be enforced by the database.

Do not rely only on frontend validation.

For non-course roles such as Uni Staff / HR Staff, use an appropriate student + person + category + review-period uniqueness rule.

---

# 26. Review Edit Limit

Each submitted review receives:

**2 edit attempts**

Flow:

```text
First submission:
2 edits remaining

First edit:
1 remaining

Second edit:
0 remaining

Then:
LOCKED
```

After the second edit, the review cannot be edited again.

The frontend must never be trusted with:

- edit count
- lock state
- review ownership

Enforce on server/database.

---

# 27. Public Person/Profile System

## Core Rule

**ONE PERSON = ONE PUBLIC PROFILE**

Example:

```text
Ameen Ahmed
Teacher
Faculty
Internal
HOD
Computer Science
```

Still one public person record.

Teacher reviews can contribute to Teacher rankings.

Faculty reviews can contribute to Faculty rankings.

No duplicate person profile.

---

# 28. Add Person Flow

Before allowing a new person to be created:

**Search existing profiles first.**

If a probable match exists:

- show existing profile
- encourage using the existing profile
- avoid creating a duplicate

Student can add a new person only when an appropriate existing profile was not found.

---

# 29. Teacher Add Form

Required information:

- Teacher Name
- Teacher Department
- Course
- Semester(s) in which student studied the course
- Gender

Gender:

- Male
- Female

Default avatar:

```text
Male → Male avatar
Female → Female avatar
```

No user-uploaded avatar is required in MVP.

---

# 30. Teacher Type

Teacher Type:

- Internal
- External
- Corporate

If:

**Internal**

then:

- automatically associate the person with Faculty
- show Position
- require Department

---

# 31. Final Approved Positions

Do NOT use the previously generated extra position list.

The following values are explicitly unwanted and must not appear anywhere:

- IT Support Officer
- Lab Engineer
- HR Manager
- Account Officer
- Senior Lecturer
- Chairperson
- Deputy Registrar
- HR Assistant
- Librarian
- Teaching Assistant
- Examination Officer
- Lecturer
- Registrar
- HR Officer
- Assistant Professor

Approved predefined examples:

- HOD
- Coordinator
- Dean
- Associate Professor
- Professor
- Other

Do not invent additional predefined positions.

`Other` can be used for positions not included in the predefined list.

These position values must be removed from:

- UI
- dropdowns
- filters
- seed data
- production reference data
- development seed
- hardcoded arrays
- constants
- API responses
- database selectable reference records

If unwanted values already exist in the database, remove/deactivate them safely without breaking valid foreign keys.

Also fix the source migrations/seeds so they do not come back in a fresh database.

---

# 32. Lab Instructor Add Flow

Lab Instructor is separate.

If the student chooses:

**Lab Instructor**

the person is assigned to:

**Lab Instructor**

Do not force Teacher Type.

---

# 33. Departments, Programs, Courses and Semesters

The platform must support:

- Universities
- Departments
- Programs
- Courses
- Semesters
- Course offerings

Initial university:

SMIU

Do not invent real SMIU teacher/course/staff data.

Reference data must be admin-manageable.

Semester format:

- Fall 2026
- Spring 2027
- Summer 2027

---

# 34. Public Search

Public users can search by:

### Person/Teacher Name

or

### Course

Course search example:

```text
Database Systems
```

Results:

- Teacher A
- Teacher B
- Teacher C

Clicking opens the public person profile.

Search must be:

- case-insensitive
- partial-match friendly
- indexed
- paginated
- safe from SQL injection

---

# 35. Filters

Public filters:

- category
- department
- course
- semester
- rating
- teacher type

Category:

- Teacher
- Lab Instructor
- Faculty
- Uni Staff
- HR Staff

Teacher Type:

- Internal
- External
- Corporate

Arbitrary client-supplied ordering/filter fields must not be trusted.

---

# 36. Student Review Tabs

Student dashboard contains separate sections:

- Teacher Review
- Lab Instructor Review
- Faculty Review
- Uni Staff Review
- HR Staff Review

Each review flow should encourage searching existing profiles before adding a new person.

---

# 37. Aggregated Ratings

Reviews contribute to aggregates.

Public profile can show:

- overall rating
- total review count
- category averages
- recommendation percentages
- course-wise ratings
- semester-wise ratings

Strictness:

```text
YES %
NO %
```

Written review moderation must not cause rating logic to break.

---

# 38. Course-Wise Ratings

A teacher may teach many courses.

Example:

- DBMS
- OS
- SE

Each course can have:

- review count
- course overall rating
- category ratings where enough data exists

---

# 39. Semester-Wise Ratings

Support:

- Fall
- Spring
- Summer

plus year.

Allow public semester-level aggregates where privacy thresholds are satisfied.

---

# 40. Rankings

Automatically generate:

- Best Teacher in University
- Best Teacher by Department
- Best Teacher by Course
- Best Teacher by Semester
- Best Faculty
- Best Lab Instructor
- Best University Staff
- Best HR Staff

Default ranking eligibility threshold:

**5 verified reviews**

Admin may configure the threshold.

The ranking logic must be deterministic and transparent.

Most Reviewed and Trending are separate concepts from Best ranking.

---

# 41. Most Reviewed

Separate public section:

**Most Reviewed**

Use valid review count.

---

# 42. Trending

Separate public section:

**Trending**

Use recent valid review activity while applying anti-abuse controls.

---

# 43. Teacher Comparison

Allow users to compare teachers.

Compare:

- Overall Rating
- Course Knowledge
- Teaching Way
- Nature
- Strictness
- Communication
- Grading/Marking
- Helpfulness / Student Support
- Review Count
- Freshers Recommendation
- Other Course Recommendation

Keep the comparison responsive and concise.

---

# 44. Recommendation System

Students may ask SMIU Feedback Platform for recommendations.

Inputs:

- Course
- Department
- Program
- Semester
- Section

Recommendation logic can use:

- course match
- department match
- program match
- semester relevance
- section relevance where available
- overall rating
- category ratings
- verified review count
- relevant recent review activity

Show:

- recommended teacher
- rating
- review count
- key strengths
- why the teacher was suggested

Use a deterministic scoring model.

Do NOT add an LLM/AI API unless explicitly requested later.

---

# 45. Favorites

Authenticated students can:

- favorite profiles
- unfavorite profiles
- view favorites

Favorites are private.

---

# 46. Recently Viewed

Authenticated students may see recently viewed profiles.

Keep the information private.

Do not store unnecessary PII in localStorage.

---

# 47. Account Deletion

A student can delete their account.

Personal information should be deleted/anonymized appropriately.

BUT:

**Historical reviews must remain.**

Reviews must continue contributing to:

- aggregates
- review counts
- rankings

Do not allow account deletion to cascade-delete historical reviews.

---

# 48. Privacy

Never publicly display:

- student name
- Student ID
- student email
- password
- auth tokens
- session tokens
- auth user IDs

Public text reviews remain anonymous.

Student Department / Program / Section must not be exposed in a way that identifies an individual reviewer.

Avoid re-identification from small aggregate groups.

---

# 49. Admin Panel

Admin sections should include:

- Dashboard
- People
- Teachers
- Faculty
- Lab Instructors
- University Staff
- HR Staff
- Reviews
- Reports
- Website Feedback
- Notifications
- Feature Controls
- Review Criteria
- Rankings
- Departments
- Programs
- Courses
- Semesters
- Positions
- Students
- Audit Logs
- Security
- Site Settings

---

# 50. Admin Authorization

Student users must never become admins by:

- changing frontend state
- changing localStorage
- editing request payloads
- editing URLs
- changing role fields
- changing JWT/session data

Admin access must be enforced:

- server-side
- route-level
- database/RLS level where appropriate

Never rely on hiding admin buttons.

---

# 51. Report System

Users can report a person/profile.

Possible reasons:

- Duplicate Profile
- Wrong Information
- Incorrect Profile
- Other

Report flow:

```text
User submits report
↓
Pending
↓
Admin reviews
↓
Accept / Reject
```

A report MUST NOT automatically delete a person.

If accepted, admin must explicitly confirm deletion/deactivation.

Rejecting a report leaves the profile active.

Every report decision must be audit logged.

---

# 52. Duplicate Profile Merge

Admin can merge duplicates.

Merge must:

- choose canonical person
- preserve roles
- preserve courses
- preserve assignments
- preserve reviews
- preserve audit history
- recalculate aggregates safely
- prevent double counting

---

# 53. Review Reset

Admin may reset a person's public review aggregate.

This action must:

- be admin-only
- require explicit confirmation
- require a reason
- be audit logged

Prefer archival/deactivation of review data instead of silent destructive deletion.

After reset:

```text
0 reviews
0 aggregate rating
```

until new eligible reviews are added.

---

# 54. Admin Notifications

Admin can create multiple notifications.

Each notification can include:

- title
- message
- priority
- audience
- active/inactive
- start datetime
- end datetime

The system automatically activates/deactivates according to the schedule.

No source-code changes should be required to manage live notifications.

---

# 55. Feature Controls

Admin controls:

### Student Signup
ON / OFF

### Review Submission
ON / OFF

### Review Editing
ON / OFF

### Student Email Domain Lock
LOCKED / UNLOCKED

Controls may be:

- manually changed
- scheduled

Server-side time is authoritative.

If signup is locked:

- new accounts are blocked
- existing students can still login
- public profiles remain visible
- reviews remain visible

If review submission is locked:

- students can login
- students can browse
- students can search
- students cannot submit new reviews

If review editing is locked:

- existing reviews cannot be edited

All restrictions must be enforced server-side.

---

# 56. Website Feedback

SMIU Feedback Platform must include a completely separate **Website Feedback** system.

This is feedback about:

**SMIU Feedback Platform itself**

It is NOT the same as:

- teacher reports
- teacher reviews
- campus complaints
- harassment reports

Public entry:

**Feedback**

or:

**Feedback & Suggestions**

Keep it subtle.

---

# 57. Website Feedback Form

Both:

- public visitors
- logged-in students

can submit website feedback.

Fields:

### Feedback Type

- Website Feedback
- Suggest an Update
- Report a Bug
- Report an Issue
- Other

### Experience Rating

1–5 stars

### Message

Required.

Plain text.

Reasonable configurable maximum length.

### Contact Email

Optional.

If provided, use only for possible follow-up.

---

# 58. Website Feedback Admin

Admin section:

**Admin → Website Feedback**

Statuses:

- New
- Reviewing
- Resolved
- Archived

Admin can:

- read
- search
- filter
- paginate
- mark important
- change status
- archive

Keep feedback private.

Do not show it publicly by default.

---

# 59. Website Feedback Privacy

Never publicly expose:

- Student ID
- student email
- auth user ID
- contact email

Website feedback must NEVER affect:

- teacher ratings
- teacher rankings
- faculty ratings
- lab instructor ratings
- university staff ratings
- HR ratings

It is a completely separate dataset.

---

# 60. Phase 8 — Campus Management Feedback

Planned future phase:

**Phase 8 — Campus Management Feedback + Complaints + Harassment & Safety**

This phase is not part of the current MVP implementation unless explicitly started.

## Campus Management Feedback

Admin creates management feedback cards.

Examples:

- Campus Cleanliness
- Parking Facilities
- University Entrance / Gate
- Drinking Water
- Cafeteria
- Admission Office Waiting Area
- Other campus facilities

Student logs in and gives a rating.

The rating appears publicly as an aggregate.

Example:

```text
Campus Cleanliness
7.8 / 10
342 student responses
```

Admin can:

- create
- edit
- activate/deactivate
- reorder
- archive/delete safely
- configure rating scale

These management feedback cards are separate from teacher/person review systems.

---

# 61. Phase 8 — Complaint System

Planned structure:

```text
Complain
|
├── IT Tower
│   ├── IT Library (1st Floor)
│   ├── 2nd Floor
│   │   ├── IT Lab 201
│   │   ├── IT Lab 202
│   │   ├── IT Lab 203
│   │   ├── IT Lab 204
│   │   ├── IT Lab 205
│   │   └── Washroom
│   ├── 3rd Floor
│   │   ├── IT 301
│   │   ├── IT 302
│   │   ├── IT 303
│   │   ├── IT 304
│   │   ├── IT 305
│   │   └── Washroom
│   ├── 4th Floor
│   ├── 5th Floor
│   └── 6th Floor
│
├── Talpur House
│   ├── Ground Floor
│   │   ├── Room 101
│   │   ├── Room 102
│   │   ├── Room 103
│   │   ├── Room 104
│   │   ├── Room 105
│   │   └── Washroom
│   ├── 1st Floor
│   └── 2nd Floor
│
├── Main Building
│   └── Ground Floor
│       ├── Male Washroom
│       └── Female Washroom
│
├── School Building
│   ├── Ground Floor
│   ├── 1st Floor
│   ├── 2nd Floor
│   ├── 3rd Floor
│   └── 4th Floor
│
├── IT Library
├── Hassan Al Afandi Library
├── Parking Area
└── Any Other
```

The actual production structure must be fully admin-configurable.

Admin can:

- create location
- edit location
- delete/archive location
- add child location
- move location
- reorder location
- rename location

Use a hierarchical location model rather than hardcoding this tree.

---

# 62. Complaint Categories

Examples:

- AC
- Projector
- Class Capacity
- Seats
- Fan
- Light
- PC
- Keyboard
- Mouse
- Internet
- Washroom
- Drinking Water
- Parking
- Cafeteria
- Waiting Area
- Admission Office
- Other

These categories must be admin-editable.

Do not hardcode production categories.

---

# 63. Complaint Workflow

Planned workflow:

```text
Submitted
↓
Reviewing
↓
In Progress
↓
Resolved
↓
Closed
```

Phase 8 may later include:

- descriptions
- optional evidence
- admin notes
- resolution notes
- notifications

Use secure authorization and privacy protections.

---

# 64. Phase 8 — Harassment & Safety

Harassment/Safety must be a separate confidential system.

It must NOT be treated as normal website feedback.

It must NOT be treated as a public teacher review.

It must NOT expose individual cases publicly.

Potential future flow:

```text
Verified Student
↓
Confidential Report
↓
Authorized Admin/Case Handler
↓
Investigation / Review
↓
Case Resolution
```

This feature requires stronger privacy and access controls than ordinary complaints.

---

# 65. Technology Stack

## Frontend

- Next.js 14+
- App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide React
- Framer Motion

## Forms and Validation

- React Hook Form
- Zod

## Server State

- TanStack Query where appropriate

## Backend

- Next.js Route Handlers
- Server Actions where appropriate
- Supabase Edge Functions where necessary

## Database

- Supabase PostgreSQL

## Authentication

- Supabase Auth

## Database Security

- PostgreSQL Row Level Security (RLS)

## Email

- Brevo SMTP for transactional/verification delivery

The exact production sender identity/domain is a separate deployment concern and must NOT be hardcoded before it is finalized.

## Bot Protection

- Cloudflare Turnstile

## Edge / DNS / Protection

- Cloudflare

## Hosting

- Vercel

## Testing

- Vitest
- Playwright

## Security

- Gitleaks or equivalent secret scanning
- dependency audit
- appropriate static analysis
- manual attacker-style security testing

## Code Quality

- ESLint
- Prettier
- TypeScript strict mode

---

# 66. Supabase Architecture

Use:

- Supabase PostgreSQL
- Supabase Auth
- RLS
- Edge Functions where required

Every exposed table must have appropriate RLS.

The client must not have direct unrestricted write access to sensitive tables.

Public data should be exposed through safe:

- SELECT policies
- views
- functions
- server-side routes

where appropriate.

Service role credentials are server-only.

---

# 67. Database Foundation

Current / planned high-level entities:

```text
universities
students
people
person_roles
departments
programs
courses
semesters
course_offerings
teacher_assignments
positions
review_categories
review_criteria
reviews
review_values
review_recommendations
review_moderation
reports
favorites
notifications
feature_controls
website_feedback
audit_logs
```

Phase 8 may add:

```text
management_feedback
management_feedback_ratings
campus_locations
complaint_categories
complaints
harassment_cases
```

Use:

- foreign keys
- indexes
- constraints
- timestamps
- soft-delete/archive where appropriate
- stable IDs

Database migrations are the schema source of truth.

---

# 68. Supabase RLS Principle

Core security principle:

> **Backend/database is always the final authority.**

Frontend is not trusted.

RLS must prevent unauthorized access.

Examples:

A student must not be able to modify another student's review.

A student must not be able to change their role to admin.

A student must not be able to mark a review approved.

A student must not be able to bypass review locks.

A student must not be able to alter review ownership.

---

# 69. Authentication Security

Use server-side authorization for:

- admin routes
- review operations
- profile operations
- reports
- moderation
- notifications
- feature controls
- review criteria
- website feedback admin
- account deletion

Prefer `getUser()` over trusting `getSession()` for authorization checks.

Use safe redirects.

Do not allow open redirects.

---

# 70. DevTools Security

Users can open browser DevTools.

They may change:

- buttons
- React state
- localStorage
- request payloads
- query parameters
- IDs

None of this must bypass security.

Examples:

### Review Lock = ON

Direct API request must fail.

### Signup Lock = ON

Direct signup request must fail.

### Change `is_admin=true`

User remains a student.

### Change `is_verified=true`

User remains unverified.

### Change `edit_count`

User does not gain additional edit permissions.

### Change `moderation_status=approved`

Review remains pending unless an authorized admin approves it.

### Change `featured=true`

Review does not become featured.

---

# 71. Input Security

Validate every input server-side.

Use:

**Zod**

Protect against:

- SQL injection
- XSS
- parameter tampering
- malformed JSON
- mass assignment
- unsafe redirects
- excessive payloads

Never render user text as HTML unless a strong sanitization strategy is explicitly implemented.

Prefer plain text.

---

# 72. Rate Limiting

Rate-limit at minimum:

- signup
- login
- verification
- password reset
- review submission
- review editing
- profile reports
- website feedback
- expensive public search operations
- admin-sensitive actions

Protect against:

- brute-force attempts
- mass account creation
- OTP abuse
- review flooding
- report spam
- feedback spam

---

# 73. Cloudflare

Cloudflare may provide:

- DNS
- SSL/TLS
- CDN
- DDoS protection
- Turnstile
- additional edge security

Turnstile may be used where abuse risk justifies it.

Do not rely on CAPTCHA alone.

---

# 74. Security Headers

Use appropriate production security headers including:

- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Strict-Transport-Security
- Content-Security-Policy
- Referrer-Policy
- Permissions-Policy

Use a restrictive CSP.

Avoid unsafe policies unless technically required and documented.

---

# 75. CORS

If CORS is required:

Do not use:

```text
*
```

unless genuinely necessary.

Restrict to configured frontend origins.

---

# 76. Secrets

Never hardcode:

- Supabase service role key
- database passwords
- Brevo credentials
- Cloudflare Turnstile secret
- Sentry secrets
- JWT secrets
- API keys

Use environment variables.

Create:

```text
.env.example
```

with placeholders only.

Real secrets must never be committed to source control.

Do not print secrets to logs.

Do not include secrets in comments.

---

# 77. Frontend Environment Variables

Be careful with public environment prefixes.

Sensitive secrets must never use:

```text
NEXT_PUBLIC_
```

unless the value is explicitly intended to be public.

The Supabase public/anon key can be client-visible only with appropriate RLS protection.

Never expose the Supabase service role key.

---

# 78. Logging

Production logs must not contain:

- passwords
- OTP codes
- auth tokens
- session tokens
- secret keys
- unnecessary Student IDs
- unnecessary student email addresses
- private review ownership details

Remove debug `console.log`.

Use redaction when necessary.

---

# 79. Error Handling

Never return:

- stack traces
- SQL statements
- DB internals
- server file paths
- secret values
- internal implementation details

Use safe public error messages.

Use correlation/request IDs where useful.

---

# 80. No Arbitrary User File Uploads in MVP

Do not implement arbitrary user uploads in MVP.

This applies especially to profile avatars.

Gender controls the default avatar:

- Male → male avatar
- Female → female avatar

Future complaint/harassment evidence uploads require a separate security/privacy design.

---

# 81. Privacy Model

Separate authentication/student identity from public review information.

Public APIs should return only public-safe fields.

Do not expose:

- auth identifiers
- Student IDs
- student emails
- review owner IDs
- private student context

Keep private data in protected structures.

---

# 82. Account Deletion + Review Retention

When a student deletes their account:

Personal data:
- delete/anonymize as appropriate

Historical reviews:
- KEEP

Historical reviews remain useful for:

- aggregates
- rankings
- review counts

Publicly, those reviews remain anonymous.

---

# 83. SEO

Public pages should support:

- title
- description
- canonical URLs
- Open Graph
- sitemap
- robots

Do not put student/private information in metadata.

Public person profiles may be indexable where appropriate.

---

# 84. Performance

Public pages must be lightweight.

Use:

- database indexes
- pagination
- efficient queries
- server-side aggregation where beneficial
- caching where appropriate
- lazy loading where appropriate

Avoid:

- loading all reviews
- loading all people at once
- N+1 queries
- huge client bundles

---

# 85. Accessibility

Support:

- keyboard navigation
- visible focus states
- semantic HTML
- proper labels
- accessible dialogs
- accessible forms
- readable contrast
- reduced motion

---

# 86. Responsive Design

Support:

- mobile
- tablet
- desktop

Do not merely shrink desktop UI.

Build responsive layouts intentionally.

---

# 87. Code Comments

All code comments must use:

**Roman Urdu + simple English technical words**

Examples:

```ts
// Student ki email system khud generate karega
// User sirf Student ID enter karega

// OTP single-use hai
// Verify hone ke baad dobara use nahi ho sakta

// Review lock ON hai
// Backend request ko bhi reject karega

// Text optional hai
// Student ratings bina text ke bhi submit kar sakta hai
```

Rules:

- Roman Urdu only
- simple English tech words are allowed
- do not use Urdu script
- do not write long academic English comments

Code identifiers remain standard English.

---

# 88. Code Quality

Use:

- strict TypeScript
- reusable components
- reusable validation schemas
- reusable security helpers
- feature-based architecture
- clear naming
- typed database access
- small manageable components

Avoid:

- unnecessary `any`
- giant components
- duplicated logic
- hardcoded business rules
- fake production APIs
- fake success states
- frontend-only security

---

# 89. Suggested Project Structure

```text
src/
  app/
  components/
  features/
    auth/
    people/
    teachers/
    faculty/
    lab-instructors/
    uni-staff/
    hr-staff/
    reviews/
    search/
    rankings/
    recommendations/
    admin/
    feedback/
  lib/
    supabase/
    security/
    validation/
    utils/
  types/

supabase/
  migrations/
  seed/

docs/
```

Actual structure may evolve when there is a justified reason.

---

# 90. Seed Policy

## Production Seed

Production seed may contain only legitimate reference/bootstrap data such as:

- initial SMIU university
- approved positions
- semester/reference records
- safe configuration defaults

## Development Seed

Development/demo seed must be clearly separated.

Do not put sample teacher/student/review data into production.

Do not invent real SMIU people.

---

# 91. Database Migration Rules

All schema changes must be represented by migrations.

Use timestamp-ordered migration filenames.

Example:

```text
supabase/
  migrations/
    20260919090000_reference_schema.sql
    20260919090100_rls_policies.sql
    20260919090200_seed_production.sql
```

Never rely on undocumented manual production schema edits.

If a migration is wrong:

- create a safe corrective migration where appropriate
- preserve data
- avoid destructive changes without explicit reason

---

# 92. Current Phase Development Rules

The project is divided into phases.

Do not rebuild previous phases.

Do not delete working functionality just because a new phase starts.

Use the current codebase as the base for the next phase.

---

# 93. Phase 1 — Foundation + UI/UX

Build:

- Next.js foundation
- TypeScript strict
- Tailwind
- shadcn/ui
- Lucide
- Framer Motion
- SMIU Feedback Platform branding
- SMIU Feedback Platform +/- animation
- Aura loader
- navbar
- footer
- SMIU display
- homepage
- public layout
- student layout foundation
- admin layout foundation
- responsive system
- accessibility foundation
- loading states
- error states
- empty states
- Supabase foundation
- reference database foundation
- multi-page routing structure

Final UI must follow the approved minimalist SaaS direction.

---

# 94. Phase 2 — Authentication + Verification + Privacy

Build:

- student signup
- Student ID
- automatic SMIU student email
- one-time OTP
- no resend
- email verification
- normal login
- logout
- forgot password
- unverified state
- signup lock
- review lock foundation
- review edit lock foundation
- privacy notification
- account deletion
- Supabase Auth
- server-side authorization
- RLS
- rate limiting
- Brevo SMTP
- appropriate Cloudflare Turnstile
- safe logging
- safe errors

Only verified students can review.

---

# 95. Phase 3 — People + Profiles + Reviews

Build:

- people
- roles
- Teacher
- Lab Instructor
- Faculty
- Uni Staff
- HR Staff
- Teacher Type
- Internal → Faculty association
- Position
- Department
- Course
- Semester
- Gender
- Default avatars
- profile cards
- duplicate prevention
- Teacher reviews
- Lab Instructor reviews
- Faculty reviews
- Uni Staff reviews
- HR Staff reviews
- category ratings
- overall ratings
- recommendation responses
- optional 150-word text
- review moderation
- 2-edit limit
- review uniqueness

---

# 96. Phase 4 — Search + Filters + Rankings + Recommendations

Build:

- teacher search
- course search
- filters
- profile aggregation
- course-wise ratings
- semester-wise ratings
- rankings
- Best Teacher
- Best Faculty
- Best Lab Instructor
- Best Uni Staff
- Best HR Staff
- Most Reviewed
- Trending
- comparison
- favorites
- recently viewed
- deterministic recommendation system

---

# 97. Phase 5 — Admin + Moderation + Notifications

Build:

- admin dashboard
- profile management
- report system
- report accept/reject
- profile delete/deactivate
- duplicate merge
- review reset
- review moderation
- featured reviews
- website feedback admin
- notification manager
- feature controls
- scheduled locks
- review criteria editor
- ranking settings
- reference-data management
- audit logs

---

# 98. Phase 6 — Security Hardening + Full Testing

Perform:

1. Secret Leak Prevention
2. Personal Data Flow Audit
3. Pre-Deploy Production Audit
4. Deep Authentication / Logic Audit
5. Attacker Perspective Review

Security testing includes:

- IDOR
- XSS
- SQL injection
- auth bypass
- role escalation
- request tampering
- DevTools tampering
- signup lock bypass
- review lock bypass
- review edit-limit bypass
- duplicate review bypass
- moderation bypass
- admin bypass
- exposed `.env`
- exposed `.git`
- debug endpoints
- unsafe errors
- rate-limit issues
- CORS issues
- RLS weaknesses

Run:

- Vitest
- Playwright
- TypeScript
- ESLint
- production build
- dependency audit
- secret scanning

Fix issues and retest.

Do not claim "100% secure".

Document what was checked and what was fixed.

---

# 99. Phase 7 — Production Preparation + Deployment

Prepare:

- production environment
- Vercel
- Supabase production project
- Brevo SMTP
- Cloudflare
- Turnstile
- environment variables
- security headers
- CSP
- SEO
- performance
- accessibility
- mobile
- logging
- error handling
- privacy
- final admin controls

Create/update:

```text
README.md
SECURITY.md
PRIVACY.md
```

Production must contain no real secrets.

---

# 100. Phase 8 — Campus Management + Complaints + Harassment

This is a future phase.

Do not automatically implement it unless Phase 8 is explicitly started.

Includes:

### A. University Management Feedback
Admin-created public rating cards.

### B. Complaint System
Admin-configurable hierarchical locations and categories.

### C. Harassment & Safety
Confidential verified-student reporting system with restricted access.

Until implemented, public pages should show an intentional "Feature in development" state rather than a broken or empty page.

---

# 101. Security Audit Source

The project security workflow is based on five major checks:

1. Secret Leak Prevention
2. Personal Data Flow Audit
3. Pre-Deploy Production Audit
4. Deep Security Audit for Complex Logic
5. Attacker's Perspective Review

The security workflow must check both code-level and business-logic-level weaknesses.

AI-assisted security review is valuable, but it is not a substitute for professional penetration testing when the platform becomes high-risk or high-scale.

---

# 102. Required Security Acceptance Tests

At minimum verify:

1. Unverified student cannot review.
2. Verified student can review.
3. Review lock blocks new review submission.
4. Review edit lock blocks editing.
5. Signup lock blocks new account creation.
6. Existing students can login during signup lock.
7. Student cannot edit another student's review.
8. Student cannot increase edit count.
9. Duplicate same-context review is blocked.
10. Same course next semester is allowed.
11. Student cannot become admin.
12. Student cannot access admin endpoints.
13. Student cannot change verification status.
14. Account deletion preserves reviews.
15. Report does not auto-delete profiles.
16. Rejected report leaves profile active.
17. Accepted report still requires explicit admin action.
18. Internal Teacher is associated with Faculty without duplicate person records.
19. Duplicate merge does not double-count reviews.
20. Public APIs do not expose Student ID/email.
21. Review reset requires admin authorization.
22. Notifications respect schedule.
23. Signup lock schedule works.
24. Review lock schedule works.
25. Review edit count cannot be manipulated client-side.
26. Review moderation status cannot be manipulated client-side.
27. Featured status cannot be manipulated client-side.
28. Website feedback admin statuses cannot be changed by public users.
29. DevTools changes cannot bypass permissions.

---

# 103. Admin Audit Logging

Audit sensitive admin actions such as:

- profile deletion/deactivation
- profile merge
- review reset
- review moderation
- report decisions
- notification publishing
- feature lock changes
- email-domain changes
- criteria changes
- ranking settings
- reference-data changes
- account-management actions

Do not log secrets.

---

# 104. Final Product Principles

SMIU Feedback Platform should always prioritize:

### Respect
Use neutral and respectful wording.

### Privacy
Do not expose student identities.

### Authenticity
Only verified students can submit reviews.

### Data Integrity
Prevent duplicate people and duplicate review abuse.

### Security
Backend/database is the authority.

### Simplicity
Keep the UI visually lightweight.

### Transparency
Use clear, understandable aggregate ratings and deterministic rules.

### Moderation
Written reviews are approved before public display.

### Scalability
Use normalized database design and admin-configurable reference data.

---

# 105. Important Non-Goals

Do not introduce these unless explicitly requested:

- anonymous reviews
- guest reviews
- Gmail-based student verification
- AI-generated teacher rankings
- LLM recommendation logic
- arbitrary profile image uploads
- public comments section
- public reviewer identities
- fake production teacher/student data
- unnecessary payment features
- unnecessary social media features

---

# 106. Git Policy

Do not automatically perform Git operations unless explicitly requested by the project owner.

The project owner will handle GitHub operations manually.

Do not:

- force push
- reset repository history
- delete branches
- overwrite remote history

When asked for progress, report the current implementation state without automatically committing or pushing.

---

# 107. Development Continuation Checklist

Before continuing work in a new Claude session:

```text
1. Read README.md
2. Inspect current files
3. Inspect package.json
4. Inspect current routes
5. Inspect supabase/migrations
6. Inspect docs
7. Check current phase state
8. Run relevant typecheck/lint/build when appropriate
9. Identify incomplete/broken items
10. Continue from existing work
```

Never assume the project is empty.

---

# 108. Current Known Development Rules

If the codebase contains unfinished build issues or non-blocking warnings:

- document them
- do not silently ignore them
- do not introduce new errors
- fix them before final production deployment

Known build issue may include metadata/image-generation routes such as:

- `/apple-icon`
- `/twitter-image`

if they fail during production prerendering.

These must be resolved before Phase 7 production readiness.

---

# 109. Production Acceptance Criteria

SMIU Feedback Platform is ready for production only when:

- public pages work
- multi-page navigation works
- responsive UI works
- SMIU Feedback Platform branding works
- loader works
- Student signup works
- SMIU student email is generated automatically
- one-time verification works
- no resend exists
- normal login does not require OTP
- unverified students cannot review
- verified students can review
- optional 150-word text review works
- moderation works
- public review pagination works
- Teacher reviews work
- Lab Instructor reviews work
- Faculty reviews work
- Uni Staff reviews work
- HR Staff reviews work
- one-person/multiple-role architecture works
- no duplicate person profiles
- duplicate merge works
- review uniqueness works
- 2-edit limit works
- account deletion preserves reviews
- search works
- course search works
- rankings work
- recommendations work
- comparison works
- favorites work
- reports work
- notifications work
- website feedback works
- admin permissions work
- feature locks work
- RLS works
- secrets are protected
- rate limiting works
- security headers work
- DevTools cannot bypass permissions
- production build succeeds
- accessibility is implemented
- privacy behavior is verified

---

# 110. Final Rule for Claude

**Never restart SMIU Feedback Platform from scratch unless the project owner explicitly instructs you to rebuild it.**

Whenever you are given a task:

> **Read this README first, inspect the existing implementation, identify the current phase/state, and CONTINUE from the current project.**

Do not replace working features just because a new conversation started.

Do not reinterpret finalized requirements without explicit instruction.

When a requirement changes, update this PRD/source of truth and then implement the change in the current codebase.

The goal is a real, maintainable, secure, respectful, production-ready SMIU Feedback Platform — not a one-shot demo.

---

# 111. CURRENT DEVELOPMENT STATUS

**Current active phase: Phase 3**

Phase 1 foundation and the Phase 2 authentication foundation already exist in the current codebase. Before continuing deeper into Phase 3, the current UI must be finalized according to the project owner's latest approved design requirements.

**Temporary rule:** Phase 3 review implementation is paused only for the UI finalization pass described below. Once the UI pass, copy cleanup, and database user-facing language cleanup are complete and verified, Claude must continue Phase 3 automatically from the current codebase. Do not restart the project.

---

# 112. PHASE 3 UI FINALIZATION DIRECTIVE

This section is the current implementation directive and takes precedence over older conflicting UI details.

## A. Official SMIU Feedback Platform Logo

Use the official SMIU Feedback Platform logo asset supplied by the project owner.

Do NOT keep the current plain-text/logo approximation if the official logo asset is available.

The navbar brand must use the official logo.

Animate the logo itself according to its visual geometry and brand shape. The motion must feel intentional and professionally designed, not like a generic text animation.

The animation should:

- be subtle
- follow the logo's shape and visual balance
- use professional motion timing/easing
- avoid excessive movement
- work on desktop and mobile
- support reduced motion

The SMIU Feedback Platform brand identity also includes the subtle `SMIU Feedback Platform-` and `SMIU Feedback Platform+` state changes where appropriate.

## B. Navbar

Replace the full university name in the navbar with:

**SMIU Feedback Platform**

Keep the navbar compact.

### Browse dropdown

The Browse navigation item must:

- open automatically on hover on devices that support hover
- close when the pointer leaves the menu area
- close when focus leaves the menu
- support keyboard navigation
- behave sensibly on touch/mobile

Inside Browse, show only the navigation options.

Do NOT place long descriptions explaining what each category means inside the dropdown.

### Sign In button

Keep the current background treatment if it fits the approved theme.

Add a visible theme-related border.

On hover, create a refined border motion effect where the border appears to travel/reverse around the button from opposite sides.

The effect must be subtle and professional, not flashy.

### Other navbar tabs

On hover, show a simple underline from the bottom.

Use the SMIU Feedback Platform accent color.

Do not add excessive glow, scale, or movement.

---

# 113. BODY SPACING

Reduce the excessive empty vertical space directly below the navbar.

The first meaningful content should appear sooner.

Do not compress the page so much that it feels crowded.

Maintain a clean, intentional rhythm.

---

# 114. FAVICON

Update the favicon/app icon to use the official SMIU Feedback Platform logo/mark.

Do not use the temporary/default icon.

Create appropriate favicon sizes and metadata for modern browsers/devices.

---

# 115. LIGHT / DARK / SYSTEM THEME

Add a theme switcher supporting:

- Light
- Dark
- System

The switcher must be accessible from an appropriate global location such as the navbar/settings.

Light theme remains the primary visual direction:

- white/light surfaces
- very light accent tints
- limited accent colors
- no gradients

Dark theme must remain polished and restrained.

Do not make the dark theme neon, glowing, or visually heavy.

System mode should follow the user's operating-system preference.

Persist the user's theme selection appropriately.

Respect reduced motion and accessibility settings.

---

# 116. SEARCH FILTER CONTROLS

The current Teacher / Course filter controls above the search input have insufficiently visible borders.

Fix them with:

- clear thin border
- appropriate light/dark theme contrast
- hover state
- active/selected state
- focus state

Do not use bright default browser blue outlines.

Use the SMIU Feedback Platform focus treatment instead.

---

# 117. SEARCH INPUT FOCUS

Remove the unattractive browser-style blue line/outline appearing when the search field is clicked.

Replace it with a deliberate SMIU Feedback Platform focus state:

- subtle accent border or ring
- accessible contrast
- smooth transition
- consistent with the rest of the form system

Do not remove keyboard focus visibility entirely.

---

# 118. REMOVE UNNECESSARY HOMEPAGE COPY

Remove this current search-area text/CTA:

`New here? See how SMIU Feedback Platform works`

Do not keep it directly below the filters.

The How SMIU Feedback Platform Works explanation should live in its own intentional homepage section or dedicated page/section, not as a random search-area CTA.

---

# 119. HOMEPAGE TOP TEACHER CARD

The homepage currently leaves empty space where the main teacher card should be.

Implement the proper reusable card component for the top-ranked teacher.

The card must be data-driven and prepared for real ranking data.

Do NOT hardcode fake production SMIU teacher information.

If real eligible data is unavailable, show an intentional empty state instead of leaving unexplained blank space.

Example empty-state direction:

`Top teacher rankings will appear here once enough verified reviews are available.`

If safe development seed data already exists, it may be used only in a clearly separated development/demo environment.

The production UI must never pretend that a fake teacher is a real SMIU ranking result.

---

# 120. TECHNICAL WRITING STANDARD FOR ALL USER-FACING CONTENT

All website content and instructions must follow technical writing principles.

Every user-facing message should be:

- clear
- accurate
- organized
- concise
- reader-focused
- consistent in tone
- appropriate in formality
- easy to scan

Avoid:

- unnecessary marketing language
- repetitive explanation
- vague claims
- technical jargon when the reader does not need it
- long paragraphs when a short sentence works better

This applies to:

- headings
- subtitles
- buttons
- labels
- helper text
- notifications
- empty states
- validation messages
- ranking explanations
- recommendation explanations
- privacy copy
- signup copy
- login copy
- admin copy

---

# 121. RANKING / RECOMMENDATION COPY

Remove long explanatory blocks such as the current multi-paragraph explanation about how the top spot is earned.

Do not use long sections explaining:

- verified students only
- minimum reviews
- averaged, never hand-picked

The underlying rules still apply, but the public UI should communicate them briefly and clearly.

Example direction:

`Rankings are based on verified student ratings and the minimum review threshold.`

Keep ranking and recommendation explanations concise, factual, and reader-focused.

Do not remove the actual ranking logic. Only simplify the user-facing copy.

---

# 122. HOW PROF AURA WORKS

The current How It Works content should be rewritten to explain the product in a short, clear sequence.

Keep the explanation respectful and practical.

Example structure:

1. Search a teacher or course.
2. Explore verified student ratings and public profile information.
3. Sign in with a verified SMIU student account to submit structured feedback.

Do not imply that students control teacher assignment.

---

# 123. PRIVACY SECTION

The privacy section should remain visually very light.

Use subtle red and/or green tinted accents that work in both Light and Dark themes.

Use:

- very light tinted background
- thin border
- readable text
- restrained iconography

Do not use strong red/green blocks.

The purpose is reassurance and clarity, not warning-heavy design.

---

# 124. FOOTER

The current footer is too long.

Make it compact.

Keep only important items such as:

- SMIU Feedback Platform brand
- SMIU Feedback Platform
- important navigation
- Feedback
- Privacy
- Terms where applicable
- copyright

Do not repeat the full site navigation or long product descriptions.

Current footer wording:

`© 2026 SMIU Feedback Platform. An independent student platform — not officially affiliated with the university.`

must be replaced with an anonymous creator line that does not reveal the developer's personal identity.

Preferred direction:

`© 2026 SMIU Feedback Platform. Designed and built by a Solo Full Stack Developer.`

Keep it professional and concise.

---

# 125. SIGN IN PAGE

The Sign In page should NOT vertically scroll when its content fits on a standard viewport.

Make the form slightly more compact.

Reduce unnecessary vertical padding while maintaining comfortable spacing.

The page should feel centered, focused, and lightweight.

Do not remove accessibility or readable spacing just to force-fit content.

---

# 126. SIGN IN PRIVACY TAG

The sign-in page currently contains the message:

`Your identity is never attached to a review on any public page.`

Keep this message, but present it as a very light green privacy tag/badge that fits the SMIU Feedback Platform visual system.

The tag must remain readable in both Light and Dark themes.

---

# 127. SIGNUP PAGE COPY

Review the entire signup form copy.

Remove any confusing, meaningless, or repetitive text.

Use concise, accurate explanations.

The signup page should clearly explain:

- Student ID input
- automatic SMIU student email generation
- one-time verification
- account verification requirement for reviews
- privacy

Do not add unnecessary marketing copy.

---

# 128. LAB INSTRUCTOR ICON

The current Lab Instructor icon is a laboratory flask.

Replace it with a computer/PC-related icon because the current platform context is computer lab instruction.

Use a clean Lucide or equivalent PC/monitor icon.

Do not use a chemical/lab flask icon.

---

# 129. NO EM DASHES

Do NOT use em dashes (`—`) in website content.

Replace them with:

- commas
- periods
- colons
- parentheses
- standard hyphens where appropriate

Search the current user-facing content and documentation for accidental em dashes and remove them where they would appear in the product UI.

---

# 130. DATABASE USER-FACING LANGUAGE BUG

IMPORTANT:
The current Phase 3 review migration contains Roman Urdu inside database `help_text` values.

This is WRONG.

The project requirement is:

**Roman Urdu + simple English technical words are allowed ONLY in source-code comments.**

They are NOT allowed in:

- database `label`
- database `help_text`
- review questions
- buttons
- UI text
- notifications
- validation messages
- public content

For example, these must NOT be user-facing database content:

`Kya concepts samajh aate hain?`

`Apne subject par kitni giraft hai?`

`Marks mehnat ke hisab se milte hain?`

They must be replaced with clear English equivalents.

Example:

`Are concepts explained clearly?`

`How strong is the subject knowledge?`

`Is grading fair?`

IMPORTANT:
Do not simply hide the incorrect text in the frontend.
Correct the database/source seed data as well.

If the relevant migration has already been applied to Supabase, create a safe corrective migration instead of editing history as if the old migration were unapplied.

If the relevant migration has NOT been applied, correct the source migration before applying it.

Do not destroy valid production data.

---

# 131. PHASE 3 PAUSE AND RESUME RULE

The current Phase 3 implementation is temporarily PAUSED ONLY for the final UI/copy cleanup described in Sections 112 through 130.

Claude must:

1. Inspect the current implementation.
2. Make the UI changes in this directive.
3. Use the official SMIU Feedback Platform logo asset provided by the project owner.
4. Fix the navbar, search, filters, theme switcher, favicon, loader, homepage card, sign-in, signup, privacy section, footer, Lab Instructor icon, and user-facing copy.
5. Remove unnecessary long ranking/recommendation explanations.
6. Remove the unnecessary search-area CTA.
7. Remove accidental em dashes from product UI copy.
8. Correct the Roman Urdu database user-facing text.
9. Preserve the existing working authentication and security foundation.
10. Run typecheck, lint, and build checks as appropriate.
11. Fix any issues introduced by these changes.
12. Report the completed UI/copy fixes.
13. WITHOUT waiting for additional user confirmation, immediately RESUME PHASE 3 from the current codebase.

Do NOT restart the project.
Do NOT rebuild completed phases.
Do NOT replace working code unnecessarily.
Do NOT reset the database.

==================================================
132. IMPORTANT: CONTINUE PHASE 3 AFTER UI FINALIZATION
==================================================

After Sections 112 through 130 are complete and verified:

CONTINUE PHASE 3 AUTOMATICALLY.

Continue implementing the finalized Phase 3 requirements already defined in this README, including:

- people
- person roles
- Teacher
- Lab Instructor
- Faculty
- University Staff
- HR Staff
- Internal Teacher -> Faculty association
- courses
- semesters
- teacher assignments
- review categories
- verified student reviews
- optional 150-word text reviews
- moderation foundation
- review uniqueness
- review edit limits
- aggregate ratings
- privacy-safe review architecture

Do not ask for permission to continue.

Do not stop after the UI cleanup unless a critical technical blocker genuinely requires project-owner input.

---

# 133. GIT POLICY

Do NOT perform Git operations automatically.

Do not:

- git add
- git commit
- git push
- git reset
- force push

The project owner will handle GitHub manually after the work is reviewed and ready.

---

# 134. CURRENT WORK REPORT

At the end of the UI finalization pass, report:

1. UI changes completed
2. Logo/animation changes
3. Navbar changes
4. Search/filter changes
5. Theme changes
6. Homepage card changes
7. Copy/content changes
8. Database language cleanup
9. Tests/checks run
10. Any remaining warnings or known issues
11. Confirmation that Phase 3 was resumed

Do not claim that a security or build issue is fixed unless it was actually verified.

