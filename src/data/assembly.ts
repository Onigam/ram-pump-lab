// Assembly guide of the ram and its waste valve (wave 3, data role; fix wave): 24 steps that cross two worlds.
//
// The guide opens in the `valve` world (the default world of the guide): steps 1–13 build the video's waste valve, one
// part per step (the stem and its sleeves go together), in the order of the physical build and of the 3D explode: plate,
// socket, reducer, nipple, sleeve, guide, seat, head, stem and sleeves, fins, weight, stroke nut, lock nut. Steps 14–24
// play in the `ram` world (`scene: 'ram'`): the foundation, the body, the inlet line, the delivery side, the small
// fittings, then `waste-valve` (the whole valve, one part, bolted on the body) and two steps that install nothing, the
// first start and the check of the rate. All 14 valve ids and all 13 ram ids are installed exactly once.
//
// The waste valve follows the video (06:20–19:05). The body, the delivery side, the snifter, the gauge, the union, the
// valves V1–V3 and the foundation are those of a generic 1" ram: the video does not show them (research §3).
// Each step text stays within 80 words in both languages (hard cap 90), tips and warnings are short; what the video
// did or did not do goes in a short tag (« Dans la vidéo : », « Pratique courante : ») or in the part sheet.
// DURATIONS ARE ROUGH ESTIMATES (the lead and the owner are expected to refine them), except the weight: « une bonne
// heure » (video 17:21). `duration` is a plain string in the kit (it cannot be bilingual), so an estimate reads
// « ≈ 6 h (est.) » in both languages and the weight reads « 1 h (vidéo) ». No torque is given: no source states one,
// and the `torque` field is never used. The only fit given is the stem sleeves in the guide, within 0.1 mm (video
// 09:02), written in the text.
// Stack on the stem, from the guide's top upwards (lead's decision on the facts review): the STROKE NUT rests on the
// guide's top and its height on the stem sets the stroke, the WEIGHT rests on the nut, the LOCK NUT is on top. The order
// of the parts in the guide (weight, stroke nut, lock nut) is frozen by part-ids.ts, so the stroke-nut step says to take
// the weight off the stem again, thread the nut on, and put the weight back. In the video's final valve the machined
// weight is itself the main nut; the lab keeps two parts so that each role can be seen.
// Stroke ≈ 2.2 mm and weight ≈ 360 g for the n°1 valve are CALIBRATED by the model (docs/physics.md §3), not measured.
// Pressures, flows and rates are the model's (MODEL and DERIVED in ./parts/ram.ts, checked by parts-ram.test.ts). A
// figure computed from estimated dimensions or from the model is tagged « estimation » or « résultat du modèle », never
// « dérivé » (that tag is for values computed from reported figures).

import type { GuideStep } from '@onigam/lab-kit/content';
import { l } from '@onigam/lab-kit/i18n';
import { CHAMBER, FITTINGS, FOUNDATION, INLET, SITE, VALVE } from '../three/dims';
import { STROKE, WEIGHT } from './part-helpers';
import { DERIVED, MODEL } from './parts/ram';
import { VALVE_DERIVED } from './parts/valve';
import { mm, mmBox, nEn, nFr } from './units';

const AIR_PERCENT = 60; // share of air in the chamber at working pressure (AIR_FRACTION_NOMINAL, assumed)
const fr = (x: number, d = 0) => nFr(x, d);
const en = (x: number, d = 0) => nEn(x, d);

