import { Drawing, INK_2 } from '@onigam/lab-kit/drawings';
import type { DrawingSheet } from '@onigam/lab-kit/drawings';
import { l, tr, type L } from '@onigam/lab-kit/i18n';
import { STROKE, WEIGHT } from '../../data/part-helpers';
import { DERIVED, MODEL } from '../../data/parts/ram';
import { nEn, nFr } from '../../data/units';
import { SNIFTER_DIAMETER } from '../../sim/physics';
import { CHAMBER, FITTINGS } from '../../three/dims';
import { ITEM, box, grid, heading, marksLegend, note, partOf, type Cell } from './draw';
import { CONE_DEG, CONE_TOP, CV, R, ROD_BOTTOM, V, cat, k, lab, stack } from './geom';
import { partIds, type WorldId } from '../../part-ids';

const NUMBER = 'RP-D06';
const TITLE = l('Nomenclature : bélier et clapet de choc', 'Bill of materials: ram and waste valve');

const N = (x: number, digits = 0): L => l(nFr(x, digits), nEn(x, digits));

/** Main dimensions of each part, from dims.ts through geom.ts (the marks say which are reported, derived or estimated). */
const DIMS: Record<string, L> = {
  ram: cat('Ø', lab(R.bodyR * 2, 'E'), ' × ', lab(R.L, 'E'), l(' · alésage Ø', ' · bore Ø'), lab(R.bodyIR * 2, 'E')),
  'inlet-flange': cat(
    'Ø',
    lab(R.inletFlangeR * 2, 'E'),
    ' × ',
    lab(R.inletFlangeT, 'E'),
    ' · 4 × M10 · ',
    l('tube Ø', 'pipe Ø'),
    lab(R.pipeOR * 2, 'D'),
  ),
  'inlet-valve': cat('DN25 · L ', lab(R.v1L, 'E'), ' · 4 × M10'),
  strainer: cat('DN25 · L ', lab(R.strainerL, 'E'), l(' · tamis inox', ' · stainless screen')),
  'waste-valve': cat(
    l('platine ', 'plate '),
    lab(V.plateHalf * 2, 'E'),
    ' × ',
    lab(V.plateHalf * 2, 'E'),
    ' · h ',
    lab(stack(STROKE).rodTop, 'E'),
    l(' (14 pièces)', ' (14 parts)'),
  ),
  'delivery-valve': cat(
    l('hexagone ', 'hex '),
    lab(CV.rv * 2, 'E'),
    ' × ',
    lab(CV.height, 'E'),
    l(' · siège Ø', ' · seat Ø'),
    lab(CV.seatBoreR * 2, 'E'),
  ),
  'air-chamber': cat(
    'Ø',
    lab(k(CHAMBER.diameter), 'E'),
    ' × ',
    lab(k(CHAMBER.shellHeight), 'D'),
    ' · ',
    N(CHAMBER.volumeL),
    ' L*',
  ),
  snifter: cat(
    l('hexagone ', 'hex '),
    lab(k(FITTINGS.snifterDiameter), 'E'),
    l(' · orifice Ø', ' · orifice Ø'),
    N(SNIFTER_DIAMETER * 1000, 1),
    l(' (modèle)', ' (model)'),
  ),
  gauge: cat('Ø', lab(R.gaugeD, 'E'), ' · 0–', N(FITTINGS.gaugeFullScaleBar), ' bar*'),
  'delivery-union': cat('DN15 · L ', lab(R.unionL, 'E'), l(' · tuyau PE', ' · PE pipe')),
  'outlet-valve': cat('DN15 · L ', lab(R.smallValveL, 'E')),
  'drain-valve': cat('DN15 · L ', lab(R.smallValveL, 'E'), l(' · embout cannelé', ' · hose tail')),
  foundation: cat(lab(R.padL, 'D'), ' × ', lab(R.padW, 'E'), ' × ', lab(R.padT, 'E'), ' · 4 × M10*'),
  'base-plate': cat(
    lab(V.plateHalf * 2, 'E'),
    ' × ',
    lab(V.plateHalf * 2, 'E'),
    ' × ',
    lab(V.plateT, 'E'),
    ' · 4 × ',
    lab(V.holeR * 2, 'E', 'Ø'),
    ' · ',
    l('alésage ', 'bore '),
    lab(V.plateBoreR * 2, 'D', 'Ø'),
  ),
  'valve-socket': cat('26×34 · ', lab(V.socketR * 2, 'E', 'Ø'), ' × ', lab(V.socketH, 'E')),
  'valve-reducer': cat('26×34 → 15×21 · ', lab(V.redR * 2, 'E', 'Ø'), ' × ', lab(V.redTop, 'E')),
  'valve-nipple': cat(
    '15×21 · ',
    lab(V.nippleTop - V.nippleBottom, 'R'),
    ' · 4 × ',
    lab(V.portW, 'E'),
    '×',
    lab(V.portTop - V.portBottom, 'E'),
  ),
  'valve-sleeve': cat('15×21 · ', lab(V.sleeveR * 2, 'E', 'Ø'), ' × ', lab(V.sleeveTop - V.sleeveBottom, 'E')),
  'valve-seat': cat(
    lab(V.seatTop - V.nippleBottom, 'E'),
    l(' · cône ', ' · cone '),
    `${2 * CONE_DEG}°*`,
    ' · ',
    lab(V.seatBoreR * 2, 'R', 'Ø'),
  ),
  'valve-head': cat(
    lab(V.headR * 2, 'E', 'Ø'),
    ' · h ',
    lab(CONE_TOP - V.headBase, 'D'),
    l(' · cône ', ' · cone '),
    `${2 * CONE_DEG}°*`,
  ),
  'valve-stem': cat('M6 · L ', lab(stack(STROKE).rodTop - ROD_BOTTOM, 'E')),
  'stem-sleeves': cat(
    lab(V.sleeveOnRodR * 2, 'D', 'Ø'),
    ' × ',
    lab(V.sleeveOnRodL, 'E'),
    ' · ',
    l('jeu ', 'clearance '),
    l('0,1 mm', '0.1 mm'),
  ),
  'valve-guide': cat(
    lab(V.tubeR * 2, 'E', 'Ø'),
    '/',
    lab(V.tubeBoreR * 2, 'E'),
    ' × ',
    lab(V.guideTop - V.tubeBottom, 'E'),
    l(' · collerette ', ' · collar '),
    lab(V.collarR * 2, 'E', 'Ø'),
  ),
  'valve-fins': cat(lab(V.finsR * 2, 'E', 'Ø'), ' · h ', lab(V.finsH, 'E'), ' · 4 ', l('ailettes', 'fins')),
  counterweight: cat(
    lab(V.weightR * 2, 'R', 'Ø'),
    ' × ',
    lab(V.weightL, 'D'),
    ' · ',
    N(WEIGHT),
    l(' g (calibré)', ' g (calibrated)'),
  ),
  'stroke-nut': cat('M6 · ', lab(V.nutAF, 'E'), l(' s/plats × ', ' a/f × '), lab(V.nutT, 'E')),
  'lock-nut': cat('M6 · ', lab(V.nutAF, 'E'), l(' s/plats × ', ' a/f × '), lab(V.nutT, 'E')),
};

