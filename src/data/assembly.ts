// Assembly guide of the ram and its waste valve, played in the 'ram' world (wave 2, data role).
// Thirteen steps, from the body and the base plate to the first start. All 18 ram parts are installed once,
// bottom up: body, base plate, valve body, guide, seat, stem, fins, weight and nuts, delivery side, valves.
//
// The waste valve follows the video (S1, 06:20–19:05). The body, the delivery side, the snifter, the gauge and the
// valves V1–V3 are those of a generic 1" ram: the video does not show them (research §3).
// DURATIONS ARE ROUGH ESTIMATES, except the weight (« a good hour », S1 17:21): the lead and the owner are expected
// to refine them. No torque is given: no source states one. The only fit given is the stem sleeves in the guide,
// within 0.1 mm (S1 09:02), written in the text, not in the `torque` field.
// Stroke ≈ 2.2 mm and weight ≈ 360 g for the n°1 valve are CALIBRATED by the model (docs/physics.md §3), not measured.

import type { GuideStep } from '@onigam/lab-kit/content';
import { l } from '@onigam/lab-kit/i18n';
import { AIR_FRACTION_NOMINAL } from '../sim/physics';
import { VALVE_SETTINGS } from '../sim/presets';
import { CHAMBER } from '../three/dims';
import { nEn, nFr } from './units';

// Figures that come from the model, written once (docs/physics.md §3): the stroke and the weight of the n°1 valve
// (calibrated), the chamber volume and its air share (assumed).
const STROKE = VALVE_SETTINGS[1].stroke;
const WEIGHT = VALVE_SETTINGS[1].counterweight;
const AIR_PERCENT = Math.round(AIR_FRACTION_NOMINAL * 100);

