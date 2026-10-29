import { useId } from 'react'
import type { Avatar as AvatarData } from '../data/hooks'
import onigiri from '../../assets/avatars/onigiri.webp'
import lemon from '../../assets/avatars/lemon.webp'
import marshmallow from '../../assets/avatars/marshmallow.webp'
import toast from '../../assets/avatars/toast.webp'
import cloud from '../../assets/avatars/cloud.webp'
import frog from '../../assets/avatars/frog.webp'
import cat from '../../assets/avatars/cat.webp'
import dog from '../../assets/avatars/dog.webp'
import pickle from '../../assets/avatars/pickle.webp'
import goldfish from '../../assets/avatars/goldfish.webp'
import turtle from '../../assets/avatars/turtle.webp'
import carrot from '../../assets/avatars/carrot.webp'
import plant from '../../assets/avatars/plant.webp'
import mug from '../../assets/avatars/mug.webp'
import bowImg from '../../assets/avatars/extras/bow.webp'
import bowTieImg from '../../assets/avatars/extras/bow-tie.webp'
import glassesImg from '../../assets/avatars/extras/glasses.webp'
import mustacheImg from '../../assets/avatars/extras/mustache.webp'
import flowerImg from '../../assets/avatars/extras/flower.webp'
import partyHatImg from '../../assets/avatars/extras/party-hat.webp'
import witchHatImg from '../../assets/avatars/extras/witch-hat.webp'

// Avatars: Nora's painted characters, each on a pastel circle, with her painted extras placed on
// each one by hand (a hat on the head, glasses on the eyes). Never redrawn, only placed.

export const CHARACTERS = ['onigiri', 'lemon', 'marshmallow', 'toast', 'cloud', 'frog', 'cat', 'dog', 'pickle', 'goldfish', 'turtle', 'carrot', 'plant', 'mug'] as const
export const COLORS = ['blush', 'mint', 'mist', 'sage', 'peach', 'butter', 'lilac', 'sand'] as const
export const ACCESSORIES = ['none', 'bow', 'bowtie', 'glasses', 'mustache', 'flower', 'partyhat', 'witchhat'] as const

export const COLOR_HEX: Record<string, string> = {
  blush: '#F2C1C4',
  peach: '#F6CFA0',
  butter: '#F8E6A8',
  mist: '#DCE7F0',
  sand: '#E9E1D6',
  sage: '#CFDDB8',
  mint: '#A7D3CC',
  lilac: '#D6C8E6',
}

/** Width / height of each painting, and of each extra. */
type Art = { src: string; ratio: number }
const ART: Record<string, Art> = {
  onigiri: { src: onigiri, ratio: 384 / 347 },
  lemon: { src: lemon, ratio: 280 / 384 },
  marshmallow: { src: marshmallow, ratio: 357 / 384 },
  toast: { src: toast, ratio: 382 / 384 },
  cloud: { src: cloud, ratio: 384 / 267 },
  frog: { src: frog, ratio: 361 / 384 },
  cat: { src: cat, ratio: 317 / 384 },
  dog: { src: dog, ratio: 358 / 384 },
  pickle: { src: pickle, ratio: 201 / 384 },
  goldfish: { src: goldfish, ratio: 384 / 318 },
  turtle: { src: turtle, ratio: 349 / 384 },
  carrot: { src: carrot, ratio: 198 / 384 },
  plant: { src: plant, ratio: 382 / 384 },
  mug: { src: mug, ratio: 384 / 303 },
}
const EXTRA: Record<string, Art> = {
  bow: { src: bowImg, ratio: 384 / 278 },
  bowtie: { src: bowTieImg, ratio: 384 / 208 },
  glasses: { src: glassesImg, ratio: 384 / 163 },
  mustache: { src: mustacheImg, ratio: 384 / 113 },
  flower: { src: flowerImg, ratio: 384 / 350 },
  partyhat: { src: partyHatImg, ratio: 273 / 384 },
  witchhat: { src: witchHatImg, ratio: 384 / 302 },
}
/** Older saved extras, from before Nora's paintings. */
const RENAMED: Record<string, string> = { hat: 'partyhat' }

/**
 * Where each character sits in the circle (on a 40 x 40 grid) and where its face and head are,
 * as shares of the painting's width and height.
 *   box: how big the painting is drawn; cx, cy: its center (busts sit low, cut by the circle).
 *   eyes: the point between the eyes, and the distance between them (share of the width).
 *   mouth: how far down the mouth is. top: the top of the head, where a hat sits, and its tilt.
 *   bow, flower: top right and top left of the head. tie: just under the face.
 */
