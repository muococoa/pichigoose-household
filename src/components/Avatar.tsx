import { useId } from 'react'
import { AVATAR_LAYOUT } from './avatarLayout'
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
import sushi from '../../assets/avatars/sushi.webp'
import ramen from '../../assets/avatars/ramen.webp'
import bowImg from '../../assets/avatars/extras/bow.webp'
import bowTieImg from '../../assets/avatars/extras/bow-tie.webp'
import glassesImg from '../../assets/avatars/extras/glasses.webp'
import mustacheImg from '../../assets/avatars/extras/mustache.webp'
import flowerImg from '../../assets/avatars/extras/flower.webp'
import partyHatImg from '../../assets/avatars/extras/party-hat.webp'
import witchHatImg from '../../assets/avatars/extras/witch-hat.webp'

// Avatars: Nora's painted characters, each on a pastel circle, with her painted extras placed on
// each one by hand (a hat on the head, glasses on the eyes). Never redrawn, only placed.

export const CHARACTERS = ['onigiri', 'lemon', 'marshmallow', 'toast', 'cloud', 'frog', 'cat', 'dog', 'pickle', 'goldfish', 'turtle', 'carrot', 'plant', 'mug', 'sushi', 'ramen'] as const
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

const ART: Record<string, string> = { onigiri, lemon, marshmallow, toast, cloud, frog, cat, dog, pickle, goldfish, turtle, carrot, plant, mug, sushi, ramen }
const EXTRA: Record<string, string> = {
  bow: bowImg,
  bowtie: bowTieImg,
  glasses: glassesImg,
  mustache: mustacheImg,
  flower: flowerImg,
  partyhat: partyHatImg,
  witchhat: witchHatImg,
}
// Load every drawing ahead of time, so switching characters in the builder shows the new one at once
// (otherwise the old drawing flashes at the new size while the new one loads).
if (typeof window !== 'undefined') {
  for (const src of [...Object.values(ART), ...Object.values(EXTRA)]) {
    const img = new Image()
    img.src = src
  }
}

/** Older saved extras, from before Nora's paintings. */
const RENAMED: Record<string, string> = { hat: 'partyhat' }

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
  // Where everything goes comes from scripts/avatar-layout.py, measured from the drawings themselves.
  const place = AVATAR_LAYOUT[character]
  const extra = accessory && EXTRA[accessory] ? place.extras[accessory] : null
  const fit = extra?.fit
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
        <g transform={fit ? `translate(${fit[1]} ${fit[2]}) scale(${fit[0]})` : undefined}>
          <image key={character} href={ART[character]} x={place.x} y={place.y} width={place.w} height={place.h} />
          {extra && accessory && (
            <image key={`${character}-${accessory}`} href={EXTRA[accessory]} x={extra.x} y={extra.y} width={extra.w} height={extra.h} transform={`rotate(${extra.r} ${extra.rx} ${extra.ry})`} />
          )}
        </g>
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
