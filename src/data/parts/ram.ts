// Parts of the `ram` world (13 ids frozen in src/part-ids.ts). Status words: see ../part-helpers.ts.
//
// Every sheet answers three questions in its `maintenance` text, in this order, with bold labels (the kit renders **bold**),
// the same convention as the site and catchment sheets (parts-site.test.ts):
//   « **Panne à prévoir.** … **À vérifier.** … **Entretien.** … »   /   « **Typical failure.** … **How to check.** … **Upkeep.** … »
// the typical failure of the part, a check a visitor could do (listen, look, measure, feel), then the routine upkeep.
// parts-ram.test.ts enforces that convention on the 27 sheets of the ram and valve worlds.
//
// Sources: the video S1 (L'énergie partout) for the waste valve; the generic 1" ram (body, valves, chamber) is ours:
// textbook facts come from S4 (NC State) and S6 (Wikipedia), figures of the model are tagged « résultat du modèle ».
// The pressures and flows quoted below are the outputs of the preset `valve-1` of src/sim (MODEL): parts-ram.test.ts
// re-runs the engine and says when a sheet must be reread.
import type { PartInfo } from '@onigam/lab-kit/content';
import { l } from '@onigam/lab-kit/i18n';
import { G, POLYTROPIC, RHO, SNIFTER_CRACK, SNIFTER_DIAMETER, VALVES, area } from '../../sim/physics';
import { CHAMBER, CHECK_VALVE, FITTINGS, FOUNDATION, INLET, RAM, SITE as SITE_DIMS, VALVE } from '../../three/dims';
import { mm, mmBox, nEn, nFr } from '../units';
import { STROKE, WEIGHT, lenMm, sp, tagged } from '../part-helpers';

/**
 * Results of the model for the n°1 valve at its calibrated setting (preset `valve-1`, 2.2 mm, 360 g) and for a few
 * neighbouring settings (`RamSim.sweep`): docs/physics.md §5–6. They are quoted in several sheets (here, valve.ts, the
 * assembly guide), written once, and parts-ram.test.ts re-runs the engine to check each one.
 */
export const MODEL = {
  /** Strokes per minute (reported 100–110, K11). */
  strokesPerMin: 109,
  /** Water taken from the drive pipe, L/min. */
  driveFlow: 6.7,
  /** Water thrown away by the waste valve, L/min. */
  wasteFlow: 6.3,
  /** Water pushed into the chamber by one stroke, mL (derived from the video's figures: 3.2–3.5, K12). */
  mlPerStroke: 3.2,
  /** D'Aubuisson efficiency q·H/(Q·h) of the n°1 valve (the video's own figures imply 0.3–0.6, K13). */
  etaD: 0.45,
  /** Velocity of the drive water at the closing of the valve, m/s. */
  closingVelocity: 0.87,
  /** Smallest closing velocity that can open the delivery check valve at H = 65 m (K15), m/s. */
  minClosingVelocity: 0.63,
  /** Speed of the valve head when it hits its seat, m/s. */
  valveImpactSpeed: 0.31,
  /** Peak pressure of the body at each stroke, bar. */
  peakBar: 6.5,
  /** Depth of the recoil: the body pressure falls to minus this value, bar gauge. */
  recoilDipBar: 0.18,
  /** Peak pressure with a water-logged chamber, bar (docs/physics.md §5: 7.2). */
  loggedPeakBar: 7.2,
  /** Loss of delivery with a water-logged chamber, % (docs/physics.md §5: 40). */
  loggedDeliveryDropPct: 40,
  /** Share of the stroke period spent in the `deliver` phase, % (the check valve is open). */
  deliverSharePct: 3,
  /** Time to water-log the chamber with a blocked snifter, hours (docs/physics.md §5: ≈ 15). */
  loggedHours: 15,
  /** Time constant of the chamber refill by a working snifter, minutes (AIR_TAU_REFILL = 20 min). */
  refillMinutes: 20,
  /** Stroke at which the delivery stops (docs/physics.md §5: ≈ 1.5), mm; the consumption there is `minStrokeFlow`. */
  noDeliveryStroke: 1.5,
  /** Consumption at that stroke, L/min. */
  minStrokeFlow: 2.0,
  /** Stroke at which the n°1 valve takes the whole 7.5 L/min of the spring, mm (7.4 L/min there). */
  springLimitStroke: 2.3,
  /** Consumption at a stroke of 3 mm, L/min, and the delivery there, L/day. */
  longStrokeFlow: 12.8,
  longStrokePerDay: 1040,
  /** Counterweight sweep at the 2.2 mm stroke: no weight, 180 g, 720 g. Strokes per minute and consumption in L/min. */
  noWeightStrokes: 204,
  noWeightFlow: 0.4,
  lightWeightStrokes: 131,
  lightWeightFlow: 2.6,
  heavyWeightStrokes: 75,
  heavyWeightFlow: 15.5,
  heavyWeightPerDay: 788,
} as const;

/** Numbers computed once from dims.ts, the model and the sources (every one is « dérivé / derived » in the texts). */
export const DERIVED = {
  /** Static head at the inlet of the ram: ρ·g·h with h = 7.5 m (K1), bar. */
  inletBar: (RHO * G * SITE_DIMS.fall) / 1e5,
  /** Static pressure of the delivery column: ρ·g·H with H = 65 m (K3), bar. */
  deliveryBar: (RHO * G * SITE_DIMS.deliveryHead) / 1e5,
  /** Axial push of the body at each stroke: peak pressure × section of the 27 mm drive pipe, kN. */
  thrustKn: (MODEL.peakBar * 1e5 * area(SITE_DIMS.driveBore)) / 1000,
  /** Strokes per day, rounded to the thousand. */
  strokesPerDay: Math.round((MODEL.strokesPerMin * 1440) / 1000) * 1000,
  /** Volume of the 300 m delivery pipe (bore 16.2 mm), litres. */
  pipeLitres: area(SITE_DIMS.deliveryBore) * SITE_DIMS.deliveryLength * 1000,
  /** Time to refill that pipe at the 500 L/day of the n°1 valve, hours. */
  pipeRefillHours: (area(SITE_DIMS.deliveryBore) * SITE_DIMS.deliveryLength * 1000) / ((500 / 1440) * 60),
  /** Air in the chamber at working pressure, litres. */
  airLitres: CHAMBER.volumeL * 0.6,
  /** Rise of the chamber pressure at each stroke if nothing left it: n·p_abs·ΔV/V_air, bar. */
  chamberSwingBar:
    (POLYTROPIC * ((RHO * G * SITE_DIMS.deliveryHead) / 1e5 + 1.013) * (MODEL.mlPerStroke / 1000)) /
    (CHAMBER.volumeL * 0.6),
  /** Seat section of the n°1 valve (15 mm nominal), mm². */
  seatAreaMm2: (Math.PI / 4) * (VALVE.seatBore[1] * 1000) ** 2,
  /** Curtain area under the open head: π × seat bore × stroke, mm². */
  curtainMm2: Math.PI * (VALVE.seatBore[1] * 1000) * STROKE,
  /** Moving mass of the n°1 valve: bare mass + counterweight, kg. */
  movingMassKg: VALVES[1].bareMass + WEIGHT / 1000,
  /** Force that holds the closed valve on its seat at the peak pressure, N. */
  holdForceN: MODEL.peakBar * 1e5 * (Math.PI / 4) * VALVE.seatBore[1] ** 2,
  /** Pressure below which the weight can reopen the valve: m·g/A_seat, bar. */
  reopenBar: ((VALVES[1].bareMass + WEIGHT / 1000) * G) / ((Math.PI / 4) * VALVE.seatBore[1] ** 2) / 1e5,
  /** Total area of the exhaust ports, mm². */
  portsMm2: VALVE.portCount * VALVE.portWidth * VALVE.portHeight * 1e6,
} as const;

const fr = (x: number, d = 0) => nFr(x, d);
const en = (x: number, d = 0) => nEn(x, d);

