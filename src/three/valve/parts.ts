import * as THREE from 'three';
import { MAT, group, mesh } from '@onigam/lab-kit/three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { VALVE } from '../dims';
import { DEG, crispRuns, hexNut, lathe, ring, zigzag, type Profile } from '../common';
import { mirrored, rect, type CutKit, type Poly } from '../cut';
import * as G from './geo';

// The fourteen parts of the waste valve of the video (research §3, §11), each one a Group named by its frozen id, built in
// the valve frame (geo.ts). The stem hangs on its weight and closes upwards on the conical seat, so everything is built in
// the CLOSED pose; the moving frames (`rig`) are lowered by the lift when the valve opens.
//
//   base plate  ->  welded 26x34 socket  ->  reducer 26x34 to 15x21  ->  15x21 nipple with its ports and lock nut
//   ->  female-female sleeve  ->  thermowell guide  ->  seat (milled) and head  ->  M6 stem and machined sleeves
//   ->  fins nut under the head  ->  weight on the guide  ->  stroke nut  ->  lock nut

/**
 * Cross-section of a part (the polygons of its profile in the plane through the axis, valve frame, as built, i.e. in the
 * CLOSED pose): used by the tests to prove that no two parts interpenetrate. `fixed` parts never move, `stem` parts follow the
 * lift of the stem, `stack` parts (weight, nuts) are carried up by the visual travel above the guide.
 */
export interface SectionDef {
  kind: 'fixed' | 'stem' | 'stack';
  polys: Poly[];
}

export interface ValveRig {
  /** Frames carrying the moving stem: lowered by the lift (position only; the hotspot anchors live here). */
  liftFrames: THREE.Object3D[];
  /** Frames inside them that the fins turn (rotation only). */
  spinFrames: THREE.Object3D[];
  /** Frames of the weight and nuts: raised above the guide by the (visual) travel, so that they sit on it when open. */
  stackFrames: THREE.Object3D[];
  /** Threaded tail of the rod above the lock nut. */
  rodTail?: THREE.Object3D;
  /** Hotspot anchors by part id. */
  anchors: Record<string, THREE.Object3D>;
  /** Sections of the parts, by part id. */
  sections: Record<string, SectionDef>;
}

export interface PartEnv {
  cut: CutKit;
  /** Id that owns the section caps of a part: the part itself in the `valve` world, `waste-valve` in the `ram` world. */
  capId(partId: string): string;
  /** `ram`: studs and nuts of the base plate in the waste flange of the body; `bench`: the plate alone. */
  hardware: 'ram' | 'bench';
  rig: ValveRig;
}

const anchor = (env: PartEnv, id: string, parent: THREE.Object3D, x: number, y: number, z: number): void => {
  const a = new THREE.Object3D();
  a.name = `anchor-${id}`;
  a.position.set(x, y, z);
  parent.add(a);
  env.rig.anchors[id] = a;
};

const cap = (env: PartEnv, id: string, parent: THREE.Object3D, polys: Poly[]): void => {
  env.cut.cap(env.capId(id), parent, polys);
};

const section = (env: PartEnv, id: string, kind: SectionDef['kind'], polys: Poly[]): void => {
  env.rig.sections[id] = { kind, polys };
};

interface Frames {
  /** Follows the lift of the stem (anchors go here: they must not turn with the fins). */
  lift: THREE.Group;
  /** Inside `lift`: turned by the fins. The geometry goes here. */
  spin: THREE.Group;
}

/** The two frames of a part that moves with the stem: lowered by the lift, turned by the fins. */
const stemFrame = (env: PartEnv, parent: THREE.Object3D, name: string): Frames => {
  const lift = group(`${name}-lift`);
  const spin = group(`${name}-spin`);
  lift.add(spin);
  parent.add(lift);
  env.rig.liftFrames.push(lift);
  env.rig.spinFrames.push(spin);
  return { lift, spin };
};

// ------------------------------------------------------------------------------------------------ fixed fittings

