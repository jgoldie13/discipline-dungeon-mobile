# Discipline Dungeon

**A Progressive Web App to defeat phone addiction through accountability and micro-tasks.**

## 🎯 What This Is

Your phone is the problem. Social media scrolling is stealing your time and killing your discipline.

This app helps you:
- **Track social media usage** with manual daily logging
- **Log urges** when you want to scroll and get a micro-task alternative instead
- **Build streaks, earn XP, and build your cathedral** for disciplined actions
- **Face real consequences** (stakes + honesty penalties)
- **Optionally verify iPhone Screen Time** via a native iOS companion upload (the web app cannot read Screen Time)

## 🚀 Quick Start (Terminal)

### Easy Way - Use the Startup Script

```bash
./start-server.sh
```

The script installs dependencies and starts the dev server on port `3002`.

> Note: `start-server.sh` currently checks for `prisma/dev.db` to decide whether to run migrations. Prisma is configured for Postgres (`prisma/schema.prisma`), so if your DB isn’t set up yet, use the manual steps below.

### Manual Way

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   - Copy `.env.example` → `.env.local`
   - Fill in:
     - `DATABASE_URL` (Postgres connection for Prisma)
     - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase Auth)
     - `CRON_SECRET` (only needed for the cron endpoint)

3. **Set up database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open on your phone**
   - Dev machine: `http://localhost:3002/mobile`
   - Mobile device (same Wi‑Fi): `http://<your-lan-ip>:3002/mobile`
   - Add to home screen for the full PWA experience

See `QUICKSTART.md` for the current local workflow.

## 📱 PWA Installation

### On iPhone (iOS)
1. Open Safari and navigate to the app
2. Tap Share
3. Tap “Add to Home Screen”

### On Android
1. Open Chrome and navigate to the app
2. Tap the three-dot menu
3. Tap “Add to Home Screen” / “Install App”

## 🔐 Auth

- Login UI: `/login` (`app/login/page.tsx`)
- Supabase email confirmation callback: `/auth/callback` (`app/auth/callback/route.ts`)

Most API routes require an authenticated Supabase session (`lib/supabase/auth.ts`). iOS verification endpoints also accept `Authorization: Bearer <access_token>` (see `docs/ios-verification.md`).

## 🏗️ Current Features

### ✅ Phase 1: Manual Tracking + PWA

#### Core PWA + Dashboard
- **Installable PWA** (`public/manifest.json`, `next.config.ts`)
- **Mobile dashboard** (`/mobile`) showing:
  - phone usage (self-report)
  - XP / level / streak
  - HP (sleep-based capacity)
  - phone-free blocks
  - truth status (iPhone Screen Time verification)

#### Phone Addiction Features
- **Phone Usage Logging** (`/phone/log`)
  - Manual daily social media time tracking (`POST /api/phone/log`)
  - Over limit creates a `UsageViolation` and applies an XP penalty
  - Note: the `/phone/log` UI currently uses a fixed limit of `30` minutes

- **Urge Logging with Micro-tasks** (`/phone/urge`)
  - Trigger → micro-task → timer → complete flow (`POST /api/phone/urge`)
  - The `/phone/urge` UI uses a hardcoded list of micro-tasks today
  - There is also a seeded `MicroTask` table (`prisma/seed.ts`) not currently used by the `/phone/urge` page

- **Phone-Free Blocks** (`/phone/block`)
  - Time-based phone abstinence tracking (`POST /api/phone/block`)
  - Duration presets are derived from per-user PolicyEngine settings
  - Optional Pomodoro config is stored on each block

#### Task Management
- **Tasks** (`/tasks`) - Create and complete tasks (`GET/POST /api/tasks`, `POST /api/tasks/[id]/complete`)
- **Task Types** (`/settings/task-types`)
  - Per-user categories with XP/build multipliers (`TaskType`)
  - Defaults are auto-created per user (see `lib/taskTypes.service.ts`)

