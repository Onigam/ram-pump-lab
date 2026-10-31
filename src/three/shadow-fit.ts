import * as THREE from 'three';
import { clamp } from '@onigam/lab-kit/three';

// The sun's shadow box of the outdoor worlds (site, catchment) follows what the camera looks at: a tight box close to the parts,
// a wide one over the landscape. Its size and its place are a continuous function of the camera, and of the camera alone (the
// film draws the lab frame by frame and relies on it): a slow orbit, dolly or tilt changes the box a little at every frame,
// never by a step. (The box used to take sizes by steps of 30 %, and its distance was found by a march in steps of 7 %: in a
// slow camera move the shadows of a whole hillside changed sharpness from one frame to the next.)

export interface FitOptions {
  /** The view rays are followed from `near` to `far` metres, in steps that grow by `growth`. */
  near: number;
  far: number;
  growth: number;
  /** Half size of the box per metre of distance to what the camera looks at, and its limits, metres. */
  halfPerMetre: number;
  halfMin: number;
  halfMax: number;
  /**
   * The middle of the picture the box is sized on: rays at these angles (degrees) above and beside the view axis. A crest the
   * view comes down over is met by one row after the other, each with a part of the weight, so the box changes size over a few
   * degrees of tilt rather than in the frame where the axis touches the crest.
   */
  rows: number[];
  columns: number[];
  /**
   * Each ray is a thin fan of this half angle, degrees (the share of a step above the ground is averaged over five tilts of the
   * ray): a crest is passed over gradually, over twice that angle of tilt.
   */
  soft: number;
}

/** Share of a step of a ray that lies above the ground, the clearance being linear between its two ends. */
function above(h0: number, h1: number): number {
  if (h0 >= 0 && h1 >= 0) return 1;
  if (h0 <= 0 && h1 <= 0) return 0;
  return h0 > 0 ? h0 / (h0 - h1) : h1 / (h1 - h0);
}

/** Tilts of the thin fan of a ray, in parts of its half angle. */
const FAN = [-1, -0.5, 0, 0.5, 1];
const fanThrough = new Float64Array(FAN.length);
const fanDist = new Float64Array(FAN.length);

/**
 * Distance from the camera to the ground a ray meets, as a continuous function of the ray. The ray is followed in steps; each
 * step lets through the share of its length that lies above the ground, and what has got through so far weighs the rest. A ray
 * that meets a slope stops on it (the plain first hit, to the centimetre when `soft` is 0); a ray that only grazes a crest loses
 * part of its weight there, so that the distance slides from the slope behind the crest to the crest itself while the ray comes
 * down, instead of jumping from one to the other. With `soft`, the ray is a thin vertical fan of five rays (tilting a ray by a
 * small angle a moves its height by a·t: the five share the ground heights of the middle one) and the distance is their
 * harmonic mean, so that a crest is passed over across the angle of the fan. A ray that meets nothing gives `far`.
 */
export function viewDistance(
  pos: THREE.Vector3,
  dir: THREE.Vector3,
  ground: (x: number, z: number) => number,
  opts: Pick<FitOptions, 'near' | 'far' | 'growth'> & { soft?: number },
): number {
  const { near, far, growth } = opts;
  const fan = Math.tan(((opts.soft ?? 0) * Math.PI) / 180);
  const n = fan === 0 ? 1 : FAN.length;
  let t0 = near;
  let h0 = pos.y + dir.y * t0 - ground(pos.x + dir.x * t0, pos.z + dir.z * t0);
  fanThrough.fill(1);
  fanDist.fill(near);
  let alive = 1;
  while (t0 < far && alive > 1e-5) {
    const t1 = Math.min(far, t0 * growth);
    const h1 = pos.y + dir.y * t1 - ground(pos.x + dir.x * t1, pos.z + dir.z * t1);
    alive = 0;
    for (let k = 0; k < n; k++) {
      const tilt = n === 1 ? 0 : FAN[k] * fan;
      const share = above(h0 + tilt * t0, h1 + tilt * t1);
      fanDist[k] += fanThrough[k] * share * (t1 - t0);
      fanThrough[k] *= share;
      alive = Math.max(alive, fanThrough[k]);
    }
    t0 = t1;
    h0 = h1;
  }
  // the harmonic mean of the fan, like that of the bundle: a ray of the fan that slides far along a slope it barely clears
  // weighs little
  let inverse = 0;
  for (let k = 0; k < n; k++) inverse += 1 / fanDist[k];
  return n / inverse;
}

export interface ShadowFit {
  /** Centre of the box: on the view axis, at `distance`. */
  focus: THREE.Vector3;
  /** Half size of the box, metres. */
  half: number;
  /** Distance from the camera to what it looks at, metres. */
  distance: number;
}

export const newFit = (): ShadowFit => ({ focus: new THREE.Vector3(), half: 0, distance: 0 });

const ray = new THREE.Vector3();

/**
 * The shadow box for a camera: its position, its unit view direction and its unit right and up vectors (the columns of its world
 * matrix), over a ground given by its height. The distance is the harmonic mean of the distances of the rays of the bundle (the
 * near ground, where a texel is biggest on screen, weighs most; a ray that meets nothing weighs almost nothing); the box is
 * centred on the view axis at that distance, with a half size proportional to it.
 */
export function fitShadow(
  pos: THREE.Vector3,
  dir: THREE.Vector3,
  right: THREE.Vector3,
  up: THREE.Vector3,
  ground: (x: number, z: number) => number,
  opts: FitOptions,
  out: ShadowFit = newFit(),
): ShadowFit {
  let inverse = 0;
  for (const v of opts.rows) {
    for (const h of opts.columns) {
      ray
        .copy(dir)
        .addScaledVector(up, Math.tan((v * Math.PI) / 180))
        .addScaledVector(right, Math.tan((h * Math.PI) / 180))
        .normalize();
      inverse += 1 / viewDistance(pos, ray, ground, opts);
    }
  }
  const t = (opts.rows.length * opts.columns.length) / inverse;
  out.distance = t;
  out.focus.copy(pos).addScaledVector(dir, t);
  out.half = clamp(t * opts.halfPerMetre, opts.halfMin, opts.halfMax);
  return out;
}

/** The pose of a camera as `fitShadow` takes it. */
export interface CameraPose {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  right: THREE.Vector3;
  up: THREE.Vector3;
}

export function cameraPose(camera: THREE.Camera, out: CameraPose): CameraPose {
  camera.getWorldPosition(out.position);
  camera.getWorldDirection(out.direction);
  out.right.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
  out.up.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
  return out;
}

/**
 * Call `aim` with the camera of every draw of `scene`, before its shadow pass (the renderer calls a scene's `onBeforeRender`
 * after it has updated the world matrices and before it draws the shadow maps; `aim` must update the matrices of what it moves).
 * The first frame after a cut then already has the shadows of its own view. The shadow pass itself draws with orthographic
 * cameras: only perspective cameras are followed.
 */
export function aimOnDraw(scene: THREE.Scene, pose: CameraPose, aim: () => void): void {
  const before = scene.onBeforeRender;
  // a scene's hook gets (renderer, scene, camera, render target): the target arrives in the place of `geometry`
  scene.onBeforeRender = function (renderer, s, camera, geometry, material, group) {
    before.call(this, renderer, s, camera, geometry, material, group);
    if (!(camera as THREE.PerspectiveCamera).isPerspectiveCamera) return;
    cameraPose(camera, pose);
    aim();
  };
}
