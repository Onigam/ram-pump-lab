import * as THREE from 'three';
import { RAM, VALVE } from '../dims';

// Derived sizes of the waste valve (all from `VALVE`, in metres, heights above the top face of the base plate), the visual
// travel of the stem and the geometry helpers shared by the parts of the assembly (see waste.ts for the assembly itself).

export const T = VALVE.rodDiameter / 2;
export const NIPPLE_R = VALVE.threadDiameter / 2 - 0.00005;
export const NIPPLE_BORE = VALVE.seatBore[1] / 2;
export const NIPPLE_TOP = VALVE.nippleBottom + VALVE.nippleLength;
export const SOCKET_R = VALVE.weldedFittingDiameter / 2;
export const MALE_R = 0.01675;
export const BORE_LOW = 0.013;
export const BORE_UP = 0.01025;
export const RED_R = VALVE.reductionDiameter / 2;
export const SLEEVE_R = VALVE.sleeveDiameter / 2;
export const SLEEVE_TOP = VALVE.sleeveBottom + VALVE.sleeveLength;
export const TUBE_R = VALVE.guideTubeOuterDiameter / 2;
export const TUBE_BORE = VALVE.guideTubeInnerDiameter / 2;
export const NECK_BOTTOM = SLEEVE_TOP - 0.012;
export const COLLAR_R = VALVE.guideCollarDiameter / 2;
export const SEAT_TOP = VALVE.nippleBottom + VALVE.seatThickness;
export const HEAD_R = VALVE.headDiameter / 2;
export const HEAD_BASE = VALVE.headClosedY;
export const CONE_TOP = HEAD_BASE + (HEAD_R - T);
export const FINS_BOTTOM = HEAD_BASE - VALVE.finsHeight;
export const ROD_BOTTOM = FINS_BOTTOM - 0.0015;
export const STACK_Y = VALVE.guideTop;
export const STACK_TOP = STACK_Y + VALVE.counterweightLength + 2 * VALVE.nutThickness;
export const PLATE_TOP = RAM.wasteFlangeTop + VALVE.basePlateThickness;
export const SLOT_HALF = VALVE.portWidth / 2 / NIPPLE_R; // half angle of a port, radians
export const SLEEVE_ON_ROD_R = VALVE.stemSleeveDiameter / 2;

/** Visual travel (m) of the valve for a stroke in mm: the real stroke multiplied by the 3D exaggeration, kept sane. */
export function travelOf(strokeMm: number): number {
  return Math.min(0.03, Math.max(0.002, (strokeMm / 1000) * VALVE.strokeVisualScale));
}
export const DEFAULT_TRAVEL = travelOf(2.2);

/** Size and place the plain tail of the rod so that it stays a few mm proud of the stack (closed-pose frame). */
export function placeTail(tail: THREE.Object3D, travel: number): void {
  const y0 = 0.205;
  const top = STACK_Y + travel + (VALVE.counterweightLength + 2 * VALVE.nutThickness) + 0.008;
  tail.scale.set(1, top - y0, 1);
  tail.position.y = (y0 + top) / 2;
}

export const PLATE_TOP_Y = PLATE_TOP;
/** Closed-frame height of the top of the stack above the guide (the tail of the rod is placed from it). */
export const STACK_HEIGHT = STACK_TOP - STACK_Y;

/** One wall bar of the nipple between two ports: a sector of the tube from angle a0 to a1 (angle from +Z towards +X). */
export function nippleBar(y0: number, y1: number, a0: number, a1: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const steps = 6;
  const pt = (r: number, a: number): [number, number] => [r * Math.sin(a), -r * Math.cos(a)];
  for (let i = 0; i <= steps; i++) {
    const [x, y] = pt(NIPPLE_R, a0 + ((a1 - a0) * i) / steps);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  for (let i = steps; i >= 0; i--) {
    const [x, y] = pt(NIPPLE_BORE, a0 + ((a1 - a0) * i) / steps);
    shape.lineTo(x, y);
  }
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  return g;
}
