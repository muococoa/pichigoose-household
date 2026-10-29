import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMyProfile } from '../data/hooks'

// Stickers: Nora's painted sticker sheets, cut into one file per sticker by scripts/cut-stickers.py.
// Your pack follows your avatar: onigiri people get onigiri stickers, ramen people ramen ones, and
// everyone else gets Pichi's goose stickers until their own sheet exists.
// A sticker is saved by its name, like "onigiri/love", in the sticker field of a comment or message.

const FILES = import.meta.glob('../../assets/stickers/*/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

export const STICKERS = ['love', 'kiss', 'wink', 'hi', 'yay', 'aww', 'ok', 'cry', 'wow', 'angry', 'sleepy', 'party'] as const
const PACKS = ['pichi', 'onigiri', 'ramen']

/** The sticker pack for an avatar character. */
export function packFor(character?: string | null) {
  return character && PACKS.includes(character) ? character : 'pichi'
}

export function stickerUrl(name: string): string | undefined {
  return FILES[`../../assets/stickers/${name}.webp`]
}

/** A sent sticker. */
export function StickerImage({ name, size }: { name: string; size: number }) {
  const { t } = useTranslation()
  const url = stickerUrl(name)
  const label = t(`stickers.names.${name.split('/')[1]}`, { defaultValue: '' })
  if (!url) return null
  return <img className="sticker-img" src={url} alt={label ? t('stickers.alt', { name: label }) : t('stickers.title')} width={size} height={size} draggable={false} />
}

/** The small sticker button next to Send, and the tray of your stickers above it. Tap one to send it. */
export function StickerButton({ onSend }: { onSend: (name: string) => void }) {
  const { t } = useTranslation()
  const me = useMyProfile()
  const pack = packFor(me?.avatar?.character)
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLSpanElement>(null)

  // A tap anywhere else, or Escape, closes the tray.
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <span ref={box} className="sticker-box">
      <button
        type="button"
        className={`sticker-btn${open ? ' on' : ''}`}
        aria-label={t('stickers.title')}
        title={t('stickers.title')}
        aria-expanded={open}
        // Opens the moment your finger touches it, and keeps the keyboard where it is.
        onPointerDown={(e) => {
          e.preventDefault()
          setOpen((o) => !o)
        }}
        onClick={(e) => {
          if (e.detail === 0) setOpen((o) => !o)
        }}
      >
        {/* A round sticker with its corner peeling up, and a little smile (Nora, 29 Oct). Framed tightly around the
            drawing, and the line drawn as heavy as the Send arrow next to it (about 2 px on screen). */}
        <svg viewBox="4.2 4.2 16.6 16.6" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20.5 12.5A8 8 0 1 0 12.5 20.5Z" />
          <path d="M12.5 20.5Q14.6 14.6 20.5 12.5" />
          <path d="M9.8 9.9v.6M14.4 9.9v.6M9.4 13.3c1.4 1.3 3.6 1.3 5 0" />
        </svg>
      </button>
      {open && (
        <span className="sticker-tray" role="dialog" aria-label={t('stickers.title')}>
          {STICKERS.map((s) => (
            <button
              key={s}
              type="button"
              className="sticker-pick"
              aria-label={t(`stickers.names.${s}`)}
              title={t(`stickers.names.${s}`)}
              onPointerDown={(e) => e.preventDefault()}
              onPointerUp={() => {
                onSend(`${pack}/${s}`)
                setOpen(false)
              }}
              onClick={(e) => {
                if (e.detail !== 0) return
                onSend(`${pack}/${s}`)
                setOpen(false)
              }}
            >
              <img src={stickerUrl(`${pack}/${s}`)} alt="" width={64} height={64} draggable={false} />
            </button>
          ))}
        </span>
      )}
    </span>
  )
}
