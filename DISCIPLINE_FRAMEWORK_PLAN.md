# Discipline Framework Implementation Plan

**Last Updated:** 2025-12-02
**Status:** Planning Phase
**Target:** Transform Discipline Dungeon from phone-addiction tracker into science-backed discipline system

---

## Executive Summary

This document outlines the integration of science-backed discipline principles (circadian rhythms, SDT motivation theory, identity-based habits, Musashi's Five Rings) into the existing Discipline Dungeon PWA. The implementation is phased to minimize disruption while maximizing impact.

### Current Schedule Constraints
- **Winter Quarter (Now - December):** Tue/Wed 8:30a-11:30a, Thu 1:30p-4:30p + 1hr travel each way
- **Spring Quarter (January - March):** Schedule TBD
- **Peak cognitive hours:** 08:00-12:00 (post-wake, pre-class on class days)

### Key Integration Points
The existing codebase has strong foundations:
- ✅ Event-sourced XP system (`XpEvent` ledger)
- ✅ Streak tracking (`StreakService`)
- ✅ Unified XP semantics (1 XP = 1 minute)
- ✅ Task system with types (exposure, job search, habit)
- ✅ Phone-free blocks with duration tracking
- ✅ Urge/micro-task replacement system
- ✅ Stakes with anti-charity consequences

### Major Gaps to Address
- ❌ No circadian/sleep intelligence
- ❌ No HP/energy/burnout mechanics
- ❌ No NSDR/recovery system
- ❌ Identity archetypes underutilized
- ❌ Over-reliance on punishment vs autonomy
- ❌ No Musashi scroll structure
- ❌ No time-of-day optimization
- ❌ No Void Mode tapering

---

## Implementation Phases

### Phase 1: Low-Effort, High-Impact Tweaks (1-2 days)
**Goal:** Improve SDT alignment and identity framing with zero schema changes

#### 1.1 Reframe Copy Toward Autonomy & Identity
**Files:** `app/mobile/page.tsx`, `app/stakes/*/page.tsx`, `README.md`

**Changes:**
- Update welcome screen: "You chose these limits as a weapon you wield against distraction"
- Add identity prompts: "I am the type of person who..." in streak summaries
- Reframe stakes: "You chose this stake to become X kind of person"
- Keep sharpness but emphasize self-chosen rigor

**Risk:** Very low, copy-only
**Impact:** Increases autonomy perception (SDT)

#### 1.2 Add Identity Titles/Tags
**Files:** `lib/identity.service.ts` (new), `app/mobile/page.tsx`

**Logic:**
```typescript
function getUserTitle(level: number, streak: number): string {
  if (level < 5) return "Apprentice"
  if (level >= 5 && level < 10 && streak >= 7) return "Ronin"
  if (level >= 10 && streak >= 30) return "Scholar"
  if (level >= 15 && streak >= 60) return "Master"
  return "Warrior"
}
```

Display title next to level on dashboard. No new tables needed.

**Risk:** Minimal
**Impact:** Identity-based habit reinforcement

#### 1.3 Gentle Failure Messages with Recovery Path
**Files:** `app/phone/log/page.tsx`, `app/stakes/payment/page.tsx`

**Changes:**
- On violations: Show "What now?" card with 1-2 suggested actions
  - "Schedule a 20-minute NSDR session tomorrow"
  - "Create one small exposure task to rebuild momentum"
- Use existing task/block flows for suggestions
- Tone: Adaptive, not just punitive

**Risk:** Feature creep (keep to 1-2 options max)
**Impact:** Competence support, reduces learned helplessness

#### 1.4 Tone Down Public Shame Roadmap
**Files:** `README.md`

**Changes:**
- Reframe "public shame boards" → "guild accountability"
- Emphasize cooperative social layer over humiliation
- Keep anti-charity stakes but frame as honor-based commitment

**Risk:** May reduce fear motivation
**Impact:** Better long-term adherence (SDT relatedness)

---

### Phase 2: Structural Feature Additions (1-2 weeks)

#### 2A. Sleep/Wake Logging + HP System

**New Database Models:**
```prisma
model SleepLog {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  date            DateTime @unique // Date this log applies to

  // Sleep window
  bedtime         DateTime
  waketime        DateTime
  sleepDurationMin Int     // Calculated: waketime - bedtime

  // Quality
  subjectiveRested Int     // 1-5 scale
  sleepQuality    Int      @default(0) // 0-100 derived

  // Circadian alignment
  wakeOnTime      Boolean  @default(false) // Within target window?
  wakeTarget      DateTime // User's target wake time (e.g., 06:00)
  wakeVariance    Int      @default(0) // Minutes off target

  // HP calculation
  hpCalculated    Int      @default(60) // 0-100

  createdAt       DateTime @default(now())

  @@index([userId, date])
}

// Add to User model:
model User {
  // ... existing fields

  // Circadian settings
  targetWakeTime   DateTime? // e.g., 06:00
  targetBedtime    DateTime? // e.g., 22:30
  wakeWindowMin    Int       @default(15) // ±15 min tolerance

  // Current HP state
  currentHp        Int       @default(100)
  lastHpUpdate     DateTime?

  // Relations
  sleepLogs        SleepLog[]
}
```

**New Service: `lib/hp.service.ts`**
```typescript
export class HpService {
  /**
   * Calculate HP from sleep log
   * Based on: sleep duration, wake time adherence, subjective quality
   */
  static calculateDailyHp(sleepLog: SleepLog, user: User): number {
    let hp = 60 // Base minimum

    // Sleep duration bonus (0-25 HP)
    const hoursSlept = sleepLog.sleepDurationMin / 60
    if (hoursSlept >= 7.5) hp += 25
    else if (hoursSlept >= 7.0) hp += 20
    else if (hoursSlept >= 6.5) hp += 15
    else if (hoursSlept >= 6.0) hp += 10

    // Wake time adherence bonus (0-10 HP)
    if (sleepLog.wakeOnTime) hp += 10
    else if (Math.abs(sleepLog.wakeVariance) <= 30) hp += 5

    // Subjective quality bonus (0-5 HP)
    hp += sleepLog.subjectiveRested

    return Math.min(100, Math.max(0, hp))
  }

  /**
   * Apply HP modulation to XP gain
   */
  static modulateXpGain(baseXp: number, currentHp: number): number {
    if (currentHp >= 85) return baseXp // Full XP
    if (currentHp >= 60) return Math.floor(baseXp * 0.85) // 85%
    return Math.floor(baseXp * 0.7) // 70% - you're struggling
  }
}
```

**UI Changes:**
- `/app/sleep/log/page.tsx` (new): Quick morning check-in
  - 2 time pickers (bedtime, waketime)
  - 1-5 slider (how rested?)
  - Shows calculated HP
  - Auto-fills today's date

- `/app/mobile/page.tsx`: Add HP bar next to XP
  - Color-coded: Green (85+), Yellow (60-84), Red (<60)
  - Tooltip: "HP affects XP gains - prioritize sleep!"

**XP Integration:**
- Modify `XpService.createEvent()` to check current HP
- If HP < 85, reduce XP delta before creating event
- Log HP-modulated events with special flag

**Risk:** Additional logging friction
**Mitigation:** Make sleep log ultra-fast (takes <30 sec)

**Impact:**
- Prevents self-abuse
- Models real biological constraints
- Incentivizes sleep adherence

---

#### 2B. Morning Protocol + NSDR Recovery Quests

**New Database Model:**
```prisma
model DailyProtocol {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])
  date              DateTime @unique

  // Morning Protocol (Earth Scroll)
  wokeOnTime        Boolean  @default(false)
  gotMorningLight   Boolean  @default(false)
  drankWater        Boolean  @default(false)
  delayedCaffeine   Boolean  @default(false) // 90+ min after wake

  completed         Boolean  @default(false)
  completedAt       DateTime?
  xpEarned          Int      @default(0)
  hpBonus           Int      @default(0)

  createdAt         DateTime @default(now())

  @@index([userId, date])
}

// Add new task type for NSDR
// Reuse existing Task model with type="recovery"
```

**New Service: `lib/protocol.service.ts`**
```typescript
export class ProtocolService {
  static readonly MORNING_PROTOCOL_XP = 30
  static readonly MORNING_PROTOCOL_HP_BONUS = 5

  /**
   * Check if user completed morning protocol
   */
  static async getDailyProtocol(userId: string, date: Date) {
    return prisma.dailyProtocol.findFirst({
      where: {
        userId,
        date: { gte: startOfDay(date), lt: endOfDay(date) }
      }
    })
  }

  /**
   * Mark protocol item complete and grant rewards
   */
  static async completeProtocol(userId: string, date: Date) {
    const protocol = await this.getDailyProtocol(userId, date)
    if (!protocol) throw new Error("No protocol for today")

    const allComplete =
      protocol.wokeOnTime &&
      protocol.gotMorningLight &&
      protocol.drankWater

    if (allComplete) {
      // Grant XP
      await XpService.createEvent({
        userId,
        type: 'protocol_complete',
        delta: this.MORNING_PROTOCOL_XP,
        description: 'Completed morning protocol'
      })

      // Grant HP bonus
      await prisma.user.update({
        where: { id: userId },
        data: { currentHp: { increment: this.MORNING_PROTOCOL_HP_BONUS } }
      })

      return { xp: this.MORNING_PROTOCOL_XP, hpBonus: this.MORNING_PROTOCOL_HP_BONUS }
    }
  }
}
```

**UI Changes:**
- `/app/mobile/page.tsx`: Add "Morning Protocol" card (appears until completed)
  - Checkboxes: ☀️ Morning light, 💧 Water, ⏰ Woke on time, ☕ Delayed caffeine
  - Shows XP reward (30 XP) and HP bonus (+5 HP)
  - Card disappears after completion

- `/app/tasks/page.tsx`: Add "Recovery" task type
  - Preset durations: 10, 20 minutes
  - Title: "NSDR / Mana Recovery"
  - Description: "Yoga Nidra, meditation, or quiet rest"
  - Rewards: 10 XP + 10 HP (capped at 1/day for HP)
  - Tag as special in UI (different color/icon)

**XP Event Types:** Add `protocol_complete` and `recovery_complete`

**Risk:** Checkbox fatigue / "productivity porn"
**Mitigation:** Keep protocol tight (3-4 items), tie to clear biology

**Impact:**
- Establishes Earth Scroll (circadian foundation)
- Encourages NSDR habit
- Provides recovery path after bad nights

---

#### 2C. Boss Battles + Time-of-Day Logic

**Database Changes:**
```prisma
// Extend Task model
model Task {
  // ... existing fields

  // Boss battle fields
  isBoss          Boolean  @default(false)
  bossHp          Int?     // Total "HP" (e.g., 300 for 5hr project)
  bossHpRemaining Int?     // Current HP left
  bossDifficulty  String?  // "easy", "medium", "hard", "brutal"

  // Time-of-day optimization
  scheduledTime   DateTime? // When user plans to work on this
  optimalWindow   String?   // "morning" (08:00-12:00), "afternoon", "evening"

  // Relations to blocks
  bossBlocks      BossBlock[]
}

model BossBlock {
  id              String   @id @default(cuid())
  taskId          String
  task            Task     @relation(fields: [taskId], references: [id])
  blockId         String   // Reference to PhoneFreeBlock
  block           PhoneFreeBlock @relation(fields: [blockId], references: [id])

  damageDealt     Int      // HP damage = block duration * multiplier
  timeOfDay       String   // "morning", "afternoon", "evening"
  multiplier      Float    @default(1.0) // 1.2x for morning blocks

  createdAt       DateTime @default(now())

  @@index([taskId, createdAt])
}

// Extend PhoneFreeBlock
model PhoneFreeBlock {
  // ... existing fields

  // Boss battle integration
  isBossBlock     Boolean  @default(false)
  linkedBossId    String?

  // Time-of-day tracking
  timeOfDay       String?  // "morning", "afternoon", "evening"

  // Relations
  bossBlocks      BossBlock[]
}
```

**New Service: `lib/boss.service.ts`**
```typescript
export class BossService {
  static readonly TIME_WINDOWS = {
    morning: { start: 8, end: 12, multiplier: 1.2 },   // Peak EF
    afternoon: { start: 12, end: 17, multiplier: 1.0 },
    evening: { start: 17, end: 22, multiplier: 0.9 }   // Lower EF
  }

  /**
   * Determine time-of-day category
   */
  static getTimeOfDay(date: Date): string {
    const hour = date.getHours()
    if (hour >= 8 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 17) return 'afternoon'
    return 'evening'
  }

  /**
   * Calculate damage dealt to boss from block
   */
  static calculateBossDamage(
    blockDurationMin: number,
    timeOfDay: string
  ): number {
    const window = this.TIME_WINDOWS[timeOfDay as keyof typeof this.TIME_WINDOWS]
    return Math.floor(blockDurationMin * window.multiplier)
  }

  /**
   * Apply block damage to boss task
   */
  static async applyBlockDamage(
    taskId: string,
    blockId: string,
    blockDurationMin: number,
    timeOfDay: string
  ) {
    const damage = this.calculateBossDamage(blockDurationMin, timeOfDay)
    const multiplier = this.TIME_WINDOWS[timeOfDay as keyof typeof this.TIME_WINDOWS].multiplier

    // Create boss block record
    await prisma.bossBlock.create({
      data: {
        taskId,
        blockId,
        damageDealt: damage,
        timeOfDay,
        multiplier
      }
    })

    // Update boss HP
    const task = await prisma.task.findUnique({ where: { id: taskId } })
    if (!task || !task.isBoss) throw new Error("Not a boss task")

    const newHp = Math.max(0, (task.bossHpRemaining || task.bossHp || 0) - damage)

    await prisma.task.update({
      where: { id: taskId },
      data: { bossHpRemaining: newHp }
    })

    // Check if boss defeated
    if (newHp === 0) {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          completed: true,
          completedAt: new Date()
        }
      })

      // Grant completion XP
      const completionXp = task.bossHp || 300
      await XpService.createEvent({
        userId: task.userId,
        type: 'boss_defeated',
        delta: completionXp,
        relatedModel: 'Task',
        relatedId: taskId,
        description: `Defeated boss: ${task.title}`
      })
    }

    return { damage, newHp, defeated: newHp === 0 }
  }
}
```

**UI Changes:**

1. **`/app/tasks/create/page.tsx`** (new): Create boss tasks
   - Toggle: "Is this a boss battle?"
   - If yes: Set boss HP (e.g., 300 for 5hr project)
   - Select difficulty: Easy/Medium/Hard/Brutal
   - Select optimal window: Morning/Afternoon/Evening
   - Description field with boss "lore"

2. **`/app/tasks/[id]/page.tsx`** (new): Boss detail view
   - Boss HP bar with remaining/total
   - List of blocks applied (damage log)
   - "Attack Boss" button → starts phone-free block linked to boss
   - Time-of-day bonus indicator: "⚡ Morning bonus: 1.2x damage"

3. **`/app/tasks/page.tsx`**: Update task list
   - Bosses shown separately from regular tasks
   - Boss card shows HP bar, difficulty, optimal window

4. **`/app/phone/block/page.tsx`**: Boss block flow
   - When starting block, option to "Link to Boss Battle"
   - Select active boss from dropdown
   - Shows damage preview based on duration + time
   - After block completion, show damage dealt + boss HP update

**XP Event Types:** Add `boss_defeated`

**Risk:** UI complexity, boss mechanics feeling gimmicky
**Mitigation:** Make boss creation optional, keep damage calc simple

**Impact:**
- Gamifies deep work sessions
- Encourages morning focus blocks (peak EF hours)
- Provides clear goals for phone-free blocks
- Aligns with Fire/Wind scrolls (motivation + focus)

---

### Phase 3: Deep Blueprint Alignment (2-4 weeks)

#### 3A. Musashi Scroll Structure

**Concept:** Reorganize features into Earth/Water/Fire/Wind/Void progression

**New Database Model:**
```prisma
model UserScrollProgress {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])

  // Scroll unlock status
  earthUnlocked   Boolean  @default(true)  // Always unlocked
  waterUnlocked   Boolean  @default(false) // Unlock: 7-day streak
  fireUnlocked    Boolean  @default(false) // Unlock: Level 5
  windUnlocked    Boolean  @default(false) // Unlock: 1 boss defeated
  voidUnlocked    Boolean  @default(false) // Unlock: 30-day streak + Level 10

  // Progress tracking
  earthMastery    Int      @default(0) // 0-100
  waterMastery    Int      @default(0)
  fireMastery     Int      @default(0)
  windMastery     Int      @default(0)
  voidMastery     Int      @default(0)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

**Scroll Mapping:**
- **Earth (Biology):** Sleep logs, wake time, morning protocol, HP
- **Water (Adaptability):** NSDR, bedtime routines, recovery quests, streak resilience
- **Fire (Motivation):** Exposure tasks, identity titles, stakes, XP milestones
- **Wind (Focus):** Phone-free blocks, boss battles, urge resistance, environment
- **Void (Mastery):** Deep work, Void Mode, weekly reflection, LLM coach (future)

**UI Changes:**

1. **`/app/scrolls/page.tsx`** (new): Scrolls overview
   - 5 cards for each scroll
   - Show unlock status (locked scrolls are grayed out)
   - Mastery progress bar for unlocked scrolls
   - Tap to navigate to scroll detail

2. **`/app/scrolls/[scroll]/page.tsx`** (new): Individual scroll view
   - Philosophical introduction (Musashi quote)
   - List of quests/features in this scroll
   - Mastery calculation (e.g., Earth: sleep consistency, protocol completion rate)
   - Unlock requirements for next scroll

3. **Navigation Update:** Add "Scrolls" tab to main nav
   - Icon: 📜
   - Badge showing newly unlocked scrolls

**Mastery Calculation Examples:**
```typescript
// Earth Mastery
earthMastery =
  (sleep_consistency_last_7_days * 0.4) +
  (morning_protocol_completion_rate * 0.4) +
  (wake_time_adherence * 0.2)

// Fire Mastery
fireMastery =
  (xp_growth_rate * 0.3) +
  (exposure_tasks_completed * 0.4) +
  (identity_reinforcement_score * 0.3)
```

**Risk:** Adds complexity, may feel arbitrary
**Mitigation:** Make scroll structure optional (power users only), keep unlock criteria clear

**Impact:**
- Provides progression framework
- Encourages balanced discipline (not just one area)
- Aligns with Dokkodo philosophy

---

#### 3B. Void Mode (Hide Gamification)

**Concept:** After sustained discipline, allow users to minimize XP/streak UI and operate on intrinsic motivation

**Database Changes:**
```prisma
model User {
  // ... existing fields
  voidModeEnabled Boolean  @default(false)
  voidModeStarted DateTime?
}
```

**Unlock Criteria:**
- 30-day streak + Level 10 + Water scroll mastery > 60

**UI Changes:**

1. **`/app/settings/void-mode/page.tsx`** (new): Void Mode toggle
   - Explanation: "You've proven your discipline. Ready to walk the path without signposts?"
   - What changes in Void Mode:
     - XP/Level/Streak UI minimized or hidden
     - Daily quest list simplified (just today's essentials)
     - Weekly summary only (no real-time XP counter)
   - Reversible anytime
   - Badge of honor: "Void Walker" title

2. **`/app/mobile/page.tsx`**: Conditional rendering
   - If `voidModeEnabled`:
     - Hide XP card, streak card
     - Show simple daily checklist: Sleep logged? Protocol done? Any boss work?
     - Show weekly summary card (collapsed)

**Risk:** User feels "less rewarded"
**Mitigation:** Frame as achievement, make reversible, still accrue XP in background

**Impact:**
- Supports transition from extrinsic → intrinsic motivation
- Prevents long-term gamification dependency
- Aligns with SDT and Void Scroll

---

#### 3C. Guild/Party System (Cooperative Social)

**Concept:** Replace "public shame boards" with invite-only guilds for mutual accountability

**Database Models:**
```prisma
model Guild {
  id              String   @id @default(cuid())
  name            String
  description     String?

  // Settings
  maxMembers      Int      @default(4)
  sharedPenalty   Boolean  @default(true) // Small XP debuff for all if one fails

  // Weekly goals (collective)
  weeklyGoal      String?  // e.g., "Combined 40 hours phone-free"
  goalProgress    Int      @default(0)
  goalTarget      Int      @default(0)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  members         GuildMember[]
}

model GuildMember {
  id              String   @id @default(cuid())
  guildId         String
  guild           Guild    @relation(fields: [guildId], references: [id])
  userId          String
  user            User     @relation(fields: [userId], references: [id])

  role            String   @default("member") // "member", "admin"
  joinedAt        DateTime @default(now())

  @@unique([guildId, userId])
  @@index([userId])
}
```

**UI Changes:**

1. **`/app/guild/create/page.tsx`** (new): Create guild
   - Guild name, description
   - Invite emails (2-4 people)
   - Set shared goals

2. **`/app/guild/page.tsx`** (new): Guild dashboard
   - Member list with daily status (✅ under limit, ❌ violation)
   - Shared weekly goal progress bar
   - "Support" actions: Send encouragement message, schedule group NSDR

3. **Guild Penalty Logic:**
   - If any member has violation, all members get -5 XP (small, not punitive)
   - Framed as "your guild needs you"
   - Opt-out available

**Risk:** Group dynamics can go sideways
**Mitigation:** Allow leaving guild anytime, admin controls, optional penalties

**Impact:**
- Provides SDT relatedness support
- Shifts from shame → cooperative accountability
- Encourages vulnerability and support

---

## Database Migration Strategy

### Migration Order:
1. **Phase 2A:** Add `SleepLog`, `currentHp`, `targetWakeTime` to User
2. **Phase 2B:** Add `DailyProtocol`, extend Task with `type="recovery"`
3. **Phase 2C:** Add boss fields to Task, create `BossBlock` table
4. **Phase 3A:** Add `UserScrollProgress`
5. **Phase 3B:** Add `voidModeEnabled` to User
6. **Phase 3C:** Add `Guild`, `GuildMember`

### Migration Files:
Each phase will generate a Prisma migration:
```bash
npx prisma migrate dev --name add_sleep_hp_system
npx prisma migrate dev --name add_protocol_and_recovery
npx prisma migrate dev --name add_boss_battles
npx prisma migrate dev --name add_scroll_progression
npx prisma migrate dev --name add_void_mode
npx prisma migrate dev --name add_guild_system
```

---

## XP Event Types Extension

Add to `lib/xp.service.ts`:

```typescript
export type XpEventType =
  | 'block_complete'
  | 'urge_resist'
  | 'task_complete'
  | 'violation_penalty'
  | 'decay'
  | 'truth_penalty'
  // Phase 2 additions
  | 'protocol_complete'     // Morning protocol
  | 'recovery_complete'     // NSDR session
  | 'boss_defeated'         // Boss task completion
  | 'hp_modulation'         // XP reduced due to low HP
  // Phase 3 additions
  | 'scroll_mastery'        // Scroll level-up
  | 'void_mode_activated'   // Entered Void Mode
  | 'guild_penalty'         // Guild member failure
  | 'guild_bonus'           // Guild weekly goal achieved
```

**XP Config Updates:**
```typescript
export const XP_CONFIG = {
  // ... existing rewards

  // Phase 2 rewards
  MORNING_PROTOCOL: 30,      // Full protocol completion
  RECOVERY_SESSION_10MIN: 10, // 10-min NSDR
  RECOVERY_SESSION_20MIN: 20, // 20-min NSDR
  BOSS_DEFEAT_BONUS: 50,      // Bonus on top of boss HP

  // Phase 3 rewards
  SCROLL_MASTERY: 100,        // Reaching 100% mastery
  VOID_MODE_UNLOCK: 500,      // Entering Void Mode
  GUILD_WEEKLY_GOAL: 50,      // Per member when guild succeeds

  // Phase 3 penalties
  GUILD_PENALTY: -5,          // Small shared penalty
}
```

---

## Class Schedule Integration

### Current Quarter Blocks:
- **Tuesday:**
  - 06:00-08:30: Morning protocol + boss block (2.5hr deep work)
  - 08:30-11:30: Class
  - 11:30-12:30: Travel + lunch
  - 12:30-17:00: Afternoon work

- **Wednesday:**
  - Same as Tuesday

- **Thursday:**
  - 06:00-12:30: Morning protocol + boss block (6.5hr available!)
  - 12:30-13:30: Travel
  - 13:30-16:30: Class
  - 16:30-17:30: Travel

- **Friday-Monday:**
  - 06:00-12:00: Peak boss blocks (6hr daily)
  - Afternoons: Lower-intensity tasks

### Boss Battle Optimization:
- **Heavy bosses (exams, papers):** Schedule for Thu/Fri/Sat/Sun mornings
- **Medium tasks (problem sets):** Tue/Wed mornings or Thu morning
- **Light tasks (readings):** Afternoons, any day

### HP Management:
- Target: 22:30 bedtime → 06:00 wake (7.5hr window)
- NSDR sessions: After class days if HP dips
- Weekend recovery: If streak breaks, use Sat/Sun for protocol focus

---

## Success Metrics

### Phase 1 Success (Autonomy & Identity):
- [ ] Identity title displayed on dashboard
- [ ] Copy updated to emphasize choice/autonomy
- [ ] Gentle failure messages with recovery suggestions
- [ ] User reports feeling "more in control" vs "punished"

### Phase 2A Success (Sleep/HP):
- [ ] Sleep logging < 30sec per day
- [ ] HP calculated and displayed accurately
- [ ] XP modulation working (reduced XP on low HP days)
- [ ] User can see correlation between sleep and performance

### Phase 2B Success (Protocol/NSDR):
- [ ] Morning protocol completion rate > 70%
- [ ] NSDR sessions logged regularly (2-3x/week)
- [ ] HP recovery visible after NSDR
- [ ] User associates protocol with "feeling prepared"

### Phase 2C Success (Boss Battles):
- [ ] At least 1 boss created and defeated
- [ ] Morning blocks preferred for boss attacks (> 60%)
- [ ] Boss HP mechanics feel clear and motivating
- [ ] User reports increased focus during boss blocks

### Phase 3 Success (Scrolls/Void/Guild):
- [ ] At least 3 scrolls unlocked
- [ ] Mastery scores updating correctly
- [ ] Void Mode unlocked and tested
- [ ] Guild created with 2+ members, no toxicity

---

## Risk Mitigation

### Risk: Complexity Creep
**Mitigation:** Each phase is optional. User can stay in Phase 1 indefinitely if desired.

### Risk: Feature Fatigue
**Mitigation:** Progressive disclosure - only show features after unlock criteria met.

### Risk: Overengineering
**Mitigation:** Ship Phase 1 first, validate, then proceed. Allow 1-2 weeks of real-world testing between phases.

### Risk: Abandoning Phone-Addiction Focus
**Mitigation:** Phone tracking remains core. New features enhance, don't replace.

### Risk: SDT Backlash (Too Punitive)
**Mitigation:** Phase 1 copy changes + guild system reframe social layer toward support.

---

## Next Steps

### Immediate (This Week):
1. ✅ Review and approve this plan
2. [ ] Implement Phase 1 (1-2 days)
3. [ ] Test Phase 1 with real usage
4. [ ] Gather feedback on copy/identity changes

### Short-Term (Next 2 Weeks):
1. [ ] Implement Phase 2A (Sleep/HP)
2. [ ] Test sleep logging workflow
3. [ ] Validate HP calculations
4. [ ] Implement Phase 2B (Protocol/NSDR)

### Medium-Term (Next Month):
1. [ ] Implement Phase 2C (Boss Battles)
2. [ ] Use boss battles for actual schoolwork
3. [ ] Validate time-of-day multipliers
4. [ ] Gather data on morning vs afternoon performance

### Long-Term (Next Quarter):
1. [ ] Implement Phase 3A (Scrolls)
2. [ ] Implement Phase 3B (Void Mode)
3. [ ] Implement Phase 3C (Guilds)
4. [ ] Evaluate additional verification providers (beyond iPhone Screen Time)

---

## Appendix: Research Principles Mapped

### Self-Determination Theory (SDT):
- **Autonomy:** Phase 1 copy changes, user-chosen limits, reversible Void Mode
- **Competence:** XP/level feedback, boss battles, scroll mastery
- **Relatedness:** Guild system, supportive social layer

### Circadian Science:
- **06:00 wake anchor:** Sleep logs, wake time tracking, HP modulation
- **Morning light:** Morning protocol checklist
- **Sleep protection:** HP system prevents sleep sacrifice normalization
- **Temperature minimum:** Future enhancement (cold/heat exposure logs)

### Identity-Based Habits:
- **Titles:** Apprentice → Ronin → Scholar → Master
- **Narrative:** Musashi scrolls, boss battles, "Way of the Warrior"
- **Micro-actions:** Existing urge/micro-task system reinforced with identity framing

### Executive Function Optimization:
- **Peak hours:** Boss battle time-of-day multipliers (1.2x morning)
- **Mono-tasking:** Boss blocks enforce single focus
- **HP/EF link:** Low sleep → low HP → reduced XP gain

### Musashi's Five Rings:
- **Earth:** Sleep, wake, biology
- **Water:** Adaptability, NSDR, recovery
- **Fire:** Motivation, identity, stakes
- **Wind:** Focus, phone-free blocks, environment
- **Void:** Deep work, intrinsic motivation, mastery

### Dokkodo Precepts:
- **"The Way is in training":** Daily quests, protocols, streaks
- **"Do not think dishonestly":** Lie penalties (-100 XP), honor system
- **Future:** Weekly reflection quests tied to other precepts

---

**End of Plan**
