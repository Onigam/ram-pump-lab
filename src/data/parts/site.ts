// Parts of the `site` world (ids frozen in src/part-ids.ts). Status words: see ../part-helpers.ts.
//
// Conventions of the site and catchment sheets (Data-B), checked by ../parts-site.test.ts:
//   - `maintenance` is ONE paragraph with three bold labels in this order: the typical failure of the part, how a
//     visitor can check it (look, listen, measure; spring water is never tasted: it is not guaranteed potable), then the
//     routine upkeep. French « **Panne à prévoir.** … **À vérifier.** … **Entretien.** », English « **Typical failure.**
//     … **How to check.** … **Upkeep.** ».
//   - Who says what is always visible in the text: S1 (the video, with `video` timestamps), the textbook sources (NC State
//     Extension S4, Practical Action, Oxfam: named in the sentence), the model (« modèle »), or the lab's own drawing
//     (« estimation »). The video does not detail the catchment: the `catchment` sheets say so and give the common
//     practice of spring protection, never a « build it for real » dimension beyond what a source gives.
//   - Figures that are not reported are written once, in FIG below, and shown with {name} placeholders so that the
//     French and English spellings (7,5 / 7.5, 5 700 / 5,700) can never drift apart.
import type { PartInfo } from '@onigam/lab-kit/content';
import { l, type L } from '@onigam/lab-kit/i18n';
import { WAVE_SPEED } from '../../sim/physics';
import {
  CONSUMPTION_VALVE_3,
  SOURCE_FLOW_BEFORE,
  SOURCE_FLOW_TODAY,
  TANK_HOURS_VALVE_3,
  TANK_VOLUME_DERIVED,
} from '../../sim/presets';
import { HOUSE, PIT, SITE as SITE_DIMS, TANK, TOWER } from '../../three/dims';
import { mm, nEn, nFr, round } from '../units';
import { STROKE, diaH, lenM, lenMm, sp, tagged, type Status } from '../part-helpers';

const DAY = 1440; // minutes in a day
const PIPE_AREA = (Math.PI / 4) * SITE_DIMS.driveBore ** 2; // m², drive pipe section
const TANK_AREA = Math.PI * (TANK.diameter / 2) ** 2; // m², buffer tank floor
const KPA_PER_M = 9.81; // ρ·g of water, kPa per metre of column
const SPRING_HIGH = 7.8; // L/min, upper end of the spring flow today (K6)

/**
 * Results of the simulation quoted in the texts (preset valve n°1 and n°3, spring 7.5 L/min, delivery head 65 m;
 * the `30` values are the steady state of the n°1 valve when the water has only been lifted 30 m). Exact values, rounded
 * when shown. parts-site.test.ts checks every one of them against `RamSim`, so a recalibration cannot go unnoticed.
 */
export const MODEL = {
  drive1: 6.66, // L/min taken from the drive pipe, valve n°1
  waste1: 6.32, // L/min thrown out by the waste valve, valve n°1
  delivered1: 0.347, // L/min lifted, valve n°1 (K10: 500 L/day)
  strokes1: 109.3, // strokes/min, valve n°1 (K11: 100–110)
  peak1: 6.5, // bar, highest body pressure of a stroke, valve n°1
  peakWaterLogged: 7.26, // bar, same valve with a water-logged air chamber (scenario `water-logged`)
  drive3: 16.99, // L/min, valve n°3 (K8: ≈ 17)
  waste3: 15.93, // L/min, valve n°3
  hours3: 10.0, // hours for the tank to empty, valve n°3 (K8)
  drive30: 11.4, // L/min taken by the valve n°1 when the water has only been lifted 30 m
  delivered30: 1.6, // L/min lifted at 30 m
} as const;

const DELIVERY_LITRES = (Math.PI / 4) * SITE_DIMS.deliveryBore ** 2 * SITE_DIMS.deliveryLength * 1000;
const DELIVERY_LPM = 500 / DAY; // K10: 500 L/day
const SURPLUS1 = SOURCE_FLOW_TODAY - MODEL.drive1;

/** Volume of the delivery pipe and time to fill it at the video's final delivery rate (derived from dims.ts and K10). */
export const DELIVERY_FILL = { litres: round(DELIVERY_LITRES, -1), hours: round(DELIVERY_LITRES / DELIVERY_LPM / 60) };

