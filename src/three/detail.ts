import * as THREE from 'three';
import { rng } from '@onigam/lab-kit/three';
import { VIEW_HEIGHT } from './site/pipes';

// Near detail that keeps a view from feeling empty, without adding shimmer (docs/scenery.md, « Detail »): the grass's patches
// and tufts, wear on the parts, occlusion in the tree crowns, contact shadows on the paper floors, and a few groups of stones.
// Procedural only (no texture file, no asset). Every pattern drawn in a shader fades out before a cell of it gets under about
// two pixels (its frequency is compared with the screen derivative of its coordinate): it adds detail close up and nothing
// that could crawl from afar. Builds geometry and materials only: runs in Node under vitest.

/** GLSL: value noise, a 3D blend of it, and the fade of a pattern by its size on screen. */
const NOISE_GLSL = /* glsl */ `
  float dtHash( vec2 p ) { p = fract( p * vec2( 123.34, 456.21 ) ); p += dot( p, p + 45.32 ); return fract( p.x * p.y ); }
  float dtNoise( vec2 p ) {
    vec2 i = floor( p ); vec2 f = fract( p ); vec2 u = f * f * ( 3.0 - 2.0 * f );
    float a = dtHash( i ), b = dtHash( i + vec2( 1.0, 0.0 ) ), c = dtHash( i + vec2( 0.0, 1.0 ) ), d = dtHash( i + vec2( 1.0, 1.0 ) );
    return mix( mix( a, b, u.x ), mix( c, d, u.x ), u.y ) * 2.0 - 1.0;
  }
  float dtNoise3( vec3 p ) { return 0.35 * ( dtNoise( p.xy ) + dtNoise( p.yz + 17.3 ) ) + 0.3 * dtNoise( p.zx - 9.1 ); }
  // 1 while a cell of the pattern spans more than ~3 pixels, 0 once it is under ~1.2
  float dtKeep( float cellsPerPixel ) { return 1.0 - smoothstep( 0.33, 0.8, cellsPerPixel ); }
`;

/** Chain a shader edit after a material's own `onBeforeCompile`, and give the program its own cache key. */
function patch(
  mat: THREE.Material,
  key: string,
  edit: (shader: THREE.WebGLProgramParametersWithUniforms) => void,
): void {
  const before = mat.onBeforeCompile;
  const keyBefore = mat.customProgramCacheKey.bind(mat);
  mat.onBeforeCompile = (shader, renderer) => {
    before.call(mat, shader, renderer);
    edit(shader);
  };
  mat.customProgramCacheKey = () => `${keyBefore()}|${key}`;
  mat.needsUpdate = true;
}

// ------------------------------------------------------------------------------------------------ ground

/**
 * The grass of the site: patches of drier and greener grass tens of metres across, tufts a metre across, and their bump in the
 * light; on top of the ground's vertex colours and detail map. Stays put in the world (x, z).
 */
export function grassDetail(mat: THREE.MeshStandardMaterial): void {
  patch(mat, 'grass-detail', (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDtWorld;')
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvDtWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vDtWorld;\n${NOISE_GLSL}`)
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        {
          vec2 p = vDtWorld.xz;
          float mpp = max( length( fwidth( p ) ), 1e-4 ); // metres per pixel
          float macro = 0.6 * dtNoise( p * 0.035 ) + 0.4 * dtNoise( p * 0.09 + 7.0 );
          float mid = dtNoise( p * 0.35 ) * dtKeep( mpp * 0.35 );
          float tufts = dtNoise( p * 1.6 ) * dtKeep( mpp * 1.6 ) + 0.5 * dtNoise( p * 4.3 ) * dtKeep( mpp * 4.3 );
          vec3 c = diffuseColor.rgb;
          c = mix( c, c * vec3( 1.10, 1.03, 0.80 ), 0.35 * smoothstep( 0.05, 0.6, macro ) );
          c = mix( c, c * vec3( 0.86, 0.97, 0.86 ), 0.30 * smoothstep( 0.1, 0.7, -macro ) );
          diffuseColor.rgb = c * ( 1.0 + 0.07 * mid + 0.09 * tufts );
        }`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `#include <normal_fragment_maps>
        {
          vec2 p = vDtWorld.xz;
          float k = 0.026 * dtKeep( max( length( fwidth( p ) ), 1e-4 ) * 1.6 );
          if ( k > 0.0005 ) {
            float e = 0.08;
            float h0 = dtNoise( p * 1.6 ) + 0.5 * dtNoise( p * 4.3 );
            float hx = dtNoise( ( p + vec2( e, 0.0 ) ) * 1.6 ) + 0.5 * dtNoise( ( p + vec2( e, 0.0 ) ) * 4.3 );
            float hz = dtNoise( ( p + vec2( 0.0, e ) ) * 1.6 ) + 0.5 * dtNoise( ( p + vec2( 0.0, e ) ) * 4.3 );
            normal = normalize( normal - k * ( viewMatrix * vec4( ( hx - h0 ) / e, 0.0, ( hz - h0 ) / e, 0.0 ) ).xyz );
          }
        }`,
      );
  });
}

