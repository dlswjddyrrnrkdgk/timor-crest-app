# Timor Crest Contractor Portal

Vite + React web portal for Timor Crest contractor and Admin operations. The current UI keeps Auth, contractor/unit management, and 8-step payment management while separating Admin and Contractor screens into focused mobile-first routes.

## Local Setup

```bash
npm install
npm run dev
```

Create `.env.local` for local development:

```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Do not commit `.env.local`. Keep service role keys and other secrets out of frontend code.

## Production Build

```bash
npm run build
npm run preview
```

The production output is generated in `dist/`.

## Netlify

Use these Netlify build settings:

- Build command: `npm run build`
- Publish directory: `dist`

Required Netlify environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Server-only variables for later phases must not use a `VITE_` prefix:

- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_INVITE_SECRET`
- `CCTV_PROVIDER_API_KEY`
- `CCTV_PROVIDER_API_SECRET`
- `CCTV_SIGNING_SECRET`
- `CCTV_RELAY_BASE_URL`

## Supabase Phase 1 Setup

Run `supabase/migrations/0001_profiles_auth_rls.sql` in Supabase before testing login redirects.

Create the first Auth user manually in Supabase Dashboard:

- Email: `kimsiho20@gmail.com`
- Password: choose a secure temporary password and rotate it after first login.

Then seed the Admin profile in Supabase SQL Editor:

```sql
insert into public.profiles (id, role, display_name, email)
select id, 'admin', 'Admin', email
from auth.users
where email = 'kimsiho20@gmail.com'
on conflict (id) do update
set role = excluded.role,
    display_name = excluded.display_name,
    email = excluded.email;
```

The login flow is:

1. User enters email and password at `/login`.
2. Supabase Auth signs the user in.
3. The app reads `profiles.role`.
4. `admin` redirects to `/admin`.
5. `contractor` redirects to `/contractor`.
6. Missing profile or role signs the user out and shows an unregistered account message.

## Supabase Phase 2 Setup

Run `supabase/migrations/0002_contractors_units.sql` after the Phase 1 migration.

This creates:

- `public.units`
- `public.contractors`
- RLS policies for Admin full access
- RLS policies for Contractor self-only read access

Contractor user setup is manual in Phase 2:

1. Create the contractor user in Supabase Dashboard Auth.
2. Copy that Auth user's UID.
3. Insert or update a `public.profiles` row with role `contractor`.
4. Sign in as Admin and create a unit in `/admin`.
5. Create a contractor in `/admin`.
6. Paste the copied Auth user UID into `profile_id`.
7. Select the related unit in `unit_id`.
8. The contractor can then sign in and view only their own `/contractor` summary.

Contractor profile seed example:

```sql
insert into public.profiles (id, role, display_name, email)
select id, 'contractor', 'Contractor Name', email
from auth.users
where email = 'contractor@example.com'
on conflict (id) do update
set role = excluded.role,
    display_name = excluded.display_name,
    email = excluded.email;
```

Phase 2 Admin workflow:

1. Sign in as Admin.
2. Open `/admin`.
3. Create or edit units with `unit_code`, `unit_name`, `property_type`, `total_price`, `currency`, and `status`.
4. Create or edit contractors with `full_name`, `email`, `phone`, `passport_no`, `address`, `status`, `unit_id`, and `profile_id`.

Phase 2 Contractor workflow:

1. Sign in with the contractor Auth account.
2. The app redirects to `/contractor`.
3. The page shows My Contract Summary for the row where `contractors.profile_id = auth.uid()`.
4. If no contractor row is linked, the page shows an Admin contact message.

Never place `SUPABASE_SERVICE_ROLE_KEY`, database passwords, or other server secrets in frontend code or any `VITE_` environment variable. Phase 2 uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the browser.

## Supabase Phase 3 Setup

Run `supabase/migrations/0003_payments.sql` after the Phase 2 migration.

This creates:

- `public.payment_plans`
- `public.payment_items`
- One payment plan per contractor through a unique `contractor_id`
- RLS policies for Admin full access
- RLS policies for Contractor self-only read access

