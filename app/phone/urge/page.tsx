'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PillBadge } from '@/components/ui/PillBadge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useToast } from '@/components/ui/Toast'

// Micro-tasks data (will come from API later)
const MICRO_TASKS = [
  // Physical
  { id: 1, title: "10 pushups", description: "Drop and give me 10", durationSec: 30, category: "physical", emoji: "💪" },
  { id: 2, title: "20 jumping jacks", description: "Get your blood pumping", durationSec: 30, category: "physical", emoji: "🏃" },
  { id: 3, title: "Plank for 30 seconds", description: "Hold strong", durationSec: 30, category: "physical", emoji: "🧘" },
  { id: 4, title: "Stretch for 1 minute", description: "Touch your toes, reach for the sky", durationSec: 60, category: "physical", emoji: "🤸" },

  // Social
  { id: 5, title: "Text one friend", description: "Real connection, not scrolling", durationSec: 60, category: "social", emoji: "💬" },
  { id: 6, title: "Call someone you love", description: "2-minute check-in call", durationSec: 120, category: "social", emoji: "📞" },
  { id: 7, title: "Compliment someone", description: "Make someone's day", durationSec: 30, category: "social", emoji: "❤️" },

  // Productive
  { id: 8, title: "Review one job posting", description: "Just one. Read it carefully.", durationSec: 120, category: "productive", emoji: "💼" },
  { id: 9, title: "Update one line of your resume", description: "One small improvement", durationSec: 90, category: "productive", emoji: "📝" },
  { id: 10, title: "Delete 10 old emails", description: "Inbox cleanup", durationSec: 60, category: "productive", emoji: "📧" },

  // Mindful
  { id: 11, title: "Take 5 deep breaths", description: "In for 4, out for 6", durationSec: 30, category: "mindful", emoji: "🫁" },
  { id: 12, title: "Journal one sentence", description: "How do you feel right now?", durationSec: 60, category: "mindful", emoji: "📔" },
  { id: 13, title: "Gratitude: name 3 things", description: "What are you grateful for?", durationSec: 60, category: "mindful", emoji: "🙏" },
  { id: 14, title: "Drink a full glass of water", description: "Hydrate yourself", durationSec: 30, category: "mindful", emoji: "💧" },
]

const TRIGGERS = [
  { id: 'boredom', label: 'Boredom', emoji: '😑' },
  { id: 'anxiety', label: 'Anxiety/Avoidance', emoji: '😰' },
  { id: 'habit', label: 'Pure Habit', emoji: '🔄' },
  { id: 'procrastination', label: 'Procrastination', emoji: '⏰' },
]