/** [value, decimals] of every number the texts write by placeholder. Reported, derived or model, as the comment says. */
export const FIG = {
  // reported (S1, S4)
  source: [SOURCE_FLOW_TODAY, 1], // K6
  sourceHigh: [SPRING_HIGH, 1], // K6
  sourceBefore: [SOURCE_FLOW_BEFORE, 0], // K6
  drawN3: [CONSUMPTION_VALVE_3, 0], // K8, the author's estimate
  hoursN3: [TANK_HOURS_VALVE_3, 0], // K8
  fall: [SITE_DIMS.fall, 1], // K1
  driveLen: [SITE_DIMS.driveLength, 0], // K2
  lift: [SITE_DIMS.deliveryHead, 0], // K3
  deliveryLen: [SITE_DIMS.deliveryLength, 0], // K3
  perDay: [500, 0], // K10
  minFlow1in: [22.7, 1], // K21, NC State table for a 1" ram
  // derived
  tankL: [TANK_VOLUME_DERIVED, 0], // (17 − 7.5) L/min × 600 min
  deficitN3: [CONSUMPTION_VALVE_3 - SOURCE_FLOW_TODAY, 1],
  dropPct: [round(((SOURCE_FLOW_BEFORE - SOURCE_FLOW_TODAY) / SOURCE_FLOW_BEFORE) * 100), 0],
  springDay: [round((SOURCE_FLOW_TODAY * DAY) / 1000, 1), 1], // m³/day
  springDayHigh: [round((SPRING_HIGH * DAY) / 1000, 1), 1],
  lossPct: [round((1 / SOURCE_FLOW_TODAY) * 100), 0], // share of the spring that a 1 L/min leak takes
  tankHoursSpring: [round(TANK_VOLUME_DERIVED / SOURCE_FLOW_TODAY / 60, 1), 1], // refill time, ram stopped
  tankHoursRam1: [round(TANK_VOLUME_DERIVED / MODEL.drive1 / 60), 0], // no spring, valve n°1
  tankHoursRam3: [round(TANK_VOLUME_DERIVED / MODEL.drive3 / 60, 1), 1], // no spring, valve n°3
  tankTonnes: [round(TANK_VOLUME_DERIVED / 1000, 1), 1],
  tankRiseCm: [round((100 * ((SOURCE_FLOW_TODAY * 60) / 1000)) / TANK_AREA), 0], // cm/h, drive gate valve closed
  sludgeL: [round(TANK_AREA * TANK.outletAboveFloor * 1000, -1), 0], // litres under the intake
  waterDepth: [round(TANK.height - TANK.outletAboveFloor, 1), 1], // m of water above the outlet, tank full
  gateBar: [round(((TANK.height - TANK.outletAboveFloor) * KPA_PER_M) / 100, 1), 1], // bar at the gate valve, tank full
  // derived from the model
  drive1: [MODEL.drive1, 1],
  waste1: [MODEL.waste1, 1],
  delivered1: [MODEL.delivered1, 2],
  peak1: [MODEL.peak1, 1],
  peakWL: [MODEL.peakWaterLogged, 1],
  drive3: [MODEL.drive3, 0],
  waste3: [MODEL.waste3, 1],
  surplus1: [round(SURPLUS1, 1), 1], // L/min that the n°1 valve leaves to the overflow
  surplus1Day: [round((SURPLUS1 * DAY) / 1000, 1), 1], // m³/day
  margin1Pct: [round((SURPLUS1 / SOURCE_FLOW_TODAY) * 100), 0], // fall of the spring the n°1 valve can bear
  overflowBucket: [round(10 / SURPLUS1), 0], // minutes to fill 10 L at the overflow
  wasteDay1: [round((MODEL.waste1 * DAY) / 1000), 0], // m³/day
  wasteDay3: [round((MODEL.waste3 * DAY) / 1000), 0],
  wasteStroke1: [round((MODEL.waste1 * 1000) / MODEL.strokes1), 0], // mL thrown out per stroke
  wasteBucket: [round(10 / MODEL.waste1, 1), 1], // minutes to fill 10 L at the waste drain
  days6: [round(TANK_VOLUME_DERIVED / (MODEL.drive1 - 6) / DAY), 0], // days a full tank lasts with a 6 L/min spring
  spring6: [6, 0],
  deficit6: [round(MODEL.drive1 - 6, 1), 1],
  drive30: [MODEL.drive30, 0],
  delivered30: [MODEL.delivered30, 1],
  fillLitres: [DELIVERY_FILL.litres, 0], // delivery pipe volume
  fillHours: [DELIVERY_FILL.hours, 0], // delivery pipe fill time at 500 L/day
  driveLitres: [round(PIPE_AREA * SITE_DIMS.driveLength * 1000), 0], // water in the drive pipe
  pipeCm2: [round(PIPE_AREA * 10000, 1), 1], // drive pipe section
  lOverD: [round(SITE_DIMS.driveLength / SITE_DIMS.driveBore, -1), 0],
  staticBarDrive: [round((SITE_DIMS.fall * KPA_PER_M) / 100, 2), 2], // bar at the ram, valve closed
  staticBarDelivery: [round((SITE_DIMS.deliveryHead * KPA_PER_M) / 100, 1), 1],
  towerHalfDay: [250, 0], // L: half a day of delivery (Practical Action), 500 L/day
  towerLph: [round(500 / 24), 0], // L/h delivered
  towerLitreMin: [round(1 / DELIVERY_LPM), 0], // minutes for 1 L at the end of the delivery pipe
  tapBar: [round(((1 - HOUSE.terraceFraction) * SITE_DIMS.deliveryHead * KPA_PER_M) / 100, 1), 1],
  terraceM: [round(HOUSE.terraceFraction * SITE_DIMS.deliveryHead), 0],
  stroke1: [STROKE, 1], // mm, calibrated (docs/physics.md §3)
  // reported by Oxfam (overflow table: 1" galvanised pipe 20–50 cm long, 5 cm of head) and derived from it
  oxfamOverflowLps: [0.62, 2],
  oxfamOverflowLpm: [round(0.62 * 60), 0],
  oxfamOverflowTimes: [round((0.62 * 60) / SOURCE_FLOW_TODAY), 0],
} as const satisfies Record<string, readonly [number, number]>;

type FigName = keyof typeof FIG;

function fill(text: string, lang: 'fr' | 'en'): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => {
    const fig = FIG[key as FigName];
    if (!fig) throw new Error(`unknown figure {${key}} in "${text}"`);
    return lang === 'fr' ? nFr(fig[0], fig[1]) : nEn(fig[0], fig[1]);
  });
}

/** Bilingual text whose {placeholders} are FIG numbers, written the French way in `fr` and the English way in `en`. */
export function lf(fr: string, en: string): L {
  return l(fill(fr, 'fr'), fill(en, 'en'));
}

/** Same as `lf` for a spec value that is not reported by a source: adds the status tag. `en` defaults to `fr`. */
export function tf(status: Status, fr: string, en?: string): L {
  return tagged(status, fill(fr, 'fr'), fill(en ?? fr, 'en'));
}