/** Status of each part: what the video says about it, and what the lab had to estimate. */
const STATUS_OVERRIDE: Record<string, L> = {
  ram: l('estimation : aucune fiche du constructeur', 'estimate: no maker data sheet'),
  'waste-valve': l('suit la vidéo (S1) : voir 14 à 27', 'follows the video (S1): see 14 to 27'),
  'valve-socket': l(
    'taille 26×34 rapportée (S1 03:54), longueurs estimées',
    '26×34 size reported (S1 03:54), lengths estimated',
  ),
  'valve-reducer': l(
    'tailles 26×34 et 15×21 rapportées, longueurs estimées',
    '26×34 and 15×21 sizes reported, lengths estimated',
  ),
  'valve-nipple': l(
    '7–8 cm et 15×21 rapportés (S1 07:53), lumières estimées',
    '7–8 cm and 15×21 reported (S1 07:53), ports estimated',
  ),
  'valve-sleeve': l(
    'taille 15×21 rapportée (S1 08:09), longueur estimée',
    '15×21 size reported (S1 08:09), length estimated',
  ),
  'valve-seat': l(
    'fraisée au cône de la tête (S1 09:37), épaisseur estimée',
    'milled to the head’s cone (S1 09:37), thickness estimated',
  ),
  'valve-head': l(
    'vis inox raccourcie (S1 09:47), cotes estimées',
    'shortened stainless screw (S1 09:47), dimensions estimated',
  ),
  'valve-stem': l('tige M6 rapportée (S1 08:38), longueur estimée', 'M6 rod reported (S1 08:38), length estimated'),
  'stem-sleeves': l('jeu de 0,1 mm rapporté (S1 09:02), Ø dérivé', '0.1 mm fit reported (S1 09:02), Ø derived'),
  'valve-guide': l(
    'doigt de gant inox (S1 08:18), cotes estimées',
    'stainless thermowell (S1 08:18), dimensions estimated',
  ),
  'valve-fins': l('ailettes limées (S1 12:02), cotes estimées', 'filed fins (S1 12:02), dimensions estimated'),
  counterweight: l(
    'barre de 30–32 mm rapportée (S1 15:59), masse calibrée',
    '30–32 mm bar reported (S1 15:59), mass calibrated',
  ),
  'stroke-nut': l('rôle rapporté (S1 12:55), course calibrée', 'role reported (S1 12:55), stroke calibrated'),
  'lock-nut': l('rôle rapporté (S1 13:29), épaisseur estimée', 'role reported (S1 13:29), thickness estimated'),
  'delivery-valve': l(
    'situé dans la vidéo (S1 03:26), cotes estimées',
    'placed in the video (S1 03:26), dimensions estimated',
  ),
  'air-chamber': l(
    'vue dans la vidéo (S1 03:26), cotes estimées',
    'seen in the video (S1 03:26), dimensions estimated',
  ),
  foundation: l('estimation : la vidéo ne montre qu’une dalle', 'estimate: the video only shows a slab'),
  'base-plate': l(
    'découpée comme celle du Walton (S1 06:36), cotes estimées',
    'cut like the Walton’s (S1 06:36), dimensions estimated',
  ),
};

