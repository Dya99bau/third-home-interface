"use client";

import { useState } from "react";
import { useRole } from "@/lib/role-context";
import { proposals as seedProposals, roleConfig, Proposal, Concern, Block } from "@/lib/data";
import { daysUntil, cn } from "@/lib/utils";

const categoryLabel: Record<string, string> = {
  daily: "Daily ops",
  community: "Community",
  structural: "Structural",
};

const categoryColor: Record<string, string> = {
  daily: "bg-[#E8DDD0] text-[#2C1A0E]",
  community: "bg-[#6B7C4E] text-white",
  structural: "bg-[#C5603B] text-white",
};

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: "Open — silence = consent", color: "text-[#6B7C4E]" },
  consented: { label: "Consented", color: "text-[#6B7C4E] font-semibold" },
  blocked: { label: "Blocked", color: "text-[#C5603B]" },
  withdrawn: { label: "Withdrawn", color: "text-[#8C7B6E]" },
};

type UserAction = "consented" | "concerned" | "blocked" | null;

interface LocalState {
  extraConsenters: number;
  extraConcerns: Concern[];
  extraBlocks: Block[];
  userAction: UserAction;
}

interface NewProposal {
  id: string;
  title: string;
  description: string;
  category: "daily" | "community" | "structural";
  proposedBy: string;
  role: "member" | "keeper";
  pending: true;
}