// ------------------------------------------------------------------------------------------------ wear

/**
 * Wear on the solid parts under `root`: a slow variation of colour and roughness, as no made part is one flat colour. In each
 * mesh's own coordinates, so it moves with the part (explode, the valve's stroke). `freq`: cells per metre of the variation
 * (a hillside 3, a ram 60, a valve 140). Transparent materials and the ones `skip` names are left alone.
 */
export function applyWear(root: THREE.Object3D, freq: number, skip: (m: THREE.Mesh) => boolean = () => false): void {
  const seen = new Set<THREE.Material>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || skip(m)) return;
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      const std = mat as THREE.MeshStandardMaterial;
      if (!std.isMeshStandardMaterial || std.transparent || seen.has(std) || std.userData.worn) continue;
      seen.add(std);
      std.userData.worn = true;
      const metal = std.metalness > 0.5;
      // a material may ask for its own wear (`userData.wear`, kept by mergeStatic): `tint`, the colour of its stains (warm by
      // default: rust, dust, oil; concrete greys), and `amount` (1 by default; a clean painted vessel 0.2)
      const wear = (std.userData.wear ?? {}) as { tint?: [number, number, number]; amount?: number };
      const tint = wear.tint ?? [1.03, 0.99, 0.92];
      const amount = wear.amount ?? 1;
      const tintGlsl = `vec3( ${tint.map((v) => v.toFixed(3)).join(', ')} )`;
      patch(std, `wear-${freq}-${metal ? 'metal' : 'matte'}-${tint.join('-')}-${amount}`, (shader) => {
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vDtObj;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDtObj = position;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>\nvarying vec3 vDtObj;\n${NOISE_GLSL}`)
          .replace(
            '#include <color_fragment>',
            /* glsl */ `#include <color_fragment>
            vec3 dtP = vDtObj * ${freq.toFixed(3)};
            float dtCpp = length( fwidth( dtP ) );
            float dtN = ${amount.toFixed(3)} * ( dtNoise3( dtP ) * dtKeep( dtCpp ) + 0.5 * dtNoise3( dtP * 3.1 + 5.0 ) * dtKeep( dtCpp * 3.1 ) );
            diffuseColor.rgb *= 1.0 + ${metal ? '0.05' : '0.08'} * dtN;
            diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * ${tintGlsl}, ${metal ? '0.10' : '0.18'} * smoothstep( 0.2, 0.8, dtN ) );`,
          )
          .replace(
            '#include <roughnessmap_fragment>',
            /* glsl */ `#include <roughnessmap_fragment>
            roughnessFactor = clamp( roughnessFactor * ( 1.0 + ${metal ? '0.35' : '0.12'} * dtN ), 0.04, 1.0 );`,
          );
      });
    }
  });
}

// ------------------------------------------------------------------------------------------------ grass tufts

/**
 * Grass tufts that would shimmer from afar: their blades are a centimetre or two wide, under a pixel from a few metres, and a
 * sub-pixel blade with a light tip against the ground crawls as the camera moves. While a blade is over 2 pixels wide the tuft is
 * drawn as it is; as it narrows to 1 pixel the tuft melts into the ground it stands on: its colour goes to the ground's
 * (`ground`, linear, before lighting), its normal turns up (lit as the ground is) and it settles to 40 % of its height. Seen
 * close, nothing changes; seen from afar, the grass is the ground's colour, as it would be. `bladeWidth`: width of a blade in the
 * tuft's own frame (metres at scale 1). Needs `VIEW_HEIGHT` kept up to date (`trackViewHeight` on the world's scene).
 */
export function meltTuftsWithDistance(mat: THREE.MeshStandardMaterial, bladeWidth: number, ground: THREE.Color): void {
  patch(mat, `tufts-${bladeWidth}`, (shader) => {
    shader.uniforms.uViewHeight = VIEW_HEIGHT;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uViewHeight;')
      .replace(
        '#include <color_vertex>',
        /* glsl */ `#include <color_vertex>
        float dtScale = length( modelMatrix[ 0 ].xyz );
        #ifdef USE_INSTANCING
          vec4 dtBase = modelViewMatrix * instanceMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
          dtScale *= length( instanceMatrix[ 0 ].xyz );
        #else
          vec4 dtBase = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
        #endif
        float dtMetresPerPixel = 2.0 * max( - dtBase.z, 1e-3 ) / ( projectionMatrix[ 1 ][ 1 ] * uViewHeight );
        float dtK = smoothstep( 1.5, 3.0, ${bladeWidth.toFixed(4)} * dtScale / dtMetresPerPixel );
        vColor.rgb = mix( vec3( ${ground.r.toFixed(4)}, ${ground.g.toFixed(4)}, ${ground.b.toFixed(4)} ), vColor.rgb, dtK );`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        '#include <beginnormal_vertex>\nobjectNormal = normalize( mix( vec3( 0.0, 1.0, 0.0 ), objectNormal, dtK ) );',
      )
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed *= mix( 0.4, 1.0, dtK );');
  });
}

// ------------------------------------------------------------------------------------------------ tree crowns

/**
 * Light inside a crown: darker at its bottom and towards the trunk, where the sky does not reach, lighter at the top and the
 * outside. `y0`, `y1`: bottom and top of the crown, `r`: its radius, metres, in the crown's own (instance) frame.
 */
export function crownShading(mat: THREE.MeshStandardMaterial, y0: number, y1: number, r: number): void {
  patch(mat, `crown-${y0}-${y1}-${r}`, (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vDtAO;')
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
      vDtAO = mix( 0.55, 1.08, smoothstep( ${y0.toFixed(2)}, ${y1.toFixed(2)}, position.y ) )
        * mix( 0.82, 1.0, smoothstep( 0.0, ${r.toFixed(2)}, length( position.xz ) ) );`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vDtAO;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= vDtAO;');
  });
}

