import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CATCHMENT_SHADOW, catchmentShadowDistance } from './catchment/scene';
import { OUT_X, OUT_Y } from './catchment/layout';
import { fitShadow, newFit, viewDistance, type FitOptions } from './shadow-fit';
import { DEFAULT_PARAMS, PIT_X } from './site/layout';
import { SITE_SHADOW } from './site/shadow';
import { createSiteScene } from './site/scene';
import { buildTerrain } from './site/terrain';

// The sun's shadow box of the site and of the catchment follows the camera. The film found the shadows of a whole hillside
// changing sharpness from one frame to the next in slow camera moves (the box took sizes by steps of 30 %, at a distance found by
// steps of 7 %): the box must now change a little at every step of a slow move, never by a jump, be a function of the camera
// alone, and stay as tight as it was at the ram.

const terrain = buildTerrain(DEFAULT_PARAMS);
const siteGround = (x: number, z: number) => terrain.surfaceY(x, z);

interface Pose {
  position: THREE.Vector3;
  target: THREE.Vector3;
}
const V = (a: number[]) => new THREE.Vector3(a[0], a[1], a[2]);

/** The fit for a camera at `position` looking at `target` (no roll), as the scene computes it from a camera. */
function fitFor(p: Pose, ground: (x: number, z: number) => number, opts: FitOptions) {
  const cam = new THREE.PerspectiveCamera(40, 16 / 9, 0.01, 2000);
  cam.position.copy(p.position);
  cam.lookAt(p.target);
  cam.updateMatrixWorld(true);
  const dir = cam.getWorldDirection(new THREE.Vector3());
  const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0).normalize();
  const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1).normalize();
  return fitShadow(cam.position, dir, right, up, ground, opts, newFit());
}

/** The largest relative change of the half size, and the largest move of the focus per metre of distance, along a camera path. */
function worstStep(
  path: (k: number) => Pose,
  steps: number,
  ground: (x: number, z: number) => number,
  opts: FitOptions,
) {
  let prev = fitFor(path(0), ground, opts);
  let size = 0;
  let move = 0;
  for (let i = 1; i <= steps; i++) {
    const f = fitFor(path(i / steps), ground, opts);
    size = Math.max(size, Math.abs(Math.log(f.half / prev.half)));
    move = Math.max(move, f.focus.distanceTo(prev.focus) / f.distance);
    prev = f;
  }
  return { size, move };
}

const ease = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const linear = (a: Pose, b: Pose) => (k: number) => ({
  position: a.position.clone().lerp(b.position, ease(k)),
  target: a.target.clone().lerp(b.target, ease(k)),
});
const dolly = (a: Pose, factor: number) => (k: number) => {
  const d = a.position.clone().sub(a.target);
  return { position: a.target.clone().addScaledVector(d, Math.pow(factor, ease(k))), target: a.target.clone() };
};
const orbit = (target: THREE.Vector3, distance: number, elevation: number, turn: number) => (k: number) => {
  const az = turn * k;
  const c = Math.cos(elevation);
  return {
    position: target
      .clone()
      .add(new THREE.Vector3(Math.sin(az) * c, Math.sin(elevation), Math.cos(az) * c).multiplyScalar(distance)),
    target: target.clone(),
  };
};

