import * as THREE from 'three';
import { MAT } from '@onigam/lab-kit/three';
import type { PartRegistry } from '@onigam/lab-kit/three';

// The section ("Coupe" tool): one clipping plane through the symmetry plane of the ram, the materials of the cast and
// turned housings clip against it, and flat copper caps close the cut walls (a clipped hollow shell would otherwise look
// paper thin). Caps are drawn from the 2D section of each part, so the walls show their real thickness.

/** A polygon in the section plane: [x, y] pairs in the frame of the object the cap is added to. */
export type Poly = [number, number][];

/** Axis-aligned rectangle as a polygon. */
export const rect = (x0: number, y0: number, x1: number, y1: number): Poly => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];

/** Section of a revolved wall: the profile polygon (r, y) and its mirror, in the plane through the axis. */
export function mirrored(profile: [number, number][]): Poly[] {
  return [profile.map(([r, y]) => [r, y] as [number, number]), profile.map(([r, y]) => [-r, y] as [number, number])];
}

interface Clipped {
  material: THREE.Material;
  side: THREE.Side;
  extra: THREE.Plane[];
  /** Dots (`Points`) are cut by a plane a few millimetres behind the section, so that dots on the axis stay. */
  dots: boolean;
}

/** How far behind the section plane the dots and drops are still drawn, metres. */
const DOT_MARGIN = 0.003;

export class CutKit {
  /** The section plane in the frame of the root object (z = 0, the front half is removed). */
  readonly plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  private readonly world = new THREE.Plane();
  private readonly worldDots = new THREE.Plane();
  private readonly clipped = new Map<THREE.Material, Clipped>();
  private readonly caps: { mesh: THREE.Mesh; id: string }[] = [];
  private readonly capMaterial: THREE.MeshStandardMaterial;
  private on: boolean | undefined;

  constructor() {
    this.capMaterial = MAT.copperBright();
    this.capMaterial.side = THREE.DoubleSide;
    this.capMaterial.roughness = 0.6;
    this.capMaterial.metalness = 0.35;
    this.capMaterial.polygonOffset = true;
    this.capMaterial.polygonOffsetFactor = -2;
    this.capMaterial.polygonOffsetUnits = -2;
  }

  /**
   * Materials under `obj` are cut by the section (and by `extra` planes at all times, e.g. a water level). Dots and drops
   * (`Points`) are clipped too, 3 mm behind the plane: the half that is cut away must not leave spray floating in front of the
   * section, but the flow dots, which travel on the axis, must stay.
   */
  clip(obj: THREE.Object3D, extra: THREE.Plane[] = []): void {
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      const dots = (o as THREE.Points).isPoints === true;
      if (!(m.isMesh || dots) || m.userData.cap) return;
      const mat = m.material as THREE.Material;
      if (!this.clipped.has(mat)) {
        this.clipped.set(mat, { material: mat, side: mat.side, extra, dots });
        if (extra.length) {
          mat.clippingPlanes = [...extra];
          mat.needsUpdate = true;
        }
      }
    });
  }

  /** True when the section tool clips this material (such a material is merged by identity only, see merge.ts). */
  clips(material: THREE.Material): boolean {
    return this.clipped.has(material);
  }

  /** Flat caps on the section plane. They belong to `id` for display, but are not part of its picked meshes. */
  cap(id: string, parent: THREE.Object3D, polys: Poly[], z = 0): THREE.Mesh {
    const shapes = polys.map((p) => new THREE.Shape(p.map(([x, y]) => new THREE.Vector2(x, y))));
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shapes), this.capMaterial);
    mesh.position.z = z;
    mesh.userData.ownerPart = id;
    mesh.userData.cap = true;
    mesh.userData.noShadow = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.visible = false;
    parent.add(mesh);
    this.caps.push({ mesh, id });
    return mesh;
  }

  /** Apply the tool state every frame: the world plane follows the root, caps follow their part's display. */
  update(root: THREE.Object3D, on: boolean, registry: PartRegistry | null): void {
    root.updateWorldMatrix(true, false);
    this.world.copy(this.plane).applyMatrix4(root.matrixWorld);
    this.worldDots.copy(this.world);
    this.worldDots.constant += DOT_MARGIN;
    if (on !== this.on) {
      this.on = on;
      for (const c of this.clipped.values()) {
        c.material.clippingPlanes = on
          ? [c.dots ? this.worldDots : this.world, ...c.extra]
          : c.extra.length
            ? [...c.extra]
            : [];
        c.material.clipShadows = on;
        c.material.side = on ? THREE.DoubleSide : c.side;
        c.material.needsUpdate = true;
      }
    }
    for (const c of this.caps) {
      const part = registry?.get(c.id);
      c.mesh.visible = on && (!part || part.display === 'solid');
    }
  }
}
