import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, OrthographicCamera, Center } from '@react-three/drei'
import * as THREE from 'three'

// ── geometry helpers ──────────────────────────────────────────────────────────
function buildGeometry(part) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(part.positions, 3))
  g.setIndex(part.indices)
  g.computeVertexNormals()
  return g
}

const toColor = (c) => new THREE.Color(c[0] / 255, c[1] / 255, c[2] / 255)

// floor layer names as received from the model
const FLOOR_LAYER_KEYS = new Set(['Floor G', 'floor 1', 'floor 2', 'floor 3', 'floor 4', 'floor 5'])

// residential floors — these trigger the Stay booking panel instead of activity booking
const STAY_FLOOR_KEYS = new Set(['floor 1', 'floor 2', 'floor 3'])
const STAY_FLOOR_IDX  = { 'floor 1': 1, 'floor 2': 2, 'floor 3': 3 }

// Three.js Y centres of each floor slab (after -PI/2 rotation + Center)
const FLOOR_CTR_Y = [-8.75, -5.55, -2.35, 0.85, 4.05, 7.35]

// Outer skin layers that fade in X-Ray mode; structural skeleton stays solid
const XRAY_SKIN = ['walls', 'walls 2', 'walls 3']

// ── per-layer mesh ────────────────────────────────────────────────────────────
function LayerMesh({ part, mode, hovered, onHover, opacityMod = 1, xrayLevel = 0 }) {
  const geo       = useMemo(() => buildGeometry(part), [part])
  const baseColor = useMemo(() => toColor(part.color), [part])

  const isXraySkin  = XRAY_SKIN.includes(part.layer)
  const xrayFrac    = xrayLevel / 100
  const finalOpMod  = (isXraySkin && xrayFrac > 0)
    ? opacityMod * (1 - xrayFrac * 0.94)   // fades from full → 6% as slider → 100
    : opacityMod
  const finalOp     = part.opacity * finalOpMod
  const roughness   = isXraySkin && xrayFrac > 0 ? 0.0  : 0.65
  const metalness   = isXraySkin && xrayFrac > 0 ? 0.30 * xrayFrac : 0.05

  return (
    <mesh
      geometry={geo}
      castShadow
      receiveShadow
      onPointerOver={(e) => { e.stopPropagation(); onHover(part.layer) }}
      onPointerOut={() => onHover(null)}
    >
      <meshStandardMaterial
        color={baseColor}
        transparent={finalOp < 1}
        opacity={finalOp}
        roughness={roughness}
        metalness={metalness}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// ── scene ─────────────────────────────────────────────────────────────────────
function Model({ data, visible, activeFloor, focusLayers, mode, hovered, onHover, xrayLevel = 0 }) {
  // when a floor is active, get its 0-5 index to match against the `floor` field
  const activeFloorIdx = activeFloor ? BKG_FLOOR_KEYS.indexOf(activeFloor) : -1

  return (
    <Center>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {data.statics
          .filter((p) => {
            // floor slab layers: always keep in tree so they can be dimmed/brightened
            if (FLOOR_LAYER_KEYS.has(p.layer)) return true
            return visible[p.layer] !== false
          })
          .map((p, i) => {
            let opacityMod = 1

            if (activeFloor) {
              if (FLOOR_LAYER_KEYS.has(p.layer)) {
                // floor slab layers: isolate by layer name (existing behaviour)
                opacityMod = p.layer === activeFloor ? 1 : 0.07
              } else if (p.floor != null) {
                // tagged non-floor geometry: show only the active floor
                opacityMod = p.floor === activeFloorIdx ? 1 : 0.07
              } else {
                // multi-floor element (null tag): dim same as inactive floors
                opacityMod = 0.07
              }
            } else if (focusLayers) {
              opacityMod = focusLayers.includes(p.layer) ? 1 : 0.05
            }

            return (
              <LayerMesh
                key={i}
                part={p}
                mode={mode}
                hovered={hovered}
                onHover={onHover}
                opacityMod={opacityMod}
                xrayLevel={xrayLevel}
              />
            )
          })}
      </group>
    </Center>
  )
}

// ── editor grid ───────────────────────────────────────────────────────────────
function EditorGrid() {
  return (
    <gridHelper
      args={[2000, 100, 0x172040, 0x1e2a4a]}
      position={[0, -1, 0]}
    />
  )
}

// ── cameras + controls ────────────────────────────────────────────────────────
// key is set on this component externally so that switching mode/viewMode
// forces a full remount — ensuring OrbitControls re-attaches to the new camera.
function SceneCamera({ mode, viewMode }) {
  if (mode === 'editor' && viewMode === 'plan') {
    return (
      <>
        {/* top-down orthographic; up=-Z so model north faces screen top */}
        <OrthographicCamera
          makeDefault
          position={[0, 800, 0.01]}
          up={[0, 0, -1]}
          zoom={12}
          near={0.1}
          far={8000}
        />
        <OrbitControls
          makeDefault
          target={[0, 0, 0]}
          enableRotate={false}
          enablePan
          enableZoom
          zoomSpeed={1.2}
        />
      </>
    )
  }

  if (mode === 'editor' && (viewMode === 'iso' || viewMode === 'catalogue')) {
    return (
      <>
        {/* classic equal-angle isometric — shared by iso and catalogue views */}
        <OrthographicCamera
          makeDefault
          position={[-55, 45, 55]}
          zoom={10}
          near={0.1}
          far={8000}
        />
        <OrbitControls
          makeDefault
          target={[0, 0, 0]}
          enablePan
          enableZoom
          enableRotate
          zoomSpeed={1.2}
          minDistance={50}
          maxDistance={4000}
        />
      </>
    )
  }

  // viewer — perspective, close enough to clearly see the model on load
  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[50, 30, 70]}
        fov={50}
        near={0.5}
        far={5000}
      />
      <OrbitControls
        makeDefault
        target={[0, 0, 0]}
        minDistance={10}
        maxDistance={3000}
        enablePan
      />
    </>
  )
}

// ── floor zoom controller (viewer mode only) ──────────────────────────────────
// When a floor is active, smoothly pan the orbit target to that floor's Y centre.
// Also gently zooms in so the selected floor fills the viewport.
function FloorZoomController({ activeFloor }) {
  const { controls, camera } = useThree()
  const destTargetY = useRef(0)
  const destDist    = useRef(null)  // null = don't touch camera distance

  useEffect(() => {
    const idx = activeFloor ? BKG_FLOOR_KEYS.indexOf(activeFloor) : -1
    if (idx >= 0) {
      destTargetY.current = FLOOR_CTR_Y[idx]
      destDist.current    = 55   // zoom in to ~55 units from target
    } else {
      destTargetY.current = 0
      destDist.current    = null
    }
  }, [activeFloor])

  useFrame(() => {
    if (!controls) return
    controls.target.y = THREE.MathUtils.lerp(controls.target.y, destTargetY.current, 0.06)
    if (destDist.current !== null) {
      const dir     = camera.position.clone().sub(controls.target).normalize()
      const currD   = camera.position.distanceTo(controls.target)
      const nextD   = THREE.MathUtils.lerp(currD, destDist.current, 0.05)
      camera.position.copy(controls.target).addScaledVector(dir, nextD)
    }
    controls.update()
  })
  return null
}

// ── booking: constants ────────────────────────────────────────────────────────
// Real floor footprint 45.38 × 30.18 m → 9 cols × 6 rows at 5 m/cell
const BKG_KEY  = 'wolfsburg_deployable_bookings'
const BKG_ROWS = 6    // 6 × 5 m = 30 m depth
const BKG_COLS = 9    // 9 × 5 m = 45 m width
const BKG_M    = 5    // metres per cell
const BKG_SQM  = BKG_M * BKG_M  // 25 m² per cell

// Model bbox centre in three.js space (computed from all geometry positions):
// Rotation [-π/2,0,0]: (rhinoX, rhinoZ, -rhinoY)
// Full model bounds → cx=788, cy=10.43, cz=5
const BKG_CX = 788.0, BKG_CY = 10.43, BKG_CZ = 5.0
const BKG_FLOOR_RHOZ  = [0, 3.2, 6.4, 9.6, 12.8, 16.1]  // Rhino Z of each slab
const BKG_FLOOR_MIN_X = 765.3   // Rhino X left edge of building
const BKG_FLOOR_MIN_Y = -20.2   // Rhino Y bottom edge of building

// Return centred three.js position for cell centre (row, col) on given floor
function bkgPos(row, col, floorIdx) {
  const rhX = BKG_FLOOR_MIN_X + col * BKG_M + BKG_M / 2
  const rhY = BKG_FLOOR_MIN_Y + row * BKG_M + BKG_M / 2
  const rhZ = BKG_FLOOR_RHOZ[floorIdx]
  // After rotation: three.js (X, Y, Z) = (rhinoX, rhinoZ, -rhinoY)
  return [rhX - BKG_CX, rhZ - BKG_CY + 0.08, -rhY - BKG_CZ]
}

const FLOOR_H_M = 3.2  // floor-to-ceiling height in metres

// Compute perimeter wall segments for a set of cell IDs on a given floor.
// Returns array of { id, pos, dir, side, geo } for each exterior edge.
function getPerimeterWalls(cells, floorIdx) {
  const cellSet = new Set(cells)
  const walls = []
  const added = new Set()
  cells.forEach(cellId => {
    const [r, c] = cellId.split('-').map(Number)
    const [cx, cy, cz] = bkgPos(r, c, floorIdx)
    const wy = cy + FLOOR_H_M / 2  // wall centre Y
    const edges = [
      { adj: `${r - 1}-${c}`, key: `H|${r}|${c}`,   side: 'top',    pos: [cx, wy, cz + BKG_M / 2], dir: [0, 0, 1],  geo: 'h' },
      { adj: `${r + 1}-${c}`, key: `H|${r + 1}|${c}`,side: 'bottom', pos: [cx, wy, cz - BKG_M / 2], dir: [0, 0, -1], geo: 'h' },
      { adj: `${r}-${c - 1}`, key: `V|${r}|${c}`,   side: 'left',   pos: [cx - BKG_M / 2, wy, cz], dir: [-1, 0, 0], geo: 'v' },
      { adj: `${r}-${c + 1}`, key: `V|${r}|${c + 1}`,side: 'right',  pos: [cx + BKG_M / 2, wy, cz], dir: [1, 0, 0],  geo: 'v' },
    ]
    edges.forEach(({ adj, key, side, pos, dir, geo }) => {
      if (!cellSet.has(adj) && !added.has(key)) {
        added.add(key)
        walls.push({ id: key, pos, dir, side, geo })
      }
    })
  })
  return walls
}

const BKG_FLOORS = [
  { label: 'FG', name: 'Ground Floor',  z: '0 – 3.2 m'     },
  { label: 'F1', name: 'First Floor',   z: '3.2 – 6.4 m'   },
  { label: 'F2', name: 'Second Floor',  z: '6.4 – 9.6 m'   },
  { label: 'F3', name: 'Third Floor',   z: '9.6 – 12.8 m'  },
  { label: 'F4', name: 'Fourth Floor',  z: '12.8 – 16.1 m' },
  { label: 'F5', name: 'Fifth Floor',   z: '16.1 – 19.3 m' },
]
// maps booking floor index → model layer key (for floor isolation in catalogue)
const BKG_FLOOR_KEYS = ['Floor G', 'floor 1', 'floor 2', 'floor 3', 'floor 4', 'floor 5']

const BKG_ACTIVITIES = [
  'Co-working','Event / Performance','Play / Recreation','Retreat / Quiet Work',
  'Workshop / Making','Community Kitchen','Exhibition','Outdoor Extension',
]
const BKG_DURATIONS = ['1 day','3 days','1 week','2 weeks','1 month','Permanent (residents only)']
const BKG_ABBREV = {
  'Co-working':'CW','Event / Performance':'EV','Play / Recreation':'PL',
  'Retreat / Quiet Work':'RQ','Workshop / Making':'WS','Community Kitchen':'CK',
  'Exhibition':'EX','Outdoor Extension':'OE',
}

// localStorage helpers
const bkgLoad    = ()  => { try { return JSON.parse(localStorage.getItem(BKG_KEY) || '[]') } catch { return [] } }
const bkgSave    = (b) => { const a = bkgLoad(); a.push(b); localStorage.setItem(BKG_KEY, JSON.stringify(a)) }
const bkgCancel  = (id)=> { localStorage.setItem(BKG_KEY, JSON.stringify(bkgLoad().filter(b => b.id !== id))) }

// ── stay booking: constants ───────────────────────────────────────────────────
const STAY_KEY = 'wolfsburg_stay_bookings'

