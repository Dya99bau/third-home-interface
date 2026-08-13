"use client";

import { useState } from "react";
import { useRole } from "@/lib/role-context";
import { bedSpaces, roleConfig } from "@/lib/data";

export default function StayPage() {
  const { role } = useRole();
  const [selected, setSelected] = useState<string | null>(null);
  const [booked, setBooked] = useState<string | null>(null);

  function book(id: string) {
    setBooked(id);
    setSelected(null);
  }

  const price = (b: (typeof bedSpaces)[0]) =>
    role === "guest" ? b.priceGuest : b.priceMember;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-3" style={{ color: "var(--warm-brown)" }}>
          Find a space
        </h1>
        <p className="text-base" style={{ color: "var(--muted)" }}>
          Viewing prices as a{" "}
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${roleConfig[role].color}`}>
            {roleConfig[role].label}
          </span>
          . Members and Keepers contribute less.
        </p>
      </div>

      {booked && (
        <div
          className="rounded-2xl p-5 mb-8 text-sm font-medium"
          style={{ background: "#D4EAD0", color: "#2C4A2E" }}
        >
          ✓ Booking request sent for{" "}
          <strong>{bedSpaces.find((b) => b.id === booked)?.name}</strong>. A Keeper will confirm within a few hours.
        </div>
      )}

      {/* Role context bar */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        {(["guest", "member", "keeper"] as const).map((r) => (
          <div
            key={r}
            className="rounded-xl p-4 text-center"
            style={{
              background: role === r ? "var(--warm-brown)" : "var(--sand)",
              color: role === r ? "var(--cream)" : "var(--muted)",
            }}
          >
            <div className="text-xs font-medium mb-1">{roleConfig[r].label}</div>
            <div className="text-sm font-bold">{roleConfig[r].contribution}</div>
            <div className="text-xs mt-1 opacity-70">{roleConfig[r].hours} / week</div>
          </div>
        ))}
      </div>

      {/* Bed listing */}
      {(["single", "double", "bunk"] as const).map((type) => {
        const rooms = bedSpaces.filter((b) => b.type === type);
        const label = type === "single" ? "Single Rooms" : type === "double" ? "Double Rooms" : "Bunk Rooms";
        const cap = type === "single" ? "1 person" : type === "double" ? "2 people" : "4 people";
        return (
          <div key={type} className="mb-10">
            <div className="flex items-baseline gap-2 mb-4">
              <h2 className="text-lg font-bold" style={{ color: "var(--warm-brown)" }}>{label}</h2>
              <span className="text-sm" style={{ color: "var(--muted)" }}>{cap}</span>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {rooms.map((b) => (
          <div
            key={b.id}
            className="rounded-2xl p-6 border-2 transition-all cursor-pointer"
            style={{
              background: "var(--sand)",
              borderColor:
                selected === b.id
                  ? "var(--terracotta)"
                  : booked === b.id
                  ? "var(--olive)"
                  : "transparent",
              opacity: !b.available && booked !== b.id ? 0.5 : 1,
            }}
            onClick={() => b.available && setSelected(selected === b.id ? null : b.id)}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-base" style={{ color: "var(--warm-brown)" }}>
                  {b.name}
                </h3>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    background: b.available ? "#D4EAD0" : "var(--sand-dark)",
                    color: b.available ? "#2C4A2E" : "var(--muted)",
                  }}
                >
                  {booked === b.id ? "Requested" : b.available ? "Available" : "Occupied"}
                </span>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold" style={{ color: "var(--terracotta)" }}>
                  €{price(b)}
                </div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>/night</div>
              </div>
            </div>

            <p className="text-sm mb-4" style={{ color: "var(--warm-brown)" }}>
              {b.description}
            </p>

            <div className="flex flex-wrap gap-1 mb-4">
              {b.amenities.map((a) => (
                <span
                  key={a}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "var(--cream)", color: "var(--muted)" }}
                >
                  {a}
                </span>
              ))}
            </div>

            {selected === b.id && b.available && booked !== b.id && (
              <div className="pt-4 border-t" style={{ borderColor: "var(--sand-dark)" }}>
                <div className="flex gap-2 items-center mb-3">
                  <input
                    type="date"
                    className="rounded-lg px-3 py-1.5 text-xs flex-1 border"
                    style={{ background: "var(--cream)", borderColor: "var(--sand-dark)", color: "var(--warm-brown)" }}
                    defaultValue="2026-05-21"
                  />
                  <span style={{ color: "var(--muted)", fontSize: "12px" }}>to</span>
                  <input
                    type="date"
                    className="rounded-lg px-3 py-1.5 text-xs flex-1 border"
                    style={{ background: "var(--cream)", borderColor: "var(--sand-dark)", color: "var(--warm-brown)" }}
                    defaultValue="2026-05-24"
                  />
                </div>
                <button
                  onClick={(ev) => { ev.stopPropagation(); book(b.id); }}
                  className="w-full py-2 rounded-full text-sm font-semibold text-white"
                  style={{ background: "var(--terracotta)" }}
                >
                  Request booking
                </button>
              </div>
            )}
          </div>
        ))}
            </div>
          </div>
        );
      })}

      {/* Info */}
      <div className="mt-10 rounded-2xl p-6" style={{ background: "var(--sand)" }}>
        <h2 className="font-semibold text-sm mb-3" style={{ color: "var(--warm-brown)" }}>Good to know</h2>
        <ul className="text-sm space-y-2" style={{ color: "var(--muted)" }}>
          <li>· Guests can stay 1–7 nights. For longer stays, talk to a Keeper about becoming a Member.</li>
          <li>· The kitchen is shared. There&apos;s a communal food fund for basics — you can contribute to it.</li>
          <li>· Quiet hours are 10pm–8am Sunday–Thursday, midnight–8am Friday–Saturday.</li>
          <li>· VW has contributed funding to HOME but has no say in how it&apos;s run. That&apos;s in writing.</li>
        </ul>
      </div>
    </div>
  );
}
