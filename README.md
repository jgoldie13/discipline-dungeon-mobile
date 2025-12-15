# Discipline Dungeon

**A Progressive Web App to defeat phone addiction through accountability and micro-tasks.**

## 🎯 What This Is

Your phone is the problem. Social media scrolling is stealing your time and killing your discipline.

This app helps you:
- **Track social media usage** with manual daily logging
- **Log urges** when you want to scroll and get micro-task alternatives instead
- **Build streaks** and earn XP for phone-free blocks
- **Complete exposure tasks** to fight procrastination and anxiety
- **Face real consequences** for going over your daily limit

## 🚀 Quick Start (Terminal)

### Easy Way - Use the Startup Script

```bash
cd ~/Desktop/Projects/Discipline\ Dungeon/discipline-dungeon-mobile
./start-server.sh
```

The script automatically handles dependencies, database setup, and starts the server on port 3002.

### Manual Way

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up the database:**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   npx prisma db seed
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open on your phone:**
   - Development machine: `http://localhost:3002/mobile`
   - **Mobile device (same WiFi):** `http://192.168.0.102:3002/mobile` ← **USE THIS**
   - Add to home screen for the full PWA experience

See `QUICKSTART.md` for detailed instructions on terminal startup and database commands.

## 📱 PWA Installation

### On iPhone (iOS):
1. Open Safari and navigate to the app
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"
5. The app icon will appear on your home screen

### On Android:
1. Open Chrome and navigate to the app
2. Tap the three-dot menu
3. Tap "Add to Home Screen" or "Install App"
4. Tap "Add"

## 🏗️ Current Features

### ✅ Phase 1: Manual Tracking (COMPLETE)

#### Core PWA Features
- **PWA Configuration** - Installable on home screen with custom icons
- **Mobile-optimized UI** - Built for phone-first experience
- **Real-time Dashboard** - `/mobile` - Live stats, progress tracking, quick actions
- **Persistent Storage** - All app/game state stored in Postgres via Prisma

#### Phone Addiction Features
- **Phone Usage Logging** (`/phone/log`) - Manual daily social media time tracking
  - Set your daily limit (default: 30 minutes)
  - Get violation warnings when you exceed
  - Automatic penalty creation in database

- **Urge Logging with Micro-tasks** (`/phone/urge`) - 4-step flow when you want to scroll:
  1. Log what triggered the urge (boredom, anxiety, habit, procrastination)
  2. Choose from 18 micro-task alternatives (30sec-2min activities)
  3. Optional timer to complete the task
  4. Earn 10 XP for resisting
  - Categories: Physical, Social, Productive, Mindful
  - Database of micro-tasks seeded automatically

- **Phone-Free Blocks** (`/phone/block`) - Time-based phone abstinence tracking
  - Duration presets: 30, 60, 90, 120, 180, 240 minutes
  - XP rewards: 1 XP per minute
  - Track in database for accountability

#### Task Management
- **Exposure Tasks** (`/tasks`) - Full CRUD task system
  - Per-user **Task Types** with XP rules (base XP, per-minute XP, caps, multipliers)
  - Configure task types at `/settings/task-types`
  - Create, complete, and view tasks
  - Active/completed task separation
  - XP rewards on completion

#### Consequence System
- Violations automatically penalize you:
  - Lose XP for the day
  - Streak resets to 0
  - Violation logged with penalty details
  - All stored in `UsageViolation` table

### 📋 Schema & Database
Full Prisma schema includes:
- **User** - Settings, daily limits, XP totals, streak state, current HP
- **PhoneDailyLog** - Manual usage tracking
- **Urge** - Logged cravings with triggers and replacements
- **PhoneFreeBlock** - Time-locked container sessions (with boss attack support)
- **Task** - Exposure tasks, job search, habits, boss battles
- **BossBlock** - Junction table linking phone-free blocks to boss attacks
- **UsageViolation** - Automated penalty tracking
- **MicroTask** - Library of replacement activities
- **StakeCommitment** - Weekly stakes with manual payment tracking
- **XpEvent** - Event ledger (source of truth for all XP changes)
- **StreakHistory** - Daily streak persistence and tracking
- **SleepLog** - Sleep quality tracking for HP calculation
- **MorningProtocol** - Morning routine completion tracking
- **IdentityLevel** - Identity-based progression system

