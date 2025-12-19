/**
 * Event Types for Microtask System
 * These extend the AuditEvent system to track scroll impulses and microtask choices
 */

export type MicrotaskEventType = 'scroll_intent' | 'microtask_selected'

export type MicrotaskSource = 'bottom_nav' | 'mobile_button'

export type MicrotaskChoice =
  | 'block_15'
  | 'block_30'
  | 'urge_scroll'
  | 'phone_log'
  | 'tasks'
  | 'build'

export interface ScrollIntentPayload {
  type: 'scroll_intent'
  source: MicrotaskSource
  page: string
}

export interface MicrotaskSelectedPayload {
  type: 'microtask_selected'
  choice: MicrotaskChoice
  source: MicrotaskSource
  page: string
}

export type MicrotaskEventPayload = ScrollIntentPayload | MicrotaskSelectedPayload