// ------------------------------------------------------------------------------------------------ contact shadows

/**
 * The darker border on a floor around what stands on it (the ambient light the floor does not get next to a body): a footprint
 * of `w` by `d` metres, centred, fading over `falloff`. Multiplied over the floor. Lay it between the floor and the body's
 * underside: in front of the floor by depth alone, behind the body's foot, so the body always covers it. Inside the footprint
 * it darkens nothing, so a pixel of the body's foot that it might reach is never darkened. `polygonOffset` only for a floor seen
 * from far, where depth alone cannot tell it from the floor. Not a part: no shadow, no picking.
 */
export function contactShadow(
  w: number,
  d: number,
  falloff: number,
  strength = 0.45,
  polygonOffset = false,
): THREE.Mesh {
  const N = 128;
  const W = w + 2 * falloff;
  const D = d + 2 * falloff;
  const data = new Uint8Array(N * N * 4);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const dx = Math.max(0, Math.abs(((i + 0.5) / N - 0.5) * W) - w / 2);
      const dz = Math.max(0, Math.abs(((j + 0.5) / N - 0.5) * D) - d / 2);
      // 0 inside the footprint, rising over the first fifth of the falloff, then fading: no hard dark line at the body's foot,
      // which drew a strong edge that crawled as the camera moved (review D5)
      const t = dx > 0 || dz > 0 ? Math.hypot(dx, dz) / falloff : 0;
      const rise = Math.min(1, t / 0.2);
      const a = t > 0 ? rise * rise * (3 - 2 * rise) * Math.max(0, 1 - t) : 0;
      const v = strength * a;
      const k = (j * N + i) * 4;
      // a warm darkening, as the ink of the shadows (not a grey)
      data[k] = Math.round(255 * (1 - v));
      data[k + 1] = Math.round(255 * (1 - v * 0.96));
      data[k + 2] = Math.round(255 * (1 - v * 0.9));
      data[k + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    blending: THREE.MultiplyBlending,
    premultipliedAlpha: true,
    depthWrite: false,
    toneMapped: false,
    polygonOffset,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat);
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = -1;
  m.name = 'contact-shadow';
  m.userData.noShadow = true;
  m.raycast = () => {};
  return m;
}

