import * as THREE from 'three';
import { l } from '@onigam/lab-kit/i18n';
import { PartRegistry } from '@onigam/lab-kit/three';
import type { Hotspot, SceneModule } from '@onigam/lab-kit/three';
import type { RamState } from '../../sim/types';
import { paperFloor } from '../common';
import { createRamModel, type RamModel } from './model';
import { FOUNDATION_BOTTOM } from './foundation';

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
  { id: 'delivery-valve', fr: 'Clapet anti-retour', en: 'Check valve' },
  { id: 'air-chamber', fr: 'Cloche à air', en: 'Air chamber' },
  { id: 'gauge', fr: 'Manomètre', en: 'Pressure gauge' },
  { id: 'snifter', fr: 'Reniflard', en: 'Snifter' },
  { id: 'outlet-valve', fr: 'Vanne de sortie V3', en: 'Outlet valve V3' },
  { id: 'foundation', fr: 'Massif d’ancrage', en: 'Anchor block' },
  { id: 'strainer', fr: 'Crépine', en: 'Strainer', minor: true },
  { id: 'inlet-flange', fr: 'Bride d’arrivée', en: 'Inlet flange', minor: true },
  { id: 'delivery-union', fr: 'Raccord union', en: 'Delivery union', minor: true },
  { id: 'drain-valve', fr: 'Vanne de vidange V2', en: 'Drain valve V2', minor: true },
];

export interface RamScene extends SceneModule<RamState> {
  model: RamModel;
}

export function createRamScene(): RamScene {
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
  scene.add(paperFloor(12, 8, FOUNDATION_BOTTOM - 0.0005));

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
    model,
    home: { position: new THREE.Vector3(0.95, 0.62, 1.75), target: new THREE.Vector3(0.12, 0.2, 0) },
    minDistance: 0.12,
    maxDistance: 6,
    update(state, dt, view) {
      model.update(state, dt, view);
    },
  };
}
