import { useId, type ReactNode } from 'react'
import type { Container, Place } from '../data/hooks'

/*
 * The things on the pantry shelves, drawn in ink: jars, bottles, boxes, bags and so on.
 * PLACEHOLDERS until Nora draws her own. Each one has an outline (the ink) and an inside
 * (where the gel pen scribble fills it up to how full it is).
 * All drawn on the same 64 x 84 grid, standing on the bottom edge.
 */

type Shape = {
  /** The ink lines. */
  ink: string
  /** Thinner details: a lid line, a crimp, a ridge. */
  detail?: string
  /** The inside, filled up to the level. */
  inside: string
  /** Where the inside starts and ends, top to bottom. */
  top: number
  bottom: number
}

const SHAPES: Record<Container, Shape> = {
  jar: {
    ink: 'M17 8H47Q50 8 50 11V17Q50 19 48 19H16Q14 19 14 17V11Q14 8 17 8ZM15 19Q10 22 10 30V74Q10 80 16 80H48Q54 80 54 74V30Q54 22 49 19',
    detail: 'M18 13.5H46',
    inside: 'M15 20Q11 23 11 30V74Q11 79 16 79H48Q53 79 53 74V30Q53 23 49 20Z',
    top: 20,
    bottom: 79,
  },
  bottle: {
    ink: 'M27 4H37V13H27ZM28 13V22C28 27 16 29 16 39V75Q16 80 21 80H43Q48 80 48 75V39C48 29 36 27 36 22V13',
    detail: 'M27 8.5H37',
    inside: 'M29 14V22C29 28 17 30 17 39V75Q17 79 21 79H43Q47 79 47 75V39C47 30 35 28 35 22V14Z',
    top: 14,
    bottom: 79,
  },
  box: {
    ink: 'M13 14H51V80H13ZM13 14L18 8H46L51 14',
    detail: 'M18 8L21 14M46 8L43 14',
    inside: 'M14 15H50V79H14Z',
    top: 15,
    bottom: 79,
  },
  bag: {
    ink: 'M15 16L12 74Q12 80 18 80H46Q52 80 52 74L49 16M14 16H50L48 9L44 13L40 9L36 13L32 9L28 13L24 9L20 13L16 9Z',
    detail: 'M15 22H49',
    inside: 'M16 17H48L51 74Q51 79 46 79H18Q13 79 13 74Z',
    top: 17,
    bottom: 79,
  },
  can: {
    ink: 'M16 30V76Q16 80 32 80Q48 80 48 76V30M16 30Q16 25 32 25Q48 25 48 30Q48 35 32 35Q16 35 16 30Z',
    detail: 'M16 44Q32 48 48 44M16 66Q32 70 48 66',
    inside: 'M17 31Q17 35 32 35Q47 35 47 31V76Q47 79 32 79Q17 79 17 76Z',
    top: 31,
    bottom: 79,
  },
  carton: {
    ink: 'M14 32L22 16H42L50 32V80H14ZM14 32H50M22 16V10H42V16',
    detail: 'M37 24A3 3 0 1 0 43 24A3 3 0 1 0 37 24',
    inside: 'M15 33H49V79H15Z',
    top: 33,
    bottom: 79,
  },
  tube: {
    ink: 'M16 8H48L41 66H23ZM25 66H39V78Q39 80 37 80H27Q25 80 25 78Z',
    detail: 'M17 13H47M18 17H46',
    inside: 'M18 18H46L40 65H24Z',
    top: 18,
    bottom: 65,
  },
  pump: {
    ink: 'M22 14H40V20H22ZM22 16H12V19M29 20V30M35 20V30M24 30H40V36H24ZM24 36Q14 38 14 48V74Q14 80 20 80H44Q50 80 50 74V48Q50 38 40 36',
    inside: 'M24 37Q15 39 15 48V74Q15 79 20 79H44Q49 79 49 74V48Q49 39 40 37Z',
    top: 37,
    bottom: 79,
  },
  spray: {
    ink: 'M18 12H38Q42 12 42 16V24H24L18 20ZM28 24H38V32H28ZM28 32Q16 36 16 48V75Q16 80 21 80H43Q48 80 48 75V48Q48 36 38 32',
    detail: 'M25 24Q22 29 25 33',
    inside: 'M28 33Q17 37 17 48V75Q17 79 21 79H43Q47 79 47 75V48Q47 37 38 33Z',
    top: 33,
    bottom: 79,
  },
}

export const CONTAINERS = Object.keys(SHAPES) as Container[]

/** What makes sense where (Nora): no pumps, sprays or tubes in the kitchen; no jars, cans or cartons in the bathroom. */
export const CONTAINERS_FOR: Record<Place, Container[]> = {
  pantry: ['jar', 'bottle', 'box', 'bag', 'can', 'carton'],
  bathroom: ['bottle', 'box', 'bag', 'tube', 'pump', 'spray'],
}

/** The gel pen color for how full something is: green when there's plenty, orange when it's going,
 *  the theme color when it's running low. */
