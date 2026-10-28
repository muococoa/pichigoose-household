import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useHousehold } from '../data/hooks'
import { Screen } from '../components/Shell'
import { Hand, PichiPolaroid, Tape } from '../components/Scrapbook'
import { copyText, joinLink, shareAddress } from '../lib/share'

export function HouseholdCreatedScreen() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { households, name } = useHousehold()
  const household = households.find((h) => h.id === id) ?? null

  return (
    <Screen>
      <div className="pad top" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: 'calc(var(--bottom) + 32px)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
          <PichiPolaroid width={120} rotate={3} tape="tm" />
        </div>
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Hand as="h1" size={40} style={{ margin: 0 }}>
            {t('created.title', { name: name(household) })}
          </Hand>
          <p className="body" style={{ margin: '8px 0 0' }}>
            {t('created.intro')}
          </p>
        </div>

        <div className="note n-mist" style={{ marginTop: 28, transform: 'rotate(-1deg)', textAlign: 'center' }}>
          <Tape kind="tblocks" style={{ top: -10, left: '50%', marginLeft: -42, transform: 'rotate(-2deg)' }} />
          <div className="cap" style={{ textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 800 }}>
            {t('created.addressLabel')}
          </div>
          <div style={{ fontSize: 24, lineHeight: '32px', fontWeight: 800, color: '#1E1A30', margin: '6px 0 14px', wordBreak: 'break-word' }}>
            {household?.address ?? '...'}
          </div>
          <div className="cap" style={{ textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 800 }}>
            {t('created.secretLabel')}
          </div>
          <div style={{ fontSize: 20, lineHeight: '28px', fontWeight: 800, color: '#1E1A30', margin: '4px 0 14px', wordBreak: 'break-word' }}>
            {household?.secret ?? '...'}
          </div>
          <div className="row" style={{ gap: 12, position: 'relative', zIndex: 1 }}>
            <button
              type="button"
              className="stk sec sm"
              style={{ flex: 1, transform: 'rotate(-1.5deg)' }}
              disabled={!household}
              onClick={() => household && copyText(joinLink(household), t('common.copied'))}
            >
              {t('created.copy')}
            </button>
            <button
              type="button"
              className="stk prim sm"
              style={{ flex: 1.3, transform: 'rotate(1deg)' }}
              disabled={!household}
              onClick={() =>
                household && shareAddress(household, t('created.shareText', { link: joinLink(household) }), t('common.copied'))
              }
            >
              {t('created.send')}
            </button>
          </div>
        </div>
        <p className="cap" style={{ textAlign: 'center', margin: '16px 0 0' }}>
          {t('created.unique')}
        </p>

        <div style={{ flex: 1, minHeight: 32 }} />
        <button type="button" className="stk sec" style={{ width: '100%', transform: 'rotate(-.8deg)' }} onClick={() => navigate('/', { replace: true })}>
          {t('created.goHome')}
        </button>
      </div>
    </Screen>
  )
}