export const ASSEMBLY: GuideStep[] = [
  {
    id: 'body',
    title: l('Préparer le corps du bélier', 'Prepare the ram body'),
    text: l(
      'Le **corps du bélier** est la pièce coulée qui reçoit l’eau de la conduite motrice et porte tout le reste : le clapet de choc, le clapet de refoulement et la cloche à air. La vidéo part d’un bélier du commerce (Walton n°3) dont elle ne remplace que le clapet de choc ; le laboratoire montre à sa place un bélier générique de 1″, dont les dimensions sont des estimations (aucune fiche du constructeur n’a été trouvée). Vérifiez que les taraudages sont propres et que la face qui recevra la platine est plane, puis relevez la position des trous de la platine d’origine : la nouvelle devra les reprendre à l’identique.',
      'The **ram body** is the cast part that receives the water from the drive pipe and carries everything else: the waste valve, the delivery check valve and the air chamber. The video starts from a commercial ram (Walton n°3) of which it replaces only the waste valve; the lab shows a generic 1″ ram in its place, whose dimensions are estimates (no maker data sheet was found). Check that the threads are clean and that the face that will take the plate is flat, then copy the positions of the holes of the original plate: the new one will have to reproduce them exactly.',
    ),
    parts: ['ram'],
    tools: [
      l('Brosse métallique, chiffons', 'Wire brush, rags'),
      l('Pied à coulisse', 'Calipers'),
      l('Carton ou calque pour relever les trous', 'Card or tracing paper to copy the holes'),
    ],
    tip: l(
      'Gardez l’ancien clapet tant que le nouveau ne tourne pas : la vidéo y copie la forme de la platine et les ailettes.',
      'Keep the old valve until the new one runs: the video copies the plate outline and the fins from it.',
    ),
    duration: '20 min',
  },
  {
    id: 'base-plate',
    title: l('Découper la platine et souder son raccord', 'Cut the base plate and weld its fitting'),
    text: l(
      'Découpez une **platine de base** de la même taille que celle du clapet d’origine et percez les trous aux mêmes endroits, pour qu’elle se boulonne sur le corps à la place de l’ancienne. Soudez-y un raccord en acier centré sur l’ouverture : il reçoit les raccords de plomberie du corps de clapet, et le volume qu’il ferme accumule l’eau qui pousse le clapet. Dans la vidéo, la platine porte un raccord 20×27 ; l’auteur reconnaît qu’un raccord 26×34 aurait permis de faire la base directement et d’économiser deux raccords.',
      'Cut a **base plate** the same size as the original valve’s and drill the holes in the same places, so that it bolts onto the body in place of the old one. Weld a steel fitting onto it, centred on the opening: it takes the plumbing fittings of the valve body, and the volume it closes collects the water that pushes the valve. In the video the plate carries a 20×27 fitting; the author admits that a 26×34 fitting would have let him make the base directly and save two fittings.',
    ),
    parts: ['base-plate'],
    tools: [
      l('Scie à métaux ou meuleuse', 'Hacksaw or angle grinder'),
      l('Perceuse à colonne', 'Drill press'),
      l('Poste à souder', 'Welder'),
    ],
    tip: l(
      'Soudez le raccord bien d’équerre avec la platine : tout ce qui sera au-dessus (portée, guide, tige) doit partager un seul axe. Un clapet soudé de travers fuyait dans un essai de la vidéo.',
      'Weld the fitting square to the plate: everything above it (seat, guide, stem) must share one axis. A valve welded off-axis leaked in one of the video’s trials.',
    ),
    duration: '2 h',
  },
  {
    id: 'valve-body',
    title: l('Empiler les raccords du corps de clapet', 'Stack the fittings of the valve body'),
    text: l(
      'Montez le **corps du clapet de choc** avec des raccords de plomberie standard : deux raccords 26×34 sur la platine, une réduction vers 15×21, puis un raccord mâle 15×21 fileté sur 7 à 8 cm, qui allonge le corps et dans lequel on usine les lumières par où l’eau s’échappe. Un contre-écrou de plomberie 15×21 règle sa hauteur et un manchon femelle-femelle 15×21 au-dessus recevra le guide. La taille du clapet est celle du raccord de la portée : 15×21 pour le n°1, 20×27 pour le n°2, 26×34 pour le n°3.',
      'Build the **waste valve body** from standard plumbing fittings: two 26×34 fittings on the plate, a reducer down to 15×21, then a 15×21 male fitting threaded over 7–8 cm, which lengthens the body and in which the ports that let the water escape are machined. A 15×21 plumbing lock nut sets its height and a 15×21 female-female sleeve above it will take the guide. The valve size is the size of the seat fitting: 15×21 for the n°1, 20×27 for the n°2, 26×34 for the n°3.',
    ),
    parts: ['waste-valve'],
    tools: [
      l('Clés à tube ou à molette', 'Pipe or adjustable wrenches'),
      l('Perceuse à colonne, limes pour les lumières', 'Drill press, files for the ports'),
      l('Étau', 'Vice'),
    ],
    tip: l(
      'Serrez tous les raccords à fond avant de passer à la portée : la vidéo fraise la portée sur l’ensemble monté et serré, pour qu’elle ne bouge plus ensuite.',
      'Tighten every fitting fully before moving on to the seat: the video mills the seat on the assembled and tightened stack, so that it cannot shift afterwards.',
    ),
    duration: '1 h',
  },
  {
    id: 'guide',
    title: l('Couper et poser le guide', 'Cut and fit the guide'),
    text: l(
      'Le **guide** de la tige est un doigt de gant inox, une pièce vendue pour loger les sondes de température des chauffe-eau solaires et des chaudières. Coupez-le à la bonne longueur pour qu’il ne dépasse pas trop de la zone des lumières, puis fixez-le sur le manchon. Son extrémité sert aussi de butée à l’écrou de course et au poids : la face doit être parfaitement plane et perpendiculaire à l’axe. Dans la vidéo, une première coupe à la scie était de travers, et l’auteur redoutait qu’elle déséquilibre le poids et finisse par le coincer.',
      'The stem **guide** is a stainless-steel thermowell, a part sold to hold the temperature probes of solar water heaters and boilers. Cut it to length so that it does not stick out too far above the ports, then fix it on the sleeve. Its end also serves as the stop for the stroke nut and the weight: the face must be perfectly flat and square to the axis. In the video a first saw cut was crooked, and the author feared it would unbalance the weight and eventually make it jam.',
    ),
    parts: ['valve-guide'],
    tools: [l('Scie à métaux, étau', 'Hacksaw, vice'), l('Lime plate, équerre', 'Flat file, square')],
    tip: l(
      'Contrôlez l’équerrage de la coupe à l’équerre avant de monter le guide, et reprenez la face à la lime : c’est sur elle que l’écrou et le poids retombent à chaque coup.',
      'Check the squareness of the cut with a square before fitting the guide, and dress the face with a file: the nut and the weight land on it at every stroke.',
    ),
    duration: '30 min',
  },
  {
    id: 'seat',
    title: l('Fraiser la portée conique', 'Mill the conical seat'),
    text: l(
      'Fraisez la **portée conique** dans le raccord, une fois l’ensemble monté et bien serré. Les cônes intérieurs des raccords du commerce ne sont pas assez coniques ; la vidéo passe donc une fraise à métaux dans l’ouverture, montée sur une perceuse à colonne, avec le même angle que la tête de clapet. Un cône donne une grande surface d’étanchéité sur un petit diamètre. Un clapet plat, même avec un bon joint, s’est montré peu étanche et peu durable : le joint était mort en 24 h.',
      'Mill the **conical seat** in the fitting, once the stack is assembled and fully tightened. The inner cones of commercial fittings are not conical enough; the video therefore passes a metal-cutting milling cutter through the opening, held in a drill press, with the same angle as the valve head. A cone gives a large sealing area on a small diameter. A flat valve, even with a good seal, proved leaky and short-lived: the seal was dead within 24 hours.',
    ),
    parts: ['valve-seat'],
    tools: [
      l('Fraise à métaux à l’angle de la tête de clapet', 'Metal-cutting cutter at the angle of the valve head'),
      l('Perceuse à colonne', 'Drill press'),
      l('Marqueur', 'Marker pen'),
    ],
    tip: l(
      'Fraisez doucement, puis vérifiez la portée au marqueur : noircissez le cône de la tête, enfoncez-la et tournez, le trait doit s’effacer sur tout le tour. Même ainsi la portée de la vidéo laisse encore suinter un peu d’eau ; le modèle du laboratoire suppose une portée parfaite.',
      'Mill gently, then check the seat with a marker: blacken the cone of the head, push it in and turn it, the mark must wear off all the way round. Even so the video’s seat still weeps a little water; the lab’s model assumes a perfect seat.',
    ),
    duration: '1 h',
  },
  {
    id: 'stem',
    title: l('Fabriquer la tige et la tête du clapet', 'Make the stem and the valve head'),
    text: l(
      'La **tige** part d’une tige filetée de 6 mm. On ne s’en sert pas telle quelle comme axe, car ses petits filets s’useraient très vite dans le guide : l’auteur y enfile des manchons femelles usinés, dont le diamètre colle à celui du guide à un dixième de millimètre près. La tête du clapet est une vis inox raccourcie et percée dans son axe (avant-trou de 3 mm, puis 6 mm) pour recevoir la tige ; sa face d’appui doit être coupée bien droite pour porter sur toute la portée et sous les écrous. Les premières vis, coupées de travers, laissaient encore couler de l’eau, même serrées.',
      'The **stem** starts from a 6 mm threaded rod. It is not used as an axle as it is, because its fine threads would wear out very quickly in the guide: the author slips machined female sleeves over it, whose diameter matches the guide’s to within a tenth of a millimetre. The valve head is a stainless-steel screw cut short and drilled along its axis (3 mm pilot hole, then 6 mm) to take the rod; its bearing face must be cut dead straight to seat all the way round and under the nuts. The first screws, cut crooked, still let water through, even when tightened.',
    ),
    parts: ['valve-stem'],
    tools: [
      l('Perceuse à colonne, étau, mèches de 3 et 6 mm', 'Drill press, vice, 3 and 6 mm drill bits'),
      l('Scie à métaux', 'Hacksaw'),
      l('Pied à coulisse (ajustement à 0,1 mm)', 'Calipers (fit to 0.1 mm)'),
    ],
    tip: l(
      'La vis n’est presque jamais percée dans son axe. La vidéo la serre dans le mandrin de la perceuse à colonne et la descend sur un foret de 3 mm tenu à l’étau, ce qui la centre d’elle-même ; pour la couper d’équerre, elle tourne dans le mandrin pendant qu’une scie à métaux fixée à l’étau l’attaque.',
      'The screw is almost never drilled on its axis. The video holds it in the drill-press chuck and lowers it onto a 3 mm bit held in the vice, which centres it by itself; to cut it square, it turns in the chuck while a hacksaw clamped in the vice attacks it.',
    ),
    warning: l(
      'Deux essais de la vidéo ont échoué : un axe en acier trempé avec un joint plat (joint mort en 24 h) et une tête soudée un peu de travers sur son axe (elle ne fermait pas, le clapet fuyait). Ne soudez pas la tête, ne comptez pas sur un joint plat.',
      'Two of the video’s trials failed: a hardened steel axle with a flat seal (seal dead in 24 h) and a head welded slightly off-axis (it would not close, the valve leaked). Do not weld the head, do not rely on a flat seal.',
    ),
    duration: '3 h',
  },
  {
    id: 'fins',
    title: l('Limer les ailettes sous la tête', 'File the fins under the head'),
    text: l(
      'Limez de petites **ailettes** sous la tête du clapet, comme sur le clapet Walton d’origine. Dans la vidéo, elles servent à faire tourner légèrement le clapet à chaque remontée : la portée ne frappe alors jamais deux fois au même endroit, et un petit défaut de forme ne se creuse pas dans le cône. Sortez la tige du guide pour limer. L’auteur ajoute cette pièce à la fin, sans avoir encore vérifié qu’elle fait bien tourner son clapet : c’est une idée copiée du Walton, pas un résultat démontré.',
      'File small **fins** under the valve head, as on the original Walton valve. In the video they make the valve turn slightly at every rise: the seat then never strikes the same spot twice, and a small shape error does not wear a groove into the cone. Take the stem out of the guide to file. The author adds this part last, without having checked yet that it really turns his valve: it is an idea copied from the Walton, not a demonstrated result.',
    ),
    parts: ['valve-fins'],
    tools: [l('Limes', 'Files'), l('Étau', 'Vice')],
    tip: l(
      'Donnez la même inclinaison à toutes les ailettes, dans le même sens : si elles se contrarient, le jet ne fait pas tourner le clapet.',
      'Give every fin the same slant, in the same direction: if they oppose one another, the jet will not turn the valve.',
    ),
    duration: '30 min',
  },
  {
    id: 'weight',
    title: l('Usiner le poids et monter l’écrou de course', 'Machine the weight and fit the stroke nut'),
    text: l(
      'Le **poids** est un tronçon de barre d’armature de 30 à 32 mm de diamètre, percé dans l’axe et taraudé pour se visser sur la tige ; sa face basse, qui retombe sur le bout du guide à chaque coup, doit être bien plane. L’auteur y a passé environ une heure, à la perceuse à colonne. Son premier poids, fait de gros écrous et de rondelles, se mettait de travers, coinçait le clapet et a arrêté le bélier dans les premiers jours. L’**écrou de réglage de course** se visse ensuite sur la tige : sa position fixe l’écart entre la tête et la portée quand le clapet est ouvert, c’est-à-dire la course. Dans le clapet final, le poids joue lui-même le rôle d’écrou principal, car l’écrou d’origine entrait dans le guide et ne permettait pas de descendre assez bas.',
      'The **weight** is a piece of 30–32 mm rebar, drilled on its axis and tapped to screw onto the rod; its lower face, which drops onto the end of the guide at every stroke, must be flat. The author spent about an hour on it, on the drill press. His first weight, made of big nuts and washers, sat crooked, jammed the valve and stopped the ram within the first days. The **stroke nut** then screws onto the rod: its position sets the gap between the head and the seat when the valve is open, that is, the stroke. In the final valve the weight itself plays the part of the main nut, because the original nut went into the guide and did not allow going low enough.',
    ),
    parts: ['counterweight', 'stroke-nut'],
    tools: [
      l('Perceuse à colonne, étau', 'Drill press, vice'),
      l('Taraud de bonne qualité (M6)', 'Good-quality tap (M6)'),
      l('Scie à métaux, lime ou fraise pour dresser la face', 'Hacksaw, file or cutter to dress the face'),
    ],
    tip: l(
      `Le poids ne sert pas qu’à rabaisser le clapet : il joue sur la vitesse de choc, donc sur la consommation du bélier. Pesez-le. Le modèle règle le clapet n°1 avec ≈ ${nFr(WEIGHT)} g, valeur calibrée sur les chiffres de la vidéo et non mesurée. Un petit coffret de taraudage bon marché n’a pas suffi à tarauder l’acier dans la vidéo.`,
      `The weight does more than pull the valve down: it affects the closing speed, and so the ram’s consumption. Weigh it. The model sets the n°1 valve with ≈ ${nEn(WEIGHT)} g, a value calibrated on the video’s figures, not measured. A small cheap tap-and-die set was not enough to tap steel in the video.`,
    ),
    duration: '1 h',
  },
  {
    id: 'lock-nut',
    title: l('Régler la course et bloquer le contre-écrou', 'Set the stroke and tighten the lock nut'),
    text: l(
      `Réglez la course en vissant ou dévissant l’écrou, puis bloquez-le avec le **contre-écrou**. La course décide de la consommation : plus elle est grande, plus le bélier prend d’eau, et sous une course minimale il ne refoule plus, de sorte que chaque taille de bélier a une consommation minimale et une consommation maximale. À 100 ou 110 coups par minute, chaque vibration peut desserrer l’écrou et dérégler le bélier : le contre-écrou doit être serré à fond. Dans le modèle, le clapet n°1 est réglé à ≈ ${nFr(STROKE, 1)} mm de course (valeur calibrée).`,
      `Set the stroke by turning the nut in or out, then lock it with the **lock nut**. The stroke decides the consumption: the longer it is, the more water the ram takes, and below a minimum stroke it no longer delivers, so each ram size has a minimum and a maximum consumption. At 100–110 strokes a minute every vibration can loosen the nut and detune the ram: the lock nut must be tightened fully. In the model the n°1 valve is set to a stroke of ≈ ${nEn(STROKE, 1)} mm (a calibrated value).`,
    ),
    parts: ['lock-nut'],
    tools: [
      l('Deux clés plates', 'Two open-ended spanners'),
      l('Cale d’épaisseur ou pied à coulisse pour mesurer la course', 'Feeler gauge or calipers to measure the stroke'),
    ],
    tip: l(
      'Tournez l’écrou par fractions de tour et laissez le bélier se stabiliser avant de juger : la consommation et le nombre de coups changent avec la course. Le simulateur le montre avec le scénario « Écrou de course vissé ».',
      'Turn the nut by fractions of a turn and let the ram settle before judging: consumption and stroke rate change with the stroke. The simulator shows it with the “Stroke nut turned in” scenario.',
    ),
    warning: l(
      'Réglez avec des clés, jamais avec les doigts : le poids monte et descend à chaque coup, et la tête du clapet se ferme en quelques centièmes de seconde.',
      'Adjust with spanners, never with your fingers: the weight rises and falls at every stroke, and the valve head shuts in a few hundredths of a second.',
    ),
    duration: '30 min',
  },
  {
    id: 'delivery-side',
    title: l('Monter le clapet de refoulement et la cloche à air', 'Fit the delivery check valve and the air chamber'),
    text: l(
      `Le **clapet anti-retour de refoulement** se monte sur le corps, côté refoulement ; dans la vidéo, ce petit clapet se trouve dans la cloche. Il s’ouvre quand le coup de bélier fait monter la pression du corps au-dessus de celle du refoulement, et se referme dès qu’elle retombe, pour que la colonne d’eau de la conduite ne redescende pas. La **cloche à air**, montée au-dessus, est le coussin qui transforme les à-coups en un débit continu dans la conduite de refoulement. Dans le modèle elle contient ${nFr(CHAMBER.volumeL)} L, dont ${AIR_PERCENT} % d’air à la pression de service (hypothèses).`,
      `The **delivery check valve** is fitted on the body, on the delivery side; in the video this small valve sits inside the chamber. It opens when the water hammer pushes the body pressure above the delivery pressure, and shuts again as soon as it falls, so that the water column in the pipe cannot run back down. The **air chamber**, fitted above it, is the cushion that turns the jolts into a steady flow in the delivery pipe. In the model it holds ${nEn(CHAMBER.volumeL)} L, of which ${AIR_PERCENT} % is air at working pressure (assumptions).`,
    ),
    parts: ['delivery-valve', 'air-chamber'],
    tools: [
      l('Clés à tube', 'Pipe wrenches'),
      l('Ruban d’étanchéité ou pâte à joint pour filetages', 'Thread seal tape or paste'),
    ],
    tip: l(
      'Une cloche noyée rend les coups durs et réduit le refoulement : dans le modèle, sans air, la pointe de pression passe de 6,5 à 7,2 bar et le refoulement baisse de 40 %.',
      'A water-logged chamber makes the strokes harsh and cuts the delivery: in the model, with no air, the pressure peak goes from 6.5 to 7.2 bar and the delivery drops by 40 %.',
    ),
    duration: '45 min',
  },
  {
    id: 'snifter-gauge',
    title: l('Poser le reniflard et le manomètre', 'Fit the snifter and the pressure gauge'),
    text: l(
      'Le **reniflard** est une minuscule soupape qui laisse entrer une pincée d’air dans le corps pendant le recul, quand la pression y passe sous celle de l’air libre ; cet air est ensuite poussé dans la cloche, qu’il recharge. Sans lui, l’air de la cloche se dissout peu à peu dans l’eau et la cloche se noie (dans le modèle, en une quinzaine d’heures avec un reniflard bouché). Le **manomètre** se place côté refoulement : il lit la hauteur d’eau déjà montée (1 bar ≈ 10 m) et atteint environ 6,4 bar quand les 65 m de conduite sont pleins.',
      'The **snifter valve** is a tiny valve that lets a pinch of air into the body during the recoil, when the pressure there drops below atmospheric; that air is then pushed into the chamber, which it tops up. Without it the chamber air gradually dissolves into the water and the chamber becomes water-logged (in the model, in about fifteen hours with a blocked snifter). The **pressure gauge** goes on the delivery side: it reads the height of water already lifted (1 bar ≈ 10 m) and reaches about 6.4 bar once the 65 m of pipe are full.',
    ),
    parts: ['snifter', 'gauge'],
    tools: [l('Clés plates', 'Open-ended spanners'), l('Ruban d’étanchéité', 'Thread seal tape')],
    tip: l(
      'Choisissez un manomètre dont l’échelle va bien au-delà de 6,5 bar, la pointe du modèle avec le clapet n°1, et montez-le sur un raccord qui se démonte sans couper la conduite.',
      'Choose a gauge whose scale goes well beyond 6.5 bar, the model’s peak with the n°1 valve, and fit it on a connection that can be removed without cutting the line.',
    ),
    duration: '20 min',
  },
  {
    id: 'valves',
    title: l('Poser les vannes et la crépine', 'Fit the valves and the strainer'),
    text: l(
      'Posez la **vanne d’arrivée** (V1) sur la conduite motrice, juste avant le bélier : elle l’arrête et permet de le démonter sans vider la réserve. À l’entrée du bélier, la **crépine** arrête feuilles, sable et gravillons avant qu’ils n’aillent se coincer dans le clapet de choc ou sous le clapet de refoulement. La **vanne de sortie** (V3) isole la conduite de refoulement, qui reste pleine de ses 65 m d’eau, pendant qu’on intervient sur le bélier ; la **vanne de vidange** (V2) permet de purger le corps et la cloche.',
      'Fit the **inlet valve** (V1) on the drive pipe, just before the ram: it stops the ram and lets you remove it without emptying the tank. At the ram inlet, the **strainer** catches leaves, sand and grit before they can jam the waste valve or sit under the delivery check valve. The **outlet valve** (V3) isolates the delivery pipe, which stays full of its 65 m of water, while you work on the ram; the **drain valve** (V2) lets you purge the body and the chamber.',
    ),
    parts: ['inlet-valve', 'strainer', 'outlet-valve', 'drain-valve'],
    tools: [l('Clés à tube', 'Pipe wrenches'), l('Ruban d’étanchéité', 'Thread seal tape')],
    warning: l(
      'Avant de démonter quoi que ce soit : fermez V1 pour arrêter le bélier, fermez V3 pour garder la conduite pleine, puis ouvrez la vidange V2. Le corps et la cloche restent à environ 6 bar tant qu’on ne les a pas purgés.',
      'Before taking anything apart: shut V1 to stop the ram, shut V3 to keep the pipe full, then open the drain V2. The body and the chamber stay at about 6 bar until they have been purged.',
    ),
    duration: '45 min',
  },
  {
    id: 'first-start',
    title: l('Premier démarrage et réglage', 'First start and tuning'),
    text: l(
      'Fermez la vidange V2, ouvrez V3, puis ouvrez V1 doucement. Le clapet retombe ouvert, l’eau accélère dans la conduite motrice et son courant finit par plaquer le clapet contre sa portée : c’est le premier coup. Si les coups ne s’enchaînent pas, enfoncez le poids à la main par le dessus puis relâchez-le. Réglez ensuite la course : trop longue, le bélier boit l’eau de la réserve (le clapet n°3 de la vidéo prenait environ 17 L/min, estimation, et s’arrêtait après une dizaine d’heures) ; trop courte, il frappe sans rien refouler. Visez, comme la vidéo avec le clapet n°1, 100 à 110 coups par minute et environ 500 L par jour.',
      'Close the drain V2, open V3, then open V1 gently. The valve drops open, the water accelerates in the drive pipe and its flow finally slams the valve onto its seat: that is the first stroke. If the strokes do not follow one another, press the weight down by hand from above and let go. Then adjust the stroke: too long, the ram drinks the tank dry (the video’s n°3 valve took about 17 L/min, an estimate, and stopped after about ten hours); too short, it strikes and delivers nothing. Aim, like the video with the n°1 valve, for 100–110 strokes a minute and about 500 L a day.',
    ),
    parts: [],
    tools: [
      l('Chronomètre pour compter les coups', 'Stopwatch to count the strokes'),
      l('Clés pour l’écrou et le contre-écrou', 'Spanners for the nut and lock nut'),
    ],
    warning: l(
      'Jamais un doigt dans les lumières du clapet de choc quand le bélier tourne : il se ferme en quelques centièmes de seconde avec plusieurs bars derrière. Enfoncez le poids par le dessus, jamais par les lumières.',
      'Never put a finger in the ports of the waste valve while the ram is running: it shuts in a few hundredths of a second with several bar behind it. Press the weight from above, never through the ports.',
    ),
    duration: '30 min',
  },
];