// ------------------------------------------------------------------------------------------------ wood

/**
 * The grain of a plank (a DataTexture, no canvas): growth lines along the texture's u, wavering, darker latewood every few
 * millimetres, and a slow variation along the board. Mapped on a box, the lines run along each face's u.
 */
export function woodGrain(lines = 24): THREE.DataTexture {
  const W = 512;
  const H = 128;
  const r = rng(5);
  const phase = Array.from({ length: 8 }, () => r() * Math.PI * 2);
  const data = new Uint8Array(W * H * 4);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const u = i / W;
      const v = j / H;
      // the lines waver along the board
      const wave = 0.018 * Math.sin(u * 9 + phase[0]) + 0.01 * Math.sin(u * 23 + phase[1] + v * 3);
      const t = (v + wave) * lines;
      const ring = t - Math.floor(t);
      const late = Math.exp(-Math.pow((ring - 0.8) / 0.18, 2)); // a soft dark band of latewood
      const board = 0.04 * Math.sin(u * 5 + phase[2]) + 0.03 * Math.sin(v * 7 + phase[3]);
      const g = 1 - 0.06 * late + board;
      const k = (j * W + i) * 4;
      data[k] = Math.round(255 * Math.min(1, g));
      data[k + 1] = Math.round(255 * Math.min(1, g * 0.985));
      data[k + 2] = Math.round(255 * Math.min(1, g * 0.96));
      data[k + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 16;
  tex.needsUpdate = true;
  return tex;
}

// ------------------------------------------------------------------------------------------------ stones

/** A stone: an icosahedron pushed about by a few bumps, flattened, faceted, with a little moss where its faces look up. */
export function stoneGeometry(seed: number, detail: 0 | 1): THREE.BufferGeometry {
  const r = rng(seed);
  const g = new THREE.IcosahedronGeometry(1, detail);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const bumps = [0, 1, 2].map(() => new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize());
  const flat = 0.45 + 0.25 * r();
  const long = 1 + 0.35 * r();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    let k = 1;
    for (const b of bumps) k += 0.22 * Math.max(0, v.dot(b));
    // the copies of one corner (the polyhedron is not indexed) get the same factor: no crack between faces
    const h = Math.sin(
      Math.round(v.x * 1e3) * 12.9898 + Math.round(v.y * 1e3) * 78.233 + Math.round(v.z * 1e3) * 37.719 + seed,
    );
    k *= 0.86 + 0.24 * (h * 43758.5453 - Math.floor(h * 43758.5453));
    pos.setXYZ(i, v.x * k * long, v.y * k * flat, v.z * k);
  }
  g.computeVertexNormals();
  // moss on the faces that look up, a little more on the larger stones (vertex colour, multiplied by the instance colour)
  const nor = g.attributes.normal as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 3);
  const moss = new THREE.Color(0x7d8a4a);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    c.setRGB(1, 1, 1).lerp(moss, 0.55 * Math.max(0, (nor.getY(i) - 0.55) / 0.45));
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeBoundingBox();
  return g;
}