The payment model keeps the existing demo's 8-step structure:

1. `BOOKING FEE`
2. `8주 이내 계약금`
3. `기초공사 완료`
4. `골조 완료`
5. `벽체 완료`
6. `지붕 천장 완료`
7. `문 / 창호 / 전기 완료`
8. `입주 전`

Admin payment workflow:

1. Sign in as Admin.
2. Open `/admin/payments`.
3. Select a contractor from the contractor list.
4. In Payment Management, create a payment plan if one does not exist.
5. The default `total_price` and `currency` use the selected contractor's unit when available.
6. Create the default 8 payment items.
7. Edit each item's title, required amount, paid amount, due date, paid date, status, and note.

Contractor payment workflow:

1. Sign in as the contractor.
2. Open `/contractor`.
3. The dashboard shows a compact payment summary and preview button.
4. Open `/contractor/payments` to see the full 8-step payment list.
5. The page shows only the payment plan connected to the contractor row where `contractors.profile_id = auth.uid()`.
6. Payment information is read-only for contractors.
7. If no payment plan exists, the page asks the contractor to contact Admin.

Payment summary calculations are not stored in the database:

- `total_required_amount = sum(required_amount)`
- `total_paid_amount = sum(paid_amount)`
- `unpaid_amount = total_price - total_paid_amount`
- `progress_percent = total_paid_amount / total_price * 100`

Phase 3 still uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the browser. Do not put service role keys, database passwords, or secret tokens in frontend code.

## UI Route Structure

This UI refactor does not add a database migration.

Admin routes:

- `/admin` - dashboard home with summary cards, unit summary list, and management buttons.
- `/admin/contractors` - contractor list plus create/edit forms.
- `/admin/units` - unit list plus create/edit forms.
- `/admin/payments` - contractor payment management, payment plan creation, default 8-step item creation, and payment item editing.
- `/admin/journey` - shared Journey template management.
- `/admin/documents` - contractor-linked private document upload and metadata management.

Contractor routes:

- `/contractor` - compact dashboard with Payment Summary, Journey Summary, and the `내 집 미리보기` button.
- `/contractor/payments` - read-only Payment Summary plus the full 8-step payment item list.
- `/contractor/journey` - read-only shared Journey schedule.
- `/contractor/documents` - read-only private documents linked to the signed-in contractor.
- `/contractor/preview` - placeholder for the future home preview experience.

Payment progress is shown with `AnimatedProgress`, which count-ups the number and fills the progress bar. It respects `prefers-reduced-motion` by showing the final value immediately.

## Supabase Phase 4 Setup

Run `supabase/migrations/0004_journey.sql` after the Phase 3 migration.

This migration creates `public.journey_template_steps`: one project-wide Journey template, deliberately not linked to individual contractors or units. Every contractor reads the same 8-stage schedule. The seed inserts the default construction Journey stages with `on conflict (step_no) do nothing`, so it fills missing rows without overwriting existing Admin edits.

Default Journey steps:

1. 계약 및 예약 확인
2. 설계 및 인허가 준비
3. 기초공사
4. 골조공사
5. 벽체 및 외장공사
6. 지붕 / 천장 / 전기공사
7. 내부 마감 및 점검
8. 입주 준비 완료

Journey progress is calculated in the browser as `average(progress_percent)` across the shared steps. It is not stored as a contractor-, unit-, or project-specific column.

RLS is intentionally narrow:

- Admin users have full CRUD through `public.is_admin()`.
- Contractor users can only select the shared template.
- Anonymous users have no Journey access.

Admins manage shared steps at `/admin/journey`. If fewer than 8 steps exist, the Admin page can create or supplement the default Journey rows through the browser using the logged-in admin session and RLS-protected insert permissions. Contractors see a short Journey Summary on `/contractor` and read the full schedule at `/contractor/journey`; there are no contractor-specific Journey rows or write controls. Continue to use only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in browser code. Never expose `SUPABASE_SERVICE_ROLE_KEY`, database passwords, or other secrets through a `VITE_` variable.