export default function UrgePage() {
  const router = useRouter()
  const [step, setStep] = useState<'trigger' | 'task' | 'timer' | 'complete'>('trigger')
  const [selectedTrigger, setSelectedTrigger] = useState('')
  const [selectedTask, setSelectedTask] = useState<typeof MICRO_TASKS[0] | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const pushToast = useToast()

  // Timer logic
  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false)
      setStep('complete')
    }
  }, [isTimerRunning, timeLeft])

  const handleStartTask = (task: typeof MICRO_TASKS[0]) => {
    setSelectedTask(task)
    setTimeLeft(task.durationSec)
    setStep('timer')
    setIsTimerRunning(true)
  }

  const handleSkipTask = () => {
    setStep('complete')
  }

  const handleComplete = async () => {
    try {
      const response = await fetch('/api/phone/urge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger: selectedTrigger,
          replacementTask: selectedTask?.title || null,
          completed: true
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to log urge')
      }

      pushToast({
        title: 'Urge resisted',
        description: `+${data.xpEarned} XP${data.buildPoints ? `, +${data.buildPoints} build pts` : ''}`,
        variant: 'success',
        actionLabel: 'View Build',
        onAction: () => (window.location.href = '/build'),
      })
      router.push('/mobile')
    } catch (error) {
      console.error('Error saving urge:', error)
      pushToast({
        title: 'Error saving urge',
        description: 'Please try again.',
        variant: 'danger',
      })
    }
  }

  if (step === 'trigger') {
    return (
      <div className="min-h-screen bg-transparent text-dd-text">
        <header className="glass-panel rounded-none p-4 flex items-center gap-4">
          <Link href="/mobile" className="text-2xl">←</Link>
          <h1 className="text-xl font-serif uppercase tracking-widest text-mana">
            What triggered this urge?
          </h1>
        </header>

        <div className="p-6 space-y-4">
          <p className="text-dd-muted text-center mb-6">
            Understanding your triggers helps break the pattern.
          </p>

          <div className="space-y-3">
            {TRIGGERS.map((trigger) => (
              <Card
                key={trigger.id}
                onClick={() => {
                  setSelectedTrigger(trigger.id)
                  setStep('task')
                }}
                className="scroll-card cursor-pointer transition-transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-lg text-dd-text">
                    {trigger.label}
                  </span>
                  <span className="text-3xl">{trigger.emoji}</span>
                </div>
              </Card>
            ))}
          </div>

          <button
            onClick={() => setStep('task')}
            className="w-full text-center text-dd-muted hover:text-dd-text py-2 mt-6"
          >
            Skip →
          </button>
        </div>
      </div>
    )
  }

  if (step === 'task') {
    return (
      <div className="min-h-screen bg-transparent text-dd-text">
        <header className="glass-panel rounded-none p-4 flex items-center gap-4">
          <button onClick={() => setStep('trigger')} className="text-2xl">←</button>
          <h1 className="text-xl font-serif uppercase tracking-widest text-mana">
            Pick a Micro-Task
          </h1>
        </header>

        <div className="p-6 space-y-4">
          <p className="text-dd-muted text-center mb-4">
            Do this instead of scrolling. It'll take less time and actually help.
          </p>

          <div className="space-y-3">
            {MICRO_TASKS.map((task) => (
              <Card
                key={task.id}
                onClick={() => handleStartTask(task)}
                className="scroll-card cursor-pointer transition-transform hover:-translate-y-1"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-lg mb-1 text-dd-text">
                      {task.title}
                    </div>
                    <div className="text-sm text-dd-muted">{task.description}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <PillBadge
                        size="sm"
                        className="bg-dd-surface/60 text-dd-text border-dd-border/60"
                      >
                        {task.durationSec}sec
                      </PillBadge>
                      <PillBadge
                        size="sm"
                        className="bg-dd-surface/60 text-dd-text border-dd-border/60"
                      >
                        {task.category}
                      </PillBadge>
                    </div>
                  </div>
                  <div className="text-3xl ml-3">{task.emoji}</div>
                </div>
              </Card>
            ))}
          </div>

          <button
            onClick={handleSkipTask}
            className="w-full text-center text-dd-muted hover:text-dd-text py-2 mt-6"
          >
            Skip task (just log urge) →
          </button>
        </div>
      </div>
    )
  }

  if (step === 'timer') {
    return (
      <div className="min-h-screen bg-transparent text-dd-text flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="text-6xl mb-4">{selectedTask?.emoji}</div>
          <h1 className="text-3xl font-serif uppercase tracking-widest text-mana">
            {selectedTask?.title}
          </h1>
          <p className="text-dd-muted">{selectedTask?.description}</p>

          <div className="glass-panel rounded-2xl p-8 my-8">
            <div className="text-7xl font-bold tabular-nums text-dd-text">{timeLeft}</div>
            <div className="text-dd-muted text-sm mt-2">seconds left</div>
          </div>

          <ProgressBar
            variant="xp"
            value={(selectedTask?.durationSec || 0) - timeLeft}
            max={selectedTask?.durationSec || 1}
            className="w-full"
          />

          <Button
            variant="primary"
            size="lg"
            onClick={handleSkipTask}
            className="w-full mt-8"
          >
            Done Early
          </Button>
        </div>
      </div>
    )
  }

  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-transparent text-dd-text flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="text-8xl mb-4">🎉</div>
          <h1 className="text-4xl font-serif uppercase tracking-widest text-mana">
            You Did It!
          </h1>
          <p className="text-xl text-dd-muted">
            You resisted the urge to scroll. That's a win.
          </p>

          <Card className="scroll-card">
            <div className="space-y-3">
              <div className="text-sm text-dd-muted">Urge Logged:</div>
              <div className="font-semibold text-lg text-dd-text">
                Trigger: {TRIGGERS.find(t => t.id === selectedTrigger)?.label || 'Unknown'}
              </div>
              {selectedTask && (
                <div className="text-dd-muted">
                  Completed: {selectedTask.title}
                </div>
              )}
              <PillBadge
                size="md"
                className="mt-4 bg-gold/20 text-gold border-gold/30"
              >
                +10 XP
              </PillBadge>
            </div>
          </Card>

          <Button
            variant="primary"
            size="lg"
            onClick={handleComplete}
            className="w-full"
          >
            Back to Home
          </Button>
          <Link href="/build" className="block">
            <Button variant="secondary" size="md" className="w-full mt-2">
              View Build
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return null
}
