import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMe } from '../auth'
import { db } from '../data/store'
import { useHousehold, type Heart, type Message, type Profile } from '../data/hooks'
import { StickerButton, StickerImage } from '../components/Stickers'
import { HeartBurst, HeartButton, HeartedBy, useDoubleTap, useHeartActions, useHeartsOn } from '../components/Hearts'
import { useChats, useMarkRead, type Chat } from '../data/chats'
import { Screen } from '../components/Shell'
import { Avatar } from '../components/Avatar'
import { Stamp, STAMP_COLORS } from '../components/Scrapbook'
import { BackIcon, HomeIcon, SendIcon } from '../components/Icons'
import { useDesktop } from '../lib/desktop'
import { PersonLink } from './Person'
import { useBackInApp } from '../lib/back'

const touchScreen = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

function useTimeLabels() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const time = (iso: string) => new Intl.DateTimeFormat(lang, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
  const day = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    if (sameDay(d, now)) return t('messages.today')
    if (sameDay(d, yesterday)) return t('messages.yesterday')
    if (now.getTime() - d.getTime() < 6 * 86400000) return new Intl.DateTimeFormat(lang, { weekday: 'long' }).format(d)
    return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' }).format(d)
  }
  // In the chat list: the time for today, otherwise the day.
  const when = (iso: string) => (sameDay(new Date(iso), new Date()) ? time(iso) : day(iso))
  return { time, day, when }
}

/** The group chat's picture: the house on lilac. */
function GroupAvatar({ size = 48 }: { size?: number }) {
  return (
    <span className="group-avatar" style={{ width: size, height: size }} aria-hidden>
      <HomeIcon size={Math.round(size * 0.55)} />
    </span>
  )
}

function chatName(chat: Chat, householdName: string) {
  return chat.person ? chat.person.display_name : householdName
}

function Ticks({ read }: { read: boolean }) {
  const { t } = useTranslation()
  return (
    <svg className={`ticks${read ? ' read' : ''}`} viewBox="0 0 20 12" width="18" height="11" role="img" aria-label={read ? t('messages.read') : t('messages.sent')}>
      <path d="M1.5 6.6 4.6 9.6 10.6 2.6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      {read && <path d="M8.2 9.3 8.6 9.6 14.6 2.6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  )
}

/** Speech bubbles grouped into runs: the same person, the same day, a few minutes apart. */
function Bubbles({ messages, group, readByAll }: { messages: Message[]; group: boolean; readByAll: (m: Message) => boolean }) {
  const me = useMe()
  const { people } = useHousehold()
  const { time, day } = useTimeLabels()
  const person = (id: string | null): Profile | undefined => people.find((p) => p.id === id)
  const heartsOn = useHeartsOn()
  return (
    <>
      {messages.map((m, i) => {
        const prev = messages[i - 1]
        const next = messages[i + 1]
        const newDay = !prev || !sameDay(new Date(prev.created_at), new Date(m.created_at))
        const near = (a?: Message, b?: Message) =>
          Boolean(a && b && a.author_id === b.author_id && sameDay(new Date(a.created_at), new Date(b.created_at)) && Math.abs(new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) < 3 * 60000)
        const first = !near(prev, m)
        const lastOfRun = !near(m, next)
        const mine = m.author_id === me
        const who = person(m.author_id)
        return (
          <div key={m.id}>
            {newDay && (
              <div className="day-stamp">
                <Stamp color={STAMP_COLORS.open} rotate={-2}>
                  {day(m.created_at)}
                </Stamp>
              </div>
            )}
            <Bubble m={m} mine={mine} first={first} lastOfRun={lastOfRun} group={group} who={who} time={time(m.created_at)} read={mine && readByAll(m)} hearts={heartsOn({ message_id: m.id })} />
          </div>
        )
      })}
    </>
  )
}

/** One speech bubble. Double-tap it, or tap the small heart beside it, to heart it. Who hearted it
 *  shows on a little tag hanging under the bubble, like Instagram. */
