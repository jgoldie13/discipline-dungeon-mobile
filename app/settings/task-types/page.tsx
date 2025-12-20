'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AuthGate } from '@/components/auth/AuthGate'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/Toast'
import { getDefaultTaskTypeEmoji, resolveTaskTypeEmoji } from '@/lib/taskTypeEmoji'

type TaskType = {
  id: string
  key: string
  name: string
  emoji?: string | null
  xpBase: number
  xpPerMinute: number
  xpCap: number
  xpMultiplier: string | number
  buildMultiplier: string | number
  sortOrder: number
  isArchived: boolean
}

type TaskTypeFormState = {
  name: string
  emoji: string
  xpBase: string
  xpPerMinute: string
  xpCap: string
  xpMultiplier: string
  buildMultiplier: string
}

const DEFAULT_FORM: TaskTypeFormState = {
  name: '',
  emoji: getDefaultTaskTypeEmoji({ key: 'other' }),
  xpBase: '60',
  xpPerMinute: '1',
  xpCap: '60',
  xpMultiplier: '1.0',
  buildMultiplier: '1.0',
}

const EMOJI_PRESETS = [
  '🎯',
  '💼',
  '🔄',
  '⚔️',
  '🧠',
  '🧘',
  '📚',
  '🛠️',
  '🧪',
  '🏃',
  '🧭',
  '📜',
  '🕯️',
  '🪶',
  '🗝️',
  '🏹',
  '🧩',
  '🪙',
  '🗺️',
  '📋',
]

const RECENT_EMOJI_KEY = 'dd-tasktype-emoji-recents'

function parseOptionalInt(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const n = Number.parseInt(trimmed, 10)
  if (Number.isNaN(n)) return undefined
  return n
}

function parseOptionalFloat(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const n = Number.parseFloat(trimmed)
  if (Number.isNaN(n)) return undefined
  return n
}

function formatDecimal(value: string | number): string {
  const n = typeof value === 'number' ? value : Number.parseFloat(value)
  if (Number.isNaN(n)) return String(value)
  return n.toFixed(2)
}

