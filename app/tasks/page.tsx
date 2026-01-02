'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PillBadge } from '@/components/ui/PillBadge'
import { Collapsible } from '@/components/ui/Collapsible'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { BuildTeaserCard } from '@/components/BuildTeaserCard'
import { useToast } from '@/components/ui/Toast'
import { resolveTaskTypeEmoji } from '@/lib/taskTypeEmoji'

interface Task {
  id: string
  title: string
  description: string | null
  type: string
  taskType?: {
    id: string
    key: string
    name: string
    emoji?: string | null
  } | null
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
  const [taskTypes, setTaskTypes] = useState<
    Array<{
      id: string
      key: string
      name: string
      emoji?: string | null
      isArchived: boolean
    }>
  >([])
  const [loading, setLoading] = useState(true)
  const [showAddTask, setShowAddTask] = useState(false)
  const [buildNudgePoints, setBuildNudgePoints] = useState<number | null>(null)
  const pushToast = useToast()

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [taskTypeId, setTaskTypeId] = useState<string>('')
  const [durationMin, setDurationMin] = useState('')

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch('/api/tasks')
      const data = await response.json()
      setTasks(data.tasks || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTaskTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/task-types', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Failed to load task types')
      const types = (data.taskTypes || []).filter((t: any) => !t.isArchived)
      setTaskTypes(types)
      if (!taskTypeId) {
        const defaultType = types.find((t: any) => t.key === 'exposure') || types[0]
        if (defaultType?.id) setTaskTypeId(defaultType.id)
      }
    } catch (error) {
      console.error('Error fetching task types:', error)
    }
  }, [taskTypeId])

  useEffect(() => {
    fetchTasks()
    fetchTaskTypes()
  }, [fetchTasks, fetchTaskTypes])

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          taskTypeId: taskTypeId || undefined,
          durationMin: durationMin ? parseInt(durationMin) : null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create task')
      }

      // Reset form
      setTitle('')
      setDescription('')
      const defaultType = taskTypes.find((t) => t.key === 'exposure') || taskTypes[0]
      setTaskTypeId(defaultType?.id || '')
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

    pushToast({
      title: 'Task completed',
      description: `+${data.xpEarned} XP`,
      actionLabel: 'View build',
      onAction: () => (window.location.href = '/build'),
    })
    if (data.buildPoints) {
      setBuildNudgePoints(data.buildPoints)
    }
    fetchTasks()
  } catch (error) {
      console.error('Error completing task:', error)
      alert('Failed to complete task')
  }
}

  const activeBosses = tasks.filter(t => !t.completed && t.isBoss)
  const activeRegularTasks = tasks.filter(t => !t.completed && !t.isBoss)
  const completedTasks = tasks.filter(t => t.completed)

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
    <div className="min-h-screen bg-transparent text-dd-text">
      {/* Header */}
      <header className="glass-panel rounded-none p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <Link href="/mobile" className="text-2xl text-dd-muted hover:text-dd-text">
              ←
            </Link>
            <h1 className="text-xl font-serif uppercase tracking-widest text-mana">
              All Tasks
            </h1>
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
        {buildNudgePoints && (
          <Card className="glass-panel p-4 border border-mana/40">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-dd-text">Build Updated</div>
                <div className="text-sm text-dd-muted">
                  +{buildNudgePoints} build points applied to your cathedral.
                </div>
              </div>
              <Link href="/build">
                <Button variant="primary" size="sm">
                  View Build
                </Button>
              </Link>
            </div>
          </Card>
        )}

        <BuildTeaserCard />

        {/* Add Task Form */}
        {showAddTask && (
          <Card className="scroll-card p-4">
            <form onSubmit={handleAddTask} className="space-y-4">
              <h2 className="font-serif uppercase tracking-widest text-slate-900 text-lg">
                Create New Task
              </h2>

              <div>
                <label className="block text-sm text-slate-700 mb-1">Task type</label>
                <select
                  value={taskTypeId}
                  onChange={(e) => setTaskTypeId(e.target.value)}
                  className="dd-input p-3"
                >
                  {taskTypes.length === 0 ? (
                    <option value="" disabled>
                      Loading…
                    </option>
                  ) : (
                    taskTypes.map((tt) => (
                      <option key={tt.id} value={tt.id}>
                        {resolveTaskTypeEmoji({ emoji: tt.emoji, key: tt.key, name: tt.name })}{' '}
                        {tt.name}
                      </option>
                    ))
                  )}
                </select>
                <div className="text-xs text-slate-700 mt-1">
                  Manage types in{' '}
                  <Link href="/settings/task-types" className="underline hover:text-slate-900">
                    Settings
                  </Link>
                  .
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  required
                  className="dd-input p-3"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-700 mb-1">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Any details..."
                  rows={2}
                  className="dd-input p-3"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-700 mb-1">Duration (minutes, optional)</label>
                <input
                  type="number"
                  value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                  placeholder="30"
                  className="dd-input p-3 tabular-nums"
                />
              </div>

              <Button type="submit" variant="primary" size="md" className="w-full">
                Create Task
              </Button>
            </form>
          </Card>
        )}

        {/* Boss Battles */}
        {loading ? (
          <div className="text-center text-dd-muted py-8">Loading tasks...</div>
        ) : (
          <>
            {/* Active Boss Battles */}
            {activeBosses.length > 0 && (
              <div>
                <h2 className="font-serif uppercase tracking-widest text-mana text-lg mb-3 flex items-center gap-2">
                  ⚔️ Boss Battles
                  <PillBadge variant="negative">{activeBosses.length}</PillBadge>
                </h2>
                <div className="space-y-3">
                  {activeBosses.map((boss) => {
                    const difficultyEmoji = {
                      easy: '😊',
                      medium: '🤔',
                      hard: '😰',
                      brutal: '💀',
                    }[boss.bossDifficulty as 'easy' | 'medium' | 'hard' | 'brutal'] || '⚔️'

                    return (
                      <Link key={boss.id} href={`/boss/${boss.id}`}>
                        <Card className="scroll-card border border-blood/40 transition-transform hover:-translate-y-1">
                          <div className="flex items-start gap-3 mb-3">
                            <span className="text-3xl">{difficultyEmoji}</span>
                            <div className="flex-1">
                              <div className="font-bold text-lg mb-1">{boss.title}</div>
                              {boss.description && (
                                <div className="text-sm text-slate-700 mb-2">{boss.description}</div>
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
                            <span className="text-slate-700">
                              {Math.ceil((boss.bossHpRemaining || 0) / 60)}h of work remaining
                            </span>
                            <span className="text-blood">Tap to attack →</span>
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
              <h2 className="font-serif uppercase tracking-widest text-mana text-lg mb-3 flex items-center gap-2">
                Active Tasks
                <PillBadge variant="muted">{activeRegularTasks.length}</PillBadge>
              </h2>
              {activeRegularTasks.length === 0 ? (
                <div className="glass-panel border border-dashed border-dd-border/60 rounded-xl p-6 text-center text-dd-muted">
                    No active tasks. Click "+ Add Task" to create one.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeRegularTasks.map((task) => (
                    <Card
                      key={task.id}
                      padding="md"
                      className="scroll-card transition-transform hover:-translate-y-1"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">
                              {resolveTaskTypeEmoji({
                                emoji: task.taskType?.emoji,
                                key: task.taskType?.key || task.type || 'other',
                                name: task.taskType?.name,
                              })}
                            </span>
                            <PillBadge
                              variant={getTypeVariant(task.taskType?.key || task.type || 'other')}
                              size="sm"
                            >
                              {task.taskType?.name ?? getTypeName(task.type) ?? 'Other'}
                            </PillBadge>
                          </div>
                          <div className="font-semibold mb-1">{task.title}</div>
                          {task.description && (
                            <div className="text-sm text-slate-700">
                              {task.description}
                            </div>
                          )}
                          {task.durationMin && (
                            <div className="text-xs text-slate-600 mt-1 tabular-nums">
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
                    <span className="font-serif uppercase tracking-widest text-mana text-lg">
                      Completed
                    </span>
                    <PillBadge variant="positive" size="sm">{completedTasks.length}</PillBadge>
                  </div>
                }
              >
                <div className="space-y-2 mt-3">
                  {completedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="scroll-card flex items-start gap-3 p-3 opacity-70 brightness-150 grayscale sepia blur-sm transition-all duration-700 motion-reduce:transition-none"
                    >
                      <span className="text-xl">
                        {resolveTaskTypeEmoji({
                          emoji: task.taskType?.emoji,
                          key: task.taskType?.key || task.type || 'other',
                          name: task.taskType?.name,
                        })}
                      </span>
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
