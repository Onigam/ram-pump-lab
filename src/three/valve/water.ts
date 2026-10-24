import * as THREE from 'three';
import { VALVE } from '../dims';
import { TAU, lathe, noShadow, softDotTexture, waterMaterial, type Profile } from '../common';
import type { CutKit } from '../cut';
import * as G from './geo';

// Water in the waste valve (valve frame): the column from the plate to the seat (seen through the section or the x-ray), the
// stream through the open valve from the seat to the ports, and the spray thrown out of the four ports. The sizes of the
// motion come from the simulation state only.

/** Radius of the ports' outer wall, where the jets leave. */
const PORT_R = VALVE.threadDiameter / 2;

export interface ValveWater {
  group: THREE.Group;
  /** The stream and its own material: animated directly, never through `mesh.material` (the registry swaps that). */
  stream: THREE.Mesh;
  streamMaterial: THREE.MeshStandardMaterial;
  /** Ports of the nipple: position and outward direction (valve frame). */
  ports: { pos: THREE.Vector3; dir: THREE.Vector3 }[];
  /** Path of the water through the open valve (valve frame), for the flow dots. */
  path: THREE.Vector3[];
}

export function buildValveWater(cut: CutKit): ValveWater {
  const group = new THREE.Group();
  group.name = 'valve-water';
  // lighter than the water of the body: it surrounds the head, the fins and the rod, which must stay readable through it
  const mat = waterMaterial(0.3);
  // column: the 26 mm bore of the plate and the reducer, narrowing to the 15 mm bore under the seat
  const column: Profile = [
    [0, -G.PLATE_T],
    [G.PLATE_BORE_R - 0.0004, -G.PLATE_T],
    [G.PLATE_BORE_R - 0.0004, 0.026],
    [0.0098, 0.034],
    [0.0098, G.NIPPLE_BOTTOM],
    [0, G.NIPPLE_BOTTOM],
  ];
  const col = new THREE.Mesh(lathe([column], 36), mat);
  group.add(col);
  // stream through the open valve: from the seat to the ports (opacity follows the jet)
  const streamMat = waterMaterial(0.6, 0x62b0e0);
  const stream = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0066, 0.0066, G.PORT_MID - G.NIPPLE_BOTTOM, 20, 1, true),
    streamMat,
  );
  stream.position.y = (G.PORT_MID + G.NIPPLE_BOTTOM) / 2;
  group.add(stream);
  noShadow(group);
  group.renderOrder = 3;
  cut.clip(col);
  cut.clip(stream);

  const ports: ValveWater['ports'] = [];
  for (let i = 0; i < VALVE.portCount; i++) {
    const a = (i * TAU) / VALVE.portCount; // angle from +Z towards +X, like the nipple's ports
    const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    ports.push({ pos: new THREE.Vector3(0, G.PORT_MID, 0).addScaledVector(dir, PORT_R), dir });
  }
  const x = 0.0035;
  const path = [
    new THREE.Vector3(0, -G.PLATE_T - 0.03, 0),
    new THREE.Vector3(0, 0.02, 0),
    new THREE.Vector3(x, G.NIPPLE_BOTTOM + 0.004, 0),
    new THREE.Vector3(x, G.PORT_MID, 0),
    new THREE.Vector3(x, G.PORT_MID, 0.03),
  ];
  return { group, stream, streamMaterial: streamMat, ports, path };
}

// ------------------------------------------------------------------------------------------------ spray

/** Height of the nearest thing that catches a drop falling at (x, z) onto the valve itself (valve frame), or -Infinity. */
export function valveFloor(x: number, z: number): number {
  const r = Math.hypot(x, z);
  if (r < G.RED_TOP_R) return G.RED_TOP + VALVE.nippleLockNutThickness;
  if (r < G.RED_R) return VALVE.reducerTaperStart;
  if (r < G.SOCKET_R) return G.SOCKET_H;
  if (Math.abs(x) < G.PLATE_HALF && Math.abs(z) < G.PLATE_HALF) return 0;
  return Number.NEGATIVE_INFINITY;
}