const STAY_ROOMS = [
  // ── Floor 1 · 3 singles + 4 doubles ─────────────────────────────────────
  { id:'F1-S1', floor:1, type:'single', name:'Single 1', desc:'East-facing · work desk · reading lamp · shared bath',    rate:20, capacity:1, available:true,  cells:['0-0'] },
  { id:'F1-S2', floor:1, type:'single', name:'Single 2', desc:'Garden side · skylight · blackout curtain · wardrobe',   rate:20, capacity:1, available:false, cells:['0-1'] },
  { id:'F1-S3', floor:1, type:'single', name:'Single 3', desc:'Corner room · cross ventilation · compact layout',       rate:18, capacity:1, available:true,  cells:['0-2'] },
  { id:'F1-D1', floor:1, type:'double', name:'Double 1', desc:'Two beds · lounge access · south light',                 rate:34, capacity:2, available:true,  cells:['1-0','1-1'] },
  { id:'F1-D2', floor:1, type:'double', name:'Double 2', desc:'Open plan · twin beds · terrace connection',             rate:34, capacity:2, available:true,  cells:['1-2','1-3'] },
  { id:'F1-D3', floor:1, type:'double', name:'Double 3', desc:'Side courtyard · reading bench · wardrobe',              rate:32, capacity:2, available:false, cells:['2-0','2-1'] },
  { id:'F1-D4', floor:1, type:'double', name:'Double 4', desc:'Corner · cross ventilation · two beds · storage',        rate:32, capacity:2, available:true,  cells:['2-2','2-3'] },

  // ── Floor 2 · 5 × 4-person dorms + 1 × 6-person dorm ───────────────────
  { id:'F2-X1', floor:2, type:'dorm', name:'Dorm 1',  desc:'4 beds · privacy curtains · lockable storage · east light', rate:48, capacity:4, available:true,  cells:['0-0','0-1'] },
  { id:'F2-X2', floor:2, type:'dorm', name:'Dorm 2',  desc:'4 beds · shared lounge · blackout curtains',               rate:48, capacity:4, available:false, cells:['0-2','0-3'] },
  { id:'F2-X3', floor:2, type:'dorm', name:'Dorm 3',  desc:'4 beds · south facade · cross ventilation',               rate:44, capacity:4, available:true,  cells:['0-4','0-5'] },
  { id:'F2-X4', floor:2, type:'dorm', name:'Dorm 4',  desc:'4 beds · courtyard view · private lockers',               rate:44, capacity:4, available:true,  cells:['1-0','1-1'] },
  { id:'F2-X5', floor:2, type:'dorm', name:'Dorm 5',  desc:'4 beds · kitchen nook · reading area',                    rate:48, capacity:4, available:false, cells:['1-2','1-3'] },
  { id:'F2-X6', floor:2, type:'dorm', name:'Dorm 6',  desc:'6 beds · community lounge · terrace access · lockers',    rate:60, capacity:6, available:true,  cells:['1-4','1-5','1-6'] },

  // ── Floor 3 · 3 singles + 4 doubles (top floor, premium) ────────────────
  { id:'F3-S1', floor:3, type:'single', name:'Single 4', desc:'Top floor · panoramic east view · skylight · desk',     rate:24, capacity:1, available:true,  cells:['0-0'] },
  { id:'F3-S2', floor:3, type:'single', name:'Single 5', desc:'Roof terrace access · reading lamp · wardrobe',         rate:24, capacity:1, available:true,  cells:['0-1'] },
  { id:'F3-S3', floor:3, type:'single', name:'Single 6', desc:'Corner · sunset side · cross ventilation · quiet',      rate:22, capacity:1, available:false, cells:['0-2'] },
  { id:'F3-D1', floor:3, type:'double', name:'Double 5', desc:'Premium finish · panoramic · two beds · lounge',        rate:40, capacity:2, available:true,  cells:['1-0','1-1'] },
  { id:'F3-D2', floor:3, type:'double', name:'Double 6', desc:'Top floor corner · large windows · twin beds',          rate:40, capacity:2, available:true,  cells:['1-2','1-3'] },
  { id:'F3-D3', floor:3, type:'double', name:'Double 7', desc:'Terrace-linked · south light · storage · wardrobe',     rate:38, capacity:2, available:false, cells:['2-0','2-1'] },
  { id:'F3-D4', floor:3, type:'double', name:'Double 8', desc:'Garden side · open plan · reading bench · two beds',    rate:38, capacity:2, available:true,  cells:['2-2','2-3'] },
]

const STAY_ROLES = [
  { key:'guest',  label:'Guest',  sub:'Pay per night',     disc:0   },
  { key:'member', label:'Member', sub:'20% off · 2h/week', disc:0.2 },
  { key:'keeper', label:'Keeper', sub:'40% off · 6h/week', disc:0.4 },
]

const stayLoad = () => { try { return JSON.parse(localStorage.getItem(STAY_KEY) || '[]') } catch { return [] } }
const staySave = (b) => {
  const a = stayLoad()
  a.push(b)
  localStorage.setItem(STAY_KEY, JSON.stringify(a))
}

function stayNights(ci, co) {
  if (!ci || !co) return 0
  return Math.max(0, Math.round((new Date(co) - new Date(ci)) / 86400000))
}

// ── stay: 3D cell overlay (inside Canvas) ─────────────────────────────────────
// type → base color mapping for 3D room overlays
const STAY_TYPE_COLOR = { single: '#4CC9F0', double: '#FFE600', dorm: '#F72585' }

function StayCells({ hoveredId, selectedId, bookedIds, activeFloorIdx, onSelect }) {
  const planeGeo = useMemo(() => new THREE.PlaneGeometry(BKG_M - 0.3, BKG_M - 0.3), [])
  const edgeGeo  = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(BKG_M - 0.05, BKG_M - 0.05)), [])

  // per-type available materials (single=cyan, double=yellow, dorm=pink)
  const matSingle = useMemo(() => new THREE.MeshBasicMaterial({ color:'#4CC9F0', transparent:true, opacity:0.15, depthWrite:false, side:THREE.DoubleSide }), [])
  const matDouble = useMemo(() => new THREE.MeshBasicMaterial({ color:'#FFE600', transparent:true, opacity:0.15, depthWrite:false, side:THREE.DoubleSide }), [])
  const matDorm   = useMemo(() => new THREE.MeshBasicMaterial({ color:'#F72585', transparent:true, opacity:0.15, depthWrite:false, side:THREE.DoubleSide }), [])
  const TYPE_MAT  = { single: matSingle, double: matDouble, dorm: matDorm }

  // hovered: brighter version of type color
  const matHovSingle = useMemo(() => new THREE.MeshBasicMaterial({ color:'#4CC9F0', transparent:true, opacity:0.50, depthWrite:false, side:THREE.DoubleSide }), [])
  const matHovDouble = useMemo(() => new THREE.MeshBasicMaterial({ color:'#FFE600', transparent:true, opacity:0.50, depthWrite:false, side:THREE.DoubleSide }), [])
  const matHovDorm   = useMemo(() => new THREE.MeshBasicMaterial({ color:'#F72585', transparent:true, opacity:0.50, depthWrite:false, side:THREE.DoubleSide }), [])
  const TYPE_HOV_MAT = { single: matHovSingle, double: matHovDouble, dorm: matHovDorm }

  // selected: strong yellow glow
  const matSel    = useMemo(() => new THREE.MeshBasicMaterial({ color:'#FFE600', transparent:true, opacity:0.42, depthWrite:false, side:THREE.DoubleSide }), [])
  // occupied: muted pink
  const matOcc    = useMemo(() => new THREE.MeshBasicMaterial({ color:'#F72585', transparent:true, opacity:0.12, depthWrite:false, side:THREE.DoubleSide }), [])
  // booked (confirmed): grey
  const matBkd    = useMemo(() => new THREE.MeshBasicMaterial({ color:'#888888', transparent:true, opacity:0.42, depthWrite:false, side:THREE.DoubleSide }), [])

  // edge materials
  const eSingle = useMemo(() => new THREE.LineBasicMaterial({ color:'#4CC9F0', transparent:true, opacity:0.28 }), [])
  const eDouble = useMemo(() => new THREE.LineBasicMaterial({ color:'#FFE600', transparent:true, opacity:0.28 }), [])
  const eDorm   = useMemo(() => new THREE.LineBasicMaterial({ color:'#F72585', transparent:true, opacity:0.28 }), [])
  const TYPE_EDGE = { single: eSingle, double: eDouble, dorm: eDorm }
  const eHov    = useMemo(() => new THREE.LineBasicMaterial({ color:'#ffffff', opacity:0.85 }), [])
  const eSel    = useMemo(() => new THREE.LineBasicMaterial({ color:'#FFE600', opacity:1.0  }), [])
  const eOcc    = useMemo(() => new THREE.LineBasicMaterial({ color:'#F72585', transparent:true, opacity:0.35 }), [])
  const eBkd    = useMemo(() => new THREE.LineBasicMaterial({ color:'#888888', transparent:true, opacity:0.45 }), [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const p = 0.5 + 0.5 * Math.sin(t * 1.8)
    // pulse available cells by type
    matSingle.opacity = 0.10 + 0.14 * p
    matDouble.opacity = 0.10 + 0.14 * p
    matDorm.opacity   = 0.10 + 0.14 * p
    eSingle.opacity   = 0.15 + 0.22 * p
    eDouble.opacity   = 0.15 + 0.22 * p
    eDorm.opacity     = 0.15 + 0.22 * p
    // pulse selected
    matSel.opacity    = 0.32 + 0.16 * p
    eSel.opacity      = 0.65 + 0.35 * p
  })

  // filter rooms: if activeFloorIdx given, only show that floor
  const visibleRooms = activeFloorIdx != null
    ? STAY_ROOMS.filter(r => r.floor === activeFloorIdx)
    : STAY_ROOMS

  return (
    <group>
      {visibleRooms.map(room => {
        const isHov = room.id === hoveredId
        const isSel = room.id === selectedId
        const isBkd = bookedIds.has(room.id)
        const pm = isSel ? matSel
                 : isHov ? TYPE_HOV_MAT[room.type]
                 : isBkd ? matBkd
                 : room.available ? TYPE_MAT[room.type]
                 : matOcc
        const em = isSel ? eSel
                 : isHov ? eHov
                 : isBkd ? eBkd
                 : room.available ? TYPE_EDGE[room.type]
                 : eOcc
        return room.cells.map(cellId => {
          const [r, c] = cellId.split('-').map(Number)
          const [px, py, pz] = bkgPos(r, c, room.floor)
          return (
            <group key={`${room.id}-${cellId}`} position={[px, py, pz]} rotation={[-Math.PI/2, 0, 0]}>
              <mesh geometry={planeGeo} material={pm}
                onClick={(e) => { e.stopPropagation(); if (room.available && !isBkd) onSelect?.(room.id) }} />
              <lineSegments geometry={edgeGeo} material={em} />
            </group>
          )
        })
      })}
    </group>
  )
}

// ── stay: right panel (DOM) ───────────────────────────────────────────────────
function StayRightPanel({ hoveredId, setHoveredId, selectedId, setSelectedId, bookings, onBook, activeFloor }) {
  const [floorFilter, setFloorFilter] = useState(null)
  const [role,        setRole]        = useState('guest')
  const [form,        setForm]        = useState({ checkIn:'', checkOut:'', name:'', email:'', guests:1 })
  const [toast,       setToast]       = useState('')

  // auto-sync floor filter from left panel selection
  useEffect(() => {
    const idx = STAY_FLOOR_IDX[activeFloor] ?? null
    setFloorFilter(idx)
    setSelectedId(null)
  }, [activeFloor])

  const bookedIds    = new Set(bookings.map(b => b.roomId))
  const filtered     = STAY_ROOMS.filter(r => floorFilter === null || r.floor === floorFilter)
  const selectedRoom = STAY_ROOMS.find(r => r.id === selectedId)
  const nights       = stayNights(form.checkIn, form.checkOut)
  const roleDef      = STAY_ROLES.find(r => r.key === role)
  const disc         = roleDef?.disc || 0
  const adjRate      = selectedRoom ? Math.round(selectedRoom.rate * (1 - disc)) : 0
  const total        = adjRate * nights

  const canBook = !!(
    selectedRoom && selectedRoom.available && !bookedIds.has(selectedId) &&
    form.name.trim() && form.checkIn && form.checkOut && nights > 0 &&
    form.guests >= 1 && form.guests <= (selectedRoom?.capacity || 1)
  )

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2800)
  }

  const handleBook = () => {
    if (!canBook) return
    const booking = {
      id: `stay-${Date.now()}`,
      roomId: selectedId,
      roomName: selectedRoom.name,
      floor: selectedRoom.floor,
      role,
      ...form,
      nights,
      adjRate,
      total,
    }
    onBook(booking)
    staySave(booking)
    setForm({ checkIn:'', checkOut:'', name:'', email:'', guests:1 })
    setSelectedId(null)
    showToast(`${selectedRoom.name} booked for ${nights} night${nights !== 1 ? 's' : ''} · €${total}`)
  }

  return (
    <div className="stay-panel">
      {/* header */}
      <div className="stay-header">
        <div className="stay-title">Stay</div>
        <div className="stay-sub">Residential · Floors 1 – 3</div>
      </div>

      {/* membership tier */}
      <div className="stay-roles">
        {STAY_ROLES.map(r => (
          <button key={r.key}
            className={`stay-role-btn ${role === r.key ? 'active' : ''}`}
            onClick={() => setRole(r.key)}>
            <span className="srb-label">{r.label}</span>
            <span className="srb-sub">{r.sub}</span>
          </button>
        ))}
      </div>

      {/* room type legend */}
      <div className="stay-legend">
        <span className="sleg sleg-single">Single</span>
        <span className="sleg sleg-double">Double</span>
        <span className="sleg sleg-dorm">Dorm</span>
        <span className="sleg sleg-booked">Booked</span>
      </div>

      {/* floor tabs */}
      <div className="stay-floor-tabs">
        {[null, 1, 2, 3].map(f => (
          <button key={f ?? 'all'}
            className={`stay-floor-tab ${floorFilter === f ? 'active' : ''}`}
            onClick={() => setFloorFilter(prev => prev === f ? null : f)}>
            {f === null ? 'All' : `F${f}`}
          </button>
        ))}
      </div>

      {/* room cards */}
      <div className="stay-cards">
        {filtered.map(room => {
          const isBkd  = bookedIds.has(room.id)
          const isSel  = room.id === selectedId
          const isHov  = room.id === hoveredId
          const status = isBkd ? 'booked' : room.available ? 'available' : 'occupied'
          const adjR   = Math.round(room.rate * (1 - disc))
          return (
            <div key={room.id}
              className={`stay-card ${status}${isSel ? ' selected' : ''}${isHov ? ' hovered' : ''}`}
              onMouseEnter={() => setHoveredId(room.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => setSelectedId(prev => prev === room.id ? null : room.id)}
            >
              <div className="sc-head">
                <span className={`sc-type sc-${room.type}`}>{room.type}</span>
                <span className="sc-floor-tag">F{room.floor}</span>
                <span className={`sc-dot sc-dot-${status}`} />
              </div>
              <div className="sc-name">{room.name}</div>
              <div className="sc-desc">{room.desc}</div>
              <div className="sc-foot">
                <span className="sc-rate">
                  {disc > 0 && <span className="sc-orig">€{room.rate} </span>}
                  €{adjR}
                  <span className="sc-per">/night</span>
                  {room.type === 'dorm' && (
                    <span className="sc-per"> · €{Math.round(adjR / room.capacity)}/bed</span>
                  )}
                </span>
                <span className="sc-cap">
                  {room.capacity} {room.capacity === 1 ? 'person' : room.type === 'dorm' ? 'beds' : 'people'}
                </span>
              </div>
              <div className={`sc-status-label sc-status-${status}`}>
                {isBkd ? 'Booked' : room.available ? 'Available' : 'Occupied'}
              </div>
            </div>
          )
        })}
      </div>

      {/* booking form */}
      {selectedRoom && (
        <div className="stay-form">
          <div className="sf-title">Reserve · {selectedRoom.name}</div>

          <div className="sf-dates">
            <div className="sf-field">
              <label>Check-in</label>
              <input type="date" value={form.checkIn}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setForm(f => ({...f, checkIn:e.target.value}))} />
            </div>
            <div className="sf-field">
              <label>Check-out</label>
              <input type="date" value={form.checkOut}
                min={form.checkIn || new Date().toISOString().split('T')[0]}
                onChange={e => setForm(f => ({...f, checkOut:e.target.value}))} />
            </div>
          </div>

          <div className="sf-field">
            <label>Guests (max {selectedRoom.capacity})</label>
            <input type="number" min={1} max={selectedRoom.capacity} value={form.guests}
              onChange={e => setForm(f => ({...f, guests:Math.min(selectedRoom.capacity, Math.max(1, Number(e.target.value)))}))} />
          </div>

          <div className="sf-field">
            <label>Name</label>
            <input type="text" placeholder="Your name"
              value={form.name}
              onChange={e => setForm(f => ({...f, name:e.target.value}))} />
          </div>

          <div className="sf-field">
            <label>Email</label>
            <input type="email" placeholder="your@email.com"
              value={form.email}
              onChange={e => setForm(f => ({...f, email:e.target.value}))} />
          </div>

          {/* rent calculation */}
          <div className="sf-calc">
            <div className="sf-calc-row">
              <span>€{adjRate}/night × {nights > 0 ? nights : '–'} nights</span>
              <span className="sf-amt">€{nights > 0 ? total : '–'}</span>
            </div>
            {selectedRoom.type === 'dorm' && nights > 0 && (
              <div className="sf-calc-row">
                <span>Per bed/night</span>
                <span>€{Math.round(adjRate / selectedRoom.capacity)}</span>
              </div>
            )}
            {disc > 0 && (
              <div className="sf-calc-row sf-disc">
                <span>{roleDef.label} −{Math.round(disc*100)}%</span>
                <span className="sf-saved">saves €{Math.round((selectedRoom.rate - adjRate) * (nights || 0))}</span>
              </div>
            )}
            {nights > 0 && (
              <div className="sf-calc-total">
                <span>Total</span>
                <span>€{total}</span>
              </div>
            )}
          </div>

          <button className="sf-book-btn" disabled={!canBook} onClick={handleBook}>
            {!selectedRoom.available ? 'Room Occupied'
              : bookedIds.has(selectedId) ? 'Already Booked'
              : 'Book Stay →'}
          </button>
        </div>
      )}

      {/* confirmed stays list */}
      {bookings.length > 0 && (
        <div className="stay-confirmed">
          <div className="stay-conf-title">Confirmed Stays</div>
          {bookings.map((b, i) => (
            <div key={i} className="stay-conf-row">
              <div className="scr-info">
                <span className="scr-name">{b.roomName}</span>
                <span className="scr-dates">{b.checkIn} → {b.checkOut}</span>
              </div>
              <span className="scr-total">€{b.total}</span>
            </div>
          ))}
        </div>
      )}

      {toast && <div className="stay-toast">{toast}</div>}
    </div>
  )
}

