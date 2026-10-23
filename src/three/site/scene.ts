import * as THREE from 'three';
import { l } from '@onigam/lab-kit/i18n';
import { MAT, PartRegistry, clamp, group, mesh, roundedPath } from '@onigam/lab-kit/three';
import type { Hotspot, SceneModule, ViewOpts } from '@onigam/lab-kit/three';
import type { RamState } from '../../sim/types';
import { HOUSE, PIT, SITE, SPRING, TANK, TOWER } from '../dims';
import { FlowDots, noShadow, waterMaterial } from '../common';
import { createRamModel } from '../ram/model';
import { STUB_X0 } from '../ram/inlet';
import { buildHouse, buildTower } from './buildings';
import { buildPit } from './pit';
import { buildSpring, buildTank } from './tank';
import { DEFAULT_PARAMS, GROUND_PIT, PIT_X, driveGeometry, type SiteParams } from './layout';
import { deliveryPolyline, spaced, wasteStream, writeRibbon } from './routes';
import { createShadowAim } from './shadow';
import { minWidthMaterial, pickAlong, swapGeometry, tubeAlong } from './pipes';
import { createSky } from './sky';
import { buildTerrain } from './terrain';
import { buildVegetation } from './vegetation';

// The "site" world: the hillside of the video. X east, Y up (0 = the ram's inlet axis), Z south; the hill rises to the
// north. Everything that depends on the fall, the drive length, the delivery head and the pipe diameter is re-placed
// when they change (see layout.ts for what moves). The ram in its pit is the same model as in the "ram" world.

const HOTSPOTS: { id: string; fr: string; en: string; goto?: string; minor?: boolean }[] = [
  { id: 'spring', fr: 'Captage de la source', en: 'Spring catchment' },
  { id: 'buffer-tank', fr: 'Réserve tampon', en: 'Buffer tank', minor: true },
  { id: 'drive-pipe', fr: 'Conduite motrice', en: 'Drive pipe', minor: true },
  { id: 'ram-pit', fr: 'Regard du bélier', en: 'Ram pit', goto: 'ram' },
  { id: 'delivery-pipe', fr: 'Conduite de refoulement', en: 'Delivery pipe' },
  { id: 'water-tower', fr: 'Château d’eau', en: 'Water tower' },
  { id: 'house', fr: 'Habitation', en: 'House' },
];

const up = (y: number) => new THREE.Vector3(0, y, 0);

export interface SiteScene extends SceneModule<RamState> {
  /** Parameters the landscape currently has (tests read them). */
  readonly params: SiteParams;
  /** Length of the delivery pipe as drawn (start stub to the end over the trough), metres. */
  deliveryLength(): number;
  /** Height of the rendered ground at (x, z). */
  surfaceY(x: number, z: number): number;
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

  // ---- parts
  const tank = buildTank();
  const spring = buildSpring(TANK.height + 0.4);
  const pit = buildPit();
  const ram = createRamModel(null);
  pit.group.add(ram.root);
  const tower = buildTower();
  const house = buildHouse();
  scene.add(tank.group, spring.group, pit.group, tower.group, house);

  // feed pipe from the basin to the lid of the tank (fixed relative to both: they move together)
  const inletX = SPRING.distanceToTank + tank.inlet.x;
  const feed = tubeAlong(
    [
      spring.basinOutlet.clone(),
      spring.basinOutlet.clone().add(new THREE.Vector3(0.45, -0.1, 0)),
      new THREE.Vector3(2.4, TANK.height + 0.9, tank.inlet.z + 0.4),
      new THREE.Vector3(inletX, TANK.height + 0.55, tank.inlet.z),
      new THREE.Vector3(inletX, TANK.height + 0.14, tank.inlet.z),
    ],
    SPRING.feedPipeDiameter / 2,
    MAT.pe(),
    10,
  );
  feed.castShadow = true;
  spring.group.add(feed);

