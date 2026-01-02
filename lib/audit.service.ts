/**
 * Audit Service - Immutable append-only event log
 * Records all truth-critical actions for radical honesty enforcement
 */

import { prisma } from './prisma'
import { getUserDayBoundsUtc, resolveUserTimezone } from './time'

export type AuditEventType =
  | 'block_started'
  | 'block_completed'
  | 'block_failed'
  | 'boss_attack'
  | 'boss_defeated'
  | 'stake_created'
  | 'stake_evaluated'
  | 'stake_paid'
  | 'urge_logged'
  | 'task_completed'
  | 'phone_log_reconciled'
  | 'override'           // User admitted rule violation
  | 'cheat_admitted'     // User admitted lying/cheating
  | 'scroll_intent'      // User expressed desire to scroll
  | 'microtask_selected' // User chose a microtask instead of scrolling

interface RecordEventParams {
  userId: string
  type: AuditEventType
  description?: string
  entityType?: 'PhoneFreeBlock' | 'Task' | 'StakeCommitment' | 'Urge'
  entityId?: string
  metadata?: Record<string, unknown>
}

export const AuditService = {
  /**
   * Record an audit event (append-only, immutable)
   */
  async recordEvent(params: RecordEventParams) {
    try {
      const event = await prisma.auditEvent.create({
        data: {
          userId: params.userId,
          type: params.type,
          description: params.description,
          entityType: params.entityType,
          entityId: params.entityId,
          metadata: params.metadata ? (params.metadata as any) : null,
        },
      })

      console.log(`[Audit] ${params.type} recorded for user ${params.userId}`)
      return event
    } catch (error) {
      console.error('[Audit] Failed to record event:', error)
      // Don't throw - audit failures shouldn't block primary operations
      return null
    }
  },

  /**
   * Get today's audit events for a user
   */
  async getTodayEvents(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    })
    const timezone = resolveUserTimezone(user?.timezone)
    const { startUtc: today, endUtc: tomorrow } = getUserDayBoundsUtc(
      timezone,
      new Date()
    )

    return prisma.auditEvent.findMany({
      where: {
        userId,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })
  },

  /**
   * Get events for a date range
   */
  async getEventsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ) {
    return prisma.auditEvent.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })
  },

  /**
   * Get events by type
   */
  async getEventsByType(userId: string, type: AuditEventType) {
    return prisma.auditEvent.findMany({
      where: {
        userId,
        type,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to recent 50
    })
  },
}