/**
 * Drops thrown out of the four ports and falling under gravity. Cheap Points; the rate follows the jet flow. Live drops are
 * kept at the start of the arrays and only they are drawn, so every vertex always stays inside the valve's own bounds.
 * `floorAt` gives the height of whatever catches a drop at (x, z), in the valve frame.
 */
export class Spray {
  readonly object: THREE.Points;
  private readonly max = 700;
  private readonly pos = new Float32Array(this.max * 3);
  private readonly vel = new Float32Array(this.max * 3);
  private readonly life = new Float32Array(this.max);
  private live = 0;
  private carry = 0;

  /** `size`: diameter of a drop on screen at 1 m, metres (the spray of the ram is seen from afar, the bench's from close). */
  constructor(
    private readonly ports: ValveWater['ports'],
    private readonly floorAt: (x: number, z: number) => number,
    size = 0.01,
  ) {
    const geo = new THREE.BufferGeometry();
    for (let i = 0; i < this.max; i++) {
      this.pos[i * 3] = ports[0].pos.x;
      this.pos[i * 3 + 1] = ports[0].pos.y;
      this.pos[i * 3 + 2] = ports[0].pos.z;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setDrawRange(0, 0);
    const mat = new THREE.PointsMaterial({
      color: 0xcfe9fa,
      size,
      map: softDotTexture(),
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.object = new THREE.Points(geo, mat);
    this.object.frustumCulled = false;
    this.object.userData.noShadow = true;
    this.object.castShadow = false;
  }

  /** `flow` in L/min; `active` false stops the emission and clears the drops. */
  update(dt: number, flow: number, active: boolean): void {
    const step = Math.min(dt, 0.05);
    if (!active) this.live = 0;
    if (active && flow > 0.2) {
      this.carry += step * Math.min(1800, 120 + flow * 70);
      while (this.carry >= 1 && this.live < this.max) {
        this.carry -= 1;
        this.spawn(flow);
      }
      this.carry = Math.min(this.carry, 1);
    }
    for (let i = 0; i < this.live;) {
      const k = i * 3;
      this.vel[k + 1] -= 9.81 * step;
      this.pos[k] += this.vel[k] * step;
      this.pos[k + 1] += this.vel[k + 1] * step;
      this.pos[k + 2] += this.vel[k + 2] * step;
      this.life[i] -= step;
      if (this.life[i] <= 0 || this.pos[k + 1] < this.floorAt(this.pos[k], this.pos[k + 2])) this.remove(i);
      else i++;
    }
    this.object.geometry.setDrawRange(0, this.live);
    (this.object.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  /** Swap the last live drop into slot i (the dead drop keeps its last position, inside the valve). */
  private remove(i: number): void {
    const last = --this.live;
    if (i === last) return;
    for (let c = 0; c < 3; c++) {
      const a = i * 3 + c;
      const b = last * 3 + c;
      [this.pos[a], this.pos[b]] = [this.pos[b], this.pos[a]];
      [this.vel[a], this.vel[b]] = [this.vel[b], this.vel[a]];
    }
    [this.life[i], this.life[last]] = [this.life[last], this.life[i]];
  }

  private spawn(flow: number): void {
    const i = this.live++;
    const port = this.ports[Math.floor(Math.random() * this.ports.length)];
    const speed = 0.35 + 0.022 * flow + Math.random() * 0.15;
    const k = i * 3;
    const side = (Math.random() - 0.5) * 0.01;
    this.pos[k] = port.pos.x + port.dir.z * side;
    this.pos[k + 1] = port.pos.y + (Math.random() - 0.5) * 0.012;
    this.pos[k + 2] = port.pos.z - port.dir.x * side;
    this.vel[k] = port.dir.x * speed + (Math.random() - 0.5) * 0.12;
    this.vel[k + 1] = Math.random() * 0.25;
    this.vel[k + 2] = port.dir.z * speed + (Math.random() - 0.5) * 0.12;
    this.life[i] = 1.2;
  }
}
