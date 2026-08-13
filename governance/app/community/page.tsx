"use client";

import { useRole } from "@/lib/role-context";
import { people, roleConfig, Role } from "@/lib/data";

const roleOrder: Role[] = ["keeper", "member", "guest"];

export default function CommunityPage() {
  const { role } = useRole();

  const grouped = roleOrder.reduce((acc, r) => {
    acc[r] = people.filter((p) => p.role === r);
    return acc;
  }, {} as Record<Role, typeof people>);

  const contributionOptions = [
    { label: "Cooking", desc: "Host or help with communal meals" },
    { label: "Translation", desc: "Arabic, Turkish, English, German, and more" },
    { label: "Teaching", desc: "Share a skill — language, craft, code, anything" },
    { label: "Music", desc: "Play at HOME events" },
    { label: "Maintenance", desc: "Fix, build, repair" },
    { label: "Photography", desc: "Document community life" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-3" style={{ color: "var(--warm-brown)" }}>Community</h1>
        <p className="text-base" style={{ color: "var(--muted)" }}>
          The people who make HOME what it is.
        </p>
      </div>

      {/* Keepers */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-xl font-bold" style={{ color: "var(--warm-brown)" }}>Keepers</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#C5603B] text-white">
            Stable core
          </span>
        </div>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          Keepers are here long-term. They run HOME, hold its culture, and make structural decisions by unanimous consent.
          They contribute 6–8 hours of labour per week and pay the least in cash.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {grouped.keeper.map((p) => (
            <div key={p.id} className="rounded-2xl p-5 flex gap-4" style={{ background: "var(--sand)" }}>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
                style={{ background: "var(--terracotta)" }}
              >
                {p.avatar}
              </div>
              <div>
                <div className="font-semibold" style={{ color: "var(--warm-brown)" }}>{p.name}</div>
                <div className="text-xs mb-2" style={{ color: "var(--muted)" }}>
                  Keeper since {new Date(p.since).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                </div>
                <div className="flex flex-wrap gap-1">
                  {p.contributions.map((c) => (
                    <span
                      key={c}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "var(--cream)", color: "var(--muted)" }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Members */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-xl font-bold" style={{ color: "var(--warm-brown)" }}>Members</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#6B7C4E] text-white">
            Committed residents
          </span>
        </div>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          Members stay for weeks or months. They join community decisions and contribute 2 hours/week of maintenance work.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {grouped.member.map((p) => (
            <div key={p.id} className="rounded-2xl p-5 flex gap-4" style={{ background: "var(--sand)" }}>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
                style={{ background: "var(--olive)" }}
              >
                {p.avatar}
              </div>
              <div>
                <div className="font-semibold" style={{ color: "var(--warm-brown)" }}>{p.name}</div>
                <div className="text-xs mb-2" style={{ color: "var(--muted)" }}>
                  Member since {new Date(p.since).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                </div>
                <div className="flex flex-wrap gap-1">
                  {p.contributions.map((c) => (
                    <span
                      key={c}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "var(--cream)", color: "var(--muted)" }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Non-monetary contributions */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3" style={{ color: "var(--warm-brown)" }}>
          Ways to contribute beyond money
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          HOME recognises six forms of contribution that count as much as cash — especially for newcomers and migrants
          who bring skills and knowledge that money can&apos;t buy.
        </p>
        <div className="grid md:grid-cols-3 gap-3">
          {contributionOptions.map((c) => (
            <div key={c.label} className="rounded-xl p-4" style={{ background: "var(--sand)" }}>
              <div className="font-semibold text-sm mb-1" style={{ color: "var(--warm-brown)" }}>
                {c.label}
              </div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {role === "guest" && (
        <section className="rounded-2xl p-8" style={{ background: "var(--sand)" }}>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--warm-brown)" }}>Want to go deeper?</h2>
          <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
            If HOME feels like somewhere you&apos;d want to stay longer, talk to a Keeper about becoming a Member.
            There&apos;s no application form — just a conversation.
          </p>
          <button
            className="px-5 py-2 rounded-full text-sm font-semibold text-white"
            style={{ background: "var(--terracotta)" }}
          >
            Talk to a Keeper
          </button>
        </section>
      )}

      {/* VW Firewall — visible to all */}
      <section className="mt-10 rounded-2xl p-6 border-l-4" style={{ background: "var(--sand)", borderColor: "var(--olive)" }}>
        <h3 className="font-semibold text-sm mb-2" style={{ color: "var(--warm-brown)" }}>The VW Firewall</h3>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Volkswagen contributes funding to HOME. They are explicitly excluded from all decision-making —
          this is written into HOME&apos;s founding documents and cannot be changed without unanimous Keeper consent.
          Their money funds the space. The space is ours.
        </p>
      </section>
    </div>
  );
}
