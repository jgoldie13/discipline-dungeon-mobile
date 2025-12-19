/**
 * UserSettings Schema v1
 * Configurable rules and preferences for the Discipline Dungeon experience
 */

import { z } from 'zod'

// ============================================
// Feature Flags
// ============================================

export const FeatureFlagsSchema = z.object({
  // Core features
  phoneFreeBlocks: z.boolean().default(true),
  urgeLogging: z.boolean().default(true),
  sleepTracking: z.boolean().default(true),
  morningProtocol: z.boolean().default(true),

  // Gamification
  bossMode: z.boolean().default(true),
  streakTracking: z.boolean().default(true),
  xpSystem: z.boolean().default(true),
  buildMode: z.boolean().default(true),

  // Stakes
  commitments: z.boolean().default(false), // Off by default - opt-in
  antiCharity: z.boolean().default(false),

  // Social
  partnerVerification: z.boolean().default(false),

  // Analytics
  weeklyDigest: z.boolean().default(false), // LLM insights - opt-in
})

export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>

// ============================================
// Phone Usage Rules
// ============================================

export const PhoneUsageRulesSchema = z.object({
  // Daily limits
  dailyLimitMin: z.number().min(0).max(480).default(30), // Default 30 min
  warningThresholdPercent: z.number().min(0).max(100).default(80),

  // Block durations
  defaultBlockMin: z.number().min(5).max(240).default(30),
  minBlockMin: z.number().min(5).max(60).default(15),
  maxBlockMin: z.number().min(30).max(480).default(240),

  // Pomodoro
  pomodoroEnabled: z.boolean().default(false),
  pomodoroFocusMin: z.number().min(15).max(90).default(25),
  pomodoroBreakMin: z.number().min(3).max(30).default(5),

  // Verification
  requireVerification: z.boolean().default(false),
  verificationMethod: z.enum(['honor_system', 'photo', 'partner']).default('honor_system'),
})

export type PhoneUsageRules = z.infer<typeof PhoneUsageRulesSchema>

// ============================================
// XP Rules
// ============================================

export const XpRulesSchema = z.object({
  // Block XP
  xpPerBlockMin: z.number().min(0).max(10).default(2), // 2 XP per minute
  bonusXpVerified: z.number().min(0).max(100).default(20), // +20 for verified
  bonusXpBossBlock: z.number().min(0).max(100).default(30), // +30 for boss

  // Urge resistance XP
  xpPerUrgeResist: z.number().min(0).max(50).default(15),

  // Task completion XP
  xpPerTaskComplete: z.number().min(0).max(100).default(25),
  xpPerExposureTask: z.number().min(0).max(200).default(50),

  // Penalties
  xpPenaltyPerOverageMin: z.number().min(0).max(10).default(5),
  xpPenaltyViolation: z.number().min(0).max(100).default(50),

  // Decay
  enableDecay: z.boolean().default(false),
  decayPercentPerDay: z.number().min(0).max(10).default(1),
})

export type XpRules = z.infer<typeof XpRulesSchema>

// ============================================
// Streak Rules
// ============================================

export const StreakRulesSchema = z.object({
  // What counts for streak
  requireUnderLimit: z.boolean().default(true),
  requireOneBlock: z.boolean().default(false),
  requireProtocol: z.boolean().default(false),

  // Forgiveness
  graceDays: z.number().min(0).max(3).default(0), // Days of missed before break
  freezesPerMonth: z.number().min(0).max(5).default(0),

  // Penalties
  streakBreakXpPenalty: z.number().min(0).max(500).default(100),
})

export type StreakRules = z.infer<typeof StreakRulesSchema>

// ============================================
// Sleep & Protocol Rules
// ============================================

export const CircadianRulesSchema = z.object({
  // Target wake time
  targetWakeTime: z.string().default('07:00'), // HH:MM format
  wakeWindowMin: z.number().min(0).max(60).default(15), // +/- minutes

  // HP calculation
  baseHp: z.number().min(20).max(100).default(60),
  hpPerOnTimeWake: z.number().min(0).max(20).default(10),
  hpPerProtocolItem: z.number().min(0).max(10).default(5),
  hpPerRestedPoint: z.number().min(0).max(10).default(4), // Per 1-5 scale point

  // Morning protocol items
  protocolItems: z.array(z.string()).default([
    'woke_on_time',
    'got_morning_light',
    'drank_water',
    'delayed_caffeine',
  ]),
})

export type CircadianRules = z.infer<typeof CircadianRulesSchema>

// ============================================
// Boss Mode Rules
// ============================================

