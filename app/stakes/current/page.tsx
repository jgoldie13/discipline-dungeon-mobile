'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Surface } from '@/components/ui/Surface'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'
import { ViolationBanner } from '@/components/ui/ViolationBanner'

interface StakeData {
  stake: {
    id: string
    amount: number
    startDate: string
    endDate: string
    maxSocialMediaMin: number
    minExposureTasks: number
    minPhoneFreeBlocks: number
    antiCharityName: string
    antiCharityUrl: string
    evaluated: boolean
    outcome: string | null
    paid: boolean
    cheated: boolean
  } | null
  progress?: {
    daysOverLimit: number
    exposureTasksCompleted: number
    phoneFreeBlocksCompleted: number
  }
}

export default function CurrentStakePage() {
  const router = useRouter()
  const [data, setData] = useState<StakeData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStake = useCallback(async () => {
    try {
      const response = await fetch('/api/stakes')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching stake:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStake()
  }, [fetchStake])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  if (!data?.stake) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200">
        <div className="max-w-2xl mx-auto pt-8 p-4">
          <Link href="/mobile" className="text-slate-400 hover:text-slate-200 mb-8 block">
            ← Back to Dashboard
          </Link>

          <div className="text-center py-12">
            <h1 className="text-3xl font-serif uppercase tracking-widest text-mana mb-4">
              No Active Stake
            </h1>
            <p className="text-slate-300 mb-8">
              You do not have a stake commitment for this week.
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push('/stakes/create')}
            >
              Create Weekly Stake
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const { stake, progress } = data
  const startDate = new Date(stake.startDate)
  const endDate = new Date(stake.endDate)
  const now = new Date()
  const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const isOnTrack =
    (progress?.daysOverLimit || 0) === 0 &&
    (progress?.exposureTasksCompleted || 0) >= stake.minExposureTasks &&
    (progress?.phoneFreeBlocksCompleted || 0) >= stake.minPhoneFreeBlocks

  const isFailing = !isOnTrack

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="glass-panel rounded-none p-4 flex items-center gap-4">
        <Link href="/mobile" className="text-2xl">
          ←
        </Link>
        <h1 className="text-xl font-serif uppercase tracking-widest text-mana">
          Weekly Stake
        </h1>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Contract Period */}
        <div className="text-center text-slate-300 text-sm tabular-nums">
          {startDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          })}
          {' → '}
          {endDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          })}
        </div>

        {/* Status Banner (Consequence) */}
        {isFailing ? (
          <ViolationBanner
            severity="negative"
            title="Failing Commitment"
            details={`${daysLeft > 0 ? `${daysLeft} days left. ` : 'Week ended. '}$${stake.amount} at stake.`}
          />
        ) : (
          <Surface elevation="2" className="border-gold/40">
            <div className="text-center space-y-2">
              <div className="text-gold font-bold text-2xl">On Track</div>
              <div className="text-slate-300">
                {daysLeft > 0 ? `${daysLeft} days left` : 'Week ended'}
              </div>
              <div className="text-lg font-semibold text-slate-100 tabular-nums">
                ${stake.amount} at stake
              </div>
            </div>
          </Surface>
        )}

        {/* Compliance Status (State) */}
        <Surface elevation="1" title="Compliance Status">
          <div className="space-y-4">
            {/* Social Media Limit */}
            <div>
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-slate-300">Social Media Limit</span>
                <span
                  className={`font-semibold tabular-nums ${
                    (progress?.daysOverLimit || 0) === 0
                      ? 'text-mana'
                      : 'text-blood'
                  }`}
                >
                  {progress?.daysOverLimit || 0} days over limit
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Max: {stake.maxSocialMediaMin} min/day
              </p>
            </div>

            {/* Exposure Tasks */}
            <div>
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-slate-300">Exposure Tasks</span>
                <span
                  className={`font-semibold tabular-nums ${
                    (progress?.exposureTasksCompleted || 0) >=
                    stake.minExposureTasks
                      ? 'text-mana'
                      : 'text-gold'
                  }`}
                >
                  {progress?.exposureTasksCompleted || 0} / {stake.minExposureTasks}
                </span>
              </div>
              <ProgressBar
                variant="xp"
                value={progress?.exposureTasksCompleted || 0}
                max={stake.minExposureTasks}
                severity={
                  (progress?.exposureTasksCompleted || 0) >= stake.minExposureTasks
                    ? 'positive'
                    : 'warning'
                }
              />
            </div>

            {/* Phone-Free Blocks */}
            <div>
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-slate-300">Phone-Free Blocks</span>
                <span
                  className={`font-semibold tabular-nums ${
                    (progress?.phoneFreeBlocksCompleted || 0) >=
                    stake.minPhoneFreeBlocks
                      ? 'text-mana'
                      : 'text-gold'
                  }`}
                >
                  {progress?.phoneFreeBlocksCompleted || 0} /{' '}
                  {stake.minPhoneFreeBlocks}
                </span>
              </div>
              <ProgressBar
                variant="xp"
                value={progress?.phoneFreeBlocksCompleted || 0}
                max={stake.minPhoneFreeBlocks}
                severity={
                  (progress?.phoneFreeBlocksCompleted || 0) >= stake.minPhoneFreeBlocks
                    ? 'positive'
                    : 'warning'
                }
              />
            </div>
          </div>
        </Surface>

        {/* Failure Consequence */}
        {isFailing && (
          <Surface elevation="2" className="border-blood/40 bg-blood/10">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-blood">
                Failure Cost
              </h3>
              <p className="text-slate-100">
                You must donate{' '}
                <span className="font-bold text-blood tabular-nums">${stake.amount}</span>{' '}
                to:
              </p>
              <p className="text-slate-100 font-semibold">{stake.antiCharityName}</p>
              {stake.antiCharityUrl && (
                <a
                  href={stake.antiCharityUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blood hover:text-blood/80 text-sm underline block"
                >
                  {stake.antiCharityUrl}
                </a>
              )}
            </div>
          </Surface>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/phone/log">
            <Button variant="secondary" size="md" className="w-full">
              Log Phone Usage
            </Button>
          </Link>
          <Link href="/tasks">
            <Button variant="secondary" size="md" className="w-full">
              Add Exposure Task
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