export const RAM_PARTS: PartInfo[] = [
  {
    id: 'ram',
    scene: 'ram',
    category: 'hydraulic',
    name: l('Corps du bélier', 'Ram body'),
    short: l(
      'Corps coulé qui reçoit l’eau motrice et porte le clapet de choc, le clapet de refoulement, la cloche et les vannes.',
      'Cast body that receives the drive water and carries the waste valve, the delivery check valve, the chamber and the valves.',
    ),
    description: l(
      `Le corps est la chambre où arrive l’eau de la conduite motrice. Tant que le **clapet de choc** est ouvert, elle s’échappe par lui et prend de la vitesse ; quand il claque, le corps encaisse le coup (${fr(MODEL.peakBar, 1)} bar de pointe dans le modèle) et n’a plus qu’une issue, le clapet de refoulement vers la cloche. Trois ouvertures en découlent : l’arrivée, la sortie de l’eau perdue, la sortie utile. Le laboratoire montre un bélier générique de 1″ et non le Walton n°3 de la vidéo, fabriqué à Bordeaux : aucune fiche du constructeur n’a été trouvée, donc les dimensions du corps sont des estimations, et seul le clapet de choc suit la vidéo. Le principe est attribué à Joseph de Montgolfier, à la fin du XVIIIe siècle (1792 dans la vidéo).`,
      `The body is the chamber where the drive pipe water arrives. While the **waste valve** is open it escapes through it and gathers speed; when the valve slams, the body takes the hammer (${en(MODEL.peakBar, 1)} bar peak in the model) and has only one way out, the delivery check valve into the chamber. Three openings follow: the inlet, the exit for the lost water, the useful exit. The lab shows a generic 1″ ram and not the video’s Walton n°3, made in Bordeaux: no maker data sheet was found, so the body dimensions are estimates, and only the waste valve follows the video. The principle is credited to Joseph de Montgolfier, in the late eighteenth century (1792 in the video).`,
    ),
    material: l('Fonte (estimation, aucune fiche du constructeur)', 'Cast iron (estimate, no maker data sheet)'),
    specs: [
      sp(
        'Classe',
        'Class',
        l(
          `1″, conduite motrice de ${mm(SITE_DIMS.driveBore).fr} mm intérieur (hypothèse du modèle)`,
          `1″, drive pipe of ${mm(SITE_DIMS.driveBore).en} mm inner diameter (model assumption)`,
        ),
      ),
      sp(
        'Corps (tube coulé)',
        'Body (cast tube)',
        tagged(
          'estimate',
          `Ø ${mm(RAM.bodyOuterRadius * 2).fr} extérieur, Ø ${mm(RAM.bodyInnerRadius * 2).fr} intérieur, ${mm(RAM.bodyLength).fr} mm de long`,
          `Ø ${mm(RAM.bodyOuterRadius * 2).en} outer, Ø ${mm(RAM.bodyInnerRadius * 2).en} inner, ${mm(RAM.bodyLength).en} mm long`,
        ),
      ),
      sp(
        'Brides d’extrémité',
        'End flanges',
        tagged(
          'estimate',
          `Ø ${mm(RAM.flangeDiameter).fr} × ${mm(RAM.flangeThickness).fr} mm, 4 boulons`,
          `Ø ${mm(RAM.flangeDiameter).en} × ${mm(RAM.flangeThickness).en} mm, 4 bolts`,
        ),
      ),
      sp(
        'Axes des piles (depuis la bride d’arrivée)',
        'Stack axes (from the inlet flange)',
        tagged(
          'estimate',
          `clapet de choc ${mm(RAM.xWaste).fr} mm, reniflard ${mm(RAM.xSnifter).fr} mm, cloche ${mm(RAM.xDelivery).fr} mm`,
          `waste valve ${mm(RAM.xWaste).en} mm, snifter ${mm(RAM.xSnifter).en} mm, chamber ${mm(RAM.xDelivery).en} mm`,
        ),
      ),
      sp(
        'Pieds',
        'Feet',
        tagged(
          'estimate',
          `2 pieds coulés de ${mm(RAM.footWidth).fr} mm, entraxe ${mm(RAM.footSpacing).fr} mm`,
          `2 cast feet of ${mm(RAM.footWidth).en} mm, ${mm(RAM.footSpacing).en} mm apart`,
        ),
      ),
      sp(
        'Pression statique à l’arrivée',
        'Static pressure at the inlet',
        tagged(
          'derived',
          `${fr(DERIVED.inletBar, 2)} bar (7,5 m de chute)`,
          `${en(DERIVED.inletBar, 2)} bar (7.5 m fall)`,
        ),
      ),
      sp(
        'Pression de pointe à chaque coup',
        'Peak pressure at each stroke',
        tagged('model', `${fr(MODEL.peakBar, 1)} bar`, `${en(MODEL.peakBar, 1)} bar`),
      ),
      sp(
        'Débit moteur mini (NC State)',
        'Minimum drive flow (NC State)',
        l('22,7 L/min pour un bélier de 1″', '22.7 L/min for a 1″ ram'),
      ),
      sp(
        'Refoulement maxi (NC State)',
        'Maximum delivery (NC State)',
        l('7,6 m³/jour pour un bélier de 1″', '7.6 m³/day for a 1″ ram'),
      ),
      sp(
        'Rendement typique (NC State, Wikipédia)',
        'Typical efficiency (NC State, Wikipedia)',
        l('0,6, jusqu’à 0,8', '0.6, up to 0.8'),
      ),
      sp(
        'Rendement du clapet n°1 (D’Aubuisson)',
        'Efficiency of the n°1 valve (D’Aubuisson)',
        tagged('model', fr(MODEL.etaD, 2), en(MODEL.etaD, 2)),
      ),
      sp('Walton n°3 de la vidéo', 'Video’s Walton n°3', l('Fiche non trouvée', 'Data sheet not found')),
    ],
    maintenance: l(
      '**Panne à prévoir.** Un suintement aux brides ou à la platine du clapet de choc, ou une fissure de gel (la fonte éclate si l’eau gèle dedans). **À vérifier.** À l’arrêt, essuyez le corps et regardez où l’humidité revient en cinq minutes ; tracez un trait de peinture sur chaque boulon pour voir s’il a tourné. **Entretien.** Resserrez les boulons après la première semaine puis à chaque visite (le corps reçoit une centaine de coups par minute), et videz-le par la vanne V2 avant une nuit de gel.',
      '**Typical failure.** A weep at the flanges or at the waste valve plate, or a frost crack (cast iron bursts if the water freezes inside). **How to check.** At standstill, wipe the body dry and see where the damp comes back within five minutes; paint a line across each bolt to see whether it has turned. **Upkeep.** Retighten the bolts after the first week and on every visit (the body takes about a hundred strokes a minute), and empty it through valve V2 before a frosty night.',
    ),
    tip: l(
      'Un bélier de 1″ attend plus d’eau que la source de la vidéo n’en donne (22,7 L/min contre 7,5). La vidéo comble l’écart en réduisant la consommation du clapet, pas en changeant de bélier.',
      'A 1″ ram expects more water than the video’s spring gives (22.7 L/min against 7.5). The video closes the gap by cutting the valve’s consumption, not by changing the ram.',
    ),
    video: ['01:40', '03:02'],
    design: l(
      'Le corps a trois ouvertures : l’arrivée (conduite motrice), la sortie de l’eau perdue (clapet de choc) et la sortie utile vers la cloche (clapet de refoulement). Tout le reste du bélier en découle.',
      'The body has three openings: the inlet (drive pipe), the exit for the lost water (waste valve) and the useful exit to the chamber (delivery check valve). Everything else on the ram follows from them.',
    ),
  },
  {
    id: 'inlet-flange',
    scene: 'ram',
    category: 'hydraulic',
    name: l('Bride d’arrivée', 'Inlet flange'),
    short: l(
      'Bride soudée au bout de la conduite motrice : elle boulonne le tuyau rigide à la crépine et se défait sans rien couper.',
      'Flange welded at the end of the drive pipe: it bolts the rigid pipe to the strainer and comes apart without cutting anything.',
    ),
    description: l(
      `La bride d’arrivée est celle de la conduite motrice : une bride d’acier soudée au bout du tuyau rigide, avec un joint plat en fibre et quatre boulons qui la serrent contre la bride de la crépine. C’est le premier joint du bélier côté réserve, celui qu’on défait pour séparer les 20 m de conduite du bélier. Elle supporte la pression statique de la conduite (${fr(DERIVED.inletBar, 2)} bar pour 7,5 m de chute, dérivé) et la poussée de chaque coup, environ ${fr(DERIVED.thrustKn, 2)} kN à ${fr(MODEL.peakBar, 1)} bar (dérivé), répétée ${fr(MODEL.strokesPerMin)} fois par minute dans le modèle. Les brides ne sont pas montrées dans la vidéo : les cotes sont celles, estimées, d’une bride DN25 PN16 courante.`,
      `The inlet flange is the drive pipe’s: a steel flange welded at the end of the rigid pipe, with a flat fibre gasket and four bolts that draw it against the strainer’s flange. It is the ram’s first joint on the tank side, the one you undo to separate the 20 m of pipe from the ram. It carries the static pressure of the pipe (${en(DERIVED.inletBar, 2)} bar for a 7.5 m fall, derived) and the push of each stroke, about ${en(DERIVED.thrustKn, 2)} kN at ${en(MODEL.peakBar, 1)} bar (derived), repeated ${en(MODEL.strokesPerMin)} times a minute in the model. The flanges are not shown in the video: the dimensions are the estimated ones of a usual DN25 PN16 flange.`,
    ),
    material: l(
      'Acier galvanisé soudé sur le tuyau, joint plat en fibre, boulons zingués (estimation)',
      'Galvanised steel welded on the pipe, flat fibre gasket, zinc-plated bolts (estimate)',
    ),
    specs: [
      sp('Taille', 'Size', tagged('estimate', 'DN25, PN16')),
      sp(
        'Bride soudée sur le tuyau',
        'Flange welded on the pipe',
        tagged(
          'estimate',
          `Ø ${mm(INLET.flangeDiameter).fr} × ${mm(INLET.flangeThickness).fr} mm`,
          `Ø ${mm(INLET.flangeDiameter).en} × ${mm(INLET.flangeThickness).en} mm`,
        ),
      ),
      sp(
        'Tuyau de la conduite motrice',
        'Drive pipe',
        l(
          `acier Ø ${mm(SITE_DIMS.driveOuterDiameter).fr} mm extérieur (dérivé), Ø ${mm(SITE_DIMS.driveBore).fr} mm intérieur (hypothèse du modèle)`,
          `steel Ø ${mm(SITE_DIMS.driveOuterDiameter).en} mm outer (derived), Ø ${mm(SITE_DIMS.driveBore).en} mm inner (model assumption)`,
        ),
      ),
      sp('Collet de soudure (3D)', 'Weld collar (3D)', lenMm('estimate', INLET.weldCollarHeight)),
      sp(
        'Joint',
        'Gasket',
        tagged(
          'estimate',
          `fibre plat, ${mm(INLET.gasketThickness).fr} mm`,
          `flat fibre, ${mm(INLET.gasketThickness).en} mm`,
        ),
      ),
      sp(
        'Boulons',
        'Bolts',
        tagged(
          'estimate',
          `4 × M10, cercle de Ø ${mm(INLET.boltCircleRadius * 2).fr} mm, longueur ${mm(INLET.boltLength).fr} mm`,
          `4 × M10, circle of Ø ${mm(INLET.boltCircleRadius * 2).en} mm, length ${mm(INLET.boltLength).en} mm`,
        ),
      ),
      sp(
        'Pression statique',
        'Static pressure',
        tagged('derived', `${fr(DERIVED.inletBar, 2)} bar`, `${en(DERIVED.inletBar, 2)} bar`),
      ),
      sp(
        'Poussée axiale à chaque coup',
        'Axial push at each stroke',
        tagged(
          'derived',
          `≈ ${fr(DERIVED.thrustKn, 2)} kN à ${fr(MODEL.peakBar, 1)} bar`,
          `≈ ${en(DERIVED.thrustKn, 2)} kN at ${en(MODEL.peakBar, 1)} bar`,
        ),
      ),
    ],
    maintenance: l(
      `**Panne à prévoir.** Un suintement au joint, ou un boulon desserré par les ${fr(MODEL.strokesPerMin)} coups par minute du modèle ; une fuite qui grossit signale souvent un tuyau qui arrive de travers et tire la bride, ou deux faces pas tout à fait parallèles. **À vérifier.** Enroulez un papier absorbant autour du joint en marche, sans approcher les doigts du clapet de choc : il doit rester sec ; un trait de peinture sur chaque boulon trahit un desserrage, et un espace plus large d’un côté du joint un tuyau mal aligné. **Entretien.** Serrez les quatre boulons en croix, par petites fractions de tour, après la première semaine ; changez le joint à chaque démontage.`,
      `**Typical failure.** A weep at the gasket, or a bolt worked loose by the model’s ${en(MODEL.strokesPerMin)} strokes a minute; a leak that grows often means a pipe that arrives crooked and pulls the flange, or two faces that are not quite parallel. **How to check.** Wrap an absorbent paper around the joint while the ram runs, keeping your fingers away from the waste valve: it must stay dry; a paint line across each bolt betrays loosening, and a wider gap on one side of the joint a misaligned pipe. **Upkeep.** Tighten the four bolts crosswise, in small fractions of a turn, after the first week; replace the gasket every time you take it apart.`,
    ),
    tip: l(
      'Serrez en croix et par petites fractions de tour : une bride serrée d’un seul côté fuit. Soutenez le tuyau avant la bride, pour que le bélier ne porte pas la conduite.',
      'Tighten crosswise and in small fractions of a turn: a flange tightened on one side only leaks. Support the pipe ahead of the flange, so that the ram does not carry the pipe.',
    ),
    design: l(
      'Une bride boulonnée plutôt qu’un raccord fileté : on sépare le bélier de sa conduite rigide en quatre boulons, sans avoir à le faire tourner sur elle.',
      'A bolted flange rather than a threaded joint: you separate the ram from its rigid pipe with four bolts, without having to turn it on the pipe.',
    ),
  },
  {
    id: 'inlet-valve',
    scene: 'ram',
    category: 'hydraulic',
    name: l('Vanne d’arrivée (V1)', 'Inlet valve (V1)'),
    short: l(
      'Vanne qui coupe l’eau motrice pour arrêter le bélier ou le démonter.',
      'Valve that cuts the drive water to stop the ram or take it apart.',
    ),
    description: l(
      `La vanne d’arrivée est posée sur la conduite motrice, juste avant le bélier, entre la crépine et le corps. Elle sert à l’arrêter, à régler sa mise en route (on l’ouvre progressivement) et à le démonter sans vider la réserve. Ouverte, elle doit se faire oublier : le modèle compte son passage, celui de la crépine et les coudes dans un coefficient de pertes K = 3, et tout ce qu’elle retient en charge est de l’élan perdu pour le coup. Elle n’est pas montrée dans la vidéo : c’est une pièce courante d’un bélier de 1″.`,
      `The inlet valve sits on the drive pipe, just before the ram, between the strainer and the body. It stops the ram, sets its start-up (it is opened gradually) and lets you take it apart without emptying the tank. Open, it should go unnoticed: the model counts its passage, the strainer’s and the bends in a loss coefficient K = 3, and whatever head it holds back is momentum lost to the stroke. It is not shown in the video: it is a usual part of a 1″ ram.`,
    ),
    material: l('Laiton, à brides (estimation)', 'Brass, flanged (estimate)'),
    specs: [
      sp('Taille', 'Size', l('DN25 (1″), comme la conduite motrice', 'DN25 (1″), like the drive pipe')),
      sp('Longueur', 'Length', lenMm('estimate', INLET.valveLength)),
      sp(
        'Brides',
        'Flanges',
        tagged(
          'estimate',
          `Ø ${mm(INLET.flangeDiameter).fr} × ${mm(INLET.flangeThickness).fr} mm`,
          `Ø ${mm(INLET.flangeDiameter).en} × ${mm(INLET.flangeThickness).en} mm`,
        ),
      ),
      sp(
        'Pertes de l’arrivée (K total)',
        'Inlet losses (total K)',
        tagged('assumed', 'K = 3, avec crépine et coudes', 'K = 3, with strainer and bends'),
      ),
      sp(
        'Pression statique côté réserve',
        'Static pressure on the tank side',
        tagged('derived', `${fr(DERIVED.inletBar, 2)} bar`, `${en(DERIVED.inletBar, 2)} bar`),
      ),
      sp(
        'Cadence à retrouver (clapet n°1)',
        'Rate to recover (n°1 valve)',
        l('100 à 110 coups/min', '100–110 strokes/min'),
      ),
    ],
    maintenance: l(
      '**Panne à prévoir.** Une vanne qui n’ouvre pas en grand (boisseau grippé, poignée qui tourne à vide) étrangle l’arrivée : le débit moteur et la cadence baissent sans la moindre fuite visible ; une vanne qui suinte par la tige, elle, se voit. **À vérifier.** Relevez la cadence au chronomètre à la mise en service (100 à 110 coups/min pour le clapet n°1 de la vidéo) et comparez-la ensuite ; une vanne à moitié ouverte siffle et sa poignée n’est plus dans l’axe de la conduite. **Entretien.** Manœuvrez-la en entier une fois par an pour qu’elle ne se grippe pas et resserrez le presse-étoupe si elle suinte.',
      '**Typical failure.** A valve that does not open fully (seized ball, handle turning loosely) chokes the inlet: the drive flow and the rate drop without any visible leak; a valve that weeps at the stem, on the other hand, shows. **How to check.** Count the strokes with a stopwatch at commissioning (100–110 strokes/min for the video’s n°1 valve) and compare later; a half-open valve hisses and its handle is no longer in line with the pipe. **Upkeep.** Operate it through its full travel once a year so that it does not seize, and retighten the gland if it weeps.',
    ),
    tip: l(
      'Ne réglez jamais le débit avec V1 : un boisseau à moitié fermé étrangle l’eau motrice et le bélier perd son élan. Réglez avec la course du clapet de choc, et fermez V1 avant toute intervention sur lui.',
      'Never set the flow with V1: a half-closed ball chokes the drive water and the ram loses its momentum. Set it with the waste valve stroke, and close V1 before any work on the valve.',
    ),
    design: l(
      'À passage intégral pour ne pas freiner la colonne d’eau : tout ce que la vanne retient en charge est de l’élan perdu pour le coup.',
      'Full-bore so as not to hold back the water column: whatever head the valve takes is momentum lost to the stroke.',
    ),
  },
  {
    id: 'strainer',
    scene: 'ram',
    category: 'hydraulic',
    name: l('Crépine', 'Strainer'),
    short: l(
      'Filtre à l’entrée du bélier qui retient feuilles, sable et gravillons.',
      'Filter at the ram inlet that catches leaves, sand and grit.',
    ),
    description: l(
      `La crépine est un filtre en Y placé sur la conduite motrice, entre la bride d’arrivée et la vanne V1. Elle arrête ce que l’eau de la source charrie (feuilles, sable, gravillons) avant que cela ne se coince entre la tête du clapet et sa portée, ou sous le clapet de refoulement : c’est la deuxième ligne de défense, la première étant la crépine de départ de la réserve. Elle ajoute une petite perte de charge : le modèle la compte, avec la vanne d’arrivée et les coudes, dans un coefficient K = 3. Elle n’est pas montrée dans la vidéo : c’est une pièce courante d’un bélier.`,
      `The strainer is a Y-filter on the drive pipe, between the inlet flange and valve V1. It stops what the spring water carries (leaves, sand, grit) before it can jam between the valve head and its seat, or under the delivery check valve: it is the second line of defence, the first being the tank’s intake screen. It adds a small head loss: the model counts it, with the inlet valve and the bends, in a coefficient K = 3. It is not shown in the video: it is a usual part of a ram.`,
    ),
    material: l('Fonte, tamis inox (estimation)', 'Cast iron, stainless screen (estimate)'),
    specs: [
      sp('Taille', 'Size', l('DN25 (1″), crépine en Y', 'DN25 (1″), Y-strainer')),
      sp('Longueur (3D)', 'Length (3D)', lenMm('estimate', INLET.strainerLength)),
      sp(
        'Brides',
        'Flanges',
        tagged(
          'estimate',
          `Ø ${mm(INLET.flangeDiameter).fr} × ${mm(INLET.flangeThickness).fr} mm`,
          `Ø ${mm(INLET.flangeDiameter).en} × ${mm(INLET.flangeThickness).en} mm`,
        ),
      ),
      sp('Maillage', 'Mesh', l('Non précisé', 'Not stated')),
      sp(
        'Pertes de l’arrivée (K total)',
        'Inlet losses (total K)',
        tagged('assumed', 'K = 3, avec vanne et coudes', 'K = 3, with valve and bends'),
      ),
      sp(
        'Pression statique',
        'Static pressure',
        tagged('derived', `${fr(DERIVED.inletBar, 2)} bar`, `${en(DERIVED.inletBar, 2)} bar`),
      ),
    ],
    maintenance: l(
      '**Panne à prévoir.** Un tamis colmaté (feuilles, sable, calcaire) étrangle l’arrivée : le débit moteur baisse, la cadence aussi, puis le bélier s’arrête ; un tamis déchiré, lui, ne se voit pas et laisse passer le sable jusqu’au clapet de choc. **À vérifier.** Comparez la cadence relevée au chronomètre à celle du premier jour ; au moindre doute, fermez la vanne de départ de la réserve, dévissez le bouchon du Y et regardez le tamis à la lumière. **Entretien.** Nettoyez-le à chaque visite, et refermez le bouchon sur un joint en bon état.',
      '**Typical failure.** A clogged screen (leaves, sand, limescale) chokes the inlet: the drive flow drops, and the rate with it, then the ram stops; a torn screen, on the other hand, does not show and lets sand through to the waste valve. **How to check.** Compare the stopwatch rate with that of the first day; at the slightest doubt, close the tank’s drive gate valve, unscrew the Y plug and look at the screen against the light. **Upkeep.** Clean it on every visit, and close the plug again on a gasket in good condition.',
    ),
    tip: l(
      'Prenez un tamis dont la surface est bien plus grande que la section du tuyau, pour qu’il mette longtemps à se colmater.',
      'Choose a screen whose area is much larger than the pipe section, so that it takes a long time to clog.',
    ),
    design: l(
      'Un gravillon coincé sous la tête suffit à faire fuir une portée conique : le plus sûr est de l’arrêter avant elle, en amont, là où un tamis se démonte sans toucher au bélier.',
      'A bit of grit stuck under the head is enough to make a conical seat leak: the safest course is to stop it before it gets there, upstream, where a screen comes out without touching the ram.',
    ),
  },
  {
    id: 'waste-valve',
    scene: 'ram',
    category: 'hydraulic',
    name: l('Clapet de choc (ensemble)', 'Waste (impulse) valve (assembly)'),
    short: l(
      'Le clapet qui claque : il stoppe la colonne d’eau et crée le coup de bélier. Ici, un ensemble de 14 pièces fait de raccords de plomberie.',
      'The valve that slams: it stops the water column and makes the water hammer. Here, an assembly of 14 parts built from plumbing fittings.',
    ),
    description: l(
      `Le clapet de choc est le cœur du bélier, et le seul organe que la vidéo détaille. Ouvert au repos, il laisse l’eau de la conduite motrice s’échapper et accélérer ; quand le courant atteint environ ${fr(MODEL.closingVelocity, 2)} m/s (résultat du modèle), il plaque la tête sur sa portée en 18 ms environ : la colonne stoppée fait monter la pression et pousse une petite part de l’eau vers la cloche. Le recul fait ensuite retomber la pression sous le seuil où le poids rouvre le clapet, et le cycle recommence, ${fr(MODEL.strokesPerMin)} fois par minute. Dans la vidéo, l’auteur remplace le clapet du Walton n°3 par un clapet n°1 fait de raccords de plomberie, presque sans usinage : la cadence passe de 70–80 à 100–110 coups/min, le bélier ne s’arrête plus et refoule environ 500 L par jour. Les 14 pièces de l’ensemble s’ouvrent dans le monde « Le clapet » (bouton en bas de cette fiche).`,
      `The waste valve is the heart of the ram, and the only part the video details. Open at rest, it lets the drive pipe water escape and accelerate; once the flow reaches about ${en(MODEL.closingVelocity, 2)} m/s (model result), it slaps the head onto its seat in about 18 ms: the stopped column raises the pressure and pushes a small share of the water toward the chamber. The recoil then lets the pressure fall below the threshold at which the weight reopens the valve, and the cycle starts again, ${en(MODEL.strokesPerMin)} times a minute. In the video the author replaces the Walton n°3’s valve with a n°1 valve built from plumbing fittings, with almost no machining: the rate goes from 70–80 to 100–110 strokes/min, the ram no longer stops and delivers about 500 L a day. The 14 parts of the assembly open in the “The valve” world (button at the bottom of this sheet).`,
    ),
    material: l(
      'Raccords de plomberie standard (matière non précisée), tige filetée et acier, vis inox',
      'Standard plumbing fittings (material not stated), threaded rod and steel, stainless screw',
    ),
    specs: [
      sp(
        'Tailles de clapet',
        'Valve sizes',
        l(
          'n°1 : 15×21 (½″) · n°2 : 20×27 (¾″) · n°3 : 26×34 (1″)',
          'n°1: 15×21 (½″) · n°2: 20×27 (¾″) · n°3: 26×34 (1″)',
        ),
      ),
      sp(
        'Pièces',
        'Parts',
        l(
          '14, détaillées dans le monde « Le clapet » : platine, manchon soudé, réduction, mamelon à lumières, manchon, portée, tête, tige, manchons de tige, guide, ailettes, poids, écrou de course, contre-écrou',
          '14, detailed in the “The valve” world: plate, welded socket, reducer, ported nipple, sleeve, seat, head, stem, stem sleeves, guide, fins, weight, stroke nut, lock nut',
        ),
      ),
      sp(
        'Cadence',
        'Stroke rate',
        l(
          `100 à 110 coups/min (vidéo) ; ${fr(MODEL.strokesPerMin)} dans le modèle`,
          `100–110 strokes/min (video); ${en(MODEL.strokesPerMin)} in the model`,
        ),
      ),
      sp(
        'Course et poids du n°1',
        'Stroke and weight of the n°1',
        tagged('calibrated', `${fr(STROKE, 1)} mm, ${fr(WEIGHT)} g`, `${en(STROKE, 1)} mm, ${en(WEIGHT)} g`),
      ),
      sp(
        'Masse mobile totale',
        'Total moving mass',
        tagged(
          'derived',
          `${fr(DERIVED.movingMassKg * 1000)} g (${fr(VALVES[1].bareMass * 1000)} g supposés + ${fr(WEIGHT)} g)`,
          `${en(DERIVED.movingMassKg * 1000)} g (${en(VALVES[1].bareMass * 1000)} g assumed + ${en(WEIGHT)} g)`,
        ),
      ),
      sp(
        'Vitesse de l’eau à la fermeture',
        'Water speed at closing',
        tagged(
          'model',
          `${fr(MODEL.closingVelocity, 2)} m/s (minimum ${fr(MODEL.minClosingVelocity, 2)} m/s pour refouler)`,
          `${en(MODEL.closingVelocity, 2)} m/s (minimum ${en(MODEL.minClosingVelocity, 2)} m/s to deliver)`,
        ),
      ),
      sp(
        'Consommation du n°1',
        'Consumption of the n°1',
        tagged(
          'model',
          `≈ ${fr(MODEL.driveFlow, 1)} L/min, dont ${fr(MODEL.wasteFlow, 1)} L/min jetés`,
          `≈ ${en(MODEL.driveFlow, 1)} L/min, of which ${en(MODEL.wasteFlow, 1)} L/min thrown away`,
        ),
      ),
      sp('Refoulé', 'Delivered', l('≈ 500 L/jour', '≈ 500 L/day')),
      sp(
        'Cadences usuelles (NC State, NITK)',
        'Usual rates (NC State, NITK)',
        l('20 à 100 coups/min ; 40 à 120 coups/min', '20–100 strokes/min; 40–120 strokes/min'),
      ),
      sp(
        'Force qui plaque le clapet fermé',
        'Force holding the shut valve',
        tagged(
          'derived',
          `≈ ${fr(DERIVED.holdForceN)} N à ${fr(MODEL.peakBar, 1)} bar`,
          `≈ ${en(DERIVED.holdForceN)} N at ${en(MODEL.peakBar, 1)} bar`,
        ),
      ),
      sp(
        'Hauteur au-dessus de la platine',
        'Height above the plate',
        lenMm('derived', VALVE.guideTop + VALVE.counterweightLength + 2 * VALVE.nutThickness),
      ),
    ],
    maintenance: l(
      '**Panne à prévoir.** Trois pannes classiques. Le clapet ne démarre pas ou s’arrête (tige qui frotte dans le guide, poids de travers) ; il fuit à la fermeture (gravillon, portée marquée), et la portée du clapet de la vidéo suinte déjà un peu ; la course dérive (écrou desserré) et la consommation avec elle. **À vérifier.** Écoutez un battement net et régulier de 100 à 110 coups/min, comptez-les au chronomètre et regardez le jet sortir des lumières, jamais avec les doigts. À l’arrêt (V1 fermée), soulevez le poids à la main et lâchez-le : la tige doit retomber d’un trait sur le guide. **Entretien.** À chaque visite, contrôlez les traits de peinture des écrous, rincez les lumières et la portée, regardez l’usure de la tête.',
      '**Typical failure.** Three classic ones. The valve does not start or stops (stem rubbing in the guide, weight crooked); it leaks when closed (grit, marked seat), and the video’s valve seat already weeps a little; the stroke drifts (loose nut) and the consumption with it. **How to check.** Listen for a clean, regular beat of 100–110 strokes/min, count them with a stopwatch and watch the jet leave the ports, never with your fingers. At standstill (V1 closed), lift the weight by hand and let go: the stem must fall back onto the guide in one go. **Upkeep.** On every visit, check the paint lines of the nuts, rinse the ports and the seat, look at the wear of the head.',
    ),
    tip: l(
      'La taille du clapet se choisit sur la source, pas sur le bélier : la vidéo passe du n°3 au n°2 (qui fonctionne mal et consomme encore trop), puis au n°1.',
      'The valve size is chosen on the spring, not on the ram: the video goes from the n°3 to the n°2 (which works badly and still uses too much), then to the n°1.',
    ),
    video: ['03:02', '03:47', '06:20', '13:40'],
    design: l(
      'Tout le réglage du bélier tient dans ce clapet : sa taille borne le débit, sa course et son poids décident de la consommation et du rythme. L’auteur le construit avec des éléments courants et presque sans usinage, pour que chaque pièce se remplace seule.',
      'All the tuning of the ram sits in this valve: its size caps the flow, its stroke and weight decide the consumption and the rhythm. The author builds it from common parts and almost without machining, so that each part can be replaced on its own.',
    ),
  },
  {
    id: 'delivery-valve',
    scene: 'ram',
    category: 'hydraulic',
    name: l('Clapet anti-retour de refoulement', 'Delivery check valve'),
    short: l(
      'Clapet qui laisse monter l’eau du corps vers la cloche et l’empêche de redescendre.',
      'Valve that lets water rise from the body into the chamber and stops it coming back.',
    ),
    description: l(
      `D’après la vidéo, ce petit clapet se trouve dans la cloche. Quand le clapet de choc claque, l’eau de la conduite, arrêtée net, n’a d’autre issue que de le forcer : elle monte dans la cloche et la conduite de refoulement. Il s’ouvre dès que la pression du corps dépasse celle du refoulement (≈ ${fr(DERIVED.deliveryBar, 1)} bar), pendant environ ${fr(MODEL.deliverSharePct)} % du cycle seulement, et se referme dès qu’elle retombe : la colonne de 65 m reste en place pendant le recul. Chaque ouverture laisse passer ${fr(MODEL.mlPerStroke, 1)} mL dans le modèle, soit 500 L par jour au total. Le modèle en fait un orifice à sens unique dont la section vaut la moitié de celle de la conduite motrice.`,
      `According to the video, this small valve sits in the chamber. When the waste valve slams, the water in the pipe, stopped dead, has no other way out than to force it: it rises into the chamber and the delivery pipe. It opens as soon as the body pressure exceeds the delivery pressure (≈ ${en(DERIVED.deliveryBar, 1)} bar), for only about ${en(MODEL.deliverSharePct)}% of the cycle, and shuts as soon as it falls: the 65 m column stays in place during the recoil. Each opening passes ${en(MODEL.mlPerStroke, 1)} mL in the model, 500 L a day in all. The model treats it as a one-way orifice whose area is half that of the drive pipe.`,
    ),
    material: l('Laiton, à levée verticale (estimation)', 'Brass, vertical lift (estimate)'),
    specs: [
      sp(
        'Corps (3D)',
        'Body (3D)',
        tagged(
          'estimate',
          `${mm(CHECK_VALVE.acrossFlats).fr} mm sur plats × ${mm(CHECK_VALVE.height).fr} mm de haut`,
          `${mm(CHECK_VALVE.acrossFlats).en} mm across flats × ${mm(CHECK_VALVE.height).en} mm high`,
        ),
      ),
      sp('Alésage du siège (3D)', 'Seat bore (3D)', lenMm('estimate', CHECK_VALVE.seatBore)),
      sp('Levée du disque (3D)', 'Disc lift (3D)', lenMm('estimate', CHECK_VALVE.lift)),
      sp(
        'Section du modèle',
        'Model area',
        tagged('assumed', '½ de la section de la conduite motrice', '½ of the drive pipe section'),
      ),
      sp(
        'S’ouvre au-dessus de',
        'Opens above',
        tagged(
          'derived',
          `≈ ${fr(DERIVED.deliveryBar, 1)} bar, la pression de refoulement`,
          `≈ ${en(DERIVED.deliveryBar, 1)} bar, the delivery pressure`,
        ),
      ),
      sp(
        'Ouvert pendant',
        'Open for',
        tagged('model', `≈ ${fr(MODEL.deliverSharePct)} % du cycle`, `≈ ${en(MODEL.deliverSharePct)}% of the cycle`),
      ),
      sp(
        'Eau passée à chaque coup',
        'Water passed at each stroke',
        tagged('model', `${fr(MODEL.mlPerStroke, 1)} mL`, `${en(MODEL.mlPerStroke, 1)} mL`),
      ),
    ],
    maintenance: l(
      '**Panne à prévoir.** Un gravillon sous le disque, un siège usé ou un ressort fatigué : le clapet fuit à contre-sens et la colonne de refoulement redescend entre les coups, ou jusque dans le corps à l’arrêt ; coincé fermé, il ne laisse rien passer et le bélier frappe pour rien. **À vérifier.** Bélier arrêté (V1 fermée) et V2 fermée, regardez le manomètre : l’aiguille doit rester vers 6,4 bar de longues minutes ; si elle s’effondre en quelques secondes, le clapet fuit (ou V2 est entrouverte). **Entretien.** Démontez-le, nettoyez le siège et le disque, remplacez le joint ou le ressort qui a perdu sa force.',
      '**Typical failure.** Grit under the disc, a worn seat or a tired spring: the valve leaks backwards and the delivery column runs back between strokes, or down into the body at standstill; stuck shut, it passes nothing and the ram strikes for nothing. **How to check.** With the ram stopped (V1 closed) and V2 shut, watch the gauge: the needle must stay around 6.4 bar for many minutes; if it collapses within seconds, the valve leaks (or V2 is slightly open). **Upkeep.** Take it apart, clean the seat and the disc, replace the gasket or the spring that has lost its strength.',
    ),
    tip: l(
      'Gardez la crépine propre : elle protège ce clapet comme la portée du clapet de choc.',
      'Keep the strainer clean: it protects this valve as it does the waste valve seat.',
    ),
    video: ['03:26', '03:36'],
    design: l(
      'C’est le seul passage du corps vers la cloche : il transforme un coup bref en poussée à sens unique, et il garde la pression de la colonne d’eau pendant que le corps se vide.',
      'It is the only passage from the body to the chamber: it turns a brief hammer into a one-way push, and keeps the pressure of the water column while the body empties.',
    ),
  },
  {
    id: 'air-chamber',
    scene: 'ram',
    category: 'hydraulic',
    name: l('Cloche à air', 'Air chamber'),
    short: l(
      'Réservoir à coussin d’air qui lisse les à-coups en un débit continu vers le refoulement.',
      'Air-cushion vessel that smooths the jolts into a steady flow toward the delivery pipe.',
    ),
    description: l(
      `À chaque coup, le clapet de refoulement pousse un petit volume d’eau (${fr(MODEL.mlPerStroke, 1)} mL) dans la cloche, qui comprime l’air qui s’y trouve ; cet air se détend ensuite et pousse l’eau dans la conduite de refoulement, sans interruption entre deux coups. Les ${fr(DERIVED.airLitres, 1)} L d’air du modèle absorbent ces ${fr(MODEL.mlPerStroke, 1)} mL pour environ ${fr(DERIVED.chamberSwingBar, 2)} bar de variation : la pression reste à quelques centièmes de bar de celle de la colonne (≈ ${fr(DERIVED.deliveryBar, 1)} bar). Noyée, sans air, chaque coup rencontre directement la conduite : la pointe passe de ${fr(MODEL.peakBar, 1)} à ${fr(MODEL.loggedPeakBar, 1)} bar et le refoulement baisse de ${fr(MODEL.loggedDeliveryDropPct)} % dans le modèle. Le modèle suppose une cloche de ${fr(CHAMBER.volumeL)} L avec 60 % d’air à la pression de service ; la vidéo ne donne pas son volume.`,
      `At every stroke, the delivery check valve pushes a small volume of water (${en(MODEL.mlPerStroke, 1)} mL) into the chamber, which compresses the air in it; that air then expands and pushes the water into the delivery pipe, without a break between two strokes. The model’s ${en(DERIVED.airLitres, 1)} L of air absorb those ${en(MODEL.mlPerStroke, 1)} mL for about ${en(DERIVED.chamberSwingBar, 2)} bar of variation: the pressure stays within a few hundredths of a bar of the column’s (≈ ${en(DERIVED.deliveryBar, 1)} bar). Water-logged, with no air, every stroke meets the pipe directly: the peak goes from ${en(MODEL.peakBar, 1)} to ${en(MODEL.loggedPeakBar, 1)} bar and the delivery drops by ${en(MODEL.loggedDeliveryDropPct)}% in the model. The model assumes a ${en(CHAMBER.volumeL)} L chamber with 60% air at working pressure; the video does not give its volume.`,
    ),
    material: l('Acier soudé, fonds bombés (estimation)', 'Welded steel, dished ends (estimate)'),
    specs: [
      sp('Volume', 'Volume', tagged('assumed', `${fr(CHAMBER.volumeL)} L`, `${en(CHAMBER.volumeL)} L`)),
      sp('Part d’air à la pression de service', 'Air share at working pressure', tagged('assumed', '60 %')),
      sp(
        'Air à la pression de service',
        'Air at working pressure',
        tagged('derived', `${fr(DERIVED.airLitres, 1)} L`, `${en(DERIVED.airLitres, 1)} L`),
      ),
      sp('Exposant polytropique', 'Polytropic exponent', tagged('assumed', fr(POLYTROPIC, 1), en(POLYTROPIC, 1))),
      sp(
        'Variation de pression par coup',
        'Pressure swing per stroke',
        tagged(
          'derived',
          `≈ ${fr(DERIVED.chamberSwingBar, 2)} bar pour ${fr(MODEL.mlPerStroke, 1)} mL`,
          `≈ ${en(DERIVED.chamberSwingBar, 2)} bar for ${en(MODEL.mlPerStroke, 1)} mL`,
        ),
      ),
      sp(
        'Virole (3D)',
        'Shell (3D)',
        tagged(
          'estimate',
          `Ø ${mm(CHAMBER.diameter).fr} × ${mm(CHAMBER.shellHeight).fr} mm, paroi ${mm(CHAMBER.wall).fr} mm`,
          `Ø ${mm(CHAMBER.diameter).en} × ${mm(CHAMBER.shellHeight).en} mm, wall ${mm(CHAMBER.wall).en} mm`,
        ),
      ),
      sp('Fonds bombés (3D)', 'Dished ends (3D)', lenMm('estimate', CHAMBER.domeHeight)),
      sp(
        'Pression de service',
        'Working pressure',
        tagged('derived', `≈ ${fr(DERIVED.deliveryBar, 1)} bar`, `≈ ${en(DERIVED.deliveryBar, 1)} bar`),
      ),
      sp(
        'Pointe avec cloche noyée',
        'Peak with a water-logged chamber',
        tagged('model', `${fr(MODEL.loggedPeakBar, 1)} bar`, `${en(MODEL.loggedPeakBar, 1)} bar`),
      ),
    ],
    maintenance: l(
      `**Panne à prévoir.** La cloche se noie, faute d’air : coups durs, manomètre qui tremble, refoulement en baisse de ${fr(MODEL.loggedDeliveryDropPct)} % dans le modèle ; avec un reniflard bouché, cela prend une quinzaine d’heures. **À vérifier.** Regardez l’aiguille du manomètre (quasi immobile avec de l’air, nerveuse sans) et tapotez la cloche avec une clé : le métal sonne clair dans la partie pleine d’air, mat là où il y a de l’eau. **Entretien.** Gardez le reniflard propre : en marche il recharge la cloche tout seul (constante de temps de ${fr(MODEL.refillMinutes)} minutes dans le modèle).`,
      `**Typical failure.** The chamber becomes water-logged, for lack of air: harsh strokes, a trembling gauge, delivery down by ${en(MODEL.loggedDeliveryDropPct)}% in the model; with a blocked snifter this takes some fifteen hours. **How to check.** Watch the gauge needle (nearly still with air, nervous without) and tap the chamber with a spanner: the metal rings clear over the part full of air, dull where there is water. **Upkeep.** Keep the snifter clean: while running it recharges the chamber by itself (time constant of ${en(MODEL.refillMinutes)} minutes in the model).`,
    ),
    tip: l(
      'Si le refoulement chute d’un coup, regardez d’abord la cloche et le reniflard avant de toucher au clapet de choc.',
      'If the delivery suddenly drops, look at the chamber and the snifter first before touching the waste valve.',
    ),
    video: ['03:26'],
    design: l(
      'L’air est compressible, l’eau ne l’est pas : la cloche transforme des poussées brèves et violentes en un débit presque constant, ce qui ménage la conduite de refoulement.',
      'Air is compressible, water is not: the chamber turns short, violent pushes into an almost steady flow, which spares the delivery pipe.',
    ),
  },
  {
    id: 'snifter',
    scene: 'ram',
    category: 'hydraulic',
    name: l('Reniflard', 'Snifter valve'),
    short: l(
      'Minuscule soupape qui laisse entrer un peu d’air à chaque recul pour recharger la cloche.',
      'Tiny valve that lets in a little air at every recoil to recharge the chamber.',
    ),
    description: l(
      `L’air de la cloche se dissout peu à peu dans l’eau sous pression et finirait par disparaître. Le reniflard est une toute petite soupape sur le corps : pendant le recul de l’eau, la pression du corps tombe à −${fr(MODEL.recoilDipBar, 2)} bar, très en dessous de l’air libre, et elle s’ouvre ; elle laisse entrer une pincée d’air que le coup suivant pousse dans la cloche. Dans le modèle, c’est un orifice de 1,5 mm qui s’ouvre sous −0,01 bar ; bouché, l’air de la cloche se perd en quelques heures et la cloche est noyée au bout d’une quinzaine d’heures. La vidéo ne le montre pas : c’est un organe classique des béliers.`,
      `The chamber air gradually dissolves into the pressurised water and would eventually vanish. The snifter is a very small valve on the body: during the water’s recoil the body pressure falls to −${en(MODEL.recoilDipBar, 2)} bar, far below atmospheric, and it opens; it lets in a pinch of air that the next stroke pushes into the chamber. In the model it is a 1.5 mm orifice that opens below −0.01 bar; blocked, the chamber air is lost within a few hours and the chamber is water-logged after about fifteen hours. The video does not show it: it is a standard part of rams.`,
    ),
    material: l('Laiton (estimation)', 'Brass (estimate)'),
    specs: [
      sp(
        'Orifice du modèle',
        'Model orifice',
        tagged('assumed', `Ø ${fr(SNIFTER_DIAMETER * 1000, 1)} mm`, `Ø ${en(SNIFTER_DIAMETER * 1000, 1)} mm`),
      ),
      sp(
        'Pression d’ouverture',
        'Cracking pressure',
        tagged('assumed', `−${fr(SNIFTER_CRACK / 1e5, 2)} bar`, `−${en(SNIFTER_CRACK / 1e5, 2)} bar`),
      ),
      sp(
        'Pression du corps au recul',
        'Body pressure at the recoil',
        tagged('model', `−${fr(MODEL.recoilDipBar, 2)} bar`, `−${en(MODEL.recoilDipBar, 2)} bar`),
      ),
      sp(
        'Pièce dessinée en 3D',
        'Part drawn in 3D',
        tagged(
          'estimate',
          `Ø ${mm(FITTINGS.snifterDiameter).fr} × ${mm(FITTINGS.snifterHeight).fr} mm`,
          `Ø ${mm(FITTINGS.snifterDiameter).en} × ${mm(FITTINGS.snifterHeight).en} mm`,
        ),
      ),
      sp(
        'Position sur le corps',
        'Position on the body',
        tagged(
          'estimate',
          `${mm(RAM.xSnifter).fr} mm de la bride d’arrivée`,
          `${mm(RAM.xSnifter).en} mm from the inlet flange`,
        ),
      ),
      sp(
        'Rechargement de la cloche',
        'Chamber refill',
        tagged(
          'assumed',
          `constante de temps de ${fr(MODEL.refillMinutes)} min`,
          `time constant of ${en(MODEL.refillMinutes)} min`,
        ),
      ),
      sp(
        'Bouché : cloche noyée en',
        'Blocked: chamber water-logged in',
        tagged('model', `≈ ${fr(MODEL.loggedHours)} h`, `≈ ${en(MODEL.loggedHours)} h`),
      ),
    ],
    maintenance: l(
      `**Panne à prévoir.** L’orifice se bouche (calcaire, sable) sans le moindre signe : l’air de la cloche s’en va et le refoulement ne tombe qu’au bout de ${fr(MODEL.loggedHours)} heures environ dans le modèle ; l’inverse existe aussi, une soupape qui ne se referme pas crache de l’eau à chaque coup. **À vérifier.** Posez une goutte d’eau sur l’orifice, en marche : elle doit être aspirée à chaque recul, ${fr(MODEL.strokesPerMin)} fois par minute dans le modèle ; si elle reste immobile, il est bouché, si de l’eau gicle, il fuit. **Entretien.** Nettoyez l’orifice avec un fil fin à chaque visite et changez la bille ou la goupille usée.`,
      `**Typical failure.** The orifice clogs (limescale, sand) without any sign: the chamber air leaves and the delivery only falls after about ${en(MODEL.loggedHours)} hours in the model; the opposite exists too, a valve that does not close squirts water at every stroke. **How to check.** Put a drop of water on the orifice, while running: it must be sucked in at each recoil, ${en(MODEL.strokesPerMin)} times a minute in the model; if it stays still, the snifter is blocked, if water spurts out, it leaks. **Upkeep.** Clean the orifice with a fine wire on every visit and replace the worn ball or pin.`,
    ),
    tip: l(
      'Le scénario « Reniflard bouché » du simulateur montre la lenteur de la panne : l’air de la cloche s’en va sans bruit, puis le refoulement tombe.',
      'The simulator’s “Blocked snifter” scenario shows how slow the fault is: the chamber air leaves quietly, then the delivery falls.',
    ),
    design: l(
      'Sans reniflard, la cloche perdrait son coussin d’air et le bélier son rendement : c’est la pièce d’entretien automatique de la cloche, activée par le recul.',
      'Without a snifter the chamber would lose its air cushion and the ram its efficiency: it is the chamber’s automatic upkeep part, driven by the recoil.',
    ),
  },
  {
    id: 'gauge',
    scene: 'ram',
    category: 'hydraulic',
    name: l('Manomètre', 'Pressure gauge'),
    short: l(
      'Cadran de la pression de refoulement : il lit la hauteur d’eau déjà montée.',
      'Dial of the delivery pressure: it reads the height of water already lifted.',
    ),
    description: l(
      `Le manomètre se place côté refoulement, sur la cloche. Il lit la pression de la colonne d’eau : 1 bar correspond à environ 10 m de hauteur, donc l’aiguille monte vers ${fr(DERIVED.deliveryBar, 1)} bar quand les 65 m de conduite sont pleins. Dans le modèle, avec une cloche garnie d’air l’aiguille bouge à peine à chaque coup ; elle tremble franchement quand la cloche est noyée, et la pointe passe alors à ${fr(MODEL.loggedPeakBar, 1)} bar. C’est le seul instrument du bélier : il dit si la cloche tient, si la conduite est pleine, si le clapet de refoulement retient la colonne. Il n’est pas montré dans la vidéo.`,
      `The gauge goes on the delivery side, on the chamber. It reads the pressure of the water column: 1 bar corresponds to about 10 m of height, so the needle climbs toward ${en(DERIVED.deliveryBar, 1)} bar when the 65 m of pipe are full. In the model, with a chamber stocked with air the needle barely moves at each stroke; it trembles visibly when the chamber is water-logged, and the peak then goes to ${en(MODEL.loggedPeakBar, 1)} bar. It is the ram’s only instrument: it tells whether the chamber holds, whether the pipe is full, whether the delivery check valve keeps the column. It is not shown in the video.`,
    ),
    material: l('Boîtier inox, tube de Bourdon (estimation)', 'Stainless case, Bourdon tube (estimate)'),
    specs: [
      sp('Cadran (3D)', 'Dial (3D)', lenMm('estimate', FITTINGS.gaugeDiameter)),
      sp('Échelle', 'Scale', tagged('estimate', `0–${FITTINGS.gaugeFullScaleBar} bar`)),
      sp(
        'Pression à pleine hauteur',
        'Pressure at full lift',
        tagged('derived', `≈ ${fr(DERIVED.deliveryBar, 1)} bar (65 m)`, `≈ ${en(DERIVED.deliveryBar, 1)} bar (65 m)`),
      ),
      sp(
        'Pointe en marche, cloche saine',
        'Peak running, healthy chamber',
        tagged('model', `${fr(MODEL.peakBar, 1)} bar`, `${en(MODEL.peakBar, 1)} bar`),
      ),
      sp(
        'Pointe avec cloche noyée',
        'Peak with a water-logged chamber',
        tagged('model', `${fr(MODEL.loggedPeakBar, 1)} bar`, `${en(MODEL.loggedPeakBar, 1)} bar`),
      ),
      sp('Raccordement', 'Connection', l('Sur la cloche, côté refoulement', 'On the chamber, delivery side')),
    ],
    maintenance: l(
      '**Panne à prévoir.** Une aiguille collée, un raccord obstrué par le sable ou le calcaire, un cadran embué : l’instrument ment et plus aucune mesure n’est fiable. **À vérifier.** À l’arrêt, l’aiguille doit marquer la pression statique de la colonne, 1 bar pour 10 m, soit 6,4 bar pour 65 m ; comparez-la à un second manomètre ou à la hauteur connue du château d’eau. En marche, une aiguille quasi immobile signale une cloche saine, une aiguille nerveuse une cloche noyée. **Entretien.** Ne le démontez jamais sous pression (la cloche garde 6,4 bar) ; remplacez-le s’il reste collé ou s’il s’embue.',
      '**Typical failure.** A stuck needle, a connection clogged by sand or limescale, a misted dial: the instrument lies and no reading can be trusted. **How to check.** At standstill the needle must show the static pressure of the column, 1 bar per 10 m, that is 6.4 bar for 65 m; compare it with a second gauge or with the known height of the water tower. Running, a nearly still needle signals a healthy chamber, a nervous one a water-logged chamber. **Upkeep.** Never remove it under pressure (the chamber keeps 6.4 bar); replace it if it stays stuck or if it mists.',
    ),
    tip: l(
      'Un manomètre à bain de glycérine encaisse mieux les vibrations d’un bélier qu’un manomètre à sec. Un cadran de 10 bar place les 6,4 bar aux deux tiers de l’échelle.',
      'A glycerine-filled gauge copes better with a ram’s vibration than a dry one. A 10 bar dial puts the 6.4 bar at two thirds of the scale.',
    ),
    design: l(
      'Placé côté refoulement, il mesure l’effet utile, la hauteur déjà gagnée, plutôt que le choc : l’échelle doit dépasser la pointe de 7,2 bar du modèle.',
      'On the delivery side it measures the useful effect, the height already gained, rather than the hammer: the scale must exceed the model’s 7.2 bar peak.',
    ),
  },
  {
    id: 'delivery-union',
    scene: 'ram',
    category: 'hydraulic',
    name: l('Raccord union de refoulement', 'Delivery union'),
    short: l(
      'Raccord démontable à la suite de la vanne de sortie : il sépare le bélier de la conduite de 300 m sans rien tourner ni couper.',
      'Removable joint after the outlet valve: it separates the ram from the 300 m pipe without turning or cutting anything.',
    ),
    description: l(
      `L’union est un raccord à trois pièces (deux embouts et un écrou tournant) posé à la suite de la vanne V3, sur le départ de la conduite de refoulement ; elle se termine par un raccord à compression qui tient le tuyau en PE de 25 mm. Serrée, elle est étanche à ${fr(DERIVED.deliveryBar, 1)} bar de colonne d’eau ; desserrée, elle sépare le bélier de la conduite sans qu’on ait à faire tourner l’un ou l’autre. Derrière elle, la conduite de 300 m contient ${fr(DERIVED.pipeLitres)} L sous ${fr(DERIVED.deliveryBar, 1)} bar au pied de la pente : la desserrer sans précaution vide la conduite en un jet violent, et il faut ensuite environ trois heures de refoulement pour la remplir à nouveau. Elle n’est pas montrée dans la vidéo : c’est une pièce courante, retenue par le laboratoire.`,
      `The union is a three-piece joint (two tails and a rotating nut) fitted after valve V3, at the start of the delivery pipe; it ends in a compression fitting that holds the 25 mm PE pipe. Tight, it is leak-proof at ${en(DERIVED.deliveryBar, 1)} bar of water column; loosened, it separates the ram from the pipe without having to turn either. Behind it, the 300 m pipe holds ${en(DERIVED.pipeLitres)} L at ${en(DERIVED.deliveryBar, 1)} bar at the foot of the slope: loosening it carelessly empties the pipe in a violent jet, and it then takes about three hours of delivery to fill it again. It is not shown in the video: it is a usual part, chosen by the lab.`,
    ),
    material: l('Laiton, joint plat ou torique (estimation)', 'Brass, flat or O-ring seal (estimate)'),
    specs: [
      sp('Taille', 'Size', l('DN15 (½″), comme la conduite de refoulement', 'DN15 (½″), like the delivery pipe')),
      sp('Longueur (3D)', 'Length (3D)', lenMm('estimate', FITTINGS.unionLength)),
      sp(
        'Écrou (3D)',
        'Nut (3D)',
        tagged(
          'estimate',
          `${mm(FITTINGS.unionNutAcrossFlats).fr} mm sur plats × ${mm(FITTINGS.unionNutLength).fr} mm`,
          `${mm(FITTINGS.unionNutAcrossFlats).en} mm across flats × ${mm(FITTINGS.unionNutLength).en} mm`,
        ),
      ),
      sp('Position', 'Position', l('Après la vanne V3, départ de la conduite', 'After valve V3, start of the pipe')),
      sp(
        'Côté tuyau',
        'Pipe side',
        tagged(
          'estimate',
          `raccord à compression pour PE Ø ${mm(SITE_DIMS.deliveryOuterDiameter).fr} mm`,
          `compression fitting for PE Ø ${mm(SITE_DIMS.deliveryOuterDiameter).en} mm`,
        ),
      ),
      sp(
        'Pression à tenir',
        'Pressure to hold',
        tagged('derived', `${fr(DERIVED.deliveryBar, 1)} bar en statique`, `${en(DERIVED.deliveryBar, 1)} bar static`),
      ),
      sp(
        'Eau dans la conduite derrière elle',
        'Water in the pipe behind it',
        tagged('derived', `≈ ${fr(DERIVED.pipeLitres)} L (300 m)`, `≈ ${en(DERIVED.pipeLitres)} L (300 m)`),
      ),
    ],
    maintenance: l(
      '**Panne à prévoir.** Le joint de l’union suinte, souvent parce que la conduite tire dessus ou que le bélier a bougé ; à 6,4 bar, un suintement devient vite une fuite. **À vérifier.** Enroulez un papier absorbant autour de l’écrou et revenez le lendemain : il doit être sec ; regardez aussi si la conduite arrive dans l’axe du raccord, sans le tirer de côté. **Entretien.** Changez la rondelle d’étanchéité à chaque démontage ; arrêtez le bélier avant de desserrer l’écrou, et desserrez-le très lentement, un chiffon autour : la conduite se vide par là.',
      '**Typical failure.** The union seal weeps, often because the pipe pulls on it or the ram has moved; at 6.4 bar a weep soon becomes a leak. **How to check.** Wrap an absorbent paper around the nut and come back the next day: it must be dry; also see whether the pipe arrives in line with the joint, without pulling it sideways. **Upkeep.** Replace the sealing washer every time you take it apart; stop the ram before loosening the nut, and loosen it very slowly, with a cloth around it: the pipe empties through it.',
    ),
    tip: l(
      'Soutenez la conduite juste après l’union : un tuyau qui pend tire sur le raccord à chaque coup et finit par le faire fuir.',
      'Support the pipe just after the union: a pipe that hangs pulls on the joint at every stroke and ends up making it leak.',
    ),
    design: l(
      'Une union se défait sans tourner les deux tuyaux qu’elle relie : c’est ce qui permet de déposer un bélier fixé à son massif sans casser la conduite de refoulement.',
      'A union comes apart without turning the two pipes it joins: it is what lets you lift off a ram bolted to its block without breaking the delivery pipe.',
    ),
  },
  {
    id: 'outlet-valve',
    scene: 'ram',
    category: 'hydraulic',
    name: l('Vanne de sortie (V3)', 'Outlet valve (V3)'),
    short: l(
      'Vanne qui isole la conduite de refoulement du bélier.',
      'Valve that isolates the delivery pipe from the ram.',
    ),
    description: l(
      `La vanne de sortie ferme la conduite de refoulement, qui reste pleine de sa colonne d’eau (65 m, soit environ ${fr(DERIVED.deliveryBar, 1)} bar) pendant qu’on intervient sur le bélier : elle retient les ${fr(DERIVED.pipeLitres)} L de la conduite de 300 m, soit environ trois heures de refoulement du clapet n°1. On la ferme après avoir arrêté le bélier avec la vanne d’arrivée. Elle n’est pas montrée dans la vidéo : c’est une pièce courante d’un bélier.`,
      `The outlet valve closes the delivery pipe, which stays full of its water column (65 m, about ${en(DERIVED.deliveryBar, 1)} bar) while you work on the ram: it holds the ${en(DERIVED.pipeLitres)} L of the 300 m pipe, about three hours of delivery of the n°1 valve. It is closed after stopping the ram with the inlet valve. It is not shown in the video: it is a usual part of a ram.`,
    ),
    material: l('Laiton, à boisseau sphérique (estimation)', 'Brass, ball valve (estimate)'),
    specs: [
      sp('Taille', 'Size', l('DN15 (½″), comme la conduite de refoulement', 'DN15 (½″), like the delivery pipe')),
      sp('Longueur (3D)', 'Length (3D)', lenMm('estimate', FITTINGS.smallBallValveLength)),
      sp(
        'Pression à tenir',
        'Pressure to hold',
        tagged('derived', `${fr(DERIVED.deliveryBar, 1)} bar en statique`, `${en(DERIVED.deliveryBar, 1)} bar static`),
      ),
      sp('Tenue en pression', 'Pressure rating', l('Nettement au-dessus de 7,2 bar', 'Clearly above 7.2 bar')),
      sp(
        'Eau retenue dans la conduite',
        'Water kept in the pipe',
        tagged('derived', `≈ ${fr(DERIVED.pipeLitres)} L`, `≈ ${en(DERIVED.pipeLitres)} L`),
      ),
      sp(
        'Temps pour remplir la conduite',
        'Time to fill the pipe',
        tagged(
          'derived',
          `≈ ${fr(DERIVED.pipeRefillHours)} h à 500 L/jour`,
          `≈ ${en(DERIVED.pipeRefillHours)} h at 500 L/day`,
        ),
      ),
    ],
    maintenance: l(
      '**Panne à prévoir.** Coincée à moitié fermée, ou fermée par erreur après une intervention : le bélier frappe sans rien refouler, le manomètre monte au-delà de ses 6,5 bar habituels et plus rien n’arrive au château d’eau ; une vanne qui fuit par le boisseau laisse la conduite se vider doucement. **À vérifier.** Regardez la poignée : dans l’axe de la conduite, la vanne est ouverte ; regardez aussi le manomètre et l’arrivée au château d’eau : un manomètre haut et rien au château d’eau signalent V3 fermée ou conduite bouchée. **Entretien.** Manœuvrez-la en entier une fois par an pour qu’elle ne se grippe pas et resserrez le presse-étoupe si elle suinte.',
      '**Typical failure.** Stuck half closed, or closed by mistake after a job: the ram strikes and delivers nothing, the gauge climbs above its usual 6.5 bar and nothing reaches the water tower; a valve that leaks past the ball lets the pipe empty slowly. **How to check.** Look at the handle: in line with the pipe, the valve is open; also look at the gauge and at the arrival at the tower: a high gauge and nothing at the tower signal V3 shut or pipe blocked. **Upkeep.** Operate it through its full travel once a year so that it does not seize, and retighten the gland if it weeps.',
    ),
    tip: l(
      'Ne la laissez pas fermée quand le bélier tourne : il continuerait à frapper sans rien refouler, comme dans le scénario « Refoulement trop haut ».',
      'Do not leave it shut while the ram runs: it would keep striking and deliver nothing, as in the “Delivery head too high” scenario.',
    ),
    design: l(
      'Une vanne dédiée évite de vider 300 m de conduite chaque fois qu’on ouvre le bélier : la remplir coûte une soixantaine de litres, soit trois heures de travail du bélier.',
      'A dedicated valve avoids emptying 300 m of pipe every time the ram is opened: filling it again costs some sixty litres, three hours of the ram’s work.',
    ),
  },
  {
    id: 'drain-valve',
    scene: 'ram',
    category: 'hydraulic',
    name: l('Vanne de vidange (V2)', 'Drain valve (V2)'),
    short: l(
      'Vanne qui purge le corps pour faire retomber sa pression avant toute intervention.',
      'Valve that purges the body to let its pressure fall before any work.',
    ),
    description: l(
      `La vanne de vidange, montée en bout de corps, sert à le purger : ouverte (V1 fermée), elle laisse sortir l’eau qui y reste, donc retomber la pression du corps avant d’ouvrir le clapet de choc ou les brides. La cloche, elle, garde ses ${fr(DERIVED.deliveryBar, 1)} bar derrière le clapet de refoulement, avec la colonne de la conduite : V2 ne la purge pas. Elle permet aussi de rincer le sable qui se dépose dans le corps. Elle n’est pas montrée dans la vidéo : c’est une pièce courante d’un bélier.`,
      `The drain valve, fitted at the end of the body, is used to purge it: opened (V1 closed), it lets out the water that remains, so the body pressure falls before the waste valve or the flanges are opened. The chamber keeps its ${en(DERIVED.deliveryBar, 1)} bar behind the delivery check valve, with the pipe’s column: V2 does not purge it. It also lets you flush out the sand that settles in the body. It is not shown in the video: it is a usual part of a ram.`,
    ),
    material: l('Laiton, à boisseau sphérique (estimation)', 'Brass, ball valve (estimate)'),
    specs: [
      sp('Taille', 'Size', l('DN15 (½″)', 'DN15 (½″)')),
      sp('Longueur (3D)', 'Length (3D)', lenMm('estimate', FITTINGS.smallBallValveLength)),
      sp(
        'Pression du corps à purger (V1 ouverte)',
        'Body pressure to purge (V1 open)',
        tagged('derived', `${fr(DERIVED.inletBar, 2)} bar`, `${en(DERIVED.inletBar, 2)} bar`),
      ),
      sp(
        'Pression qui reste dans la cloche',
        'Pressure left in the chamber',
        tagged('derived', `≈ ${fr(DERIVED.deliveryBar, 1)} bar`, `≈ ${en(DERIVED.deliveryBar, 1)} bar`),
      ),
      sp('Position', 'Position', l('Sur le couvercle d’extrémité du corps', 'On the end cover of the body')),
    ],
    maintenance: l(
      '**Panne à prévoir.** Une vanne qui ne ferme plus tout à fait (un grain sous la bille) fait perdre de l’eau en permanence ; ouverte par mégarde, elle fait chuter la pression du corps, donc le rythme et le refoulement. **À vérifier.** En marche, la sortie doit rester sèche : un papier absorbant posé dessous le montre ; un jet ou un suintement révèle une vanne entrouverte ou usée. **Entretien.** Vissez un bouchon sur la sortie en service pour couvrir le cas d’une fuite, et manœuvrez la vanne une fois par an.',
      '**Typical failure.** A valve that no longer closes quite fully (a grain under the ball) loses water all the time; opened by mistake, it makes the body pressure collapse, and the rhythm and the delivery with it. **How to check.** While running, the outlet must stay dry: an absorbent paper placed under it shows it; a jet or a weep reveals a valve left ajar or worn. **Upkeep.** Screw a plug on the outlet in service to cover the case of a leak, and operate the valve once a year.',
    ),
    tip: l(
      'Ouvrez-la lentement et orientez le jet vers le drain du regard : le corps peut encore être sous pression.',
      'Open it slowly and aim the jet at the pit drain: the body can still be under pressure.',
    ),
    design: l(
      'Sans purge, un bélier ne se démonte pas en sécurité : une vanne en bout de corps vide le corps par son point bas, sans rien démonter.',
      'Without a purge, a ram cannot be taken apart safely: a valve at the end of the body empties it from its low point, without removing anything.',
    ),
  },
  {
    id: 'foundation',
    scene: 'ram',
    category: 'structure',
    name: l('Massif d’ancrage', 'Anchor block'),
    short: l(
      'Bloc de béton scellé sous les pieds du bélier : il l’empêche de marcher sous les coups.',
      'Concrete block under the ram’s feet: it stops the ram from walking under the strokes.',
    ),
    description: l(
      `Le massif d’ancrage est le bloc de béton, coulé dans la fosse, sur lequel le bélier est boulonné par ses deux pieds. Il est là parce qu’un bélier est une machine qui frappe : à chaque coup, la colonne d’eau stoppée pousse sur le corps (environ ${fr(DERIVED.thrustKn, 2)} kN sur l’axe de la conduite à ${fr(MODEL.peakBar, 1)} bar, dérivé) et l’ensemble reçoit ${fr(MODEL.strokesPerMin)} chocs par minute dans le modèle, ${fr(DERIVED.strokesPerDay)} par jour. Mal fixé, le bélier marche, tire sur la conduite, desserre ses raccords et finit par rompre un joint ou un tuyau. La vidéo ne montre pas le massif de son bélier : le laboratoire en dessine un à titre d’illustration, sans valeur de dimensionnement, car la bonne taille dépend du sol, de la conduite et de l’installation.`,
      `The anchor block is the concrete pad, poured in the pit, on which the ram is bolted by its two feet. It is there because a ram is a machine that strikes: at every stroke the stopped water column pushes on the body (about ${en(DERIVED.thrustKn, 2)} kN along the pipe axis at ${en(MODEL.peakBar, 1)} bar, derived) and the assembly takes ${en(MODEL.strokesPerMin)} shocks a minute in the model, ${en(DERIVED.strokesPerDay)} a day. Badly fixed, the ram walks, pulls on the pipe, loosens its joints and ends up breaking a gasket or a pipe. The video does not show its ram’s block: the lab draws one as an illustration, with no design value, because the right size depends on the soil, the pipe and the installation.`,
    ),
    material: l(
      'Béton coulé, tiges d’ancrage scellées (estimation)',
      'Poured concrete, cast-in anchor studs (estimate)',
    ),
    specs: [
      sp(
        'Plot (3D)',
        'Pad (3D)',
        tagged(
          'estimate',
          `${mmBox(FOUNDATION.length, FOUNDATION.width, FOUNDATION.thickness).fr} mm`,
          `${mmBox(FOUNDATION.length, FOUNDATION.width, FOUNDATION.thickness).en} mm`,
        ),
      ),
      sp(
        'Tiges d’ancrage',
        'Anchor studs',
        tagged(
          'estimate',
          `4 × M10, hauteur ${mm(FOUNDATION.studHeight).fr} mm, scellées sur ${mm(FOUNDATION.studEmbed).fr} mm`,
          `4 × M10, height ${mm(FOUNDATION.studHeight).en} mm, embedded ${mm(FOUNDATION.studEmbed).en} mm`,
        ),
      ),
      sp(
        'Pieds du bélier',
        'Ram feet',
        tagged(
          'estimate',
          `${mm(RAM.footWidth).fr} mm de large, entraxe ${mm(RAM.footSpacing).fr} mm`,
          `${mm(RAM.footWidth).en} mm wide, ${mm(RAM.footSpacing).en} mm apart`,
        ),
      ),
      sp(
        'Poussée axiale à chaque coup',
        'Axial push at each stroke',
        tagged(
          'derived',
          `≈ ${fr(DERIVED.thrustKn, 2)} kN à ${fr(MODEL.peakBar, 1)} bar`,
          `≈ ${en(DERIVED.thrustKn, 2)} kN at ${en(MODEL.peakBar, 1)} bar`,
        ),
      ),
      sp(
        'Chocs par minute',
        'Shocks per minute',
        tagged(
          'model',
          `${fr(MODEL.strokesPerMin)} (100 à 110 dans la vidéo)`,
          `${en(MODEL.strokesPerMin)} (100–110 in the video)`,
        ),
      ),
      sp(
        'Chocs par jour',
        'Shocks per day',
        tagged('derived', `≈ ${fr(DERIVED.strokesPerDay)}`, `≈ ${en(DERIVED.strokesPerDay)}`),
      ),
    ],
    maintenance: l(
      '**Panne à prévoir.** Le bélier se met à marcher : écrous desserrés, béton fissuré, sol lavé sous le plot par l’eau de rejet ; les brides suintent et la conduite tremble. **À vérifier.** Dressez une pièce de monnaie sur sa tranche, sur le dessus du corps (elle ne doit pas avancer) et tracez un trait de crayon entre le pied et le plot pour voir s’il se décale d’une visite à l’autre. **Entretien.** Gardez la fosse drainée (l’eau rejetée doit partir par l’évacuation), resserrez les écrous des tiges d’ancrage et rebouchez toute fissure.',
      '**Typical failure.** The ram starts to walk: loose nuts, cracked concrete, soil washed out under the pad by the waste water; the flanges weep and the pipe trembles. **How to check.** Stand a coin on edge on the body (it must not travel) and draw a pencil line between the foot and the pad to see whether it shifts from one visit to the next. **Upkeep.** Keep the pit drained (the waste water must leave through the drain), retighten the nuts of the anchor studs and fill any crack.',
    ),
    tip: l(
      'Ne laissez pas le tuyau rigide porter le bélier, ni le bélier tirer sur le tuyau : chacun est fixé séparément, et le massif prend les chocs.',
      'Do not let the rigid pipe carry the ram, nor the ram pull on the pipe: each is fixed separately, and the block takes the shocks.',
    ),
    design: l(
      'Un massif lourd absorbe par inertie les chocs que la conduite lui transmet, et ses tiges scellées empêchent le bélier de tirer sur les raccords.',
      'A heavy block absorbs by inertia the shocks the pipe passes to it, and its cast-in studs keep the ram from pulling on the joints.',
    ),
  },
];