/** Base plate: 100 mm square, central bore and four fixing holes (same pattern as the ram's waste flange, S1 06:36). */
export function buildPlate(env: PartEnv): THREE.Group {
  const g = group('base-plate');
  const s = G.PLATE_HALF;
  const c = 0.0006;
  const h = s - c;
  const shape = new THREE.Shape();
  shape.moveTo(-h, -h);
  shape.lineTo(h, -h);
  shape.lineTo(h, h);
  shape.lineTo(-h, h);
  shape.closePath();
  const hole = (x: number, y: number, r: number) => {
    const p = new THREE.Path();
    p.absarc(x, y, r, 0, Math.PI * 2, true);
    shape.holes.push(p);
  };
  hole(0, 0, G.PLATE_BORE_R + c);
  const q = VALVE.basePlateHoleSpacing / 2;
  for (const [x, y] of [
    [q, q],
    [q, -q],
    [-q, q],
    [-q, -q],
  ])
    hole(x, y, VALVE.basePlateHoleDiameter / 2 + c);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: G.PLATE_T - 2 * c,
    bevelEnabled: true,
    bevelThickness: c,
    bevelSize: c,
    bevelSegments: 1,
    curveSegments: 24,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -G.PLATE_T + c, 0);
  const plate = mesh(geo, MAT.steel());
  g.add(plate);
  if (env.hardware === 'ram') {
    // studs of the ram's waste flange: they go 12 mm into the flange under the plate and carry a nut on the plate
    const dark = MAT.steelBlack();
    const nutMat = MAT.zinc();
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        g.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.036, 12), dark, [sx * q, -0.002, sz * q]));
        g.add(mesh(hexNut(0.013, 0.007), nutMat, [sx * q, 0, sz * q]));
      }
  }
  env.cut.clip(plate);
  const plateSection = [
    rect(-G.PLATE_HALF, -G.PLATE_T, -G.PLATE_BORE_R, 0),
    rect(G.PLATE_BORE_R, -G.PLATE_T, G.PLATE_HALF, 0),
  ];
  cap(env, 'base-plate', g, plateSection);
  section(env, 'base-plate', 'fixed', plateSection);
  anchor(env, 'base-plate', g, 0.05, -0.004, 0.05);
  return g;
}

/** Welded 26x34 steel socket on the plate, with its weld bead (S1 06:48). */
export function buildSocket(env: PartEnv): THREE.Group {
  const g = group('valve-socket');
  const ch = 0.0015;
  const poly: Profile = [
    [G.MALE_R, 0],
    [G.SOCKET_R, 0],
    [G.SOCKET_R, G.SOCKET_H - ch],
    [G.SOCKET_R - ch, G.SOCKET_H],
    [G.MALE_R, G.SOCKET_H],
  ];
  const body = mesh(lathe(crispRuns(poly), 48), MAT.steel());
  g.add(body);
  // the bead sinks a little into the plate and the socket wall, so the two are visibly welded
  const bead = mesh(
    new THREE.TorusGeometry(G.SOCKET_R + 0.0008, VALVE.weldBeadRadius, 8, 48),
    MAT.steelBlack(),
    [0, 0.0012, 0],
  );
  bead.rotation.x = Math.PI / 2;
  g.add(bead);
  env.cut.clip(body);
  env.cut.clip(bead);
  cap(env, 'valve-socket', g, mirrored(poly));
  section(env, 'valve-socket', 'fixed', mirrored(poly));
  anchor(env, 'valve-socket', g, 0, 0.02, G.SOCKET_R);
  return g;
}

/**
 * Reducer 26x34 to 15x21: male 26x34 end inside the socket, a round body, a taper, and the 15x21 female thread that takes
 * the nipple. Its bore narrows from the 26 mm of the plate to the core of the 15x21 thread.
 */
