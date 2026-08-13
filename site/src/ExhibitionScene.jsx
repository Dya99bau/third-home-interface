import React, { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

// ── geometry helper (mirrors App.jsx buildGeometry) ──────────────────────────
function buildGeometry(positions, indices) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

const KIND_MATERIAL = {
  floor:   { color: '#c9b28d', roughness: 0.75, metalness: 0.02, opacity: 1 },
  ceiling: { color: '#f4f2ec', roughness: 0.9,  metalness: 0,    opacity: 1 },
  wall:    { color: '#eeece4', roughness: 0.85, metalness: 0,    opacity: 1 },
  other:   { color: '#8fd4e8', roughness: 0.15, metalness: 0.1,  opacity: 0.35 },
}

function RoomPart({ part }) {
  const geo = useMemo(() => buildGeometry(part.positions, part.indices), [part])
  const preset = KIND_MATERIAL[part.kind] || KIND_MATERIAL.other
  const transparent = preset.opacity < 1
  return (
    <mesh geometry={geo} castShadow={part.kind !== 'other'} receiveShadow>
      <meshStandardMaterial
        color={preset.color}
        roughness={preset.roughness}
        metalness={preset.metalness}
        transparent={transparent}
        opacity={preset.opacity}
        side={THREE.DoubleSide}
        depthWrite={!transparent}
      />
    </mesh>
  )
}

function RoomShell({ data }) {
  return (
    <group>
      {data.statics.map((part, i) => <RoomPart key={i} part={part} />)}
    </group>
  )
}

// ── low-poly gallery visitor (silhouette style) ──────────────────────────────
function Person({ position, rotationY = 0, color = '#2b3040', height = 1.74 }) {
  const legH  = height * 0.48
  const bodyH = height * 0.36
  const headR = height * 0.062
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, legH / 2, 0]} castShadow>
        <cylinderGeometry args={[height * 0.05, height * 0.065, legH, 10]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, legH + bodyH / 2, 0]} castShadow>
        <capsuleGeometry args={[height * 0.115, bodyH * 0.55, 4, 10]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, legH + bodyH + headR * 0.85, 0]} castShadow>
        <sphereGeometry args={[headR, 14, 14]} />
        <meshStandardMaterial color="#dfb98f" roughness={0.6} />
      </mesh>
    </group>
  )
}

const PEOPLE = [
  { position: [-2.4, 0, -5.4], rotationY: Math.PI * 0.5,  color: '#2b3040' },
  { position: [ 2.6, 0, -3.8], rotationY: -Math.PI * 0.45, color: '#5a3a52' },
  { position: [-1.6, 0, -1.2], rotationY: Math.PI * 0.15,  color: '#3a4d5c' },
  { position: [ 1.9, 0,  0.4], rotationY: -Math.PI * 0.6,  color: '#4a3626' },
  { position: [-2.8, 0,  2.6], rotationY: Math.PI * 0.5,   color: '#2f4a44' },
  { position: [ 0.3, 0,  4.8], rotationY: Math.PI,         color: '#3d3d3d' },
  { position: [ 2.5, 0,  6.4], rotationY: -Math.PI * 0.4,  color: '#5c4a2e' },
  { position: [-0.6, 0, -6.6], rotationY: -Math.PI * 0.2,  color: '#4a2f44' },
]

function People() {
  return (
    <group>
      {PEOPLE.map((p, i) => <Person key={i} {...p} />)}
    </group>
  )
}

// ── gallery furniture ─────────────────────────────────────────────────────────
function Plinth({ position, size = [0.55, 0.9, 0.55], sculpture = 'box', color = '#f4f2ec' }) {
  return (
    <group position={position}>
      <mesh position={[0, size[1] / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0, size[1] + 0.22, 0]} castShadow>
        {sculpture === 'box'    && <boxGeometry args={[0.32, 0.44, 0.32]} />}
        {sculpture === 'sphere' && <sphereGeometry args={[0.24, 20, 20]} />}
        {sculpture === 'torus'  && <torusGeometry args={[0.2, 0.075, 12, 28]} />}
        {sculpture === 'cone'   && <coneGeometry args={[0.24, 0.46, 24]} />}
        <meshStandardMaterial color="#c9a34a" roughness={0.3} metalness={0.55} />
      </mesh>
    </group>
  )
}

