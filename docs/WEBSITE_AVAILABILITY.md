# Website ON/OFF and closure page

Open **Admin → Website ON/OFF** (`/admin/website`), also linked from Settings.
Website ON is the ordinary site. Website OFF replaces public and student pages
with a structured closure notice. The greeting, heading, main message, goodbye
message and sign-off are editable with a live preview. Greeting, goodbye and
sign-off are optional. Save the message before closing the website.

Admin routes, administrator sign-in (`/auth/login?next=/admin/website`) and the
authentication callback stay available so the owner can reopen the website.
Each admin route retains its existing role checks. A client-supplied closure
header is cleared before routing, and a login return URL must remain inside
the admin path. The closure page replaces normal navigation, onboarding,
notifications and the feedback chat.

## Setup

Apply `supabase/migrations/20261026140000_website_availability.sql` after the
existing admin migrations, then deploy the application changes. It defaults ON
and is safe to reapply without resetting the saved message or switch. It adds a
singleton settings table, public reads and admin-only write/read RPCs. Writes
are validated, atomic and audited; editing text does not change availability,
and toggling availability does not overwrite the message.

The middleware reads the live switch without a cache and returns a 503 closure
response with `no-store` and `noindex` headers. Ordinary routes resume after
reopening. Before the migration is installed, a missing-table response preserves
the normal site. A network/read failure shows a neutral unavailable message,
distinct from the owner's official closure announcement.

The control is for website availability; existing review rows are preserved.

## Verification

Tests cover admin/student/anonymous/inactive-admin access, text validation,
independent toggle/message writes, audit entries, migration reapplication,
public and student route replacement, admin recovery, header spoofing, outage
handling and safe rendering of custom text. The live migration/deployment state
must be verified on the linked project after installation.

## Handoff status

Local implementation and verification are complete. The latest verification
passed all 218 tests, the production build, lint, typecheck and Git whitespace
checks. Desktop (1440px) and mobile (390px) closure previews were inspected
without horizontal overflow. A local production HTTP check confirmed public
and student routes return 503 during an availability-read failure, omit normal
navigation and feedback controls, and keep administrator sign-in accessible.

The Supabase migration has not been applied to the live project, and these
changes have not been deployed. Apply the migration and deploy before using
the live switch, then verify closing and reopening with an authenticated admin.
Demo disclosures and review ratings were left unchanged by this feature.
