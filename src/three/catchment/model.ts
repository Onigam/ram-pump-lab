import * as THREE from 'three';
import { clamp, damp, group } from '@onigam/lab-kit/three';
import type { ViewOpts } from '@onigam/lab-kit/three';
import type { RamState } from '../../sim/types';
import { CATCHMENT as C, SITE, SPRING, TANK } from '../dims';
import { CutKit, rect, type Poly } from '../cut';
import { FlowDots, noShadow, waterMaterial } from '../common';
import { applyPipeKind, pipeKindOf, pipeLine, v3, type PipeKind } from './geo';
import {
  BED_FLOOR_Y,
  BED_TOP_Y,
  BED_X0,
  BED_X1,
  BOX_FLOOR_Y,
  BOX_HL,
  BOX_OHL,
  BOX_RIM_Y,
  BOX_SLAB_BOTTOM,
  BOX_T,
  FEED_X0,
  H_FULL,
  H_LID,
  H_SHELL,
  OUT_X,
  OUT_Y,
  R,
  R_OUT,
  SLAB_BOTTOM,
  SLAB_R,
  SLAB_TOP,
  SHELF_Y,
  feedY,
  groundY,
} from './layout';
import { Splash } from './splash';
import {
  PLATE_Y,
  SCREEN_X0,
  buildDrain,
  buildDriveStub,
  buildGateValve,
  buildIntakeScreen,
  buildOverflow,
  buildTankLid,
  buildTankShell,
  type Detail,
} from './tank';
import { ZONE_COLOURS, bedZones, buildFeedPipe, buildGravelBed, buildOutcrop, buildSpringBox } from './spring';

// The catchment as one model: the nine parts of the `catchment` world with their water, flows and section caps. It is built twice:
// registered part by part in the catchment world (`detail: 'full'`), and as two plain groups (spring side, tank side) in the site,
// where `spring` and `buffer-tank` are single parts (`detail: 'site'`). The simulation state is the only input of `update`.

export const CATCHMENT_PART_IDS = [
  'spring-box',
  'gravel-filter',
  'feed-pipe',
  'tank-shell',
  'tank-lid',
  'overflow-pipe',
  'intake-screen',
  'drive-gate-valve',
  'tank-drain',
] as const;
export type CatchmentPartId = (typeof CATCHMENT_PART_IDS)[number];

export interface ModelOptions {
  detail: Detail;
  /** Height of the ground at a TANK-frame position (the gutter is laid on it). Default: the profile of the diorama. */
  ground?: (x: number, z: number) => number;
  /** X (TANK frame) where the gutter and the drive pipe stub end. */
  xEnd?: number;
  /** The stub of the drive pipe is decoration of the catchment world (the site has the real drive pipe). */
  driveStub?: boolean;
  /** Section tool: clipping and caps. */
  section?: boolean;
}

/** What the last update decided (the tests read it, and so can the lead). */
export interface ModelStatus {
  /** Height of the water surface above the floor, m (0 when empty). */
  waterY: number;
  level: number;
  /** The tank is at the overflow level. */
  full: boolean;
  /** Water running out of the overflow, L/min: only when the tank is full and the spring gives more than the ram and the drain take. */
  overflow: number;
  /** Water running out of the open drain, L/min. */
  drain: number;
  gateOpen: boolean;
  drainOpen: boolean;
  /** The basket of the intake screen is out of the water (empty tank, or a level under the basket). */
  screenDry: boolean;
  /** The anti-vortex plate is out of the water (air can be drawn in). */
  plateDry: boolean;
}

/**
 * What is missing from the picture, so what must not be drawn: the water of a hidden container, and every flow as soon as
 * a part is exploded, hidden or shown as a wire (the guide). The site passes the same value for the three.
 */
export interface Hold {
  /** The shell of the tank is exploded or hidden: no water in it. */
  tank: boolean;
  /** The spring box is exploded or hidden: no water in it. */
  box: boolean;
  /** Nothing flows: a stream, a drop, a dot or a wet film would hang in the air. */
  flows: boolean;
}

export const NO_HOLD: Hold = { tank: false, box: false, flows: false };