export function reducerProfile(): Profile {
  return [
    [G.PLATE_BORE_R, 0],
    [G.MALE_R, 0],
    [G.MALE_R, G.SOCKET_H],
    [G.RED_R, G.SOCKET_H],
    [G.RED_R, VALVE.reducerTaperStart],
    [G.RED_TOP_R, G.RED_TOP - 0.004],
    [G.RED_TOP_R, G.RED_TOP],
    [G.RED_BORE_R, G.RED_TOP],
    [G.RED_BORE_R, 0.034],
    [G.PLATE_BORE_R, 0.026],
  ];
}

/** Outer radius of the reducer at a height above the plate (for the hotspots of the parts hidden inside it). */
function reducerRadiusAt(y: number): number {
  if (y <= VALVE.reducerTaperStart) return G.RED_R;
  const t = Math.min(1, (y - VALVE.reducerTaperStart) / (G.RED_TOP - 0.004 - VALVE.reducerTaperStart));
  return G.RED_R + (G.RED_TOP_R - G.RED_R) * t;
}

export function buildReducer(env: PartEnv): THREE.Group {
  const g = group('valve-reducer');
  const poly = reducerProfile();
  const body = mesh(lathe(crispRuns(poly), 56), MAT.zinc());
  g.add(body);
  env.cut.clip(body);
  cap(env, 'valve-reducer', g, mirrored(poly));
  section(env, 'valve-reducer', 'fixed', mirrored(poly));
  anchor(env, 'valve-reducer', g, 0, 0.04, G.RED_R);
  return g;
}

/**
 * The 15x21 nipple, threaded over 7.5 cm (S1 07:53), with the four exhaust ports ("lumières") machined in it between
 * the seat and the guide, and the lock nut that fixes its height against the reducer (S1 08:03).
 */
export function buildNipple(env: PartEnv): THREE.Group {
  const g = group('valve-nipple');
  const mat = MAT.zinc();
  const depth = 0.0006;
  const pitch = VALVE.threadPitch;
  const R = G.NIPPLE_R;
  const B = G.NIPPLE_BORE;
  const tube = (y0: number, y1: number): THREE.BufferGeometry =>
    lathe(
      [
        zigzag(R, depth, y0, y1, pitch),
        [
          [R, y1],
          [B, y1],
        ],
        [
          [B, y1],
          [B, y0],
        ],
        [
          [B, y0],
          [R, y0],
        ],
      ],
      40,
    );
  const lower = mesh(tube(G.SEAT_TOP, G.PORT_BOTTOM), mat);
  const upper = mesh(tube(G.PORT_TOP, G.NIPPLE_TOP), mat);
  g.add(lower, upper);
  // the wall bars between the ports: sectors of the same threaded tube, closed by the flat sides of the ports
  const step = (Math.PI * 2) / VALVE.portCount;
  const outer = zigzag(R, depth, G.PORT_BOTTOM, G.PORT_TOP, pitch).map(([r, y]) => new THREE.Vector2(r, y));
  const bore = [new THREE.Vector2(B, G.PORT_TOP), new THREE.Vector2(B, G.PORT_BOTTOM)];
  const yMid = (G.PORT_BOTTOM + G.PORT_TOP) / 2;
  const radial = (phi: number) => new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi));
  const wall = (phi: number, towardsPort: 1 | -1): THREE.BufferGeometry => {
    const geo = new THREE.PlaneGeometry(R - depth / 2 - B, G.PORT_TOP - G.PORT_BOTTOM);
    const r = radial(phi);
    const t = new THREE.Vector3(Math.cos(phi), 0, -Math.sin(phi)); // direction of increasing phi
    const m = new THREE.Matrix4();
    // right-handed basis (x, y, z = x cross y): the plane looks along +z
    if (towardsPort === 1) m.makeBasis(r.clone().negate(), new THREE.Vector3(0, 1, 0), t);
    else m.makeBasis(r, new THREE.Vector3(0, 1, 0), t.clone().negate());
    m.setPosition(
      r
        .clone()
        .multiplyScalar((R - depth / 2 + B) / 2)
        .setY(yMid),
    );
    geo.applyMatrix4(m);
    return geo;
  };
  for (let i = 0; i < VALVE.portCount; i++) {
    const a0 = i * step + G.SLOT_HALF;
    const a1 = (i + 1) * step - G.SLOT_HALF;
    const parts = [
      new THREE.LatheGeometry(outer, 8, a0, a1 - a0),
      new THREE.LatheGeometry(bore, 8, a0, a1 - a0),
      wall(a0, -1),
      wall(a1, 1),
    ];
    const bar = mergeGeometries(parts, false);
    parts.forEach((p) => p.dispose());
    g.add(mesh(bar, mat));
  }
  // lock nut on the thread, against the top face of the reducer
  const nut = mesh(hexNut(VALVE.nippleLockNutAcrossFlats, VALVE.nippleLockNutThickness, VALVE.threadDiameter), mat, [
    0,
    G.RED_TOP,
    0,
  ]);
  g.add(nut);
  env.cut.clip(g);
  // section: the wall is interrupted by the ports at 90 and 270 degrees, which the plane z = 0 crosses
  const polys: Poly[] = [];
  for (const [y0, y1] of [
    [G.SEAT_TOP, G.PORT_BOTTOM],
    [G.PORT_TOP, G.NIPPLE_TOP],
  ])
    polys.push(rect(B, y0, R, y1), rect(-R, y0, -B, y1));
  const corner = VALVE.nippleLockNutAcrossFlats / Math.sqrt(3);
  const nutTop = G.RED_TOP + VALVE.nippleLockNutThickness;
  polys.push(rect(R, G.RED_TOP, corner, nutTop), rect(-corner, G.RED_TOP, -R, nutTop));
  cap(env, 'valve-nipple', g, polys);
  // for the interpenetration test the wall is whole: the ports only remove material
  section(env, 'valve-nipple', 'fixed', [
    rect(B, G.SEAT_TOP, R, G.NIPPLE_TOP),
    rect(-R, G.SEAT_TOP, -B, G.NIPPLE_TOP),
    rect(R, G.RED_TOP, corner, nutTop),
    rect(-corner, G.RED_TOP, -R, nutTop),
  ]);
  anchor(env, 'valve-nipple', g, R * Math.SQRT1_2, G.PORT_MID, R * Math.SQRT1_2);
  return g;
}

