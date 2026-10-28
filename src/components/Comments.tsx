import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useMe } from '../auth'
import { db } from '../data/store'
import { useComments, useHousehold, type Comment } from '../data/hooks'
import { ago } from '../lib/time'
import { Avatar } from './Avatar'
import { CloseIcon } from './Icons'

/** What a comment is about: one shopping item, to-do or note. */
export type CommentTarget = { item_id: string } | { todo_id: string } | { note_id: string }

function about(c: Comment, target: CommentTarget) {
  if ('item_id' in target) return c.item_id === target.item_id
  if ('todo_id' in target) return c.todo_id === target.todo_id
  return c.note_id === target.note_id
}

/** How many comments each item, to-do and note has, for the little speech bubbles on the lists. */
export function useCommentCounts() {
  const { household } = useHousehold()
  const comments = useComments(household?.id ?? null)
  return useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of comments.rows) {
      const id = c.item_id ?? c.todo_id ?? c.note_id
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    return (id: string) => counts.get(id) ?? 0
  }, [comments.rows])
}

/** A small speech bubble with the number of comments, next to an item's name. */
export function CommentCount({ n }: { n: number }) {
  const { t } = useTranslation()
  if (!n) return null
  return (
    <span className="comment-count" aria-label={t('comments.count', { count: n })} title={t('comments.count', { count: n })}>
      <svg viewBox="0 0 20 18" width="16" height="15" aria-hidden>
        <path d="M3.5 2.5h13a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H9l-4.2 3.2v-3.2H3.5a2 2 0 0 1-2-2V4.5a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
      {n}
    </span>
  )
}

/** The conversation under an item, to-do or note: flat, like a chat. Everyone in the household
 *  can write; you can delete your own. Works offline and sends when there's signal. */
export function Comments({ target }: { target: CommentTarget }) {
  const { t, i18n } = useTranslation()
  const me = useMe()
  const { household, people } = useHousehold()
  const comments = useComments(household?.id ?? null)
  const [text, setText] = useState('')

  const thread = useMemo(
    () => comments.rows.filter((c) => about(c, target)).sort((a, b) => a.created_at.localeCompare(b.created_at)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [comments.rows, JSON.stringify(target)],
  )

  function send(e: FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body || !household) return
    db.insert('comments', {
      household_id: household.id,
      item_id: null,
      todo_id: null,
      note_id: null,
      ...target,
      author_id: me,
      body,
      created_at: new Date().toISOString(),
    })
    setText('')
  }

  return (
    <section className="comments" aria-label={t('comments.title')}>
      <span className="label">{t('comments.title')}</span>
      {thread.map((c) => {
        const who = people.find((p) => p.id === c.author_id)
        return (
          <div key={c.id} className="comment">
            <Avatar avatar={who?.avatar} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="cap" style={{ fontSize: 13 }}>
                <b style={{ color: '#1E1A30', fontWeight: 800 }}>{who?.display_name ?? t('common.someone')}</b> · {ago(c.created_at, i18n.language)}
              </div>
              <div className="comment-body">{c.body}</div>
            </div>
            {c.author_id === me && (
              <button type="button" className="comment-delete" aria-label={t('common.delete')} onClick={() => db.remove('comments', c.id)}>
                <CloseIcon size={16} />
              </button>
            )}
          </div>
        )
      })}
      <form onSubmit={send} className="row" style={{ gap: 10, marginTop: thread.length ? 4 : 0 }}>
        <input
          className="input"
          style={{ flex: 1, height: 46 }}
          placeholder={t('comments.placeholder')}
          aria-label={t('comments.placeholder')}
          value={text}
          enterKeyHint="send"
          onChange={(e) => setText(e.target.value)}
        />
        {/* People get the violet sticker. */}
        <button type="submit" className="stk violet sm" style={{ height: 44, transform: 'rotate(-2deg)' }} disabled={!text.trim()}>
          {t('comments.send')}
        </button>
      </form>
    </section>
  )
}