type Place = {
  box: number
  cx: number
  cy: number
  eyes: [number, number, number]
  mouth: number
  top: [number, number, number]
  head: number
  bow: [number, number]
  flower: [number, number]
  tie: [number, number]
}
const PLACES: Record<string, Place> = {
  onigiri: { box: 29, cx: 20, cy: 21.5, eyes: [0.51, 0.38, 0.22], mouth: 0.46, top: [0.5, 0.06, -6], head: 0.42, bow: [0.7, 0.24], flower: [0.29, 0.26], tie: [0.51, 0.56] },
  lemon: { box: 30, cx: 20.5, cy: 21, eyes: [0.53, 0.52, 0.26], mouth: 0.57, top: [0.38, 0.17, -22], head: 0.5, bow: [0.22, 0.3], flower: [0.8, 0.45], tie: [0.53, 0.72] },
  marshmallow: { box: 28, cx: 20, cy: 21, eyes: [0.43, 0.49, 0.25], mouth: 0.53, top: [0.5, 0.06, -5], head: 0.5, bow: [0.84, 0.14], flower: [0.13, 0.14], tie: [0.45, 0.72] },
  toast: { box: 28, cx: 20, cy: 21, eyes: [0.44, 0.44, 0.25], mouth: 0.5, top: [0.5, 0.05, -5], head: 0.48, bow: [0.84, 0.12], flower: [0.12, 0.14], tie: [0.44, 0.68] },
  cloud: { box: 31, cx: 20, cy: 21.5, eyes: [0.5, 0.49, 0.25], mouth: 0.56, top: [0.46, 0.06, -6], head: 0.4, bow: [0.75, 0.22], flower: [0.2, 0.32], tie: [0.5, 0.8] },
  frog: { box: 30, cx: 20, cy: 22, eyes: [0.5, 0.11, 0.45], mouth: 0.23, top: [0.5, 0.06, -4], head: 0.4, bow: [0.82, 0.05], flower: [0.17, 0.05], tie: [0.5, 0.36] },
  cat: { box: 33, cx: 20.5, cy: 24, eyes: [0.56, 0.4, 0.32], mouth: 0.52, top: [0.58, 0.18, -4], head: 0.48, bow: [0.82, 0.22], flower: [0.26, 0.24], tie: [0.58, 0.64] },
  dog: { box: 33, cx: 20, cy: 24, eyes: [0.53, 0.33, 0.18], mouth: 0.43, top: [0.54, 0.04, -4], head: 0.48, bow: [0.8, 0.13], flower: [0.25, 0.15], tie: [0.56, 0.58] },
  pickle: { box: 30, cx: 20, cy: 21, eyes: [0.46, 0.35, 0.3], mouth: 0.38, top: [0.56, 0.03, 8], head: 0.75, bow: [0.82, 0.12], flower: [0.22, 0.14], tie: [0.47, 0.5] },
  goldfish: { box: 30, cx: 21, cy: 21, eyes: [0.18, 0.5, 0.16], mouth: 0.55, top: [0.3, 0.17, -16], head: 0.32, bow: [0.47, 0.18], flower: [0.12, 0.32], tie: [0.24, 0.78] },
  turtle: { box: 31, cx: 20, cy: 22, eyes: [0.83, 0.2, 0.12], mouth: 0.23, top: [0.79, 0.04, 6], head: 0.3, bow: [0.93, 0.1], flower: [0.64, 0.08], tie: [0.73, 0.43] },
  carrot: { box: 31, cx: 20, cy: 21, eyes: [0.41, 0.49, 0.22], mouth: 0.53, top: [0.56, 0.04, 4], head: 0.7, bow: [0.66, 0.28], flower: [0.2, 0.33], tie: [0.42, 0.66] },
  mug: { box: 31, cx: 21, cy: 21, eyes: [0.38, 0.48, 0.22], mouth: 0.56, top: [0.4, 0.03, -5], head: 0.55, bow: [0.68, 0.07], flower: [0.1, 0.11], tie: [0.38, 0.68] },
  plant: { box: 31, cx: 20, cy: 21, eyes: [0.53, 0.82, 0.16], mouth: 0.86, top: [0.5, 0.03, -4], head: 0.36, bow: [0.77, 0.6], flower: [0.24, 0.6], tie: [0.53, 0.95] },
}

