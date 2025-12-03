# Phase 2A Implementation Complete ✅

**Date:** 2025-12-02
**Status:** Ready for Migration & Testing

---

## Summary

Phase 2A of the Discipline Framework has been successfully implemented. This phase added **Sleep/Wake Tracking and the HP (Health Points) System** - the most impactful feature from the research framework.

HP represents your daily biological capacity for focused work and discipline, calculated from sleep metrics. Low HP reduces XP gains, preventing self-abuse and encouraging sleep prioritization.

---

## Changes Implemented

### Database Schema Extensions ✅

**Modified: `prisma/schema.prisma`**

Added to User model:
```prisma
// Circadian & HP Settings
targetWakeTime          String?  // e.g., "06:00"
targetBedtime           String?  // e.g., "22:30"
wakeWindowMin           Int      @default(15) // ±15 min tolerance

// Current HP State
currentHp               Int      @default(100) // 0-100
lastHpUpdate            DateTime?

// Relations
sleepLogs               SleepLog[]
```

Added new model:
```prisma
model SleepLog {
  id                String   @id @default(cuid())
  userId            String
  date              DateTime @unique // Morning you wake up

  // Sleep window
  bedtime           DateTime
  waketime          DateTime
  sleepDurationMin  Int

  // Quality
  subjectiveRested  Int      // 1-5 scale
  sleepQuality      Int      // 0-100 derived

  // Circadian alignment
  wakeOnTime        Boolean
  wakeVarianceMin   Int      // Minutes off target

  // HP calculation
  hpCalculated      Int      // 0-100
}
```

---

### HP Service Implementation ✅

**New File: `lib/hp.service.ts`**

**HP Calculation Formula:**
```typescript
HP = Base (60) + Sleep Duration Bonus (0-25) + Wake Time Bonus (0-10) + Quality Bonus (0-5)
```

**Sleep Duration Bonuses:**
- 7.5+ hours: +25 HP (optimal)
- 7.0-7.5 hours: +20 HP
- 6.5-7.0 hours: +15 HP
- 6.0-6.5 hours: +10 HP
- 5.5-6.0 hours: +5 HP
- < 5.5 hours: +0 HP (struggling)

**Wake Time Bonuses:**
- Within ±15 min of target: +10 HP
- Within ±30 min of target: +5 HP
- Beyond ±30 min: +0 HP

**Quality Bonus:**
- Direct mapping: 1-5 rating → 1-5 HP

**HP Status:**
- 85-100 HP: "Excellent" (peak performance)
- 60-84 HP: "Good" (viable but not optimal)
- 0-59 HP: "Struggling" (need recovery)

**Key Functions:**
- `calculateHp()` - Calculates HP from sleep metrics
- `logSleep()` - Creates/updates sleep log and sets HP
- `modulateXpGain()` - Reduces XP based on HP
- `getSleepConsistency()` - 7-day sleep analytics

---

### Sleep Logging Page ✅

**New File: `app/sleep/log/page.tsx`**

**Features:**
- ⏰ Bedtime and waketime inputs (time pickers)
- 💫 Subjective rested rating (1-5 scale)
- 📊 Real-time HP preview as user types
- ⚡ Sleep duration calculation
- ⚠️ Warnings if sleep < 6.5 hours
- 🎯 Auto-fills current time as waketime
- 💡 Suggests bedtime 7.5 hours ago

**UX Flow:**
1. User wakes up → opens app
2. Sees "Log Sleep" prompt if not done today
3. Quick 2-field form + rating slider
4. Instant HP calculation preview
5. Submit → HP set for the day
6. Total time: < 30 seconds

---

### Sleep API ✅

**New File: `app/api/sleep/log/route.ts`**

**POST /api/sleep/log** - Log sleep and calculate HP
- Input: bedtime, waketime, subjectiveRested
- Output: sleepLog, hpCalculation, newHp, message
- Side effects: Creates SleepLog, updates User.currentHp

**GET /api/sleep/log** - Get today's sleep log
- Output: sleepLog, hasLoggedToday boolean

---

### Dashboard HP Display ✅

**Modified: `app/mobile/page.tsx`**

**Added HP Card:**
- Dynamic color (green/yellow/red based on HP level)
- HP bar visualization (0-100)
- Status message (Excellent/Good/Struggling)
- "Log Sleep to Set HP" call-to-action if not logged today
- Warning if HP < 85 (reduces XP gains)

**Card Positioning:**
- After Identity/XP card
- Before Streak card
- Prominent placement in stats hierarchy

---

### XP Modulation Integration ✅

**Modified: `lib/xp.service.ts`**

**HP-Based XP Modulation:**
```typescript
if (HP >= 85): XP = 100% (full XP, excellent state)
if (HP >= 60): XP = 85%  (good, but not optimal)
if (HP < 60):  XP = 70%  (struggling, need rest)
```

**Implementation:**
- All positive XP gains automatically modulated
- Penalties (negative XP) NOT modulated
- Event description includes modulation info
- Example: "Completed phone-free block (HP modulated: 60 → 51 @ 70 HP)"

**Protected Against:**
- Users grinding XP while sleep-deprived
- Normalizing all-nighters for XP
- Ignoring biological capacity limits

---

### Stats API Update ✅

**Modified: `app/api/user/stats/route.ts`**

**Added HP to Response:**
```typescript
hp: {
  current: 100,      // 0-100
  max: 100,
  color: "green",    // "green" | "yellow" | "red"
  message: "Excellent! Peak performance state...",
  hasLoggedSleepToday: true,
  lastUpdate: Date
}
```

---

## Files Created

