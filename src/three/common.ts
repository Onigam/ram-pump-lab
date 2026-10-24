import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Small shared helpers of both worlds: lathe profiles, hex nuts, threaded rods, soft dots, water material, flow dots.
// Everything here builds geometry and materials only (no canvas, no GL context), so it runs in Node under vitest.

export const DEG = Math.PI / 180;
export const TAU = Math.PI * 2;

export const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** A profile is a polyline of (radius, height) points, revolved around the Y axis. */
export type Profile = [number, number][];

/**
 * Revolve several profile runs around Y and merge them. Each run is smooth inside; runs meet at crisp edges (plain
 * `LatheGeometry` averages the normals along the whole profile). Walk a closed profile counter-clockwise in (r, y) so
 * the faces look outwards: outer surface upwards, top rim inwards, bore downwards, bottom rim outwards.
 */
export function lathe(runs: Profile[], segments = 48): THREE.BufferGeometry {
  const parts = runs
    .filter((run) => run.length >= 2)
    .map(
      (run) =>
        new THREE.LatheGeometry(
          run.map(([r, y]) => new THREE.Vector2(r, y)),
          segments,
        ),
    );
  const merged = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
  if (parts.length > 1) parts.forEach((p) => p.dispose());
  return merged;
}

/** The consecutive segments of a closed polygon (r, y) as separate runs: a revolved solid with crisp edges. */
export function crispRuns(poly: Profile): Profile[] {
  const runs: Profile[] = [];
  for (let i = 0; i < poly.length; i++) runs.push([poly[i], poly[(i + 1) % poly.length]]);
  return runs;
}

/** Points along an ellipse arc, from angle a0 to a1 (radians), x = rx·cos, y = ry·sin, shifted by (cx, cy). */
export function arc(rx: number, ry: number, a0: number, a1: number, steps: number, cx = 0, cy = 0): Profile {
  const out: Profile = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return out;
}

/** Flat hexagonal ring (a nut) standing on Y, from y = 0 to `thickness`. Corners point along ±X. */
export function hexRing(acrossFlats: number, thickness: number, boreDiameter = 0): THREE.BufferGeometry {
  const R = acrossFlats / Math.sqrt(3);
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const x = R * Math.cos((i * Math.PI) / 3);
    const y = R * Math.sin((i * Math.PI) / 3);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  if (boreDiameter > 0) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, boreDiameter / 2, 0, TAU, true);
    shape.holes.push(hole);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 20 });
  g.rotateX(-Math.PI / 2);
  return g;
}

/** Round ring standing on Y from y = 0 to `height` (outer radius, bore radius), faces outwards. */
export function ring(outerR: number, innerR: number, height: number, segments = 40): THREE.BufferGeometry {
  return lathe(
    [
      [
        [innerR, 0],
        [outerR, 0],
      ],
      [
        [outerR, 0],
        [outerR, height],
      ],
      [
        [outerR, height],
        [innerR, height],
      ],
      [
        [innerR, height],
        [innerR, 0],
      ],
    ],
    segments,
  );
}

/** A threaded rod standing on Y from y = 0 to `length`: rings stand for the thread (pitch in metres). */
export function threadedRod(radius: number, length: number, pitch = 0.001, segments = 10): THREE.BufferGeometry {
  const depth = radius * 0.1;
  const steps = Math.max(2, Math.round(length / (pitch / 2)));
  const prof: Profile = [[0, 0]];
  for (let i = 0; i <= steps; i++) prof.push([radius - (i % 2 ? depth : 0), (length * i) / steps]);
  prof.push([0, length]);
  return new THREE.LatheGeometry(
    prof.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  );
}

/** Zigzag outline of a thread along Y, from y0 to y1 (a half pitch per tooth): outer radius `r`, root `r - depth`. */
export function zigzag(r: number, depth: number, y0: number, y1: number, pitch: number): Profile {
  const steps = Math.max(2, Math.round((y1 - y0) / (pitch / 2)));
  const out: Profile = [];
  for (let i = 0; i <= steps; i++) out.push([i % 2 === 0 || i === steps ? r : r - depth, y0 + ((y1 - y0) * i) / steps]);
  return out;
}

