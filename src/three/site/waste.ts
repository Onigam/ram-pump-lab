import * as THREE from 'three';
import { MAT, clamp, group, mesh } from '@onigam/lab-kit/three';
import type { ViewOpts } from '@onigam/lab-kit/three';
import type { RamState } from '../../sim/types';
import { PIT, WASTE_DRAIN as W } from '../dims';
import { FlowDots, noShadow, waterMaterial } from '../common';
import { mergeStatic } from '../merge';
import { rock, sweepProfile, v3 } from '../catchment/geo';
import { Splash } from '../catchment/splash';
import { wasteStream } from './routes';
import type { Terrain } from './terrain';

// The `waste-drain` of the site: from the drain of the pit, a buried pipe with two inspection chambers, a headwall where the pipe
// comes out of the ground, an open concrete ditch down the slope and a soakaway (a stone ring over a gravel pit) at its end,
// where the water falls and sinks. The water follows `RamState.wasteFlow`. Everything is laid on the terrain by `lay`.

export interface WasteDrain {
  group: THREE.Group;
  /** Hotspot anchor (above the headwall). */
  anchor: THREE.Object3D;
  /** Lay the drain on the terrain, from the end of the pit's drain pipe (site frame). */
  lay(terrain: Terrain, drainStart: THREE.Vector3): void;
  update(s: RamState, dt: number, view: ViewOpts, hold: boolean): void;
  /** Where the drain comes out of the ground, and the centre of the soakaway (for the tests and the camera). */
  readonly outfall: THREE.Vector3;
  readonly soakaway: THREE.Vector3;
  /** Water running now (L/min) as the last update decided. */
  readonly flowing: number;
}

const PIPE_R = PIT.drainDiameter / 2;