1. `lib/hp.service.ts` - HP calculation and sleep management
2. `app/sleep/log/page.tsx` - Sleep logging UI
3. `app/api/sleep/log/route.ts` - Sleep logging API
4. `PHASE2A_COMPLETE.md` - This file

---

## Files Modified

1. `prisma/schema.prisma` - Added SleepLog model, HP fields to User
2. `lib/xp.service.ts` - Integrated HP modulation
3. `app/api/user/stats/route.ts` - Added HP to stats response
4. `app/mobile/page.tsx` - Added HP display card

---

## Migration Required ⚠️

**Before testing, you must run:**

```bash
npx prisma migrate dev --name add_sleep_hp_system
npx prisma generate
```

This will:
1. Add `SleepLog` table
2. Add HP fields to `User` table (`currentHp`, `lastHpUpdate`, `targetWakeTime`, `targetBedtime`, `wakeWindowMin`)
3. Set default HP = 100 for existing users

---

## Testing Checklist

### Sleep Logging:
- [ ] Navigate to `/sleep/log`
- [ ] Enter bedtime and waketime
- [ ] Adjust rested rating (1-5)
- [ ] Verify HP preview updates in real-time
- [ ] Submit and verify HP is set
- [ ] Check dashboard shows correct HP

### HP Display:
- [ ] Dashboard shows HP card with color-coded bar
- [ ] HP message matches status (excellent/good/struggling)
- [ ] "Log Sleep" prompt appears if not logged today
- [ ] Warning appears if HP < 85

### XP Modulation:
- [ ] Complete a phone-free block with HP < 85
- [ ] Verify XP is reduced (check event description)
- [ ] Complete block with HP >= 85
- [ ] Verify full XP granted
- [ ] Check that penalties (negative XP) are NOT modulated

### Edge Cases:
- [ ] Log sleep with very short duration (< 5.5h)
- [ ] Verify HP is low (60-65 range)
- [ ] Log sleep with optimal duration (7.5h+)
- [ ] Verify HP is high (85-100 range)
- [ ] Try logging sleep multiple times same day (should update, not duplicate)

---

## Key Design Decisions

### 1. Why HP Modulation?

Without HP, the system would inadvertently reward sleep deprivation:
- User stays up until 3am grinding XP
- Next day, exhausted, but still earns full XP
- Positive feedback loop toward burnout

With HP modulation:
- User gets full XP only with good sleep (85+ HP)
- Sleep-deprived users earn 70-85% XP
- System explicitly models biological limits
- Encourages recovery, not endless grinding

### 2. Why Not Block XP Entirely at Low HP?

- Too punitive - users would game the system
- Current approach is "soft gate" - you CAN still earn XP, just less
- Aligns with SDT autonomy - user chooses whether to push
- Still provides consequences (reduced XP) without full lockout

### 3. Why Daily HP Recalculation?

- HP resets each morning based on last night's sleep
- Reflects real biology - sleep is daily recovery
- Prevents "HP debt" accumulation
- Simple mental model: "Log sleep → know today's capacity"

### 4. Why Subjective Rating Matters?

- Research shows subjective sleep quality ≠ duration alone
- 7 hours with good quality > 8 hours with poor quality
- Empowers user to self-assess
- Quick input (1-5 scale) keeps friction low

---

## Research Alignment

### ✅ Circadian Science (Earth Scroll)
- Wake time tracking with variance calculation
- 7-7.5h sleep target (research-backed)
- Morning check-in ritual (light exposure proxy)
- HP penalizes short sleep (<6.5h)

### ✅ Self-Determination Theory
- **Autonomy:** User can still act with low HP, just less reward
- **Competence:** Clear feedback on sleep quality → HP
- **Relatedness:** (Future) Guild members can see each other's HP

### ✅ Anti-Burnout Design
- HP explicitly models fatigue
- System won't let you abuse yourself for XP
- Recovery is built into the reward structure
- Aligns incentives with biology

---

## Known Limitations

1. **No light exposure tracking** - User self-reports sleep, but no morning light logging yet (Phase 2B)
2. **No target wake time enforcement** - User can set target, but no alarm/reminder yet
3. **No NSDR HP recovery** - Currently HP only resets via sleep (Phase 2B will add NSDR boosts)
4. **No sleep consistency rewards** - 7-day consistency calculated but not yet tied to bonuses
5. **No multi-day sleep debt** - HP is daily, doesn't compound over multiple bad nights

These will be addressed in Phase 2B (Morning Protocol & NSDR).

---

## Performance Impact

- **Negligible** - One additional query per XP event creation (to check HP)
- HP calculation is pure function (no DB queries)
- Sleep logging is async, doesn't block user flow
- Dashboard adds one boolean check (hasLoggedSleepToday)

---

## Success Metrics

Measure after 1-2 weeks:

- **Sleep logging rate:** % of days with sleep logged
- **HP consistency:** Average HP over 7 days
- **Sleep duration trend:** Is user getting 7+ hours?
- **XP modulation events:** How often is HP reducing XP?
- **User behavior:** Do users prioritize sleep to maximize XP?

---

## What's Next?

### Phase 2B: Morning Protocol & NSDR (Next Up)
- Morning protocol checklist (light, water, movement)
- NSDR recovery quests (+HP bonus)
- Gentle failure handling with NSDR suggestions
- Morning routine XP rewards

### Phase 2C: Boss Battles & Time-of-Day Logic
- Boss task system (gamified deep work)
- Time-of-day multipliers (1.2x XP for morning blocks)
- Boss HP vs User HP mechanics
- Deep work tracking

---

**Phase 2A Complete. Run migration, then test thoroughly before proceeding to Phase 2B.**

Next: Morning Protocol & NSDR System Implementation