export interface Stone {
  x: number;
  z: number;
  /** Size (metres): the stone is about 2.3 × size long, 1.1 × size high. */
  size: number;
  rotY: number;
  tilt: number;
  shape: number;
  tone: THREE.Color;
}

/** A group of stones: one large stone, a few middle ones leaning on it, small ones around; not a uniform scatter. */
export interface StoneGroup {
  x: number;
  z: number;
  /** Size of the largest stone (metres). */
  size: number;
  /** Middle and small stones around it. */
  count: number;
}

const TONES = [0x8d877b, 0x9b9483, 0x7c776d, 0xa69e8b, 0x857f72];

/**
 * Lay out the stones of the groups, deterministic. The middle and small stones fall around the large one, closer when they are
 * larger; a stone that `avoid` refuses (a pipe, the pit, the route) is dropped, not moved.
 */
export function layStones(groups: StoneGroup[], avoid: (x: number, z: number) => boolean, seed = 7): Stone[] {
  const r = rng(seed);
  const out: Stone[] = [];
  const tone = () => new THREE.Color(TONES[Math.floor(r() * TONES.length)]).multiplyScalar(0.88 + 0.24 * r());
  for (const g of groups) {
    if (!avoid(g.x, g.z))
      out.push({
        x: g.x,
        z: g.z,
        size: g.size,
        rotY: r() * Math.PI * 2,
        tilt: (r() - 0.5) * 0.3,
        shape: 0,
        tone: tone(),
      });
    for (let i = 0; i < g.count; i++) {
      const s = g.size * (0.18 + 0.45 * Math.pow(r(), 1.6));
      const a = r() * Math.PI * 2;
      const d = g.size * (1.4 + 3.2 * r() * (1 - s / g.size));
      const x = g.x + Math.cos(a) * d;
      const z = g.z + Math.sin(a) * d;
      if (avoid(x, z)) continue;
      out.push({
        x,
        z,
        size: Math.max(0.1, s),
        rotY: r() * Math.PI * 2,
        tilt: (r() - 0.5) * 0.6,
        shape: 1 + Math.floor(r() * 2),
        tone: tone(),
      });
    }
  }
  return out;
}

/**
 * The stones as three instanced meshes (a detailed shape for the large ones, two simpler shapes for the others), half
 * buried: their centre a fifth of their height under the ground, so they sit in it and never float. `relevel` follows the
 * ground when it moves (the sliders).
 */
export function buildStones(stones: Stone[], surfaceY: (x: number, z: number) => number) {
  const shapes = [stoneGeometry(11, 1), stoneGeometry(23, 0), stoneGeometry(37, 0)];
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0, flatShading: true });
  const group = new THREE.Group();
  group.name = 'stones';
  const meshes = shapes.map((g, k) => {
    const list = stones.filter((s) => s.shape === k);
    const m = new THREE.InstancedMesh(g, mat, Math.max(1, list.length));
    m.count = list.length;
    m.name = 'stones';
    m.castShadow = true;
    m.receiveShadow = true;
    list.forEach((s, i) => m.setColorAt(i, s.tone));
    group.add(m);
    return { mesh: m, list };
  });
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const sc = new THREE.Vector3();
  /** Height of a stone's centre above the ground under it: its lowest point is under the ground, its top above. */
  const sink = (s: Stone) => surfaceY(s.x, s.z) - 0.2 * s.size;
  const relevel = () => {
    for (const { mesh, list } of meshes) {
      list.forEach((s, i) => {
        e.set(s.tilt, s.rotY, 0);
        q.setFromEuler(e);
        m4.compose(p.set(s.x, sink(s), s.z), q, sc.setScalar(s.size));
        mesh.setMatrixAt(i, m4);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  };
  relevel();
  return { group, relevel, stones, centreY: sink, shapes };
}