/** Female-female sleeve 15x21: its lower thread takes the nipple, its upper one the thermowell. */
export function buildSleeve(env: PartEnv): THREE.Group {
  const g = group('valve-sleeve');
  const c = 0.001;
  const poly: Profile = [
    [G.NIPPLE_R, G.SLEEVE_BOTTOM],
    [G.SLEEVE_R - c, G.SLEEVE_BOTTOM],
    [G.SLEEVE_R, G.SLEEVE_BOTTOM + c],
    [G.SLEEVE_R, G.SLEEVE_TOP - c],
    [G.SLEEVE_R - c, G.SLEEVE_TOP],
    [G.NIPPLE_R, G.SLEEVE_TOP],
  ];
  const body = mesh(lathe(crispRuns(poly), 48), MAT.zinc());
  g.add(body);
  env.cut.clip(body);
  cap(env, 'valve-sleeve', g, mirrored(poly));
  section(env, 'valve-sleeve', 'fixed', mirrored(poly));
  anchor(env, 'valve-sleeve', g, 0, G.SLEEVE_TOP - 0.008, G.SLEEVE_R);
  return g;
}

/**
 * Thermowell ("doigt de gant") used as the guide: an open tube cut to length that hangs from its threaded neck in the
 * sleeve, with a collar whose flat end face is the stop of the weight (S1 08:18, 15:42).
 */
