# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Discipline Dungeon is a Progressive Web App (PWA) designed to defeat phone addiction through accountability, micro-tasks, and gamified discipline tracking. Built with Next.js 16 (App Router), Supabase Auth, Postgres/Prisma, and Tailwind CSS 4.

**Philosophy**: Chosen discipline over external control. You set limits you honor. Real consequences you selected to forge yourself. Track everything, hide nothing—radical honesty with self.

## Development Commands

```bash
# Development
npm run dev              # Start dev server on port 3002
npm install              # Install dependencies

# Database
npm run db:migrate       # Run Prisma migrations
npm run db:seed          # Seed database with defaults
npm run db:studio        # Open Prisma Studio GUI

# Quality
npm run lint             # Run ESLint
npm run test             # Run Vitest tests
npm run build            # Production build

# Quick start script
./start-server.sh        # Auto-installs, migrates, and starts server
```

**Access URLs:**
- Mobile dashboard: `http://localhost:3002/mobile`
- On phone (same Wi-Fi): `http://<your-lan-ip>:3002/mobile`

## Architecture Overview

### Core Architectural Patterns

1. **Domain-Driven Services** (`lib/*.service.ts`)
   - Each service owns a business domain (XP, HP, Boss, Streak, Truth, etc.)
   - No cross-service dependencies—only through Prisma database and PolicyEngine
   - Services are pure TypeScript modules with exported functions

2. **Immutable Event Sourcing**
   - XP system (`XpEvent`), audit log (`AuditEvent`), and truth violations use append-only event logs
   - Never update history, only create new records
   - Deduplication via unique constraints on `dedupeKey` fields

3. **Settings as Policy**
   - All game rules live in `UserSettingsV1` schema (Zod-validated)
   - Interpreted by `PolicyEngine` class (`lib/policyEngine.ts`)
   - Changes to rules don't require code changes—just update user settings

4. **Layered Authentication**
   - Cookie-based Supabase sessions for web
   - Bearer tokens as fallback for iOS verification endpoints
   - Server and client variants of Supabase client with graceful degradation

5. **Transaction-Based Consistency**
   - Boss attacks, XP events, and truth consequences use Prisma transactions
   - Maintains consistency across multiple tables

### Key Systems

#### XP System (Ledger-Based)
**Philosophy**: 1 XP = 1 minute of disciplined behavior reclaimed

- **Event Types**: `block_complete`, `urge_resist`, `task_complete`, `violation_penalty`, `decay`, `truth_penalty`
- **HP Modulation**: All positive XP gains are modulated by current HP
  - HP ≥ 85: 100% XP (excellent state)
  - HP 60-84: 85% XP (good, but hold back)
  - HP < 60: 70% XP (struggling, need rest)
- **Deduplication**: Uses `dedupeKey` to prevent double-counting (e.g., `"block:${blockId}"`)
- **Milestones**: 1K→16h, 5K→83h, 10K→166h, 50K→833h reclaimed
- **Service**: `lib/xp.service.ts` - All XP changes go through `XpService.createXpEvent()`

#### HP System (Energy Equation)
**Formula**: 60 HP baseline + bonuses - penalties (capped 0-100)

**Bonuses:**
- Sleep duration: 0-25 HP (7.5h+ = max)
- Wake time adherence: 0-10 HP (within ±15min of target = max)
- Subjective quality: 0-5 HP (1-5 scale direct)
- Morning light: +5 HP (outdoor within 60min of wake)

**Penalties (Energy Equation - Huberman Labs inspired):**
- Alcohol: -15 HP per drink
- Late caffeine: -10 HP (within 6h of bed) or -5 HP (after 2pm)
- Screen time: -5 HP (30+ min in last hour before bed)
- Late exercise: -5 HP (within 4h of bed)
- Late meal: -5 HP (within 3h of bed)

**Service**: `lib/hp.service.ts` - Calculate via `HpService.calculateHp(sleepLog)`

#### PolicyEngine (Game Rules)
The single source of truth for all game calculations and feature flags.

**Location**: `lib/policyEngine.ts`

**Key Methods:**
- `isFeatureEnabled(feature)` - Check if feature is enabled
- `getDailyLimit()` - Get phone usage limit
- `calculateBlockXp(minutes)` - Calculate XP for phone-free blocks
- `calculateHp(sleepMetrics)` - Calculate HP from sleep data
- `calculateDamage(minutes, timeOfDay)` - Boss mode damage with time-of-day multipliers
- `evaluateStreak(violationCount)` - Determine if streak continues
- `updateSettings(partial)` - Merge settings update

