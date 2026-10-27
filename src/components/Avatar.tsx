// Avatars: a character with a face on a pastel circle.
// The onigiri, lemon, mug and marshmallow come from the hi-fi screens. The toast, cloud, frog,
// cat and the accessories are Claude's drafts for Nora to review.
// Lines stay 2 px at every size (vector-effect: non-scaling-stroke).

import type { Avatar as AvatarData } from '../data/hooks'

export const CHARACTERS = ['onigiri', 'lemon', 'mug', 'marshmallow', 'toast', 'cloud', 'frog', 'cat'] as const
export const COLORS = ['blush', 'mint', 'mist', 'sage', 'peach', 'butter', 'lilac', 'sand'] as const
export const ACCESSORIES = ['none', 'bow', 'glasses', 'flower', 'hat'] as const

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

const INK = '#1E1A30'
const line = { stroke: INK, strokeWidth: 2, vectorEffect: 'non-scaling-stroke' as const }
const thin = { stroke: INK, strokeWidth: 1.6, vectorEffect: 'non-scaling-stroke' as const, strokeLinecap: 'round' as const, fill: 'none' }

type Face = { eyes: [number, number, number]; smile: string; cheeks?: [number, number, number] }

function FaceMarks({ eyes: [x1, x2, y], smile, cheeks }: Face) {
  return (
    <>
      <circle cx={x1} cy={y} r="1.4" fill={INK} />
      <circle cx={x2} cy={y} r="1.4" fill={INK} />
      <path d={smile} {...thin} />
      {cheeks && (
        <>
          <circle cx={cheeks[0]} cy={cheeks[2]} r="1.3" fill="#F2A0B0" />
          <circle cx={cheeks[1]} cy={cheeks[2]} r="1.3" fill="#F2A0B0" />
        </>
      )}
    </>
  )
}

const FACES: Record<string, Face> = {
  onigiri: { eyes: [16.6, 23.4, 19.6], smile: 'M18.2 22.2q1.8 1.5 3.6 0', cheeks: [14.4, 25.6, 22] },
  lemon: { eyes: [16.4, 23.6, 20], smile: 'M18 23q2 1.7 4 0' },
  mug: { eyes: [16, 21.4, 19.5], smile: 'M17 22.6q1.7 1.4 3.4 0' },
  marshmallow: { eyes: [17, 23, 19.5], smile: 'M18.3 22.6q1.7 1.4 3.4 0' },
  toast: { eyes: [16.6, 23.4, 20.5], smile: 'M18.2 23.4q1.8 1.5 3.6 0', cheeks: [14.6, 25.4, 23] },
  cloud: { eyes: [17, 23, 21], smile: 'M18.4 23.8q1.6 1.3 3.2 0' },
  frog: { eyes: [15, 25, 15.2], smile: 'M15.5 24q4.5 3 9 0' },
  cat: { eyes: [16.6, 23.4, 20.5], smile: 'M18 24q1 1 2 0q1 1 2 0', cheeks: [14.4, 25.6, 23.4] },
}