export function buildGuide(env: PartEnv): THREE.Group {
  const g = group('valve-guide');
  const c = 0.0008;
  const poly: Profile = [
    [G.TUBE_BORE, G.TUBE_BOTTOM],
    [G.TUBE_R, G.TUBE_BOTTOM],
    [G.TUBE_R, G.NECK_BOTTOM],
    [G.NIPPLE_R, G.NECK_BOTTOM],
    [G.NIPPLE_R, G.SLEEVE_TOP],
    [G.COLLAR_R, G.SLEEVE_TOP],
    [G.COLLAR_R, G.GUIDE_TOP - c],
    [G.COLLAR_R - c, G.GUIDE_TOP],
    [G.TUBE_BORE, G.GUIDE_TOP],
  ];
  const body = mesh(lathe(crispRuns(poly), 40), MAT.inox());
  g.add(body);
  env.cut.clip(body);
  cap(env, 'valve-guide', g, mirrored(poly));
  section(env, 'valve-guide', 'fixed', mirrored(poly));
  anchor(env, 'valve-guide', g, 0, G.GUIDE_TOP - 0.006, G.COLLAR_R);
  return g;
}

/** Conical seat, milled at the angle of the head (S1 18:32): the lowest 3.5 mm of the nipple, drawn as its own part. */
export function seatProfile(): Profile {
  const bottomR = G.HEAD_R + 0.0001;
  const chamferTop = G.NIPPLE_BOTTOM + (bottomR - G.NIPPLE_BORE);
  return [
    [bottomR, G.NIPPLE_BOTTOM],
    [G.NIPPLE_R, G.NIPPLE_BOTTOM],
    [G.NIPPLE_R, G.SEAT_TOP],
    [G.NIPPLE_BORE, G.SEAT_TOP],
    [G.NIPPLE_BORE, chamferTop],
  ];
}

export function buildSeat(env: PartEnv): THREE.Group {
  const g = group('valve-seat');
  const poly = seatProfile();
  const body = mesh(lathe(crispRuns(poly), 48), MAT.brass());
  g.add(body);
  env.cut.clip(body);
  cap(env, 'valve-seat', g, mirrored(poly));
  section(env, 'valve-seat', 'fixed', mirrored(poly));
  anchor(env, 'valve-seat', g, 0, 0.0545, reducerRadiusAt(0.0545));
  return g;
}

// ------------------------------------------------------------------------------------------------ the moving stem

/** Stainless countersunk screw cut short: a flat face and a 45 degree cone, drilled for the rod (S1 09:47). */
export function headProfile(): Profile {
  return [
    [G.T, G.HEAD_BASE],
    [G.HEAD_R, G.HEAD_BASE],
    [G.T, G.CONE_TOP],
  ];
}

export function buildHead(env: PartEnv): THREE.Group {
  const g = group('valve-head');
  const f = stemFrame(env, g, 'head');
  const poly = headProfile();
  const body = mesh(lathe(crispRuns(poly), 48), MAT.inox());
  f.spin.add(body);
  env.cut.clip(body);
  cap(env, 'valve-head', f.spin, mirrored(poly));
  section(env, 'valve-head', 'stem', mirrored(poly));
  anchor(env, 'valve-head', f.lift, 0, 0.0615, reducerRadiusAt(0.0615));
  return g;
}

/** M6 threaded rod, with a threaded tail that sticks out of the lock nut. */
export function buildStem(env: PartEnv): THREE.Group {
  const g = group('valve-stem');
  const f = stemFrame(env, g, 'stem');
  const inox = MAT.inox();
  f.spin.add(mesh(threadedRod6(G.ROD_MID - G.ROD_BOTTOM), inox, [0, G.ROD_BOTTOM, 0]));
  const tail = mesh(threadedRod6(G.TAIL_LENGTH), inox);
  f.spin.add(tail);
  env.rig.rodTail = tail;
  const tailBottom = G.STACK_TOP + G.DEFAULT_TRAVEL + VALVE.rodTailProud - G.TAIL_LENGTH;
  section(env, 'valve-stem', 'stem', [
    rect(-G.T, G.ROD_BOTTOM, G.T, G.ROD_MID),
    rect(-G.T, tailBottom, G.T, tailBottom + G.TAIL_LENGTH),
  ]);
  // follows the top of the rod: it is raised by the travel like the stack (see `stackPart`)
  const top = group('stem-anchor-frame');
  top.position.y = G.DEFAULT_TRAVEL;
  env.rig.stackFrames.push(top);
  f.lift.add(top);
  anchor(env, 'valve-stem', top, 0.004, G.STACK_TOP + VALVE.rodTailProud - 0.002, G.T);
  return g;
}

