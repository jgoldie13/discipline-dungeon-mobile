# Tier 0 Foundation - Implementation Status

## ✅ COMPLETED (This Session)

### 1. XP Event Ledger & Domain Model
**Status:** ✅ Complete

**What was built:**
- `XpEvent` model: Source of truth for all XP changes
- `StreakHistory` model: Daily streak state persistence
- User model extended with: `totalXp`, `currentLevel`, `currentStreak`, `longestStreak`, `lastStreakDate`

**Database Migration:** `20251202014908_add_xp_event_ledger_and_streaks`

### 2. XP Service - Centralized Business Logic
**Status:** ✅ Complete

**File:** `/lib/xp.service.ts`

**What it does:**
- **Unified XP meaning:** 1 XP = 1 minute of disciplined behavior
- **Standardized rewards:**
  - Phone-free blocks: 1 XP/min
  - Urge resist: 15 XP (assumes ~15 min saved)
  - Exposure tasks: 120 XP
  - Job search: 60 XP
  - Habits: 1 XP/min (capped at 60)
- **Penalties:**
  - Violations: -2 XP per minute over limit
  - Lying (RescueTime catches you): -100 XP
- **Level calculation:** `floor(sqrt(totalXp) / 3)`
- **Milestones:** 1k, 5k, 10k, 50k XP
- **Pure functions:** All XP logic is testable, no DB coupling

**Key Functions:**
```typescript
XpService.calculateBlockXp(durationMin)
XpService.calculateUrgeXp()
XpService.calculateTaskXp(type, durationMin?)
XpService.calculateLevel(totalXp)
XpService.createEvent({...}) // Records XP event + updates user total
XpService.getXpBreakdown(userId, startDate, endDate)
```

### 3. Streak Service - Daily Streak Management
**Status:** ✅ Complete

**File:** `/lib/streak.service.ts`

**What it does:**
- Evaluates daily performance (under limit? violations?)
- Creates `StreakHistory` entries
- Updates user's `currentStreak`, `longestStreak`, `lastStreakDate`
- Breaks streaks on violations or going over limit
- Provides weekly performance summaries

**Key Functions:**
```typescript
StreakService.evaluateDailyPerformance(userId, date, {underLimit, violationCount})
StreakService.getCurrentStreak(userId)
StreakService.getWeeklyPerformance(userId, startDate)
```

### 4. API Refactoring - All XP Now Goes Through Ledger
**Status:** ✅ Complete

**Files Modified:**
- `/app/api/phone/block/route.ts` - Now uses `XpService.createEvent()` on block completion
- `/app/api/phone/urge/route.ts` - Now records XP events for urge resistance
- `/app/api/tasks/[id]/complete/route.ts` - Task XP goes through service
- `/app/api/user/stats/route.ts` - Returns XP breakdown from ledger + streak info

**New API Response Structure:**
```typescript
{
  stats: {
    phoneUsage: {...},
    urgesResisted: number,
    phoneFreeBlocks: number,

    // NEW: XP System
    xp: {
      today: number,          // XP earned today
      total: number,          // Lifetime XP
      level: number,          // Current level
      hoursReclaimed: number, // total XP / 60
      nextMilestone: {
        xp: number,
        label: string,
        remaining: number
      }
    },

    // NEW: XP Breakdown (from ledger)
    xpBreakdown: {
      blocks: number,
      urges: number,
      tasks: number,
      penalties: number
    },

    // NEW: Streak System
    streak: {
      current: number,
      longest: number,
      lastDate: Date
    }
  }
}
```

---

## 🚧 REMAINING WORK

### 5. Phone Logging with Streak Evaluation
**Status:** ⏸️ Not Started

**What needs to be done:**
When user logs daily phone usage at `/phone/log`, the API should:
1. Check if usage > limit
2. Call `StreakService.evaluateDailyPerformance()`
3. If over limit: create `UsageViolation` + XP penalty event
4. Return updated streak status

**File to modify:** `/app/api/phone/log/route.ts`

**Pseudocode:**
```typescript
// In POST /api/phone/log
const overLimit = socialMediaMin > limitMin
const violation = overLimit ? socialMediaMin - limitMin : 0

// Evaluate streak
await StreakService.evaluateDailyPerformance(userId, today, {
  underLimit: !overLimit,
  violationCount: overLimit ? 1 : 0
})

if (overLimit) {
  // Create violation
  await prisma.usageViolation.create({...})

  // Apply XP penalty
  const penalty = XpService.calculateViolationPenalty(violation)
  await XpService.createEvent({
    type: 'violation_penalty',
    delta: penalty, // negative
    description: `Went ${violation} min over limit`
  })
}
```

### 6. Scheduled Stake Evaluation (Cron)
**Status:** ⏸️ Not Started

**What needs to be done:**
- Wire `/api/stakes/evaluate` to run automatically every Friday evening
- Make it idempotent (safe to call multiple times)
- Use Next.js cron jobs or Vercel cron

**Options:**
1. **Vercel Cron** (recommended for production):
   - Add `vercel.json` with cron schedule
   - Endpoint: `GET /api/cron/evaluate-stakes`

2. **Development:** Manual trigger for now

**File to create:** `/app/api/cron/evaluate-stakes/route.ts`