function Body({ character }: { character: string }) {
  switch (character) {
    case 'lemon':
      return (
        <>
          <path d="M7.5 21C7.5 14 13 10.5 20 10.5S32.5 14 32.5 21 27 31 20 31 7.5 28 7.5 21Z" fill="#F8E6A8" {...line} />
          <path d="M20 10.5c1-3 3.5-4 6-3.6-1 2.6-3.4 3.8-6 3.6Z" fill="#6E9152" {...line} strokeLinejoin="round" />
        </>
      )
    case 'mug':
      return (
        <>
          <path d="M11 13h15v11a6 6 0 0 1-6 6h-3a6 6 0 0 1-6-6Z" fill="#F6CFA0" {...line} strokeLinejoin="round" />
          <path d="M26 16h2a3.5 3.5 0 0 1 0 7h-2" fill="none" {...line} />
        </>
      )
    case 'marshmallow':
      return <path d="M12 28V17a8 8 0 0 1 16 0v11Z" fill="#FFFDF8" {...line} strokeLinejoin="round" />
    case 'toast':
      return (
        <path
          d="M11.5 30V18.6C9 17.6 8.4 15.6 8.9 13.6 9.7 10.6 13.6 9 20 9s10.3 1.6 11.1 4.6c.5 2-.1 4-2.6 5V30Z"
          fill="#F8E6A8"
          {...line}
          strokeLinejoin="round"
        />
      )
    case 'cloud':
      return (
        <path
          d="M12 28.5a5.2 5.2 0 0 1-.9-10.3 7 7 0 0 1 13.2-3 5.6 5.6 0 0 1 6.6 6.6 3.4 3.4 0 0 1-1 6.7Z"
          fill="#FFFFFF"
          {...line}
          strokeLinejoin="round"
        />
      )
    case 'frog':
      return (
        <>
          <path d="M8.5 24.5c0-5.4 5-8.7 11.5-8.7s11.5 3.3 11.5 8.7-5 6.6-11.5 6.6-11.5-1.2-11.5-6.6Z" fill="#B9D49A" {...line} />
          <circle cx="15" cy="15" r="4.2" fill="#FFFDF8" {...line} />
          <circle cx="25" cy="15" r="4.2" fill="#FFFDF8" {...line} />
        </>
      )
    case 'cat':
      return (
        <>
          <path d="M10.5 30.5c-2-3.5-2.2-9.5-.3-13.6l.9-8 6 4.6h5.8l6-4.6.9 8c1.9 4.1 1.7 10.1-.3 13.6Z" fill="#F6CFA0" {...line} strokeLinejoin="round" />
          <path d="M19.2 22.3h1.6l-.8.9Z" fill={INK} />
        </>
      )
    default:
      return (
        <>
          <path d="M20 8.5C25 8.5 31.5 20 31 26.5C30.6 30.5 9.4 30.5 9 26.5C8.5 20 15 8.5 20 8.5Z" fill="#FFFDF8" {...line} strokeLinejoin="round" />
          <path d="M14 25h12v5.2H14z" fill={INK} />
        </>
      )
  }
}

function Accessory({ kind, face }: { kind: string | null; face: Face }) {
  const [x1, x2, y] = face.eyes
  switch (kind) {
    case 'bow':
      return (
        <g transform="translate(27 9) rotate(18)">
          <path d="M0 0-5-3.2v6.4ZM0 0l5-3.2v6.4Z" fill="#D34471" {...line} strokeLinejoin="round" />
          <circle r="1.4" fill="#D34471" {...line} />
        </g>
      )
    case 'glasses':
      return (
        <g>
          <circle cx={x1} cy={y} r="3.4" fill="rgba(255,255,255,.35)" {...line} />
          <circle cx={x2} cy={y} r="3.4" fill="rgba(255,255,255,.35)" {...line} />
          <path d={`M${x1 + 3.4} ${y}h${x2 - x1 - 6.8}`} fill="none" {...line} />
        </g>
      )
    case 'flower':
      return (
        <g transform="translate(11.5 10.5)">
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 2.6} cy={Math.sin((a * Math.PI) / 180) * 2.6} r="2" fill="#FFFDF8" {...line} />
          ))}
          <circle r="1.5" fill="#F2A03D" />
        </g>
      )
    case 'hat':
      return (
        <g transform="translate(20 3.5) rotate(-12)">
          <path d="M0-1.5 5 8H-5Z" fill="#8466B8" {...line} strokeLinejoin="round" />
          <circle cy="-2" r="1.6" fill="#F2A03D" />
        </g>
      )
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
  const character = avatar?.character && FACES[avatar.character] ? avatar.character : 'onigiri'
  const color = COLOR_HEX[avatar?.color ?? ''] ?? COLOR_HEX.blush
  const face = FACES[character]
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      width={size}
      height={size}
      style={{ width: size, height: size, ...style }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <circle cx="20" cy="20" r="20" fill={color} />
      <Body character={character} />
      <FaceMarks {...face} />
      <Accessory kind={avatar?.accessory ?? null} face={face} />
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