const threadedRod6 = (length: number): THREE.BufferGeometry => {
  const depth = G.T * 0.1;
  const steps = Math.max(2, Math.round(length / (VALVE.rodPitch / 2)));
  const prof: THREE.Vector2[] = [new THREE.Vector2(0, 0)];
  for (let i = 0; i <= steps; i++) prof.push(new THREE.Vector2(G.T - (i % 2 ? depth : 0), (length * i) / steps));
  prof.push(new THREE.Vector2(0, length));
  return new THREE.LatheGeometry(prof, 10);
};

/** The two machined sleeves that turn the threaded rod into an axle: 9.9 mm in the 10 mm bore (S1 08:50, 09:02). */
export function buildStemSleeves(env: PartEnv): THREE.Group {
  const g = group('stem-sleeves');
  const f = stemFrame(env, g, 'sleeves');
  const R = G.SLEEVE_ON_ROD_R;
  const c = 0.0005;
  const L = VALVE.stemSleeveLength;
  const poly: Profile = [
    [G.T, 0],
    [R - c, 0],
    [R, c],
    [R, L - c],
    [R - c, L],
    [G.T, L],
  ];
  const brass = MAT.brass();
  for (let i = 0; i < 2; i++)
    f.spin.add(mesh(lathe(crispRuns(poly), 32), brass, [0, VALVE.stemSleeveBottom + i * VALVE.stemSleeveSpacing, 0]));
  const rings: Poly[] = [];
  for (let i = 0; i < 2; i++) {
    const y0 = VALVE.stemSleeveBottom + i * VALVE.stemSleeveSpacing;
    rings.push(rect(G.T, y0, R, y0 + L), rect(-R, y0, -G.T, y0 + L));
  }
  section(env, 'stem-sleeves', 'stem', rings);
  anchor(env, 'stem-sleeves', f.lift, 0, VALVE.stemSleeveBottom + 0.0025, G.SLEEVE_R);
  return g;
}

/** Nut with filed fins under the head: it tightens the head and makes the stem turn a little at every stroke (S1 12:02). */
export function buildFins(env: PartEnv): THREE.Group {
  const g = group('valve-fins');
  const f = stemFrame(env, g, 'fins');
  const brass = MAT.brass();
  const fy = G.HEAD_BASE - VALVE.finsHeight / 2;
  f.spin.add(mesh(ring(VALVE.finsHubDiameter / 2, G.T, VALVE.finsHeight, 24), brass, [0, G.FINS_BOTTOM, 0]));
  section(env, 'valve-fins', 'stem', [
    rect(G.T, G.FINS_BOTTOM, VALVE.finsHubDiameter / 2, G.HEAD_BASE),
    rect(-VALVE.finsHubDiameter / 2, G.FINS_BOTTOM, -G.T, G.HEAD_BASE),
  ]);
  const hub = VALVE.finsHubDiameter / 2;
  const out = VALVE.finsDiameter / 2;
  for (let i = 0; i < VALVE.finsCount; i++) {
    const arm = group('vane');
    arm.rotation.y = (i * Math.PI * 2) / VALVE.finsCount;
    const w = out - hub + 0.0008;
    const vane = mesh(new THREE.BoxGeometry(w, VALVE.finsHeight - 0.0006, 0.0012), brass, [
      hub - 0.0008 + w / 2,
      fy,
      0,
    ]);
    vane.rotation.x = 32 * DEG;
    arm.add(vane);
    f.spin.add(arm);
  }
  anchor(env, 'valve-fins', f.lift, 0, 0.0475, reducerRadiusAt(0.0475));
  return g;
}