export const BossModeRulesSchema = z.object({
  // Damage calculation
  baseDamagePerBlock: z.number().min(1).max(50).default(10),
  damagePerBlockMin: z.number().min(0).max(5).default(1),

  // Time of day multipliers
  morningMultiplier: z.number().min(1).max(3).default(1.5),
  afternoonMultiplier: z.number().min(1).max(3).default(1.0),
  eveningMultiplier: z.number().min(1).max(3).default(1.2),

  // HP scaling
  hpScalesWithDamage: z.boolean().default(true),
  lowHpDamageBonus: z.number().min(0).max(100).default(25), // +25% at low HP
  lowHpThreshold: z.number().min(20).max(60).default(40),
})

export type BossModeRules = z.infer<typeof BossModeRulesSchema>

// ============================================
// Commitment Rules
// ============================================

export const CommitmentRulesSchema = z.object({
  // Defaults
  defaultPeriodDays: z.number().min(1).max(30).default(7),
  defaultAmountCents: z.number().min(100).max(100000).default(2500), // $25

  // Criteria thresholds
  maxSocialMediaMin: z.number().min(0).max(120).default(30),
  minExposureTasks: z.number().min(0).max(10).default(3),
  minPhoneFreeBlocks: z.number().min(0).max(20).default(5),

  // Grace
  allowPartialCredit: z.boolean().default(false),
})

export type CommitmentRules = z.infer<typeof CommitmentRulesSchema>

// ============================================
// UI Preferences
// ============================================

export const UiPreferencesSchema = z.object({
  // Theme
  theme: z.enum(['light', 'dark', 'system']).default('system'),

  // Notifications
  enableNotifications: z.boolean().default(true),
  blockReminders: z.boolean().default(true),
  streakReminders: z.boolean().default(true),

  // Dashboard
  showXpOnDashboard: z.boolean().default(true),
  showStreakOnDashboard: z.boolean().default(true),
  showBossOnDashboard: z.boolean().default(true),

  // Scroll interrupt
  scrollInterruptEnabled: z.boolean().default(true),
  scrollInterruptSource: z.enum(['bottom_nav', 'mobile_button', 'both']).default('both'),
})

export type UiPreferences = z.infer<typeof UiPreferencesSchema>

// ============================================
// Complete Settings Schema
// ============================================

const DEFAULT_FEATURE_FLAGS = FeatureFlagsSchema.parse({})
const DEFAULT_PHONE_USAGE = PhoneUsageRulesSchema.parse({})
const DEFAULT_XP = XpRulesSchema.parse({})
const DEFAULT_STREAKS = StreakRulesSchema.parse({})
const DEFAULT_CIRCADIAN = CircadianRulesSchema.parse({})
const DEFAULT_BOSS_MODE = BossModeRulesSchema.parse({})
const DEFAULT_COMMITMENTS = CommitmentRulesSchema.parse({})
const DEFAULT_UI = UiPreferencesSchema.parse({})

export const UserSettingsV1Schema = z.object({
  version: z.literal(1).default(1),

  features: FeatureFlagsSchema.default(DEFAULT_FEATURE_FLAGS),
  phoneUsage: PhoneUsageRulesSchema.default(DEFAULT_PHONE_USAGE),
  xp: XpRulesSchema.default(DEFAULT_XP),
  streaks: StreakRulesSchema.default(DEFAULT_STREAKS),
  circadian: CircadianRulesSchema.default(DEFAULT_CIRCADIAN),
  bossMode: BossModeRulesSchema.default(DEFAULT_BOSS_MODE),
  commitments: CommitmentRulesSchema.default(DEFAULT_COMMITMENTS),
  ui: UiPreferencesSchema.default(DEFAULT_UI),

  updatedAt: z.string().datetime().optional(),
})

export type UserSettingsV1 = z.infer<typeof UserSettingsV1Schema>

// ============================================
// Presets
// ============================================

