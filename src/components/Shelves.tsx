import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { PantryItem } from '../data/hooks'
import { ContainerDrawing, Shelf } from './Containers'
import { InkCircle } from './Icons'

/*
 * Things on the shelves, grouped (Nora): three bottles of wine are one group, whatever capitals the
 * name was typed with. A group stands close together, like a run of messages in a chat; different
 * things stand a little further apart.
 */

export type Group = { key: string; name: string; rows: PantryItem[] }

/** "Vino", "vino" and "VINO " in the same storage spot are the same thing. */
export const groupKey = (p: Pick<PantryItem, 'place' | 'name'> & { spot_id?: string | null }) => `${p.spot_id ?? p.place}:${p.name.trim().toLocaleLowerCase()}`

/** The things in shelf order, each group together (oldest bottle first). */
export function groupThings(rows: PantryItem[]): Group[] {
  const sorted = [...rows].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
  const groups = new Map<string, Group>()
  for (const r of sorted) {
    const key = groupKey(r)
    const g = groups.get(key)
    if (g) g.rows.push(r)
    else groups.set(key, { key, name: r.name.trim(), rows: [r] })
  }
  return [...groups.values()]
}

/** A group is running low when only one is left and it's almost out. Pichi goes by this too. */
export const groupLow = (rows: PantryItem[]) => rows.length === 1 && rows[0].level <= rows[0].low_at

const drawingWidth = (height: number) => (height * 64) / 84
/** Each extra one in a group stands this far along, a little in front of the one before. */
const step = (height: number) => drawingWidth(height) * 0.6
export const LABEL_MIN = 66
const GAP = 8

/** Roughly how wide the handwritten label is, so names like "Omekšivač" fit instead of being cut. */
const labelWidth = (name: string, compact?: boolean) => Math.min(compact ? 104 : 124, Math.round(name.length * (compact ? 7.6 : 8.6) + 18))

export function groupWidth(g: Group, height: number, compact?: boolean) {
  return Math.max(LABEL_MIN, labelWidth(g.name, compact), drawingWidth(height) + step(height) * (g.rows.length - 1))
}

/** Fills each shelf left to right with as many things as fit. */
export function packShelves(groups: Group[], width: number, height: number, compact?: boolean) {
  const rows: Group[][] = []
  let row: Group[] = []
  let used = 0
  for (const g of groups) {
    const w = groupWidth(g, height, compact)
    if (row.length && used + GAP + w > width) {
      rows.push(row)
      row = []
      used = 0
    }
    used += (row.length ? GAP : 0) + w
    row.push(g)
  }
  if (row.length) rows.push(row)
  return rows
}

/** The width of the box the shelves sit in. */
export function useShelfWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(300)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // The room inside the padding, which is where the shelves go.
    const inner = () => {
      const cs = getComputedStyle(el)
      return el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    }
    const watch = new ResizeObserver(() => setWidth(inner()))
    watch.observe(el)
    setWidth(inner())
    return () => watch.disconnect()
  }, [])
  return { ref, width }
}

/** The bottles of one group, standing close together. */
export function GroupDrawing({ g, height, selected }: { g: Group; height: number; selected?: string | null }) {
  const w = drawingWidth(height)
  return (
    <span className="thing" style={{ position: 'relative', display: 'block', flex: 'none', height, width: w + step(height) * (g.rows.length - 1) }}>
      {g.rows.map((r, i) => (
        <span key={r.id} style={{ position: 'absolute', left: i * step(height), bottom: 0, zIndex: i }}>
          <ContainerDrawing kind={r.container} level={r.level} lowAt={r.low_at} height={height} />
          {selected === r.id && <InkCircle key={r.id} className="pick-ring" />}
        </span>
      ))}
    </span>
  )
}

/** One group on the shelf: its bottles, the paper label, and how full it is (or how many). */
export function ShelfGroup({ g, height, onOpen, compact, children }: { g: Group; height: number; onOpen?: () => void; compact?: boolean; children?: ReactNode }) {
  const { t } = useTranslation()
  const low = groupLow(g.rows)
  const many = g.rows.length > 1
  const first = g.rows[0]
  const tilt = (g.key.charCodeAt(g.key.length - 1) % 5) - 2
  const body = (
    <>
      <GroupDrawing g={g} height={height} />
      <span className={`shelf-label${low ? ' low' : ''}`} style={{ transform: `rotate(${tilt}deg)`, ...(compact ? { fontSize: 17, lineHeight: '19px', marginTop: 14 } : {}) }}>
        {g.name}
      </span>
      {!compact && (
        <span className={`shelf-pct${low ? ' low' : ''}`}>
          {many ? t('pantry.count', { count: g.rows.length }) : low ? t('pantry.almostOut') : t('pantry.percent', { n: first.level })}
        </span>
      )}
      {children}
    </>
  )
  const label = many ? `${g.name}, ${t('pantry.count', { count: g.rows.length })}` : `${g.name}, ${t('pantry.percent', { n: first.level })}`
  return (
    <button type="button" className="shelf-thing" style={{ width: groupWidth(g, height, compact) }} onClick={onOpen} aria-label={label}>
      {body}
    </button>
  )
}

/** Shelves full of groups: as many per shelf as fit the width. */
export function ShelfRows({ groups, width, height, onOpen, maxRows, compact }: { groups: Group[]; width: number; height: number; onOpen: (g: Group) => void; maxRows?: number; compact?: boolean }) {
  // After drawing, check that nothing sticks out past the shelf (Safari can lay things out a little
  // wider than planned). If something does, plan again with that much less room, so it moves down.
  const box = useRef<HTMLDivElement>(null)
  const [less, setLess] = useState(0)
  const key = `${width}|${height}|${groups.map((g) => `${g.key}:${g.rows.length}`).join(',')}`
  const lastKey = useRef(key)
  if (lastKey.current !== key) {
    lastKey.current = key
    if (less) setLess(0)
  }
  const rows = packShelves(groups, width - less, height, compact).slice(0, maxRows)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const check = () => {
      let over = 0
      el.querySelectorAll<HTMLElement>('.shelf-row').forEach((row) => {
        over = Math.max(over, row.scrollWidth - row.clientWidth)
      })
      if (over > 0) setLess((l) => (l < width ? l + over + 1 : l))
    }
    check()
    // Check again whenever something on the shelf changes size (a font finishing loading, say).
    const watch = new ResizeObserver(check)
    el.querySelectorAll('.shelf-thing').forEach((t) => watch.observe(t, { box: 'border-box' }))
    return () => watch.disconnect()
  })
  return (
    <div ref={box}>
      {rows.map((row, i) => (
        <Shelf key={i} height={height}>
          {row.map((g) => (
            <ShelfGroup key={g.key} g={g} height={height} onOpen={() => onOpen(g)} compact={compact} />
          ))}
        </Shelf>
      ))}
    </div>
  )
}
