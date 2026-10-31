import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { l } from '@onigam/lab-kit/i18n';
import { MAT, PartRegistry, clamp, group, roundedPath } from '@onigam/lab-kit/three';
import type { Hotspot, SceneModule, ViewOpts } from '@onigam/lab-kit/three';
import type { RamState } from '../../sim/types';
import { CATCHMENT, HOUSE, SITE, TANK, TOWER } from '../dims';
import { FlowDots } from '../common';
import { applyPipeKind, pipeKindOf, type PipeKind } from '../catchment/geo';
import { BED_X0, BED_X1, BOX_HL, BOX_HW, BOX_RIM_Y, CORNER, H_LID, SPRING_X } from '../catchment/layout';
import { createCatchmentModel, type CatchmentModel, type Hold } from '../catchment/model';
import { farCopy } from '../lod';
import { mergeStatic } from '../merge';
import { installWarmup, type Warmable } from '../warm';
import { createRamModel } from '../ram/model';
import { STUB_X0 } from '../ram/inlet';
import { buildHouse, buildTower } from './buildings';
import { buildPit } from './pit';
import {
  DEFAULT_PARAMS,
  GROUND_PIT,
  PIT_EAST_FACE,
  PIT_WEST_FACE,
  PIT_X,
  driveGeometry,
  tankAxisX,
  type SiteParams,
} from './layout';
import { DELIVERY_AT_TOWER, DELIVERY_IN_PIT, deliveryPolyline, spaced } from './routes';
import { createShadowAim } from './shadow';
import { minWidthMaterial, pickAlong, swapGeometry, tubeAlong } from './pipes';
import { createSky } from './sky';
import { buildTerrain, type Terrain } from './terrain';
import { buildVegetation } from './vegetation';
import { buildWasteDrain, type WasteDrain } from './waste';

// The "site" world: the hillside of the video. X east, Y up (0 = the ram's inlet axis), Z south; the hill rises to the
// north. Everything that depends on the fall, the drive length, the delivery head and the pipe diameter is re-placed
// when they change (see layout.ts for what moves). The ram in its pit is the same model as in the "ram" world.

const HOTSPOTS: { id: string; fr: string; en: string; goto?: string; minor?: boolean }[] = [
  { id: 'spring', fr: 'Captage de la source', en: 'Spring catchment', minor: true },
  { id: 'buffer-tank', fr: 'Réserve tampon', en: 'Buffer tank', minor: true },
  { id: 'drive-pipe', fr: 'Conduite motrice', en: 'Drive pipe', minor: true },
  { id: 'ram-pit', fr: 'Fosse du bélier', en: 'Ram pit', goto: 'ram' },
  { id: 'waste-drain', fr: 'Évacuation des eaux de rejet', en: 'Waste-water drain', minor: true },
  { id: 'delivery-pipe', fr: 'Conduite de refoulement', en: 'Delivery pipe' },
  { id: 'water-tower', fr: 'Château d’eau', en: 'Water tower' },
  { id: 'house', fr: 'Maison', en: 'House' },
];

const up = (y: number) => new THREE.Vector3(0, y, 0);

export interface SiteScene extends SceneModule<RamState>, Warmable {
  /** Parameters the landscape currently has (tests read them). */
  readonly params: SiteParams;
  /** Length of the delivery pipe as drawn (start stub to the end over the trough), metres. */
  deliveryLength(): number;
  /** Height of the rendered ground at (x, z). */
  surfaceY(x: number, z: number): number;
  /** The ground of the site (the tests read its openings). */
  readonly terrain: Terrain;
  /** The catchment model of the tank and the spring (the same as the `catchment` world), and the waste-water drain. */
  readonly catchment: CatchmentModel;
  readonly waste: WasteDrain;
  /** Force the landscape to follow a state at once (tests, first frame). */
  follow(state: Pick<RamState, 'fall' | 'driveLength' | 'deliveryHead' | 'driveDiameter'>): void;
}

