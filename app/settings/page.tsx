'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  UserSettingsV1,
  SETTINGS_PRESETS,
  type SettingsPreset,
} from '@/lib/policy/settings.schema'
import { createEngine } from '@/lib/policy/PolicyEngine'

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
  const [settings, setSettings] = useState<UserSettingsV1 | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<SettingsSection>('features')
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      const data = await response.json()
      // Initialize with defaults if no settings exist
      const engine = createEngine(data.settings)
      setSettings(engine.getSettings())
    } catch (error) {
      console.error('Error fetching settings:', error)
      // Use defaults on error
      const engine = createEngine(null)
      setSettings(engine.getSettings())
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return

    setSaving(true)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Error saving settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const applyPreset = (preset: SettingsPreset) => {
    setSettings({ ...SETTINGS_PRESETS[preset] })
    setHasChanges(true)
  }

  const updateFeature = useCallback(
    (key: keyof UserSettingsV1['features'], value: boolean) => {
      if (!settings) return
      setSettings({
        ...settings,
        features: { ...settings.features, [key]: value },
      })
      setHasChanges(true)
    },
    [settings]
  )

  const updatePhoneUsage = useCallback(
    <K extends keyof UserSettingsV1['phoneUsage']>(
      key: K,
      value: UserSettingsV1['phoneUsage'][K]
    ) => {
      if (!settings) return
      setSettings({
        ...settings,
        phoneUsage: { ...settings.phoneUsage, [key]: value },
      })
      setHasChanges(true)
    },
    [settings]
  )

  const updateXp = useCallback(
    <K extends keyof UserSettingsV1['xp']>(key: K, value: UserSettingsV1['xp'][K]) => {
      if (!settings) return
      setSettings({
        ...settings,
        xp: { ...settings.xp, [key]: value },
      })
      setHasChanges(true)
    },
    [settings]
  )

  const updateStreaks = useCallback(
    <K extends keyof UserSettingsV1['streaks']>(
      key: K,
      value: UserSettingsV1['streaks'][K]
    ) => {
      if (!settings) return
      setSettings({
        ...settings,
        streaks: { ...settings.streaks, [key]: value },
      })
      setHasChanges(true)
    },
    [settings]
  )

  const updateCircadian = useCallback(
    <K extends keyof UserSettingsV1['circadian']>(
      key: K,
      value: UserSettingsV1['circadian'][K]
    ) => {
      if (!settings) return
      setSettings({
        ...settings,
        circadian: { ...settings.circadian, [key]: value },
      })
      setHasChanges(true)
    },
    [settings]
  )

  const updateBossMode = useCallback(
    <K extends keyof UserSettingsV1['bossMode']>(
      key: K,
      value: UserSettingsV1['bossMode'][K]
    ) => {
      if (!settings) return
      setSettings({
        ...settings,
        bossMode: { ...settings.bossMode, [key]: value },
      })
      setHasChanges(true)
    },
    [settings]
  )

  const updateUi = useCallback(
    <K extends keyof UserSettingsV1['ui']>(key: K, value: UserSettingsV1['ui'][K]) => {
      if (!settings) return
      setSettings({
        ...settings,
        ui: { ...settings.ui, [key]: value },
      })
      setHasChanges(true)
    },
    [settings]
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-green-950 to-black text-white flex items-center justify-center">
        <p className="text-green-300">Loading settings...</p>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-green-950 to-black text-white flex items-center justify-center">
        <p className="text-red-400">Error loading settings</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-green-950 to-black text-white">
      {/* Header */}
      <header className="bg-green-900/30 border-b border-green-500/20 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/mobile" className="text-2xl">
            ←
          </Link>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
        <button
          onClick={saveSettings}
          disabled={!hasChanges || saving}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            hasChanges
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-green-900/50 text-green-500/50 cursor-not-allowed'
          }`}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </header>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Presets */}
        <div className="bg-green-900/30 border border-green-500/20 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Quick Presets</h2>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => applyPreset('gentle')}
              className="p-3 rounded-lg bg-green-800/30 border border-green-500/30 hover:border-green-500/60 transition-all"
            >
              <div className="text-xl mb-1">🌱</div>
              <div className="text-sm font-medium">Gentle</div>
              <div className="text-xs text-green-400">Forgiving</div>
            </button>
            <button
              onClick={() => applyPreset('standard')}
              className="p-3 rounded-lg bg-green-800/30 border border-green-500/30 hover:border-green-500/60 transition-all"
            >
              <div className="text-xl mb-1">⚔️</div>
              <div className="text-sm font-medium">Standard</div>
              <div className="text-xs text-green-400">Balanced</div>
            </button>
            <button
              onClick={() => applyPreset('hardcore')}
              className="p-3 rounded-lg bg-green-800/30 border border-green-500/30 hover:border-green-500/60 transition-all"
            >
              <div className="text-xl mb-1">🔥</div>
              <div className="text-sm font-medium">Hardcore</div>
              <div className="text-xs text-green-400">Strict</div>
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
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
              className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-all ${
                activeSection === section.key
                  ? 'bg-green-600 text-white'
                  : 'bg-green-900/30 text-green-300 hover:bg-green-900/50'
              }`}
            >
              {section.icon} {section.label}
            </button>
          ))}
        </div>

        {/* Section Content */}
        <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-4 space-y-4">
          {/* Features Section */}
          {activeSection === 'features' && (
            <>
              <h3 className="text-lg font-semibold border-b border-green-500/20 pb-2">
                Feature Toggles
              </h3>

              <div className="space-y-3">
                <ToggleRow
                  label="Phone-Free Blocks"
                  description="Core focus sessions"
                  checked={settings.features.phoneFreeBlocks}
                  onChange={(v) => updateFeature('phoneFreeBlocks', v)}
                />
                <ToggleRow
                  label="Urge Logging"
                  description="Track scroll urges"
                  checked={settings.features.urgeLogging}
                  onChange={(v) => updateFeature('urgeLogging', v)}
                />
                <ToggleRow
                  label="Sleep Tracking"
                  description="Log sleep for HP"
                  checked={settings.features.sleepTracking}
                  onChange={(v) => updateFeature('sleepTracking', v)}
                />
                <ToggleRow
                  label="Morning Protocol"
                  description="Daily checklist routine"
                  checked={settings.features.morningProtocol}
                  onChange={(v) => updateFeature('morningProtocol', v)}
                />
                <ToggleRow
                  label="Boss Mode"
                  description="Task battles with damage"
                  checked={settings.features.bossMode}
                  onChange={(v) => updateFeature('bossMode', v)}
                />
                <ToggleRow
                  label="Streak Tracking"
                  description="Daily consistency tracking"
                  checked={settings.features.streakTracking}
                  onChange={(v) => updateFeature('streakTracking', v)}
                />
                <ToggleRow
                  label="XP System"
                  description="Experience points"
                  checked={settings.features.xpSystem}
                  onChange={(v) => updateFeature('xpSystem', v)}
                />
                <ToggleRow
                  label="Build Mode"
                  description="Cathedral meta-progression"
                  checked={settings.features.buildMode}
                  onChange={(v) => updateFeature('buildMode', v)}
                />

                <div className="border-t border-green-500/20 pt-3 mt-3">
                  <div className="text-sm text-green-400 mb-2">
                    Stakes (opt-in)
                  </div>
                  <ToggleRow
                    label="Commitments"
                    description="Weekly stake challenges"
                    checked={settings.features.commitments}
                    onChange={(v) => updateFeature('commitments', v)}
                  />
                  <ToggleRow
                    label="Anti-Charity"
                    description="Donate on failure"
                    checked={settings.features.antiCharity}
                    onChange={(v) => updateFeature('antiCharity', v)}
                  />
                </div>

                <div className="border-t border-green-500/20 pt-3 mt-3">
                  <div className="text-sm text-green-400 mb-2">Social</div>
                  <ToggleRow
                    label="Partner Verification"
                    description="Accountability partner"
                    checked={settings.features.partnerVerification}
                    onChange={(v) => updateFeature('partnerVerification', v)}
                  />
                  <ToggleRow
                    label="Weekly Digest"
                    description="LLM insights email"
                    checked={settings.features.weeklyDigest}
                    onChange={(v) => updateFeature('weeklyDigest', v)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Phone Usage Section */}
          {activeSection === 'phone' && (
            <>
              <h3 className="text-lg font-semibold border-b border-green-500/20 pb-2">
                Phone Usage Rules
              </h3>

              <NumberInput
                label="Daily Limit (min)"
                value={settings.phoneUsage.dailyLimitMin}
                onChange={(v) => updatePhoneUsage('dailyLimitMin', v)}
                min={0}
                max={480}
                step={5}
              />
              <NumberInput
                label="Warning Threshold (%)"
                value={settings.phoneUsage.warningThresholdPercent}
                onChange={(v) => updatePhoneUsage('warningThresholdPercent', v)}
                min={50}
                max={100}
                step={5}
              />

              <div className="border-t border-green-500/20 pt-3 mt-3">
                <div className="text-sm text-green-400 mb-2">Block Durations</div>
                <NumberInput
                  label="Default Block (min)"
                  value={settings.phoneUsage.defaultBlockMin}
                  onChange={(v) => updatePhoneUsage('defaultBlockMin', v)}
                  min={5}
                  max={180}
                  step={5}
                />
                <NumberInput
                  label="Min Block (min)"
                  value={settings.phoneUsage.minBlockMin}
                  onChange={(v) => updatePhoneUsage('minBlockMin', v)}
                  min={5}
                  max={60}
                  step={5}
                />
                <NumberInput
                  label="Max Block (min)"
                  value={settings.phoneUsage.maxBlockMin}
                  onChange={(v) => updatePhoneUsage('maxBlockMin', v)}
                  min={30}
                  max={480}
                  step={15}
                />
              </div>

              <div className="border-t border-green-500/20 pt-3 mt-3">
                <div className="text-sm text-green-400 mb-2">Pomodoro</div>
                <ToggleRow
                  label="Enable Pomodoro"
                  description="Timed focus/break cycles"
                  checked={settings.phoneUsage.pomodoroEnabled}
                  onChange={(v) => updatePhoneUsage('pomodoroEnabled', v)}
                />
                {settings.phoneUsage.pomodoroEnabled && (
                  <>
                    <NumberInput
                      label="Focus Duration (min)"
                      value={settings.phoneUsage.pomodoroFocusMin}
                      onChange={(v) => updatePhoneUsage('pomodoroFocusMin', v)}
                      min={15}
                      max={90}
                      step={5}
                    />
                    <NumberInput
                      label="Break Duration (min)"
                      value={settings.phoneUsage.pomodoroBreakMin}
                      onChange={(v) => updatePhoneUsage('pomodoroBreakMin', v)}
                      min={3}
                      max={30}
                      step={1}
                    />
                  </>
                )}
              </div>

              <div className="border-t border-green-500/20 pt-3 mt-3">
                <div className="text-sm text-green-400 mb-2">Verification</div>
                <ToggleRow
                  label="Require Verification"
                  description="Confirm block completion"
                  checked={settings.phoneUsage.requireVerification}
                  onChange={(v) => updatePhoneUsage('requireVerification', v)}
                />
                {settings.phoneUsage.requireVerification && (
                  <SelectInput
                    label="Verification Method"
                    value={settings.phoneUsage.verificationMethod}
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
              <h3 className="text-lg font-semibold border-b border-green-500/20 pb-2">
                XP Rules
              </h3>

              <div className="text-sm text-green-400 mb-2">Rewards</div>
              <NumberInput
                label="XP per Block Minute"
                value={settings.xp.xpPerBlockMin}
                onChange={(v) => updateXp('xpPerBlockMin', v)}
                min={0}
                max={10}
                step={1}
              />
              <NumberInput
                label="Verified Block Bonus"
                value={settings.xp.bonusXpVerified}
                onChange={(v) => updateXp('bonusXpVerified', v)}
                min={0}
                max={100}
                step={5}
              />
              <NumberInput
                label="Boss Block Bonus"
                value={settings.xp.bonusXpBossBlock}
                onChange={(v) => updateXp('bonusXpBossBlock', v)}
                min={0}
                max={100}
                step={5}
              />
              <NumberInput
                label="Urge Resist XP"
                value={settings.xp.xpPerUrgeResist}
                onChange={(v) => updateXp('xpPerUrgeResist', v)}
                min={0}
                max={50}
                step={5}
              />
              <NumberInput
                label="Task Complete XP"
                value={settings.xp.xpPerTaskComplete}
                onChange={(v) => updateXp('xpPerTaskComplete', v)}
                min={0}
                max={100}
                step={5}
              />
              <NumberInput
                label="Exposure Task XP"
                value={settings.xp.xpPerExposureTask}
                onChange={(v) => updateXp('xpPerExposureTask', v)}
                min={0}
                max={200}
                step={10}
              />

              <div className="border-t border-green-500/20 pt-3 mt-3">
                <div className="text-sm text-green-400 mb-2">Penalties</div>
                <NumberInput
                  label="Penalty per Overage Min"
                  value={settings.xp.xpPenaltyPerOverageMin}
                  onChange={(v) => updateXp('xpPenaltyPerOverageMin', v)}
                  min={0}
                  max={10}
                  step={1}
                />
                <NumberInput
                  label="Violation Penalty"
                  value={settings.xp.xpPenaltyViolation}
                  onChange={(v) => updateXp('xpPenaltyViolation', v)}
                  min={0}
                  max={100}
                  step={10}
                />
              </div>

              <div className="border-t border-green-500/20 pt-3 mt-3">
                <div className="text-sm text-green-400 mb-2">Decay</div>
                <ToggleRow
                  label="Enable XP Decay"
                  description="Lose XP daily if inactive"
                  checked={settings.xp.enableDecay}
                  onChange={(v) => updateXp('enableDecay', v)}
                />
                {settings.xp.enableDecay && (
                  <NumberInput
                    label="Decay % per Day"
                    value={settings.xp.decayPercentPerDay}
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
              <h3 className="text-lg font-semibold border-b border-green-500/20 pb-2">
                Streak Rules
              </h3>

              <div className="text-sm text-green-400 mb-2">
                What counts for streak?
              </div>
              <ToggleRow
                label="Require Under Limit"
                description="Stay under phone limit"
                checked={settings.streaks.requireUnderLimit}
                onChange={(v) => updateStreaks('requireUnderLimit', v)}
              />
              <ToggleRow
                label="Require One Block"
                description="Complete a phone-free block"
                checked={settings.streaks.requireOneBlock}
                onChange={(v) => updateStreaks('requireOneBlock', v)}
              />
              <ToggleRow
                label="Require Protocol"
                description="Complete morning protocol"
                checked={settings.streaks.requireProtocol}
                onChange={(v) => updateStreaks('requireProtocol', v)}
              />

              <div className="border-t border-green-500/20 pt-3 mt-3">
                <div className="text-sm text-green-400 mb-2">Forgiveness</div>
                <NumberInput
                  label="Grace Days"
                  value={settings.streaks.graceDays}
                  onChange={(v) => updateStreaks('graceDays', v)}
                  min={0}
                  max={3}
                  step={1}
                />
                <NumberInput
                  label="Freezes per Month"
                  value={settings.streaks.freezesPerMonth}
                  onChange={(v) => updateStreaks('freezesPerMonth', v)}
                  min={0}
                  max={5}
                  step={1}
                />
                <NumberInput
                  label="Streak Break XP Penalty"
                  value={settings.streaks.streakBreakXpPenalty}
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
              <h3 className="text-lg font-semibold border-b border-green-500/20 pb-2">
                Sleep & Protocol
              </h3>

              <div className="text-sm text-green-400 mb-2">Wake Target</div>
              <div className="flex items-center gap-4 mb-3">
                <label className="flex-1 text-sm">Target Wake Time</label>
                <input
                  type="time"
                  value={settings.circadian.targetWakeTime}
                  onChange={(e) =>
                    updateCircadian('targetWakeTime', e.target.value)
                  }
                  className="px-3 py-2 rounded bg-green-900/50 border border-green-500/30 text-white"
                />
              </div>
              <NumberInput
                label="Wake Window (min)"
                value={settings.circadian.wakeWindowMin}
                onChange={(v) => updateCircadian('wakeWindowMin', v)}
                min={0}
                max={60}
                step={5}
              />

              <div className="border-t border-green-500/20 pt-3 mt-3">
                <div className="text-sm text-green-400 mb-2">HP Calculation</div>
                <NumberInput
                  label="Base HP"
                  value={settings.circadian.baseHp}
                  onChange={(v) => updateCircadian('baseHp', v)}
                  min={20}
                  max={100}
                  step={5}
                />
                <NumberInput
                  label="HP per On-Time Wake"
                  value={settings.circadian.hpPerOnTimeWake}
                  onChange={(v) => updateCircadian('hpPerOnTimeWake', v)}
                  min={0}
                  max={20}
                  step={5}
                />
                <NumberInput
                  label="HP per Protocol Item"
                  value={settings.circadian.hpPerProtocolItem}
                  onChange={(v) => updateCircadian('hpPerProtocolItem', v)}
                  min={0}
                  max={10}
                  step={1}
                />
                <NumberInput
                  label="HP per Rested Point"
                  value={settings.circadian.hpPerRestedPoint}
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
              <h3 className="text-lg font-semibold border-b border-green-500/20 pb-2">
                Boss Mode Rules
              </h3>

              <div className="text-sm text-green-400 mb-2">Damage</div>
              <NumberInput
                label="Base Damage per Block"
                value={settings.bossMode.baseDamagePerBlock}
                onChange={(v) => updateBossMode('baseDamagePerBlock', v)}
                min={1}
                max={50}
                step={5}
              />
              <NumberInput
                label="Damage per Block Min"
                value={settings.bossMode.damagePerBlockMin}
                onChange={(v) => updateBossMode('damagePerBlockMin', v)}
                min={0}
                max={5}
                step={0.5}
              />

              <div className="border-t border-green-500/20 pt-3 mt-3">
                <div className="text-sm text-green-400 mb-2">Time Multipliers</div>
                <NumberInput
                  label="Morning (5am-12pm)"
                  value={settings.bossMode.morningMultiplier}
                  onChange={(v) => updateBossMode('morningMultiplier', v)}
                  min={1}
                  max={3}
                  step={0.1}
                />
                <NumberInput
                  label="Afternoon (12pm-5pm)"
                  value={settings.bossMode.afternoonMultiplier}
                  onChange={(v) => updateBossMode('afternoonMultiplier', v)}
                  min={1}
                  max={3}
                  step={0.1}
                />
                <NumberInput
                  label="Evening (5pm-5am)"
                  value={settings.bossMode.eveningMultiplier}
                  onChange={(v) => updateBossMode('eveningMultiplier', v)}
                  min={1}
                  max={3}
                  step={0.1}
                />
              </div>

              <div className="border-t border-green-500/20 pt-3 mt-3">
                <div className="text-sm text-green-400 mb-2">Low HP Bonus</div>
                <ToggleRow
                  label="HP Scales Damage"
                  description="Bonus damage when HP is low"
                  checked={settings.bossMode.hpScalesWithDamage}
                  onChange={(v) => updateBossMode('hpScalesWithDamage', v)}
                />
                {settings.bossMode.hpScalesWithDamage && (
                  <>
                    <NumberInput
                      label="Low HP Bonus %"
                      value={settings.bossMode.lowHpDamageBonus}
                      onChange={(v) => updateBossMode('lowHpDamageBonus', v)}
                      min={0}
                      max={100}
                      step={5}
                    />
                    <NumberInput
                      label="Low HP Threshold"
                      value={settings.bossMode.lowHpThreshold}
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
              <h3 className="text-lg font-semibold border-b border-green-500/20 pb-2">
                UI Preferences
              </h3>

              <SelectInput
                label="Theme"
                value={settings.ui.theme}
                onChange={(v) => updateUi('theme', v as 'light' | 'dark' | 'system')}
                options={[
                  { value: 'system', label: 'System' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'light', label: 'Light' },
                ]}
              />

              <div className="border-t border-green-500/20 pt-3 mt-3">
                <div className="text-sm text-green-400 mb-2">Notifications</div>
                <ToggleRow
                  label="Enable Notifications"
                  description="All app notifications"
                  checked={settings.ui.enableNotifications}
                  onChange={(v) => updateUi('enableNotifications', v)}
                />
                <ToggleRow
                  label="Block Reminders"
                  description="Phone-free block alerts"
                  checked={settings.ui.blockReminders}
                  onChange={(v) => updateUi('blockReminders', v)}
                />
                <ToggleRow
                  label="Streak Reminders"
                  description="Daily streak alerts"
                  checked={settings.ui.streakReminders}
                  onChange={(v) => updateUi('streakReminders', v)}
                />
              </div>

              <div className="border-t border-green-500/20 pt-3 mt-3">
                <div className="text-sm text-green-400 mb-2">Dashboard</div>
                <ToggleRow
                  label="Show XP"
                  description="XP display on dashboard"
                  checked={settings.ui.showXpOnDashboard}
                  onChange={(v) => updateUi('showXpOnDashboard', v)}
                />
                <ToggleRow
                  label="Show Streak"
                  description="Streak on dashboard"
                  checked={settings.ui.showStreakOnDashboard}
                  onChange={(v) => updateUi('showStreakOnDashboard', v)}
                />
                <ToggleRow
                  label="Show Boss"
                  description="Boss battle on dashboard"
                  checked={settings.ui.showBossOnDashboard}
                  onChange={(v) => updateUi('showBossOnDashboard', v)}
                />
              </div>

              <div className="border-t border-green-500/20 pt-3 mt-3">
                <div className="text-sm text-green-400 mb-2">Scroll Interrupt</div>
                <ToggleRow
                  label="Enable Scroll Interrupt"
                  description="'I want to scroll' feature"
                  checked={settings.ui.scrollInterruptEnabled}
                  onChange={(v) => updateUi('scrollInterruptEnabled', v)}
                />
                {settings.ui.scrollInterruptEnabled && (
                  <SelectInput
                    label="Interrupt Source"
                    value={settings.ui.scrollInterruptSource}
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
            <button
              onClick={saveSettings}
              disabled={saving}
              className="w-full py-4 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
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
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="font-medium text-green-100">{label}</div>
        {description && (
          <div className="text-xs text-green-400">{description}</div>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-12 h-6 rounded-full transition-colors ${
          checked ? 'bg-green-600' : 'bg-green-900/50'
        }`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-white transition-transform ${
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
    <div className="flex items-center justify-between py-2">
      <label className="text-sm text-green-100">{label}</label>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-8 h-8 rounded bg-green-900/50 border border-green-500/30 hover:border-green-500/60"
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
          className="w-16 text-center bg-green-900/50 border border-green-500/30 rounded px-2 py-1"
          min={min}
          max={max}
          step={step}
        />
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          className="w-8 h-8 rounded bg-green-900/50 border border-green-500/30 hover:border-green-500/60"
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
    <div className="flex items-center justify-between py-2">
      <label className="text-sm text-green-100">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded bg-green-900/50 border border-green-500/30 text-white"
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
