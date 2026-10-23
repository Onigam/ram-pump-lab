// Installation guide of the whole site, played in the 'site' world (wave 2, data role).
// Seven steps, from the three measurements to the first start. Every site part is installed once.
//
// Sources of the figures: S1 = the video (fall 7.5 m, drive pipe ≈ 20 m, lift 65 m, delivery pipe ≈ 300 m, spring
// 7.5–7.8 L/min, valve n°3 ≈ 17 L/min and a tank empty after ≈ 10 h, valve n°1 ≈ 500 L/day at 100–110 strokes/min);
// S4 = NC State Extension (drive pipe ≥ 5 × fall, delivery pipe half the drive pipe, 1" ram needs 22.7 L/min);
// the rest is derived or comes from the model (docs/physics.md): 6.4 bar = ρ·g·65 m, tank 5 700 L = (17 − 7.5) L/min
// × 600 min, 6.7 L/min drive flow and 6.5 bar peak for valve n°1, 7.2 bar peak with a water-logged chamber.
// DURATIONS ARE ROUGH ESTIMATES (no source gives them): the lead and the owner are expected to refine them.
// No torque is given: no source states one.

import type { GuideStep } from '@onigam/lab-kit/content';
import { l } from '@onigam/lab-kit/i18n';
import { TANK_VOLUME_DERIVED } from '../sim/presets';
import { nEn, nFr } from './units';

