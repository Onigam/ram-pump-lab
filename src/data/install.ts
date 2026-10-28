// Installation guide of the whole site. It starts and ends on the site (the guide's default view) and visits the catchment
// view for the spring box and the buffer tank, where `scene: 'catchment'` is set.
// Twelve steps: survey (no part) → spring box, tank, outlet, lid (catchment, 9 parts, each once) → drive pipe, waste
// drain, ram pit, delivery pipe, tower and house (site) → first start and troubleshooting (no part). `spring`,
// `buffer-tank` and the parts of the ram view are not installed here: the site already has the first two, and the ram is
// built by the assembly guide (steps 14 to 24).
//
// Who says what. The video gives the fall 7.5 m, the drive pipe ≈ 20 m, the lift 65 m, the delivery pipe ≈ 300 m, the
// spring 7.5–7.8 L/min, the n°3 valve ≈ 17 L/min and a tank empty after ≈ 10 h, the n°1 valve ≈ 500 L/day at 100–110
// strokes/min. The video shows neither the catchment nor any fitting of the tank: steps 2–5 and the waste drain give the
// common practice (Oxfam « Spring protection », Practical Action « Hydraulic ram pumps », NC State Extension: drive pipe
// ≥ 5 × the fall, delivery pipe half the drive pipe, 1" ram needs 22.7 L/min), named in the text, and the lab's own
// drawing. Numbers that are not reported come from FIG in parts/site.ts (derived or model results, each checked by
// parts-site.test.ts).
// Length of the cards (pedagogy review): text ≤ 80 words (hard cap 90), tip ≤ 30, warning ≤ 30 unless it is a safety or
// legal content, which is never shortened.
// DURATIONS ARE ROUGH ESTIMATES (no source gives them). The kit prints `duration` as it is, in one language, so each one
// reads « ≈ 6 h (est.) », which is understood in French and in English. The tank takes ≈ 12.7 h more to fill
// (FIG.tankHoursSpring); that waiting time is not counted in the lid step.
// No torque is given: no source states one.

import type { GuideStep } from '@onigam/lab-kit/content';
import { l } from '@onigam/lab-kit/i18n';
import { TANK } from '../three/dims';
import { lf } from './parts/site';
import { mm } from './units';

