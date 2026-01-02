'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  UserSettingsV1,
  SETTINGS_PRESETS,
  type SettingsPreset,
} from '@/lib/policy/settings.schema'
import { createEngine } from '@/lib/policy/PolicyEngine'
import { useUserSettings } from '@/lib/settings/useUserSettings'
import { AccountSection } from '@/components/auth/AccountSection'
import { AuthGate } from '@/components/auth/AuthGate'
import { Button } from '@/components/ui/Button'

type SettingsSection =
  | 'features'
  | 'phone'
  | 'xp'
  | 'streaks'
  | 'circadian'
  | 'boss'
  | 'commitments'
  | 'ui'

export default function SettingsPage() {
  const { settings, isLoading, error, saveSettings, reload } = useUserSettings()
  const [localSettings, setLocalSettings] = useState<UserSettingsV1 | null>(null)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<SettingsSection>('features')
  const [hasChanges, setHasChanges] = useState(false)

  // Sync local copy when settings load
  useEffect(() => {
    if (settings) {
      const engine = createEngine(settings)
      setLocalSettings(engine.getSettings())
      setHasChanges(false)
    }
  }, [settings])

  const handleSave = useCallback(async () => {
    if (!localSettings) return
    setSaving(true)
    try {
      await saveSettings(localSettings)
      setHasChanges(false)
    } finally {
      setSaving(false)
    }
  }, [localSettings, saveSettings])

  const applyPreset = (preset: SettingsPreset) => {
    setLocalSettings({ ...SETTINGS_PRESETS[preset] })
    setHasChanges(true)
  }

  const updateFeature = useCallback(
    (key: keyof UserSettingsV1['features'], value: boolean) => {
      if (!localSettings) return
      setLocalSettings({
        ...localSettings,
        features: { ...localSettings.features, [key]: value },
      })
      setHasChanges(true)
    },
    [localSettings]
  )

  const updatePhoneUsage = useCallback(
    <K extends keyof UserSettingsV1['phoneUsage']>(
      key: K,
      value: UserSettingsV1['phoneUsage'][K]
    ) => {
      if (!localSettings) return
      setLocalSettings({
        ...localSettings,
        phoneUsage: { ...localSettings.phoneUsage, [key]: value },
      })
      setHasChanges(true)
    },
    [localSettings]
  )

  const updateXp = useCallback(
    <K extends keyof UserSettingsV1['xp']>(key: K, value: UserSettingsV1['xp'][K]) => {
      if (!localSettings) return
      setLocalSettings({
        ...localSettings,
        xp: { ...localSettings.xp, [key]: value },
      })
      setHasChanges(true)
    },
    [localSettings]
  )

  const updateStreaks = useCallback(
    <K extends keyof UserSettingsV1['streaks']>(
      key: K,
      value: UserSettingsV1['streaks'][K]
    ) => {
      if (!localSettings) return
      setLocalSettings({
        ...localSettings,
        streaks: { ...localSettings.streaks, [key]: value },
      })
      setHasChanges(true)
    },
    [localSettings]
  )

  const updateCircadian = useCallback(
    <K extends keyof UserSettingsV1['circadian']>(
      key: K,
      value: UserSettingsV1['circadian'][K]
    ) => {
      if (!localSettings) return
      setLocalSettings({
        ...localSettings,
        circadian: { ...localSettings.circadian, [key]: value },
      })
      setHasChanges(true)
    },
    [localSettings]
  )

  const updateBossMode = useCallback(
    <K extends keyof UserSettingsV1['bossMode']>(
      key: K,
      value: UserSettingsV1['bossMode'][K]
    ) => {
      if (!localSettings) return
      setLocalSettings({
        ...localSettings,
        bossMode: { ...localSettings.bossMode, [key]: value },
      })
      setHasChanges(true)
    },
    [localSettings]
  )

  const updateUi = useCallback(
    <K extends keyof UserSettingsV1['ui']>(key: K, value: UserSettingsV1['ui'][K]) => {
      if (!localSettings) return
      setLocalSettings({
        ...localSettings,
        ui: { ...localSettings.ui, [key]: value },
      })
      setHasChanges(true)
    },
    [localSettings]
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent text-dd-text flex items-center justify-center">
        <p className="text-dd-muted">Loading settings...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-transparent text-dd-text flex flex-col items-center justify-center space-y-3">
        <p className="text-blood font-semibold">Error loading settings</p>
        <p className="text-sm text-dd-muted">{error}</p>
        <Button variant="primary" size="sm" onClick={reload}>
          Retry
        </Button>
      </div>
    )
  }

  if (!localSettings) {
    return (
      <div className="min-h-screen bg-transparent text-dd-text flex items-center justify-center">
        <p className="text-blood">No settings found</p>
      </div>
    )
  }

  return (
    <AuthGate>
      <div className="min-h-screen bg-transparent text-dd-text">
      {/* Header */}
      <header className="glass-panel rounded-none p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/mobile" className="text-2xl">
            ←
          </Link>
          <h1 className="text-xl font-serif uppercase tracking-widest text-mana">
            Settings
          </h1>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          variant="primary"
          size="sm"
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </header>

      {/* Content */}
      <div className="p-4 space-y-4">
        <AccountSection />

        {/* Sub-pages */}
        <Link
          href="/settings/task-types"
          className="block glass-panel p-4 transition-transform hover:-translate-y-1"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-dd-text">Task Types</div>
              <div className="text-sm text-dd-muted">
                Create and weight your own task categories
              </div>
            </div>
            <div className="text-dd-muted text-xl">→</div>
          </div>
        </Link>

        <Link
          href="/settings/iphone-verification"
          className="block glass-panel p-4 transition-transform hover:-translate-y-1"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-dd-text">
                iPhone Verification
              </div>
              <div className="text-sm text-dd-muted">
                Sync iPhone Screen Time to verify daily minutes
              </div>
            </div>
            <div className="text-dd-muted text-xl">→</div>
          </div>
        </Link>

        {/* Presets */}
        <div className="glass-panel rounded-xl p-4">
          <h2 className="text-sm font-serif uppercase tracking-widest text-mana mb-3">
            Quick Presets
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => applyPreset('gentle')}
              className="scroll-card p-3 text-left transition-transform hover:-translate-y-1"
            >
              <div className="text-xl mb-1">🌱</div>
              <div className="text-sm font-medium text-dd-text">Gentle</div>
              <div className="text-xs text-dd-muted">Forgiving</div>
            </button>
            <button
              onClick={() => applyPreset('standard')}
              className="scroll-card p-3 text-left transition-transform hover:-translate-y-1"
            >
              <div className="text-xl mb-1">⚔️</div>
              <div className="text-sm font-medium text-dd-text">Standard</div>
              <div className="text-xs text-dd-muted">Balanced</div>
            </button>
            <button
              onClick={() => applyPreset('hardcore')}
              className="scroll-card p-3 text-left transition-transform hover:-translate-y-1"
            >
              <div className="text-xl mb-1">🔥</div>
              <div className="text-sm font-medium text-dd-text">Hardcore</div>
              <div className="text-xs text-dd-muted">Strict</div>
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="glass-panel rounded-xl p-2 flex gap-2 overflow-x-auto">
          {(
            [
              { key: 'features', label: 'Features', icon: '⚙️' },
              { key: 'phone', label: 'Phone', icon: '📱' },
              { key: 'xp', label: 'XP', icon: '✨' },
              { key: 'streaks', label: 'Streaks', icon: '🔥' },
              { key: 'circadian', label: 'Sleep', icon: '😴' },
              { key: 'boss', label: 'Boss', icon: '👹' },
              { key: 'ui', label: 'UI', icon: '🎨' },
            ] as const
          ).map((section) => (
            <button
              key={section.key}
              onClick={() => setActiveSection(section.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-all border ${
                activeSection === section.key
                  ? 'bg-mana/20 text-mana border-mana/40'
                  : 'bg-dd-surface/80 text-dd-muted/80 border-dd-border/50 hover:text-dd-text hover:bg-dd-surface/90'
              }`}
            >
              {section.icon} {section.label}
            </button>
          ))}
        </div>

        {/* Section Content */}
        <div className="glass-panel rounded-xl p-4 space-y-4">
          {/* Features Section */}
          {activeSection === 'features' && (
            <>
              <h3 className="text-sm font-serif uppercase tracking-widest text-mana border-b border-dd-border/50 pb-2">
                Feature Toggles
              </h3>

              <div className="space-y-3">
                <ToggleRow
                  label="Phone-Free Blocks"
                  description="Core focus sessions"
                  checked={localSettings.features.phoneFreeBlocks}
                  onChange={(v) => updateFeature('phoneFreeBlocks', v)}
                />
                <ToggleRow
                  label="Urge Logging"
                  description="Track scroll urges"
                  checked={localSettings.features.urgeLogging}
                  onChange={(v) => updateFeature('urgeLogging', v)}
                />
                <ToggleRow
                  label="Sleep Tracking"
                  description="Log sleep for HP"
                  checked={localSettings.features.sleepTracking}
                  onChange={(v) => updateFeature('sleepTracking', v)}
                />
                <ToggleRow
                  label="Morning Protocol"
                  description="Daily checklist routine"
                  checked={localSettings.features.morningProtocol}
                  onChange={(v) => updateFeature('morningProtocol', v)}
                />
                <ToggleRow
                  label="Boss Mode"
                  description="Task battles with damage"
                  checked={localSettings.features.bossMode}
                  onChange={(v) => updateFeature('bossMode', v)}
                />
                <ToggleRow
                  label="Streak Tracking"
                  description="Daily consistency tracking"
                  checked={localSettings.features.streakTracking}
                  onChange={(v) => updateFeature('streakTracking', v)}
                />
                <ToggleRow
                  label="XP System"
                  description="Experience points"
                  checked={localSettings.features.xpSystem}
                  onChange={(v) => updateFeature('xpSystem', v)}
                />
                <ToggleRow
                  label="Build Mode"
                  description="Cathedral meta-progression"
                  checked={localSettings.features.buildMode}
                  onChange={(v) => updateFeature('buildMode', v)}
                />

                <div className="border-t border-dd-border/50 pt-3 mt-3">
                  <div className="text-sm text-dd-muted mb-2">
                    Stakes (opt-in)
                  </div>
                  <ToggleRow
                    label="Commitments"
                    description="Weekly stake challenges"
                    checked={localSettings.features.commitments}
                    onChange={(v) => updateFeature('commitments', v)}
                  />
                  <ToggleRow
                    label="Anti-Charity"
                    description="Donate on failure"
                    checked={localSettings.features.antiCharity}
                    onChange={(v) => updateFeature('antiCharity', v)}
                  />
                </div>

                <div className="border-t border-dd-border/50 pt-3 mt-3">
                  <div className="text-sm text-dd-muted mb-2">Social</div>
                  <ToggleRow
                    label="Partner Verification"
                    description="Accountability partner"
                    checked={localSettings.features.partnerVerification}
                    onChange={(v) => updateFeature('partnerVerification', v)}
                  />
                  <ToggleRow
                    label="Weekly Digest"
                    description="LLM insights email"
                    checked={localSettings.features.weeklyDigest}
                    onChange={(v) => updateFeature('weeklyDigest', v)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Phone Usage Section */}
          {activeSection === 'phone' && (
            <>
              <h3 className="text-sm font-serif uppercase tracking-widest text-mana border-b border-dd-border/50 pb-2">
                Phone Usage Rules
              </h3>

              <NumberInput
                label="Daily Limit (min)"
                value={localSettings.phoneUsage.dailyLimitMin}
                onChange={(v) => updatePhoneUsage('dailyLimitMin', v)}
                min={0}
                max={480}
                step={5}
              />
              <NumberInput
                label="Warning Threshold (%)"
                value={localSettings.phoneUsage.warningThresholdPercent}
                onChange={(v) => updatePhoneUsage('warningThresholdPercent', v)}
                min={50}
                max={100}
                step={5}
              />

              <div className="border-t border-dd-border/50 pt-3 mt-3">
                <div className="text-sm text-dd-muted mb-2">Block Durations</div>
                <NumberInput
                  label="Default Block (min)"
                  value={localSettings.phoneUsage.defaultBlockMin}
                  onChange={(v) => updatePhoneUsage('defaultBlockMin', v)}
                  min={5}
                  max={180}
                  step={5}
                />
                <NumberInput
                  label="Min Block (min)"
                  value={localSettings.phoneUsage.minBlockMin}
                  onChange={(v) => updatePhoneUsage('minBlockMin', v)}
                  min={5}
                  max={60}
                  step={5}
                />
                <NumberInput
                  label="Max Block (min)"
                  value={localSettings.phoneUsage.maxBlockMin}
                  onChange={(v) => updatePhoneUsage('maxBlockMin', v)}
                  min={30}
                  max={480}
                  step={15}
                />
              </div>

              <div className="border-t border-dd-border/50 pt-3 mt-3">
                <div className="text-sm text-dd-muted mb-2">Pomodoro</div>
                <ToggleRow
                  label="Enable Pomodoro"
                  description="Timed focus/break cycles"
                  checked={localSettings.phoneUsage.pomodoroEnabled}
                  onChange={(v) => updatePhoneUsage('pomodoroEnabled', v)}
                />
                {localSettings.phoneUsage.pomodoroEnabled && (
                  <>
                    <NumberInput
                      label="Focus Duration (min)"
                      value={localSettings.phoneUsage.pomodoroFocusMin}
                      onChange={(v) => updatePhoneUsage('pomodoroFocusMin', v)}
                      min={15}
                      max={90}
                      step={5}
                    />
                    <NumberInput
                      label="Break Duration (min)"
                      value={localSettings.phoneUsage.pomodoroBreakMin}
                      onChange={(v) => updatePhoneUsage('pomodoroBreakMin', v)}
                      min={3}
                      max={30}
                      step={1}
                    />
                  </>
                )}
              </div>

              <div className="border-t border-dd-border/50 pt-3 mt-3">
                <div className="text-sm text-dd-muted mb-2">Verification</div>
                <ToggleRow
                  label="Require Verification"
                  description="Confirm block completion"
                  checked={localSettings.phoneUsage.requireVerification}
                  onChange={(v) => updatePhoneUsage('requireVerification', v)}
                />
                {localSettings.phoneUsage.requireVerification && (
                  <SelectInput
                    label="Verification Method"
                    value={localSettings.phoneUsage.verificationMethod}
                    onChange={(v) =>
                      updatePhoneUsage(
                        'verificationMethod',
                        v as 'honor_system' | 'photo' | 'partner'
                      )
                    }
                    options={[
                      { value: 'honor_system', label: 'Honor System' },
                      { value: 'photo', label: 'Photo Proof' },
                      { value: 'partner', label: 'Partner Verify' },
                    ]}
                  />
                )}
              </div>
            </>
          )}

          {/* XP Section */}
          {activeSection === 'xp' && (
            <>
              <h3 className="text-sm font-serif uppercase tracking-widest text-mana border-b border-dd-border/50 pb-2">
                XP Rules
              </h3>

              <div className="text-sm text-dd-muted mb-2">Rewards</div>
              <NumberInput
                label="XP per Block Minute"
                value={localSettings.xp.xpPerBlockMin}
                onChange={(v) => updateXp('xpPerBlockMin', v)}
                min={0}
                max={10}
                step={1}
              />
              <NumberInput
                label="Verified Block Bonus"
                value={localSettings.xp.bonusXpVerified}
                onChange={(v) => updateXp('bonusXpVerified', v)}
                min={0}
                max={100}
                step={5}
              />
              <NumberInput
                label="Boss Block Bonus"
                value={localSettings.xp.bonusXpBossBlock}
                onChange={(v) => updateXp('bonusXpBossBlock', v)}
                min={0}
                max={100}
                step={5}
              />
              <NumberInput
                label="Urge Resist XP"
                value={localSettings.xp.xpPerUrgeResist}
                onChange={(v) => updateXp('xpPerUrgeResist', v)}
                min={0}
                max={50}
                step={5}
              />
              <NumberInput
                label="Task Complete XP"
                value={localSettings.xp.xpPerTaskComplete}
                onChange={(v) => updateXp('xpPerTaskComplete', v)}
                min={0}
                max={100}
                step={5}
              />
              <NumberInput
                label="Exposure Task XP"
                value={localSettings.xp.xpPerExposureTask}
                onChange={(v) => updateXp('xpPerExposureTask', v)}
                min={0}
                max={200}
                step={10}
              />

              <div className="border-t border-dd-border/50 pt-3 mt-3">
                <div className="text-sm text-dd-muted mb-2">Penalties</div>
                <NumberInput
                  label="Penalty per Overage Min"
                  value={localSettings.xp.xpPenaltyPerOverageMin}
                  onChange={(v) => updateXp('xpPenaltyPerOverageMin', v)}
                  min={0}
                  max={10}
                  step={1}
                />
                <NumberInput
                  label="Violation Penalty"
                  value={localSettings.xp.xpPenaltyViolation}
                  onChange={(v) => updateXp('xpPenaltyViolation', v)}
                  min={0}
                  max={100}
                  step={10}
                />
              </div>

              <div className="border-t border-dd-border/50 pt-3 mt-3">
                <div className="text-sm text-dd-muted mb-2">Decay</div>
                <ToggleRow
                  label="Enable XP Decay"
                  description="Lose XP daily if inactive"
                  checked={localSettings.xp.enableDecay}
                  onChange={(v) => updateXp('enableDecay', v)}
                />
                {localSettings.xp.enableDecay && (
                  <NumberInput
                    label="Decay % per Day"
                    value={localSettings.xp.decayPercentPerDay}
                    onChange={(v) => updateXp('decayPercentPerDay', v)}
                    min={0}
                    max={10}
                    step={0.5}
                  />
                )}
              </div>
            </>
          )}

          {/* Streaks Section */}
          {activeSection === 'streaks' && (
            <>
              <h3 className="text-sm font-serif uppercase tracking-widest text-mana border-b border-dd-border/50 pb-2">
                Streak Rules
              </h3>

              <div className="text-sm text-dd-muted mb-2">
                What counts for streak?
              </div>
              <ToggleRow
                label="Require Under Limit"
                description="Stay under phone limit"
                checked={localSettings.streaks.requireUnderLimit}
                onChange={(v) => updateStreaks('requireUnderLimit', v)}
              />
              <ToggleRow
                label="Require One Block"
                description="Complete a phone-free block"
                checked={localSettings.streaks.requireOneBlock}
                onChange={(v) => updateStreaks('requireOneBlock', v)}
              />
              <ToggleRow
                label="Require Protocol"
                description="Complete morning protocol"
                checked={localSettings.streaks.requireProtocol}
                onChange={(v) => updateStreaks('requireProtocol', v)}
              />

              <div className="border-t border-dd-border/50 pt-3 mt-3">
                <div className="text-sm text-dd-muted mb-2">Forgiveness</div>
                <NumberInput
                  label="Grace Days"
                  value={localSettings.streaks.graceDays}
                  onChange={(v) => updateStreaks('graceDays', v)}
                  min={0}
                  max={3}
                  step={1}
                />
                <NumberInput
                  label="Freezes per Month"
                  value={localSettings.streaks.freezesPerMonth}
                  onChange={(v) => updateStreaks('freezesPerMonth', v)}
                  min={0}
                  max={5}
                  step={1}
                />
                <NumberInput
                  label="Streak Break XP Penalty"
                  value={localSettings.streaks.streakBreakXpPenalty}
                  onChange={(v) => updateStreaks('streakBreakXpPenalty', v)}
                  min={0}
                  max={500}
                  step={25}
                />
              </div>
            </>
          )}

          {/* Circadian Section */}
          {activeSection === 'circadian' && (
            <>
              <h3 className="text-sm font-serif uppercase tracking-widest text-mana border-b border-dd-border/50 pb-2">
                Sleep & Protocol
              </h3>

              <div className="text-sm text-dd-muted mb-2">Wake Target</div>
              <div className="scroll-card flex items-center justify-between gap-4 px-4 py-3 mb-3">
                <label className="text-sm text-dd-text">Target Wake Time</label>
                <input
                  type="time"
                  value={localSettings.circadian.targetWakeTime}
                  onChange={(e) =>
                    updateCircadian('targetWakeTime', e.target.value)
                  }
                  className="px-3 py-2 rounded bg-dd-surface/60 border border-dd-border/60 text-dd-text"
                />
              </div>
              <NumberInput
                label="Wake Window (min)"
                value={localSettings.circadian.wakeWindowMin}
                onChange={(v) => updateCircadian('wakeWindowMin', v)}
                min={0}
                max={60}
                step={5}
              />

              <div className="border-t border-dd-border/50 pt-3 mt-3">
                <div className="text-sm text-dd-muted mb-2">HP Calculation</div>
                <NumberInput
                  label="Base HP"
                  value={localSettings.circadian.baseHp}
                  onChange={(v) => updateCircadian('baseHp', v)}
                  min={20}
                  max={100}
                  step={5}
                />
                <NumberInput
                  label="HP per On-Time Wake"
                  value={localSettings.circadian.hpPerOnTimeWake}
                  onChange={(v) => updateCircadian('hpPerOnTimeWake', v)}
                  min={0}
                  max={20}
                  step={5}
                />
                <NumberInput
                  label="HP per Protocol Item"
                  value={localSettings.circadian.hpPerProtocolItem}
                  onChange={(v) => updateCircadian('hpPerProtocolItem', v)}
                  min={0}
                  max={10}
                  step={1}
                />
                <NumberInput
                  label="HP per Rested Point"
                  value={localSettings.circadian.hpPerRestedPoint}
                  onChange={(v) => updateCircadian('hpPerRestedPoint', v)}
                  min={0}
                  max={10}
                  step={1}
                />
              </div>
            </>
          )}

          {/* Boss Mode Section */}
          {activeSection === 'boss' && (
            <>
              <h3 className="text-sm font-serif uppercase tracking-widest text-mana border-b border-dd-border/50 pb-2">
                Boss Mode Rules
              </h3>

              <div className="text-sm text-dd-muted mb-2">Damage</div>
              <NumberInput
                label="Base Damage per Block"
                value={localSettings.bossMode.baseDamagePerBlock}
                onChange={(v) => updateBossMode('baseDamagePerBlock', v)}
                min={1}
                max={50}
                step={5}
              />
              <NumberInput
                label="Damage per Block Min"
                value={localSettings.bossMode.damagePerBlockMin}
                onChange={(v) => updateBossMode('damagePerBlockMin', v)}
                min={0}
                max={5}
                step={0.5}
              />

              <div className="border-t border-dd-border/50 pt-3 mt-3">
                <div className="text-sm text-dd-muted mb-2">Time Multipliers</div>
                <NumberInput
                  label="Morning (5am-12pm)"
                  value={localSettings.bossMode.morningMultiplier}
                  onChange={(v) => updateBossMode('morningMultiplier', v)}
                  min={1}
                  max={3}
                  step={0.1}
                />
                <NumberInput
                  label="Afternoon (12pm-5pm)"
                  value={localSettings.bossMode.afternoonMultiplier}
                  onChange={(v) => updateBossMode('afternoonMultiplier', v)}
                  min={1}
                  max={3}
                  step={0.1}
                />
                <NumberInput
                  label="Evening (5pm-5am)"
                  value={localSettings.bossMode.eveningMultiplier}
                  onChange={(v) => updateBossMode('eveningMultiplier', v)}
                  min={1}
                  max={3}
                  step={0.1}
                />
              </div>

              <div className="border-t border-dd-border/50 pt-3 mt-3">
                <div className="text-sm text-dd-muted mb-2">Low HP Bonus</div>
                <ToggleRow
                  label="HP Scales Damage"
                  description="Bonus damage when HP is low"
                  checked={localSettings.bossMode.hpScalesWithDamage}
                  onChange={(v) => updateBossMode('hpScalesWithDamage', v)}
                />
                {localSettings.bossMode.hpScalesWithDamage && (
                  <>
                    <NumberInput
                      label="Low HP Bonus %"
                      value={localSettings.bossMode.lowHpDamageBonus}
                      onChange={(v) => updateBossMode('lowHpDamageBonus', v)}
                      min={0}
                      max={100}
                      step={5}
                    />
                    <NumberInput
                      label="Low HP Threshold"
                      value={localSettings.bossMode.lowHpThreshold}
                      onChange={(v) => updateBossMode('lowHpThreshold', v)}
                      min={20}
                      max={60}
                      step={5}
                    />
                  </>
                )}
              </div>
            </>
          )}

          {/* UI Section */}
          {activeSection === 'ui' && (
            <>
              <h3 className="text-sm font-serif uppercase tracking-widest text-mana border-b border-dd-border/50 pb-2">
                UI Preferences
              </h3>

              <SelectInput
                label="Theme"
                value={localSettings.ui.theme}
                onChange={(v) => updateUi('theme', v as 'light' | 'dark' | 'system')}
                options={[
                  { value: 'system', label: 'System' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'light', label: 'Light' },
                ]}
              />

              <div className="border-t border-dd-border/50 pt-3 mt-3">
                <div className="text-sm text-dd-muted mb-2">Notifications</div>
                <ToggleRow
                  label="Enable Notifications"
                  description="All app notifications"
                  checked={localSettings.ui.enableNotifications}
                  onChange={(v) => updateUi('enableNotifications', v)}
                />
                <ToggleRow
                  label="Block Reminders"
                  description="Phone-free block alerts"
                  checked={localSettings.ui.blockReminders}
                  onChange={(v) => updateUi('blockReminders', v)}
                />
                <ToggleRow
                  label="Streak Reminders"
                  description="Daily streak alerts"
                  checked={localSettings.ui.streakReminders}
                  onChange={(v) => updateUi('streakReminders', v)}
                />
              </div>

              <div className="border-t border-dd-border/50 pt-3 mt-3">
                <div className="text-sm text-dd-muted mb-2">Dashboard</div>
                <ToggleRow
                  label="Show XP"
                  description="XP display on dashboard"
                  checked={localSettings.ui.showXpOnDashboard}
                  onChange={(v) => updateUi('showXpOnDashboard', v)}
                />
                <ToggleRow
                  label="Show Streak"
                  description="Streak on dashboard"
                  checked={localSettings.ui.showStreakOnDashboard}
                  onChange={(v) => updateUi('showStreakOnDashboard', v)}
                />
                <ToggleRow
                  label="Show Boss"
                  description="Boss battle on dashboard"
                  checked={localSettings.ui.showBossOnDashboard}
                  onChange={(v) => updateUi('showBossOnDashboard', v)}
                />
              </div>

              <div className="border-t border-dd-border/50 pt-3 mt-3">
                <div className="text-sm text-dd-muted mb-2">Scroll Interrupt</div>
                <ToggleRow
                  label="Enable Scroll Interrupt"
                  description="'I want to scroll' feature"
                  checked={localSettings.ui.scrollInterruptEnabled}
                  onChange={(v) => updateUi('scrollInterruptEnabled', v)}
                />
                {localSettings.ui.scrollInterruptEnabled && (
                  <SelectInput
                    label="Interrupt Source"
                    value={localSettings.ui.scrollInterruptSource}
                    onChange={(v) =>
                      updateUi(
                        'scrollInterruptSource',
                        v as 'bottom_nav' | 'mobile_button' | 'both'
                      )
                    }
                    options={[
                      { value: 'both', label: 'Both Locations' },
                      { value: 'bottom_nav', label: 'Bottom Nav Only' },
                      { value: 'mobile_button', label: 'Mobile Button Only' },
                    ]}
                  />
                )}
              </div>
            </>
          )}
        </div>

        {/* Save Button (Bottom) */}
        {hasChanges && (
          <div className="sticky bottom-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              variant="primary"
              size="lg"
              className="w-full"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>
      </div>
    </AuthGate>
  )
}

// ============================================
// Reusable Input Components
// ============================================

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="scroll-card flex items-center justify-between px-4 py-3">
      <div>
        <div className="font-medium text-dd-text">{label}</div>
        {description && (
          <div className="text-xs text-dd-muted">{description}</div>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-12 h-6 rounded-full transition-colors border ${
          checked
            ? 'bg-mana/40 border-mana/40'
            : 'bg-dd-surface/60 border-dd-border/60'
        }`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-transparent shadow-sm transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
}) {
  return (
    <div className="scroll-card flex items-center justify-between px-4 py-3">
      <label className="text-sm text-dd-text">{label}</label>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-8 h-8 rounded bg-dd-surface/60 border border-dd-border/60 text-dd-text hover:border-dd-border/80"
        >
          -
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (!isNaN(v) && v >= min && v <= max) onChange(v)
          }}
          className="w-16 text-center bg-dd-surface/60 border border-dd-border/60 rounded px-2 py-1 text-dd-text"
          min={min}
          max={max}
          step={step}
        />
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          className="w-8 h-8 rounded bg-dd-surface/60 border border-dd-border/60 text-dd-text hover:border-dd-border/80"
        >
          +
        </button>
      </div>
    </div>
  )
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="scroll-card flex items-center justify-between px-4 py-3">
      <label className="text-sm text-dd-text">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded bg-dd-surface/60 border border-dd-border/60 text-dd-text"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
