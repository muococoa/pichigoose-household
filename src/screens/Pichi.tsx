import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Screen } from '../components/Shell'
import { Hand, PoseStamp, Tape } from '../components/Scrapbook'
import { BackIcon } from '../components/Icons'
import { useBackInApp } from '../lib/back'

// Pichi's page: who she is, why the app exists and who made it. Opens from Pichi's stamp on Home.
// The story is Nora's (29 Oct); the text lives in the language files under "pichi".
const PARTS = [
  { key: 'who', note: 'n-butter', tape: 'tdots', rotate: -0.8, tapeStyle: { top: -10, left: 30, transform: 'rotate(-4deg)' } },
  { key: 'why', note: 'n-mint', tape: 'tb', rotate: 0.7, tapeStyle: { top: -10, right: 36, transform: 'rotate(4deg)' } },
  { key: 'us', note: 'n-blush', tape: 'tcheck', rotate: -0.5, tapeStyle: { top: -10, left: '35%', transform: 'rotate(2deg)' } },
] as const

export function PichiScreen() {
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
