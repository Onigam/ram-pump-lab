import * as THREE from 'three';
import { l } from '@onigam/lab-kit/i18n';
import { PartRegistry } from '@onigam/lab-kit/three';
import type { Hotspot, SceneModule } from '@onigam/lab-kit/three';
import type { RamState } from '../../sim/types';
import { FlowDots } from '../common';
import { CutKit } from '../cut';
import { benchFloor, buildBench } from './bench';
import { EXPLODE_Y } from './explode';
import { VALVE_PART_IDS, createWasteValveModel, type WasteValveModel } from './model';

// The `valve` world: the waste valve of the video at workshop scale, standing on its base plate on two steel parallels on a
// plain wooden plinth, lit like the other worlds (paper, copper, soft shadows). Metres, the valve frame: origin at the
// centre of the top face of the base plate, Y up, Z towards the viewer; the section plane is z = 0.

interface HotspotDef {
  id: string;
  fr: string;
  en: string;
  minor?: boolean;
}

const HOTSPOTS: HotspotDef[] = [
  { id: 'base-plate', fr: 'Platine de base', en: 'Base plate' },
  { id: 'valve-reducer', fr: 'Réduction 26×34 → 15×21', en: 'Reducer 26×34 → 15×21' },
  { id: 'valve-nipple', fr: 'Mamelon à lumières', en: 'Ported nipple' },
  { id: 'valve-guide', fr: 'Doigt de gant', en: 'Thermowell guide' },
  { id: 'counterweight', fr: 'Poids', en: 'Weight' },
  { id: 'valve-seat', fr: 'Portée conique', en: 'Conical seat', minor: true },
  { id: 'valve-head', fr: 'Tête du clapet', en: 'Valve head', minor: true },
  { id: 'valve-stem', fr: 'Tige M6', en: 'M6 stem' },
  { id: 'valve-socket', fr: 'Manchon soudé 26×34', en: 'Welded 26×34 socket', minor: true },
  { id: 'valve-sleeve', fr: 'Manchon femelle-femelle', en: 'Female-female sleeve', minor: true },
  { id: 'stem-sleeves', fr: 'Manchons de la tige', en: 'Stem sleeves', minor: true },
  { id: 'valve-fins', fr: 'Ailettes', en: 'Fins', minor: true },
  { id: 'stroke-nut', fr: 'Écrou de course', en: 'Stroke nut', minor: true },
  { id: 'lock-nut', fr: 'Contre-écrou', en: 'Lock nut', minor: true },
];

/** Parts that hold the water: while one is hidden or only a wire frame, the water is hidden too. */
const CONTAINERS = ['base-plate', 'valve-socket', 'valve-reducer', 'valve-nipple', 'valve-seat'];

export interface ValveScene extends SceneModule<RamState> {
  model: WasteValveModel;
}

export function createValveScene(): ValveScene {
  const scene = new THREE.Scene();
  scene.name = 'valve';
  scene.background = new THREE.Color(0xefe6d3);
  scene.fog = new THREE.Fog(0xefe6d3, 2.2, 6);
  scene.userData.wantsEnv = true;

  scene.add(new THREE.HemisphereLight(0xfff4e0, 0xb6a68c, 1.1));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.4);
  key.position.set(0.6, 1.1, 0.9);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const sc = key.shadow.camera;
  sc.left = -0.45;
  sc.right = 0.45;
  sc.top = 0.45;
  sc.bottom = -0.45;
  sc.near = 0.3;
  sc.far = 3.2;
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.0012;
  key.target.position.set(0, 0.1, 0);
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xdfe9ff, 0.7);
  fill.position.set(-1.2, 0.8, 0.5);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.8);
  rim.position.set(0.2, 1.2, -1.6);
  scene.add(rim);

  const bench = buildBench();
  scene.add(bench.group, bench.floor);

  const registry = new PartRegistry();
  const cut = new CutKit();
  const model = createWasteValveModel({ cut, hardware: 'bench', floorAt: benchFloor });
  scene.add(model.root);
  for (const id of VALVE_PART_IDS) registry.add(id, model.parts[id], new THREE.Vector3(0, EXPLODE_Y[id], 0));

  const hotspots: Hotspot[] = HOTSPOTS.map((h) => ({
    partId: h.id,
    anchor: model.anchors[h.id],
    label: l(h.fr, h.en),
    minor: h.minor,
  }));

  // "Flux": dots along the water path, from under the plate through the seat and out of a port
  const flows = new FlowDots(40, { color: 0x1c7fe0, size: 0.006, throughWalls: true, opacity: 0.95 });
  const flow = flows.addPath(model.path, 26);
  scene.add(flows.object);
  cut.clip(flows.object);
  const area = Math.PI * 0.0075 * 0.0075;

  const exploded = (): boolean => {
    for (const p of registry.parts.values()) if (p.factor > 0.001 || p.display === 'wire') return true;
    for (const id of CONTAINERS) if (registry.get(id)?.display === 'hidden') return true;
    return false;
  };

  return {
    id: 'valve',
    scene,
    registry,
    hotspots,
    model,
    home: { position: new THREE.Vector3(0.4, 0.42, 0.55), target: new THREE.Vector3(0, 0.085, 0) },
    minDistance: 0.04,
    maxDistance: 3,
    // a tall, narrow device: the kit's default overview crops its top
    homePadding: 1.45,
    update(state, dt, view) {
      const frozen = exploded();
      model.update(state, dt, frozen);
      const show = view.schematic && !frozen;
      flows.object.visible = show;
      if (show) {
        flows.advance(flow, state.wasteJetFlow / 60000 / area, dt);
        flows.place();
      }
      cut.update(model.root, view.cutaway, registry);
    },
  };
}