**Usage Pattern:**
```typescript
// Server-side
const settings = await getUserSettingsServer(userId);
const engine = createEngine(settings);
const blockXp = engine.calculateBlockXp(30);

// Client-side
const { settings } = useUserSettings();
const engine = createEngineFromJson(settings);
```

#### Truth System (Verification Enforcement)
Radical honesty verification comparing self-reported vs iOS Screen Time.

**Flow:**
1. User reports phone usage in `PhoneDailyLog`
2. iOS companion fetches actual Screen Time → `IosScreenTimeDaily`
3. `TruthService.evaluateTruth()` compares (5-min tolerance)
4. Status: `match` | `mismatch` | `missing_report` | `missing_verification`
5. If mismatch: Create `TruthViolation` and apply XP penalty (-2 XP/min delta)

**Service**: `lib/truth.service.ts`

#### Boss System (Task Gamification)
Converts large tasks into HP bars defeated through phone-free blocks.

**Difficulty Tiers:**
- Easy: 60-120 HP
- Medium: 120-240 HP
- Hard: 240-360 HP
- Brutal: 360-600 HP

**Time-of-Day Multipliers (circadian optimization):**
- Morning (4am-12pm): 1.2x (peak cortisol/focus)
- Afternoon (12pm-6pm): 1.0x
- Evening (6pm-4am): 0.8x

**Service**: `lib/boss.service.ts`

#### Build System (Long-Form Projects)
Convert XP into long-term project progress (e.g., Cathedral blueprint).

**Flow:**
1. Load blueprint JSON from `public/blueprints/cathedral_cologne_v1.json`
2. User creates `UserProject` linked to blueprint
3. Allocate XP points to sequential segments via `BuildService.applyBuildPoints()`
4. Track `UserProjectProgress` per segment
5. Record `BuildEvent` with source attribution

**Service**: `lib/build.ts`

### Service Layer (`lib/`)

**Core Services:**
- `xp.service.ts` - XP event processing with HP modulation
- `hp.service.ts` - Health Points from Energy Equation
- `boss.service.ts` - Boss Mode gamification
- `streak.service.ts` - Daily persistence tracking
- `truth.service.ts` - Verification and honesty enforcement
- `protocol.service.ts` - Morning protocol (wake time, light, water, caffeine)
- `identity.service.ts` - Title progression and scroll alignment
- `build.ts` - Long-form project management
- `audit.service.ts` - Immutable append-only event log
- `taskTypes.service.ts` - User-customizable task types with XP multipliers

**Utilities:**
- `policyEngine.ts` - Game rules engine
- `getUserSettingsServer.ts` - Server-side settings fetch with User row auto-creation
- `useUserSettings.ts` - Client-side React hook for settings
- `rate-limit.ts` - In-memory rate limiter (TODO: replace with Redis/Upstash)

**Verification:**
- `verification/iosScreentime.service.ts` - iOS Screen Time integration

### Authentication

**Files:**
- `lib/supabase/auth.ts` - API route helpers (`getAuthUserId()`, `requireAuthUserId()`)
- `lib/supabase/server.ts` - Server client factory (`createClient()`, `getCurrentUser()`, `requireCurrentUser()`)
- `lib/supabase/client.ts` - Browser client factory
- `lib/supabase/middleware.ts` - Session refresh middleware (`updateSession()`)
- `lib/supabase/requireUser.ts` - Flexible user extraction (session or Bearer token)
- `lib/supabase/profiles.server.ts` - Supabase profile sync

**Pattern:**
- Supabase Auth (Google/OAuth) → Cookies (browser) → Session Management
- API routes use `requireAuthUserId()` for strict enforcement
- Server Components use `requireCurrentUser()`
- iOS verification endpoints accept `Authorization: Bearer <access_token>`

### Database (Prisma)

**Schema**: `prisma/schema.prisma`

**Core Models:**
- `User` - User profile with XP/HP/streak state + settings JSON
- `PhoneDailyLog` - Self-reported daily phone usage
- `UsageViolation` - Over-limit penalties
- `Urge` - Logged scroll impulses with micro-task alternatives
- `PhoneFreeBlock` - Phone abstinence tracking
- `Task` - User tasks with type categorization
- `TaskType` - Per-user task categories with XP/build multipliers
- `BossBlock` - Boss Mode task breakdowns
- `XpEvent` - Immutable XP ledger (single source of truth)
- `StreakHistory` - Daily persistence records
- `SleepLog` - Sleep data for HP calculation
- `DailyProtocol` - Morning protocol completion
- `StakeCommitment` - Weekly accountability stakes
- `AuditEvent` - Truth-critical action log
- `IosScreenTimeConnection` - iOS verification settings
- `IosScreenTimeDaily` - iOS Screen Time verified minutes
- `TruthCheckDaily` - Truth evaluation records
- `TruthViolation` - Honesty penalty events
- `UserProject` - Long-form project tracking
- `BlueprintSegment` - Project blueprint definitions
- `UserProjectProgress` - Per-segment progress
- `BuildEvent` - Build point allocation history

