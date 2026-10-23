import * as THREE from 'three';
import { CHAMBER, FITTINGS, RAM, VALVE } from '../dims';
import { FlowDots, TAU, lathe, noShadow, softDotTexture, waterMaterial, type Profile } from '../common';
import { CHECK_BASE_Y, CH, type ChamberGeometry } from './chamber';
import { PLATE_TOP_Y } from './wastegeo';
import { S_X0, STUB_X0 } from './inlet';
import type { RamCtx } from './ctx';

// Water in the ram: the volumes that fill the cavities (seen through the section or the x-ray), the stream through the
// open waste valve, the spray out of its ports, and the "Flux" dots. Sizes of the motion come from RamState only.

const BORE_WATER = RAM.bodyInnerRadius - 0.0004;
const PORT_Y = PLATE_TOP_Y + VALVE.portBottom + VALVE.portHeight / 2;
const SEAT_Y_ABS = PLATE_TOP_Y + VALVE.nippleBottom;
/** Radius of the ports' outer wall, where the jets leave. */
const PORT_R = VALVE.threadDiameter / 2;

export interface RamWater {
  group: THREE.Group;
  /** Ports of the nipple: position and outward direction (frame of the ram root). */
  ports: { pos: THREE.Vector3; dir: THREE.Vector3 }[];
}

export function buildWater(ctx: RamCtx, chamber: ChamberGeometry, checkWater: Profile): RamWater {
  const group = new THREE.Group();
  group.name = 'water';
  const mat = waterMaterial(0.5);
  const chamberMat = waterMaterial(0.5);
  const surfaceMat = waterMaterial(0.7, 0x7fc0e8);

  // main bore
  const bore = new THREE.Mesh(new THREE.CylinderGeometry(BORE_WATER, BORE_WATER, RAM.bodyLength, 40, 1, false), mat);
  bore.rotation.z = Math.PI / 2;
  bore.position.x = RAM.bodyLength / 2;
  group.add(bore);

  // column of the waste valve up to the seat
  const column: Profile = [
    [0, 0.02],
    [0.0126, 0.02],
    [0.0126, PLATE_TOP_Y + 0.026],
    [0.0098, PLATE_TOP_Y + 0.034],
    [0.0098, SEAT_Y_ABS],
    [0, SEAT_Y_ABS],
  ];
  const col = new THREE.Mesh(lathe([column], 36), mat);
  col.position.x = RAM.xWaste;
  group.add(col);

  // stream through the open valve: from the seat to the ports (opacity follows the jet)
  const streamMat = waterMaterial(0.6, 0x62b0e0);
  const stream = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0066, 0.0066, PORT_Y - SEAT_Y_ABS, 20, 1, true),
    streamMat,
  );
  stream.position.set(RAM.xWaste, (PORT_Y + SEAT_Y_ABS) / 2, 0);
  group.add(stream);
  ctx.rig.wasteStream = stream;
  ctx.rig.wasteStreamMaterial = streamMat;

  // delivery valve cavity and neck
  const check = new THREE.Mesh(lathe([checkWater], 36), mat);
  check.position.set(RAM.xDelivery, CHECK_BASE_Y, 0);
  group.add(check);

  // air chamber: interior cut by a horizontal level plane
  const level = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1);
  ctx.rig.levelPlane = level;
  const inner = new THREE.Mesh(chamber.interior, chamberMat);
  inner.position.set(RAM.xDelivery, CHAMBER.shellBottom, 0);
  group.add(inner);
  const surface = new THREE.Mesh(new THREE.CircleGeometry(1, 48), surfaceMat);
  surface.rotation.x = -Math.PI / 2;
  surface.position.set(RAM.xDelivery, CHAMBER.shellBottom, 0);
  group.add(surface);
  ctx.rig.surface = surface;
  ctx.rig.chamberInner = {
    yBottom: chamber.innerUp[1][1],
    height: chamber.yTop - chamber.innerUp[1][1],
    radiusAt: (y: number) => {
      const pts = chamber.innerUp;
      for (let i = 1; i < pts.length; i++) {
        const [r0, y0] = pts[i - 1];
        const [r1, y1] = pts[i];
        if (y >= y0 && y <= y1 && y1 > y0) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
      }
      return pts[pts.length - 1][0];
    },
  };

  noShadow(group);
  group.renderOrder = 3;
  ctx.cut.clip(bore);
  ctx.cut.clip(surface);
  ctx.cut.clip(stream);
  ctx.cut.clip(inner, [level]);
  ctx.rig.water = group;

  const ports: RamWater['ports'] = [];
  for (let i = 0; i < VALVE.portCount; i++) {
    const a = (i * TAU) / VALVE.portCount; // angle from +Z towards +X, like the nipple's ports
    const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    ports.push({ pos: new THREE.Vector3(RAM.xWaste, PORT_Y, 0).addScaledVector(dir, PORT_R), dir });
  }
  return { group, ports };
}

