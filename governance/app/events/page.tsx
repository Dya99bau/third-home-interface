"use client";

import { useState } from "react";
import { useRole } from "@/lib/role-context";
import { events as seedEvents, roleConfig, Role, Event } from "@/lib/data";
import { formatDate } from "@/lib/utils";

const categoryColor: Record<string, string> = {
  cultural: "bg-[#E8DDD0] text-[#2C1A0E]",
  food: "bg-[#C5603B] text-white",
  governance: "bg-[#6B7C4E] text-white",
  learning: "bg-[#8FA06A] text-white",
  social: "bg-[#D4C4B0] text-[#2C1A0E]",
};

const categoryOptions = [
  { value: "cultural", label: "Cultural" },
  { value: "food", label: "Food & cooking" },
  { value: "learning", label: "Learning" },
  { value: "social", label: "Social" },
] as const;

interface SuggestedEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  category: "cultural" | "food" | "learning" | "social";
  spots: string;
  pending: true;
}

function SuggestEventForm({ onSubmit, onCancel }: { onSubmit: (e: SuggestedEvent) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("19:00");
  const [category, setCategory] = useState<"cultural" | "food" | "learning" | "social">("social");
  const [spots, setSpots] = useState("");

  function submit() {
    if (!title.trim() || !description.trim() || !date) return;
    onSubmit({
      id: `sug-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      date,
      time,
      category,
      spots: spots.trim(),
      pending: true,
    });
  }

  const valid = title.trim() && description.trim() && date;

  return (
    <div className="rounded-2xl p-6 border-2" style={{ background: "var(--sand)", borderColor: "var(--terracotta)" }}>
      <h3 className="font-semibold text-base mb-1" style={{ color: "var(--warm-brown)" }}>Suggest an event</h3>
      <p className="text-xs mb-5" style={{ color: "var(--muted)" }}>
        Anyone can suggest — a Keeper will confirm and add it to the calendar.
      </p>

      <div className="space-y-4">
        {/* Category */}
        <div>
          <label className="text-xs font-semibold block mb-2" style={{ color: "var(--muted)" }}>Type of event</label>
          <div className="flex gap-2 flex-wrap">
            {categoryOptions.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${category === c.value ? categoryColor[c.value] : ""}`}
                style={category !== c.value ? { background: "var(--cream)", color: "var(--muted)" } : {}}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Georgian cooking night, documentary screening..."
            className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none"
            style={{ background: "var(--cream)", borderColor: "var(--sand-dark)", color: "var(--warm-brown)" }}
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will happen? What do people need to bring or know?"
            rows={3}
            className="w-full rounded-lg px-3 py-2 text-sm border resize-none focus:outline-none"
            style={{ background: "var(--cream)", borderColor: "var(--sand-dark)", color: "var(--warm-brown)" }}
          />
        </div>

        {/* Date + time + spots */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none"
              style={{ background: "var(--cream)", borderColor: "var(--sand-dark)", color: "var(--warm-brown)" }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none"
              style={{ background: "var(--cream)", borderColor: "var(--sand-dark)", color: "var(--warm-brown)" }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>Max spots</label>
            <input
              type="number"
              value={spots}
              onChange={(e) => setSpots(e.target.value)}
              placeholder="Open"
              min={1}
              className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none"
              style={{ background: "var(--cream)", borderColor: "var(--sand-dark)", color: "var(--warm-brown)" }}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={submit}
            disabled={!valid}
            className="px-5 py-2 rounded-full text-sm font-semibold text-white disabled:opacity-40 transition-opacity hover:opacity-90"
            style={{ background: "var(--terracotta)" }}
          >
            Submit suggestion
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

function EventCard({ e, isEnrolled, onToggle }: { e: Event | SuggestedEvent; isEnrolled: boolean; onToggle: () => void }) {
  const isSuggested = "pending" in e;

  if (isSuggested) {
    const s = e as SuggestedEvent;
    return (
      <div className="rounded-2xl p-6 border-2" style={{ background: "var(--sand)", borderColor: "var(--olive)" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColor[s.category]}`}>
                {s.category}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#D4EAD0", color: "#2C4A2E" }}>
                ✓ Suggested — awaiting Keeper confirmation
              </span>
            </div>
            <h3 className="font-semibold text-base mb-1" style={{ color: "var(--warm-brown)" }}>{s.title}</h3>
            <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
              {s.date ? formatDate(s.date) : "Date TBC"} · {s.time}{s.spots ? ` · max ${s.spots} spots` : ""}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--warm-brown)" }}>{s.description}</p>
          </div>
          <div className="text-center shrink-0">
            <div className="text-2xl font-bold" style={{ color: "var(--terracotta)" }}>
              {s.date ? new Date(s.date).getDate() : "?"}
            </div>
            <div className="text-xs uppercase" style={{ color: "var(--muted)" }}>
              {s.date ? new Date(s.date).toLocaleDateString("en-GB", { month: "short" }) : ""}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const ev = e as Event;
  const spotsLeft = ev.spots !== null ? ev.spots - ev.enrolled.length : null;
  const full = spotsLeft !== null && spotsLeft <= 0;

  return (
    <div id={ev.id} className="rounded-2xl p-6" style={{ background: "var(--sand)" }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColor[ev.category]}`}>
              {ev.category}
            </span>
            {ev.openTo.length < 3 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#E8DDD0] text-[#2C1A0E]">
                {ev.openTo.map((r) => roleConfig[r].label).join(" + ")} only
              </span>
            )}
          </div>
          <h3 className="font-semibold text-base mb-1" style={{ color: "var(--warm-brown)" }}>{ev.title}</h3>
          <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
            {formatDate(ev.date)} · {ev.time} · hosted by {ev.host}
            {spotsLeft !== null && (
              <span className={spotsLeft <= 2 ? " text-[var(--terracotta)] font-semibold" : ""}>
                {" "}· {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left
              </span>
            )}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--warm-brown)" }}>{ev.description}</p>
          <div className="flex items-center gap-1 mt-3">
            {ev.enrolled.map((name) => (
              <span key={name} className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "var(--olive)" }} title={name}>
                {name[0]}
              </span>
            ))}
            {isEnrolled && (
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "var(--terracotta)" }} title="You">
                You
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 flex flex-col items-center gap-2">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: "var(--terracotta)" }}>{new Date(ev.date).getDate()}</div>
            <div className="text-xs uppercase" style={{ color: "var(--muted)" }}>{new Date(ev.date).toLocaleDateString("en-GB", { month: "short" })}</div>
          </div>
          <button
            onClick={onToggle}
            disabled={full && !isEnrolled}
            className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: isEnrolled ? "var(--olive)" : full ? "var(--sand-dark)" : "var(--warm-brown)",
              color: isEnrolled || !full ? "white" : "var(--muted)",
              cursor: full && !isEnrolled ? "not-allowed" : "pointer",
            }}
          >
            {isEnrolled ? "✓ Going" : full ? "Full" : "Join"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const { role } = useRole();
  const [enrolled, setEnrolled] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [suggested, setSuggested] = useState<SuggestedEvent[]>([]);

  const visibleEvents = seedEvents.filter((e) => e.openTo.includes(role));

  function toggle(id: string) {
    setEnrolled((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleSuggest(e: SuggestedEvent) {
    setSuggested((prev) => [e, ...prev]);
    setShowForm(false);
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-start justify-between mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-3" style={{ color: "var(--warm-brown)" }}>Events</h1>
          <p className="text-base" style={{ color: "var(--muted)" }}>
            What&apos;s happening at HOME.
            {role === "guest" ? " Some events are Members-only — join as a Member to access everything." : " All events are open to you."}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="shrink-0 px-4 py-2 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--terracotta)" }}
          >
            + Suggest an event
          </button>
        )}
      </div>

      {/* Suggestion form */}
      {showForm && (
        <div className="mb-8">
          <SuggestEventForm onSubmit={handleSuggest} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Suggested events */}
      {suggested.length > 0 && (
        <div className="space-y-4 mb-4">
          {suggested.map((e) => (
            <EventCard key={e.id} e={e} isEnrolled={false} onToggle={() => {}} />
          ))}
        </div>
      )}

      {/* Seed events */}
      <div className="space-y-4">
        {visibleEvents.map((e) => (
          <EventCard key={e.id} e={e} isEnrolled={enrolled.includes(e.id)} onToggle={() => toggle(e.id)} />
        ))}
        {visibleEvents.length === 0 && (
          <div className="rounded-2xl p-8 text-center" style={{ background: "var(--sand)" }}>
            <p style={{ color: "var(--muted)" }}>No events available for your role right now.</p>
          </div>
        )}
      </div>

      {/* Members-only notice for guests */}
      {role === "guest" && seedEvents.filter((e) => !e.openTo.includes("guest")).length > 0 && (
        <div className="mt-8 rounded-2xl p-6" style={{ background: "var(--sand)" }}>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--warm-brown)" }}>
            {seedEvents.filter((e) => !e.openTo.includes("guest")).length} Members-only events this month
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Become a Member to join governance sessions, member welcomes, and other community events.
          </p>
        </div>
      )}
    </div>
  );
}