**Known Issues:**
- Several models use `@unique` on `date` without `userId` (e.g., `PhoneDailyLog`, `SleepLog`, `DailyProtocol`, `StreakHistory`). This will conflict across users in multi-user scenarios.

## UI/UX Conventions

**Design Philosophy**: Calm, authoritative, austere, and consistent. This is a tool for discipline, not entertainment.

### Hard Rules from UI_CONVENTIONS.md

1. **Semantic Colors Only** (No decorative palette)
   - Green (`positive`): Earned success, completed actions
   - Red (`negative`): Violations, penalties
   - Amber (`warning`): At-risk status
   - Everything else: Neutral (bg, surface, text, muted, border)

2. **No Emoji or Decorative Icons** (except welcome screen)

3. **Layout Pattern: State → Action → Consequence**
   - State: Immutable current status (XP, Level, HP, Streak)
   - Action: Today's obligations
   - Consequence: Ledger and outcomes

4. **Component Usage** (Only use these 4 core components)
   - `<Button>` - Variants: `primary`, `secondary`, `ghost`, `destructive`
   - `<Surface>` - Consistent card/section container
   - `<ProgressBar>` - Variants: `xp`, `hp`, `boss`
   - `<ViolationBanner>` - Severities: `warning`, `negative`

5. **Typography**
   - All stat numbers: `tabular-nums` utility class
   - No italic except for branded copy (affirmations)

6. **No "Softening" Failures**
   - Violations and penalties must remain **prominent**
   - `ViolationBanner` is **always** heavier visually than success states

**What NOT to Do:**
- ❌ Add new XP/streak/HP authorities (`XpEvent` is single source of truth)
- ❌ Schema changes (Prisma) without explicit plan approval
- ❌ Decorative gradients (only bg/surface tokens)
- ❌ Celebration animations
- ❌ "Nice job!" or "Great work!" copy (outcomes are factual)
- ❌ Emoji outside welcome screen
- ❌ Ad hoc `className` strings (use UI components)

## File Structure

```
app/
├── mobile/                    # Main dashboard
├── phone/                     # Phone usage tracking (log, urge, block)
├── tasks/                     # Task management
├── build/                     # Cathedral build progress
├── ledger/                    # Audit ledger UI
├── settings/                  # Policy/settings editor
│   ├── task-types/           # Task type management
│   └── iphone-verification/  # iOS connection settings
├── stakes/                    # Weekly commitments
├── sleep/                     # Sleep logging
├── protocol/                  # Morning protocol
├── boss/                      # Boss creation/detail
├── login/                     # Login UI
└── api/                       # API routes (all require auth)
    ├── user/stats/           # User stats
    ├── phone/                # Phone tracking endpoints
    ├── tasks/                # Task CRUD
    ├── task-types/           # Task type CRUD
    ├── build/                # Build system
    ├── audit/                # Audit ledger
    ├── events/               # Microtask events
    ├── stakes/               # Stake management
    ├── sleep/                # Sleep logging
    ├── protocol/             # Morning protocol
    ├── boss/                 # Boss mode
    ├── verification/ios/     # iOS Screen Time verification
    └── cron/                 # Scheduled jobs (stakes evaluation)

lib/
├── *.service.ts              # Domain services
├── policyEngine.ts           # Game rules engine
├── getUserSettingsServer.ts  # Server-side settings
├── useUserSettings.ts        # Client-side settings hook
├── supabase/                 # Auth utilities
└── verification/             # iOS Screen Time integration

components/
└── ui/                       # Core UI components (Button, Surface, ProgressBar, ViolationBanner)

prisma/
├── schema.prisma             # Database schema
├── migrations/               # Migration history
└── seed.ts                   # Seed data

public/
├── manifest.json             # PWA manifest
└── blueprints/               # Project blueprint JSON files

ios-companion/                # iOS companion app (Xcode project)
```

## Important Patterns

### Server-Side Data Fetching

Always use Server Components for data fetching when possible:

```typescript
// app/dashboard/page.tsx (Server Component)
import { requireCurrentUser } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const stats = await prisma.user.findUnique({
    where: { id: user.id },
    select: { totalXp: true, currentLevel: true, currentHp: true }
  });

  return <Dashboard stats={stats} />;
}
```