**Example `vercel.json`:**
```json
{
  "crons": [{
    "path": "/api/cron/evaluate-stakes",
    "schedule": "0 20 * * 5"  // 8 PM every Friday
  }]
}
```

### 7. Dashboard UI Updates
**Status:** ⏸️ Not Started

**What needs to be done:**
Update `/app/mobile/page.tsx` to display:

**XP Section:**
```tsx
<div>
  <h2>Level {stats.xp.level}</h2>
  <p>Total XP: {stats.xp.total} (≈ {stats.xp.hoursReclaimed} hours reclaimed)</p>
  <p>Today: +{stats.xp.today} XP</p>
  {stats.xp.nextMilestone && (
    <p>Next milestone: {stats.xp.nextMilestone.label}
       ({stats.xp.nextMilestone.remaining} XP away)</p>
  )}
</div>
```

**Streak Section:**
```tsx
<div>
  <h3>🔥 Current Streak: {stats.streak.current} days</h3>
  <p>Longest: {stats.streak.longest} days</p>
</div>
```

**Design principles:**
- Show XP meaning clearly: "1 XP = 1 minute reclaimed"
- Make streak prominent: Big emoji, bold number
- Show daily XP target vs. actual (to be added)

### 8. XP Decay Mechanism
**Status:** ⏸️ Not Started (Lower Priority)

**What it would do:**
- Lose 10% of XP per day you don't log any activity
- Makes XP represent "recent discipline" not "historical wins"
- Run via cron job

**Implementation:**
```typescript
// In daily cron job
const lastActivityDate = await getLastActivityDate(userId)
const daysSinceActivity = getDaysDiff(lastActivityDate, today)

if (daysSinceActivity > 1) {
  const decayAmount = Math.floor(user.totalXp * 0.1)
  await XpService.createEvent({
    type: 'decay',
    delta: -decayAmount,
    description: `Daily XP decay: ${daysSinceActivity} days inactive`
  })
}
```

**Consideration:** This might be too harsh. Test first.

### 9. Unit Tests
**Status:** ⏸️ Not Started

**What to test:**
- `XpService.calculateBlockXp()` - Correct XP for various durations
- `XpService.calculateTaskXp()` - All task types
- `XpService.calculateLevel()` - Level formula accuracy
- `StreakService.evaluateDailyPerformance()` - Streak logic
  - Consecutive days
  - Broken streaks
  - Edge cases (first day, missed days)

**Setup:**
```bash
npm install --save-dev jest @types/jest ts-jest
```

**Example test:** `/lib/__tests__/xp.service.test.ts`
```typescript
import { XpService } from '../xp.service'

describe('XpService', () => {
  it('calculates block XP correctly', () => {
    expect(XpService.calculateBlockXp(60)).toBe(60)
    expect(XpService.calculateBlockXp(120)).toBe(120)
  })

  it('calculates levels correctly', () => {
    expect(XpService.calculateLevel(0)).toBe(0)
    expect(XpService.calculateLevel(100)).toBe(3)
    expect(XpService.calculateLevel(10000)).toBe(33)
  })
})
```

---

## 🎯 Recommended Implementation Order

1. **Phone logging streak evaluation** (30 min)
   - Immediate value: Streaks start working

2. **Dashboard UI updates** (1 hour)
   - Makes XP/streaks visible and meaningful

3. **Scheduled stake evaluation** (1 hour)
   - Productionizes the stakes system

4. **Unit tests** (2 hours)
   - Ensures correctness before adding more features

5. **XP decay** (optional, 1 hour)
   - Only if you want the extra pressure

---

## 📝 Testing the Implementation

### Manual Testing Steps

1. **Complete a phone-free block:**
   ```
   - Go to /phone/block
   - Complete a 60-min block
   - Check /api/user/stats
   - Should see: +60 XP, level updated, hours reclaimed
   ```

2. **Resist an urge:**
   ```
   - Go to /phone/urge
   - Log an urge
   - Check stats
   - Should see: +15 XP
   ```

3. **Complete a task:**
   ```
   - Go to /tasks
   - Complete an exposure task
   - Check stats
   - Should see: +120 XP, possibly level up
   ```

4. **Check XP ledger:**
   ```bash
   sqlite3 prisma/dev.db "SELECT * FROM XpEvent ORDER BY createdAt DESC LIMIT 10"
   ```

5. **Check user state:**
   ```bash
   sqlite3 prisma/dev.db "SELECT totalXp, currentLevel, currentStreak FROM User"
   ```

---

## 🔧 Configuration & Constants

All XP rewards/penalties are defined in `/lib/xp.service.ts` as `XP_CONFIG`.

To adjust rewards:
```typescript
export const XP_CONFIG = {
  URGE_RESIST: 20,  // Change from 15 to 20
  TASK_EXPOSURE: 150, // Make exposure tasks worth more
  // etc.
}
```

This makes the system easy to tune based on behavioral feedback.

---

## 🚀 Next Session Priorities

If continuing this work:
1. Implement phone logging streak evaluation
2. Update dashboard UI to show XP/streaks prominently
3. Test the entire flow end-to-end
4. Deploy to production (push to main, merge worktree)

The foundation is solid. The rest is wiring + UI.
