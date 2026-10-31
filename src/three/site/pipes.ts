import * as THREE from 'three';
import { SITE } from '../dims';

// Pipes of the site. A real 33 mm pipe is invisible from 200 m, so the material widens the tube along its normals by the
// distance to the camera: the pipe is never thinner than `minPixels` CSS pixels on screen, and is drawn at its true size when
// the camera is close. The width comes from the projection and the height of the view (`trackViewHeight`): a constant for an
// 800 px view gave 1.9 px in a 1080 px film and 1.2 px on a phone, under two device pixels, where a line breaks up and crawls.
// (Generic: docs/kit-requests.md §4.)

/** Height of the 3D view in CSS pixels, shared by the pipe and stream materials; set by `trackViewHeight` before each draw. */
export const VIEW_HEIGHT = { value: 800 };

/** GLSL: half the world width of `px` CSS pixels at one metre from the camera (projection and view height). */
const HALF_WIDTH_PER_METRE =
  'float pipeHalfPerMetre( float px ) { return px / ( projectionMatrix[1][1] * uViewHeight ); }';

/** Keep `VIEW_HEIGHT` up to date: chained on the scene's `onBeforeRender`, so it holds for every world that draws pipes. */
export function trackViewHeight(scene: THREE.Scene): void {
  const size = new THREE.Vector2();
  const before = scene.onBeforeRender;
  scene.onBeforeRender = function (renderer, s, camera, geometry, material, group) {
    if (renderer) {
      renderer.getDrawingBufferSize(size);
      VIEW_HEIGHT.value = Math.max(1, size.y / renderer.getPixelRatio());
    }
    before.call(this, renderer, s, camera, geometry, material, group);
  };
}

export function minWidthMaterial(base: THREE.MeshStandardMaterial, radius: number, minPixels = SITE.pipeMinPixels) {
  const uniforms = { uPipeRadius: { value: radius }, uPipeMinPx: { value: minPixels } };
  base.onBeforeCompile = (shader) => {
    shader.uniforms.uPipeRadius = uniforms.uPipeRadius;
    shader.uniforms.uPipeMinPx = uniforms.uPipeMinPx;
    shader.uniforms.uViewHeight = VIEW_HEIGHT;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>\nuniform float uPipeRadius;\nuniform float uPipeMinPx;\nuniform float uViewHeight;\n${HALF_WIDTH_PER_METRE}`,
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        {
          vec4 wp = modelMatrix * vec4( transformed, 1.0 );
          float dist = distance( cameraPosition, wp.xyz );
          transformed += normalize( normal ) * max( 0.0, dist * pipeHalfPerMetre( uPipeMinPx ) - uPipeRadius );
        }`,
      );
  };
  base.customProgramCacheKey = () => 'min-width-pipe';
  return { material: base, uniforms };
}

/**
 * The same for a stream of water drawn as a unit open cylinder scaled to (radius, length, radius) (catchment/model.ts): the
 * trickle of the spring is a finger thick, a pixel at 30 m; it is drawn at least `minPixels` wide. Set `uniforms.uRadius` to the
 * radius the stream has now. With `water`, the stream also reads as falling water from close up: from a few metres it turns
 * clear, its thickness wavers, streaks run down it and its lower third breaks into drops (set `uniforms.uTime`, seconds); from
 * afar it stays whole and bright, as a line that can be seen. The cylinder needs height segments for the wavering.
 */
export function minWidthStream(
  base: THREE.MeshStandardMaterial,
  minPixels: number = SITE.pipeMinPixels,
  water = false,
) {
  const uniforms = {
    uRadius: { value: 0.01 },
    uMinPx: { value: minPixels },
    uTime: { value: 0 },
  };
  base.onBeforeCompile = (shader) => {
    shader.uniforms.uStreamRadius = uniforms.uRadius;
    shader.uniforms.uStreamMinPx = uniforms.uMinPx;
    shader.uniforms.uStreamTime = uniforms.uTime;
    shader.uniforms.uViewHeight = VIEW_HEIGHT;
    const head =
      '#include <common>\nuniform float uStreamRadius;\nuniform float uStreamMinPx;\nuniform float uStreamTime;';
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `${head}\nuniform float uViewHeight;\n${HALF_WIDTH_PER_METRE}\nvarying float vStreamNear;\nvarying float vStreamV;`,
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        {
          vec4 wp = modelMatrix * vec4( transformed, 1.0 );
          float dist = distance( cameraPosition, wp.xyz );
          // the cylinder has a radius of 1 in its own frame: the growth is in parts of the radius
          vec2 side = normal.xz;
          float grow = max( 0.0, dist * pipeHalfPerMetre( uStreamMinPx ) - uStreamRadius ) / max( uStreamRadius, 1e-5 );
          vStreamNear = 1.0 - smoothstep( 3.0, 10.0, dist );
          vStreamV = position.y + 0.5;
          ${
            water
              ? `float waver = 1.0 + vStreamNear * ( 0.22 * sin( position.y * 37.0 + uStreamTime * 11.0 ) + 0.14 * sin( position.y * 13.0 - uStreamTime * 6.0 ) );
          if ( dot( side, side ) > 1e-6 ) transformed.xz = normalize( side ) * ( ( 1.0 + grow ) * waver );
          transformed.x += vStreamNear * 0.35 * sin( position.y * 6.0 + uStreamTime * 2.3 );`
              : 'if ( dot( side, side ) > 1e-6 ) transformed.xz += normalize( side ) * grow;'
          }
        }`,
      );
    if (water) {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `${head}\nvarying float vStreamNear;\nvarying float vStreamV;`)
        .replace(
          '#include <color_fragment>',
          /* glsl */ `#include <color_fragment>
          {
            // streaks running down, the stream clear from close up, its lower third in drops
            float streak = 0.5 + 0.5 * sin( vStreamV * 48.0 + uStreamTime * 14.0 );
            diffuseColor.rgb *= mix( vec3( 1.0 ), vec3( 0.74, 0.86, 0.97 ) * ( 0.88 + 0.24 * streak ), vStreamNear );
            float drops = step( 0.5, fract( vStreamV * 9.0 + uStreamTime * 3.1 ) );
            float lower = 1.0 - smoothstep( 0.05, 0.4, vStreamV );
            diffuseColor.a *= mix( 1.0, 0.5 * mix( 1.0, drops, lower ), vStreamNear );
          }`,
        );
    }
  };
  base.customProgramCacheKey = () => (water ? 'min-width-stream-water' : 'min-width-stream');
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