### API Route Pattern

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUserId } from '@/lib/supabase/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const userId = await requireAuthUserId(); // Throws if unauthenticated

  const data = await prisma.user.findUnique({
    where: { id: userId }
  });

  return NextResponse.json(data);
}
```

### Settings Usage

```typescript
// Server-side
import { getUserSettingsServer } from '@/lib/getUserSettingsServer';
import { createEngine } from '@/lib/policyEngine';

const settings = await getUserSettingsServer(userId);
const engine = createEngine(settings);
const isEnabled = engine.isFeatureEnabled('phoneFreeBlocks');

// Client-side
import { useUserSettings } from '@/lib/useUserSettings';
import { createEngineFromJson } from '@/lib/policyEngine';

const { settings, loading, error, updateSettings } = useUserSettings();
const engine = createEngineFromJson(settings);
```

### Creating XP Events

**Always** use `XpService.createXpEvent()` for XP changes:

```typescript
import { XpService } from '@/lib/xp.service';

await XpService.createXpEvent({
  userId,
  type: 'block_complete',
  amount: 30,
  description: 'Completed 30-minute phone-free block',
  source: 'phone_free_block',
  entityType: 'PhoneFreeBlock',
  entityId: block.id,
  dedupeKey: `block:${block.id}` // Prevents double-counting
});
```

### Boss Attack Flow

```typescript
import { BossService } from '@/lib/boss.service';

// After completing a phone-free block
const result = await BossService.attackBoss({
  userId,
  bossId,
  blockId,
  blockDuration: 30,
  completedAt: new Date()
});

// Returns: { damage, totalDamage, remainingHp, bossDefeated, xpAwarded }
```

## Testing

- **Framework**: Vitest
- **Run tests**: `npm run test`
- **Test files**: Co-located with source files or in `__tests__/` directories

## Deployment

- **Platform**: Vercel
- **Cron jobs**: Configured in `vercel.json` (e.g., stake evaluation)
- **Environment variables**: See `.env.example`
  - `DATABASE_URL` - Postgres connection
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
  - `CRON_SECRET` - Cron endpoint protection

## iOS Companion App

- **Location**: `ios-companion/DisciplineDungeonIOSCompanion.xcodeproj`
- **Purpose**: Fetch iOS Screen Time data and upload to web backend
- **Open in**: Xcode
- **Endpoints**:
  - `PATCH /api/verification/ios/connection` - Update connection settings
  - `POST /api/verification/ios/upload` - Upload Screen Time data
  - `GET /api/verification/truth` - Get truth check status

## Additional Documentation

- `README.md` - Comprehensive feature list and project overview
- `QUICKSTART.md` - Startup script and local workflow
- `UI_CONVENTIONS.md` - Detailed UI/UX rules and component usage
- `AGENTS.md` - AI team roles (Architect, Designer, Engineer, QA)
- `docs/ios-verification.md` - iOS verification implementation details (if exists)
- `docs/supabase-auth-checklist.md` - Supabase Auth setup checklist

## 🤖 The AI Team (Agent Roster)
You have 4 specialized modes. You MUST read the specific prompt file when a mode is invoked.

### @Architect (Strategy & Spec)
- **Trigger:** When user asks for "spec", "plan", or uses `@Architect`.
- **Action:** READ `/Users/jackgoldstein/Documents/AI/agents/prompts/architect.md`.
- **Goal:** Output strict JSON specifications.

### @Designer (UI/UX)
- **Trigger:** When user asks for "design", "ui", "css", or uses `@Designer`.
- **Action:** READ `/Users/jackgoldstein/Documents/AI/agents/prompts/designer.md`.
- **Goal:** Enforce "Aether-Scroll" theme (Void/Scroll/Blood tokens).

### @Engineer (Code)
- **Trigger:** When user asks for "build", "refactor", "fix", or uses `@Engineer`.
- **Action:** READ `/Users/jackgoldstein/Documents/AI/agents/prompts/engineer.md`.
- **Goal:** Write production-ready code. No placeholders.

### @QA (Test)
- **Trigger:** When user asks for "test", "verify", or uses `@QA`.
- **Action:** READ `/Users/jackgoldstein/Documents/AI/agents/prompts/qa.md`.
- **Goal:** Write Playwright/Vitest suites.

## ⚡️ Slash Commands
- `/spec` -> Act as @Architect
- `/design` -> Act as @Designer
- `/build` -> Act as @Engineer
- `/test` -> Act as @QA
