"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────
type CellStatus = "fixed" | "available" | "booked" | "customized" | "locked";
type StudioMode = "editor" | "viewer";
type ViewMode   = "plan"   | "iso";
type Template   = "studio" | "bedroom" | "workshop" | "storage" | "wellness";

interface Customization {
  template:    Template;
  wallColor:   string;
  floorColor:  string;
  accentColor: string;
  spaceName:   string;
  ownerName:   string;
  description: string;
}

interface BookingCell {
  col:            number;
  row:            number;   // spec coords: 0 = south, 4 = north
  status:         CellStatus;
  owner?:         string;
  spaceName?:     string;
  color?:         string;
  customization?: Customization;
}

interface Props { open: boolean; onClose: () => void; }

// ─── Constants ──────────────────────────────────────────────────────────────────
const GRID_N  = 5;
const CELL_M  = 5;   // 5 m per cell
const FLOOR_H = 4;   // 4 m per floor

const FIXED_SET  = new Set(["1,1","2,1","1,2","2,2"]);
const LOCKED_SET = new Set(["0,0","4,0","0,4"]);

const FLOOR_CFG = [
  { name:"Ground Floor", sub:"Community Kitchen", main:"#FF9800",
    top:"rgba(255,160,30,0.82)", xf:"rgba(200,110,0,0.87)", yf:"rgba(155,80,0,0.92)" },
  { name:"First Floor",  sub:"Stay Rooms",        main:"#2196F3",
    top:"rgba(50,160,240,0.82)", xf:"rgba(20,110,210,0.87)", yf:"rgba(10,65,180,0.92)" },
  { name:"Second Floor", sub:"Deployable",        main:"#9C27B0",
    top:"rgba(156,60,200,0.82)", xf:"rgba(120,30,170,0.87)", yf:"rgba(78,0,140,0.92)" },
];

const TEMPLATES: Record<Template,{ label:string; icon:string; desc:string; wall:string; floor:string; accent:string }> = {
  studio:   { label:"Studio",   icon:"🎨", desc:"Multi-purpose creative workspace",      wall:"#E8F5E9", floor:"#4E342E", accent:"#4CAF50" },
  bedroom:  { label:"Bedroom",  icon:"🛏", desc:"Private sleeping and living space",      wall:"#E3F2FD", floor:"#8D6E63", accent:"#2196F3" },
  workshop: { label:"Workshop", icon:"🔧", desc:"Maker space with tools and workbench",   wall:"#FFF8E1", floor:"#3E2723", accent:"#FF9800" },
  storage:  { label:"Storage",  icon:"📦", desc:"Shelving, equipment, and archive space", wall:"#F5F5F5", floor:"#546E7A", accent:"#9E9E9E" },
  wellness: { label:"Wellness", icon:"🧘", desc:"Yoga, meditation, and healing space",    wall:"#FCE4EC", floor:"#2E7D32", accent:"#E91E63" },
};

const WALL_PRESETS  = ["#F5F5F5","#E3F2FD","#E8F5E9","#FFF8E1","#FCE4EC","#EDE7F6"];
const FLOOR_PRESETS = ["#4E342E","#546E7A","#37474F","#3E2723","#1B5E20","#8D6E63"];

// ─── Initial data ───────────────────────────────────────────────────────────────
function makeInitialCells(): BookingCell[] {
  const cells: BookingCell[] = [];
  for (let row = 0; row < GRID_N; row++) {
    for (let col = 0; col < GRID_N; col++) {
      const key = `${col},${row}`;
      const status: CellStatus = FIXED_SET.has(key) ? "fixed" : LOCKED_SET.has(key) ? "locked" : "available";
      cells.push({ col, row, status });
    }
  }
  // Demo bookings
  const demo: Partial<BookingCell>[] = [
    { col:1, row:3, status:"customized", owner:"Jonas", spaceName:"Film Studio", color:"#1B5E20",
      customization:{ template:"studio", wallColor:"#E8F5E9", floorColor:"#4E342E", accentColor:"#4CAF50", spaceName:"Film Studio", ownerName:"Jonas", description:"Screening and creative workspace" }},
    { col:3, row:2, status:"customized", owner:"Marta", spaceName:"Living Pod",   color:"#0D47A1",
      customization:{ template:"bedroom", wallColor:"#E3F2FD", floorColor:"#8D6E63", accentColor:"#2196F3", spaceName:"Living Pod", ownerName:"Marta", description:"Private living quarters" }},
    { col:2, row:0, status:"booked", owner:"Lena" },
    { col:3, row:3, status:"booked", owner:"Fatima" },
  ];
  demo.forEach(d => {
    const c = cells.find(c => c.col === d.col && c.row === d.row);
    if (c) Object.assign(c, d);
  });
  return cells;
}

