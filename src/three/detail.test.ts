import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createCatchmentScene } from './catchment/scene';
import { FlowDots, dotAlpha, dotFade } from './common';
import { buildStones, contactShadow, layStones, stoneGeometry } from './detail';
import { FOUNDATION_BOTTOM } from './ram/foundation';
import { createRamScene } from './ram/scene';
import { createGround } from './site/layout';
import { VIEW_HEIGHT, trackViewHeight } from './site/pipes';
import { createSiteScene, type SiteScene } from './site/scene';
import { createValveScene } from './valve';

// The picture's detail and steadiness (kit 0.5): the stones rest in the ground, the far slopes carry no noise finer than their
// grid (the stripes of the film), the flow dots fade at the ends of their paths, the pipes' width follows the view, the worlds
// ask for their tone, the contact shadows lie on their floors, the parts are worn.

const site = createSiteScene() as SiteScene;
const stonesOf = (s: SiteScene) => s.scene.getObjectByName('stones') as THREE.Group;

describe('stones of the site', () => {
  const group = stonesOf(site);
  const meshes = group.children as THREE.InstancedMesh[];
  const all: { pos: THREE.Vector3; box: THREE.Box3; size: number }[] = [];
  const m = new THREE.Matrix4();
  for (const mesh of meshes) {
    mesh.geometry.computeBoundingBox();
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, m);
      const box = mesh.geometry.boundingBox!.clone().applyMatrix4(m);
      all.push({
        pos: new THREE.Vector3().setFromMatrixPosition(m),
        box,
        size: new THREE.Vector3().setFromMatrixScale(m).x,
      });
    }
  }

  it('are a few groups, not a scatter of pebbles', () => {
    expect(all.length).toBeGreaterThan(20);
    expect(all.length).toBeLessThan(50);
    const sizes = all.map((s) => s.size).sort((a, b) => a - b);
    expect(sizes[0]).toBeGreaterThan(0.099); // 0.1 m, stored in float32
    expect(sizes[sizes.length - 1] / sizes[0]).toBeGreaterThan(4);
  });

  it('sit in the ground: every one has its foot under the surface and its top above', () => {
    for (const s of all) {
      const ground = site.surfaceY(s.pos.x, s.pos.z);
      expect(s.box.min.y, `foot of ${s.pos.toArray()}`).toBeLessThan(ground);
      expect(s.box.max.y, `top of ${s.pos.toArray()}`).toBeGreaterThan(ground + 0.05 * s.size);
    }
  });

  it('keep off the pit, the drive pipe, the delivery route and the buildings', () => {
    const pit = site.registry.bounds('ram-pit');
    for (const s of all) {
      expect(pit.distanceToPoint(s.pos), `${s.pos.toArray()} near the pit`).toBeGreaterThan(2);
      expect(site.registry.bounds('house').distanceToPoint(s.pos)).toBeGreaterThan(3);
      expect(site.registry.bounds('water-tower').distanceToPoint(s.pos)).toBeGreaterThan(3);
    }
  });

  it('follow the ground when the sliders move it', () => {
    const fresh = createSiteScene() as SiteScene;
    fresh.follow({ fall: 7.5, driveLength: 30, deliveryHead: 80, driveDiameter: 40 });
    for (const mesh of stonesOf(fresh).children as THREE.InstancedMesh[]) {
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, m);
        const p = new THREE.Vector3().setFromMatrixPosition(m);
        const s = new THREE.Vector3().setFromMatrixScale(m).x;
        expect(Math.abs(p.y - (fresh.surfaceY(p.x, p.z) - 0.2 * s))).toBeLessThan(1e-4); // float32 matrices
      }
    }
  });

  it('have no crack: the copies of a corner of the polyhedron moved together', () => {
    for (const detail of [0, 1] as const) {
      const g = stoneGeometry(11, detail);
      const pos = g.attributes.position;
      // the faces of an icosahedron share each corner: every position appears more than once
      const seen = new Map<string, number>();
      for (let i = 0; i < pos.count; i++) {
        const k = `${pos.getX(i).toFixed(5)},${pos.getY(i).toFixed(5)},${pos.getZ(i).toFixed(5)}`;
        seen.set(k, (seen.get(k) ?? 0) + 1);
      }
      for (const n of seen.values()) expect(n).toBeGreaterThanOrEqual(3);
    }
  });

  it('are laid the same on every load and dropped, not moved, where they are not wanted', () => {
    const groups = [{ x: 0, z: 0, size: 0.6, count: 6 }];
    expect(layStones(groups, () => false)).toEqual(layStones(groups, () => false));
    expect(layStones(groups, () => true)).toHaveLength(0);
    const built = buildStones(
      layStones(groups, () => false),
      () => 2,
    );
    expect(built.stones.every((s) => built.centreY(s) < 2)).toBe(true);
  });
});