function Bubble({ m, mine, first, lastOfRun, group, who, time, read, hearts }: { m: Message; mine: boolean; first: boolean; lastOfRun: boolean; group: boolean; who?: Profile; time: string; read: boolean; hearts: Heart[] }) {
  const { add } = useHeartActions()
  const target = { message_id: m.id }
  const tap = useDoubleTap(() => add(target, hearts))
  return (
    <div className={`msg${mine ? ' mine' : ''}${first ? ' first' : ''}${lastOfRun ? ' last' : ''}${hearts.length ? ' hearted' : ''}`}>
      {/* Like WhatsApp: in the group chat, the avatar sits at the bottom of each run, by the bubble's tail. */}
      {group && !mine && <span className="msg-avatar">{lastOfRun && who ? <PersonLink id={who.id}><Avatar avatar={who.avatar} size={34} /></PersonLink> : null}</span>}
      <div className="bubble-wrap">
        <div className={`bubble${m.sticker ? ' sticker' : ''}`} onClick={tap.onClick}>
          {group && !mine && first && <div className="bubble-name">{who?.display_name}</div>}
          {m.sticker ? <StickerImage name={m.sticker} size={128} /> : <span className="bubble-text">{m.body}</span>}
          <span className="bubble-time">
            {time}
            {/* One tick when sent, two once everyone else has read it. */}
            {mine && <Ticks read={read} />}
          </span>
          <HeartBurst burst={tap.burst} />
        </div>
        <HeartedBy hearts={hearts} className="under-bubble" />
      </div>
      <HeartButton target={target} hearts={hearts} size={16} />
    </div>
  )
}

