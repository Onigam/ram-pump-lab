// Parts of the `site` world (ids frozen in src/part-ids.ts). Status words: see ../part-helpers.ts.
import type { PartInfo } from '@onigam/lab-kit/content';
import { l } from '@onigam/lab-kit/i18n';
import { WAVE_SPEED } from '../../sim/physics';
import { HOUSE, PIT, SITE as SITE_DIMS, SPRING, TANK, TOWER } from '../../three/dims';
import { mm, nEn, nFr, round } from '../units';
import { sp, tagged, lenMm, lenM, diaH } from '../part-helpers';

const DELIVERY_FILL = (() => {
  const litres = (Math.PI / 4) * SITE_DIMS.deliveryBore ** 2 * SITE_DIMS.deliveryLength * 1000;
  const lpm = 500 / (24 * 60); // K10: 500 L/day
  return { litres: round(litres, -1), hours: round(litres / lpm / 60) };
})();

export const SITE_PARTS: PartInfo[] = [
  {
    id: 'spring',
    scene: 'site',
    category: 'site',
    name: l('Captage de la source', 'Spring catchment'),
    short: l(
      'La source qui fournit l’eau motrice, à 7,5 m au-dessus du bélier.',
      'The spring that supplies the drive water, 7.5 m above the ram.',
    ),
    description: l(
      'Le bélier ne tourne que si la source coule en continu. Celle de la vidéo donnait 10 L/min il y a deux ans et seulement 7,5 à 7,8 L/min aujourd’hui : avec le clapet d’origine, le bélier prenait environ 17 L/min (estimation de l’auteur) et vidait sa réserve en une dizaine d’heures, et cette baisse a rendu ingérable même le clapet n°2 envisagé d’abord. C’est donc le débit de la source qui choisit le bélier : le tableau de NC State Extension demande au moins 22,7 L/min pour un bélier de 1″. Le captage lui-même (drain, regard, protection) n’est pas détaillé dans la vidéo.',
      'The ram only works if the spring flows without a break. The video’s spring gave 10 L/min two years ago and only 7.5–7.8 L/min today: with the original valve the ram took about 17 L/min (the author’s estimate) and emptied its tank in about ten hours, and the drop made even the n°2 valve first considered unmanageable. So it is the spring flow that chooses the ram: the NC State Extension table asks for at least 22.7 L/min for a 1″ ram. The catchment itself (drain, chamber, protection) is not detailed in the video.',
    ),
    material: l(
      'Non détaillé dans la vidéo (captage de source ; eau non garantie potable)',
      'Not detailed in the video (spring catchment; water not guaranteed potable)',
    ),
    specs: [
      sp('Débit aujourd’hui', 'Flow today', l('7,5 à 7,8 L/min', '7.5–7.8 L/min')),
      sp('Débit il y a deux ans', 'Flow two years ago', '10 L/min'),
      sp('Volume par jour', 'Volume per day', tagged('derived', '≈ 10,8 à 11,2 m³/jour', '≈ 10.8–11.2 m³/day')),
      sp('Chute jusqu’au bélier', 'Fall down to the ram', '7,5 m'),
      sp(
        'Bassin de captage (3D)',
        'Catchment basin (3D)',
        lenM('estimate', SPRING.basinLength, SPRING.basinWidth, SPRING.basinDepth),
      ),
      sp(
        'Qualité de l’eau',
        'Water quality',
        l('Non garantie potable : à analyser', 'Not guaranteed potable: have it tested'),
      ),
    ],
    maintenance: l(
      'Mesurez le débit à l’étiage chaque fin d’été et dégagez le captage des feuilles et de la terre. Si le débit passe sous ce que le bélier consomme, la réserve se vide.',
      'Measure the flow at low water every end of summer and clear the catchment of leaves and soil. If the flow falls below what the ram consumes, the tank empties.',
    ),
    tip: l(
      'Notez le débit à l’étiage, pas au printemps : la source de la vidéo a perdu environ un quart de son débit en deux ans.',
      'Record the flow at low water, not in spring: the video’s spring lost about a quarter of its flow in two years.',
    ),
    video: ['02:16', '02:30'],
    design: l(
      'Une source en hauteur donne gratuitement la chute dont le bélier tire son énergie : aucune électricité ni aucun carburant, comme le souligne la vidéo.',
      'A spring set high up gives, for free, the fall from which the ram draws its energy: no electricity and no fuel, as the video stresses.',
    ),
  },
  {
    id: 'buffer-tank',
    scene: 'site',
    category: 'hydraulic',
    name: l('Réserve tampon', 'Buffer tank'),
    short: l(
      'Cuve qui reçoit la source et alimente la conduite motrice ; c’est elle qui se vidait en dix heures.',
      'Tank that receives the spring and feeds the drive pipe; it is the one that emptied in ten hours.',
    ),
    description: l(
      'La réserve tampon reçoit la source et alimente la conduite motrice. Le bélier y puise par à-coups et, avec le clapet n°3, plus que la source ne donne : environ 17 L/min (estimation de l’auteur, non mesurée) contre 7,5 L/min. Elle baissait donc en une dizaine d’heures, de l’air entrait dans la conduite et le bélier s’arrêtait ; il fallait le relancer tous les deux jours. Avec le clapet n°1, le bélier prend moins que la source (≈ 6,7 L/min dans le modèle) : la réserve reste pleine et déborde.',
      'The buffer tank receives the spring and feeds the drive pipe. The ram draws from it in jolts and, with the n°3 valve, more than the spring gives: about 17 L/min (the author’s estimate, not measured) against 7.5 L/min. It therefore ran down in about ten hours, air got into the pipe and the ram stopped; it had to be restarted every two days. With the n°1 valve the ram takes less than the spring (≈ 6.7 L/min in the model): the tank stays full and overflows.',
    ),
    material: l(
      'Cuve fermée avec trop-plein (non détaillée dans la vidéo)',
      'Closed tank with an overflow (not detailed in the video)',
    ),
    specs: [
      sp('Volume', 'Volume', tagged('derived', `≈ ${nFr(TANK.volumeL)} L`, `≈ ${nEn(TANK.volumeL)} L`)),
      sp('Cuve dessinée en 3D', 'Tank drawn in 3D', diaH('estimate', TANK.diameter, TANK.height)),
      sp('Vidée en', 'Emptied in', l('≈ 10 h avec le clapet n°3', '≈ 10 h with the n°3 valve')),
      sp(
        'Prélèvement du clapet n°3',
        'Draw of the n°3 valve',
        l('≈ 17 L/min (estimation de l’auteur)', '≈ 17 L/min (author’s estimate)'),
      ),
      sp('Prélèvement du clapet n°1', 'Draw of the n°1 valve', tagged('model', '≈ 6,7 L/min')),
    ],
    maintenance: l(
      'Contrôlez le niveau chaque semaine en été : un niveau qui baisse trahit un bélier qui prend plus que la source. Gardez le trop-plein dégagé.',
      'Check the level every week in summer: a falling level means the ram takes more than the spring gives. Keep the overflow clear.',
    ),
    tip: l(
      'Si le niveau baisse d’un jour à l’autre, c’est la course ou la taille du clapet qu’il faut revoir : une cuve plus grande ne fait que retarder l’arrêt.',
      'If the level falls from one day to the next, it is the stroke or the valve size that needs another look: a bigger tank only delays the stop.',
    ),
    video: ['00:00', '02:07'],
    design: l(
      'La réserve donne à la conduite motrice un niveau d’eau stable et absorbe les baisses passagères de la source. Elle ne remplace pas un bon réglage du clapet : le volume de 5 700 L est déduit des dix heures de la vidéo, il n’y est pas donné.',
      'The tank gives the drive pipe a steady water level and absorbs the spring’s passing dips. It does not replace a good valve setting: the 5,700 L volume is derived from the video’s ten hours, it is not given there.',
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
    description: l(
      'La conduite motrice relie la réserve au bélier. L’eau y prend de la vitesse tant que le clapet de choc est ouvert ; quand il claque, cette colonne s’arrête net et son élan fait monter la pression, jusqu’à environ 6,5 bar dans le modèle : c’est le coup de bélier. La conduite doit donc être rigide et sans prise d’air. Sur le site de la vidéo elle mesure environ 20 m pour 7,5 m de chute, soit 2,7 fois la chute, alors que NC State demande au moins 5 fois.',
      'The drive pipe links the tank to the ram. The water gains speed in it while the waste valve is open; when the valve slams, that column stops dead and its momentum raises the pressure, up to about 6.5 bar in the model: that is the water hammer. The pipe must therefore be rigid and free of air leaks. On the video’s site it is about 20 m long for 7.5 m of fall, that is 2.7 times the fall, whereas NC State asks for at least 5 times.',
    ),
    material: l(
      'Acier (hypothèse du modèle) ; fonte possible, plastique déconseillé',
      'Steel (model assumption); cast iron possible, plastic discouraged',
    ),
    specs: [
      sp('Longueur', 'Length', '≈ 20 m'),
      sp('Chute', 'Fall', '7,5 m'),
      sp('Longueur / chute', 'Length / fall', tagged('derived', '2,7')),
      sp(
        'Règle de longueur',
        'Length rule',
        l('≥ 5 × la chute (NC State) ; 3 à 7 × (Wikipédia)', '≥ 5 × the fall (NC State); 3 to 7 × (Wikipedia)'),
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
      sp(
        'Vitesse de l’onde',
        'Wave speed',
        tagged('calibrated', `${nFr(WAVE_SPEED.steel)} m/s dans l’acier`, `${nEn(WAVE_SPEED.steel)} m/s in steel`),
      ),
    ],
    maintenance: l(
      'Contrôlez ancrages et raccords : ils reçoivent environ cent coups par minute. Purgez l’air après tout arrêt de la réserve.',
      'Check the anchors and fittings: they take about a hundred strokes a minute. Purge the air after any run-dry of the tank.',
    ),
    tip: l(
      'Une conduite trop courte pénalise le bélier : dans le scénario « Conduite motrice trop courte » (8 m pour 7,5 m de chute), le simulateur donne 259 coups/min et un bélier qui prend plus que la source.',
      'A pipe that is too short penalises the ram: in the “Drive pipe too short” scenario (8 m for 7.5 m of fall) the simulator gives 259 strokes/min and a ram that takes more than the spring.',
    ),
    video: ['01:55'],
    design: l(
      `Rigide, parce qu’un tuyau qui se déforme à chaque coup absorbe une partie de l’énergie du choc : le modèle donne à l’onde ${nFr(WAVE_SPEED.steel)} m/s dans l’acier, ${nFr(WAVE_SPEED.pvc)} dans le PVC et ${nFr(WAVE_SPEED.hdpe)} dans le polyéthylène. Longue, parce que plus d’eau en mouvement donne plus d’élan à chaque coup.`,
      `Rigid, because a pipe that flexes at every stroke soaks up part of the energy of the shock: the model gives the wave ${nEn(WAVE_SPEED.steel)} m/s in steel, ${nEn(WAVE_SPEED.pvc)} in PVC and ${nEn(WAVE_SPEED.hdpe)} in polyethylene. Long, because more water in motion gives more momentum at every stroke.`,
    ),
  },
  {
    id: 'ram-pit',
    scene: 'site',
    category: 'structure',
    name: l('Regard du bélier', 'Ram pit'),
    short: l(
      'Regard qui abrite le bélier, le tient en place et évacue l’eau rejetée.',
      'Pit that shelters the ram, holds it in place and carries away the waste water.',
    ),
    description: l(
      'Le regard abrite le bélier et garde accessibles le clapet de choc, le manomètre et les vannes. Il le porte sur une assise rigide, car la machine frappe environ cent fois par minute (100 à 110 coups/min avec le clapet n°1 de la vidéo). Il doit surtout évacuer l’eau : presque toute l’eau motrice (≈ 6,4 L/min sur ≈ 6,7 L/min dans le modèle) ressort par le clapet de choc, et NC State précise que cet excédent doit être drainé pour un fonctionnement continu. Sa construction n’est pas montrée dans la vidéo : ses dimensions sont des estimations.',
      'The pit shelters the ram and keeps the waste valve, the gauge and the valves within reach. It carries the machine on a rigid base, because it strikes about a hundred times a minute (100–110 strokes/min with the video’s n°1 valve). Above all it must carry the water away: almost all the drive water (≈ 6.4 L/min out of ≈ 6.7 L/min in the model) leaves through the waste valve, and NC State points out that this excess must be drained for continuous operation. Its construction is not shown in the video: its dimensions are estimates.',
    ),
    material: l(
      'Maçonnerie ou béton sur dalle d’ancrage (hypothèse du laboratoire)',
      'Masonry or concrete on an anchor slab (lab assumption)',
    ),
    specs: [
      sp(
        'Eau rejetée',
        'Waste water',
        tagged('derived', '≈ 6,4 L/min avec le clapet n°1', '≈ 6.4 L/min with the n°1 valve'),
      ),
      sp('Cadence', 'Stroke rate', l('100 à 110 coups/min', '100–110 strokes/min')),
      sp('Dimensions intérieures (3D)', 'Inner size (3D)', lenM('estimate', PIT.innerLength, PIT.innerWidth)),
      sp('Épaisseur des parois', 'Wall thickness', lenMm('estimate', PIT.wall)),
      sp(
        'Drain',
        'Drain',
        tagged(
          'estimate',
          `Ø ${mm(PIT.drainDiameter).fr} mm, vers l’aval`,
          `Ø ${mm(PIT.drainDiameter).en} mm, downhill`,
        ),
      ),
    ],
    maintenance: l(
      'Vérifiez que le drain n’est pas bouché par des feuilles ou de la terre : sans issue, l’eau du clapet de choc s’accumule autour du bélier.',
      'Check that the drain is not blocked by leaves or soil: with no way out, the water from the waste valve piles up around the ram.',
    ),
    tip: l(
      'Le bélier s’entend de loin, la vidéo le note dès l’introduction : un rythme qui change ou qui s’arrête est le premier signe d’un problème.',
      'The ram can be heard from afar, the video notes it in its introduction: a rhythm that changes or stops is the first sign of trouble.',
    ),
    design: l(
      'Deux fonctions qu’un simple abri n’aurait pas : un ancrage rigide, parce qu’un bélier non fixé se déplace sous ses coups, et un drain, parce qu’il rejette en continu l’eau qu’il ne remonte pas.',
      'Two jobs a simple shelter would not do: a rigid anchor, because an unfixed ram walks under its own strokes, and a drain, because it throws away continuously the water it does not lift.',
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
    description: l(
      'La conduite de refoulement emmène vers le haut le petit volume que chaque coup pousse hors de la cloche. Dans la vidéo elle mesure environ 300 m et monte à 65 m au-dessus du bélier, soit 8,7 fois la chute de 7,5 m. Son diamètre vaut à peu près la moitié de celui de la conduite motrice (½″ pour un bélier de 1″, selon NC State) ; sa longueur compte peu, parce qu’à ≈ 0,35 L/min les frottements sont faibles. Au bélier, la colonne d’eau de 65 m fait environ 6,4 bar à l’arrêt.',
      'The delivery pipe carries upward the small volume that every stroke pushes out of the chamber. In the video it is about 300 m long and rises to 65 m above the ram, that is 8.7 times the 7.5 m fall. Its diameter is about half that of the drive pipe (½″ for a 1″ ram, according to NC State); its length matters little, because at ≈ 0.35 L/min friction is low. At the ram, the 65 m water column is about 6.4 bar at rest.',
    ),
    material: l(
      'Polyéthylène (hypothèse du modèle ; non précisé dans la vidéo)',
      'Polyethylene (model assumption; not stated in the video)',
    ),
    specs: [
      sp('Longueur', 'Length', '≈ 300 m'),
      sp('Hauteur de refoulement', 'Lift', '65 m'),
      sp('Hauteur / chute', 'Lift / fall', tagged('derived', '8,7')),
      sp('Pression statique au bélier', 'Static pressure at the ram', tagged('derived', '≈ 6,4 bar')),
      sp('Débit', 'Flow', l('≈ 0,35 L/min (500 L/jour)', '≈ 0.35 L/min (500 L/day)')),
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
    ],
    maintenance: l(
      'Rien de mobile : cherchez les fuites aux raccords, qui travaillent à plus de 6 bar. Un manomètre qui reste bien sous 6,4 bar alors que la conduite est pleine signale une fuite ou de l’air.',
      'Nothing moves: look for leaks at the fittings, which work at more than 6 bar. A gauge that stays well below 6.4 bar while the pipe is full points to a leak or to air.',
    ),
    tip: l(
      `Comptez des heures avant de voir l’eau arriver : à ≈ 0,35 L/min, la conduite contient à elle seule environ ${nFr(DELIVERY_FILL.litres)} L à remplir (≈ ${nFr(DELIVERY_FILL.hours)} h pour ${nFr(SITE_DIMS.deliveryLength)} m de Ø ${mm(SITE_DIMS.deliveryBore).fr} mm, valeurs du modèle).`,
      `Allow hours before the water arrives: at ≈ 0.35 L/min the pipe itself holds about ${nEn(DELIVERY_FILL.litres)} L to fill (≈ ${nEn(DELIVERY_FILL.hours)} h for ${nEn(SITE_DIMS.deliveryLength)} m of Ø ${mm(SITE_DIMS.deliveryBore).en} mm, model values).`,
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
    description: l(
      'Le château d’eau reçoit l’eau que le bélier remonte et la garde à 65 m au-dessus de lui. Le bélier n’a pas de marche-arrêt : il le remplit jour et nuit, à environ 500 L par jour avec le clapet n°1. La maison est alimentée par gravité depuis ce point haut, sous pression et à la demande, ce qui est le but de l’installation. Son volume n’est pas donné dans la vidéo : ses dimensions dans le laboratoire sont des estimations.',
      'The water tower receives the water the ram lifts and keeps it 65 m above the machine. The ram has no on/off switch: it fills the tower day and night, at about 500 L a day with the n°1 valve. The house is fed by gravity from this high point, under pressure and on demand, which is the purpose of the installation. Its volume is not given in the video: its dimensions in the lab are estimates.',
    ),
    material: l('Cuve couverte (non détaillée dans la vidéo)', 'Covered tank (not detailed in the video)'),
    specs: [
      sp('Hauteur au-dessus du bélier', 'Height above the ram', '65 m'),
      sp('Apport', 'Inflow', l('≈ 500 L/jour avec le clapet n°1', '≈ 500 L/day with the n°1 valve')),
      sp('Volume', 'Volume', l('Non donné par la vidéo', 'Not given by the video')),
      sp('Cuve dessinée en 3D', 'Tank drawn in 3D', diaH('estimate', TOWER.tankDiameter, TOWER.tankHeight)),
      sp('Hauteur du support', 'Stand height', lenM('estimate', TOWER.standHeight)),
    ],
    maintenance: l(
      'Contrôlez le couvercle, la grille du trop-plein et le fond de la cuve : l’eau d’une source n’est pas garantie potable.',
      'Check the lid, the overflow screen and the bottom of the tank: spring water is not guaranteed potable.',
    ),
    tip: l(
      'Donnez-lui un trop-plein qui renvoie le surplus vers un endroit sans risque : le bélier remplit le château sans interruption.',
      'Give it an overflow that sends the surplus somewhere harmless: the ram fills the tower without a break.',
    ),
    video: ['00:11', '02:01'],
    design: l(
      'Un château d’eau est la façon de stocker le travail du bélier : on remonte l’eau quand le bélier la donne et on la consomme quand on veut. Il sépare le débit lent et constant du bélier (≈ 0,35 L/min) de la demande très variable de la maison.',
      'A water tower is how the ram’s work is stored: the water is lifted when the ram supplies it and used when you want it. It separates the slow, steady flow of the ram (≈ 0.35 L/min) from the house’s very variable demand.',
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
      sp('Apport', 'Supply', l('≈ 500 L/jour, jugés suffisants', '≈ 500 L/day, judged enough')),
      sp('Alimentation', 'Feed', l('Par gravité depuis le château d’eau', 'By gravity from the water tower')),
      sp(
        'Altitude de la terrasse',
        'Terrace elevation',
        tagged(
          'estimate',
          `≈ ${nFr(round(HOUSE.terraceFraction * SITE_DIMS.deliveryHead))} m au-dessus du bélier`,
          `≈ ${nEn(round(HOUSE.terraceFraction * SITE_DIMS.deliveryHead))} m above the ram`,
        ),
      ),
      sp('Emprise (3D)', 'Footprint (3D)', lenM('estimate', HOUSE.length, HOUSE.width)),
      sp(
        'Qualité de l’eau',
        'Water quality',
        l('Non garantie potable : à analyser', 'Not guaranteed potable: have it tested'),
      ),
    ],
    maintenance: l(
      'Faites analyser l’eau avant tout usage alimentaire et recommencez si son aspect, son goût ou le temps changent beaucoup.',
      'Have the water tested before any use for drinking and again if its look, its taste or the weather changes a lot.',
    ),
    video: ['00:13', '04:43'],
    design: l(
      'La maison fixe l’objectif : la quantité d’eau à remonter par jour (≈ 500 L) décide de la taille du clapet et du réglage, non l’inverse.',
      'The house sets the target: the quantity of water to lift per day (≈ 500 L) decides the valve size and the setting, not the other way round.',
    ),
  },
];