export interface CatchmentModel {
  /** Spring side: origin at the centre of the spring box (the frame is shifted `SPRING_X` from the tank in the world). */
  springFrame: THREE.Group;
  /** Tank side: origin on the axis of the tank at the level of its inner floor. */
  tankFrame: THREE.Group;
  /** The nine parts, each a group in one of the two frames. */
  parts: Record<CatchmentPartId, THREE.Group>;
  /** Rock outcrop and scarp rocks (SPRING frame), decoration of the catchment world, part of `spring` in the site. */
  rocks: THREE.Group;
  /** Hotspot anchors of the nine parts. */
  anchors: Record<CatchmentPartId, THREE.Object3D>;
  cut: CutKit | null;
  status: ModelStatus;
  /** Centre lines of the water paths (feed pipe in the SPRING frame; overflow, drain and gutter in the TANK frame). */
  paths: {
    feed: THREE.Vector3[];
    overflow: THREE.Vector3[];
    drain: THREE.Vector3[];
    gutter(): THREE.Vector3[];
  };
  /** The overflow's gutter (TANK frame): lay it again on a new ground. */
  layGutter(ground: (x: number, z: number) => number, xEnd: number): void;
  /**
   * Animate from the state. `hold`: what is exploded or hidden (see `Hold`). `registry` is only
   * needed to hide section caps of parts that are shown as ghosts. `cutRoot`: the object whose z = 0 is the section plane.
   */
  update(s: RamState, dt: number, view: ViewOpts, hold: Hold, cutRoot?: THREE.Object3D): void;
  /** Section caps update (they follow the display of their part). */
  setRegistry(reg: import('@onigam/lab-kit/three').PartRegistry | null): void;
  /** Meshes to clip (the ground of the diorama joins the section through this). */
  clip(obj: THREE.Object3D): void;
}

const unit = (): THREE.CylinderGeometry => new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);

/** A rectangle of `bar` with gaps (holes of a wall) cut out of it along one axis; returns the rectangles left. */
function barWithHoles(
  axis: 'y' | 'x',
  a0: number,
  a1: number,
  b0: number,
  b1: number,
  holes: [number, number][],
): Poly[] {
  const sorted = [...holes].sort((p, q) => p[0] - q[0]);
  const out: Poly[] = [];
  let from = b0;
  for (const [c, r] of sorted) {
    if (c - r > from) out.push(axis === 'y' ? rect(a0, from, a1, c - r) : rect(from, a0, c - r, a1));
    from = Math.max(from, c + r);
  }
  if (b1 > from) out.push(axis === 'y' ? rect(a0, from, a1, b1) : rect(from, a0, b1, a1));
  return out;
}