const PLINTHS = [
  { position: [0, 0, -4.2], sculpture: 'torus'  },
  { position: [0, 0, -1.0], sculpture: 'sphere' },
  { position: [0, 0,  2.2], sculpture: 'cone'   },
  { position: [0, 0,  5.6], sculpture: 'box'    },
]

function Painting({ position, rotationY, w = 1.1, h = 0.85, color }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh castShadow>
        <boxGeometry args={[w + 0.08, h + 0.08, 0.05]} />
        <meshStandardMaterial color="#151821" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.035]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </group>
  )
}

const PAINTING_COLORS = ['#c96a4e', '#4c7a9c', '#d9b23c', '#6a8f5c', '#9c5c8f', '#3c5c7a', '#b3552e', '#7a9c6a']

function Paintings({ sizeX, sizeY }) {
  const wallX = sizeX / 2 - 0.05
  const wallZ = sizeY / 2 - 0.05
  const zs = [-6.2, -3.0, 0.2, 3.4, 6.2]
  const paintings = []
  zs.forEach((z, i) => {
    paintings.push({ position: [-wallX, 1.55, z], rotationY: Math.PI / 2, color: PAINTING_COLORS[i % PAINTING_COLORS.length] })
    paintings.push({ position: [ wallX, 1.55, z], rotationY: -Math.PI / 2, color: PAINTING_COLORS[(i + 4) % PAINTING_COLORS.length] })
  })
  paintings.push({ position: [-1.6, 1.55, -wallZ], rotationY: 0, color: PAINTING_COLORS[2] })
  paintings.push({ position: [ 1.6, 1.55, -wallZ], rotationY: 0, color: PAINTING_COLORS[5] })
  return <group>{paintings.map((p, i) => <Painting key={i} {...p} />)}</group>
}

function Bench({ position, rotationY = 0 }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.06, 0.42]} />
        <meshStandardMaterial color="#8a6a48" roughness={0.6} />
      </mesh>
      {[[-0.68, -0.15], [0.68, -0.15], [-0.68, 0.15], [0.68, 0.15]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.2, z]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} />
          <meshStandardMaterial color="#2b2b2b" roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

// ── scene root ────────────────────────────────────────────────────────────────
export default function ExhibitionScene({ onBack }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('./exhibition_model.json').then(r => r.json()).then(setData).catch(() => {})
  }, [])

  const sizeX = data?.bounds?.sizeX ?? 9.67
  const sizeY = data?.bounds?.sizeY ?? 15.51

  return (
    <div className="exhibition-scene">
      <Canvas shadows gl={{ antialias: true }}>
        <color attach="background" args={['#11151f']} />
        <hemisphereLight intensity={0.55} skyColor="#fff6e6" groundColor="#2a2f3a" />
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[3, 8, 4]}
          intensity={1.4}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={30}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        {PLINTHS.map((p, i) => (
          <pointLight key={i} position={[p.position[0], 2.4, p.position[2]]} intensity={0.6} distance={4} color="#ffe9c2" />
        ))}

        <PerspectiveCamera makeDefault position={[0, 1.75, sizeY / 2 - 1.4]} fov={58} near={0.1} far={100} />
        <OrbitControls
          makeDefault
          target={[0, 1.5, 0]}
          minDistance={2}
          maxDistance={22}
          maxPolarAngle={Math.PI / 2.05}
        />

        {data && <RoomShell data={data} />}
        <Paintings sizeX={sizeX} sizeY={sizeY} />
        <group>{PLINTHS.map((p, i) => <Plinth key={i} {...p} />)}</group>
        <Bench position={[-2.9, 0, 0.4]} rotationY={Math.PI / 2} />
        <Bench position={[ 2.9, 0, -2.4]} rotationY={-Math.PI / 2} />
        <People />

        <ContactShadows position={[0, 0.01, 0]} opacity={0.35} scale={20} blur={1.6} far={3} />
      </Canvas>

      <button className="exhibition-back-btn" onClick={onBack}>← Back</button>
      <div className="exhibition-title">
        <span className="exhibition-title-main">EXHIBITION SPACE</span>
        <span className="exhibition-title-sub">Gallery walkthrough · scroll to zoom · drag to orbit</span>
      </div>
      {!data && (
        <div className="loading">
          <div className="loading-dot" />
          Loading exhibition model…
        </div>
      )}
    </div>
  )
}