function ProposalCard({
  proposal,
  localState,
  canVote,
  onConsent,
  onConcern,
  onBlock,
  pending,
}: {
  proposal: Proposal;
  localState: LocalState;
  canVote: boolean;
  onConsent: () => void;
  onConcern: (text: string) => void;
  onBlock: (reason: string) => void;
  pending?: boolean;
}) {
  const [expanded, setExpanded] = useState(pending ?? false);
  const [activeForm, setActiveForm] = useState<"concern" | "block" | null>(null);
  const [inputText, setInputText] = useState("");

  const days = daysUntil(proposal.deadlineAt);
  const isOpen = proposal.status === "open";

  const allConcerns = [...proposal.concerns, ...localState.extraConcerns];
  const allBlocks = [...proposal.blocks, ...localState.extraBlocks];
  const totalConsenters = proposal.silentConsenters + localState.extraConsenters;
  const hasBlock = allBlocks.length > 0;
  const { userAction } = localState;

  function submitConcern() {
    if (!inputText.trim()) return;
    onConcern(inputText.trim());
    setInputText("");
    setActiveForm(null);
  }

  function submitBlock() {
    if (!inputText.trim()) return;
    onBlock(inputText.trim());
    setInputText("");
    setActiveForm(null);
  }

  function openForm(form: "concern" | "block") {
    setActiveForm(activeForm === form ? null : form);
    setInputText("");
    if (!expanded) setExpanded(true);
  }

  return (
    <div
      className="rounded-2xl p-6 border-2 transition-all"
      style={{
        background: "var(--sand)",
        borderColor: pending ? "var(--olive)" : hasBlock ? "var(--terracotta)" : "transparent",
      }}
    >
      {pending && (
        <div className="text-xs font-semibold mb-3 px-3 py-1 rounded-full inline-block" style={{ background: "#D4EAD0", color: "#2C4A2E" }}>
          ✓ Submitted — awaiting community review
        </div>
      )}

      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColor[proposal.category]}`}>
              {categoryLabel[proposal.category]}
            </span>
            {!pending && (
              <span className={`text-xs ${statusConfig[proposal.status].color}`}>
                {statusConfig[proposal.status].label}
              </span>
            )}
            {hasBlock && (
              <span className="text-xs font-medium" style={{ color: "var(--terracotta)" }}>
                ⚠ {allBlocks.length} block{allBlocks.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-base" style={{ color: "var(--warm-brown)" }}>
            {proposal.title}
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            by <span className="font-medium">{proposal.proposedBy}</span> ({roleConfig[proposal.role].label})
            {isOpen && !pending && (
              <span className={cn("ml-2", days <= 3 ? "text-[var(--terracotta)] font-semibold" : "")}>
                · {days > 0 ? `${days}d left` : "deadline passed"}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs px-3 py-1 rounded-full shrink-0"
          style={{ background: "var(--sand-dark)", color: "var(--warm-brown)" }}
        >
          {expanded ? "Less" : "More"}
        </button>
      </div>

      {isOpen && !pending && (
        <div className="mb-4">
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>
            {totalConsenters} silent consenter{totalConsenters !== 1 ? "s" : ""} · {allConcerns.length} concern{allConcerns.length !== 1 ? "s" : ""}
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--sand-dark)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min((totalConsenters / 12) * 100, 100)}%`,
                background: hasBlock ? "var(--terracotta)" : "var(--olive)",
              }}
            />
          </div>
        </div>
      )}

      {expanded && (
        <div className="mt-4 space-y-4">
          <p className="text-sm leading-relaxed" style={{ color: "var(--warm-brown)" }}>
            {proposal.description}
          </p>

          {allConcerns.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--muted)" }}>Concerns raised:</p>
              {allConcerns.map((c, i) => (
                <div key={i} className="text-sm rounded-xl p-3 mb-2" style={{ background: "var(--cream)" }}>
                  <span className="font-medium">{c.by}:</span> {c.text}
                </div>
              ))}
            </div>
          )}

          {allBlocks.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--terracotta)" }}>Blocks:</p>
              {allBlocks.map((b, i) => (
                <div key={i} className="text-sm rounded-xl p-3 mb-2 border" style={{ background: "var(--cream)", borderColor: "var(--terracotta)" }}>
                  <span className="font-medium">{b.by}:</span> {b.reason}
                </div>
              ))}
            </div>
          )}

          {canVote && isOpen && !pending && (
            <div className="pt-2 space-y-3">
              {userAction === null && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={onConsent}
                    className="px-4 py-2 rounded-full text-xs font-semibold text-white transition-opacity hover:opacity-80"
                    style={{ background: "var(--olive)" }}
                  >
                    Consent silently
                  </button>
                  <button
                    onClick={() => openForm("concern")}
                    className="px-4 py-2 rounded-full text-xs font-semibold transition-opacity hover:opacity-80"
                    style={{
                      background: activeForm === "concern" ? "var(--warm-brown)" : "var(--sand-dark)",
                      color: activeForm === "concern" ? "white" : "var(--warm-brown)",
                    }}
                  >
                    Raise a concern
                  </button>
                  <button
                    onClick={() => openForm("block")}
                    className="px-4 py-2 rounded-full text-xs font-semibold transition-opacity hover:opacity-80"
                    style={{
                      background: activeForm === "block" ? "var(--terracotta)" : "var(--cream)",
                      color: activeForm === "block" ? "white" : "var(--terracotta)",
                    }}
                  >
                    Block
                  </button>
                </div>
              )}

              {userAction === "consented" && (
                <div className="text-xs font-medium px-4 py-2 rounded-full inline-block" style={{ background: "#D4EAD0", color: "#2C4A2E" }}>
                  ✓ You consented silently
                </div>
              )}
              {userAction === "concerned" && (
                <div className="text-xs font-medium px-4 py-2 rounded-full inline-block" style={{ background: "var(--sand-dark)", color: "var(--warm-brown)" }}>
                  ✓ Concern submitted
                </div>
              )}
              {userAction === "blocked" && (
                <div className="text-xs font-medium px-4 py-2 rounded-full inline-block" style={{ background: "#FDE8E0", color: "var(--terracotta)" }}>
                  ✓ Block recorded
                </div>
              )}

              {activeForm === "concern" && userAction === null && (
                <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--cream)" }}>
                  <p className="text-xs font-semibold" style={{ color: "var(--warm-brown)" }}>Raise a concern</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    A concern doesn&apos;t stop the proposal — it invites a response before the deadline.
                  </p>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Describe your concern..."
                    rows={3}
                    className="w-full rounded-lg px-3 py-2 text-sm border resize-none focus:outline-none"
                    style={{ background: "var(--sand)", borderColor: "var(--sand-dark)", color: "var(--warm-brown)" }}
                  />
                  <div className="flex gap-2">
                    <button onClick={submitConcern} disabled={!inputText.trim()} className="px-4 py-1.5 rounded-full text-xs font-semibold text-white disabled:opacity-40" style={{ background: "var(--warm-brown)" }}>
                      Submit concern
                    </button>
                    <button onClick={() => { setActiveForm(null); setInputText(""); }} className="px-4 py-1.5 rounded-full text-xs" style={{ color: "var(--muted)" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {activeForm === "block" && userAction === null && (
                <div className="rounded-xl p-4 space-y-3 border" style={{ background: "var(--cream)", borderColor: "var(--terracotta)" }}>
                  <p className="text-xs font-semibold" style={{ color: "var(--terracotta)" }}>Block this proposal</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    A block stops the proposal until your objection is resolved. Use only when this would cause genuine harm.
                  </p>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Explain why you're blocking..."
                    rows={3}
                    className="w-full rounded-lg px-3 py-2 text-sm border resize-none focus:outline-none"
                    style={{ background: "var(--sand)", borderColor: "var(--terracotta)", color: "var(--warm-brown)" }}
                  />
                  <div className="flex gap-2">
                    <button onClick={submitBlock} disabled={!inputText.trim()} className="px-4 py-1.5 rounded-full text-xs font-semibold text-white disabled:opacity-40" style={{ background: "var(--terracotta)" }}>
                      Confirm block
                    </button>
                    <button onClick={() => { setActiveForm(null); setInputText(""); }} className="px-4 py-1.5 rounded-full text-xs" style={{ color: "var(--muted)" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NewProposalForm({
  role,
  onSubmit,
  onCancel,
}: {
  role: "member" | "keeper";
  onSubmit: (p: NewProposal) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"daily" | "community" | "structural">("community");

  const categories = role === "keeper"
    ? (["daily", "community", "structural"] as const)
    : (["daily", "community"] as const);

  function submit() {
    if (!title.trim() || !description.trim()) return;
    onSubmit({
      id: `new-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      category,
      proposedBy: "You",
      role,
      pending: true,
    });
  }

  return (
    <div className="rounded-2xl p-6 border-2" style={{ background: "var(--sand)", borderColor: "var(--olive)" }}>
      <h3 className="font-semibold text-base mb-1" style={{ color: "var(--warm-brown)" }}>New proposal</h3>
      <p className="text-xs mb-5" style={{ color: "var(--muted)" }}>
        Once submitted, this will open for community review. Silence by the deadline counts as consent.
      </p>

      <div className="space-y-4">
        {/* Category */}
        <div>
          <label className="text-xs font-semibold block mb-2" style={{ color: "var(--muted)" }}>Type</label>
          <div className="flex gap-2 flex-wrap">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  background: category === c
                    ? c === "structural" ? "var(--terracotta)" : c === "community" ? "var(--olive)" : "var(--sand-dark)"
                    : "var(--cream)",
                  color: category === c
                    ? c === "daily" ? "var(--warm-brown)" : "white"
                    : "var(--muted)",
                }}
              >
                {categoryLabel[c]}
              </button>
            ))}
          </div>
          {category === "structural" && (
            <p className="text-xs mt-2" style={{ color: "var(--terracotta)" }}>
              Structural proposals require unanimous Keeper consent and stay open 30 days.
            </p>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="A short, clear description of what you're proposing..."
            className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none"
            style={{ background: "var(--cream)", borderColor: "var(--sand-dark)", color: "var(--warm-brown)" }}
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>Details</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain what you're proposing and why. Include any costs, logistics, or things people should know before deciding..."
            rows={4}
            className="w-full rounded-lg px-3 py-2 text-sm border resize-none focus:outline-none"
            style={{ background: "var(--cream)", borderColor: "var(--sand-dark)", color: "var(--warm-brown)" }}
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={submit}
            disabled={!title.trim() || !description.trim()}
            className="px-5 py-2 rounded-full text-sm font-semibold text-white disabled:opacity-40 transition-opacity hover:opacity-90"
            style={{ background: "var(--olive)" }}
          >
            Submit proposal
          </button>
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-full text-sm transition-opacity hover:opacity-70"
            style={{ color: "var(--muted)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const emptyLocalState: LocalState = {
  extraConsenters: 0,
  extraConcerns: [],
  extraBlocks: [],
  userAction: null,
};

export default function GovernancePage() {
  const { role } = useRole();
  const [filter, setFilter] = useState<"all" | "open" | "closed">("open");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newProposals, setNewProposals] = useState<NewProposal[]>([]);

  const [localStates, setLocalStates] = useState<Record<string, LocalState>>(() =>
    Object.fromEntries(seedProposals.map((p) => [p.id, { ...emptyLocalState }]))
  );

  const canVote = role === "member" || role === "keeper";
  const canPropose = role === "member" || role === "keeper";

  function handleConsent(id: string) {
    setLocalStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], extraConsenters: prev[id].extraConsenters + 1, userAction: "consented" },
    }));
  }

  function handleConcern(id: string, text: string) {
    setLocalStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], extraConcerns: [...prev[id].extraConcerns, { by: "You", text }], userAction: "concerned" },
    }));
  }

  function handleBlock(id: string, reason: string) {
    setLocalStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], extraBlocks: [...prev[id].extraBlocks, { by: "You", reason }], userAction: "blocked" },
    }));
  }

  function handleNewProposal(p: NewProposal) {
    setNewProposals((prev) => [p, ...prev]);
    setShowNewForm(false);
  }

  const filtered = seedProposals.filter((p) => {
    if (filter === "open") return p.status === "open";
    if (filter === "closed") return p.status !== "open";
    return true;
  });

  const openCount = seedProposals.filter((p) => p.status === "open").length;

  // Convert NewProposal to the shape ProposalCard expects
  function newToProposal(p: NewProposal): Proposal {
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      proposedBy: p.proposedBy,
      role: p.role,
      category: p.category,
      status: "open",
      createdAt: new Date().toISOString().slice(0, 10),
      deadlineAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      silentConsenters: 0,
      blocks: [],
      concerns: [],
    };
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-3" style={{ color: "var(--warm-brown)" }}>Governance</h1>
        <p className="text-base max-w-2xl" style={{ color: "var(--muted)" }}>
          HOME runs on consent. Proposals are open for a set period — silence means agreement.
          Anyone can raise a concern; a block stops a proposal until it&apos;s resolved.
        </p>
      </div>

      {/* How consent works */}
      <section className="rounded-2xl p-6 mb-10" style={{ background: "var(--sand)" }}>
        <h2 className="font-semibold text-sm mb-4" style={{ color: "var(--warm-brown)" }}>How it works</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { speed: "Daily", color: "var(--sand-dark)", textColor: "var(--warm-brown)", desc: "Immediate decisions by whoever is present. Kitchen, cleaning, logistics." },
            { speed: "Weekly", color: "var(--olive)", textColor: "white", desc: "Community-level changes. Open 7 days. Members + Keepers participate." },
            { speed: "Monthly", color: "var(--terracotta)", textColor: "white", desc: "Structural decisions. Open 30 days. Keepers must unanimously consent." },
          ].map((tier) => (
            <div key={tier.speed} className="rounded-xl p-4" style={{ background: tier.color }}>
              <div className="font-bold text-sm mb-1" style={{ color: tier.textColor }}>{tier.speed}</div>
              <p className="text-xs leading-relaxed" style={{ color: tier.textColor, opacity: 0.85 }}>{tier.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {!canVote && (
        <div className="rounded-xl px-5 py-3 mb-8 text-sm" style={{ background: "var(--sand)", color: "var(--muted)" }}>
          You&apos;re viewing as a <strong style={{ color: "var(--warm-brown)" }}>Guest</strong>. Switch to Member or Keeper using the role selector in the nav to participate in governance.
        </div>
      )}

      {/* Filter + new proposal button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {(["open", "all", "closed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-all"
              style={{
                background: filter === f ? "var(--warm-brown)" : "var(--sand)",
                color: filter === f ? "var(--cream)" : "var(--muted)",
              }}
            >
              {f} {f === "open" && `(${openCount})`}
            </button>
          ))}
        </div>
        {canPropose && !showNewForm && (
          <button
            onClick={() => setShowNewForm(true)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--olive)" }}
          >
            + New proposal
          </button>
        )}
      </div>

      {/* New proposal form */}
      {showNewForm && canPropose && (
        <div className="mb-6">
          <NewProposalForm
            role={role as "member" | "keeper"}
            onSubmit={handleNewProposal}
            onCancel={() => setShowNewForm(false)}
          />
        </div>
      )}

      {/* Newly submitted proposals */}
      {newProposals.length > 0 && (
        <div className="space-y-4 mb-4">
          {newProposals.map((p) => (
            <ProposalCard
              key={p.id}
              proposal={newToProposal(p)}
              localState={emptyLocalState}
              canVote={false}
              onConsent={() => {}}
              onConcern={() => {}}
              onBlock={() => {}}
              pending
            />
          ))}
        </div>
      )}

      {/* Seed proposals */}
      <div className="space-y-4">
        {filtered.map((p) => (
          <ProposalCard
            key={p.id}
            proposal={p}
            localState={localStates[p.id]}
            canVote={canVote}
            onConsent={() => handleConsent(p.id)}
            onConcern={(text) => handleConcern(p.id, text)}
            onBlock={(reason) => handleBlock(p.id, reason)}
          />
        ))}
      </div>

      {role === "keeper" && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--warm-brown)" }}>Keeper Circle</h2>
          <div className="rounded-2xl p-6" style={{ background: "var(--sand)", borderLeft: "4px solid var(--terracotta)" }}>
            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
              Structural proposals require unanimous Keeper consent. The next Keeper meeting is
              <strong style={{ color: "var(--warm-brown)" }}> 25 May, 17:00</strong>.
            </p>
            <div className="text-sm" style={{ color: "var(--warm-brown)" }}>
              <p className="font-semibold mb-2">Pending structural decisions:</p>
              <ul className="list-disc list-inside space-y-1 text-sm" style={{ color: "var(--muted)" }}>
                <li>Guest rate increase (proposal P3) — 1 block outstanding</li>
                <li>VW funding proposal — to be introduced June</li>
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
