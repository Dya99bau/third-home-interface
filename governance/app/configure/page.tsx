"use client";

import { useState } from "react";

// ── Grid geometry ────────────────────────────────────────────────────────────

const CELL = 56;
const GRID_MAX = 3;
const SVG_SIZE = 520;
const C = SVG_SIZE / 2;

// Real-world module: 1 grid cell = MODULE_M metres
const MODULE_M = 2.4;

function inside(x: number, y: number) {
  return Math.abs(x) <= GRID_MAX && Math.abs(y) <= GRID_MAX && Math.abs(x) + Math.abs(y) <= 5;
}

function toSvg(x: number, y: number): [number, number] {
  return [C + x * CELL, C + y * CELL];
}

const ALL_POLES: { id: string; x: number; y: number }[] = [];
for (let y = -GRID_MAX; y <= GRID_MAX; y++)
  for (let x = -GRID_MAX; x <= GRID_MAX; x++)
    if (inside(x, y)) ALL_POLES.push({ id: `${x},${y}`, x, y });

const STRUCT_ID = "0,0";

function octPath(r: number) {
  return (
    Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      return `${i === 0 ? "M" : "L"}${(C + r * Math.cos(a)).toFixed(1)},${(C + r * Math.sin(a)).toFixed(1)}`;
    }).join(" ") + " Z"
  );
}

const FLOOR_OCT = octPath((GRID_MAX + 1.3) * CELL);

// ── Presets ──────────────────────────────────────────────────────────────────

const PRESETS = [
  {
    name: "Community Dinner",
    description: "Long table rows, kitchen end open",
    poles: new Set(["-2,-1", "-1,-1", "0,-1", "1,-1", "2,-1", "-2,0", "2,0", "-2,1", "-1,1", "0,1", "1,1", "2,1"]),
  },
  {
    name: "Workshop Clusters",
    description: "Four breakout zones with breathing room",
    poles: new Set(["-3,-1", "-2,-1", "-3,0", "-2,0", "1,-3", "2,-3", "1,-2", "2,-2", "-3,1", "-2,1", "-3,2", "-2,2", "1,1", "2,1", "1,2", "2,2"]),
  },
  {
    name: "Open Gathering",
    description: "Perimeter ring, centre fully open",
    poles: new Set(["-3,0", "-2,-2", "0,-3", "2,-2", "3,0", "2,2", "0,3", "-2,2"]),
  },
  {
    name: "Market / Bazaar",
    description: "Three parallel stall rows",
    poles: new Set(["-2,-2", "-1,-2", "0,-2", "1,-2", "2,-2", "-2,0", "-1,0", "1,0", "2,0", "-2,2", "-1,2", "0,2", "1,2", "2,2"]),
  },
] as const;

