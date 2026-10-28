import * as THREE from 'three';
import { MAT, glass, group, mesh } from '@onigam/lab-kit/three';
import { CHAMBER, FITTINGS, RAM } from '../dims';
import { crispRuns, hexNut, hexRing, lathe } from '../common';
import { dynamic } from '../merge';
import { COVER_END, DRAIN_Y } from './body';
import { dialAngle, dialTexture } from './dial';
import { CH } from './chamber';
import { ballValve } from './fit';
import type { RamCtx } from './ctx';
import { EXPLODE } from './explode';

// The small fittings: gauge on the chamber, snifter on the body, outlet valve V3, the union with the start of the delivery
// pipe, drain valve V2 on the end cover. All are whole parts (not cut by the section).

export function buildGauge(ctx: RamCtx, yTop: number): void {
  const g = group('gauge');
  g.position.set(RAM.xDelivery, CHAMBER.shellBottom + yTop, 0);
  const brass = MAT.brass();
  const nickel = MAT.nickel();
  // connection: hex and threaded stem, screwed into the chamber's top boss
  g.add(mesh(hexRing(0.022, 0.012, 0), brass, [0, 0, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.017, 20), brass, [0, 0.0205, 0]));
  const R = FITTINGS.gaugeDiameter / 2;
  const cy = 0.027 + R;
  const caseDepth = 0.028;
  const zFront = 0.012; // front face of the case
  const body = mesh(new THREE.CylinderGeometry(R, R, caseDepth, 48), MAT.steelBlack(), [0, cy, zFront - caseDepth / 2]);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const bezel = mesh(new THREE.TorusGeometry(R - 0.001, 0.0022, 10, 48), nickel, [0, cy, zFront]);
  g.add(bezel);
  const zDial = zFront + 0.0004;
  const dialMat = MAT.printWhite();
  const face = dialTexture();
  dialMat.map = face;
  dialMat.color.set(0xffffff);
  dialMat.emissiveMap = face;
  dialMat.emissive.set(0xffffff);
  dialMat.emissiveIntensity = 0.55;
  g.add(mesh(new THREE.CircleGeometry(R - 0.0025, 48), dialMat, [0, cy, zDial]));
  const needle = group('needle');
  needle.position.set(0, cy, zDial + 0.0016);
  needle.add(mesh(new THREE.BoxGeometry(0.0016, 0.0245, 0.0006), MAT.cableRed(), [0, 0.0095, 0]));
  needle.add(mesh(new THREE.BoxGeometry(0.0022, 0.007, 0.0006), MAT.cableRed(), [0, -0.0045, 0]));
  const hub = mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.0016, 16), MAT.printBlack(), [0, 0, 0.0004]);
  hub.rotation.x = Math.PI / 2;
  needle.add(hub);
  needle.rotation.z = dialAngle(0);
  g.add(needle);
  ctx.rig.needle = dynamic(needle);
  const lens = mesh(new THREE.CircleGeometry(R - 0.0022, 48), glass(0.06), [0, cy, zFront + 0.0026]);
  lens.castShadow = false;
  g.add(lens);
  ctx.anchor('gauge', g, 0, cy + R + 0.004, 0.0);
  ctx.add('gauge', g, EXPLODE.gauge);
}

export function buildSnifter(ctx: RamCtx): void {
  const g = group('snifter');
  g.position.set(RAM.xSnifter, 0.05, 0);
  const brass = MAT.brass();
  g.add(mesh(new THREE.CylinderGeometry(0.0043, 0.0043, 0.012, 14), brass, [0, -0.006, 0]));
  g.add(mesh(hexRing(0.016, 0.01, 0), brass, [0, 0, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.012, 20), brass, [0, 0.016, 0]));
  g.add(mesh(new THREE.SphereGeometry(0.0072, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), brass, [0, 0.022, 0]));
  const pin = group('pin');
  pin.position.y = 0.028;
  pin.add(mesh(new THREE.CylinderGeometry(0.0011, 0.0011, 0.007, 8), MAT.inox(), [0, 0.0015, 0]));
  pin.add(mesh(new THREE.SphereGeometry(0.0021, 12, 8), MAT.inox(), [0, 0.0052, 0]));
  g.add(pin);
  ctx.rig.snifterPin = dynamic(pin);
  ctx.anchor('snifter', g, 0.0, 0.03, 0.0);
  ctx.add('snifter', g, EXPLODE.snifter);
}

/** x, relative to the chamber port, where the outlet valve V3 starts and ends (the union follows). */
const OUTLET_VALVE_X = 0.04;
const outletX0 = (): number => RAM.xDelivery + CH.R - 0.003 + 0.012;

