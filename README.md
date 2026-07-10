# Timor Crest Contractor Portal

Vite + React web portal for Timor Crest contractor and Admin operations. Phase 1 focuses on Supabase Auth, a single login screen, role-based redirects, and protected Admin/Contractor shells.

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

Required Netlify environment variables for Phase 1:

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

## Phase Boundaries

Phase 1 includes only Auth, role redirects, route guards, and protected shells.

Phase 1 does not include:

- Payment CRUD
- Journey CRUD
- File upload
- CCTV streaming integration
- Public sign up
- Service role key usage in frontend code

Payment and Journey structures are intentionally preserved for later phases:

- Payment remains an 8-step contractor/unit-specific model and will map to `payment_plans` + `payment_items`.
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
- `src/routes/` - Login, Admin shell, Contractor shell, route guard.
- `src/app.js` - legacy demo renderer retained for later migration reference.
- `src/data.js` - legacy localStorage demo data retained for later migration reference.
- `src/styles.css` - mobile web design system styling.
- `supabase/migrations/` - SQL migration drafts.
- `public/_redirects` - Netlify SPA route fallback.
