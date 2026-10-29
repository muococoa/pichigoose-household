import { useId, type ReactNode } from 'react'
import type { Container, Place, RoomKind } from '../data/hooks'

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
  // A serum bottle with a rubber dropper.
  dropper: {
    ink: 'M29 22Q32 17 35 22V34H29ZM25 34H39V44H25ZM26 44Q19 47 19 54V76Q19 80 23 80H41Q45 80 45 76V54Q45 47 38 44',
    detail: 'M32 44V68',
    inside: 'M26 45Q20 48 20 54V76Q20 79 23 79H41Q44 79 44 76V54Q44 48 38 45Z',
    top: 45,
    bottom: 79,
  },
  // A chunky detergent or fabric softener bottle, with a handle and a cap.
  jug: {
    ink: 'M37 6H47V15H37ZM37 15H47V20Q52 24 52 32V76Q52 80 48 80H16Q12 80 12 76V34Q12 22 22 18L37 15',
    detail: 'M19 30Q19 25 25 24H31V38H23Q19 38 19 34Z',
    inside: 'M13 34Q13 23 22 19L38 16H46V21Q51 25 51 32V76Q51 79 48 79H16Q13 79 13 76Z',
    top: 19,
    bottom: 79,
  },
  // A small, fat jar of moisturizer with a lid, rounded at the bottom.
  creamjar: {
    ink: 'M13 46H51Q54 46 54 49V57H10V49Q10 46 13 46ZM11 57H53V71Q53 80 43 80H21Q11 80 11 71Z',
    detail: 'M12 51.5H52',
    inside: 'M12 58H52V71Q52 79 43 79H21Q12 79 12 71Z',
    top: 58,
    bottom: 79,
  },
  // A lotion bottle standing up, flip cap on top (from Nora's Organic Mimi body lotion).
  lotion: {
    ink: 'M25 5H39Q40 5 40 6V22H24V6Q24 5 25 5ZM24 22Q14 24 14 34V76Q14 80 18 80H46Q50 80 50 76V34Q50 24 40 22',
    detail: 'M24 10.5H40',
    inside: 'M24 23Q15 25 15 34V76Q15 79 18 79H46Q49 79 49 76V34Q49 25 40 23Z',
    top: 23,
    bottom: 79,
  },
  // A perfume bottle with cut corners and a flared cap (from Nora's Jawhara), the thin tube inside.
  perfume: {
    ink: 'M23 5H41L37 21H27ZM28 21H36V27H28ZM18 27H46L52 33V74L46 80H18L12 74V33Z',
    detail: 'M32 27V73M16 35V72',
    inside: 'M18.5 28H45.5L51 33.5V73.5L45.5 79H18.5L13 73.5V33.5Z',
    top: 28,
    bottom: 79,
  },
  // A tall, slim body mist bottle with a square cap.
  mist: {
    ink: 'M21 4H43Q45 4 45 6V24H19V6Q19 4 21 4ZM21 24H43Q46 24 46 27V77Q46 80 43 80H21Q18 80 18 77V27Q18 24 21 24Z',
    detail: 'M19 9.5H45',
    inside: 'M21 25H43Q45 25 45 27V77Q45 79 43 79H21Q19 79 19 77V27Q19 25 21 25Z',
    top: 25,
    bottom: 79,
  },
  // A flat box, half the height of the box, like daily liners come in.
  flatbox: {
    ink: 'M11 48H53V80H11ZM11 48L16 43H48L53 48',
    detail: 'M16 43L19 48M48 43L45 48',
    inside: 'M12 49H52V79H12Z',
    top: 49,
    bottom: 79,
  },
}

export const CONTAINERS = Object.keys(SHAPES) as Container[]

/** What makes sense where (Nora): no pumps, sprays or tubes in the kitchen; no jars, cans, cartons, bottles or bags in the bathroom. */
export const CONTAINERS_FOR: Record<Place, Container[]> = {
  pantry: ['jar', 'bottle', 'box', 'bag', 'can', 'carton'],
  bathroom: ['pump', 'lotion', 'creamjar', 'tube', 'dropper', 'mist', 'perfume', 'spray', 'jug', 'box', 'flatbox'],
}

/** The drawings a room offers: a kitchen's, a bathroom's, or every one for any other room. */
export function containersFor(kind: RoomKind): Container[] {
  if (kind === 'kitchen') return CONTAINERS_FOR.pantry
  if (kind === 'bathroom') return CONTAINERS_FOR.bathroom
  return [...new Set([...CONTAINERS_FOR.pantry, ...CONTAINERS_FOR.bathroom])]
}

/** The gel pen color for how full something is: green when there's plenty, orange when it's going,
 *  the theme color when it's running low. */
