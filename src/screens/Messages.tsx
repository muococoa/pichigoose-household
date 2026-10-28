import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMe } from '../auth'
import { db } from '../data/store'
import { useHousehold, type Message, type Profile } from '../data/hooks'
import { useChats, useMarkRead, type Chat } from '../data/chats'
import { Screen } from '../components/Shell'
import { Avatar } from '../components/Avatar'
import { EmptyState, Hand, Stamp, STAMP_COLORS } from '../components/Scrapbook'
import { BackIcon, HomeIcon, SendIcon } from '../components/Icons'
import { useDesktop } from '../lib/desktop'
import { PersonLink } from './Person'

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

/** WhatsApp-style list of chats: the household's group chat first, then a private chat with each person. */
function ChatList({ active }: { active?: string | null }) {
  const { t } = useTranslation()
  const me = useMe()
  const { household, name, people } = useHousehold()
  const chats = useChats()
  const { when } = useTimeLabels()
  const householdName = household ? name(household) : ''
  return (
    <div className="chat-list">
      {chats.map((c) => {
        const author = c.last && c.last.author_id !== me ? people.find((p) => p.id === c.last!.author_id) : null
        const preview = c.last
          ? `${c.last.author_id === me ? `${t('messages.you')}: ` : c.key === 'household' && author ? `${author.display_name}: ` : ''}${c.last.body}`
          : t('messages.none')
        return (
          <Link key={c.key} to={`/messages/${c.key}`} className={`chat-row${active === c.key ? ' on' : ''}`} aria-current={active === c.key ? 'page' : undefined}>
            {c.person ? <Avatar avatar={c.person.avatar} size={48} /> : <GroupAvatar />}
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="row" style={{ gap: 8 }}>
                <span className="chat-name">{chatName(c, householdName)}</span>
                <span style={{ flex: 1 }} />
                {c.last && <span className={`chat-time${c.unread ? ' unread' : ''}`}>{when(c.last.created_at)}</span>}
              </span>
              <span className="row" style={{ gap: 8, marginTop: 2 }}>
                <span className="chat-preview">{preview}</span>
                {c.unread > 0 && (
                  <span className="unread-badge" aria-label={t('messages.unread', { count: c.unread })}>
                    {c.unread}
                  </span>
                )}
              </span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}

/** Speech bubbles grouped into runs: the same person, the same day, a few minutes apart. */
function Bubbles({ messages, group }: { messages: Message[]; group: boolean }) {
  const me = useMe()
  const { people } = useHousehold()
  const { time, day } = useTimeLabels()
  const person = (id: string | null): Profile | undefined => people.find((p) => p.id === id)
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
            <div className={`msg${mine ? ' mine' : ''}${first ? ' first' : ''}`}>
              {/* In the group chat, other people's runs carry their avatar at the bottom. */}
              {group && !mine && <span className="msg-avatar">{lastOfRun && who ? <PersonLink id={who.id}><Avatar avatar={who.avatar} size={30} /></PersonLink> : null}</span>}
              <div className="bubble">
                {group && !mine && first && <div className="bubble-name">{who?.display_name}</div>}
                <span className="bubble-text">{m.body}</span>
                <span className="bubble-time">{time(m.created_at)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </>
  )
}

/** One chat: the bubbles, with the writing field pinned under them. */
function Conversation({ chatKey, header }: { chatKey: string; header?: boolean }) {
  const { t } = useTranslation()
  const me = useMe()
  const navigate = useNavigate()
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
    db.insert('messages', { household_id: household.id, author_id: me, to_user: group ? null : chatKey, body, created_at: new Date().toISOString() })
    setText('')
    fieldRef.current?.focus()
  }

  function key(e: KeyboardEvent<HTMLTextAreaElement>) {
    // On a computer, Enter sends and Shift+Enter starts a new line. On a phone, Return is a new line, like WhatsApp.
    if (!touchScreen && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="conversation">
      {header && (
        <div className="chat-header">
          <button type="button" className="chat-back" aria-label={t('common.back')} onClick={() => navigate('/messages')}>
            <BackIcon />
          </button>
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
          <Bubbles messages={chat.messages} group={group} />
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
        <button type="submit" className="stk violet round" aria-label={t('messages.send')} disabled={!text.trim()} onPointerDown={(e) => e.preventDefault()}>
          <SendIcon />
        </button>
      </form>
      {/* On an iPhone the keyboard covers the page; this keeps the newest message above it. */}
      <div className="kb-spacer" />
    </div>
  )
}

/** Desktop: the chat list on the left, the open chat on the right. */
function Split({ chatKey }: { chatKey: string | null }) {
  const { t } = useTranslation()
  return (
    <Screen wide>
      <div className="chat-split">
        <div className="chat-split-list">
          <Hand as="h1" style={{ margin: '0 0 14px' }}>
            {t('messages.title')}
          </Hand>
          <ChatList active={chatKey} />
        </div>
        <div className="chat-split-main">
          {chatKey ? (
            <Conversation key={chatKey} chatKey={chatKey} header />
          ) : (
            <EmptyState pose="honk" color="#D6C8E6" zoom={1.05} rotate={2}>
              {t('messages.pick')}
            </EmptyState>
          )}
        </div>
      </div>
    </Screen>
  )
}

/** The Messages tab: the list of chats. */
export function MessagesScreen() {
  const { t } = useTranslation()
  const desktop = useDesktop()
  if (desktop) return <Split chatKey={null} />
  return (
    <Screen tabbar>
      <div style={{ padding: 'calc(var(--top) + 10px) 22px 0 40px' }}>
        <Hand as="h1" style={{ margin: '0 0 14px' }}>
          {t('messages.title')}
        </Hand>
        <ChatList />
      </div>
    </Screen>
  )
}

/** One open chat. On a phone it takes the whole screen, like WhatsApp. */
export function ChatScreen() {
  const { chat } = useParams()
  const desktop = useDesktop()
  if (desktop) return <Split chatKey={chat ?? null} />
  return (
    <Screen className="chat-screen">
      <Conversation chatKey={chat ?? 'household'} header />
    </Screen>
  )
}
