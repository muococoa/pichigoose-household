// "Haven't we done this before?" (Nora, 30 Oct): before adding a to-do, Pichi looks for one that reads the same,
// ignoring capitals, Serbian letters (č, ć, š, ž, đ) and a small typo, so the list doesn't fill up with copies.

import type { Todo } from '../data/hooks'

/** "Oprati  Sudove!" and "oprati sudove" become the same text. */
export function plain(text: string) {
  return text
    .toLocaleLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** How many letters you'd change to turn one into the other. */
function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const was = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = was
    }
  }
  return row[b.length]
}

/** The same to-do, near enough: one slip for short titles, a few more for long ones. */
export function sameThing(a: string, b: string) {
  const x = plain(a)
  const y = plain(b)
  if (!x || !y) return false
  if (x === y) return true
  return distance(x, y) <= Math.max(1, Math.floor(Math.min(x.length, y.length) * 0.15))
}

export type Similar = { open: Todo | null; done: Todo[] }

/**
 * What already matches a new title: an open one on the list (then it's simply already there), or up to three done
 * ones, newest first, to bring back. Project steps belong to their project, so they're left out.
 */
export function findSimilar(title: string, todos: Todo[]): Similar | null {
  const same = todos.filter((x) => !x.project_id && sameThing(x.title, title))
  if (!same.length) return null
  const open = same.find((x) => !x.done_at) ?? null
  // One per day: the same chore done twice on Sunday shows once.
  const days = new Set<string>()
  const done = same
    .filter((x) => x.done_at)
    .sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? ''))
    .filter((x) => {
      const day = new Date(x.done_at as string).toDateString()
      if (days.has(day)) return false
      days.add(day)
      return true
    })
    .slice(0, 3)
  return open || done.length ? { open, done } : null
}
