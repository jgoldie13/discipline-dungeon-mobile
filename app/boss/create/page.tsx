'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

type Difficulty = 'easy' | 'medium' | 'hard' | 'brutal'
type TimeWindow = 'morning' | 'afternoon' | 'evening'

export default function CreateBossPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [estimatedHours, setEstimatedHours] = useState(3)
  const [optimalWindow, setOptimalWindow] = useState<TimeWindow>('morning')

  // Auto-suggest based on title/description
  const handleAutoSuggest = async () => {
    if (!title) return

    try {
      const response = await fetch('/api/boss/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      })

      const data = await response.json()
      if (data.suggestion) {
        setEstimatedHours(data.suggestion.estimatedHours)
        setDifficulty(data.suggestion.difficulty)
      }
    } catch (error) {
      console.error('Error getting suggestion:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/boss/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          difficulty,
          estimatedHours,
          optimalWindow,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(
          `⚔️ Boss Created!\n\n${data.boss.title}\n${data.boss.bossHp} HP\n\nAttack it with phone-free blocks!`
        )
        router.push(`/boss/${data.boss.id}`)
      } else {
        alert('Error creating boss: ' + data.error)
      }
    } catch (error) {
      console.error('Error creating boss:', error)
      alert('Error creating boss. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const bossHp = estimatedHours * 60

  const difficultyConfig = {
    easy: { emoji: '😊', color: 'green', label: 'Easy', xp: 100 },
    medium: { emoji: '🤔', color: 'yellow', label: 'Medium', xp: 250 },
    hard: { emoji: '😰', color: 'orange', label: 'Hard', xp: 500 },
    brutal: { emoji: '💀', color: 'red', label: 'Brutal', xp: 1000 },
  }

  const windowConfig = {
    morning: { emoji: '🌅', label: 'Morning (06:00-12:00)', multiplier: '1.2x' },
    afternoon: {
      emoji: '☀️',
      label: 'Afternoon (12:00-18:00)',
      multiplier: '1.0x',
    },
    evening: { emoji: '🌙', label: 'Evening (18:00-00:00)', multiplier: '0.8x' },
  }

  const config = difficultyConfig[difficulty]
  const windowInfo = windowConfig[optimalWindow]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="glass-panel rounded-none p-4 flex items-center gap-4">
        <Link href="/tasks" className="text-2xl">
          ←
        </Link>
        <h1 className="text-xl font-serif uppercase tracking-widest text-mana">
          ⚔️ Create Boss Battle
        </h1>
      </header>

      <div className="p-6 space-y-6">
        {/* Intro */}
        <div className="scroll-card p-4 text-sm">
          <div className="font-serif uppercase tracking-widest mb-2 text-blood">
            🔥 Fire Scroll: Gamified Deep Work
          </div>
          <p className="text-slate-700">
            Turn exams, papers, and problem sets into boss battles. Defeat them
            with focused phone-free work blocks.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Boss Name (Task Title)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleAutoSuggest}
              placeholder="e.g., MATH 101 Final Exam"
              required
              className="w-full bg-slate-900/10 border border-slate-900/20 rounded-lg px-4 py-3 text-slate-900 placeholder:text-slate-600 focus:border-blood/40 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Chapters 1-10, covers derivatives and integrals"
              rows={3}
              className="w-full bg-slate-900/10 border border-slate-900/20 rounded-lg px-4 py-3 text-slate-900 placeholder:text-slate-600 focus:border-blood/40 focus:outline-none"
            />
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Difficulty
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(
                Object.entries(difficultyConfig) as [
                  Difficulty,
                  (typeof difficultyConfig)[Difficulty]
                ][]
              ).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDifficulty(key)}
                  className={`scroll-card p-4 border transition-all ${
                    difficulty === key
                      ? 'border-blood/50 shadow-[0_0_16px_rgba(244,63,94,0.25)]'
                      : 'border-slate-900/20 hover:border-blood/30'
                  }`}
                >
                  <div className="text-2xl mb-1">{cfg.emoji}</div>
                  <div className="font-medium text-slate-900">{cfg.label}</div>
                  <div className="text-xs text-slate-700 mt-1">
                    +{cfg.xp} XP on defeat
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Estimated Hours */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Estimated Hours: {estimatedHours}h ({bossHp} HP)
            </label>
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(parseFloat(e.target.value))}
              className="w-full accent-blood"
            />
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>0.5h</span>
              <span>5h</span>
              <span>10h</span>
            </div>
          </div>

          {/* Optimal Time Window */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Optimal Time Window
            </label>
            <div className="space-y-2">
              {(
                Object.entries(windowConfig) as [
                  TimeWindow,
                  (typeof windowConfig)[TimeWindow]
                ][]
              ).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setOptimalWindow(key)}
                  className={`scroll-card w-full p-4 border transition-all text-left ${
                    optimalWindow === key
                      ? 'border-blood/50 shadow-[0_0_16px_rgba(244,63,94,0.25)]'
                      : 'border-slate-900/20 hover:border-blood/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{cfg.emoji}</span>
                      <div>
                        <div className="font-medium text-slate-900">
                          {cfg.label}
                        </div>
                        <div className="text-xs text-slate-700 mt-1">
                          Damage multiplier: {cfg.multiplier}
                        </div>
                      </div>
                    </div>
                    {optimalWindow === key && (
                      <span className="text-blood text-xl">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="scroll-card p-4">
            <div className="text-sm font-semibold text-slate-900 mb-3">
              Boss Preview:
            </div>
            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex justify-between">
                <span>Boss Name:</span>
                <span className="font-medium">{title || '(untitled)'}</span>
              </div>
              <div className="flex justify-between">
                <span>Boss HP:</span>
                <span className="font-medium">{bossHp} HP</span>
              </div>
              <div className="flex justify-between">
                <span>Difficulty:</span>
                <span className="font-medium">
                  {config.emoji} {config.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Reward:</span>
                <span className="font-medium">+{config.xp} XP</span>
              </div>
              <div className="flex justify-between">
                <span>Best Time:</span>
                <span className="font-medium">
                  {windowInfo.emoji} {windowInfo.label.split(' ')[0]} (
                  {windowInfo.multiplier} damage)
                </span>
              </div>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading || !title}
            className="w-full"
          >
            {loading ? 'Creating Boss...' : '⚔️ Create Boss Battle'}
          </Button>
        </form>

        {/* Tips */}
        <div className="scroll-card p-4 text-sm">
          <div className="font-semibold mb-2 text-slate-900">💡 Tips:</div>
          <ul className="space-y-1 text-slate-700">
            <li>• 1 minute of phone-free work = 1 damage to boss</li>
            <li>• Morning blocks deal 1.2x damage (06:00-12:00)</li>
            <li>• Your HP affects XP gain, not boss damage</li>
            <li>
              • Defeat boss to earn massive XP (+{config.xp} for {config.label})
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