export function createSiteScene(): SiteScene {
  const scene = new THREE.Scene();
  scene.name = 'site';
  const registry = new PartRegistry();

  let params: SiteParams = { ...DEFAULT_PARAMS };
  let driveDiameterMm = SITE.driveBore * 1000;
  const terrain = buildTerrain(params);
  const sky = createSky(scene);
  scene.add(terrain.mesh);
  const veg = buildVegetation(terrain);
  scene.add(veg.group);

  // ---- parts. The spring and the tank are the model of the catchment world (the two frames of it), as single parts.
  const catchment = createCatchmentModel({ detail: 'site', ground: () => 0, xEnd: GUTTER_END });
  const tank = catchment.tankFrame;
  tank.name = 'buffer-tank';
  const spring = catchment.springFrame;
  spring.name = 'spring';
  // each is ONE part of the site: its nine groups become one mesh per material
  mergeStatic(tank, { name: 'tank' });
  mergeStatic(spring, { name: 'spring' });
  const pit = buildPit();
  const ram = createRamModel(null);
  // the ram is 60 000 triangles of bolts and turned bodies: beyond `RAM_FAR` metres a coarse frozen copy stands for it
  const ramFar = farCopy(ram.root, { cell: FAR_CELL, minRadius: FAR_CELL });
  const ramFarWater = farCopy(ram.rig.water!, { cell: FAR_CELL, minRadius: FAR_CELL, transparent: true });
  ramFar.add(ramFarWater);
  const ramLod = new THREE.LOD();
  ramLod.name = 'ram-lod';
  ramLod.addLevel(ram.root, 0);
  ramLod.addLevel(ramFar, RAM_FAR, 0.1);
  pit.group.add(ramLod);
  const tower = buildTower();
  const house = buildHouse();
  const waste = buildWasteDrain();
  scene.add(tank, spring, pit.group, tower.group, house, waste.group);

  // ---- drive pipe (tube, supports) and delivery pipe (tube)
  const pipeMat = minWidthMaterial(MAT.zinc(), SITE.driveOuterDiameter / 2);
  const driveMesh = new THREE.Mesh(new THREE.BufferGeometry(), pipeMat.material);
  driveMesh.castShadow = false;
  const supports = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.2, 0.28), MAT.concrete(), SUPPORTS);
  supports.castShadow = true;
  supports.receiveShadow = true;
  supports.frustumCulled = false;
  // mortar collars where the pipes go through the walls of the pit (a ring of unit radius along X, scaled to the pipe in Y and Z)
  const collarGeo = new THREE.CylinderGeometry(1, 1, 0.03, 20).rotateZ(Math.PI / 2);
  const driveCollar = new THREE.Mesh(collarGeo, MAT.concrete());
  driveCollar.name = 'drive-collar';
  const drive = group('drive-pipe');
  drive.add(driveMesh, supports, driveCollar);
  let pipeKind: PipeKind = 'steel';

  const delMat = minWidthMaterial(MAT.pvcBlue(), SITE.deliveryOuterDiameter / 2);
  const deliveryMesh = new THREE.Mesh(new THREE.BufferGeometry(), delMat.material);
  deliveryMesh.castShadow = false;
  deliveryMesh.frustumCulled = false;
  const deliveryCollar = new THREE.Mesh(collarGeo, MAT.concrete());
  deliveryCollar.name = 'delivery-collar';
  const delivery = group('delivery-pipe');
  delivery.add(deliveryMesh, deliveryCollar);
  let deliveryPts: THREE.Vector3[] = [];
  let drivePts: THREE.Vector3[] = [];
  let driveRadius = SITE.driveOuterDiameter / 2;
  let deliveryRadius = SITE.deliveryOuterDiameter / 2;
  pickAlong(
    driveMesh,
    () => drivePts,
    () => driveRadius,
  );
  pickAlong(
    deliveryMesh,
    () => deliveryPts,
    () => deliveryRadius,
  );
  scene.add(drive, delivery);

  // ---- flows ("Flux"): dots of constant screen size along the pipes (the catchment and the waste drain have their own)
  const flows = new FlowDots(400, { color: 0x2f8cff, size: 5, pixels: true, throughWalls: true, opacity: 0.95 });
  flows.object.name = 'flow-pipes';
  scene.add(flows.object);
  const pDrive = flows.addPath([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)], 40);
  const pDelivery = flows.addPath([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)], 320);
  const arrivalDots = new FlowDots(12, { color: 0x9fd2f2, size: 0.07, opacity: 0.9 });
  scene.add(arrivalDots.object);
  const pArrival = arrivalDots.addPath([new THREE.Vector3(), new THREE.Vector3(0, -1, 0)], 12);

  // ---- layout: everything that follows the parameters
  const relocate = (id: string, obj: THREE.Object3D, x: number, y: number, z: number) => {
    obj.position.set(x, y, z);
    const e = registry.get(id);
    if (e) {
      e.base.copy(obj.position);
      registry.setFactor(id, e.factor);
    }
  };
  let lengthDelivery = 0;
  const hotAnchors: Record<string, THREE.Object3D> = {};
  const anchor = (id: string, parent: THREE.Object3D) => {
    const a = new THREE.Object3D();
    a.name = `anchor-${id}`;
    parent.add(a);
    hotAnchors[id] = a;
    return a;
  };
  anchor('spring', spring).position.set(0, BOX_RIM_Y + 1.3, 0);
  anchor('buffer-tank', tank).position.set(0, H_LID + 0.6, 0);
  anchor('drive-pipe', drive);
  anchor('ram-pit', pit.group).position.set(PIT_X, GROUND_PIT + 1.6, 0);
  hotAnchors['waste-drain'] = waste.anchor;
  anchor('delivery-pipe', delivery);
  anchor('water-tower', tower.group).position.set(0, TOWER.groundBelowInlet + 1.8, 0);
  // on the south wall, under the eaves: the label then stands clear of the water tower's, on every size of the view
  anchor('house', house).position.set(0, 0.2 + HOUSE.wallHeight - 0.3, HOUSE.width / 2 + 0.1);

  const layout = (p: SiteParams, diameterMm: number) => {
    params = { ...p };
    driveDiameterMm = diameterMm;
    terrain.setParams(p);
    const d = driveGeometry(p);
    const tx = tankAxisX(d);
    const tankFloor = p.fall - TANK.outletAboveFloor;
    relocate('buffer-tank', tank, tx, tankFloor, 0);
    relocate('spring', spring, tx + SPRING_X, tankFloor, 0);
    // the ground is not drawn inside the spring box and over the gravel bed: they are dug into it, and the grass would cover
    // the water of the box and the stones of the bed
    const sx = tx + SPRING_X;
    terrain.setOpenings([
      [sx - BOX_HL, -BOX_HW, sx + BOX_HL, BOX_HW],
      [sx + BED_X0, -CATCHMENT.filterWidth / 2, sx + BED_X1, CATCHMENT.filterWidth / 2],
    ]);
    relocate('water-tower', tower.group, TOWER.planX, p.head - TOWER.groundBelowInlet, TOWER.planZ);
    relocate('house', house, HOUSE.planX, HOUSE.terraceFraction * p.head, HOUSE.planZ);
    // the overflow ditch lies on the ground, in the frame of the tank
    catchment.layGutter((xr, zr) => terrain.surfaceY(tx + xr, zr) - tankFloor, GUTTER_END);

    // drive pipe: out of the gate valve of the tank, level on the bench, down the slope, level run through the pit wall to the stub of the ram
    const driveOuter = diameterMm / 1000 + 2 * 0.0033;
    const r = driveOuter / 2;
    const drivePoints = [
      new THREE.Vector3(d.start.x - 0.03, p.fall, 0),
      new THREE.Vector3(d.outlet.x, p.fall, 0),
      new THREE.Vector3(d.elbow.x, 0, 0),
      new THREE.Vector3(STUB_X0, 0, 0),
    ];
    const bend = Math.max(CORNER, driveOuter * 8);
    const driveCurve = roundedPath(drivePoints, bend);
    swapGeometry(driveMesh, new THREE.TubeGeometry(driveCurve, 160, r, 14, false));
    pipeMat.uniforms.uPipeRadius.value = r;
    driveRadius = r;
    // the dots run on the curve of the tube itself (a spline through the four corners strayed off it, onto the grass)
    drivePts = driveCurve.getSpacedPoints(Math.max(8, Math.round(driveCurve.getLength() / 0.5)));
    // the collar where the pipe goes through the west wall of the pit
    driveCollar.scale.set(1, r + 0.02, r + 0.02);
    driveCollar.position.set(PIT_WEST_FACE - 0.015, 0, 0);
    // supports: a concrete saddle on the bench and one every 3 m on the slope, where the pipe lies 0.23 m above the surface
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const slopeAngle = Math.atan2(p.fall, d.run);
    let n = 0;
    q.identity();
    m.compose(new THREE.Vector3(d.start.x + 0.9, p.fall - r - 0.1, 0), q, new THREE.Vector3(1, 1, 1));
    supports.setMatrixAt(n++, m);
    // tilted with the slope, which falls towards +X (they were tilted the other way, a corner 18 cm in the ground)
    q.setFromEuler(new THREE.Euler(0, 0, -slopeAngle));
    // (all the way down to the trench at the pit: the ground stays 0.23 m under the pipe, layout.ts)
    for (let x = d.outlet.x + 1.45; x < d.elbow.x - 0.6 && n < SUPPORTS; x += 3) {
      const y = p.fall * (1 - (x - d.outlet.x) / d.run);
      m.compose(new THREE.Vector3(x, y - r - 0.1, 0), q, new THREE.Vector3(1, 1, 1));
      supports.setMatrixAt(n++, m);
    }
    supports.count = n;
    supports.instanceMatrix.needsUpdate = true;
    hotAnchors['drive-pipe'].position.set((d.outlet.x + d.elbow.x) / 2, p.fall / 2 + 1.4, 0);

    // delivery pipe: the stub of the ram, the route on the ground, the riser and the gooseneck over the trough
    const dr = (0.6 * diameterMm) / 1000 + 2 * 0.0044;
    const pts = deliveryPolyline(terrain, p, dr / 2);
    // three tubes in one mesh: in the pit, short straight runs and tight bends; the route, rounded by a spline through its
    // points and sampled every 0.6 m; the riser and the gooseneck at the tower, sampled finely (one tube sampled every 0.6 m
    // along the whole pipe cut the corners of the pit and of the gooseneck, and the dots, on the true curve, left it)
    const inPit = roundedPath(pts.slice(0, DELIVERY_IN_PIT), 0.06);
    const routePts = pts.slice(DELIVERY_IN_PIT - 1, pts.length - DELIVERY_AT_TOWER + 1);
    const towerPts = pts.slice(pts.length - DELIVERY_AT_TOWER);
    const atTower = new THREE.CatmullRomCurve3(towerPts, false, 'centripetal');
    const parts = [
      new THREE.TubeGeometry(inPit, 40, dr / 2, 8, false),
      tubeAlong(routePts, dr / 2, delMat.material, 8).geometry,
      new THREE.TubeGeometry(atTower, Math.round(atTower.getLength() / 0.1), dr / 2, 8, false),
    ];
    swapGeometry(deliveryMesh, mergeGeometries(parts)!);
    for (const g of parts) g.dispose();
    delMat.uniforms.uPipeRadius.value = dr / 2;
    deliveryRadius = dr / 2;
    // the dots on the same three curves
    // (a dot runs straight from one point of its path to the next: the points are close where the pipe bends)
    deliveryPts = [
      ...inPit.getSpacedPoints(Math.max(4, Math.round(inPit.getLength() / 0.05))),
      ...spaced(routePts, 1.0).slice(1),
      ...atTower.getSpacedPoints(Math.max(4, Math.round(atTower.getLength() / 0.1))).slice(1),
    ];
    // the collar where it leaves the pit through the east wall, under the curb
    const exit = pts.find((v) => v.x >= PIT_EAST_FACE - 1e-6) ?? pts[0];
    deliveryCollar.scale.set(1, dr / 2 + 0.015, dr / 2 + 0.015);
    deliveryCollar.position.set(PIT_EAST_FACE + 0.015, exit.y, 0);
    lengthDelivery =
      inPit.getLength() + new THREE.CatmullRomCurve3(routePts, false, 'centripetal').getLength() + atTower.getLength();
    const tp = new THREE.Vector3(TOWER.planX, p.head - TOWER.groundBelowInlet, TOWER.planZ);
    const top = TOWER.groundBelowInlet;
    // on the pipe, on its first diagonal: the label runs to the right, so its dot must stand left of the middle of the view
    const mid = pts[Math.floor(pts.length * DELIVERY_LABEL_AT)];
    hotAnchors['delivery-pipe'].position.set(mid.x, mid.y + 0.4, mid.z);

    // the waste-water drain: buried pipe from the pit, headwall, ditch and soakaway lie on the new ground
    waste.lay(terrain, pit.drainStart);

    flows.setPath(pDrive, drivePts);
    flows.setPath(pDelivery, deliveryPts);

    // the arrival at the tower, in world coordinates
    arrivalDots.setPath(pArrival, [
      new THREE.Vector3(tp.x + TOWER.troughX, tp.y + top + TOWER.pipeEndAboveLid, tp.z + TOWER.troughZ),
      new THREE.Vector3(tp.x + TOWER.troughX, tp.y + top + 0.36, tp.z + TOWER.troughZ),
    ]);
    veg.relevel();
  };
  layout(params, driveDiameterMm);

  // ---- register the parts (after they are placed)
  registry.add('spring', spring, up(5));
  registry.add('buffer-tank', tank, up(9));
  registry.add('drive-pipe', drive, up(13));
  registry.add('ram-pit', pit.group, up(17));
  registry.add('waste-drain', waste.group, up(24));
  registry.add('delivery-pipe', delivery, up(22));
  registry.add('water-tower', tower.group, up(30));
  registry.add('house', house, up(12));

  const hotspots: Hotspot[] = HOTSPOTS.map((h) => ({
    partId: h.id,
    anchor: hotAnchors[h.id],
    label: l(h.fr, h.en),
    goto: h.goto,
    minor: h.minor,
  }));

  // the sun's shadow box: a continuous function of the camera of each draw (shadow.ts)
  const aimShadow = createShadowAim(scene, terrain, sky);

  // ---- per-frame
  let sinceLayout = 1;
  const noCut = { slowMo: 1, cutaway: false, schematic: false, time: 0 };
  const follow = (s: Pick<RamState, 'fall' | 'driveLength' | 'deliveryHead' | 'driveDiameter'>): boolean => {
    if (![s.fall, s.driveLength, s.deliveryHead, s.driveDiameter].every(Number.isFinite)) return false;
    const p: SiteParams = { fall: s.fall, driveLength: s.driveLength, head: s.deliveryHead };
    const diameter = Math.round(s.driveDiameter * 10) / 10;
    if (
      p.fall !== params.fall ||
      p.driveLength !== params.driveLength ||
      p.head !== params.head ||
      diameter !== driveDiameterMm
    ) {
      layout(p, diameter);
      return true;
    }
    return false;
  };

  /** A part that is exploded, hidden (isolate) or drawn as a wire (the guide): the water of the model would hang in the air. */
  const away = (id: string): boolean => {
    const e = registry.get(id);
    return !!e && (e.factor > 0.001 || e.display === 'wire' || e.display === 'hidden');
  };
  const hold: Hold = { tank: false, box: false, flows: false };

  const update = (s: RamState, dt: number, view: ViewOpts) => {
    sinceLayout += dt;
    // the landscape follows the sliders; at most every 50 ms so that a drag stays smooth
    if (sinceLayout > 0.05 && follow(s)) sinceLayout = 0;
    if (sinceLayout > 0.4) terrain.settle();
    sky.update(s.hour, view.time);
    aimShadow();

    // the drive pipe is steel, PVC or polyethylene as the wave speed of the state says
    const kind = pipeKindOf(s.waveSpeed);
    if (kind !== pipeKind) {
      pipeKind = kind;
      applyPipeKind(pipeMat.material, kind);
    }

    // ram in its pit
    noCut.slowMo = view.slowMo;
    noCut.schematic = view.schematic;
    noCut.time = view.time;
    ram.update(s, dt, noCut);
    ramFarWater.visible = ram.rig.water?.visible !== false;

    // spring, gravel bed, tank (level, overflow, drain, gate valve) and its flows: the model of the catchment world
    hold.tank = away('buffer-tank');
    hold.box = away('spring');
    hold.flows = hold.tank || hold.box;
    catchment.update(s, dt, view, hold);

    // waste water: wet floor of the pit, the buried drain, the ditch and the soakaway
    pit.puddleMaterial.opacity = 0.55 * clamp(s.wasteFlow / 6, 0, 1);
    waste.update(s, dt, view, away('waste-drain'));

    // arrival at the tower: the stream into the trough follows the water leaving the chamber
    const arriving = s.deliveredFlow > 0.02 ? clamp(0.35 + s.outletFlowNow / 3, 0.35, 1) : 0;
    tower.stream.visible = arriving > 0;
    tower.streamMaterial.opacity = 0.75 * arriving;
    tower.troughMaterial.opacity = 0.55 + 0.3 * arriving;

    // "Flux" overlay (schematic)
    flows.object.visible = view.schematic;
    if (view.schematic) {
      // a closed gate valve or a waste valve held shut: the column is at rest
      flows.advance(pDrive, s.gateOpen === false || s.valveHeldShut === true ? 0 : s.driveVelocity, dt);
      // the true speed in the delivery pipe is millimetres per second: dots travel at a symbolic speed that grows with the flow
      flows.advance(pDelivery, s.deliveredFlow > 0.02 ? 2 + 0.5 * s.outletFlowNow : 0, dt);
      flows.place();
    }
    arrivalDots.object.visible = arriving > 0;
    if (arriving > 0) {
      arrivalDots.advance(pArrival, 2.2, dt);
      arrivalDots.place();
    }
  };

  const mod: Omit<SiteScene, keyof Warmable> = {
    id: 'site',
    scene,
    registry,
    hotspots,
    home: { position: new THREE.Vector3(-57, 58, 120), target: new THREE.Vector3(28, 20, -70) },
    minDistance: 1.5,
    maxDistance: 900,
    get params() {
      return params;
    },
    catchment,
    waste,
    deliveryLength: () => lengthDelivery,
    surfaceY: (x, z) => terrain.surfaceY(x, z),
    terrain,
    follow: (s) => void follow(s),
    update,
  };
  // any tile of the ground that is drawn hands over the renderer and the camera
  return installWarmup(mod, terrain.mesh.children) as SiteScene;
}

/** Where along the delivery polyline (0 = the ram, 1 = the tower) the label of the delivery pipe stands. */
const DELIVERY_LABEL_AT = 0.5;

/** Distance (m) from which the ram in its pit is drawn coarser, and the side of the cube its vertices are welded in. */
const RAM_FAR = 9;
const FAR_CELL = 0.012;

/** Most saddles of the drive pipe (one on the bench, then one every 3 m down the slope). */
const SUPPORTS = 24;

/** X (TANK frame) where the overflow ditch of the tank ends on the slope. */
const GUTTER_END = 9.6;