describe('the shadow box of the site', () => {
  // the film's moves where the shadows jumped (O01 at 0:16.40, S04 and S25 at 1:00.13 and 3:11.63), then an orbit and a tilt
  const O01 = linear(
    { position: V([40, 30, 212]), target: V([10, 155, -170]) },
    { position: V([34, 66, 186]), target: V([10, 56, -170]) },
  );
  const S04 = dolly({ position: V([27.5356, 65.0148, -148.9886]), target: V([36, 62.8275, -168]) }, 0.92);

  // the old box changed by steps of 30 % (a log step of 0.26): the new one changes by a tenth of that at most, in a move of one
  // frame (rendered frame by frame, the film's moves now show no frame that differs from its neighbours more than 1.1 times)
  it('changes by less than 3 % of its size between two frames of the slow moves of the film', () => {
    // O01 lasts 641 frames, S04 184: one step per frame
    for (const [name, path, frames] of [
      ['O01', O01, 641],
      ['S04', S04, 184],
    ] as const) {
      const w = worstStep(path, frames, siteGround, SITE_SHADOW);
      expect(w.size, name).toBeLessThan(0.03);
      expect(w.move, name).toBeLessThan(0.05);
    }
  });

  it('changes smoothly in an orbit round the pit and in a tilt from the sky down to the ram', () => {
    // a turn in 900 frames (30 s); on the north side the camera skims 2 m over the hill, where the box changes fastest
    const pit = V([PIT_X, 0.85, 0]);
    const w1 = worstStep(orbit(pit, 60, 0.35, Math.PI * 2), 900, siteGround, SITE_SHADOW);
    expect(w1.size).toBeLessThan(0.03);
    // 55 degrees of tilt in 40 s (1200 frames): at most 2 degrees a second, about the pace of the film's opening
    const tilt = linear(
      { position: V([-30, 40, 90]), target: V([0, 120, -60]) },
      { position: V([-30, 40, 90]), target: pit },
    );
    const w2 = worstStep(tilt, 1200, siteGround, SITE_SHADOW);
    expect(w2.size).toBeLessThan(0.03);
  });

  it('is a function of the camera alone: the same camera gives the same box, whatever came before', () => {
    const a = { position: V([-20, 12, 30]), target: V([0, 0.85, 0]) };
    const first = fitFor(a, siteGround, SITE_SHADOW);
    fitFor({ position: V([300, 200, 400]), target: V([0, 0, 0]) }, siteGround, SITE_SHADOW);
    const again = fitFor(a, siteGround, SITE_SHADOW);
    expect(again.half).toBe(first.half);
    expect(again.focus.toArray()).toEqual(first.focus.toArray());
  });

  it('is as tight at the ram as it ever was: 10 m half size (the old smallest step was 10.6 m)', () => {
    const pit = V([PIT_X, 0.4, 0]);
    for (const d of [3, 6, 10, 14]) {
      for (const el of [0.25, 0.6, 1.1]) {
        for (const az of [0, 1.5, 3, 4.5]) {
          const f = fitFor(orbit(pit, d, el, az)(1), siteGround, SITE_SHADOW);
          expect(f.half, `${d} m, ${el} rad, ${az} rad`).toBe(SITE_SHADOW.halfMin);
        }
      }
    }
  });

  it('finds the ground a ray meets to the centimetre (a single ray, without its fan)', () => {
    // aimed at the flat pad beside the pit (between two steps the clearance is taken as linear: exact on a plane)
    const pos = V([PIT_X - 15, 30, 25]);
    const dir = V([PIT_X + 2, 0.85, 3])
      .sub(pos)
      .normalize();
    const t = viewDistance(pos, dir, siteGround, { ...SITE_SHADOW, soft: 0 });
    const hit = pos.clone().addScaledVector(dir, t);
    expect(Math.abs(hit.y - terrain.surfaceY(hit.x, hit.z))).toBeLessThan(0.01);
  });

  it('is aimed by the draw itself, at the camera of that draw, before the shadow pass', () => {
    const site = createSiteScene();
    let sun: THREE.DirectionalLight | null = null;
    site.scene.traverse((o) => {
      if ((o as THREE.DirectionalLight).isDirectionalLight && o.castShadow) sun = o as THREE.DirectionalLight;
    });
    const light = sun as unknown as THREE.DirectionalLight;
    const cam = new THREE.PerspectiveCamera(40, 16 / 9, 0.01, 2000);
    cam.position.set(PIT_X - 6, 9, 7);
    cam.lookAt(PIT_X, 0, 0);
    cam.updateMatrixWorld(true);
    site.scene.onBeforeRender(
      null as unknown as THREE.WebGLRenderer,
      site.scene,
      cam,
      null as unknown as THREE.BufferGeometry,
      null as unknown as THREE.Material,
      null as unknown as THREE.Group,
    );
    const half = light.shadow.camera.right;
    expect(half).toBe(SITE_SHADOW.halfMin);
    // the box is centred near what the camera looks at (snapped to a texel), and the light's matrices are up to date
    const target = new THREE.Vector3().setFromMatrixPosition(light.target.matrixWorld);
    const focus = fitFor(
      { position: cam.position, target: V([PIT_X, 0, 0]) },
      (x, z) => site.surfaceY(x, z),
      SITE_SHADOW,
    ).focus;
    const toLight = new THREE.Vector3().setFromMatrixPosition(light.matrixWorld).sub(target).normalize();
    // compared across the light direction (the snap and the light's distance move it along that direction)
    const off = target.clone().sub(focus);
    off.addScaledVector(toLight, -off.dot(toLight));
    expect(off.length()).toBeLessThan((2 * half) / 2048 + 1e-6);
  });
});

describe('the shadow box of the catchment', () => {
  const C = CATCHMENT_SHADOW;
  const halfFor = (p: Pose) => {
    const dir = p.target.clone().sub(p.position).normalize();
    const t = catchmentShadowDistance(p.position, dir);
    return Math.min(C.halfMax, Math.max(C.halfMin, t * C.halfPerMetre));
  };
  const worst = (path: (k: number) => Pose, steps: number) => {
    let prev = halfFor(path(0));
    let w = 0;
    for (let i = 1; i <= steps; i++) {
      const h = halfFor(path(i / steps));
      w = Math.max(w, Math.abs(Math.log(h / prev)));
      prev = h;
    }
    return w;
  };

  it('changes smoothly in the dolly of the film (S17), in an orbit round the tank and in a crane down to the valve', () => {
    const S17 = dolly({ position: V([0.8956, 5.0973, 15.6914]), target: V([-1.904, 1.6704, -0.1859]) }, 0.94);
    expect(worst(S17, 200)).toBeLessThan(0.015);
    expect(worst(orbit(V([0, 1, 0]), 7, 0.3, Math.PI * 2), 900)).toBeLessThan(0.015);
    // from high above the tank down to a low view of the gate valve, through the plane of the work
    const crane = linear(
      { position: V([4, 6, 4]), target: V([OUT_X + 0.25, OUT_Y, 0]) },
      { position: V([2.8, 0.35, 1.2]), target: V([OUT_X + 0.25, OUT_Y, 0]) },
    );
    expect(worst(crane, 300)).toBeLessThan(0.03);
  });

  it('is no larger than it was: 2.2 m half size at the gate valve, at most 10.6 m', () => {
    const valve = V([OUT_X + 0.25, OUT_Y, 0]);
    for (const d of [0.6, 1.2, 2]) expect(halfFor(orbit(valve, d, 0.4, 0.8)(1))).toBe(C.halfMin);
    expect(halfFor({ position: V([20, 12, 30]), target: V([-2, 1, 0]) })).toBe(C.halfMax);
    // the view of the film's S18 and S24 (the tank): 7.5 m, where the old steps gave 8.2 m
    expect(halfFor({ position: V([1.5194, 2.8439, 8.6171]), target: V([0, 0.984, 0]) })).toBeLessThan(8.16);
  });
});
