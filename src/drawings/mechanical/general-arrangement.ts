import { Drawing, INK_2, type Pt } from '@onigam/lab-kit/drawings';
import type { DrawingSheet } from '@onigam/lab-kit/drawings';
import { l } from '@onigam/lab-kit/i18n';
import { DERIVED, MODEL } from '../../data/parts/ram';
import { nEn, nFr } from '../../data/units';
import { partIds } from '../../part-ids';
import { GENERIC_NOTE, ITEM, balloons, box, dimH, dimV, grid, heading, marksLegend, partOf } from './draw';
import { CH_MM, COVER_END, FOOT_X, R, S_X0, V1_X0, PIPE_FLANGE_X0, chamberSection, lab, labOf, dim } from './geom';
import {
  FOUNDATION_BOTTOM,
  GAUGE_TOP,
  OUTLET_VALVE_X,
  PIPE_END_X,
  UNION_X,
  VALVE_TOP,
  elevation,
  endView,
  plan,
} from './ram-draw';

const NUMBER = 'D01';
const TITLE = l('Bélier générique 1″ — plan d’ensemble', 'Generic 1″ ram — general arrangement');

function render(): Drawing {
  const d = new Drawing();
  d.frame({
    title: TITLE,
    subtitle: l(
      'Élévation, vue de dessus et vue d’extrémité · clapet de choc d’après la vidéo, simplifié',
      'Elevation, plan and end view · waste valve after the video’s, simplified',
    ),
    number: NUMBER,
    scale: '1:5',
  });
  const sc = 0.2;
  const ch = chamberSection();
  const xW = R.xWaste;
  const xS = R.xSnifter;
  const xD = R.xDelivery;
  const sh = CH_MM.shellBottom;
  const gy = sh + ch.yTop;
  const yo = CH_MM.outletHeight;

  // ------------------------------------------------------------------ front elevation
  const ev = d.view(100, 153, sc);
  elevation(ev);
  // chain along the bottom: axes of the three stacks from the inlet flange face of the body
  const yb = FOUNDATION_BOTTOM - 28;
  const chain: [number, number, 'E'][] = [
    [0, xW, 'E'],
    [xW, xS, 'E'],
    [xS, xD, 'E'],
    [xD, R.L, 'E'],
  ];
  for (const [a, b] of chain) dimH(ev, [a, FOUNDATION_BOTTOM], [b, FOUNDATION_BOTTOM], yb, lab(b - a, 'E'), 2);
  dimH(
    ev,
    [-40, FOUNDATION_BOTTOM],
    [-40 + R.padL, FOUNDATION_BOTTOM],
    yb - 28,
    labOf(dim('FOUNDATION', 'length'), '', 1),
    2.1,
  );
  // inlet chain above the pipe: flange, strainer, V1
  const yt = 105;
  dimH(ev, [PIPE_FLANGE_X0, 60], [S_X0, 60], yt, lab(R.inletFlangeT, 'E'), 1.9);
  dimH(ev, [S_X0, 60], [V1_X0, 60], yt, lab(R.strainerL, 'E'), 2);
  dimH(ev, [V1_X0, 60], [0, 60], yt, lab(R.v1L, 'E'), 2);
  // vertical: floor to axis, plate top, valve top, chamber and gauge tops
  dimV(ev, [-40, R.floorY], [0, 0], -85, lab(-R.floorY, 'E'), 2);
  dimV(ev, [xW - 50, 0], [xW - 50, R.plateTop], 40, lab(R.plateTop, 'E'), 1.9);
  dimV(ev, [xW - 15.5, 0], [xW - 15.5, VALVE_TOP], 20, lab(VALVE_TOP, 'E'), 2);
  dimV(ev, [xD - CH_MM.R, 0], [xD - CH_MM.R, sh + ch.yTop], xD - CH_MM.R - 30, lab(sh + ch.yTop, 'E'), 2);
  dimV(ev, [xD - 31.5, 0], [xD - 31.5, GAUGE_TOP], xD - CH_MM.R - 60, lab(GAUGE_TOP, 'E'), 2);
  dimV(ev, [PIPE_END_X, 0], [PIPE_END_X, yo], PIPE_END_X + 22, lab(yo, 'E'), 2);

  // ------------------------------------------------------------------ plan
  const pv = d.view(100, 238, sc);
  plan(pv);
  dimH(pv, [FOOT_X[0]!, 65], [FOOT_X[1]!, 65], 100, lab(R.footSpacing, 'E'), 2);
  dimV(pv, [-40, -150], [-40, 150], -80, lab(R.padW, 'E'), 2);

  // ------------------------------------------------------------------ end view
  const nv = d.view(292, 153, sc);
  endView(nv);
  dimH(
    nv,
    [-R.padW / 2, FOUNDATION_BOTTOM],
    [R.padW / 2, FOUNDATION_BOTTOM],
    FOUNDATION_BOTTOM - 28,
    lab(R.padW, 'E'),
    2,
  );
  nv.leader(
    [R.inletFlangeR * Math.cos(0.5), R.inletFlangeR * Math.sin(0.5)],
    14,
    -6,
    lab(R.inletFlangeR * 2, 'E', 'Ø'),
    { size: 2 },
  );
  dimV(nv, [R.padW / 2, FOUNDATION_BOTTOM], [CH_MM.R, GAUGE_TOP], 200, lab(GAUGE_TOP - FOUNDATION_BOTTOM, 'E'), 2);

  // ------------------------------------------------------------------ captions
  const cap = (x: number, y: number, t: ReturnType<typeof l>): void => {
    d.paper().text([x, y], t, { size: 3, weight: 'bold', anchor: 'middle' });
    d.paper().text([x, y + 4], '1:5', { size: 2.2, anchor: 'middle', mono: true, color: INK_2 });
  };
  cap(58, 24, l('ÉLÉVATION · vue de face', 'ELEVATION · front view'));
  cap(52, 262, l('VUE DE DESSUS', 'PLAN'));
  cap(292, 212, l('VUE D’EXTRÉMITÉ · côté arrivée', 'END VIEW · inlet side'));

  // ------------------------------------------------------------------ balloons
  const B = (v: typeof ev, at: Pt, px: number, py: number, id: string): void => balloons(v, [[at, px, py, ITEM[id]!]]);
  B(ev, [300, 34], 176, 128, 'ram');
  B(ev, [-300, -57], 40, 176, 'inlet-flange');
  B(ev, [-65, -41], 88, 178, 'inlet-valve');
  B(ev, [-182, -62], 62, 180, 'strainer');
  B(ev, [xW + 15.5, 290], 146, 84, 'waste-valve');
  B(ev, [xD + 25, 110], 214, 134, 'delivery-valve');
  B(ev, [xD + CH_MM.R - 0.5, 330], 214, 78, 'air-chamber');
  B(ev, [xS + 6, 75], 172, 112, 'snifter');
  B(ev, [xD + 22, gy + 70], 214, 40, 'gauge');
  B(ev, [UNION_X + 48, yo + 12], 236, 96, 'delivery-union');
  B(ev, [OUTLET_VALVE_X + 30, yo + 30], 206, 92, 'outlet-valve');
  B(ev, [COVER_END + 4 + 40, -43], 228, 172, 'drain-valve');
  B(ev, [-30, -180], 74, 190, 'foundation');

  // ------------------------------------------------------------------ parts list, legend, notes
  const xr = 346;
  heading(d, xr, 14, l('REPÈRES · nomenclature D06', 'ITEMS · bill of materials D06'), { size: 1.9 });
  const rows = partIds('ram').map((id) => [
    { t: String(ITEM[id]), bold: true },
    { t: partOf(id).name },
    { t: String(partOf(id).qty ?? 1) },
  ]);
  const gh = grid(
    d,
    xr,
    19,
    [
      { label: l('Rep.', 'Item'), w: 8, align: 'middle' },
      { label: l('Désignation', 'Part'), w: 48 },
      { label: l('Qté', 'Qty'), w: 6, align: 'middle' },
    ],
    rows,
    { size: 1.6, pad: 0.55, lineH: 2.5 },
  );
  marksLegend(d, xr, 19 + gh + 3, 62);
  box(
    d,
    262,
    222,
    146,
    l('NOTES', 'NOTES'),
    [
      { bullet: '1', t: GENERIC_NOTE },
      {
        bullet: '2',
        t: l(
          `Conduite motrice rigide, bélier ancré sur son massif : la pointe de pression atteint ${nFr(MODEL.peakBar, 1)} bar à chaque coup (modèle), la poussée axiale ${nFr(DERIVED.thrustKn, 1)} kN (dérivée). Jamais un doigt dans le clapet de choc en marche.`,
          `Rigid drive pipe, ram anchored on its block: the pressure peak reaches ${nEn(MODEL.peakBar, 1)} bar at every stroke (model), the axial push ${nEn(DERIVED.thrustKn, 1)} kN (derived). Never a finger in the waste valve while it runs.`,
        ),
      },
      {
        bullet: '3',
        t: l(
          'Le tronçon de conduite motrice est coupé : il figure les 20 m qui descendent de la réserve. Aucun couple de serrage n’est donné par la source.',
          'The drive pipe stub is cut short: it stands for the 20 m coming down from the tank. The source gives no tightening torque.',
        ),
      },
    ],
    { size: 1.65 },
  );
  return d;
}