/** One chat: the bubbles, with the writing field pinned under them. */
function Conversation({ chatKey, header, back }: { chatKey: string; header?: boolean; back?: boolean }) {
  const { t } = useTranslation()
  const me = useMe()
  const goBack = useBackInApp()
  const { household, name, people } = useHousehold()
  const chats = useChats()
  const chat = chats.find((c) => c.key === chatKey)
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const fieldRef = useRef<HTMLTextAreaElement>(null)
  const count = chat?.messages.length ?? 0
  useMarkRead(chat ? chatKey : null, count)

  // Open at the newest message, and follow new ones as they arrive.
  const first = useRef(true)
  useLayoutEffect(() => {
    // Desktop scrolls the bubbles; a phone scrolls the whole page.
    const bubbles = endRef.current?.parentElement
    const scroller = bubbles && bubbles.scrollHeight > bubbles.clientHeight ? bubbles : (endRef.current?.closest('.scroll') as HTMLElement | null)
    scroller?.scrollTo({ top: scroller.scrollHeight, behavior: first.current ? 'auto' : 'smooth' })
    first.current = false
  }, [count])

  // When the keyboard opens, the typing area grows down there (its paper reaches behind the keyboard).
  // Scroll along by the same amount, so the newest messages stay in view instead of hiding, like WhatsApp.
  useEffect(() => {
    // On a phone only the messages scroll; the field sits under them.
    const scroller = endRef.current?.closest('.chat-screen') ? endRef.current.parentElement : null
    const composer = fieldRef.current?.closest('.composer') as HTMLElement | null
    if (!scroller || !composer) return
    let last = composer.offsetHeight
    const watch = new ResizeObserver(() => {
      const now = composer.offsetHeight
      if (now > last) scroller.scrollTop += now - last
      last = now
    })
    // The border box: the typing area grows by its padding.
    watch.observe(composer, { box: 'border-box' })
    return () => watch.disconnect()
  }, [chat?.key])

  // The field grows with the text, up to five lines.
  useLayoutEffect(() => {
    const el = fieldRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }, [text])

  useEffect(() => setText(''), [chatKey])

  if (!chat || !household) return null
  const group = chat.key === 'household'
  const title = chatName(chat, name(household))
  const members = people.map((p) => (p.id === me ? t('messages.you') : p.display_name)).join(', ')

  function send(e?: FormEvent) {
    e?.preventDefault()
    const body = text.trim()
    if (!body || !household) return
    db.insert('messages', { household_id: household.id, author_id: me, to_user: group ? null : chatKey, body, sticker: null, created_at: new Date().toISOString() })
    setText('')
    fieldRef.current?.focus()
  }

  function sendSticker(sticker: string) {
    if (!household) return
    db.insert('messages', { household_id: household.id, author_id: me, to_user: group ? null : chatKey, body: '', sticker, created_at: new Date().toISOString() })
  }

  function key(e: KeyboardEvent<HTMLTextAreaElement>) {
    // On a computer, Enter sends and Shift+Enter starts a new line. On a phone, Return is a new line, like WhatsApp.
    if (!touchScreen && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    // No pull to refresh in a chat: pulling here just bounces the messages.
    <div className="conversation" data-nobounce>
      {header && (
        <div className="chat-header">
          {back && (
            <button type="button" className="chat-back" aria-label={t('common.back')} onClick={goBack}>
              <BackIcon />
            </button>
          )}
          {chat.person ? (
            <PersonLink id={chat.person.id}>
              <Avatar avatar={chat.person.avatar} size={38} />
            </PersonLink>
          ) : (
            <GroupAvatar size={38} />
          )}
          <span style={{ minWidth: 0 }}>
            <span className="chat-name" style={{ display: 'block' }}>{title}</span>
            {group && <span className="chat-preview" style={{ display: 'block' }}>{members}</span>}
          </span>
        </div>
      )}
      <div className="bubbles">
        {chat.messages.length ? (
          <Bubbles messages={chat.messages} group={group} readByAll={chat.readByAll} />
        ) : (
          <p className="say-hi">{group ? t('messages.sayHiAll') : t('messages.sayHi', { name: title })}</p>
        )}
        <div ref={endRef} />
      </div>
      <form className="composer" onSubmit={send}>
        <textarea
          ref={fieldRef}
          className="input"
          rows={1}
          placeholder={t('messages.placeholder')}
          aria-label={t('messages.placeholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={key}
        />
        <StickerButton onSend={sendSticker} />
        <button type="submit" className="send-btn" aria-label={t('messages.send')} disabled={!text.trim()} onPointerDown={(e) => e.preventDefault()}>
          <SendIcon />
        </button>
      </form>
      {/* On an iPhone the keyboard covers the page; this keeps the newest message above it. */}
      <div className="kb-spacer" />
    </div>
  )
}

/** The Messages tab: the household's chat, for everyone in it. (Private chats and groups can come later.) */
export function MessagesScreen() {
  const desktop = useDesktop()
  if (desktop) {
    return (
      <Screen wide>
        <div className="chat-split">
          <div className="chat-split-main">
            <Conversation chatKey="household" header />
          </div>
        </div>
      </Screen>
    )
  }
  return (
    // On a phone the chat takes the whole screen, like WhatsApp: no bottom menu until you go back.
    <Screen className="chat-screen">
      <Conversation chatKey="household" header back />
    </Screen>
  )
}

/** A private chat with one person, opened from their profile (households of three or more). */
export function ChatScreen() {
  const { chat } = useParams()
  const desktop = useDesktop()
  const { people } = useHousehold()
  if (!chat || chat === 'household' || (people.length && !people.some((p) => p.id === chat))) return <Navigate to="/messages" replace />
  if (desktop) {
    return (
      <Screen wide>
        <div className="chat-split">
          <div className="chat-split-main">
            <Conversation key={chat} chatKey={chat} header />
          </div>
        </div>
      </Screen>
    )
  }
  return (
    <Screen className="chat-screen">
      <Conversation key={chat} chatKey={chat} header back />
    </Screen>
  )
}
