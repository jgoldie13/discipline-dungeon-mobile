'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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
      setTasks(data.tasks)
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

  const activeTasks = tasks.filter(t => !t.completed)
  const completedTasks = tasks.filter(t => t.completed)

  const getTypeEmoji = (taskType: string) => {
    switch (taskType) {
      case 'exposure': return '🎯'
      case 'job_search': return '💼'
      case 'habit': return '🔄'
      default: return '📋'
    }
  }

  const getTypeColor = (taskType: string) => {
    switch (taskType) {
      case 'exposure': return 'text-red-400'
      case 'job_search': return 'text-blue-400'
      case 'habit': return 'text-green-400'
      default: return 'text-purple-400'
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
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-950 to-black text-white">
      {/* Header */}
      <header className="bg-purple-900/30 border-b border-purple-500/20 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/mobile" className="text-2xl">←</Link>
          <h1 className="text-xl font-bold">All Tasks</h1>
        </div>
        <button
          onClick={() => setShowAddTask(!showAddTask)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg text-sm"
        >
          {showAddTask ? 'Cancel' : '+ Add'}
        </button>
      </header>

      <div className="p-4 space-y-4">
        {/* Add Task Form */}
        {showAddTask && (
          <form onSubmit={handleAddTask} className="bg-purple-900/40 border border-purple-500/30 rounded-lg p-4 space-y-4">
            <h2 className="font-semibold text-lg">Create New Task</h2>

            <div>
              <label className="block text-sm text-purple-300 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-purple-950 border border-purple-500/50 rounded-lg p-3 focus:outline-none focus:border-purple-400"
              >
                <option value="exposure">🎯 Exposure (100 XP)</option>
                <option value="job_search">💼 Job Search (50 XP)</option>
                <option value="habit">🔄 Habit (varies)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-purple-300 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                required
                className="w-full bg-purple-950 border border-purple-500/50 rounded-lg p-3 focus:outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="block text-sm text-purple-300 mb-1">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Any details..."
                rows={2}
                className="w-full bg-purple-950 border border-purple-500/50 rounded-lg p-3 focus:outline-none focus:border-purple-400"
              />
            </div>

            {type === 'habit' && (
              <div>
                <label className="block text-sm text-purple-300 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                  placeholder="30"
                  className="w-full bg-purple-950 border border-purple-500/50 rounded-lg p-3 focus:outline-none focus:border-purple-400"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg"
            >
              Create Task
            </button>
          </form>
        )}

        {/* Active Tasks */}
        {loading ? (
          <div className="text-center text-purple-400 py-8">Loading tasks...</div>
        ) : (
          <>
            <div>
              <h2 className="font-semibold text-lg mb-3">Active Tasks ({activeTasks.length})</h2>
              {activeTasks.length === 0 ? (
                <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-6 text-center text-purple-300">
                  No active tasks. Click "+ Add" to create one.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-purple-900/40 border border-purple-500/30 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">{getTypeEmoji(task.type)}</span>
                            <span className={`text-xs font-semibold ${getTypeColor(task.type)}`}>
                              {getTypeName(task.type)}
                            </span>
                          </div>
                          <div className="font-semibold mb-1">{task.title}</div>
                          {task.description && (
                            <div className="text-sm text-purple-200">{task.description}</div>
                          )}
                          {task.durationMin && (
                            <div className="text-xs text-purple-300 mt-1">
                              {task.durationMin} minutes
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleCompleteTask(task.id)}
                          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg text-sm whitespace-nowrap"
                        >
                          Complete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div>
                <h2 className="font-semibold text-lg mb-3 text-purple-300">
                  Completed ({completedTasks.length})
                </h2>
                <div className="space-y-2">
                  {completedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-4 opacity-60"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl">{getTypeEmoji(task.type)}</span>
                        <div className="flex-1">
                          <div className="font-semibold line-through">{task.title}</div>
                          <div className="text-xs text-green-400 mt-1">
                            +{task.xpEarned} XP
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
