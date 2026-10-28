// Parts of the `valve` world: the video's waste valve at workshop scale, 14 ids frozen in src/part-ids.ts, listed in the
// catalogue order of that file, which is also the physical order of the build and of the 3D explode (plate, socket,
// reducer, nipple, sleeve, seat, head, stem, sleeves, guide, fins, weight, stroke nut, lock nut). Status words: see
// ../part-helpers.ts. The `maintenance` convention is three paragraphs separated by a blank line (`\n\n`):
// « **Panne à prévoir.** … / **À vérifier.** … / **Entretien.** … » and « **Typical failure.** … / **How to check.** … /
// **Maintenance.** … ».
//
// What the video says (the main video, L'énergie partout) and what the lab adds are kept apart in the texts: the video
// gives the fitting sizes (15×21, 20×27, 26×34), the 7–8 cm nipple, the 6 mm rod, the sleeves fitted to 0.1 mm, the
// rebar of 30–32 mm, the rates (70–80 then 100–110 strokes/min) and its own failures; every length not in that list is
// an estimate of src/three/dims.ts, the stroke and the weight are calibrated by the model.
//
// STACK ON THE STEM, from the top of the guide upwards (decision of the lead, facts finding F12): STROKE NUT (rests on
// the guide's top; its position on the stem sets the stroke), then WEIGHT (rests on the nut), then LOCK NUT on top.
// In the video's final valve the machined weight is itself the main nut and there is no separate stroke nut: the lab
// keeps the two roles as two parts so that each can be seen.
//
// TAGS: « dérivé / derived » only for a value computed from reported figures (here: from a fitting's designation);
// a value computed from the 3D estimates or from the calibrated 360 g is « estimation / estimate »; a value that
// comes out of the engine (peak pressure, strokes per day) is « résultat du modèle / model result ».
import type { PartInfo } from '@onigam/lab-kit/content';
import { l } from '@onigam/lab-kit/i18n';
import { G, VALVES } from '../../sim/physics';
import { RANGES } from '../../sim/presets';
import { VALVE } from '../../three/dims';
import { mm, mmBox, nEn, nFr } from '../units';
import { STROKE, WEIGHT, lenMm, sp, tagged } from '../part-helpers';
import { DERIVED, MODEL } from './ram';

const HALF_ANGLE = (VALVE.headConeHalfAngleDeg * Math.PI) / 180;
/** Radial overlap of the head cone and the seat: half the difference of the head diameter and the seat bore, m. */
const RADIAL_BAND = (VALVE.headDiameter - VALVE.seatBore[1]) / 2;
const SLEEVE_SPAN = VALVE.stemSleeveSpacing + VALVE.stemSleeveLength;
/** Distance from the lower stem sleeve to the top of the head cone, closed pose, m. */
const HEAD_LEVER = VALVE.stemSleeveBottom - (VALVE.headClosedY + (VALVE.headDiameter - VALVE.rodDiameter) / 2);
const FIT_GAP = VALVE.guideTubeInnerDiameter - VALVE.stemSleeveDiameter;

/**
 * Numbers computed once from dims.ts and the model. Most of them are « estimation » or « résultat du modèle » in the
 * texts (they rest on estimated dimensions, the calibrated weight or the engine), see the TAGS note above. Checked by
 * parts-ram.test.ts.
 */
export const VALVE_DERIVED = {
  /** Width of the conical contact band along the cone, m: radial overlap / sin(half angle). */
  contactBand: RADIAL_BAND / Math.sin(HALF_ANGLE),
  /** Radial overlap of the head and the seat, m. */
  radialBand: RADIAL_BAND,
  /** Gain of a cone over a flat annulus of the same radial width: 1 / sin(half angle). */
  coneGain: 1 / Math.sin(HALF_ANGLE),
  /** Wall of the 15×21 nipple: (thread diameter − bore) / 2, m. */
  nippleWall: (VALVE.threadDiameter - VALVE.seatBore[1]) / 2,
  /** Share of the nipple circumference taken by the ports. */
  portShare: (VALVE.portCount * VALVE.portWidth) / (Math.PI * VALVE.threadDiameter),
  /** Total port area divided by the seat section. */
  portsRatio: DERIVED.portsMm2 / DERIVED.seatAreaMm2,
  /** Pull of the closed valve on the base plate: peak pressure × section of the 26 mm bore, kN. */
  plateThrustKn: (MODEL.peakBar * 1e5 * (Math.PI / 4) * VALVE.basePlateBore ** 2) / 1000,
  /** Weight of the moving parts, N. */
  weightN: DERIVED.movingMassKg * G,
  /** Diametral clearance of the sleeves in the guide, m. */
  fitGap: FIT_GAP,
  /** Largest sideways shift of the head allowed by that clearance, m: c/2 + (c / span) × lever. */
  headShift: FIT_GAP / 2 + (FIT_GAP / SLEEVE_SPAN) * HEAD_LEVER,
  /** Length of the guide tube, m. */
  guideLength: VALVE.guideTop - VALVE.guideTubeBottom,
  /**
   * Turns of the stroke nut between the stroke at which the delivery stops and the one at which the valve takes the
   * whole spring: a model result that depends on the (stroke, weight) pair chosen to recalibrate on the video and on
   * the M6 pitch, which is assumed (0.35 to 1.25 turn for the pairs tried).
   */
  windowTurns: (MODEL.springLimitStroke - MODEL.noDeliveryStroke) / (VALVE.rodPitch * 1000),
} as const;

const fr = (x: number, d = 0) => nFr(x, d);
const en = (x: number, d = 0) => nEn(x, d);
/** Pitch of the M6 rod in mm (1 mm per turn). */
const PITCH_MM = VALVE.rodPitch * 1000;
/** Real flow area under a head cone of half-angle α opening by the stroke s: π × d × s × sin α, mm² (the engine uses the cylindrical curtain π × d × s). */
const CONE_AREA_MM2 = DERIVED.curtainMm2 * Math.sin(HALF_ANGLE);

