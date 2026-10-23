import * as THREE from 'three';
import { SITE } from '../dims';

// Pipes of the site. A real 33 mm pipe is invisible from 200 m, so the material widens the tube along its normals by the
// distance to the camera: the pipe is never thinner than about `minPixels` on screen, and is drawn at its true size when
// the camera is close. (Generic: docs/kit-requests.md §4.)

/** World size of one screen pixel per metre of distance at the stage's 40 degree field of view and ~800 px height. */
const PIXEL_PER_METRE = 0.00091;

export function minWidthMaterial(base: THREE.MeshStandardMaterial, radius: number, minPixels = SITE.pipeMinPixels) {
  const uniforms = { uPipeRadius: { value: radius }, uPipePix: { value: (PIXEL_PER_METRE * minPixels) / 2 } };
  base.onBeforeCompile = (shader) => {
    shader.uniforms.uPipeRadius = uniforms.uPipeRadius;
    shader.uniforms.uPipePix = uniforms.uPipePix;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uPipeRadius;\nuniform float uPipePix;')
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        {
          vec4 wp = modelMatrix * vec4( transformed, 1.0 );
          float dist = distance( cameraPosition, wp.xyz );
          transformed += normalize( normal ) * max( 0.0, dist * uPipePix - uPipeRadius );
        }`,
      );
  };
  base.customProgramCacheKey = () => 'min-width-pipe';
  return { material: base, uniforms };
}

/** A tube along 3D points (Catmull-Rom through them; the points are dense enough that it only rounds the corners). */
export function tubeAlong(points: THREE.Vector3[], radius: number, material: THREE.Material, radial = 10): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const length = curve.getLength();
  const segs = Math.max(8, Math.min(1400, Math.round(length / 0.6)));
  const geo = new THREE.TubeGeometry(curve, segs, radius, radial, false);
  const m = new THREE.Mesh(geo, material);
  m.castShadow = false;
  m.receiveShadow = true;
  return m;
}

/** Replace the geometry of a mesh, disposing the old one. */
export function swapGeometry(mesh: THREE.Mesh, geo: THREE.BufferGeometry): void {
  mesh.geometry.dispose();
  mesh.geometry = geo;
}

/** Points along a polyline every `step` metres (for supports and dots). */
export function resample(points: THREE.Vector3[], step: number): THREE.Vector3[] {
  const out: THREE.Vector3[] = [points[0].clone()];
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const seg = a.distanceTo(b);
    let d = step - carry;
    while (d <= seg) {
      out.push(a.clone().lerp(b, d / seg));
      d += step;
    }
    carry = seg - (d - step);
  }
  return out;
}

/**
 * Picking for a pipe that is widened on screen: the geometry is 2 cm thick, so a ray is tested against the centre line
 * with a tolerance of about two pixels (the same widening the material applies), and against the true radius when close.
 */
export function pickAlong(mesh: THREE.Mesh, points: () => THREE.Vector3[], radius: () => number): void {
  const onRay = new THREE.Vector3();
  const onSeg = new THREE.Vector3();
  mesh.raycast = (raycaster, intersects) => {
    const ray = raycaster.ray;
    const pts = points();
    let best = Infinity;
    let bestPoint: THREE.Vector3 | null = null;
    let bestDist = 0;
    for (let i = 1; i < pts.length; i++) {
      const dsq = ray.distanceSqToSegment(pts[i - 1], pts[i], onRay, onSeg);
      const dist = ray.origin.distanceTo(onSeg);
      const tol = Math.max(radius(), dist * 0.0018);
      if (dsq < tol * tol && dist < best && dist >= raycaster.near && dist <= raycaster.far) {
        best = dist;
        bestPoint = onSeg.clone();
        bestDist = dist;
      }
    }
    if (bestPoint) intersects.push({ distance: bestDist, point: bestPoint, object: mesh });
  };
}