#### Cathedral Build (Meta Progression)
- **Cathedral build screen** (`/build`)
  - Build points are auto-applied when you complete blocks/tasks/urges
  - Blueprint lives in `public/blueprints/cathedral_cologne_v1.json`

#### Ledger (Audit Events)
- **Ledger** (`/ledger`) shows today’s `AuditEvent`s (`GET /api/audit/ledger`)
- **Manual honesty events**: `POST /api/audit/override` (applies XP penalties)
- **Microtask “Scroll” sheet analytics**: `POST /api/events`

### ✅ Phase 2: Stakes (Weekly Commitments)

- Create weekly stake: `/stakes/create` → `POST /api/stakes`
- Track current stake: `/stakes/current` → `GET /api/stakes`
- Evaluate stake: `POST /api/stakes/evaluate`
- Payment confirmation: `/stakes/payment` → `POST /api/stakes/[id]/confirm-payment`
- Scheduled evaluation endpoint: `GET /api/cron/evaluate-stakes` (cron configured in `vercel.json`)

### ✅ Phase 2A: Sleep → HP

- Sleep logging: `/sleep/log` → `POST /api/sleep/log`
- HP is calculated in `lib/hp.service.ts`
- Positive XP gains are reduced when HP is low (applied in `lib/xp.service.ts`)

### ✅ Phase 2B: Morning Protocol

- Morning protocol UI: `/protocol` → `GET/POST /api/protocol`
- Required items: woke on time, got morning light, drank water (caffeine delay is optional)

### ✅ Phase 2C: Boss Battles + Time-of-Day Multipliers

- Create boss: `/boss/create` → `POST /api/boss/create`
- View boss: `/boss/[id]` → `GET /api/boss/[id]`
- Attack: start a block with `?bossId=...`, then `POST /api/boss/attack`
- Damage multipliers are implemented in `lib/boss.service.ts`

### ✅ Phase 3 (MVP): iPhone Screen Time Verification

Web backend:
- `PATCH /api/verification/ios/connection`
- `POST /api/verification/ios/upload`
- `GET /api/verification/truth`

Truth logic:
- Stores daily verified minutes (`IosScreenTimeDaily`) and truth rows (`TruthCheckDaily`)
- Applies deterministic, idempotent XP penalties via the XP ledger (`XpEvent.dedupeKey`)

iOS companion:
- `ios-companion/` contains the SwiftUI app + DeviceActivity report extension
- Open `ios-companion/DisciplineDungeonIOSCompanion.xcodeproj` in Xcode

## 📋 Schema & Database (Prisma)

Prisma schema: `prisma/schema.prisma`

Core models:
- `User`
- `PhoneDailyLog`, `UsageViolation`
- `Urge`, `PhoneFreeBlock`, `MicroTask`
- `Task`, `TaskType`, `BossBlock`
- `XpEvent`, `StreakHistory`
- `SleepLog`, `DailyProtocol`
- `StakeCommitment`
- `AuditEvent`
- Verification: `IosScreenTimeConnection`, `IosScreenTimeDaily`, `TruthCheckDaily`, `TruthViolation`
- Build: `UserProject`, `BlueprintSegment`, `UserProjectProgress`, `BuildEvent`

Migrations: `prisma/migrations/*`

## 🗺️ Roadmap

### Phase 3+ (IN PROGRESS)
- [ ] Use `MicroTask` table for urge micro-tasks (remove hardcoded list)
- [ ] Make daily phone limit configurable (wire PolicyEngine to `/phone/log`)
- [ ] Add analytics views (weekly/monthly)
- [ ] Add stronger verification options (photo/partner) behind feature flags

## 🎨 Design Philosophy

**Chosen Discipline Over External Control**
- You set limits you choose to honor
- Real consequences you selected to forge yourself
- Track everything, hide nothing — radical honesty with self

