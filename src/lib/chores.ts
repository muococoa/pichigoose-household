// Trophies (Danko and Nora, 29 Oct; see PRODUCT.md "Trophies, recaps and rewards"). Pichi guesses what kind of chore
// a to-do is from its title, in English and Serbian, so nobody has to pick a type. Each month, whoever did the most
// of a chore gets its trophy. Grocery runs count the days someone bought things from the shopping list.
// Nothing new is stored: everything is counted from what the to-dos and lists already remember.

import type { Item, Todo } from '../data/hooks'

export const CHORES = ['dishes', 'laundry', 'hanging-laundry', 'ironing', 'groceries', 'trash', 'cleaning', 'cooking', 'plants'] as const
export type Chore = (typeof CHORES)[number]

// Words Pichi listens for. Checked in this order, so "hang the laundry" is hanging laundry, not laundry.
// Serbian words are cut to their stem so every ending matches ("sudove", "sudova", "sudovi").
const WORDS: [Chore, string[]][] = [
  ['hanging-laundry', [' hang', 'pegs', 'clothesline', 'okači', 'okaci', 'kači', 'kaci', 'prostr', 'štipal', 'stipal']],
  ['ironing', ['iron', 'pegla', 'pegl']],
  ['dishes', ['dish', 'plates', 'sudov', 'sudo', 'sudopera', 'sudomaš', 'sudomas']],
  ['laundry', ['laundry', 'washing machine', 'wash clothes', 'veš', ' ves ', 'mašin', 'masin']],
  ['trash', ['trash', 'garbage', 'rubbish', ' bin', 'đubr', 'djubr', 'smeć', 'smec', 'kant']],
  ['cooking', ['cook', 'dinner', 'lunch', 'breakfast', 'bake', 'kuva', 'ručak', 'rucak', 'večer', 'vecer', 'doruč', 'doruc', ' peč', ' pec', 'ispeč', 'ispec']],
  ['plants', ['plant', 'water the', 'flower', 'biljk', 'cveć', 'cvec', 'zali']],
  ['cleaning', ['clean', 'vacuum', 'mop', 'dust', 'sweep', 'tidy', 'bathroom', ' čist', ' cist', 'očist', 'ocist', 'počist', 'pocist', 'usisa', 'brisa', 'bris', 'pras', 'kupatil']],
  ['groceries', ['grocer', 'shopping', 'supermarket', 'market', 'prodavnic', 'kupovin', 'namirnic', 'pijac']],
]

export function guessChore(title: string): Chore | null {
  const t = ` ${title.toLocaleLowerCase()} `
  for (const [chore, words] of WORDS) if (words.some((w) => t.includes(w))) return chore
  return null
}

export type Month = string // "2026-10"
export const monthOf = (iso: string) => iso.slice(0, 7)

/** How many of each chore each person did in a month: { dishes: { [personId]: 12 }, ... }. */
export function tally(todos: Todo[], items: Item[], month: Month) {
  const out: Partial<Record<Chore, Record<string, number>>> = {}
  const add = (chore: Chore, who: string) => {
    const row = (out[chore] ??= {})
    row[who] = (row[who] ?? 0) + 1
  }
  for (const x of todos) {
    if (!x.done_at || !x.done_by || monthOf(x.done_at) !== month) continue
    const chore = guessChore(x.title)
    if (chore) add(chore, x.done_by)
  }
  // Grocery runs: one per person per day they bought something.
  const runs = new Set<string>()
  for (const x of items) {
    if (!x.checked_at || !x.checked_by || monthOf(x.checked_at) !== month) continue
    runs.add(`${x.checked_by}|${x.checked_at.slice(0, 10)}`)
  }
  for (const r of runs) add('groceries', r.split('|')[0])
  return out
}

export type Win = { chore: Chore; month: Month; winner: string; count: number; counts: Record<string, number> }

/** The month's trophies: one per chore, to whoever did the most. A tie goes to nobody (shown as shared). */
export function trophies(todos: Todo[], items: Item[], month: Month): Win[] {
  const t = tally(todos, items, month)
  const wins: Win[] = []
  for (const chore of CHORES) {
    const counts = t[chore]
    if (!counts) continue
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1])
    if (!ranked.length) continue
    wins.push({ chore, month, winner: ranked[0][0], count: ranked[0][1], counts })
  }
  return wins
}

/** Every month that has anything done in it, newest first. */
export function monthsWithActivity(todos: Todo[], items: Item[]): Month[] {
  const set = new Set<Month>()
  for (const x of todos) if (x.done_at) set.add(monthOf(x.done_at))
  for (const x of items) if (x.checked_at) set.add(monthOf(x.checked_at))
  return [...set].sort().reverse()
}

/** Months in a row (ending with `month`) that `person` won `chore`. Three or more is a big trophy. */
export function streakOf(todos: Todo[], items: Item[], chore: Chore, person: string, month: Month) {
  let n = 0
  let [y, m] = month.split('-').map(Number)
  for (;;) {
    const key = `${y}-${String(m).padStart(2, '0')}`
    const win = trophies(todos, items, key).find((w) => w.chore === chore)
    if (win?.winner !== person) break
    n += 1
    m -= 1
    if (m === 0) {
      m = 12
      y -= 1
    }
  }
  return n
}