## 🗺️ Roadmap

### ✅ Phase 2: Stakes Domain (COMPLETE)

**Stakes System with Manual Payment Flow**
- ✅ Weekly stake commitment UI (`/stakes/create`)
  - Create commitment for upcoming Monday-Sunday
  - Set custom stake amount (e.g., $100)
  - Define success criteria: max social media min/day, min exposure tasks, min phone-free blocks
  - Choose anti-charity target (default: Trump 2024 Campaign)
- ✅ Current stake tracking (`/stakes/current`)
  - Real-time progress display for all three goals
  - Pass/fail status indicator
  - Days remaining in commitment period
- ✅ Automatic evaluation logic (`/api/stakes/evaluate`)
  - Compares actual logs vs goals across the week
  - Declares PASS or FAIL based on criteria
  - Stores outcome in database
- ✅ Scheduled stake evaluation (`/api/cron/evaluate-stakes`)
  - Runs every Friday at 8 PM via Vercel cron
  - Automatically evaluates all unevaluated stakes
  - Production-ready with auth via CRON_SECRET
- ✅ Manual payment flow (`/stakes/payment`)
  - If FAIL: Shows "Donate $[amount] to [anti-charity]" screen
  - Provides donation link
  - Honor-based confirmation: "I Paid" OR "I Cheated"
  - Optional screenshot upload for proof
  - No automated enforcement (trust-based system)

### ✅ Tier 0: XP & Streak Foundation (COMPLETE)

**Event-Sourced XP System**
- ✅ XpEvent ledger - Source of truth for all XP changes
- ✅ XpService - Centralized business logic
  - Unified XP meaning: 1 XP = 1 minute of disciplined behavior
  - Standardized rewards: blocks (1 XP/min), urges (15 XP), tasks (60-120 XP)
  - Penalties: violations (-2 XP/min), lying (-100 XP)
  - Level calculation: floor(sqrt(totalXp) / 3)
  - Milestones: 1k, 5k, 10k, 50k XP
- ✅ StreakService - Daily streak tracking
  - Automatic evaluation on phone usage logging
  - Persists streak history for analytics
  - Breaks streaks on violations or going over limit
- ✅ Phone logging with streak evaluation
  - Automatic XP penalties for violations
  - Returns streak status in API response
- ✅ Dashboard UI updates
  - Prominent XP & Level display with sword icon ⚔️
  - Streak display with fire emoji 🔥
  - Today's XP breakdown by source
  - Clear XP meaning: "1 XP = 1 minute of disciplined behavior"

### ✅ Phase 2A: Sleep/HP System (COMPLETE)

**HP as Sleep Quality Score**
- ✅ Sleep logging (`/sleep/log`) - Track bedtime, wake time, subjective restedness
- ✅ HP calculation (HpService) - Research-backed algorithm:
  - Base HP from sleep duration (60-90 HP for 7-9 hours)
  - Bonus for waking on time (+10 HP within 15min of target)
  - Penalty for waking late (-1 HP per 10min variance)
  - Subjective restedness multiplier (0.8x to 1.2x)
- ✅ Daily HP decay - Lose 10 HP every 24 hours without logging sleep
- ✅ HP display on dashboard - Visual HP bar with color coding
- ✅ Identity-based progression - HP unlocks deeper work capacity

### ✅ Phase 2B: Morning Protocol (COMPLETE)

**Atomic Habits Morning Routine**
- ✅ Morning protocol system (`/protocol/start`)
  - 4-step checklist: Hydrate, Sunlight, Movement, Plan Day
  - Each step logs completion with timestamp
  - XP rewards: 60 XP for perfect execution (all 4 steps)
  - Partial credit: 15 XP per completed step
- ✅ Protocol tracking (ProtocolService)
  - Validates execution order (must complete in sequence)
  - Tracks timing between steps
  - Stores completion records in database
- ✅ Dashboard integration
  - "Start Morning Protocol" quick action
  - Today's protocol status display
  - Streak tracking for consecutive perfect mornings

### ✅ Phase 2C: Boss Battles & Time-of-Day Logic (COMPLETE)

