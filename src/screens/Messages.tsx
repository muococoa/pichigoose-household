import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMe } from '../auth'
import { db } from '../data/store'
import { useHousehold, type Heart, type Message, type Profile } from '../data/hooks'
import { StickerImage } from '../components/Stickers'
import { TypingBar } from '../components/TypingBar'
import { HeartBurst, HeartButton, HeartedBy, useDoubleTap, useHeartActions, useHeartsOn } from '../components/Hearts'
import { useChats, useMarkRead, type Chat } from '../data/chats'
import { Screen } from '../components/Shell'
import { Avatar } from '../components/Avatar'
import { Stamp, STAMP_COLORS } from '../components/Scrapbook'
import { BackIcon, CloseIcon, HomeIcon, ReplyIcon } from '../components/Icons'
import { useKept } from '../lib/kept'
import { focusField } from '../lib/keyboard'
import { useDesktop } from '../lib/desktop'
import { PersonLink } from './Person'
import { useBackInApp } from '../lib/back'


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
function Bubbles({ messages, group, readByAll, onReply }: { messages: Message[]; group: boolean; readByAll: (m: Message) => boolean; onReply: (m: Message) => void }) {
  const me = useMe()
  const { people } = useHousehold()
  const { time, day } = useTimeLabels()
  const person = (id: string | null): Profile | undefined => people.find((p) => p.id === id)
  const heartsOn = useHeartsOn()
  const byId = new Map(messages.map((m) => [m.id, m]))
  const { t } = useTranslation()
  const quoteName = (q?: Message) => (!q ? '' : q.author_id === me ? t('messages.you') : (person(q.author_id)?.display_name ?? t('common.someone')))
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
                <Stamp color={STAMP_COLORS.nora} rotate={-2}>
                  {day(m.created_at)}
                </Stamp>
              </div>
            )}
            <Bubble
              m={m}
              mine={mine}
              first={first}
              lastOfRun={lastOfRun}
              group={group}
              who={who}
              time={time(m.created_at)}
              read={mine && readByAll(m)}
              hearts={heartsOn({ message_id: m.id })}
              quote={m.reply_to ? byId.get(m.reply_to) : undefined}
              quoteName={quoteName(m.reply_to ? byId.get(m.reply_to) : undefined)}
              onReply={() => onReply(m)}
            />
          </div>
        )
      })}
    </>
  )
}

/** One speech bubble. Double-tap it, or tap the small heart beside it, to heart it. Who hearted it
 *  shows on a little tag hanging under the bubble, like Instagram. Swipe it to the right to reply, like
 *  WhatsApp (on a computer: the reply arrow that shows when you point at it). */
function Bubble({ m, mine, first, lastOfRun, group, who, time, read, hearts, quote, quoteName, onReply }: { m: Message; mine: boolean; first: boolean; lastOfRun: boolean; group: boolean; who?: Profile; time: string; read: boolean; hearts: Heart[]; quote?: Message; quoteName: string; onReply: () => void }) {
  const { t } = useTranslation()
  const { add } = useHeartActions()
  const target = { message_id: m.id }
  const tap = useDoubleTap(() => add(target, hearts))
  const swipe = useSwipeToReply(onReply)
  return (
    <div id={`msg-${m.id}`} className={`msg${mine ? ' mine' : ''}${first ? ' first' : ''}${lastOfRun ? ' last' : ''}${hearts.length ? ' hearted' : ''}`} {...swipe.handlers}>
      <span className="reply-hint" style={{ opacity: Math.min(1, swipe.shift / 48), transform: `scale(${0.6 + Math.min(1, swipe.shift / 48) * 0.4})` }} aria-hidden>
        <ReplyIcon />
      </span>
      {/* Like WhatsApp: in the group chat, the avatar sits at the bottom of each run, by the bubble's tail. */}
      {group && !mine && <span className="msg-avatar">{lastOfRun && who ? <PersonLink id={who.id}><Avatar avatar={who.avatar} size={34} /></PersonLink> : null}</span>}
      <div className="bubble-wrap" style={swipe.shift ? { transform: `translateX(${swipe.shift}px)`, transition: 'none' } : undefined}>
        <div className={`bubble${m.sticker ? ' sticker' : ''}`} onClick={tap.onClick}>
          {group && !mine && first && <div className="bubble-name">{who?.display_name}</div>}
          {quote && <Quote m={quote} name={quoteName} />}
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
      <span className="msg-actions">
        <button type="button" className="reply-btn" aria-label={t('replies.reply')} title={t('replies.reply')} onClick={onReply}>
          <ReplyIcon size={16} />
        </button>
        <HeartButton target={target} hearts={hearts} size={16} />
      </span>
    </div>
  )
}

/** The message a reply answers, quoted at the top of the bubble. Tap it to jump to the message. */
function Quote({ m, name }: { m: Message; name: string }) {
  return (
    <button
      type="button"
      className="bubble-quote"
      onClick={(e) => {
        e.stopPropagation()
        const el = document.getElementById(`msg-${m.id}`)
        if (!el) return
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        el.classList.remove('flash')
        void el.offsetWidth
        el.classList.add('flash')
      }}
    >
      <b>{name}</b>
      {m.sticker ? <StickerImage name={m.sticker} size={36} /> : <span>{m.body}</span>}
    </button>
  )
}

/** Swipe a bubble to the right to reply: it follows the finger a little, the reply arrow appears, and past
 *  the line it's a reply. Vertical scrolling and the left-edge back swipe stay as they are. */