// ── booking: 3D cells (inside Canvas) ────────────────────────────────────────
function BookingCells({ floor, sel, bookings, onToggle }) {
  const planeGeo  = useMemo(() => new THREE.PlaneGeometry(BKG_M - 0.25, BKG_M - 0.25), [])
  const haloGeo   = useMemo(() => new THREE.PlaneGeometry(BKG_M + 1.4, BKG_M + 1.4), [])
  const edgeGeo   = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(BKG_M, BKG_M)), [])
  const matEmpty  = useMemo(() => new THREE.MeshBasicMaterial({ color: '#4CC9F0', transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide }), [])
  const matSel    = useMemo(() => new THREE.MeshBasicMaterial({ color: '#FFE600', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }), [])
  const matHalo   = useMemo(() => new THREE.MeshBasicMaterial({ color: '#FFE600', transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }), [])
  const matBooked = useMemo(() => new THREE.MeshBasicMaterial({ color: '#888888', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }), [])
  const matEdge   = useMemo(() => new THREE.LineBasicMaterial({ color: '#4CC9F0', transparent: true, opacity: 0.20 }), [])
  const matEdgeSel= useMemo(() => new THREE.LineBasicMaterial({ color: '#FFE600', transparent: true, opacity: 0.90 }), [])

  useFrame(({ clock }) => {
    const t     = clock.getElapsedTime()
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.4)
    matSel.opacity     = 0.30 + 0.50 * pulse
    matHalo.opacity    = 0.04 + 0.18 * pulse
    matEdgeSel.opacity = 0.50 + 0.50 * pulse
    // Feature 1: available units pulse with soft blue light
    const avPulse    = 0.5 + 0.5 * Math.sin(t * 1.6 + 0.8)
    matEmpty.opacity = 0.05 + 0.14 * avPulse
    matEdge.opacity  = 0.10 + 0.18 * avPulse
  })

  const bkdMap = {}
  bookings.filter(b => b.floor === floor).forEach(b => b.cells.forEach(c => bkdMap[c] = b))

  const cells = []
  for (let r = 0; r < BKG_ROWS; r++) {
    for (let c = 0; c < BKG_COLS; c++) {
      const id    = `${r}-${c}`
      const bkg   = bkdMap[id]
      const isSel = sel.has(id)
      const [px, py, pz] = bkgPos(r, c, floor)
      cells.push(
        <group key={id} position={[px, py, pz]} rotation={[-Math.PI / 2, 0, 0]}>
          {isSel && <mesh geometry={haloGeo} material={matHalo} position={[0, 0, -0.01]} />}
          <mesh
            geometry={planeGeo}
            material={bkg ? matBooked : isSel ? matSel : matEmpty}
            onClick={(e) => { e.stopPropagation(); if (!bkg) onToggle(id) }}
          />
          <lineSegments geometry={edgeGeo} material={isSel ? matEdgeSel : matEdge} />
        </group>
      )
    }
  }
  return <group>{cells}</group>
}

// ── assembly: 3D geometry (inside Canvas) ────────────────────────────────────
function AssemblyGeometry({ booking, wallTypesMap, activeWallId, onSelectWall, animStep }) {
  const floorIdx = booking.floor
  const walls = useMemo(() => getPerimeterWalls(booking.cells, floorIdx), [booking.id, floorIdx])

  // shared geometries
  const hGeo  = useMemo(() => new THREE.BoxGeometry(BKG_M, FLOOR_H_M, 0.14), [])
  const vGeo  = useMemo(() => new THREE.BoxGeometry(0.14, FLOOR_H_M, BKG_M), [])
  const flGeo = useMemo(() => new THREE.BoxGeometry(BKG_M - 0.06, 0.18, BKG_M - 0.06), [])

  // shared materials — all switched imperatively in useFrame, never via JSX props
  const matSolid   = useMemo(() => new THREE.MeshStandardMaterial({ color: '#FFE600', emissive: '#FFE600', emissiveIntensity: 0.18, roughness: 0.65, metalness: 0.05 }), [])
  const matGlazed  = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4CC9F0', transparent: true, opacity: 0.30, roughness: 0,   metalness: 0.2, depthWrite: false, side: THREE.DoubleSide }), [])
  const matCurtain = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c8a96e', transparent: true, opacity: 0.44, roughness: 0.9, depthWrite: false, side: THREE.DoubleSide }), [])
  const matActive  = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.70, roughness: 0.2, emissive: '#FFE600', emissiveIntensity: 0.55, side: THREE.DoubleSide }), [])
  const matHovered = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, roughness: 0.3, depthWrite: false, side: THREE.DoubleSide }), [])
  const matFloor   = useMemo(() => new THREE.MeshStandardMaterial({ color: '#a07800', emissive: '#FFE600', emissiveIntensity: 0.22, roughness: 0.85 }), [])

  // all animation + interaction state lives in refs to avoid re-renders inside useFrame
  const wallRefs     = useRef([])
  const progressRef  = useRef(walls.map(() => 0))
  const animStepRef  = useRef(animStep)
  const wallTypesRef = useRef(wallTypesMap)
  const activeRef    = useRef(activeWallId)
  const hoveredRef   = useRef(null)

  useEffect(() => { animStepRef.current = animStep },    [animStep])
  useEffect(() => { wallTypesRef.current = wallTypesMap }, [wallTypesMap])
  useEffect(() => { activeRef.current = activeWallId },  [activeWallId])

  // fires once on mount (component is key'd by assemblyId)
  useEffect(() => {
    progressRef.current = walls.map(() => 0)
    wallRefs.current.forEach((mesh, i) => {
      if (!mesh || !walls[i]) return
      const [bx, by, bz] = walls[i].pos
      const [dx, , dz]   = walls[i].dir
      mesh.position.set(bx + dx * 9, by, bz + dz * 9)
    })
  }, [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    // pulse yellow glow on default solid walls and floor slabs
    matSolid.emissiveIntensity = 0.12 + 0.10 * Math.sin(t * 1.5)
    matFloor.emissiveIntensity = 0.18 + 0.14 * Math.sin(t * 1.5)
    matActive.emissiveIntensity = 0.40 + 0.25 * Math.sin(t * 2.2)

    walls.forEach((wall, i) => {
      const mesh = wallRefs.current[i]
      if (!mesh) return

      const type  = wallTypesRef.current[wall.id] || 'solid'
      const isAct = activeRef.current  === wall.id
      const isHov = hoveredRef.current === wall.id && !isAct && type !== 'open'

      mesh.visible  = type !== 'open'
      mesh.material = isAct     ? matActive
                    : isHov     ? matHovered
                    : type === 'glazed'  ? matGlazed
                    : type === 'curtain' ? matCurtain
                    : matSolid

      // slide animation
      const target = i < animStepRef.current ? 1 : 0
      progressRef.current[i] = THREE.MathUtils.lerp(progressRef.current[i], target, 0.055)
      const p = progressRef.current[i]
      const [bx, by, bz] = wall.pos
      const [dx, , dz]   = wall.dir
      mesh.position.set(bx + dx * (1 - p) * 9, by, bz + dz * (1 - p) * 9)
    })
  })

  return (
    <group>
      {booking.cells.map(cellId => {
        const [r, c] = cellId.split('-').map(Number)
        const [cx, cy, cz] = bkgPos(r, c, floorIdx)
        return <mesh key={cellId} geometry={flGeo} material={matFloor} position={[cx, cy - 0.05, cz]} receiveShadow />
      })}

      {walls.map((wall, i) => (
        <mesh
          key={wall.id}
          ref={el => { wallRefs.current[i] = el }}
          geometry={wall.geo === 'h' ? hGeo : vGeo}
          castShadow
          receiveShadow
          onClick={e => { e.stopPropagation(); onSelectWall(wall.id) }}
          onPointerOver={e => { e.stopPropagation(); hoveredRef.current = wall.id }}
          onPointerOut={e  => { if (hoveredRef.current === wall.id) hoveredRef.current = null }}
        />
      ))}
    </group>
  )
}

// ── floating ambient cubes ────────────────────────────────────────────────────
const FC_COUNT   = 22
const FC_INNER_R = 28
const FC_OUTER_R = 52
const TRAIL_LEN  = 22   // number of trail positions kept per cube

// trail shader — per-vertex alpha fade from head (1) to tail (0)
const TRAIL_VERT = `
  attribute float alpha;
  varying float vAlpha;
  void main() {
    vAlpha = alpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const TRAIL_FRAG = `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    if (vAlpha < 0.01) discard;
    gl_FragColor = vec4(uColor, vAlpha * vAlpha);
  }