type Rect = { x: number; y: number; w: number; h: number }

const HATS = ['partyhat', 'witchhat']

/** The painting's rectangle in the circle. With a hat on, the character is a little smaller and
 *  lower, so the whole hat fits in the circle. */
function frame(character: string, accessory: string | null): Rect {
  const p = PLACES[character]
  const r = ART[character].ratio
  const hat = accessory ? HATS.includes(accessory) : false
  const box = hat ? p.box * 0.78 : p.box
  const w = r >= 1 ? box : box * r
  const h = r >= 1 ? box / r : box
  const cy = hat ? p.cy + (p.box - box) / 2 + 2.5 : p.cy
  return { x: p.cx - w / 2, y: cy - h / 2, w, h }
}

/** One extra, placed on the character. */
function Extra({ kind, character }: { kind: string; character: string }) {
  const art = EXTRA[kind]
  if (!art) return null
  const p = PLACES[character]
  const f = frame(character, kind)
  const at = (fx: number, fy: number) => [f.x + fx * f.w, f.y + fy * f.h] as const
  const img = (cx: number, cy: number, w: number, rot = 0, anchorBottom = false) => {
    const h = w / art.ratio
    const y = anchorBottom ? cy - h : cy - h / 2
    return <image href={art.src} x={cx - w / 2} y={y} width={w} height={h} transform={rot ? `rotate(${rot} ${cx} ${anchorBottom ? cy : cy})` : undefined} />
  }
  const [ex, ey, span] = p.eyes
  switch (kind) {
    case 'glasses': {
      const [x, y] = at(ex, ey)
      return img(x, y, Math.min(span * 2.25, 0.8) * f.w)
    }
    case 'mustache': {
      const [x, y] = at(ex, p.mouth - 0.02)
      return img(x, y, Math.min(span * 1.7, 0.42) * f.w)
    }
    case 'partyhat':
    case 'witchhat': {
      const [x, y] = at(p.top[0], p.top[1])
      const w = Math.min(p.head * f.w * (kind === 'witchhat' ? 1.3 : 0.85), kind === 'witchhat' ? 17 : 11)
      return img(x, y + 1.2, w, p.top[2], true)
    }
    case 'bow': {
      const [x, y] = at(p.bow[0], p.bow[1])
      return img(x, y, Math.max(8, f.w * 0.36), 18)
    }
    case 'flower': {
      const [x, y] = at(p.flower[0], p.flower[1])
      return img(x, y, Math.max(7, f.w * 0.3), -10)
    }
    case 'bowtie': {
      const [x, y] = at(p.tie[0], p.tie[1])
      return img(x, y, Math.max(8, f.w * 0.34))
    }
    default:
      return null
  }
}

type Props = {
  avatar?: Partial<AvatarData> | null
  size?: number
  label?: string
  className?: string
  style?: React.CSSProperties
}

export function Avatar({ avatar, size = 34, label, className = 'av', style }: Props) {
  const character = avatar?.character && ART[avatar.character] ? avatar.character : 'onigiri'
  const color = COLOR_HEX[avatar?.color ?? ''] ?? COLOR_HEX.blush
  const accessory = avatar?.accessory ? (RENAMED[avatar.accessory] ?? avatar.accessory) : null
  const clip = `av-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const f = frame(character, accessory)
  return (
    <svg
      className={`${className}${size >= 80 ? ' av-big' : ''}`}
      viewBox="0 0 40 40"
      width={size}
      height={size}
      style={{ width: size, height: size, ...style }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <clipPath id={clip}>
          <circle cx="20" cy="20" r="20" />
        </clipPath>
      </defs>
      <circle cx="20" cy="20" r="20" fill={color} />
      <g clipPath={`url(#${clip})`}>
        <image href={ART[character].src} x={f.x} y={f.y} width={f.w} height={f.h} />
        {accessory && <Extra kind={accessory} character={character} />}
      </g>
    </svg>
  )
}

/** The dashed "?" for to-dos nobody is assigned to. */
export function NobodyAvatar({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden style={{ flex: 'none', display: 'block' }}>
      <circle cx="20" cy="20" r="18" fill="rgba(255,253,248,.6)" stroke="#857A8C" strokeWidth="2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
      <text x="20" y="25" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="800" fontSize="14" fill="#63586B">
        ?
      </text>
    </svg>
  )
}
