# Privacy notice

ProfAura is an independent, student-run review platform for Sindh Madressatul Islam University
(SMIU). This notice explains what data the platform holds, how anonymity is protected, and what
choices a user has. It is written in plain language and is not a substitute for legal advice.

## Who runs this

ProfAura is not operated by SMIU or by any university administration. It is an independent
platform. Reviews are the opinions of the students who write them.

## What data is collected

- **Account data.** A university email address and a password (stored only as a salted hash by
  the authentication provider). The account is used to verify that a reviewer is a genuine
  student and to enforce one account per person.
- **Reviews.** Star ratings, yes/no answers and any written comment a student chooses to submit,
  along with the course and semester context they select.
- **Reports and website feedback.** If a user reports a review or sends site feedback, the content
  of that report or message is stored.
- **Operational data.** Standard server and provider logs needed to run the service and resist
  abuse.

The platform does not ask for a real name, phone number, address, date of birth, or any
government identifier.

## How review anonymity works

Anonymity here is built into the data model, not merely promised.

- The table that stores reviews has **no author column at all**. There is no field in a review
  that names, numbers or otherwise identifies its writer.
- The link between an account and the reviews it wrote lives in a **separate private table**. Its
  access rules allow only the account owner to read their own link. Administrators cannot read
  who wrote a given review.
- Public profile pages only reveal a course or semester label, or a comparison value, once at
  least three reviews exist in that group. This prevents a small group from being used to guess
  who wrote a particular review.
- When a user reports a review or sends feedback, the identity of the sender is removed from what
  an administrator sees.

Anonymity has a practical limit that no software can remove: if a written comment itself contains
details that identify the author, those details are visible. Users are encouraged not to include
self-identifying information in comment text.

## Who can see what

- **The public** can see published reviews, aggregate ratings, and profile pages, subject to the
  k-anonymity brake above.
- **A signed-in student** can see their own reviews and account information.
- **Administrators** can moderate review text, manage reference data and people, and handle
  reports. Administrators cannot see review authorship and cannot see the identity behind a report
  or a feedback message.

## Email

A university email address is used once to verify an account and thereafter for essential account
messages only. Verification email is sent through Brevo SMTP configured in the authentication
provider. The platform sends exactly one verification message per sign-up.

## Data retention and deletion

Reviews may be soft-deleted, which hides them from the public while preserving the one-review-per
-person mapping so the edit limit cannot be reset. A user who wants their account or data removed
should contact the repository owner. Because authorship is stored separately and is not visible to
administrators, identity-linked deletion is handled through the account itself.

## Security

Data is protected by database-level access rules, server-side authorization, encrypted transport
(HSTS), and the browser-hardening headers described in `SECURITY.md`. No system is perfectly
secure; `SECURITY.md` lists the known limitations honestly.

## Changes

This notice will be updated as the platform changes. Material changes will be reflected here and
dated in version control.

## Contact

For any privacy question, correction, or deletion request, contact the repository owner.
