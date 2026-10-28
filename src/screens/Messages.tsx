import { useTranslation } from 'react-i18next'
import { Screen } from '../components/Shell'
import { EmptyState, Hand } from '../components/Scrapbook'

/** Messages: the fifth tab. The page is laid out; what goes in it comes next. */
export function MessagesScreen() {
  const { t } = useTranslation()
  return (
    <Screen tabbar>
      <div style={{ padding: 'calc(var(--top) + 10px) 22px 0 40px' }}>
        <Hand as="h1" style={{ margin: 0 }}>
          {t('messages.title')}
        </Hand>
        <EmptyState pose="honk" color="#D6C8E6" zoom={1.05} rotate={2}>
          {t('messages.soon')}
        </EmptyState>
      </div>
    </Screen>
  )
}