`

function mkFC() {
  const angle = Math.random() * Math.PI * 2
  const dist  = FC_INNER_R + 4 + Math.random() * 18
  return {
    p:    [Math.cos(angle) * dist, -8 + Math.random() * 20, Math.sin(angle) * dist],
    v:    [(Math.random() - 0.5) * 0.024, (Math.random() - 0.5) * 0.012, (Math.random() - 0.5) * 0.024],
    r:    [(Math.random() - 0.5) * 0.003, (Math.random() - 0.5) * 0.004, 0],
    ph:   Math.random() * Math.PI * 2,
    bv:   [0, 0, 0],
    tgt:  null,
    mode: 'free',
  }
}

function spawnOuter() {
  const angle = Math.random() * Math.PI * 2
  const dist  = FC_INNER_R + 6 + Math.random() * 14
  return {
    p: [Math.cos(angle) * dist, -8 + Math.random() * 20, Math.sin(angle) * dist],
    v: [(Math.random() - 0.5) * 0.024, (Math.random() - 0.5) * 0.012, (Math.random() - 0.5) * 0.024],
    r: [(Math.random() - 0.5) * 0.003, (Math.random() - 0.5) * 0.004, 0],
  }
}

function FloatingCubes({ selCells, assembling }) {
  const selRef   = useRef(selCells)
  selRef.current = selCells
  const asmRef   = useRef(assembling)
  asmRef.current = assembling

  const prevSelN     = useRef(0)
  const prevAsm      = useRef(false)
  const pendingBurst = useRef(false)
  const burstAt      = useRef(0)
  const cubes        = useRef(Array.from({ length: FC_COUNT }, mkFC))
  const meshRefs     = useRef([])

  // trail geometry buffers — one per cube, created once
  const trailData = useRef(
    Array.from({ length: FC_COUNT }, () => {
      const positions = new Float32Array(TRAIL_LEN * 3)  // xyz per point
      const alphas    = new Float32Array(TRAIL_LEN)
      for (let j = 0; j < TRAIL_LEN; j++) alphas[j] = 1 - j / (TRAIL_LEN - 1)
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geo.setAttribute('alpha',    new THREE.BufferAttribute(alphas,    1))
      return { positions, geo }
    })
  )

  // cube body materials
  const mats = useMemo(() => ({
    free:   new THREE.MeshStandardMaterial({ color: '#4CC9F0', transparent: true, opacity: 0.18, roughness: 0.6, metalness: 0.15, depthWrite: false }),
    flying: new THREE.MeshStandardMaterial({ color: '#FFE600', transparent: true, opacity: 0.52, roughness: 0.4, metalness: 0.05, emissive: '#FFE600', emissiveIntensity: 0.12, depthWrite: false }),
    hover:  new THREE.MeshStandardMaterial({ color: '#FFE600', transparent: true, opacity: 0.72, roughness: 0.35, metalness: 0.05, emissive: '#FFE600', emissiveIntensity: 0.22, depthWrite: false }),
    burst:  new THREE.MeshStandardMaterial({ color: '#FF6B35', transparent: true, opacity: 0.48, roughness: 0.5, emissive: '#FF3300', emissiveIntensity: 0.20, depthWrite: false }),
  }), [])

  // trail line materials (shared across all cubes)
  const flyTrailMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color('#FFE600') } },
    vertexShader: TRAIL_VERT, fragmentShader: TRAIL_FRAG,
    transparent: true, depthWrite: false,
  }), [])
  const burstTrailMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color('#FF8844') } },
    vertexShader: TRAIL_VERT, fragmentShader: TRAIL_FRAG,
    transparent: true, depthWrite: false,
  }), [])

  // one THREE.Line per cube — created imperatively, updated each frame
  const trailObjs = useMemo(() =>
    trailData.current.map(({ geo }) => {
      const line = new THREE.Line(geo, flyTrailMat)
      line.visible = false
      line.frustumCulled = false
      return line
    }),
  [flyTrailMat])

  const boxGeo = useMemo(() => new THREE.BoxGeometry(4.2, 2.8, 4.2), [])

  useFrame(({ clock }) => {
    const t  = clock.getElapsedTime()
    const sc = selRef.current
    const N  = sc.length
    const c  = cubes.current

    let cx=0, cy=0, cz=0
    if (N > 0) {
      sc.forEach(([x,y,z])=>{ cx+=x; cy+=y; cz+=z })
      cx/=N; cy/=N; cz/=N
    }

    // ── selection change ──
    const selN = N
    if (selN !== prevSelN.current) {
      const prev = prevSelN.current
      prevSelN.current = selN
      if (selN > prev) {
        for (let i = prev; i < selN && i < FC_COUNT; i++) {
          c[i].tgt = [...sc[i]]; c[i].mode = 'flying'
        }
      } else {
        for (let i = selN; i < prev && i < FC_COUNT; i++) {
          Object.assign(c[i], spawnOuter(), { tgt: null, mode: 'free', bv: [0,0,0] })
        }
        for (let i = 0; i < selN && i < FC_COUNT; i++) {
          c[i].tgt = [...sc[i]]
          if (c[i].mode === 'hover') c[i].mode = 'flying'
        }
      }
    }

    // ── assembly trigger ──
    const asm      = asmRef.current
    const asmStart = asm && !prevAsm.current
    const asmStop  = !asm && prevAsm.current
    prevAsm.current = asm

    if (asmStart) { pendingBurst.current = true; burstAt.current = t + 1.4 }

    if (pendingBurst.current && t >= burstAt.current) {
      pendingBurst.current = false
      for (let i = 0; i < FC_COUNT; i++) {
        if (c[i].mode === 'flying' || c[i].mode === 'hover') {
          const dx=c[i].p[0]-cx, dy=c[i].p[1]-cy-2, dz=c[i].p[2]-cz
          const l = Math.sqrt(dx*dx+dy*dy+dz*dz) || 1
          const s = 1.5 + Math.random() * 1.0
          c[i].bv = [dx/l*s, Math.abs(dy/l)*s*0.6+0.5, dz/l*s]
          c[i].mode = 'burst'
        }
      }
    }

    if (asmStop) {
      pendingBurst.current = false
      for (let i = 0; i < FC_COUNT; i++) Object.assign(c[i], mkFC(), { bv:[0,0,0] })
      prevSelN.current = 0
    }

    // ── pulse material opacities ──
    mats.free.opacity   = 0.14 + 0.06 * Math.sin(t * 0.6)
    mats.flying.opacity = 0.45 + 0.14 * Math.sin(t * 2.0)
    mats.flying.emissiveIntensity = 0.08 + 0.08 * Math.sin(t * 1.8)
    mats.hover.opacity  = 0.60 + 0.18 * Math.sin(t * 2.6)
    mats.hover.emissiveIntensity  = 0.18 + 0.16 * Math.sin(t * 2.6)
    mats.burst.opacity  = 0.40 + 0.18 * Math.sin(t * 4.5)

    // ── per-cube update ──
    for (let i = 0; i < FC_COUNT; i++) {
      const cube = c[i]
      const mesh = meshRefs.current[i]
      const tl   = trailObjs[i]
      const td   = trailData.current[i]
      if (!mesh) continue

      if (cube.mode === 'free') {
        cube.p[0] += cube.v[0]
        cube.p[1] += cube.v[1] + Math.sin(t * 0.34 + cube.ph) * 0.009
        cube.p[2] += cube.v[2]
        const rx = cube.p[0], rz = cube.p[2]
        const r2 = rx*rx + rz*rz
        if (r2 < FC_INNER_R * FC_INNER_R) {
          const r = Math.sqrt(r2) || 1
          const f = (FC_INNER_R - r) / FC_INNER_R * 0.06
          cube.v[0] += rx/r * f; cube.v[2] += rz/r * f
        }
        const vxz = Math.sqrt(cube.v[0]*cube.v[0]+cube.v[2]*cube.v[2])
        if (vxz > 0.05) { cube.v[0]=cube.v[0]/vxz*0.05; cube.v[2]=cube.v[2]/vxz*0.05 }
        const outerR = Math.sqrt(cube.p[0]*cube.p[0]+cube.p[2]*cube.p[2])
        if (outerR > FC_OUTER_R) {
          const ang = Math.atan2(cube.p[2], cube.p[0]) + Math.PI
          const nd  = FC_INNER_R + 6 + Math.random() * 10
          cube.p[0] = Math.cos(ang) * nd; cube.p[2] = Math.sin(ang) * nd
        }
        if (cube.p[1] >  16) cube.p[1] = -8
        if (cube.p[1] <  -8) cube.p[1] =  16
        cube.r[0] *= 0.997; cube.r[1] *= 0.997

      } else if (cube.mode === 'flying') {
        const [tx, ty, tz] = cube.tgt
        cube.p[0] = THREE.MathUtils.lerp(cube.p[0], tx, 0.055)
        cube.p[1] = THREE.MathUtils.lerp(cube.p[1], ty + 2.2, 0.055)
        cube.p[2] = THREE.MathUtils.lerp(cube.p[2], tz, 0.055)
        cube.r[0] = Math.sign(cube.r[0]||1) * Math.min(0.13, Math.abs(cube.r[0]) * 1.05)
        cube.r[1] = Math.sign(cube.r[1]||1) * Math.min(0.13, Math.abs(cube.r[1]) * 1.05)
        const ddx=cube.p[0]-tx, ddz=cube.p[2]-tz
        if (ddx*ddx+ddz*ddz < 0.9) cube.mode = 'hover'

      } else if (cube.mode === 'hover') {
        const [tx, ty, tz] = cube.tgt
        cube.p[0] = THREE.MathUtils.lerp(cube.p[0], tx, 0.04)
        cube.p[1] = THREE.MathUtils.lerp(cube.p[1], ty + 1.8 + Math.sin(t*1.1+cube.ph)*0.45, 0.04)
        cube.p[2] = THREE.MathUtils.lerp(cube.p[2], tz, 0.04)
        cube.r[0] *= 0.93; cube.r[1] *= 0.93

      } else if (cube.mode === 'burst') {
        cube.p[0]+=cube.bv[0]; cube.p[1]+=cube.bv[1]; cube.p[2]+=cube.bv[2]
        cube.bv[0]*=0.84; cube.bv[1]*=0.84; cube.bv[2]*=0.84
        cube.r[0] = Math.sign(cube.r[0]||1)*Math.min(0.16, Math.abs(cube.r[0])*1.06)
        cube.r[1] = Math.sign(cube.r[1]||1)*Math.min(0.16, Math.abs(cube.r[1])*1.06)
        const sp = cube.bv[0]*cube.bv[0]+cube.bv[1]*cube.bv[1]+cube.bv[2]*cube.bv[2]
        if (sp < 0.004) Object.assign(c[i], spawnOuter(), { tgt:null, mode:'free', bv:[0,0,0] })
      }

      mesh.position.set(cube.p[0], cube.p[1], cube.p[2])
      mesh.rotation.x += cube.r[0]
      mesh.rotation.y += cube.r[1]

      const mat = cube.mode === 'flying' ? mats.flying
                : cube.mode === 'hover'  ? mats.hover
                : cube.mode === 'burst'  ? mats.burst
                : mats.free
      if (mesh.material !== mat) mesh.material = mat

      // ── trail update ──
      const showTrail = cube.mode === 'flying' || cube.mode === 'burst'
      if (tl) {
        tl.visible = showTrail
        if (showTrail) {
          // shift old positions back by one slot (index 0 = newest / head)
          const pos = td.positions
          for (let j = TRAIL_LEN - 1; j > 0; j--) {
            pos[j*3]   = pos[(j-1)*3]
            pos[j*3+1] = pos[(j-1)*3+1]
            pos[j*3+2] = pos[(j-1)*3+2]
          }
          pos[0] = cube.p[0]; pos[1] = cube.p[1]; pos[2] = cube.p[2]
          td.geo.attributes.position.needsUpdate = true
          tl.material = cube.mode === 'burst' ? burstTrailMat : flyTrailMat
        } else {
          // flush buffer to current position — prevents ghost trail on next activation
          const pos = td.positions
          for (let j = 0; j < TRAIL_LEN; j++) {
            pos[j*3]=cube.p[0]; pos[j*3+1]=cube.p[1]; pos[j*3+2]=cube.p[2]
          }
          td.geo.attributes.position.needsUpdate = true
        }
      }
    }
  })

  return (
    <group>
      {cubes.current.map((c, i) => (
        <mesh
          key={i}
          ref={el => { meshRefs.current[i] = el }}
          geometry={boxGeo}
          material={mats.free}
          position={[...c.p]}
        />
      ))}
      {trailObjs.map((obj, i) => (
        <primitive key={`tr${i}`} object={obj} />
      ))}
    </group>
  )
}

// ── assembly: right panel content ────────────────────────────────────────────
const WALL_TYPES  = ['solid', 'glazed', 'curtain', 'open']
const SIDE_LABELS = { top: 'North', bottom: 'South', left: 'West', right: 'East' }

const TILE_META = {
  solid:   { icon: '▪', label: 'Solid',   desc: 'Opaque panel — privacy & thermal mass' },
  glazed:  { icon: '◻', label: 'Glazed',  desc: 'Full-height glass — daylight & views'  },
  curtain: { icon: '≋', label: 'Curtain', desc: 'Fabric track — acoustic, flexible'      },
  open:    { icon: '○', label: 'Open',    desc: 'No closure — merges with adjacent space' },
}

function AssemblyPanel({ booking, assemblyWalls, animStep, wallTypes, activeWallId, onClose, onPlay, onReset, onSetWallType, onSelectWall }) {
  const n       = booking.cells.length
  const sqm     = (n * BKG_SQM).toFixed(0)
  const fl      = BKG_FLOORS[booking.floor]
  const total   = assemblyWalls.length
  const placed  = Math.min(animStep, total)
  const allIn   = placed >= total && total > 0
  const activeW = assemblyWalls.find(w => w.id === activeWallId)
  const curType = activeW ? (wallTypes[activeW.id] || 'solid') : null

  // count by type for the summary bar
  const typeCounts = WALL_TYPES.reduce((acc, t) => {
    acc[t] = assemblyWalls.filter(w => (wallTypes[w.id] || 'solid') === t).length
    return acc
  }, {})

  return (
    <>
      {/* ── header ── */}
      <div className="asmb-head">
        <button className="asmb-back" onClick={onClose}>← BOOKINGS</button>
        <div className="asmb-title">{booking.activity}</div>
        <div className="asmb-meta">
          {fl.label} · {fl.z}<br />
          {n} cells · {sqm} m² · {total} walls
        </div>
      </div>

      <div className="asmb-scroll">

        {/* ── animation ── */}
        <div className="asmb-section">
          <div className="asmb-ctrl">
            <button className="asmb-btn play" onClick={onPlay} disabled={allIn}>
              {allIn ? '✓ All placed' : '▶ Animate walls'}
            </button>
            <button className="asmb-btn reset" onClick={onReset} title="Reset animation">↺</button>
          </div>
          <div className="asmb-prog-bar">
            <div className="asmb-prog-fill" style={{ width: total > 0 ? `${(placed / total) * 100}%` : '0%' }} />
          </div>
          <div className="asmb-prog-txt">
            {placed === 0 ? `${total} walls · press ▶ to place`
              : allIn   ? 'All walls placed — click any to edit'
              : `${placed} / ${total} walls placed`}
          </div>
        </div>

        {/* ── type picker (appears when a wall is selected) ── */}
        {activeW ? (
          <div className="asmb-section asmb-picker">
            <div className="asmb-pick-label">{SIDE_LABELS[activeW.side]} wall</div>
            <div className="asmb-tiles">
              {WALL_TYPES.map(t => {
                const m = TILE_META[t]
                return (
                  <button
                    key={t}
                    className={`asmb-tile t-${t}${curType === t ? ' active' : ''}`}
                    onClick={() => onSetWallType(activeW.id, t)}
                  >
                    <span className="atile-icon">{m.icon}</span>
                    <span className="atile-lbl">{m.label}</span>
                  </button>
                )
              })}
            </div>
            <div className="asmb-type-desc">{TILE_META[curType].desc}</div>
            <button className="asmb-complete-btn" onClick={() => onSelectWall(null)}>
              ✓ Done editing this wall
            </button>
          </div>
        ) : (
          <div className="asmb-section asmb-idle">
            <div className="asmb-idle-icon">↗</div>
            <div className="asmb-idle-txt">
              Tap any wall in the 3D view<br />to choose its type
            </div>
          </div>
        )}

        {/* ── applied types summary ── */}
        {assemblyWalls.length > 0 && (
          <div className="asmb-section">
            <div className="asmb-slabel">APPLIED TYPES</div>
            <div className="asmb-summary-bar">
              {WALL_TYPES.map(t => typeCounts[t] > 0 && (
                <div key={t} className={`asb-seg t-${t}`} style={{ flex: typeCounts[t] }} title={`${typeCounts[t]} ${t}`} />
              ))}
            </div>
            <div className="asmb-summary-labels">
              {WALL_TYPES.map(t => typeCounts[t] > 0 && (
                <div key={t} className={`asl-item t-${t}`}>
                  <span className={`asl-dot t-${t}`} />
                  {TILE_META[t].label} · {typeCounts[t]}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  )
}

// ── booking: right panel (DOM overlay in editor mode) ────────────────────────
function BookingRightPanel({
  floor, onFloor, sel, onToggle, onClearSel, bookings, onBookings,
  assemblyId, assemblyWalls, assemblyStep, wallTypes, activeWallId,
  onStartAssembly, onCloseAssembly, onPlayAssembly, onResetAssembly,
  onSetWallType, onSelectWall,
}) {
  const [name,     setName]     = useState('')
  const [activity, setActivity] = useState('')
  const [duration, setDuration] = useState(BKG_DURATIONS[0])
  const [notes,    setNotes]    = useState('')
  const [errs,     setErrs]     = useState({})
  const [toast,    setToast]    = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000) }

  const flBkgs      = bookings.filter(b => b.floor === floor).slice().reverse()
  const selN        = sel.size
  const selSqm      = (selN * BKG_SQM).toFixed(0)
  const assemblyBkg = assemblyId ? bookings.find(b => b.id === assemblyId) : null

  const submit = (e) => {
    e.preventDefault()
    const ne = {}
    if (!name.trim()) ne.name = true
    if (!activity)    ne.act  = true
    if (Object.keys(ne).length) { setErrs(ne); return }
    const bkg = {
      id: 'bkg_' + Date.now(), floor, cells: [...sel], activity,
      userName: name.trim(), duration, notes: notes.trim(),
      bookedAt: new Date().toISOString(), status: 'confirmed',
    }
    bkgSave(bkg)
    onBookings(bkgLoad())
    onClearSel()
    setName(''); setActivity(''); setNotes(''); setErrs({})
    showToast(`Booked · ${bkg.cells.length} cells · ${activity} · ${BKG_FLOORS[floor].label}`)
  }

  const doCancel = (id, num) => {
    if (!confirm(`Cancel booking #${num}?`)) return
    bkgCancel(id)
    onBookings(bkgLoad())
    if (assemblyId === id) onCloseAssembly()
    showToast(`Booking #${num} cancelled`)
  }

  return (
    <div className="brp">
      {assemblyBkg ? (
        <AssemblyPanel
          booking={assemblyBkg}
          assemblyWalls={assemblyWalls}
          animStep={assemblyStep}
          wallTypes={wallTypes}
          activeWallId={activeWallId}
          onClose={onCloseAssembly}
          onPlay={onPlayAssembly}
          onReset={onResetAssembly}
          onSetWallType={onSetWallType}
          onSelectWall={onSelectWall}
        />
      ) : (
        <>
          <div className="brp-head">
            <div className="brp-title">BOOK SPACE</div>
            <div className="brp-floor-tabs">
              {BKG_FLOORS.map((f, i) => (
                <button key={i} className={`brp-tab${floor === i ? ' active' : ''}`} onClick={() => onFloor(i)}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="brp-floor-info">
              <span className="brp-fname">{BKG_FLOORS[floor].name}</span>
              <span className="brp-fz">{BKG_FLOORS[floor].z}</span>
            </div>
            <div className={`brp-counter${selN > 0 ? ' has-sel' : ''}`}>
              {selN === 0 ? 'Click cells in the 3D view →' : `${selN} cell${selN > 1 ? 's' : ''} · ${selSqm} m²`}
            </div>
          </div>

          <div className="brp-scroll">
            {selN > 0 && (
              <div className="bs-section">
                <div className="bs-label">Book a space</div>
                <div className="bs-sel-sum">{selN} × 5 m cell{selN > 1 ? 's' : ''} · {selSqm} m² · {BKG_FLOORS[floor].label}</div>
                <form onSubmit={submit} noValidate>
                  <div className={`bsf${errs.name ? ' has-err' : ''}`}>
                    <label>Your name</label>
                    <input type="text" value={name} onChange={e => { setName(e.target.value); setErrs(p => ({...p, name: false})) }} placeholder="e.g. Divya M." />
                    {errs.name && <div className="bsf-err">Name is required</div>}
                  </div>
                  <div className={`bsf${errs.act ? ' has-err' : ''}`}>
                    <label>Activity</label>
                    <select value={activity} onChange={e => { setActivity(e.target.value); setErrs(p => ({...p, act: false})) }}>
                      <option value="">— select —</option>
                      {BKG_ACTIVITIES.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    {errs.act && <div className="bsf-err">Please select an activity</div>}
                  </div>
                  <div className="bsf">
                    <label>Duration</label>
                    <select value={duration} onChange={e => setDuration(e.target.value)}>
                      {BKG_DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="bsf">
                    <label>Notes (optional)</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Specific requirements…" maxLength={200} />
                  </div>
                  <button type="submit" className="bs-btn-book">Book this space →</button>
                </form>
              </div>
            )}

            <div className="bs-section">
              <div className="bs-label">Confirmed · {BKG_FLOORS[floor].label}</div>
              {flBkgs.length === 0
                ? <div className="bs-empty">No bookings on this floor yet.</div>
                : flBkgs.map((b, i) => {
                  const n   = b.cells.length
                  const num = String(flBkgs.length - i).padStart(3, '0')
                  return (
                    <div key={b.id} className="bs-card">
                      <div className="bs-card-head">
                        <span className="bs-card-id">#{num}</span>
                        <span className="bs-card-act">{b.activity}</span>
                      </div>
                      <div className="bs-card-meta">
                        {n} cell{n > 1 ? 's' : ''} · {(n * BKG_SQM).toFixed(0)} m² · <b>{b.duration}</b><br />
                        By: <b>{b.userName}</b>
                      </div>
                      <div className="bs-card-cells">Cells: {b.cells.join(', ')}</div>
                      <div className="bs-card-btns">
                        <button className="bs-btn-asm" onClick={() => onStartAssembly(b.id)}>
                          Assemble →
                        </button>
                        <button className="bs-btn-cancel" onClick={() => doCancel(b.id, num)}>Cancel ✕</button>
                      </div>
                    </div>
                  )
                })
              }
            </div>
          </div>
        </>
      )}

      {toast && <div className="bkg-toast">{toast}</div>}
    </div>
  )
}

// ── module catalogue: room type definitions (pattern matching added by user) ───
// `units` = number of 5×5 m cells required; used to filter by bkgSel.size
// levels: how many consecutive floors the module occupies (default 1)
const MODULE_DEFS = [
  // ── 1 floor ────────────────────────────────────────────────────────────────
  { id: 'meeting-room',     name: 'Meeting Room',        units: 2, levels: 1, size: '10 × 5 m',        icon: '⬜', desc: 'Double bay · Enclosed 3 sides · Open south' },
  { id: 'rest-room',        name: 'Rest Room',           units: 2, levels: 1, size: '5 × 10 m',         icon: '▮', desc: 'Stacked double bay · Fully enclosed' },
  { id: 'corridor',         name: 'Corridor',            units: 3, levels: 1, size: '15 × 5 m',         icon: '▬', desc: 'Linear triple bay · Walled long sides' },
  { id: 'studio',           name: 'Individual Studio',   units: 3, levels: 1, size: '10 × 5 m + bay',   icon: '⌐', desc: 'L-shape · Private enclosed studio' },
  { id: 'public-area',      name: 'Public Area',         units: 4, levels: 1, size: '10 × 10 m',        icon: '⊞', desc: '2×2 grid · Open centre · Community space' },
  { id: 'gallery',          name: 'Gallery',             units: 4, levels: 1, size: '20 × 5 m',         icon: '▭', desc: 'Quad linear bay · Exhibition hall' },
  { id: 'auditorium',       name: 'Auditorium',          units: 6, levels: 1, size: '15 × 10 m',        icon: '⊿', desc: 'Stepped 3×2 bays · Two-level amphitheatre' },
  { id: 'stair-module',     name: 'Stair Module',        units: 4, levels: 1, size: '10 × 5 m',         icon: '↑', desc: 'Vertical circulation · Single-floor landing' },
  // ── 2 floors ───────────────────────────────────────────────────────────────
  { id: 'duplex-unit',      name: 'Duplex Unit',         units: 2, levels: 2, size: '10 × 5 m · 2F',   icon: '⬚', desc: '2-storey residential · split-level entry' },
  { id: 'workshop-loft',    name: 'Workshop + Loft',     units: 3, levels: 2, size: '15 × 5 m · 2F',   icon: '⊤', desc: 'Ground-floor workshop · upper sleeping loft' },
  { id: 'void-atrium',      name: 'Void Atrium',         units: 4, levels: 2, size: '10 × 10 m · 2F',  icon: '⊟', desc: 'Double-height courtyard · open sky void above' },
  { id: 'bridge-gallery',   name: 'Bridge Gallery',      units: 4, levels: 2, size: '20 × 5 m · 2F',   icon: '⊫', desc: 'Exhibition hall level + walkway bridge above' },
  { id: 'mezzanine-studio', name: 'Mezzanine Studio',    units: 3, levels: 2, size: '15 × 5 m · 2F',   icon: '⌐⌐', desc: 'Studio with raised mezzanine sleeping level' },
  { id: 'live-work-unit',   name: 'Live / Work Unit',    units: 2, levels: 2, size: '5 × 10 m · 2F',   icon: '▮▮', desc: 'Ground commercial · upper residential' },
  // ── 3 floors ───────────────────────────────────────────────────────────────
  { id: 'triple-hall',      name: 'Triple-Height Hall',  units: 4, levels: 3, size: '10 × 10 m · 3F',  icon: '⊞⊞', desc: 'Dramatic civic hall · 9.6 m clear height' },
  { id: 'stair-tower',      name: 'Stair Tower',         units: 2, levels: 3, size: '10 × 5 m · 3F',   icon: '↑↑', desc: 'Vertical circulation · 3-storey stair core' },
  { id: 'community-hub',    name: 'Community Hub',       units: 3, levels: 3, size: '15 × 5 m · 3F',   icon: '⊥⊥', desc: 'Public · social · programme stacked 3 levels' },
]

// ── catalogue: left panel ─────────────────────────────────────────────────────
function CataloguePanel({ catFloor, catCells, levelCount, onLevelCount, modConfigId, onModConfig }) {
  const selN      = catCells.size
  const fl        = BKG_FLOORS[catFloor]
  const available = MODULE_DEFS.filter(m => m.units === selN && m.levels === levelCount)
  const maxLevels = Math.min(3, 6 - catFloor)  // can't go above floor 5

  return (
    <div className="panel cat-panel">
      <div className="panel-header">
        <div className="panel-logo">Rewire</div>
        <div className="panel-subtitle">Module Catalogue</div>
      </div>

      <div className="cat-ctx">
        <div className="cat-ctx-floor">
          <span className="cat-ctx-label">BASE FLOOR</span>
          <span className="cat-ctx-val">{fl.name}</span>
          <span className="cat-ctx-z">{fl.z}</span>
        </div>
        <div className={`cat-ctx-cells${selN > 0 ? ' has-sel' : ''}`}>
          {selN === 0
            ? 'Select cells in Plan or Iso view'
            : `${selN} cell${selN > 1 ? 's' : ''} × ${levelCount} floor${levelCount > 1 ? 's' : ''} · ${selN * levelCount * BKG_SQM} m² total`}
        </div>
      </div>

      {selN > 0 && (
        <div className="cat-levels">
          <span className="cat-levels-label">VERTICAL LEVELS</span>
          <div className="cat-levels-row">
            {[1, 2, 3].map(n => (
              <button
                key={n}
                disabled={n > maxLevels}
                className={`cat-lvl-btn${levelCount === n ? ' active' : ''}`}
                onClick={() => { onLevelCount(n); onModConfig(null) }}
                title={n > maxLevels ? `Can't add ${n} levels from ${fl.name}` : `${n} floor${n > 1 ? 's' : ''}`}
              >
                {n}F
              </button>
            ))}
          </div>
          {levelCount > 1 && (
            <div className="cat-levels-hint">
              {fl.name} → {BKG_FLOORS[Math.min(catFloor + levelCount - 1, 5)].name}
            </div>
          )}
        </div>
      )}

      <div className="cat-cfg-head">
        <span className="cat-cfg-label">POSSIBLE CONFIGURATIONS</span>
        <span className="cat-cfg-count">{selN > 0 ? available.length : '—'}</span>
      </div>

      <div className="cat-cfg-list">
        {selN === 0 && (
          <div className="cat-empty">
            <div className="cat-empty-icon">↖</div>
            <div className="cat-empty-txt">Select cells in Plan or Iso view<br />then switch back here.<br />Your selection carries over.</div>
          </div>
        )}
        {selN > 0 && available.length === 0 && (
          <div className="cat-empty">
            <div className="cat-empty-icon">—</div>
            <div className="cat-empty-txt">No layout defined for<br />{selN} cells × {levelCount} floor{levelCount > 1 ? 's' : ''} yet.<br />Try a different level count.</div>
          </div>
        )}
        {available.map(m => {
          const isSel = modConfigId === m.id
          return (
            <div key={m.id} className={`mod-card${isSel ? ' active' : ''}`} onClick={() => onModConfig(isSel ? null : m.id)}>
              <div className="mod-card-top">
                <span className="mod-icon">{m.icon}</span>
                <div className="mod-card-info">
                  <div className="mod-name">{m.name}</div>
                  <div className="mod-size">{m.size}</div>
                </div>
              </div>
              <div className="mod-desc">{m.desc}</div>
            </div>
          )
        })}
      </div>

      <div className="panel-footer">
        <div className="stat">
          {modConfigId
            ? `Preview: ${MODULE_DEFS.find(m => m.id === modConfigId)?.name}`
            : selN > 0 ? `${selN} cells · ${levelCount}F · select a layout →` : 'No cells selected'}
        </div>
      </div>
    </div>
  )
}

// ── catalogue: right panel (assembly preview) ─────────────────────────────────
function CatalogueRightPanel({ modConfigId, onClose, catFloor, catCells, levelCount, assemblyWalls, animStep, wallTypes, activeWallId, onPlay, onReset, onSetWallType, onSelectWall }) {
  const def    = modConfigId ? MODULE_DEFS.find(m => m.id === modConfigId) : null
  const fl     = BKG_FLOORS[catFloor]
  const selN   = catCells.size
  const total  = assemblyWalls.length
  const placed = Math.min(animStep, total)
  const allIn  = placed >= total && total > 0
  const activeW = assemblyWalls.find(w => w.id === activeWallId)
  const curType = activeW ? (wallTypes[activeW.id] || 'solid') : null

  const typeCounts = WALL_TYPES.reduce((acc, t) => {
    acc[t] = assemblyWalls.filter(w => (wallTypes[w.id] || 'solid') === t).length
    return acc
  }, {})

  if (!def) {
    return (
      <div className="brp">
        <div className="brp-head">
          <div className="brp-title">ASSEMBLY PREVIEW</div>
          <div className="brp-floor-info">
            <span className="brp-fname">{fl.name}</span>
            <span className="brp-fz">{fl.z}</span>
          </div>
          <div className="brp-counter">{selN > 0 ? `${selN} cells × ${levelCount}F · ${selN * levelCount * BKG_SQM} m²` : 'No cells selected'}</div>
        </div>
        <div className="brp-scroll" style={{ alignItems: 'center', justifyContent: 'center', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--muted)', fontSize: 10, textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 26, opacity: 0.12 }}>↖</div>
          Select a layout from the left panel to preview its assembly on your selected cells
        </div>
      </div>
    )
  }

  return (
    <div className="brp">
      <div className="asmb-head">
        <button className="asmb-back" onClick={onClose}>← LAYOUTS</button>
        <div className="asmb-title">{def.name}</div>
        <div className="asmb-meta">
          {fl.label}{levelCount > 1 ? ` → ${BKG_FLOORS[Math.min(catFloor + levelCount - 1, 5)].label}` : ''} · {fl.z}<br />
          {selN} cells × {levelCount}F · {selN * levelCount * BKG_SQM} m² · {total * levelCount} walls total
        </div>
      </div>

      <div className="asmb-scroll">
        <div className="asmb-section">
          <div className="asmb-ctrl">
            <button className="asmb-btn play" onClick={onPlay} disabled={allIn}>
              {allIn ? '✓ All placed' : '▶ Animate walls'}
            </button>
            <button className="asmb-btn reset" onClick={onReset} title="Reset">↺</button>
          </div>
          <div className="asmb-prog-bar">
            <div className="asmb-prog-fill" style={{ width: total > 0 ? `${(placed / total) * 100}%` : '0%' }} />
          </div>
          <div className="asmb-prog-txt">
            {placed === 0 ? `${total} walls · press ▶ to place`
              : allIn ? 'All walls placed — click any to edit'
              : `${placed} / ${total} walls placed`}
          </div>
        </div>

        {activeW ? (
          <div className="asmb-section asmb-picker">
            <div className="asmb-pick-label">{SIDE_LABELS[activeW.side]} wall</div>
            <div className="asmb-tiles">
              {WALL_TYPES.map(t => {
                const meta = TILE_META[t]
                return (
                  <button key={t} className={`asmb-tile t-${t}${curType === t ? ' active' : ''}`} onClick={() => onSetWallType(activeW.id, t)}>
                    <span className="atile-icon">{meta.icon}</span>
                    <span className="atile-lbl">{meta.label}</span>
                  </button>
                )
              })}
            </div>
            <div className="asmb-type-desc">{TILE_META[curType].desc}</div>
            <button className="asmb-complete-btn" onClick={() => onSelectWall(null)}>✓ Done editing this wall</button>
          </div>
        ) : (
          <div className="asmb-section asmb-idle">
            <div className="asmb-idle-icon">↗</div>
            <div className="asmb-idle-txt">Tap any wall in the 3D view<br />to choose its type</div>
          </div>
        )}

        {assemblyWalls.length > 0 && (
          <div className="asmb-section">
            <div className="asmb-slabel">APPLIED TYPES</div>
            <div className="asmb-summary-bar">
              {WALL_TYPES.map(t => typeCounts[t] > 0 && (
                <div key={t} className={`asb-seg t-${t}`} style={{ flex: typeCounts[t] }} />
              ))}
            </div>
            <div className="asmb-summary-labels">
              {WALL_TYPES.map(t => typeCounts[t] > 0 && (
                <div key={t} className={`asl-item t-${t}`}>
                  <span className={`asl-dot t-${t}`} />
                  {TILE_META[t].label} · {typeCounts[t]}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── (old catalogue component data — kept only so nothing breaks during cleanup) ─
const CATALOGUE_MODULES = [
  {
    id: 'floor-slab',
    name: 'Floor Slab',
    category: 'Structure',
    dims: '5.0 × 5.0 × 0.18 m',
    material: 'Reinforced concrete cassette',
    desc: 'Standard 5×5 m structural floor unit. Stackable to 6 levels.',
    color: '#4a72c0',
    icon: '▬',
    layers: ['Floor G', 'floor 1', 'floor 2', 'floor 3', 'floor 4', 'floor 5'],
  },
  {
    id: 'solid-panel',
    name: 'Solid Wall Panel',
    category: 'Wall',
    dims: '5.0 × 3.2 × 0.14 m',
    material: 'Insulated composite panel',
    desc: 'Opaque thermally insulated wall. Clip-lock assembly onto column grid.',
    color: '#6080b0',
    icon: '▪',
    layers: ['walls', 'walls 2', 'walls 3'],
  },
  {
    id: 'glazed-panel',
    name: 'Glazed Panel',
    category: 'Wall',
    dims: '5.0 × 3.2 × 0.08 m',
    material: 'Triple glazed / aluminium frame',
    desc: 'Full-height glass unit. Maximises daylight and exterior views.',
    color: '#4CC9F0',
    icon: '◻',
    layers: [],
  },
  {
    id: 'curtain-track',
    name: 'Curtain Track',
    category: 'Wall',
    dims: '5.0 × 3.2 m',
    material: 'Acoustic textile / steel track',
    desc: 'Flexible acoustic divider. Slides open in under a minute.',
    color: '#c8a96e',
    icon: '≋',
    layers: [],
  },
  {
    id: 'column',
    name: 'Structural Column',
    category: 'Structure',
    dims: 'Ø 0.30 × 3.2 m',
    material: 'Circular hollow steel section',
    desc: 'Primary vertical load-bearing element. Bolted base plate connection.',
    color: '#8898aa',
    icon: '|',
    layers: ['columns'],
  },
  {
    id: 'stair-module',
    name: 'Stair Module',
    category: 'Circulation',
    dims: '5.0 × 3.0 × 3.2 m',
    material: 'Steel frame / concrete treads',
    desc: 'Pre-assembled stair flight. Delivered as single lift-in unit.',
    color: '#5c8aaa',
    icon: '↑',
    layers: ['stairs', 'staircase'],
  },
  {
    id: 'lift-core',
    name: 'Lift Core',
    category: 'Circulation',
    dims: '2.5 × 2.5 × 3.2 m per floor',
    material: 'Prefabricated concrete shaft',
    desc: 'Modular lift shaft section. One section stacked per floor.',
    color: '#4a6070',
    icon: '⊡',
    layers: ['lift'],
  },
  {
    id: 'deployable-unit',
    name: 'Deployable Unit',
    category: 'Module',
    dims: '5.0 × 5.0 × 3.2 m',
    material: 'Composite frame / steel nodes',
    desc: 'Core spatial unit. Combines floor slab, perimeter walls and connection nodes into one deployable kit.',
    color: '#FFE600',
    icon: '⬡',
    layers: ['deployable model 3'],
  },
]

const _OLD_DEFS_REMOVED = [
  { id: 'DEAD' },
  {
    id: 'rest-room', name: 'Rest Room', units: 2,
    wallSurfaces: 6, size: '6 × 12 m', icon: '▮',
    desc: 'Stacked double bay · Fully enclosed · Deep plan',
    floors: [{c:0,r:0,lv:0},{c:0,r:1,lv:0}],
    walls: [
      {c:0,r:0,lv:0,face:'N'},{c:0,r:0,lv:0,face:'E'},{c:0,r:0,lv:0,face:'W'},
      {c:0,r:1,lv:0,face:'S'},{c:0,r:1,lv:0,face:'E'},{c:0,r:1,lv:0,face:'W'},
    ],
  },
  {
    id: 'corridor', name: 'Corridor', units: 3,
    wallSurfaces: 6, size: '18 × 6 m', icon: '▬',
    desc: 'Linear triple bay · Walled long sides · Open ends',
    floors: [{c:0,r:0,lv:0},{c:1,r:0,lv:0},{c:2,r:0,lv:0}],
    walls: [
      {c:0,r:0,lv:0,face:'N'},{c:1,r:0,lv:0,face:'N'},{c:2,r:0,lv:0,face:'N'},
      {c:0,r:0,lv:0,face:'S'},{c:1,r:0,lv:0,face:'S'},{c:2,r:0,lv:0,face:'S'},
    ],
  },
  {
    id: 'studio', name: 'Individual Studio', units: 3,
    wallSurfaces: 8, size: '12 × 6 m + bay', icon: '⌐',
    desc: 'L-shape · Private enclosed studio space',
    floors: [{c:0,r:0,lv:0},{c:1,r:0,lv:0},{c:1,r:1,lv:0}],
    walls: [
      {c:0,r:0,lv:0,face:'N'},{c:0,r:0,lv:0,face:'S'},{c:0,r:0,lv:0,face:'W'},
      {c:1,r:0,lv:0,face:'N'},{c:1,r:0,lv:0,face:'E'},
      {c:1,r:1,lv:0,face:'S'},{c:1,r:1,lv:0,face:'E'},{c:1,r:1,lv:0,face:'W'},
    ],
  },
  {
    id: 'public-area', name: 'Public Area', units: 4,
    wallSurfaces: 6, size: '12 × 12 m', icon: '⊞',
    desc: '2×2 grid · Open centre · Community space',
    floors: [{c:0,r:0,lv:0},{c:1,r:0,lv:0},{c:0,r:1,lv:0},{c:1,r:1,lv:0}],
    walls: [
      {c:0,r:0,lv:0,face:'N'},{c:1,r:0,lv:0,face:'N'},
      {c:0,r:0,lv:0,face:'W'},{c:0,r:1,lv:0,face:'W'},
      {c:1,r:0,lv:0,face:'E'},{c:1,r:1,lv:0,face:'E'},
    ],
  },
  {
    id: 'gallery', name: 'Gallery', units: 4,
    wallSurfaces: 6, size: '24 × 6 m', icon: '▭',
    desc: 'Quad linear bay · Exhibition hall · Open north face',
    floors: [{c:0,r:0,lv:0},{c:1,r:0,lv:0},{c:2,r:0,lv:0},{c:3,r:0,lv:0}],
    walls: [
      {c:0,r:0,lv:0,face:'W'},{c:3,r:0,lv:0,face:'E'},
      {c:0,r:0,lv:0,face:'S'},{c:1,r:0,lv:0,face:'S'},
      {c:2,r:0,lv:0,face:'S'},{c:3,r:0,lv:0,face:'S'},
    ],
  },
  {
    id: 'auditorium', name: 'Auditorium', units: 6,
    wallSurfaces: 9, size: '18 × 12 m', icon: '⊿',
    desc: 'Stepped 3×2 bays · Two-level amphitheatre section',
    floors: [
      {c:0,r:0,lv:0},{c:1,r:0,lv:0},{c:2,r:0,lv:0},
      {c:0,r:1,lv:0},{c:1,r:1,lv:0},{c:2,r:1,lv:0},
      {c:0,r:1,lv:1},{c:1,r:1,lv:1},
    ],
    walls: [
      {c:0,r:0,lv:0,face:'W'},{c:0,r:1,lv:0,face:'W'},
      {c:2,r:0,lv:0,face:'E'},{c:2,r:1,lv:0,face:'E'},
      {c:0,r:0,lv:0,face:'S'},{c:1,r:0,lv:0,face:'S'},{c:2,r:0,lv:0,face:'S'},
      {c:0,r:1,lv:1,face:'N'},{c:1,r:1,lv:1,face:'N'},
    ],
  },
  {
    id: 'stair-module', name: 'Stair Module', units: 4,
    wallSurfaces: 6, size: '12 × 6 m · 3 levels', icon: '↑',
    desc: 'Vertical circulation · Split-level · 3 storeys',
    floors: [
      {c:0,r:0,lv:0},{c:1,r:0,lv:0},
      {c:0,r:0,lv:1},{c:1,r:0,lv:1},
      {c:0,r:0,lv:2},
    ],
    walls: [
      {c:0,r:0,lv:0,face:'W'},{c:0,r:0,lv:0,face:'S'},
      {c:1,r:0,lv:0,face:'E'},{c:1,r:0,lv:0,face:'S'},
      {c:0,r:0,lv:2,face:'N'},{c:0,r:0,lv:2,face:'W'},
    ],
  },
]

const MOD_UNIT_COUNTS = [2, 3, 4, 6]

// ── module assembly: 3D scene (inside Canvas) ─────────────────────────────────
function ModuleAssemblyScene({ config, animStep }) {
  const N_LOUVERS = 9
  const louverH   = 0.10

  const louverGeo = useMemo(() => new THREE.BoxGeometry(MOD_UNIT - 0.14, louverH, 0.07), [])
  const louverMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3a68b8', roughness: 0.28, metalness: 0.18 }), [])
  const slabGeo   = useMemo(() => new THREE.BoxGeometry(MOD_UNIT - 0.12, 0.22, MOD_UNIT - 0.12), [])
  const slabMat   = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c07060', roughness: 0.72 }), [])

  const { avgC, avgR } = useMemo(() => ({
    avgC: config.floors.reduce((s, f) => s + f.c, 0) / config.floors.length,
    avgR: config.floors.reduce((s, f) => s + f.r, 0) / config.floors.length,
  }), [config.id])

  const louverYs = useMemo(() => {
    const ys = [], gap = (MOD_H - N_LOUVERS * louverH) / (N_LOUVERS + 1)
    for (let i = 0; i < N_LOUVERS; i++) ys.push(-MOD_H / 2 + gap * (i + 1) + louverH * (i + 0.5))
    return ys
  }, [])

  const wallGroupRefs = useRef([])
  const progressRef   = useRef(config.walls.map(() => 0))
  const animStepRef   = useRef(animStep)
  const configRef     = useRef(config)
  const avgCRef       = useRef(avgC)
  const avgRRef       = useRef(avgR)

  useEffect(() => { animStepRef.current = animStep }, [animStep])
  useEffect(() => {
    configRef.current = config
    avgCRef.current   = avgC
    avgRRef.current   = avgR
    progressRef.current = config.walls.map(() => 0)
    wallGroupRefs.current = []
  }, [config.id, avgC, avgR])

  useFrame(() => {
    const cfg = configRef.current
    const aC  = avgCRef.current
    const aR  = avgRRef.current
    cfg.walls.forEach((w, i) => {
      const grp = wallGroupRefs.current[i]
      if (!grp) return
      const target = i < animStepRef.current ? 1 : 0
      if (progressRef.current[i] == null) progressRef.current[i] = 0
      progressRef.current[i] = THREE.MathUtils.lerp(progressRef.current[i], target, 0.055)
      const p  = progressRef.current[i]
      const wp = modWallPos(w.c - aC, w.r - aR, w.lv, w.face)
      const od = FACE_OUT[w.face]
      grp.position.set(wp[0] + od[0] * (1 - p) * 14, wp[1], wp[2] + od[2] * (1 - p) * 14)
    })
  })

  return (
    <group>
      {config.floors.map((f, i) => (
        <mesh
          key={`s${i}`}
          geometry={slabGeo}
          material={slabMat}
          position={[(f.c - avgC) * MOD_UNIT, f.lv * MOD_H - 0.08, (f.r - avgR) * MOD_UNIT]}
          receiveShadow castShadow
        />
      ))}
      {config.walls.map((w, i) => (
        <group
          key={`w${i}`}
          ref={el => { wallGroupRefs.current[i] = el }}
          rotation={[0, FACE_ROT_Y[w.face], 0]}
        >
          {louverYs.map((ly, j) => (
            <mesh key={j} geometry={louverGeo} material={louverMat} position={[0, ly, 0]} castShadow />
          ))}
        </group>
      ))}
    </group>
  )
}

// ── catalogue: components sub-tab ─────────────────────────────────────────────
function ComponentsCatalogue({ focusId, onFocus }) {
  const [filter, setFilter] = useState('All')
  const filtered = filter === 'All'
    ? CATALOGUE_MODULES
    : CATALOGUE_MODULES.filter(m => m.category === filter)

  return (
    <>
      <div className="cat-filters">
        {CAT_CATEGORIES.map(c => (
          <button key={c} className={`cat-chip${filter === c ? ' active' : ''}`} onClick={() => setFilter(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="cat-list">
        {filtered.map(m => {
          const isFocused = focusId === m.id
          return (
            <div key={m.id} className={`cat-card${isFocused ? ' focused' : ''}`} onClick={() => onFocus(isFocused ? null : m.id)}>
              <div className="cat-card-top">
                <span className="cat-icon" style={{ color: m.color }}>{m.icon}</span>
                <div className="cat-card-info">
                  <div className="cat-name">{m.name}</div>
                  <div className="cat-cat">{m.category}</div>
                </div>
                {m.layers.length > 0 && <span className="cat-3d-badge">3D</span>}
              </div>
              <div className="cat-dims">{m.dims}</div>
              <div className="cat-material">{m.material}</div>
              <div className="cat-desc">{m.desc}</div>
            </div>
          )
        })}
      </div>
      <div className="panel-footer">
        <div className="stat">
          {focusId
            ? `Showing: ${CATALOGUE_MODULES.find(m => m.id === focusId)?.name}`
            : `${filtered.length} module${filtered.length !== 1 ? 's' : ''}`}
        </div>
      </div>
    </>
  )
}

// ── catalogue: assembly sub-tab ───────────────────────────────────────────────
function ModuleLibrary({ unitCount, onUnitCount, modConfigId, onModConfig, modStep, onPlay, onReset }) {
  const available = MODULE_DEFS.filter(m => m.units === unitCount)
  const selDef    = modConfigId ? MODULE_DEFS.find(m => m.id === modConfigId) : null
  const total     = selDef ? selDef.walls.length : 0
  const allIn     = modStep >= total && total > 0

  return (
    <div className="mod-lib">
      <div className="mod-section">
        <div className="mod-slabel">UNIT COUNT</div>
        <div className="mod-unit-row">
          {MOD_UNIT_COUNTS.map(n => (
            <button
              key={n}
              className={`mod-unit-btn${unitCount === n ? ' active' : ''}`}
              onClick={() => { onUnitCount(n); onModConfig(null) }}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="mod-unit-hint">{unitCount} × 6 m units · {unitCount * MOD_UNIT * MOD_UNIT} m² max</div>
      </div>

      <div className="mod-section mod-configs-section">
        <div className="mod-slabel">POSSIBLE LAYOUTS · {available.length}</div>
        {available.length === 0 && (
          <div className="mod-empty">No configurations for {unitCount} units yet.</div>
        )}
        {available.map(m => {
          const isSel = modConfigId === m.id
          return (
            <div key={m.id} className={`mod-card${isSel ? ' active' : ''}`} onClick={() => onModConfig(isSel ? null : m.id)}>
              <div className="mod-card-top">
                <span className="mod-icon">{m.icon}</span>
                <div className="mod-card-info">
                  <div className="mod-name">{m.name}</div>
                  <div className="mod-size">{m.size}</div>
                </div>
                <span className="mod-walls-badge">{m.wallSurfaces}W</span>
              </div>
              <div className="mod-desc">{m.desc}</div>
            </div>
          )
        })}
      </div>

      {selDef ? (
        <div className="mod-section mod-ctrl-section">
          <div className="mod-slabel">ASSEMBLY · {modStep}/{total} walls</div>
          <div className="mod-ctrl-row">
            <button className="mod-btn mod-play" onClick={onPlay} disabled={allIn}>
              {allIn ? '✓ Complete' : '▶ Animate'}
            </button>
            <button className="mod-btn mod-reset" onClick={onReset} title="Reset">↺</button>
          </div>
          <div className="mod-prog-bar">
            <div className="mod-prog-fill" style={{ width: total > 0 ? `${(modStep / total) * 100}%` : '0%' }} />
          </div>
          <div className="mod-prog-txt">
            {modStep === 0
              ? `${total} walls · press ▶ to assemble`
              : allIn ? 'Assembly complete · drag to inspect'
              : `${modStep} / ${total} walls placed`}
          </div>
        </div>
      ) : (
        <div className="mod-idle">
          <div className="mod-idle-icon">↗</div>
          <div className="mod-idle-txt">Select a layout above<br />to see its 3D assembly</div>
        </div>
      )}
    </div>
  )
}

// ── (dead old panel — replaced by new CataloguePanel above) ──────────────────
function _DeadCataloguePanel({ focusId, onFocus, catSubTab, onSubTab, unitCount, onUnitCount, modConfigId, onModConfig, modStep, onModPlay, onModReset }) {
  return (
    <div className="panel cat-panel">
      <div className="panel-header">
        <div className="panel-logo">Rewire</div>
        <div className="panel-subtitle">Module Catalogue</div>
      </div>

      <div className="cat-subtabs">
        <button className={`cat-stab${catSubTab === 'components' ? ' active' : ''}`} onClick={() => onSubTab('components')}>
          Components
        </button>
        <button className={`cat-stab${catSubTab === 'assembly' ? ' active' : ''}`} onClick={() => onSubTab('assembly')}>
          Assembly
        </button>
      </div>

      {catSubTab === 'components' ? (
        <ComponentsCatalogue focusId={focusId} onFocus={onFocus} />
      ) : (
        <ModuleLibrary
          unitCount={unitCount}
          onUnitCount={onUnitCount}
          modConfigId={modConfigId}
          onModConfig={onModConfig}
          modStep={modStep}
          onPlay={onModPlay}
          onReset={onModReset}
        />
      )}
    </div>
  )
}

/* END_DEAD_BLOCK */

// ── layer grouping ────────────────────────────────────────────────────────────
const LAYER_GROUPS = [
  {
    title: 'Floors',
    keys: ['Floor G', 'floor 1', 'floor 2', 'floor 3', 'floor 4', 'floor 5'],
  },
  {
    title: 'Deployable',
    keys: ['deployable model 3', 'OAT module'],
  },
  {
    title: 'Structure',
    keys: ['walls', 'walls 2', 'walls 3', 'columns'],
  },
  {
    title: 'Circulation',
    keys: ['stairs', 'staircase', 'lift'],
  },
  {
    title: 'Interior',
    keys: ['furniture', 'benches module'],
  },
  {
    title: 'Facade',
    keys: ['balconies module'],
  },
  {
    title: 'Landscaping',
    keys: ['green pots'],
  },
]

function pretty(name) {
  // preserve existing capitalisation, just clean underscores
  return name.replace(/_/g, ' ')
}

// ── mode toggle ───────────────────────────────────────────────────────────────
function ModeToggle({ mode, onMode }) {
  return (
    <div className="mode-toggle">
      <button
        className={`mode-btn ${mode === 'editor' ? 'active' : ''}`}
        onClick={() => onMode('editor')}
      >
        Editor
      </button>
      <button
        className={`mode-btn ${mode === 'viewer' ? 'active' : ''}`}
        onClick={() => onMode('viewer')}
      >
        Viewer
      </button>
    </div>
  )
}

// ── view-mode toggle (plan / iso) — editor only ───────────────────────────────
function ViewToggle({ viewMode, setViewMode, setActiveFloor }) {
  return (
    <div className="view-toggle">
      <button
        className={`view-btn ${viewMode === 'plan' ? 'active' : ''}`}
        onClick={() => setViewMode('plan')}
      >
        Plan
      </button>
      <button
        className={`view-btn ${viewMode === 'iso' ? 'active' : ''}`}
        onClick={() => setViewMode('iso')}
      >
        Iso
      </button>
      <button
        className={`view-btn ${viewMode === 'catalogue' ? 'active' : ''}`}
        onClick={() => setViewMode('catalogue')}
      >
        Catalogue
      </button>
    </div>
  )
}

// ── sidebar panel ─────────────────────────────────────────────────────────────
function Panel({ layers, visible, setVisible, activeFloor, setActiveFloor, xrayLevel, setXrayLevel }) {
  const nonFloorLayers = layers.filter(l => !FLOOR_LAYER_KEYS.has(l.layer))
  const allNonFloorOn  = nonFloorLayers.every(l => visible[l.layer] !== false)

  const toggleAll = () => {
    const next = {}
    layers.forEach((l) => (next[l.layer] = !allNonFloorOn))
    setVisible((v) => ({ ...v, ...next }))
  }

  const toggleGroup = (keys) => {
    const groupLayers = layers.filter((l) => keys.includes(l.layer))
    const anyOn = groupLayers.some((l) => visible[l.layer] !== false)
    const next = {}
    groupLayers.forEach((l) => (next[l.layer] = !anyOn))
    setVisible((v) => ({ ...v, ...next }))
  }

  const colorMap = {}
  layers.forEach((l) => (colorMap[l.layer] = l.color))

  const toHex = (c) => c
    ? `#${c[0].toString(16).padStart(2,'0')}${c[1].toString(16).padStart(2,'0')}${c[2].toString(16).padStart(2,'0')}`
    : '#888'

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-logo">Rewire</div>
        <div className="panel-subtitle">Wolfsburg · Deployable Modules</div>
      </div>

      <div className="master-row">
        <button className="master-btn" onClick={toggleAll}>
          {allNonFloorOn ? 'Hide all' : 'Show all'}
        </button>
      </div>

      <div className="layer-list">
        {LAYER_GROUPS.map((grp) => {
          const present = grp.keys.filter((k) => colorMap[k] !== undefined)
          if (present.length === 0) return null
          const isFloorGrp = grp.title === 'Floors'

          return (
            <div className="layer-group" key={grp.title}>
              <button
                className="group-header"
                onClick={() => isFloorGrp ? setActiveFloor(null) : toggleGroup(present)}
                title={isFloorGrp && activeFloor ? 'Show all floors' : undefined}
              >
                {grp.title}
                {isFloorGrp && activeFloor && <span className="floor-reset-chip">all</span>}
              </button>

              {present.map((key) => {
                const c   = colorMap[key]
                const hex = toHex(c)

                if (isFloorGrp) {
                  const isSel = activeFloor === key
                  const isDim = activeFloor && activeFloor !== key
                  return (
                    <div
                      key={key}
                      className={`layer-row floor-row${isSel ? ' floor-sel' : isDim ? ' floor-dim' : ''}`}
                      onClick={() => setActiveFloor(prev => prev === key ? null : key)}
                    >
                      <span className="swatch" style={{ background: hex, opacity: isDim ? 0.25 : 1 }} />
                      <span className="layer-name">{pretty(key)}</span>
                      {STAY_FLOOR_KEYS.has(key) && <span className="floor-stay-badge">STAY</span>}
                      {isSel && <span className="floor-sel-dot" />}
                    </div>
                  )
                }

                // non-floor groups — normal on/off toggle
                const on = visible[key] !== false
                return (
                  <div
                    key={key}
                    className={`layer-row ${on ? 'on' : 'off'}`}
                    onClick={() => setVisible((v) => ({ ...v, [key]: !on }))}
                  >
                    <span className="swatch" style={{ background: hex, opacity: on ? 1 : 0.3 }} />
                    <span className="layer-name">{pretty(key)}</span>
                    <span className={`toggle ${on ? 'toggle-on' : ''}`} />
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className="panel-footer">
        <div className="xray-row">
          <span className="xray-label">X-Ray</span>
          <span className="xray-pct">{xrayLevel}%</span>
        </div>
        <input
          type="range"
          min={0} max={100} step={1}
          value={xrayLevel}
          onChange={e => setXrayLevel(Number(e.target.value))}
          className="xray-slider"
          style={{ '--val': xrayLevel }}
          title="Fade outer walls to reveal interior structure"
        />
        <div className="stat">
          {activeFloor
            ? `Showing: ${pretty(activeFloor)}`
            : `${layers.filter((l) => visible[l.layer] !== false).length} / ${layers.length} layers visible`}
        </div>
      </div>
    </div>
  )
}

// ── app ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData]           = useState(null)
  const [visible, setVisible]     = useState({})
  const [activeFloor, setActiveFloor] = useState(null)
  const [mode, setMode]           = useState('viewer')
  const [viewMode, setViewMode]   = useState('plan')
  const [hovered, setHovered]     = useState(null)
  const [xrayLevel, setXrayLevel] = useState(0)

  // stay state
  const [stayHoveredId,  setStayHoveredId]  = useState(null)
  const [staySelectedId, setStaySelectedId] = useState(null)
  const [stayBookings,   setStayBookings]   = useState(stayLoad)

  // booking state
  const [bkgFloor,    setBkgFloor]    = useState(0)
  const [bkgSel,      setBkgSel]      = useState(new Set())
  const [bkgBookings, setBkgBookings] = useState(bkgLoad)

  // assembly state
  const [assemblyId,   setAssemblyId]   = useState(null)
  const [assemblyStep, setAssemblyStep] = useState(0)
  const [wallTypes,    setWallTypes]    = useState({})  // { [bookingId]: { [wallId]: type } }
  const [activeWallId, setActiveWallId] = useState(null)
  const assemblyTimer = useRef(null)

  // catalogue state
  const [catModConfigId,      setCatModConfigId]      = useState(null)
  const [catModStep,          setCatModStep]          = useState(0)
  const [catPreviewWallTypes, setCatPreviewWallTypes] = useState({})
  const [catActiveWallId,     setCatActiveWallId]     = useState(null)
  const [catLevelCount,       setCatLevelCount]       = useState(1)
  const catModTimer = useRef(null)

  // derive catalogue context: prefer live bkgSel, fall back to the active assembly booking
  const assemblyBooking = assemblyId ? bkgBookings.find(b => b.id === assemblyId) : null
  const catCells = useMemo(() => {
    if (bkgSel.size > 0) return bkgSel
    if (assemblyBooking) return new Set(assemblyBooking.cells)
    return new Set()
  }, [bkgSel, assemblyBooking])
  const catFloor = useMemo(() => {
    if (bkgSel.size > 0) return bkgFloor
    if (assemblyBooking) return assemblyBooking.floor
    return bkgFloor
  }, [bkgSel, bkgFloor, assemblyBooking])

  // floors involved in preview: catFloor through catFloor+catLevelCount-1, capped at 5
  const catPreviewFloors = useMemo(
    () => Array.from({ length: catLevelCount }, (_, i) => Math.min(catFloor + i, 5)),
    [catFloor, catLevelCount]
  )

  // perimeter walls on the base floor (used for animation step count + right panel)
  const catPreviewWalls = useMemo(
    () => catModConfigId && catCells.size > 0 ? getPerimeterWalls([...catCells], catFloor) : [],
    [catModConfigId, catCells, catFloor]
  )

  // per-cell positions in three.js space — fed to FloatingCubes for settle targets
  const floatSelCells = useMemo(() => {
    // during assembly use the booked cells (bkgSel is cleared after booking)
    if (assemblyId && assemblyBooking) {
      return assemblyBooking.cells.map(id => {
        const [r, c] = id.split('-').map(Number)
        return bkgPos(r, c, assemblyBooking.floor)
      })
    }
    if (bkgSel.size > 0) {
      return [...bkgSel].map(id => {
        const [r, c] = id.split('-').map(Number)
        return bkgPos(r, c, bkgFloor)
      })
    }
    return []
  }, [bkgSel, bkgFloor, assemblyId, assemblyBooking])

  const handleMode = (m) => {
    setMode(m)
    if (m === 'editor') setViewMode('plan')
    setCatModConfigId(null)
    setCatPreviewWallTypes({})
    setCatActiveWallId(null)
    setCatLevelCount(1)
    clearInterval(catModTimer.current)
    setCatModStep(0)
  }

  const handleViewMode = (vm) => {
    setViewMode(vm)
    if (vm !== 'catalogue') {
      setCatModConfigId(null)
      setCatPreviewWallTypes({})
      setCatActiveWallId(null)
      setCatLevelCount(1)
      clearInterval(catModTimer.current)
      setCatModStep(0)
    }
  }

  const handleModConfig = (id) => {
    clearInterval(catModTimer.current)
    setCatModConfigId(id)
    setCatModStep(0)
    setCatPreviewWallTypes({})
    setCatActiveWallId(null)
  }

  const handleModPlay = () => {
    if (!catModConfigId) return
    clearInterval(catModTimer.current)
    const total = catPreviewWalls.length
    let step = catModStep
    catModTimer.current = setInterval(() => {
      step++
      setCatModStep(step)
      if (step >= total) clearInterval(catModTimer.current)
    }, 520)
  }

  const handleModReset = () => {
    clearInterval(catModTimer.current)
    setCatModStep(0)
  }

  const setCatPreviewWallType = (wallId, type) => {
    setCatPreviewWallTypes(prev => ({ ...prev, [wallId]: type }))
  }

  const assemblyWalls   = useMemo(
    () => assemblyBooking ? getPerimeterWalls(assemblyBooking.cells, assemblyBooking.floor) : [],
    [assemblyId, bkgBookings]
  )

  const toggleBkgCell  = (id) => {
    setBkgSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const clearBkgSel    = () => setBkgSel(new Set())
  const switchBkgFloor = (i) => { setBkgFloor(i); setBkgSel(new Set()) }

  const startAssembly = (bookingId) => {
    clearInterval(assemblyTimer.current)
    setAssemblyId(bookingId)
    setAssemblyStep(0)
    setActiveWallId(null)
    setViewMode('iso')  // switch to iso so walls are visible in 3D
  }
  const closeAssembly = () => {
    clearInterval(assemblyTimer.current)
    setAssemblyId(null)
    setAssemblyStep(0)
    setActiveWallId(null)
  }
  const playAssembly = () => {
    clearInterval(assemblyTimer.current)
    const total = assemblyWalls.length
    let step = assemblyStep
    assemblyTimer.current = setInterval(() => {
      step++
      setAssemblyStep(step)
      if (step >= total) clearInterval(assemblyTimer.current)
    }, 550)
  }
  const resetAssembly = () => {
    clearInterval(assemblyTimer.current)
    setAssemblyStep(0)
  }
  const setWallType = (wallId, type) => {
    setWallTypes(prev => ({
      ...prev,
      [assemblyId]: { ...(prev[assemblyId] || {}), [wallId]: type }
    }))
  }

  useEffect(() => {
    fetch('./model.json')
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        // these layers clutter the booking/selection view — start hidden, user can toggle on
        const OFF_BY_DEFAULT = new Set([
          'walls', 'walls 2', 'walls 3',
          'stairs', 'staircase', 'lift',
          'deployable model 3',
        ])
        const init = {}
        d.statics.forEach((s) => (init[s.layer] = !OFF_BY_DEFAULT.has(s.layer)))
        setVisible(init)
      })
  }, [])

  const layers = useMemo(() => {
    if (!data) return []
    const seen = {}
    data.statics.forEach((s) => { if (!seen[s.layer]) seen[s.layer] = s.color })
    return Object.entries(seen).map(([layer, color]) => ({ layer, color }))
  }, [data])

  // cameraKey drives full remount of SceneCamera (camera + OrbitControls)
  // so OrbitControls always re-attaches to the correct camera type
  const cameraKey = mode === 'editor' ? `editor-${viewMode}` : 'viewer'

  const isCatView    = mode === 'editor' && viewMode === 'catalogue'
  // Stay panel triggers automatically when a residential floor (1/2/3) is active in plan or iso
  const isStayFloor   = STAY_FLOOR_KEYS.has(activeFloor)
  const isStayContext = mode === 'editor' && isStayFloor && (viewMode === 'plan' || viewMode === 'iso')
  const stayActiveFloorIdx = isStayContext ? (STAY_FLOOR_IDX[activeFloor] ?? null) : null

  const hintText = {
    viewer:    'Drag to orbit · scroll to zoom · right-drag to pan',
    plan:      isStayContext
                 ? 'Stay · cyan = Single · yellow = Double · pink = Dorm · click a room to book'
                 : 'Plan view · scroll to zoom · drag to pan · no rotation',
    iso:       isStayContext
                 ? 'Stay · hover a room to preview · click to select · fill form on right to confirm'
                 : 'Iso view · drag to orbit · scroll to zoom · right-drag to pan',
    catalogue: 'Catalogue · select cells in Plan / Iso first, then choose a layout',
  }

  return (
    <div className="app" data-mode={mode} data-view={viewMode}>
      <div className="canvas-wrap">
        <Canvas shadows gl={{ antialias: true }}>
          <color attach="background" args={['#080C1A']} />
          <hemisphereLight intensity={0.5} skyColor="#4CC9F0" groundColor="#1A0533" />
          <ambientLight intensity={0.25} />
          <directionalLight
            position={[300, 400, 300]}
            intensity={2.2}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-near={1}
            shadow-camera-far={2000}
            shadow-camera-left={-600}
            shadow-camera-right={600}
            shadow-camera-top={600}
            shadow-camera-bottom={-600}
            shadow-bias={-0.001}
          />

          {/* key forces full remount on every mode/viewMode change */}
          <SceneCamera key={cameraKey} mode={mode} viewMode={viewMode} />
          {mode === 'viewer' && <FloorZoomController activeFloor={activeFloor} />}

          {mode === 'editor' && !isCatView && !isStayContext && <EditorGrid />}

          {mode === 'editor' && !isStayContext && (
            <FloatingCubes selCells={floatSelCells} assembling={!!assemblyId} />
          )}

          {isStayContext && (
            <StayCells
              hoveredId={stayHoveredId}
              selectedId={staySelectedId}
              bookedIds={new Set(stayBookings.map(b => b.roomId))}
              activeFloorIdx={stayActiveFloorIdx}
              onSelect={setStaySelectedId}
            />
          )}

          {mode === 'editor' && !isCatView && !isStayContext && !assemblyId && (
            <BookingCells
              floor={bkgFloor}
              sel={bkgSel}
              bookings={bkgBookings}
              onToggle={toggleBkgCell}
            />
          )}

          {mode === 'editor' && !isCatView && !isStayContext && assemblyBooking && assemblyId && (
            <AssemblyGeometry
              key={assemblyId}
              booking={assemblyBooking}
              wallTypesMap={wallTypes[assemblyId] || {}}
              activeWallId={activeWallId}
              onSelectWall={setActiveWallId}
              animStep={assemblyStep}
            />
          )}

          {isCatView && catModConfigId && catCells.size > 0 && catPreviewFloors.map(floorIdx => (
            <AssemblyGeometry
              key={`cat-${catModConfigId}-${floorIdx}`}
              booking={{ id: `cat-preview-${floorIdx}`, cells: [...catCells], floor: floorIdx }}
              wallTypesMap={catPreviewWallTypes}
              activeWallId={catActiveWallId}
              onSelectWall={setCatActiveWallId}
              animStep={catModStep}
            />
          ))}

          {data && (
            <Model
              data={data}
              visible={visible}
              activeFloor={isCatView ? BKG_FLOOR_KEYS[catFloor] : isStayContext ? null : activeFloor}
              focusLayers={null}
              mode={mode}
              hovered={hovered}
              onHover={setHovered}
              xrayLevel={xrayLevel}
            />
          )}
        </Canvas>
      </div>

      {data && !isCatView && !isStayContext && (
        <Panel
          layers={layers}
          visible={visible}
          setVisible={setVisible}
          activeFloor={activeFloor}
          setActiveFloor={setActiveFloor}
          xrayLevel={xrayLevel}
          setXrayLevel={setXrayLevel}
        />
      )}

      {data && isCatView && (
        <CataloguePanel
          catFloor={catFloor}
          catCells={catCells}
          levelCount={catLevelCount}
          onLevelCount={setCatLevelCount}
          modConfigId={catModConfigId}
          onModConfig={handleModConfig}
        />
      )}

      {data && isCatView && (
        <CatalogueRightPanel
          modConfigId={catModConfigId}
          onClose={() => handleModConfig(null)}
          catFloor={catFloor}
          catCells={catCells}
          levelCount={catLevelCount}
          assemblyWalls={catPreviewWalls}
          animStep={catModStep}
          wallTypes={catPreviewWallTypes}
          activeWallId={catActiveWallId}
          onPlay={handleModPlay}
          onReset={handleModReset}
          onSetWallType={setCatPreviewWallType}
          onSelectWall={setCatActiveWallId}
        />
      )}

      {isStayContext && data && (
        <StayRightPanel
          hoveredId={stayHoveredId}
          setHoveredId={setStayHoveredId}
          selectedId={staySelectedId}
          setSelectedId={setStaySelectedId}
          bookings={stayBookings}
          onBook={(b) => setStayBookings(prev => [...prev, b])}
          activeFloor={activeFloor}
        />
      )}

      {mode === 'editor' && !isCatView && !isStayContext && data && (
        <BookingRightPanel
          floor={bkgFloor}
          onFloor={switchBkgFloor}
          sel={bkgSel}
          onToggle={toggleBkgCell}
          onClearSel={clearBkgSel}
          bookings={bkgBookings}
          onBookings={setBkgBookings}
          assemblyId={assemblyId}
          assemblyWalls={assemblyWalls}
          assemblyStep={assemblyStep}
          wallTypes={wallTypes[assemblyId] || {}}
          activeWallId={activeWallId}
          onStartAssembly={startAssembly}
          onCloseAssembly={closeAssembly}
          onPlayAssembly={playAssembly}
          onResetAssembly={resetAssembly}
          onSetWallType={setWallType}
          onSelectWall={setActiveWallId}
        />
      )}

      {!data && (
        <div className="loading">
          <div className="loading-dot" />
          Loading model…
        </div>
      )}

      <ModeToggle mode={mode} onMode={handleMode} />

      {mode === 'editor' && (
        <ViewToggle viewMode={viewMode} setViewMode={handleViewMode} setActiveFloor={setActiveFloor} />
      )}

      <div className="hint">
        {mode === 'editor' ? hintText[viewMode] : hintText.viewer}
      </div>
    </div>
  )
}
