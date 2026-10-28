import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useHousehold, useMyProfile } from '../data/hooks'
import { Avatar } from './Avatar'
import { Hand, Tape } from './Scrapbook'
import { BasketIcon, ChevronDown, HomeIcon, NoteIcon, PlusIcon, TodoIcon } from './Icons'
import { AddSheet } from '../screens/AddSheet'
import logo from '../../assets/logo-pichigoose.png'

/** Desktop: the sidebar replaces the bottom tab bar. Its own sheet of paper, taped at the top. */
export function Sidebar() {
  const { t } = useTranslation()
  const profile = useMyProfile()
  const { household, people, name } = useHousehold()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)

  // Money comes in phase 3 and stays hidden until then.
  const tabs = [
    { to: '/', label: t('tabs.home'), icon: <HomeIcon /> },
    { to: '/shopping', label: t('tabs.shopping'), icon: <BasketIcon /> },
    { to: '/todos', label: t('tabs.todos'), icon: <TodoIcon /> },
    { to: '/notes', label: t('tabs.notes'), icon: <NoteIcon /> },
  ]

  return (
    <aside className="side">
      <Tape kind="tdots" style={{ top: -10, left: 86, width: 92, transform: 'rotate(-3deg)' }} />
      <Link to="/" style={{ display: 'block' }}>
        <img src={logo} alt="Pichigoose" style={{ width: 150, height: 'auto', display: 'block', margin: '6px 0 0 6px' }} />
      </Link>
      <button type="button" className="hhbox" onClick={() => navigate('/households')} aria-label={t('home.switch')}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#1E1A30', minWidth: 0 }}>
          <Hand size={34} lineHeight={36}>
            {household ? name(household) : ''}
          </Hand>
          <ChevronDown />
        </span>
        <span className="cap">
          {household?.address} · {t('common.people', { count: people.length })}
        </span>
      </button>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative', zIndex: 0 }}>
        {tabs.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} className={({ isActive }) => `nav${isActive ? ' on' : ''}`}>
            {tab.icon}
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
      <button type="button" className="stk prim" style={{ alignSelf: 'flex-start', transform: 'rotate(-2deg)' }} onClick={() => setAdding(true)}>
        <PlusIcon size={20} />
        {t('home.add')}
      </button>
      <div style={{ flex: 1 }} />
      <Link to="/settings" className="row" style={{ gap: 12, padding: '6px 4px' }}>
        <Avatar avatar={profile?.avatar} size={40} />
        <span style={{ fontSize: 15, fontWeight: 800, color: '#1E1A30', lineHeight: '19px' }}>
          {profile?.display_name}
          <span className="cap" style={{ display: 'block', fontWeight: 600 }}>
            {t('home.profile')}
          </span>
        </span>
      </Link>
      <AddSheet open={adding} onClose={() => setAdding(false)} />
    </aside>
  )
}
