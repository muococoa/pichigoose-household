import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMe } from '../auth'
import { db } from '../data/store'
import { useHousehold, useWishClaims, useWishes, type Wish } from '../data/hooks'
import { Check, DeleteLink, Hand, Sheet, Stamp, STAMP_COLORS, Struck, Tick, showUndo, tilt } from '../components/Scrapbook'
import { TypingBar } from '../components/TypingBar'
import { Linkify } from '../components/Linkify'

/**
 * A wish list on someone's profile (Nora, 29 Oct). Yours: add wishes, tick one when you get it (it moves under a
 * "Got it" stamp and stays there), tap one to add a price, a link or a note. Someone else's: tap "I'll get this"
 * to quietly claim a wish. The owner never sees who's getting what; the database doesn't show them the claims.
 */
export function WishList({ ownerId, ownerName }: { ownerId: string; ownerName: string }) {
  const { t } = useTranslation()
  const me = useMe()
  const mine = ownerId === me
  const wishes = useWishes(ownerId)
  const claims = useWishClaims(mine ? [] : wishes.rows.map((w) => w.id))
  const { people } = useHousehold()
  const [adding, setAdding] = useState('')
  const [editing, setEditing] = useState<Wish | null>(null)

  const sorted = [...wishes.rows].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
  const open = sorted.filter((w) => !w.got_at)
  const got = sorted.filter((w) => w.got_at).sort((a, b) => (b.got_at ?? '').localeCompare(a.got_at ?? ''))

  function add(name: string) {
    const top = Math.min(0, ...wishes.rows.map((w) => w.position)) - 1
    db.insert('wishes', { owner_id: me, name: name.trim(), price: null, link: null, note: null, got_at: null, position: top, created_at: new Date().toISOString() })
    setAdding('')
  }

  function claimOf(w: Wish) {
    return claims.rows.find((c) => c.wish_id === w.id)
  }

  function row(w: Wish) {
    const details = [w.price, w.note].filter(Boolean).join(' · ')
    const claim = mine ? undefined : claimOf(w)
    const by = claim && people.find((p) => p.id === claim.claimed_by)
    const text = (
      <>
        <Struck on={Boolean(w.got_at)}>{w.name}</Struck>
        {details && <div className="cap">{details}</div>}
        {w.link && (
          <div className="cap" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <Linkify text={w.link} />
          </div>
        )}
      </>
    )
    if (mine) {
      return (
        <Tick key={w.id} checked={Boolean(w.got_at)} onCommit={() => db.update('wishes', w.id, { got_at: w.got_at ? null : new Date().toISOString() })}>
          {(on, toggle) => (
            <div className={`ln${on ? ' row-done' : ''}`} style={{ minHeight: 56 }}>
              <Check checked={on} onToggle={toggle} label={w.name} rotate={tilt(w.id)} />
              <button type="button" onClick={() => setEditing(w)} style={{ flex: 1, minWidth: 0, fontSize: 17, padding: '8px 0', textAlign: 'left' }}>
                {text}
              </button>
            </div>
          )}
        </Tick>
      )
    }
    return (
      <div key={w.id} className={`ln${w.got_at ? ' row-done' : ''}`} style={{ minHeight: 56, alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 0, fontSize: 17, padding: '8px 0' }}>{text}</div>
        {!w.got_at &&
          (claim ? (
            claim.claimed_by === me ? (
              <button type="button" className="stk sec sm" style={{ transform: 'rotate(1.5deg)' }} onClick={() => db.remove('wish_claims', claim.id)} title={t('wishes.unclaim')}>
                {t('wishes.claimedByMe')}
              </button>
            ) : (
              <span className="cap" style={{ fontWeight: 700 }}>{t('wishes.claimedBy', { name: by?.display_name ?? t('common.someone') })}</span>
            )
          ) : (
            <button type="button" className="stk prim sm" style={{ transform: 'rotate(-1.5deg)' }} onClick={() => db.insert('wish_claims', { wish_id: w.id, claimed_by: me, created_at: new Date().toISOString() })}>
              {t('wishes.claim')}
            </button>
          ))}
      </div>
    )
  }

  return (
    <section style={{ alignSelf: 'stretch', marginTop: 34 }}>
      <Hand as="h2" size={34} lineHeight={36} style={{ margin: 0 }}>
        {t('wishes.title')}
      </Hand>
      {!mine && <div className="cap" style={{ marginTop: 4 }}>{t('wishes.secret', { name: ownerName })}</div>}
      <div style={{ marginTop: 10 }}>
        {open.map(row)}
        {!sorted.length && <div className="cap" style={{ fontSize: 14, padding: '4px 0 10px' }}>{t('wishes.empty')}</div>}
      </div>
      {mine && (
        <div className="typing-slot" style={{ marginTop: 8 }}>
          <TypingBar value={adding} onChange={setAdding} onSend={add} placeholder={t('wishes.add')} />
        </div>
      )}
      {got.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <Stamp color={STAMP_COLORS.locked} rotate={-2}>
            {t('wishes.got')}
          </Stamp>
          <div style={{ marginTop: 6 }}>{got.map(row)}</div>
        </div>
      )}
      {editing && <WishSheet key={editing.id} wish={editing} onClose={() => setEditing(null)} />}
    </section>
  )
}

/** Your own wish: its name, price, link and note save as you type; the trash can sits in the title row. */
function WishSheet({ wish, onClose }: { wish: Wish; onClose: () => void }) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState({ name: wish.name, price: wish.price ?? '', link: wish.link ?? '', note: wish.note ?? '' })
  function save() {
    const next = { name: draft.name.trim() || wish.name, price: draft.price.trim() || null, link: draft.link.trim() || null, note: draft.note.trim() || null }
    if (next.name !== wish.name || next.price !== wish.price || next.link !== wish.link || next.note !== wish.note) db.update('wishes', wish.id, next)
  }
  useEffect(() => {
    const timer = window.setTimeout(save, 500)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])
  function close() {
    save()
    onClose()
  }
  function remove() {
    // Held until the Undo moment passes, so a housemate's secret "I'll get this" survives an Undo too.
    const undo = db.removeWithUndo('wishes', wish.id)
    onClose()
    showUndo(t('wishes.deleted'), t('common.undo'), undo)
  }
  const field = (key: keyof typeof draft, label: string, placeholder?: string, type = 'text') => (
    <div style={{ marginTop: key === 'name' ? 0 : 14 }}>
      <label className="label" htmlFor={`wish-${key}`}>
        {label}
      </label>
      <input id={`wish-${key}`} className="input" type={type} placeholder={placeholder} value={draft[key]} enterKeyHint="done" onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()} />
    </div>
  )
  return (
    <Sheet
      open
      onClose={close}
      title={t('wishes.edit')}
    >
      {field('name', t('wishes.name'))}
      {field('price', t('wishes.price'), t('wishes.pricePlaceholder'))}
      {field('link', t('wishes.link'), 'https://', 'url')}
      {field('note', t('wishes.note'), t('wishes.notePlaceholder'))}
      <DeleteLink label={t('wishes.delete')} onClick={remove} />
    </Sheet>
  )
}