function status(id: string): L {
  return STATUS_OVERRIDE[id] ?? l('estimation (bélier générique)', 'estimate (generic ram)');
}

/** Item numbers shown by a sheet, as a compact list ("1–13", "17, 19–21, 24–27"). */
function ranges(items: number[]): string {
  const s = [...new Set(items)].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < s.length;) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j]! + 1) j++;
    out.push(j - i >= 2 ? `${s[i]}–${s[j]}` : s.slice(i, j + 1).join(', '));
    i = j + 1;
  }
  return out.join(', ');
}

const SIZE = 1.95;
const COLS = [
  { label: l('Rep.', 'Item'), w: 9, align: 'middle' as const },
  { label: l('Id 3D', '3D id'), w: 31, mono: true },
  { label: l('Désignation', 'Part'), w: 45 },
  { label: l('Matière', 'Material'), w: 62 },
  { label: l('Qté', 'Qty'), w: 8, align: 'middle' as const },
  { label: l('Cotes principales (mm)', 'Main dimensions (mm)'), w: 56, mono: true },
  { label: l('Statut', 'Status'), w: 68 },
];

function rowsOf(world: WorldId): Cell[][] {
  return partIds(world).map((id) => {
    const p = partOf(id);
    return [
      { t: String(ITEM[id]), bold: true },
      { t: id, mono: true, color: INK_2 },
      { t: p.name, bold: true },
      { t: p.material },
      { t: String(p.qty ?? 1) },
      { t: DIMS[id] ?? '', mono: true },
      { t: status(id) },
    ];
  });
}

