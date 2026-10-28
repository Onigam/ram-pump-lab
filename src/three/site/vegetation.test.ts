import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createSiteScene } from './scene';

// The forest of the site: instanced trees in tiles, whose shadow comes from coarse meshes that only the sun's shadow pass draws
// (vegetation.ts). The renderer's hook for that is `Mesh.intersectsFrustum`, called with the frustum of the camera in the colour
// pass and with that of the sun's box in the shadow pass.

describe('the forest of the site', () => {
  const mod = createSiteScene();
  const forest = mod.scene.getObjectByName('vegetation')!;
  const meshes = forest.children as THREE.InstancedMesh[];
  const shadows = meshes.filter((m) => m.name.endsWith('(shadow)'));
  const seen = meshes.filter((m) => !m.name.endsWith('(shadow)'));

  const perspective = new THREE.PerspectiveCamera(40, 1.3, 0.1, 4000);
  perspective.position.set(-75, 97, 160);
  perspective.lookAt(28, 20, -70);
  const sun = new THREE.OrthographicCamera(-150, 150, 150, -150, 1, 900);
  sun.position.set(28, 220, 100);
  sun.lookAt(28, 20, -70);
  const frustum = (c: THREE.PerspectiveCamera | THREE.OrthographicCamera) => {
    c.updateProjectionMatrix();
    c.updateMatrixWorld(true);
    return new THREE.Frustum().setFromProjectionMatrix(
      new THREE.Matrix4().multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse),
    );
  };

  it('is cut into tiles, each with its own trunks, crowns and shadow casters, and is culled by tile', () => {
    expect(forest.children.length).toBeGreaterThan(12);
    expect(shadows.length).toBeGreaterThan(5);
    for (const m of meshes) expect(m.frustumCulled, m.name).toBe(true);
    // a tile is a few draw calls: trunks, one or two crowns
    expect(seen.filter((m) => m.name.startsWith('trunks')).length).toBeLessThan(30);
  });

  it('gives the shadow to the coarse meshes: the meshes that are seen cast none, a caster has the matrices of its crowns', () => {
    for (const m of seen) expect(m.castShadow, m.name).toBe(false);
    for (const m of shadows) {
      expect(m.castShadow, m.name).toBe(true);
      const crowns = seen.find((c) => `${c.name} (shadow)` === m.name)!;
      expect(crowns, m.name).toBeDefined();
      expect(m.count).toBe(crowns.count);
      expect(m.instanceMatrix).toBe(crowns.instanceMatrix);
      const tris = (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3;
      const full =
        (crowns.geometry.index ? crowns.geometry.index.count : crowns.geometry.attributes.position.count) / 3;
      expect(tris).toBeLessThanOrEqual(20);
      expect(tris).toBeLessThan(full);
    }
  });

  it('draws the casters in the sun pass only: the camera of the visitor never sees them, the sun does', () => {
    // the hook of the renderer that this relies on
    expect(typeof THREE.Mesh.prototype.intersectsFrustum).toBe('function');
    const eye = frustum(perspective);
    const light = frustum(sun);
    let inSun = 0;
    for (const m of shadows) {
      expect(m.intersectsFrustum(eye), m.name).toBe(false);
      if (m.intersectsFrustum(light)) inSun++;
    }
    expect(inSun).toBeGreaterThan(0);
    // the crowns themselves are drawn by the camera as ordinary meshes
    expect(seen.some((m) => m.intersectsFrustum(eye))).toBe(true);
  });

  it('keeps the trees on the ground when the landscape moves, and the bounding spheres with them', () => {
    const crowns = seen.find((m) => m.name.startsWith('broadleaves'))!;
    const m4 = new THREE.Matrix4();
    const at = new THREE.Vector3();
    const rest = (): number => {
      crowns.getMatrixAt(0, m4);
      at.setFromMatrixPosition(m4);
      return at.y - (mod.surfaceY(at.x, at.z) - 0.25);
    };
    expect(Math.abs(rest())).toBeLessThan(1e-4);
    const y0 = at.y;
    mod.follow({ fall: 7.5, driveLength: 20, deliveryHead: 85, driveDiameter: 27 });
    expect(Math.abs(rest())).toBeLessThan(1e-4);
    expect(at.y).not.toBeCloseTo(y0, 1); // the hill rose: the tree rose with it
    // and the sphere that the renderer culls by contains the instance
    const sphere = crowns.boundingSphere!;
    expect(sphere.center.distanceTo(at)).toBeLessThan(sphere.radius + 1);
  });
});