// ------------------------------------------------------------------------------------------------ weight and nuts

/**
 * A part of the stack above the guide: its frame follows the stem (lowered by the lift) and sits `travel` above the guide
 * in the closed pose, so that it lands on the guide when the valve is open.
 */
function stackPart(
  env: PartEnv,
  id: string,
  y0: number,
  build: (b: THREE.Group) => void,
  at: [number, number, number],
): THREE.Group {
  const g = group(id);
  const f = stemFrame(env, g, id);
  const stack = group(`${id}-stack`);
  const stackA = group(`${id}-stack-anchor`);
  for (const s of [stack, stackA]) {
    env.rig.stackFrames.push(s);
    s.position.y = G.DEFAULT_TRAVEL;
  }
  f.spin.add(stack);
  f.lift.add(stackA);
  const body = group(`${id}-body`);
  body.position.y = y0;
  build(body);
  stack.add(body);
  anchor(env, id, stackA, at[0], y0 + at[1], at[2]);
  return g;
}

/** Counterweight machined from a 30-32 mm rebar bar, tapped on its axis and faced flat where it lands on the guide. */
export function buildWeight(env: PartEnv): THREE.Group {
  const dark = MAT.steelBlack();
  const L = VALVE.counterweightLength;
  return stackPart(
    env,
    'counterweight',
    G.STACK_Y,
    (b) => {
      const R = VALVE.counterweightDiameter / 2;
      const rib = VALVE.rebarRibHeight;
      // rebar: transverse ribs as alternating radii and two longitudinal ribs, tapped on the axis, faced flat
      const n = 20;
      const ribbed: Profile = [];
      for (let i = 0; i <= n; i++) ribbed.push([R - (i % 2 === 0 ? rib : 0), (L * i) / n]);
      const bore = G.T + 0.0004;
      b.add(
        mesh(
          lathe(
            [
              [
                [bore, 0],
                [R - rib, 0],
              ],
              ribbed,
              [
                [R - rib, L],
                [bore, L],
              ],
              [
                [bore, L],
                [bore, 0],
              ],
            ],
            40,
          ),
          dark,
        ),
      );
      section(env, 'counterweight', 'stack', [
        rect(bore, G.STACK_Y, R, G.STACK_Y + L),
        rect(-R, G.STACK_Y, -bore, G.STACK_Y + L),
      ]);
      for (const a of [0, Math.PI]) {
        b.add(
          mesh(new THREE.BoxGeometry(0.0022, L, 0.0018), dark, [
            (R + 0.0003) * Math.cos(a),
            L / 2,
            (R + 0.0003) * Math.sin(a),
          ]),
        );
      }
    },
    [0, L * 0.5, VALVE.counterweightDiameter / 2],
  );
}

/** M6 nut on the rod: the first one sets the stroke, the second locks it (S1 12:49). */
function nut(env: PartEnv, id: string, y0: number): THREE.Group {
  const mat = MAT.zinc();
  return stackPart(
    env,
    id,
    y0,
    (b) => {
      b.add(mesh(hexNut(VALVE.nutAcrossFlats, VALVE.nutThickness, VALVE.rodDiameter + 0.0004), mat));
      const a = VALVE.nutAcrossFlats / 2;
      const bore = VALVE.rodDiameter / 2 + 0.0002;
      section(env, id, 'stack', [
        rect(bore, y0, a, y0 + VALVE.nutThickness),
        rect(-a, y0, -bore, y0 + VALVE.nutThickness),
      ]);
    },
    [0, VALVE.nutThickness / 2, VALVE.nutAcrossFlats / 2],
  );
}

export const buildStrokeNut = (env: PartEnv): THREE.Group =>
  nut(env, 'stroke-nut', G.STACK_Y + VALVE.counterweightLength);
export const buildLockNut = (env: PartEnv): THREE.Group =>
  nut(env, 'lock-nut', G.STACK_Y + VALVE.counterweightLength + VALVE.nutThickness);