export function makeBom(others: DrawingSheet[]): DrawingSheet {
  const total = partIds('ram').length + partIds('valve').length;
  return {
    id: 'bom',
    number: NUMBER,
    group: 'ram',
    title: TITLE,
    description: l(
      `Nomenclature des ${total} pièces du bélier générique de 1″ et de son clapet de choc, construite à partir du catalogue des pièces du labo : repère, identifiant du modèle 3D, désignation, matière et quantité ne peuvent donc pas s’en écarter. Les repères 1 à 13 sont ceux de la feuille RP-D01, 14 à 27 ceux des feuilles du clapet ; la dernière colonne dit, pour chaque pièce, ce que la vidéo donne et ce qui est estimé. Aucune source ne donne de couple de serrage : aucun n’est indiqué.`,
      `Bill of materials of the ${total} parts of the generic 1″ ram and its waste valve, built from the lab’s parts catalogue: item, 3D model id, name, material and quantity cannot drift from it. Items 1 to 13 are those of sheet RP-D01, 14 to 27 those of the valve sheets; the last column says, for each part, what the video gives and what is estimated. No source gives a tightening torque: none is shown.`,
    ),
    scene: 'ram',
    parts: partIds('ram'),
    render() {
      const d = new Drawing();
      d.frame({
        title: TITLE,
        subtitle: l(
          `${total} repères · bélier générique de 1″ (monde ram) et clapet de choc de la vidéo (monde valve)`,
          `${total} items · generic 1″ ram (ram world) and the video’s waste valve (valve world)`,
        ),
        number: NUMBER,
        scale: tr(l('SO', 'NTS')),
      });
      const p = d.paper();
      const gridOpts = { size: SIZE, pad: 0.85, lineH: 3.05 };
      let y = heading(
        d,
        14,
        14,
        l(`A · LE BÉLIER · ${partIds('ram').length} repères`, `A · THE RAM · ${partIds('ram').length} items`),
        { size: 2.2 },
      );
      y += grid(d, 14, y - 0.4, COLS, rowsOf('ram'), gridOpts) + 4;
      y = heading(
        d,
        14,
        y,
        l(
          `B · LE CLAPET DE CHOC · ${partIds('valve').length} repères`,
          `B · THE WASTE VALVE · ${partIds('valve').length} items`,
        ),
        { size: 2.2 },
      );
      y += grid(d, 14, y - 0.4, COLS, rowsOf('valve'), gridOpts);

      // right column: notes, legend, where each item is drawn
      const x = 304;
      const w = 104;
      let ny = 14;
      ny = box(
        d,
        x,
        ny,
        w,
        l('NOTES', 'NOTES'),
        [
          {
            bullet: '1',
            t: l(
              'Bélier générique de 1″ : ce n’est pas le Walton n°3 de la vidéo, dont aucune fiche n’a été trouvée. Seul le clapet de choc (repères 14 à 27) suit la vidéo.',
              'Generic 1″ ram: not the video’s Walton n°3, for which no data sheet was found. Only the waste valve (items 14 to 27) follows the video.',
            ),
          },
          {
            bullet: '2',
            t: l(
              'Les cotes marquées * sont des estimations du modèle 3D, † des dérivés : voir la légende. Les longueurs du clapet sont estimées d’après les noms des raccords.',
              'Dimensions marked * are estimates of the 3D model, † derived: see the key. The valve lengths are estimated from the fittings’ names.',
            ),
          },
          {
            bullet: '3',
            t: l(
              `Course ${nFr(STROKE, 1)} mm et poids ${WEIGHT} g : calibrés par le modèle. Aucun couple de serrage, aucune tolérance d’usinage n’est donné par la source.`,
              `Stroke ${nEn(STROKE, 1)} mm and weight ${WEIGHT} g: calibrated by the model. The source gives no tightening torque and no machining tolerance.`,
            ),
          },
          {
            bullet: '4',
            t: l(
              `Sécurité : conduite motrice rigide et bélier ancré (pointe de ${nFr(MODEL.peakBar, 1)} bar à chaque coup, modèle) ; jamais un doigt dans le clapet en marche. L’eau d’une source n’est pas garantie potable, et la prise d’eau est réglementée (DDT, OFB).`,
              `Safety: rigid drive pipe and anchored ram (${nEn(MODEL.peakBar, 1)} bar peak at each stroke, model); never a finger in the valve while it runs. Spring water is not guaranteed potable, and taking water is regulated (France: DDT, OFB).`,
            ),
          },
          {
            bullet: '5',
            t: l(
              `Pression statique de la colonne de 65 m : ${nFr(DERIVED.deliveryBar, 1)} bar (dérivé).`,
              `Static pressure of the 65 m column: ${nEn(DERIVED.deliveryBar, 1)} bar (derived).`,
            ),
          },
        ],
        { size: 1.65 },
      );
      ny = marksLegend(d, x, ny + 2, w);
      // where each item is drawn
      ny = heading(d, x, ny + 1, l('OÙ VOIR LES REPÈRES', 'WHERE TO SEE THE ITEMS'), { size: 2 });
      const refRows = others.map((s) => [
        { t: s.number, mono: true, bold: true },
        { t: ranges((s.parts ?? []).map((id) => ITEM[id]!).filter(Boolean)), mono: true },
      ]);
      ny += grid(
        d,
        x,
        ny - 0.4,
        [
          { label: l('Feuille', 'Sheet'), w: 24 },
          { label: l('Repères', 'Items'), w: 80, mono: true },
        ],
        refRows,
        { size: 1.65, pad: 0.6, lineH: 2.5 },
      );
      p.text([x, ny + 3], l('RP-D06 : nomenclature (cette feuille).', 'RP-D06: bill of materials (this sheet).'), {
        size: 1.6,
        color: INK_2,
        baseline: 'top',
      });
      // a short summary under the tables
      const counts = (ids: string[]): number => ids.length;
      note(
        d,
        14,
        Math.max(y + 5, 200),
        214,
        l(
          `${counts([...partIds('ram'), ...partIds('valve')])} repères en tout : ${partIds('ram').length} pour le bélier, ${partIds('valve').length} pour le clapet de choc. Les quantités sont celles du catalogue (les deux manchons de la tige comptent pour 2).`,
          `${counts([...partIds('ram'), ...partIds('valve')])} items in all: ${partIds('ram').length} for the ram, ${partIds('valve').length} for the waste valve. Quantities are those of the catalogue (the stem’s two sleeves count as 2).`,
        ),
        { size: 1.7, color: INK_2 },
      );
      return d;
    },
  };
}
