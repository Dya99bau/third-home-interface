import { useRole } from '../role-context'
import { roleConfig, events, proposals, bedSpaces } from '../data'

export default function Home({ onNavigate }) {
  const { role } = useRole()
  const cfg = roleConfig[role]
  const nextEvents = events.slice(0, 3)
  const openProposals = proposals.filter((p) => p.status === 'open').length
  const availableBeds = bedSpaces.filter((b) => b.available).length

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Hero */}
      <section className="mb-16">
        <div className="mb-4">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
            Viewing as {cfg.label}
          </span>
        </div>
        <h1 className="text-5xl font-bold mb-4 leading-tight" style={{ color: 'var(--warm-brown)' }}>
          A place to stay.<br />A community to belong to.
        </h1>
        <p className="text-lg max-w-2xl mb-8" style={{ color: 'var(--muted)' }}>
          HOME is a collectively-owned living space in Wolfsburg — for commuters, newcomers, and
          long-term residents. Run by the people who live here.
        </p>
        <div className="flex gap-4 flex-wrap">
          <button
            onClick={() => onNavigate('gov-stay')}
            className="px-6 py-3 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--terracotta)' }}
          >
            Book a space
          </button>
          <button
            onClick={() => onNavigate('gov-governance')}
            className="px-6 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'var(--sand)', color: 'var(--warm-brown)' }}
          >
            How it works
          </button>
        </div>
      </section>

      {/* Status bar */}
      <section className="grid grid-cols-3 gap-4 mb-16">
        {[
          { label: 'Beds available tonight', value: availableBeds, mode: 'gov-stay', color: 'var(--terracotta)' },
          { label: 'Open proposals', value: openProposals, mode: 'gov-governance', color: 'var(--olive)' },
          { label: 'Events this week', value: nextEvents.length, mode: 'gov-events', color: 'var(--muted)' },
        ].map((s) => (
          <button
            key={s.label}
            onClick={() => onNavigate(s.mode)}
            className="rounded-2xl p-6 transition-opacity hover:opacity-90 text-left"
            style={{ background: 'var(--sand)' }}
          >
            <div className="text-4xl font-bold mb-1" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>{s.label}</div>
          </button>
        ))}
      </section>

      {/* Three circles */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--warm-brown)' }}>Three ways to be here</h2>
        <p className="mb-8 text-sm" style={{ color: 'var(--muted)' }}>
          The deeper in, the less you pay in money — but the more you give in time.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {['guest', 'member', 'keeper'].map((r) => {
            const c = roleConfig[r]
            return (
              <div
                key={r}
                className="rounded-2xl p-6 border-2 transition-all"
                style={{
                  borderColor: role === r ? 'var(--terracotta)' : 'transparent',
                  background: 'var(--sand)',
                }}
              >
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 ${c.color}`}>
                  {c.label}
                </span>
                <p className="text-sm mb-4" style={{ color: 'var(--warm-brown)' }}>{c.description}</p>
                <div className="text-xs space-y-1" style={{ color: 'var(--muted)' }}>
                  <div>Contribution: <span className="font-semibold" style={{ color: 'var(--warm-brown)' }}>{c.contribution}</span></div>
                  <div>Time: <span className="font-semibold" style={{ color: 'var(--warm-brown)' }}>{c.hours}</span></div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Upcoming events */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--warm-brown)' }}>What&apos;s on</h2>
          <button onClick={() => onNavigate('gov-events')} className="text-sm hover:underline bg-transparent border-none cursor-pointer" style={{ color: 'var(--terracotta)' }}>
            All events →
          </button>
        </div>
        <div className="space-y-3">
          {nextEvents.map((e) => (
            <button
              key={e.id}
              onClick={() => onNavigate('gov-events')}
              className="flex items-start gap-4 p-4 rounded-2xl transition-opacity hover:opacity-80 text-left w-full"
              style={{ background: 'var(--sand)' }}
            >
              <div className="text-center min-w-[48px]">
                <div className="text-lg font-bold" style={{ color: 'var(--terracotta)' }}>
                  {new Date(e.date).getDate()}
                </div>
                <div className="text-xs uppercase" style={{ color: 'var(--muted)' }}>
                  {new Date(e.date).toLocaleDateString('en-GB', { month: 'short' })}
                </div>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm mb-1" style={{ color: 'var(--warm-brown)' }}>{e.title}</div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>
                  {e.time} · hosted by {e.host}
                  {e.spots !== null && ` · ${e.spots - e.enrolled.length} spots left`}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Governance CTA — only visible to members/keepers */}
      {role !== 'guest' && (
        <section className="rounded-2xl p-8" style={{ background: 'var(--sand)' }}>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--warm-brown)' }}>
            {openProposals} proposals need your attention
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            Silence counts as consent. Check the open proposals before their deadlines.
          </p>
          <button
            onClick={() => onNavigate('gov-governance')}
            className="inline-block px-5 py-2 rounded-full text-sm font-semibold text-white"
            style={{ background: 'var(--olive)' }}
          >
            Go to governance →
          </button>
        </section>
      )}
    </div>
  )
}
