// Installation guide of the whole site (wave 3, Data-B). It starts and ends in the `site` world (the guide's default) and
// crosses into the `catchment` world for the spring box and the buffer tank, where `scene: 'catchment'` is set.
// Eleven steps: survey (no part) → spring box, tank, outlet, lid (catchment, 9 parts, each once) → drive pipe, waste
// drain, ram pit, delivery pipe, tower and house (site) → first start (no part). `spring`, `buffer-tank` and the `ram`
// world's parts are not installed here: the farm has the first two, and the ram is built by the assembly guide.
//
// Who says what. S1 = the video (fall 7.5 m, drive pipe ≈ 20 m, lift 65 m, delivery pipe ≈ 300 m, spring 7.5–7.8 L/min,
// valve n°3 ≈ 17 L/min and a tank empty after ≈ 10 h, valve n°1 ≈ 500 L/day at 100–110 strokes/min). The video shows
// neither the catchment nor any fitting of the tank: steps 2–5 and the waste drain give the common practice (Oxfam
// « Spring protection », Practical Action « Hydraulic ram pumps », NC State Extension S4: drive pipe ≥ 5 × the fall,
// delivery pipe half the drive pipe, 1" ram needs 22.7 L/min), named in the text, and the lab's own drawing. Numbers
// that are not reported come from FIG in parts/site.ts (derived or model results, each checked by parts-site.test.ts).
// DURATIONS ARE ROUGH ESTIMATES (no source gives them): the lead and the owner are expected to refine them. The tank
// takes ≈ 12.7 h more to fill (FIG.tankHoursSpring); that waiting time is not counted in the lid step.
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
      'Trois mesures décident de tout. La **chute** : le dénivelé vertical entre le niveau de l’eau de la réserve et l’emplacement du bélier ({fall} m sur le site de la vidéo). La **hauteur de refoulement** : le dénivelé entre le bélier et le point d’arrivée ({lift} m, par une conduite d’environ {deliveryLen} m). Et le **débit de la source**, mesuré à l’étiage au seau et au chronomètre. La vidéo donne une règle approximative : 1 m de chute remonte l’eau d’environ 10 m, quelle que soit la longueur de la conduite ; ici, {lift} m pour {fall} m de chute font 8,7 fois la chute. C’est le débit qui choisit le bélier : le tableau de NC State Extension demande au moins {minFlow1in} L/min d’eau motrice pour un bélier de 1″, alors que la source de la vidéo ne donne que {source} à {sourceHigh} L/min. Et ce que le bélier prend doit rester sous ce que la source donne : ≈ {drive1} L/min avec le clapet n°1 dans le modèle. Les trois mesures donnent aussi l’ordre de grandeur de la production, q = η × Q × h / H (NC State) : avec η = 0,6 et Q = {source} L/min, environ 750 L par jour, quand la vidéo en obtient {perDay}.',
      'Three measurements decide everything. The **fall**: the vertical height difference between the water level in the tank and the ram ({fall} m on the video’s site). The **lift**: the height difference between the ram and the arrival point ({lift} m, through a pipe of about {deliveryLen} m). And the **spring flow**, measured at low water with a bucket and a stopwatch. The video gives a rule of thumb: 1 m of fall lifts water about 10 m, whatever the length of the pipe; here {lift} m for {fall} m of fall is 8.7 times the fall. The flow chooses the ram: the NC State Extension table asks for at least {minFlow1in} L/min of drive water for a 1″ ram, while the video’s spring gives only {source}–{sourceHigh} L/min. And what the ram takes must stay below what the spring gives: ≈ {drive1} L/min with the n°1 valve in the model. The three measurements also give the order of magnitude of the output, q = η × Q × h / H (NC State): with η = 0.6 and Q = {source} L/min, about 750 L a day, where the video gets {perDay}.',
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
      'Mesurez le débit plusieurs fois, y compris en fin d’été : la source de la vidéo est passée de {sourceBefore} L/min à {source}–{sourceHigh} L/min en deux ans, et cette baisse a rendu ingérable même le clapet n°2 envisagé d’abord. Mesurez la chute à la verticale, pas le long du tuyau.',
      'Measure the flow several times, including at the end of summer: the video’s spring went from {sourceBefore} L/min to {source}–{sourceHigh} L/min in two years, and that drop made even the n°2 valve first considered unmanageable. Measure the fall vertically, not along the pipe.',
    ),
    warning: l(
      'En France, prélever l’eau d’une source ou d’un cours d’eau est réglementé (droit d’eau, continuité écologique) : renseignez-vous auprès de la DDT et de l’OFB avant tout travail. Les règles diffèrent d’un pays à l’autre. Et l’eau d’une source n’est pas garantie potable.',
      'In France, taking water from a spring or a stream is regulated (water rights, ecological continuity): check with the DDT and the OFB before any work. Rules differ from one country to another. And spring water is not guaranteed potable.',
    ),
    duration: '2 h',
  },
  {
    id: 'catch-spring',
    scene: 'catchment',
    title: l(
      'Capter la source : regard, filtre à gravier, conduite d’alimentation',
      'Catch the spring: box, gravel filter, feed pipe',
    ),
    text: lf(
      'La vidéo ne montre pas le captage ; ce qui suit est la pratique courante de protection d’une source (fiche Oxfam), à lire comme un principe et non comme un plan. Dégagez l’émergence avec précaution et laissez l’eau s’écouler pendant les travaux : une source gênée peut se déplacer. Couvrez-la du **filtre à gravier**, gradué (dans le dessin du laboratoire, fin près de la roche et gros contre le mur du regard), puis bâtissez le **regard de captage** : une chambre fermée, à sortie basse, avec un petit trop-plein et un bouchon de vidange, dont le pourtour est drainé et clôturé en amont. Reliez-le à la cuve par la **conduite d’alimentation**, en pente continue et sans point haut. Le but est de recueillir sans perte les {source} à {sourceHigh} L/min de la source, à l’abri du ruissellement et des animaux.',
      'The video does not show the catchment; what follows is the common practice of protecting a spring (Oxfam brief), to be read as a principle and not as a plan. Uncover the emergence with care and let the water run during the work: a hindered spring can move. Cover it with the **gravel filter**, graded (in the lab’s drawing, fine near the rock and coarse against the box wall), then build the **spring box**: a closed chamber with a low outlet, a small overflow and a washout plug, its surroundings drained and fenced upslope. Connect it to the tank with the **feed pipe**, on a continuous slope with no high point. The aim is to collect the spring’s {source}–{sourceHigh} L/min without loss, sheltered from run-off and animals.',
    ),
    parts: ['spring-box', 'gravel-filter', 'feed-pipe'],
    tools: [
      l('Pelle et pioche, niveau à bulle', 'Shovel and pick, spirit level'),
      l('Pierres et gravier lavés, gradués', 'Washed stones and gravel, graded'),
      l('Seau gradué et chronomètre pour contrôler le débit', 'Graduated bucket and stopwatch to check the flow'),
    ],
    tip: lf(
      'Mesurez le débit à la sortie du regard puis à l’arrivée dans la cuve : les deux valeurs doivent être égales. Une fuite de 1 L/min, c’est déjà ≈ {lossPct} % de la source.',
      'Measure the flow at the outlet of the box and then where it enters the tank: the two values must be equal. A 1 L/min leak is already ≈ {lossPct}% of the spring.',
    ),
    warning: l(
      'Le captage est l’ouvrage visé par la réglementation (DDT, OFB), et un captage protégé ne rend pas l’eau potable : le gravier et le regard retiennent la terre et les feuilles, pas les microbes.',
      'The catchment is the work the regulations target (DDT, OFB), and a protected catchment does not make the water potable: the gravel and the box hold back soil and leaves, not microbes.',
    ),
    duration: '6 h',
  },
  {
    id: 'set-tank',
    scene: 'catchment',
    title: l('Poser la cuve, son trop-plein et sa vidange', 'Set the tank, its overflow and its drain'),
    text: lf(
      'Posez la **cuve** de la réserve tampon sur une dalle plane et ferme : pleine, elle porte ≈ {tankTonnes} t d’eau. Calez-la pour que la sortie de la conduite motrice soit à {fall} m au-dessus de l’axe d’arrivée du bélier. La vidéo ne donne ni sa forme ni son volume : les {tankL} L du laboratoire sont déduits des dix heures pendant lesquelles elle durait avec le clapet n°3 (déficit de {deficitN3} L/min). Percez la paroi pour le **trop-plein**, au niveau maximal voulu, et pour la **vidange**, au point le plus bas, fermée par une vanne. Le trop-plein rejette l’eau en aval, loin de la cuve et du regard du bélier, et ne porte aucune vanne. La vidéo ne montre ni l’un ni l’autre : c’est la pratique courante.',
      'Set the buffer **tank** on a flat, firm slab: full, it carries ≈ {tankTonnes} t of water. Wedge it so that the outlet of the drive pipe is {fall} m above the inlet axis of the ram. The video gives neither its shape nor its volume: the lab’s {tankL} L is derived from the ten hours it lasted with the n°3 valve (a {deficitN3} L/min deficit). Cut the wall for the **overflow**, at the maximum level you want, and for the **drain**, at the lowest point, closed by a valve. The overflow discharges downstream, away from the tank and the ram pit, and carries no valve. The video shows neither: this is common practice.',
    ),
    parts: ['tank-shell', 'overflow-pipe', 'tank-drain'],
    tools: [
      l('Niveau à eau ou clinomètre', 'Water level or clinometer'),
      l('Scie cloche et raccords de traversée de paroi', 'Hole saw and wall-crossing fittings'),
      l('Vanne à boisseau sphérique pour la vidange', 'Ball valve for the drain'),
    ],
    tip: lf(
      'Une cuve plus grande ne fait que retarder l’arrêt : avec {deficitN3} L/min de déficit, {tankL} L durent {hoursN3} h. Ce qui compte, c’est que le bélier prenne moins que la source : ≈ {drive1} L/min contre {source} L/min avec le clapet n°1.',
      'A bigger tank only delays the stop: with a {deficitN3} L/min deficit, {tankL} L last {hoursN3} h. What counts is that the ram takes less than the spring gives: ≈ {drive1} L/min against {source} L/min with the n°1 valve.',
    ),
    warning: lf(
      'Pas de vanne sur le trop-plein, et la vanne de vidange toujours refermée après usage : une cuve qui fuit par la vidange se vide comme si le bélier prenait trop. Sur un sol mou, une cuve de ≈ {tankTonnes} t finit par pencher.',
      'No valve on the overflow, and the drain valve always closed again after use: a tank that leaks through its drain empties as if the ram took too much. On soft ground, a ≈ {tankTonnes} t tank ends up leaning.',
    ),
    duration: '6 h',
  },
  {
    id: 'fit-outlet',
    scene: 'catchment',
    title: l('Équiper le départ : crépine et vanne', 'Fit the outlet: screen and gate valve'),
    text: lf(
      'Au bas de la cuve, fixez la **crépine de départ** sur l’entrée de la conduite motrice, au-dessus du fond pour ne pas aspirer la boue (' +
        mm(TANK.outletAboveFloor).fr +
        ' mm dans le dessin, estimation), puis montez à la sortie la **vanne de départ**, à opercule et de même passage que la conduite (1″). La crépine retient les débris qui iraient se coincer sous le clapet de choc ; c’est son immersion permanente qui garde l’air hors de la conduite motrice. La vanne permet d’arrêter le bélier et d’intervenir sur la conduite sans vider les {tankL} L de la cuve. La vidéo ne montre ni l’une ni l’autre : c’est la pratique courante (Practical Action pour la crépine, Oxfam pour la vanne).',
      'At the bottom of the tank, fix the **intake screen** on the inlet of the drive pipe, above the floor so as not to draw the mud (' +
        mm(TANK.outletAboveFloor).en +
        ' mm in the drawing, estimate), then fit at the outlet the **gate valve**, with the same bore as the pipe (1″). The screen holds back the debris that would jam under the waste valve; it is its permanent immersion that keeps air out of the drive pipe. The valve lets you stop the ram and work on the pipe without emptying the tank’s {tankL} L. The video shows neither: this is common practice (Practical Action for the screen, Oxfam for the valve).',
    ),
    parts: ['intake-screen', 'drive-gate-valve'],
    tools: [
      l('Clés pour raccords, pâte ou ruban d’étanchéité', 'Wrenches for fittings, sealing paste or tape'),
      l('Brosse pour la crépine', 'Brush for the screen'),
    ],
    tip: l(
      'Gardez la vanne fermée tant que la conduite motrice n’est pas posée et ancrée, puis ouvrez-la lentement. En marche elle reste ouverte à fond : on ne règle pas le débit avec elle.',
      'Keep the valve closed until the drive pipe is laid and anchored, then open it slowly. When running it stays fully open: the flow is not adjusted with it.',
    ),
    warning: l(
      'De l’air dans la conduite motrice arrête le bélier (dans le modèle, c’est ce qui arrive quand la cuve se vide, le cas du clapet n°3 de la vidéo) : la crépine doit rester sous l’eau, même cuve presque vide.',
      'Air in the drive pipe stops the ram (in the model that is what happens when the tank empties, the video’s n°3 valve case): the screen must stay under water, even with the tank nearly empty.',
    ),
    duration: '2 h',
  },
  {
    id: 'fill-and-close',
    scene: 'catchment',
    title: l('Remplir, contrôler, fermer la cuve', 'Fill, check and close the tank'),
    text: lf(
      'Laissez la source remplir la cuve, vanne de départ fermée : il faut ≈ {tankHoursSpring} h à {source} L/min pour {tankL} L (dérivé). Pendant ce temps, vérifiez que le trop-plein coule au niveau voulu sans que l’eau monte plus haut, et cherchez les fuites au pied et à la vidange. Quand tout est sec et net, posez le **couvercle**, dont l’**aération** reste ouverte mais grillagée : la cuve est fermée à la lumière, aux feuilles et aux animaux, sans se mettre en dépression quand elle se vide. La vidéo ne montre ni le couvercle ni l’aération.',
      'Let the spring fill the tank, gate valve closed: it takes ≈ {tankHoursSpring} h at {source} L/min for {tankL} L (derived). Meanwhile check that the overflow runs at the level you want without the water rising higher, and look for leaks at the foot and at the drain. When everything is dry and clean, put on the **lid**, whose **vent** stays open but screened: the tank is closed against light, leaves and animals, without going under vacuum as it empties. The video shows neither the lid nor the vent.',
    ),
    parts: ['tank-lid'],
    tools: [
      l('Seau gradué pour contrôler le débit du trop-plein', 'Graduated bucket to check the overflow flow'),
      l('Grillage fin anti-insectes pour l’aération', 'Fine insect screen for the vent'),
    ],
    tip: lf(
      'Cuve pleine et vanne de départ fermée, le trop-plein doit couler de tout le débit de la source ({source} à {sourceHigh} L/min). S’il coule moins, il y a une fuite, ou le débit a baissé.',
      'With the tank full and the gate valve closed, the overflow must run at the whole spring flow ({source}–{sourceHigh} L/min). If it runs less, there is a leak, or the flow has dropped.',
    ),
    warning: l(
      'L’eau stockée n’est pas garantie potable et le couvercle la protège sans la traiter : ne la goûtez pas, faites-la analyser avant tout usage alimentaire.',
      'The stored water is not guaranteed potable and the lid protects it without treating it: do not taste it, have it tested before any use for drinking.',
    ),
    duration: '1 h',
  },
  {
    id: 'drive-pipe',
    title: l('Poser la conduite motrice', 'Lay the drive pipe'),
    text: lf(
      'Posez la **conduite motrice** de la vanne de départ au bélier : rigide, droite, d’un diamètre égal à celui du bélier (1″ pour un bélier de 1″). Sur le site de la vidéo elle mesure environ {driveLen} m pour {fall} m de chute. Sa longueur compte : NC State demande au moins 5 fois la chute, Practical Action 3 à 7 fois ; {driveLen} m pour {fall} m font 2,7 fois, ce qui est court (le simulateur allume une alerte sous 2,5 fois). Plus la conduite est longue, plus il y a d’eau en mouvement et donc d’élan à chaque coup. Descendez-la en pente continue, sans point haut où l’air s’accumulerait, et ancrez-la, surtout aux coudes et près du bélier : à chaque coup, l’eau de la conduite (≈ {driveLitres} L) s’arrête net et pousse plusieurs bars sur les parois.',
      'Lay the **drive pipe** from the gate valve to the ram: rigid, straight, with the same diameter as the ram (1″ for a 1″ ram). On the video’s site it is about {driveLen} m long for {fall} m of fall. Its length matters: NC State asks for at least 5 times the fall, Practical Action 3 to 7 times; {driveLen} m for {fall} m is 2.7 times, which is short (the simulator raises an alert below 2.5 times). The longer the pipe, the more water in motion and so the more momentum at every stroke. Run it down on a continuous slope, with no high point where air could collect, and anchor it, especially at the bends and near the ram: at every stroke the water in the pipe (≈ {driveLitres} L) stops dead and pushes several bar on the walls.',
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
    warning: lf(
      'Conduite motrice rigide : acier ou fonte. Les conduites en plastique sont déconseillées, car la paroi qui se déforme à chaque coup absorbe une partie de l’énergie du choc. Le choc atteint plusieurs bars (≈ {peak1} bar dans le modèle avec le clapet n°1) : aucun raccord collé ou fatigué.',
      'Rigid drive pipe: steel or cast iron. Plastic pipes are discouraged, because a wall that flexes at every stroke soaks up part of the energy of the shock. The shock reaches several bar (≈ {peak1} bar in the model with the n°1 valve): no glued or tired fittings.',
    ),
    duration: '6 h',
  },
  {
    id: 'waste-drain',
    title: l('Tracer l’évacuation des eaux de rejet', 'Lay the waste-water drain'),
    text: lf(
      'Avant de poser le regard, tracez l’**évacuation des eaux de rejet**, un tuyau ou un fossé qui part du fond du futur regard et descend jusqu’à un exutoire sans retour possible. Elle emportera en continu presque toute l’eau motrice, ≈ {waste1} L/min sur ≈ {drive1} L/min avec le clapet n°1 (modèle), soit ≈ {wasteDay1} m³ par jour, et NC State précise que cet excédent doit être drainé. Donnez-lui une pente continue vers l’aval, une sortie libre à l’air au-dessus des plus hautes eaux du ruisseau ou du fossé qui la reçoit, et un exutoire qui n’érode pas le talus. La vidéo ne montre pas cette évacuation.',
      'Before building the pit, lay the **waste-water drain**, a pipe or a ditch that starts at the floor of the future pit and runs down to an outfall the water cannot come back from. It will carry away continuously almost all the drive water, ≈ {waste1} L/min out of ≈ {drive1} L/min with the n°1 valve (model), that is ≈ {wasteDay1} m³ a day, and NC State points out that this excess must be drained. Give it a continuous downhill slope, a free outlet in the open air above the highest water of the stream or ditch that receives it, and an outfall that does not erode the slope. The video does not show this drain.',
    ),
    parts: ['waste-drain'],
    tools: [
      l('Pelle, niveau à eau ou clinomètre', 'Shovel, water level or clinometer'),
      l('Tuyau de drainage PVC ou pierres pour le fossé', 'PVC drain pipe or stones for the ditch'),
      l('Enrochement pour protéger la sortie', 'Rock lining to protect the outlet'),
    ],
    tip: l(
      'Contrôlez la pente avant de reboucher, en versant un seau d’eau : elle doit s’écouler seule, sans flaque. Le fond du regard doit rester plus haut que la sortie.',
      'Check the slope before backfilling by pouring a bucket of water: it must run off on its own, with no puddle. The floor of the pit must stay higher than the outlet.',
    ),
    warning: l(
      'Si l’eau remonte dans le regard, elle noie le clapet de choc et le bélier s’arrête (Practical Action le dit de certains béliers) : une évacuation trop plate, bouchée ou noyée par une crue est la panne à éviter.',
      'If the water rises in the pit it drowns the waste valve and the ram stops (Practical Action says so of some rams): a drain that is too flat, blocked or drowned by a flood is the failure to avoid.',
    ),
    duration: '3 h',
  },
  {
    id: 'ram-pit',
    title: l('Installer le regard et le bélier', 'Set the pit and the ram'),
    text: lf(
      'Bâtissez le **regard** autour du massif d’ancrage, son fond au-dessus de la sortie de l’évacuation, puis posez le bélier dessus et boulonnez-le : il frappe environ cent fois par minute (100 à 110 coups/min avec le clapet n°1 de la vidéo) et bougerait sinon ; Practical Action demande une fondation en béton. Le regard protège la machine et garde l’accès au clapet, au manomètre et aux vannes. Raccordez ensuite la conduite motrice à la vanne d’arrivée du bélier et la conduite de refoulement à sa vanne de sortie, le manomètre restant côté refoulement. Le bélier lui-même se monte avec le guide de montage ; sa construction n’est pas montrée dans la vidéo, les dimensions du regard sont des estimations.',
      'Build the **pit** around the anchor block, its floor above the outlet of the drain, then set the ram on it and bolt it down: it strikes about a hundred times a minute (100–110 strokes/min with the video’s n°1 valve) and would move otherwise; Practical Action asks for a concrete foundation. The pit protects the machine and keeps the waste valve, the gauge and the valves within reach. Then connect the drive pipe to the ram’s inlet valve and the delivery pipe to its outlet valve, the gauge staying on the delivery side. The ram itself is put together with the assembly guide; its construction is not shown in the video, and the pit’s dimensions are estimates.',
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
      'Le regard est un endroit où l’on glisse et où le bélier cogne : ancrez la machine avant de la raccorder, et gardez les doigts hors du clapet de choc dès que l’eau arrive.',
      'The pit is a place where you slip and where the ram thumps: anchor the machine before connecting it, and keep your fingers out of the waste valve as soon as the water arrives.',
    ),
    duration: '5 h',
  },
  {
    id: 'delivery-pipe',
    title: l('Monter la conduite de refoulement', 'Run the delivery pipe up'),
    text: lf(
      'Raccordez la **conduite de refoulement** à la sortie du bélier et montez-la jusqu’au point d’arrivée : environ {deliveryLen} m de long pour {lift} m de dénivelé sur le site de la vidéo. Son diamètre vaut à peu près la moitié de celui de la conduite motrice (½″ pour un bélier de 1″, selon NC State) et ne doit jamais descendre sous la valeur du fabricant ; sa longueur compte peu, car les frottements sont faibles à ces débits (ici ≈ {delivered1} L/min). Le simulateur la suppose en polyéthylène. Au bélier, {lift} m de colonne d’eau font environ {staticBarDelivery} bar à l’arrêt : choisissez un tuyau et des raccords dont la pression de service est nettement au-dessus. Prévoyez une vanne près du bélier (Practical Action), pour ne pas vider la conduite quand on l’arrête.',
      'Connect the **delivery pipe** to the ram outlet and run it up to the arrival point: about {deliveryLen} m long for {lift} m of climb on the video’s site. Its diameter is about half that of the drive pipe (½″ for a 1″ ram, according to NC State) and must never go below the maker’s figure; its length matters little, because friction is low at these flows (here ≈ {delivered1} L/min). The simulator assumes polyethylene. At the ram, {lift} m of water column is about {staticBarDelivery} bar at rest: choose a pipe and fittings whose working pressure is clearly above that. Plan a valve near the ram (Practical Action), so that the pipe need not be drained when the ram is stopped.',
    ),
    parts: ['delivery-pipe'],
    tools: [
      l('Coupe-tube, raccords adaptés à la pression', 'Pipe cutter, pressure-rated fittings'),
      l('Manomètre de contrôle, pompe d’épreuve', 'Test gauge, hand test pump'),
      l('Piquets et cordeau', 'Stakes and string line'),
    ],
    tip: lf(
      'Éprouvez la conduite avant de la recouvrir. Dans le modèle, la pression monte à {peakWL} bar si la cloche à air est noyée ({peak1} bar sinon) : gardez de la marge au-dessus de {staticBarDelivery} bar.',
      'Pressure-test the line before covering it. In the model the pressure reaches {peakWL} bar if the air chamber is water-logged ({peak1} bar otherwise): keep a margin above {staticBarDelivery} bar.',
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
    text: lf(
      'Posez le **château d’eau** au point haut, à environ {lift} m au-dessus du bélier, et alimentez la **maison** par gravité : l’eau redescend d’elle-même, avec de la pression et à la demande, ce qui est tout l’intérêt de la remontée. Le bélier n’a pas de marche-arrêt : il remplit le château jour et nuit, à environ {perDay} L par jour avec le clapet n°1 (≈ {delivered1} L/min), ce que la vidéo juge suffisant pour le foyer. Donnez au château un trop-plein qui renvoie le surplus vers un endroit sans risque, et un couvercle.',
      'Set the **water tower** at the high point, about {lift} m above the ram, and feed the **house** by gravity: the water comes back down by itself, under pressure and on demand, which is the whole point of lifting it. The ram has no on/off switch: it fills the tower day and night, at about {perDay} L a day with the n°1 valve (≈ {delivered1} L/min), which the video judges enough for the household. Give the tower an overflow that sends the surplus somewhere harmless, and a lid.',
    ),
    parts: ['water-tower', 'house'],
    tools: [l('Niveau à bulle', 'Spirit level'), l('Raccords de sortie et trop-plein', 'Outlet and overflow fittings')],
    tip: lf(
      'À {perDay} L par jour, le château se remplit lentement : sa taille décide combien de jours il tient si le bélier s’arrête. La vidéo ne donne pas son volume ; pour de l’eau de boisson, Practical Action juge suffisante la moitié de la production d’un jour (≈ {towerHalfDay} L).',
      'At {perDay} L a day the tower fills slowly: its size decides how many days it lasts if the ram stops. The video does not give its volume; for drinking water, Practical Action finds half a day’s production enough (≈ {towerHalfDay} L).',
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
    text: lf(
      'Ouvrez la vanne de départ et laissez la conduite motrice se remplir en chassant l’air par le bélier, puis ouvrez progressivement la vanne d’arrivée. Si les coups ne s’enchaînent pas, enfoncez le poids du **clapet de choc** à la main, puis relâchez-le (la vidéo dit seulement qu’il fallait aller remettre le bélier en marche ; le geste est la pratique courante). Écoutez : avec le clapet n°1, la vidéo compte 100 à 110 coups par minute, presque deux par seconde (l’ancien clapet en faisait 70 à 80). Ne cherchez pas de jet : {perDay} L par jour, c’est ≈ {delivered1} L/min, environ 3 mL par coup, et la conduite de refoulement doit d’abord se remplir : ≈ {fillLitres} L, soit ≈ {fillHours} h au débit final (modèle ; plus bas dans la pente le débit est plus fort, ≈ {delivered30} L/min à 30 m, donc la durée réelle est plutôt plus courte). Le manomètre côté refoulement lit la hauteur déjà montée (1 bar ≈ 10 m) et doit atteindre ≈ {staticBarDelivery} bar quand les {lift} m sont pleins. Surveillez le niveau de la cuve : tant que l’eau n’est montée que de 30 m, le modèle fait prendre au bélier ≈ {drive30} L/min, plus que la source ({source} L/min), puis ≈ {drive1} L/min à {lift} m ; la cuve baisse un peu puis remonte, et si elle continue de baisser une fois la conduite pleine, c’est le cas de la vidéo.',
      'Open the gate valve and let the drive pipe fill, driving the air out through the ram, then open the inlet valve gradually. If the strokes do not follow one another, press the weight of the **waste valve** down by hand, then let go (the video only says that someone had to go and restart the ram; the gesture is common practice). Listen: with the n°1 valve the video counts 100–110 strokes a minute, almost two a second (the old valve made 70–80). Do not expect a jet: {perDay} L a day is ≈ {delivered1} L/min, about 3 mL per stroke, and the delivery pipe has to fill first: ≈ {fillLitres} L, that is ≈ {fillHours} h at the final rate (model; lower down the slope the flow is stronger, ≈ {delivered30} L/min at 30 m, so the real time is probably shorter). The gauge on the delivery side reads the height already lifted (1 bar ≈ 10 m) and should reach ≈ {staticBarDelivery} bar once the {lift} m are full. Watch the tank level: while the water has only been lifted 30 m, the model has the ram take ≈ {drive30} L/min, more than the spring ({source} L/min), then ≈ {drive1} L/min at {lift} m; the tank drops a little then rises again, and if it keeps falling once the pipe is full, it is the video’s case.',
    ),
    parts: [],
    tools: [
      l('Manomètre côté refoulement', 'Pressure gauge on the delivery side'),
      l('Clé pour le contre-écrou du clapet', 'Spanner for the valve lock nut'),
      l('Chronomètre pour compter les coups', 'Stopwatch to count the strokes'),
      l('Seau gradué au bout de l’évacuation', 'Graduated bucket at the end of the drain'),
    ],
    tip: l(
      'S’il cale, vérifiez dans cet ordre : le niveau de la cuve (vide, c’est le cas de la vidéo ; pleine avec un trop-plein qui coule, soupçonnez la crépine ou la vanne de départ) ; l’air dans la conduite motrice ; la cloche à air (noyée, ou reniflard bouché) ; la course du clapet (trop longue, le bélier boit la cuve ; trop courte, il frappe sans rien refouler) ; l’évacuation des eaux de rejet, qui noie le clapet si elle est bouchée ; puis un clapet qui coince ou qui ne porte pas bien sur sa portée.',
      'If it stalls, check in this order: the tank level (empty, it is the video’s case; full with the overflow running, suspect the screen or the gate valve); air in the drive pipe; the air chamber (water-logged, or snifter blocked); the stroke of the valve (too long, the ram drinks the tank dry; too short, it strikes and delivers nothing); the waste-water drain, which drowns the valve if blocked; then a valve that jams or does not seat properly.',
    ),
    warning: l(
      'Jamais un doigt dans les lumières du clapet de choc quand le bélier tourne : il se ferme en quelques centièmes de seconde avec plusieurs bars derrière. Enfoncez le poids par le dessus, jamais par les lumières, et gardez le manomètre côté refoulement.',
      'Never put a finger in the ports of the waste valve while the ram is running: it shuts in a few hundredths of a second with several bar behind it. Press the weight from above, never through the ports, and keep the gauge on the delivery side.',
    ),
    duration: '4 h',
  },
];