## Supabase Phase 5 Setup

Run `supabase/migrations/0005_documents.sql` after the Phase 4 migration.

This migration creates:

- `public.document_files` for document metadata.
- Private Supabase Storage bucket `timorcrest-documents`.
- RLS policies for Admin full metadata access.
- RLS policies for Contractor self-only metadata reads.
- Storage policies for Admin full object access and Contractor self-only object reads.

The Storage bucket must stay private:

- `timorcrest-documents.public = false`
- Do not use public URLs.
- Document open/download actions create short-lived signed URLs that expire after 180 seconds.
- Do not add `SUPABASE_SERVICE_ROLE_KEY` to frontend code or any `VITE_` environment variable.

Storage path rule:

```text
contractor_id/document_id/safe_file_name
```

Example:

```text
aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/11111111-2222-3333-4444-555555555555/contract.pdf
```

The first path segment is always `contractor_id`, which lets Storage RLS restrict contractors to their own folder:

- Admin can select, insert, update, and delete all objects in `timorcrest-documents`.
- Contractor can select only objects where `split_part(storage.objects.name, '/', 1)` matches their own `public.contractors.id`.
- Anonymous users have no document metadata or Storage access.

Admin document workflow:

1. Sign in as Admin.
2. Open `/admin/documents`.
3. Select a contractor.
4. Upload a PDF, DOC, DOCX, JPG, JPEG, PNG, or WEBP file up to 10MB.
5. Edit title, category, status, or note as needed.
6. Open/download through a signed URL.
7. Delete removes the Storage object and its `document_files` row.

Contractor document workflow:

1. Sign in as the contractor.
2. The `/contractor` dashboard shows a compact Documents summary card.
3. Open `/contractor/documents` from the Documents card or bottom navigation.
4. The page shows only documents linked to the contractor row where `contractors.profile_id = auth.uid()`.
5. Contractors can open/download documents but cannot upload, edit, or delete them.

## Phase Boundaries

Phase 1 includes only Auth, role redirects, route guards, and protected shells. Phase 2 includes contractor/unit tables, RLS, Admin unit/contractor forms, Admin lists, and Contractor My Contract Summary. Phase 3 includes contractor-specific payment plans, 8 payment items, Admin payment editing, and Contractor read-only payment summary. Phase 4 includes shared Journey management. Phase 5 includes private contractor document upload and read-only contractor document access. The dashboard refactor separates these features into focused routes without changing RLS or table shape.

Phase 1 through Phase 5 do not include:

- CCTV streaming integration
- Public sign up
- Service role key usage in frontend code

Payment and Journey structures are intentionally preserved for later phases:

- Payment remains an 8-step contractor/unit-specific model and maps to `payment_plans` + `payment_items`.
- Journey is a shared site-wide 8-step model implemented by `journey_template_steps` only.

Legacy demo files are retained for future migration reference:

- `src/app.js`
- `src/data.js`

## Project Structure

- `index.html` - Vite HTML entry.
- `src/main.jsx` - React entry.
- `src/App.jsx` - Router and protected route wiring.
- `src/lib/supabaseClient.js` - Supabase browser client.
- `src/services/authService.js` - Auth/profile role helpers.
- `src/services/contractorService.js` - Supabase unit/contractor data helpers.
- `src/services/paymentService.js` - Supabase payment plan/item helpers.
- `src/services/journeyService.js` - shared Journey template helpers.
- `src/services/documentService.js` - private document metadata, upload, delete, and signed URL helpers.
- `src/services/documentModel.js` - document path, filename, file-size, and validation helpers.
- `src/components/AnimatedProgress.jsx` - reusable progress count-up and progress bar.
- `src/routes/` - Login, Admin dashboard/routes, Contractor dashboard/routes, route guard.
- `src/app.js` - legacy demo renderer retained for later migration reference.
- `src/data.js` - legacy localStorage demo data retained for later migration reference.
- `src/styles.css` - mobile web design system styling.
- `supabase/migrations/` - SQL migration drafts.
- `public/_redirects` - Netlify SPA route fallback.
