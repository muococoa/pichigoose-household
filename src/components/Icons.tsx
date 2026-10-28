import inkPatch from '../../assets/ink-patch.png'

// Line icons from the hi-fi screens: 26 px, 2 px stroke, round caps.

type P = { size?: number; width?: number; className?: string }

function Svg({ size = 26, width = 2, children, className }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 26 26"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  )
}

export const BackIcon = (p: P) => (
  <Svg size={28} width={2.4} {...p}>
    <path d="M16 5.5 8.5 13l7.5 7.5" />
  </Svg>
)
export const ShareIcon = (p: P) => (
  <Svg size={18} width={2.2} {...p}>
    <path d="M13 15V4M8.5 8.5 13 4l4.5 4.5" />
    <path d="M6 13v8h14v-8" />
  </Svg>
)
export const PencilIcon = (p: P) => (
  <Svg size={18} width={2.2} {...p}>
    <path d="M5 21l1-4.5L17 5.5l3.5 3.5-11 11Z" />
    <path d="M14.5 8l3.5 3.5" />
  </Svg>
)
export const ChevronDown = (p: P) => (
  <Svg size={22} {...p}>
    <path d="M8 10.5l5 5 5-5" />
  </Svg>
)
export const PlusIcon = (p: P) => (
  <Svg size={30} width={3.2} {...p}>
    <path d="M13 5.5v15M5.5 13h15" />
  </Svg>
)
export const DotsIcon = (p: P) => (
  <Svg size={22} width={2.6} {...p}>
    <path d="M6 13h.01M13 13h.01M20 13h.01" />
  </Svg>
)
export const PersonAddIcon = (p: P) => (
  <Svg size={22} width={2.2} {...p}>
    <circle cx="10.5" cy="9" r="4" />
    <path d="M3.5 21c.6-3.8 3.4-6 7-6s6.4 2.2 7 6" />
    <path d="M20 7.5v6M17 10.5h6" />
  </Svg>
)
export const CloseIcon = (p: P) => (
  <Svg size={22} width={2.2} {...p}>
    <path d="M7 7l12 12M19 7 7 19" />
  </Svg>
)
export const SearchIcon = (p: P) => (
  <Svg size={20} {...p}>
    <circle cx="11.5" cy="11.5" r="6.5" />
    <path d="m16.5 16.5 4 4" />
  </Svg>
)
export const SendIcon = (p: P) => (
  <Svg size={22} width={2.4} {...p}>
    <path d="M13 20.5V6M7 11.5 13 5.5l6 6" />
  </Svg>
)
export const SmallCheck = (p: P) => (
  <Svg size={20} width={2.4} {...p}>
    <path d="M6 13.5l4.5 4.5L20 8" />
  </Svg>
)
export const HomeIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 12.2 13 4.5l9 7.7" />
    <path d="M6.5 10.5V21h13V10.5" />
    <path d="M11 21v-5.5h4V21" />
  </Svg>
)
export const BasketIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 9.5h18l-2 11.5H6Z" />
    <path d="M9 9.5 11.5 4M17 9.5 14.5 4" />
    <path d="M10 14v3.5M13 14v3.5M16 14v3.5" />
  </Svg>
)
export const TodoIcon = (p: P) => (
  <Svg {...p}>
    <rect x="4.5" y="4.5" width="17" height="17" rx="3" />
    <path d="M8.5 13.2l3 3 6-6.5" />
  </Svg>
)
export const NoteIcon = (p: P) => (
  <Svg {...p}>
    <path d="M6 4.5h10l4 4V21.5H6Z" />
    <path d="M16 4.5v4h4" />
    <path d="M9 13h8M9 17h6" />
  </Svg>
)
export const MessagesIcon = (p: P) => (
  <Svg {...p}>
    <path d="M13.4 4.6c5 0 8.6 3.4 8.6 7.7s-3.6 7.6-8.6 7.6c-1.3 0-2.5-.2-3.6-.6L5.2 21.4l1.3-4.3C5 15.8 4.4 14.1 4.4 12.3c0-4.3 3.9-7.7 9-7.7Z" />
    <path d="M9.6 12.4h.01M13.3 12.4h.01M17 12.4h.01" strokeWidth="2.6" />
  </Svg>
)
export const MoneyIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="13" cy="13" r="8.5" />
    <path d="M15.5 10c-.6-1-1.5-1.4-2.6-1.4-1.6 0-2.7.9-2.7 2.1 0 2.9 5.6 1.6 5.6 4.5 0 1.3-1.2 2.2-2.9 2.2-1.2 0-2.2-.5-2.8-1.5M13 7v1.6M13 17.4V19" />
  </Svg>
)

export function GripIcon() {
  return (
    <svg viewBox="0 0 14 22" width="14" height="22" fill="#857A8C" aria-hidden>
      <circle cx="4" cy="4" r="1.8" />
      <circle cx="10" cy="4" r="1.8" />
      <circle cx="4" cy="11" r="1.8" />
      <circle cx="10" cy="11" r="1.8" />
      <circle cx="4" cy="18" r="1.8" />
      <circle cx="10" cy="18" r="1.8" />
    </svg>
  )
}

/** The household switcher arrow, drawn in the same dry ink as the headline next to it:
 *  rough edges from the #dry-ink filter, patchy ink from the same mask. */
export function InkChevron() {
  const mask = `url(${inkPatch})`
  return (
    <span style={{ display: 'flex', WebkitMaskImage: mask, maskImage: mask, WebkitMaskSize: '420px 420px', maskSize: '420px 420px', WebkitMaskPosition: '-210px -130px', maskPosition: '-210px -130px', padding: 3, margin: -3 }}>
      <svg viewBox="0 0 26 26" width="28" height="28" fill="none" aria-hidden style={{ filter: 'url(#dry-ink)', overflow: 'visible' }}>
        <path
          d="M6.2 9.2c2 1.7 4 3.7 6.4 6.6.3.4.8.4 1.1 0 2-2.7 4-4.8 6.2-6.9"
          stroke="#1E1A30"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

/** A loose loop of marker around the active tab's icon. It overshoots where it started, like a quick hand circle. */
export function InkCircle() {
  return (
    <svg className="tab-circle" viewBox="0 0 46 38" aria-hidden>
      <path
        d="M30.5 4.2C21 1.6 7.6 4.6 4.3 14.2 1.4 23 9.6 33.4 22.6 33.9 35.2 34.4 43 26.4 41.6 17.2 40.4 9.6 32.6 4.6 23.2 4.4 19.6 4.3 16.4 5.2 14.2 6.4"
        pathLength={1}
        fill="none"
        style={{ stroke: 'var(--hero-dark)' }}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