// ─── ISO math ───────────────────────────────────────────────────────────────────
function isoP(col: number, row: number, zM: number, az: number, scale: number, ox: number, oy: number): [number,number] {
  const rad = az * Math.PI / 180;
  const wx = col * CELL_M, wy = row * CELL_M;
  const rx = wx * Math.cos(rad) - wy * Math.sin(rad);
  const ry = wx * Math.sin(rad) + wy * Math.cos(rad);
  return [
    ox + scale * (Math.sqrt(3)/2) * (rx - ry),
    oy + scale * 0.5 * (rx + ry) - zM * scale,
  ];
}
function pts(arr: [number,number][]): string {
  return arr.map(([x,y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

// ─── Plan View ──────────────────────────────────────────────────────────────────
const PLAN_CELL = 88;
const PLAN_PAD  = 50;
const PLAN_W = PLAN_PAD * 2 + GRID_N * PLAN_CELL;  // 540
const PLAN_H = PLAN_PAD * 2 + GRID_N * PLAN_CELL + 30;

function PlanView({ cells, selected, onSelect, mode, currentFloor }:
  { cells: BookingCell[]; selected: string|null; onSelect: (k:string)=>void; mode: StudioMode; currentFloor: number }) {

  function cellFill(c: BookingCell): string {
    if (c.status === "fixed")       return FLOOR_CFG[currentFloor].main + "CC";
    if (c.status === "locked")      return "#424242";
    if (c.status === "available")   return "#C8E6C9";
    if (c.status === "booked")      return "#E0E0E0";
    if (c.status === "customized")  return c.customization?.wallColor ?? "#B3E5FC";
    return "#333";
  }

  function cellTextColor(c: BookingCell): string {
    if (c.status === "fixed")      return "rgba(255,255,255,0.9)";
    if (c.status === "locked")     return "rgba(255,255,255,0.5)";
    if (c.status === "available")  return "#1B5E20";
    if (c.status === "booked")     return "#424242";
    if (c.status === "customized") return c.customization?.accentColor ?? "#1A237E";
    return "#fff";
  }

  return (
    <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
      <svg
        width={PLAN_W} height={PLAN_H}
        viewBox={`0 0 ${PLAN_W} ${PLAN_H}`}
        style={{ display:"block", maxWidth:"100%", maxHeight:"100%" }}
      >
        <defs>
          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#616161" strokeWidth="2.5"/>
          </pattern>
        </defs>

        {/* Background */}
        <rect width={PLAN_W} height={PLAN_H} fill="#07101F"/>

        {/* Cell fills */}
        {cells.map(c => {
          const sx = PLAN_PAD + c.col * PLAN_CELL;
          const sy = PLAN_PAD + (GRID_N - 1 - c.row) * PLAN_CELL;
          const key = `${c.col},${c.row}`;
          const isSelected = selected === key;
          const isFixed = c.status === "fixed";

          return (
            <g key={key} onClick={() => !isFixed && onSelect(key)} style={{ cursor: isFixed ? "default" : "pointer" }}>
              <rect
                x={sx+1} y={sy+1} width={PLAN_CELL-2} height={PLAN_CELL-2}
                fill={cellFill(c)}
                opacity={isFixed && mode==="editor" && currentFloor > 1 ? 0.35 : 1}
              />
              {c.status === "locked" && (
                <rect x={sx+1} y={sy+1} width={PLAN_CELL-2} height={PLAN_CELL-2} fill="url(#hatch)"/>
              )}
              {/* Selection border */}
              {isSelected && (
                <rect x={sx+1} y={sy+1} width={PLAN_CELL-2} height={PLAN_CELL-2}
                  fill="none" stroke="white" strokeWidth={3} opacity={0.9}/>
              )}
              {/* Fixed lock icon */}
              {isFixed && (
                <>
                  <text x={sx+PLAN_CELL/2} y={sy+PLAN_CELL/2-8}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={cellTextColor(c)} fontSize={16} pointerEvents="none">🔒</text>
                  <text x={sx+PLAN_CELL/2} y={sy+PLAN_CELL/2+12}
                    textAnchor="middle" fill={cellTextColor(c)} fontSize={8}
                    fontFamily="monospace" letterSpacing="0.5" pointerEvents="none">FIXED</text>
                </>
              )}
              {/* Available cell */}
              {c.status === "available" && (
                <>
                  <text x={sx+PLAN_CELL/2} y={sy+PLAN_CELL/2-5}
                    textAnchor="middle" fill={cellTextColor(c)} fontSize={9}
                    fontFamily="monospace" fontWeight="600" pointerEvents="none">[{c.col},{c.row}]</text>
                  <text x={sx+PLAN_CELL/2} y={sy+PLAN_CELL/2+9}
                    textAnchor="middle" fill={cellTextColor(c)} fontSize={8}
                    fontFamily="monospace" opacity={0.7} pointerEvents="none">5×5m</text>
                </>
              )}
              {/* Booked pending */}
              {c.status === "booked" && (
                <>
                  <text x={sx+PLAN_CELL/2} y={sy+PLAN_CELL/2-8}
                    textAnchor="middle" fill={cellTextColor(c)} fontSize={10}
                    fontFamily="monospace" fontWeight="700" pointerEvents="none">{c.owner}</text>
                  <rect x={sx+PLAN_CELL/2-16} y={sy+PLAN_CELL/2+2} width={32} height={13}
                    rx={3} fill="#FFB300" pointerEvents="none"/>
                  <text x={sx+PLAN_CELL/2} y={sy+PLAN_CELL/2+12}
                    textAnchor="middle" fill="#1A1A00" fontSize={7}
                    fontFamily="monospace" fontWeight="700" pointerEvents="none">PENDING</text>
                </>
              )}
              {/* Customized */}
              {c.status === "customized" && (
                <>
                  <rect x={sx+4} y={sy+4} width={10} height={10} rx={2}
                    fill={c.color ?? c.customization?.accentColor ?? "#4CAF50"} pointerEvents="none"/>
                  <text x={sx+PLAN_CELL/2} y={sy+PLAN_CELL/2-5}
                    textAnchor="middle" fill={cellTextColor(c)} fontSize={9}
                    fontFamily="monospace" fontWeight="700" pointerEvents="none">{c.spaceName}</text>
                  <text x={sx+PLAN_CELL/2} y={sy+PLAN_CELL/2+8}
                    textAnchor="middle" fill={cellTextColor(c)} fontSize={8}
                    fontFamily="monospace" opacity={0.8} pointerEvents="none">{c.owner}</text>
                </>
              )}
              {/* Locked */}
              {c.status === "locked" && (
                <text x={sx+PLAN_CELL/2} y={sy+PLAN_CELL/2+4}
                  textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={8}
                  fontFamily="monospace" pointerEvents="none">⛔</text>
              )}
            </g>
          );
        })}

        {/* Grid lines — maroon/red per spec */}
        {Array.from({ length: GRID_N + 1 }, (_, i) => i).map(i => (
          <g key={i}>
            <line
              x1={PLAN_PAD + i * PLAN_CELL} y1={PLAN_PAD}
              x2={PLAN_PAD + i * PLAN_CELL} y2={PLAN_PAD + GRID_N * PLAN_CELL}
              stroke="#A52A2A" strokeWidth={i===0||i===GRID_N ? 2 : 1}/>
            <line
              x1={PLAN_PAD} y1={PLAN_PAD + i * PLAN_CELL}
              x2={PLAN_PAD + GRID_N * PLAN_CELL} y2={PLAN_PAD + i * PLAN_CELL}
              stroke="#A52A2A" strokeWidth={i===0||i===GRID_N ? 2 : 1}/>
          </g>
        ))}

        {/* Fixed core highlight border */}
        <rect
          x={PLAN_PAD + 1 * PLAN_CELL + 2}
          y={PLAN_PAD + (GRID_N - 1 - 2) * PLAN_CELL + 2}
          width={2 * PLAN_CELL - 4}
          height={2 * PLAN_CELL - 4}
          fill="none" stroke="#FF9800" strokeWidth={3} strokeDasharray="6,3" opacity={0.7}
        />

        {/* Axis labels */}
        {Array.from({ length: GRID_N }, (_, i) => (
          <g key={i}>
            <text x={PLAN_PAD + i * PLAN_CELL + PLAN_CELL/2} y={PLAN_PAD - 10}
              textAnchor="middle" fill="rgba(165,42,42,0.7)" fontSize={10} fontFamily="monospace">{i}</text>
            <text x={PLAN_PAD - 10} y={PLAN_PAD + (GRID_N - 1 - i) * PLAN_CELL + PLAN_CELL/2}
              textAnchor="end" dominantBaseline="middle" fill="rgba(165,42,42,0.7)" fontSize={10} fontFamily="monospace">{i}</text>
          </g>
        ))}

        {/* Axis labels */}
        <text x={PLAN_PAD + GRID_N * PLAN_CELL / 2} y={PLAN_H - 8}
          textAnchor="middle" fill="rgba(165,42,42,0.5)" fontSize={9} fontFamily="monospace">← {GRID_N * CELL_M}.0 m →</text>

        {/* Scale bar */}
        <line x1={PLAN_PAD} y1={PLAN_PAD + GRID_N*PLAN_CELL + 16}
              x2={PLAN_PAD + PLAN_CELL} y2={PLAN_PAD + GRID_N*PLAN_CELL + 16}
              stroke="rgba(165,42,42,0.6)" strokeWidth={1.5}/>
        <text x={PLAN_PAD + PLAN_CELL/2} y={PLAN_PAD + GRID_N*PLAN_CELL + 28}
          textAnchor="middle" fill="rgba(165,42,42,0.6)" fontSize={9} fontFamily="monospace">5 m</text>

        {/* Legend */}
        {[
          { color:"#FF9800CC", label:"Fixed structure" },
          { color:"#C8E6C9",   label:"Available" },
          { color:"#E0E0E0",   label:"Booked / pending" },
          { color:"#7BC67E",   label:"Customized" },
          { color:"#424242",   label:"Locked" },
        ].map((l,i) => (
          <g key={l.label} transform={`translate(${PLAN_PAD + GRID_N*PLAN_CELL + 14}, ${PLAN_PAD + i*20})`}>
            <rect width={12} height={12} rx={2} fill={l.color}/>
            <text x={16} y={10} fill="rgba(255,255,255,0.45)" fontSize={9} fontFamily="monospace">{l.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── ISO View ───────────────────────────────────────────────────────────────────
const ISO_SVG_W = 800;
const ISO_SVG_H = 680;
const ISO_OX    = 400;
const ISO_OY    = 430;

function IsoView({ cells, selected, onSelect, az, zoom, panX, panY, currentFloor, layerVisible }:
  { cells: BookingCell[]; selected: string|null; onSelect:(k:string)=>void;
    az:number; zoom:number; panX:number; panY:number; currentFloor:number; layerVisible:boolean[] }) {

  const scale = 14 * zoom;

  function ip(col:number, row:number, zM:number): [number,number] {
    return isoP(col, row, zM, az, scale, ISO_OX + panX, ISO_OY + panY);
  }

  const azN = ((az % 360) + 360) % 360;
  const showXP = azN < 90 || azN > 270;
  const showYP = azN < 180;

  function box(col:number, row:number, w:number, d:number, fzB:number, fzT:number,
    topClr:string, xClr:string, yClr:string, stroke:string, sw:number=1, opacity:number=1) {
    const bl = ip(col,row,fzB),     br = ip(col+w,row,fzB);
    const bf = ip(col+w,row+d,fzB), bb = ip(col,row+d,fzB);
    const tl = ip(col,row,fzT),     tr = ip(col+w,row,fzT);
    const tf = ip(col+w,row+d,fzT), tb = ip(col,row+d,fzT);
    const xfc = showXP ? col+w : col;
    const yfc = showYP ? row+d : row;
    const xFace: [number,number][] = [ip(xfc,row,fzB),ip(xfc,row+d,fzB),ip(xfc,row+d,fzT),ip(xfc,row,fzT)];
    const yFace: [number,number][] = [ip(col,yfc,fzB),ip(col+w,yfc,fzB),ip(col+w,yfc,fzT),ip(col,yfc,fzT)];
    return (
      <>
        <polygon points={pts([bl,bb,tb,tl])} fill={yClr} stroke="rgba(0,0,0,0.3)" strokeWidth={0.6}/>
        <polygon points={pts([br,bf,tf,tr])} fill={xClr} stroke="rgba(0,0,0,0.3)" strokeWidth={0.6}/>
        <polygon points={pts([bl,br,bf,bb])} fill="rgba(5,12,25,0.7)" stroke="rgba(0,0,0,0.2)" strokeWidth={0.4}/>
        <polygon points={pts([tl,tr,tf,tb])} fill={topClr} stroke={stroke} strokeWidth={sw} opacity={opacity}/>
      </>
    );
  }

  function wireframe(col:number, row:number, w:number=1, d:number=1) {
    const tl = ip(col,row,0), tr = ip(col+w,row,0);
    const tf = ip(col+w,row+d,0), tb = ip(col,row+d,0);
    return <polygon points={pts([tl,tr,tf,tb])} fill="rgba(165,42,42,0.06)" stroke="rgba(165,42,42,0.35)" strokeWidth={0.8} strokeDasharray="3,2"/>;
  }

  // Depth sort bookable cells
  const rad = az * Math.PI / 180;
  const sortedCells = cells
    .filter(c => c.status !== "fixed")
    .sort((a,b) => {
      const da = (a.col+0.5)*CELL_M*Math.cos(rad) + (a.row+0.5)*CELL_M*Math.sin(rad);
      const db = (b.col+0.5)*CELL_M*Math.cos(rad) + (b.row+0.5)*CELL_M*Math.sin(rad);
      return da - db;
    });

  return (
    <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
      <svg
        width={ISO_SVG_W} height={ISO_SVG_H}
        viewBox={`0 0 ${ISO_SVG_W} ${ISO_SVG_H}`}
        style={{ display:"block", maxWidth:"100%", maxHeight:"100%" }}
      >
        {/* Background */}
        <rect width={ISO_SVG_W} height={ISO_SVG_H} fill="#060C18"/>

        {/* Ground plane */}
        <polygon points={pts([ip(0,0,0),ip(GRID_N,0,0),ip(GRID_N,GRID_N,0),ip(0,GRID_N,0)])}
          fill="rgba(5,12,25,0.8)" stroke="rgba(165,42,42,0.55)" strokeWidth={1.5}/>

        {/* Grid lines on ground */}
        {Array.from({length:GRID_N+1},(_,i)=>i).map(i => {
          const a = ip(i,0,0), b = ip(i,GRID_N,0);
          const c = ip(0,i,0), d = ip(GRID_N,i,0);
          return (
            <g key={i}>
              <line x1={a[0].toFixed(1)} y1={a[1].toFixed(1)} x2={b[0].toFixed(1)} y2={b[1].toFixed(1)} stroke="rgba(165,42,42,0.3)" strokeWidth={0.8}/>
              <line x1={c[0].toFixed(1)} y1={c[1].toFixed(1)} x2={d[0].toFixed(1)} y2={d[1].toFixed(1)} stroke="rgba(165,42,42,0.3)" strokeWidth={0.8}/>
            </g>
          );
        })}

        {/* Bookable cells — wireframe if available, solid if booked/customized */}
        {sortedCells.map(c => {
          const key = `${c.col},${c.row}`;
          const isSelected = selected === key;
          const dim = 1;

          if (c.status === "locked") {
            return (
              <g key={key}>
                {box(c.col,c.row,1,1,0,FLOOR_H,"rgba(60,60,60,0.7)","rgba(40,40,40,0.8)","rgba(30,30,30,0.85)","#555",1)}
              </g>
            );
          }
          if (c.status === "available") return <g key={key}>{wireframe(c.col,c.row)}</g>;

          if (c.status === "booked") {
            return (
              <g key={key} onClick={() => onSelect(key)} style={{ cursor:"pointer" }} opacity={dim}>
                {box(c.col,c.row,1,1,0,FLOOR_H,
                  `rgba(200,200,200,${isSelected?0.9:0.65})`,
                  "rgba(150,150,150,0.7)", "rgba(120,120,120,0.8)",
                  isSelected ? "white" : "#bbb", isSelected?2.5:1)}
              </g>
            );
          }

          if (c.status === "customized" && c.customization) {
            const wallC = c.customization.wallColor;
            const accentC = c.customization.accentColor;
            const rr = (n:string) => parseInt(n.slice(1,3),16);
            const rg = (n:string) => parseInt(n.slice(3,5),16);
            const rb = (n:string) => parseInt(n.slice(5,7),16);
            const topC = `rgba(${rr(wallC)},${rg(wallC)},${rb(wallC)},${isSelected?0.9:0.75})`;
            const xC   = `rgba(${Math.max(0,rr(wallC)-40)},${Math.max(0,rg(wallC)-40)},${Math.max(0,rb(wallC)-40)},0.85)`;
            const yC   = `rgba(${Math.max(0,rr(wallC)-70)},${Math.max(0,rg(wallC)-70)},${Math.max(0,rb(wallC)-70)},0.9)`;
            return (
              <g key={key} onClick={() => onSelect(key)} style={{ cursor:"pointer" }}>
                {box(c.col,c.row,1,1,0,FLOOR_H,topC,xC,yC,isSelected?"white":accentC,isSelected?2.5:1.2)}
              </g>
            );
          }
          return null;
        })}

        {/* Fixed core — Floor 0 (Kitchen): orange, if visible */}
        {layerVisible[0] && box(1,1,2,2,0,FLOOR_H,
          FLOOR_CFG[0].top, FLOOR_CFG[0].xf, FLOOR_CFG[0].yf, FLOOR_CFG[0].main, 1.5)}

        {/* Fixed core — Floor 1 (Rooms): blue, stacked on floor 0 */}
        {layerVisible[1] && box(1,1,2,2,FLOOR_H,FLOOR_H*2,
          FLOOR_CFG[1].top, FLOOR_CFG[1].xf, FLOOR_CFG[1].yf, FLOOR_CFG[1].main, 1.5)}

        {/* Floor 2 deployable modules (demo: on rooftop of core) */}
        {layerVisible[2] && (
          <>
            {box(1,1,1,1,FLOOR_H*2,FLOOR_H*2+3.5,
              FLOOR_CFG[2].top, FLOOR_CFG[2].xf, FLOOR_CFG[2].yf, FLOOR_CFG[2].main, 1.2)}
          </>
        )}

        {/* Piloti columns at corners of fixed core */}
        {[[1,1],[3,1],[1,3],[3,3]].map(([col,row]) => {
          const base = ip(col, row, 0), top = ip(col, row, FLOOR_H);
          return (
            <g key={`col${col},${row}`}>
              <line x1={base[0].toFixed(1)} y1={base[1].toFixed(1)}
                    x2={top[0].toFixed(1)}  y2={top[1].toFixed(1)}
                stroke="#FF9800" strokeWidth={3} opacity={0.6}/>
              <circle cx={base[0].toFixed(1)} cy={base[1].toFixed(1)} r={4} fill="#FF9800" opacity={0.5}/>
            </g>
          );
        })}

        {/* Floor height callout */}
        {(() => {
          const base = ip(0,0,0), top0 = ip(0,0,FLOOR_H), top1 = ip(0,0,FLOOR_H*2), topAll = ip(0,0,FLOOR_H*3);
          return (
            <g>
              <line x1={(base[0]-8).toFixed(1)} y1={base[1].toFixed(1)} x2={(topAll[0]-8).toFixed(1)} y2={topAll[1].toFixed(1)} stroke="rgba(165,42,42,0.45)" strokeWidth={1} strokeDasharray="3,2"/>
              {[{p:base,lbl:"G"},{p:top0,lbl:"+1"},{p:top1,lbl:"+2"}].map(({p,lbl},fi) => (
                <g key={lbl}>
                  <line x1={(p[0]-12).toFixed(1)} y1={p[1].toFixed(1)} x2={(p[0]-4).toFixed(1)} y2={p[1].toFixed(1)} stroke={fi===0?"rgba(165,42,42,0.6)":"rgba(165,42,42,0.4)"} strokeWidth={1}/>
                  <text x={(p[0]-15).toFixed(1)} y={p[1].toFixed(1)} textAnchor="end" dominantBaseline="middle"
                    fill="rgba(165,42,42,0.7)" fontSize={9} fontFamily="monospace">{lbl}</text>
                </g>
              ))}
              <text x={(topAll[0]-18).toFixed(1)} y={((base[1]+topAll[1])/2).toFixed(1)} textAnchor="end" dominantBaseline="middle"
                fill="rgba(165,42,42,0.6)" fontSize={8} fontFamily="monospace">{(FLOOR_H*3)}m</text>
            </g>
          );
        })()}

        {/* Legend */}
        <text x={16} y={ISO_SVG_H-14} fill="rgba(165,42,42,0.35)" fontSize={8} fontFamily="monospace" letterSpacing={1}>
          G+2  ·  {CELL_M}m CELL  ·  {FLOOR_H}m/FLOOR  ·  {FLOOR_H*3}m TOTAL  ·  SITE 25×25m
        </text>
        <text x={ISO_SVG_W-14} y={ISO_SVG_H-14} textAnchor="end" fill="rgba(255,255,255,0.12)" fontSize={8} fontFamily="monospace">
          SCROLL — zoom  ·  DRAG — rotate  ·  CTRL+DRAG — pan
        </text>
      </svg>
    </div>
  );
}

// ─── Customization Editor ───────────────────────────────────────────────────────
function CustomizationEditor({ cell, onSave, onCancel }:
  { cell: BookingCell; onSave:(c:Customization)=>void; onCancel:()=>void }) {

  const [tmpl,      setTmpl]      = useState<Template>(cell.customization?.template ?? "studio");
  const [wallColor, setWallColor] = useState(cell.customization?.wallColor  ?? TEMPLATES.studio.wall);
  const [floorClr,  setFloorClr]  = useState(cell.customization?.floorColor ?? TEMPLATES.studio.floor);
  const [accentClr, setAccentClr] = useState(cell.customization?.accentColor?? TEMPLATES.studio.accent);
  const [spaceName, setSpaceName] = useState(cell.customization?.spaceName  ?? "");
  const [ownerName, setOwnerName] = useState(cell.customization?.ownerName  ?? cell.owner ?? "");
  const [desc,      setDesc]      = useState(cell.customization?.description ?? "");
  const [tab,       setTab]       = useState<"template"|"colors"|"label">("template");

  function applyTemplate(t: Template) {
    const cfg = TEMPLATES[t];
    setTmpl(t);
    setWallColor(cfg.wall);
    setFloorClr(cfg.floor);
    setAccentClr(cfg.accent);
  }

  const canSave = spaceName.trim() && ownerName.trim();

  const s: Record<string, React.CSSProperties> = {
    overlay:  { position:"fixed", inset:0, background:"rgba(4,10,20,0.6)", backdropFilter:"blur(4px)", zIndex:55, display:"flex", alignItems:"center", justifyContent:"center" },
    modal:    { width:"min(90vw,620px)", background:"#0A1424", borderRadius:16, border:"1px solid rgba(165,42,42,0.4)", overflow:"hidden", display:"flex", flexDirection:"column" },
    header:   { padding:"14px 20px", borderBottom:"1px solid rgba(165,42,42,0.2)", display:"flex", alignItems:"center", justifyContent:"space-between" },
    body:     { padding:20, flex:1, overflowY:"auto" as const },
    tabBar:   { display:"flex", gap:4, marginBottom:16, background:"rgba(255,255,255,0.04)", borderRadius:8, padding:3 },
    tab:      { flex:1, padding:"6px 0", borderRadius:6, border:"none", cursor:"pointer", fontSize:11, fontFamily:"monospace", letterSpacing:"0.06em", fontWeight:600, transition:"all 0.15s" },
    footer:   { padding:"12px 20px", borderTop:"1px solid rgba(165,42,42,0.15)", display:"flex", gap:8, justifyContent:"flex-end" },
  };

  return (
    <div style={s.overlay} onClick={e => e.target===e.currentTarget && onCancel()}>
      <div style={s.modal}>
        {/* Header */}
        <div style={s.header}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#A52A2A", boxShadow:"0 0 8px #A52A2A" }}/>
            <span style={{ color:"#F2F7FA", fontFamily:"Georgia,serif", fontSize:14, fontWeight:700, letterSpacing:"0.04em" }}>
              CUSTOMIZE [{cell.col},{cell.row}]
            </span>
            <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontFamily:"monospace" }}>5m × 5m</span>
          </div>
          <button onClick={onCancel} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:7, color:"rgba(255,255,255,0.5)", width:28, height:28, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>

        {/* Tab bar */}
        <div style={{ padding:"0 20px", paddingTop:14 }}>
          <div style={s.tabBar}>
            {(["template","colors","label"] as const).map(t => (
              <button key={t} style={{ ...s.tab, background:tab===t?"rgba(165,42,42,0.8)":"transparent", color:tab===t?"#F2F7FA":"rgba(255,255,255,0.35)" }}
                onClick={() => setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
            ))}
          </div>
        </div>

        <div style={s.body}>
          {/* Template tab */}
          {tab === "template" && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {(Object.entries(TEMPLATES) as [Template, typeof TEMPLATES[Template]][]).map(([t,cfg]) => (
                <button key={t} onClick={() => applyTemplate(t)} style={{
                  textAlign:"left", padding:"12px 14px", borderRadius:10, border:"1px solid",
                  borderColor:tmpl===t?"rgba(165,42,42,0.7)":"rgba(255,255,255,0.1)",
                  background:tmpl===t?"rgba(165,42,42,0.18)":"rgba(255,255,255,0.03)",
                  cursor:"pointer", transition:"all 0.15s",
                }}>
                  <div style={{ fontSize:20, marginBottom:4 }}>{cfg.icon}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:tmpl===t?"#F2E0D0":"rgba(255,255,255,0.7)", fontFamily:"monospace" }}>{cfg.label}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginTop:3, lineHeight:1.4 }}>{cfg.desc}</div>
                </button>
              ))}
            </div>
          )}

          {/* Colors tab */}
          {tab === "colors" && (
            <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
              <div>
                <div style={{ fontSize:10, fontFamily:"monospace", color:"rgba(255,255,255,0.3)", letterSpacing:"0.1em", marginBottom:10, textTransform:"uppercase" }}>Wall Color</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {WALL_PRESETS.map(c => (
                    <button key={c} onClick={() => setWallColor(c)} style={{
                      width:36, height:36, borderRadius:8, background:c, border:"2px solid",
                      borderColor:wallColor===c?"white":"transparent", cursor:"pointer", transition:"border 0.15s",
                    }}/>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize:10, fontFamily:"monospace", color:"rgba(255,255,255,0.3)", letterSpacing:"0.1em", marginBottom:10, textTransform:"uppercase" }}>Floor Material</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {FLOOR_PRESETS.map(c => (
                    <button key={c} onClick={() => setFloorClr(c)} style={{
                      width:36, height:36, borderRadius:8, background:c, border:"2px solid",
                      borderColor:floorClr===c?"white":"transparent", cursor:"pointer", transition:"border 0.15s",
                    }}/>
                  ))}
                </div>
              </div>
              {/* Preview swatch */}
              <div style={{ borderRadius:10, overflow:"hidden", border:"1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ height:50, background:wallColor, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:10, fontFamily:"monospace", color:"rgba(0,0,0,0.4)" }}>WALL PREVIEW</span>
                </div>
                <div style={{ height:24, background:floorClr, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:9, fontFamily:"monospace", color:"rgba(255,255,255,0.4)" }}>FLOOR</span>
                </div>
              </div>
            </div>
          )}

          {/* Label tab */}
          {tab === "label" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {([
                { label:"Space Name", value:spaceName, set:setSpaceName, placeholder:"e.g. Creative Studio, My Workshop..." },
                { label:"Owner Name", value:ownerName, set:setOwnerName, placeholder:"Your name..." },
              ] as const).map(({ label, value, set, placeholder }) => (
                <div key={label}>
                  <div style={{ fontSize:10, fontFamily:"monospace", color:"rgba(255,255,255,0.3)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>{label}</div>
                  <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
                    style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.05)", color:"#E0E8F4", fontSize:12, fontFamily:"monospace", outline:"none" }}/>
                </div>
              ))}
              <div>
                <div style={{ fontSize:10, fontFamily:"monospace", color:"rgba(255,255,255,0.3)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Description</div>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Optional description of your space..."
                  style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.05)", color:"#E0E8F4", fontSize:12, fontFamily:"monospace", outline:"none", resize:"none" }}/>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <button onClick={onCancel} style={{ padding:"8px 18px", borderRadius:8, border:"1px solid rgba(255,255,255,0.12)", background:"transparent", color:"rgba(255,255,255,0.45)", fontSize:11, fontFamily:"monospace", cursor:"pointer" }}>Cancel</button>
          <button onClick={() => canSave && onSave({ template:tmpl, wallColor, floorColor:floorClr, accentColor:accentClr, spaceName:spaceName.trim(), ownerName:ownerName.trim(), description:desc.trim() })}
            disabled={!canSave}
            style={{ padding:"8px 22px", borderRadius:8, border:"none", background:canSave?"rgba(165,42,42,0.85)":"rgba(165,42,42,0.25)", color:canSave?"white":"rgba(255,255,255,0.3)", fontSize:11, fontFamily:"monospace", fontWeight:700, cursor:canSave?"pointer":"not-allowed", letterSpacing:"0.06em" }}>
            Save Customization
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Modal ─────────────────────────────────────────────────────────────────
export default function Studio3DModal({ open, onClose }: Props) {
  const [cells,        setCells]        = useState<BookingCell[]>(makeInitialCells);
  const [mode,         setMode]         = useState<StudioMode>("viewer");
  const [view,         setView]         = useState<ViewMode>("iso");
  const [currentFloor, setCurrentFloor] = useState(0);
  const [selected,     setSelected]     = useState<string|null>(null);
  const [layerVisible, setLayerVisible] = useState([true,true,true]);
  const [isoAz,        setIsoAz]        = useState(25);
  const [isoZoom,      setIsoZoom]      = useState(1);
  const [panX,         setPanX]         = useState(0);
  const [panY,         setPanY]         = useState(0);
  const [customizing,  setCustomizing]  = useState<BookingCell|null>(null);

  const dragRef = useRef<{sx:number;sy:number;startAz:number;startPanX:number;startPanY:number;isPan:boolean}|null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") { if (customizing) setCustomizing(null); else onClose(); } };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose, customizing]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.12 : 1/1.12;
    setIsoZoom(z => Math.max(0.3, Math.min(6, z * f)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive:false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    dragRef.current = { sx:e.clientX, sy:e.clientY, startAz:isoAz, startPanX:panX, startPanY:panY, isPan:e.ctrlKey||e.metaKey };
  }

  function handleMouseMove(e: React.MouseEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (view === "iso") {
      if (d.isPan) { setPanX(d.startPanX + dx); setPanY(d.startPanY + dy); }
      else { setIsoAz(d.startAz + dx * 0.4); setPanY(d.startPanY + dy); }
    } else {
      setPanX(d.startPanX + dx);
      setPanY(d.startPanY + dy);
    }
  }

  function handleMouseUp() { dragRef.current = null; }

  function handleSelect(key: string) {
    setSelected(s => s === key ? null : key);
  }

  const selectedCell = cells.find(c => `${c.col},${c.row}` === selected) ?? null;

  function bookCell() {
    if (!selectedCell || selectedCell.status !== "available") return;
    setCells(prev => prev.map(c =>
      c.col === selectedCell.col && c.row === selectedCell.row
        ? { ...c, status:"booked", owner:"You" }
        : c
    ));
  }

  function openCustomize() {
    if (!selectedCell || (selectedCell.status !== "booked" && selectedCell.status !== "customized")) return;
    setCustomizing(selectedCell);
  }

  function saveCustomization(cust: Customization) {
    if (!customizing) return;
    setCells(prev => prev.map(c =>
      c.col === customizing.col && c.row === customizing.row
        ? { ...c, status:"customized", owner:cust.ownerName, spaceName:cust.spaceName,
            color:cust.wallColor, customization:cust }
        : c
    ));
    setCustomizing(null);
  }

  function resetView() { setIsoAz(25); setIsoZoom(1); setPanX(0); setPanY(0); }

  function toggleLayer(fi: number) {
    setLayerVisible(prev => { const next=[...prev]; next[fi]=!next[fi]; return next; });
  }

  // Stats
  const totalCells     = cells.length;
  const availableCount = cells.filter(c=>c.status==="available").length;
  const bookedCount    = cells.filter(c=>c.status==="booked").length;
  const customCount    = cells.filter(c=>c.status==="customized").length;

  const s: Record<string, React.CSSProperties> = {
    backdrop: { position:"fixed", inset:0, background:"rgba(4,10,20,0.72)", backdropFilter:"blur(4px)", zIndex:50, opacity:open?1:0, pointerEvents:open?"auto":"none", transition:"opacity 0.3s ease" },
    wrapper:  { position:"fixed", inset:0, zIndex:51, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:open?"auto":"none" },
    modal:    {
      width:"min(94vw, 1150px)", height:"min(90vh, 800px)",
      background:"#080E18", borderRadius:20, border:"1px solid rgba(165,42,42,0.35)",
      overflow:"hidden", display:"flex", flexDirection:"column",
      transform:open?"scale(1)":"scale(0.86)", opacity:open?1:0,
      transition:"transform 0.35s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease",
    },
    header: {
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"12px 22px", borderBottom:"1px solid rgba(165,42,42,0.2)", flexShrink:0, gap:10,
    },
    body:    { flex:1, display:"flex", overflow:"hidden" },
    sidebar: { width:196, background:"#07101F", display:"flex", flexDirection:"column", flexShrink:0, overflowY:"auto" as const },
    canvas:  { flex:1, overflow:"hidden", display:"flex", flexDirection:"column", position:"relative" as const },
    section: { padding:"12px 14px", borderBottom:"1px solid rgba(165,42,42,0.08)" },
    stitle:  { fontSize:9, fontFamily:"monospace", color:"rgba(255,255,255,0.22)", letterSpacing:"0.12em", textTransform:"uppercase" as const, marginBottom:8 },
    toggleGroup: { display:"flex", background:"rgba(255,255,255,0.05)", borderRadius:8, padding:3, gap:2 },
  };

  const tBtn = (active:boolean): React.CSSProperties => ({
    padding:"5px 14px", borderRadius:6, border:"none", fontSize:11, fontFamily:"monospace",
    letterSpacing:"0.07em", cursor:"pointer", transition:"all 0.16s", fontWeight:600,
    background:active?"rgba(165,42,42,0.85)":"transparent",
    color:active?"#F2F7FA":"rgba(255,255,255,0.32)",
  });

  const floorBtnStyle = (fi:number): React.CSSProperties => ({
    padding:"5px 13px", borderRadius:6, border:"1px solid",
    borderColor:currentFloor===fi?FLOOR_CFG[fi].main:"rgba(255,255,255,0.12)",
    background:currentFloor===fi?`${FLOOR_CFG[fi].main}22`:"transparent",
    color:currentFloor===fi?FLOOR_CFG[fi].main:"rgba(255,255,255,0.35)",
    fontSize:10, fontFamily:"monospace", cursor:"pointer", fontWeight:currentFloor===fi?700:400, transition:"all 0.15s",
  });

  const layerSwStyle = (on:boolean): React.CSSProperties => ({
    width:30, height:16, borderRadius:8, border:"none", cursor:"pointer",
    background:on?"rgba(165,42,42,0.8)":"rgba(255,255,255,0.15)", position:"relative", transition:"background 0.15s",
  });

  return (
    <>
      <div style={s.backdrop} onClick={onClose}/>

      <div style={s.wrapper}>
        <div style={s.modal}>

          {/* ── Header ── */}
          <div style={s.header}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:9, height:9, borderRadius:"50%", background:"#A52A2A", boxShadow:"0 0 10px #A52A2A" }}/>
              <span style={{ color:"#F2F7FA", fontFamily:"Georgia,serif", fontSize:15, fontWeight:700, letterSpacing:"0.05em" }}>OPEN STUDIO 3D</span>
              <span style={{ fontSize:11, color:"rgba(255,255,255,0.28)", fontFamily:"monospace", letterSpacing:"0.1em" }}>WOLFSBURG</span>
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {/* Mode toggle */}
              <div style={s.toggleGroup}>
                <button style={tBtn(mode==="editor")} onClick={() => setMode("editor")}>◈  Editor</button>
                <button style={tBtn(mode==="viewer")} onClick={() => setMode("viewer")}>◎  Viewer</button>
              </div>

              {/* View toggle */}
              <div style={s.toggleGroup}>
                <button style={tBtn(view==="iso")}  onClick={() => setView("iso")}>⬡ Isometric</button>
                <button style={tBtn(view==="plan")} onClick={() => setView("plan")}>⊞ Plan</button>
              </div>

              {/* Floor selector (editor only) */}
              {mode === "editor" && (
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ fontSize:9, color:"rgba(255,255,255,0.25)", fontFamily:"monospace", letterSpacing:"0.1em" }}>FLOOR</span>
                  {[0,1,2].map(fi => (
                    <button key={fi} style={floorBtnStyle(fi)} onClick={() => setCurrentFloor(fi)}>
                      {["G","+1","+2"][fi]}
                    </button>
                  ))}
                </div>
              )}

              {/* Reset + close */}
              <button onClick={resetView} style={{ padding:"5px 12px", borderRadius:6, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.05)", color:"rgba(255,255,255,0.45)", fontSize:10, fontFamily:"monospace", cursor:"pointer" }}>Reset</button>
              <button onClick={onClose} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.14)", borderRadius:8, color:"rgba(255,255,255,0.6)", width:32, height:32, cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", transition:"background 0.2s" }}>×</button>
            </div>
          </div>

          {/* ── Body ── */}
          <div style={s.body}>

            {/* Left sidebar */}
            <div style={{ ...s.sidebar, borderRight:"1px solid rgba(165,42,42,0.12)" }}>

              {/* Layer toggles */}
              <div style={s.section}>
                <div style={s.stitle}>Floors</div>
                {FLOOR_CFG.map((f,fi) => (
                  <div key={fi} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"5px 0", cursor:"pointer" }} onClick={() => toggleLayer(fi)}>
                    <span style={{ display:"flex", alignItems:"center", gap:7, fontSize:10, color:"rgba(255,255,255,0.45)" }}>
                      <span style={{ width:9, height:9, borderRadius:2, background:f.main, display:"inline-block" }}/>
                      {f.name}
                    </span>
                    <button style={layerSwStyle(layerVisible[fi])} onClick={e => { e.stopPropagation(); toggleLayer(fi); }}>
                      <span style={{ position:"absolute", width:12, height:12, borderRadius:"50%", background:"white", top:2, left:layerVisible[fi]?16:2, transition:"left 0.15s" }}/>
                    </button>
                  </div>
                ))}
              </div>

              {/* Cell status legend */}
              <div style={s.section}>
                <div style={s.stitle}>Cell Status</div>
                {[
                  { color:"#FF9800CC", label:"Fixed Structure" },
                  { color:"#C8E6C9",   label:"Available" },
                  { color:"#E0E0E0",   label:"Booked / Pending" },
                  { color:"#7BC67E",   label:"Customized" },
                  { color:"#424242",   label:"Locked" },
                ].map(l => (
                  <div key={l.label} style={{ display:"flex", alignItems:"center", gap:8, padding:"3px 0" }}>
                    <span style={{ width:10, height:10, borderRadius:2, background:l.color, flexShrink:0 }}/>
                    <span style={{ fontSize:10, color:"rgba(255,255,255,0.4)", fontFamily:"monospace" }}>{l.label}</span>
                  </div>
                ))}
              </div>

              {/* Site stats */}
              <div style={s.section}>
                <div style={s.stitle}>Site Overview</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5 }}>
                  {[
                    { val:availableCount, sub:"available" },
                    { val:bookedCount,    sub:"booked" },
                    { val:customCount,    sub:"customized" },
                    { val:`${GRID_N*CELL_M}m`, sub:"site side" },
                  ].map(({ val, sub }) => (
                    <div key={sub} style={{ background:"rgba(255,255,255,0.04)", borderRadius:6, padding:"7px 8px" }}>
                      <div style={{ fontSize:14, fontWeight:700, fontFamily:"monospace", color:"#D32F2F", lineHeight:1 }}>{val}</div>
                      <div style={{ fontSize:8, color:"rgba(255,255,255,0.25)", marginTop:2 }}>{sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floor info (editor mode) */}
              {mode === "editor" && (
                <div style={s.section}>
                  <div style={s.stitle}>Current Floor</div>
                  <div style={{ fontSize:11, fontWeight:700, color:FLOOR_CFG[currentFloor].main, fontFamily:"monospace", marginBottom:2 }}>
                    {FLOOR_CFG[currentFloor].name}
                  </div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", lineHeight:1.5 }}>
                    {FLOOR_CFG[currentFloor].sub}
                  </div>
                </div>
              )}
            </div>

            {/* Canvas */}
            <div ref={containerRef} style={s.canvas}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onContextMenu={e => e.preventDefault()}
            >
              {/* Toolbar */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 18px", borderBottom:"1px solid rgba(165,42,42,0.1)", flexShrink:0 }}>
                <span style={{ fontSize:9, color:"rgba(255,255,255,0.2)", fontFamily:"monospace", letterSpacing:"0.08em" }}>
                  {mode==="editor" ? `SITE ${GRID_N*CELL_M}×${GRID_N*CELL_M}m  ·  5×5 GRID  ·  FLOOR ${["G","+1","+2"][currentFloor]}` : `WOLFSBURG OPEN STUDIO  ·  ${view.toUpperCase()} VIEW`}
                </span>
                {view==="plan" && (
                  <span style={{ fontSize:9, color:"rgba(255,255,255,0.15)", fontFamily:"monospace" }}>CLICK CELL — select  ·  DRAG — pan</span>
                )}
              </div>

              <div style={{ flex:1, overflow:"hidden", cursor: view==="iso" ? "grab" : "default" }}>
                {view === "plan"
                  ? <PlanView cells={cells} selected={selected} onSelect={handleSelect} mode={mode} currentFloor={currentFloor}/>
                  : <IsoView  cells={cells} selected={selected} onSelect={handleSelect} az={isoAz} zoom={isoZoom} panX={panX} panY={panY} currentFloor={currentFloor} layerVisible={layerVisible}/>
                }
              </div>
            </div>

            {/* Right sidebar — cell details */}
            <div style={{ ...s.sidebar, borderLeft:"1px solid rgba(165,42,42,0.12)" }}>
              {selectedCell ? (
                <>
                  <div style={s.section}>
                    <div style={s.stitle}>Selected Cell</div>
                    <div style={{ fontSize:16, fontWeight:700, fontFamily:"monospace", color:"#F2E0D0", marginBottom:4 }}>
                      [{selectedCell.col},{selectedCell.row}]
                    </div>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,0.28)", fontFamily:"monospace", marginBottom:10 }}>
                      {selectedCell.col*CELL_M}–{(selectedCell.col+1)*CELL_M}m × {selectedCell.row*CELL_M}–{(selectedCell.row+1)*CELL_M}m
                    </div>

                    {/* Status badge */}
                    <div style={{
                      display:"inline-block", padding:"4px 10px", borderRadius:12, fontSize:10,
                      fontFamily:"monospace", fontWeight:700, marginBottom:12,
                      background: selectedCell.status==="available" ? "#C8E6C9" :
                                  selectedCell.status==="booked"    ? "#FFE082" :
                                  selectedCell.status==="customized"? (selectedCell.customization?.accentColor ?? "#81C784") :
                                  selectedCell.status==="fixed"     ? "#FFCC80" : "#757575",
                      color: selectedCell.status==="fixed" ? "#6D3200" : "#1A1A1A",
                    }}>
                      {{fixed:"🔒 Fixed",available:"🟢 Available",booked:"⏳ Booked",customized:"✓ Customized",locked:"⛔ Locked"}[selectedCell.status]}
                    </div>

                    {selectedCell.owner && (
                      <div style={{ marginBottom:6 }}>
                        <div style={{ fontSize:9, fontFamily:"monospace", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>Owner</div>
                        <div style={{ fontSize:12, fontFamily:"monospace", color:"#C0D4FA", fontWeight:600 }}>{selectedCell.owner}</div>
                      </div>
                    )}
                    {selectedCell.spaceName && (
                      <div style={{ marginBottom:8 }}>
                        <div style={{ fontSize:9, fontFamily:"monospace", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>Space Name</div>
                        <div style={{ fontSize:12, fontFamily:"monospace", color:"#C0D4FA" }}>{selectedCell.spaceName}</div>
                      </div>
                    )}
                    {selectedCell.customization && (
                      <div style={{ marginBottom:8 }}>
                        <div style={{ fontSize:9, fontFamily:"monospace", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>Layout</div>
                        <div style={{ fontSize:11, fontFamily:"monospace", color:"#C0D4FA" }}>
                          {TEMPLATES[selectedCell.customization.template]?.icon} {TEMPLATES[selectedCell.customization.template]?.label}
                        </div>
                        {selectedCell.customization.description && (
                          <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", marginTop:4, lineHeight:1.5 }}>{selectedCell.customization.description}</div>
                        )}
                        {/* Color preview */}
                        <div style={{ display:"flex", gap:4, marginTop:8 }}>
                          <div style={{ width:20, height:20, borderRadius:4, background:selectedCell.customization.wallColor, border:"1px solid rgba(255,255,255,0.15)" }} title="Wall"/>
                          <div style={{ width:20, height:20, borderRadius:4, background:selectedCell.customization.floorColor, border:"1px solid rgba(255,255,255,0.15)" }} title="Floor"/>
                          <div style={{ width:20, height:20, borderRadius:4, background:selectedCell.customization.accentColor, border:"1px solid rgba(255,255,255,0.15)" }} title="Accent"/>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {mode === "editor" && (
                    <div style={{ ...s.section, display:"flex", flexDirection:"column", gap:6 }}>
                      {selectedCell.status === "available" && (
                        <button onClick={bookCell} style={{ padding:"9px 12px", borderRadius:8, border:"none", background:"rgba(76,175,80,0.8)", color:"white", fontSize:11, fontFamily:"monospace", fontWeight:700, cursor:"pointer", letterSpacing:"0.06em" }}>
                          🏠 Book This Cell
                        </button>
                      )}
                      {(selectedCell.status === "booked" || selectedCell.status === "customized") && (
                        <button onClick={openCustomize} style={{ padding:"9px 12px", borderRadius:8, border:"none", background:"rgba(165,42,42,0.8)", color:"white", fontSize:11, fontFamily:"monospace", fontWeight:700, cursor:"pointer", letterSpacing:"0.06em" }}>
                          🎨 {selectedCell.status==="customized" ? "Edit Customization" : "Customize Space"}
                        </button>
                      )}
                      {selectedCell.status === "fixed" && (
                        <div style={{ fontSize:10, color:"rgba(255,255,255,0.28)", fontFamily:"monospace", lineHeight:1.6 }}>
                          This is part of the fixed core structure. It cannot be booked or modified.
                        </div>
                      )}
                      {selectedCell.status === "locked" && (
                        <div style={{ fontSize:10, color:"rgba(255,255,255,0.28)", fontFamily:"monospace", lineHeight:1.6 }}>
                          Structural zone — required for building integrity.
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={s.section}>
                    <div style={s.stitle}>Site Info</div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.25)", fontFamily:"monospace", lineHeight:1.7 }}>
                      Click any cell to inspect it.
                    </div>
                  </div>

                  <div style={s.section}>
                    <div style={s.stitle}>Fixed Core</div>
                    {FLOOR_CFG.slice(0,2).map((f,fi) => (
                      <div key={fi} style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:8 }}>
                        <div style={{ width:8, height:8, borderRadius:2, background:f.main, marginTop:2, flexShrink:0 }}/>
                        <div>
                          <div style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,0.55)", fontFamily:"monospace" }}>{f.name}</div>
                          <div style={{ fontSize:9, color:"rgba(255,255,255,0.28)" }}>{f.sub}</div>
                          <div style={{ fontSize:9, color:"rgba(255,255,255,0.2)", fontFamily:"monospace" }}>10×10m · locked</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={s.section}>
                    <div style={s.stitle}>Bookable Cells</div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.25)", lineHeight:1.7, fontFamily:"monospace" }}>
                      20 cells · 5m×5m each<br/>
                      {availableCount} available<br/>
                      {bookedCount+customCount} occupied
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Customization sub-modal */}
      {customizing && (
        <CustomizationEditor
          cell={customizing}
          onSave={saveCustomization}
          onCancel={() => setCustomizing(null)}
        />
      )}
    </>
  );
}