export function buildWasteDrain(): WasteDrain {
  const g = group('waste-drain');
  const pvc = MAT.pvcGrey();
  const concrete = MAT.concrete();

  // buried pipe (not visible under the terrain, it gives the part its extent from the pit to the headwall)
  const pipe = mesh(new THREE.CylinderGeometry(PIPE_R, PIPE_R, 1, 16), pvc);
  g.add(pipe);
  // inspection chambers: a cast ring and a cast-iron cover, flush with the ground
  const chambers: THREE.Group[] = [];
  for (let i = 0; i < 2; i++) {
    const c = new THREE.Group();
    c.add(
      mesh(
        new THREE.CylinderGeometry(W.manholeDiameter / 2, W.manholeDiameter / 2 + 0.03, W.manholeRise + 0.2, 24),
        concrete,
        [0, (W.manholeRise - 0.2) / 2, 0],
      ),
    );
    c.add(
      mesh(
        new THREE.CylinderGeometry(W.manholeCoverDiameter / 2, W.manholeCoverDiameter / 2, 0.03, 24),
        new THREE.MeshStandardMaterial({ color: 0x55595d, metalness: 0.4, roughness: 0.6 }),
        [0, W.manholeRise + 0.005, 0],
      ),
    );
    chambers.push(c);
    g.add(c);
  }
  // the headwall and the mouth of the pipe
  const outfallGroup = group('outfall');
  const headwall = mesh(new THREE.BoxGeometry(W.headwallWidth, W.headwallHeight, W.headwallDepth), concrete);
  headwall.position.set(0, W.headwallHeight / 2 - 0.15, -W.headwallDepth / 2);
  outfallGroup.add(headwall);
  const mouth = mesh(new THREE.CylinderGeometry(PIPE_R, PIPE_R, 0.3, 16), pvc);
  mouth.rotation.x = Math.PI / 2;
  mouth.position.set(0, 0.06, 0.02);
  outfallGroup.add(mouth);
  mergeStatic(outfallGroup, { name: 'outfall' });
  g.add(outfallGroup);
  // the ditch (a concrete U laid on the ground), the water in it, the soakaway
  const ditch = new THREE.Mesh(new THREE.BufferGeometry(), concrete.clone());
  ditch.material.side = THREE.DoubleSide;
  ditch.castShadow = true;
  ditch.receiveShadow = true;
  g.add(ditch);
  const ribbonMat = waterMaterial(0.6, 0x5aa9da);
  const ribbonGeo = new THREE.BufferGeometry();
  const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
  ribbon.renderOrder = 2;
  noShadow(ribbon);
  ribbon.frustumCulled = false;
  g.add(ribbon);
  const soak = new THREE.Group();
  soak.name = 'soakaway';
  const ringStones = 16;
  const stoneMat = MAT.stone();
  for (let i = 0; i < ringStones; i++) {
    const a = (i / ringStones) * Math.PI * 2;
    const r = W.soakawayDiameter / 2 - 0.12;
    soak.add(
      rock(
        i + 3,
        stoneMat,
        Math.cos(a) * r,
        W.soakawayRise / 2 - 0.04,
        Math.sin(a) * r,
        0.2,
        W.soakawayRise / 2,
        0.17,
        a,
        0,
      ),
    );
  }
  soak.add(
    mesh(
      new THREE.CylinderGeometry(W.soakawayDiameter / 2 - 0.2, W.soakawayDiameter / 2 - 0.2, 0.04, 24),
      new THREE.MeshStandardMaterial({ color: 0x5d5a52, roughness: 1 }),
      [0, 0.012, 0],
    ),
  );
  mergeStatic(soak, { name: 'soakaway' });
  g.add(soak);
  const anchor = new THREE.Object3D();
  anchor.name = 'anchor-waste-drain';
  g.add(anchor);

  // ---- water: splash at the end, dots in the pipe and the ditch
  const splash = new Splash({
    emitter: v3(0, 0, 0),
    radius: 0.04,
    spread: 0.45,
    up: 1.3,
    floorY: () => 0,
    max: 140,
    size: 0.03,
  });
  g.add(splash.object);
  const flowsPipe = new FlowDots(80, { color: 0x2f8cff, size: 5, pixels: true, throughWalls: true, opacity: 0.95 });
  const flowsDitch = new FlowDots(120, { color: 0x2f8cff, size: 5, pixels: true, throughWalls: true, opacity: 0.95 });
  g.add(flowsPipe.object, flowsDitch.object);
  const pPipe = flowsPipe.addPath([v3(0, 0, 0), v3(1, 0, 0)], 40);
  const pDitch = flowsDitch.addPath([v3(0, 0, 0), v3(1, 0, 0)], 60);

  const outfall = new THREE.Vector3();
  const soakCentre = new THREE.Vector3();
  let flowing = 0;

  const lay = (terrain: Terrain, drainStart: THREE.Vector3): void => {
    const count = Math.ceil(W.ditchLength / 1.1) + 1;
    const ws = wasteStream(terrain, drainStart, count);
    outfall.copy(ws.outfall);
    // buried pipe: from inside the pit's drain stub, falling 2 % to the headwall
    const a = v3(drainStart.x, drainStart.y, drainStart.z - 0.05);
    const zEnd = ws.outfall.z - 0.02;
    const b = v3(drainStart.x, drainStart.y - W.fall * (zEnd - drainStart.z), zEnd);
    const d = b.clone().sub(a);
    pipe.position.copy(a).addScaledVector(d, 0.5);
    pipe.scale.set(1, d.length(), 1);
    pipe.quaternion.setFromUnitVectors(v3(0, 1, 0), d.clone().normalize());
    chambers.forEach((c, i) => {
      const t = (i + 1) / (chambers.length + 1);
      const x = a.x;
      const z = a.z + (b.z - a.z) * t;
      c.position.set(x, terrain.surfaceY(x, z), z);
      c.visible = b.z - a.z > 4;
    });
    // headwall at the outfall: its face towards the valley, the mouth on the ground
    outfallGroup.position.copy(ws.outfall).setY(ws.outfall.y - 0.05);
    anchor.position.copy(ws.outfall).setY(ws.outfall.y + 1.4);
    // the ditch: lies on the ground along the stream
    const pts = ws.points.map((p) => ({ x: p.x, y: p.y - 0.04, z: p.z }));
    const profile: [number, number][] = [
      [-W.ditchWidth / 2, W.ditchDepth],
      [-W.ditchWidth / 2, 0],
      [W.ditchWidth / 2, 0],
      [W.ditchWidth / 2, W.ditchDepth],
      [W.ditchWidth / 2 - W.ditchWall, W.ditchDepth],
      [W.ditchWidth / 2 - W.ditchWall, W.ditchWall],
      [-W.ditchWidth / 2 + W.ditchWall, W.ditchWall],
      [-W.ditchWidth / 2 + W.ditchWall, W.ditchDepth],
      [-W.ditchWidth / 2, W.ditchDepth],
    ];
    ditch.geometry.dispose();
    ditch.geometry = sweepProfile(
      [{ x: ws.outfall.x, y: ws.outfall.y - 0.04, z: ws.outfall.z + 0.05 }, ...pts],
      profile,
    );
    // the water in the ditch: a constant-width ribbon on its floor
    const line = [v3(ws.outfall.x, ws.outfall.y - 0.04, ws.outfall.z + 0.05), ...pts.map((p) => v3(p.x, p.y, p.z))];
    const n = line.length;
    const pos = new Float32Array(n * 6);
    const idx: number[] = [];
    const hw = (W.ditchWidth - 2 * W.ditchWall) / 2 - 0.01;
    for (let i = 0; i < n; i++) {
      const p0 = line[Math.max(0, i - 1)];
      const p1 = line[Math.min(n - 1, i + 1)];
      let tx = p1.x - p0.x;
      let tz = p1.z - p0.z;
      const tl = Math.hypot(tx, tz) || 1;
      tx /= tl;
      tz /= tl;
      const y = line[i].y + W.ditchWall + 0.012;
      pos.set([line[i].x - tz * hw, y, line[i].z + tx * hw, line[i].x + tz * hw, y, line[i].z - tx * hw], i * 6);
      if (i < n - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    ribbonGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    ribbonGeo.setIndex(idx);
    ribbonGeo.computeVertexNormals();
    // the soakaway continues the last stretch of the ditch
    const last = line[n - 1];
    const prev = line[n - 2];
    const dir = v3(last.x - prev.x, 0, last.z - prev.z).normalize();
    const cx = last.x + dir.x * (W.soakawayDiameter / 2 - 0.15);
    const cz = last.z + dir.z * (W.soakawayDiameter / 2 - 0.15);
    soakCentre.set(cx, terrain.surfaceY(cx, cz), cz);
    soak.position.copy(soakCentre).setY(soakCentre.y - 0.04);
    splash.setEmitter(last.x + dir.x * 0.3, last.y + W.ditchWall + 0.1, last.z + dir.z * 0.3);
    splash.setFloor(() => soakCentre.y + 0.02);
    flowsPipe.setPath(pPipe, [a, v3(a.x, (a.y + b.y) / 2, (a.z + b.z) / 2), b]);
    flowsDitch.setPath(
      pDitch,
      line.map((p) => v3(p.x, p.y + W.ditchWall + 0.03, p.z)),
    );
    ribbon.geometry.computeBoundingSphere();
  };

  const update = (s: RamState, dt: number, view: ViewOpts, hold: boolean): void => {
    const q = Number.isFinite(s.wasteFlow) ? Math.max(0, s.wasteFlow) : 0;
    flowing = hold ? 0 : q;
    const on = !hold && q > 0.2;
    ribbon.visible = on;
    ribbonMat.opacity = 0.35 + 0.35 * clamp(q / 17, 0, 1);
    splash.update(dt, on ? 10 + 3 * q : 0, on);
    const show = view.schematic && on;
    flowsPipe.object.visible = show;
    flowsDitch.object.visible = show;
    if (show) {
      flowsPipe.advance(pPipe, 0.5 + 0.05 * q, dt);
      flowsPipe.place();
      flowsDitch.advance(pDitch, 0.9 + 0.08 * q, dt);
      flowsDitch.place();
    }
  };

  return {
    group: g,
    anchor,
    lay,
    update,
    outfall,
    soakaway: soakCentre,
    get flowing() {
      return flowing;
    },
  };
}
