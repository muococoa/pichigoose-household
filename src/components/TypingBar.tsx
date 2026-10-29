import { useLayoutEffect, useRef, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SendIcon } from './Icons'
import { StickerButton } from './Stickers'

// One typing bar for every place you type a short text (Nora, 29 Oct): the chat, comments and Shopping's add field.
// A strip of our paper with the field, stickers (where they fit) and the round send button, floating right above
// the keyboard while you type. Sending closes the keyboard, everywhere. One component and one keyboard rule, so a fix
// here fixes all of them.

const touchScreen = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

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
}

export function TypingBar({ value, onChange, onSend, placeholder, onSticker, multiline, above, fieldRef, className = '', onBlur, closed }: Props) {
  const { t } = useTranslation()
  const own = useRef<HTMLTextAreaElement & HTMLInputElement>(null)
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
    onBlur,
  }
  return (
    <form className={`typing-bar${above ? ' quoting' : ''} ${className}`} onSubmit={send}>
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
      <button type="submit" className="send-btn" aria-label={t('messages.send')} disabled={!value.trim()} tabIndex={closed ? -1 : undefined} onPointerDown={(e) => e.preventDefault()}>
        <SendIcon />
      </button>
    </form>
  )
}
