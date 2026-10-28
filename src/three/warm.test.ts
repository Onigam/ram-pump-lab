import { GHOST, GHOST_WIRE } from '@onigam/lab-kit/three';
import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRamScene } from './ram/scene';
import { runningState, view } from './test-utils';

// The warm-up that builds the shader variants of the tools at idle (warm.ts). No GL context here: a stand-in renderer records
// what each of its draws sees (the section on, every part a ghost, every part a wire frame) and the world must come back as it was.

describe('warming up the shaders of the tools', () => {
  afterEach(() => vi.useRealTimers());

  it('draws the world once per tool, with the tool on, then restores everything it touched', () => {
    vi.useFakeTimers();
    const mod = createRamScene();
    const reg = mod.registry;
    mod.update(runningState(), 1 / 60, view());
    const flags = () =>
      [...reg.parts.values()].map((p) => [
        p.id,
        p.display,
        ...p.meshes.map((m) => [m.castShadow, m.visible, m.material]),
      ]);
    const before = flags();
    const caps: THREE.Mesh[] = [];
    mod.scene.traverse((o) => {
      if (o.userData.cap) caps.push(o as THREE.Mesh);
    });
    expect(caps.length).toBeGreaterThan(3);

    const seen: { target: unknown; capsOn: number; ghost: number; wire: number }[] = [];
    let target: THREE.WebGLRenderTarget | null = null;
    const renderer = {
      getRenderTarget: () => target,
      setRenderTarget: (t: THREE.WebGLRenderTarget | null) => void (target = t),
      render: () => {
        const meshes = [...reg.parts.values()].flatMap((p) => p.meshes);
        seen.push({
          target,
          capsOn: caps.filter((c) => c.visible).length,
          ghost: meshes.filter((m) => m.material === GHOST).length,
          wire: meshes.filter((m) => m.material === GHOST_WIRE).length,
        });
      },
    } as unknown as THREE.WebGLRenderer;

    mod.warm(renderer, new THREE.PerspectiveCamera());
    expect(seen).toHaveLength(0); // nothing happens in the middle of a call: it waits for an idle moment
    vi.runAllTimers();
    expect(seen).toHaveLength(3);
    const total = [...reg.parts.values()].reduce((n, p) => n + p.meshes.length, 0);
    expect(seen[0].capsOn).toBeGreaterThan(3); // the section: its caps are drawn
    expect(seen[1].ghost).toBe(total); // x-ray and isolate: every part a ghost
    expect(seen[2].wire).toBe(total); // the guide: every part a wire frame
    for (const s of seen) expect(s.target).toBeInstanceOf(THREE.WebGLRenderTarget); // never to the screen
    // and the world is as it was
    expect(target).toBeNull();
    expect(flags()).toEqual(before);
    expect(caps.filter((c) => c.visible)).toHaveLength(0);

    // once only
    mod.warm(renderer, new THREE.PerspectiveCamera());
    vi.runAllTimers();
    expect(seen).toHaveLength(3);
  });

  it('does nothing in the middle of a pass of the composer (a render target is set)', () => {
    vi.useFakeTimers();
    const mod = createRamScene();
    const render = vi.fn();
    const renderer = {
      getRenderTarget: () => ({}),
      setRenderTarget: vi.fn(),
      render,
    } as unknown as THREE.WebGLRenderer;
    mod.warm(renderer, new THREE.PerspectiveCamera());
    vi.runAllTimers();
    expect(render).not.toHaveBeenCalled();
  });
});
