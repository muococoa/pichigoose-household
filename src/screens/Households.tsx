import { Navigate } from 'react-router-dom'
import { Screen } from '../components/Shell'
import { useDesktop } from '../lib/desktop'
import { MyHouseholds } from './MyHouseholds'

/** Desktop: My households as its own page (D8). On the phone it's the sheet from the household name. */
export function HouseholdsScreen() {
  const desktop = useDesktop()
  if (!desktop) return <Navigate to="/" replace />
  return (
    <Screen wide>
      <MyHouseholds page open onClose={() => {}} />
    </Screen>
  )
}