  // ---- drive pipe (tube, supports) and delivery pipe (tube)
  const pipeMat = minWidthMaterial(MAT.zinc(), SITE.driveOuterDiameter / 2);
  const driveMesh = new THREE.Mesh(new THREE.BufferGeometry(), pipeMat.material);
  driveMesh.castShadow = false;
  const supports = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.18, 0.28), MAT.concrete(), 24);
  supports.castShadow = true;
  supports.receiveShadow = true;
  supports.frustumCulled = false;
  const drive = group('drive-pipe');
  drive.add(driveMesh, supports);

  const delMat = minWidthMaterial(MAT.pvcBlue(), SITE.deliveryOuterDiameter / 2);
  const deliveryMesh = new THREE.Mesh(new THREE.BufferGeometry(), delMat.material);
  deliveryMesh.castShadow = false;
  deliveryMesh.frustumCulled = false;
  const delivery = group('delivery-pipe');
  delivery.add(deliveryMesh);
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

  // ---- decoration that is not a catalogue part: outfall of the pit with its stream, tank overflow
  const outfall = group('outfall');
  scene.add(outfall);
  const streamMat = waterMaterial(0.7, 0x5aa9da);
  const streamGeo = new THREE.BufferGeometry();
  const STREAM_N = 36;
  streamGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(STREAM_N * 2 * 3), 3));
  const sIdx: number[] = [];
  for (let i = 0; i < STREAM_N - 1; i++) sIdx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  streamGeo.setIndex(sIdx);
  const streamMesh = noShadow(new THREE.Mesh(streamGeo, streamMat));
  streamMesh.frustumCulled = false;
  streamMesh.renderOrder = 2;
  outfall.add(streamMesh);
  const headwall = mesh(new THREE.BoxGeometry(0.9, 0.5, 0.35), MAT.concrete());
  outfall.add(headwall);
  const mouth = mesh(new THREE.CylinderGeometry(PIT.drainDiameter / 2, PIT.drainDiameter / 2, 0.4, 16), MAT.pvcGrey());
  mouth.rotation.x = Math.PI / 2;
  outfall.add(mouth);

  // ---- flows ("Flux"): dots of constant screen size along the pipes and the stream
  const flows = new FlowDots(900, { color: 0x2f8cff, size: 5, pixels: true, throughWalls: true, opacity: 0.95 });
  scene.add(flows.object);
  const pDrive = flows.addPath([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)], 40);
  const pDelivery = flows.addPath([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)], 320);
  const pStream = flows.addPath([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)], 30);
  const dropOpts = { color: 0x9fd2f2, size: 0.07, opacity: 0.9 };
  const overflowDots = new FlowDots(14, dropOpts);
  const arrivalDots = new FlowDots(12, dropOpts);
  const foamDots = new FlowDots(26, { ...dropOpts, color: 0xffffff, size: 0.12, opacity: 0.75 });
  scene.add(overflowDots.object, arrivalDots.object, foamDots.object);
  const pOverflow = overflowDots.addPath([new THREE.Vector3(), new THREE.Vector3(0, -1, 0)], 14);
  const pArrival = arrivalDots.addPath([new THREE.Vector3(), new THREE.Vector3(0, -1, 0)], 12);
  const pFoam = foamDots.addPath([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)], 26);

  // ---- layout: everything that follows the parameters
  const relocate = (id: string, obj: THREE.Object3D, x: number, y: number, z: number) => {
    obj.position.set(x, y, z);
    const e = registry.get(id);
    if (e) {
      e.base.copy(obj.position);
      registry.setFactor(id, e.factor);
    }
  };
  let drivePoints: THREE.Vector3[] = [];
  let lengthDelivery = 0;
  const hotAnchors: Record<string, THREE.Object3D> = {};
  const anchor = (id: string, parent: THREE.Object3D) => {
    const a = new THREE.Object3D();
    a.name = `anchor-${id}`;
    parent.add(a);
    hotAnchors[id] = a;
    return a;
  };
  anchor('spring', spring.group).position.set(0, TANK.height + 1.6, 0);
  anchor('buffer-tank', tank.group).position.set(0, TANK.height + 0.5, 0);
  anchor('drive-pipe', drive);
  anchor('ram-pit', pit.group).position.set(PIT_X, GROUND_PIT + 1.6, 0);
  anchor('delivery-pipe', delivery);
  anchor('water-tower', tower.group).position.set(0, TOWER.groundBelowInlet + 1.8, 0);
  anchor('house', house).position.set(0, 0.2 + HOUSE.wallHeight + HOUSE.ridgeRise + 1.2, 0);

  const layout = (p: SiteParams, diameterMm: number) => {
    params = { ...p };
    driveDiameterMm = diameterMm;
    terrain.setParams(p);
    const d = driveGeometry(p);
    const tankX = d.outlet.x - TANK.diameter / 2 - 0.3;
    const tankFloor = p.fall - TANK.outletAboveFloor;
    relocate('buffer-tank', tank.group, tankX, tankFloor + 0.02, 0);
    relocate('spring', spring.group, tankX - SPRING.distanceToTank, tankFloor + 0.02, 0);
    relocate('water-tower', tower.group, TOWER.planX, p.head - TOWER.groundBelowInlet, TOWER.planZ);
    relocate('house', house, HOUSE.planX, HOUSE.terraceFraction * p.head, HOUSE.planZ);

    // drive pipe: out of the tank, down the slope, level run through the pit wall to the stub of the ram
    const driveOuter = diameterMm / 1000 + 2 * 0.0033;
    const r = driveOuter / 2;
    drivePoints = [
      new THREE.Vector3(d.outlet.x - 0.12, p.fall, 0),
      new THREE.Vector3(d.outlet.x, p.fall, 0),
      new THREE.Vector3(d.elbow.x, 0, 0),
      new THREE.Vector3(STUB_X0, 0, 0),
    ];
    const bend = Math.max(0.3, driveOuter * 8);
    swapGeometry(driveMesh, new THREE.TubeGeometry(roundedPath(drivePoints, bend), 160, r, 14, false));
    pipeMat.uniforms.uPipeRadius.value = r;
    driveRadius = r;
    drivePts = spaced(drivePoints, 0.5);
    // supports: a concrete saddle every 3 m on the part of the slope where the pipe lies on the surface
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const slopeAngle = Math.atan2(p.fall, d.run);
    q.setFromEuler(new THREE.Euler(0, 0, slopeAngle));
    let n = 0;
    for (let x = d.outlet.x + 1.2; x < d.elbow.x - 6 && n < 24; x += 3) {
      const y = p.fall * (1 - (x - d.outlet.x) / d.run);
      m.compose(new THREE.Vector3(x, y - r - 0.05, 0), q, new THREE.Vector3(1, 1, 1));
      supports.setMatrixAt(n++, m);
    }
    supports.count = n;
    supports.instanceMatrix.needsUpdate = true;
    // the pipe passes the pit wall: no support there
    hotAnchors['drive-pipe'].position.set((d.outlet.x + d.elbow.x) / 2, p.fall / 2 + 1.4, 0);

    // delivery pipe: the stub of the ram, the route on the ground, the riser and the gooseneck over the trough
    const pts = deliveryPolyline(terrain, p);
    const dr = (0.6 * diameterMm) / 1000 + 2 * 0.0044;
    swapGeometry(deliveryMesh, tubeAlong(pts, dr / 2, delMat.material, 8).geometry);
    delMat.uniforms.uPipeRadius.value = dr / 2;
    deliveryRadius = dr / 2;
    deliveryPts = spaced(pts, 1.0);
    lengthDelivery = new THREE.CatmullRomCurve3(pts, false, 'centripetal').getLength();
    const tp = new THREE.Vector3(TOWER.planX, p.head - TOWER.groundBelowInlet, TOWER.planZ);
    const top = TOWER.groundBelowInlet;
    const mid = pts[Math.floor(pts.length * 0.32)];
    hotAnchors['delivery-pipe'].position.set(mid.x, mid.y + 2.2, mid.z);

    // outfall of the pit drain, and the stream of the waste water down the valley
    const waste = wasteStream(terrain, pit.drainStart, STREAM_N);
    outfall.position.copy(waste.outfall);
    headwall.position.set(0, 0.05, -0.1);
    mouth.position.set(0, 0.05, 0.12);
    writeRibbon(streamGeo.attributes.position as THREE.BufferAttribute, waste.points, outfall.position);
    streamGeo.computeVertexNormals();
    flows.setPath(pStream, waste.points);
    foamDots.setPath(
      pFoam,
      waste.points.map((p) => p.clone().setY(p.y + 0.03)),
    );
    flows.setPath(pDrive, drivePts);
    flows.setPath(pDelivery, deliveryPts);

    // tank overflow and the arrival at the tower, in world coordinates
    const tx = tank.group.position.x;
    const ty = tank.group.position.y;
    const ox = tx;
    const oz = TANK.diameter / 2 + 0.2;
    overflowDots.setPath(pOverflow, [
      new THREE.Vector3(ox, ty + TANK.height - 0.7, oz),
      new THREE.Vector3(ox, ty + 0.05, oz + 0.35),
    ]);
    arrivalDots.setPath(pArrival, [
      new THREE.Vector3(tp.x + TOWER.troughX, tp.y + top + TOWER.pipeEndAboveLid, tp.z + TOWER.troughZ),
      new THREE.Vector3(tp.x + TOWER.troughX, tp.y + top + 0.36, tp.z + TOWER.troughZ),
    ]);
    veg.relevel();
  };
  layout(params, driveDiameterMm);

  // ---- register the parts (after they are placed)
  registry.add('spring', spring.group, up(5));
  registry.add('buffer-tank', tank.group, up(9));
  registry.add('drive-pipe', drive, up(13));
  registry.add('ram-pit', pit.group, up(17));
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

  const aimShadow = createShadowAim(terrain, sky);

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

  const update = (s: RamState, dt: number, view: ViewOpts) => {
    sinceLayout += dt;
    // the landscape follows the sliders; at most every 50 ms so that a drag stays smooth
    if (sinceLayout > 0.05 && follow(s)) sinceLayout = 0;
    if (sinceLayout > 0.4) terrain.settle();
    sky.update(s.hour, view.time);
    aimShadow();

    // ram in its pit
    noCut.slowMo = view.slowMo;
    noCut.schematic = view.schematic;
    noCut.time = view.time;
    ram.update(s, dt, noCut);

    // buffer tank level, spring trickle, overflow
    const level = clamp(s.tankLevel, 0, 1);
    tank.water.scale.y = Math.max(0.001, level);
    tank.water.position.y = (TANK.height * Math.max(0.001, level)) / 2;
    const spring01 = clamp(s.sourceFlow / SITE.sourceFlowLpm, 0, 3);
    spring.trickle.visible = s.sourceFlow > 0.05;
    spring.trickle.scale.set(Math.sqrt(spring01), 1, Math.sqrt(spring01));
    const overflowing = level > 0.995 && s.sourceFlow > s.driveFlow + 0.05;

    // waste water: wet floor of the pit, the stream down the valley
    const waste = clamp(s.wasteFlow / 17, 0, 1.4);
    pit.puddleMaterial.opacity = 0.55 * clamp(s.wasteFlow / 6, 0, 1);
    streamMesh.visible = s.wasteFlow > 0.2;
    streamMat.opacity = 0.35 + 0.35 * clamp(waste, 0, 1);

    // arrival at the tower: the stream into the trough follows the water leaving the chamber
    const arriving = s.deliveredFlow > 0.02 ? clamp(0.35 + s.outletFlowNow / 3, 0.35, 1) : 0;
    tower.stream.visible = arriving > 0;
    tower.streamMaterial.opacity = 0.75 * arriving;
    tower.troughMaterial.opacity = 0.55 + 0.3 * arriving;

    // "Flux" overlay (schematic) and the local drops
    flows.object.visible = view.schematic;
    if (view.schematic) {
      flows.advance(pDrive, s.driveVelocity * 1.0, dt);
      // the true speed in the delivery pipe is millimetres per second: dots travel at a symbolic speed that grows with the flow
      flows.advance(pDelivery, s.deliveredFlow > 0.02 ? 2 + 0.5 * s.outletFlowNow : 0, dt);
      flows.advance(pStream, s.wasteFlow > 0.2 ? 1.2 + 0.1 * s.wasteFlow : 0, dt);
      flows.place();
    }
    overflowDots.object.visible = overflowing;
    arrivalDots.object.visible = arriving > 0;
    foamDots.object.visible = s.wasteFlow > 0.2;
    if (overflowing) {
      overflowDots.advance(pOverflow, 2.5, dt);
      overflowDots.place();
    }
    if (arriving > 0) {
      arrivalDots.advance(pArrival, 2.2, dt);
      arrivalDots.place();
    }
    if (s.wasteFlow > 0.2) {
      foamDots.advance(pFoam, 0.8 + 0.06 * s.wasteFlow, dt);
      foamDots.place();
    }
  };

  return {
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
    deliveryLength: () => lengthDelivery,
    surfaceY: (x, z) => terrain.surfaceY(x, z),
    follow: (s) => void follow(s),
    update,
  };
}
