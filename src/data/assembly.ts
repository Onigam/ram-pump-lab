// Assembly guide of the ram and its waste valve (wave 3, data role): 23 steps that cross two worlds.
//
// The guide opens in the `valve` world (the default world of the guide): steps 1–13 build the video's waste valve, one
// part per step (the stem and its sleeves go together), in the order of the physical build and of the 3D explode: plate,
// socket, reducer, nipple, sleeve, guide, seat, head, stem and sleeves, fins, weight, stroke nut, lock nut. Steps 14–23
// play in the `ram` world (`scene: 'ram'`): the foundation, the body, the inlet line, the delivery side, the small
// fittings, then `waste-valve` (the whole valve, one part, bolted on the body) and the first start (no part).
// All 14 valve ids and all 13 ram ids are installed exactly once.
//
// The waste valve follows the video (S1, 06:20–19:05). The body, the delivery side, the snifter, the gauge, the union, the
// valves V1–V3 and the foundation are those of a generic 1" ram: the video does not show them (research §3).
// DURATIONS ARE ROUGH ESTIMATES (the lead and the owner are expected to refine them), except the weight: « une bonne
// heure » (S1 17:21). No torque is given: no source states one, and the `torque` field is never used. The only fit given
// is the stem sleeves in the guide, within 0.1 mm (S1 09:02), written in the text.
// Stroke ≈ 2.2 mm and weight ≈ 360 g for the n°1 valve are CALIBRATED by the model (docs/physics.md §3), not measured.
// Pressures, flows and rates are the model's (MODEL and DERIVED in ./parts/ram.ts, checked by parts-ram.test.ts).

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
      `Le clapet de choc se construit de bas en haut, et tout repose sur la **platine de base** : une plaque d’acier de la même taille que celle du clapet d’origine, percée aux mêmes endroits pour se boulonner sur le corps du bélier à la place de l’ancienne. Dans la vidéo, l’auteur reprend ainsi les emplacements de la platine du Walton ; le laboratoire en dessine une de ${mmBox(VALVE.basePlateSide, VALVE.basePlateSide, VALVE.basePlateThickness).fr} mm (estimation), avec quatre trous de fixation et un trou central de ${mm(VALVE.basePlateBore).fr} mm par où l’eau du corps montera dans le clapet. Les 14 pièces du clapet n°1 se montent dans l’ordre de ce guide : platine, manchon soudé, réduction, mamelon, manchon femelle-femelle, portée, tête, tige et manchons, guide, ailettes, poids, écrou de course, contre-écrou.`,
      `The waste valve is built from the bottom up, and everything rests on the **base plate**: a steel plate the same size as the original valve’s, drilled in the same places to bolt onto the ram body in place of the old one. In the video the author reuses the Walton plate’s positions this way; the lab draws one of ${mmBox(VALVE.basePlateSide, VALVE.basePlateSide, VALVE.basePlateThickness).en} mm (estimate), with four fixing holes and a ${mm(VALVE.basePlateBore).en} mm central hole through which the body water will rise into the valve. The 14 parts of the n°1 valve go on in the order of this guide: plate, welded socket, reducer, nipple, female-female sleeve, seat, head, stem and sleeves, guide, fins, weight, stroke nut, lock nut.`,
    ),
    parts: ['base-plate'],
    tools: [
      l('Scie à métaux ou meuleuse', 'Hacksaw or angle grinder'),
      l('Perceuse à colonne', 'Drill press'),
      l('Platine d’origine, comme gabarit', 'Original plate, as a template'),
      l('Pied à coulisse', 'Calipers'),
    ],
    tip: l(
      'Gardez l’ancien clapet tant que le nouveau ne tourne pas : posez la platine d’origine sur la plaque neuve et tracez le contour et les trous à travers elle. La vidéo y copie aussi la forme des ailettes.',
      'Keep the old valve until the new one runs: lay the original plate on the new one and mark the outline and the holes through it. The video copies the fins from it too.',
    ),
    duration: '1 h',
  },
  {
    id: 'socket',
    title: l('Souder le manchon 26×34 sur la platine', 'Weld the 26×34 socket onto the plate'),
    text: l(
      `Soudez le **manchon** 26×34 au centre de la platine, sur le grand trou, par un cordon continu. C’est la base de l’empilement : son volume reçoit l’eau du corps et l’accumule pour qu’elle pousse sur la tête et la plaque sur sa portée. Dans la vidéo, l’auteur soude un raccord 20×27, puis reconnaît qu’un 26×34 lui aurait permis de faire la base directement et d’économiser deux raccords ; le laboratoire montre cette version simplifiée. Réduction, mamelon, guide et tige partageront l’axe de ce manchon : tout défaut d’équerrage se retrouvera plus haut.`,
      `Weld the 26×34 **socket** to the centre of the plate, over the large hole, with a continuous bead. It is the base of the stack: its volume receives the water from the body and accumulates it so that it pushes on the head and presses it onto its seat. In the video the author welds a 20×27 fitting, then admits that a 26×34 would have let him make the base directly and save two fittings; the lab shows that simplified version. Reducer, nipple, guide and stem will share the axis of this socket: any squareness error will be found again higher up.`,
    ),
    parts: ['valve-socket'],
    tools: [
      l('Poste à souder', 'Welder'),
      l('Équerre', 'Square'),
      l('Meuleuse pour ébarber le cordon', 'Grinder to dress the bead'),
    ],
    tip: l(
      'Pointez le manchon en trois points, vérifiez-le à l’équerre dans deux directions, puis seulement terminez le cordon. Dans la vidéo, c’est une tête soudée un peu de travers qui ne fermait pas.',
      'Tack the socket at three points, check it with a square in two directions, and only then finish the bead. In the video, it was a head welded slightly off-axis that would not close.',
    ),
    warning: l(
      'La chaleur de la soudure peut gauchir la platine : soudez par petits tronçons en alternant les côtés, et vérifiez la planéité de sa face d’appui avant de continuer.',
      'The heat of the weld can warp the plate: weld in short runs, alternating sides, and check the flatness of its bearing face before going on.',
    ),
    duration: '1 h',
  },
  {
    id: 'reducer',
    title: l('Visser la réduction 26×34 → 15×21', 'Screw on the 26×34 → 15×21 reducer'),
    text: l(
      `Vissez la **réduction** dans le manchon, avec du ruban PTFE sur le filetage mâle. Elle passe du 26×34 au 15×21 : c’est ce dernier diamètre qui donne la taille du clapet : 15×21 pour le n°1 (dans la vidéo, le n°2 est un 20×27 et le n°3 d’origine un 26×34). Son cône intérieur est un entonnoir qui resserre l’eau vers la portée, et le volume qu’elle forme avec le manchon loge la tête et ses ailettes. Serrez-la à fond : elle ne devra plus bouger.`,
      `Screw the **reducer** into the socket, with PTFE tape on the male thread. It goes from 26×34 to 15×21: that last diameter gives the valve size: 15×21 for the n°1 (in the video the n°2 is a 20×27 and the original n°3 a 26×34). Its inner cone is a funnel that narrows the water toward the seat, and the volume it forms with the socket houses the head and its fins. Tighten it fully: it must not move again.`,
    ),
    parts: ['valve-reducer'],
    tools: [l('Clés à tube', 'Pipe wrenches'), l('Ruban PTFE', 'PTFE tape')],
    tip: l(
      'Serrez tous les raccords à fond avant de passer à la portée : la vidéo fraise la portée sur l’ensemble monté et serré, pour qu’elle ne bouge plus ensuite.',
      'Tighten every fitting fully before moving on to the seat: the video mills the seat on the assembled and tightened stack, so that it cannot shift afterwards.',
    ),
    duration: '15 min',
  },
  {
    id: 'nipple',
    title: l('Usiner les lumières du mamelon et le visser', 'Machine the nipple’s ports and screw it in'),
    text: l(
      `Le **mamelon** est un raccord mâle 15×21 fileté sur 7 à 8 cm, qui allonge le corps du clapet. Usinez-y les lumières, les fentes par où l’eau s’échappera quand le clapet sera ouvert (${VALVE.portCount} lumières de ${mm(VALVE.portWidth).fr} × ${mm(VALVE.portHeight).fr} mm dans le modèle, estimation), puis vissez-le dans la réduction et bloquez sa hauteur avec un contre-écrou 15×21. Son pied sera la portée conique : l’eau passera entre la tête et ce pied, montera dans l’alésage et sortira par les lumières, dont la section totale (${fr(DERIVED.portsMm2)} mm²) fait ${fr(VALVE_DERIVED.portsRatio, 1)} fois celle de la portée.`,
      `The **nipple** is a 15×21 male fitting threaded over 7–8 cm, which lengthens the valve body. Machine the ports in it, the slots through which the water will escape when the valve is open (${VALVE.portCount} ports of ${mm(VALVE.portWidth).en} × ${mm(VALVE.portHeight).en} mm in the model, estimate), then screw it into the reducer and lock its height with a 15×21 lock nut. Its foot will be the conical seat: the water will pass between the head and this foot, rise in the bore and leave through the ports, whose total area (${en(DERIVED.portsMm2)} mm²) is ${en(VALVE_DERIVED.portsRatio, 1)} times the seat’s.`,
    ),
    parts: ['valve-nipple'],
    tools: [
      l('Perceuse à colonne, étau', 'Drill press, vice'),
      l('Limes ronde et plate', 'Round and flat files'),
      l('Clé à molette', 'Adjustable wrench'),
    ],
    tip: l(
      'Répartissez les lumières à intervalles égaux autour du tube et chanfreinez leurs arêtes : c’est l’endroit le plus mince du mamelon, et une arête vive y amorce une fissure sous les coups.',
      'Space the ports at equal intervals around the tube and chamfer their edges: it is the thinnest part of the nipple, and a sharp edge starts a crack there under the strokes.',
    ),
    warning: l(
      'Ne serrez pas le mamelon à l’étau au niveau des lumières : les barrettes entre elles sont minces (le tube y perd plus d’un tiers de son pourtour) et se plient.',
      'Do not clamp the nipple in the vice at the level of the ports: the bars between them are thin (the tube loses more than a third of its circumference there) and bend.',
    ),
    duration: '90 min',
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
    duration: '10 min',
  },
  {
    id: 'seat',
    title: l('Fraiser la portée conique', 'Mill the conical seat'),
    text: l(
      `Fraisez la **portée conique** au pied du mamelon, une fois toute la pile montée et bien serrée. Les cônes intérieurs des raccords du commerce ne sont pas assez coniques ; la vidéo passe donc une fraise à métaux dans l’ouverture, montée sur une perceuse à colonne, au même angle que la tête de clapet. Un cône donne une bande de contact ${fr(VALVE_DERIVED.coneGain, 1)} fois plus large qu’un anneau plat de même largeur radiale (à ${VALVE.headConeHalfAngleDeg}° de demi-angle, estimation). Un clapet plat, même avec un bon joint, s’est montré peu étanche et peu durable : le joint était mort en 24 h.`,
      `Mill the **conical seat** at the foot of the nipple, once the whole stack is assembled and fully tightened. The inner cones of commercial fittings are not conical enough; the video therefore passes a metal-cutting cutter through the opening, held in a drill press, at the same angle as the valve head. A cone gives a contact band ${en(VALVE_DERIVED.coneGain, 1)} times wider than a flat ring of the same radial width (at a ${VALVE.headConeHalfAngleDeg}° half-angle, estimate). A flat valve, even with a good seal, proved leaky and short-lived: the seal was dead within 24 hours.`,
    ),
    parts: ['valve-seat'],
    tools: [
      l('Fraise à métaux à l’angle de la tête de clapet', 'Metal-cutting cutter at the angle of the valve head'),
      l('Perceuse à colonne', 'Drill press'),
      l('Marqueur', 'Marker pen'),
    ],
    tip: l(
      'Fraisez doucement, et vérifiez la portée au marqueur dès que la tête est faite : noircissez son cône, enfoncez-la et tournez, le trait doit s’effacer sur tout le tour. Même ainsi la portée de la vidéo laisse encore suinter un peu d’eau ; le modèle du laboratoire suppose une portée parfaite.',
      'Mill gently, and check the seat with a marker as soon as the head is made: blacken its cone, push it in and turn it, the mark must wear off all the way round. Even so the video’s seat still weeps a little water; the lab’s model assumes a perfect seat.',
    ),
    duration: '1 h',
  },
  {
    id: 'head',
    title: l('Fabriquer la tête du clapet', 'Make the valve head'),
    text: l(
      `La **tête** du clapet est une vis inox à tête fraisée. Raccourcissez-la pour ne garder que la tête, puis percez-la dans son axe, à 3 mm puis à 6 mm, pour qu’elle reçoive la tige. Sa face plate, dessous, doit être coupée bien droite : elle appuie sur l’écrou qui la serre, et c’est d’elle que dépend le contact du cône sur tout le tour. Les premières vis de la vidéo, coupées de travers, laissaient fuir même serrées. La tête (Ø ${mm(VALVE.headDiameter).fr} mm dans le modèle, estimation) ne passe pas dans l’alésage de ${fr(VALVE.seatBore[1] * 1000)} mm de la portée : elle se fixera par-dessous, sur la tige, à l’étape des ailettes.`,
      `The valve **head** is a stainless countersunk screw. Cut it short to keep only the head, then drill it on its axis, at 3 mm then 6 mm, so that it takes the rod. Its flat face, underneath, must be cut dead straight: it bears on the nut that clamps it, and the contact of the cone all the way round depends on it. The video’s first screws, cut crooked, still leaked even when tightened. The head (Ø ${mm(VALVE.headDiameter).en} mm in the model, estimate) does not pass through the ${en(VALVE.seatBore[1] * 1000)} mm bore of the seat: it will be fitted from below, on the rod, at the fins step.`,
    ),
    parts: ['valve-head'],
    tools: [
      l('Perceuse à colonne, étau, mèches de 3 et 6 mm', 'Drill press, vice, 3 and 6 mm drill bits'),
      l('Scie à métaux', 'Hacksaw'),
      l('Pied à coulisse', 'Calipers'),
    ],
    tip: l(
      'La vis n’est presque jamais percée dans son axe. La vidéo la serre dans le mandrin de la perceuse à colonne et la descend sur un foret de 3 mm tenu à l’étau, ce qui la centre d’elle-même ; pour la couper d’équerre, elle tourne dans le mandrin pendant qu’une scie à métaux fixée à l’étau l’attaque.',
      'The screw is almost never drilled on its axis. The video holds it in the drill-press chuck and lowers it onto a 3 mm bit held in the vice, which centres it by itself; to cut it square, it turns in the chuck while a hacksaw clamped in the vice attacks it.',
    ),
    warning: l(
      'Deux essais de la vidéo ont échoué : un axe en acier trempé avec un joint plat (joint mort en 24 h) et une tête soudée un peu de travers sur son axe (elle ne fermait pas, le clapet fuyait). Ne soudez pas la tête, ne comptez pas sur un joint plat.',
      'Two of the video’s trials failed: a hardened steel axle with a flat seal (seal dead in 24 h) and a head welded slightly off its axis (it would not close, the valve leaked). Do not weld the head, do not rely on a flat seal.',
    ),
    duration: '2 h',
  },
  {
    id: 'stem',
    title: l('Monter la tige et ses manchons', 'Fit the stem and its sleeves'),
    text: l(
      `La **tige** est une tige filetée de 6 mm. On ne s’en sert pas telle quelle comme axe, car ses petits filets s’useraient très vite dans le guide : enfilez-y les **manchons de la tige**, deux manchons femelles usinés dont le diamètre colle à celui de l’intérieur du guide à un dixième de millimètre près (${mm(VALVE.stemSleeveDiameter).fr} mm pour un alésage de ${mm(VALVE.guideTubeInnerDiameter).fr} mm dans le modèle, estimation). Descendez la tige par le haut dans le manchon femelle-femelle et le mamelon : elle ressort sous la portée, où la tête viendra se serrer par-dessous, et le guide coiffera ensuite ses manchons. Ce jeu de 0,1 mm garde la tête dans l’axe de la portée, avec un décalage d’au plus ${fr(VALVE_DERIVED.headShift * 1000, 1)} mm (dérivé des cotes estimées) que le cône rattrape ; plus lâche, la tige se coucherait.`,
      `The **stem** is a 6 mm threaded rod. It is not used as an axle as it is, because its fine threads would wear out very quickly in the guide: slip the **stem sleeves** onto it, two machined female sleeves whose diameter matches the inside of the guide to within a tenth of a millimetre (${mm(VALVE.stemSleeveDiameter).en} mm for a ${mm(VALVE.guideTubeInnerDiameter).en} mm bore in the model, estimate). Lower the rod from above through the female-female sleeve and the nipple: it comes out under the seat, where the head will be clamped from below, and the guide will then cover its sleeves. That 0.1 mm clearance keeps the head on the seat’s axis, with a shift of at most ${en(VALVE_DERIVED.headShift * 1000, 1)} mm (derived from the estimated dimensions) that the cone makes up for; looser, the stem would lie over.`,
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
      'Mesurez l’alésage du doigt de gant à plusieurs endroits avant d’usiner les manchons, avec un pied à coulisse qui lit le dixième : un tube du commerce n’est pas rond au dixième près.',
      'Measure the thermowell bore in several places before machining the sleeves, with calipers that read the tenth: an off-the-shelf tube is not round to the tenth.',
    ),
    duration: '2 h',
  },
  {
    id: 'guide',
    title: l('Couper et poser le guide', 'Cut and fit the guide'),
    text: l(
      `Le **guide** de la tige est un doigt de gant inox, une pièce vendue pour loger les sondes de température des chauffe-eau solaires et des chaudières ; l’auteur, chauffagiste, en avait sous la main. Coupez-le à longueur, de façon que son extrémité émerge peu au-dessus de la zone des lumières (le modèle le dessine ouvert aux deux bouts, puisque la tige le traverse), puis enfilez-le par le haut sur la tige et ses manchons et vissez-le dans le manchon femelle-femelle : la tige coulisse alors dans son alésage. Son extrémité sert aussi de butée au poids, donc fixe la course : la face doit être parfaitement plane et perpendiculaire à l’axe. Dans la vidéo, une première coupe à la scie était de travers, et l’auteur redoutait qu’elle déséquilibre le poids et finisse par le coincer.`,
      `The stem **guide** is a stainless-steel thermowell, a part sold to hold the temperature probes of solar water heaters and boilers; the author, a heating installer, had some to hand. Cut it to length so that its end stands only a little above the port area (the model draws it open at both ends, since the stem goes through it), then slide it down over the stem and its sleeves and screw it into the female-female sleeve: the stem then slides in its bore. Its end also serves as the stop for the weight, so it sets the stroke: the face must be perfectly flat and square to the axis. In the video a first saw cut was crooked, and the author feared it would unbalance the weight and eventually make it jam.`,
    ),
    parts: ['valve-guide'],
    tools: [
      l('Scie à métaux, étau', 'Hacksaw, vice'),
      l('Lime plate, équerre', 'Flat file, square'),
      l('Pied à coulisse', 'Calipers'),
    ],
    tip: l(
      'Contrôlez l’équerrage de la coupe à l’équerre avant de monter le guide, et reprenez la face à la lime : c’est sur elle que le poids retombe à chaque coup. Une fois monté, la tige doit descendre toute seule dans le guide et tourner librement sous les doigts.',
      'Check the squareness of the cut with a square before fitting the guide, and dress the face with a file: the weight lands on it at every stroke. Once fitted, the stem must fall by itself in the guide and turn freely under the fingers.',
    ),
    duration: '30 min',
  },
  {
    id: 'fins',
    title: l('Limer les ailettes et serrer la tête', 'File the fins and clamp the head'),
    text: l(
      `Limez de petites **ailettes** sur l’écrou qui serre la tête, comme sur le clapet Walton d’origine, puis vissez-le par-dessous sur le bas de la tige pour serrer la tête. Dans la vidéo, les ailettes servent à faire tourner légèrement le clapet à chaque remontée : la portée ne frappe alors jamais deux fois au même endroit, et un petit défaut de forme ne se creuse pas dans le cône. L’auteur ajoute cette pièce à la fin, sans avoir encore vérifié qu’elle fait bien tourner son clapet : c’est une idée copiée du Walton, pas un résultat démontré. Le laboratoire en dessine ${VALVE.finsCount}, en estimation : ni leur nombre ni leur angle ne sont donnés.`,
      `File small **fins** on the nut that clamps the head, as on the original Walton valve, then screw it on from below, onto the bottom of the rod, to clamp the head. In the video the fins make the valve turn slightly at every rise: the seat then never strikes the same spot twice, and a small shape error does not wear a groove into the cone. The author adds this part last, without having checked yet that it really turns his valve: it is an idea copied from the Walton, not a demonstrated result. The lab draws ${VALVE.finsCount}, as an estimate: neither their number nor their angle is given.`,
    ),
    parts: ['valve-fins'],
    tools: [l('Limes', 'Files'), l('Étau', 'Vice'), l('Clé plate', 'Open-ended spanner')],
    tip: l(
      'Donnez la même inclinaison à toutes les ailettes, dans le même sens : si elles se contrarient, le jet ne fait pas tourner le clapet.',
      'Give every fin the same slant, in the same direction: if they oppose one another, the jet will not turn the valve.',
    ),
    duration: '30 min',
  },
  {
    id: 'weight',
    title: l('Usiner le poids dans une barre d’armature', 'Machine the weight from a rebar bar'),
    text: l(
      `Le **poids** est un tronçon de barre d’armature de 30 à 32 mm de diamètre, percé dans l’axe et taraudé pour se visser sur la tige ; sa face basse, qui retombe sur le bout du guide à chaque coup, doit être bien plane. L’auteur y a passé une bonne heure, à la perceuse à colonne. Son premier poids, fait de gros écrous et de rondelles, se mettait de travers, coinçait le clapet et a arrêté le bélier dans les premiers jours. Le poids rabaisse le clapet après chaque coup et décide de son rythme : à course égale, le modèle donne ${fr(MODEL.strokesPerMin)} coups/min et ${fr(MODEL.driveFlow, 1)} L/min avec ${fr(WEIGHT)} g (calibré), mais ${fr(MODEL.heavyWeightStrokes)} coups/min et ${fr(MODEL.heavyWeightFlow, 1)} L/min, deux fois la source, avec le double.`,
      `The **weight** is a piece of 30–32 mm rebar, drilled on its axis and tapped to screw onto the rod; its lower face, which drops onto the end of the guide at every stroke, must be flat. The author spent a good hour on it, on the drill press. His first weight, made of big nuts and washers, sat crooked, jammed the valve and stopped the ram within the first days. The weight pulls the valve down after each stroke and decides its rhythm: at the same stroke, the model gives ${en(MODEL.strokesPerMin)} strokes/min and ${en(MODEL.driveFlow, 1)} L/min with ${en(WEIGHT)} g (calibrated), but ${en(MODEL.heavyWeightStrokes)} strokes/min and ${en(MODEL.heavyWeightFlow, 1)} L/min, twice the spring, with double.`,
    ),
    parts: ['counterweight'],
    tools: [
      l('Perceuse à colonne, étau', 'Drill press, vice'),
      l('Taraud de bonne qualité (M6)', 'Good-quality tap (M6)'),
      l('Scie à métaux, lime ou fraise pour dresser la face', 'Hacksaw, file or cutter to dress the face'),
      l('Balance', 'Scale'),
    ],
    tip: l(
      'Pesez le poids fini : sa masse joue sur la consommation. Un petit coffret de taraudage bon marché n’a pas suffi à tarauder l’acier dans la vidéo : prenez un taraud de bonne qualité.',
      'Weigh the finished weight: its mass affects the consumption. A small cheap tap-and-die set was not enough to tap steel in the video: use a good-quality tap.',
    ),
    // the only duration that comes from the video (S1 17:21); the others are estimates
    duration: '1 h',
  },
  {
    id: 'stroke-nut',
    title: l('Visser l’écrou de course et régler la course', 'Screw on the stroke nut and set the stroke'),
    text: l(
      `Vissez l’**écrou de réglage de course** sur la tige, au-dessus du poids, et réglez la course : l’écart entre la tête et la portée quand le clapet est ouvert. La course décide de la consommation, c’est le réglage le plus important du bélier : sous une course minimale il ne refoule plus, de sorte que, pour une taille de bélier donnée, la consommation a un plancher et un plafond. Avec la source de la vidéo, le modèle donne une fenêtre étroite, de ${fr(MODEL.noDeliveryStroke, 1)} à ${fr(MODEL.springLimitStroke, 1)} mm, soit ${fr(VALVE_DERIVED.windowTurns, 1)} tour au pas de ${fr(VALVE.rodPitch * 1000)} mm de la tige. Le clapet n°1 est réglé à ≈ ${fr(STROKE, 1)} mm (valeur calibrée). Dans le clapet final de la vidéo, c’est le poids qui joue le rôle d’écrou principal ; le laboratoire dessine un écrou de course distinct pour que le geste de réglage soit visible.`,
      `Screw the **stroke adjusting nut** onto the rod, above the weight, and set the stroke: the gap between the head and the seat when the valve is open. The stroke decides the consumption, it is the ram’s most important setting: below a minimum stroke it no longer delivers, so for a given ram size the consumption has a floor and a ceiling. With the video’s spring, the model gives a narrow window, from ${en(MODEL.noDeliveryStroke, 1)} to ${en(MODEL.springLimitStroke, 1)} mm, that is ${en(VALVE_DERIVED.windowTurns, 1)} turn at the ${en(VALVE.rodPitch * 1000)} mm pitch of the rod. The n°1 valve is set to ≈ ${en(STROKE, 1)} mm (a calibrated value). In the video’s final valve it is the weight that plays the part of the main nut; the lab draws a separate stroke nut so that the adjusting gesture can be seen.`,
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
      'Mesurez la course à l’arrêt : soulevez la tige par le haut jusqu’à ce que la tête touche sa portée, et glissez des cales d’épaisseur entre le poids et le guide. Tournez l’écrou par fractions de tour (0,1 mm = un dixième de tour) et laissez le bélier se stabiliser avant de juger.',
      'Measure the stroke at standstill: lift the stem from the top until the head touches its seat, and slide feeler gauges between the weight and the guide. Turn the nut by fractions of a turn (0.1 mm = a tenth of a turn) and let the ram settle before judging.',
    ),
    duration: '15 min',
  },
  {
    id: 'lock-nut',
    title: l('Bloquer le réglage avec le contre-écrou', 'Lock the setting with the lock nut'),
    text: l(
      `Serrez le **contre-écrou** contre l’écrou de course. À 100 ou 110 coups par minute (${fr(DERIVED.strokesPerDay)} chocs par jour dans le modèle), chaque vibration peut desserrer l’écrou et dérégler le bélier, alors que sa position fixe la consommation : les deux écrous doivent être serrés l’un contre l’autre, à fond. L’ancien clapet faisait 70 à 80 coups par minute ; le nouveau en fait 100 à 110, ce qui rend le blocage plus important. Avec le poids qui sert d’écrou principal, le contre-écrou se visse simplement par-dessus et permet un réglage extrêmement fin de la consommation. Tracez un trait de peinture en travers des écrous et de la tige : s’il se casse, quelque chose a bougé.`,
      `Tighten the **lock nut** against the stroke nut. At 100–110 strokes a minute (${en(DERIVED.strokesPerDay)} shocks a day in the model) every vibration can loosen the nut and detune the ram, while its position fixes the consumption: the two nuts must be tightened against each other, fully. The old valve made 70 to 80 strokes a minute; the new one makes 100 to 110, which makes the locking more important. With the weight serving as the main nut, the lock nut simply screws on top and allows an extremely fine adjustment of the consumption. Draw a paint line across the nuts and the rod: if it breaks, something has moved.`,
    ),
    parts: ['lock-nut'],
    tools: [
      l('Deux clés plates', 'Two open-ended spanners'),
      l('Peinture ou feutre pour le repère', 'Paint or felt-tip pen for the mark'),
    ],
    tip: l(
      'Tenez l’écrou de réglage avec une seconde clé pendant que vous serrez le contre-écrou : sans cela, la course bouge d’un dixième au moment où vous croyez la fixer.',
      'Hold the adjusting nut with a second spanner while you tighten the lock nut: without that, the stroke moves by a tenth just as you think you are fixing it.',
    ),
    warning: l(
      'Réglez avec des clés, jamais avec les doigts : le poids monte et descend à chaque coup, et la tête du clapet se ferme en quelques centièmes de seconde.',
      'Adjust with spanners, never with your fingers: the weight rises and falls at every stroke, and the valve head shuts in a few hundredths of a second.',
    ),
    duration: '10 min',
  },

  // ======================================================================================= the ram world
  {
    id: 'foundation',
    scene: 'ram',
    title: l('Couler le massif d’ancrage', 'Pour the anchor block'),
    text: l(
      `Le **massif d’ancrage** est le bloc de béton, coulé dans la fosse, sur lequel le bélier sera boulonné par ses deux pieds : quatre tiges d’ancrage M10 y sont scellées (modèle : plot de ${mmBox(FOUNDATION.length, FOUNDATION.width, FOUNDATION.thickness).fr} mm, estimation), alignées sur les trous des pieds. Il est là parce qu’un bélier frappe : environ ${fr(DERIVED.thrustKn, 2)} kN de poussée à chaque coup (dérivé), ${fr(MODEL.strokesPerMin)} coups par minute dans le modèle. La vidéo ne montre pas le massif de son bélier, et le laboratoire n’en donne aucune dimension à reproduire : la bonne taille dépend du sol, de la conduite et de l’installation.`,
      `The **anchor block** is the concrete pad, poured in the pit, on which the ram will be bolted by its two feet: four M10 anchor studs are cast into it (model: a pad of ${mmBox(FOUNDATION.length, FOUNDATION.width, FOUNDATION.thickness).en} mm, estimate), lined up on the holes of the feet. It is there because a ram strikes: about ${en(DERIVED.thrustKn, 2)} kN of push at every stroke (derived), ${en(MODEL.strokesPerMin)} strokes a minute in the model. The video does not show its ram’s block, and the lab gives no dimension to copy: the right size depends on the soil, the pipe and the installation.`,
    ),
    parts: ['foundation'],
    tools: [
      l('Coffrage, béton, niveau à bulle', 'Formwork, concrete, spirit level'),
      l('Gabarit percé aux entraxes des pieds', 'Template drilled at the feet spacing'),
    ],
    tip: l(
      'Tenez les tiges d’ancrage dans un gabarit percé aux entraxes des pieds pendant que le béton prend : un écart de quelques millimètres suffit à empêcher les pieds de s’y poser. Gardez la fosse drainée, le massif ne doit jamais baigner.',
      'Hold the anchor studs in a template drilled at the feet spacing while the concrete sets: a few millimetres of error are enough to stop the feet from seating. Keep the pit drained, the block must never sit in water.',
    ),
    warning: l(
      'Ne posez jamais un bélier sur de simples cales : mal ancré, il marche, tire sur la conduite et finit par rompre un joint ou un tuyau. Laissez le béton faire sa prise avant de serrer quoi que ce soit.',
      'Never stand a ram on mere shims: badly anchored, it walks, pulls on the pipe and ends up breaking a gasket or a pipe. Let the concrete set before tightening anything.',
    ),
    duration: '3 h',
  },
  {
    id: 'body',
    scene: 'ram',
    title: l('Boulonner le corps du bélier', 'Bolt down the ram body'),
    text: l(
      `Posez le **corps du bélier** sur les tiges du massif et serrez ses deux pieds, en vérifiant le niveau. C’est la pièce coulée qui reçoit l’eau de la conduite motrice et porte tout le reste : le clapet de choc, le clapet de refoulement et la cloche à air. La vidéo part d’un bélier du commerce (Walton n°3) dont elle ne remplace que le clapet de choc ; le laboratoire montre à sa place un bélier générique de 1″, dont les dimensions sont des estimations (aucune fiche du constructeur n’a été trouvée). Vérifiez que les taraudages sont propres et que la face qui recevra la platine du clapet est plane.`,
      `Set the **ram body** on the studs of the block and tighten its two feet, checking the level. It is the cast part that receives the water from the drive pipe and carries everything else: the waste valve, the delivery check valve and the air chamber. The video starts from a commercial ram (Walton n°3) of which it replaces only the waste valve; the lab shows a generic 1″ ram in its place, whose dimensions are estimates (no maker data sheet was found). Check that the threads are clean and that the face that will take the valve plate is flat.`,
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
    duration: '45 min',
  },
  {
    id: 'inlet',
    scene: 'ram',
    title: l('Monter la vanne d’arrivée, la crépine et la bride', 'Fit the inlet valve, the strainer and the flange'),
    text: l(
      `Boulonnez sur la bride d’entrée du corps la **vanne d’arrivée** (V1), puis la **crépine** en Y sur V1, puis la **bride d’arrivée** de la conduite motrice sur la crépine, avec son joint plat et ses quatre boulons (DN25, estimations : bride de Ø ${mm(INLET.flangeDiameter).fr} mm, joint de ${mm(INLET.gasketThickness).fr} mm). V1 arrête le bélier et permet de le démonter sans vider la réserve ; la crépine arrête feuilles, sable et gravillons avant qu’ils n’aillent se coincer sous la tête du clapet de choc ou sous le clapet de refoulement. La conduite motrice, de 20 m dans la vidéo, vient ensuite s’y raccorder.`,
      `Bolt the **inlet valve** (V1) onto the body’s inlet flange, then the Y-**strainer** onto V1, then the drive pipe’s **inlet flange** onto the strainer, with its flat gasket and its four bolts (DN25, estimates: ${mm(INLET.flangeDiameter).en} mm flange, ${mm(INLET.gasketThickness).en} mm gasket). V1 stops the ram and lets you take it apart without emptying the tank; the strainer catches leaves, sand and grit before they can jam under the waste valve head or under the delivery check valve. The drive pipe, 20 m long in the video, is then connected to it.`,
    ),
    parts: ['inlet-valve', 'strainer', 'inlet-flange'],
    tools: [
      l('Clés plates et à tube', 'Open-ended and pipe wrenches'),
      l('Joints plats neufs', 'New flat gaskets'),
      l('Papier absorbant pour le contrôle d’étanchéité', 'Absorbent paper for the leak check'),
    ],
    tip: l(
      'Serrez les boulons de chaque bride en croix, par petites fractions de tour, et soutenez la conduite motrice avant la bride : le bélier ne doit pas porter le tuyau.',
      'Tighten the bolts of each flange crosswise, in small fractions of a turn, and support the drive pipe ahead of the flange: the ram must not carry the pipe.',
    ),
    warning: l(
      `La conduite motrice doit être rigide, en acier ou en fonte : un tuyau plastique absorbe le coup, et dans le scénario « Conduite en PVC » du simulateur le bélier frappe sans rien refouler. Le bélier est sous ${fr(DERIVED.inletBar, 2)} bar à l’arrêt, mais le coup monte à ${fr(MODEL.peakBar, 1)} bar.`,
      `The drive pipe must be rigid, steel or cast iron: a plastic pipe absorbs the blow, and in the simulator’s “PVC drive pipe” scenario the ram strikes and delivers nothing. The ram sits at ${en(DERIVED.inletBar, 2)} bar at rest, but the hammer rises to ${en(MODEL.peakBar, 1)} bar.`,
    ),
    duration: '45 min',
  },
  {
    id: 'delivery-side',
    scene: 'ram',
    title: l('Monter le clapet de refoulement et la cloche à air', 'Fit the delivery check valve and the air chamber'),
    text: l(
      `Le **clapet anti-retour de refoulement** se monte sur le corps, côté refoulement ; dans la vidéo, ce petit clapet se trouve dans la cloche. Il s’ouvre quand le coup de bélier fait monter la pression du corps au-dessus de celle du refoulement, pendant environ ${fr(MODEL.deliverSharePct)} % du cycle, et se referme dès qu’elle retombe, pour que la colonne d’eau de la conduite ne redescende pas. La **cloche à air**, montée au-dessus, est le coussin qui transforme les à-coups (${fr(MODEL.mlPerStroke, 1)} mL par coup) en un débit continu dans la conduite de refoulement. Dans le modèle elle contient ${fr(CHAMBER.volumeL)} L, dont ${AIR_PERCENT} % d’air à la pression de service (hypothèses).`,
      `The **delivery check valve** is fitted on the body, on the delivery side; in the video this small valve sits inside the chamber. It opens when the water hammer pushes the body pressure above the delivery pressure, for about ${en(MODEL.deliverSharePct)}% of the cycle, and shuts again as soon as it falls, so that the water column in the pipe cannot run back down. The **air chamber**, fitted above it, is the cushion that turns the jolts (${en(MODEL.mlPerStroke, 1)} mL per stroke) into a steady flow in the delivery pipe. In the model it holds ${en(CHAMBER.volumeL)} L, of which ${AIR_PERCENT}% is air at working pressure (assumptions).`,
    ),
    parts: ['delivery-valve', 'air-chamber'],
    tools: [
      l('Clés à tube', 'Pipe wrenches'),
      l('Ruban d’étanchéité ou pâte à joint pour filetages', 'Thread seal tape or paste'),
    ],
    tip: l(
      `Une cloche noyée rend les coups durs et réduit le refoulement : dans le modèle, sans air, la pointe de pression passe de ${fr(MODEL.peakBar, 1)} à ${fr(MODEL.loggedPeakBar, 1)} bar et le refoulement baisse de ${fr(MODEL.loggedDeliveryDropPct)} %.`,
      `A water-logged chamber makes the strokes harsh and cuts the delivery: in the model, with no air, the pressure peak goes from ${en(MODEL.peakBar, 1)} to ${en(MODEL.loggedPeakBar, 1)} bar and the delivery drops by ${en(MODEL.loggedDeliveryDropPct)}%.`,
    ),
    duration: '45 min',
  },
  {
    id: 'snifter',
    scene: 'ram',
    title: l('Poser le reniflard', 'Fit the snifter valve'),
    text: l(
      `Le **reniflard** est une minuscule soupape, sur le dessus du corps, qui laisse entrer une pincée d’air pendant le recul, quand la pression du corps passe sous celle de l’air libre (−${fr(MODEL.recoilDipBar, 2)} bar dans le modèle, contre −0,01 bar pour qu’elle s’ouvre) ; cet air est ensuite poussé dans la cloche, qu’il recharge. Sans lui, l’air de la cloche se dissout peu à peu dans l’eau et la cloche se noie (dans le modèle, en une quinzaine d’heures avec un reniflard bouché).`,
      `The **snifter valve** is a tiny valve, on top of the body, that lets a pinch of air in during the recoil, when the body pressure drops below atmospheric (−${en(MODEL.recoilDipBar, 2)} bar in the model, against −0.01 bar for it to open); that air is then pushed into the chamber, which it tops up. Without it the chamber air gradually dissolves into the water and the chamber becomes water-logged (in the model, in about fifteen hours with a blocked snifter).`,
    ),
    parts: ['snifter'],
    tools: [l('Clé plate', 'Open-ended spanner'), l('Ruban d’étanchéité', 'Thread seal tape')],
    tip: l(
      'Une fois le bélier en marche, posez une goutte d’eau sur l’orifice : elle doit être aspirée à chaque recul. Si elle ne bouge pas, le reniflard est bouché.',
      'Once the ram runs, put a drop of water on the orifice: it must be sucked in at each recoil. If it does not move, the snifter is blocked.',
    ),
    duration: '15 min',
  },
  {
    id: 'gauge',
    scene: 'ram',
    title: l('Poser le manomètre côté refoulement', 'Fit the pressure gauge on the delivery side'),
    text: l(
      `Vissez le **manomètre** sur la cloche, côté refoulement : il lit la hauteur d’eau déjà montée (1 bar ≈ 10 m) et atteint environ ${fr(DERIVED.deliveryBar, 1)} bar quand les 65 m de conduite sont pleins. Placé là, il mesure l’effet utile plutôt que le choc du corps, que la cloche amortit (environ ${fr(DERIVED.chamberSwingBar, 2)} bar de variation par coup, dérivé). Le cadran de ${fr(FITTINGS.gaugeFullScaleBar)} bar de l’illustration (estimation) place les ${fr(DERIVED.deliveryBar, 1)} bar aux deux tiers de l’échelle.`,
      `Screw the **pressure gauge** onto the chamber, on the delivery side: it reads the height of water already lifted (1 bar ≈ 10 m) and reaches about ${en(DERIVED.deliveryBar, 1)} bar once the 65 m of pipe are full. Placed there, it measures the useful effect rather than the body’s shock, which the chamber cushions (about ${en(DERIVED.chamberSwingBar, 2)} bar of variation per stroke, derived). The illustration’s ${en(FITTINGS.gaugeFullScaleBar)} bar dial (estimate) puts the ${en(DERIVED.deliveryBar, 1)} bar at two thirds of the scale.`,
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
    duration: '15 min',
  },
  {
    id: 'outlet',
    scene: 'ram',
    title: l('Monter la vanne de sortie et le raccord union', 'Fit the outlet valve and the union'),
    text: l(
      `Vissez la **vanne de sortie** (V3) sur l’orifice de la cloche, puis le **raccord union** de refoulement, qui se termine par un raccord à compression pour le tuyau en PE de ${mm(SITE.deliveryOuterDiameter).fr} mm (estimation). V3 ferme la conduite de refoulement, qui reste pleine de sa colonne d’eau (65 m, soit environ ${fr(DERIVED.deliveryBar, 1)} bar) pendant qu’on intervient sur le bélier. L’union permet de séparer le bélier de la conduite de 300 m sans tourner ni couper aucun des deux. Derrière elles, la conduite contient environ ${fr(DERIVED.pipeLitres)} L (dérivé) : environ trois heures de refoulement du clapet n°1 pour la remplir.`,
      `Screw the **outlet valve** (V3) onto the chamber port, then the delivery **union**, which ends in a compression fitting for the ${mm(SITE.deliveryOuterDiameter).en} mm PE pipe (estimate). V3 closes the delivery pipe, which stays full of its water column (65 m, about ${en(DERIVED.deliveryBar, 1)} bar) while you work on the ram. The union lets you separate the ram from the 300 m pipe without turning or cutting either. Behind them, the pipe holds about ${en(DERIVED.pipeLitres)} L (derived): about three hours of delivery of the n°1 valve to fill it.`,
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
      'Ne desserrez jamais l’union sans avoir arrêté le bélier : la conduite de refoulement est pleine et sous pression derrière elle, et se vide par là en un jet violent. Desserrez très lentement, un chiffon autour.',
      'Never loosen the union without stopping the ram: the delivery pipe is full and under pressure behind it, and empties through it in a violent jet. Loosen it very slowly, with a cloth around it.',
    ),
    duration: '30 min',
  },
  {
    id: 'drain',
    scene: 'ram',
    title: l('Poser la vanne de vidange', 'Fit the drain valve'),
    text: l(
      `Vissez la **vanne de vidange** (V2) sur le couvercle d’extrémité du corps, sortie orientée vers le drain de la fosse. Ouverte, V1 fermée, elle vide le corps et fait retomber sa pression (${fr(DERIVED.inletBar, 2)} bar de chute à l’arrivée) avant toute intervention sur le clapet de choc ou les brides. La cloche, elle, garde ses ${fr(DERIVED.deliveryBar, 1)} bar derrière le clapet de refoulement, avec la colonne de la conduite : V2 ne la purge pas.`,
      `Screw the **drain valve** (V2) onto the end cover of the body, outlet pointing at the pit drain. Opened, with V1 closed, it empties the body and lets its pressure fall (${en(DERIVED.inletBar, 2)} bar of fall at the inlet) before any work on the waste valve or the flanges. The chamber keeps its ${en(DERIVED.deliveryBar, 1)} bar behind the delivery check valve, with the pipe’s column: V2 does not purge it.`,
    ),
    parts: ['drain-valve'],
    tools: [l('Clés plates', 'Open-ended spanners'), l('Ruban d’étanchéité', 'Thread seal tape')],
    tip: l(
      'Vissez un bouchon sur la sortie de V2 en service : une vanne qui suinte perd de l’eau en permanence, et le bouchon le retient.',
      'Screw a plug on the outlet of V2 in service: a valve that weeps loses water all the time, and the plug holds it.',
    ),
    warning: l(
      'Avant de démonter quoi que ce soit : fermez V1 pour arrêter le bélier, fermez V3 pour garder la conduite pleine, puis ouvrez V2 lentement. Le corps se vide ; la cloche et la conduite restent à environ 6,4 bar derrière le clapet de refoulement.',
      'Before taking anything apart: shut V1 to stop the ram, shut V3 to keep the pipe full, then open V2 slowly. The body empties; the chamber and the pipe stay at about 6.4 bar behind the delivery check valve.',
    ),
    duration: '15 min',
  },
  {
    id: 'waste-valve',
    scene: 'ram',
    title: l('Boulonner le clapet de choc sur le corps', 'Bolt the waste valve onto the body'),
    text: l(
      `Posez le **clapet de choc**, les 14 pièces assemblées dans le monde du clapet, sur la bride du corps avec son joint, et serrez en croix les quatre écrous de la platine. Aucune autre pièce du bélier ne bouge : le clapet remplace celui du Walton, et le corps reste intact parce que la platine reprend les trous de l’ancienne. Contrôlez que le poids retombe librement jusqu’à buter sur le guide, et que rien ne frotte dans le guide : le clapet doit rester ouvert au repos et se fermer de lui-même quand le courant atteint environ ${fr(MODEL.closingVelocity, 2)} m/s (résultat du modèle).`,
      `Set the **waste valve**, its 14 parts assembled in the valve world, on the body flange with its gasket, and tighten the plate’s four nuts crosswise. Nothing else on the ram moves: the valve replaces the Walton’s, and the body stays intact because the plate reuses the holes of the old one. Check that the weight falls freely until it stops on the guide, and that nothing rubs in the guide: the valve must stay open at rest and shut by itself when the flow reaches about ${en(MODEL.closingVelocity, 2)} m/s (model result).`,
    ),
    parts: ['waste-valve'],
    tools: [
      l('Clés plates', 'Open-ended spanners'),
      l('Joint plat neuf', 'New flat gasket'),
      l('Règle ou équerre pour contrôler la planéité', 'Straightedge or square to check flatness'),
    ],
    tip: l(
      'Avant d’ouvrir l’eau, soulevez le poids à la main et lâchez-le : la tige doit retomber d’un trait sur le guide. Si elle freine ou s’arrête, cherchez le défaut d’axe avant de faire marcher le bélier.',
      'Before opening the water, lift the weight by hand and let go: the stem must fall back onto the guide in one go. If it slows or stops, look for the axis error before running the ram.',
    ),
    warning: l(
      'Jamais un doigt dans les lumières du clapet de choc, ni sous le poids, quand le bélier tourne : il se ferme en quelques centièmes de seconde avec plusieurs bars derrière.',
      'Never put a finger in the waste valve ports, or under the weight, while the ram runs: it shuts in a few hundredths of a second with several bar behind it.',
    ),
    duration: '30 min',
  },
  {
    id: 'first-start',
    scene: 'ram',
    title: l('Premier démarrage et réglage', 'First start and tuning'),
    text: l(
      `Fermez la vidange V2, ouvrez V3, puis ouvrez V1 doucement. Le clapet retombe ouvert, l’eau accélère dans la conduite motrice et son courant finit par plaquer la tête sur sa portée : c’est le premier coup. Si les coups ne s’enchaînent pas, enfoncez le poids à la main par le dessus puis relâchez-le. Vous devez voir et entendre un battement net et régulier, les jets sortir des lumières, le manomètre monter lentement à mesure que la conduite se remplit (environ trois heures pour ses ${fr(DERIVED.pipeLitres)} L au rythme du clapet n°1, dérivé) jusqu’à ${fr(DERIVED.deliveryBar, 1)} bar, une goutte posée sur le reniflard aspirée à chaque recul, et des brides et une union sèches. Comptez les coups au chronomètre, puis réglez la course : trop longue, le bélier boit l’eau de la réserve (le clapet n°3 de la vidéo prenait environ 17 L/min, estimation, et s’arrêtait après une dizaine d’heures) ; trop courte, il frappe sans rien refouler. Visez, comme la vidéo avec le clapet n°1, 100 à 110 coups par minute et environ 500 L par jour.`,
      `Close the drain V2, open V3, then open V1 gently. The valve drops open, the water accelerates in the drive pipe and its flow finally slams the head onto its seat: that is the first stroke. If the strokes do not follow one another, press the weight down by hand from above and let go. You should see and hear a clean, regular beat, the jets leaving the ports, the gauge climbing slowly as the pipe fills (about three hours for its ${en(DERIVED.pipeLitres)} L at the n°1 valve’s rhythm, derived) up to ${en(DERIVED.deliveryBar, 1)} bar, a drop of water on the snifter sucked in at each recoil, and dry flanges and union. Count the strokes with a stopwatch, then adjust the stroke: too long, the ram drinks the tank dry (the video’s n°3 valve took about 17 L/min, an estimate, and stopped after about ten hours); too short, it strikes and delivers nothing. Aim, like the video with the n°1 valve, for 100–110 strokes a minute and about 500 L a day.`,
    ),
    parts: [],
    tools: [
      l('Chronomètre pour compter les coups', 'Stopwatch to count the strokes'),
      l('Clés pour l’écrou et le contre-écrou', 'Spanners for the nut and lock nut'),
      l('Papier absorbant pour les brides et l’union', 'Absorbent paper for the flanges and the union'),
    ],
    tip: l(
      'Relevez la cadence, la pression du manomètre et l’heure dans un carnet le premier jour : ce sont vos valeurs de référence pour détecter plus tard une crépine colmatée, une cloche noyée ou un écrou qui a bougé.',
      'Note the rate, the gauge pressure and the time in a notebook on the first day: these are your reference values for spotting later a clogged strainer, a water-logged chamber or a nut that has moved.',
    ),
    warning: l(
      'Jamais un doigt dans les lumières du clapet de choc quand le bélier tourne : il se ferme en quelques centièmes de seconde avec plusieurs bars derrière. Enfoncez le poids par le dessus, jamais par les lumières.',
      'Never put a finger in the ports of the waste valve while the ram is running: it shuts in a few hundredths of a second with several bar behind it. Press the weight from above, never through the ports.',
    ),
    duration: '30 min',
  },
];
