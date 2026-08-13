// Converts the project's custom raw-JSON geometry dumps into Draco-compressed .glb.
//
// Three source schemas were found in Third home/repo/clone (branch website/printer-part):
//   1. "statics"  (model.json)            — {layer, floor, color[0-255], opacity, positions[flat], indices[flat]}
//   2. "parts"    (per-space *_model.json) — {position[flat], index[flat], color[0-255], layer}
//   3. "frames"   (roof_morph.json)        — {frames:[{vertices:[[x,y,z],...], pressure}], faces:[[a,b,c,d],...]} (quads, morph target)
//
// Usage: node convert-models.mjs <input.json> <output.glb>

import fs from 'node:fs';
import path from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRDracoMeshCompression, KHRMaterialsUnlit } from '@gltf-transform/extensions';
import { draco, weld } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error('Usage: node convert-models.mjs <input.json> <output.glb>');
  process.exit(1);
}

const io = new NodeIO()
  .registerExtensions([KHRDracoMeshCompression, KHRMaterialsUnlit])
  .registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule(),
  });

const raw = fs.readFileSync(inputPath, 'utf8');
const data = JSON.parse(raw);

const doc = new Document();
const buffer = doc.createBuffer();
const scene = doc.createScene();

// cache materials by "r,g,b,opacity" so identical-colored parts share one material
const materialCache = new Map();
function getMaterial(colorRGB255, opacity = 1) {
  const key = colorRGB255.join(',') + '|' + opacity;
  if (materialCache.has(key)) return materialCache.get(key);
  const mat = doc
    .createMaterial()
    .setBaseColorFactor([colorRGB255[0] / 255, colorRGB255[1] / 255, colorRGB255[2] / 255, opacity])
    .setRoughnessFactor(0.8)
    .setMetallicFactor(0);
  if (opacity < 1) mat.setAlphaMode('BLEND');
  materialCache.set(key, mat);
  return mat;
}

function addTriangleMesh(name, positionsFlat, indicesFlat, colorRGB255, opacity, extras) {
  const positionAccessor = doc
    .createAccessor()
    .setType('VEC3')
    .setArray(new Float32Array(positionsFlat))
    .setBuffer(buffer);

  const indexAccessor = doc
    .createAccessor()
    .setType('SCALAR')
    .setArray(
      positionsFlat.length / 3 > 65535
        ? new Uint32Array(indicesFlat)
        : new Uint16Array(indicesFlat)
    )
    .setBuffer(buffer);

  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', positionAccessor)
    .setIndices(indexAccessor)
    .setMaterial(getMaterial(colorRGB255, opacity));

  const mesh = doc.createMesh(name).addPrimitive(prim);
  const node = doc.createNode(name).setMesh(mesh);
  // preserve original per-part fields (e.g. floor, opacity) the app reads directly,
  // so the loader can reconstitute the exact {layer, floor, color, opacity, ...} shape
  if (extras) node.setExtras({ ...node.getExtras(), ...extras });
  scene.addChild(node);
  return node;
}

let partCount = 0;

if (Array.isArray(data.statics)) {
  // schema 1: model.json — group by layer, one node per static entry
  for (const s of data.statics) {
    addTriangleMesh(s.layer, s.positions, s.indices, s.color, s.opacity ?? 1, {
      floor: s.floor ?? null,
      opacity: s.opacity ?? 1,
    });
    partCount++;
  }
} else if (Array.isArray(data.parts)) {
  // schema 2: per-space *_model.json
  for (const [i, p] of data.parts.entries()) {
    addTriangleMesh(p.layer || `part_${i}`, p.position, p.index, p.color, 1, { opacity: 1 });
    partCount++;
  }
} else if (Array.isArray(data.frames)) {
  // schema 3: roof_morph.json — quad faces, 2 frames -> base + 1 morph target
  const faces = data.faces; // shared quad topology across frames, e.g. [a,b,c,d]
  const triIndices = [];
  for (const f of faces) {
    if (f.length === 4) {
      const [a, b, c, d] = f;
      triIndices.push(a, b, c, a, c, d);
    } else if (f.length === 3) {
      triIndices.push(...f);
    }
  }

  const baseFrame = data.frames[0];
  const basePositions = baseFrame.vertices.flat();

  const positionAccessor = doc
    .createAccessor()
    .setType('VEC3')
    .setArray(new Float32Array(basePositions))
    .setBuffer(buffer);

  const indexAccessor = doc
    .createAccessor()
    .setType('SCALAR')
    .setArray(
      basePositions.length / 3 > 65535 ? new Uint32Array(triIndices) : new Uint16Array(triIndices)
    )
    .setBuffer(buffer);

  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', positionAccessor)
    .setIndices(indexAccessor)
    .setMaterial(getMaterial([230, 230, 235], 1));

  // remaining frames become morph targets (position deltas from base)
  for (let fi = 1; fi < data.frames.length; fi++) {
    const frame = data.frames[fi];
    const framePositions = frame.vertices.flat();
    const delta = new Float32Array(framePositions.length);
    for (let i = 0; i < framePositions.length; i++) delta[i] = framePositions[i] - basePositions[i];
    const targetAccessor = doc.createAccessor().setType('VEC3').setArray(delta).setBuffer(buffer);
    const target = doc.createPrimitiveTarget().setAttribute('POSITION', targetAccessor);
    prim.addTarget(target);
  }

  const mesh = doc.createMesh('roof').addPrimitive(prim);
  mesh.setWeights(data.frames.slice(1).map(() => 0));
  const node = doc.createNode('roof').setMesh(mesh);
  // RoofMesh interpolates by frame.pressure and needs quad-shaped faces
  // (not the triangulated mesh above) — embed the original structure
  // losslessly rather than trying to reconstruct pressure/quads from a
  // triangulated mesh on load. Small dataset (164KB raw), no real benefit
  // from mesh-based storage anyway.
  node.setExtras({ frames: data.frames, faces: data.faces });
  scene.addChild(node);
  partCount = 1;
} else {
  console.error('Unrecognized schema, top-level keys:', Object.keys(data));
  process.exit(1);
}

doc.getRoot().setDefaultScene(scene);

// morph-target meshes (roof_morph) skip Draco: KHR_draco_mesh_compression does not cover morph targets
const hasMorphTargets = Array.isArray(data.frames);
if (!hasMorphTargets) {
  await doc.transform(weld(), draco());
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
await io.write(outputPath, doc);

const inSize = fs.statSync(inputPath).size;
const outSize = fs.statSync(outputPath).size;
console.log(
  `${path.basename(inputPath)}: ${partCount} parts, ` +
    `${(inSize / 1e6).toFixed(1)}MB -> ${(outSize / 1e6).toFixed(2)}MB ` +
    `(${(inSize / outSize).toFixed(1)}x smaller)`
);
