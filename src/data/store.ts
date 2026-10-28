// A small local-first store.
//
// Every list the app shows (a collection) is kept on the phone, so screens open instantly and
// work without signal. Changes are applied on the phone right away and queued in an outbox.
// The outbox is sent to Supabase in order as soon as there is a connection.
// Live updates from other people arrive through Supabase Realtime.

import { useEffect, useSyncExternalStore } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type Row = { id: string; [column: string]: unknown }
type Match = Record<string, string>

type NewOp =
  | { kind: 'insert'; table: string; row: Row }
  | { kind: 'update'; table: string; match: Match; patch: Record<string, unknown> }
  | { kind: 'delete'; table: string; match: Match }
type Op = NewOp & { seq: number }

type Result = { data: unknown[] | null; error: unknown }

export type CollectionDef = {
  /** Unique name for this collection, like "items:<list id>". */
  key: string
  table: string
  /** Does a row of this table belong in this collection? */
  belongs: (row: Row) => boolean
  /** The server query. */
  load: () => PromiseLike<Result>
  /** Realtime filter, like "list_id=eq.<id>". Leave out to hear the whole table (RLS still applies). */
  realtime?: string
}

// Tables without a single id column get one made from their key columns.
const syntheticId: Record<string, (row: Record<string, unknown>) => string> = {
  household_members: (r) => `${r.household_id}:${r.user_id}`,
  chat_reads: (r) => `${r.household_id}:${r.chat}`,
}

function withId(table: string, row: Record<string, unknown>): Row {
  const make = syntheticId[table]
  return (make ? { ...row, id: make(row) } : row) as Row
}

function toServer(table: string, row: Record<string, unknown>) {
  if (!syntheticId[table]) return row
  const { id: _id, ...rest } = row
  return rest
}

function matches(row: Row, match: Match) {
  return Object.entries(match).every(([k, v]) => row[k] === v)
}

// ---------------------------------------------------------------------------
// State, saved on the phone
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'pichigoose.store.v1'

type Saved = { cache: Record<string, Row[]>; outbox: Op[]; seq: number }

function readSaved(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Saved
  } catch {
    // Private mode or broken data: start empty.
  }
  return { cache: {}, outbox: [], seq: 0 }
}

let state = readSaved()
const defs = new Map<string, CollectionDef>()
const listeners = new Set<() => void>()
const tableVersion: Record<string, number> = {}

let saveTimer: number | undefined
function save() {
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage full or blocked. The app still works for this visit.
    }
  }, 50)
}

function notify() {
  save()
  listeners.forEach((l) => l())
}

function setRows(key: string, rows: Row[]) {
  state = { ...state, cache: { ...state.cache, [key]: rows } }
}

// ---------------------------------------------------------------------------
// Applying changes
// ---------------------------------------------------------------------------

function applyOp(rows: Row[], op: Op, def: CollectionDef): Row[] {
  if (op.kind === 'insert') {
    const row = withId(op.table, op.row)
    const rest = rows.filter((r) => r.id !== row.id)
    return def.belongs(row) ? [...rest, row] : rest
  }
  if (op.kind === 'update') {
    const out: Row[] = []
    for (const r of rows) {
      if (!matches(r, op.match)) out.push(r)
      else {
        const next = { ...r, ...op.patch } as Row
        if (def.belongs(next)) out.push(next)
      }
    }
    return out
  }
  return rows.filter((r) => !matches(r, op.match))
}

function pendingFor(table: string) {
  return state.outbox.filter((op) => op.table === table)
}

function eachLoaded(table: string, fn: (def: CollectionDef, rows: Row[]) => Row[]) {
  for (const def of defs.values()) {
    if (def.table !== table) continue
    const rows = state.cache[def.key]
    if (rows) setRows(def.key, fn(def, rows))
  }
}

function mutate(op: NewOp) {
  const full = { ...op, seq: ++state.seq } as Op
  state = { ...state, outbox: [...state.outbox, full] }
  tableVersion[op.table] = (tableVersion[op.table] ?? 0) + 1
  eachLoaded(op.table, (def, rows) => applyOp(rows, full, def))
  notify()
  void flush()
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export const db = {
  insert(table: string, row: Record<string, unknown>) {
    const full = withId(table, { id: newId(), ...row })
    mutate({ kind: 'insert', table, row: full })
    return full
  },
  update(table: string, match: Match | string, patch: Record<string, unknown>) {
    mutate({ kind: 'update', table, match: typeof match === 'string' ? { id: match } : match, patch })
  },
  remove(table: string, match: Match | string) {
    mutate({ kind: 'delete', table, match: typeof match === 'string' ? { id: match } : match })
  },
}

// ---------------------------------------------------------------------------
// Sending the outbox
// ---------------------------------------------------------------------------

type Sent = 'ok' | 'retry' | 'failed'

function isNetworkError(error: unknown, status?: number) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  if (status === 0) return true
  const e = error as { message?: string; code?: string } | null
  const msg = e?.message ?? ''
  return /fetch|network|load failed|timeout/i.test(msg) && !e?.code
}

