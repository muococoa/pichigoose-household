import type { CSSProperties } from 'react'
import type { Chore } from '../lib/chores'
import gold from '../../assets/badges/medal-gold.webp'
import rosette from '../../assets/badges/rosette.webp'
import dishes from '../../assets/badges/dishes.webp'
import laundry from '../../assets/badges/laundry.webp'
import hanging from '../../assets/badges/hanging-laundry.webp'
import ironing from '../../assets/badges/ironing.webp'
import groceries from '../../assets/badges/groceries.webp'
import trash from '../../assets/badges/trash.webp'
import cleaning from '../../assets/badges/cleaning.webp'
import cooking from '../../assets/badges/cooking.webp'
import plants from '../../assets/badges/plants.webp'

// Nora's badge drawings (29 Oct): the chore's emblem sits in the middle of a frame, so 9 emblems and a few frames
// make every trophy. The frames' empty middles were measured off the drawings.
export const EMBLEM: Record<Chore, string> = {
  dishes,
  laundry,
  'hanging-laundry': hanging,
  ironing,
  groceries,
  trash,
  cleaning,
  cooking,
  plants,
}

const FRAMES = {
  // The monthly trophy: the gold medal with its pink bow.
  month: { src: gold, x: 50, y: 57.8, hole: 40, emblem: 46 },
  // Three months in a row: the rosette.
  big: { src: rosette, x: 50.2, y: 34.8, hole: 28, emblem: 33 },
}

/** A trophy: the chore's emblem in its frame. `big` is the rosette for winning three months in a row. */
export function Trophy({ chore, size = 96, big, style }: { chore: Chore; size?: number; big?: boolean; style?: CSSProperties }) {
  const f = big ? FRAMES.big : FRAMES.month
  return (
    <span aria-hidden style={{ position: 'relative', display: 'inline-block', width: size, height: size, flex: 'none', ...style }}>
      <span style={{ position: 'absolute', left: `${f.x}%`, top: `${f.y}%`, width: `${f.hole}%`, height: `${f.hole}%`, translate: '-50% -50%', borderRadius: '50%', background: '#FFFDF8' }} />
      <img src={f.src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <img src={EMBLEM[chore]} alt="" style={{ position: 'absolute', left: `${f.x}%`, top: `${f.y}%`, width: `${f.emblem}%`, translate: '-50% -50%' }} />
    </span>
  )
}