export function createCatchmentModel(opts: ModelOptions): CatchmentModel {
  const { detail } = opts;
  const full = detail === 'full';
  const xEnd = opts.xEnd ?? 5.2;
  const springFrame = group('catchment-spring-side');
  const tankFrame = group('catchment-tank-side');

  // ---- the parts
  const box = buildSpringBox(detail);
  const bed = buildGravelBed(detail);
  const feed = buildFeedPipe(detail);
  const shell = buildTankShell(detail);
  const lid = buildTankLid(detail);
  const over = buildOverflow(detail);
  const screen = buildIntakeScreen(detail);
  const gate = buildGateValve(detail);
  const drain = buildDrain(detail);
  const outcrop = buildOutcrop(detail);
  springFrame.add(box.group, bed.group, feed.group, outcrop.group);
  tankFrame.add(shell.group, lid.group, over.group, screen.group, gate.group, drain.group);
  const stub = opts.driveStub ? buildDriveStub(xEnd) : null;
  if (stub) tankFrame.add(stub.group);
  over.layGutter(opts.ground ?? groundY, xEnd);

  const parts: Record<CatchmentPartId, THREE.Group> = {
    'spring-box': box.group,
    'gravel-filter': bed.group,
    'feed-pipe': feed.group,
    'tank-shell': shell.group,
    'tank-lid': lid.group,
    'overflow-pipe': over.group,
    'intake-screen': screen.group,
    'drive-gate-valve': gate.group,
    'tank-drain': drain.group,
  };
  const anchors = {
    'spring-box': box.anchor,
    'gravel-filter': bed.anchor,
    'feed-pipe': feed.anchor,
    'tank-shell': shellAnchor(shell.group),
    'tank-lid': lid.anchor,
    'overflow-pipe': over.anchor,
    'intake-screen': screen.anchor,
    'drive-gate-valve': gate.anchor,
    'tank-drain': drain.anchor,
  } as Record<CatchmentPartId, THREE.Object3D>;

  // ---- water: the tank, the box, the streams (never part of a part: x-ray and isolate leave it alone)
  const waterT = group('catchment-water-tank');
  const waterS = group('catchment-water-spring');
  const jetsT = group('catchment-jets-tank');
  const jetsS = group('catchment-jets-spring');
  tankFrame.add(waterT, jetsT);
  springFrame.add(waterS, jetsS);
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(R - 0.012, R - 0.012, 1, full ? 56 : 36),
    waterMaterial(0.5, 0x3b8ccb),
  );
  body.renderOrder = 1;
  const surface = new THREE.Mesh(new THREE.CircleGeometry(R - 0.012, full ? 56 : 36), waterMaterial(0.55, 0x8cc9f0));
  surface.rotation.x = -Math.PI / 2;
  surface.renderOrder = 1;
  waterT.add(body, surface);
  const boxBody = new THREE.Mesh(
    new THREE.BoxGeometry(2 * BOX_HL - 0.004, 1, 2 * (SPRING.basinWidth / 2) - 0.004),
    waterMaterial(0.5, 0x4a9bd0),
  );
  boxBody.renderOrder = 1;
  const boxSurface = new THREE.Mesh(
    new THREE.PlaneGeometry(2 * BOX_HL - 0.004, SPRING.basinWidth - 0.004),
    waterMaterial(0.6, 0x8cc9f0),
  );
  boxSurface.rotation.x = -Math.PI / 2;
  boxSurface.renderOrder = 1;
  waterS.add(boxBody, boxSurface);
  const streamMat = () => waterMaterial(0.75, 0x9bd0f0);
  const fallIn = new THREE.Mesh(unit(), streamMat());
  const trickle = new THREE.Mesh(unit(), streamMat());
  const overJet = new THREE.Mesh(unit(), streamMat());
  const drainJet = new THREE.Mesh(unit(), streamMat());
  fallIn.name = 'jet-feed';
  trickle.name = 'jet-trickle';
  overJet.name = 'jet-overflow';
  drainJet.name = 'jet-drain';
  jetsT.add(fallIn, overJet, drainJet);
  jetsS.add(trickle);
  // the water in the gutter: a ribbon on its floor, laid with the gutter
  const ribbonGeo = new THREE.BufferGeometry();
  const ribbon = new THREE.Mesh(ribbonGeo, waterMaterial(0.0, 0x5aa9da));
  ribbon.renderOrder = 2;
  ribbon.name = 'gutter-water';
  jetsT.add(ribbon);
  const layRibbon = () => {
    const line = over.gutterPath();
    const n = line.length;
    const pos = new Float32Array(n * 2 * 3);
    const idx: number[] = [];
    const hw = (C.gutterWidth - 2 * C.gutterWall) / 2 - 0.01;
    for (let i = 0; i < n; i++) {
      const p = line[i];
      pos.set([p.x, p.y - 0.006, p.z - hw, p.x, p.y - 0.006, p.z + hw], i * 6);
      if (i < n - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    ribbonGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    ribbonGeo.setIndex(idx);
    ribbonGeo.computeVertexNormals();
    ribbonGeo.computeBoundingSphere();
  };
  layRibbon();
  noShadow(waterT);
  noShadow(waterS);
  noShadow(jetsT);
  noShadow(jetsS);

  // ---- splashes: the feed pipe into the tank, the overflow and the drain into the ditch, the trickle onto the gravel
  const gutterFloor = () => over.gutterPath()[1]?.y ?? 0;
  const splashIn = new Splash({
    emitter: v3(-C.feedInlet, 0, 0),
    radius: 0.02,
    spread: 0.3,
    up: 0.8,
    floorY: () => body.position.y + body.scale.y / 2 - 0.002,
    max: 90,
  });
  const splashOver = new Splash({
    emitter: over.mouth.clone().setY(gutterFloor() + 0.05),
    radius: 0.03,
    spread: 0.45,
    up: 1.1,
    floorY: () => gutterFloor() + 0.02,
    max: 100,
  });
  const splashDrain = new Splash({
    emitter: drain.mouth.clone().setY(gutterFloor() + 0.04),
    radius: 0.02,
    spread: 0.3,
    up: 0.7,
    floorY: () => gutterFloor() + 0.02,
    max: 70,
  });
  const splashSeep = new Splash({
    emitter: bed.drop.clone(),
    radius: 0.02,
    spread: 0.18,
    up: 0.5,
    floorY: () => BED_TOP_Y - 0.01,
    max: 70,
  });
  jetsT.add(splashIn.object, splashOver.object, splashDrain.object);
  jetsS.add(splashSeep.object);

  // ---- flow dots ("Flux"): dots of constant screen size along the water paths
  const mk = (n: number) =>
    new FlowDots(n, { color: 0x2f8cff, size: 5, pixels: true, throughWalls: true, opacity: 0.95 });
  const fSeep = mk(70);
  const fInlet = mk(40);
  const fDrive = mk(110);
  const fOver = mk(40);
  const fGutter = mk(40);
  const fDrain = mk(40);
  fSeep.object.name = 'flow-seep';
  fInlet.object.name = 'flow-inlet';
  fDrive.object.name = 'flow-drive';
  fOver.object.name = 'flow-overflow';
  fGutter.object.name = 'flow-gutter';
  fDrain.object.name = 'flow-drain';
  springFrame.add(fSeep.object);
  tankFrame.add(fInlet.object, fDrive.object, fOver.object, fGutter.object, fDrain.object);
  // seep: fissure, down onto the bed, through its three zones, through a port into the box, to the strainer, along the feed pipe
  const zones = bedZones();
  const midY = (BED_FLOOR_Y + BED_TOP_Y) / 2 + 0.05;
  const seepPath = [
    bed.drop.clone().setY(SHELF_Y + C.seepHeight),
    bed.drop.clone().setY(BED_TOP_Y - 0.05),
    v3((zones[0][0] + zones[0][1]) / 2, midY - 0.1, 0.05),
    v3((zones[1][0] + zones[1][1]) / 2, midY - 0.15, 0.02),
    v3((zones[2][0] + zones[2][1]) / 2, BED_FLOOR_Y + C.boxPortHeight + 0.02, 0),
    v3(-BOX_OHL + 0.01, BOX_FLOOR_Y + C.boxPortHeight, 0),
    v3(-BOX_HL + 0.12, BOX_FLOOR_Y + C.boxPortHeight + 0.06, 0),
    v3(FEED_X0, feedY(FEED_X0), 0),
    ...feed.path.slice(1),
  ];
  fSeep.addPath(pipeLine(seepPath, 0.06, 0.1), 64);
  const pInlet = fInlet.addPath([v3(-C.feedInlet, 1, 0), v3(0, 0.4, 0), v3(SCREEN_X0, OUT_Y, 0)], 30);
  // the drive water: from the basket through the stub, the wall, the valve and down the slope (the speed is the pulsing velocity of the drive pipe)
  const drivePts = [
    v3(SCREEN_X0 + 0.02, OUT_Y, 0),
    v3(R, OUT_Y, 0),
    v3(OUT_X, OUT_Y, 0),
    ...(stub ? stub.path.slice(1) : [v3(OUT_X + 0.3, OUT_Y, 0)]),
  ];
  fDrive.addPath(drivePts, stub ? 90 : 20);
  fOver.addPath(over.path, 30);
  const gutterLine = () => over.gutterPath();
  const pGutter = fGutter.addPath([v3(0, 0, 0), v3(1, 0, 0)], 30);
  fDrain.addPath(drain.path, 30);
  const setGutterDots = () =>
    fGutter.setPath(pGutter, gutterLine().length > 1 ? gutterLine() : [v3(0, 0, 0), v3(1, 0, 0)]);
  setGutterDots();

  // ---- section: clipping of every part (except what must stay whole), caps on the plane z = 0
  const cut = opts.section ? new CutKit() : null;
  const waterCaps: { mesh: THREE.Mesh; parent: 'tank' | 'box' }[] = [];
  const clipMesh = (m: THREE.Object3D) => {
    if (!cut) return;
    m.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && !o.userData.noClip) cut.clip(o);
    });
  };
  if (cut) {
    for (const id of CATCHMENT_PART_IDS) if (id !== 'drive-gate-valve') clipMesh(parts[id]);
    for (const o of [body, surface, boxBody, boxSurface, fallIn, trickle, overJet, drainJet, ribbon]) clipMesh(o);
    clipMesh(outcrop.group);
    addCaps();
  }
  function addCaps(): void {
    if (!cut) return;
    const wall = TANK.wall;
    const hr = SITE.driveOuterDiameter / 2 + 0.003;
    // tank shell: wall (holes for the outlet and the drain), floor, slab
    cut.cap('tank-shell', shell.group, [
      rect(-R_OUT, 0, -R, H_SHELL),
      ...barWithHoles('y', R, R_OUT, 0, H_SHELL, [
        [C.drainAxisHeight, C.drainDiameter / 2 + 0.005],
        [OUT_Y, hr],
      ]),
      rect(-R_OUT, -wall, R_OUT, 0),
      rect(-SLAB_R, SLAB_BOTTOM, SLAB_R, SLAB_TOP),
    ]);
    // lid with the hole of the feed pipe
    const lidR = R_OUT + TANK.lidOverhang;
    cut.cap(
      'tank-lid',
      lid.group,
      barWithHoles('x', H_SHELL, H_LID, -lidR, lidR, [[-C.feedInlet, SPRING.feedPipeDiameter / 2 + 0.003]]),
    );
    // spring box: floor slab, west wall (a port at z = 0), east wall (the outlet), silt
    cut.cap('spring-box', box.group, [
      rect(-BOX_OHL, BOX_SLAB_BOTTOM, BOX_OHL, BOX_FLOOR_Y),
      ...barWithHoles('y', -BOX_OHL, -BOX_HL, BOX_FLOOR_Y, BOX_RIM_Y, [
        [BOX_FLOOR_Y + C.boxPortHeight, C.boxPortDiameter / 2],
      ]),
      ...barWithHoles('y', BOX_HL, BOX_HL + BOX_T, BOX_FLOOR_Y, BOX_RIM_Y, [
        [BOX_FLOOR_Y + C.boxOutletHeight, SPRING.feedPipeDiameter / 2 + 0.001],
      ]),
    ]);
    const silt = cut.cap('spring-box', box.group, [rect(-BOX_HL, BOX_FLOOR_Y, BOX_HL, BOX_FLOOR_Y + C.boxSediment)]);
    silt.material = new THREE.MeshStandardMaterial({ color: 0x6b5a40, roughness: 1, side: THREE.DoubleSide });
    // gravel bed: the three zones in their own colours, the slab, the stone end against the rock
    const zoneColours = ZONE_COLOURS;
    zones.forEach(([x0, x1], i) => {
      const c = cut.cap('gravel-filter', bed.group, [rect(x0, BED_FLOOR_Y, x1, BED_TOP_Y - 0.035)]);
      c.material = new THREE.MeshStandardMaterial({ color: zoneColours[i], roughness: 1, side: THREE.DoubleSide });
    });
    cut.cap('gravel-filter', bed.group, [rect(BED_X0, BED_FLOOR_Y - 0.1, BED_X1, BED_FLOOR_Y)]);
    const endStones = cut.cap('gravel-filter', bed.group, [
      rect(BED_X0 - C.filterKerb, BED_FLOOR_Y, BED_X0, SHELF_Y + 0.1),
    ]);
    endStones.material = new THREE.MeshStandardMaterial({ color: 0x7c776d, roughness: 1, side: THREE.DoubleSide });
    // the water seen in the section (not a part: shown with the section whatever the display of the parts)
    const capMat = () => waterMaterial(0.5, 0x3b8ccb);
    const wt = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), capMat());
    wt.visible = false;
    wt.renderOrder = 1;
    const wb = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), capMat());
    wb.visible = false;
    wb.renderOrder = 1;
    waterT.add(wt);
    waterS.add(wb);
    noShadow(wt);
    noShadow(wb);
    waterCaps.push({ mesh: wt, parent: 'tank' }, { mesh: wb, parent: 'box' });
  }

  // ---- animation state
  let gateT = 1;
  let pipeKind: PipeKind = 'steel';
  let leverT = 0;
  let lastLevel = -1;
  const status: ModelStatus = {
    waterY: H_FULL,
    level: 1,
    full: true,
    overflow: 0,
    drain: 0,
    gateOpen: true,
    drainOpen: false,
    screenDry: false,
    plateDry: false,
  };
  let reg: import('@onigam/lab-kit/three').PartRegistry | null = null;
  const finite = (v: number | undefined, d = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);

  const placeStream = (
    m: THREE.Mesh,
    x: number,
    yTop: number,
    yBottom: number,
    z: number,
    radius: number,
    on: boolean,
  ) => {
    const len = Math.max(0, yTop - yBottom);
    m.visible = on && len > 0.003 && radius > 0.0005;
    m.position.set(x, (yTop + yBottom) / 2, z);
    m.scale.set(radius, Math.max(len, 1e-4), radius);
  };

  function update(s: RamState, dt: number, view: ViewOpts, hold: Hold, cutRoot?: THREE.Object3D): void {
    const level = clamp(finite(s.tankLevel, 0), 0, 1);
    const src = Math.max(0, finite(s.sourceFlow, 0));
    const drive = Math.max(0, finite(s.driveFlow, 0));
    const drainOpen = s.tankDrainOpen === true;
    const drainQ = drainOpen && level > 0.001 ? Math.max(0, finite(s.tankDrainFlow, 0)) : 0;
    const isFull = level >= 0.995;
    const overQ = isFull ? Math.max(0, src - drive - drainQ) : 0;
    const gateOpen = s.gateOpen !== false;
    const waterY = level * H_FULL;
    status.level = level;
    status.waterY = waterY;
    status.full = isFull;
    status.overflow = overQ;
    status.drain = drainQ;
    status.gateOpen = gateOpen;
    status.drainOpen = drainOpen;
    status.screenDry = waterY < OUT_Y + C.screenDiameter / 2;
    status.plateDry = waterY < PLATE_Y + 0.004;

    // the drive pipe is steel, PVC or polyethylene as the wave speed of the state says
    if (stub) {
      const kind = pipeKindOf(finite(s.waveSpeed, 0));
      if (kind !== pipeKind) {
        pipeKind = kind;
        applyPipeKind(stub.material, kind);
      }
    }

    // the gate valve and the drain lever turn by hand: smooth, whatever the visual slow motion
    gateT = damp(gateT, gateOpen ? 1 : 0, 4, dt);
    leverT = damp(leverT, drainOpen ? 1 : 0, 6, dt);
    gate.rising.position.y = OUT_Y + C.gateBonnetHeight + 0.014 - (1 - gateT) * (C.gateStemRise - 0.004);
    gate.wheel.rotation.y = -gateT * Math.PI * 2 * 5;
    drain.lever.rotation.y = (1 - leverT) * (Math.PI / 2);

    // water of the tank and of the box
    const wet = !hold.flows;
    waterT.visible = !hold.tank;
    waterS.visible = !hold.box;
    jetsT.visible = wet;
    jetsS.visible = wet;
    const showTank = level > 0.002;
    body.visible = showTank;
    surface.visible = showTank;
    body.scale.y = Math.max(waterY, 1e-4);
    body.position.y = waterY / 2;
    surface.position.y = waterY;
    const boxY = C.boxWaterLevel - 0.012 * (1 - clamp(src / SITE.sourceFlowLpm, 0, 1));
    boxBody.scale.y = boxY - C.boxSediment;
    boxBody.position.y = BOX_FLOOR_Y + C.boxSediment + (boxY - C.boxSediment) / 2;
    boxSurface.position.y = BOX_FLOOR_Y + boxY;

    // the pipe pours into the tank above the water, and the spring trickles onto the gravel
    const fall = Math.sqrt(clamp(src / SITE.sourceFlowLpm, 0, 3));
    const fallBottom = showTank ? waterY : C.sludgeDepth;
    placeStream(fallIn, -C.feedInlet, C.feedEnd, fallBottom, 0, 0.011 * fall, src > 0.05);
    splashIn.setEmitter(-C.feedInlet, fallBottom, 0);
    splashIn.update(dt, wet && src > 0.05 ? 18 * fall : 0, wet && src > 0.05);
    const dropTop = SHELF_Y + C.seepHeight;
    placeStream(trickle, bed.drop.x, dropTop, BED_TOP_Y, bed.drop.z, 0.008 * fall, src > 0.05);
    splashSeep.update(dt, wet && src > 0.05 ? 10 * fall : 0, wet && src > 0.05);
    (bed.wet.material as THREE.MeshStandardMaterial).opacity = wet ? 0.4 * clamp(src / SITE.sourceFlowLpm, 0, 1) : 0;

    // overflow and drain pour into the head of the ditch
    const gFloor = gutterFloor();
    const overR = 0.014 * Math.sqrt(clamp(overQ / SITE.sourceFlowLpm, 0, 3));
    placeStream(
      overJet,
      over.mouth.x,
      over.mouth.y - C.overflowDiameter / 2,
      gFloor + 0.02,
      over.mouth.z,
      overR,
      overQ > 0.05,
    );
    splashOver.update(dt, wet && overQ > 0.05 ? 16 * Math.sqrt(overQ) : 0, wet && overQ > 0.05);
    const drainR = 0.008 + 0.012 * clamp(drainQ / 150, 0, 1); // the drain gives 150 L/min (sim: TANK_DRAIN_FLOW)
    // the drain leaves its pipe level, a tongue of water running along the head of the ditch (it hardly falls: the pipe lies on the bench)
    const tongue = 0.12 + 0.3 * clamp(drainQ / 150, 0, 1);
    drainJet.visible = drainQ > 0.05;
    drainJet.rotation.z = Math.PI / 2;
    drainJet.position.set(drain.mouth.x + tongue / 2 - 0.05, drain.mouth.y - 0.004, drain.mouth.z);
    drainJet.scale.set(drainR, tongue, drainR);
    splashDrain.update(dt, wet && drainQ > 0.05 ? 12 : 0, wet && drainQ > 0.05);
    (ribbon.material as THREE.MeshStandardMaterial).opacity = wet ? 0.7 * clamp((overQ + drainQ) / 3, 0, 1) : 0;
    ribbon.visible = overQ + drainQ > 0.05;

    // "Flux": the dots follow the flows of the state
    const show = view.schematic && wet;
    fSeep.object.visible = show && src > 0.05;
    fInlet.object.visible = show && src > 0.05 && level > 0.08;
    fDrive.object.visible = show;
    fOver.object.visible = show && overQ > 0.05;
    fGutter.object.visible = show && overQ + drainQ > 0.05;
    fDrain.object.visible = show && drainQ > 0.05;
    if (show) {
      if (Math.abs(level - lastLevel) > 0.02) {
        lastLevel = level;
        fInlet.setPath(pInlet, [
          v3(-C.feedInlet, Math.max(0.3, waterY - 0.05), 0),
          v3(-0.2, Math.max(0.3, waterY * 0.3), 0),
          v3(0, 0.3, 0),
          v3(SCREEN_X0, OUT_Y, 0),
        ]);
      }
      fSeep.advance(0, 0.12 + 0.016 * src, dt);
      fSeep.place();
      fInlet.advance(0, 0.05 + 0.012 * drive, dt);
      fInlet.place();
      // a closed gate valve or a waste valve held shut stops the column: nothing flows in the drive pipe
      fDrive.advance(0, gateOpen && s.valveHeldShut !== true ? finite(s.driveVelocity, 0) : 0, dt);
      fDrive.place();
      fOver.advance(0, 0.2 + 0.25 * Math.sqrt(overQ), dt);
      fOver.place();
      fGutter.advance(0, 0.4 + 0.25 * Math.sqrt(overQ + drainQ), dt);
      fGutter.place();
      fDrain.advance(0, 0.3 + 0.12 * Math.sqrt(drainQ), dt);
      fDrain.place();
    }

    // section: the clipping plane follows the root, the caps follow their parts; the water caps follow the water
    if (cut && cutRoot) {
      cut.update(cutRoot, view.cutaway, reg);
      const on = view.cutaway;
      for (const c of waterCaps) {
        if (c.parent === 'tank') {
          c.mesh.visible = on && showTank && !hold.tank;
          c.mesh.scale.set(2 * (R - 0.012), Math.max(waterY, 1e-4), 1);
          c.mesh.position.set(0, waterY / 2, 0);
        } else {
          c.mesh.visible = on && !hold.box;
          c.mesh.scale.set(2 * BOX_HL - 0.004, boxY - C.boxSediment, 1);
          c.mesh.position.set(0, BOX_FLOOR_Y + C.boxSediment + (boxY - C.boxSediment) / 2, 0);
        }
      }
    }
  }

  return {
    springFrame,
    tankFrame,
    parts,
    rocks: outcrop.group,
    anchors,
    cut,
    status,
    paths: { feed: feed.path, overflow: over.path, drain: drain.path, gutter: () => over.gutterPath() },
    layGutter(ground, end) {
      over.layGutter(ground, end);
      layRibbon();
      setGutterDots();
    },
    update,
    setRegistry(r) {
      reg = r;
    },
    clip: clipMesh,
  };
}

/** The hotspot anchor of the shell: above the water, at the middle of the tank. */
function shellAnchor(g: THREE.Group): THREE.Object3D {
  const a = new THREE.Object3D();
  a.name = 'anchor-tank-shell';
  a.position.set(-R_OUT * 0.75, 1.95, R_OUT * 0.55);
  g.add(a);
  return a;
}
