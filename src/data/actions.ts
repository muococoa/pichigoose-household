import { db } from './store'
import type { Item, Todo } from './hooks'
import { nextDue } from '../lib/time'

export function toggleItem(item: Item, me: string) {
  db.update('list_items', item.id, item.checked_at ? { checked_at: null, checked_by: null } : { checked_at: new Date().toISOString(), checked_by: me })
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
