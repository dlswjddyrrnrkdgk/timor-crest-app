# Timor Crest Contractor Portal

Vite + React web portal for Timor Crest contractor and Admin operations. Phase 3 adds contractor-specific 8-step payment management while keeping Journey, documents, and CCTV for later phases.

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
2. Open `/admin`.
3. Select a contractor from the contractor list.
4. In Payment Management, create a payment plan if one does not exist.
5. The default `total_price` and `currency` use the selected contractor's unit when available.
6. Create the default 8 payment items.
7. Edit each item's title, required amount, paid amount, due date, paid date, status, and note.

Contractor payment workflow:

1. Sign in as the contractor.
2. Open `/contractor`.
3. The page shows only the payment plan connected to the contractor row where `contractors.profile_id = auth.uid()`.
4. Payment information is read-only for contractors.
5. If no payment plan exists, the page asks the contractor to contact Admin.

Payment summary calculations are not stored in the database:

- `total_required_amount = sum(required_amount)`
- `total_paid_amount = sum(paid_amount)`
- `unpaid_amount = total_price - total_paid_amount`
- `progress_percent = total_paid_amount / total_price * 100`

Phase 3 still uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the browser. Do not put service role keys, database passwords, or secret tokens in frontend code.

## Phase Boundaries

Phase 1 includes only Auth, role redirects, route guards, and protected shells. Phase 2 includes contractor/unit tables, RLS, Admin unit/contractor forms, Admin lists, and Contractor My Contract Summary. Phase 3 includes contractor-specific payment plans, 8 payment items, Admin payment editing, and Contractor read-only payment summary.

Phase 1 through Phase 3 do not include:

- Journey CRUD
- File upload
- CCTV streaming integration
- Public sign up
- Service role key usage in frontend code

Payment and Journey structures are intentionally preserved for later phases:

- Payment remains an 8-step contractor/unit-specific model and maps to `payment_plans` + `payment_items`.
- Journey remains a shared site-wide 8-step model and will map to `journey_template_steps` only.

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
- `src/routes/` - Login, Admin dashboard, Contractor summary, route guard.
- `src/app.js` - legacy demo renderer retained for later migration reference.
- `src/data.js` - legacy localStorage demo data retained for later migration reference.
- `src/styles.css` - mobile web design system styling.
- `supabase/migrations/` - SQL migration drafts.
- `public/_redirects` - Netlify SPA route fallback.
