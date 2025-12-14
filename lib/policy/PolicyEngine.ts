/**
 * PolicyEngine - Centralized rule evaluation for Discipline Dungeon
 *
 * All game mechanics consult the PolicyEngine for rules and calculations.
 * Settings are loaded from user preferences and cached.
 */

import {
  UserSettingsV1,
  safeParseSettings,
  SETTINGS_PRESETS,
  type SettingsPreset,
} from './settings.schema'

// ============================================
// Types
// ============================================

export interface BlockXpResult {
  baseXp: number
  verifiedBonus: number
  bossBonus: number
  totalXp: number
}

export interface DamageResult {
  baseDamage: number
  timeMultiplier: number
  hpBonus: number
  totalDamage: number
}

export interface HpCalculation {
  baseHp: number
  wakeBonus: number
  protocolBonus: number
  restedBonus: number
  totalHp: number
}

export interface StreakEvaluation {
  maintained: boolean
  reason?: string
  graceUsed: boolean
}

export interface CommitmentEvaluation {
  passed: boolean
  metrics: {
    socialMediaOk: boolean
    exposureTasksOk: boolean
    phoneFreeBlocksOk: boolean
  }
}

type TimeOfDay = 'morning' | 'afternoon' | 'evening'

// ============================================
// PolicyEngine Class
// ============================================

export class PolicyEngine {
  private settings: UserSettingsV1

  constructor(settings?: Partial<UserSettingsV1> | null) {
    this.settings = safeParseSettings(settings ?? {})
  }

  // ----------------------------------------
  // Settings Management
  // ----------------------------------------

  getSettings(): UserSettingsV1 {
    return this.settings
  }

  updateSettings(partial: Partial<UserSettingsV1>): void {
    this.settings = safeParseSettings({
      ...this.settings,
      ...partial,
      updatedAt: new Date().toISOString(),
    })
  }

  applyPreset(preset: SettingsPreset): void {
    this.settings = { ...SETTINGS_PRESETS[preset] }
  }

  // ----------------------------------------
  // Feature Checks
  // ----------------------------------------

  isFeatureEnabled(feature: keyof UserSettingsV1['features']): boolean {
    return this.settings.features[feature]
  }