**Replacement Over Restriction**
- You can’t read iOS Screen Time from the web
- Instead: make scrolling cost you (XP, stakes, honesty penalties)
- Make not-scrolling rewarding (blocks, tasks, build progress)

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Auth:** Supabase Auth
- **Database:** Postgres with Prisma ORM
- **PWA:** `@ducanh2912/next-pwa`
- **Styling:** Tailwind CSS 4
- **Deployment:** Vercel (cron configured via `vercel.json`)

## 📝 Key Files

### Frontend Pages
- `app/mobile/page.tsx` - Mobile dashboard
- `app/phone/log/page.tsx` - Daily usage logging
- `app/phone/urge/page.tsx` - Urge logging flow
- `app/phone/block/page.tsx` - Phone-free blocks (Pomodoro + boss attack)
- `app/tasks/page.tsx` - Tasks + boss tasks list
- `app/build/page.tsx` - Cathedral build progress
- `app/ledger/page.tsx` - Audit ledger UI
- `app/settings/page.tsx` - Policy/settings editor
- `app/settings/task-types/page.tsx` - Task type editor
- `app/settings/iphone-verification/page.tsx` - Truth + iOS connection settings
- `app/stakes/create/page.tsx`, `app/stakes/current/page.tsx`, `app/stakes/payment/page.tsx`
- `app/sleep/log/page.tsx` - Sleep logging
- `app/protocol/page.tsx` - Morning protocol
- `app/boss/create/page.tsx`, `app/boss/[id]/page.tsx` - Boss creation/detail

### API Routes
- `app/api/user/stats/route.ts`
- `app/api/phone/log/route.ts`, `app/api/phone/urge/route.ts`, `app/api/phone/block/route.ts`
- `app/api/tasks/route.ts`, `app/api/tasks/[id]/complete/route.ts`
- `app/api/task-types/route.ts`, `app/api/task-types/[id]/route.ts`
- `app/api/build/status/route.ts`, `app/api/build/apply/route.ts`, `app/api/build/reset/route.ts`
- `app/api/audit/ledger/route.ts`, `app/api/audit/override/route.ts`
- `app/api/events/route.ts`
- `app/api/stakes/route.ts`, `app/api/stakes/evaluate/route.ts`, `app/api/stakes/[id]/route.ts`, `app/api/stakes/[id]/confirm-payment/route.ts`
- `app/api/cron/evaluate-stakes/route.ts`
- `app/api/sleep/log/route.ts`
- `app/api/protocol/route.ts`
- `app/api/boss/create/route.ts`, `app/api/boss/suggest/route.ts`, `app/api/boss/[id]/route.ts`, `app/api/boss/attack/route.ts`
- `app/api/verification/ios/connection/route.ts`, `app/api/verification/ios/upload/route.ts`, `app/api/verification/truth/route.ts`

## 🚧 Known Issues / Future Work (repo-backed)

- **Multi-user daily tables are not fully safe yet:** several models use `@unique` on `date` without including `userId` (e.g. `PhoneDailyLog`, `SleepLog`, `DailyProtocol`, `StreakHistory`). This will conflict across users.
- **No Next.js middleware file:** `proxy.ts` looks like intended middleware, but it’s not named `middleware.ts`, so route protection relies on API guards + client `AuthGate`.
- **Urge UI XP label mismatch:** `/phone/urge` displays `+10 XP`, but the backend awards urge XP via `XpService.calculateUrgeXp()` (currently `15`).
- **HP decay / XP decay are not implemented as background jobs:** settings exist, but no scheduler applies them.

## 🔐 Privacy

- Supabase Auth sessions for web; Bearer tokens for iOS verification endpoints (`docs/ios-verification.md`)
- PWA config avoids caching authenticated API responses (`next.config.ts`)

## 📄 License

This is a personal accountability tool. Use it to fix your life.

## 🤝 Contributing

This is a personal project, but if you're building something similar, feel free to fork and adapt.

## ⚠️ Disclaimer

This app uses consequences you choose — XP penalties, streak resets, and financial stakes — as accountability tools. It’s designed to provide honest feedback on the commitments you make to yourself.