export const SITE_PARTS: PartInfo[] = [
  {
    id: 'spring',
    scene: 'site',
    category: 'site',
    name: l('Captage de la source', 'Spring catchment'),
    short: l(
      'La source et son captage : leur débit décide quel bélier peut tourner. Détail dans le monde « Le captage ».',
      'The spring and its catchment: their flow decides which ram can run. Detail in the catchment world.',
    ),
    description: lf(
      'La source fournit l’eau et, par sa position en hauteur, toute l’énergie du site : l’eau qui en sort tombe de {fall} m jusqu’au bélier, sans électricité ni carburant. Le bélier ne tourne que si la source coule sans interruption et en quantité suffisante. Celle de la vidéo donnait {sourceBefore} L/min il y a deux ans et {source} à {sourceHigh} L/min aujourd’hui : cette baisse a rendu ingérables le clapet d’origine (≈ {drawN3} L/min, estimation de l’auteur) puis même le clapet n°2. Le débit choisit donc le bélier : NC State demande au moins {minFlow1in} L/min pour un bélier de 1″. La vidéo ne détaille pas le captage lui-même ; le laboratoire le dessine à part, d’après la pratique courante de protection des sources : ouvrez le monde « Le captage » pour le regard, le filtre à gravier et la conduite d’alimentation.',
      'The spring supplies the water and, by sitting high up, all the energy of the site: the water that leaves it falls {fall} m down to the ram, with no electricity and no fuel. The ram only works if the spring flows without a break and in sufficient quantity. The video’s spring gave {sourceBefore} L/min two years ago and {source}–{sourceHigh} L/min today: that drop made the original valve (≈ {drawN3} L/min, the author’s estimate) and then even the n°2 valve unmanageable. So the flow chooses the ram: NC State asks for at least {minFlow1in} L/min for a 1″ ram. The video does not detail the catchment itself; the lab draws it separately, after the common practice of spring protection: open the catchment world for the spring box, the gravel filter and the feed pipe.',
    ),
    material: l(
      'Non détaillé dans la vidéo (captage de source ; eau non garantie potable)',
      'Not detailed in the video (spring catchment; water not guaranteed potable)',
    ),
    specs: [
      sp('Débit aujourd’hui', 'Flow today', lf('{source} à {sourceHigh} L/min', '{source}–{sourceHigh} L/min')),
      sp('Débit il y a deux ans', 'Flow two years ago', lf('{sourceBefore} L/min', '{sourceBefore} L/min')),
      sp('Baisse en deux ans', 'Drop in two years', tf('derived', '≈ {dropPct} %', '≈ {dropPct}%')),
      sp(
        'Volume par jour',
        'Volume per day',
        tf('derived', '≈ {springDay} à {springDayHigh} m³/jour', '≈ {springDay}–{springDayHigh} m³/day'),
      ),
      sp('Prise du clapet n°1', 'Draw of the n°1 valve', tf('model', '≈ {drive1} L/min')),
      sp(
        'Marge sur le clapet n°1',
        'Margin over the n°1 valve',
        tf(
          'derived',
          '≈ {surplus1} L/min, soit ≈ {margin1Pct} % de la source',
          '≈ {surplus1} L/min, that is ≈ {margin1Pct}% of the spring',
        ),
      ),
      sp('Chute jusqu’au bélier', 'Fall down to the ram', lf('{fall} m', '{fall} m')),
      sp(
        'Qualité de l’eau',
        'Water quality',
        l('Non garantie potable : à analyser', 'Not guaranteed potable: have it tested'),
      ),
    ],
    maintenance: lf(
      '**Panne à prévoir.** Le débit baisse (sécheresse, captage colmaté, source qui se déplace) et passe sous ce que le bélier prend : la réserve se vide lentement, puis le bélier s’arrête. **À vérifier.** Mesurez le débit à l’étiage, en fin d’été : chronométrez le remplissage d’un seau gradué à la sortie de la conduite d’alimentation, plusieurs fois (NC State propose la même méthode). Comparez avec les ≈ {drive1} L/min que prend le clapet n°1 dans le modèle : en dessous, la réserve baisse. Ne goûtez pas l’eau : une source n’est pas garantie potable, faites-la analyser. **Entretien.** Dégagez le captage des feuilles et de la terre et faites une inspection sanitaire une à deux fois par an (rythme conseillé par Oxfam).',
      '**Typical failure.** The flow falls (drought, clogged catchment, a spring that moves) and goes below what the ram takes: the tank empties slowly, then the ram stops. **How to check.** Measure the flow at low water, at the end of summer: time how long a graduated bucket takes to fill at the outlet of the feed pipe, several times (NC State suggests the same method). Compare with the ≈ {drive1} L/min that the n°1 valve takes in the model: below it, the tank level falls. Do not taste the water: a spring is not guaranteed potable, have it tested. **Upkeep.** Clear the catchment of leaves and soil and carry out a sanitary inspection once or twice a year (the interval Oxfam recommends).',
    ),
    tip: lf(
      'Notez le débit à l’étiage, pas au printemps : la source de la vidéo a perdu un quart de son débit en deux ans, et le clapet n°1 ne lui laisse qu’une marge de ≈ {margin1Pct} %.',
      'Record the flow at low water, not in spring: the video’s spring lost a quarter of its flow in two years, and the n°1 valve leaves it a margin of only ≈ {margin1Pct}%.',
    ),
    video: ['02:19', '02:30'],
    design: l(
      'Une source en hauteur donne gratuitement la chute dont le bélier tire son énergie, comme le souligne la vidéo : aucune électricité ni aucun carburant. Mais elle impose aussi son débit, et toute la conception (taille du clapet, de la réserve) part de ce qu’elle donne à l’étiage.',
      'A spring set high up gives, for free, the fall from which the ram draws its energy, as the video stresses: no electricity and no fuel. But it also imposes its flow, and the whole design (valve size, tank size) starts from what the spring gives at low water.',
    ),
  },
  {
    id: 'buffer-tank',
    scene: 'site',
    category: 'hydraulic',
    name: l('Réserve tampon', 'Buffer tank'),
    short: l(
      'Cuve qui reçoit la source et alimente la conduite motrice ; c’est elle qui se vidait en dix heures. Détail dans le monde « Le captage ».',
      'Tank that receives the spring and feeds the drive pipe; it is the one that emptied in ten hours. Detail in the catchment world.',
    ),
    description: lf(
      'La réserve tampon reçoit la source et alimente la conduite motrice : le bélier y puise par à-coups. Avec le clapet n°3, il prenait ≈ {drawN3} L/min (estimation de l’auteur, non mesurée) pour une source à {source} L/min : le déficit de {deficitN3} L/min vidait la réserve en une dizaine d’heures, le bélier s’arrêtait et il fallait aller le relancer tous les deux jours. Avec le clapet n°1, il prend ≈ {drive1} L/min (modèle), moins que la source : la réserve reste pleine et déborde. Le volume de {tankL} L est déduit de ces dix heures, la vidéo ne le donne pas. La cuve, son couvercle, son trop-plein, sa crépine, sa vanne et sa vidange sont détaillés dans le monde « Le captage ».',
      'The buffer tank receives the spring and feeds the drive pipe: the ram draws from it in jolts. With the n°3 valve it took ≈ {drawN3} L/min (the author’s estimate, not measured) from a {source} L/min spring: the {deficitN3} L/min deficit emptied the tank in about ten hours, the ram stopped and someone had to go and restart it every two days. With the n°1 valve it takes ≈ {drive1} L/min (model), less than the spring: the tank stays full and overflows. The {tankL} L volume is derived from those ten hours, the video does not give it. The shell, lid, overflow, intake screen, gate valve and drain are detailed in the catchment world.',
    ),
    material: l(
      'Cuve fermée avec trop-plein (non détaillée dans la vidéo)',
      'Closed tank with an overflow (not detailed in the video)',
    ),
    specs: [
      sp('Volume', 'Volume', tf('derived', '≈ {tankL} L')),
      sp('Cuve dessinée en 3D', 'Tank drawn in 3D', diaH('estimate', TANK.diameter, TANK.height)),
      sp('Vidée en', 'Emptied in', lf('≈ {hoursN3} h avec le clapet n°3', '≈ {hoursN3} h with the n°3 valve')),
      sp(
        'Prélèvement du clapet n°3',
        'Draw of the n°3 valve',
        lf('≈ {drawN3} L/min (estimation de l’auteur)', '≈ {drawN3} L/min (author’s estimate)'),
      ),
      sp('Prélèvement du clapet n°1', 'Draw of the n°1 valve', tf('model', '≈ {drive1} L/min')),
      sp(
        'Surplus avec le clapet n°1',
        'Surplus with the n°1 valve',
        tf(
          'derived',
          '≈ {surplus1} L/min, soit ≈ {surplus1Day} m³/jour au trop-plein',
          '≈ {surplus1} L/min, that is ≈ {surplus1Day} m³/day to the overflow',
        ),
      ),
      sp(
        'Autonomie sans source',
        'Autonomy with no spring',
        tf('derived', '≈ {tankHoursRam1} h (n°1), ≈ {tankHoursRam3} h (n°3)'),
      ),
    ],
    maintenance: l(
      '**Panne à prévoir.** Le niveau baisse d’un jour à l’autre : le bélier prend plus que la source ne donne (clapet trop grand, course trop longue, source qui faiblit), ou la cuve fuit. Si elle se vide, le bélier s’arrête et ne repart pas seul. **À vérifier.** Regardez le trop-plein : s’il coule, la cuve est pleine et le bélier prend moins que la source. S’il est sec et que le niveau baisse, fermez la vanne de départ de la conduite motrice pendant une heure : le niveau remonte si c’est le bélier qui tirait trop, il continue de baisser si c’est une fuite. **Entretien.** Notez le niveau chaque semaine en été et vidangez les dépôts une à deux fois par an (voir la vidange).',
      '**Typical failure.** The level falls from one day to the next: the ram takes more than the spring gives (valve too big, stroke too long, spring weakening), or the tank leaks. If it empties, the ram stops and does not restart by itself. **How to check.** Look at the overflow: if it runs, the tank is full and the ram takes less than the spring gives. If it is dry and the level falls, close the drive-pipe gate valve for an hour: the level rises if the ram was drawing too much, and keeps falling if it is a leak. **Upkeep.** Note the level every week in summer and flush the deposits once or twice a year (see the drain).',
    ),
    tip: l(
      'Si le niveau baisse d’un jour à l’autre, c’est la course ou la taille du clapet qu’il faut revoir : une cuve plus grande ne fait que retarder l’arrêt.',
      'If the level falls from one day to the next, it is the stroke or the valve size that needs another look: a bigger tank only delays the stop.',
    ),
    video: ['00:00', '02:07', '02:19'],
    design: lf(
      'La réserve donne à la conduite motrice un niveau d’eau stable et absorbe les baisses passagères de la source. Elle ne remplace pas un bon réglage du clapet : son volume de {tankL} L est déduit des dix heures de la vidéo, il n’y est pas donné.',
      'The tank gives the drive pipe a steady water level and absorbs the spring’s passing dips. It does not replace a good valve setting: its {tankL} L volume is derived from the video’s ten hours, it is not given there.',
    ),
  },
  {
    id: 'drive-pipe',
    scene: 'site',
    category: 'hydraulic',
    name: l('Conduite motrice', 'Drive pipe'),
    short: l(
      'Tuyau rigide d’environ 20 m qui descend de 7,5 m et donne son élan à l’eau.',
      'Rigid pipe of about 20 m that drops 7.5 m and gives the water its momentum.',
    ),
    description: lf(
      'La conduite motrice relie la réserve au bélier, par la vanne de départ de la cuve. L’eau y prend de la vitesse tant que le clapet de choc est ouvert ; quand il claque, cette colonne d’environ {driveLitres} L s’arrête net et son élan fait monter la pression, jusqu’à environ {peak1} bar dans le modèle : c’est le coup de bélier. La conduite doit donc être rigide, droite et sans prise d’air. Sur le site de la vidéo elle mesure environ {driveLen} m pour {fall} m de chute, soit 2,7 fois la chute, alors que NC State demande au moins 5 fois (Practical Action : 3 à 7 fois).',
      'The drive pipe links the tank to the ram, through the tank’s gate valve. The water gains speed in it while the waste valve is open; when the valve slams, that column of about {driveLitres} L stops dead and its momentum raises the pressure, up to about {peak1} bar in the model: that is the water hammer. The pipe must therefore be rigid, straight and free of air leaks. On the video’s site it is about {driveLen} m long for {fall} m of fall, that is 2.7 times the fall, whereas NC State asks for at least 5 times (Practical Action: 3 to 7 times).',
    ),
    material: l(
      'Acier (hypothèse du modèle) ; fonte possible, plastique déconseillé',
      'Steel (model assumption); cast iron possible, plastic discouraged',
    ),
    specs: [
      sp('Longueur', 'Length', lf('≈ {driveLen} m', '≈ {driveLen} m')),
      sp('Chute', 'Fall', lf('{fall} m', '{fall} m')),
      sp('Longueur / chute', 'Length / fall', tagged('derived', '2,7')),
      sp(
        'Règle de longueur',
        'Length rule',
        l(
          '≥ 5 × la chute (NC State) ; 3 à 7 × (Practical Action)',
          '≥ 5 × the fall (NC State); 3 to 7 × (Practical Action)',
        ),
      ),
      sp(
        'Longueur / diamètre',
        'Length / diameter',
        tf('derived', '≈ {lOverD} (NITK : 150 à 1 000)', '≈ {lOverD} (NITK: 150–1,000)'),
      ),
      sp(
        'Diamètre intérieur',
        'Inner diameter',
        tagged('assumed', `${mm(SITE_DIMS.driveBore).fr} mm, bélier de 1″`, `${mm(SITE_DIMS.driveBore).en} mm, 1″ ram`),
      ),
      sp(
        'Diamètre extérieur',
        'Outer diameter',
        tagged(
          'derived',
          `${mm(SITE_DIMS.driveOuterDiameter).fr} mm, tube 1″ ISO`,
          `${mm(SITE_DIMS.driveOuterDiameter).en} mm, ISO 1″ tube`,
        ),
      ),
      sp('Eau contenue', 'Water held', tf('derived', '≈ {driveLitres} L')),
      sp(
        'Pression à l’arrêt, clapet fermé',
        'Pressure at rest, valve shut',
        tf('derived', '≈ {staticBarDrive} bar (colonne de {fall} m)', '≈ {staticBarDrive} bar ({fall} m column)'),
      ),
      sp(
        'Vitesse de l’onde',
        'Wave speed',
        tagged('calibrated', `${nFr(WAVE_SPEED.steel)} m/s dans l’acier`, `${nEn(WAVE_SPEED.steel)} m/s in steel`),
      ),
    ],
    maintenance: l(
      '**Panne à prévoir.** Une prise d’air ou un raccord qui fuit : le bélier refoule moins, ou s’arrête. Des colliers qui se desserrent sous les coups. **À vérifier.** Posez la main sur la conduite, bélier en marche : on sent un coup à chaque frappe ; une conduite qui claque dans ses colliers est mal ancrée. Cherchez les gouttes, la rouille qui coule et les bulles d’air aux raccords. **Entretien.** Reserrez les colliers et contrôlez les ancrages, surtout aux coudes et près du bélier ; purgez l’air après tout arrêt de la réserve.',
      '**Typical failure.** An air leak or a leaking fitting: the ram delivers less, or stops. Clamps that work loose under the strokes. **How to check.** Lay a hand on the pipe while the ram runs: you feel a knock at every stroke; a pipe that rattles in its clamps is poorly anchored. Look for drips, running rust and air bubbles at the fittings. **Upkeep.** Retighten the clamps and check the anchors, especially at the bends and near the ram; purge the air after any run-dry of the tank.',
    ),
    tip: l(
      'Une conduite trop courte pénalise le bélier : dans le scénario « Conduite motrice trop courte » (8 m pour 7,5 m de chute), le simulateur donne 259 coups/min et un bélier qui prend plus que la source.',
      'A pipe that is too short penalises the ram: in the “Drive pipe too short” scenario (8 m for 7.5 m of fall) the simulator gives 259 strokes/min and a ram that takes more than the spring.',
    ),
    video: ['01:55'],
    design: l(
      `Rigide, parce qu’un tuyau qui se déforme à chaque coup absorbe une partie de l’énergie du choc : le modèle donne à l’onde ${nFr(WAVE_SPEED.steel)} m/s dans l’acier, ${nFr(WAVE_SPEED.pvc)} dans le PVC et ${nFr(WAVE_SPEED.hdpe)} dans le polyéthylène. Longue et droite, parce que plus d’eau en mouvement donne plus d’élan à chaque coup, et que chaque coude fait perdre du rendement et pousse la conduite de côté (Practical Action).`,
      `Rigid, because a pipe that flexes at every stroke soaks up part of the energy of the shock: the model gives the wave ${nEn(WAVE_SPEED.steel)} m/s in steel, ${nEn(WAVE_SPEED.pvc)} in PVC and ${nEn(WAVE_SPEED.hdpe)} in polyethylene. Long and straight, because more water in motion gives more momentum at every stroke, and because every bend costs efficiency and pushes the pipe sideways (Practical Action).`,
    ),
  },
  {
    id: 'ram-pit',
    scene: 'site',
    category: 'structure',
    name: l('Regard du bélier', 'Ram pit'),
    short: l(
      'Regard qui abrite le bélier, le porte sur un massif rigide et laisse l’eau rejetée s’écouler.',
      'Pit that shelters the ram, carries it on a rigid block and lets the waste water flow away.',
    ),
    description: lf(
      'Le regard abrite le bélier et garde accessibles le clapet de choc, le manomètre et les vannes. Il le porte sur un massif d’ancrage rigide, car la machine frappe environ cent fois par minute (100 à 110 coups/min avec le clapet n°1 de la vidéo) et Practical Action demande de la boulonner sur une fondation en béton. Presque toute l’eau motrice (≈ {waste1} L/min sur ≈ {drive1} L/min dans le modèle) ressort par le clapet de choc : le regard doit la laisser partir par l’évacuation des eaux de rejet, sans quoi elle noie le clapet. Sa construction n’est pas montrée dans la vidéo : ses dimensions sont des estimations.',
      'The pit shelters the ram and keeps the waste valve, the gauge and the valves within reach. It carries the machine on a rigid anchor block, because it strikes about a hundred times a minute (100–110 strokes/min with the video’s n°1 valve) and Practical Action asks for it to be bolted to a concrete foundation. Almost all the drive water (≈ {waste1} L/min out of ≈ {drive1} L/min in the model) leaves through the waste valve: the pit must let it go through the waste-water drain, or it drowns the valve. Its construction is not shown in the video: its dimensions are estimates.',
    ),
    material: l(
      'Maçonnerie ou béton sur dalle d’ancrage (hypothèse du laboratoire)',
      'Masonry or concrete on an anchor slab (lab assumption)',
    ),
    specs: [
      sp(
        'Eau rejetée',
        'Waste water',
        tf('model', '≈ {waste1} L/min avec le clapet n°1', '≈ {waste1} L/min with the n°1 valve'),
      ),
      sp('Cadence', 'Stroke rate', l('100 à 110 coups/min', '100–110 strokes/min')),
      sp('Dimensions intérieures (3D)', 'Inner size (3D)', lenM('estimate', PIT.innerLength, PIT.innerWidth)),
      sp('Fond sous l’axe du bélier', 'Floor below the ram axis', lenMm('estimate', -PIT.floorY)),
      sp('Épaisseur des parois', 'Wall thickness', lenMm('estimate', PIT.wall)),
      sp('Margelle au-dessus du sol', 'Curb above the ground', lenMm('estimate', PIT.curb)),
      sp('Épaisseur du couvercle', 'Lid thickness', lenMm('estimate', PIT.lidThickness)),
    ],
    maintenance: l(
      '**Panne à prévoir.** L’eau s’accumule dans le regard (évacuation bouchée) ou le massif se fissure : le bélier cogne, bouge, et finit par rompre un raccord. **À vérifier.** Soulevez le couvercle : le fond doit rester sec, ou à peine mouillé par les éclaboussures du clapet. Bélier en marche, posez la main sur le corps de la machine sans approcher le clapet : un bélier bien ancré vibre peu ; s’il se déplace ou si un boulon a du jeu, il est mal fixé. **Entretien.** Balayez feuilles et terre, regardez les fissures du béton et resserrez les boulons d’ancrage après l’hiver.',
      '**Typical failure.** Water piles up in the pit (blocked drain) or the block cracks: the ram knocks, moves, and finally breaks a fitting. **How to check.** Lift the lid: the floor should stay dry, or barely wet from the splashes of the valve. With the ram running, lay a hand on the body of the machine without going near the valve: a well-anchored ram vibrates little; if it moves or a bolt is loose, it is poorly fixed. **Upkeep.** Sweep out leaves and soil, look for cracks in the concrete and retighten the anchor bolts after winter.',
    ),
    tip: l(
      'Le bélier s’entend, la vidéo le fait remarquer dès l’introduction : un rythme qui change ou qui s’arrête est le premier signe d’un problème, avant même d’ouvrir le couvercle.',
      'The ram can be heard, the video notes it in its introduction: a rhythm that changes or stops is the first sign of trouble, even before you open the lid.',
    ),
    video: ['00:25'],
    design: l(
      'Trois fonctions qu’un simple abri n’aurait pas : un ancrage rigide, parce qu’un bélier non fixé se déplace sous ses coups ; un accès, pour régler le clapet et lire le manomètre ; et une issue pour l’eau, parce qu’il rejette en continu l’eau qu’il ne remonte pas.',
      'Three jobs a simple shelter would not do: a rigid anchor, because an unfixed ram walks under its own strokes; an access, to tune the valve and read the gauge; and a way out for the water, because it throws away continuously the water it does not lift.',
    ),
  },
  {
    id: 'waste-drain',
    scene: 'site',
    category: 'hydraulic',
    name: l('Évacuation des eaux de rejet', 'Waste-water drain'),
    short: l(
      'Tuyau ou fossé qui emporte l’eau rejetée par le clapet de choc : presque tout le débit moteur.',
      'Pipe or ditch that carries away the water thrown out by the waste valve: almost all of the drive flow.',
    ),
    description: lf(
      'À chaque coup, le clapet de choc rejette l’eau qui ne monte pas : ≈ {waste1} L/min sur ≈ {drive1} L/min dans le modèle avec le clapet n°1, soit ≈ {wasteDay1} m³ par jour, et ≈ {waste3} L/min avec le clapet n°3. L’évacuation doit emporter cette eau en continu, par une pente continue vers l’aval, et la rejeter là où elle ne gêne pas : loin du regard, du captage et de la conduite, sans éroder le talus. NC State précise que l’excédent doit être drainé pour un fonctionnement continu. Si l’évacuation se bouche, l’eau monte dans le regard et finit par noyer le clapet de choc, ce qui arrête le bélier (Practical Action le dit de certains béliers ; la vidéo et le modèle ne traitent pas ce cas). La vidéo ne montre pas cette évacuation : son diamètre est une estimation.',
      'At every stroke the waste valve throws out the water that does not go up: ≈ {waste1} L/min out of ≈ {drive1} L/min in the model with the n°1 valve, that is ≈ {wasteDay1} m³ a day, and ≈ {waste3} L/min with the n°3 valve. The drain must carry this water away continuously, on a continuous downhill slope, and release it where it does no harm: away from the pit, the catchment and the pipe, without eroding the slope. NC State points out that the excess must be drained for continuous operation. If the drain blocks, the water rises in the pit and finally drowns the waste valve, which stops the ram (Practical Action says so of some rams; the video and the model do not cover this case). The video does not show this drain: its diameter is an estimate.',
    ),
    material: l(
      'Tuyau PVC ou fossé empierré (hypothèse du laboratoire ; non détaillé dans la vidéo)',
      'PVC pipe or stone-lined ditch (lab assumption; not detailed in the video)',
    ),
    specs: [
      sp('Débit rejeté, clapet n°1', 'Waste flow, n°1 valve', tf('model', '≈ {waste1} L/min')),
      sp('Débit rejeté, clapet n°3', 'Waste flow, n°3 valve', tf('model', '≈ {waste3} L/min')),
      sp(
        'Volume par jour, clapet n°1',
        'Volume per day, n°1 valve',
        tf('derived', '≈ {wasteDay1} m³/jour', '≈ {wasteDay1} m³/day'),
      ),
      sp(
        'Eau rejetée par coup',
        'Waste per stroke',
        tf('derived', '≈ {wasteStroke1} mL (clapet n°1)', '≈ {wasteStroke1} mL (n°1 valve)'),
      ),
      sp(
        'Diamètre traversant la paroi',
        'Diameter through the wall',
        tagged(
          'estimate',
          `Ø ${mm(PIT.drainDiameter).fr} mm, vers l’aval`,
          `Ø ${mm(PIT.drainDiameter).en} mm, downhill`,
        ),
      ),
      sp('Pente', 'Slope', l('Continue vers l’aval (aucune valeur donnée)', 'Continuous downhill (no value given)')),
    ],
    maintenance: lf(
      '**Panne à prévoir.** L’évacuation se bouche (feuilles, boue, nid), gèle, ou sa sortie est noyée par une crue : l’eau monte dans le regard et noie le clapet de choc, le bélier s’arrête. **À vérifier.** Bélier en marche, regardez le bout de l’évacuation : l’eau doit en sortir par petits jets, au rythme des coups. Présentez un seau de 10 L : il doit se remplir en moins de 2 minutes (≈ {wasteBucket} min à ≈ {waste1} L/min, modèle). Beaucoup plus lent, soulevez le couvercle du regard et regardez le niveau de l’eau. **Entretien.** Dégagez la sortie après chaque orage et avant l’hiver, et vérifiez que le talus ne s’érode pas.',
      '**Typical failure.** The drain blocks (leaves, mud, a nest), freezes, or its outlet is drowned by a flood: the water rises in the pit and drowns the waste valve, the ram stops. **How to check.** With the ram running, look at the end of the drain: the water should come out in small jets, at the rhythm of the strokes. Hold a 10 L bucket under it: it should fill in under 2 minutes (≈ {wasteBucket} min at ≈ {waste1} L/min, model). Much slower, lift the pit lid and look at the water level. **Upkeep.** Clear the outlet after every storm and before winter, and check that the slope is not eroding.',
    ),
    tip: l(
      'Terminez l’évacuation au-dessus du niveau des plus hautes eaux du ruisseau ou du fossé qui la reçoit : une sortie noyée par une crue fait remonter l’eau jusqu’au clapet.',
      'End the drain above the highest water level of the stream or ditch that receives it: an outlet drowned by a flood backs the water up to the valve.',
    ),
    design: lf(
      'Presque toute l’eau que le bélier prend doit ressortir : c’est son principe, pas un défaut. Il n’en remonte qu’une petite fraction (≈ {delivered1} L/min sur ≈ {drive1} L/min) ; le reste a cédé son énergie en frappant puis doit partir librement, sinon la machine se noie.',
      'Almost all the water the ram takes must come out again: that is its principle, not a defect. It lifts only a small fraction of it (≈ {delivered1} L/min out of ≈ {drive1} L/min); the rest has given up its energy by striking and must then leave freely, or the machine drowns.',
    ),
  },
  {
    id: 'delivery-pipe',
    scene: 'site',
    category: 'hydraulic',
    name: l('Conduite de refoulement', 'Delivery pipe'),
    short: l(
      'Conduite d’environ 300 m qui remonte l’eau de 65 m jusqu’au château d’eau.',
      'Pipe of about 300 m that lifts the water 65 m up to the water tower.',
    ),
    description: lf(
      'La conduite de refoulement emmène vers le haut le petit volume que chaque coup pousse hors de la cloche. Dans la vidéo elle mesure environ {deliveryLen} m et monte à {lift} m au-dessus du bélier, soit 8,7 fois la chute de {fall} m. Son diamètre vaut à peu près la moitié de celui de la conduite motrice (½″ pour un bélier de 1″, selon NC State, qui interdit de descendre sous la valeur du fabricant) ; sa longueur compte peu, parce qu’à ≈ {delivered1} L/min les frottements sont faibles. Au bélier, la colonne d’eau de {lift} m fait environ {staticBarDelivery} bar à l’arrêt ; Practical Action conseille une vanne ou un clapet près du bélier, pour ne pas vider la conduite quand on l’arrête.',
      'The delivery pipe carries upward the small volume that every stroke pushes out of the chamber. In the video it is about {deliveryLen} m long and rises to {lift} m above the ram, that is 8.7 times the {fall} m fall. Its diameter is about half that of the drive pipe (½″ for a 1″ ram, according to NC State, which forbids going below the maker’s figure); its length matters little, because at ≈ {delivered1} L/min friction is low. At the ram, the {lift} m water column is about {staticBarDelivery} bar at rest; Practical Action advises a valve or a check valve near the ram, so that the pipe need not be drained when the ram is stopped.',
    ),
    material: l(
      'Polyéthylène (hypothèse du modèle ; non précisé dans la vidéo)',
      'Polyethylene (model assumption; not stated in the video)',
    ),
    specs: [
      sp('Longueur', 'Length', lf('≈ {deliveryLen} m', '≈ {deliveryLen} m')),
      sp('Hauteur de refoulement', 'Lift', lf('{lift} m', '{lift} m')),
      sp('Hauteur / chute', 'Lift / fall', tagged('derived', '8,7')),
      sp('Pression statique au bélier', 'Static pressure at the ram', tf('derived', '≈ {staticBarDelivery} bar')),
      sp(
        'Débit',
        'Flow',
        tf('derived', '{perDay} L/jour, soit ≈ {delivered1} L/min', '{perDay} L/day, that is ≈ {delivered1} L/min'),
      ),
      sp('Diamètre', 'Diameter', l('≈ ½″ pour un bélier de 1″ (NC State)', '≈ ½″ for a 1″ ram (NC State)')),
      sp(
        'Diamètre intérieur',
        'Inner diameter',
        tagged(
          'derived',
          `${mm(SITE_DIMS.deliveryBore).fr} mm, soit 0,6 × la conduite motrice`,
          `${mm(SITE_DIMS.deliveryBore).en} mm, that is 0.6 × the drive pipe`,
        ),
      ),
      sp(
        'Diamètre extérieur',
        'Outer diameter',
        tagged(
          'estimate',
          `${mm(SITE_DIMS.deliveryOuterDiameter).fr} mm, PE 25 × 4,4`,
          `${mm(SITE_DIMS.deliveryOuterDiameter).en} mm, PE 25 × 4.4`,
        ),
      ),
      sp('Eau contenue', 'Water held', tf('derived', '≈ {fillLitres} L')),
      sp('Remplissage au débit final', 'Fill time at the final rate', tf('derived', '≈ {fillHours} h')),
    ],
    maintenance: lf(
      '**Panne à prévoir.** Une fuite ou une poche d’air : le manomètre n’atteint plus sa valeur, le château reçoit moins d’eau, ou rien. Les raccords travaillent à plus de 6 bar. **À vérifier.** Bélier arrêté (vanne d’arrivée fermée), le manomètre côté refoulement doit garder sa valeur, ≈ {staticBarDelivery} bar quand la conduite est pleine : une chute lente trahit une fuite sur la conduite ou un clapet de refoulement qui ne tient pas. Suivez le tracé après la pluie : un sol détrempé ou une source nouvelle marque la fuite. **Entretien.** Parcourez le tracé au printemps et vérifiez les ancrages aux passages de ruisseau ; l’air peut se loger aux points hauts (pratique courante, non montrée dans la vidéo).',
      '**Typical failure.** A leak or an air pocket: the gauge no longer reaches its value, the tower receives less water, or none. The fittings work at more than 6 bar. **How to check.** With the ram stopped (inlet valve closed), the gauge on the delivery side should hold its value, ≈ {staticBarDelivery} bar when the pipe is full: a slow fall points to a leak in the pipe or to a delivery check valve that does not hold. Follow the route after rain: soaked ground or a new spring marks the leak. **Upkeep.** Walk the route in spring and check the anchors at stream crossings; air can lodge at the high points (common practice, not shown in the video).',
    ),
    tip: lf(
      'Comptez des heures avant de voir l’eau arriver : à ≈ {delivered1} L/min, la conduite contient à elle seule environ {fillLitres} L à remplir (≈ {fillHours} h pour {deliveryLen} m de Ø ' +
        mm(SITE_DIMS.deliveryBore).fr +
        ' mm, valeurs du modèle).',
      'Allow hours before the water arrives: at ≈ {delivered1} L/min the pipe itself holds about {fillLitres} L to fill (≈ {fillHours} h for {deliveryLen} m of Ø ' +
        mm(SITE_DIMS.deliveryBore).en +
        ' mm, model values).',
    ),
    video: ['01:15', '02:01'],
    design: l(
      'Plus fine que la conduite motrice, car elle ne porte qu’un petit débit sous haute pression. Ce qui compte est la hauteur, non la longueur : la vidéo rappelle que 1 m de chute remonte l’eau d’environ 10 m, quelle que soit la longueur du tuyau.',
      'Thinner than the drive pipe, because it carries only a small flow at high pressure. What counts is the height, not the length: the video recalls that 1 m of fall lifts water about 10 m, whatever the length of the pipe.',
    ),
  },
  {
    id: 'water-tower',
    scene: 'site',
    category: 'structure',
    name: l('Château d’eau', 'Water tower'),
    short: l(
      'Réservoir en hauteur, à 65 m au-dessus du bélier, qui stocke l’eau remontée.',
      'Elevated tank, 65 m above the ram, that stores the lifted water.',
    ),
    description: lf(
      'Le château d’eau reçoit l’eau que le bélier remonte et la garde à {lift} m au-dessus de lui. Le bélier n’a pas de marche-arrêt et son débit est constant (Practical Action) : il remplit le château jour et nuit, à environ {perDay} L par jour avec le clapet n°1. La maison est alimentée par gravité depuis ce point haut, sous pression et à la demande, ce qui est le but de l’installation. Le château sépare ce débit lent et constant de la demande très variable du foyer. Son volume n’est pas donné dans la vidéo : ses dimensions dans le laboratoire sont des estimations.',
      'The water tower receives the water the ram lifts and keeps it {lift} m above the machine. The ram has no on/off switch and its output is constant (Practical Action): it fills the tower day and night, at about {perDay} L a day with the n°1 valve. The house is fed by gravity from this high point, under pressure and on demand, which is the purpose of the installation. The tower separates this slow, steady flow from the household’s very variable demand. Its volume is not given in the video: its dimensions in the lab are estimates.',
    ),
    material: l('Cuve couverte (non détaillée dans la vidéo)', 'Covered tank (not detailed in the video)'),
    specs: [
      sp('Hauteur au-dessus du bélier', 'Height above the ram', lf('{lift} m', '{lift} m')),
      sp('Apport', 'Inflow', lf('≈ {perDay} L/jour avec le clapet n°1', '≈ {perDay} L/day with the n°1 valve')),
      sp('Remplissage', 'Filling rate', tf('derived', '≈ {towerLph} L/h')),
      sp('Volume', 'Volume', l('Non donné par la vidéo', 'Not given by the video')),
      sp('Cuve dessinée en 3D', 'Tank drawn in 3D', diaH('estimate', TOWER.tankDiameter, TOWER.tankHeight)),
      sp('Hauteur du support', 'Stand height', lenM('estimate', TOWER.standHeight)),
      sp('Bout du tuyau au-dessus du couvercle', 'Pipe end above the lid', lenM('estimate', TOWER.pipeEndAboveLid)),
    ],
    maintenance: lf(
      '**Panne à prévoir.** Le château ne se remplit plus (fuite sur la conduite, bélier arrêté) ou se salit (couvercle ouvert, grille du trop-plein absente, algues). **À vérifier.** Présentez un récipient d’un litre au bout de la conduite : il doit se remplir en ≈ {towerLitreMin} min (≈ {delivered1} L/min). Beaucoup plus lent, ou rien : cherchez la fuite, ou regardez si le bélier bat encore. Soulevez le couvercle : l’eau doit être claire, sans film vert ni insectes. Ne la goûtez pas avant analyse. **Entretien.** Contrôlez le couvercle, la grille du trop-plein et le fond de la cuve : l’eau d’une source n’est pas garantie potable.',
      '**Typical failure.** The tower no longer fills (a leak in the pipe, the ram stopped) or gets dirty (open lid, no screen on the overflow, algae). **How to check.** Hold a one-litre container under the end of the pipe: it should fill in ≈ {towerLitreMin} min (≈ {delivered1} L/min). Much slower, or nothing: look for the leak, or check whether the ram is still beating. Lift the lid: the water should be clear, with no green film or insects. Do not taste it before it has been tested. **Upkeep.** Check the lid, the overflow screen and the bottom of the tank: spring water is not guaranteed potable.',
    ),
    tip: l(
      'Donnez-lui un trop-plein qui renvoie le surplus vers un endroit sans risque : le bélier remplit le château sans interruption.',
      'Give it an overflow that sends the surplus somewhere harmless: the ram fills the tower without a break.',
    ),
    video: ['00:11', '02:01'],
    design: lf(
      'Un château d’eau est la façon de stocker le travail du bélier : on remonte l’eau quand le bélier la donne et on la consomme quand on veut. Pour de l’eau de boisson, Practical Action juge suffisante la moitié de la production d’un jour (≈ {towerHalfDay} L à {perDay} L/jour, dérivé) ; la vidéo ne donne pas le volume de celui-ci.',
      'A water tower is how the ram’s work is stored: the water is lifted when the ram supplies it and used when you want it. For drinking water, Practical Action finds half a day’s production enough (≈ {towerHalfDay} L at {perDay} L/day, derived); the video does not give the volume of this one.',
    ),
  },
  {
    id: 'house',
    scene: 'site',
    category: 'site',
    name: l('Habitation', 'House'),
    short: l(
      'La maison du site, alimentée par gravité depuis le château d’eau.',
      'The house on the site, fed by gravity from the water tower.',
    ),
    description: l(
      'La maison est la raison d’être de l’installation : elle reçoit l’eau du château par gravité, sous la pression que donne le dénivelé, et à la demande. La vidéo juge les 500 L par jour du clapet n°1 suffisants pour sa consommation, sans en détailler les usages ni le nombre de personnes. Le bélier ne demande ni électricité ni carburant, et peut tourner très longtemps sans intervention. L’eau d’une source n’étant pas garantie potable, elle doit être analysée avant de servir à boire.',
      'The house is the reason for the installation: it receives water from the tower by gravity, under the pressure the height difference gives, and on demand. The video judges the n°1 valve’s 500 L a day enough for its needs, without detailing the uses or the number of people. The ram needs no electricity and no fuel, and can run for a very long time without attention. Because spring water is not guaranteed potable, it must be tested before it is used for drinking.',
    ),
    material: l('Bâtiment (non détaillé)', 'Building (not detailed)'),
    specs: [
      sp('Apport', 'Supply', lf('≈ {perDay} L/jour, jugés suffisants', '≈ {perDay} L/day, judged enough')),
      sp('Alimentation', 'Feed', l('Par gravité depuis le château d’eau', 'By gravity from the water tower')),
      sp(
        'Altitude de la terrasse',
        'Terrace elevation',
        tf('estimate', '≈ {terraceM} m au-dessus du bélier', '≈ {terraceM} m above the ram'),
      ),
      sp(
        'Pression au robinet',
        'Pressure at the tap',
        tf('estimate', '≈ {tapBar} bar au plus, château plein', '≈ {tapBar} bar at most, tower full'),
      ),
      sp('Emprise (3D)', 'Footprint (3D)', lenM('estimate', HOUSE.length, HOUSE.width)),
      sp(
        'Qualité de l’eau',
        'Water quality',
        l('Non garantie potable : à analyser', 'Not guaranteed potable: have it tested'),
      ),
    ],
    maintenance: l(
      '**Panne à prévoir.** L’eau change d’aspect ou d’odeur après la pluie ou la fonte des neiges : de l’eau de surface s’est mêlée à la source, ou le château est contaminé. **À vérifier.** Remplissez un verre propre et regardez-le à contre-jour : une eau trouble après la pluie signale un captage atteint. Ne la goûtez pas avant analyse : une source n’est pas garantie potable. **Entretien.** Faites analyser l’eau avant tout usage alimentaire et recommencez si son aspect, son goût ou le temps changent beaucoup.',
      '**Typical failure.** The water changes look or smell after rain or snowmelt: surface water has got into the spring, or the tower is contaminated. **How to check.** Fill a clean glass and hold it against the light: water that turns cloudy after rain points to a compromised catchment. Do not taste it before it has been tested: a spring is not guaranteed potable. **Upkeep.** Have the water tested before any use for drinking and again if its look, its taste or the weather changes a lot.',
    ),
    tip: lf(
      'Si la pression au robinet est faible, c’est le dénivelé entre le château et la maison qui la limite (≈ {tapBar} bar au plus ici, d’après la terrasse estimée) : le bélier n’y change rien.',
      'If the pressure at the tap is low, it is the height difference between the tower and the house that limits it (≈ {tapBar} bar at most here, from the estimated terrace): the ram changes nothing about it.',
    ),
    video: ['00:13', '04:43'],
    design: l(
      'La maison fixe l’objectif : la quantité d’eau à remonter par jour (≈ 500 L) décide de la taille du clapet et du réglage, non l’inverse.',
      'The house sets the target: the quantity of water to lift per day (≈ 500 L) decides the valve size and the setting, not the other way round.',
    ),
  },
];
