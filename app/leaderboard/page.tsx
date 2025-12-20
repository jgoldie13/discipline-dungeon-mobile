'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PillBadge } from '@/components/ui/PillBadge'
import { Switch } from '@/components/ui/Switch'

interface LeaderboardEntry {
  rank: number
  id: string
  name: string
  totalXp: number
  level: number
  currentStreak: number
  longestStreak: number
  isCurrentUser: boolean
}

interface CurrentUser {
  totalXp: number
  level: number
  streak: number
  isPublic: boolean
  rank: number | null
  displayName: string | null
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPublic, setIsPublic] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard')
      const data = await response.json()
      setLeaderboard(data.leaderboard || [])
      setCurrentUser(data.currentUser)
      setIsPublic(data.currentUser?.isPublic || false)
      setDisplayName(data.currentUser?.displayName || '')
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateSettings = async () => {
    setSaving(true)
    try {
      await fetch('/api/leaderboard', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPublicProfile: isPublic,
          displayName: displayName || null,
        }),
      })
      fetchLeaderboard()
    } catch (error) {
      console.error('Error updating settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return null
  }

  return (
    <div className="min-h-screen bg-transparent text-dd-text">
      {/* Header */}
      <header className="glass-panel rounded-none p-4">
        <div className="flex items-center gap-4 mb-3">
          <Link href="/mobile" className="text-2xl text-dd-muted hover:text-dd-text">
            ←
          </Link>
          <h1 className="text-xl font-serif uppercase tracking-widest text-mana">
            Leaderboard
          </h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Privacy Settings */}
        <Card className="glass-panel p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-dd-text">Show on leaderboard</div>
                <div className="text-xs text-dd-muted">
                  Make your stats visible to other users
                </div>
              </div>
              <Switch checked={isPublic} onChange={setIsPublic} />
            </div>

            {isPublic && (
              <div className="space-y-2">
                <label className="block text-sm text-dd-muted">
                  Display name (optional)
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-dd-surface/60 border border-dd-border/60 rounded-lg p-3 text-dd-text focus:outline-none focus:border-mana/50"
                />
              </div>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={handleUpdateSettings}
              disabled={saving}
              className="w-full"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </Card>

        {/* Current User Stats */}
        {currentUser && (
          <Card className="glass-panel p-4 border border-mana/40">
            <div className="space-y-2">
              <div className="text-sm text-dd-muted">Your Stats</div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-mana tabular-nums">
                    {currentUser.totalXp.toLocaleString()} XP
                  </div>
                  <div className="text-sm text-dd-muted">
                    Level {currentUser.level} • {currentUser.streak} day streak
                  </div>
                </div>
                {currentUser.rank && (
                  <div className="text-right">
                    <div className="text-3xl">{getMedalEmoji(currentUser.rank) || '🏆'}</div>
                    <div className="text-sm text-dd-muted">Rank #{currentUser.rank}</div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Leaderboard */}
        {loading ? (
          <div className="text-center text-dd-muted py-8">Loading leaderboard...</div>
        ) : leaderboard.length === 0 ? (
          <Card className="glass-panel p-6 text-center">
            <div className="text-dd-muted">
              No public profiles yet. Be the first to join the leaderboard!
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            <h2 className="font-serif uppercase tracking-widest text-mana text-lg mb-3">
              Top Disciples
            </h2>
            {leaderboard.map((entry) => (
              <Card
                key={entry.id}
                className={`glass-panel p-4 ${
                  entry.isCurrentUser ? 'border border-mana/40' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="w-12 text-center">
                    {getMedalEmoji(entry.rank) ? (
                      <div className="text-3xl">{getMedalEmoji(entry.rank)}</div>
                    ) : (
                      <div className="text-xl font-bold text-dd-muted tabular-nums">
                        #{entry.rank}
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex-1">
                    <div className="font-semibold text-dd-text">
                      {entry.name}
                      {entry.isCurrentUser && (
                        <span className="ml-2 text-xs text-mana">(You)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="text-sm text-dd-muted tabular-nums">
                        {entry.totalXp.toLocaleString()} XP
                      </div>
                      <PillBadge variant="muted" size="sm">
                        L{entry.level}
                      </PillBadge>
                      {entry.currentStreak > 0 && (
                        <div className="text-xs text-gold">
                          {entry.currentStreak}🔥
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Longest Streak */}
                  {entry.longestStreak > 7 && (
                    <div className="text-right">
                      <div className="text-xs text-dd-muted">Best</div>
                      <div className="text-sm font-semibold text-blood tabular-nums">
                        {entry.longestStreak}🔥
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
