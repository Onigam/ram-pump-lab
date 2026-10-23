// Parts catalogue: every selectable 3D object of the two worlds, ids frozen in docs/research.md §4.
//   site (7)  : spring, buffer-tank, drive-pipe, ram-pit, delivery-pipe, water-tower, house
//   ram  (18) : ram, inlet-valve, waste-valve, valve-seat, valve-stem, valve-guide, stroke-nut, lock-nut,
//               counterweight, valve-fins, base-plate, delivery-valve, air-chamber, snifter, gauge, outlet-valve,
//               drain-valve, strainer
//
// Status of the figures (the same words as docs/physics.md). A figure with no tag is REPORTED by a source: the video
// S1 (with its timestamp in `video`) or the NC State table S4. Tagged figures are not reported:
//   « dérivé / derived »                   computed from reported figures;
//   « résultat du modèle / model result »  an output of the simulation;
//   « calibré / calibrated »               a setting chosen so that the model retrieves the video's figures;
//   « hypothèse / assumption »             a model constant the sources are silent on;
//   « estimation / estimate »              a dimension of the 3D model (src/three/dims.ts) that no source gives.
// The lab shows a GENERIC 1" ram, not the Walton n°3 of the video (no maker data found): only the waste valve follows
// the video. Video facts are those of S1 (L'énergie partout); textbook facts (S4 NC State, S6 Wikipedia) are
// named in the text. Nothing here is copied from the private transcript.

import type { L } from '@onigam/lab-kit/i18n';
import type { PartInfo, Spec } from '@onigam/lab-kit/content';
import { l } from '@onigam/lab-kit/i18n';
import { POLYTROPIC, SNIFTER_CRACK, SNIFTER_DIAMETER, VALVES, WAVE_SPEED } from '../sim/physics';
import { RANGES, VALVE_SETTINGS } from '../sim/presets';
import {
  CHAMBER,
  CHECK_VALVE,
  FITTINGS,
  HOUSE,
  INLET,
  PIT,
  RAM,
  SITE as SITE_DIMS,
  SPRING,
  TANK,
  TOWER,
  VALVE,
} from '../three/dims';
import { mm, mmBox, nEn, nEnTrim, nFr, nFrTrim, round } from './units';

/** English form of a number written the French way (7,5 -> 7.5 ; 5 700 -> 5,700 ; 40 % -> 40%). */
function enNum(fr: string): string {
  return fr
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/(\d) (\d{3})(?!\d)/g, '$1,$2')
    .replace(/(\d) %/g, '$1%');
}

/** Plain value written the French way: derive the English form when it differs. */
function num(fr: string): L | string {
  const en = enNum(fr);
  return en === fr ? fr : l(fr, en);
}

/** Spec row with a bilingual label and a plain (auto-localised) or bilingual value. */
function sp(fr: string, en: string, value: string | L): Spec {
  return { label: l(fr, en), value: typeof value === 'string' ? num(value) : value };
}

type Status = 'derived' | 'model' | 'calibrated' | 'assumed' | 'estimate';

const TAG: Record<Status, readonly [string, string]> = {
  derived: ['dérivé', 'derived'],
  model: ['résultat du modèle', 'model result'],
  calibrated: ['calibré sur la vidéo', 'calibrated on the video'],
  assumed: ['hypothèse du modèle', 'model assumption'],
  estimate: ['estimation', 'estimate'],
};

/** A value that is not reported by a source, tagged in both languages. `en` defaults to the converted `fr`. */
function tagged(status: Status, fr: string, en?: string): L {
  const [tf, te] = TAG[status];
  return l(`${fr} (${tf})`, `${en ?? enNum(fr)} (${te})`);
}

/** Lengths in metres from dims.ts shown as "a × b mm"; `status` tags them unless they are reported (null). */
function lenMm(status: Status | null, ...metres: number[]): L {
  const b = mmBox(...metres);
  return status ? tagged(status, `${b.fr} mm`, `${b.en} mm`) : l(`${b.fr} mm`, `${b.en} mm`);
}

/** A length in metres from dims.ts shown in metres, tagged. */
function lenM(status: Status | null, ...metres: number[]): L {
  const fr = metres.map((x) => nFrTrim(x)).join(' × ');
  const en = metres.map((x) => nEnTrim(x)).join(' × ');
  return status ? tagged(status, `${fr} m`, `${en} m`) : l(`${fr} m`, `${en} m`);
}

/** "Ø d × h m" for a round tank from dims.ts, tagged. */
function diaH(status: Status | null, diameter: number, height: number): L {
  const fr = `Ø ${nFrTrim(diameter)} m × ${nFrTrim(height)} m`;
  const en = `Ø ${nEnTrim(diameter)} m × ${nEnTrim(height)} m`;
  return status ? tagged(status, fr, en) : l(fr, en);
}

// ---------------------------------------------------------------------------
// Site world
// ---------------------------------------------------------------------------

