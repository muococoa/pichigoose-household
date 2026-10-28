import { db } from './store'
import type { Item, List, PantryItem, Todo } from './hooks'
import { nextDue } from '../lib/time'

export function toggleItem(item: Item, me: string) {
  const now = new Date().toISOString()
  db.update('list_items', item.id, item.checked_at ? { checked_at: null, checked_by: null } : { checked_at: now, checked_by: me })
  // Bought something from the pantry? It's full again.
  if (!item.checked_at && item.pantry_item_id) db.update('pantry_items', item.pantry_item_id, { level: 100, updated_by: me, updated_at: now })
}

/**
 * Sets how full something in the pantry is. When it drops to its "low" mark, Pichi puts it on the
 * shopping list by herself (unless it's already there). Returns what she added, so the screen can
 * say so and offer Undo.
 */
export function setPantryLevel(p: PantryItem, level: number, me: string, lists: List[], items: Item[]) {
  const now = new Date().toISOString()
  db.update('pantry_items', p.id, { level, updated_by: me, updated_at: now })
  const crossed = level <= p.low_at && (p.level > p.low_at || (level === 0 && p.level > 0))
  if (!crossed) return null
  if (items.some((x) => x.pantry_item_id === p.id && !x.checked_at)) return null
  const sorted = [...lists].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
  const list = sorted.find((l) => l.id === p.list_id) ?? sorted[0]
  if (!list) return null
  const row = db.insert('list_items', {
    list_id: list.id,
    name: p.name,
    note: null,
    added_by: me,
    created_at: now,
    checked_at: null,
    checked_by: null,
    position: 0,
    pantry_item_id: p.id,
    added_by_pichi: true,
  })
  return { row, list }
}

/** Ticking a repeating to-do marks it done and creates the next one with the new due date. */
export function toggleTodo(todo: Todo, me: string) {
  if (todo.done_at) {
    db.update('todos', todo.id, { done_at: null, done_by: null })
    return
  }
  db.update('todos', todo.id, { done_at: new Date().toISOString(), done_by: me })
  if (todo.repeat) {
    db.insert('todos', {
      household_id: todo.household_id,
      title: todo.title,
      assignee_id: todo.assignee_id,
      repeat: todo.repeat,
      due_date: nextDue(todo.due_date, todo.repeat),
      created_by: me,
      created_at: new Date().toISOString(),
      done_at: null,
      done_by: null,
    })
  }
}

const DAY = 24 * 60 * 60 * 1000

/** Bought items stay visible for a day so people can undo, then disappear. */
export function recentlyBought(item: Item, now = Date.now()) {
  return Boolean(item.checked_at) && now - new Date(item.checked_at as string).getTime() < DAY
}

/** Done to-dos stay visible for a day too. */
export function recentlyDone(todo: Todo, now = Date.now()) {
  return Boolean(todo.done_at) && now - new Date(todo.done_at as string).getTime() < DAY
}

export function byPositionThenAge(a: Item, b: Item) {
  return a.position - b.position || a.created_at.localeCompare(b.created_at)
}
