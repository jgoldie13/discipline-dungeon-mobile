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

## 🚀 Quick Start

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
- **Persistent Storage** - All data saved to SQLite database

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
  - Three task types:
    - 🎯 Exposure (100 XP) - Face your fears
    - 💼 Job Search (50 XP) - Applications, interviews
    - 🔄 Habit (variable XP) - Daily habits with custom durations
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
- **User** - Settings and daily limits
- **PhoneDailyLog** - Manual usage tracking
- **Urge** - Logged cravings with triggers and replacements
- **PhoneFreeBlock** - Time-locked container sessions
- **Task** - Exposure tasks, job search, habits
- **UsageViolation** - Automated penalty tracking
- **MicroTask** - Library of replacement activities
- **StakeCommitment** - Weekly stakes with manual payment tracking

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
- ✅ Manual payment flow (`/stakes/payment`)
  - If FAIL: Shows "Donate $[amount] to [anti-charity]" screen
  - Provides donation link
  - Honor-based confirmation: "I Paid" OR "I Cheated"
  - Optional screenshot upload for proof
  - No automated enforcement (trust-based system)

### Phase 3: Automated Tracking (NEXT UP)

**Priority 1: RescueTime Integration**
- [ ] Auto-sync phone usage daily
- [ ] Compare reported vs actual (catch dishonesty)
- [ ] Auto-create violations for discrepancies
- [ ] Display truth on dashboard

**Priority 2: Email Shame Reports**
- [ ] Weekly summary with violations
- [ ] Stake outcomes
- [ ] Streak status
- [ ] Optional CC to accountability partner

### Phase 4: Physical Forcing Functions
- [ ] Photo verification system (empty phone container)
- [ ] Integration with kSafe/Kitchen Safe time-locked container
- [ ] Enhanced phone-free block rewards and streaks

### Phase 5: Social Accountability
- [ ] Accountability partner system
- [ ] Daily check-ins via email/SMS
- [ ] Partner verification of phone-free claims
- [ ] Violation challenges and public shame boards

### Phase 6: Analytics & Intelligence
- [ ] Weekly/monthly trend charts
- [ ] Pattern analysis (when do you violate most?)
- [ ] LLM coach for personalized interventions
- [ ] Predictive urge warnings

## 🎨 Design Philosophy

**Brutal Honesty Over Comfort**
- No gamification without consequences
- Real penalties for violations
- Track everything, hide nothing
- Your phone is the enemy

**Replacement Over Restriction**
- Can't block Instagram on iOS (Apple won't allow it)
- Instead: make scrolling cost you (XP, money, streaks)
- Make not-scrolling rewarding (micro-tasks, progress, XP)
- Build better habits, don't fight willpower

**Manual First, Automate Later**
- Start with manual logging to build awareness
- Add automation when habits are forming
- Lying to yourself in manual logs? You're only hurting yourself

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** SQLite with Prisma ORM
- **PWA:** @ducanh2912/next-pwa
- **Styling:** Tailwind CSS 4
- **Deployment:** Vercel (recommended)

## 📝 Key Files

### Frontend Pages
- `/app/mobile/page.tsx` - Main mobile dashboard with stats
- `/app/phone/log/page.tsx` - Daily usage logging
- `/app/phone/urge/page.tsx` - Urge logging with micro-tasks (4-step flow)
- `/app/phone/block/page.tsx` - Phone-free block timer
- `/app/tasks/page.tsx` - Task management (exposure, job search, habits)
- `/app/stakes/create/page.tsx` - Create new weekly stake commitment
- `/app/stakes/current/page.tsx` - View active stake with progress
- `/app/stakes/payment/page.tsx` - Manual payment confirmation flow

### API Routes
- `/app/api/user/stats/route.ts` - GET dashboard statistics (XP, blocks, tasks, urges)
- `/app/api/phone/log/route.ts` - POST/GET daily phone usage
- `/app/api/phone/urge/route.ts` - POST/GET urge logging
- `/app/api/phone/block/route.ts` - POST/GET phone-free blocks
- `/app/api/tasks/route.ts` - POST/GET tasks
- `/app/api/tasks/[id]/complete/route.ts` - POST complete task
- `/app/api/stakes/route.ts` - POST create stake, GET current stake with progress
- `/app/api/stakes/evaluate/route.ts` - POST evaluate week's performance
- `/app/api/stakes/[id]/route.ts` - GET individual stake by ID
- `/app/api/stakes/[id]/confirm-payment/route.ts` - POST confirm payment or cheating

### Database & Config
- `/prisma/schema.prisma` - Full database schema (8 models including StakeCommitment)
- `/prisma/seed.ts` - Seeds 18 micro-tasks
- `/lib/prisma.ts` - Prisma client configuration
- `/public/manifest.json` - PWA manifest
- `/next.config.ts` - PWA and Turbopack configuration

## 🚧 Known Issues

- [ ] No authentication system yet (single-user for now)
- [ ] Streak tracking logic needs implementation
- [ ] No weekly/monthly trend charts yet
- [ ] Stakes evaluation needs to be scheduled (currently manual trigger)

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

- All data stored locally in SQLite
- No external tracking (yet)
- RescueTime integration (Phase 2) will require API key
- Stripe integration (Phase 3) for payments only

## 📄 License

This is a personal accountability tool. Use it to fix your life.

## 🤝 Contributing

This is a personal project, but if you're building something similar, feel free to fork and adapt.

## 🎉 Current Status

**Phase 1 & 2 COMPLETE and WORKING!**

The PWA is fully functional on mobile devices:
- ✅ All core tracking pages working with data persistence
- ✅ Database saving all actions (urges, phone usage, tasks, blocks, stakes)
- ✅ Real-time stats display on dashboard with proper XP aggregation
- ✅ Weekly stakes system with manual payment flow (honor-based)
- ✅ Installable on iPhone home screen
- ✅ **Currently running:** `http://192.168.0.102:3002/mobile`

**Recent Fixes:**
- ✅ XP now properly aggregated from all sources (blocks, urges, tasks)
- ✅ Date filtering fixed to show only today's stats
- ✅ Phone-free blocks saving correctly to database

**Next up:** RescueTime integration for automated phone usage tracking

## ⚠️ Disclaimer

This app uses shame, penalties, and real financial consequences as motivational tools. It's designed to be harsh because that's what works for behavior change. If you can't handle losing money or having your streaks reset, this isn't for you.

Your phone addiction is costing you more than this app ever will.
