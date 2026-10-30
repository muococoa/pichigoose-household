import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SendIcon } from './Icons'
import { StickerButton } from './Stickers'
import { useHousehold } from '../data/hooks'
import { useMe } from '../auth'
import { Avatar } from './Avatar'
import { insertMention, typingMention } from '../lib/mentions'

// One typing bar for every place you type a short text (Nora, 29 Oct): the chat, comments and Shopping's add field.
// A strip of our paper with the field, stickers (where they fit) and the round send button, floating right above
// the keyboard while you type. Sending closes the keyboard, everywhere. One component and one keyboard rule, so a fix
// here fixes all of them.

const touchScreen = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

/** When something was last sent: the same tap mustn't also press whatever sits under the bar once it's gone. */
let sentAt = 0
export const justSent = () => Date.now() - sentAt < 600

type Props = {
  value: string
  onChange: (text: string) => void
  /** Called with the text when you send. The bar then lets go of the keyboard. */
  onSend: (text: string) => void
  placeholder: string
  /** A sticker picked from the sticker button, sent right away. Leave out where stickers don't belong. */
  onSticker?: (name: string) => void
  /** Grows to five lines (the chat). Otherwise one line. */
  multiline?: boolean
  /** Something shown above the field, like the message you're replying to. */
  above?: ReactNode
  fieldRef?: { current: HTMLTextAreaElement | HTMLInputElement | null }
  className?: string
  onBlur?: () => void
  /** Hidden from tabbing and screen readers while it's closed (Shopping's add field). */
  closed?: boolean
  /** Typing @ offers the household's people to tag (comments and the chat). */
  mentionable?: boolean
}

export function TypingBar({ value, onChange, onSend, placeholder, onSticker, multiline, above, fieldRef, className = '', onBlur, closed, mentionable }: Props) {
  const { t } = useTranslation()
  const own = useRef<HTMLTextAreaElement & HTMLInputElement>(null)
  // While you're typing (and for a moment after the field lets go, so a tap on Send still lands on it).
  const [typing, setTyping] = useState(false)
  const settle = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(settle.current), [])
  const setRef = (el: (HTMLTextAreaElement & HTMLInputElement) | null) => {
    own.current = el
    if (fieldRef) fieldRef.current = el
  }

  // The chat's field grows with the text, up to five lines.
  useLayoutEffect(() => {
    const el = own.current
    if (!el || !multiline) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }, [value, multiline])

  function send(e?: FormEvent) {
    e?.preventDefault()
    const text = value.trim()
    if (!text) return
    sentAt = Date.now()
    onSend(text)
    // Sending closes the keyboard.
    own.current?.blur()
  }

  function key(e: KeyboardEvent<HTMLTextAreaElement>) {
    // On a computer, Enter sends and Shift+Enter starts a new line. On a phone, Return is a new line, like WhatsApp.
    if (!touchScreen && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const field = {
    ref: setRef,
    className: 'input',
    placeholder,
    'aria-label': placeholder,
    value,
    tabIndex: closed ? -1 : undefined,
    'aria-hidden': closed || undefined,
    onFocus: () => {
      window.clearTimeout(settle.current)
      setTyping(true)
    },
    onBlur: () => {
      settle.current = window.setTimeout(() => setTyping(false), 250)
      onBlur?.()
    },
  }
  // Typing @ shows the household's people; tap one to tag them (Nora, 30 Oct). Only where people talk (comments and
  // the chat), so not in Shopping's add field.
  const { people } = useHousehold()
  const me = useMe()
  const query = mentionable ? typingMention(value) : null
  const matches = query === null ? [] : people.filter((p) => p.id !== me && p.display_name.toLocaleLowerCase().startsWith(query.toLocaleLowerCase()))
  const picker = matches.length > 0 && (
    <div className="mention-picker" role="listbox" aria-label={t('mentions.pick')}>
      {matches.map((p) => (
        <button
          key={p.id}
          type="button"
          role="option"
          aria-selected={false}
          className="mention-pick"
          // Picks on touch, before the field could lose the keyboard.
          onPointerDown={(e) => {
            e.preventDefault()
            onChange(insertMention(value, p.display_name))
          }}
        >
          <Avatar avatar={p.avatar} label={p.display_name} size={26} />
          {p.display_name}
        </button>
      ))}
    </div>
  )
  return (
    <form className={`typing-bar${above || picker ? ' quoting' : ''}${typing ? ' typing' : ''} ${className}`} onSubmit={send}>
      {picker}
      {above}
      {multiline ? (
        <textarea {...field} rows={1} onChange={(e) => onChange(e.target.value)} onKeyDown={key} />
      ) : (
        <input {...field} enterKeyHint="send" onChange={(e) => onChange(e.target.value)} />
      )}
      {onSticker && (
        <StickerButton
          onSend={(name) => {
            onSticker(name)
            own.current?.blur()
          }}
        />
      )}
      {/* Sends the moment your finger touches it, before the keyboard or the bar can move (otherwise the field let
          go first, the bar settled, and the tap missed). Enter and the keyboard's Send key go through the form. */}
      <button
        type="button"
        className="send-btn"
        aria-label={t('messages.send')}
        disabled={!value.trim()}
        tabIndex={closed ? -1 : undefined}
        onPointerDown={(e) => {
          e.preventDefault()
          send()
        }}
        onClick={(e) => {
          // A click without a pointer (a keyboard's Enter or Space on the button).
          if (e.detail === 0) send()
        }}
      >
        <SendIcon />
      </button>
    </form>
  )
}
