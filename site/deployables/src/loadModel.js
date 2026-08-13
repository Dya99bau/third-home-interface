import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('./draco/')

const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

const cache = new Map()

// Loads the converted model.glb and reconstitutes the {statics:[{layer,
// floor, color, opacity, positions, indices}]} shape the app used to get
// from fetching the raw 45.6MB model.json, so buildGeometry() and the rest
// of the component tree don't need to change.
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
