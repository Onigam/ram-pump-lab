import * as THREE from 'three';
import { l } from '@onigam/lab-kit/i18n';
import { PartRegistry, clamp } from '@onigam/lab-kit/three';
import type { Hotspot, SceneModule, ViewOpts } from '@onigam/lab-kit/three';
import type { RamState } from '../../sim/types';
import { paperFloor } from '../common';
import { aimOnDraw, type CameraPose } from '../shadow-fit';
import { installWarmup, type Warmable } from '../warm';
import { partIds } from '../../part-ids';
import { BASE_Y, BLOCK, PLINTH_H, buildBlock, type Block } from './ground';
import { SPRING_X } from './layout';
import { createCatchmentModel, type CatchmentModel, type CatchmentPartId, type Hold, type ModelStatus } from './model';
import { buildVegetation } from './vegetation';

// The "catchment" world: the spring box, the gravel bed, the feed pipe, the buffer tank and the start of the drive pipe, as a
// cut-out block of the hillside on a plinth (the look of the Coanda intake of Pelton Lab and of the ram world: paper floor,
// soft light). The water follows the simulation state; the section cuts the block, the box, the bed and the tank along z = 0.

interface HotspotDef {
  id: CatchmentPartId;
  fr: string;
  en: string;
  minor?: boolean;
  goto?: string;
}

const HOTSPOTS: HotspotDef[] = [
  { id: 'spring-box', fr: 'Regard de captage', en: 'Spring box' },
  { id: 'gravel-filter', fr: 'Filtre à gravier', en: 'Gravel filter' },
  { id: 'feed-pipe', fr: 'Conduite d’alimentation', en: 'Feed pipe', minor: true },
  { id: 'tank-shell', fr: 'Cuve de la réserve tampon', en: 'Buffer tank shell' },
  { id: 'tank-lid', fr: 'Couvercle et aération', en: 'Lid and vent', minor: true },
  { id: 'overflow-pipe', fr: 'Trop-plein', en: 'Overflow' },
  { id: 'intake-screen', fr: 'Crépine de départ', en: 'Intake screen' },
  { id: 'drive-gate-valve', fr: 'Vanne de départ', en: 'Drive-pipe gate valve', goto: 'site', minor: true },
  { id: 'tank-drain', fr: 'Vidange de la réserve', en: 'Tank drain', minor: true },
];

/**
 * Explode offsets (metres): the parts lift straight up by different heights, so that nothing crosses another part: the lid
 * first, the box and its cover, the gravel bed, the gutter with the overflow, the gate valve, the drain; the intake screen
 * goes up inside the tank (a little inwards, away from the wall fitting); the shell stays on its slab.
 */
export const EXPLODE: Record<CatchmentPartId, [number, number, number]> = {
  'spring-box': [0, 1.6, 0],
  'gravel-filter': [0, 0.8, 0],
  'feed-pipe': [0, 0.5, 0],
  'tank-shell': [0, 0, 0],
  'tank-lid': [0, 2.6, 0],
  'overflow-pipe': [0, 1.2, 0],
  'intake-screen': [-0.4, 1.3, 0],
  'drive-gate-valve': [0, 1.0, 0],
  'tank-drain': [0, 0.7, 0],
};

/** Height of the plane of the work the sun's box is aimed at (the middle of the tank, the box, the bed), metres. */
const WORK_Y = 1;

/**
 * The sun's box: centred where the view axis meets the plane of the work, or the plane 0.5 m under a camera that is lower than
 * that (a close view of the gate valve, of the drain), with a half size of 0.85 times that distance, from 2.2 m to 10.6 m (the
 * limits the box had when its size went by steps of 30 %). A view that never meets the plane gets the largest box. Every case
 * joins the next without a step: the box is a continuous function of the camera.
 */
export const CATCHMENT_SHADOW = { near: 0.5, far: 10.6 / 0.85, halfPerMetre: 0.85, halfMin: 2.2, halfMax: 10.6 };

export function catchmentShadowDistance(pos: THREE.Vector3, dir: THREE.Vector3): number {
  const plane = Math.min(WORK_Y, pos.y - 0.5);
  if (dir.y > -1e-6) return CATCHMENT_SHADOW.far;
  return clamp((pos.y - plane) / -dir.y, CATCHMENT_SHADOW.near, CATCHMENT_SHADOW.far);
}

export interface CatchmentScene extends SceneModule<RamState>, Warmable {
  readonly model: CatchmentModel;
  readonly block: Block;
  /** What the last `update` decided (water level, overflow, drain, gate, screen dry). */
  readonly status: ModelStatus;
}

