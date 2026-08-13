import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/draco/')

const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

const cache = new Map()

// Loads a converted .glb and reconstitutes the same {statics:[{layer, floor,
// color, opacity, positions, indices}]} shape the app used to get from
// fetching the raw model.json, so the rest of the component tree (layer
// toggles, floor dimming, buildGeometry) doesn't need to change.
export function loadModelAsStatics(url) {
  if (cache.has(url)) return cache.get(url)
  const promise = new Promise((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => {
        const statics = []
        gltf.scene.children.forEach((node) => {
          const mesh = node.isMesh ? node : node.children.find((c) => c.isMesh)
          if (!mesh) return
          const geom = mesh.geometry
          const posAttr = geom.getAttribute('position')
          const idxAttr = geom.getIndex()
          const c = mesh.material.color
          statics.push({
            layer: node.name,
            floor: node.userData.floor ?? null,
            opacity: node.userData.opacity ?? mesh.material.opacity ?? 1,
            color: [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)],
            // buildGeometry()'s setIndex() only auto-wraps plain Array (a raw
            // typed array falls through unwrapped and breaks rendering) —
            // match the original JSON's plain-array shape exactly.
            positions: Array.from(posAttr.array),
            indices: idxAttr ? Array.from(idxAttr.array) : null,
          })
        })
        resolve({ statics })
      },
      undefined,
      reject
    )
  })
  cache.set(url, promise)
  return promise
}

// roof_morph.glb carries the original {frames:[{vertices,pressure}], faces}
// structure verbatim as glTF extras on the "roof" node (RoofMesh interpolates
// by frame.pressure and needs quad-shaped faces, which the mesh geometry
// itself doesn't preserve losslessly) — just read it back out.
export function loadRoofMorph(url) {
  const key = 'roof:' + url
  if (cache.has(key)) return cache.get(key)
  const promise = new Promise((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => {
        const node = gltf.scene.children.find((c) => c.userData?.frames)
        if (!node) return reject(new Error('roof_morph.glb: no node with frames/faces extras found'))
        resolve({ frames: node.userData.frames, faces: node.userData.faces })
      },
      undefined,
      reject
    )
  })
  cache.set(key, promise)
  return promise
}
