// Parts of the `valve` world: the video's waste valve at workshop scale (ids frozen in src/part-ids.ts).
// Status words: see ../part-helpers.ts.
import type { PartInfo } from '@onigam/lab-kit/content';
import { l } from '@onigam/lab-kit/i18n';
import { VALVES } from '../../sim/physics';
import { RANGES } from '../../sim/presets';
import { VALVE } from '../../three/dims';
import { mm, mmBox, nEn, nFr } from '../units';
import { STROKE, WEIGHT, lenMm, sp, tagged } from '../part-helpers';

const GUIDE_LENGTH = VALVE.guideTop - VALVE.guideTubeBottom; // m, derived from two estimated heights

export const VALVE_PARTS: PartInfo[] = [
  {
    id: 'valve-seat',
    scene: 'valve',
    category: 'mechanical',
    name: l('Portée conique', 'Conical seat'),
    short: l(
      'Siège en cône, fraisé au même angle que la tête du clapet : il fait l’étanchéité.',
      'Cone-shaped seat, milled to the same angle as the valve head: it makes the seal.',
    ),
    description: l(
      'La portée est le siège sur lequel la tête du clapet vient s’appuyer quand il se ferme. Elle est conique : un cône offre une grande surface d’étanchéité sur un petit diamètre, ce qu’un clapet plat avec un joint n’a pas donné dans la vidéo (joint mort en 24 h, étanchéité insuffisante). Les cônes intérieurs des raccords du commerce sont trop peu marqués : l’auteur a donc fraisé la portée avec une fraise à métaux, sur le montage serré, au même angle que la vis qui forme la tête. Son diamètre (15 mm nominal pour le n°1) fixe la taille du clapet.',
      'The seat is the surface on which the valve head rests when it closes. It is conical: a cone gives a large sealing area on a small diameter, which a flat valve with a seal did not give in the video (seal dead in 24 h, poor sealing). The inner cones of commercial fittings are too shallow: the author therefore milled the seat with a metal-cutting cutter, on the tightened assembly, at the same angle as the screw that forms the head. Its diameter (15 mm nominal for the n°1) sets the valve size.',
    ),
    material: l('Métal du raccord de plomberie, fraisé', 'Metal of the plumbing fitting, milled'),
    specs: [
      sp(
        'Alésage de la portée',
        'Seat bore',
        l(
          `n°1 : ${nFr(VALVE.seatBore[1] * 1000)} mm · n°2 : ${nFr(VALVE.seatBore[2] * 1000)} mm · n°3 : ${nFr(VALVE.seatBore[3] * 1000)} mm (nominal)`,
          `n°1: ${nEn(VALVE.seatBore[1] * 1000)} mm · n°2: ${nEn(VALVE.seatBore[2] * 1000)} mm · n°3: ${nEn(VALVE.seatBore[3] * 1000)} mm (nominal)`,
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
      sp('Épaisseur de l’anneau de portée (3D)', 'Seat ring thickness (3D)', lenMm('estimate', VALVE.seatThickness)),
      sp('Usinage', 'Machining', l('Fraise à métaux, perceuse à colonne', 'Metal-cutting cutter, drill press')),
    ],
    maintenance: l(
      'La portée travaille à chaque coup. Surveillez le suintement : s’il grossit, reprenez la portée, ou vérifiez qu’un gravillon ne s’est pas glissé sous la tête.',
      'The seat works at every stroke. Watch the weep: if it grows, re-cut the seat, or check that no grit has slipped under the head.',
    ),
    tip: l(
      'Fraisez une fois l’ensemble serré, pas avant : la vidéo travaille sur le montage final pour que la portée ne bouge plus ensuite.',
      'Mill once the assembly is tightened, not before: the video works on the final assembly so that the seat cannot shift afterwards.',
    ),
    video: ['05:52', '06:04', '09:39', '18:32'],
    design: l(
      'Fraisée à l’angle de la tête, elle donne un contact sur tout le tour, durable sans joint, et le cône recentre la tête à chaque fermeture. C’est l’enseignement central de la vidéo : un clapet plat, même avec un bon joint, n’a pas tenu.',
      'Milled to the angle of the head, it gives contact all the way round, durable without a seal, and the cone re-centres the head at every closure. That is the video’s central lesson: a flat valve, even with a good seal, did not last.',
    ),
  },
  {
    id: 'valve-stem',
    scene: 'valve',
    category: 'mechanical',
    name: l('Tige du clapet', 'Valve stem'),
    short: l(
      'Tige filetée de 6 mm avec manchons usinés et tête de vis inox : elle porte la tête, coulisse dans le guide et porte le poids.',
      '6 mm threaded rod with machined sleeves and a stainless screw head: it carries the head, slides in the guide and carries the weight.',
    ),
    description: l(
      'La tige relie la tête du clapet au poids et coulisse dans le guide. Elle part d’une tige filetée de 6 mm, mais une tige filetée ne fait pas un bon axe : ses petits filets s’useraient très vite. L’auteur y enfile donc des manchons femelles usinés, au diamètre du guide à 0,1 mm près. La tête est une vis inox raccourcie, percée dans l’axe (3 mm puis 6 mm) et coupée bien droite pour porter sur toute la portée conique.',
      'The stem links the valve head to the weight and slides in the guide. It starts from a 6 mm threaded rod, but a threaded rod does not make a good axle: its fine threads would wear out very quickly. The author therefore slips machined female sleeves over it, matching the guide’s diameter to 0.1 mm. The head is a stainless-steel screw cut short, drilled on its axis (3 mm then 6 mm) and cut dead straight so that it seats all the way round on the conical seat.',
    ),
    material: l(
      'Tige filetée de 6 mm, manchons usinés, vis inox',
      '6 mm threaded rod, machined sleeves, stainless screw',
    ),
    specs: [
      sp('Tige filetée', 'Threaded rod', `${nFr(VALVE.rodDiameter * 1000)} mm`),
      sp('Ajustement des manchons dans le guide', 'Sleeve fit in the guide', l('à 0,1 mm près', 'to 0.1 mm')),
      sp(
        'Tête de clapet (3D)',
        'Valve head (3D)',
        tagged(
          'estimate',
          `Ø ${mm(VALVE.headDiameter).fr} × ${mm(VALVE.headHeight).fr} mm`,
          `Ø ${mm(VALVE.headDiameter).en} × ${mm(VALVE.headHeight).en} mm`,
        ),
      ),
      sp(
        'Masse mobile à vide (n°1)',
        'Bare moving mass (n°1)',
        tagged('assumed', `${nFr(VALVES[1].bareMass * 1000)} g`),
      ),
      sp('Course du clapet', 'Valve stroke', tagged('calibrated', `${nFr(STROKE, 1)} mm`, `${nEn(STROKE, 1)} mm`)),
    ],
    maintenance: l(
      'Contrôlez que les manchons n’ont pas pris de jeu dans le guide et que la tête est toujours serrée sur la tige : un clapet qui s’incline porte mal sur sa portée.',
      'Check that the sleeves have not worked loose in the guide and that the head is still tight on the rod: a valve that tilts seats badly.',
    ),
    tip: l(
      'Ne soudez pas la tête sur l’axe : l’essai soudé un peu de travers de la vidéo ne fermait pas, et un axe en acier trempé avec un joint plat a perdu son joint en 24 h.',
      'Do not weld the head on the axle: the video’s slightly off-axis welded trial would not close, and a hardened steel axle with a flat seal lost its seal in 24 h.',
    ),
    video: ['05:35', '08:38', '09:47', '10:48'],
    design: l(
      'Des manchons plutôt que des filets : on use un manchon remplaçable, pas la tige, et l’ajustement serré garde la tête dans l’axe de la portée pour qu’elle ferme sur tout le tour.',
      'Sleeves rather than threads: a replaceable sleeve wears, not the rod, and the close fit keeps the head on the seat’s axis so that it closes all the way round.',
    ),
  },
  {
    id: 'valve-guide',
    scene: 'valve',
    category: 'mechanical',
    name: l('Doigt de gant (guide)', 'Thermowell guide'),
    short: l(
      'Doigt de gant inox qui guide la tige et sert de butée au poids.',
      'Stainless thermowell that guides the stem and acts as the stop for the weight.',
    ),
    description: l(
      'Le guide est un doigt de gant inox, normalement fait pour loger les sondes de température des chauffe-eau solaires et des chaudières ; l’auteur, chauffagiste et solariste, en avait sous la main. Coupé à la bonne longueur pour ne pas trop dépasser de la zone des lumières, il forme le canal où coulisse la tige. Son extrémité reçoit le poids (le gros écrou de la tige) à chaque coup, ce qui impose une face plane et d’équerre : une première coupe de travers faisait craindre à l’auteur un déséquilibre, voire un coincement.',
      'The guide is a stainless-steel thermowell, normally made to hold the temperature probes of solar water heaters and boilers; the author, a heating and solar installer, had some to hand. Cut to length so that it does not stick out too far above the port area, it forms the channel in which the stem slides. Its end receives the weight (the stem’s main nut) at every stroke, which demands a flat, square face: a first crooked cut made the author fear an imbalance, even a jam.',
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
        'Longueur (3D)',
        'Length (3D)',
        tagged(
          'derived',
          `${mm(GUIDE_LENGTH).fr} mm, d’après les cotes estimées`,
          `${mm(GUIDE_LENGTH).en} mm, from the estimated heights`,
        ),
      ),
      sp('Face d’extrémité', 'End face', l('Plane et perpendiculaire à l’axe', 'Flat and square to the axis')),
    ],
    maintenance: l(
      'Gardez l’alésage propre et sans rayure : le jeu avec les manchons est de l’ordre du dixième de millimètre, et un grain de sable suffit à gêner la tige.',
      'Keep the bore clean and unscratched: the clearance with the sleeves is about a tenth of a millimetre, and a grain of sand is enough to hinder the stem.',
    ),
    tip: l(
      'Mesurez l’alésage avant d’usiner les manchons : c’est lui qui fixe le diamètre à tenir à 0,1 mm près.',
      'Measure the bore before machining the sleeves: it sets the diameter to hold within 0.1 mm.',
    ),
    video: ['08:16', '08:31', '15:36'],
    design: l(
      'Un tube fermé à une extrémité, déjà calibré pour recevoir une sonde, donne à bas coût un alésage guidé ; sa tranche sert de butée plane à l’écrou et au poids.',
      'A tube closed at one end, already calibrated to take a probe, gives a guiding bore at low cost; its end face acts as a flat stop for the nut and the weight.',
    ),
  },
  {
    id: 'stroke-nut',
    scene: 'valve',
    category: 'mechanical',
    name: l('Écrou de réglage de course', 'Stroke nut'),
    short: l(
      'Écrou dont la position règle la course du clapet, donc la consommation du bélier.',
      'Nut whose position sets the valve stroke, and so the ram’s consumption.',
    ),
    description: l(
      'L’écrou de réglage fixe l’écart entre la tête et la portée quand le clapet est ouvert : la course. Comme la course décide de la consommation, c’est le réglage le plus important du bélier ; sous une course minimale il ne refoule plus, si bien que chaque taille de bélier a une consommation minimale et maximale. Dans le premier montage de la vidéo c’est un écrou ordinaire ; dans le clapet final, le poids usiné joue lui-même le rôle d’écrou principal, car l’écrou d’origine entrait dans le guide et empêchait de descendre assez bas. Le laboratoire garde les deux pièces séparées pour que chaque rôle soit visible.',
      'The adjusting nut sets the gap between the head and the seat when the valve is open: the stroke. Since the stroke decides the consumption, it is the ram’s most important setting; below a minimum stroke it no longer delivers, so each ram size has a minimum and a maximum consumption. In the video’s first version it is an ordinary nut; in the final valve the machined weight itself plays the part of the main nut, because the original nut went into the guide and prevented going low enough. The lab keeps the two parts separate so that each role can be seen.',
    ),
    material: l('Acier, écrou standard M6 (estimation)', 'Steel, standard M6 nut (estimate)'),
    specs: [
      sp('Filetage', 'Thread', l('Tige de 6 mm', '6 mm rod')),
      sp(
        'Écrou (3D)',
        'Nut (3D)',
        tagged(
          'estimate',
          `${mm(VALVE.nutAcrossFlats).fr} mm sur plats × ${mm(VALVE.nutThickness).fr} mm`,
          `${mm(VALVE.nutAcrossFlats).en} mm across flats × ${mm(VALVE.nutThickness).en} mm`,
        ),
      ),
      sp('Course du n°1', 'Stroke of the n°1', tagged('calibrated', `${nFr(STROKE, 1)} mm`, `${nEn(STROKE, 1)} mm`)),
      sp(
        'Plage du simulateur',
        'Simulator range',
        l(
          `${nFr(RANGES.stroke.min, 1)} à ${nFr(RANGES.stroke.max)} mm`,
          `${nEn(RANGES.stroke.min, 1)} to ${nEn(RANGES.stroke.max)} mm`,
        ),
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
      'Contrôlez la position de l’écrou après les premiers jours, puis chaque fois que la cadence change : un écrou qui a bougé change la consommation sans que rien ne se voie.',
      'Check the nut’s position after the first days, then whenever the rate changes: a nut that has moved changes the consumption without anything showing.',
    ),
    tip: l(
      'Réduire la course réduit la consommation, mais pas indéfiniment : dans le scénario « Écrou de course vissé » du simulateur, le refoulement s’arrête vers 1,5 mm.',
      'Reducing the stroke reduces the consumption, but not indefinitely: in the simulator’s “Stroke nut turned in” scenario the delivery stops around 1.5 mm.',
    ),
    video: ['12:51', '13:06', '17:40'],
    design: l(
      'Une course courte referme le clapet plus tôt, avec moins d’eau perdue ; trop courte, le coup est trop faible pour ouvrir le clapet de refoulement. L’écrou règle ce compromis, au dixième de millimètre.',
      'A short stroke shuts the valve earlier, with less water lost; too short, the hammer is too weak to open the delivery check valve. The nut sets that compromise, to a tenth of a millimetre.',
    ),
  },
  {
    id: 'lock-nut',
    scene: 'valve',
    category: 'mechanical',
    name: l('Contre-écrou', 'Lock nut'),
    short: l(
      'Écrou serré contre l’écrou de course pour qu’il ne se desserre pas.',
      'Nut tightened against the stroke nut so that it cannot work loose.',
    ),
    description: l(
      'Le contre-écrou bloque l’écrou de réglage. À 100–110 coups par minute, chaque vibration peut desserrer l’écrou et dérégler le bélier, alors que sa position fixe la consommation : les deux doivent être serrés l’un contre l’autre, à fond. L’ancien clapet faisait 70 à 80 coups par minute ; le nouveau en fait 100 à 110, ce qui rend le blocage plus important. Avec le poids qui sert d’écrou principal, le contre-écrou se visse simplement par-dessus et permet un réglage très fin de la consommation.',
      'The lock nut locks the adjusting nut. At 100–110 strokes a minute every vibration can loosen the nut and detune the ram, while its position fixes the consumption: the two must be tightened against each other, fully. The old valve made 70 to 80 strokes a minute; the new one makes 100 to 110, which makes the locking more important. With the weight serving as the main nut, the lock nut simply screws on top and allows a very fine adjustment of the consumption.',
    ),
    material: l('Acier, écrou standard M6 (estimation)', 'Steel, standard M6 nut (estimate)'),
    specs: [
      sp('Filetage', 'Thread', l('Tige de 6 mm', '6 mm rod')),
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
    ],
    maintenance: l(
      'Vérifiez-le à chaque visite. Un trait de peinture sur l’écrou et la tige montre tout de suite un desserrage.',
      'Check it on every visit. A paint line across the nut and the rod shows loosening at once.',
    ),
    tip: l(
      'Resserrez le contre-écrou après chaque réglage, avec une clé : le poids monte et descend à chaque coup.',
      'Retighten the lock nut after every adjustment, with a spanner: the weight rises and falls at every stroke.',
    ),
    video: ['13:29', '13:37', '18:02'],
    design: l(
      'Deux écrous serrés l’un contre l’autre se bloquent par friction mutuelle : c’est la solution classique contre le desserrage par vibration.',
      'Two nuts tightened against each other lock by mutual friction: the classic cure for loosening under vibration.',
    ),
  },
  {
    id: 'counterweight',
    scene: 'valve',
    category: 'mechanical',
    name: l('Poids (barre d’armature)', 'Counterweight (rebar)'),
    short: l(
      'Tronçon de fer à béton de 30–32 mm, usiné dans l’axe : il rabaisse le clapet et règle sa vitesse de choc.',
      'Piece of 30–32 mm rebar machined on its axis: it pulls the valve down and sets its closing speed.',
    ),
    description: l(
      'Le poids tire le clapet vers le bas, donc l’ouvre après chaque coup, et il joue sur la vitesse de choc, donc sur la consommation du bélier. Dans la vidéo, c’est un tronçon de barre d’armature de 30 à 32 mm, percé dans l’axe, taraudé et dressé en plan à la perceuse à colonne : une bonne heure de travail. Le premier poids, fait de gros écrous et de rondelles, se mettait de travers, coinçait le clapet et a arrêté le bélier dans les premiers jours. Le poids retombe sur la tranche du guide à chaque coup : sa face doit être bien plane. La masse n’est pas donnée dans la vidéo.',
      'The weight pulls the valve down, so opens it after every stroke, and it affects the closing speed, and so the ram’s consumption. In the video it is a piece of 30–32 mm rebar, drilled on its axis, tapped and faced flat on the drill press: a good hour of work. The first weight, made of big nuts and washers, sat crooked, jammed the valve and stopped the ram within the first days. The weight drops onto the end face of the guide at every stroke: its face must be flat. The mass is not given in the video.',
    ),
    material: l('Acier, barre d’armature (fer à béton) de 30–32 mm', 'Steel, 30–32 mm rebar bar'),
    specs: [
      sp('Barre d’armature', 'Rebar', l('Ø 30 à 32 mm', 'Ø 30 to 32 mm')),
      sp('Masse pour le n°1', 'Mass for the n°1', tagged('calibrated', `≈ ${nFr(WEIGHT)} g`, `≈ ${nEn(WEIGHT)} g`)),
      sp(
        'Pièce dessinée en 3D',
        'Part drawn in 3D',
        tagged(
          'derived',
          `Ø ${mm(VALVE.counterweightDiameter).fr} × ${mm(VALVE.counterweightLength).fr} mm`,
          `Ø ${mm(VALVE.counterweightDiameter).en} × ${mm(VALVE.counterweightLength).en} mm`,
        ),
      ),
      sp('Fixation', 'Fastening', l('Taraudé sur la tige de 6 mm', 'Tapped onto the 6 mm rod')),
      sp('Temps d’usinage', 'Machining time', l('Environ 1 h', 'About 1 h')),
    ],
    maintenance: l(
      'Contrôlez que le poids retombe bien à plat sur le guide et qu’il n’a pas de jeu sur la tige : un poids de travers coince le clapet.',
      'Check that the weight lands flat on the guide and has no play on the rod: a crooked weight jams the valve.',
    ),
    tip: l(
      'Un petit coffret de taraudage bon marché n’a pas suffi à tarauder l’acier dans la vidéo : prenez un taraud de bonne qualité. Pesez le poids fini : la masse joue aussi sur la consommation.',
      'A small cheap tap-and-die set was not enough to tap steel in the video: use a good-quality tap. Weigh the finished weight: the mass also affects the consumption.',
    ),
    video: ['14:14', '15:59', '17:01'],
    design: l(
      'Une masse plus grande exige un courant plus rapide pour fermer le clapet : la vitesse de choc, donc la violence du coup, monte avec elle. D’un seul bloc plutôt que d’écrous empilés, le poids ne se met plus de travers.',
      'A larger mass needs a faster flow to close the valve: the closing speed, and so the violence of the hammer, rises with it. In one piece rather than stacked nuts, the weight no longer sits crooked.',
    ),
  },
  {
    id: 'valve-fins',
    scene: 'valve',
    category: 'mechanical',
    name: l('Ailettes', 'Fins'),
    short: l(
      'Petites ailettes limées sous la tête : elles font tourner le clapet à chaque remontée.',
      'Small fins filed under the head: they turn the valve a little at every rise.',
    ),
    description: l(
      'Sur le clapet Walton d’origine, de petites ailettes sous le clapet le font tourner un peu à chaque remontée : la portée ne frappe ainsi jamais deux fois au même endroit, et l’usure se répartit sur toute la circonférence au lieu de creuser là où un petit défaut de forme frappe toujours. L’auteur les copie à la lime sous son propre clapet, à la fin du tournage, sans avoir pu encore vérifier que cela tourne. Leur nombre et leur angle ne sont pas donnés.',
      'On the original Walton valve, small fins under the valve turn it slightly at every rise: the seat then never strikes the same spot twice, and the wear is spread around the whole circumference instead of digging where a small shape defect always strikes. The author copies them with a file under his own valve, at the end of filming, without yet being able to check that it turns. Their number and angle are not given.',
    ),
    material: l('Acier inox, limées dans la tête du clapet', 'Stainless steel, filed into the valve head'),
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
      sp('Angle des ailettes', 'Fin angle', l('Non donné par la vidéo', 'Not given in the video')),
    ],
    maintenance: l(
      'Regardez la trace sur la portée : une trace régulière sur tout le tour signale un clapet qui tourne ; une trace d’un seul côté signale qu’il ne tourne pas ou qu’il frappe de biais.',
      'Look at the mark on the seat: an even mark all the way round means the valve is turning; a mark on one side only means it is not turning, or that it strikes at an angle.',
    ),
    tip: l(
      'Donnez la même inclinaison à toutes les ailettes, dans le même sens : si elles se contrarient, l’eau ne fait pas tourner le clapet.',
      'Give every fin the same slant, in the same direction: if they oppose one another, the water does not turn the valve.',
    ),
    video: ['12:02', '12:35'],
    design: l(
      'Une tête qui tourne use la portée sur toute sa circonférence ; sans rotation, le moindre défaut de forme finit par creuser une fuite.',
      'A head that turns wears the seat over its whole circumference; without rotation, the slightest shape defect ends up cutting a leak.',
    ),
  },
  {
    id: 'base-plate',
    scene: 'valve',
    category: 'structure',
    name: l('Platine de base', 'Base plate'),
    short: l(
      'Plaque boulonnée sur le corps qui porte le corps du clapet de choc.',
      'Plate bolted onto the body that carries the waste valve body.',
    ),
    description: l(
      'La platine remplace celle du clapet d’origine : elle est découpée à la même taille et percée aux mêmes endroits pour se boulonner sur le corps du bélier. Un raccord en acier y est soudé, qui reçoit les raccords de plomberie du corps de clapet. Le volume sous le clapet reçoit l’eau et pousse sur la tête pour la fermer. Dans la vidéo ce raccord est un 20×27 ; l’auteur reconnaît qu’un 26×34 aurait permis de faire la base directement et d’économiser deux raccords.',
      'The plate replaces that of the original valve: it is cut to the same size and drilled in the same places to bolt onto the ram body. A steel fitting is welded onto it, which receives the plumbing fittings of the valve body. The volume under the valve takes the water and pushes on the head to close it. In the video this fitting is a 20×27; the author admits that a 26×34 would have let him make the base directly and save two fittings.',
    ),
    material: l('Acier (plaque découpée, raccord soudé)', 'Steel (cut plate, welded fitting)'),
    specs: [
      sp('Trous', 'Holes', l('Mêmes positions que la platine d’origine', 'Same positions as the original plate')),
      sp(
        'Plaque (3D)',
        'Plate (3D)',
        tagged(
          'estimate',
          `${mmBox(VALVE.basePlateSide, VALVE.basePlateSide, VALVE.basePlateThickness).fr} mm, 4 boulons`,
          `${mmBox(VALVE.basePlateSide, VALVE.basePlateSide, VALVE.basePlateThickness).en} mm, 4 bolts`,
        ),
      ),
      sp(
        'Raccord soudé (3D)',
        'Welded fitting (3D)',
        tagged(
          'estimate',
          `26×34, Ø ${mm(VALVE.weldedFittingDiameter).fr} × ${mm(VALVE.weldedFittingHeight).fr} mm`,
          `26×34, Ø ${mm(VALVE.weldedFittingDiameter).en} × ${mm(VALVE.weldedFittingHeight).en} mm`,
        ),
      ),
      sp(
        'Raccord de la vidéo',
        'Video’s fitting',
        l('20×27 (le 26×34 aurait été préférable)', '20×27 (a 26×34 would have been better)'),
      ),
    ],
    maintenance: l(
      'Contrôlez le serrage des boulons de la platine et l’absence de suintement entre la platine et le corps.',
      'Check the tightness of the plate bolts and that nothing weeps between the plate and the body.',
    ),
    tip: l(
      'Soudez le raccord bien d’équerre avec la platine : tout ce qui est au-dessus (portée, guide, tige) doit partager un seul axe.',
      'Weld the fitting square to the plate: everything above it (seat, guide, stem) must share a single axis.',
    ),
    video: ['06:36', '06:48', '06:58'],
    design: l(
      'Reprendre le gabarit de la platine d’origine permet de changer de clapet sans toucher au corps du bélier : seule la pièce qui pose problème est remplacée.',
      'Reusing the original plate’s pattern lets the valve be changed without touching the ram body: only the part that causes the trouble is replaced.',
    ),
  },
];
