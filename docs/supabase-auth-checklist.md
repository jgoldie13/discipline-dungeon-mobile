# Supabase Auth Verification Checklist

## Setup

- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
- Ensure Supabase Auth email confirmations are enabled (assumed ON).
- Ensure the `public.profiles` trigger on `auth.users` is installed and enabled.

## Manual Test Flow

### Sign up + email confirmation

- Go to `/login` → **Sign Up**.
- Create a new account with email/password.
- Expect: UI shows “Check your email to confirm…”.
- Open the confirmation email and click the link.
- Expect: browser returns to `/auth/callback` and then redirects into the app (default `/mobile`).

### Sign in

- Go to `/login` → **Sign In**.
- Sign in with the same email/password.
- Expect: redirect to `/mobile`.

### Sign out

- From `/mobile`, click **Settings**.
- Click **Sign out**.
- Expect: redirect to `/login`.

## Data Checks

### Profile row auto-created

- In Supabase SQL editor:
  - Confirm a row exists in `public.profiles` for the new `auth.users.id`.
  - No app code should insert into `profiles` (owned by the DB trigger).

## Prod env var verification

- In Vercel → Project → Settings → Environment Variables:
  - Confirm `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` exist for **Production**.
  - Confirm `DATABASE_URL` exists for **Production** (Prisma-backed tables).
- Redeploy after changes (Vercel does not retroactively apply env var changes to an existing deployment).
- Verify health endpoint in production:
  - `GET https://discipline-dungeon-mobile.vercel.app/api/health/supabase`
  - Expect: `{ ok: true, supabase: { host, projectRef } }`
  - If env vars are missing, expect HTTP 500 with `missing: [...]`.

### RLS blocks cross-user access (profiles)

- Create User A and User B.
- As User A (using the Supabase “Run SQL” with JWT or the app session), try to read User B’s `public.profiles` row.
- Expect: 0 rows / permission denied (depending on query method), never User B’s data.

### App scoping (Prisma-backed tables)

- Create data as User A (tasks, blocks, stakes, etc.).
- Sign out, sign in as User B.
- Confirm User B cannot access/modify User A resources by ID:
  - Completing a task (`POST /api/tasks/[id]/complete`) for User A should return 404.
  - Fetching a boss (`GET /api/boss/[id]`) for User A should return 500/404 (depending on UI handling), but never return User A data.
  - Fetching a stake (`GET /api/stakes/[id]`) for User A should return 404.

## Regression

- App loads and core flows still work:
  - `GET /api/user/stats` succeeds when signed in.
  - Tasks list and task creation succeed when signed in.
  - Build status loads on `/build` when signed in.