describe('far slopes', () => {
  it('carry no relief finer than their grid cells (the vertical stripes of the film)', () => {
    // along x at 1 km to the north the grid has fine columns (a few metres) but 45 m rows: a 20 m noise sampled there turned
    // into gullies down the slope. The second difference of the ground along x, every 2 m, measures what is left of it.
    const roughness = (z: number) => {
      let s = 0;
      let n = 0;
      for (let x = 0; x <= 80; x += 2) {
        const d = site.surfaceY(x - 2, z) - 2 * site.surfaceY(x, z) + site.surfaceY(x + 2, z);
        s += d * d;
        n++;
      }
      return Math.sqrt(s / n);
    };
    expect(roughness(-1000)).toBeLessThan(0.05);
  });

  it('keep every octave where the cells are fine (near the site nothing changes)', () => {
    const g = createGround();
    for (const [x, z] of [
      [40, 30],
      [-60, -40],
      [20, -120],
    ])
      expect(g.staticPart(x, z, 1)).toBeCloseTo(g.staticPart(x, z), 9);
    // and drops the 20 m octave where cells are 45 m
    let diff = 0;
    for (let x = 0; x < 200; x += 7)
      diff = Math.max(diff, Math.abs(g.staticPart(x, -1000, 45) - g.staticPart(x, -1000)));
    expect(diff).toBeGreaterThan(0.1);
  });
});

describe('flow dots', () => {
  it('fade in at the start of their path and out at its end, instead of popping', () => {
    const L = 30;
    expect(dotAlpha(0, L)).toBe(0);
    expect(dotAlpha(L, L)).toBe(0);
    expect(dotAlpha(L / 2, L)).toBe(1);
    expect(dotAlpha(dotFade(L) / 2, L)).toBeGreaterThan(0.2);
    expect(dotFade(100)).toBe(1.2);
    const dots = new FlowDots(10, { color: 0x2f8cff, size: 5, pixels: true });
    dots.addPath([new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0, 0)], 10);
    const colour = dots.object.geometry.attributes.color as THREE.BufferAttribute;
    expect(colour.itemSize).toBe(4);
    expect((dots.object.material as THREE.PointsMaterial).vertexColors).toBe(true);
    // the dot at the very start of the path is transparent
    expect(colour.getW(0)).toBe(0);
  });
});

describe('pipes and the trickle', () => {
  it('take their minimum width from the height of the view, in CSS pixels', () => {
    const scene = new THREE.Scene();
    trackViewHeight(scene);
    const fake = {
      getDrawingBufferSize: (v: THREE.Vector2) => v.set(780, 1688),
      getPixelRatio: () => 2,
    } as unknown as THREE.WebGLRenderer;
    scene.onBeforeRender(fake, scene, new THREE.PerspectiveCamera(), null as never, null as never, null as never);
    expect(VIEW_HEIGHT.value).toBe(844);
  });
});

describe('the look of the worlds (kit 0.5)', () => {
  const ram = createRamScene();
  const valve = createValveScene();
  const catchment = createCatchmentScene();

  it('the three paper studios ask for the paper studio, the site for its own tone', () => {
    for (const w of [ram, valve, catchment]) {
      expect(w.scene.userData.wantsEnv).toBe(true);
      expect(w.scene.userData.look).toMatchObject({ toneMapping: 'neutral', exposure: 1.2, environment: 'paper' });
    }
    expect(site.scene.userData.look).toEqual({ toneMapping: 'neutral', exposure: 1.32, saturation: 0.86 });
  });

  it('the contact shadow lies on the paper floor of the ram world, under the anchor block, and is not a part', () => {
    const c = ram.scene.getObjectByName('contact-shadow') as THREE.Mesh;
    expect(c).toBeTruthy();
    expect(c.position.y).toBeGreaterThan(FOUNDATION_BOTTOM - 0.0005);
    expect(c.position.y).toBeLessThan(FOUNDATION_BOTTOM + 0.001);
    expect(c.castShadow).toBe(false);
    expect(ram.registry.partOf(c)).toBeFalsy();
    for (const w of [valve, catchment]) expect(w.scene.getObjectByName('contact-shadow')).toBeTruthy();
  });

  it('the parts are worn, the water and the glass are not', () => {
    let worn = 0;
    ram.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial && mat.userData.worn) worn++;
        if (mat.transparent) expect(mat.userData.worn, mesh.name).toBeFalsy();
      }
    });
    expect(worn).toBeGreaterThan(10);
  });

  it('the grass tufts of the catchment melt into the ground once their blades are under 3 pixels (no crawling specks)', () => {
    const tufts = catchment.scene.getObjectByName('tufts') as THREE.InstancedMesh;
    const mat = tufts.material as THREE.MeshStandardMaterial;
    expect(mat.customProgramCacheKey()).toContain('tufts-0.09');
    // the shader reads the height of the view, which the world keeps up to date
    const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: '' } as never;
    mat.onBeforeCompile(shader, null as never);
    const { uniforms, vertexShader } = shader as { uniforms: Record<string, unknown>; vertexShader: string };
    expect(uniforms.uViewHeight).toBe(VIEW_HEIGHT);
    expect(vertexShader).toContain('smoothstep( 1.5, 3.0');
  });

  it('contact shadows are drawn whatever the floor (no fight for the depth)', () => {
    const c = contactShadow(1, 1, 0.1);
    const mat = c.material as THREE.MeshBasicMaterial;
    expect(mat.polygonOffset).toBe(true);
    expect(mat.depthWrite).toBe(false);
  });
});
