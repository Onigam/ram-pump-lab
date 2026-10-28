import * as THREE from 'three';
import type { SceneModule, ViewOpts } from '@onigam/lab-kit/three';
import type { RamState } from '../sim/types';

// The first use of the section tool, of X-ray or of isolate compiles shaders in the middle of the interaction: a clipped
// material, the translucent ghost material and the wire frame are programs the renderer has not built yet (in the catchment
// the first "Coupe" adds 17 programs, 514 ms in a software renderer, a visible hitch on a phone). `installWarmup` builds them
// at the first idle moment after a world is shown, by drawing the world once into a tiny render target in each of those states
// (section and flows on, every part a ghost, every part a wire frame) and putting everything back. It needs nothing from the
// kit: the renderer and the camera are read from the first draw of a mesh of the world. The module also gets a `warm()` that
// a host can call at a moment of its own choosing (a kit that offered `module.prepare(renderer, camera)` would call it).

export interface Warmable {
  /** Compile the shader variants of the tools now (once per renderer; calling it again does nothing). */
  warm(renderer: THREE.WebGLRenderer, camera: THREE.Camera): void;
  /** True once every variant is built (the tests and the profiling scripts wait for it). */
  readonly warmed: boolean;
}

/** True once the variants of this renderer are built (a module is drawn by one renderer). */
const done = new WeakSet<SceneModule<RamState>>();
const finished = new WeakSet<SceneModule<RamState>>();

const later = (fn: () => void): void => {
  const w = globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(fn, { timeout: 4000 });
  else setTimeout(fn, 800);
};

/**
 * Add `warm()` to the module and run it on its own at the first idle moment after the module is drawn. `probes` are meshes of
 * the world that are drawn whenever it is shown (the floor, the ground): the first of them to be drawn hands over the renderer
 * and the camera. Call it last, after the module's own `onBeforeRender` hooks are in place (they are kept).
 */
export function installWarmup<M extends SceneModule<RamState>>(mod: M, probes: THREE.Object3D[]): M & Warmable {
  // what the module was last asked to draw: the warm-up draws the same world, only with the tools on
  let lastState: RamState | null = null;
  let lastView: ViewOpts | null = null;
  const update = mod.update.bind(mod);
  mod.update = (state, dt, view) => {
    lastState = state;
    lastView = view;
    update(state, dt, view);
  };

  const warm = (renderer: THREE.WebGLRenderer, camera: THREE.Camera): void => {
    if (done.has(mod) || renderer.getRenderTarget() !== null) return;
    done.add(mod);
    const reg = mod.registry;
    const target = new THREE.WebGLRenderTarget(8, 8, { type: THREE.HalfFloatType });
    const draw = (): void => {
      renderer.setRenderTarget(target);
      renderer.render(mod.scene, camera);
      renderer.setRenderTarget(null);
    };
    const withDisplay = (display: 'ghost' | 'wire'): void => {
      // `setDisplay` rewrites `castShadow` and `visible` of every mesh of a part: put them back as they were
      const before = [...reg.parts.values()].map((p) => [p.id, p.display] as const);
      const flags = new Map<THREE.Mesh, [boolean, boolean]>();
      for (const p of reg.parts.values()) for (const m of p.meshes) flags.set(m, [m.castShadow, m.visible]);
      reg.setAllDisplay(display);
      try {
        draw();
      } finally {
        for (const [id, d] of before) reg.setDisplay(id, d);
        for (const [m, [cast, visible]] of flags) {
          m.castShadow = cast;
          m.visible = visible;
        }
      }
    };
    // three short steps, so that none of them holds the thread for long
    const steps: (() => void)[] = [
      () => {
        // the section and the flows ("Coupe", "Flux"): clipped materials, the caps, the dots
        // (the wrapper of `update` remembers whatever it is given: keep the view of the visitor in hand)
        const state = lastState;
        const shown = lastView;
        if (state && shown) {
          mod.update(state, 0, { ...shown, cutaway: true, schematic: true });
          try {
            draw();
          } finally {
            mod.update(state, 0, shown);
          }
        } else draw();
      },
      () => withDisplay('ghost'),
      () => withDisplay('wire'),
    ];
    const next = (): void => {
      const step = steps.shift();
      if (!step) {
        target.dispose();
        finished.add(mod);
        return;
      }
      step();
      later(next);
    };
    later(next);
  };

  // the first draw of a probe gives the renderer and the camera; the warm-up runs when the thread is idle
  let armed = false;
  let seen = 0;
  for (const probe of probes) {
    const previous = probe.onBeforeRender;
    probe.onBeforeRender = function (renderer, scene, camera, geometry, material, group) {
      previous.call(this, renderer, scene, camera, geometry, material, group);
      if (!(camera as THREE.PerspectiveCamera).isPerspectiveCamera) return;
      seen = performance.now();
      if (armed || done.has(mod)) return;
      armed = true;
      const attempt = (retries: number): void => {
        // still on screen (a world that was left meanwhile is warmed when it is shown again)
        if (performance.now() - seen < 1500) warm(renderer, camera);
        else if (retries > 0) later(() => attempt(retries - 1));
        else armed = false;
      };
      later(() => attempt(2));
    };
  }
  Object.defineProperty(mod, 'warmed', { get: () => finished.has(mod) });
  return Object.assign(mod, { warm }) as M & Warmable;
}
