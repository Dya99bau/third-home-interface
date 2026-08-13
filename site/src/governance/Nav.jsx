import { useRole } from './role-context'
import { roleConfig } from './data'
import { cn } from './utils'

const links = [
  { mode: 'gov-home', label: 'Home' },
  { mode: 'gov-governance', label: 'Governance' },
  { mode: 'gov-events', label: 'Events' },
  { mode: 'gov-stay', label: 'Stay' },
  { mode: 'gov-community', label: 'Community' },
  { mode: 'gov-studio', label: 'Open Studio' },
  { mode: 'gov-configure', label: 'Configure' },
  // "3D Model" used to iframe a separate stale static viewer build --
  // now it just switches to the real one already in this app.
  { mode: 'viewer', label: '3D Model' },
]

export default function Nav({ currentMode, onNavigate }) {
  const { role, setRole } = useRole()

  return (
    <header style={{ borderBottom: '1px solid var(--sand-dark)', background: 'var(--cream)' }}>
      <style>{`
        @keyframes th-pulse {
          0%,100% {
            text-shadow:
              0 0 4px rgba(197,96,59,0.6),
              0 0 12px rgba(197,96,59,0.3),
              0 0 24px rgba(197,96,59,0.15);
            letter-spacing: 0.02em;
          }
          50% {
            text-shadow:
              0 0 8px rgba(197,96,59,1),
              0 0 22px rgba(197,96,59,0.7),
              0 0 42px rgba(232,140,80,0.45),
              0 0 70px rgba(232,140,80,0.2);
            letter-spacing: 0.04em;
          }
        }
        .th-logo {
          animation: th-pulse 3s ease-in-out infinite;
          color: var(--terracotta);
          font-family: Georgia, serif;
          font-size: 1.5rem;
          font-weight: 700;
          text-decoration: none;
          display: inline-block;
          background: none;
          border: none;
          cursor: pointer;
        }
      `}</style>
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
        {/* Logo -- exits back to the main site (booking / model view) */}
        <button onClick={() => onNavigate('editor')} className="th-logo">
          Third Home
        </button>

        {/* Links */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <button
              key={l.mode}
              onClick={() => onNavigate(l.mode)}
              className={cn(
                'text-sm transition-colors bg-transparent border-none cursor-pointer',
                currentMode === l.mode ? 'font-semibold' : 'opacity-60 hover:opacity-100'
              )}
              style={{ color: 'var(--warm-brown)' }}
            >
              {l.label}
            </button>
          ))}
        </nav>

        {/* Role switcher */}
        <div className="flex items-center gap-1 rounded-full p-1" style={{ background: 'var(--sand)' }}>
          {['guest', 'member', 'keeper'].map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-all',
                role === r ? roleConfig[r].color + ' shadow-sm' : 'opacity-50 hover:opacity-80'
              )}
            >
              {roleConfig[r].label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex gap-4 px-6 pb-3 overflow-x-auto">
        {links.map((l) => (
          <button
            key={l.mode}
            onClick={() => onNavigate(l.mode)}
            className={cn(
              'text-sm whitespace-nowrap bg-transparent border-none cursor-pointer',
              currentMode === l.mode ? 'font-semibold' : 'opacity-60'
            )}
            style={{ color: 'var(--warm-brown)' }}
          >
            {l.label}
          </button>
        ))}
      </div>
    </header>
  )
}
