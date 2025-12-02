'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
      await fetch('/api/phone/urge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger: selectedTrigger,
          replacementTask: selectedTask?.title || null,
          completed: true
        }),
      })
      router.push('/mobile')
    } catch (error) {
      console.error('Error saving urge:', error)
      alert('Error saving urge. Please try again.')
    }
  }

  if (step === 'trigger') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-yellow-950 to-black text-white">
        <header className="bg-yellow-900/30 border-b border-yellow-500/20 p-4 flex items-center gap-4">
          <Link href="/mobile" className="text-2xl">←</Link>
          <h1 className="text-xl font-bold">What triggered this urge?</h1>
        </header>

        <div className="p-6 space-y-4">
          <p className="text-yellow-100 text-center mb-6">
            Understanding your triggers helps break the pattern.
          </p>

          <div className="space-y-3">
            {TRIGGERS.map((trigger) => (
              <button
                key={trigger.id}
                onClick={() => {
                  setSelectedTrigger(trigger.id)
                  setStep('task')
                }}
                className="w-full bg-yellow-900/40 hover:bg-yellow-800/50 border border-yellow-500/30 rounded-lg p-4 transition-all transform active:scale-95 flex items-center justify-between"
              >
                <span className="font-semibold text-lg">{trigger.label}</span>
                <span className="text-3xl">{trigger.emoji}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep('task')}
            className="w-full text-center text-yellow-300 hover:text-yellow-100 py-2 mt-6"
          >
            Skip →
          </button>
        </div>
      </div>
    )
  }

  if (step === 'task') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-purple-950 to-black text-white">
        <header className="bg-purple-900/30 border-b border-purple-500/20 p-4 flex items-center gap-4">
          <button onClick={() => setStep('trigger')} className="text-2xl">←</button>
          <h1 className="text-xl font-bold">Pick a Micro-Task</h1>
        </header>

        <div className="p-6 space-y-4">
          <p className="text-purple-100 text-center mb-4">
            Do this instead of scrolling. It'll take less time and actually help.
          </p>

          <div className="space-y-3">
            {MICRO_TASKS.map((task) => (
              <button
                key={task.id}
                onClick={() => handleStartTask(task)}
                className="w-full bg-purple-900/40 hover:bg-purple-800/50 border border-purple-500/30 rounded-lg p-4 transition-all transform active:scale-95 text-left"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-lg mb-1">{task.title}</div>
                    <div className="text-sm text-purple-200">{task.description}</div>
                    <div className="text-xs text-purple-400 mt-2">{task.durationSec}sec • {task.category}</div>
                  </div>
                  <div className="text-3xl ml-3">{task.emoji}</div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={handleSkipTask}
            className="w-full text-center text-purple-300 hover:text-purple-100 py-2 mt-6"
          >
            Skip task (just log urge) →
          </button>
        </div>
      </div>
    )
  }

  if (step === 'timer') {
    const progress = selectedTask ? ((selectedTask.durationSec - timeLeft) / selectedTask.durationSec) * 100 : 0

    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-green-950 to-black text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="text-6xl mb-4">{selectedTask?.emoji}</div>
          <h1 className="text-3xl font-bold">{selectedTask?.title}</h1>
          <p className="text-green-200">{selectedTask?.description}</p>

          <div className="bg-green-900/40 border border-green-500/30 rounded-full p-8 my-8">
            <div className="text-7xl font-bold">{timeLeft}</div>
            <div className="text-green-300 text-sm mt-2">seconds left</div>
          </div>

          <div className="w-full bg-green-950 rounded-full h-4">
            <div
              className="bg-green-500 h-4 rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <button
            onClick={handleSkipTask}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg mt-8"
          >
            Done Early
          </button>
        </div>
      </div>
    )
  }

  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-green-950 to-black text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="text-8xl mb-4">🎉</div>
          <h1 className="text-4xl font-bold">You Did It!</h1>
          <p className="text-xl text-green-200">
            You resisted the urge to scroll. That's a win.
          </p>

          <div className="bg-green-900/40 border border-green-500/30 rounded-lg p-6 space-y-3">
            <div className="text-sm text-green-300">Urge Logged:</div>
            <div className="font-semibold text-lg">
              Trigger: {TRIGGERS.find(t => t.id === selectedTrigger)?.label || 'Unknown'}
            </div>
            {selectedTask && (
              <div className="text-green-200">
                Completed: {selectedTask.title}
              </div>
            )}
            <div className="text-2xl font-bold text-green-400 mt-4">+10 XP</div>
          </div>

          <button
            onClick={handleComplete}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return null
}