export default function TaskTypesSettingsPage() {
  const pushToast = useToast()
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<TaskType | null>(null)
  const [form, setForm] = useState<TaskTypeFormState>(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [recentEmojis, setRecentEmojis] = useState<string[]>([])

  useEffect(() => {
    const stored = window.localStorage.getItem(RECENT_EMOJI_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setRecentEmojis(parsed.filter((e) => typeof e === 'string'))
        }
      } catch {
        window.localStorage.removeItem(RECENT_EMOJI_KEY)
      }
    }
  }, [])

  const pushRecentEmoji = useCallback((emoji: string) => {
    setRecentEmojis((prev) => {
      const next = [emoji, ...prev.filter((item) => item !== emoji)].slice(0, 8)
      window.localStorage.setItem(RECENT_EMOJI_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const applyEmoji = useCallback(
    (emoji: string) => {
      const trimmed = emoji.trim()
      if (!trimmed) return
      setForm((s) => ({ ...s, emoji: trimmed }))
      pushRecentEmoji(trimmed)
    },
    [pushRecentEmoji]
  )

  const fetchTaskTypes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/task-types?includeArchived=1', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) {
        console.error('[TaskTypes] API error:', { status: res.status, data })
        throw new Error(data?.error || `Failed to load task types (${res.status})`)
      }
      setTaskTypes(data.taskTypes || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load task types'
      console.error('[TaskTypes] Fetch error:', err)
      pushToast({ title: 'Task types', description: message })
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  useEffect(() => {
    fetchTaskTypes()
  }, [fetchTaskTypes])

  const { activeTypes, archivedTypes } = useMemo(() => {
    const sorted = [...taskTypes].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
      return a.name.localeCompare(b.name)
    })
    return {
      activeTypes: sorted.filter((t) => !t.isArchived),
      archivedTypes: sorted.filter((t) => t.isArchived),
    }
  }, [taskTypes])

  const openCreate = () => {
    setModalMode('create')
    setEditing(null)
    setForm(DEFAULT_FORM)
    setModalOpen(true)
  }

  const openEdit = (taskType: TaskType) => {
    setModalMode('edit')
    setEditing(taskType)
    setForm({
      name: taskType.name || '',
      emoji: resolveTaskTypeEmoji({
        emoji: taskType.emoji,
        key: taskType.key,
        name: taskType.name,
      }),
      xpBase: String(taskType.xpBase ?? 60),
      xpPerMinute: String(taskType.xpPerMinute ?? 1),
      xpCap: String(taskType.xpCap ?? 60),
      xpMultiplier: String(taskType.xpMultiplier ?? 1.0),
      buildMultiplier: String(taskType.buildMultiplier ?? 1.0),
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    if (submitting) return
    setModalOpen(false)
  }

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    const name = form.name.trim()
    if (!name) {
      pushToast({ title: 'Validation', description: 'Name is required' })
      return
    }

    const emoji = resolveTaskTypeEmoji({ emoji: form.emoji, name })

    const payload = {
      name,
      emoji,
      xpBase: parseOptionalInt(form.xpBase),
      xpPerMinute: parseOptionalInt(form.xpPerMinute),
      xpCap: parseOptionalInt(form.xpCap),
      xpMultiplier: parseOptionalFloat(form.xpMultiplier),
      buildMultiplier: parseOptionalFloat(form.buildMultiplier),
    }

    setSubmitting(true)
    try {
      if (modalMode === 'create') {
        const res = await fetch('/api/task-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Failed to create task type')
        pushToast({ title: 'Task types', description: 'Created' })
      } else {
        if (!editing) return
        const res = await fetch(`/api/task-types/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Failed to update task type')
        pushToast({ title: 'Task types', description: 'Updated' })
      }
      setModalOpen(false)
      await fetchTaskTypes()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed'
      pushToast({ title: 'Task types', description: message })
    } finally {
      setSubmitting(false)
    }
  }

  const setArchived = async (taskType: TaskType, isArchived: boolean) => {
    const actionLabel = isArchived ? 'archive' : 'unarchive'
    const ok = window.confirm(`Are you sure you want to ${actionLabel} "${taskType.name}"?`)
    if (!ok) return

    try {
      const res = await fetch(`/api/task-types/${taskType.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `Failed to ${actionLabel}`)
      await fetchTaskTypes()
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to ${actionLabel}`
      pushToast({ title: 'Task types', description: message })
    }
  }

  const swapSortOrder = async (a: TaskType, b: TaskType) => {
    try {
      const res1 = await fetch(`/api/task-types/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: b.sortOrder }),
      })
      const data1 = await res1.json()
      if (!res1.ok) throw new Error(data1?.error || 'Failed to reorder')

      const res2 = await fetch(`/api/task-types/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: a.sortOrder }),
      })
      const data2 = await res2.json()
      if (!res2.ok) throw new Error(data2?.error || 'Failed to reorder')

      await fetchTaskTypes()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reorder'
      pushToast({ title: 'Task types', description: message })
    }
  }

  const moveUp = async (list: TaskType[], index: number) => {
    if (index <= 0) return
    await swapSortOrder(list[index], list[index - 1])
  }

  const moveDown = async (list: TaskType[], index: number) => {
    if (index >= list.length - 1) return
    await swapSortOrder(list[index], list[index + 1])
  }

  return (
    <AuthGate>
      <div className="min-h-screen bg-transparent text-dd-text">
        <header className="glass-panel rounded-none p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <Link href="/settings" className="text-2xl" aria-label="Back to settings">
                ←
              </Link>
              <div>
                <h1 className="text-xl font-serif uppercase tracking-widest text-mana">
                  Task Types
                </h1>
                <p className="text-xs text-dd-muted">
                  Configure per-task XP and build point weighting.
                </p>
              </div>
            </div>
            <Button onClick={openCreate} size="sm">
              + New
            </Button>
          </div>
        </header>

        <div className="p-4 space-y-4">
          <Card className="scroll-card p-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-dd-text">Show archived</div>
              <div className="text-sm text-dd-muted">
                Archived types won’t appear in the task picker.
              </div>
            </div>
            <Switch checked={showArchived} onChange={setShowArchived} />
          </Card>

          {loading ? (
            <div className="text-center text-dd-muted py-10">
              Loading task types…
            </div>
          ) : (
            <>
              <Section
                title={`Active (${activeTypes.length})`}
                empty="No active task types yet."
              >
                {activeTypes.map((t, idx) => (
                  <TaskTypeRow
                    key={t.id}
                    taskType={t}
                    index={idx}
                    total={activeTypes.length}
                    onEdit={() => openEdit(t)}
                    onArchive={() => setArchived(t, true)}
                    onMoveUp={() => moveUp(activeTypes, idx)}
                    onMoveDown={() => moveDown(activeTypes, idx)}
                  />
                ))}
              </Section>

              {showArchived && (
                <Section
                  title={`Archived (${archivedTypes.length})`}
                  empty="No archived task types."
                >
                  {archivedTypes.map((t, idx) => (
                    <TaskTypeRow
                      key={t.id}
                      taskType={t}
                      index={idx}
                      total={archivedTypes.length}
                      onEdit={() => openEdit(t)}
                      onArchive={() => setArchived(t, false)}
                      onMoveUp={() => moveUp(archivedTypes, idx)}
                      onMoveDown={() => moveDown(archivedTypes, idx)}
                      archived
                    />
                  ))}
                </Section>
              )}
            </>
          )}
        </div>

        <Modal
          open={modalOpen}
          onClose={closeModal}
          title={modalMode === 'create' ? 'Create task type' : 'Edit task type'}
        >
          <form onSubmit={submitForm} className="space-y-4">
            <div>
              <label className="block text-sm text-dd-muted mb-1">Name</label>
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                className="dd-input p-3"
                placeholder="e.g., Deep work"
                required
              />
              {editing && (
                <div className="text-xs text-dd-muted mt-1">
                  Key: <span className="tabular-nums">{editing.key}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-dd-muted">Emoji</label>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 flex items-center justify-center rounded-[--radius-lg] border border-dd-border/60 bg-dd-surface/70 text-2xl">
                  {form.emoji || getDefaultTaskTypeEmoji({ name: form.name })}
                </div>
                <input
                  value={form.emoji}
                  onChange={(e) => setForm((s) => ({ ...s, emoji: e.target.value }))}
                  onBlur={(e) => applyEmoji(e.target.value)}
                  placeholder="Paste an emoji"
                  className="dd-input flex-1"
                />
              </div>

              {recentEmojis.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {recentEmojis.map((emoji) => (
                    <button
                      key={`recent-${emoji}`}
                      type="button"
                      onClick={() => applyEmoji(emoji)}
                      className={`h-9 w-9 rounded-[--radius-md] border text-lg ${
                        form.emoji === emoji
                          ? 'border-gold/70 bg-dd-surface/80 glow-blue'
                          : 'border-dd-border/60 bg-dd-surface/60 hover:border-gold/50'
                      }`}
                      aria-label={`Use emoji ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-6 gap-2">
                {EMOJI_PRESETS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => applyEmoji(emoji)}
                    className={`h-9 w-9 rounded-[--radius-md] border text-lg ${
                      form.emoji === emoji
                        ? 'border-gold/70 bg-dd-surface/80 glow-blue'
                        : 'border-dd-border/60 bg-dd-surface/60 hover:border-gold/50'
                    }`}
                    aria-pressed={form.emoji === emoji}
                    aria-label={`Use emoji ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Base XP"
                value={form.xpBase}
                onChange={(v) => setForm((s) => ({ ...s, xpBase: v }))}
                placeholder="60"
              />
              <NumberField
                label="XP / min"
                value={form.xpPerMinute}
                onChange={(v) => setForm((s) => ({ ...s, xpPerMinute: v }))}
                placeholder="1"
              />
              <NumberField
                label="XP cap"
                value={form.xpCap}
                onChange={(v) => setForm((s) => ({ ...s, xpCap: v }))}
                placeholder="60"
              />
              <NumberField
                label="XP multiplier"
                value={form.xpMultiplier}
                onChange={(v) => setForm((s) => ({ ...s, xpMultiplier: v }))}
                placeholder="1.0"
                step="0.01"
              />
              <NumberField
                label="Build multiplier"
                value={form.buildMultiplier}
                onChange={(v) => setForm((s) => ({ ...s, buildMultiplier: v }))}
                placeholder="1.0"
                step="0.01"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={closeModal}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AuthGate>
  )
}

function Section({
  title,
  empty,
  children,
}: {
  title: string
  empty: string
  children: React.ReactNode
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-serif uppercase tracking-widest text-mana text-sm">
          {title}
        </h2>
      </div>
      {!hasChildren ? (
        <div className="glass-panel border border-dashed border-dd-border/60 rounded-xl py-6 text-center text-dd-muted">
          {empty}
        </div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  )
}

function TaskTypeRow({
  taskType,
  index,
  total,
  onEdit,
  onArchive,
  onMoveUp,
  onMoveDown,
  archived = false,
}: {
  taskType: TaskType
  index: number
  total: number
  onEdit: () => void
  onArchive: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  archived?: boolean
}) {
  const rules = `Base ${taskType.xpBase}, +${taskType.xpPerMinute}/min (cap ${taskType.xpCap}), ×${formatDecimal(
    taskType.xpMultiplier
  )}, build ×${formatDecimal(taskType.buildMultiplier)}`

  return (
    <Card
      className={`scroll-card ${archived ? 'opacity-70' : ''}`}
      padding="md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {resolveTaskTypeEmoji({
                emoji: taskType.emoji,
                key: taskType.key,
                name: taskType.name,
              })}
            </span>
            <div className="font-semibold text-dd-text">{taskType.name}</div>
          </div>
          <div className="text-xs text-dd-muted tabular-nums mt-0.5">{rules}</div>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onMoveUp}
              disabled={index === 0}
            >
              ↑
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onMoveDown}
              disabled={index === total - 1}
            >
              ↓
            </Button>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={onEdit}>
              Edit
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={onArchive}>
              {archived ? 'Unarchive' : 'Archive'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
  step = '1',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  step?: string
}) {
  return (
    <div>
      <label className="block text-sm text-dd-muted mb-1">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={step}
        className="dd-input p-3 tabular-nums"
      />
    </div>
  )
}
