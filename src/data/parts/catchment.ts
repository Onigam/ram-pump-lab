// Parts of the `catchment` world: the spring box and the buffer tank (ids frozen in src/part-ids.ts).
// Status words: see ../part-helpers.ts. Conventions (maintenance paragraph, who says what, FIG placeholders): see ./site.ts.
//
// WHAT THE SOURCES GIVE. The video (S1) says only that the buffer tank "captures the spring", that the n°3 valve drew
// ≈ 17 L/min (the author's estimate) and emptied it in ≈ 10 h, that the spring gave 10 then 7.5–7.8 L/min, and that
// someone had to go and restart the ram every two days. It shows neither the spring box nor any fitting of the tank.
// Everything else in this world is the common practice of spring protection and of small gravity water systems, named
// as such in the sheets: Oxfam, technical brief « Spring protection » (TB5, 2008, after Jordan 1984); Practical Action,
// technical brief « Hydraulic ram pumps » (the drive pipe is fed through a strainer); NC State Extension (S4). The
// dimensions come from src/three/dims.ts and are all estimates; no sheet gives a « build it for real » size.
import type { PartInfo } from '@onigam/lab-kit/content';
import { l } from '@onigam/lab-kit/i18n';
import { CATCHMENT, SITE as SITE_DIMS, SPRING, TANK } from '../../three/dims';
import { mm, nEn, nEnTrim, nFr, nFrTrim } from '../units';
import { diaH, lenM, lenMm, sp, tagged } from '../part-helpers';
import { lf, tf } from './site';