export function gelColor(level: number, lowAt: number) {
  if (level <= lowAt) return 'var(--hero)'
  if (level <= 50) return '#F2A03D'
  return '#6E9152'
}

/** Where the inside of a container starts and ends, as a share of its height (for dragging the level). */
export function insideSpan(kind: Container) {
  const s = SHAPES[kind]
  return { top: s.top / 84, bottom: s.bottom / 84 }
}

/** A guess at what something looks like from its name, so most things need no picking. */
const GUESSES: [RegExp, Container][] = [
  [/toothpaste|pasta za zube|tube|tuba|cream|krema|ointment/i, 'tube'],
  [/oil|ulje|vinegar|sirće|sirce|sauce|sos|syrup|sirup|wine|vino|juice|sok/i, 'bottle'],
  [/rice|pirinač|pirinac|flour|brašno|brasno|sugar|šećer|secer|pasta|testenin|lentil|sočivo|beans dry|chips|čips/i, 'bag'],
  [/oat|ovsen|cereal|žitaric|zitaric|muesli|musli|cracker|kreker|tea|čaj|caj|tissue|maramic/i, 'box'],
  [/bean|pasulj|tomato|paradajz|tuna|corn|kukuruz|chickpea|leblebij|can|konzerv/i, 'can'],
  [/milk|mleko|mlijeko|pavlaka|yogurt|jogurt/i, 'carton'],
  [/shampoo|šampon|sampon|soap|sapun|lotion|losion|conditioner|regenerator|gel|serum/i, 'pump'],
  [/clean|čist|cist|spray|sprej|windex|bleach|varikin|detergent|deterdžent|deterdzent/i, 'spray'],
  [/honey|med|jam|džem|dzem|coffee|kafa|salt|so\b|spice|začin|zacin|nutella|peanut/i, 'jar'],
]

export function guessContainer(name: string): Container | null {
  for (const [re, kind] of GUESSES) if (re.test(name)) return kind
  return null
}

/** One container, drawn in ink, filled with gel pen scribble up to `level` percent. */
export function ContainerDrawing({ kind, level, lowAt, height = 76, title }: { kind: Container; level: number; lowAt: number; height?: number; title?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const s = SHAPES[kind] ?? SHAPES.jar
  const color = gelColor(level, lowAt)
  const y = s.bottom - ((s.bottom - s.top) * Math.max(0, Math.min(100, level))) / 100
  // The ink gets a touch thicker on small drawings so it reads like the 2 px lines everywhere else.
  const ink = height < 60 ? 2.8 : height > 140 ? 1.7 : 2.2
  return (
    <svg viewBox="0 0 64 84" width={(height * 64) / 84} height={height} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <clipPath id={`in-${id}`}>
          <path d={s.inside} />
        </clipPath>
        {/* Gel pen going back and forth, a little slanted, like coloring something in by hand. */}
        <pattern id={`gel-${id}`} width="64" height="4.6" patternUnits="userSpaceOnUse" patternTransform="rotate(-9)">
          <path d="M-4 3.6L2 .8L8 3.6L14 .8L20 3.6L26 .8L32 3.6L38 .8L44 3.6L50 .8L56 3.6L62 .8L68 3.6" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity=".82" />
        </pattern>
      </defs>
      {level > 0 && (
        <g clipPath={`url(#in-${id})`}>
          <rect x="0" y={y} width="64" height={84 - y} fill={`url(#gel-${id})`} />
          {/* The top of what's left, drawn a little wobbly. */}
          <path d={`M4 ${y + 0.8}Q18 ${y - 0.8} 32 ${y + 0.6}T60 ${y + 0.2}`} fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      )}
      {/* A little shine on the glass. */}
      <path d={`M${kind === 'can' || kind === 'box' || kind === 'carton' || kind === 'tube' ? 19 : 20} ${s.top + 8}Q19 ${s.top + 15} 20 ${s.top + 22}`} fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" opacity=".75" />
      {s.detail && <path d={s.detail} fill="none" stroke="#2E2638" strokeWidth={ink * 0.7} strokeLinecap="round" strokeLinejoin="round" />}
      <path d={s.ink} fill="none" stroke="#2E2638" strokeWidth={ink} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** A drawn shelf: a row of things standing on a board, each with a little paper label under it.
 *  `height` is how tall the things stand, so the board sits right under them. */
export function Shelf({ columns, height, children }: { columns: number; height: number; children: ReactNode }) {
  return (
    <div className="shelf" style={{ ['--thing' as string]: `${height}px` }}>
      {/* The board, drawn with a pen: a wobbly top edge, a thinner bottom edge and two brackets. */}
      <svg className="shelf-board" viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden>
        <path d="M2 3.5Q60 2 120 3.6T240 3T298 3.8" fill="none" stroke="#2E2638" strokeWidth="2.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d="M4 9.5Q80 10.4 150 9.6T296 9.8" fill="none" stroke="#2E2638" strokeWidth="1.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d="M2 3.5V9.5M298 3.8V9.8" fill="none" stroke="#2E2638" strokeWidth="1.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="shelf-row" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {children}
      </div>
    </div>
  )
}