type PresetName = typeof PRESETS[number]["name"] | "Custom";

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ConfigurePage() {
  const [activePoles, setActivePoles] = useState<Set<string>>(new Set(PRESETS[0].poles));
  const [preset, setPreset] = useState<PresetName>(PRESETS[0].name);
  const [configName, setConfigName] = useState<string>(PRESETS[0].name);

  function togglePole(id: string) {
    if (id === STRUCT_ID) return;
    setActivePoles((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setPreset("Custom");
  }

  function applyPreset(p: typeof PRESETS[number]) {
    setActivePoles(new Set(p.poles));
    setPreset(p.name);
    setConfigName(p.name);
  }

  const pArr = [...activePoles];
  const connections: [string, string][] = [];
  for (let i = 0; i < pArr.length; i++) {
    const [ax, ay] = pArr[i].split(",").map(Number);
    for (let j = i + 1; j < pArr.length; j++) {
      const [bx, by] = pArr[j].split(",").map(Number);
      if (Math.abs(ax - bx) + Math.abs(ay - by) === 1) connections.push([pArr[i], pArr[j]]);
    }
  }

  // Real-world span of active poles
  const xs = pArr.map((id) => Number(id.split(",")[0]));
  const ys = pArr.map((id) => Number(id.split(",")[1]));
  const spanX = pArr.length > 0 ? ((Math.max(...xs) - Math.min(...xs)) * MODULE_M).toFixed(1) : "0.0";
  const spanY = pArr.length > 0 ? ((Math.max(...ys) - Math.min(...ys)) * MODULE_M).toFixed(1) : "0.0";

  // Scale bar: represents MODULE_M metres (1 cell = CELL px)
  const scaleBarX = 24;
  const scaleBarY = SVG_SIZE - 24;
  const scaleBarLen = CELL;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-1" style={{ color: "var(--warm-brown)" }}>
          HOME Configuration
        </h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Plan events and gatherings by configuring the flexible first floor.
        </p>
      </div>

      <div className="flex gap-8 flex-col lg:flex-row items-start">
        {/* Canvas */}
        <div className="flex-1">
          <div className="rounded-2xl p-4 flex items-center justify-center" style={{ background: "var(--sand)" }}>
            <svg width={SVG_SIZE} height={SVG_SIZE} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}>
              {/* Floor slab */}
              <path d={FLOOR_OCT} fill="#EDE5D8" stroke="#D4C4B0" strokeWidth={2} />

              {/* Module grid overlay — faint squares at each CELL */}
              {Array.from({ length: GRID_MAX * 2 + 1 }, (_, i) => i - GRID_MAX).map((gx) =>
                Array.from({ length: GRID_MAX * 2 + 1 }, (_, j) => j - GRID_MAX).map((gy) => {
                  if (!inside(gx, gy) && !inside(gx - 1, gy) && !inside(gx, gy - 1) && !inside(gx - 1, gy - 1)) return null;
                  const [sx, sy] = toSvg(gx - 0.5, gy - 0.5);
                  return (
                    <rect
                      key={`g${gx},${gy}`}
                      x={sx} y={sy} width={CELL} height={CELL}
                      fill="none" stroke="#C5A880" strokeWidth={0.5} strokeOpacity={0.3}
                    />
                  );
                })
              )}

              {/* Textile panels */}
              {connections.map(([a, b]) => {
                const [ax, ay] = a.split(",").map(Number);
                const [bx, by] = b.split(",").map(Number);
                const [ax2, ay2] = toSvg(ax, ay);
                const [bx2, by2] = toSvg(bx, by);
                return (
                  <line
                    key={`${a}-${b}`}
                    x1={ax2} y1={ay2} x2={bx2} y2={by2}
                    stroke="#C5603B" strokeWidth={12} strokeOpacity={0.28} strokeLinecap="round"
                  />
                );
              })}

              {/* Corner structural columns */}
              {Array.from({ length: 8 }, (_, i) => {
                const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
                const r2 = (GRID_MAX + 1.3) * CELL;
                return <circle key={i} cx={C + r2 * Math.cos(a)} cy={C + r2 * Math.sin(a)} r={8} fill="#C5603B" opacity={0.7} />;
              })}

              {/* Flexible poles */}
              {ALL_POLES.map((pole) => {
                const isActive = activePoles.has(pole.id);
                const isStruct = pole.id === STRUCT_ID;
                const [px, py] = toSvg(pole.x, pole.y);
                return (
                  <g
                    key={pole.id}
                    onClick={() => !isStruct && togglePole(pole.id)}
                    style={{ cursor: isStruct ? "default" : "pointer" }}
                  >
                    <circle cx={px} cy={py} r={24} fill="transparent" />
                    {isStruct ? (
                      <>
                        <circle cx={px} cy={py} r={10} fill="#C5603B" />
                        <circle cx={px} cy={py} r={14} fill="none" stroke="#C5603B" strokeWidth={1.5} strokeDasharray="3 3" />
                      </>
                    ) : (
                      <circle
                        cx={px} cy={py} r={7}
                        fill={isActive ? "#C5603B" : "#AFA090"}
                        fillOpacity={isActive ? 1 : 0.5}
                        stroke={isActive ? "#8B3D22" : "#8C7B6E"}
                        strokeWidth={1.5}
                      />
                    )}
                  </g>
                );
              })}
              {/* Scale bar — 1 module = 2.4 m */}
              <g>
                <line x1={scaleBarX} y1={scaleBarY} x2={scaleBarX + scaleBarLen} y2={scaleBarY} stroke="#8C7B6E" strokeWidth={1.5} />
                <line x1={scaleBarX} y1={scaleBarY - 4} x2={scaleBarX} y2={scaleBarY + 4} stroke="#8C7B6E" strokeWidth={1.5} />
                <line x1={scaleBarX + scaleBarLen} y1={scaleBarY - 4} x2={scaleBarX + scaleBarLen} y2={scaleBarY + 4} stroke="#8C7B6E" strokeWidth={1.5} />
                <text x={scaleBarX + scaleBarLen / 2} y={scaleBarY - 7} textAnchor="middle" fontSize={10} fill="#8C7B6E" fontFamily="monospace">
                  {MODULE_M} m
                </text>
              </g>

              {/* Module label — top-left */}
              <text x={scaleBarX} y={20} fontSize={9} fill="#AFA090" fontFamily="monospace" opacity={0.8}>
                MODULE 2.4 × 2.4 m
              </text>
            </svg>
          </div>
          <p className="text-xs text-center mt-2" style={{ color: "var(--muted)" }}>
            Click a pole to toggle · Orange = active · Gray = available · Shaded bands = textile panels
          </p>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-72 space-y-5">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>
              Configuration name
            </label>
            <input
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
              style={{
                background: "var(--cream)",
                borderColor: "var(--sand-dark)",
                color: "var(--warm-brown)",
              }}
            />
          </div>

          <div className="rounded-xl p-4 grid grid-cols-2 gap-4" style={{ background: "var(--sand)" }}>
            <div>
              <div className="text-2xl font-bold" style={{ color: "var(--terracotta)" }}>
                {activePoles.size}
              </div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>poles active</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: "var(--olive)" }}>
                {connections.length}
              </div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>textile panels</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: "var(--warm-brown)" }}>
                {spanX}<span className="text-sm font-normal">m</span>
              </div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>span E–W</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: "var(--warm-brown)" }}>
                {spanY}<span className="text-sm font-normal">m</span>
              </div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>span N–S</div>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>Event presets</div>
            <div className="space-y-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className="w-full text-left px-4 py-3 rounded-xl border-2 transition-all"
                  style={{
                    background: preset === p.name ? "var(--sand-dark)" : "var(--sand)",
                    borderColor: preset === p.name ? "var(--terracotta)" : "transparent",
                  }}
                >
                  <div className="text-sm font-semibold" style={{ color: "var(--warm-brown)" }}>{p.name}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{p.description}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => { setActivePoles(new Set()); setPreset("Custom"); }}
            className="w-full px-4 py-2 rounded-xl text-sm border transition-opacity hover:opacity-70"
            style={{ borderColor: "var(--sand-dark)", color: "var(--muted)" }}
          >
            Clear all poles
          </button>

          <div className="rounded-xl p-4 text-xs leading-relaxed" style={{ background: "var(--cream)", color: "var(--muted)" }}>
            Poles define the skeleton. Textile panels hang between adjacent poles — configure the layout to plan a dinner, a workshop, or leave the centre open.
          </div>
        </div>
      </div>
    </div>
  );
}