export const generalArrangement: DrawingSheet = {
  id: 'general-arrangement',
  number: NUMBER,
  group: 'ram',
  title: TITLE,
  description: l(
    'Plan d’ensemble du bélier générique de 1″ à 1:5, d’après les cotes de la vue 3D : élévation, vue de dessus et vue d’extrémité côté arrivée, avec la conduite motrice coupée, la vanne et le filtre en Y d’arrivée, le corps sur son massif d’ancrage, le clapet de choc sur sa platine, le reniflard, le clapet de refoulement sous la cloche et son manomètre, la sortie avec sa vanne et son raccord, la vidange. Les repères renvoient à la nomenclature D06. Ce n’est pas le Walton n°3 de la vidéo : seules les cotes sans astérisque viennent d’une source, les autres sont des estimations (*) ou des dérivés (†).',
    'General arrangement of the generic 1″ ram at 1:5, from the dimensions of the 3D view: elevation, plan and end view from the inlet side, with the drive pipe cut short, the inlet valve and Y-strainer, the body on its anchor block, the waste valve on its plate, the snifter, the delivery check valve under the chamber with its gauge, the outlet with its valve and union, the drain. Items refer to the bill of materials D06. This is not the video’s Walton No. 3: only the dimensions without an asterisk come from a source, the others are estimates (*) or derived (†).',
  ),
  scene: 'ram',
  parts: partIds('ram'),
  render,
};
