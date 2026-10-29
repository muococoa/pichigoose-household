import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useHousehold, useItemsIn, useLists, usePantry } from '../data/hooks'
import { Screen } from '../components/Shell'
import { Hand, PoseStamp, Tape } from '../components/Scrapbook'
import { groupLow, groupThings } from '../components/Shelves'
import { BackIcon } from '../components/Icons'
import { useBackInApp } from '../lib/back'

/**
 * Pichi's profile, like anyone's (Nora, 29 Oct): her painting big, what she's done in this household, and the way to
 * the About page. Opens from her stamp on Home and her little avatar on the things she put on the list.
 */
export function PichiProfileScreen() {
  const { t } = useTranslation()
  const back = useBackInApp()
  const { household } = useHousehold()
  const hid = household?.id ?? null
  const lists = useLists(hid)
  const items = useItemsIn(lists.rows.map((l) => l.id))
  const pantry = usePantry(hid)

  const hers = items.rows.filter((x) => x.added_by_pichi)
  const stats = [
    { key: 'person.itemsAdded', n: hers.length, note: 'n-butter' },
    { key: 'person.itemsBought', n: hers.filter((x) => x.checked_at).length, note: 'n-mist' },
    { key: 'pichi.watching', n: groupThings(pantry.rows).length, note: 'n-sage' },
    { key: 'pichi.low', n: groupThings(pantry.rows).filter((g) => groupLow(g.rows)).length, note: 'n-blush' },
  ]

  return (
    <Screen center>
      <div style={{ padding: 'calc(var(--top) + 8px) 22px 32px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="row" style={{ alignSelf: 'stretch', marginLeft: -10 }}>
          <button type="button" aria-label={t('common.back')} onClick={back} style={{ display: 'flex', color: '#1E1A30' }}>
            <BackIcon />
          </button>
        </div>
        <PoseStamp pose="honk" color="#F8E6A8" width={180} height={216} rotate={-4} style={{ marginTop: 10 }} />
        <Hand as="h1" size={48} lineHeight={52} style={{ margin: '22px 0 0', textAlign: 'center' }}>
          Pichi
        </Hand>
        <Link to="/about" className="stk sec" style={{ marginTop: 18, transform: 'rotate(-1.5deg)' }}>
          {t('pichi.about')}
        </Link>
        <div className="person-stats">
          {stats.map((x, i) => (
            <div key={x.key} className={`note ${x.note}`} style={{ transform: `rotate(${[-1.5, 1.2, 1, -1][i]}deg)` }}>
              <Hand size={40} lineHeight={42}>
                {String(x.n)}
              </Hand>
              <div className="cap" style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                {t(x.key)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Screen>
  )
}

// The About page: who Pichi is, why the app exists and who made it. Public at /about, and from Pichi's profile.
// The story is Nora's (29 Oct); the text lives in the language files under "pichi".
const PARTS = [
  { key: 'who', note: 'n-butter', tape: 'tdots', rotate: -0.8, tapeStyle: { top: -10, left: 30, transform: 'rotate(-4deg)' } },
  { key: 'why', note: 'n-mint', tape: 'tb', rotate: 0.7, tapeStyle: { top: -10, right: 36, transform: 'rotate(4deg)' } },
  { key: 'us', note: 'n-blush', tape: 'tcheck', rotate: -0.5, tapeStyle: { top: -10, left: '35%', transform: 'rotate(2deg)' } },
] as const

export function AboutScreen() {
  const { t } = useTranslation()
  const back = useBackInApp()
  // Its own name in the browser tab and in search results.
  useEffect(() => {
    const before = document.title
    document.title = t('pichi.pageTitle')
    return () => {
      document.title = before
    }
  }, [t])
  return (
    <Screen>
      <div style={{ padding: 'calc(var(--top) + 8px) 22px 28px 40px', maxWidth: 640 }}>
        <div className="row" style={{ gap: 6, marginLeft: -10 }}>
          <button type="button" aria-label={t('common.back')} onClick={back} style={{ display: 'flex', color: '#1E1A30' }}>
            <BackIcon />
          </button>
          <Hand as="h1" style={{ margin: 0 }}>
            {t('pichi.title')}
          </Hand>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '22px 0 30px' }}>
          <PoseStamp pose="honk" color="#F8E6A8" width={150} height={180} rotate={-4} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
          {PARTS.map((p) => (
            <section key={p.key} className={`note ${p.note}`} style={{ transform: `rotate(${p.rotate}deg)` }}>
              <Tape kind={p.tape} style={p.tapeStyle} />
              {/* Hand keeps its own margin (for the ink), so the space under the title sits on a wrapper. */}
              <div style={{ marginBottom: 14 }}>
                <Hand as="h2" size={36}>
                  {t(`pichi.${p.key}Title`)}
                </Hand>
              </div>
              {(t(`pichi.${p.key}`, { returnObjects: true }) as string[]).map((line, i) => (
                <p key={i} style={{ margin: i ? '10px 0 0' : 0, fontSize: 16, lineHeight: 1.5 }}>
                  {line}
                </p>
              ))}
            </section>
          ))}
        </div>

        <p className="cap" style={{ textAlign: 'center', margin: '34px 0 0', fontSize: 13 }}>
          {t('pichi.footer')}
        </p>
      </div>
    </Screen>
  )
}