/**
 * Hex nut standing on Y from y = 0 to `thickness`, corners along ±X, with a small chamfer on the outline so that its edges
 * catch the light (`bore` is the diameter of the hole, 0 = solid).
 */
export function hexNut(acrossFlats: number, thickness: number, bore = 0, chamfer = 0.0004): THREE.BufferGeometry {
  const R = (acrossFlats - 2 * chamfer) / Math.sqrt(3);
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const x = R * Math.cos((i * Math.PI) / 3);
    const y = R * Math.sin((i * Math.PI) / 3);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  if (bore > 0) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, bore / 2 + chamfer, 0, TAU, true);
    shape.holes.push(hole);
  }
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: thickness - 2 * chamfer,
    bevelEnabled: true,
    bevelThickness: chamfer,
    bevelSize: chamfer,
    bevelSegments: 1,
    curveSegments: 20,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, chamfer, 0);
  return g;
}

/**
 * Drafting-table floor: a paper disc with a grid, as a DataTexture (no canvas, so it also builds in Node). `tile` is the
 * side of one texture tile in metres (eight cells of one fifth each), `radius` the radius of the disc.
 */
export function paperFloor(radius = 12, tile = 8, y = 0): THREE.Mesh {
  const N = 512;
  const data = new Uint8Array(N * N * 4);
  const cell = N / 8;
  for (let py = 0; py < N; py++) {
    for (let px = 0; px < N; px++) {
      const k = (py * N + px) * 4;
      let a = 0;
      const mx = px % cell;
      const my = py % cell;
      if (mx < 2 || my < 2) a = 0.16;
      else if (mx % (cell / 5) < 1 || my % (cell / 5) < 1) a = 0.06;
      // paper #efe6d3 mixed with the blue-grey ink of the grid
      data[k] = Math.round(239 * (1 - a) + 40 * a);
      data[k + 1] = Math.round(230 * (1 - a) + 60 * a);
      data[k + 2] = Math.round(211 * (1 - a) + 90 * a);
      data[k + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set((2 * radius) / tile, (2 * radius) / tile);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 64),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = y;
  floor.receiveShadow = true;
  floor.name = 'floor';
  return floor;
}

/** Soft round sprite (white, alpha falling to the edge) for dots and spray; a DataTexture, so no canvas is needed. */
export function softDotTexture(size = 32): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const d = Math.hypot((i + 0.5) / size - 0.5, (j + 0.5) / size - 0.5) * 2;
      const a = Math.max(0, 1 - d);
      const k = (j * size + i) * 4;
      data[k] = data[k + 1] = data[k + 2] = 255;
      data[k + 3] = Math.round(255 * Math.min(1, a * 1.8) * (a > 0 ? 1 : 0));
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

/** Water: a clear, slightly blue translucent material (there is no water material in the kit). */
export function waterMaterial(opacity = 0.5, color = 0x4d9fd1): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.25,
    metalness: 0,
    envMapIntensity: 0.35,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Flag a whole subtree as never casting shadows (water, overlays): the registry respects `userData.noShadow`. */
export function noShadow<T extends THREE.Object3D>(o: T): T {
  o.traverse((c) => {
    c.castShadow = false;
    c.userData.noShadow = true;
  });
  return o;
}

/** Move a registered part's rest position (the explode logic always rewrites `position` from `base`). */
export function setBase(entry: {
  base: THREE.Vector3;
  object: THREE.Object3D;
  explode: THREE.Vector3;
  factor: number;
}) {
  entry.object.position.copy(entry.base).addScaledVector(entry.explode, entry.factor);
}

// ------------------------------------------------------------------------------------------------ flow dots

/** A polyline with its cumulative length, to place a dot at a distance along it. */
export class DotPath {
  readonly cum: number[] = [0];
  constructor(readonly points: THREE.Vector3[]) {
    for (let i = 1; i < points.length; i++) this.cum.push(this.cum[i - 1] + points[i].distanceTo(points[i - 1]));
  }
  get length(): number {
    return this.cum[this.cum.length - 1];
  }
  at(u: number, out: THREE.Vector3): THREE.Vector3 {
    const L = this.length;
    if (L <= 0) return out.copy(this.points[0]);
    let d = u % L;
    if (d < 0) d += L;
    let lo = 0;
    let hi = this.cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.cum[mid] <= d) lo = mid;
      else hi = mid;
    }
    const seg = this.cum[hi] - this.cum[lo];
    const t = seg > 0 ? (d - this.cum[lo]) / seg : 0;
    return out.lerpVectors(this.points[lo], this.points[hi], t);
  }
}