export const INSTALL: GuideStep[] = [
  {
    id: 'survey',
    title: l('Mesurer la chute, la hauteur et le débit', 'Measure the fall, the lift and the flow'),
    text: lf(
      'Trois mesures décident de tout. La **chute** : le dénivelé vertical de l’eau de la réserve au bélier ({fall} m). La **hauteur de refoulement** : le dénivelé du bélier à l’arrivée ({lift} m, soit 8,7 fois la chute). Le **débit de la source**, mesuré à l’étiage au seau et au chronomètre, choisit le bélier : l’université américaine NC State demande au moins {minFlow1in} L/min pour un bélier de 1″, la source de la vidéo en donne {source} à {sourceHigh}.',
      'Three measurements decide everything. The **fall**: the vertical drop from the tank’s water to the ram ({fall} m). The **delivery head** (the lift): the height from the ram up to the arrival point ({lift} m, that is 8.7 times the fall). The **spring flow**, measured at low water with a bucket and a stopwatch, picks the ram: the US university NC State asks for at least {minFlow1in} L/min for a 1″ ram, the video’s spring gives {source}–{sourceHigh}.',
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
    tip: lf(
      'Mesurez le débit plusieurs fois, aussi en fin d’été : la source de la vidéo est passée de {sourceBefore} à {source}–{sourceHigh} L/min en deux ans, et même un clapet n°2 consommait encore trop.',
      'Measure the flow several times, at the end of summer too: the video’s spring went from {sourceBefore} to {source}–{sourceHigh} L/min in two years, and even a No. 2 valve still used too much.',
    ),
    warning: l(
      'En France, prélever l’eau d’une source ou d’un cours d’eau est réglementé (droit d’eau, continuité écologique) : renseignez-vous auprès de la DDT et de l’OFB avant tout travail. Les règles diffèrent d’un pays à l’autre. Et l’eau d’une source n’est pas garantie potable.',
      'In France, taking water from a spring or a stream is regulated (water rights, ecological continuity): check with the DDT and the OFB before any work. Rules differ from one country to another. And spring water is not guaranteed potable.',
    ),
    duration: '≈ 2 h (est.)',
  },
  {
    id: 'catch-spring',
    scene: 'catchment',
    title: l(
      'Capter la source : regard de captage, filtre à gravier, conduite d’alimentation',
      'Catch the spring: spring box, gravel filter, feed pipe',
    ),
    text: lf(
      'On zoome sur le captage, en amont du site, là où l’eau sort de terre. Hors vidéo : pratique courante (fiche de l’ONG Oxfam). Dégagez l’émergence : une source gênée peut se déplacer. Couvrez-la du **filtre à gravier** (dans le dessin du laboratoire, fin près de la roche et gros contre le mur du regard), puis bâtissez le **regard de captage** : chambre fermée, sortie basse, trop-plein, bouchon de vidange. Reliez-le à la cuve par la **conduite d’alimentation**.',
      'We zoom in on the catchment, upstream of the site, where the water comes out of the ground. Not in the video: common practice (the NGO Oxfam’s brief). Uncover the spring eye: an obstructed spring can shift. Cover it with the **gravel filter** (in the lab’s drawing, fine near the rock and coarse against the box wall), then build the **spring box**: a closed chamber, low outlet, overflow, washout plug. Connect it to the tank with the **feed pipe**.',
    ),
    parts: ['spring-box', 'gravel-filter', 'feed-pipe'],
    tools: [
      l('Pelle et pioche, niveau à bulle', 'Shovel and pick, spirit level'),
      l('Pierres et gravier lavés, gradués', 'Washed stones and gravel, graded'),
      l('Seau gradué et chronomètre pour contrôler le débit', 'Graduated bucket and stopwatch to check the flow'),
    ],
    tip: lf(
      'Mesurez le débit à la sortie du regard puis à l’arrivée dans la cuve : il doit être le même. 1 L/min de fuite, c’est déjà ≈ {lossPct} % de la source.',
      'Measure the flow at the outlet of the box and then where it enters the tank: it must be the same. A 1 L/min leak is already ≈ {lossPct}% of the spring.',
    ),
    warning: l(
      'Le captage est l’ouvrage visé par la réglementation (DDT, OFB), et un captage protégé ne rend pas l’eau potable : le gravier et le regard retiennent la terre et les feuilles, pas les microbes.',
      'The catchment is the work the regulations target (DDT, OFB), and a protected catchment does not make the water potable: the gravel and the box hold back soil and leaves, not microbes.',
    ),
    duration: '≈ 6 h (est.)',
  },
  {
    id: 'set-tank',
    scene: 'catchment',
    title: l('Poser la cuve, son trop-plein et sa vidange', 'Set the tank, its overflow and its drain'),
    text: lf(
      'Posez la **cuve** tampon sur une dalle plane et ferme. Calez-la : la sortie de la conduite motrice doit être à {fall} m au-dessus du bélier. Percez la paroi pour le **trop-plein** (sans vanne) et la **vidange** (au point bas, avec une vanne). Volume absent de la vidéo : les {tankL} L du laboratoire sont déduits des {hoursN3} h du clapet n°3, pour une source supposée à {source} L/min (la vidéo ne date pas ces heures).',
      'Set the buffer **tank** on a flat, firm slab. Wedge it: the outlet of the drive pipe must sit {fall} m above the ram. Cut the wall for the **overflow** (no valve) and the **drain** (at the lowest point, with a valve). Volume not in the video: the lab’s {tankL} L is derived from the {hoursN3} h of the No. 3 valve, for a spring assumed at {source} L/min (the video does not date those hours).',
    ),
    parts: ['tank-shell', 'overflow-pipe', 'tank-drain'],
    tools: [
      l('Niveau à eau ou clinomètre', 'Water level or clinometer'),
      l('Scie cloche et raccords de traversée de paroi', 'Hole saw and wall-crossing fittings'),
      l('Vanne à boisseau sphérique pour la vidange', 'Ball valve for the drain'),
    ],
    tip: lf(
      'Une cuve plus grande ne fait que retarder l’arrêt. Ce qui compte, c’est que le bélier prenne moins que la source : ≈ {drive1} L/min contre {source} L/min avec le clapet n°1.',
      'A bigger tank only delays the stop. What counts is that the ram takes less than the spring gives: ≈ {drive1} L/min against {source} L/min with the No. 1 valve.',
    ),
    warning: lf(
      'Pas de vanne sur le trop-plein ; vanne de vidange toujours refermée après usage : une cuve qui fuit se vide comme si le bélier prenait trop. Sur sol mou, une cuve de ≈ {tankTonnes} t finit par pencher.',
      'No valve on the overflow; drain valve always closed again after use: a leaking tank empties as if the ram took too much. On soft ground, a ≈ {tankTonnes} t tank ends up leaning.',
    ),
    duration: '≈ 6 h (est.)',
  },
  {
    id: 'fit-outlet',
    scene: 'catchment',
    title: l(
      'Équiper le départ : crépine et vanne de départ',
      'Fit the outlet: intake screen and drive-pipe gate valve',
    ),
    text: lf(
      'Au bas de la cuve, fixez la **crépine de départ** sur l’entrée de la conduite motrice, au-dessus du fond pour ne pas aspirer la boue (' +
        mm(TANK.outletAboveFloor).fr +
        ' mm, estimation), puis la **vanne de départ**, à opercule, de passage 1″. Toujours immergée, la crépine retient les débris qui se coinceraient sous le clapet de choc et garde l’air hors de la conduite. La vanne permet d’arrêter le bélier sans vider la cuve. Pratique courante, absente de la vidéo.',
      'At the bottom of the tank, fix the **intake screen** on the inlet of the drive pipe, above the floor so as not to draw the mud (' +
        mm(TANK.outletAboveFloor).en +
        ' mm, estimate), then the drive-pipe **gate valve** (1″ bore). Always under water, the screen holds back the debris that would jam under the waste valve and keeps air out of the pipe. The valve lets you stop the ram without emptying the tank. Common practice, not shown in the video.',
    ),
    parts: ['intake-screen', 'drive-gate-valve'],
    tools: [
      l('Clés pour raccords, pâte ou ruban d’étanchéité', 'Spanners for fittings, sealing paste or tape'),
      l('Brosse pour la crépine', 'Brush for the screen'),
    ],
    tip: l(
      'Gardez la vanne fermée tant que la conduite motrice n’est pas posée et ancrée, puis ouvrez-la lentement. En marche elle reste ouverte à fond : on ne règle pas le débit avec elle.',
      'Keep the valve closed until the drive pipe is laid and anchored, then open it slowly. When running it stays fully open: the flow is not adjusted with it.',
    ),
    warning: l(
      'De l’air dans la conduite motrice peut arrêter un bélier (pratique courante, ni montrée dans la vidéo ni simulée) : la crépine doit rester sous l’eau, même cuve presque vide.',
      'Air in the drive pipe can stop a ram (common practice, neither shown in the video nor simulated): the screen must stay under water, even with the tank nearly empty.',
    ),
    duration: '≈ 2 h (est.)',
  },
  {
    id: 'fill-and-close',
    scene: 'catchment',
    title: l('Remplir, contrôler, fermer la cuve', 'Fill, check and close the tank'),
    text: lf(
      'Laissez la source remplir la cuve, vanne de départ fermée : il faut ≈ {tankHoursSpring} h à {source} L/min pour {tankL} L (dérivé). Vérifiez que le trop-plein coule et cherchez les fuites au pied et à la vidange. Quand tout est sec et net, posez le **couvercle** et son **aération**, grillagée mais ouverte : la cuve est fermée à la lumière, aux feuilles et aux animaux, sans dépression quand elle se vide. La vidéo ne montre ni l’un ni l’autre.',
      'Let the spring fill the tank, gate valve closed: it takes ≈ {tankHoursSpring} h at {source} L/min for {tankL} L (derived). Check that the overflow runs and look for leaks at the foot and at the drain. When everything is dry and clean, put on the **lid** and its **vent**, screened but open: the tank is closed against light, leaves and animals, with no vacuum as it empties. The video shows neither.',
    ),
    parts: ['tank-lid'],
    tools: [
      l('Seau gradué pour contrôler le débit du trop-plein', 'Graduated bucket to check the overflow flow'),
      l('Grillage fin anti-insectes pour l’aération', 'Fine insect screen for the vent'),
    ],
    tip: lf(
      'Cuve pleine et vanne de départ fermée, le trop-plein doit couler de tout le débit de la source ({source} à {sourceHigh} L/min). Sinon : fuite, ou débit en baisse.',
      'With the tank full and the gate valve closed, the overflow must run at the whole spring flow ({source}–{sourceHigh} L/min). If not: a leak, or a flow that has dropped.',
    ),
    warning: l(
      'L’eau stockée n’est pas garantie potable et le couvercle la protège sans la traiter : ne la goûtez pas, faites-la analyser avant tout usage alimentaire.',
      'The stored water is not guaranteed potable and the lid protects it without treating it: do not taste it, have it tested before any use for drinking.',
    ),
    duration: '≈ 1 h (est.)',
  },
  {
    id: 'drive-pipe',
    title: l('Poser la conduite motrice', 'Lay the drive pipe'),
    text: lf(
      'Retour sur le site, en aval de la réserve. Posez la **conduite motrice** de la vanne de départ au bélier : rigide, droite, du diamètre du bélier (1″). Longue de {driveLen} m pour {fall} m de chute (2,7 fois), elle est courte : NC State demande au moins 5 fois, l’ONG Practical Action 3 à 7 fois. Descendez-la en pente continue et ancrez-la : à chaque coup, ses ≈ {driveLitres} L s’arrêtent net et poussent plusieurs bars sur les parois.',
      'Back on the site, downstream of the tank. Lay the **drive pipe** from the gate valve to the ram: rigid, straight, with the ram’s diameter (1″). {driveLen} m long for {fall} m of fall (2.7 times), it is short: NC State asks for at least 5 times, the NGO Practical Action 3 to 7 times. Run it down on a continuous slope and anchor it: at every stroke its ≈ {driveLitres} L stop dead and push several bars on the walls.',
    ),
    parts: ['drive-pipe'],
    tools: [
      l('Colliers de fixation et plots d’ancrage', 'Clamps and anchor blocks'),
      l('Clés pour raccords étanches à l’air', 'Spanners for airtight fittings'),
      l('Niveau à eau ou clinomètre', 'Water level or clinometer'),
    ],
    tip: l(
      'Évitez tout point haut où l’air s’accumulerait. Le simulateur alerte sous 2,5 fois la chute (seuil du laboratoire) ; le calculateur dit « trop courte » sous 3 fois (Wikipédia).',
      'Avoid any high point where air would collect. The simulator raises an alert below 2.5 times the fall (a lab threshold); the calculator says “too short” below 3 times (Wikipedia).',
    ),
    warning: lf(
      'Conduite motrice rigide : acier ou fonte. Le plastique est déconseillé : l’onde y est plus lente, donc le choc plus faible (le modèle ne refoule rien avec le clapet réglé pour l’acier ; Wikipédia note que le PVC marche dans certaines installations, l’acier restant préféré). Le choc atteint plusieurs bars (≈ {peak1} bar dans le modèle) : aucun raccord collé ni usé.',
      'Rigid drive pipe: steel or cast iron. Plastic is discouraged: the wave is slower in it, so the shock is weaker (the model delivers nothing with the valve set for steel; Wikipedia notes that PVC works in some installations, steel remaining preferred). The shock reaches several bars (≈ {peak1} bar in the model): no glued or worn joints.',
    ),
    duration: '≈ 6 h (est.)',
  },
  {
    id: 'waste-drain',
    title: l('Tracer l’évacuation des eaux de rejet', 'Lay the waste-water drain'),
    text: lf(
      'Avant de poser la fosse, tracez l’**évacuation des eaux de rejet**, tuyau ou fossé qui part du fond de la future fosse jusqu’à un exutoire sans retour possible. Elle emporte presque toute l’eau motrice, ≈ {waste1} L/min sur ≈ {drive1} L/min avec le clapet n°1 (modèle), soit ≈ {wasteDay1} m³ par jour : NC State demande de drainer cet excédent. Donnez-lui une pente continue et une sortie libre à l’air, au-dessus des plus hautes eaux du fossé récepteur.',
      'Before the pit, lay the **waste-water drain**, a pipe or ditch from the floor of the future pit to an outfall with no way back. It carries away almost all the drive water, ≈ {waste1} L/min of ≈ {drive1} L/min with the No. 1 valve (model), ≈ {wasteDay1} m³ a day: NC State says this excess must be drained. Give it a continuous slope and a free outlet in the open air, above the high-water mark of the receiving ditch.',
    ),
    parts: ['waste-drain'],
    tools: [
      l('Pelle, niveau à eau ou clinomètre', 'Shovel, water level or clinometer'),
      l('Tuyau de drainage PVC ou pierres pour le fossé', 'PVC drain pipe or stones for the ditch'),
      l('Enrochement pour protéger la sortie', 'Rock lining to protect the outlet'),
    ],
    tip: l(
      'Contrôlez la pente avant de reboucher, en versant un seau d’eau : elle doit s’écouler seule, sans flaque. Le fond de la fosse doit rester plus haut que la sortie.',
      'Check the slope before backfilling by pouring a bucket of water: it must run off on its own, with no puddle. The floor of the pit must stay higher than the outlet.',
    ),
    warning: l(
      'Si l’eau remonte dans la fosse, elle noie le clapet de choc et le bélier s’arrête (pour certains béliers, d’après Practical Action) : évitez une évacuation trop plate, bouchée ou noyée par une crue.',
      'If the water rises in the pit it drowns the waste valve and the ram stops (for some rams, according to Practical Action): avoid a drain that is too flat, blocked or drowned by a flood.',
    ),
    duration: '≈ 3 h (est.)',
  },
  {
    id: 'ram-pit',
    title: l('Installer la fosse et le bélier', 'Set the pit and the ram'),
    text: lf(
      'Bâtissez la **fosse** (dimensions estimées) autour du massif d’ancrage, son fond au-dessus de la sortie de l’évacuation, puis posez le bélier dessus et boulonnez-le : il frappe 100 à 110 fois par minute avec le clapet n°1 de la vidéo et bougerait sinon. Raccordez la conduite motrice à la vanne d’arrivée et la conduite de refoulement à la vanne de sortie, le manomètre restant côté refoulement. Le bélier se monte avec le guide Montage (étapes 14 à 24).',
      'Build the **pit** (dimensions estimated) around the anchor block, its floor above the outlet of the drain, then set the ram on it and bolt it down: it strikes 100–110 times a minute with the video’s No. 1 valve and would move otherwise. Connect the drive pipe to the inlet valve and the delivery pipe to the outlet valve, the gauge staying on the delivery side. The ram is put together with the Assembly guide (steps 14 to 24).',
    ),
    parts: ['ram-pit'],
    tools: [
      l('Niveau à bulle', 'Spirit level'),
      l('Boulons d’ancrage ou goujons scellés', 'Anchor bolts or set studs'),
      l('Pelle, béton pour le massif', 'Shovel, concrete for the block'),
    ],
    tip: l(
      'Mettez le bélier d’aplomb : le clapet de choc pend sur sa tige dans un guide ajusté au dixième de millimètre, et une tige inclinée frotte au lieu de coulisser.',
      'Set the ram plumb: the waste valve hangs on its stem in a guide fitted to a tenth of a millimetre, and a leaning stem rubs instead of sliding.',
    ),
    warning: l(
      'La fosse est un endroit où l’on glisse et où le bélier cogne : ancrez la machine avant de la raccorder (Practical Action demande une fondation en béton), et gardez les doigts hors du clapet de choc dès que l’eau arrive.',
      'The pit is a place where you slip and where the ram thumps: anchor the machine before connecting it (Practical Action asks for a concrete foundation), and keep your fingers out of the waste valve as soon as the water arrives.',
    ),
    duration: '≈ 5 h (est.)',
  },
  {
    id: 'delivery-pipe',
    title: l('Monter la conduite de refoulement', 'Run the delivery pipe up'),
    text: lf(
      'Montez la **conduite de refoulement** de la sortie du bélier au point d’arrivée : environ {deliveryLen} m pour {lift} m de dénivelé. Son diamètre vaut à peu près la moitié de celui de la conduite motrice (½″ pour un bélier de 1″, selon NC State), sans descendre sous la valeur du fabricant. Au bélier, {lift} m de colonne d’eau font ≈ {staticBarDelivery} bar à l’arrêt : prenez tuyau et raccords nettement au-dessus. Prévoyez une vanne près du bélier (Practical Action).',
      'Run the **delivery pipe** up from the ram outlet to the arrival point: about {deliveryLen} m for {lift} m of climb. Its diameter is about half that of the drive pipe (½″ for a 1″ ram, according to NC State), and never below the maker’s figure. At the ram, {lift} m of water column is ≈ {staticBarDelivery} bar at rest: take a pipe and fittings clearly above that. Plan a valve near the ram (Practical Action).',
    ),
    parts: ['delivery-pipe'],
    tools: [
      l('Coupe-tube, raccords adaptés à la pression', 'Pipe cutter, pressure-rated fittings'),
      l('Manomètre de contrôle, pompe d’épreuve', 'Test gauge, hand test pump'),
      l('Piquets et cordeau', 'Stakes and string line'),
    ],
    tip: lf(
      'Éprouvez la conduite avant de la recouvrir. Dans le modèle, la pression monte à {peakWL} bar si la cloche à air est noyée ({peak1} bar sinon) : gardez de la marge.',
      'Pressure-test the line before covering it. In the model the pressure reaches {peakWL} bar if the air chamber is water-logged ({peak1} bar otherwise): keep a margin.',
    ),
    warning: l(
      'Un raccord qui lâche sur une conduite à plus de 6 bar projette l’eau avec force. Éprouvez, serrez, puis seulement recouvrez.',
      'A fitting that gives way on a line above 6 bar throws the water out with force. Test it, tighten it, and only then cover it.',
    ),
    duration: '≈ 16 h (est.)',
  },
  {
    id: 'tower',
    title: l('Poser le château d’eau et alimenter la maison', 'Set the water tower and feed the house'),
    text: lf(
      'Posez le **château d’eau** au point haut, à environ {lift} m au-dessus du bélier, et alimentez la **maison** par gravité : l’eau redescend d’elle-même, sous pression et à la demande. Le bélier n’a pas de marche-arrêt : il remplit le château jour et nuit, à environ {perDay} L par jour avec le clapet n°1 (≈ {delivered1} L/min), ce que la vidéo juge suffisant pour le foyer. Donnez au château un trop-plein vers un endroit sans risque, et un couvercle.',
      'Set the **water tower** at the high point, about {lift} m above the ram, and feed the **house** by gravity: the water comes back down by itself, under pressure and on demand. The ram has no on/off switch: it fills the tower day and night, at about {perDay} L a day with the No. 1 valve (≈ {delivered1} L/min), which the video judges enough for the household. Give the tower an overflow to a harmless place, and a lid.',
    ),
    parts: ['water-tower', 'house'],
    tools: [l('Niveau à bulle', 'Spirit level'), l('Raccords de sortie et trop-plein', 'Outlet and overflow fittings')],
    tip: lf(
      'La vidéo ne donne pas le volume du château ; pour de l’eau de boisson, Practical Action juge suffisante la moitié de la production d’un jour (≈ {towerHalfDay} L).',
      'The video does not give the tower’s volume; for drinking water, Practical Action finds half a day’s production enough (≈ {towerHalfDay} L).',
    ),
    warning: l(
      'L’eau d’une source n’est pas garantie potable : faites-la analyser avant de la boire ou de la distribuer à la maison, et protégez le château (couvercle, grillage sur le trop-plein).',
      'Spring water is not guaranteed potable: have it tested before drinking it or distributing it in the house, and protect the tower (lid, screen on the overflow).',
    ),
    duration: '≈ 8 h (est.)',
  },
  {
    id: 'first-start',
    title: l('Démarrer le bélier pour la première fois', 'Start the ram for the first time'),
    text: lf(
      'Ouvrez la vanne de départ et laissez la conduite motrice se remplir, puis ouvrez progressivement la vanne d’arrivée. Si les coups ne s’enchaînent pas, enfoncez le poids du **clapet de choc** à la main, puis relâchez-le (pratique courante ; la vidéo dit seulement qu’il fallait relancer le bélier). Avec le clapet n°1, la vidéo compte 100 à 110 coups par minute. Pas de jet : la conduite de refoulement doit d’abord se remplir (≈ {fillLitres} L, ≈ {fillHours} h, modèle).',
      'Open the gate valve and let the drive pipe fill, then open the inlet valve gradually. If the strokes do not follow one another, press the weight of the **waste valve** down by hand, then let go (common practice; the video only says that the ram had to be restarted). With the No. 1 valve the video counts 100–110 strokes a minute. No jet: the delivery pipe has to fill first (≈ {fillLitres} L, ≈ {fillHours} h, model).',
    ),
    parts: [],
    tools: [
      l('Manomètre côté refoulement', 'Pressure gauge on the delivery side'),
      l('Clé pour le contre-écrou du clapet', 'Spanner for the valve lock nut'),
      l('Chronomètre pour compter les coups', 'Stopwatch to count the strokes'),
      l('Seau gradué au bout de l’évacuation', 'Graduated bucket at the end of the drain'),
    ],
    tip: lf(
      '{perDay} L par jour, c’est ≈ {delivered1} L/min, environ 3 mL par coup : n’attendez pas un jet, mais un filet à peine visible.',
      '{perDay} L a day is ≈ {delivered1} L/min, about 3 mL a stroke: expect a trickle you can hardly see, not a jet.',
    ),
    warning: l(
      'Jamais un doigt dans les lumières du clapet de choc quand le bélier tourne : il se ferme en quelques centièmes de seconde avec plusieurs bars derrière. Enfoncez le poids par le dessus, jamais par les lumières, et gardez le manomètre côté refoulement.',
      'Never put a finger in the ports of the waste valve while the ram is running: it shuts in a few hundredths of a second with several bars behind it. Press the weight from above, never through the ports, and keep the gauge on the delivery side.',
    ),
    duration: '≈ 2 h (est.)',
  },
  {
    id: 'troubleshoot',
    title: l('Surveiller la montée et chercher la panne', 'Watch the rise and look for the fault'),
    text: lf(
      'Le manomètre doit atteindre ≈ {staticBarDelivery} bar quand les {lift} m sont pleins. S’il cale, vérifiez dans l’ordre : la cuve (qui se vide : le cas de la vidéo ; qui reste pleine : crépine de départ ou vanne) ; l’air dans la conduite motrice ; la cloche (noyée, reniflard bouché) ; la course du clapet (trop longue, il boit la cuve ; trop courte, il ne refoule rien) ; l’évacuation des eaux de rejet ; un clapet coincé.',
      'The gauge should reach ≈ {staticBarDelivery} bar once the {lift} m are full. If it stalls, check in this order: the tank (draining: the video’s case; staying full: intake screen or gate valve); air in the drive pipe; the chamber (water-logged, or snifter blocked); the valve stroke (too long, it drinks the tank dry; too short, it delivers nothing); the waste-water drain; a jammed valve.',
    ),
    parts: [],
    tools: [
      l('Manomètre côté refoulement', 'Pressure gauge on the delivery side'),
      l('Chronomètre pour compter les coups', 'Stopwatch to count the strokes'),
    ],
    tip: lf(
      'Surveillez le niveau de la cuve : tant que l’eau n’est montée que de 30 m, le modèle fait prendre ≈ {drive30} L/min au bélier, plus que la source ; elle baisse puis remonte.',
      'Watch the tank level: while the water has only risen 30 m, the model has the ram take ≈ {drive30} L/min, more than the spring; it drops then recovers.',
    ),
    duration: '≈ 2 h (est.)',
  },
];