export function gelColor(level: number, lowAt: number) {
  // Colors from Nora's own drawings: the frog's green, the goldfish's orange, the bow's coral.
  if (level <= lowAt) return '#F4827A'
  if (level <= 50) return '#FA9A55'
  return '#8DAA5C'
}

/** Where the inside of a container starts and ends, as a share of its height (for dragging the level). */
export function insideSpan(kind: Container) {
  const s = SHAPES[kind]
  return { top: s.top / 84, bottom: s.bottom / 84 }
}

/** A guess at what something looks like from its name, so most things need no picking. */
const GUESSES: [RegExp, Container][] = [
  [/liner|dnevn|ulož|uloš|panty/i, 'flatbox'],
  [/perfume|parfem|parfum|eau de|edp\b|edt\b|toaletna voda/i, 'perfume'],
  [/mist|victoria|body spray|sprej za telo/i, 'mist'],
  [/serum|dropper|pipet|kapi\b|drops|face oil|ulje za lice/i, 'dropper'],
  [/detergent|deterdžent|deterdzent|softener|omekšiv|omeksiv|bleach|varikin|dish soap|za sudove/i, 'jug'],
  [/sunscreen|spf|za sunčanje|za suncanje|lotion|losion|body milk|mleko za telo/i, 'lotion'],
  [/moistur|hidrat|face cream|krema za lice|night cream|noćna krema|nocna krema|body butter|puter za telo/i, 'creamjar'],
  [/toothpaste|pasta za zube|tube|tuba|cream|krema|ointment/i, 'tube'],
  [/oil|ulje|vinegar|sirće|sirce|sauce|sos|syrup|sirup|wine|vino|juice|sok/i, 'bottle'],
  [/rice|pirinač|pirinac|flour|brašno|brasno|sugar|šećer|secer|pasta|testenin|lentil|sočivo|chips|čips/i, 'bag'],
  [/oat|ovsen|cereal|žitaric|zitaric|muesli|musli|cracker|kreker|tea|čaj|caj|tissue|maramic|cotton|vat/i, 'box'],
  [/bean|pasulj|tomato|paradajz|tuna|corn|kukuruz|chickpea|leblebij|can|konzerv/i, 'can'],
  [/milk|mleko|mlijeko|pavlaka|yogurt|jogurt/i, 'carton'],
  [/shampoo|šampon|sampon|soap|sapun|conditioner|regenerator|gel/i, 'pump'],
  [/clean|čist|cist|spray|sprej|windex/i, 'spray'],
  [/honey|med|jam|džem|dzem|coffee|kafa|salt|so\b|spice|začin|zacin|nutella|peanut/i, 'jar'],
]

export function guessContainer(name: string, allowed: Container[] = CONTAINERS): Container | null {
  for (const [re, kind] of GUESSES) if (allowed.includes(kind) && re.test(name)) return kind
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
        {/* Colored pencil, like Nora's drawings: solid color with fine paper grain showing through in
            slanted strokes. The grain is noise, stretched along the stroke direction. */}
        <clipPath id={`lvl-${id}`}>
          <rect x="0" y={y} width="64" height={84 - y} />
        </clipPath>
        <filter id={`pencil-${id}`} x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="1.6 .28" numOctaves="3" seed="7" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.9" result="grainMask" />
          {/* Big soft patches, lighter and darker, like a watercolor wash under the pencil. */}
          <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="3" result="wash" />
          <feColorMatrix in="wash" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.6 .05" result="washMask" />
          <feComposite in="grainMask" in2="washMask" operator="arithmetic" k1="1" result="mask" />
          <feComposite in="SourceGraphic" in2="mask" operator="in" />
        </filter>
      </defs>
      {level > 0 && (
        <g clipPath={`url(#in-${id})`}>
          {/* A soft wash first, then the pencil on top of it, laid down at a slant. */}
          <rect x="0" y={y} width="64" height={84 - y} fill={color} opacity=".55" />
          <g clipPath={`url(#lvl-${id})`}>
            <g transform="rotate(-28 32 50)">
              <rect x="-50" y="-40" width="170" height="170" fill={color} filter={`url(#pencil-${id})`} />
            </g>
          </g>
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
export function Shelf({ height, children }: { height: number; children: ReactNode }) {
  return (
    <div className="shelf" style={{ ['--thing' as string]: `${height}px` }}>
      {/* The board: a straight top edge for things to stand on, and a looser pen line under it. */}
      <svg className="shelf-board" viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden>
        <path d="M2 2H298" fill="none" stroke="#2E2638" strokeWidth="2.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d="M4 10Q40 7.5 80 10.2T160 9.6T240 10.4T296 9.4" fill="none" stroke="#2E2638" strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d="M2 2V9.6M298 2V9.4" fill="none" stroke="#2E2638" strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="shelf-row">{children}</div>
    </div>
  )
}
