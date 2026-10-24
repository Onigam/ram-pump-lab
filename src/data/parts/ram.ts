// Parts of the `ram` world (ids frozen in src/part-ids.ts). Status words: see ../part-helpers.ts.
import type { PartInfo } from '@onigam/lab-kit/content';
import { l } from '@onigam/lab-kit/i18n';
import { POLYTROPIC, SNIFTER_CRACK, SNIFTER_DIAMETER } from '../../sim/physics';
import { CHAMBER, CHECK_VALVE, FITTINGS, INLET, RAM, SITE as SITE_DIMS, VALVE } from '../../three/dims';
import { mm, nEn, nFr } from '../units';
import { STROKE, WEIGHT, lenMm, sp, tagged } from '../part-helpers';

export const RAM_PARTS: PartInfo[] = [
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