// ------------------------------------------------------------------------------------------------ spray

/** Height of whatever catches a drop falling at (x, z): the base plate, the body or the floor. */
export function dropFloor(x: number, z: number): number {
  const dx = Math.abs(x - RAM.xWaste);
  if (dx < VALVE_PLATE_HALF && Math.abs(z) < VALVE_PLATE_HALF) return PLATE_TOP_Y + 0.008;
  if (x > 0 && x < RAM.bodyLength && Math.abs(z) < RAM.bodyOuterRadius) {
    return Math.sqrt(RAM.bodyOuterRadius ** 2 - z * z);
  }
  return RAM.floorY;
}
const VALVE_PLATE_HALF = VALVE.basePlateSide / 2;

/**
 * Drops thrown out of the four ports and falling under gravity. Cheap Points; the rate follows the jet flow. Live drops are
 * kept at the start of the arrays and only they are drawn, so every vertex always stays inside the ram's own bounds.
 */
export class Spray {
  readonly object: THREE.Points;
  private readonly max = 700;
  private readonly pos = new Float32Array(this.max * 3);
  private readonly vel = new Float32Array(this.max * 3);
  private readonly life = new Float32Array(this.max);
  private live = 0;
  private carry = 0;

  constructor(
    private readonly ports: RamWater['ports'],
    private readonly floorAt: (x: number, z: number) => number = dropFloor,
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
      size: 0.01,
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

  /** Swap the last live drop into slot i (the dead drop keeps its last position, inside the ram). */
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

// ------------------------------------------------------------------------------------------------ "Flux" dots

export interface RamFlows {
  water: FlowDots;
  air: FlowDots;
  drive: number;
  waste: number;
  inflow: number;
  outflow: number;
  snifter: number;
}

/** Paths of the water and of the snifter air through the ram, in the frame of the root. Speeds come from the state. */
export function buildFlows(): RamFlows {
  const water = new FlowDots(420, { color: 0x1c7fe0, size: 0.012, throughWalls: true, opacity: 0.95 });
  const air = new FlowDots(30, { color: 0xffffff, size: 0.01, throughWalls: true, opacity: 0.95 });
  const v = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);
  const drive = water.addPath([v(STUB_X0 + 0.03, 0), v(S_X0 + 0.1, 0), v(0, 0), v(RAM.xWaste, 0)], 40);
  const x = RAM.xWaste + 0.0035;
  const waste = water.addPath(
    [v(RAM.xWaste, 0), v(RAM.xWaste, PLATE_TOP_Y + 0.02), v(x, SEAT_Y_ABS + 0.004), v(x, PORT_Y), v(x, PORT_Y, 0.03)],
    22,
  );
  const inflow = water.addPath(
    [v(RAM.xDelivery, 0), v(RAM.xDelivery, CHECK_BASE_Y + 0.05), v(RAM.xDelivery, CHAMBER.shellBottom + 0.05)],
    18,
  );
  const xOutEnd = RAM.xDelivery + CH.R + 0.009 + 0.04 + FITTINGS.smallBallValveLength + FITTINGS.outletStubLength;
  const outflow = water.addPath([v(RAM.xDelivery, CHAMBER.outletHeight), v(xOutEnd, CHAMBER.outletHeight)], 26);
  const snifter = air.addPath([v(RAM.xSnifter, 0.115), v(RAM.xSnifter, 0), v(RAM.xSnifter + 0.03, -0.01)], 8);
  return { water, air, drive, waste, inflow, outflow, snifter };
}