**Gamified Deep Work Sessions**
- ✅ Boss battle system (`/boss/create`, `/boss/[id]`)
  - Turn large tasks (exams, papers, projects) into HP bars
  - Difficulty tiers: Easy (60-120 HP), Medium (120-240 HP), Hard (240-360 HP), Brutal (360-600 HP)
  - AI-suggested HP estimates based on task keywords
  - Massive XP rewards on defeat: 100-1000 XP depending on difficulty
- ✅ Time-of-day damage multipliers (BossService)
  - Morning (06:00-12:00): 1.2x damage (peak cognitive performance)
  - Afternoon (12:00-18:00): 1.0x damage (normal)
  - Evening (18:00-00:00): 0.8x damage (lower energy)
  - Research-backed (Huberman Lab circadian science)
- ✅ Phone-free block integration (`/phone/block?bossId=xxx`)
  - Attack bosses with focused work sessions
  - Each minute of phone-free work = 1 damage to boss
  - Damage calculation: base damage × time-of-day multiplier
  - Boss defeated → task marked complete + bonus XP
- ✅ Boss tracking
  - Attack history with timestamps and damage dealt
  - Battle stats: total damage, blocks used, avg damage per attack
  - HP bar visualization with color-coded progress
  - Strategy tips and optimal time window recommendations

### Phase 3: Automated Tracking (NEXT UP)

**Priority 1: iPhone Screen Time Verification (MVP)**
- [x] Store iOS-uploaded daily verified minutes snapshots (raw payload preserved)
- [x] Compute truth vs self-report (radical honesty + fairness)
- [x] Deterministic, idempotent XP penalties via XP ledger when mismatch exceeds threshold
- [x] Display Truth in settings + mobile dashboard

**Priority 2: Email Shame Reports**
- [ ] Weekly summary with violations
- [ ] Stake outcomes
- [ ] Streak status
- [ ] Optional CC to accountability partner

### Phase 4: Physical Forcing Functions
- [ ] Photo verification system (empty phone container)
- [ ] Integration with kSafe/Kitchen Safe time-locked container
- [ ] Enhanced phone-free block rewards and streaks

### Phase 5: Social Accountability (Cooperative, Not Punitive)
- [ ] Guild/party system (invite-only, 2-4 members)
- [ ] Shared weekly goals with light collective accountability
- [ ] Daily check-ins via email/SMS
- [ ] Partner support and encouragement features
- [ ] Mutual streak protection (help each other, not shame)

### Phase 6: Analytics & Intelligence
- [ ] Weekly/monthly trend charts
- [ ] Pattern analysis (when do you violate most?)
- [ ] LLM coach for personalized interventions
- [ ] Predictive urge warnings

## 🎨 Design Philosophy

**Chosen Discipline Over External Control**
- You set limits you choose to honor
- Real consequences you selected to forge yourself
- Track everything, hide nothing - radical honesty with self
- Every action is a vote for who you're becoming

**Replacement Over Restriction**
- Can't block Instagram on iOS (Apple won't allow it)
- Instead: make scrolling cost you (XP, money, streaks)
- Make not-scrolling rewarding (micro-tasks, progress, XP)
- Build identity-based habits, don't rely on willpower alone

**Manual First, Automate Later**
- Start with manual logging to build self-awareness
- Add automation when habits are forming
- Lying to yourself? The system logs it, but you're the one who knows
- Honesty is sacred - it's the foundation of self-mastery

**Autonomy, Competence, Relatedness (SDT)**
- You wield this system as your weapon, not the other way around
- Clear feedback shows your progress and builds competence
- Social features support and encourage, never humiliate

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Auth:** Supabase Auth (identity/session via cookies)
- **Database:** Postgres with Prisma ORM (all app/game state)
- **PWA:** @ducanh2912/next-pwa
- **Styling:** Tailwind CSS 4
- **Deployment:** Vercel (recommended)

## 📝 Key Files