export const ASSEMBLY: GuideStep[] = [
  // ======================================================================================= the valve world
  {
    id: 'base-plate',
    title: l('Découper la platine de base', 'Cut the base plate'),
    text: l(
      `Le clapet de choc se construit de bas en haut, sur la **platine de base** : une plaque d’acier percée comme celle du clapet d’origine, pour se boulonner à sa place sur le corps du bélier. Le labo en dessine une de ${mmBox(VALVE.basePlateSide, VALVE.basePlateSide, VALVE.basePlateThickness).fr} mm (estimation), avec quatre trous de fixation et un trou central de ${mm(VALVE.basePlateBore).fr} mm.\n\nPlan : les étapes 1 à 13 construisent le clapet, les étapes 14 à 24 montent le bélier.`,
      `The waste valve is built from the bottom up, on the **base plate**: a steel plate drilled like the original valve’s, to bolt onto the ram body in its place. The lab draws one of ${mmBox(VALVE.basePlateSide, VALVE.basePlateSide, VALVE.basePlateThickness).en} mm (estimate), with four fixing holes and a ${mm(VALVE.basePlateBore).en} mm central hole.\n\nPlan: steps 1 to 13 build the valve, steps 14 to 24 set up the ram.`,
    ),
    parts: ['base-plate'],
    tools: [
      l('Scie à métaux ou meuleuse', 'Hacksaw or angle grinder'),
      l('Perceuse à colonne', 'Drill press'),
      l('Platine d’origine, comme gabarit', 'Original plate, as a template'),
      l('Pied à coulisse', 'Calipers'),
    ],
    tip: l(
      'Gardez l’ancien clapet tant que le nouveau ne tourne pas : posez la platine d’origine sur la plaque neuve et tracez le contour et les trous à travers elle.',
      'Keep the old valve until the new one runs: lay the original plate on the new one and mark the outline and the holes through it.',
    ),
    duration: '≈ 1 h (est.)',
  },
  {
    id: 'socket',
    title: l('Souder le manchon 26×34 sur la platine', 'Weld the 26×34 socket onto the plate'),
    text: l(
      `Soudez le **manchon** 26×34 au centre de la platine, sur le grand trou, par un cordon continu. C’est la base de l’empilement : il reçoit l’eau du corps, qui plaque la tête sur sa portée. Réduction, mamelon, guide et tige partageront son axe : tout défaut d’équerrage se retrouvera plus haut.\n\nDans la vidéo, l’auteur soude un raccord 20×27 puis ajoute deux raccords ; un 26×34 aurait suffi, dit-il. Le labo montre cette version simplifiée.`,
      `Weld the 26×34 **socket** to the centre of the plate, over the large hole, with a continuous bead. It is the base of the stack: it receives the water from the body, which presses the head onto its seat. Reducer, nipple, guide and stem will share its axis: any squareness error carries upwards.\n\nIn the video the author welds a 20×27, then adds two fittings; a 26×34 would have sufficed, he says. The lab shows that simplified version.`,
    ),
    parts: ['valve-socket'],
    tools: [
      l('Poste à souder', 'Welder'),
      l('Équerre', 'Square'),
      l('Meuleuse pour ébarber le cordon', 'Grinder to dress the bead'),
    ],
    tip: l(
      'Pointez le manchon en trois points, vérifiez-le à l’équerre dans deux directions, puis terminez le cordon. Dans la vidéo, une tête soudée un peu de travers ne fermait pas.',
      'Tack the socket at three points, check it with a square in two directions, then finish the bead. In the video, a head welded slightly off-axis would not close.',
    ),
    warning: l(
      'La chaleur de la soudure peut gauchir la platine : soudez par petits tronçons en alternant les côtés, et vérifiez la planéité de sa face d’appui avant de continuer.',
      'The heat of the weld can warp the plate: weld in short runs, alternating sides, and check the flatness of its bearing face before going on.',
    ),
    duration: '≈ 1 h (est.)',
  },
  {
    id: 'reducer',
    title: l('Visser la réduction 26×34 → 15×21', 'Screw on the 26×34 → 15×21 reducer'),
    text: l(
      `Vissez la **réduction** dans le manchon, avec du ruban PTFE sur le filetage mâle. Elle passe du 26×34 au 15×21, qui donne la taille du clapet : le 15×21 est celui du clapet n°1 (le n°2 de la vidéo est un 20×27, le n°3 d’origine un 26×34). Son cône intérieur resserre l’eau vers la portée, et le volume qu’elle forme avec le manchon loge la tête et ses ailettes. Serrez-la à fond : elle ne devra plus bouger.`,
      `Screw the **reducer** into the socket, with PTFE tape on the male thread. It goes from 26×34 to 15×21, which gives the valve size: 15×21 is the No. 1 valve’s (the video’s No. 2 is a 20×27, its original No. 3 a 26×34). Its inner cone narrows the water towards the seat, and the volume it forms with the socket houses the head and its fins. Tighten it fully: it must not move again.`,
    ),
    parts: ['valve-reducer'],
    tools: [l('Clés à tube', 'Pipe wrenches'), l('Ruban PTFE', 'PTFE tape')],
    tip: l(
      'Serrez tous les raccords à fond avant la portée : dans la vidéo, elle est fraisée sur l’ensemble monté et serré, pour ne plus bouger ensuite.',
      'Tighten every fitting fully before the seat: in the video it is milled on the assembled and tightened stack, so that it cannot shift afterwards.',
    ),
    duration: '≈ 15 min (est.)',
  },
  {
    id: 'nipple',
    title: l('Usiner les lumières du mamelon et le visser', 'Machine the nipple’s ports and screw it in'),
    text: l(
      `Le **mamelon** est un raccord mâle 15×21 fileté sur 7 à 8 cm, qui allonge le corps du clapet. Usinez-y les lumières, les fentes par où l’eau s’échappera (${VALVE.portCount} lumières de ${mm(VALVE.portWidth).fr} × ${mm(VALVE.portHeight).fr} mm dans le modèle, estimation), puis vissez-le dans la réduction et bloquez sa hauteur avec un contre-écrou 15×21. L’eau sortira par les lumières, dont la section totale (${fr(DERIVED.portsMm2)} mm²) fait ${fr(VALVE_DERIVED.portsRatio, 1)} fois celle de la portée (estimations).`,
      `The **nipple** is a 15×21 male fitting threaded over 7–8 cm, which lengthens the valve body. Machine the ports in it, the slots through which the water will escape (${VALVE.portCount} ports of ${mm(VALVE.portWidth).en} × ${mm(VALVE.portHeight).en} mm in the model, estimate), then screw it into the reducer and lock its height with a 15×21 lock nut. The water will leave through the ports, whose total area (${en(DERIVED.portsMm2)} mm²) is ${en(VALVE_DERIVED.portsRatio, 1)} times the seat’s (estimates).`,
    ),
    parts: ['valve-nipple'],
    tools: [
      l('Perceuse à colonne, étau', 'Drill press, vice'),
      l('Limes ronde et plate', 'Round and flat files'),
      l('Clé à molette', 'Adjustable spanner'),
    ],
    tip: l(
      'Répartissez les lumières à intervalles égaux et chanfreinez leurs arêtes : c’est l’endroit le plus mince du mamelon, et une arête vive y amorce une fissure sous les coups.',
      'Space the ports at equal intervals and chamfer their edges: it is the thinnest part of the nipple, and a sharp edge starts a crack there under the strokes.',
    ),
    warning: l(
      'Ne serrez pas le mamelon à l’étau au niveau des lumières : les barrettes entre elles sont minces (le tube y perd plus d’un tiers de son pourtour) et se plient.',
      'Do not clamp the nipple in the vice at the level of the ports: the bars between them are thin (the tube loses more than a third of its circumference there) and bend.',
    ),
    duration: '≈ 90 min (est.)',
  },
  {
    id: 'sleeve',
    title: l('Visser le manchon femelle-femelle', 'Screw on the female-female sleeve'),
    text: l(
      `Vissez le **manchon femelle-femelle** 15×21 sur le haut du mamelon. C’est un manchon de plomberie ordinaire ; dans la vidéo il fait la liaison entre le mamelon, mâle, et le guide, qui se visse dedans. C’est lui qui tiendra le guide dans l’axe de la portée : engagez-le d’abord à la main, jusqu’à sentir que les filets sont bien droits, puis serrez.`,
      `Screw the 15×21 **female-female sleeve** onto the top of the nipple. It is an ordinary plumbing sleeve; in the video it joins the male nipple to the guide, which screws into it. It is what will hold the guide on the seat’s axis: engage it by hand first, until you feel that the threads are straight, then tighten.`,
    ),
    parts: ['valve-sleeve'],
    tools: [l('Clé à tube', 'Pipe wrench'), l('Ruban PTFE', 'PTFE tape')],
    tip: l(
      'Un manchon engagé de travers se voit tout de suite : son bord n’est pas d’équerre avec l’axe. Dévissez et recommencez plutôt que de forcer.',
      'A sleeve engaged crooked shows at once: its edge is not square to the axis. Unscrew and start again rather than forcing.',
    ),
    duration: '≈ 10 min (est.)',
  },
  {
    id: 'seat',
    title: l('Fraiser la portée conique', 'Mill the conical seat'),
    text: l(
      `Fraisez la **portée conique** au pied du mamelon, une fois toute la pile montée et serrée. Les cônes des raccords du commerce ne sont pas assez coniques : passez dans l’ouverture une fraise à métaux, sur perceuse à colonne, au même angle que la tête. Un cône donne une bande de contact ${fr(VALVE_DERIVED.coneGain, 1)} fois plus large qu’un anneau plat de même largeur radiale (demi-angle de ${VALVE.headConeHalfAngleDeg}°, estimation). Dans la vidéo, un clapet plat avec joint a lâché en 24 h.`,
      `Mill the **conical seat** at the foot of the nipple, once the whole stack is assembled and tightened. The cones of commercial fittings are not conical enough: pass a metal-cutting cutter through the opening, in a drill press, at the same angle as the head. A cone gives a contact band ${en(VALVE_DERIVED.coneGain, 1)} times wider than a flat ring of the same radial width (${VALVE.headConeHalfAngleDeg}° half-angle, estimate). In the video, a flat valve with a seal failed within 24 hours.`,
    ),
    parts: ['valve-seat'],
    tools: [
      l('Fraise à métaux à l’angle de la tête de clapet', 'Metal-cutting cutter at the angle of the valve head'),
      l('Perceuse à colonne', 'Drill press'),
      l('Marqueur', 'Marker pen'),
    ],
    tip: l(
      'Noircissez au marqueur le cône de la tête, enfoncez-la et tournez : le trait doit s’effacer partout. La portée de la vidéo suinte un peu, le modèle la suppose parfaite.',
      'Blacken the head’s cone with a marker, push it in and turn it: the mark must wear off everywhere. The video’s seat weeps a little, the model assumes a perfect one.',
    ),
    duration: '≈ 1 h (est.)',
  },
  {
    id: 'head',
    title: l('Fabriquer la tête du clapet', 'Make the valve head'),
    text: l(
      `La **tête** du clapet est une vis inox à tête fraisée. Ne gardez que la tête, percée dans son axe à 3 mm puis à 6 mm pour recevoir la tige. Sa face plate, dessous, doit être coupée droite : elle appuie sur l’écrou qui la serre, et le contact du cône en dépend. La tête (Ø ${mm(VALVE.headDiameter).fr} mm, estimation) ne passe pas dans l’alésage de ${fr(VALVE.seatBore[1] * 1000)} mm de la portée : elle se fixe par-dessous, à l’étape des ailettes.`,
      `The valve **head** is a stainless countersunk screw. Keep only the head, drilled on its axis at 3 mm then 6 mm to take the stem. Its flat face, underneath, must be cut straight: it bears on the nut that clamps it, and the cone’s contact depends on it. The head (Ø ${mm(VALVE.headDiameter).en} mm, estimate) does not pass through the ${en(VALVE.seatBore[1] * 1000)} mm bore of the seat: it is fitted from below, at the fins step.`,
    ),
    parts: ['valve-head'],
    tools: [
      l('Perceuse à colonne, étau, mèches de 3 et 6 mm', 'Drill press, vice, 3 and 6 mm drill bits'),
      l('Scie à métaux', 'Hacksaw'),
      l('Pied à coulisse', 'Calipers'),
    ],
    tip: l(
      'Dans la vidéo, la vis, serrée dans le mandrin, se centre sur un foret de 3 mm tenu à l’étau ; une scie fixée à l’étau la coupe d’équerre pendant qu’elle tourne.',
      'In the video the screw, gripped in the chuck, centres itself on a 3 mm bit held in the vice; a saw clamped in the vice cuts it square while it turns.',
    ),
    warning: l(
      'Deux essais de la vidéo ont échoué : axe trempé et joint plat (joint mort en 24 h), tête soudée de travers. Ne soudez pas la tête, évitez le joint plat.',
      'Two of the video’s trials failed: hardened-steel shaft and flat seal (seal failed in 24 h), head welded off-axis. Do not weld the head, avoid a flat seal.',
    ),
    duration: '≈ 2 h (est.)',
  },
  {
    id: 'stem',
    title: l('Monter la tige et ses manchons', 'Fit the stem and its sleeves'),
    text: l(
      `La **tige**, une tige filetée de 6 mm, s’userait vite dans le guide : enfilez-y les **manchons de la tige**, deux manchons femelles usinés au diamètre intérieur du guide, à un dixième de millimètre près (${mm(VALVE.stemSleeveDiameter).fr} mm pour un alésage de ${mm(VALVE.guideTubeInnerDiameter).fr} mm, estimation). Descendez-la : elle ressort sous la portée, où la tête se serre par-dessous. Ce jeu de 0,1 mm garde la tête dans l’axe, à ${fr(VALVE_DERIVED.headShift * 1000, 1)} mm près (estimation) ; plus lâche, la tige se coucherait.`,
      `The **stem**, a 6 mm threaded rod, would wear out quickly in the guide: slip the **stem sleeves** onto it, two machined female sleeves matching the guide’s bore to within a tenth of a millimetre (${mm(VALVE.stemSleeveDiameter).en} mm for a ${mm(VALVE.guideTubeInnerDiameter).en} mm bore, estimate). Lower it: it comes out under the seat, where the head is clamped from below. That 0.1 mm clearance keeps the head on the axis to within ${en(VALVE_DERIVED.headShift * 1000, 1)} mm (estimate); looser, the stem would lie over.`,
    ),
    parts: ['valve-stem', 'stem-sleeves'],
    tools: [
      l(
        'Tour ou perceuse à colonne pour ajuster les manchons (outil non précisé)',
        'Lathe or drill press to fit the sleeves (tool not stated)',
      ),
      l('Pied à coulisse (ajustement à 0,1 mm)', 'Calipers (fit to 0.1 mm)'),
      l('Clés plates', 'Open-ended spanners'),
    ],
    tip: l(
      'Mesurez l’alésage du doigt de gant à plusieurs endroits avec un pied à coulisse qui lit le dixième : un tube du commerce n’est pas rond au dixième près.',
      'Measure the thermowell bore in several places with calipers that read the tenth: an off-the-shelf tube is not round to the tenth.',
    ),
    duration: '≈ 2 h (est.)',
  },
  {
    id: 'guide',
    title: l('Couper et poser le guide', 'Cut and fit the guide'),
    text: l(
      `Le **guide** de la tige est un doigt de gant inox, vendu pour loger les sondes de température des chauffe-eau solaires et des chaudières. Coupez-le à longueur, son extrémité émergeant peu au-dessus des lumières, enfilez-le par le haut sur la tige et ses manchons et vissez-le dans le manchon femelle-femelle : la tige coulisse dans son alésage. Son extrémité sert de butée à l’écrou de course, donc fixe la course : la face doit être plane et perpendiculaire à l’axe.`,
      `The stem **guide** is a stainless-steel thermowell, sold to hold the temperature probes of solar water heaters and boilers. Cut it to length so that its end stands only a little above the ports, slide it down over the stem and its sleeves and screw it into the female-female sleeve: the stem slides in its bore. Its end is the stop for the stroke nut, so it sets the stroke: the face must be flat and square to the axis.`,
    ),
    parts: ['valve-guide'],
    tools: [
      l('Scie à métaux, étau', 'Hacksaw, vice'),
      l('Lime plate, équerre', 'Flat file, square'),
      l('Pied à coulisse', 'Calipers'),
    ],
    tip: l(
      'Contrôlez l’équerrage et reprenez la face à la lime : l’écrou de course retombe dessus à chaque coup. Dans la vidéo, une première coupe de travers risquait de coincer le poids.',
      'Check the squareness and dress the face with a file: the stroke nut lands on it at every cycle. In the video, a first crooked cut risked jamming the weight.',
    ),
    duration: '≈ 30 min (est.)',
  },
  {
    id: 'fins',
    title: l('Limer les ailettes et serrer la tête', 'File the fins and clamp the head'),
    text: l(
      `Limez de petites **ailettes** sur l’écrou qui serre la tête, puis vissez-le par-dessous, en bas de la tige, pour serrer la tête. Sur le clapet Walton d’origine, les ailettes font tourner légèrement le clapet à chaque remontée : la portée ne frappe alors jamais deux fois au même endroit. Dans la vidéo, l’auteur prévoit d’en limer sous le sien, effet non vérifié. Le labo en dessine ${VALVE.finsCount} (estimation : nombre et angle ne sont pas donnés).`,
      `File small **fins** on the nut that clamps the head, then screw it on from below, at the bottom of the stem, to clamp the head. On the original Walton valve the fins turn the valve slightly at every rise, so the seat never strikes the same spot twice. In the video the author plans to file some under his own, effect not checked. The lab draws ${VALVE.finsCount} (estimate: number and angle are not given).`,
    ),
    parts: ['valve-fins'],
    tools: [l('Limes', 'Files'), l('Étau', 'Vice'), l('Clé plate', 'Open-ended spanner')],
    tip: l(
      'Donnez la même inclinaison à toutes les ailettes, dans le même sens : si elles se contrarient, le jet ne fait pas tourner le clapet.',
      'Give every fin the same slant, in the same direction: if they oppose one another, the jet will not turn the valve.',
    ),
    duration: '≈ 30 min (est.)',
  },
  {
    id: 'weight',
    title: l('Usiner le poids dans une barre d’armature', 'Machine the weight from a length of rebar'),
    text: l(
      `Le **poids** est un tronçon de barre d’armature de 30 à 32 mm, percé et taraudé pour se visser sur la tige, face basse plane. Il rabaisse le clapet après chaque coup : selon la vidéo, il joue un peu sur la vitesse de fermeture ; dans le modèle, c’est un levier majeur. À course égale : ${fr(MODEL.strokesPerMin)} coups/min et ${fr(MODEL.driveFlow, 1)} L/min avec ${fr(WEIGHT)} g (calibré) ; ${fr(MODEL.heavyWeightStrokes)} coups/min et ${fr(MODEL.heavyWeightFlow, 1)} L/min, deux fois la source, avec le double.`,
      `The **weight** is a piece of 30–32 mm rebar, drilled and tapped to screw onto the stem, lower face flat. It pulls the valve down after each cycle: according to the video it plays a small part in the closing speed; in the model it is a major lever. At the same stroke: ${en(MODEL.strokesPerMin)} strokes/min and ${en(MODEL.driveFlow, 1)} L/min with ${en(WEIGHT)} g (calibrated); ${en(MODEL.heavyWeightStrokes)} strokes/min and ${en(MODEL.heavyWeightFlow, 1)} L/min, twice the spring, with double.`,
    ),
    parts: ['counterweight'],
    tools: [
      l('Perceuse à colonne, étau', 'Drill press, vice'),
      l('Taraud de bonne qualité (M6)', 'Good-quality tap (M6)'),
      l('Scie à métaux, lime ou fraise pour dresser la face', 'Hacksaw, file or cutter to dress the face'),
      l('Balance', 'Scales'),
    ],
    tip: l(
      'Dans la vidéo, un premier poids fait de gros écrous et de rondelles se mettait de travers et arrêtait le bélier ; un petit coffret de taraudage n’a pas suffi pour l’acier.',
      'In the video, a first weight made of big nuts and washers sat crooked and stopped the ram; a small tap-and-die set was not enough for steel.',
    ),
    // the only duration that comes from the video (17:21); the others are estimates
    duration: '1 h (vidéo)',
  },
  {
    id: 'stroke-nut',
    title: l('Poser l’écrou de course et régler la course', 'Fit the stroke nut and set the stroke'),
    text: l(
      `Dévissez le poids, enfilez l’**écrou de course** jusqu’au guide et revissez le poids dessus : la hauteur de l’écrou fixe la course, l’écart entre la tête et la portée, clapet ouvert. Dans la vidéo, c’est le poids qui joue le rôle d’écrou principal ; le labo en fait deux pièces. Plage du modèle (source de la vidéo) : ${fr(MODEL.noDeliveryStroke, 1)} à ${fr(MODEL.springLimitStroke, 1)} mm, soit ${fr(VALVE_DERIVED.windowTurns, 1)} tour (pas de ${fr(VALVE.rodPitch * 1000)} mm supposé ; 0,35 à 1,25 tour selon le couple course–poids).`,
      `Unscrew the weight, thread the **stroke nut** down to the guide and screw the weight back on it: the nut’s height sets the stroke, the head-to-seat gap with the valve open. In the video it is the weight that plays the part of the main nut; the lab makes them two parts. Model range for the video’s spring: ${en(MODEL.noDeliveryStroke, 1)} to ${en(MODEL.springLimitStroke, 1)} mm, that is ${en(VALVE_DERIVED.windowTurns, 1)} turn (${en(VALVE.rodPitch * 1000)} mm pitch assumed; 0.35 to 1.25 turn depending on the stroke–weight pair).`,
    ),
    parts: ['stroke-nut'],
    tools: [
      l('Deux clés plates', 'Two open-ended spanners'),
      l(
        'Cales d’épaisseur ou pied à coulisse pour mesurer la course',
        'Feeler gauge or calipers to measure the stroke',
      ),
    ],
    tip: l(
      `À l’arrêt, clapet fermé : l’écart écrou–guide est la course (cales d’épaisseur ; ≈ ${fr(STROKE, 1)} mm pour le clapet n°1, calibré). Tournez par fractions de tour : 0,1 mm = un dixième.`,
      `At standstill, valve closed: the nut-to-guide gap is the stroke (feeler gauges; ≈ ${en(STROKE, 1)} mm for the No. 1 valve, calibrated). Turn by fractions of a turn: 0.1 mm = a tenth.`,
    ),
    duration: '≈ 15 min (est.)',
  },
  {
    id: 'lock-nut',
    title: l('Bloquer le réglage avec le contre-écrou', 'Lock the setting with the lock nut'),
    text: l(
      `Serrez le **contre-écrou** sur le poids, en haut de la tige, pour bloquer l’ensemble contre l’écrou de course. À 100 coups par minute et plus, les vibrations peuvent desserrer un écrou et dérégler la course, donc la consommation. Tracez un trait de peinture en travers des écrous et de la tige : s’il se casse, quelque chose a bougé.\n\nLe clapet est terminé : posez-le de côté, il ira sur le bélier à l’étape 22. On passe au bélier lui-même.`,
      `Tighten the **lock nut** on the weight, at the top of the stem, to lock the whole stack against the stroke nut. At 100 cycles a minute and more, vibration can loosen a nut and upset the stroke, and with it the consumption. Draw a paint line across the nuts and the stem: if it breaks, something has moved.\n\nThe valve is finished: set it aside, it will go onto the ram at step 22. Now for the ram.`,
    ),
    parts: ['lock-nut'],
    tools: [
      l('Deux clés plates', 'Two open-ended spanners'),
      l('Peinture ou feutre pour le repère', 'Paint or felt-tip pen for the mark'),
    ],
    tip: l(
      'Tenez l’écrou de course avec une seconde clé pendant que vous serrez le contre-écrou : sans cela, la course bouge d’un dixième au moment où vous croyez la fixer.',
      'Hold the stroke nut with a second spanner while you tighten the lock nut: without that, the stroke moves by a tenth just as you think you are fixing it.',
    ),
    warning: l(
      'Réglez avec des clés, jamais avec les doigts : le poids monte et descend à chaque coup, et la tête du clapet se ferme en quelques centièmes de seconde.',
      'Adjust with spanners, never with your fingers: the weight rises and falls at every cycle, and the valve head shuts in a few hundredths of a second.',
    ),
    duration: '≈ 10 min (est.)',
  },

  // ======================================================================================= the ram world
  {
    id: 'foundation',
    scene: 'ram',
    title: l('Couler le massif d’ancrage', 'Pour the anchor block'),
    text: l(
      `On quitte l’atelier du clapet pour la fosse du bélier (étape 8 du guide Installation). Le **massif d’ancrage** est le bloc de béton où se boulonnent les pieds du bélier, sur quatre tiges M10 scellées (modèle : plot de ${mmBox(FOUNDATION.length, FOUNDATION.width, FOUNDATION.thickness).fr} mm, estimation). Il est là parce qu’un bélier frappe : ≈ ${fr(DERIVED.thrustKn, 2)} kN de poussée à chaque coup (résultat du modèle). La vidéo ne montre aucun massif ; le labo n’en donne aucune dimension à reproduire.`,
      `We move from the valve workshop to the ram pit (see step 8 of the Installation guide). The **anchor block** is the concrete pad where the ram’s two feet are bolted, on four cast-in M10 studs (model: a pad of ${mmBox(FOUNDATION.length, FOUNDATION.width, FOUNDATION.thickness).en} mm, estimate). It is there because a ram strikes: ≈ ${en(DERIVED.thrustKn, 2)} kN of push at every stroke (model result). The video shows no block; the lab gives no dimension to copy.`,
    ),
    parts: ['foundation'],
    tools: [
      l('Coffrage, béton, niveau à bulle', 'Formwork, concrete, spirit level'),
      l('Gabarit percé aux entraxes des pieds', 'Template drilled at the feet spacing'),
    ],
    tip: l(
      'Tenez les tiges dans un gabarit percé aux entraxes des pieds pendant la prise : quelques millimètres d’écart empêchent les pieds de s’y poser. Gardez la fosse drainée.',
      'Hold the studs in a template drilled at the feet spacing while the concrete sets: a few millimetres of error stop the feet from seating. Keep the pit drained.',
    ),
    warning: l(
      'Ne posez jamais un bélier sur de simples cales : mal ancré, il marche, tire sur la conduite et finit par rompre un joint ou un tuyau. Attendez la prise du béton avant de serrer.',
      'Never stand a ram on mere shims: badly anchored, it walks, pulls on the pipe and ends up breaking a gasket or a pipe. Let the concrete set before tightening anything.',
    ),
    duration: '≈ 3 h (est.)',
  },
  {
    id: 'body',
    scene: 'ram',
    title: l('Boulonner le corps du bélier', 'Bolt down the ram body'),
    text: l(
      `Posez le **corps du bélier** sur les tiges du massif et serrez ses deux pieds, en vérifiant le niveau. Cette pièce coulée reçoit l’eau de la conduite motrice et porte le reste : clapet de choc, clapet anti-retour de refoulement, cloche. La vidéo part d’un bélier du commerce (Walton n°3) dont elle ne remplace que le clapet de choc ; le labo montre un bélier générique de 1″, pas le Walton n°3, aux dimensions estimées (aucune fiche du constructeur).`,
      `Set the **ram body** on the studs of the block and tighten its two feet, checking the level. This cast part receives the water from the drive pipe and carries the rest: waste valve, delivery check valve, chamber. The video starts from a commercial ram (Walton No. 3) of which it replaces only the waste valve; the lab shows a generic 1″ ram, not the Walton No. 3, with estimated dimensions (no maker data sheet).`,
    ),
    parts: ['ram'],
    tools: [
      l('Niveau à bulle', 'Spirit level'),
      l('Clés plates', 'Open-ended spanners'),
      l('Brosse métallique, chiffons', 'Wire brush, rags'),
    ],
    tip: l(
      'Serrez les pieds en croix, par petites fractions de tour : un corps coulé bridé de travers se fissure. Il doit reposer à plat sur le massif avant que vous serriez.',
      'Tighten the feet crosswise, in small fractions of a turn: a cast body clamped crooked cracks. It must sit flat on the block before you tighten.',
    ),
    duration: '≈ 45 min (est.)',
  },
  {
    id: 'inlet',
    scene: 'ram',
    title: l(
      'Monter la vanne d’arrivée, le filtre en Y et la bride',
      'Fit the inlet valve, the Y-strainer and the flange',
    ),
    text: l(
      `Boulonnez sur la bride d’entrée du corps la **vanne d’arrivée** (V1), puis le **filtre en Y**, puis la **bride d’arrivée** de la conduite motrice (20 m dans la vidéo), avec son joint plat et ses quatre boulons (DN25, estimations : bride de Ø ${mm(INLET.flangeDiameter).fr} mm, joint de ${mm(INLET.gasketThickness).fr} mm). V1 arrête le bélier sans vider la réserve ; le filtre arrête feuilles, sable et gravillons avant qu’ils ne coincent le clapet de choc ou le clapet de refoulement.`,
      `Bolt the **inlet valve** (V1) onto the body’s inlet flange, then the **Y-strainer**, then the **inlet flange** of the drive pipe (20 m long in the video), with its flat gasket and its four bolts (DN25, estimates: ${mm(INLET.flangeDiameter).en} mm flange, ${mm(INLET.gasketThickness).en} mm gasket). V1 stops the ram without emptying the tank; the strainer catches leaves, sand and grit before they jam the waste valve or the delivery check valve.`,
    ),
    parts: ['inlet-valve', 'strainer', 'inlet-flange'],
    tools: [
      l('Clés plates et à tube', 'Open-ended spanners and pipe wrenches'),
      l('Joints plats neufs', 'New flat gaskets'),
      l('Papier absorbant pour le contrôle d’étanchéité', 'Paper towels for the leak check'),
    ],
    tip: l(
      'Serrez les boulons de chaque bride en croix, par petites fractions de tour, et soutenez la conduite motrice avant la bride : le bélier ne doit pas porter le tuyau.',
      'Tighten the bolts of each flange crosswise, in small fractions of a turn, and support the drive pipe ahead of the flange: the ram must not carry the pipe.',
    ),
    warning: l(
      `La conduite motrice doit être rigide, en acier ou en fonte : dans un tuyau souple l’onde est plus lente, donc le choc plus faible. Wikipédia note que le PVC marche dans certaines installations, l’acier restant préféré ; le scénario « Conduite en PVC » ne refoule rien, pour un clapet réglé pour l’acier.`,
      `The drive pipe must be rigid, steel or cast iron: in a flexible pipe the wave is slower, so the surge is weaker. Wikipedia notes that PVC works in some installations, steel remaining preferred; the “PVC drive pipe” scenario delivers nothing, for a valve set for steel.`,
    ),
    duration: '≈ 45 min (est.)',
  },
  {
    id: 'delivery-side',
    scene: 'ram',
    title: l('Monter le clapet de refoulement et la cloche à air', 'Fit the delivery check valve and the air chamber'),
    text: l(
      `Le **clapet anti-retour de refoulement** se monte sur le corps, côté refoulement. Il s’ouvre quand le coup de bélier fait monter la pression du corps au-dessus de celle du refoulement, pendant environ ${fr(MODEL.deliverSharePct)} % du cycle, puis se referme pour que la colonne d’eau ne redescende pas. La **cloche à air**, montée au-dessus, est le coussin qui transforme les à-coups (${fr(MODEL.mlPerStroke, 1)} mL par coup) en débit continu ; le modèle lui donne ${fr(CHAMBER.volumeL)} L, dont ${AIR_PERCENT} % d’air (hypothèses).`,
      `The **delivery check valve** is fitted on the body, on the delivery side. It opens when the water hammer pushes the body pressure above the delivery pressure, for about ${en(MODEL.deliverSharePct)}% of the cycle, then shuts so that the water column cannot run back down. The **air chamber**, fitted above it, is the cushion that turns the jolts (${en(MODEL.mlPerStroke, 1)} mL per stroke) into a steady flow; the model gives it ${en(CHAMBER.volumeL)} L, of which ${AIR_PERCENT}% is air (assumptions).`,
    ),
    parts: ['delivery-valve', 'air-chamber'],
    tools: [
      l('Clés à tube', 'Pipe wrenches'),
      l('Ruban d’étanchéité ou pâte à joint pour filetages', 'Thread seal tape or paste'),
    ],
    tip: l(
      `Cloche noyée : coups plus durs, moins de refoulement. Dans le modèle, sans air, la pointe passe de ${fr(MODEL.peakBar, 1)} à ${fr(MODEL.loggedPeakBar, 1)} bar et le refoulement baisse de ${fr(MODEL.loggedDeliveryDropPct)} %.`,
      `Water-logged chamber: harsher strokes, less delivery. In the model, with no air, the peak goes from ${en(MODEL.peakBar, 1)} to ${en(MODEL.loggedPeakBar, 1)} bar and the delivery drops by ${en(MODEL.loggedDeliveryDropPct)}%.`,
    ),
    duration: '≈ 45 min (est.)',
  },
  {
    id: 'snifter',
    scene: 'ram',
    title: l('Poser le reniflard', 'Fit the snifter valve'),
    text: l(
      `Le **reniflard** est une minuscule soupape, sur le dessus du corps, qui laisse entrer une pincée d’air pendant le recul, quand la pression du corps passe sous celle de l’air libre (−${fr(MODEL.recoilDipBar, 2)} bar dans le modèle) ; cet air est poussé dans la cloche, qu’il recharge. Sans lui, la cloche se noie peu à peu (en une quinzaine d’heures avec un reniflard bouché : résultat du modèle, constante de 6 h supposée).`,
      `The **snifter valve** is a tiny valve, on top of the body, that lets a pinch of air in during the recoil, when the body pressure drops below atmospheric (−${en(MODEL.recoilDipBar, 2)} bar in the model); that air is pushed into the chamber, which it tops up. Without it the chamber gradually becomes water-logged (in about fifteen hours with a blocked snifter: model result, a 6 h time constant assumed).`,
    ),
    parts: ['snifter'],
    tools: [l('Clé plate', 'Open-ended spanner'), l('Ruban d’étanchéité', 'Thread seal tape')],
    tip: l(
      'Bélier en marche, une goutte d’eau sur l’orifice doit être aspirée à chaque recul, sinon le reniflard est bouché (astuce de terrain courante, non vérifiée par les sources du laboratoire).',
      'With the ram running, a drop of water on the orifice must be sucked in at each recoil, otherwise the snifter is blocked (common field trick, not checked against the lab’s sources).',
    ),
    duration: '≈ 15 min (est.)',
  },
  {
    id: 'gauge',
    scene: 'ram',
    title: l('Poser le manomètre côté refoulement', 'Fit the pressure gauge on the delivery side'),
    text: l(
      `Vissez le **manomètre** sur la cloche, côté refoulement : il lit la hauteur d’eau déjà montée (1 bar ≈ 10 m) et atteint environ ${fr(DERIVED.deliveryBar, 1)} bar quand les 65 m de conduite sont pleins. Placé là, il mesure l’effet utile plutôt que le choc du corps, que la cloche amortit (environ ${fr(DERIVED.chamberSwingBar, 2)} bar de variation par coup, résultat du modèle). Le cadran de ${fr(FITTINGS.gaugeFullScaleBar)} bar de l’illustration (estimation) place les ${fr(DERIVED.deliveryBar, 1)} bar aux deux tiers de l’échelle.`,
      `Screw the **pressure gauge** onto the chamber, on the delivery side: it reads the height of water already lifted (1 bar ≈ 10 m) and reaches about ${en(DERIVED.deliveryBar, 1)} bar once the 65 m of pipe are full. Placed there, it measures the useful effect rather than the body’s shock, which the chamber cushions (about ${en(DERIVED.chamberSwingBar, 2)} bar of variation per stroke, model result). The illustration’s ${en(FITTINGS.gaugeFullScaleBar)} bar dial (estimate) puts the ${en(DERIVED.deliveryBar, 1)} bar at two thirds of the scale.`,
    ),
    parts: ['gauge'],
    tools: [l('Clé plate', 'Open-ended spanner'), l('Ruban d’étanchéité', 'Thread seal tape')],
    tip: l(
      'Prenez un manomètre à bain de glycérine, qui encaisse mieux les vibrations d’un bélier, et montez-le sur un raccord qui se démonte sans couper la conduite.',
      'Choose a glycerine-filled gauge, which copes better with a ram’s vibration, and fit it on a connection that can be removed without cutting the line.',
    ),
    warning: l(
      `Ne démontez jamais le manomètre sous pression : la cloche garde ${fr(DERIVED.deliveryBar, 1)} bar derrière le clapet de refoulement, même bélier arrêté et vidange ouverte.`,
      `Never remove the gauge under pressure: the chamber keeps ${en(DERIVED.deliveryBar, 1)} bar behind the delivery check valve, even with the ram stopped and the drain open.`,
    ),
    duration: '≈ 15 min (est.)',
  },
  {
    id: 'outlet',
    scene: 'ram',
    title: l('Monter la vanne de sortie et le raccord union', 'Fit the outlet valve and the union'),
    text: l(
      `Vissez la **vanne de sortie** (V3) sur la cloche, puis le **raccord union**, qui se termine par un raccord à compression pour le tuyau PE de ${mm(SITE.deliveryOuterDiameter).fr} mm (estimation). V3 ferme la conduite de refoulement, qui reste pleine (65 m, ≈ ${fr(DERIVED.deliveryBar, 1)} bar) quand on intervient sur le bélier. L’union sépare le bélier de la conduite de 300 m sans rien tourner ni couper. La remplir (≈ ${fr(DERIVED.pipeLitres)} L, estimation) prend environ trois heures au rythme du clapet n°1.`,
      `Screw the **outlet valve** (V3) onto the chamber, then the delivery **union**, which ends in a compression fitting for the ${mm(SITE.deliveryOuterDiameter).en} mm PE pipe (estimate). V3 closes the delivery pipe, which stays full (65 m, ≈ ${en(DERIVED.deliveryBar, 1)} bar) while you work on the ram. The union separates the ram from the 300 m pipe without turning or cutting anything. Filling it (≈ ${en(DERIVED.pipeLitres)} L, estimate) takes about three hours at the No. 1 valve’s rate.`,
    ),
    parts: ['outlet-valve', 'delivery-union'],
    tools: [
      l('Clés plates', 'Open-ended spanners'),
      l('Ruban d’étanchéité', 'Thread seal tape'),
      l('Rondelle d’étanchéité de rechange', 'Spare sealing washer'),
    ],
    tip: l(
      'Soutenez la conduite juste après l’union : un tuyau qui pend tire sur le raccord à chaque coup et finit par le faire fuir.',
      'Support the pipe just after the union: a pipe that hangs pulls on the joint at every stroke and ends up making it leak.',
    ),
    warning: l(
      'Ne desserrez jamais l’union sans avoir arrêté le bélier : la conduite de refoulement, pleine et sous pression derrière elle, s’y vide en un jet violent. Desserrez lentement, un chiffon autour.',
      'Never loosen the union without stopping the ram: the delivery pipe, full and under pressure behind it, empties through it in a violent jet. Loosen it slowly, with a cloth around it.',
    ),
    duration: '≈ 30 min (est.)',
  },
  {
    id: 'drain',
    scene: 'ram',
    title: l('Poser la vanne de vidange', 'Fit the drain valve'),
    text: l(
      `Vissez la **vanne de vidange** (V2) sur le couvercle d’extrémité du corps, sortie orientée vers le drain de la fosse. Ouverte, V1 fermée, elle vide le corps et fait retomber sa pression (${fr(DERIVED.inletBar, 2)} bar à l’arrivée, à l’arrêt) avant toute intervention sur le clapet de choc ou les brides. La cloche, elle, garde ses ${fr(DERIVED.deliveryBar, 1)} bar derrière le clapet de refoulement, avec la colonne de la conduite : V2 ne la purge pas.`,
      `Screw the **drain valve** (V2) onto the end cover of the body, outlet pointing at the pit drain. Opened, with V1 closed, it empties the body and lets its pressure fall (${en(DERIVED.inletBar, 2)} bar at the inlet, at rest) before any work on the waste valve or the flanges. The chamber keeps its ${en(DERIVED.deliveryBar, 1)} bar behind the delivery check valve, with the pipe’s column: V2 does not purge it.`,
    ),
    parts: ['drain-valve'],
    tools: [l('Clés plates', 'Open-ended spanners'), l('Ruban d’étanchéité', 'Thread seal tape')],
    tip: l(
      'Vissez un bouchon sur la sortie de V2 en service : une vanne qui suinte perd de l’eau en permanence, et le bouchon le retient.',
      'Screw a plug on the outlet of V2 in service: a valve that weeps loses water all the time, and the plug holds it.',
    ),
    warning: l(
      `Avant de démonter : fermez V1 (le bélier s’arrête), fermez V3 (la conduite reste pleine), puis ouvrez V2 lentement. Le corps se vide ; la cloche et la conduite restent à environ ${fr(DERIVED.deliveryBar, 1)} bar derrière le clapet de refoulement.`,
      `Before taking anything apart: shut V1 (the ram stops), shut V3 (the pipe stays full), then open V2 slowly. The body empties; the chamber and the pipe stay at about ${en(DERIVED.deliveryBar, 1)} bar behind the delivery check valve.`,
    ),
    duration: '≈ 15 min (est.)',
  },
  {
    id: 'waste-valve',
    scene: 'ram',
    title: l('Boulonner le clapet de choc sur le corps', 'Bolt the waste valve onto the body'),
    text: l(
      `Le clapet construit aux étapes 1 à 13 revient ici : posez le **clapet de choc** (14 pièces) sur la bride du corps avec son joint, et serrez en croix les quatre écrous de la platine. Il remplace celui du Walton : la platine reprend les trous de l’ancienne. Vérifiez que le poids retombe librement, sans frottement : le clapet reste ouvert au repos et se ferme seul quand le courant atteint environ ${fr(MODEL.closingVelocity, 2)} m/s (résultat du modèle).`,
      `The valve built in steps 1 to 13 comes back here: set the **waste valve** (14 parts) on the body flange with its gasket, and tighten the plate’s four nuts crosswise. It replaces the Walton’s: the plate reuses the old one’s holes. Check that the weight falls freely, with no rubbing: the valve must stay open at rest and shut by itself when the flow reaches about ${en(MODEL.closingVelocity, 2)} m/s (model result).`,
    ),
    parts: ['waste-valve'],
    tools: [
      l('Clés plates', 'Open-ended spanners'),
      l('Joint plat neuf', 'New flat gasket'),
      l('Règle ou équerre pour contrôler la planéité', 'Straightedge or square to check flatness'),
    ],
    tip: l(
      'Avant d’ouvrir l’eau, soulevez le poids à la main et lâchez-le : la tige doit retomber d’un trait jusqu’à la butée ; sinon, cherchez le défaut d’axe.',
      'Before opening the water, lift the weight by hand and let go: the stem must fall back in one go down to the stop; if not, look for an axis error.',
    ),
    warning: l(
      'Jamais un doigt dans les lumières du clapet de choc, ni sous le poids, quand le bélier tourne : il se ferme en quelques centièmes de seconde avec plusieurs bars derrière.',
      'Never put a finger in the waste valve ports, or under the weight, while the ram runs: it shuts in a few hundredths of a second with several bars behind it.',
    ),
    duration: '≈ 30 min (est.)',
  },
  {
    id: 'first-start',
    scene: 'ram',
    title: l('Premier démarrage', 'First start'),
    text: l(
      `Fermez la vidange V2, ouvrez V3, puis ouvrez V1 doucement. Le clapet retombe ouvert, l’eau accélère et finit par plaquer la tête sur sa portée : c’est le premier coup. Si les coups ne s’enchaînent pas, enfoncez le poids à la main par le dessus, puis relâchez-le (pratique courante ; la vidéo dit seulement qu’il fallait remettre le bélier en marche). Vous devez voir et entendre un battement net et régulier, et des jets sortir des lumières.`,
      `Close the drain V2, open V3, then open V1 gently. The valve drops open, the water accelerates and finally slams the head onto its seat: that is the first cycle. If the cycles do not follow one another, press the weight down by hand from above, then let go (common practice; the video only says the ram had to be restarted). You should see and hear a clean, regular beat, and jets leaving the ports.`,
    ),
    parts: [],
    tools: [
      l('Clés plates', 'Open-ended spanners'),
      l('Papier absorbant pour les brides et l’union', 'Paper towels for the flanges and the union'),
    ],
    tip: l(
      'Brides et union doivent rester sèches : essuyez-les avec du papier absorbant et regardez où l’humidité revient.',
      'Flanges and union must stay dry: wipe them with a paper towel and see where the damp comes back.',
    ),
    warning: l(
      'Jamais un doigt dans les lumières du clapet de choc quand le bélier tourne : il se ferme en quelques centièmes de seconde avec plusieurs bars derrière. Enfoncez le poids par le dessus, jamais par les lumières.',
      'Never put a finger in the ports of the waste valve while the ram is running: it shuts in a few hundredths of a second with several bars behind it. Press the weight from above, never through the ports.',
    ),
    duration: '≈ 15 min (est.)',
  },
  {
    id: 'check-rate',
    scene: 'ram',
    title: l('Contrôler la cadence et régler la course', 'Check the rate and set the stroke'),
    text: l(
      `Visez 100 à 110 coups par minute et environ 500 L par jour (valeurs de la vidéo, clapet n°1). Comptez les coups au chronomètre, puis réglez la course : trop longue, le bélier boit la cuve (le n°3 de la vidéo prenait ≈ 17 L/min, estimation de l’auteur, et la vidait en dix heures) ; trop courte, il frappe sans rien refouler. Le manomètre monte à mesure que la conduite se remplit (environ trois heures, estimation) jusqu’à ${fr(DERIVED.deliveryBar, 1)} bar.`,
      `Aim for 100–110 strokes a minute and about 500 L a day (the video’s figures, No. 1 valve). Count the cycles with a stopwatch, then set the stroke: too long, and the ram drinks the tank dry (the video’s No. 3 took ≈ 17 L/min, the author’s estimate, and emptied it in ten hours); too short, and it strikes and delivers nothing. The gauge climbs as the pipe fills (about three hours, estimate) up to ${en(DERIVED.deliveryBar, 1)} bar.`,
    ),
    parts: [],
    tools: [
      l('Chronomètre pour compter les coups', 'Stopwatch to count the cycles'),
      l('Clés pour l’écrou de course et le contre-écrou', 'Spanners for the stroke nut and the lock nut'),
    ],
    tip: l(
      'Notez le premier jour la cadence, la pression du manomètre et l’heure : références pour détecter plus tard un filtre en Y colmaté, une cloche noyée ou un écrou déplacé.',
      'On the first day, note the rate, the gauge pressure and the time: reference values for spotting later a clogged Y-strainer, a water-logged chamber or a nut that has moved.',
    ),
    warning: l(
      'Arrêtez le bélier (V1 fermée) avant de tourner les écrous, et jamais un doigt dans les lumières.',
      'Stop the ram (V1 closed) before turning the nuts, and never put a finger in the ports.',
    ),
    duration: '≈ 15 min (est.)',
  },
];
