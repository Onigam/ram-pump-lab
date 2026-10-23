import * as THREE from 'three';
import { l } from '@onigam/lab-kit/i18n';
import { PartRegistry } from '@onigam/lab-kit/three';
import type { Hotspot, SceneModule } from '@onigam/lab-kit/three';
import type { RamState } from '../../sim/types';
import { RAM } from '../dims';
import { createRamModel } from './model';

// The "ram" world: the device on a drafting-table floor, lit like the Pelton Lab workshop (paper, copper, soft shadows).

interface HotspotDef {
  id: string;
  fr: string;
  en: string;
  minor?: boolean;
}

const HOTSPOTS: HotspotDef[] = [
  { id: 'ram', fr: 'Corps en fonte', en: 'Cast body' },
  { id: 'inlet-valve', fr: 'Vanne d’arrivée V1', en: 'Inlet valve V1' },
  { id: 'waste-valve', fr: 'Clapet de choc', en: 'Waste valve' },
  { id: 'counterweight', fr: 'Poids', en: 'Weight' },
  { id: 'delivery-valve', fr: 'Clapet anti-retour', en: 'Check valve' },
  { id: 'air-chamber', fr: 'Cloche à air', en: 'Air chamber' },
  { id: 'gauge', fr: 'Manomètre', en: 'Pressure gauge' },
  { id: 'snifter', fr: 'Reniflard', en: 'Snifter' },
  { id: 'outlet-valve', fr: 'Vanne de sortie V3', en: 'Outlet valve V3' },
  { id: 'strainer', fr: 'Crépine', en: 'Strainer', minor: true },
  { id: 'drain-valve', fr: 'Vanne de vidange V2', en: 'Drain valve V2', minor: true },
  { id: 'base-plate', fr: 'Platine de base', en: 'Base plate', minor: true },
  { id: 'valve-seat', fr: 'Portée conique', en: 'Conical seat', minor: true },
  { id: 'valve-stem', fr: 'Tige du clapet', en: 'Valve stem', minor: true },
  { id: 'valve-guide', fr: 'Doigt de gant', en: 'Thermowell guide', minor: true },
  { id: 'stroke-nut', fr: 'Écrou de course', en: 'Stroke nut', minor: true },
  { id: 'lock-nut', fr: 'Contre-écrou', en: 'Lock nut', minor: true },
  { id: 'valve-fins', fr: 'Ailettes', en: 'Fins', minor: true },
];

/** Drafting-table floor: a paper disc with a fine grid, as a DataTexture (no canvas, so it also builds in Node). */
function paperFloor(): THREE.Mesh {
  const N = 512;
  const data = new Uint8Array(N * N * 4);
  const cell = N / 8;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const k = (y * N + x) * 4;
      let a = 0;
      const mx = x % cell;
      const my = y % cell;
      if (mx < 2 || my < 2) a = 0.16;
      else if (mx % (cell / 5) < 1 || my % (cell / 5) < 1) a = 0.06;
      // paper #efe6d3 mixed with the blue-grey ink of the grid
      data[k] = Math.round(239 * (1 - a) + 40 * a);
      data[k + 1] = Math.round(230 * (1 - a) + 60 * a);
      data[k + 2] = Math.round(211 * (1 - a) + 90 * a);
      data[k + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(12, 64),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0.2, RAM.floorY - 0.0005, 0);
  floor.receiveShadow = true;
  floor.name = 'floor';
  return floor;
}

export function createRamScene(): SceneModule<RamState> {
  const scene = new THREE.Scene();
  scene.name = 'ram';
  scene.background = new THREE.Color(0xefe6d3);
  scene.fog = new THREE.Fog(0xefe6d3, 6, 14);
  scene.userData.wantsEnv = true;

  scene.add(new THREE.HemisphereLight(0xfff4e0, 0xb6a68c, 1.1));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.4);
  key.position.set(1.7, 2.9, 2.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const sc = key.shadow.camera;
  sc.left = -1.3;
  sc.right = 1.3;
  sc.top = 1.1;
  sc.bottom = -1.1;
  sc.near = 0.5;
  sc.far = 9;
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.004;
  key.target.position.set(0.1, 0.2, 0);
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xdfe9ff, 0.7);
  fill.position.set(-3, 2, 1);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.8);
  rim.position.set(0.5, 3, -4);
  scene.add(rim);
  scene.add(paperFloor());

  const registry = new PartRegistry();
  const model = createRamModel(registry);
  scene.add(model.root);

  const hotspots: Hotspot[] = HOTSPOTS.map((h) => ({
    partId: h.id,
    anchor: model.rig.anchors[h.id],
    label: l(h.fr, h.en),
    minor: h.minor,
  }));

  return {
    id: 'ram',
    scene,
    registry,
    hotspots,
    home: { position: new THREE.Vector3(0.95, 0.62, 1.75), target: new THREE.Vector3(0.12, 0.2, 0) },
    minDistance: 0.12,
    maxDistance: 6,
    update(state, dt, view) {
      model.update(state, dt, view);
    },
  };
}