### Frontend Pages
- `/app/mobile/page.tsx` - Main mobile dashboard with stats, HP bar, XP display
- `/app/phone/log/page.tsx` - Daily usage logging
- `/app/phone/urge/page.tsx` - Urge logging with micro-tasks (4-step flow)
- `/app/phone/block/page.tsx` - Phone-free block timer (with boss attack integration)
- `/app/tasks/page.tsx` - Task management (exposure, job search, habits, boss battles)
- `/app/settings/task-types/page.tsx` - Task type configuration (XP/build weighting rules)
- `/app/stakes/create/page.tsx` - Create new weekly stake commitment
- `/app/stakes/current/page.tsx` - View active stake with progress
- `/app/stakes/payment/page.tsx` - Manual payment confirmation flow
- `/app/sleep/log/page.tsx` - Sleep logging (bedtime, wake time, restedness)
- `/app/protocol/start/page.tsx` - Morning protocol 4-step checklist
- `/app/boss/create/page.tsx` - Create boss battle with difficulty and time window
- `/app/boss/[id]/page.tsx` - Boss detail page with attack history and HP bar

### API Routes
- `/app/api/user/stats/route.ts` - GET dashboard statistics (XP, HP, level, streaks, breakdown)
- `/app/api/phone/log/route.ts` - POST/GET daily phone usage (with streak evaluation & XP penalties)
- `/app/api/phone/urge/route.ts` - POST/GET urge logging (creates XP events)
- `/app/api/phone/block/route.ts` - POST/GET phone-free blocks (creates XP events, boss attacks)
- `/app/api/task-types/route.ts` - GET/POST task types
- `/app/api/task-types/[id]/route.ts` - GET/PATCH task type
- `/app/api/tasks/route.ts` - POST/GET tasks (includes boss tasks)
- `/app/api/tasks/[id]/complete/route.ts` - POST complete task (creates XP events)
- `/app/api/stakes/route.ts` - POST create stake, GET current stake with progress
- `/app/api/stakes/evaluate/route.ts` - POST evaluate week's performance
- `/app/api/stakes/[id]/route.ts` - GET individual stake by ID
- `/app/api/stakes/[id]/confirm-payment/route.ts` - POST confirm payment or cheating
- `/app/api/cron/evaluate-stakes/route.ts` - GET automatic stake evaluation (scheduled)
- `/app/api/sleep/route.ts` - POST/GET sleep logs (calculates HP via HpService)
- `/app/api/protocol/route.ts` - POST/GET morning protocol completions
- `/app/api/boss/create/route.ts` - POST create boss task
- `/app/api/boss/suggest/route.ts` - POST get AI-suggested boss difficulty and hours
- `/app/api/boss/[id]/route.ts` - GET boss details with attack history
- `/app/api/boss/attack/route.ts` - POST attack boss with phone-free block

### Database & Config
- `/prisma/schema.prisma` - Full database schema (14 models: Task, PhoneFreeBlock, BossBlock, SleepLog, etc.)
- `/prisma/seed.ts` - Seeds 18 micro-tasks
- `/lib/prisma.ts` - Prisma client configuration
- `/lib/xp.service.ts` - Centralized XP business logic
- `/lib/streak.service.ts` - Daily streak tracking and evaluation
- `/lib/hp.service.ts` - HP calculation from sleep quality
- `/lib/protocol.service.ts` - Morning protocol validation and XP rewards
- `/lib/boss.service.ts` - Boss battle damage calculation and time-of-day logic
- `/lib/identity.service.ts` - Identity-based habit progression system
- `/public/manifest.json` - PWA manifest
- `/next.config.ts` - PWA and Turbopack configuration
- `/vercel.json` - Cron job configuration (stake evaluation)

## 🚧 Known Issues / Future Work

- [ ] No authentication system yet (single-user for now)
- [ ] No weekly/monthly trend charts yet
- [ ] XP decay mechanism (optional - 10% per day inactive)
- [ ] Unit tests for XpService and StreakService

## 💡 Usage Tips

### Daily Workflow

**Morning:**
1. Open `/mobile` on your phone
2. Check yesterday's stats and violations
3. Set or confirm today's social media limit (default: 30 minutes)
4. Review active exposure tasks in `/tasks`

**Throughout the Day:**
- When you feel the urge to scroll:
  1. Open Discipline Dungeon instead of Instagram
  2. Tap "I Want to Scroll" → `/phone/urge`
  3. Log your trigger (boredom, anxiety, habit, procrastination)
  4. Choose and complete a micro-task (30-120 seconds)
  5. Earn 10 XP instead of wasting 30 minutes

