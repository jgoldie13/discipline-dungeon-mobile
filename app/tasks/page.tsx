'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PillBadge } from '@/components/ui/PillBadge'
import { Collapsible } from '@/components/ui/Collapsible'
import { ProgressBar } from '@/components/ui/ProgressBar'

interface Task {
  id: string
  title: string
  description: string | null
  type: string
  durationMin: number | null
  completed: boolean
  completedAt: string | null
  xpEarned: number
  createdAt: string
  isBoss: boolean
  bossHp?: number
  bossHpRemaining?: number
  bossDifficulty?: string
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddTask, setShowAddTask] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('exposure')
  const [durationMin, setDurationMin] = useState('')

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks')
      const data = await response.json()
      setTasks(data.tasks || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          type,
          durationMin: durationMin ? parseInt(durationMin) : null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create task')
      }

      // Reset form
      setTitle('')
      setDescription('')
      setType('exposure')
      setDurationMin('')
      setShowAddTask(false)

      // Refresh tasks
      fetchTasks()
    } catch (error) {
      console.error('Error creating task:', error)
      alert('Failed to create task')
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete task')
      }

      alert(`✅ Task completed! +${data.xpEarned} XP`)
      fetchTasks()
    } catch (error) {
      console.error('Error completing task:', error)
      alert('Failed to complete task')
    }
  }

  const activeBosses = tasks.filter(t => !t.completed && t.isBoss)
  const activeRegularTasks = tasks.filter(t => !t.completed && !t.isBoss)
  const completedTasks = tasks.filter(t => t.completed)

  const getTypeEmoji = (taskType: string) => {
    switch (taskType) {
      case 'exposure': return '🎯'
      case 'job_search': return '💼'
      case 'habit': return '🔄'
      default: return '📋'
    }
  }

  const getTypeVariant = (taskType: string): 'positive' | 'warning' | 'default' => {
    switch (taskType) {
      case 'exposure': return 'warning'
      case 'job_search': return 'positive'
      case 'habit': return 'default'
      default: return 'default'
    }
  }

  const getTypeName = (taskType: string) => {
    switch (taskType) {
      case 'exposure': return 'Exposure'
      case 'job_search': return 'Job Search'
      case 'habit': return 'Habit'
      default: return taskType
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Header */}
      <header className="bg-surface-1 border-b border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <Link href="/mobile" className="text-2xl">←</Link>
            <h1 className="text-xl font-bold">All Tasks</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/boss/create" className="flex-1">
            <Button variant="destructive" size="sm" className="w-full">
              ⚔️ Create Boss
            </Button>
          </Link>
          <Button
            variant={showAddTask ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => setShowAddTask(!showAddTask)}
            className="flex-1"
          >
            {showAddTask ? 'Cancel' : '+ Add Task'}
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Add Task Form */}
        {showAddTask && (
          <Card>
            <form onSubmit={handleAddTask} className="space-y-4">
              <h2 className="font-semibold text-lg">Create New Task</h2>

              <div>
                <label className="block text-sm text-muted mb-1">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-bg border border-border rounded-[--radius-lg] p-3 focus:outline-none focus:border-focus text-text"
                >
                  <option value="exposure">🎯 Exposure (100 XP)</option>
                  <option value="job_search">💼 Job Search (50 XP)</option>
                  <option value="habit">🔄 Habit (varies)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-muted mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  required
                  className="w-full bg-bg border border-border rounded-[--radius-lg] p-3 focus:outline-none focus:border-focus text-text"
                />
              </div>

              <div>
                <label className="block text-sm text-muted mb-1">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Any details..."
                  rows={2}
                  className="w-full bg-bg border border-border rounded-[--radius-lg] p-3 focus:outline-none focus:border-focus text-text"
                />
              </div>

              {type === 'habit' && (
                <div>
                  <label className="block text-sm text-muted mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
                    placeholder="30"
                    className="w-full bg-bg border border-border rounded-[--radius-lg] p-3 focus:outline-none focus:border-focus text-text tabular-nums"
                  />
                </div>
              )}

              <Button type="submit" variant="primary" size="md" className="w-full">
                Create Task
              </Button>
            </form>
          </Card>
        )}

        {/* Boss Battles */}
        {loading ? (
          <div className="text-center text-muted py-8">Loading tasks...</div>
        ) : (
          <>
            {/* Active Boss Battles */}
            {activeBosses.length > 0 && (
              <div>
                <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  ⚔️ Boss Battles
                  <PillBadge variant="negative">{activeBosses.length}</PillBadge>
                </h2>
                <div className="space-y-3">
                  {activeBosses.map((boss) => {
                    const hpPercent = ((boss.bossHpRemaining || 0) / (boss.bossHp || 1)) * 100
                    const difficultyEmoji = {
                      easy: '😊',
                      medium: '🤔',
                      hard: '😰',
                      brutal: '💀',
                    }[boss.bossDifficulty as 'easy' | 'medium' | 'hard' | 'brutal'] || '⚔️'

                    return (
                      <Link key={boss.id} href={`/boss/${boss.id}`}>
                        <Card className="border-negative hover:bg-surface-2 transition-colors">
                          <div className="flex items-start gap-3 mb-3">
                            <span className="text-3xl">{difficultyEmoji}</span>
                            <div className="flex-1">
                              <div className="font-bold text-lg mb-1">{boss.title}</div>
                              {boss.description && (
                                <div className="text-sm text-muted mb-2">{boss.description}</div>
                              )}
                              <PillBadge variant="negative" size="sm">
                                {boss.bossDifficulty?.toUpperCase()} BOSS
                              </PillBadge>
                            </div>
                          </div>

                          {/* HP Bar */}
                          <ProgressBar
                            variant="boss"
                            value={boss.bossHpRemaining || 0}
                            max={boss.bossHp || 1}
                            label="Boss HP"
                            meta={`${boss.bossHpRemaining} / ${boss.bossHp}`}
                            className="mb-2"
                          />

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted">
                              {Math.ceil((boss.bossHpRemaining || 0) / 60)}h of work remaining
                            </span>
                            <span className="text-negative">Tap to attack →</span>
                          </div>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Regular Active Tasks */}
            <div>
              <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
                Active Tasks
                <PillBadge variant="muted">{activeRegularTasks.length}</PillBadge>
              </h2>
              {activeRegularTasks.length === 0 ? (
                <Card>
                  <div className="text-center text-muted py-4">
                    No active tasks. Click "+ Add Task" to create one.
                  </div>
                </Card>
              ) : (
                <div className="space-y-2">
                  {activeRegularTasks.map((task) => (
                    <Card key={task.id} padding="md">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{getTypeEmoji(task.type)}</span>
                            <PillBadge variant={getTypeVariant(task.type)} size="sm">
                              {getTypeName(task.type)}
                            </PillBadge>
                          </div>
                          <div className="font-semibold mb-1">{task.title}</div>
                          {task.description && (
                            <div className="text-sm text-muted">{task.description}</div>
                          )}
                          {task.durationMin && (
                            <div className="text-xs text-muted mt-1 tabular-nums">
                              {task.durationMin} minutes
                            </div>
                          )}
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleCompleteTask(task.id)}
                        >
                          Complete
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Completed Tasks - Collapsible */}
            {completedTasks.length > 0 && (
              <Collapsible
                trigger={
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">Completed</span>
                    <PillBadge variant="positive" size="sm">{completedTasks.length}</PillBadge>
                  </div>
                }
              >
                <div className="space-y-2 mt-3">
                  {completedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 bg-surface-2 rounded-[--radius-md] opacity-60"
                    >
                      <span className="text-xl">{getTypeEmoji(task.type)}</span>
                      <div className="flex-1">
                        <div className="font-semibold line-through">{task.title}</div>
                        <PillBadge variant="positive" size="sm" className="mt-1">
                          +{task.xpEarned} XP
                        </PillBadge>
                      </div>
                    </div>
                  ))}
                </div>
              </Collapsible>
            )}
          </>
        )}
      </div>
    </div>
  )
}