export const INSTALL: GuideStep[] = [
  {
    id: 'survey',
    title: l('Mesurer la chute, la hauteur et le débit', 'Measure the fall, the lift and the flow'),
    text: l(
      'Trois mesures décident de tout. La **chute** : le dénivelé entre le niveau de l’eau de la réserve et l’emplacement du bélier (7,5 m sur le site de la vidéo). La **hauteur de refoulement** : le dénivelé entre le bélier et le point d’arrivée (65 m, par une conduite d’environ 300 m). Et le **débit de la source**, mesuré à l’étiage. La vidéo donne une règle approximative : 1 m de chute remonte l’eau d’environ 10 m, quelle que soit la longueur de la conduite ; ici, 65 m pour 7,5 m de chute font 8,7 fois la chute. C’est le débit qui choisit le bélier : le tableau de NC State Extension demande au moins 22,7 L/min d’eau motrice pour un bélier de 1″, alors que la source de la vidéo ne donne que 7,5 à 7,8 L/min.',
      'Three measurements decide everything. The **fall**: the height difference between the water level in the tank and the ram (7.5 m on the video’s site). The **lift**: the height difference between the ram and the arrival point (65 m, through a pipe of about 300 m). And the **spring flow**, measured at low water. The video gives a rule of thumb: 1 m of fall lifts water about 10 m, whatever the length of the pipe; here 65 m for 7.5 m of fall is 8.7 times the fall. The flow chooses the ram: the NC State Extension table asks for at least 22.7 L/min of drive water for a 1″ ram, while the video’s spring gives only 7.5–7.8 L/min.',
    ),
    parts: [],
    tools: [
      l(
        'Niveau à eau (tuyau transparent) ou clinomètre, décamètre',
        'Water level (clear hose) or clinometer, long tape',
      ),
      l('Seau gradué et chronomètre', 'Graduated bucket and stopwatch'),
      l('Carnet pour consigner les relevés', 'Notebook for the readings'),
    ],
    tip: l(
      'Mesurez le débit plusieurs fois, y compris en fin d’été : la source de la vidéo est passée de 10 L/min à 7,5–7,8 L/min en deux ans, et cette baisse a rendu ingérable même le clapet n°2 envisagé d’abord. Mesurez la chute à la verticale, pas le long du tuyau.',
      'Measure the flow several times, including at the end of summer: the video’s spring went from 10 L/min to 7.5–7.8 L/min in two years, and that drop made even the n°2 valve first considered unmanageable. Measure the fall vertically, not along the pipe.',
    ),
    warning: l(
      'En France, prélever l’eau d’une source ou d’un cours d’eau est réglementé (droit d’eau, continuité écologique) : renseignez-vous auprès de la DDT et de l’OFB avant tout travail. Les règles diffèrent d’un pays à l’autre. Et l’eau d’une source n’est pas garantie potable.',
      'In France, taking water from a spring or a stream is regulated (water rights, ecological continuity): check with the DDT and the OFB before any work. Rules differ from one country to another. And spring water is not guaranteed potable.',
    ),
    duration: '2 h',
  },
  {
    id: 'catchment',
    title: l('Capter la source et poser la réserve tampon', 'Catch the spring and set the buffer tank'),
    text: l(
      'Captez la **source** à l’abri des pollutions et des animaux, et menez son eau dans une **réserve tampon** d’où part la conduite motrice. La réserve donne au bélier un niveau d’eau stable, et elle stocke ce que la source donne pendant que le bélier tire plus qu’elle. C’est son point faible dans la vidéo : avec le clapet n°3, le bélier prenait environ 17 L/min (estimation, non mesurée) pour une source de 7,5 L/min ; la réserve se vidait en une dizaine d’heures, le bélier s’arrêtait et il fallait aller le relancer à la main tous les deux jours. Avec le clapet n°1, il prend moins que la source (≈ 6,7 L/min dans le modèle) : la réserve ne se vide plus.',
      'Catch the **spring** where it is safe from pollution and animals, and lead its water into a **buffer tank** from which the drive pipe starts. The tank gives the ram a steady water level, and it stores what the spring supplies while the ram draws more than the spring gives. That is its weak point in the video: with the n°3 valve the ram took about 17 L/min (an estimate, not measured) from a 7.5 L/min spring; the tank emptied in about ten hours, the ram stopped and someone had to restart it by hand every two days. With the n°1 valve it takes less than the spring (≈ 6.7 L/min in the model): the tank no longer empties.',
    ),
    parts: ['spring', 'buffer-tank'],
    tools: [
      l('Pelle, niveau à bulle', 'Shovel, spirit level'),
      l('Cuve avec trop-plein et sortie basse', 'Tank with an overflow and a low outlet'),
    ],
    tip: l(
      `Dimensionnez la réserve sur votre propre déficit : (consommation du bélier − débit de la source) × la durée à tenir. Le laboratoire en déduit ${nFr(TANK_VOLUME_DERIVED)} L des dix heures de la vidéo, soit (17 − 7,5) L/min × 600 min : ce volume n’est pas donné dans la vidéo.`,
      `Size the tank on your own deficit: (ram consumption − spring flow) × the time to cover. The lab derives ${nEn(TANK_VOLUME_DERIVED)} L from the video’s ten hours, that is (17 − 7.5) L/min × 600 min: this volume is not given in the video.`,
    ),
    warning: l(
      'Une réserve qui se vide laisse entrer de l’air dans la conduite motrice : le bélier s’arrête et ne repart pas seul. Gardez la sortie noyée en permanence et prévoyez un trop-plein pour que le surplus de la source reparte vers le ruisseau.',
      'A tank that runs dry lets air into the drive pipe: the ram stops and does not restart by itself. Keep the outlet submerged at all times and give the tank an overflow so that the surplus from the spring goes back to the stream.',
    ),
    duration: '8 h',
  },
  {
    id: 'drive-pipe',
    title: l('Poser la conduite motrice', 'Lay the drive pipe'),
    text: l(
      'Posez la **conduite motrice** de la réserve au bélier : rigide, droite, d’un diamètre égal à celui du bélier (1″ pour un bélier de 1″). Sur le site de la vidéo elle mesure environ 20 m pour 7,5 m de chute. Sa longueur compte : NC State demande au moins 5 fois la chute, d’autres sources 3 à 7 fois ; 20 m pour 7,5 m font 2,7 fois, ce qui est court (le simulateur allume une alerte sous 2,5 fois). Plus la conduite est longue, plus il y a d’eau en mouvement et donc d’élan à chaque coup. Descendez-la en pente continue, sans point haut où l’air s’accumulerait, et ancrez-la, surtout aux coudes et près du bélier : à chaque coup, l’eau de la conduite s’arrête net et pousse plusieurs bars sur les parois.',
      'Lay the **drive pipe** from the tank to the ram: rigid, straight, with the same diameter as the ram (1″ for a 1″ ram). On the video’s site it is about 20 m long for 7.5 m of fall. Its length matters: NC State asks for at least 5 times the fall, other sources 3 to 7 times; 20 m for 7.5 m is 2.7 times, which is short (the simulator raises an alert below 2.5 times). The longer the pipe, the more water in motion and so the more momentum at every stroke. Run it down on a continuous slope, with no high point where air could collect, and anchor it, especially at the bends and near the ram: at every stroke the water in the pipe stops dead and pushes several bar on the walls.',
    ),
    parts: ['drive-pipe'],
    tools: [
      l('Colliers de fixation et plots d’ancrage', 'Clamps and anchor blocks'),
      l('Clés pour raccords étanches à l’air', 'Wrenches for airtight fittings'),
      l('Niveau à eau ou clinomètre', 'Water level or clinometer'),
    ],
    tip: l(
      'La chute se mesure à la verticale, du niveau de l’eau de la réserve jusqu’au bélier : ce qui compte pour la hauteur de refoulement, c’est elle, pas la longueur du tuyau.',
      'The fall is measured vertically, from the water level in the tank down to the ram: it is the fall, not the pipe length, that sets how high the water can be lifted.',
    ),
    warning: l(
      'Conduite motrice rigide : acier ou fonte. Les conduites en plastique sont déconseillées, car la paroi qui se déforme à chaque coup absorbe une partie de l’énergie du choc. Le choc atteint plusieurs bars (≈ 6,5 bar dans le modèle avec le clapet n°1) : aucun raccord collé ou fatigué.',
      'Rigid drive pipe: steel or cast iron. Plastic pipes are discouraged, because a wall that flexes at every stroke soaks up part of the energy of the shock. The shock reaches several bar (≈ 6.5 bar in the model with the n°1 valve): no glued or tired fittings.',
    ),
    duration: '6 h',
  },
  {
    id: 'ram-pit',
    title: l('Installer le bélier dans son regard', 'Set the ram in its pit'),
    text: l(
      'Placez le **bélier** dans un **regard**, sur une dalle ou un massif qui le tient : il frappe environ cent fois par minute (100 à 110 coups/min avec le clapet n°1 de la vidéo) et il bougerait sinon. Le regard le protège et garde l’accès au clapet, au manomètre et aux vannes. Surtout, il doit évacuer l’eau : le bélier rejette en continu presque toute l’eau qu’il prend (≈ 6,4 L/min sur ≈ 6,7 L/min dans le modèle, le reste part au château), et NC State rappelle que cet excédent doit être évacué pour un fonctionnement continu. Prévoyez un drain, ou une pente qui écarte l’eau du clapet de choc.',
      'Set the **ram** in a **pit**, on a slab or a block that holds it: it strikes about a hundred times a minute (100–110 strokes/min with the video’s n°1 valve) and would move otherwise. The pit protects it and keeps the waste valve, the gauge and the valves within reach. Above all it must get rid of the water: the ram throws away almost all the water it takes (≈ 6.4 L/min out of ≈ 6.7 L/min in the model, the rest goes to the tower), and NC State points out that this excess must be drained away for continuous operation. Give it a drain, or a slope that carries the water away from the waste valve.',
    ),
    parts: ['ram-pit'],
    tools: [
      l('Niveau à bulle', 'Spirit level'),
      l('Boulons d’ancrage ou goujons scellés', 'Anchor bolts or set studs'),
      l('Pelle, tuyau de drainage', 'Shovel, drain pipe'),
    ],
    tip: l(
      'Mettez le bélier d’aplomb : le clapet de choc pend sur sa tige dans un guide ajusté au dixième de millimètre, et une tige inclinée frotte au lieu de coulisser.',
      'Set the ram plumb: the waste valve hangs on its stem in a guide fitted to a tenth of a millimetre, and a leaning stem rubs instead of sliding.',
    ),
    warning: l(
      'Le regard est un endroit où l’on glisse et où le bélier cogne : ancrez la machine avant de la raccorder, et gardez les doigts hors du clapet de choc dès que l’eau arrive.',
      'The pit is a place where you slip and where the ram thumps: anchor the machine before connecting it, and keep your fingers out of the waste valve as soon as the water arrives.',
    ),
    duration: '4 h',
  },
  {
    id: 'delivery-pipe',
    title: l('Monter la conduite de refoulement', 'Run the delivery pipe up'),
    text: l(
      'Raccordez la **conduite de refoulement** à la sortie du bélier et montez-la jusqu’au point d’arrivée : environ 300 m de long pour 65 m de dénivelé sur le site de la vidéo. Son diamètre vaut à peu près la moitié de celui de la conduite motrice (½″ pour un bélier de 1″, selon NC State) et ne doit jamais descendre sous la valeur du fabricant ; sa longueur compte peu, car les frottements sont faibles à ces débits (ici ≈ 0,35 L/min). Le simulateur la suppose en polyéthylène. Au bélier, 65 m de colonne d’eau font environ 6,4 bar à l’arrêt : choisissez un tuyau et des raccords dont la pression de service est nettement au-dessus.',
      'Connect the **delivery pipe** to the ram outlet and run it up to the arrival point: about 300 m long for 65 m of climb on the video’s site. Its diameter is about half that of the drive pipe (½″ for a 1″ ram, according to NC State) and must never go below the maker’s figure; its length matters little, because friction is low at these flows (here ≈ 0.35 L/min). The simulator assumes polyethylene. At the ram, 65 m of water column is about 6.4 bar at rest: choose a pipe and fittings whose working pressure is clearly above that.',
    ),
    parts: ['delivery-pipe'],
    tools: [
      l('Coupe-tube, raccords adaptés à la pression', 'Pipe cutter, pressure-rated fittings'),
      l('Manomètre de contrôle, pompe d’épreuve', 'Test gauge, hand test pump'),
      l('Piquets et cordeau', 'Stakes and string line'),
    ],
    tip: l(
      'Éprouvez la conduite avant de la recouvrir. Dans le modèle, la pression monte à 7,2 bar si la cloche à air est noyée (6,5 bar sinon) : gardez de la marge au-dessus de 6,4 bar.',
      'Pressure-test the line before covering it. In the model the pressure reaches 7.2 bar if the air chamber is water-logged (6.5 bar otherwise): keep a margin above 6.4 bar.',
    ),
    warning: l(
      'Un raccord qui lâche sur une conduite à plus de 6 bar projette l’eau avec force. Éprouvez, serrez, puis seulement recouvrez.',
      'A fitting that gives way on a line above 6 bar throws the water out with force. Test it, tighten it, and only then cover it.',
    ),
    duration: '16 h',
  },
  {
    id: 'tower',
    title: l('Poser le château d’eau et alimenter la maison', 'Set the water tower and feed the house'),
    text: l(
      'Posez le **château d’eau** au point haut, à environ 65 m au-dessus du bélier, et alimentez la **maison** par gravité : l’eau redescend d’elle-même, avec de la pression et à la demande, ce qui est tout l’intérêt de la remontée. Le bélier n’a pas de marche-arrêt : il remplit le château jour et nuit, à environ 500 L par jour avec le clapet n°1 (≈ 0,35 L/min), ce que la vidéo juge suffisant pour le foyer. Donnez au château un trop-plein qui renvoie le surplus vers un endroit sans risque, et un couvercle.',
      'Set the **water tower** at the high point, about 65 m above the ram, and feed the **house** by gravity: the water comes back down by itself, under pressure and on demand, which is the whole point of lifting it. The ram has no on/off switch: it fills the tower day and night, at about 500 L a day with the n°1 valve (≈ 0.35 L/min), which the video judges enough for the household. Give the tower an overflow that sends the surplus somewhere harmless, and a lid.',
    ),
    parts: ['water-tower', 'house'],
    tools: [l('Niveau à bulle', 'Spirit level'), l('Raccords de sortie et trop-plein', 'Outlet and overflow fittings')],
    tip: l(
      'À 500 L par jour, le château se remplit lentement : sa taille décide combien de jours il tient si le bélier s’arrête. La vidéo ne donne pas son volume.',
      'At 500 L a day the tower fills slowly: its size decides how many days it lasts if the ram stops. The video does not give its volume.',
    ),
    warning: l(
      'L’eau d’une source n’est pas garantie potable : faites-la analyser avant de la boire ou de la distribuer à la maison, et protégez le château (couvercle, grillage sur le trop-plein).',
      'Spring water is not guaranteed potable: have it tested before drinking it or distributing it in the house, and protect the tower (lid, screen on the overflow).',
    ),
    duration: '8 h',
  },
  {
    id: 'first-start',
    title: l('Premier démarrage, et que vérifier s’il cale', 'First start, and what to check when it stalls'),
    text: l(
      'Remplissez la conduite motrice depuis la réserve en chassant tout l’air, puis ouvrez progressivement la vanne d’arrivée. Si les coups ne s’enchaînent pas d’eux-mêmes, enfoncez le poids du **clapet de choc** à la main puis relâchez-le. Écoutez : avec le clapet n°1, la vidéo compte 100 à 110 coups par minute, presque deux par seconde (l’ancien clapet en faisait 70 à 80). Ne cherchez pas un jet : 500 L par jour, c’est 0,35 L/min, soit environ 3 mL par coup, et la conduite de refoulement doit d’abord se remplir. Si le bélier cale, vérifiez dans cet ordre : le niveau de la réserve (air dans la conduite motrice) ; la cloche à air (noyée, ou reniflard bouché) ; la course du clapet (trop longue, le bélier boit l’eau de la réserve ; trop courte, il frappe sans rien refouler) ; puis un clapet qui coince ou qui ne porte pas bien sur sa portée.',
      'Fill the drive pipe from the tank, driving out all the air, then open the inlet valve gradually. If the strokes do not follow one another by themselves, press the weight of the **waste valve** down by hand and let go. Listen: with the n°1 valve the video counts 100–110 strokes a minute, almost two a second (the old valve made 70–80). Do not expect a jet: 500 L a day is 0.35 L/min, about 3 mL per stroke, and the delivery pipe has to fill first. If the ram stalls, check in this order: the tank level (air in the drive pipe); the air chamber (water-logged, or snifter blocked); the stroke of the valve (too long, the ram drinks the tank dry; too short, it strikes and delivers nothing); then a valve that jams or does not seat properly.',
    ),
    parts: [],
    tools: [
      l('Manomètre côté refoulement', 'Pressure gauge on the delivery side'),
      l('Clé pour le contre-écrou du clapet', 'Spanner for the valve lock nut'),
      l('Chronomètre pour compter les coups', 'Stopwatch to count the strokes'),
    ],
    tip: l(
      'Le manomètre sert de jauge de remplissage : il lit la hauteur d’eau déjà montée (1 bar ≈ 10 m) et doit atteindre environ 6,4 bar quand les 65 m de conduite sont pleins. Une valeur qui reste bien en dessous signale une fuite ou de l’air dans la conduite.',
      'The gauge works as a fill meter: it reads the height of water already lifted (1 bar ≈ 10 m) and should reach about 6.4 bar once the 65 m of pipe are full. A value that stays well below points to a leak or to air in the line.',
    ),
    warning: l(
      'Jamais un doigt dans les lumières du clapet de choc quand le bélier tourne : il se ferme en quelques centièmes de seconde avec plusieurs bars derrière. Enfoncez le poids par le dessus, jamais par les lumières, et gardez le manomètre côté refoulement.',
      'Never put a finger in the ports of the waste valve while the ram is running: it shuts in a few hundredths of a second with several bar behind it. Press the weight from above, never through the ports, and keep the gauge on the delivery side.',
    ),
    duration: '1 h',
  },
];