export const VALVE_PARTS: PartInfo[] = [
  {
    id: 'base-plate',
    scene: 'valve',
    category: 'structure',
    name: l('Platine de base', 'Base plate'),
    short: l(
      'Plaque boulonnée sur le corps qui porte tout l’empilement du clapet de choc.',
      'Plate bolted onto the body that carries the whole stack of the waste valve.',
    ),
    description: l(
      `La platine remplace celle du clapet d’origine : découpée à la même taille et percée aux mêmes endroits, elle se boulonne sur le corps du bélier, qui reste intact. Un trou de ${mm(VALVE.basePlateBore).fr} mm la traverse, et un raccord en acier y est soudé : c’est lui qui reçoit les raccords de plomberie du corps de clapet et dont le volume accumule l’eau qui pousse sur la tête pour la fermer. À chaque coup, la pression tire sur la platine : environ ${fr(VALVE_DERIVED.plateThrustKn, 2)} kN à ${fr(MODEL.peakBar, 1)} bar quand le clapet est fermé (résultat du modèle). Dans la vidéo, le raccord soudé est un 20×27 ; l’auteur reconnaît qu’un 26×34 aurait permis de faire la base directement et d’économiser deux raccords.`,
      `The plate replaces that of the original valve: cut to the same size and drilled in the same places, it bolts onto the ram body, which stays intact. A ${mm(VALVE.basePlateBore).en} mm hole goes through it, and a steel fitting is welded onto it: it receives the plumbing fittings of the valve body, and the volume it closes collects the water that pushes on the head to shut it. At every stroke the pressure pulls on the plate: about ${en(VALVE_DERIVED.plateThrustKn, 2)} kN at ${en(MODEL.peakBar, 1)} bar when the valve is closed (model result). In the video the welded fitting is a 20×27; the author admits that a 26×34 would have let him make the base directly and save two fittings.`,
    ),
    material: l('Acier (plaque découpée, raccord soudé)', 'Steel (cut plate, welded fitting)'),
    specs: [
      sp('Trous', 'Holes', l('Mêmes positions que la platine d’origine', 'Same positions as the original plate')),
      sp(
        'Plaque (3D)',
        'Plate (3D)',
        tagged(
          'estimate',
          `${mmBox(VALVE.basePlateSide, VALVE.basePlateSide, VALVE.basePlateThickness).fr} mm`,
          `${mmBox(VALVE.basePlateSide, VALVE.basePlateSide, VALVE.basePlateThickness).en} mm`,
        ),
      ),
      sp(
        'Trous de fixation (3D)',
        'Fixing holes (3D)',
        tagged(
          'estimate',
          `4 × Ø ${mm(VALVE.basePlateHoleDiameter).fr} mm, entraxe ${mm(VALVE.basePlateHoleSpacing).fr} mm`,
          `4 × Ø ${mm(VALVE.basePlateHoleDiameter).en} mm, ${mm(VALVE.basePlateHoleSpacing).en} mm apart`,
        ),
      ),
      sp(
        'Passage central',
        'Central bore',
        tagged(
          'derived',
          `Ø ${mm(VALVE.basePlateBore).fr} mm (le « 26 » du 26×34, nominal)`,
          `Ø ${mm(VALVE.basePlateBore).en} mm (the “26” of the 26×34, nominal)`,
        ),
      ),
      sp(
        'Cordon de soudure (3D)',
        'Weld bead (3D)',
        tagged(
          'estimate',
          `rayon ${fr(VALVE.weldBeadRadius * 1000, 1)} mm`,
          `radius ${en(VALVE.weldBeadRadius * 1000, 1)} mm`,
        ),
      ),
      sp(
        'Traction sur la platine, clapet fermé',
        'Pull on the plate, valve shut',
        tagged(
          'model',
          `≈ ${fr(VALVE_DERIVED.plateThrustKn, 2)} kN à ${fr(MODEL.peakBar, 1)} bar`,
          `≈ ${en(VALVE_DERIVED.plateThrustKn, 2)} kN at ${en(MODEL.peakBar, 1)} bar`,
        ),
      ),
      sp(
        'Raccord de la vidéo',
        'Video’s fitting',
        l('20×27 (le 26×34 aurait été préférable)', '20×27 (a 26×34 would have been better)'),
      ),
    ],
    maintenance: l(
      `**Panne à prévoir.** Un suintement entre la platine et le corps (joint écrasé, platine gauchie par la chaleur de la soudure) ou, plus rare, une fissure du cordon sous les ${fr(MODEL.strokesPerMin)} coups par minute du modèle.\n\n**À vérifier.** À l’arrêt, posez une règle sur la face d’appui de la platine : aucun jour ne doit passer dessous ; en marche, un papier absorbant autour du joint doit rester sec, sans approcher les doigts des lumières.\n\n**Entretien.** Resserrez les quatre écrous en croix après la première semaine et changez le joint chaque fois que la platine est déposée.`,
      `**Typical failure.** A weep between the plate and the body (crushed gasket, plate warped by the heat of the weld) or, more rarely, a crack in the bead under the model’s ${en(MODEL.strokesPerMin)} strokes a minute.\n\n**How to check.** At standstill, lay a straightedge on the plate’s bearing face: no light must show under it; while running, a paper towel around the joint must stay dry, keeping your fingers away from the ports.\n\n**Maintenance.** Retighten the four nuts crosswise after the first week and replace the gasket every time the plate is removed.`,
    ),
    tip: l(
      'Gardez la platine d’origine comme gabarit : posez-la sur la plaque neuve, tracez le contour et les trous à travers elle, et vous retrouvez les mêmes positions que la vidéo.',
      'Keep the original plate as a template: lay it on the new plate, mark the outline and the holes through it, and you get the same positions as the video.',
    ),
    video: ['06:36', '06:48', '06:58', '07:14'],
    design: l(
      'Reprendre le gabarit de la platine d’origine permet de changer de clapet sans toucher au corps du bélier : seule la pièce qui pose problème est remplacée.',
      'Reusing the original plate’s pattern lets the valve be changed without touching the ram body: only the part that causes the trouble is replaced.',
    ),
  },
  {
    id: 'valve-socket',
    scene: 'valve',
    category: 'mechanical',
    name: l('Manchon soudé 26×34', 'Welded 26×34 socket'),
    short: l(
      'Manchon d’acier soudé sur la platine : base de l’empilement et chambre où l’eau pousse sur la tête.',
      'Steel socket welded onto the plate: the stack’s base and the chamber where the water pushes on the head.',
    ),
    description: l(
      `Le manchon est le raccord d’acier soudé au centre de la platine, taraudé 26×34 (1″, la taille du clapet n°3). Il est la base de l’empilement : la réduction se visse dedans, et son volume reçoit l’eau du corps, l’accumule et la fait pousser sur la tête pour la plaquer sur sa portée. Dans la vidéo, l’auteur soude un raccord 20×27, puis reconnaît qu’un 26×34 lui aurait permis de faire la base directement et d’économiser deux raccords : le laboratoire dessine cette version simplifiée, à un seul manchon. Le raccord est soudé plutôt que vissé, car la platine reprend la poussée de chaque coup sans jeu.`,
      `The socket is the steel fitting welded to the centre of the plate, threaded 26×34 (1″, the size of the No. 3 valve). It is the base of the stack: the reducer screws into it, and its volume receives the water from the body, accumulates it and makes it push on the head to press it onto its seat. In the video the author welds a 20×27 fitting, then admits that a 26×34 would have let him make the base directly and save two fittings: the lab draws that simplified version, with a single socket. The fitting is welded rather than screwed, because the plate takes the push of each stroke without play.`,
    ),
    material: l('Acier, raccord de plomberie soudé', 'Steel, welded plumbing fitting'),
    specs: [
      sp('Taille', 'Size', l('26×34 (1″)', '26×34 (1″)')),
      sp(
        'Alésage taraudé',
        'Threaded bore',
        tagged(
          'derived',
          `Ø ${mm(VALVE.socketBoreDiameter).fr} mm (le « 34 » du 26×34, nominal)`,
          `Ø ${mm(VALVE.socketBoreDiameter).en} mm (the “34” of the 26×34, nominal)`,
        ),
      ),
      sp(
        'Extérieur (3D)',
        'Outside (3D)',
        tagged(
          'estimate',
          `Ø ${mm(VALVE.weldedFittingDiameter).fr} × ${mm(VALVE.weldedFittingHeight).fr} mm`,
          `Ø ${mm(VALVE.weldedFittingDiameter).en} × ${mm(VALVE.weldedFittingHeight).en} mm`,
        ),
      ),
      sp(
        'Cordon de soudure (3D)',
        'Weld bead (3D)',
        tagged(
          'estimate',
          `rayon ${fr(VALVE.weldBeadRadius * 1000, 1)} mm`,
          `radius ${en(VALVE.weldBeadRadius * 1000, 1)} mm`,
        ),
      ),
      sp(
        'Fixation',
        'Fastening',
        l('Soudé sur la platine, centré sur son trou', 'Welded onto the plate, centred on its hole'),
      ),
      sp(
        'Dans la vidéo',
        'In the video',
        l('Raccord 20×27, le 26×34 aurait été préférable', '20×27 fitting, a 26×34 would have been better'),
      ),
    ],
    maintenance: l(
      '**Panne à prévoir.** Une fuite à la soudure (porosité, fissure ouverte par les coups) ou au filetage de la réduction ; un manchon soudé de travers décale tout ce qui est au-dessus.\n\n**À vérifier.** À l’arrêt, posez une équerre contre le flanc du manchon : aucun jour ne doit apparaître sur sa hauteur ; en marche, un papier absorbant enroulé autour du cordon doit rester sec.\n\n**Entretien.** À chaque démontage, nettoyez le filetage et refaites l’étanchéité au ruban PTFE ; faites reprendre une soudure fissurée sans attendre.',
      '**Typical failure.** A leak at the weld (porosity, a crack opened by the strokes) or at the reducer thread; a socket welded crooked moves everything above it.\n\n**How to check.** At standstill, hold a square against the side of the socket: no light must show along its height; while running, a paper towel wrapped around the bead must stay dry.\n\n**Maintenance.** At every disassembly, clean the thread and redo the seal with PTFE tape; have a cracked weld redone without waiting.',
    ),
    tip: l(
      'Soudez bien d’équerre : portée, guide et tige doivent partager un seul axe, sinon tout se décale (dans la vidéo, une tête soudée de travers ne fermait pas).',
      'Weld it square: seat, guide and stem must share a single axis, or everything shifts (in the video a head welded off its axis would not close).',
    ),
    video: ['06:48', '06:58', '07:29'],
    design: l(
      'Un manchon plus gros que nécessaire pour la portée sert à la fois de base et de chambre : l’eau y accumule sa poussée sous la tête, et un seul raccord soudé remplace les deux raccords que l’auteur regrette d’avoir ajoutés.',
      'A socket larger than the seat needs serves as both base and chamber: the water gathers its push there under the head, and a single welded fitting replaces the two fittings the author regrets having added.',
    ),
  },
  {
    id: 'valve-reducer',
    scene: 'valve',
    category: 'mechanical',
    name: l('Réduction 26×34 → 15×21', 'Reducer 26×34 → 15×21'),
    short: l(
      'Réduction du commerce qui resserre la pile de 26×34 à 15×21 et guide l’eau vers la portée.',
      'Off-the-shelf reducer that narrows the stack from 26×34 to 15×21 and guides the water towards the seat.',
    ),
    description: l(
      `La réduction passe du 26×34 du manchon au 15×21 du corps du clapet. Son cône intérieur est un entonnoir : il resserre l’eau vers l’alésage de la portée, et le volume qu’il forme avec le manchon loge la tête et ses ailettes pendant la course. L’orifice du haut (15×21) donne la taille du clapet n°1. Dans la vidéo, le n°3 (26×34) est le clapet d’origine du Walton et le n°2 (20×27) un essai de l’auteur, plus gourmands ; le laboratoire ne dessine que le n°1. La réduction se visse dans le manchon par son extrémité mâle de 26×34, et reçoit le mamelon par son taraudage de 15×21 ; un contre-écrou bloque la hauteur du mamelon contre son sommet.`,
      `The reducer goes from the socket’s 26×34 to the valve body’s 15×21. Its inner cone is a funnel: it narrows the water towards the seat bore, and the volume it forms with the socket houses the head and its fins during the stroke. The top opening (15×21) gives the size of the No. 1 valve. In the video the No. 3 (26×34) is the Walton’s original valve and the No. 2 (20×27) a trial by the author, both thirstier; the lab draws only the No. 1. The reducer screws into the socket by its male 26×34 end, and takes the nipple by its 15×21 thread; a lock nut fixes the nipple’s height against its top.`,
    ),
    material: l(
      'Raccord de plomberie du commerce (matière non précisée)',
      'Off-the-shelf plumbing fitting (material not stated)',
    ),
    specs: [
      sp('Taille', 'Size', l('26×34 vers 15×21', '26×34 to 15×21')),
      sp(
        'Corps (3D)',
        'Body (3D)',
        tagged('estimate', `Ø ${mm(VALVE.reductionDiameter).fr} mm`, `Ø ${mm(VALVE.reductionDiameter).en} mm`),
      ),
      sp('Sommet au-dessus de la platine (3D)', 'Top above the plate (3D)', lenMm('estimate', VALVE.reductionTop)),
      sp('Début du cône (3D)', 'Start of the taper (3D)', lenMm('estimate', VALVE.reducerTaperStart)),
      sp(
        'Taraudage du haut',
        'Top thread',
        tagged(
          'estimate',
          `15×21, fond de filet Ø ${mm(VALVE.reducerBoreDiameter).fr} mm`,
          `15×21, thread core Ø ${mm(VALVE.reducerBoreDiameter).en} mm`,
        ),
      ),
      sp(
        'Pas du filetage ½″',
        'Pitch of the ½″ thread',
        tagged(
          'derived',
          `${fr(VALVE.threadPitch * 1000, 2)} mm (14 filets par pouce)`,
          `${en(VALVE.threadPitch * 1000, 2)} mm (14 threads per inch)`,
        ),
      ),
      sp(
        'Sommet, appui du contre-écrou (3D)',
        'Top, lock nut bearing (3D)',
        tagged('estimate', `Ø ${mm(VALVE.reducerTopDiameter).fr} mm`, `Ø ${mm(VALVE.reducerTopDiameter).en} mm`),
      ),
    ],
    maintenance: l(
      '**Panne à prévoir.** Le mamelon se desserre sous les coups et la pile prend du jeu ; ou une fuite apparaît au filetage du haut. Dévisser le mamelon fait perdre la portée, qui a été fraisée sur l’empilement serré.\n\n**À vérifier.** Tracez un trait de peinture en travers du contre-écrou et de la réduction : s’il se casse, le mamelon a tourné ; une traînée d’eau sous le filet signale une fuite.\n\n**Entretien.** Resserrez le contre-écrou contre la réduction à chaque visite ; après tout démontage du mamelon, contrôlez la portée avant de remettre en marche.',
      '**Typical failure.** The nipple works loose under the strokes and the stack gets play; or a leak shows at the top thread. Unscrewing the nipple loses the seat, which was milled on the tightened stack.\n\n**How to check.** Paint a line across the lock nut and the reducer: if it breaks, the nipple has turned; a wet trail under the thread signals a leak.\n\n**Maintenance.** Retighten the lock nut against the reducer on every visit; after any removal of the nipple, check the seat before restarting.',
    ),
    tip: l(
      'Serrez tous les raccords à fond avant de passer à la portée : la vidéo fraise la portée sur l’ensemble monté et serré, pour qu’elle ne bouge plus ensuite.',
      'Tighten every fitting fully before moving on to the seat: the video mills the seat on the assembled and tightened stack, so that it cannot shift afterwards.',
    ),
    video: ['03:54', '07:29', '07:45'],
    design: l(
      'Une réduction du commerce plutôt qu’une pièce tournée : son cône intérieur fait l’entonnoir sans aucun usinage, et le changement de taille de clapet se résume à celui d’un raccord.',
      'An off-the-shelf reducer rather than a turned part: its inner cone makes the funnel with no machining at all, and changing the valve size comes down to changing a fitting.',
    ),
  },
  {
    id: 'valve-nipple',
    scene: 'valve',
    category: 'hydraulic',
    name: l('Mamelon fileté à lumières', 'Ported nipple'),
    short: l(
      'Raccord 15×21 fileté sur 7 à 8 cm, percé de lumières par où l’eau sort ; son pied porte la portée.',
      '15×21 male fitting threaded over 7–8 cm, cut with ports through which the water escapes; its foot carries the seat.',
    ),
    description: l(
      `Le mamelon est un raccord mâle 15×21, fileté sur toute sa longueur (7 à 8 cm dans la vidéo, ${mm(VALVE.nippleLength).fr} mm dans le modèle, au milieu de la plage). L’auteur s’en sert pour allonger le corps du clapet et y usiner les lumières, les fentes par où l’eau sort quand le clapet est ouvert : elle passe par la portée au pied du mamelon, monte dans son alésage, puis sort sur les côtés. Un contre-écrou 15×21 règle et bloque sa hauteur dans la réduction. Les ${VALVE.portCount} lumières du modèle ont une section totale de ${fr(DERIVED.portsMm2)} mm², ${fr(VALVE_DERIVED.portsRatio, 1)} fois celle de la portée (${fr(DERIVED.seatAreaMm2)} mm², dérivé) : l’eau s’échappe sans gêne et c’est le jeu sous la tête qui règle le débit.`,
      `The nipple is a 15×21 male fitting, threaded along its whole length (7–8 cm in the video, ${mm(VALVE.nippleLength).en} mm in the model, the middle of the range). The author uses it to lengthen the valve body and to machine the ports in it, the slots through which the water leaves when the valve is open: it passes through the seat at the nipple’s foot, rises in its bore, then leaves sideways. A 15×21 lock nut sets and locks its height in the reducer. The model’s ${VALVE.portCount} ports have a total area of ${en(DERIVED.portsMm2)} mm², ${en(VALVE_DERIVED.portsRatio, 1)} times the seat’s (${en(DERIVED.seatAreaMm2)} mm², derived): the water escapes freely and it is the gap under the head that sets the flow.`,
    ),
    material: l(
      'Raccord de plomberie du commerce (matière non précisée)',
      'Off-the-shelf plumbing fitting (material not stated)',
    ),
    specs: [
      sp(
        'Taille',
        'Size',
        l('15×21 (½″), mâle, fileté sur toute la longueur', '15×21 (½″), male, threaded along its length'),
      ),
      sp(
        'Longueur',
        'Length',
        l(
          `7 à 8 cm dans la vidéo ; ${mm(VALVE.nippleLength).fr} mm dessinés (estimation)`,
          `7–8 cm in the video; ${mm(VALVE.nippleLength).en} mm drawn (estimate)`,
        ),
      ),
      sp(
        'Paroi',
        'Wall',
        tagged(
          'derived',
          `≈ ${fr(VALVE_DERIVED.nippleWall * 1000)} mm (Ø ${fr(VALVE.threadDiameter * 1000)} mm extérieur, Ø ${fr(VALVE.seatBore[1] * 1000)} mm intérieur)`,
          `≈ ${en(VALVE_DERIVED.nippleWall * 1000)} mm (Ø ${en(VALVE.threadDiameter * 1000)} mm outer, Ø ${en(VALVE.seatBore[1] * 1000)} mm inner)`,
        ),
      ),
      sp(
        'Lumières (3D)',
        'Ports (3D)',
        tagged(
          'estimate',
          `${VALVE.portCount} × ${mm(VALVE.portWidth).fr} × ${mm(VALVE.portHeight).fr} mm`,
          `${VALVE.portCount} × ${mm(VALVE.portWidth).en} × ${mm(VALVE.portHeight).en} mm`,
        ),
      ),
      sp(
        'Section des lumières',
        'Port area',
        tagged(
          'estimate',
          `${fr(DERIVED.portsMm2)} mm², soit ${fr(VALVE_DERIVED.portsRatio, 1)} fois la portée`,
          `${en(DERIVED.portsMm2)} mm², ${en(VALVE_DERIVED.portsRatio, 1)} times the seat`,
        ),
      ),
      sp(
        'Pourtour retiré par les lumières',
        'Circumference taken by the ports',
        tagged('estimate', `≈ ${fr(VALVE_DERIVED.portShare * 100)} %`, `≈ ${en(VALVE_DERIVED.portShare * 100)}%`),
      ),
      sp(
        'Pied du mamelon au-dessus de la platine (3D)',
        'Foot of the nipple above the plate (3D)',
        lenMm('estimate', VALVE.nippleBottom),
      ),
      sp(
        'Pied des lumières au-dessus de la platine (3D)',
        'Foot of the ports above the plate (3D)',
        lenMm('estimate', VALVE.portBottom),
      ),
      sp(
        'Contre-écrou du mamelon (3D)',
        'Nipple lock nut (3D)',
        tagged(
          'estimate',
          `${mm(VALVE.nippleLockNutAcrossFlats).fr} mm sur plats × ${mm(VALVE.nippleLockNutThickness).fr} mm`,
          `${mm(VALVE.nippleLockNutAcrossFlats).en} mm across flats × ${mm(VALVE.nippleLockNutThickness).en} mm`,
        ),
      ),
    ],
    maintenance: l(
      `**Panne à prévoir.** Des lumières obstruées (calcaire, feuilles) : l’eau sort mal, les jets s’affaiblissent et le clapet se comporte autrement ; ou une fissure dans une barrette entre deux lumières, là où plus d’un tiers du pourtour est retiré.\n\n**À vérifier.** À l’arrêt, passez une lampe par une lumière : on doit voir l’alésage libre jusqu’à la portée ; en marche, regardez les jets, jamais avec les doigts : un jet faible signale une lumière en partie bouchée.\n\n**Entretien.** Rincez et brossez les lumières à chaque visite, et chanfreinez les arêtes vives avant de remonter.`,
      `**Typical failure.** Clogged ports (limescale, leaves): the water leaves badly, the jets weaken and the valve behaves differently; or a crack in a bar between two ports, where more than a third of the circumference is removed.\n\n**How to check.** At standstill, shine a torch through a port: the bore must be clear down to the seat; while running, watch the jets, never with your fingers: a weak jet signals a partly blocked port.\n\n**Maintenance.** Rinse and brush the ports on every visit, and chamfer sharp edges before reassembling.`,
    ),
    tip: l(
      'Chanfreinez les arêtes des lumières : c’est l’endroit le plus mince du mamelon, et une arête vive y amorce une fissure sous les coups.',
      'Chamfer the edges of the ports: it is the thinnest part of the nipple, and a sharp edge starts a crack there under the strokes.',
    ),
    video: ['03:10', '07:48', '07:53', '08:03'],
    design: l(
      'Des lumières sur les côtés plutôt qu’une sortie unique : l’eau repart dans toutes les directions sans pousser le clapet de côté, et leur grande section laisse au jeu sous la tête le contrôle du débit.',
      'Ports on the sides rather than a single exit: the water leaves in all directions without pushing the valve sideways, and their large area leaves the gap under the head in control of the flow.',
    ),
  },
  {
    id: 'valve-sleeve',
    scene: 'valve',
    category: 'mechanical',
    name: l('Manchon femelle-femelle 15×21', '15×21 female-female sleeve'),
    short: l(
      'Manchon qui relie le haut du mamelon au guide et les aligne sur le même axe.',
      'Sleeve that joins the top of the nipple to the guide and lines them up on the same axis.',
    ),
    description: l(
      `Le manchon est un raccord à deux taraudages 15×21 : un manchon de plomberie ordinaire, que la vidéo utilise pour faire la liaison entre le haut du mamelon, mâle, et le guide, qui se visse dedans. C’est lui qui tient le guide dans l’axe de la portée : si ses filets engagent le guide de travers, la tige frotte et la tête porte de biais. Il enserre le haut du mamelon (${mm(VALVE.sleeveLength).fr} mm de long dans le modèle, à ${mm(VALVE.sleeveBottom).fr} mm au-dessus de la platine) et son bord haut reçoit la collerette du guide.`,
      `The sleeve is a fitting with two 15×21 threads: an ordinary plumbing sleeve, which the video uses to join the top of the male nipple to the guide, which screws into it. It is what holds the guide on the seat’s axis: if its threads engage the guide crooked, the stem rubs and the head seats at an angle. It encloses the top of the nipple (${mm(VALVE.sleeveLength).en} mm long in the model, ${mm(VALVE.sleeveBottom).en} mm above the plate) and its upper edge receives the guide’s collar.`,
    ),
    material: l(
      'Raccord de plomberie du commerce (matière non précisée)',
      'Off-the-shelf plumbing fitting (material not stated)',
    ),
    specs: [
      sp('Taille', 'Size', l('15×21 (½″), femelle-femelle', '15×21 (½″), female-female')),
      sp(
        'Extérieur (3D)',
        'Outside (3D)',
        tagged(
          'estimate',
          `Ø ${mm(VALVE.sleeveDiameter).fr} × ${mm(VALVE.sleeveLength).fr} mm`,
          `Ø ${mm(VALVE.sleeveDiameter).en} × ${mm(VALVE.sleeveLength).en} mm`,
        ),
      ),
      sp(
        'Pied du manchon au-dessus de la platine (3D)',
        'Foot of the sleeve above the plate (3D)',
        lenMm('estimate', VALVE.sleeveBottom),
      ),
      sp(
        'Pas du filetage ½″',
        'Pitch of the ½″ thread',
        tagged(
          'derived',
          `${fr(VALVE.threadPitch * 1000, 2)} mm (14 filets par pouce)`,
          `${en(VALVE.threadPitch * 1000, 2)} mm (14 threads per inch)`,
        ),
      ),
      sp('Rôle', 'Role', l('Aligne le guide sur le mamelon', 'Aligns the guide on the nipple')),
    ],
    maintenance: l(
      '**Panne à prévoir.** Un guide engagé de travers dans le manchon : la tige frotte, la cadence devient irrégulière ou le clapet s’arrête ; ou une fuite au filetage.\n\n**À vérifier.** À l’arrêt (V1 fermée), retirez le poids et faites tourner la tige à la main dans le guide : elle doit tourner librement sur un tour entier, sans point dur ; une traînée d’eau le long du manchon signale une fuite.\n\n**Entretien.** Nettoyez les filets et refaites l’étanchéité au ruban PTFE à chaque démontage.',
      '**Typical failure.** A guide engaged crooked in the sleeve: the stem rubs, the rate becomes irregular or the valve stops; or a leak at the thread.\n\n**How to check.** At standstill (V1 closed), remove the weight and turn the stem by hand in the guide: it must turn freely through a full turn, with no hard spot; a wet trail along the sleeve signals a leak.\n\n**Maintenance.** Clean the threads and redo the seal with PTFE tape at every disassembly.',
    ),
    tip: l(
      'Vissez le guide à la main sur plusieurs tours avant de serrer à la clé : un filet de travers se voit dès les premiers tours.',
      'Screw the guide in by hand for several turns before tightening with a spanner: a crooked thread shows from the first turns.',
    ),
    video: ['08:03', '08:09', '08:13'],
    design: l(
      'Un simple manchon femelle-femelle suffit à relier deux pièces mâles sur le même axe : l’alignement du guide sur la portée, essentiel à une fermeture sur tout le tour, vient d’un filetage du commerce et non d’un usinage.',
      'A plain female-female sleeve is enough to join two male parts on the same axis: the alignment of the guide on the seat, essential for the valve to close all the way round, comes from an off-the-shelf thread and not from machining.',
    ),
  },
  {
    id: 'valve-seat',
    scene: 'valve',
    category: 'mechanical',
    name: l('Portée conique', 'Conical seat'),
    short: l(
      'Cône fraisé au même angle que la tête du clapet : c’est lui qui fait l’étanchéité.',
      'Cone milled to the same angle as the valve head: it is what makes the seal.',
    ),
    description: l(
      `La portée est la surface conique sur laquelle la tête vient s’appuyer quand le clapet se ferme. À ${VALVE.headConeHalfAngleDeg}° de demi-angle (estimation), la bande de contact est ${fr(VALVE_DERIVED.coneGain, 1)} fois plus large qu’un anneau plat de même largeur radiale, ce qu’un clapet plat avec un joint n’a pas donné dans la vidéo (joint mort en 24 h) ; le cône recentre aussi la tête à chaque fermeture. Son diamètre (15 mm nominal pour le clapet n°1) fixe la taille du clapet.\n\nL’auteur l’a fraisée sur l’assemblage monté et serré, au même angle que la vis qui forme la tête, car les cônes des raccords du commerce sont trop peu marqués. Sous la tête ouverte, le modèle compte un rideau cylindrique équivalent de π × 15 mm × ${fr(STROKE, 1)} mm = ${fr(DERIVED.curtainMm2)} mm², le vrai robinet de la consommation (≈ ${fr(CONE_AREA_MM2)} mm² sous un cône à ${VALVE.headConeHalfAngleDeg}° : l’écart est absorbé par le coefficient de débit calibré).`,
      `The seat is the conical surface on which the head rests when the valve closes. At a ${VALVE.headConeHalfAngleDeg}° half-angle (estimate), the contact band is ${en(VALVE_DERIVED.coneGain, 1)} times wider than a flat ring of the same radial width, something the video’s flat valve with a seal could not achieve (seal failed in 24 h); the cone also re-centres the head at every closure. Its diameter (15 mm nominal for valve No. 1) sets the valve size.\n\nThe author milled it on the assembled and tightened stack, at the same angle as the screw that forms the head, because the inner cones of commercial fittings are too shallow. Under the open head the model counts an equivalent cylindrical curtain of π × 15 mm × ${en(STROKE, 1)} mm = ${en(DERIVED.curtainMm2)} mm², which is what really controls the consumption (≈ ${en(CONE_AREA_MM2)} mm² under a ${VALVE.headConeHalfAngleDeg}° cone: the gap is absorbed by the calibrated discharge coefficient).`,
    ),
    material: l('Métal du raccord de plomberie, fraisé', 'Metal of the plumbing fitting, milled'),
    specs: [
      sp(
        'Alésage de la portée',
        'Seat bore',
        l(
          `n°1 : ${fr(VALVE.seatBore[1] * 1000)} mm · n°2 : ${fr(VALVE.seatBore[2] * 1000)} mm · n°3 : ${fr(VALVE.seatBore[3] * 1000)} mm (nominal)`,
          `No. 1: ${en(VALVE.seatBore[1] * 1000)} mm · No. 2: ${en(VALVE.seatBore[2] * 1000)} mm · No. 3: ${en(VALVE.seatBore[3] * 1000)} mm (nominal)`,
        ),
      ),
      sp(
        'Demi-angle du cône',
        'Cone half-angle',
        tagged(
          'estimate',
          `${VALVE.headConeHalfAngleDeg}°, angle non donné par la vidéo`,
          `${VALVE.headConeHalfAngleDeg}°, angle not given in the video`,
        ),
      ),
      sp(
        'Bande de contact',
        'Contact band',
        tagged(
          'estimate',
          `≈ ${fr(VALVE_DERIVED.contactBand * 1000, 1)} mm le long du cône`,
          `≈ ${en(VALVE_DERIVED.contactBand * 1000, 1)} mm along the cone`,
        ),
      ),
      sp(
        'Gain du cône sur un anneau plat',
        'Cone gain over a flat ring',
        tagged(
          'estimate',
          `× ${fr(VALVE_DERIVED.coneGain, 1)} (1 / sin ${VALVE.headConeHalfAngleDeg}°)`,
          `× ${en(VALVE_DERIVED.coneGain, 1)} (1 / sin ${VALVE.headConeHalfAngleDeg}°)`,
        ),
      ),
      sp(
        'Section de la portée (clapet n°1)',
        'Seat section (valve No. 1)',
        tagged('derived', `${fr(DERIVED.seatAreaMm2)} mm²`, `${en(DERIVED.seatAreaMm2)} mm²`),
      ),
      sp(
        'Section de passage sous la tête',
        'Flow area under the head',
        tagged(
          'model',
          `${fr(DERIVED.curtainMm2)} mm² à ${fr(STROKE, 1)} mm de course (rideau cylindrique équivalent)`,
          `${en(DERIVED.curtainMm2)} mm² at ${en(STROKE, 1)} mm of stroke (equivalent cylindrical curtain)`,
        ),
      ),
      sp(
        'Vitesse d’impact de la tête',
        'Head impact speed',
        tagged('model', `${fr(MODEL.valveImpactSpeed, 2)} m/s`, `${en(MODEL.valveImpactSpeed, 2)} m/s`),
      ),
      sp(
        'Fermetures par jour',
        'Closings per day',
        tagged('model', `≈ ${fr(DERIVED.strokesPerDay)}`, `≈ ${en(DERIVED.strokesPerDay)}`),
      ),
      sp('Épaisseur de l’anneau de portée (3D)', 'Seat ring thickness (3D)', lenMm('estimate', VALVE.seatThickness)),
      sp('Usinage', 'Machining', l('Fraise à métaux, perceuse à colonne', 'Metal-cutting cutter, drill press')),
    ],
    maintenance: l(
      `**Panne à prévoir.** La portée travaille ${fr(DERIVED.strokesPerDay)} fois par jour dans le modèle : un gravillon la raye, la tête se pose de biais, et un suintement apparaît puis grossit ; celle de la vidéo suinte déjà un peu.\n\n**À vérifier.** À l’arrêt (V1 fermée), retirez la tige et regardez la portée : l’empreinte brillante doit former un anneau complet de largeur régulière ; sinon, noircissez le cône de la tête au marqueur, enfoncez-la sur la portée et tournez : le trait doit s’effacer sur tout le tour.\n\n**Entretien.** Reprenez la portée à la fraise si l’empreinte est irrégulière, une fois toute la pile serrée ; changez la tête plutôt que de forcer.`,
      `**Typical failure.** The seat works ${en(DERIVED.strokesPerDay)} times a day in the model: grit scratches it, the head sits at an angle, and a weep appears then grows; the video’s seat already weeps a little.\n\n**How to check.** At standstill (V1 closed), remove the stem and look at the seat: the bright mark must form a complete ring of even width; otherwise, blacken the head cone with a marker, push it onto the seat and turn it: the mark must wear off all the way round.\n\n**Maintenance.** Re-cut the seat with the cutter if the mark is uneven, once the whole stack is tightened; replace the head rather than forcing.`,
    ),
    tip: l(
      'Fraisez une fois l’ensemble serré, pas avant : la vidéo travaille sur le montage final pour que la portée ne bouge plus ensuite.',
      'Mill once the assembly is tightened, not before: the video works on the final assembly so that the seat cannot shift afterwards.',
    ),
    video: ['05:52', '06:04', '09:39', '11:12', '18:32', '18:54'],
    design: l(
      'Fraisée à l’angle de la tête, elle donne un contact sur tout le tour, durable sans joint, et le cône recentre la tête à chaque fermeture. C’est l’enseignement central de la vidéo : un clapet plat, même avec un bon joint, n’a pas tenu.',
      'Milled to the angle of the head, it gives contact all the way round, durable without a seal, and the cone re-centres the head at every closure. That is the video’s central lesson: a flat valve, even with a good seal, did not last.',
    ),
  },
  {
    id: 'valve-head',
    scene: 'valve',
    category: 'mechanical',
    name: l('Tête du clapet', 'Valve head'),
    short: l(
      'Vis inox à tête fraisée, raccourcie : son cône vient se loger dans la portée et ferme le clapet.',
      'Stainless countersunk screw, cut short: its cone sits in the seat and shuts the valve.',
    ),
    description: l(
      `La tête est la pièce qui ferme : une vis inox à tête fraisée, raccourcie pour ne garder que la tête (« la partie clapet »), puis percée dans son axe pour laisser passer la tige de 6 mm. Son cône, tourné vers le haut, vient se loger dans la portée au même angle ; sa face plate, dessous, appuie sur l’écrou qui la serre sur la tige. Fermé, le clapet est plaqué par la pression du corps : environ ${fr(DERIVED.holdForceN)} N à ${fr(MODEL.peakBar, 1)} bar (résultat du modèle) sur la section de la portée, contre ${fr(VALVE_DERIVED.weightN)} N de poids (estimation). Tout le difficile est de la faire droite : la partie filetée d’une vis n’est presque jamais dans l’axe de sa tête, et les premières têtes, coupées de travers, laissaient fuir même serrées.`,
      `The head is the part that closes: a stainless countersunk screw, cut short to keep only the head (“the valve part”), then drilled on its axis to let the 6 mm stem through. Its cone, pointing up, seats in the seat at the same angle; its flat face, underneath, bears on the nut that clamps it to the stem. Shut, the valve is pressed on by the body pressure: about ${en(DERIVED.holdForceN)} N at ${en(MODEL.peakBar, 1)} bar (model result) over the seat section, against ${en(VALVE_DERIVED.weightN)} N of weight (estimate). The whole difficulty is making it true: the threaded part of a screw is almost never on the axis of its head, and the first heads, cut crooked, still leaked even when tightened.`,
    ),
    material: l('Acier inoxydable (vis raccourcie)', 'Stainless steel (shortened screw)'),
    specs: [
      sp('Origine', 'Origin', l('Vis inox à tête fraisée, raccourcie', 'Stainless countersunk screw, cut short')),
      sp('Perçage dans l’axe', 'Axial hole', l('3 mm puis 6 mm (tige de 6 mm)', '3 mm then 6 mm (6 mm stem)')),
      sp(
        'Tête (3D)',
        'Head (3D)',
        tagged(
          'estimate',
          `Ø ${mm(VALVE.headDiameter).fr} mm, cône ${VALVE.headConeHalfAngleDeg}° de demi-angle`,
          `Ø ${mm(VALVE.headDiameter).en} mm, cone of ${VALVE.headConeHalfAngleDeg}° half-angle`,
        ),
      ),
      sp(
        'Hauteur du cône',
        'Cone height',
        tagged('estimate', `${mm(VALVE.headHeight).fr} mm`, `${mm(VALVE.headHeight).en} mm`),
      ),
      sp(
        'Recouvrement radial avec la portée',
        'Radial overlap with the seat',
        tagged(
          'estimate',
          `${fr(VALVE_DERIVED.radialBand * 1000, 1)} mm`,
          `${en(VALVE_DERIVED.radialBand * 1000, 1)} mm`,
        ),
      ),
      sp(
        'Face plate, clapet fermé',
        'Flat face, valve shut',
        tagged(
          'estimate',
          `à ${mm(VALVE.headClosedY).fr} mm au-dessus de la platine`,
          `${mm(VALVE.headClosedY).en} mm above the plate`,
        ),
      ),
      sp(
        'Force qui la plaque, clapet fermé',
        'Force pressing it, valve shut',
        tagged(
          'model',
          `≈ ${fr(DERIVED.holdForceN)} N à ${fr(MODEL.peakBar, 1)} bar`,
          `≈ ${en(DERIVED.holdForceN)} N at ${en(MODEL.peakBar, 1)} bar`,
        ),
      ),
      sp(
        'Poids opposé',
        'Opposing weight',
        tagged('estimate', `≈ ${fr(VALVE_DERIVED.weightN)} N`, `≈ ${en(VALVE_DERIVED.weightN)} N`),
      ),
      sp(
        'Vitesse d’impact',
        'Impact speed',
        tagged('model', `${fr(MODEL.valveImpactSpeed, 2)} m/s`, `${en(MODEL.valveImpactSpeed, 2)} m/s`),
      ),
    ],
    maintenance: l(
      '**Panne à prévoir.** Une tête qui ne porte pas, coupée de travers, mal serrée sur la tige ou marquée par un gravillon : l’eau passe même clapet fermé, la cadence et le refoulement baissent.\n\n**À vérifier.** À l’arrêt, roulez la tige sur une vitre : la tête ne doit pas osciller ; faites le test du marqueur sur le cône (le trait doit s’effacer sur tout le tour au contact de la portée) et regardez l’empreinte ; serrez l’écrou de la tête à la main : aucun jeu.\n\n**Entretien.** Changez la vis plutôt que de la reprendre à la lime ; elle ne coûte presque rien, et c’est la portée qu’il faut préserver.',
      '**Typical failure.** A head that does not seat, cut crooked, loose on the stem or marked by grit: water passes even with the valve shut, the rate and the delivery fall.\n\n**How to check.** At standstill, roll the stem on a pane of glass: the head must not wobble; do the marker test on the cone (the mark must wear off all the way round on contact with the seat) and look at the mark; try the head’s nut by hand: no play.\n\n**Maintenance.** Replace the screw rather than dressing it with a file; it costs almost nothing, and it is the seat that must be preserved.',
    ),
    tip: l(
      'Serrez la vis dans le mandrin de la perceuse et descendez-la sur un foret de 3 mm tenu à l’étau : elle se centre d’elle-même. Ne la soudez pas (essai raté de la vidéo).',
      'Hold the screw in the drill chuck and lower it onto a 3 mm bit held in the vice: it centres itself. Do not weld it (a failed trial in the video).',
    ),
    video: ['05:35', '05:44', '09:47', '10:08', '10:48', '11:08'],
    design: l(
      `Une vis à tête fraisée a déjà le cône : à ${VALVE.headConeHalfAngleDeg}° de demi-angle, il suffit de la raccourcir et de la percer pour avoir une tête de clapet parfaitement conique, sans tour, et de fraiser la portée au même angle.`,
      `A countersunk screw already has the cone: at a ${VALVE.headConeHalfAngleDeg}° half-angle, it only needs shortening and drilling to give a perfectly conical valve head, with no lathe, and the seat is milled to the same angle.`,
    ),
  },
  {
    id: 'valve-stem',
    scene: 'valve',
    category: 'mechanical',
    name: l('Tige du clapet', 'Valve stem'),
    short: l(
      'Tige filetée de 6 mm : elle relie la tête au poids et coulisse dans le guide.',
      '6 mm threaded rod: it links the head to the weight and slides in the guide.',
    ),
    description: l(
      `La tige est la colonne vertébrale du clapet : de bas en haut, l’écrou à ailettes qui serre la tête, la tête, les deux manchons qui coulissent dans le guide, puis, au-dessus du guide, l’écrou de course, le poids et le contre-écrou. C’est une tige filetée de 6 mm, courante en quincaillerie, mais ses petits filets s’useraient très vite contre le guide, d’où les manchons. Son pas fait aussi la finesse du réglage : à ${fr(PITCH_MM)} mm par tour (pas normalisé d’une tige M6, non donné par la vidéo), un dixième de millimètre de course demande un dixième de tour. Avant cette tige, la vidéo a essayé un clapet anti-retour dont la petite tige rebondissait à chaque coup, puis un axe en acier trempé dont le joint est mort en 24 h.`,
      `The stem is the valve’s backbone: from the bottom up, the finned nut that clamps the head, the head, the two sleeves that slide in the guide, then, above the guide, the stroke nut, the weight and the lock nut. It is a 6 mm threaded rod, a common hardware-store item, but its fine threads would wear out very quickly against the guide, hence the sleeves. Its pitch also sets the fineness of the adjustment: at ${en(PITCH_MM)} mm per turn (the standard pitch of an M6 rod, not given by the video), a tenth of a millimetre of stroke takes a tenth of a turn. Before this stem, the video tried a check valve whose small rod bounced at every stroke, then a hardened-steel shaft whose seal had failed within 24 hours.`,
    ),
    material: l('Tige filetée de 6 mm', '6 mm threaded rod'),
    specs: [
      sp('Tige filetée', 'Threaded rod', `${fr(VALVE.rodDiameter * 1000)} mm`),
      sp(
        'Pas de la tige',
        'Pitch of the threaded rod',
        tagged(
          'assumed',
          `${fr(PITCH_MM)} mm par tour, pas M6 normalisé`,
          `${en(PITCH_MM)} mm per turn, standard M6 pitch`,
        ),
      ),
      sp('Ajustement des manchons dans le guide', 'Sleeve fit in the guide', l('à 0,1 mm près', 'to 0.1 mm')),
      sp(
        'Masse mobile à vide (clapet n°1)',
        'Bare moving mass (valve No. 1)',
        tagged('assumed', `${fr(VALVES[1].bareMass * 1000)} g`, `${en(VALVES[1].bareMass * 1000)} g`),
      ),
      sp('Course du clapet', 'Valve stroke', tagged('calibrated', `${fr(STROKE, 1)} mm`, `${en(STROKE, 1)} mm`)),
      sp(
        'Course dessinée en 3D',
        'Stroke drawn in 3D',
        l(`exagérée × ${VALVE.strokeVisualScale}`, `exaggerated × ${VALVE.strokeVisualScale}`),
      ),
      sp(
        'Dépassement au-dessus du contre-écrou (3D)',
        'Protrusion above the lock nut (3D)',
        lenMm('estimate', VALVE.rodTailProud),
      ),
    ],
    maintenance: l(
      '**Panne à prévoir.** Une tige faussée, par un coup ou par un poids de travers, ou aux filets abîmés : elle frotte dans le guide, la tête porte mal, le clapet colle ou se met à battre.\n\n**À vérifier.** À l’arrêt, roulez la tige sur une vitre : elle doit rouler droit, sans boiter ; remise dans le guide et sans le poids, elle doit tourner librement sous les doigts et retomber seule.\n\n**Entretien.** Remplacez-la au premier signe de voile (une tige de 6 mm se trouve partout) ; nettoyez les filets avant de revisser le poids et les écrous.',
      '**Typical failure.** A bent stem, from a blow or a crooked weight, or with damaged threads: it rubs in the guide, the head seats badly, the valve sticks or starts to flutter.\n\n**How to check.** At standstill, roll the stem on a pane of glass: it must roll straight, without wobbling; put back in the guide and without the weight, it must turn freely under the fingers and fall back on its own.\n\n**Maintenance.** Replace it at the first sign of bend (a 6 mm rod is available everywhere); clean the threads before screwing the weight and the nuts back on.',
    ),
    tip: l(
      'Ne soudez pas la tête sur la tige : dans la vidéo, l’essai soudé ne fermait pas, et un axe trempé avec un joint plat a perdu son joint en 24 h.',
      'Do not weld the head onto the stem: in the video the welded trial would not close, and a hardened-steel shaft with a flat seal lost its seal in 24 h.',
    ),
    video: ['05:22', '05:35', '05:44', '08:35', '08:42'],
    design: l(
      'Une tige filetée est bon marché, droite et se règle au dixième de tour ; on ne s’en sert pas comme axe, on lui enfile des pièces qui frottent à sa place.',
      'A threaded rod is cheap, straight and adjustable to a tenth of a turn; it is not used as a guide shaft, it gets fitted with parts that rub in its place.',
    ),
  },
  {
    id: 'stem-sleeves',
    scene: 'valve',
    category: 'mechanical',
    name: l('Manchons de la tige', 'Stem sleeves'),
    short: l(
      'Deux manchons usinés au dixième de millimètre : ils coulissent dans le guide à la place des filets.',
      'Two sleeves machined to a tenth of a millimetre: they slide in the guide in place of the stem’s threads.',
    ),
    description: l(
      `Une tige filetée ne fait pas un bon axe : ses petits filets s’useraient très vite en frottant dans le guide. L’auteur lui enfile donc des manchons femelles, de petits raccords usinés, taraudés à 6 mm pour se visser sur la tige, dont le diamètre extérieur colle à celui de l’intérieur du doigt de gant à 0,1 mm près. Ce sont eux qui frottent : on use un manchon, qu’on remplace, et non la tige, et ils gardent la tête dans l’axe de la portée. Le modèle en dessine deux, de ${mm(VALVE.stemSleeveLength).fr} mm, à ${mm(VALVE.stemSleeveSpacing).fr} mm d’entraxe. Avec ce jeu, la tête ne peut se décaler que de ${fr(VALVE_DERIVED.headShift * 1000, 1)} mm au plus (estimation, d’après des cotes estimées), que le cône de la portée rattrape à la fermeture.`,
      `A threaded rod does not make a good guide shaft: its fine threads would wear out very quickly rubbing in the guide. The author therefore slips machined female sleeves over it, small machined fittings, tapped to 6 mm to screw onto the rod, whose outer diameter matches the inside of the thermowell to within 0.1 mm. They are what rubs: a sleeve gets worn, and replaced, rather than the rod, and they keep the head on the seat’s axis. The model draws two of them, ${mm(VALVE.stemSleeveLength).en} mm long, ${mm(VALVE.stemSleeveSpacing).en} mm apart. With that clearance, the head can shift sideways by only ${en(VALVE_DERIVED.headShift * 1000, 1)} mm at most (estimate, from estimated dimensions), which the seat’s cone makes up for at closing.`,
    ),
    material: l(
      'Raccords usinés, matière non précisée (laiton dessiné en 3D)',
      'Machined fittings, material not stated (brass drawn in 3D)',
    ),
    qty: 2,
    specs: [
      sp('Ajustement dans le guide', 'Fit in the guide', l('à 0,1 mm près', 'to 0.1 mm')),
      sp('Taraudage', 'Thread', l('Taraudé à 6 mm, sur la tige', 'Tapped to 6 mm, on the stem')),
      sp(
        'Diamètre extérieur',
        'Outer diameter',
        tagged(
          'estimate',
          `${mm(VALVE.stemSleeveDiameter).fr} mm (alésage − 0,1 mm)`,
          `${mm(VALVE.stemSleeveDiameter).en} mm (bore − 0.1 mm)`,
        ),
      ),
      sp(
        'Alésage du guide à ajuster',
        'Guide bore to match',
        tagged(
          'estimate',
          `Ø ${mm(VALVE.guideTubeInnerDiameter).fr} mm`,
          `Ø ${mm(VALVE.guideTubeInnerDiameter).en} mm`,
        ),
      ),
      sp('Nombre (3D)', 'Count (3D)', tagged('estimate', '2', '2')),
      sp('Longueur de chaque manchon (3D)', 'Length of each sleeve (3D)', lenMm('estimate', VALVE.stemSleeveLength)),
      sp('Entraxe des manchons (3D)', 'Distance between sleeves (3D)', lenMm('estimate', VALVE.stemSleeveSpacing)),
      sp(
        'Décalage maximal de la tête',
        'Largest head shift',
        tagged(
          'estimate',
          `≈ ${fr(VALVE_DERIVED.headShift * 1000, 1)} mm`,
          `≈ ${en(VALVE_DERIVED.headShift * 1000, 1)} mm`,
        ),
      ),
    ],
    maintenance: l(
      '**Panne à prévoir.** Un manchon qui a pris du jeu en s’usant, ou qui coince (calcaire, grain de sable) : la tige bat dans le guide et la cadence devient irrégulière, ou elle colle et le clapet ne retombe plus.\n\n**À vérifier.** À l’arrêt (V1 fermée), retirez le poids, soulevez la tige de quelques millimètres et lâchez-la : elle doit retomber d’un trait ; secouez-la de côté : tout jeu sensible au bout de la tige trahit des manchons usés.\n\n**Entretien.** Rincez le guide et les manchons, mesurez-les au pied à coulisse (le dixième de millimètre) et remplacez un manchon fatigué plutôt que la tige.',
      '**Typical failure.** A sleeve that has gained play by wearing, or that sticks (limescale, a grain of sand): the stem flutters in the guide and the rate becomes irregular, or it sticks and the valve no longer falls back.\n\n**How to check.** At standstill (V1 closed), remove the weight, lift the stem a few millimetres and let go: it must fall back in one go; shake it sideways: any play you can feel at the end of the stem points to worn sleeves.\n\n**Maintenance.** Rinse the guide and the sleeves, measure them with calipers (a tenth of a millimetre) and replace a worn sleeve rather than the stem.',
    ),
    tip: l(
      'Mesurez l’alésage du guide à plusieurs endroits avant d’usiner les manchons : il fixe le diamètre à tenir à 0,1 mm près, et un doigt de gant du commerce n’est pas parfaitement rond.',
      'Measure the guide bore in several places before machining the sleeves: it sets the diameter to hold within 0.1 mm, and an off-the-shelf thermowell is not perfectly round.',
    ),
    video: ['08:35', '08:50', '08:56', '09:02'],
    design: l(
      'Des manchons plutôt que des filets : on use une pièce remplaçable, pas la tige, et l’ajustement serré garde la tête dans l’axe de la portée pour qu’elle ferme sur tout le tour.',
      'Sleeves rather than threads: a replaceable part wears, not the stem, and the close fit keeps the head on the seat’s axis so that it closes all the way round.',
    ),
  },
  {
    id: 'valve-guide',
    scene: 'valve',
    category: 'mechanical',
    name: l('Doigt de gant (guide)', 'Thermowell guide'),
    short: l(
      'Doigt de gant inox qui guide la tige ; sa tranche sert de butée à l’écrou de course.',
      'Stainless thermowell that guides the stem; its end face is the stop for the stroke nut.',
    ),
    description: l(
      `Le guide est un doigt de gant inox, normalement fait pour loger les sondes de température des chauffe-eau solaires et des chaudières ; l’auteur, chauffagiste et solariste, en avait sous la main. Coupé à longueur, son extrémité émergeant peu au-dessus de la zone des lumières, il forme le canal où coulisse la tige : un tube de ${fr(VALVE_DERIVED.guideLength * 1000)} mm environ dans le modèle, ouvert aux deux bouts puisque la tige le traverse. Sa tranche sert de butée : à chaque coup, ${fr(DERIVED.strokesPerDay)} fois par jour dans le modèle, elle reçoit l’écrou de course et le poids posé dessus (dans la vidéo, c’est le poids lui-même qui retombe sur le guide). Elle doit être plane et d’équerre : une première coupe de travers faisait craindre à l’auteur un déséquilibre, voire un coincement.`,
      `The guide is a stainless-steel thermowell, normally made to hold the temperature probes of solar water heaters and boilers; the author, a heating and solar installer, had some to hand. Cut to length, its end standing only a little above the port area, it forms the channel in which the stem slides: a tube of about ${en(VALVE_DERIVED.guideLength * 1000)} mm in the model, open at both ends since the stem goes through it. Its end face is the stop: at every cycle, ${en(DERIVED.strokesPerDay)} times a day in the model, it receives the stroke nut with the weight resting on it (in the video it is the weight itself that lands on the guide). It must be flat and square: a first crooked cut made the author fear an imbalance, even a jam.`,
    ),
    material: l('Acier inoxydable', 'Stainless steel'),
    specs: [
      sp(
        'Tube (3D)',
        'Tube (3D)',
        tagged(
          'estimate',
          `Ø ${mm(VALVE.guideTubeOuterDiameter).fr} extérieur, Ø ${mm(VALVE.guideTubeInnerDiameter).fr} intérieur`,
          `Ø ${mm(VALVE.guideTubeOuterDiameter).en} outer, Ø ${mm(VALVE.guideTubeInnerDiameter).en} inner`,
        ),
      ),
      sp(
        'Collerette (3D)',
        'Collar (3D)',
        tagged('estimate', `Ø ${mm(VALVE.guideCollarDiameter).fr} mm`, `Ø ${mm(VALVE.guideCollarDiameter).en} mm`),
      ),
      sp(
        'Longueur du tube (3D)',
        'Tube length (3D)',
        tagged(
          'estimate',
          `${fr(VALVE_DERIVED.guideLength * 1000)} mm, d’après les cotes estimées`,
          `${en(VALVE_DERIVED.guideLength * 1000)} mm, from the estimated heights`,
        ),
      ),
      sp(
        'Pied du tube au-dessus de la platine (3D)',
        'Foot of the tube above the plate (3D)',
        lenMm('estimate', VALVE.guideTubeBottom),
      ),
      sp(
        'Hauteur de la face d’appui de l’écrou de course (3D)',
        'Height of the stroke nut bearing face (3D)',
        lenMm('estimate', VALVE.guideTop),
      ),
      sp('Face d’extrémité', 'End face', l('Plane et perpendiculaire à l’axe', 'Flat and square to the axis')),
      sp(
        'Coups du poids par jour',
        'Weight impacts per day',
        tagged('model', `≈ ${fr(DERIVED.strokesPerDay)}`, `≈ ${en(DERIVED.strokesPerDay)}`),
      ),
    ],
    maintenance: l(
      '**Panne à prévoir.** La tranche du guide s’écrase sous les chocs de l’écrou et du poids ou l’alésage se raye : la course change sans que rien ne bouge en apparence, ou la tige accroche.\n\n**À vérifier.** À l’arrêt, retirez le poids et l’écrou de course et regardez la tranche : une empreinte nette et régulière sur tout le tour ; passez un foret du diamètre de l’alésage, il doit passer sans forcer ; mesurez la course aux cales d’épaisseur à chaque visite.\n\n**Entretien.** Gardez l’alésage propre et sans rayure, reprenez la tranche à la lime plate si elle s’écrase, en la gardant d’équerre.',
      '**Typical failure.** The guide’s end gets crushed under the impacts of the nut and the weight or the bore gets scratched: the stroke changes with nothing apparently moving, or the stem catches.\n\n**How to check.** At standstill, remove the weight and the stroke nut and look at the end: a clean, even mark all the way round; pass a drill bit of the bore’s diameter, it must go through without forcing; measure the stroke with feeler gauges on every visit.\n\n**Maintenance.** Keep the bore clean and unscratched, dress the end with a flat file if it gets crushed, keeping it square.',
    ),
    tip: l(
      'Contrôlez la coupe à l’équerre avant de monter le guide et reprenez la face à la lime : l’écrou de course et le poids retombent sur elle à chaque coup.',
      'Check the cut with a square before fitting the guide and dress the face with a file: the stroke nut and the weight land on it at every stroke.',
    ),
    video: ['08:16', '08:21', '08:31', '15:36'],
    design: l(
      'Un tube calibré pour recevoir une sonde, coupé à longueur, donne à bas coût un alésage guidé ; sa tranche sert de butée plane à l’écrou de course, ce qui fait de la même pièce le guide de la tige et la référence de la course.',
      'A tube calibrated to take a probe, cut to length, gives a guiding bore at low cost; its end face acts as a flat stop for the stroke nut, which makes the same part both the stem’s guide and the reference for the stroke.',
    ),
  },
  {
    id: 'valve-fins',
    scene: 'valve',
    category: 'mechanical',
    name: l('Ailettes', 'Fins'),
    short: l(
      'Ailettes qui font tourner le clapet Walton ; l’auteur prévoit d’en limer sous le sien, effet non vérifié.',
      'Fins that turn the Walton valve; the author plans to file some under his own, effect unchecked.',
    ),
    description: l(
      `Sur le clapet Walton d’origine, de petites ailettes sous le clapet le font tourner un peu à chaque remontée : la portée ne frappe ainsi jamais deux fois au même endroit, et l’usure se répartit sur toute la circonférence au lieu de creuser là où un petit défaut de forme frappe toujours. L’auteur annonce qu’il en limera sous son propre clapet, après le tournage (il dit le faire hors caméra), sans savoir encore si cela le fera tourner : c’est une idée reprise du Walton, pas un résultat démontré. Dans le laboratoire, elles sont portées par l’écrou qui serre la tête sur la tige, sous la tête : ${VALVE.finsCount} ailettes inclinées, en estimation, car ni leur nombre ni leur angle ne sont donnés.`,
      `On the original Walton valve, small fins under the valve turn it slightly at every rise: the seat then never strikes the same spot twice, and the wear is spread around the whole circumference instead of digging where a small shape defect always strikes. The author announces that he will file some under his own valve, after filming (he says he will do it off-camera), without yet knowing whether it will turn it: it is an idea taken from the Walton, not a demonstrated result. In the lab they are carried by the nut that clamps the head onto the stem, under the head: ${VALVE.finsCount} slanted fins, as an estimate, since neither their number nor their angle is given.`,
    ),
    material: l(
      'Acier, limées dans l’écrou sous la tête (matière non précisée)',
      'Steel, filed into the nut under the head (material not stated)',
    ),
    specs: [
      sp(
        'Nombre',
        'Count',
        tagged(
          'estimate',
          `${VALVE.finsCount}, nombre non donné par la vidéo`,
          `${VALVE.finsCount}, count not given in the video`,
        ),
      ),
      sp(
        'Encombrement (3D)',
        'Envelope (3D)',
        tagged(
          'estimate',
          `Ø ${mm(VALVE.finsDiameter).fr} × ${mm(VALVE.finsHeight).fr} mm`,
          `Ø ${mm(VALVE.finsDiameter).en} × ${mm(VALVE.finsHeight).en} mm`,
        ),
      ),
      sp(
        'Moyeu (3D)',
        'Hub (3D)',
        tagged('estimate', `Ø ${mm(VALVE.finsHubDiameter).fr} mm`, `Ø ${mm(VALVE.finsHubDiameter).en} mm`),
      ),
      sp('Angle des ailettes', 'Fin angle', l('Non donné par la vidéo', 'Not given in the video')),
      sp(
        'Effet démontré',
        'Proven effect',
        l('Pas encore vérifié par l’auteur sur son clapet', 'Not yet checked by the author on his valve'),
      ),
      sp(
        'Fermetures par jour',
        'Closings per day',
        tagged('model', `≈ ${fr(DERIVED.strokesPerDay)}`, `≈ ${en(DERIVED.strokesPerDay)}`),
      ),
    ],
    maintenance: l(
      '**Panne à prévoir.** Des ailettes qui ne font pas tourner la tête (mal inclinées, ou qui se contrarient) : la portée use toujours le même secteur et finit par fuir ; ou trop usées, elles ne font plus rien.\n\n**À vérifier.** Faites un trait de feutre sur le contre-écrou en face d’un repère fixe, et regardez-le quelques minutes en marche, sans approcher les doigts des lumières : si le trait change d’angle, le clapet tourne ; sinon, il ne tourne pas, ce que l’auteur ne sait pas encore pour les siennes (astuce de terrain courante, non vérifiée par les sources du laboratoire).\n\n**Entretien.** À l’arrêt, regardez la trace sur la portée : régulière sur tout le tour, le clapet tourne ; d’un seul côté, il ne tourne pas ou frappe de biais.',
      '**Typical failure.** Fins that do not turn the head (badly slanted, or opposing one another): the seat always wears the same sector and ends up leaking; or worn too far, they no longer do anything.\n\n**How to check.** Make a felt-tip line on the lock nut facing a fixed mark, and watch it for a few minutes while running, keeping your fingers away from the ports: if the line changes angle, the valve turns; if not, it does not, which the author does not yet know for his own fins (common field trick, not checked against the lab’s sources).\n\n**Maintenance.** At standstill, look at the mark on the seat: even all the way round, the valve turns; on one side only, it does not turn or strikes at an angle.',
    ),
    tip: l(
      'Donnez la même inclinaison à toutes les ailettes, dans le même sens : si elles se contrarient, l’eau ne fait pas tourner le clapet.',
      'Give every fin the same slant, in the same direction: if they oppose one another, the water does not turn the valve.',
    ),
    video: ['12:02', '12:10', '12:35'],
    design: l(
      'Une tête qui tourne use la portée sur toute sa circonférence ; sans rotation, le moindre défaut de forme finit par creuser une fuite.',
      'A head that turns wears the seat over its whole circumference; without rotation, the slightest shape defect ends up cutting a leak.',
    ),
  },
  {
    id: 'counterweight',
    scene: 'valve',
    category: 'mechanical',
    name: l('Poids (barre d’armature)', 'Weight (rebar)'),
    short: l(
      'Tronçon de barre d’armature de 30–32 mm, usiné dans l’axe : il rabaisse le clapet après chaque coup.',
      'Length of 30–32 mm rebar machined on its axis: it pulls the valve back down after every stroke.',
    ),
    description: l(
      `Le poids est un tronçon de barre d’armature de 30 à 32 mm, percé dans l’axe, taraudé et dressé en plan à la perceuse à colonne. Il repose sur l’écrou de course, rabaisse le clapet après chaque coup et joue sur la vitesse de fermeture, donc sur la consommation et le rythme. Selon la vidéo, le poids y participe un peu ; dans le modèle, c’est un levier majeur.\n\nLe premier poids, fait de gros écrous et de rondelles, se mettait de travers, coinçait le clapet et a arrêté le bélier dans les premiers jours. Dans la vidéo, le poids final est lui-même l’écrou principal ; le laboratoire garde deux pièces, l’écrou de course dessous et le poids dessus, pour que chaque rôle se voie.`,
      `The weight is a piece of 30–32 mm rebar, drilled on its axis, tapped and faced flat on the drill press. It rests on the stroke nut, pulls the valve back down after every stroke and affects the closing speed, so the consumption and the rhythm. According to the video the weight takes part a little; in the model it is a major lever.\n\nThe first weight, made of big nuts and washers, sat crooked, jammed the valve and stopped the ram within the first days. In the video the final weight is itself the main nut; the lab keeps two parts, the stroke nut below and the weight above, so that each role can be seen.`,
    ),
    material: l('Acier, barre d’armature (fer à béton) de 30–32 mm', 'Steel, 30–32 mm rebar'),
    specs: [
      sp('Barre d’armature', 'Rebar', l('Ø 30 à 32 mm', 'Ø 30 to 32 mm')),
      sp(
        'Masse pour le clapet n°1',
        'Mass for valve No. 1',
        tagged('calibrated', `≈ ${fr(WEIGHT)} g, non donnée par la vidéo`, `≈ ${en(WEIGHT)} g, not given by the video`),
      ),
      sp(
        'Pièce dessinée en 3D',
        'Part drawn in 3D',
        tagged(
          'estimate',
          `Ø ${mm(VALVE.counterweightDiameter).fr} × ${mm(VALVE.counterweightLength).fr} mm (diamètre au milieu de la plage de la vidéo, longueur déduite de la masse calibrée)`,
          `Ø ${mm(VALVE.counterweightDiameter).en} × ${mm(VALVE.counterweightLength).en} mm (diameter in the middle of the video’s range, length deduced from the calibrated mass)`,
        ),
      ),
      sp(
        'Masse mobile totale',
        'Total moving mass',
        tagged(
          'estimate',
          `${fr(DERIVED.movingMassKg * 1000)} g avec la tête, la tige et les écrous`,
          `${en(DERIVED.movingMassKg * 1000)} g with the head, the stem and the nuts`,
        ),
      ),
      sp(
        'Rouvre le clapet sous',
        'Reopens the valve below',
        tagged(
          'estimate',
          `${fr(DERIVED.reopenBar, 2)} bar dans le corps`,
          `${en(DERIVED.reopenBar, 2)} bar in the body`,
        ),
      ),
      sp(
        'Poids doublé (à 2,2 mm de course)',
        'Doubled weight (at 2.2 mm stroke)',
        tagged(
          'model',
          `${fr(MODEL.heavyWeightStrokes)} coups/min, ${fr(MODEL.heavyWeightFlow, 1)} L/min, ${fr(MODEL.heavyWeightPerDay)} L/jour`,
          `${en(MODEL.heavyWeightStrokes)} strokes/min, ${en(MODEL.heavyWeightFlow, 1)} L/min, ${en(MODEL.heavyWeightPerDay)} L/day`,
        ),
      ),
      sp(
        'Poids divisé par deux (à 2,2 mm de course)',
        'Half the weight (at 2.2 mm stroke)',
        tagged(
          'model',
          `${fr(MODEL.lightWeightStrokes)} coups/min, ${fr(MODEL.lightWeightFlow, 1)} L/min`,
          `${en(MODEL.lightWeightStrokes)} strokes/min, ${en(MODEL.lightWeightFlow, 1)} L/min`,
        ),
      ),
      sp('Fixation', 'Fastening', l('Taraudé sur la tige de 6 mm', 'Tapped onto the 6 mm stem')),
      sp('Temps d’usinage', 'Machining time', l('Environ 1 h', 'About 1 h')),
    ],
    maintenance: l(
      '**Panne à prévoir.** Un poids qui prend du jeu sur la tige, ou dont la face n’est pas plane : il retombe de travers, coince le clapet et peut arrêter le bélier, comme le premier poids de la vidéo.\n\n**À vérifier.** À l’arrêt, essayez d’incliner le poids sur la tige : aucun jeu ; posé sur l’écrou de course, une feuille de papier ne doit passer nulle part entre les deux faces ; la marque sur la tranche du guide doit être régulière.\n\n**Entretien.** À chaque visite, regardez la face du poids et la tranche du guide, reprenez-les à la lime si elles s’écrasent, et resserrez le contre-écrou.',
      '**Typical failure.** A weight that gains play on the stem, or whose face is not flat: it lands crooked, jams the valve and can stop the ram, like the video’s first weight.\n\n**How to check.** At standstill, try to tilt the weight on the stem: no play; resting on the stroke nut, a sheet of paper must not pass anywhere between the two faces; the mark on the guide’s end must be even.\n\n**Maintenance.** On every visit, look at the weight’s face and the guide’s end, dress them with a file if they get crushed, and retighten the lock nut.',
    ),
    tip: l(
      'Dans la vidéo, un petit coffret de taraudage bon marché n’a pas suffi pour l’acier : prenez un bon taraud et pesez le poids fini (voir le scénario « Poids doublé »).',
      'In the video a small cheap tap-and-die set was not enough for steel: use a good tap and weigh the finished weight (see the “Doubled weight” scenario).',
    ),
    video: ['14:14', '14:39', '15:36', '15:59', '17:21'],
    design: l(
      'Une masse plus grande exige un courant plus rapide pour fermer le clapet : la vitesse de choc, donc la violence du coup et la consommation, monte avec elle. D’un seul bloc plutôt que d’écrous empilés, le poids ne se met plus de travers.',
      'A larger mass needs a faster flow to close the valve: the closing speed, and so the violence of the hammer and the consumption, rises with it. In one piece rather than stacked nuts, the weight no longer sits crooked.',
    ),
  },
  {
    id: 'stroke-nut',
    scene: 'valve',
    category: 'mechanical',
    name: l('Écrou de réglage de course', 'Stroke nut'),
    short: l(
      'Écrou posé sur le guide, dont la position sur la tige règle la course du clapet, donc la consommation.',
      'Nut resting on the guide, whose position on the stem sets the valve stroke, and so the consumption.',
    ),
    description: l(
      `L’écrou de course se visse sur la tige et repose sur le haut du guide : sa position fixe l’écart entre la tête et la portée quand le clapet est ouvert, la course. Comme elle décide de la consommation, c’est le réglage le plus important du bélier. Sous une course minimale il ne refoule plus, au-delà d’un maximum il prend plus que la source : avec celle de la vidéo, la fenêtre est étroite, ${fr(VALVE_DERIVED.windowTurns, 1)} tour d’écrou (résultat du modèle, pas de ${fr(PITCH_MM)} mm supposé ; de 0,35 à 1,25 tour pour les couples course–poids essayés).\n\nDans la vidéo, le poids machiné est lui-même l’écrou principal (l’écrou d’origine entrait dans le guide et empêchait de descendre assez bas) ; le laboratoire garde deux pièces, l’écrou dessous et le poids dessus, pour que chaque rôle se voie.`,
      `The stroke nut screws onto the stem and rests on the top of the guide: its position sets the gap between the head and the seat when the valve is open, the stroke. Since it decides the consumption, it is the ram’s most important setting. Below a minimum stroke the ram no longer delivers, above a maximum it takes more than the spring gives: with the video’s spring the window is narrow, ${en(VALVE_DERIVED.windowTurns, 1)} turn of the nut (model result, a ${en(PITCH_MM)} mm pitch assumed; 0.35 to 1.25 turn for the stroke–weight pairs tried).\n\nIn the video the machined weight is itself the main nut (the original nut went into the guide and prevented going low enough); the lab keeps two parts, the nut below and the weight above, so that each role can be seen.`,
    ),
    material: l('Acier, écrou standard M6 (estimation)', 'Steel, standard M6 nut (estimate)'),
    specs: [
      sp('Filetage', 'Thread', l('Tige de 6 mm', '6 mm stem')),
      sp(
        'Écrou (3D)',
        'Nut (3D)',
        tagged(
          'estimate',
          `${mm(VALVE.nutAcrossFlats).fr} mm sur plats × ${mm(VALVE.nutThickness).fr} mm`,
          `${mm(VALVE.nutAcrossFlats).en} mm across flats × ${mm(VALVE.nutThickness).en} mm`,
        ),
      ),
      sp(
        'Course du clapet n°1',
        'Stroke of valve No. 1',
        tagged('calibrated', `${fr(STROKE, 1)} mm`, `${en(STROKE, 1)} mm`),
      ),
      sp(
        'Plage du simulateur',
        'Simulator range',
        l(
          `${fr(RANGES.stroke.min, 1)} à ${fr(RANGES.stroke.max)} mm`,
          `${en(RANGES.stroke.min, 1)} to ${en(RANGES.stroke.max)} mm`,
        ),
      ),
      sp(
        'Course où le refoulement s’arrête',
        'Stroke at which delivery stops',
        tagged(
          'model',
          `${fr(MODEL.noDeliveryStroke, 1)} mm (${fr(MODEL.minStrokeFlow, 1)} L/min rejetés)`,
          `${en(MODEL.noDeliveryStroke, 1)} mm (${en(MODEL.minStrokeFlow, 1)} L/min of waste water)`,
        ),
      ),
      sp(
        'Course où le clapet n°1 prend toute la source',
        'Stroke at which valve No. 1 takes the whole spring',
        tagged(
          'model',
          `${fr(MODEL.springLimitStroke, 1)} mm (7,5 L/min)`,
          `${en(MODEL.springLimitStroke, 1)} mm (7.5 L/min)`,
        ),
      ),
      sp(
        'Course de 3 mm',
        'Stroke of 3 mm',
        tagged(
          'model',
          `${fr(MODEL.longStrokeFlow, 1)} L/min, ${fr(MODEL.longStrokePerDay)} L/jour`,
          `${en(MODEL.longStrokeFlow, 1)} L/min, ${en(MODEL.longStrokePerDay)} L/day`,
        ),
      ),
      sp(
        'Course par tour d’écrou',
        'Stroke per turn of the nut',
        tagged('assumed', `${fr(PITCH_MM)} mm (0,1 mm = 36°)`, `${en(PITCH_MM)} mm (0.1 mm = 36°)`),
      ),
      sp(
        'Course dessinée en 3D',
        'Stroke drawn in 3D',
        l(`exagérée × ${VALVE.strokeVisualScale}`, `exaggerated × ${VALVE.strokeVisualScale}`),
      ),
      sp(
        'Cadence',
        'Stroke rate',
        l('70–80 → 100–110 coups/min avec le nouveau clapet', '70–80 → 100–110 strokes/min with the new valve'),
      ),
    ],
    maintenance: l(
      '**Panne à prévoir.** L’écrou se desserre ou se visse tout seul sous les vibrations : la course dérive, et la consommation avec elle, d’un côté jusqu’à vider la réserve, de l’autre jusqu’à ne plus rien refouler, sans que rien ne se voie.\n\n**À vérifier.** Mesurez la course à l’arrêt (V1 fermée) : soulevez la tige par le haut jusqu’à ce que la tête touche sa portée, puis glissez des cales d’épaisseur entre l’écrou de course et le guide : leur épaisseur est la course ; comptez aussi les coups, une cadence qui change trahit un écrou qui a bougé.\n\n**Entretien.** Vérifiez la position de l’écrou après les premiers jours, puis à chaque visite, et refaites le trait de peinture.',
      '**Typical failure.** The nut works loose or tightens by itself under the vibration: the stroke drifts, and the consumption with it, on one side until it empties the tank, on the other until nothing is delivered, with nothing showing.\n\n**How to check.** Measure the stroke at standstill (V1 closed): lift the stem from the top until the head touches its seat, then slide feeler gauges between the stroke nut and the guide: their thickness is the stroke; also count the strokes, a rate that changes means a nut has moved.\n\n**Maintenance.** Check the nut’s position after the first days, then on every visit, and redo the paint line.',
    ),
    tip: l(
      'Réduire la course réduit la consommation, mais pas indéfiniment : dans le scénario « Écrou de course vissé », le refoulement s’arrête vers 1,5 mm. Tournez par fractions de tour.',
      'Reducing the stroke reduces the consumption, but not indefinitely: in the “Stroke nut turned in” scenario the delivery stops around 1.5 mm. Turn by fractions of a turn.',
    ),
    video: ['12:51', '13:06', '13:13', '17:40'],
    design: l(
      'Une course courte referme le clapet plus tôt, avec moins d’eau rejetée ; trop courte, le coup est trop faible pour ouvrir le clapet de refoulement. L’écrou règle ce compromis, au dixième de millimètre.',
      'A short stroke shuts the valve earlier, with less waste water; too short, the hammer is too weak to open the delivery check valve. The nut sets that compromise, to a tenth of a millimetre.',
    ),
  },
  {
    id: 'lock-nut',
    scene: 'valve',
    category: 'mechanical',
    name: l('Contre-écrou', 'Lock nut'),
    short: l(
      'Écrou vissé au sommet de la pile et serré contre le poids pour que le réglage ne se desserre pas.',
      'Nut screwed on top of the stack and tightened against the weight so that the setting cannot work loose.',
    ),
    description: l(
      `Le contre-écrou bloque le réglage. À 100–110 coups par minute, chaque vibration peut desserrer l’écrou de course et dérégler le bélier, alors que sa position fixe la consommation : le contre-écrou, vissé au sommet de la pile, serre le poids contre l’écrou de course, à fond. L’ancien clapet faisait 70 à 80 coups par minute ; le nouveau en fait 100 à 110, ce qui rend le blocage plus important : le modèle compte ${fr(DERIVED.strokesPerDay)} coups par jour. Dans la vidéo, où le poids sert d’écrou principal, le contre-écrou se visse simplement par-dessus et permet un réglage très fin de la consommation, au dixième de tour près.`,
      `The lock nut locks the setting. At 100–110 strokes a minute every vibration can loosen the stroke nut and detune the ram, while its position fixes the consumption: the lock nut, screwed on top of the stack, tightens the weight against the stroke nut, fully. The old valve made 70 to 80 strokes a minute; the new one makes 100 to 110, which makes the locking more important: the model counts ${en(DERIVED.strokesPerDay)} strokes a day. In the video, where the weight serves as the main nut, the lock nut simply screws on top and allows a very fine adjustment of the consumption, to a tenth of a turn.`,
    ),
    material: l('Acier, écrou standard M6 (estimation)', 'Steel, standard M6 nut (estimate)'),
    specs: [
      sp('Filetage', 'Thread', l('Tige de 6 mm', '6 mm stem')),
      sp(
        'Écrou (3D)',
        'Nut (3D)',
        tagged(
          'estimate',
          `${mm(VALVE.nutAcrossFlats).fr} mm sur plats × ${mm(VALVE.nutThickness).fr} mm`,
          `${mm(VALVE.nutAcrossFlats).en} mm across flats × ${mm(VALVE.nutThickness).en} mm`,
        ),
      ),
      sp('Couple de serrage', 'Tightening torque', l('Non donné par la vidéo', 'Not given in the video')),
      sp(
        'Cadence',
        'Stroke rate',
        l('70–80 → 100–110 coups/min avec le nouveau clapet', '70–80 → 100–110 strokes/min with the new valve'),
      ),
      sp(
        'Coups par jour',
        'Strokes per day',
        tagged('model', `≈ ${fr(DERIVED.strokesPerDay)}`, `≈ ${en(DERIVED.strokesPerDay)}`),
      ),
      sp('Course par tour', 'Stroke per turn', tagged('assumed', `${fr(PITCH_MM)} mm`, `${en(PITCH_MM)} mm`)),
    ],
    maintenance: l(
      '**Panne à prévoir.** Le contre-écrou se desserre et libère l’écrou de course : la course et la consommation changent sans que rien ne bouge en apparence.\n\n**À vérifier.** À l’arrêt, regardez le trait de peinture tracé en travers des écrous, du poids et de la tige : s’il est cassé, quelque chose a tourné ; en marche, une cadence qui change est le premier signe.\n\n**Entretien.** Resserrez-le à la clé à chaque visite, en tenant l’écrou de course avec une seconde clé pour ne pas bouger la course.',
      '**Typical failure.** The lock nut loosens and frees the stroke nut: the stroke and the consumption change with nothing apparently moving.\n\n**How to check.** At standstill, look at the paint line drawn across the nuts, the weight and the stem: if it is broken, something has turned; while running, a rate that changes is the first sign.\n\n**Maintenance.** Retighten it with a spanner on every visit, holding the stroke nut with a second spanner so as not to move the stroke.',
    ),
    tip: l(
      'Resserrez le contre-écrou après chaque réglage, avec deux clés plates : le poids monte et descend à chaque coup, un écrou serré à la main se desserre en quelques heures.',
      'Retighten the lock nut after every adjustment, with two open-ended spanners: the weight rises and falls at every stroke, and a hand-tight nut works loose within hours.',
    ),
    video: ['13:29', '13:37', '13:47', '18:02'],
    design: l(
      'Deux pièces serrées l’une contre l’autre se bloquent par friction mutuelle : c’est la solution classique contre le desserrage par vibration, et elle garde le réglage au dixième de tour.',
      'Two parts tightened against each other lock by mutual friction: the classic cure for loosening under vibration, and it keeps the setting to a tenth of a turn.',
    ),
  },
];