  getEnabledFeatures(): string[] {
    return Object.entries(this.settings.features)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key)
  }

  // ----------------------------------------
  // Phone Usage Rules
  // ----------------------------------------

  getDailyLimit(): number {
    return this.settings.phoneUsage.dailyLimitMin
  }

  getWarningThreshold(): number {
    return Math.floor(
      this.settings.phoneUsage.dailyLimitMin *
        (this.settings.phoneUsage.warningThresholdPercent / 100)
    )
  }

  isOverLimit(usageMin: number): boolean {
    return usageMin > this.settings.phoneUsage.dailyLimitMin
  }

  getOverage(usageMin: number): number {
    return Math.max(0, usageMin - this.settings.phoneUsage.dailyLimitMin)
  }

  getBlockDurationOptions(): { min: number; default: number; max: number } {
    return {
      min: this.settings.phoneUsage.minBlockMin,
      default: this.settings.phoneUsage.defaultBlockMin,
      max: this.settings.phoneUsage.maxBlockMin,
    }
  }

  isPomodoroEnabled(): boolean {
    return this.settings.phoneUsage.pomodoroEnabled
  }

  getPomodoroSettings(): { focusMin: number; breakMin: number } {
    return {
      focusMin: this.settings.phoneUsage.pomodoroFocusMin,
      breakMin: this.settings.phoneUsage.pomodoroBreakMin,
    }
  }

  // ----------------------------------------
  // XP Calculations
  // ----------------------------------------

  calculateBlockXp(
    durationMin: number,
    options: { verified?: boolean; isBossBlock?: boolean } = {}
  ): BlockXpResult {
    const { xp } = this.settings

    const baseXp = durationMin * xp.xpPerBlockMin
    const verifiedBonus = options.verified ? xp.bonusXpVerified : 0
    const bossBonus = options.isBossBlock ? xp.bonusXpBossBlock : 0

    return {
      baseXp,
      verifiedBonus,
      bossBonus,
      totalXp: baseXp + verifiedBonus + bossBonus,
    }
  }

  getUrgeResistXp(): number {
    return this.settings.xp.xpPerUrgeResist
  }

  getTaskCompleteXp(isExposureTask: boolean = false): number {
    return isExposureTask
      ? this.settings.xp.xpPerExposureTask
      : this.settings.xp.xpPerTaskComplete
  }

  calculateOveragePenalty(overageMin: number): number {
    return overageMin * this.settings.xp.xpPenaltyPerOverageMin
  }

  getViolationPenalty(): number {
    return this.settings.xp.xpPenaltyViolation
  }

  calculateDecay(currentXp: number): number {
    if (!this.settings.xp.enableDecay) return 0
    return Math.floor(currentXp * (this.settings.xp.decayPercentPerDay / 100))
  }

  // ----------------------------------------
  // Streak Evaluation
  // ----------------------------------------

  evaluateStreak(
    stats: {
      underLimit: boolean
      completedBlock: boolean
      completedProtocol: boolean
      graceDaysUsed: number
    },
    currentStreak: number
  ): StreakEvaluation {
    const { streaks } = this.settings
    const reasons: string[] = []

    // Check requirements
    if (streaks.requireUnderLimit && !stats.underLimit) {
      reasons.push('Over phone limit')
    }
    if (streaks.requireOneBlock && !stats.completedBlock) {
      reasons.push('No phone-free block')
    }
    if (streaks.requireProtocol && !stats.completedProtocol) {
      reasons.push('Protocol incomplete')
    }

    const failed = reasons.length > 0

    // Check grace days
    if (failed && stats.graceDaysUsed < streaks.graceDays) {
      return {
        maintained: true,
        graceUsed: true,
        reason: `Grace day used (${reasons.join(', ')})`,
      }
    }

    return {
      maintained: !failed,
      reason: failed ? reasons.join(', ') : undefined,
      graceUsed: false,
    }
  }

  getStreakBreakPenalty(): number {
    return this.settings.streaks.streakBreakXpPenalty
  }

  // ----------------------------------------
  // HP Calculation (Circadian)
  // ----------------------------------------

  calculateHp(
    stats: {
      wokeOnTime: boolean
      protocolItemsCompleted: number
      restedRating: number // 1-5 scale
    }
  ): HpCalculation {
    const { circadian } = this.settings

    const baseHp = circadian.baseHp
    const wakeBonus = stats.wokeOnTime ? circadian.hpPerOnTimeWake : 0
    const protocolBonus = stats.protocolItemsCompleted * circadian.hpPerProtocolItem
    const restedBonus = stats.restedRating * circadian.hpPerRestedPoint

    return {
      baseHp,
      wakeBonus,
      protocolBonus,
      restedBonus,
      totalHp: Math.min(100, baseHp + wakeBonus + protocolBonus + restedBonus),
    }
  }

  getTargetWakeTime(): string {
    return this.settings.circadian.targetWakeTime
  }

  getWakeWindow(): number {
    return this.settings.circadian.wakeWindowMin
  }

  isWakeOnTime(actualWakeTime: Date): boolean {
    const [targetHour, targetMin] = this.settings.circadian.targetWakeTime.split(':').map(Number)
    const targetMinutes = targetHour * 60 + targetMin
    const actualMinutes = actualWakeTime.getHours() * 60 + actualWakeTime.getMinutes()

    const variance = Math.abs(actualMinutes - targetMinutes)
    return variance <= this.settings.circadian.wakeWindowMin
  }

  getProtocolItems(): string[] {
    return this.settings.circadian.protocolItems
  }

  // ----------------------------------------
  // Boss Mode Damage
  // ----------------------------------------

  calculateDamage(
    durationMin: number,
    timeOfDay: TimeOfDay,
    currentHp: number
  ): DamageResult {
    const { bossMode } = this.settings

    const baseDamage = bossMode.baseDamagePerBlock + durationMin * bossMode.damagePerBlockMin

    // Time multiplier
    const timeMultiplier =
      timeOfDay === 'morning'
        ? bossMode.morningMultiplier
        : timeOfDay === 'evening'
          ? bossMode.eveningMultiplier
          : bossMode.afternoonMultiplier

    // HP bonus (more damage when HP is low - "clutch" bonus)
    let hpBonus = 0
    if (bossMode.hpScalesWithDamage && currentHp <= bossMode.lowHpThreshold) {
      hpBonus = (baseDamage * timeMultiplier * bossMode.lowHpDamageBonus) / 100
    }

    const totalDamage = Math.round(baseDamage * timeMultiplier + hpBonus)

    return {
      baseDamage,
      timeMultiplier,
      hpBonus: Math.round(hpBonus),
      totalDamage,
    }
  }

  getTimeOfDay(date: Date = new Date()): TimeOfDay {
    const hour = date.getHours()
    if (hour >= 5 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 17) return 'afternoon'
    return 'evening'
  }

  // ----------------------------------------
  // Commitment Evaluation
  // ----------------------------------------

  evaluateCommitment(
    metrics: {
      avgSocialMediaMin: number
      exposureTasksCompleted: number
      phoneFreeBlocksCompleted: number
    }
  ): CommitmentEvaluation {
    const { commitments } = this.settings

    const socialMediaOk = metrics.avgSocialMediaMin <= commitments.maxSocialMediaMin
    const exposureTasksOk = metrics.exposureTasksCompleted >= commitments.minExposureTasks
    const phoneFreeBlocksOk = metrics.phoneFreeBlocksCompleted >= commitments.minPhoneFreeBlocks

    const passed = socialMediaOk && exposureTasksOk && phoneFreeBlocksOk

    return {
      passed,
      metrics: {
        socialMediaOk,
        exposureTasksOk,
        phoneFreeBlocksOk,
      },
    }
  }

  getCommitmentDefaults(): {
    periodDays: number
    amountCents: number
    criteria: {
      maxSocialMediaMin: number
      minExposureTasks: number
      minPhoneFreeBlocks: number
    }
  } {
    return {
      periodDays: this.settings.commitments.defaultPeriodDays,
      amountCents: this.settings.commitments.defaultAmountCents,
      criteria: {
        maxSocialMediaMin: this.settings.commitments.maxSocialMediaMin,
        minExposureTasks: this.settings.commitments.minExposureTasks,
        minPhoneFreeBlocks: this.settings.commitments.minPhoneFreeBlocks,
      },
    }
  }

  // ----------------------------------------
  // UI Preferences
  // ----------------------------------------

  getTheme(): 'light' | 'dark' | 'system' {
    return this.settings.ui.theme
  }

  isScrollInterruptEnabled(): boolean {
    return this.settings.ui.scrollInterruptEnabled
  }

  getScrollInterruptSource(): 'bottom_nav' | 'mobile_button' | 'both' {
    return this.settings.ui.scrollInterruptSource
  }

  shouldShowOnDashboard(item: 'xp' | 'streak' | 'boss'): boolean {
    switch (item) {
      case 'xp':
        return this.settings.ui.showXpOnDashboard
      case 'streak':
        return this.settings.ui.showStreakOnDashboard
      case 'boss':
        return this.settings.ui.showBossOnDashboard
    }
  }
}

// ============================================
// Singleton & Factory
// ============================================

let defaultEngine: PolicyEngine | null = null

export function getDefaultEngine(): PolicyEngine {
  if (!defaultEngine) {
    defaultEngine = new PolicyEngine()
  }
  return defaultEngine
}

export function createEngine(settings?: Partial<UserSettingsV1> | null): PolicyEngine {
  return new PolicyEngine(settings)
}

export function resetDefaultEngine(): void {
  defaultEngine = null
}

// ============================================
// React Hook Support (for client components)
// ============================================

export function createEngineFromJson(settingsJson: string | null): PolicyEngine {
  if (!settingsJson) return new PolicyEngine()
  try {
    const parsed = JSON.parse(settingsJson)
    return new PolicyEngine(parsed)
  } catch {
    return new PolicyEngine()
  }
}