function useSwipeToReply(onReply: () => void) {
  const [shift, setShift] = useState(0)
  const drag = useRef<{ x: number; y: number; on: boolean } | null>(null)
  const handlers = {
    onTouchStart(e: React.TouchEvent) {
      const t = e.touches[0]
      drag.current = e.touches.length === 1 && t.clientX > 40 ? { x: t.clientX, y: t.clientY, on: false } : null
    },
    onTouchMove(e: React.TouchEvent) {
      const d = drag.current
      if (!d) return
      const t = e.touches[0]
      const dx = t.clientX - d.x
      const dy = Math.abs(t.clientY - d.y)
      if (!d.on) {
        if (dy > 10 && dy > Math.abs(dx)) drag.current = null
        else if (dx > 10 && dx > dy * 1.5) d.on = true
        return
      }
      // Follows the finger, slower the further it goes, like a rubber band.
      setShift(Math.max(0, Math.min(72, dx * 0.55)))
    },
    onTouchEnd() {
      const d = drag.current
      drag.current = null
      if (d?.on && shift >= 44) {
        navigator.vibrate?.(8)
        onReply()
      }
      setShift(0)
    },
  }
  return { shift, handlers: { ...handlers, onTouchCancel: handlers.onTouchEnd } }
}

/** One chat: the bubbles, with the writing field pinned under them. */
function Conversation({ chatKey, header, back }: { chatKey: string; header?: boolean; back?: boolean }) {
  const { t } = useTranslation()
  const me = useMe()
  const goBack = useBackInApp()
  const { household, name, people } = useHousehold()
  const chats = useChats()
  const chat = chats.find((c) => c.key === chatKey)
  const { household: hh } = useHousehold()
  const keep = `chat:${hh?.id}:${chatKey}`
  const [text, setText] = useKept(`${keep}:text`, '')
  // The message you're answering, by its id.
  const [replyTo, setReplyTo] = useKept<string | null>(`${keep}:reply`, null)
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

  // On a phone the field floats over the messages: they get room at the bottom for it (its height, as
  // --composer-h), and while you're at the newest message, it stays in view as the keyboard or the field moves.
  useEffect(() => {
    const bubbles = endRef.current?.closest('.chat-screen, .chat-split') ? endRef.current.parentElement : null
    const composer = fieldRef.current?.closest('.composer') as HTMLElement | null
    if (!bubbles || !composer) return
    const atEnd = () => bubbles.scrollHeight - bubbles.scrollTop - bubbles.clientHeight < 140
    let follow = 0
    // Follow for a moment while things glide (the keyboard takes about a third of a second).
    const stick = () => {
      if (!atEnd()) return
      const until = performance.now() + 600
      cancelAnimationFrame(follow)
      const step = () => {
        bubbles.scrollTop = bubbles.scrollHeight
        if (performance.now() < until) follow = requestAnimationFrame(step)
      }
      step()
    }
    const watch = new ResizeObserver(() => {
      bubbles.style.setProperty('--composer-h', `${composer.offsetHeight}px`)
      stick()
    })
    watch.observe(composer, { box: 'border-box' })
    const vv = window.visualViewport
    vv?.addEventListener('resize', stick)
    composer.addEventListener('focusin', stick)
    composer.addEventListener('focusout', stick)
    return () => {
      watch.disconnect()
      vv?.removeEventListener('resize', stick)
      composer.removeEventListener('focusin', stick)
      composer.removeEventListener('focusout', stick)
      cancelAnimationFrame(follow)
    }
  }, [chat?.key])

  if (!chat || !household) return null
  const group = chat.key === 'household'
  const title = chatName(chat, name(household))
  const members = people.map((p) => (p.id === me ? t('messages.you') : p.display_name)).join(', ')
  const replying = replyTo ? chat.messages.find((m) => m.id === replyTo) : undefined
  const replyingWho = replying ? people.find((p) => p.id === replying.author_id) : undefined

  function send(body: string) {
    if (!household) return
    db.insert('messages', { household_id: household.id, author_id: me, to_user: group ? null : chatKey, body, sticker: null, reply_to: replying ? replyTo : null, created_at: new Date().toISOString() })
    setText('')
    setReplyTo(null)
  }

  function sendSticker(sticker: string) {
    if (!household) return
    db.insert('messages', { household_id: household.id, author_id: me, to_user: group ? null : chatKey, body: '', sticker, reply_to: replying ? replyTo : null, created_at: new Date().toISOString() })
    setReplyTo(null)
  }

  function reply(m: Message) {
    setReplyTo(m.id)
    focusField(fieldRef.current)
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
          <Bubbles messages={chat.messages} group={group} readByAll={chat.readByAll} onReply={reply} />
        ) : (
          <p className="say-hi">{group ? t('messages.sayHiAll') : t('messages.sayHi', { name: title })}</p>
        )}
        <div ref={endRef} />
      </div>
      <TypingBar
        className="composer"
        multiline
        value={text}
        onChange={setText}
        onSend={send}
        onSticker={sendSticker}
        placeholder={t('messages.placeholder')}
        fieldRef={fieldRef}
        above={
          replying && (
            <div className="composer-quote">
              <span style={{ flex: 1, minWidth: 0 }}>
                <b>{replying.author_id === me ? t('replies.replyingToSelf') : t('replies.replyingTo', { name: replyingWho?.display_name ?? t('common.someone') })}</b>
                {replying.sticker ? <StickerImage name={replying.sticker} size={32} /> : <span className="composer-quote-text">{replying.body}</span>}
              </span>
              <button type="button" aria-label={t('common.cancel')} onPointerDown={(e) => e.preventDefault()} onClick={() => setReplyTo(null)}>
                <CloseIcon size={18} />
              </button>
            </div>
          )
        }
      />
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
