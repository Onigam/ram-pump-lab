import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS } from './layout';
import { buildTerrain } from './terrain';

// The ground is drawn in tiles that the renderer culls by their bounding spheres: every vertex of a tile must lie inside its
// sphere, also after the sliders have moved the hill (a vertex outside the sphere would be culled while it is on screen).

describe('the ground of the site', () => {
  const inside = (terrain: ReturnType<typeof buildTerrain>) => {
    const p = new THREE.Vector3();
    let worst = 0;
    for (const tile of terrain.mesh.children as THREE.Mesh[]) {
      const g = tile.geometry;
      const sphere = g.boundingSphere!;
      const idx = g.index!;
      const pos = g.attributes.position;
      for (let i = 0; i < idx.count; i++) {
        p.fromBufferAttribute(pos, idx.getX(i));
        worst = Math.max(worst, p.distanceTo(sphere.center) - sphere.radius);
      }
    }
    return worst;
  };

  it('is cut into tiles that share one set of vertices, so that a slider moves them all', () => {
    const terrain = buildTerrain(DEFAULT_PARAMS);
    const tiles = terrain.mesh.children as THREE.Mesh[];
    expect(tiles.length).toBeGreaterThan(10);
    expect(tiles.length).toBeLessThan(60);
    for (const t of tiles) {
      expect(t.geometry.attributes.position).toBe(tiles[0].geometry.attributes.position);
      expect(t.geometry.attributes.normal).toBe(tiles[0].geometry.attributes.normal);
      expect(t.geometry.attributes.color).toBe(tiles[0].geometry.attributes.color);
      expect(t.frustumCulled).toBe(true);
    }
  });

  it('keeps every vertex of every tile inside its bounding sphere, whatever the head, the fall and the drive length', () => {
    const terrain = buildTerrain(DEFAULT_PARAMS);
    expect(inside(terrain)).toBeLessThanOrEqual(0);
    for (const p of [
      { fall: 7.5, driveLength: 20, head: 20 },
      { fall: 12, driveLength: 40, head: 100 },
      { fall: 3, driveLength: 8, head: 65 },
    ]) {
      terrain.setParams(p);
      expect(inside(terrain), JSON.stringify(p)).toBeLessThanOrEqual(0);
    }
  });

  it('draws the ground without a gap: the tiles hold every triangle of the grid but the opening of the pit', () => {
    const terrain = buildTerrain(DEFAULT_PARAMS);
    const tiles = terrain.mesh.children as THREE.Mesh[];
    const triangles = tiles.reduce((n, t) => n + t.geometry.index!.count / 3, 0);
    const pos = tiles[0].geometry.attributes.position;
    // a grid of NX x NZ vertices has 2 (NX - 1) (NZ - 1) triangles; the opening of the pit takes a few cells out
    const vertices = pos.count;
    expect(triangles).toBeLessThan(2 * vertices);
    expect(triangles).toBeGreaterThan(1.8 * vertices);
  });
});