/** Volume of the delivery pipe and time to fill it at the video's delivery rate (derived from dims.ts and K10). */
const DELIVERY_FILL = (() => {
  const litres = (Math.PI / 4) * SITE_DIMS.deliveryBore ** 2 * SITE_DIMS.deliveryLength * 1000;
  const lpm = 500 / (24 * 60); // K10: 500 L/day
  return { litres: round(litres, -1), hours: round(litres / lpm / 60) };
})();

const SITE_PARTS: PartInfo[] = [
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

// ---------------------------------------------------------------------------
// Ram world
// ---------------------------------------------------------------------------

const STROKE = VALVE_SETTINGS[1].stroke; // mm, calibrated on K10 / K11
const WEIGHT = VALVE_SETTINGS[1].counterweight; // g, calibrated on K10 / K11
const GUIDE_LENGTH = VALVE.guideTop - VALVE.guideTubeBottom; // m, derived from two estimated heights

const RAM_PARTS: PartInfo[] = [
  {
    id: 'ram',
    scene: 'ram',
    category: 'hydraulic',
    name: l('Corps du bélier', 'Ram body'),
    short: l(
      'Corps coulé qui reçoit l’eau motrice et porte le clapet de choc, le clapet de refoulement et la cloche.',
      'Cast body that receives the drive water and carries the waste valve, the delivery check valve and the chamber.',
    ),
    description: l(
      'Le corps est la chambre où arrive l’eau de la conduite motrice : elle s’échappe par le clapet de choc tant qu’il est ouvert, et reçoit le coup quand il claque. Il porte la platine du clapet de choc, le clapet de refoulement avec la cloche à air, le reniflard et les vannes. Le laboratoire montre un bélier générique de 1″ et non le Walton n°3 de la vidéo, fabriqué à Bordeaux : aucune fiche du constructeur n’a été trouvée, donc les dimensions du corps sont des estimations. Seul le clapet de choc suit la vidéo. Le principe est attribué à Joseph de Montgolfier, à la fin du XVIIIe siècle.',
      'The body is the chamber where the drive pipe water arrives: it escapes through the waste valve while that is open, and takes the hammer when it slams. It carries the waste valve plate, the delivery check valve with the air chamber, the snifter and the valves. The lab shows a generic 1″ ram and not the video’s Walton n°3, made in Bordeaux: no maker data sheet was found, so the body dimensions are estimates. Only the waste valve follows the video. The principle is credited to Joseph de Montgolfier, in the late eighteenth century.',
    ),
    material: l('Fonte (estimation, aucune fiche du constructeur)', 'Cast iron (estimate, no maker data sheet)'),
    specs: [
      sp(
        'Classe',
        'Class',
        l(
          `1″, conduite motrice de ${mm(SITE_DIMS.driveBore).fr} mm intérieur (hypothèse du modèle)`,
          `1″, drive pipe of ${mm(SITE_DIMS.driveBore).en} mm inner diameter (model assumption)`,
        ),
      ),
      sp(
        'Corps (tube coulé)',
        'Body (cast tube)',
        tagged(
          'estimate',
          `Ø ${mm(RAM.bodyOuterRadius * 2).fr} extérieur, Ø ${mm(RAM.bodyInnerRadius * 2).fr} intérieur, ${mm(RAM.bodyLength).fr} mm de long`,
          `Ø ${mm(RAM.bodyOuterRadius * 2).en} outer, Ø ${mm(RAM.bodyInnerRadius * 2).en} inner, ${mm(RAM.bodyLength).en} mm long`,
        ),
      ),
      sp(
        'Brides d’extrémité',
        'End flanges',
        tagged(
          'estimate',
          `Ø ${mm(RAM.flangeDiameter).fr} × ${mm(RAM.flangeThickness).fr} mm, 4 boulons`,
          `Ø ${mm(RAM.flangeDiameter).en} × ${mm(RAM.flangeThickness).en} mm, 4 bolts`,
        ),
      ),
      sp(
        'Débit moteur mini (NC State)',
        'Minimum drive flow (NC State)',
        l('22,7 L/min pour un bélier de 1″', '22.7 L/min for a 1″ ram'),
      ),
      sp(
        'Refoulement maxi (NC State)',
        'Maximum delivery (NC State)',
        l('7,6 m³/jour pour un bélier de 1″', '7.6 m³/day for a 1″ ram'),
      ),
      sp('Walton n°3 de la vidéo', 'Video’s Walton n°3', l('Fiche non trouvée', 'Data sheet not found')),
    ],
    maintenance: l(
      'Le corps reçoit une centaine de coups par minute : contrôlez le serrage de la platine et des brides, et les fuites aux joints, à chaque visite.',
      'The body takes about a hundred strokes a minute: check the tightness of the plate and flanges, and look for leaks at the joints, on every visit.',
    ),
    tip: l(
      'Un bélier de 1″ attend plus d’eau que la source de la vidéo n’en donne (22,7 L/min contre 7,5). La vidéo comble l’écart en réduisant la consommation du clapet, pas en changeant de bélier.',
      'A 1″ ram expects more water than the video’s spring gives (22.7 L/min against 7.5). The video closes the gap by cutting the valve’s consumption, not by changing the ram.',
    ),
    video: ['01:40', '03:02'],
    design: l(
      'Le corps a trois ouvertures : l’arrivée (conduite motrice), la sortie de l’eau perdue (clapet de choc) et la sortie utile vers la cloche (clapet de refoulement). Tout le reste du bélier en découle.',
      'The body has three openings: the inlet (drive pipe), the exit for the lost water (waste valve) and the useful exit to the chamber (delivery check valve). Everything else on the ram follows from them.',
    ),
  },
  {
    id: 'inlet-valve',
    scene: 'ram',
    category: 'hydraulic',
    name: l('Vanne d’arrivée (V1)', 'Inlet valve (V1)'),
    short: l(
      'Vanne qui coupe l’eau motrice pour arrêter le bélier ou le démonter.',
      'Valve that cuts the drive water to stop the ram or take it apart.',
    ),
    description: l(
      'La vanne d’arrivée est posée sur la conduite motrice, juste avant le bélier. Elle sert à l’arrêter, à régler sa mise en route (on l’ouvre progressivement) et à le démonter sans vider la réserve. Le modèle compte son passage, celui de la crépine et les coudes dans un coefficient de pertes K = 3. Elle n’est pas montrée dans la vidéo : c’est une pièce courante d’un bélier de 1″.',
      'The inlet valve sits on the drive pipe, just before the ram. It stops the ram, sets its start-up (it is opened gradually) and lets you take it apart without emptying the tank. The model counts its passage, the strainer’s and the bends in a loss coefficient K = 3. It is not shown in the video: it is a usual part of a 1″ ram.',
    ),
    material: l('Laiton, à brides (estimation)', 'Brass, flanged (estimate)'),
    specs: [
      sp('Taille', 'Size', l('DN25 (1″), comme la conduite motrice', 'DN25 (1″), like the drive pipe')),
      sp('Longueur', 'Length', lenMm('estimate', INLET.valveLength)),
      sp(
        'Brides',
        'Flanges',
        tagged(
          'estimate',
          `Ø ${mm(INLET.flangeDiameter).fr} × ${mm(INLET.flangeThickness).fr} mm`,
          `Ø ${mm(INLET.flangeDiameter).en} × ${mm(INLET.flangeThickness).en} mm`,
        ),
      ),
      sp(
        'Pertes de l’arrivée (K total)',
        'Inlet losses (total K)',
        tagged('assumed', 'K = 3, avec crépine et coudes', 'K = 3, with strainer and bends'),
      ),
    ],
    maintenance: l(
      'Manœuvrez-la une fois par an pour qu’elle ne se grippe pas, et resserrez ses brides si elle suinte.',
      'Operate it once a year so that it does not seize, and retighten its flanges if it weeps.',
    ),
    tip: l(
      'Fermez-la avant toute intervention sur le clapet de choc : elle arrête le bélier sans vider la réserve.',
      'Close it before any work on the waste valve: it stops the ram without emptying the tank.',
    ),
    design: l(
      'À passage intégral pour ne pas freiner la colonne d’eau : tout ce que la vanne retient en charge est de l’élan perdu pour le coup.',
      'Full-bore so as not to hold back the water column: whatever head the valve takes is momentum lost to the stroke.',
    ),
  },
  {
    id: 'waste-valve',
    scene: 'ram',
    category: 'hydraulic',
    name: l('Clapet de choc', 'Waste (impulse) valve'),
    short: l(
      'Le clapet qui claque : il stoppe la colonne d’eau et crée le coup de bélier ; ici fait de pièces de plomberie.',
      'The valve that slams: it stops the water column and makes the water hammer; here built from plumbing parts.',
    ),
    description: l(
      'Le clapet de choc est le cœur du bélier. Ouvert au repos, il laisse l’eau de la conduite motrice s’échapper et accélérer ; quand le courant est assez rapide, il pousse la tête du clapet contre sa portée, qui se ferme d’un coup (en 18 ms environ dans le modèle). La colonne d’eau stoppée fait monter la pression et pousse une petite part de l’eau vers la cloche ; le recul rouvre ensuite le clapet et le cycle recommence. Dans la vidéo, l’auteur remplace le clapet du Walton n°3 par un clapet n°1 fait de raccords de plomberie standard, presque sans usinage : la cadence passe de 70–80 à 100–110 coups/min, le bélier ne s’arrête plus et refoule environ 500 L par jour.',
      'The waste valve is the heart of the ram. Open at rest, it lets the drive pipe water escape and accelerate; once the flow is fast enough it pushes the valve head onto its seat, which shuts in one go (in about 18 ms in the model). The stopped water column raises the pressure and pushes a small share of the water toward the chamber; the recoil then reopens the valve and the cycle starts again. In the video the author replaces the Walton n°3’s valve with a n°1 valve built from standard plumbing parts, with almost no machining: the rate goes from 70–80 to 100–110 strokes/min, the ram no longer stops and delivers about 500 L a day.',
    ),
    material: l(
      'Raccords de plomberie standard (matière non précisée), tige inox et acier',
      'Standard plumbing fittings (material not stated), stainless and steel stem',
    ),
    specs: [
      sp(
        'Tailles de clapet',
        'Valve sizes',
        l(
          'n°1 : 15×21 (½″) · n°2 : 20×27 (¾″) · n°3 : 26×34 (1″)',
          'n°1: 15×21 (½″) · n°2: 20×27 (¾″) · n°3: 26×34 (1″)',
        ),
      ),
      sp(
        'Corps du clapet',
        'Valve body',
        l(
          'Raccords 26×34, réduction 15×21, raccord mâle 15×21 fileté sur 7 à 8 cm',
          '26×34 fittings, 15×21 reducer, 15×21 male fitting threaded over 7–8 cm',
        ),
      ),
      sp(
        'Lumières d’échappement (3D)',
        'Exhaust ports (3D)',
        tagged(
          'estimate',
          `${VALVE.portCount} × ${mm(VALVE.portWidth).fr} × ${mm(VALVE.portHeight).fr} mm`,
          `${VALVE.portCount} × ${mm(VALVE.portWidth).en} × ${mm(VALVE.portHeight).en} mm`,
        ),
      ),
      sp('Hauteur au-dessus de la platine', 'Height above the plate', lenMm('estimate', VALVE.guideTop)),
      sp(
        'Cadence',
        'Stroke rate',
        l('100 à 110 coups/min (vidéo) ; 109 dans le modèle', '100–110 strokes/min (video); 109 in the model'),
      ),
      sp(
        'Course et poids du n°1',
        'Stroke and weight of the n°1',
        tagged('calibrated', `${nFr(STROKE, 1)} mm, ${nFr(WEIGHT)} g`, `${nEn(STROKE, 1)} mm, ${nEn(WEIGHT)} g`),
      ),
      sp('Consommation du n°1', 'Consumption of the n°1', tagged('model', '≈ 6,7 L/min')),
      sp('Refoulé', 'Delivered', l('≈ 500 L/jour', '≈ 500 L/day')),
    ],
    maintenance: l(
      'Surveillez trois choses : la portée (un suintement qui grossit), la liberté de la tige dans le guide, et le serrage du contre-écrou. La portée du clapet de la vidéo suinte déjà un peu.',
      'Watch three things: the seat (a growing weep), the freedom of the stem in the guide, and the tightness of the lock nut. The video’s valve seat already weeps a little.',
    ),
    tip: l(
      'La taille du clapet se choisit sur la source, pas sur le bélier : la vidéo passe du n°3 au n°2 (qui fonctionne mal et consomme encore trop), puis au n°1.',
      'The valve size is chosen on the spring, not on the ram: the video goes from the n°3 to the n°2 (which works badly and still uses too much), then to the n°1.',
    ),
    video: ['03:02', '03:47', '06:20', '13:40'],
    design: l(
      'Un clapet plus petit laisse passer moins d’eau pour une même course : c’est ce qui fait passer la consommation sous le débit de la source. Le choix 15×21, 20×27 ou 26×34 se fait sur la section de la portée.',
      'A smaller valve lets less water through for the same stroke: that is what brings the consumption below the spring flow. The choice of 15×21, 20×27 or 26×34 is made on the section of the seat.',
    ),
  },
  {
    id: 'valve-seat',
    scene: 'ram',
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
    scene: 'ram',
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
    scene: 'ram',
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
    scene: 'ram',
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
    scene: 'ram',
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
    scene: 'ram',
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
    scene: 'ram',
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
    scene: 'ram',
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
  {
    id: 'delivery-valve',
    scene: 'ram',
    category: 'hydraulic',
    name: l('Clapet anti-retour de refoulement', 'Delivery check valve'),
    short: l(
      'Clapet qui laisse monter l’eau du corps vers la cloche et l’empêche de redescendre.',
      'Valve that lets water rise from the body into the chamber and stops it coming back.',
    ),
    description: l(
      'D’après la vidéo, ce petit clapet se trouve dans la cloche. Quand le clapet de choc claque, l’eau de la conduite, arrêtée net, n’a d’autre issue que de forcer ce clapet : elle monte dans la cloche et la conduite de refoulement. Il se referme dès que la pression du corps retombe sous celle de la cloche, ce qui garde la colonne d’eau de la conduite de refoulement en place pendant le recul. Le modèle en fait un orifice à sens unique dont la section vaut la moitié de celle de la conduite motrice.',
      'According to the video, this small valve sits in the chamber. When the waste valve slams, the water in the pipe, stopped dead, has no other way out than to force this valve: it rises into the chamber and the delivery pipe. It closes as soon as the body pressure drops below that of the chamber, which keeps the delivery pipe’s water column in place during the recoil. The model treats it as a one-way orifice whose area is half that of the drive pipe.',
    ),
    material: l('Laiton, à levée verticale (estimation)', 'Brass, vertical lift (estimate)'),
    specs: [
      sp(
        'Corps (3D)',
        'Body (3D)',
        tagged(
          'estimate',
          `${mm(CHECK_VALVE.acrossFlats).fr} mm sur plats × ${mm(CHECK_VALVE.height).fr} mm de haut`,
          `${mm(CHECK_VALVE.acrossFlats).en} mm across flats × ${mm(CHECK_VALVE.height).en} mm high`,
        ),
      ),
      sp('Alésage du siège (3D)', 'Seat bore (3D)', lenMm('estimate', CHECK_VALVE.seatBore)),
      sp('Levée du disque (3D)', 'Disc lift (3D)', lenMm('estimate', CHECK_VALVE.lift)),
      sp(
        'Section du modèle',
        'Model area',
        tagged('assumed', '½ de la section de la conduite motrice', '½ of the drive pipe section'),
      ),
      sp(
        'S’ouvre au-dessus de',
        'Opens above',
        tagged('derived', '≈ 6,4 bar, la pression de refoulement', '≈ 6.4 bar, the delivery pressure'),
      ),
    ],
    maintenance: l(
      'Un gravillon sous le disque le laisse fuir. Si le manomètre retombe vite à l’arrêt alors que la conduite est étanche, démontez et nettoyez ce clapet.',
      'A piece of grit under the disc lets it leak. If the gauge falls quickly at standstill while the pipe is tight, take this valve apart and clean it.',
    ),
    tip: l(
      'Gardez la crépine propre : elle protège ce clapet comme la portée du clapet de choc.',
      'Keep the strainer clean: it protects this valve as it does the waste valve seat.',
    ),
    video: ['03:30', '03:36'],
    design: l(
      'C’est le seul passage du corps vers la cloche : il transforme un coup bref en poussée à sens unique, et il garde la pression de la colonne d’eau pendant que le corps se vide.',
      'It is the only passage from the body to the chamber: it turns a brief hammer into a one-way push, and keeps the pressure of the water column while the body empties.',
    ),
  },
  {
    id: 'air-chamber',
    scene: 'ram',
    category: 'hydraulic',
    name: l('Cloche à air', 'Air chamber'),
    short: l(
      'Réservoir à coussin d’air qui lisse les à-coups en un débit continu vers le refoulement.',
      'Air-cushion vessel that smooths the jolts into a steady flow toward the delivery pipe.',
    ),
    description: l(
      'À chaque coup, le clapet de refoulement pousse un petit volume d’eau dans la cloche, qui comprime l’air qui s’y trouve ; cet air se détend ensuite et pousse l’eau dans la conduite de refoulement, sans interruption entre deux coups. Avec une cloche garnie d’air, la pression reste à quelques centièmes de bar de celle de la colonne (≈ 6,4 bar). Noyée, sans air, chaque coup rencontre directement la conduite : la pointe passe de 6,5 à 7,2 bar et le refoulement baisse de 40 % dans le modèle. Le modèle suppose une cloche de 4 L avec 60 % d’air à la pression de service ; la vidéo ne donne pas son volume.',
      'At every stroke, the delivery check valve pushes a small volume of water into the chamber, which compresses the air in it; that air then expands and pushes the water into the delivery pipe, without a break between two strokes. With a chamber well stocked with air the pressure stays within a few hundredths of a bar of the column’s (≈ 6.4 bar). Water-logged, with no air, every stroke meets the pipe directly: the peak goes from 6.5 to 7.2 bar and the delivery drops by 40 % in the model. The model assumes a 4 L chamber with 60 % air at working pressure; the video does not give its volume.',
    ),
    material: l('Acier soudé, fonds bombés (estimation)', 'Welded steel, dished ends (estimate)'),
    specs: [
      sp('Volume', 'Volume', tagged('assumed', `${nFr(CHAMBER.volumeL)} L`, `${nEn(CHAMBER.volumeL)} L`)),
      sp('Part d’air à la pression de service', 'Air share at working pressure', tagged('assumed', '60 %')),
      sp('Exposant polytropique', 'Polytropic exponent', tagged('assumed', nFr(POLYTROPIC, 1), nEn(POLYTROPIC, 1))),
      sp(
        'Virole (3D)',
        'Shell (3D)',
        tagged(
          'estimate',
          `Ø ${mm(CHAMBER.diameter).fr} × ${mm(CHAMBER.shellHeight).fr} mm, paroi ${mm(CHAMBER.wall).fr} mm`,
          `Ø ${mm(CHAMBER.diameter).en} × ${mm(CHAMBER.shellHeight).en} mm, wall ${mm(CHAMBER.wall).en} mm`,
        ),
      ),
      sp('Fonds bombés (3D)', 'Dished ends (3D)', lenMm('estimate', CHAMBER.domeHeight)),
      sp('Pression de service', 'Working pressure', tagged('derived', '≈ 6,4 bar')),
    ],
    maintenance: l(
      'Une cloche noyée se reconnaît à des coups durs et à un refoulement qui baisse. Avec un reniflard qui fonctionne, le modèle la recharge en air avec une constante de temps de 20 minutes.',
      'A water-logged chamber shows itself by harsh strokes and a falling delivery. With a working snifter, the model refills it with air at a time constant of 20 minutes.',
    ),
    tip: l(
      'Si le refoulement chute d’un coup, regardez d’abord la cloche et le reniflard avant de toucher au clapet de choc.',
      'If the delivery suddenly drops, look at the chamber and the snifter first before touching the waste valve.',
    ),
    video: ['03:26'],
    design: l(
      'L’air est compressible, l’eau ne l’est pas : la cloche transforme des poussées brèves et violentes en un débit presque constant, ce qui ménage la conduite de refoulement.',
      'Air is compressible, water is not: the chamber turns short, violent pushes into an almost steady flow, which spares the delivery pipe.',
    ),
  },
  {
    id: 'snifter',
    scene: 'ram',
    category: 'hydraulic',
    name: l('Reniflard', 'Snifter valve'),
    short: l(
      'Minuscule soupape qui laisse entrer un peu d’air à chaque recul pour recharger la cloche.',
      'Tiny valve that lets in a little air at every recoil to recharge the chamber.',
    ),
    description: l(
      'L’air de la cloche se dissout peu à peu dans l’eau sous pression et finirait par disparaître. Le reniflard est une toute petite soupape sur le corps, qui s’ouvre quand la pression y passe sous celle de l’air libre pendant le recul de l’eau : il laisse entrer une pincée d’air, que le coup suivant pousse dans la cloche. Dans le modèle, c’est un orifice de 1,5 mm qui s’ouvre sous −1 kPa ; bouché, l’air de la cloche se perd en quelques heures et la cloche est noyée au bout d’une quinzaine d’heures. La vidéo ne le montre pas : c’est un organe classique des béliers.',
      'The chamber air gradually dissolves into the pressurised water and would eventually vanish. The snifter is a very small valve on the body, which opens when the pressure there falls below atmospheric during the water’s recoil: it lets in a pinch of air, which the next stroke pushes into the chamber. In the model it is a 1.5 mm orifice that opens below −1 kPa; blocked, the chamber air is lost within a few hours and the chamber is water-logged after about fifteen hours. The video does not show it: it is a standard part of rams.',
    ),
    material: l('Laiton (estimation)', 'Brass (estimate)'),
    specs: [
      sp(
        'Orifice du modèle',
        'Model orifice',
        tagged('assumed', `Ø ${nFr(SNIFTER_DIAMETER * 1000, 1)} mm`, `Ø ${nEn(SNIFTER_DIAMETER * 1000, 1)} mm`),
      ),
      sp(
        'Pression d’ouverture',
        'Cracking pressure',
        tagged('assumed', `−${nFr(SNIFTER_CRACK / 1000)} kPa`, `−${nEn(SNIFTER_CRACK / 1000)} kPa`),
      ),
      sp(
        'Pièce dessinée en 3D',
        'Part drawn in 3D',
        tagged(
          'estimate',
          `Ø ${mm(FITTINGS.snifterDiameter).fr} × ${mm(FITTINGS.snifterHeight).fr} mm`,
          `Ø ${mm(FITTINGS.snifterDiameter).en} × ${mm(FITTINGS.snifterHeight).en} mm`,
        ),
      ),
      sp('Bouché : cloche noyée en', 'Blocked: chamber water-logged in', tagged('model', '≈ 15 h')),
    ],
    maintenance: l(
      'Nettoyez-le régulièrement : un orifice de ce calibre se bouche vite, et l’on ne s’en aperçoit qu’au bout d’une quinzaine d’heures, quand la cloche est noyée.',
      'Clean it regularly: an orifice of this size clogs quickly, and you only notice after some fifteen hours, when the chamber is water-logged.',
    ),
    tip: l(
      'Le scénario « Reniflard bouché » du simulateur montre la lenteur de la panne : l’air de la cloche s’en va sans bruit, puis le refoulement tombe.',
      'The simulator’s “Blocked snifter” scenario shows how slow the fault is: the chamber air leaves quietly, then the delivery falls.',
    ),
    design: l(
      'Sans reniflard, la cloche perdrait son coussin d’air et le bélier son rendement : c’est la pièce d’entretien automatique de la cloche, activée par le recul.',
      'Without a snifter the chamber would lose its air cushion and the ram its efficiency: it is the chamber’s automatic upkeep part, driven by the recoil.',
    ),
  },
  {
    id: 'gauge',
    scene: 'ram',
    category: 'hydraulic',
    name: l('Manomètre', 'Pressure gauge'),
    short: l(
      'Cadran de la pression de refoulement : il lit la hauteur d’eau déjà montée.',
      'Dial of the delivery pressure: it reads the height of water already lifted.',
    ),
    description: l(
      'Le manomètre se place côté refoulement. Il lit la pression de la colonne d’eau : 1 bar correspond à environ 10 m de hauteur, donc l’aiguille monte vers 6,4 bar quand les 65 m de conduite sont pleins. Dans le modèle, avec une cloche garnie d’air l’aiguille bouge à peine à chaque coup ; elle tremble franchement quand la cloche est noyée. Il n’est pas montré dans la vidéo : c’est l’instrument de contrôle du bélier.',
      'The gauge goes on the delivery side. It reads the pressure of the water column: 1 bar corresponds to about 10 m of height, so the needle climbs toward 6.4 bar when the 65 m of pipe are full. In the model, with a chamber stocked with air the needle barely moves at each stroke; it trembles visibly when the chamber is water-logged. It is not shown in the video: it is the ram’s monitoring instrument.',
    ),
    material: l('Boîtier inox, tube de Bourdon (estimation)', 'Stainless case, Bourdon tube (estimate)'),
    specs: [
      sp('Cadran (3D)', 'Dial (3D)', lenMm('estimate', FITTINGS.gaugeDiameter)),
      sp('Échelle', 'Scale', tagged('estimate', `0–${FITTINGS.gaugeFullScaleBar} bar`)),
      sp('Pression à pleine hauteur', 'Pressure at full lift', tagged('derived', '≈ 6,4 bar')),
      sp('Pointe avec cloche noyée', 'Peak with a water-logged chamber', tagged('model', '7,2 bar')),
    ],
    maintenance: l(
      'Vérifiez le zéro à l’arrêt, après avoir ouvert la vidange V2 : une aiguille qui ne revient pas à zéro ment sur toutes les mesures.',
      'Check the zero at standstill, after opening the drain V2: a needle that does not return to zero misleads every reading.',
    ),
    tip: l(
      'Un manomètre à bain de glycérine encaisse mieux les vibrations d’un bélier qu’un manomètre à sec.',
      'A glycerine-filled gauge copes better with a ram’s vibration than a dry one.',
    ),
    design: l(
      'Placé côté refoulement, il mesure l’effet utile, la hauteur déjà gagnée, plutôt que le choc : l’échelle doit dépasser la pointe de 7,2 bar du modèle.',
      'On the delivery side it measures the useful effect, the height already gained, rather than the hammer: the scale must exceed the model’s 7.2 bar peak.',
    ),
  },
  {
    id: 'outlet-valve',
    scene: 'ram',
    category: 'hydraulic',
    name: l('Vanne de sortie (V3)', 'Outlet valve (V3)'),
    short: l(
      'Vanne qui isole la conduite de refoulement du bélier.',
      'Valve that isolates the delivery pipe from the ram.',
    ),
    description: l(
      'La vanne de sortie ferme la conduite de refoulement, qui reste pleine de sa colonne d’eau (65 m, soit environ 6,4 bar) pendant qu’on intervient sur le bélier. On la ferme après avoir arrêté le bélier avec la vanne d’arrivée, puis on ouvre la vidange pour faire retomber la pression du corps et de la cloche. Elle n’est pas montrée dans la vidéo : c’est une pièce courante d’un bélier.',
      'The outlet valve closes the delivery pipe, which stays full of its water column (65 m, about 6.4 bar) while you work on the ram. It is closed after stopping the ram with the inlet valve, then the drain is opened to let the body and chamber pressure fall. It is not shown in the video: it is a usual part of a ram.',
    ),
    material: l('Laiton, à boisseau sphérique (estimation)', 'Brass, ball valve (estimate)'),
    specs: [
      sp('Taille', 'Size', l('DN15 (½″), comme la conduite de refoulement', 'DN15 (½″), like the delivery pipe')),
      sp('Longueur (3D)', 'Length (3D)', lenMm('estimate', FITTINGS.smallBallValveLength)),
      sp('Tenue en pression', 'Pressure rating', l('Nettement au-dessus de 7,2 bar', 'Clearly above 7.2 bar')),
    ],
    maintenance: l(
      'Manœuvrez-la une fois par an pour qu’elle ne se grippe pas, et resserrez le presse-étoupe si elle suinte.',
      'Operate it once a year so that it does not seize, and retighten the gland if it weeps.',
    ),
    tip: l(
      'Ne la laissez pas fermée quand le bélier tourne : il continuerait à frapper sans rien refouler, comme dans le scénario « Refoulement trop haut ».',
      'Do not leave it shut while the ram runs: it would keep striking and deliver nothing, as in the “Delivery head too high” scenario.',
    ),
    design: l(
      'Une vanne dédiée évite de vider 300 m de conduite chaque fois qu’on ouvre le bélier.',
      'A dedicated valve avoids emptying 300 m of pipe every time the ram is opened.',
    ),
  },
  {
    id: 'drain-valve',
    scene: 'ram',
    category: 'hydraulic',
    name: l('Vanne de vidange (V2)', 'Drain valve (V2)'),
    short: l(
      'Vanne qui purge le corps et la cloche pour faire retomber la pression.',
      'Valve that purges the body and the chamber to let the pressure fall.',
    ),
    description: l(
      'La vanne de vidange sert à purger le corps et la cloche, donc à faire retomber la pression avant toute intervention : tant qu’on ne l’a pas ouverte, ils restent à environ 6 bar (la colonne de 65 m, retenue par le clapet de refoulement). Elle permet aussi de vider l’eau d’une cloche noyée. Elle n’est pas montrée dans la vidéo : c’est une pièce courante d’un bélier.',
      'The drain valve purges the body and the chamber, and so lets the pressure fall before any work: until it is opened they stay at about 6 bar (the 65 m column, held by the delivery check valve). It also lets you drain the water out of a water-logged chamber. It is not shown in the video: it is a usual part of a ram.',
    ),
    material: l('Laiton, à boisseau sphérique (estimation)', 'Brass, ball valve (estimate)'),
    specs: [
      sp('Taille', 'Size', l('DN15 (½″)', 'DN15 (½″)')),
      sp('Longueur (3D)', 'Length (3D)', lenMm('estimate', FITTINGS.smallBallValveLength)),
      sp('Pression à purger', 'Pressure to purge', tagged('derived', '≈ 6,4 bar')),
    ],
    maintenance: l(
      'Vérifiez qu’elle ne suinte pas quand elle est fermée : une petite fuite de vidange coûte de l’eau en permanence.',
      'Check that it does not weep when closed: a small drain leak costs water all the time.',
    ),
    tip: l(
      'Ouvrez-la lentement et orientez le jet vers le drain du regard : le corps est à plusieurs bars.',
      'Open it slowly and aim the jet at the pit drain: the body is at several bar.',
    ),
    design: l(
      'Sans purge, un bélier ne se démonte pas en sécurité : le clapet de refoulement garde la pression dans la cloche.',
      'Without a purge, a ram cannot be taken apart safely: the delivery check valve keeps the pressure in the chamber.',
    ),
  },
  {
    id: 'strainer',
    scene: 'ram',
    category: 'hydraulic',
    name: l('Crépine', 'Strainer'),
    short: l(
      'Filtre à l’entrée du bélier qui retient feuilles, sable et gravillons.',
      'Filter at the ram inlet that catches leaves, sand and grit.',
    ),
    description: l(
      'La crépine est un filtre placé à l’entrée du bélier. Elle arrête ce que l’eau de la source charrie (feuilles, sable, gravillons) avant qu’il ne se coince entre la tête du clapet et sa portée, ou sous le clapet de refoulement. Elle ajoute une petite perte de charge : le modèle la compte, avec la vanne d’arrivée et les coudes, dans un coefficient K = 3. Elle n’est pas montrée dans la vidéo : c’est une pièce courante d’un bélier.',
      'The strainer is a filter at the ram inlet. It stops what the spring water carries (leaves, sand, grit) before it can jam between the valve head and its seat, or under the delivery check valve. It adds a small head loss: the model counts it, with the inlet valve and the bends, in a coefficient K = 3. It is not shown in the video: it is a usual part of a ram.',
    ),
    material: l('Fonte, tamis inox (estimation)', 'Cast iron, stainless screen (estimate)'),
    specs: [
      sp('Taille', 'Size', l('DN25 (1″), crépine en Y', 'DN25 (1″), Y-strainer')),
      sp('Longueur (3D)', 'Length (3D)', lenMm('estimate', INLET.strainerLength)),
      sp('Maillage', 'Mesh', l('Non précisé', 'Not stated')),
      sp(
        'Pertes de l’arrivée (K total)',
        'Inlet losses (total K)',
        tagged('assumed', 'K = 3, avec vanne et coudes', 'K = 3, with valve and bends'),
      ),
    ],
    maintenance: l(
      'Nettoyez-la à chaque visite : une crépine colmatée fait baisser le débit moteur, donc la cadence.',
      'Clean it on every visit: a clogged strainer lowers the drive flow, and so the stroke rate.',
    ),
    tip: l(
      'Prenez un tamis dont la surface est bien plus grande que la section du tuyau, pour qu’il mette longtemps à se colmater.',
      'Choose a screen whose area is much larger than the pipe section, so that it takes a long time to clog.',
    ),
    design: l(
      'Un gravillon coincé sous la tête suffit à faire fuir une portée ajustée au dixième de millimètre : le plus sûr est de l’arrêter avant elle.',
      'A bit of grit stuck under the head is enough to make a seat fitted to a tenth of a millimetre leak: the safest course is to stop it before it gets there.',
    ),
  },
];

/** The catalogue: 7 site parts then 18 ram parts, ids frozen in docs/research.md §4. */
export const PARTS: PartInfo[] = [...SITE_PARTS, ...RAM_PARTS];