async function send(op: Op): Promise<Sent> {
  const q = supabase.from(op.table)
  const res =
    op.kind === 'insert'
      ? await q.upsert(toServer(op.table, op.row), { onConflict: syntheticId[op.table] ? undefined : 'id' })
      : op.kind === 'update'
        ? await q.update(op.patch).match(op.match)
        : await q.delete().match(op.match)
  if (!res.error) return 'ok'
  if (isNetworkError(res.error, res.status) || res.status === 401) return 'retry'
  console.warn('Pichigoose: a change was refused by the server', op, res.error)
  return 'failed'
}

let flushing = false
let ready = false

export async function flush() {
  if (flushing || !ready) return
  flushing = true
  try {
    while (state.outbox.length) {
      const op = state.outbox[0]
      const result = await send(op)
      if (result === 'retry') break
      state = { ...state, outbox: state.outbox.slice(1) }
      if (result === 'failed') {
        refetchTable(op.table)
      }
      notify()
    }
  } finally {
    flushing = false
  }
}

export function useOutboxCount() {
  return useSyncExternalStore(subscribe, () => state.outbox.length)
}

// ---------------------------------------------------------------------------
// Loading from the server
// ---------------------------------------------------------------------------

const inFlight = new Set<string>()

export async function refetch(def: CollectionDef, attempt = 0): Promise<void> {
  if (!ready || inFlight.has(def.key)) return
  if (typeof navigator !== 'undefined' && !navigator.onLine) return
  inFlight.add(def.key)
  const versionBefore = tableVersion[def.table] ?? 0
  try {
    const { data, error } = await def.load()
    if (error || !data) return
    // A local change happened while loading: load again so it isn't lost.
    if ((tableVersion[def.table] ?? 0) !== versionBefore && attempt < 2) {
      inFlight.delete(def.key)
      return refetch(def, attempt + 1)
    }
    let rows = (data as Record<string, unknown>[]).map((r) => withId(def.table, r))
    for (const op of pendingFor(def.table)) rows = applyOp(rows, op, def)
    setRows(def.key, rows)
    notify()
  } finally {
    inFlight.delete(def.key)
  }
}

export function refetchTable(table: string) {
  for (const def of defs.values()) if (def.table === table) void refetch(def)
}

export function refetchAll(): Promise<void> {
  return Promise.all([...defs.values()].map((def) => refetch(def))).then(() => undefined)
}

// ---------------------------------------------------------------------------
// Live updates
// ---------------------------------------------------------------------------

const channels = new Map<string, { channel: RealtimeChannel; users: number }>()

type Change = { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: Record<string, unknown>; old: Record<string, unknown> }

function onChange(table: string, change: Change) {
  if (change.eventType === 'DELETE') {
    const gone = change.old
    const id = syntheticId[table] ? syntheticId[table](gone) : (gone.id as string)
    eachLoaded(table, (_def, rows) => rows.filter((r) => r.id !== id))
  } else {
    const row = withId(table, change.new)
    eachLoaded(table, (def, rows) => {
      let next = rows.filter((r) => r.id !== row.id)
      if (def.belongs(row)) next.push(row)
      // Our own changes that haven't reached the server yet still win.
      for (const op of pendingFor(table)) next = applyOp(next, op, def)
      return next
    })
  }
  notify()
}

function listen(def: CollectionDef) {
  const existing = channels.get(def.key)
  if (existing) {
    existing.users++
    return
  }
  let first = true
  const channel = supabase
    .channel(`live:${def.key}`)
    .on(
      'postgres_changes' as never,
      { event: '*', schema: 'public', table: def.table, ...(def.realtime ? { filter: def.realtime } : {}) },
      (payload: Change) => onChange(def.table, payload),
    )
    .subscribe((status: string) => {
      // After a reconnect, load again to catch anything missed while away.
      if (status === 'SUBSCRIBED') {
        if (!first) void refetch(def)
        first = false
      }
    })
  channels.set(def.key, { channel, users: 1 })
}

function unlisten(key: string) {
  const entry = channels.get(key)
  if (!entry) return
  entry.users--
  if (entry.users <= 0) {
    void supabase.removeChannel(entry.channel)
    channels.delete(key)
  }
}

// ---------------------------------------------------------------------------
// React
// ---------------------------------------------------------------------------

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const EMPTY: Row[] = []

export function useCollection<T extends Row = Row>(def: CollectionDef | null): { rows: T[]; loaded: boolean } {
  if (def) defs.set(def.key, def)
  const rows = useSyncExternalStore(subscribe, () => (def ? state.cache[def.key] : undefined))
  const key = def?.key
  useEffect(() => {
    if (!def) return
    void refetch(def)
    listen(def)
    return () => unlisten(def.key)
    // The key says everything about the query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return { rows: (rows ?? EMPTY) as T[], loaded: rows !== undefined }
}

/** Called once the person is signed in (or signed out). */
export function setReady(isReady: boolean) {
  ready = isReady
  if (isReady) {
    refetchAll()
    void flush()
  }
}

/** Forget everything on this phone, for signing out. */
export function clearStore() {
  for (const key of [...channels.keys()]) {
    const entry = channels.get(key)
    if (entry) void supabase.removeChannel(entry.channel)
    channels.delete(key)
  }
  state = { cache: {}, outbox: [], seq: 0 }
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  listeners.forEach((l) => l())
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void flush()
    refetchAll()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void flush()
      refetchAll()
    }
  })
  window.setInterval(() => {
    if (state.outbox.length) void flush()
  }, 15000)
}