export function buildOutlet(ctx: RamCtx): void {
  const g = group('outlet-valve');
  g.position.set(outletX0(), CHAMBER.outletHeight, 0);
  // threaded nipple into the chamber port, then the DN15 ball valve
  const nipple = mesh(new THREE.CylinderGeometry(0.01065, 0.01065, 0.046, 20), MAT.steel(), [0.023, 0, 0]);
  nipple.rotation.z = Math.PI / 2;
  g.add(nipple);
  const valve = ballValve({
    length: FITTINGS.smallBallValveLength,
    endR: 0.0125,
    bulgeR: 0.0215,
    bulgeLen: 0.042,
    body: MAT.brass(),
    steel: MAT.steel(),
    grip: MAT.pvcRed(),
  });
  valve.position.x = OUTLET_VALVE_X;
  g.add(valve);
  ctx.anchor('outlet-valve', g, OUTLET_VALVE_X + FITTINGS.smallBallValveLength / 2, 0.05, 0);
  ctx.add('outlet-valve', g, EXPLODE['outlet-valve']);
}

/**
 * The union on the delivery outlet: a three-piece brass union (tail on the valve, tail with its collar, the nut that draws
 * them together) followed by a compression fitting that holds the start of the blue PE delivery pipe. It lets the ram be
 * disconnected from the pipe without turning either. Frame: origin at the downstream end of the outlet valve, axis +X.
 */
export function buildUnion(ctx: RamCtx): void {
  const g = group('delivery-union');
  const nutX = OUTLET_VALVE_X + FITTINGS.smallBallValveLength;
  g.position.set(outletX0() + nutX, CHAMBER.outletHeight, 0);
  const brass = MAT.brass();
  const nickel = MAT.nickel();
  const L = FITTINGS.unionLength;
  const af = FITTINGS.unionTailAcrossFlats;
  const nutAf = FITTINGS.unionNutAcrossFlats;
  const nutL = FITTINGS.unionNutLength;
  /** A piece standing on Y (from y = 0 up) laid along +X from x. */
  const along = (obj: THREE.Object3D, x: number): THREE.Object3D => {
    obj.rotation.z = -Math.PI / 2;
    obj.position.x = x;
    return obj;
  };
  const cyl = (r: number, len: number, mat: THREE.Material, seg = 28): THREE.Mesh =>
    mesh(new THREE.CylinderGeometry(r, r, len, seg), mat, [0, len / 2, 0]);
  // tail on the valve: hex, then the threaded barrel the nut screws on
  g.add(along(mesh(hexNut(af, 0.01, 0), brass), 0));
  g.add(along(cyl(0.0165, 0.019, brass), 0.01));
  // the nut (hex 36 mm) over the barrel, its lip bearing on the collar of the second tail
  const nut = group('union-nut');
  nut.add(mesh(hexNut(nutAf, nutL, 0.033), nickel));
  nut.add(
    mesh(
      lathe(
        crispRuns([
          [0.0135, nutL - 0.003],
          [0.0185, nutL - 0.003],
          [0.0185, nutL],
          [0.0135, nutL],
        ]),
        32,
      ),
      nickel,
    ),
  );
  g.add(along(nut, 0.012));
  // second tail: collar against the first tail, neck through the nut, hex, then the compression body
  g.add(along(cyl(0.0158, 0.004, brass), 0.026));
  g.add(along(cyl(0.0135, 0.008, brass), 0.03));
  g.add(along(mesh(hexNut(af, 0.012, 0), brass), 0.034));
  // compression nut on the PE pipe
  g.add(along(mesh(hexNut(0.034, L - 0.046, 0), brass), 0.046));
  // the delivery pipe: PE 25 mm, from inside the compression nut to the free end
  const pr = 0.0125;
  const pipeLen = FITTINGS.outletStubLength - 0.052;
  const pipe = mesh(
    lathe(
      crispRuns([
        [0.0081, 0],
        [pr, 0],
        [pr, pipeLen],
        [0.0081, pipeLen],
      ]),
      28,
    ),
    MAT.pvcBlue(),
  );
  g.add(along(pipe, 0.052));
  ctx.anchor('delivery-union', g, 0.02, 0.0215, 0);
  ctx.add('delivery-union', g, EXPLODE['delivery-union']);
}

export function buildDrain(ctx: RamCtx): void {
  const g = group('drain-valve');
  g.position.set(COVER_END, DRAIN_Y, 0);
  const brass = MAT.brass();
  const valve = ballValve({
    length: FITTINGS.smallBallValveLength,
    endR: 0.0125,
    bulgeR: 0.0215,
    bulgeLen: 0.042,
    body: brass,
    steel: MAT.steel(),
    grip: MAT.pvcRed(),
    leverAngle: 90,
  });
  valve.position.x = 0.004;
  g.add(valve);
  // hose tail
  const tail = mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.03, 16), brass, [
    FITTINGS.smallBallValveLength + 0.019,
    0,
    0,
  ]);
  tail.rotation.z = Math.PI / 2;
  g.add(tail);
  for (const dx of [0.012, 0.024]) {
    const rib = mesh(new THREE.TorusGeometry(0.0088, 0.0014, 8, 20), brass, [
      FITTINGS.smallBallValveLength + dx + 0.008,
      0,
      0,
    ]);
    rib.rotation.y = Math.PI / 2;
    g.add(rib);
  }
  ctx.anchor('drain-valve', g, 0.04, 0.03, 0);
  ctx.add('drain-valve', g, EXPLODE['drain-valve']);
}