export interface FlowDotsOptions {
  color: number;
  /** World size (metres) or, with `pixels`, screen size (pixels). */
  size: number;
  pixels?: boolean;
  opacity?: number;
  /** Draw through the walls (the "Flux" overlay). */
  throughWalls?: boolean;
}

/**
 * Dots that travel along polylines: the speed of each path is set every frame (signed: negative runs backwards).
 * Positions only; the dots are decoration of a flow whose size is given by the simulation, not data.
 */
export class FlowDots {
  readonly object: THREE.Points;
  private readonly paths: { path: DotPath; offset: number[]; first: number }[] = [];
  private readonly pos: Float32Array;
  private total = 0;
  private readonly tmp = new THREE.Vector3();
  private geometry: THREE.BufferGeometry;

  constructor(
    private readonly max: number,
    opts: FlowDotsOptions,
  ) {
    this.pos = new Float32Array(max * 3);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    const mat = new THREE.PointsMaterial({
      color: opts.color,
      size: opts.size,
      sizeAttenuation: !opts.pixels,
      map: softDotTexture(),
      transparent: true,
      opacity: opts.opacity ?? 0.9,
      depthWrite: false,
      depthTest: !opts.throughWalls,
    });
    this.object = new THREE.Points(this.geometry, mat);
    this.object.frustumCulled = false;
    this.object.renderOrder = opts.throughWalls ? 20 : 4;
    this.object.userData.noShadow = true;
    this.object.castShadow = false;
    this.object.visible = false;
    this.geometry.setDrawRange(0, 0);
  }

  /** Add a path with `count` dots spread evenly along it; returns its index. */
  addPath(points: THREE.Vector3[], count: number): number {
    const path = new DotPath(points);
    const n = Math.max(1, Math.min(count, this.max - this.total));
    const offset: number[] = [];
    for (let i = 0; i < n; i++) offset.push((path.length * i) / n);
    this.paths.push({ path, offset, first: this.total });
    this.total += n;
    this.geometry.setDrawRange(0, this.total);
    this.place();
    return this.paths.length - 1;
  }

  /** Replace the geometry of a path (the dots keep their relative places). */
  setPath(index: number, points: THREE.Vector3[]): void {
    const p = this.paths[index];
    const old = p.path;
    p.path = new DotPath(points);
    if (old.length > 0 && p.path.length > 0) {
      const k = p.path.length / old.length;
      p.offset = p.offset.map((u) => u * k);
    }
  }

  advance(index: number, speed: number, dt: number): void {
    const p = this.paths[index];
    const L = p.path.length;
    if (L <= 0) return;
    for (let i = 0; i < p.offset.length; i++) {
      let u = p.offset[i] + speed * dt;
      u %= L;
      if (u < 0) u += L;
      p.offset[i] = u;
    }
  }

  /** Write the positions after all `advance` calls of a frame. */
  place(): void {
    for (const p of this.paths) {
      for (let i = 0; i < p.offset.length; i++) {
        p.path.at(p.offset[i], this.tmp);
        const k = (p.first + i) * 3;
        this.pos[k] = this.tmp.x;
        this.pos[k + 1] = this.tmp.y;
        this.pos[k + 2] = this.tmp.z;
      }
    }
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  get material(): THREE.PointsMaterial {
    return this.object.material as THREE.PointsMaterial;
  }
}