export const CATCHMENT_PARTS: PartInfo[] = [
  {
    id: 'spring-box',
    scene: 'catchment',
    category: 'structure',
    name: l('Regard de captage', 'Spring box'),
    short: l(
      'Petit bassin de pierre qui recueille la source à son émergence et la protège de la pollution de surface.',
      'Small stone basin that collects the spring where it emerges and shields it from surface pollution.',
    ),
    description: lf(
      'Le regard de captage est une chambre fermée posée là où l’eau sort de terre : le filtre à gravier y amène l’eau par des orifices percés dans le mur côté source, un piège à sédiments en occupe le fond, et une seule sortie la conduit vers la réserve, à l’abri du ruissellement, des feuilles et des animaux. La vidéo ne détaille pas le captage (l’auteur dit seulement que la réserve tampon capte la source) ; ce regard et ses dimensions sont dessinés par le laboratoire d’après la pratique courante de protection des sources (fiche Oxfam). Sa règle d’or est de ne jamais gêner l’eau : une source mise en contre-pression peut se déplacer ou perdre du débit, d’où une sortie au niveau du sol, plus bas que le point où la source sort, et un petit trop-plein juste au-dessus du niveau de service et sous le haut du lit de gravier, pour que rien ne puisse refluer dans le gravier (Oxfam). Un bouchon de vidange sur chaîne, dans le fond, permet de vider les sédiments (Oxfam parle de vidange) ; le regard doit recueillir les {source} à {sourceHigh} L/min de la vidéo sans rien en perdre.',
      'The spring box is a closed chamber set where the water comes out of the ground: the gravel filter brings the water in through ports in the wall on the spring side, a sediment trap fills its bottom, and a single outlet leads the water to the tank, sheltered from run-off, leaves and animals. The video does not detail the catchment (the author only says that the buffer tank captures the spring); this box and its dimensions are drawn by the lab, after the common practice of spring protection (Oxfam brief). Its golden rule is never to hinder the water: a spring put under back-pressure can move or lose flow, hence an outlet at ground level, lower than the point where the spring comes out, and a small overflow just above the working level and under the top of the gravel bed, so that nothing can back up into the gravel (Oxfam). A washout plug on a chain, in the floor, lets the sediment be emptied (Oxfam speaks of a washout); the box has to collect the video’s {source}–{sourceHigh} L/min without losing any of it.',
    ),
    material: l(
      'Pierre maçonnée ou béton, couvercle en acier galvanisé (hypothèse du laboratoire ; non détaillé dans la vidéo)',
      'Mortared stone or concrete, galvanised steel lid (lab assumption; not detailed in the video)',
    ),
    specs: [
      sp(
        'Bassin intérieur (3D)',
        'Inner basin (3D)',
        lenM('estimate', SPRING.basinLength, SPRING.basinWidth, SPRING.basinDepth),
      ),
      sp('Épaisseur des murs', 'Wall thickness', lenMm('estimate', SPRING.basinWall)),
      sp('Dalle de fond', 'Floor slab', lenMm('estimate', SPRING.boxFloor)),
      sp('Margelle au-dessus du sol', 'Rim above the ground', lenMm('estimate', SPRING.boxRim)),
      sp(
        'Orifices d’entrée',
        'Inlet ports',
        tagged(
          'estimate',
          `${CATCHMENT.boxPortCount} × Ø ${mm(CATCHMENT.boxPortDiameter).fr} mm, à ${mm(CATCHMENT.boxPortHeight).fr} mm du fond`,
          `${CATCHMENT.boxPortCount} × Ø ${mm(CATCHMENT.boxPortDiameter).en} mm, ${mm(CATCHMENT.boxPortHeight).en} mm above the floor`,
        ),
      ),
      sp(
        'Sortie au-dessus du fond',
        'Outlet above the floor',
        tagged(
          'derived',
          `${mm(CATCHMENT.boxOutletHeight).fr} mm : le fond en dessous piège les sédiments`,
          `${mm(CATCHMENT.boxOutletHeight).en} mm: the bottom below it traps the sediment`,
        ),
      ),
      sp(
        'Couvercle',
        'Lid',
        tagged(
          'estimate',
          `acier galvanisé, ${mm(CATCHMENT.boxLidThickness).fr} mm`,
          `galvanised steel, ${mm(CATCHMENT.boxLidThickness).en} mm`,
        ),
      ),
      sp(
        'Aération',
        'Vent',
        tagged(
          'estimate',
          `tuyau Ø ${mm(CATCHMENT.boxVentDiameter).fr} mm, ${mm(CATCHMENT.boxVentRise).fr} mm au-dessus de la margelle`,
          `pipe Ø ${mm(CATCHMENT.boxVentDiameter).en} mm, ${mm(CATCHMENT.boxVentRise).en} mm above the rim`,
        ),
      ),
      sp(
        'Trop-plein du regard',
        'Box overflow',
        tagged(
          'estimate',
          `tuyau Ø ${mm(CATCHMENT.boxOverflowDiameter).fr} mm à clapet anti-animaux, axe à ${mm(CATCHMENT.boxOverflowHeight).fr} mm du fond`,
          `pipe Ø ${mm(CATCHMENT.boxOverflowDiameter).en} mm with an animal flap, axis ${mm(CATCHMENT.boxOverflowHeight).en} mm above the floor`,
        ),
      ),
      sp(
        'Bouchon de vidange',
        'Washout plug',
        tagged(
          'estimate',
          `Ø ${mm(CATCHMENT.boxWashoutDiameter).fr} mm, dans le fond, sur chaîne`,
          `Ø ${mm(CATCHMENT.boxWashoutDiameter).en} mm, in the floor, on a chain`,
        ),
      ),
      sp('Débit à recueillir', 'Flow to collect', lf('{source} à {sourceHigh} L/min', '{source}–{sourceHigh} L/min')),
    ],
    maintenance: l(
      '**Panne à prévoir.** Le regard se comble de feuilles, de limon ou de racines, un animal y entre, ou l’eau de ruissellement s’y mêle : le débit baisse ou l’eau se salit. **À vérifier.** Soulevez le couvercle : l’eau doit être claire, le niveau stable, la sortie dégagée, sans traces d’animaux ; le fond sous la sortie garde les sédiments, il se remplit avec le temps, et le clapet du petit trop-plein doit battre librement. Mesurez le débit au seau à la sortie (voir la source) ; une eau trouble après la pluie signale un ruissellement qui entre. Ne la goûtez pas : une source n’est pas garantie potable. **Entretien.** Inspection sanitaire une à deux fois par an, nettoyage annuel du fossé de garde en amont et du pourtour clôturé, vidage des sédiments de temps en temps en tirant le bouchon de vidange (Oxfam).',
      '**Typical failure.** The box fills with leaves, silt or roots, an animal gets in, or run-off water mixes in: the flow falls or the water gets dirty. **How to check.** Lift the lid: the water should be clear, the level steady, the outlet clear, with no animal tracks; the bottom below the outlet keeps the sediment, and fills up with time, and the flap of the small overflow must swing freely. Measure the flow with a bucket at the outlet (see the spring); water that turns cloudy after rain points to run-off getting in. Do not taste it: a spring is not guaranteed potable. **Upkeep.** Sanitary inspection once or twice a year, yearly cleaning of the cut-off ditch upslope and of the fenced surroundings, sediment emptied from time to time by pulling the washout plug (Oxfam).',
    ),
    tip: l(
      'Ne mettez jamais l’eau sous pression contre la source : gardez la sortie du regard plus basse que le point où elle sort. Une source gênée suit le chemin le plus facile et peut ressortir ailleurs (Oxfam).',
      'Never put the water under pressure against the spring: keep the outlet of the box lower than the point where the spring comes out. A hindered spring follows the easiest path and can come out elsewhere (Oxfam).',
    ),
    design: l(
      'Le regard protège la source plutôt qu’il ne la traite : fermé, clôturé et drainé en amont, il tient la pollution de surface hors de l’eau, mais ne la rend pas potable. Il fait aussi bassin de décantation : une sortie placée au-dessus du fond laisse les sédiments se déposer avant la réserve.',
      'The box protects the spring rather than treating it: closed, fenced and drained upslope, it keeps surface pollution out of the water, but does not make it potable. It also acts as a settling basin: an outlet set above the floor lets the sediment settle before the tank.',
    ),
  },
  {
    id: 'gravel-filter',
    scene: 'catchment',
    category: 'hydraulic',
    name: l('Filtre à gravier', 'Gravel filter'),
    short: l(
      'Lit de pierres et de gravier qui retient la terre et laisse passer l’eau vers le regard.',
      'Bed of stones and gravel that holds back the soil and lets the water through to the box.',
    ),
    description: l(
      'Le filtre à gravier est un lit de pierres entre la roche d’où sort la source et le regard : l’eau le traverse lentement et y laisse la terre et le limon. Dans le dessin du laboratoire il est gradué comme dans la fiche Oxfam, les plus petites pierres près de l’émergence et les plus grosses contre le mur du regard. Il protège aussi l’émergence en la couvrant d’un matelas perméable (Oxfam). Ce n’est pas un traitement : il arrête les grains et les débris, pas les microbes, et l’eau n’en devient pas potable. La vidéo n’en parle pas ; ce lit est dessiné d’après la pratique courante, et ses dimensions comme ses grains sont des estimations.',
      'The gravel filter is a bed of stones between the rock the spring comes out of and the box: the water crosses it slowly and leaves its soil and silt there. In the lab’s drawing it is graded as in the Oxfam brief, the smallest stones near the emergence and the largest against the wall of the box. It also protects the emergence by covering it with a permeable blanket (Oxfam). It is not a treatment: it stops grains and debris, not microbes, and the water does not become potable. The video does not mention it; this bed is drawn after common practice, and its dimensions and grains are estimates.',
    ),
    material: l('Pierres et gravier lavés (hypothèse du laboratoire)', 'Washed stones and gravel (lab assumption)'),
    specs: [
      sp(
        'Rôle',
        'Role',
        l('Retenir la terre et le limon, laisser passer l’eau', 'Hold back soil and silt, let the water through'),
      ),
      sp(
        'Traitement de l’eau',
        'Water treatment',
        l('Aucun : l’eau n’en devient pas potable', 'None: the water does not become potable'),
      ),
      sp(
        'Longueur × largeur (3D)',
        'Length × width (3D)',
        lenM('estimate', CATCHMENT.filterLength, CATCHMENT.filterWidth),
      ),
      sp(
        'Grains, du côté roche au côté regard (3D)',
        'Grains, from the rock side to the box side (3D)',
        tagged(
          'estimate',
          `${mm(CATCHMENT.grainFine).fr}, ${mm(CATCHMENT.grainMedium).fr} puis ${mm(CATCHMENT.grainCoarse).fr} mm`,
          `${mm(CATCHMENT.grainFine).en}, ${mm(CATCHMENT.grainMedium).en} then ${mm(CATCHMENT.grainCoarse).en} mm`,
        ),
      ),
      sp(
        'Part de la longueur de chaque zone (3D)',
        'Share of the length of each zone (3D)',
        tagged(
          'estimate',
          CATCHMENT.filterZones.map((z) => nFr(z * 100)).join(' / ') + ' %',
          CATCHMENT.filterZones.map((z) => nEn(z * 100)).join(' / ') + '%',
        ),
      ),
      sp('Bordure de pierres', 'Stone kerb', lenMm('estimate', CATCHMENT.filterKerb)),
      sp('Débit à passer', 'Flow to pass', lf('{source} à {sourceHigh} L/min', '{source}–{sourceHigh} L/min')),
    ],
    maintenance: l(
      '**Panne à prévoir.** Le lit se colmate (limon, racines, dépôts de calcaire) : l’eau passe moins bien, le niveau baisse dans le regard alors que la source suinte à côté. **À vérifier.** Comparez le débit au seau avec celui de l’an dernier, à la même saison : une baisse sans sécheresse évoque un colmatage. Une eau qui se trouble après la pluie signale du limon qui franchit le lit ou un ruissellement qui entre. **Entretien.** Lavez ou remplacez le gravier colmaté en reposant le matelas de la même façon, sans jamais laisser l’émergence à nu.',
      '**Typical failure.** The bed clogs (silt, roots, limescale): the water passes less easily, the level drops in the box while the spring seeps nearby. **How to check.** Compare the bucket flow with last year’s, in the same season: a drop with no drought suggests clogging. Water that turns cloudy after rain points to silt crossing the bed or to run-off getting in. **Upkeep.** Wash or replace the clogged gravel, laying the blanket back the same way, and never leave the emergence bare.',
    ),
    tip: l(
      'Graduez le lit : un gravier uniformément fin se colmate vite, un gravier uniformément gros ne retient rien. Comme dans la fiche Oxfam, les plus petites pierres vont près de l’émergence et les plus grosses contre le mur du regard, dans le sens de l’écoulement.',
      'Grade the bed: uniformly fine gravel clogs fast, uniformly coarse gravel holds nothing back. As in the Oxfam brief, the smallest stones go near the emergence and the largest against the wall of the box, in the direction of the flow.',
    ),
    design: l(
      'Un lit de pierres est l’ouvrage le plus simple qui arrête les grains sans gêner l’eau : il ne demande ni énergie ni réglage, et il évite de mettre l’eau sous pression contre la source.',
      'A bed of stones is the simplest structure that stops grains without hindering the water: it needs no energy and no adjustment, and it avoids putting the water under pressure against the spring.',
    ),
  },
  {
    id: 'feed-pipe',
    scene: 'catchment',
    category: 'hydraulic',
    name: l('Conduite d’alimentation', 'Feed pipe'),
    short: l(
      'Tuyau en pente qui mène l’eau du regard de captage jusqu’à la réserve, sans pression.',
      'Sloping pipe that leads the water from the spring box to the tank, with no pressure.',
    ),
    description: lf(
      'La conduite d’alimentation descend du regard de captage vers la réserve tampon : environ ' +
        nFrTrim(SPRING.distanceToTank) +
        ' m dans le dessin du laboratoire, en polyéthylène de ' +
        mm(SPRING.feedPipeDiameter).fr +
        ' mm de diamètre extérieur, avec une pente de ' +
        nFr(CATCHMENT.feedFall * 100) +
        ' % (estimations). L’eau y coule sous la seule pente, à {source} L/min ou un peu plus ; il n’y a ni choc ni pression, donc un tuyau en plastique y convient, contrairement à la conduite motrice. Elle traverse le couvercle et finit à l’air libre, ' +
        mm(CATCHMENT.feedEnd - TANK.height).fr +
        ' mm au-dessus du niveau du trop-plein : une cuve pleine ne fait jamais refluer l’eau vers la source. La vidéo ne la montre pas.',
      'The feed pipe runs down from the spring box to the buffer tank: about ' +
        nEnTrim(SPRING.distanceToTank) +
        ' m in the lab’s drawing, in polyethylene of ' +
        mm(SPRING.feedPipeDiameter).en +
        ' mm outer diameter, with a slope of ' +
        nEn(CATCHMENT.feedFall * 100) +
        '% (estimates). The water flows in it on slope alone, at {source} L/min or a little more; there is no shock and no pressure, so a plastic pipe is fine here, unlike the drive pipe. It goes through the lid and ends in the open air, ' +
        mm(CATCHMENT.feedEnd - TANK.height).en +
        ' mm above the overflow level: a full tank never makes the water back up to the spring. The video does not show it.',
    ),
    material: l(
      'Polyéthylène (hypothèse du laboratoire ; non détaillé dans la vidéo)',
      'Polyethylene (lab assumption; not detailed in the video)',
    ),
    specs: [
      sp('Débit transporté', 'Flow carried', lf('{source} à {sourceHigh} L/min', '{source}–{sourceHigh} L/min')),
      sp(
        'Tube',
        'Tube',
        tagged(
          'estimate',
          `${mm(SPRING.feedPipeDiameter).fr} × ${mm(CATCHMENT.feedPipeWall).fr} mm, PE`,
          `${mm(SPRING.feedPipeDiameter).en} × ${mm(CATCHMENT.feedPipeWall).en} mm, PE`,
        ),
      ),
      sp('Longueur le long de la pente', 'Length along the slope', lenM('estimate', SPRING.distanceToTank)),
      sp(
        'Pente',
        'Slope',
        tagged('estimate', `${nFr(CATCHMENT.feedFall * 100)} %`, `${nEn(CATCHMENT.feedFall * 100)}%`),
      ),
      sp(
        'Extrémité au-dessus du trop-plein',
        'End above the overflow level',
        lenMm('derived', CATCHMENT.feedEnd - TANK.height),
      ),
      sp('Pression', 'Pressure', l('Nulle ou presque : écoulement par gravité', 'Zero or nearly: gravity flow')),
      sp(
        'Part d’une fuite de 1 L/min',
        'Share taken by a 1 L/min leak',
        tf('derived', '≈ {lossPct} % de la source', '≈ {lossPct}% of the spring'),
      ),
    ],
    maintenance: lf(
      '**Panne à prévoir.** Fuite, tuyau écrasé, poche d’air ou dépôt de calcaire : il arrive moins d’eau dans la cuve qu’il n’en sort du regard. Une fuite de 1 L/min, c’est déjà ≈ {lossPct} % d’une source de {source} L/min. **À vérifier.** Mesurez le débit au seau à la sortie du regard puis à l’arrivée dans la cuve : les deux valeurs doivent être égales. Suivez le tuyau en cherchant un sol détrempé et en écoutant les gargouillis, signe d’air. **Entretien.** Rincez le tuyau à l’eau claire une fois par an, enterrez-le à l’abri du gel et reprenez les affaissements de pente.',
      '**Typical failure.** A leak, a crushed pipe, an air pocket or a limescale deposit: less water reaches the tank than leaves the box. A 1 L/min leak is already ≈ {lossPct}% of a {source} L/min spring. **How to check.** Measure the bucket flow at the outlet of the box and then where it enters the tank: the two values should be equal. Follow the pipe looking for soaked ground and listening for gurgling, a sign of air. **Upkeep.** Rinse the pipe with clean water once a year, bury it out of the frost and correct any sag in the slope.',
    ),
    tip: l(
      'Descendez le tuyau d’un bout à l’autre, sans point haut ni creux : un point haut piège l’air et étrangle le débit, un creux retient les dépôts.',
      'Run the pipe downhill from end to end, with no high point or dip: a high point traps air and chokes the flow, a dip holds deposits.',
    ),
    design: l(
      'Sans pression, donc légère et peu coûteuse : tout le dénivelé du site est réservé à la conduite motrice, la conduite d’alimentation n’en prend que ce qu’il lui faut pour couler. Elle finit à l’air libre au-dessus du trop-plein pour que l’eau ne soit jamais bloquée.',
      'With no pressure, so light and cheap: all the height of the site is kept for the drive pipe, the feed pipe takes only what it needs to flow. It ends in the open air above the overflow so that the water is never held back.',
    ),
  },
  {
    id: 'tank-shell',
    scene: 'catchment',
    category: 'structure',
    name: l('Cuve de la réserve tampon', 'Buffer tank shell'),
    short: l(
      'La cuve de 5 700 L qui stocke l’eau de la source et alimente la conduite motrice : le pivot de l’histoire.',
      'The 5,700 L tank that stores the spring’s water and feeds the drive pipe: the pivot of the story.',
    ),
    description: lf(
      'La cuve est le pivot de l’histoire de la vidéo : avec le clapet n°3, le bélier prenait ≈ {drawN3} L/min (estimation de l’auteur) pour une source à {source} L/min, et le déficit de {deficitN3} L/min pendant les ≈ {hoursN3} h au bout desquelles il s’arrêtait donne {tankL} L, volume que le laboratoire en déduit et que la vidéo ne donne pas. Avec le clapet n°1, le bélier prend ≈ {drive1} L/min (modèle), moins que la source : la cuve reste pleine et déborde. Son volume n’est qu’un délai : il retarde l’arrêt, il ne le supprime pas quand le bélier prend plus que la source ne donne. Dans le modèle, une cuve vide arrête le bélier (de l’air entre dans la conduite motrice) et il ne repart pas seul ; la vidéo dit seulement qu’il s’arrêtait et qu’il fallait aller le relancer.',
      'The tank is the pivot of the video’s story: with the n°3 valve the ram took ≈ {drawN3} L/min (the author’s estimate) from a {source} L/min spring, and the {deficitN3} L/min deficit over the ≈ {hoursN3} h after which it stopped makes {tankL} L, a volume the lab derives and the video does not give. With the n°1 valve the ram takes ≈ {drive1} L/min (model), less than the spring: the tank stays full and overflows. Its volume is only a delay: it postpones the stop, it does not remove it when the ram takes more than the spring gives. In the model, an empty tank stops the ram (air gets into the drive pipe) and it does not restart by itself; the video only says that it stopped and that someone had to go and restart it.',
    ),
    material: l(
      'Polyéthylène moulé cerclé d’acier galvanisé, dessiné translucide pour qu’on voie le niveau (estimation ; non détaillé dans la vidéo)',
      'Moulded polyethylene hooped in galvanised steel, drawn translucent so the level can be seen (estimate; not detailed in the video)',
    ),
    specs: [
      sp('Volume', 'Volume', tf('derived', '≈ {tankL} L')),
      sp('Dimensions intérieures', 'Inner size', diaH('estimate', TANK.diameter, TANK.height)),
      sp('Épaisseur de paroi', 'Wall thickness', lenMm('estimate', TANK.wall)),
      sp(
        'Cerclage',
        'Hoops',
        tagged(
          'estimate',
          `${TANK.hoopHeights.length} cercles d’acier galvanisé de ${mm(TANK.hoopWidth).fr} mm`,
          `${TANK.hoopHeights.length} galvanised steel hoops of ${mm(TANK.hoopWidth).en} mm`,
        ),
      ),
      sp(
        'Départ de la conduite au-dessus du fond',
        'Drive outlet above the floor',
        lenMm('estimate', TANK.outletAboveFloor),
      ),
      sp('Boue au fond (3D)', 'Mud on the floor (3D)', lenMm('estimate', CATCHMENT.sludgeDepth)),
      sp('Dalle sous la cuve', 'Slab under the tank', lenMm('estimate', TANK.slabThickness)),
      sp('Eau contenue, cuve pleine', 'Water held, tank full', tf('derived', '≈ {tankTonnes} t')),
      sp('Vidée en', 'Emptied in', lf('≈ {hoursN3} h avec le clapet n°3', '≈ {hoursN3} h with the n°3 valve')),
      sp(
        'Renouvellement par la source',
        'Renewal by the spring',
        tf('derived', '≈ {tankHoursSpring} h pour {tankL} L', '≈ {tankHoursSpring} h for {tankL} L'),
      ),
      sp(
        'Montée du niveau, vanne de départ fermée',
        'Level rise, gate valve closed',
        tf('derived', '≈ {tankRiseCm} cm/h', '≈ {tankRiseCm} cm/h'),
      ),
    ],
    maintenance: lf(
      '**Panne à prévoir.** La cuve se vide parce que le bélier prend plus que la source ne donne (le cas de la vidéo) ou parce qu’elle fuit ; elle se salit aussi de boue, de feuilles et d’algues. **À vérifier.** Marquez le niveau au trop-plein et notez-le chaque semaine en été. Pour distinguer fuite et prélèvement, fermez la vanne de départ une heure : sans fuite, le niveau (s’il est sous le trop-plein) remonte d’environ {tankRiseCm} cm ({source} L/min sur la cuve dessinée). Cherchez des suintements au pied et une cuve qui penche. **Entretien.** Faites l’inspection de la cuve avec celle du captage, une à deux fois par an (rythme d’Oxfam pour le captage), et vidangez les dépôts.',
      '**Typical failure.** The tank empties because the ram takes more than the spring gives (the video’s case) or because it leaks; it also gets dirty with mud, leaves and algae. **How to check.** Mark the level at the overflow and note it every week in summer. To tell a leak from the ram’s draw, close the gate valve for an hour: with no leak the level (if it is below the overflow) rises by about {tankRiseCm} cm ({source} L/min over the drawn tank). Look for seepage at the foot and for a tank that leans. **Upkeep.** Inspect the tank together with the catchment, once or twice a year (Oxfam’s interval for the catchment), and flush the deposits.',
    ),
    tip: lf(
      'Une cuve ne remplace pas un bon réglage : avec {deficitN3} L/min de déficit, {tankL} L durent {hoursN3} h ; avec une source à {spring6} L/min, le déficit tombe à ≈ {deficit6} L/min et la cuve tient ≈ {days6} jours (modèle). Le volume ne vaut que par l’écart entre ce que prend le bélier et ce que donne la source.',
      'A tank does not replace a good setting: with a {deficitN3} L/min deficit, {tankL} L last {hoursN3} h; with a {spring6} L/min spring the deficit falls to ≈ {deficit6} L/min and the tank lasts ≈ {days6} days (model). The volume is only worth the gap between what the ram takes and what the spring gives.',
    ),
    video: ['02:07', '02:19'],
    design: lf(
      'La cuve vaut par son volume et par son niveau d’eau stable : elle donne à la conduite motrice une chute régulière et absorbe les baisses passagères de la source. Sa forme et sa taille sont des estimations tirées des {tankL} L dérivés. La chute utile varie avec la hauteur d’eau au-dessus de la sortie (jusqu’à ≈ {waterDepth} m dans le dessin) ; le modèle la garde fixe à {fall} m.',
      'The tank is worth its volume and its steady water level: it gives the drive pipe a regular fall and absorbs the spring’s passing dips. Its shape and size are estimates drawn from the derived {tankL} L. The useful fall varies with the depth of water above the outlet (up to ≈ {waterDepth} m in the drawing); the model keeps it fixed at {fall} m.',
    ),
  },
  {
    id: 'tank-lid',
    scene: 'catchment',
    category: 'structure',
    name: l('Couvercle et aération', 'Lid and vent'),
    short: l(
      'Ferme la cuve contre la lumière, les feuilles et les animaux, et laisse l’air entrer et sortir.',
      'Closes the tank against light, leaves and animals, and lets air in and out.',
    ),
    description: lf(
      'Le couvercle ferme la cuve contre la lumière (qui nourrit les algues), les feuilles, les insectes et les animaux ; son trou d’homme permet de contrôler le niveau et de nettoyer. L’aération, un tuyau grillagé coudé en col de cygne, laisse entrer l’air quand le niveau baisse et sortir quand il monte : sans elle, une cuve qui se vide se met en dépression et l’eau part moins bien. L’air à admettre est égal au débit d’eau tiré, soit ≈ {drive1} L/min avec le clapet n°1 et ≈ {drawN3} L/min avec le n°3 : une petite ouverture suffit. La vidéo ne parle pas du couvercle ; c’est la pratique courante des réservoirs d’eau (Oxfam veut l’eau protégée de la contamination de surface), et ses dimensions sont des estimations.',
      'The lid closes the tank against light (which feeds algae), leaves, insects and animals; its manhole lets the level be checked and the tank cleaned. The vent, a screened pipe bent into a goose-neck, lets air in when the level falls and out when it rises: without it, a tank that empties goes under vacuum and the water leaves less well. The air to admit equals the water drawn, that is ≈ {drive1} L/min with the n°1 valve and ≈ {drawN3} L/min with the n°3: a small opening is enough. The video does not mention the lid; it is the common practice for water tanks (Oxfam wants the water protected from surface contamination), and its dimensions are estimates.',
    ),
    material: l(
      'Polyéthylène rotomoulé, grillage anti-insectes sur l’aération (hypothèse du laboratoire)',
      'Rotomoulded polyethylene, insect screen on the vent (lab assumption)',
    ),
    specs: [
      sp('Épaisseur du couvercle', 'Lid thickness', lenMm('estimate', TANK.lidThickness)),
      sp('Débord sur la paroi', 'Overhang on the wall', lenMm('estimate', TANK.lidOverhang)),
      sp('Vide d’air sous le couvercle', 'Air space under the lid', lenMm('estimate', TANK.freeboard)),
      sp(
        'Trou d’homme',
        'Manhole',
        tagged('estimate', `Ø ${mm(CATCHMENT.manholeDiameter).fr} mm`, `Ø ${mm(CATCHMENT.manholeDiameter).en} mm`),
      ),
      sp(
        'Aération',
        'Vent',
        tagged(
          'estimate',
          `tuyau Ø ${mm(CATCHMENT.ventDiameter).fr} mm, grillagé, col de cygne ${mm(CATCHMENT.ventRise).fr} mm au-dessus du couvercle`,
          `pipe Ø ${mm(CATCHMENT.ventDiameter).en} mm, screened, goose-neck ${mm(CATCHMENT.ventRise).en} mm above the lid`,
        ),
      ),
      sp('Air à admettre', 'Air to admit', tf('derived', '≈ {drive1} L/min (n°1), ≈ {drawN3} L/min (n°3)')),
    ],
    maintenance: l(
      '**Panne à prévoir.** Couvercle déplacé ou fissuré (feuilles, insectes, animaux, lumière donc algues) ; aération bouchée par une toile d’araignée ou un nid, qui met la cuve en dépression quand elle se vide. **À vérifier.** Regardez le grillage de l’aération : il doit être entier et propre. Soulevez le couvercle : l’eau doit être claire, sans film vert ni insectes. Écoutez ou sentez l’air passer quand le niveau change. **Entretien.** Nettoyez le grillage à chaque inspection, remplacez-le s’il est rouillé ou percé, et remettez toujours le couvercle en place.',
      '**Typical failure.** A displaced or cracked lid (leaves, insects, animals, light and so algae); a vent blocked by a cobweb or a nest, which puts the tank under vacuum as it empties. **How to check.** Look at the screen of the vent: it should be whole and clean. Lift the lid: the water should be clear, with no green film or insects. Listen for, or feel, the air moving when the level changes. **Upkeep.** Clean the screen at every inspection, replace it if it is rusty or holed, and always put the lid back.',
    ),
    tip: l(
      'Ne bouchez jamais l’aération pour « garder l’eau propre » : elle doit rester ouverte, mais grillagée. Le dessin 3D montre la cuve translucide pour qu’on voie le niveau ; au soleil, une vraie cuve claire verdit.',
      'Never plug the vent to “keep the water clean”: it must stay open, but screened. The 3D drawing shows the tank translucent so the level can be seen; in the sun, a real clear tank turns green.',
    ),
    design: l(
      'Un couvercle sépare l’eau de tout ce qui tombe, lumière comprise, puisque les algues ont besoin de lumière. L’aération n’est pas un détail : pour que l’eau sorte, il faut que l’air entre.',
      'A lid separates the water from everything that falls, light included, since algae need light. The vent is not a detail: for the water to leave, air has to come in.',
    ),
  },
  {
    id: 'overflow-pipe',
    scene: 'catchment',
    category: 'hydraulic',
    name: l('Trop-plein', 'Overflow'),
    short: l(
      'Évacue le surplus de la source quand la cuve est pleine et fixe le niveau maximal.',
      'Carries off the spring’s surplus when the tank is full and sets the maximum level.',
    ),
    description: lf(
      'Le trop-plein est un tuyau qui part au niveau maximal de la cuve : tout ce que la source donne en plus de ce que le bélier prend s’y écoule et s’en va, dans le dessin vers un caniveau qui l’emporte vers l’aval. Avec le clapet n°1 il laisse passer ≈ {surplus1} L/min (≈ {surplus1Day} m³ par jour, modèle) ; si le bélier est arrêté, c’est toute la source, {source} L/min. Il garantit aussi que la cuve ne met jamais la source en contre-pression : Oxfam veut un trop-plein plus bas que l’ouvrage de captage. Son tuyau doit passer tout le débit de la source sans se noyer ; Oxfam donne par exemple ≈ {oxfamOverflowLps} L/s pour un tuyau galvanisé de 1″ de 20 à 50 cm avec 5 cm de charge, soit ≈ {oxfamOverflowLpm} L/min, environ {oxfamOverflowTimes} fois la source. La vidéo ne montre pas le trop-plein.',
      'The overflow is a pipe that leaves at the maximum level of the tank: everything the spring gives beyond what the ram takes runs into it and away, in the drawing to a gutter that carries it downstream. With the n°1 valve it passes ≈ {surplus1} L/min (≈ {surplus1Day} m³ a day, model); if the ram is stopped, it is the whole spring, {source} L/min. It also guarantees that the tank never puts the spring under back-pressure: Oxfam wants an overflow lower than the catchment works. Its pipe must pass the whole spring flow without drowning; Oxfam gives for instance ≈ {oxfamOverflowLps} L/s for a 1″ galvanised pipe of 20–50 cm with 5 cm of head, that is ≈ {oxfamOverflowLpm} L/min, about {oxfamOverflowTimes} times the spring. The video does not show the overflow.',
    ),
    material: l('Tuyau PVC, bouche grillagée (hypothèse du laboratoire)', 'PVC pipe, screened mouth (lab assumption)'),
    specs: [
      sp('Niveau de déversement au-dessus du fond', 'Spill level above the floor', lenM('estimate', TANK.height)),
      sp(
        'Tuyau',
        'Pipe',
        tagged(
          'estimate',
          `PVC Ø ${mm(CATCHMENT.overflowDiameter).fr} mm`,
          `PVC Ø ${mm(CATCHMENT.overflowDiameter).en} mm`,
        ),
      ),
      sp(
        'Surplus avec le clapet n°1',
        'Surplus with the n°1 valve',
        tf(
          'derived',
          '≈ {surplus1} L/min, soit ≈ {surplus1Day} m³/jour',
          '≈ {surplus1} L/min, that is ≈ {surplus1Day} m³/day',
        ),
      ),
      sp(
        'Débit maximal à évacuer',
        'Maximum flow to carry',
        lf('toute la source, {source} à {sourceHigh} L/min', 'the whole spring, {source}–{sourceHigh} L/min'),
      ),
      sp(
        'Capacité d’un tuyau 1″ (Oxfam)',
        'Capacity of a 1″ pipe (Oxfam)',
        lf(
          '≈ {oxfamOverflowLps} L/s pour 20 à 50 cm de long et 5 cm de charge',
          '≈ {oxfamOverflowLps} L/s for 20–50 cm length and 5 cm of head',
        ),
      ),
      sp(
        'Bouche',
        'Mouth',
        tagged(
          'estimate',
          `libre, ${mm(CATCHMENT.overflowDischargeHeight).fr} mm au-dessus du fond, au-dessus d’un caniveau`,
          `free, ${mm(CATCHMENT.overflowDischargeHeight).en} mm above the floor level, over a gutter`,
        ),
      ),
    ],
    maintenance: lf(
      '**Panne à prévoir.** Le trop-plein se bouche (feuilles, nid, glace) : la cuve monte jusqu’au couvercle ou refoule vers la conduite d’alimentation ; ou il rejette l’eau au pied de la cuve et érode le talus. **À vérifier.** Source qui coule, cuve pleine : de l’eau doit sortir du trop-plein, ≈ {surplus1} L/min avec le clapet n°1 (un seau de 10 L en ≈ {overflowBucket} min). Le niveau ne doit jamais dépasser la bouche. Bélier arrêté, le débit doit monter jusqu’à toute la source. **Entretien.** Dégagez la sortie, grillagez-la contre les rongeurs et regardez où l’eau tombe.',
      '**Typical failure.** The overflow blocks (leaves, a nest, ice): the tank rises to the lid or backs up towards the feed pipe; or it drops the water at the foot of the tank and erodes the slope. **How to check.** Spring running, tank full: water should leave through the overflow, ≈ {surplus1} L/min with the n°1 valve (a 10 L bucket in ≈ {overflowBucket} min). The level must never rise above the mouth. With the ram stopped, the flow should climb to the whole spring. **Upkeep.** Clear the outlet, screen it against rodents and look at where the water falls.',
    ),
    tip: l(
      'Ne mettez jamais de vanne sur un trop-plein : le jour où quelqu’un la ferme, la cuve déborde par le couvercle.',
      'Never fit a valve on an overflow: the day someone closes it, the tank runs over the lid.',
    ),
    design: l(
      'Le niveau maximal de la cuve est celui du trop-plein : il borne la chute et renvoie le surplus vers l’aval. Il est dimensionné pour passer toute la source, pas seulement le surplus du jour, parce que sa seule tâche est de ne jamais se laisser noyer.',
      'The maximum level of the tank is that of the overflow: it bounds the fall and sends the surplus downstream. It is sized to pass the whole spring, not just the day’s surplus, because its only job is never to be drowned.',
    ),
  },
  {
    id: 'intake-screen',
    scene: 'catchment',
    category: 'hydraulic',
    name: l('Crépine de départ', 'Intake screen'),
    short: l(
      'Panier perforé sur l’entrée de la conduite motrice : il retient les débris, et sa position noyée garde l’air dehors.',
      'Perforated basket over the inlet of the drive pipe: it holds back debris, and its submerged position keeps air out.',
    ),
    description: lf(
      'La crépine est le premier organe de la conduite motrice, dans la cuve. Elle retient les feuilles, les brindilles et le gravier qui iraient se coincer sous le clapet de choc, dont la course n’est que de ≈ {stroke1} mm dans le modèle. Elle est posée à ' +
        mm(TANK.outletAboveFloor).fr +
        ' mm au-dessus du fond (estimation) : assez haut pour ne pas aspirer la boue qui se dépose, et sous l’eau tant que la cuve contient quelque chose. C’est cette immersion, aidée par une plaque anti-tourbillon qui empêche un vortex d’aspirer de l’air, et non la grille, qui garde l’air hors de la conduite motrice. La vidéo ne montre pas la crépine ; Practical Action note seulement que l’eau descend dans la conduite motrice à travers une crépine, et le bélier a la sienne, juste avant son corps (monde « Le bélier »).',
      'The screen is the first member of the drive pipe, in the tank. It holds back the leaves, twigs and grit that would jam under the waste valve, whose stroke is only ≈ {stroke1} mm in the model. It sits ' +
        mm(TANK.outletAboveFloor).en +
        ' mm above the floor (estimate): high enough not to draw the mud that settles, and under water as long as the tank holds anything. It is that immersion, helped by an anti-vortex plate that stops a whirlpool from drawing air in, and not the mesh, that keeps air out of the drive pipe. The video does not show the screen; Practical Action only notes that the water goes down the drive pipe through a strainer, and the ram has its own, just before its body (the ram world).',
    ),
    material: l(
      'Panier en inox perforé et plaque anti-tourbillon (hypothèse du laboratoire)',
      'Perforated stainless basket and anti-vortex plate (lab assumption)',
    ),
    specs: [
      sp('Hauteur au-dessus du fond', 'Height above the floor', lenMm('estimate', TANK.outletAboveFloor)),
      sp(
        'Panier, diamètre × longueur',
        'Basket, diameter × length',
        lenMm('estimate', CATCHMENT.screenDiameter, CATCHMENT.screenLength),
      ),
      sp(
        'Perforations',
        'Perforations',
        tagged('estimate', `Ø ${mm(CATCHMENT.screenHole).fr} mm`, `Ø ${mm(CATCHMENT.screenHole).en} mm`),
      ),
      sp(
        'Plaque anti-tourbillon',
        'Anti-vortex plate',
        tagged(
          'estimate',
          `Ø ${mm(CATCHMENT.vortexDiameter).fr} mm, à ${mm(CATCHMENT.vortexGap).fr} mm au-dessus du panier`,
          `Ø ${mm(CATCHMENT.vortexDiameter).en} mm, ${mm(CATCHMENT.vortexGap).en} mm above the basket`,
        ),
      ),
      sp(
        'Diamètre intérieur de la conduite',
        'Pipe inner diameter',
        tagged('assumed', `${mm(SITE_DIMS.driveBore).fr} mm, bélier de 1″`, `${mm(SITE_DIMS.driveBore).en} mm, 1″ ram`),
      ),
      sp('Section de la conduite', 'Pipe cross-section', tf('derived', '≈ {pipeCm2} cm²')),
      sp('Course du clapet n°1', 'Stroke of the n°1 valve', tf('calibrated', '≈ {stroke1} mm')),
    ],
    maintenance: l(
      '**Panne à prévoir.** Colmatée par les feuilles, le limon ou un film biologique, la crépine étrangle la conduite motrice : le bélier tourne faiblement ou s’arrête alors que la cuve est pleine. Posée trop haut, elle découvre et aspire de l’air quand le niveau baisse ; posée trop bas, elle avale la boue. **À vérifier.** Cuve pleine, trop-plein qui coule mais bélier faible ou muet : fermez la vanne de départ, soulevez le couvercle et regardez la crépine. Un bélier qui s’arrête avec la cuve vide est le cas de la vidéo, pas celui de la crépine. **Entretien.** Brossez-la à chaque inspection et vérifiez qu’elle reste toujours sous l’eau.',
      '**Typical failure.** Clogged by leaves, silt or a biological film, the screen chokes the drive pipe: the ram runs weakly or stops although the tank is full. Set too high, it is uncovered and draws air when the level falls; set too low, it swallows mud. **How to check.** Tank full, overflow running but the ram weak or silent: close the gate valve, lift the lid and look at the screen. A ram that stops with the tank empty is the video’s case, not the screen’s. **Upkeep.** Brush it at every inspection and check that it always stays under water.',
    ),
    tip: l(
      'Une crépine posée au fond est le piège classique : elle aspire la boue. Une crépine à fleur d’eau est l’autre : elle laisse entrer l’air dès que le niveau baisse.',
      'A screen set on the floor is the classic trap: it draws the mud. A screen at the water surface is the other: it lets air in as soon as the level falls.',
    ),
    design: l(
      'Trois rôles distincts : retenir les débris (les perforations), interdire l’entrée d’air (la position noyée) et casser le tourbillon qui en aspirerait (la plaque). Le dessin la place bas mais au-dessus du fond, compromis entre les deux dangers ; ses cotes sont des estimations.',
      'Three distinct jobs: holding back debris (the perforations), preventing air from entering (the submerged position) and breaking the whirlpool that would draw some in (the plate). The drawing sets it low but above the floor, a compromise between the two dangers; its sizes are estimates.',
    ),
  },
  {
    id: 'drive-gate-valve',
    scene: 'catchment',
    category: 'hydraulic',
    name: l('Vanne de départ de la conduite motrice', 'Drive-pipe gate valve'),
    short: l(
      'Vanne à passage intégral qui isole la conduite motrice de la cuve : pour arrêter le bélier ou intervenir sans vider la cuve.',
      'Full-bore valve that isolates the drive pipe from the tank: to stop the ram or work on it without emptying the tank.',
    ),
    description: l(
      'La vanne de départ ferme la conduite motrice à la sortie de la cuve. Fermée, elle arrête le bélier (plus d’eau motrice), isole la conduite pour la purger ou la réparer, et empêche la cuve de se vider par une conduite rompue. La vidéo ne montre pas cette vanne ; le laboratoire l’ajoute d’après la pratique courante (Oxfam équipe la sortie d’un captage d’une vanne à opercule). Elle a le même passage que la conduite (1″, DN25) pour ne pas freiner l’eau, et reste ouverte à fond en fonctionnement, jamais entrouverte pour régler. Le bélier a sa propre vanne d’arrivée, qui l’isole de l’autre côté.',
      'The gate valve closes the drive pipe at the outlet of the tank. Closed, it stops the ram (no more drive water), isolates the pipe so it can be purged or repaired, and keeps the tank from emptying through a broken pipe. The video does not show this valve; the lab adds it after common practice (Oxfam fits the outlet of a catchment with a gate valve). It has the same bore as the pipe (1″, DN25) so as not to slow the water, and stays fully open when running, never half-open to adjust. The ram has its own inlet valve, which isolates it from the other end.',
    ),
    material: l(
      'Bronze, vanne à opercule à passage intégral (hypothèse du laboratoire)',
      'Bronze, full-bore gate valve (lab assumption)',
    ),
    specs: [
      sp('Type', 'Type', l('Vanne à opercule, passage intégral, tige montante', 'Gate valve, full bore, rising stem')),
      sp(
        'Taille',
        'Size',
        tagged('estimate', 'DN25 (1″), comme la conduite motrice', 'DN25 (1″), like the drive pipe'),
      ),
      sp(
        'Corps, longueur × diamètre',
        'Body, length × diameter',
        lenMm('estimate', CATCHMENT.gateBodyLength, CATCHMENT.gateBodyDiameter),
      ),
      sp(
        'Tige au-dessus du chapeau, vanne ouverte',
        'Stem above the bonnet, valve open',
        lenMm('estimate', CATCHMENT.gateStemRise),
      ),
      sp('Volant, diamètre', 'Hand wheel, diameter', lenMm('estimate', CATCHMENT.gateWheelDiameter)),
      sp(
        'Pression à la vanne, cuve pleine',
        'Pressure at the valve, tank full',
        tf('derived', '≈ {gateBar} bar (≈ {waterDepth} m d’eau)', '≈ {gateBar} bar (≈ {waterDepth} m of water)'),
      ),
      sp('Départ à partir de la paroi', 'Run from the wall', lenMm('estimate', TANK.outletLength)),
      sp('Position en marche', 'Position when running', l('Ouverte à fond', 'Fully open')),
    ],
    maintenance: lf(
      '**Panne à prévoir.** Une vanne jamais manœuvrée se grippe : on ne peut plus la fermer le jour où il le faut. Son presse-étoupe fuit. Ou bien, après une intervention, elle reste fermée : le bélier se tait alors que la cuve déborde. **À vérifier.** Regardez la tige : dans le dessin elle est montante et dépasse du chapeau de ≈ ' +
        mm(CATCHMENT.gateStemRise).fr +
        ' mm quand la vanne est ouverte (estimation). Manœuvrez la vanne une fois par saison, de butée à butée : la fermer arrête le bélier, qu’il faudra peut-être relancer à la main à la réouverture. Bélier silencieux et trop-plein à plein débit : regardez d’abord si la vanne est ouverte. **Entretien.** Regraissez la tige, resserrez le presse-étoupe et laissez-la ouverte à fond.',
      '**Typical failure.** A valve that is never operated seizes: it cannot be closed on the day it is needed. Its gland leaks. Or, after a job, it stays closed: the ram falls silent while the tank overflows. **How to check.** Look at the stem: in the drawing it is a rising stem and stands ≈ ' +
        mm(CATCHMENT.gateStemRise).en +
        ' mm above the bonnet when the valve is open (estimate). Operate the valve once a season, from stop to stop: closing it stops the ram, which may need restarting by hand when it is reopened. Ram silent and overflow at full flow: first look whether the valve is open. **Upkeep.** Regrease the stem, retighten the gland and leave it fully open.',
    ),
    tip: l(
      'Ne réglez jamais le débit avec cette vanne : entrouverte, une vanne à opercule vibre, s’use et freine l’eau. Le réglage du bélier se fait au clapet de choc, pas à la vanne.',
      'Never adjust the flow with this valve: half-open, a gate valve vibrates, wears and slows the water. The ram is adjusted at the waste valve, not at the gate valve.',
    ),
    design: lf(
      'C’est le seul endroit où l’on peut couper l’eau motrice sans vider la cuve : sans cette vanne, intervenir sur la conduite ou sur le bélier oblige à vidanger les {tankL} L. Une vanne à opercule à passage intégral ne freine pas l’eau quand elle est ouverte, ce qui compte pour une conduite qui doit lancer l’eau à pleine vitesse.',
      'It is the only place where the drive water can be cut without emptying the tank: without this valve, working on the pipe or on the ram means draining the {tankL} L. A full-bore gate valve does not slow the water when open, which matters for a pipe that must get the water up to speed.',
    ),
  },
  {
    id: 'tank-drain',
    scene: 'catchment',
    category: 'hydraulic',
    name: l('Vidange de la réserve', 'Tank drain'),
    short: l(
      'Vanne au point bas qui permet de vider la cuve et d’évacuer les dépôts.',
      'Valve at the low point that lets the tank be emptied and the deposits be flushed out.',
    ),
    description: lf(
      'La vidange est une sortie au point le plus bas de la cuve, fermée par une vanne à boisseau : ouverte, elle vide la cuve et chasse avec l’eau la boue et les feuilles qui se sont déposées au fond, par la seule gravité, vers le caniveau du dessin ; elle ne sert pas en fonctionnement normal. Les dépôts s’accumulent sous la crépine, posée à ' +
        mm(TANK.outletAboveFloor).fr +
        ' mm du fond : ≈ {sludgeL} L de dépôts avant qu’ils l’atteignent (estimation, d’après la cuve dessinée). La vidéo ne parle pas de vidange ; le laboratoire l’ajoute d’après la pratique courante (Oxfam : une vidange permet de vider le regard pour le nettoyer). Elle rejette en aval, loin du regard du bélier, et sa vanne doit toujours être refermée après usage.',
      'The drain is an outlet at the lowest point of the tank, closed by a ball valve: open, it empties the tank and flushes out, with the water, the mud and leaves that have settled on the floor, by gravity alone, to the drawing’s gutter; it is not used in normal running. Deposits build up under the intake screen, which sits ' +
        mm(TANK.outletAboveFloor).en +
        ' mm from the floor: ≈ {sludgeL} L of deposits before they reach it (estimate, from the drawn tank). The video does not mention a drain; the lab adds it after common practice (Oxfam: a washout lets the chamber be drained for cleaning). It discharges downstream, away from the ram pit, and its valve must always be closed again after use.',
    ),
    material: l(
      'Tuyau PVC, vanne à boisseau sphérique (hypothèse du laboratoire)',
      'PVC pipe, ball valve (lab assumption)',
    ),
    specs: [
      sp(
        'Position',
        'Position',
        l('Point bas de la cuve, au ras du fond', 'Low point of the tank, flush with the floor'),
      ),
      sp(
        'Tuyau',
        'Pipe',
        tagged('estimate', `PVC Ø ${mm(CATCHMENT.drainDiameter).fr} mm`, `PVC Ø ${mm(CATCHMENT.drainDiameter).en} mm`),
      ),
      sp('Axe au-dessus du fond', 'Axis above the floor', lenMm('estimate', CATCHMENT.drainAxisHeight)),
      sp('Longueur de la vanne', 'Valve length', lenMm('estimate', CATCHMENT.drainValveLength)),
      sp('Volume à évacuer', 'Volume to drain', tf('derived', '≈ {tankL} L')),
      sp('Dépôts avant la crépine', 'Deposits before the screen', tf('estimate', '≈ {sludgeL} L')),
      sp(
        'Remplissage après vidange',
        'Refill after draining',
        tf('derived', '≈ {tankHoursSpring} h à {source} L/min', '≈ {tankHoursSpring} h at {source} L/min'),
      ),
      sp('État normal', 'Normal state', l('Vanne fermée', 'Valve closed')),
    ],
    maintenance: l(
      '**Panne à prévoir.** La vanne de vidange fuit ou est restée entrouverte : la cuve se vide petit à petit, comme si le bélier prenait trop. Ou bien la vidange est bouchée par les dépôts le jour où on veut l’ouvrir. **À vérifier.** Le niveau baisse alors que le trop-plein est sec et que la vanne de départ est fermée : c’est une fuite, suivez les tuyaux jusqu’à la vidange et regardez si de l’eau en sort. Une goutte à la sortie de la vidange est suspecte. **Entretien.** Vidangez une à deux fois par an avec l’inspection du captage, brossez le fond, refermez la vanne et vérifiez qu’elle ne goutte pas.',
      '**Typical failure.** The drain valve leaks or has been left slightly open: the tank empties little by little, as if the ram were taking too much. Or the drain is blocked by deposits on the day you want to open it. **How to check.** The level falls while the overflow is dry and the gate valve is closed: that is a leak, follow the pipes to the drain and see whether water comes out. A drip at the drain outlet is suspect. **Upkeep.** Flush once or twice a year with the catchment inspection, brush the floor, close the valve again and check that it does not drip.',
    ),
    tip: lf(
      'Après une vidange, la source met ≈ {tankHoursSpring} h à remplir la cuve : gardez la vanne de départ fermée pendant ce temps, sinon le bélier repart sur une cuve presque vide.',
      'After draining, the spring takes ≈ {tankHoursSpring} h to fill the tank: keep the gate valve closed meanwhile, or the ram restarts on a nearly empty tank.',
    ),
    design: l(
      'Une cuve sans vidange se salit sans qu’on puisse la nettoyer. La vidange est ce qui permet d’entretenir la réserve, et elle sert aussi à contrôler une fuite : fermée, elle ne doit rien laisser passer.',
      'A tank with no drain gets dirty with no way of cleaning it. The drain is what lets the tank be maintained, and it also helps check for a leak: closed, it must let nothing through.',
    ),
  },
];