**End of Day:**
1. Check your iPhone Screen Time:
   - Settings → Screen Time → See All Activity
   - Add up: Instagram + TikTok + Twitter + any other social apps
2. Log actual usage at `/phone/log`
3. If you're over your limit → violation logged, streak resets
4. If you're under → maintain streak, keep XP

### Be Honest
Manual logging only works if you're truthful. Lying to yourself defeats the purpose. When automated tracking comes (Phase 2), dishonesty will be caught.

### Phone-Free Blocks
For maximum impact:
- Buy a kSafe time-locked container ($50)
- Lock your phone away during focused work
- Track blocks in `/phone/block`
- Earn 1 XP per minute (60 XP/hour)

## 🔐 Privacy

- Supabase Auth provides identity/session cookies
- All app/game state stored in Postgres via Prisma
- No third-party analytics tracking (yet)
- iPhone Screen Time verification uses a native companion app to upload daily aggregates (the web app cannot read Screen Time)
- Stripe integration (Phase 3) for payments only

## 📄 License

This is a personal accountability tool. Use it to fix your life.

## 🤝 Contributing

This is a personal project, but if you're building something similar, feel free to fork and adapt.

## 🎉 Current Status

**Phases 1, 2, 2A, 2B, 2C & Tier 0 COMPLETE!**

The PWA is fully functional with comprehensive discipline framework:
- ✅ All core tracking pages working with data persistence
- ✅ Event-sourced XP system (XpEvent ledger as source of truth)
- ✅ Centralized XP business logic (XpService with standardized rewards)
- ✅ Daily streak tracking with automatic evaluation (StreakService)
- ✅ **Sleep/HP system** - HP calculated from sleep quality, daily decay, visual HP bar
- ✅ **Morning protocol** - 4-step atomic habits routine with XP rewards
- ✅ **Boss battles** - Gamified deep work sessions with time-of-day multipliers
- ✅ Dashboard displaying HP, XP, levels, milestones, and streaks
- ✅ Phone logging with automatic streak evaluation and XP penalties
- ✅ Weekly stakes system with scheduled evaluation (Vercel cron)
- ✅ Installable on iPhone home screen
- ✅ **Terminal startup:** `./start-server.sh` in Desktop folder

**Implementation Highlights:**
- 1 XP = 1 minute of disciplined behavior (unified semantic meaning)
- HP = sleep quality score (60-110 range, research-backed calculation)
- Level calculation: `floor(sqrt(totalXp) / 3)`
- Milestones at 1k, 5k, 10k, 50k XP
- Boss damage: base damage × time-of-day multiplier (morning 1.2x, evening 0.8x)
- Morning protocol: 60 XP for perfect execution (all 4 steps)
- Streaks break on violations or going over social media limit
- XP penalties: -2 XP/min for usage violations; Truth penalties only when both reported + verified exist and mismatch exceeds 5 minutes
- All XP changes tracked in event ledger for full audit trail

**Verification (current):** iPhone Screen Time (native companion upload)

### Verification storage & policy
- Stored data: `IosScreenTimeDaily` snapshots (verifiedMinutes + optional raw JSON) and `TruthCheckDaily` rows
- Fairness: no penalty when verification is missing (`missing_verification`)
- Threshold: `5` minutes
- Penalty formula (policy `v1`): `penaltyXp = -2 * abs(reportedMinutes - verifiedMinutes)`

See `docs/ios-verification.md` for the iOS upload contract.

See implementation docs:
- `TIER0_IMPLEMENTATION.md` - XP/streak system
- `PHASE2A_COMPLETE.md` - Sleep/HP system
- `PHASE2C_COMPLETE.md` - Boss battles & time-of-day logic

## ⚠️ Disclaimer

This app uses consequences you choose - XP penalties, streak resets, and financial stakes - as accountability tools. It's designed to provide honest feedback on the commitments you make to yourself. These are tools you wield to forge the person you want to become.

The system gives you radical transparency and real consequences. Use them wisely. Your phone distraction is already costing you time, focus, and potential. This app helps you see that clearly and take action.