export function createCatchmentScene(): CatchmentScene {
  const scene = new THREE.Scene();
  scene.name = 'catchment';
  scene.background = new THREE.Color(0xefe6d3);
  scene.fog = new THREE.Fog(0xefe6d3, 26, 52);
  // the lead fills scene.environment from the shared PMREM RoomEnvironment (metal and water reflections)
  scene.userData.wantsEnv = true;
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0xb6a68c, 0.85));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.3);
  const lightDir = new THREE.Vector3(0.5, 0.72, 0.62).normalize();
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 70;
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.015;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xdfe9ff, 0.7);
  fill.position.set(-8, 6, 6);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.8);
  rim.position.set(2, 8, -10);
  scene.add(rim);
  scene.add(paperFloor(36, 8, BASE_Y - PLINTH_H - 0.001));

  const root = new THREE.Group();
  root.name = 'catchment-root';
  scene.add(root);
  const block = buildBlock();
  const model = createCatchmentModel({ detail: 'full', driveStub: true, section: true, xEnd: BLOCK.x1 });
  model.springFrame.position.x = SPRING_X;
  const vegetation = buildVegetation();
  root.add(block.group, model.springFrame, model.tankFrame, vegetation);
  for (const m of block.clipped) model.clip(m);
  // the grass and the trees go with the ground they stand on: the section removes those of the front half with it
  model.clip(vegetation);

  // ---- parts, explode offsets, hotspots
  const registry = new PartRegistry();
  model.setRegistry(registry);
  for (const id of partIds('catchment') as CatchmentPartId[]) {
    registry.add(id, model.parts[id], new THREE.Vector3(...EXPLODE[id]));
  }
  const hotspots: Hotspot[] = HOTSPOTS.map((h) => ({
    partId: h.id,
    anchor: model.anchors[h.id],
    label: l(h.fr, h.en),
    minor: h.minor,
    goto: h.goto,
  }));

  // ---- the sun's shadow box follows what the camera of each draw looks at (a tight box on the valve, the whole block from
  // afar), continuously (see CATCHMENT_SHADOW)
  const pose: CameraPose = {
    position: new THREE.Vector3(8.2, 5.0, 12.6),
    direction: new THREE.Vector3(-10.1, -4, -12.6).normalize(),
    right: new THREE.Vector3(1, 0, 0),
    up: new THREE.Vector3(0, 1, 0),
  };
  const focus = new THREE.Vector3();
  const right = new THREE.Vector3();
  const upv = new THREE.Vector3();
  const snapped = new THREE.Vector3();
  const worldUp = new THREE.Vector3(0, 1, 0);
  let half = 0;
  const aimShadow = () => {
    const t = catchmentShadowDistance(pose.position, pose.direction);
    focus.copy(pose.position).addScaledVector(pose.direction, t);
    const h = clamp(t * CATCHMENT_SHADOW.halfPerMetre, CATCHMENT_SHADOW.halfMin, CATCHMENT_SHADOW.halfMax);
    if (h !== half) {
      half = h;
      const c = key.shadow.camera;
      c.left = c.bottom = -half;
      c.right = c.top = half;
      c.updateProjectionMatrix();
    }
    // the focus snapped to the texels of the map, so that a pan or an orbit at a constant size does not shimmer
    right.crossVectors(worldUp, lightDir).normalize();
    upv.crossVectors(lightDir, right).normalize();
    const texel = (2 * half) / 2048;
    const a = Math.round(focus.dot(right) / texel) * texel;
    const b = Math.round(focus.dot(upv) / texel) * texel;
    const c = focus.dot(lightDir);
    snapped.set(0, 0, 0).addScaledVector(right, a).addScaledVector(upv, b).addScaledVector(lightDir, c);
    key.target.position.copy(snapped);
    key.position.copy(snapped).addScaledVector(lightDir, 30);
    key.updateMatrixWorld();
    key.target.updateMatrixWorld();
  };
  aimShadow();
  aimOnDraw(scene, pose, aimShadow);

  /** What is missing from the picture: parts exploded, hidden (isolate) or shown as wires (guide) leave no water to show. */
  const hold: Hold = { tank: false, box: false, flows: false };
  const away = (id: CatchmentPartId): boolean => {
    const p = registry.get(id);
    return !!p && (p.factor > 0.001 || p.display === 'wire' || p.display === 'hidden');
  };
  const holdNow = (): Hold => {
    hold.tank = away('tank-shell');
    hold.box = away('spring-box');
    hold.flows = false;
    for (const p of registry.parts.values()) {
      if (p.factor > 0.001 || p.display === 'wire' || p.display === 'hidden') hold.flows = true;
    }
    return hold;
  };

  const update = (s: RamState, dt: number, view: ViewOpts) => {
    model.update(s, dt, view, holdNow(), root);
    for (const c of block.caps) c.visible = view.cutaway;
  };

  const mod: SceneModule<RamState> & { model: CatchmentModel; block: Block; status: ModelStatus } = {
    id: 'catchment',
    scene,
    registry,
    hotspots,
    // three-quarter view from the south-east, above the bench: the box and the bed on the left, the tank in the middle, the drive pipe leaving to the right
    home: { position: new THREE.Vector3(8.2, 5.0, 12.6), target: new THREE.Vector3(-1.9, 1.0, 0) },
    minDistance: 0.25,
    maxDistance: 40,
    model,
    block,
    get status() {
      return model.status;
    },
    update,
  };
  return installWarmup(mod, [block.top]);
}
