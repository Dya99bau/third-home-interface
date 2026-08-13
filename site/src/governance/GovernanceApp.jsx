import { RoleProvider } from './role-context'
import Nav from './Nav'
import Home from './pages/Home'
import Governance from './pages/Governance'
import Events from './pages/Events'
import Community from './pages/Community'
import Stay from './pages/Stay'
import Studio from './pages/Studio'
import Configure from './pages/Configure'

const PAGES = {
  'gov-home': Home,
  'gov-governance': Governance,
  'gov-events': Events,
  'gov-community': Community,
  'gov-stay': Stay,
  'gov-studio': Studio,
  'gov-configure': Configure,
}

// Ported from the standalone home-app (Next.js) into a Vite route so it's
// portable as static files with no server dependency. Mirrors the original
// app/*/page.tsx set, using this app's existing mode-switching pattern
// instead of next/link routing.
export default function GovernanceApp({ mode, onNavigate }) {
  const Page = PAGES[mode] || Home

  return (
    <RoleProvider>
      <div className="gov-root">
        <Nav currentMode={mode} onNavigate={onNavigate} />
        <Page onNavigate={onNavigate} />
      </div>
    </RoleProvider>
  )
}