export const SETTINGS_PRESETS = {
  // Gentle start - minimal features, forgiving rules
  gentle: {
    version: 1 as const,
    features: {
      phoneFreeBlocks: true,
      urgeLogging: true,
      sleepTracking: false,
      morningProtocol: false,
      bossMode: false,
      streakTracking: true,
      xpSystem: true,
      buildMode: false,
      commitments: false,
      antiCharity: false,
      partnerVerification: false,
      weeklyDigest: false,
    },
    phoneUsage: {
      dailyLimitMin: 60,
      warningThresholdPercent: 90,
      defaultBlockMin: 15,
      minBlockMin: 10,
      maxBlockMin: 60,
      pomodoroEnabled: false,
      pomodoroFocusMin: 25,
      pomodoroBreakMin: 5,
      requireVerification: false,
      verificationMethod: 'honor_system' as const,
    },
    xp: {
      xpPerBlockMin: 2,
      bonusXpVerified: 10,
      bonusXpBossBlock: 0,
      xpPerUrgeResist: 10,
      xpPerTaskComplete: 20,
      xpPerExposureTask: 30,
      xpPenaltyPerOverageMin: 2,
      xpPenaltyViolation: 25,
      enableDecay: false,
      decayPercentPerDay: 0,
    },
    streaks: {
      requireUnderLimit: true,
      requireOneBlock: false,
      requireProtocol: false,
      graceDays: 1,
      freezesPerMonth: 2,
      streakBreakXpPenalty: 50,
    },
    circadian: {
      targetWakeTime: '08:00',
      wakeWindowMin: 30,
      baseHp: 70,
      hpPerOnTimeWake: 10,
      hpPerProtocolItem: 5,
      hpPerRestedPoint: 4,
      protocolItems: ['woke_on_time', 'drank_water'],
    },
    bossMode: {
      baseDamagePerBlock: 10,
      damagePerBlockMin: 1,
      morningMultiplier: 1.0,
      afternoonMultiplier: 1.0,
      eveningMultiplier: 1.0,
      hpScalesWithDamage: false,
      lowHpDamageBonus: 0,
      lowHpThreshold: 40,
    },
    commitments: {
      defaultPeriodDays: 7,
      defaultAmountCents: 1000,
      maxSocialMediaMin: 60,
      minExposureTasks: 1,
      minPhoneFreeBlocks: 3,
      allowPartialCredit: true,
    },
    ui: {
      theme: 'system' as const,
      enableNotifications: true,
      blockReminders: true,
      streakReminders: true,
      showXpOnDashboard: true,
      showStreakOnDashboard: true,
      showBossOnDashboard: false,
      scrollInterruptEnabled: true,
      scrollInterruptSource: 'mobile_button' as const,
    },
  },

  // Standard - balanced experience
  standard: UserSettingsV1Schema.parse({}), // All defaults

  // Hardcore - all features, strict rules
  hardcore: {
    version: 1 as const,
    features: {
      phoneFreeBlocks: true,
      urgeLogging: true,
      sleepTracking: true,
      morningProtocol: true,
      bossMode: true,
      streakTracking: true,
      xpSystem: true,
      buildMode: true,
      commitments: true,
      antiCharity: true,
      partnerVerification: true,
      weeklyDigest: true,
    },
    phoneUsage: {
      dailyLimitMin: 20,
      warningThresholdPercent: 70,
      defaultBlockMin: 45,
      minBlockMin: 20,
      maxBlockMin: 180,
      pomodoroEnabled: true,
      pomodoroFocusMin: 50,
      pomodoroBreakMin: 10,
      requireVerification: true,
      verificationMethod: 'partner' as const,
    },
    xp: {
      xpPerBlockMin: 3,
      bonusXpVerified: 30,
      bonusXpBossBlock: 50,
      xpPerUrgeResist: 25,
      xpPerTaskComplete: 40,
      xpPerExposureTask: 100,
      xpPenaltyPerOverageMin: 10,
      xpPenaltyViolation: 100,
      enableDecay: true,
      decayPercentPerDay: 2,
    },
    streaks: {
      requireUnderLimit: true,
      requireOneBlock: true,
      requireProtocol: true,
      graceDays: 0,
      freezesPerMonth: 0,
      streakBreakXpPenalty: 200,
    },
    circadian: {
      targetWakeTime: '06:00',
      wakeWindowMin: 10,
      baseHp: 50,
      hpPerOnTimeWake: 15,
      hpPerProtocolItem: 10,
      hpPerRestedPoint: 5,
      protocolItems: ['woke_on_time', 'got_morning_light', 'drank_water', 'delayed_caffeine'],
    },
    bossMode: {
      baseDamagePerBlock: 15,
      damagePerBlockMin: 2,
      morningMultiplier: 2.0,
      afternoonMultiplier: 1.0,
      eveningMultiplier: 1.5,
      hpScalesWithDamage: true,
      lowHpDamageBonus: 50,
      lowHpThreshold: 50,
    },
    commitments: {
      defaultPeriodDays: 7,
      defaultAmountCents: 10000,
      maxSocialMediaMin: 20,
      minExposureTasks: 5,
      minPhoneFreeBlocks: 10,
      allowPartialCredit: false,
    },
    ui: {
      theme: 'dark' as const,
      enableNotifications: true,
      blockReminders: true,
      streakReminders: true,
      showXpOnDashboard: true,
      showStreakOnDashboard: true,
      showBossOnDashboard: true,
      scrollInterruptEnabled: true,
      scrollInterruptSource: 'both' as const,
    },
  },
} as const satisfies Record<string, UserSettingsV1>

export type SettingsPreset = keyof typeof SETTINGS_PRESETS

// ============================================
// Helpers
// ============================================

export function parseSettings(data: unknown): UserSettingsV1 {
  return UserSettingsV1Schema.parse(data)
}

export function safeParseSettings(data: unknown): UserSettingsV1 {
  const result = UserSettingsV1Schema.safeParse(data)
  if (result.success) {
    return result.data
  }
  // Return defaults on parse failure
  return UserSettingsV1Schema.parse({})
}

export function mergeWithDefaults(partial: Partial<UserSettingsV1>): UserSettingsV1 {
  return UserSettingsV1Schema.parse(partial)
}
