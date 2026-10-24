import { getLang, registerStrings, tx, type CommonKey } from '@onigam/lab-kit/i18n';

// The lab's own interface strings, `key: [fr, en]`. The ones every lab shares (modes, toolbar, panels,
// guides) live in the kit; add here only what is specific to this lab.

const LAB = {
  tagline: ['Pomper l’eau sans électricité ni carburant', 'Pumping water with no electricity or fuel'],
  sceneSite: ['Le site', 'The site'],
  sceneRam: ['Le bélier', 'The ram'],
  goSite: ['Voir le site', 'See the site'],
  goRam: ['Voir le bélier', 'See the ram'],
  sceneCatchment: ['Le captage', 'The catchment'],
  sceneValve: ['Le clapet', 'The valve'],
  goCatchment: ['Voir le captage', 'See the catchment'],
  goValve: ['Voir le clapet de choc', 'See the waste valve'],
  groupRam: ['Le bélier', 'The ram'],
  groupValve: ['Le clapet de choc', 'The waste valve'],
  groupHydraulic: ['Hydraulique', 'Hydraulics'],
  groupSite: ['Le site', 'The site'],
  plansIntro: [
    'Planches A3 générées à partir des cotes du modèle 3D.',
    'A3 sheets generated from the 3D model dimensions.',
  ],
  lessonsIntro: [
    'Six leçons courtes : chacune ouvre la 3D ou la simulation sur ce dont elle parle, puis un petit quiz.',
    'Six short lessons: each opens the 3D view or the simulation on what it talks about, then a small quiz.',
  ],
  groupDevice: ['Dispositif', 'Device'],
  disclaimer: [
    'Reconstitution pédagogique indépendante. Ce n’est pas un plan officiel.',
    'Independent educational reconstruction. It is not an official drawing.',
  ],

  // ---- simulation panel: presets, scenarios, actions
  simTitle: ['Simulation', 'Simulation'],
  preset: ['Préréglage', 'Preset'],
  presetValve3: ['Clapet n°3 : consomme trop', 'Valve n°3: uses too much water'],
  presetValve2: ['Clapet n°2 : fonctionne mal', 'Valve n°2: works badly'],
  presetValve1: ['Clapet n°1 : 500 L par jour', 'Valve n°1: 500 L a day'],
  custom: ['Personnalisé', 'Custom'],
  reset: ['Recommencer', 'Start over'],
  restart: ['Remettre en marche', 'Restart the ram'],
  scenarios: ['Scénarios', 'Scenarios'],
  scenarioSourceDrop: ['La source baisse (10 → 7,5 L/min)', 'The spring drops (10 → 7.5 L/min)'],
  scenarioStrokeNut: ['Écrou de course vissé', 'Stroke nut turned in'],
  scenarioWaterLogged: ['Cloche à air noyée', 'Water-logged air chamber'],
  scenarioShortPipe: ['Conduite motrice trop courte', 'Drive pipe too short'],
  scenarioHighLift: ['Refoulement trop haut', 'Delivery head too high'],
  scenarioSnifterBlocked: ['Reniflard bouché', 'Blocked snifter'],
  scenarioPlasticPipe: ['Conduite en PVC', 'PVC drive pipe'],
  scenarioHeavyWeight: ['Contrepoids plus lourd', 'Heavier counterweight'],
  scenarioHint: [
    'Réglez la vitesse du temps en bas de l’écran (×60, ×600, ×3600) pour voir les heures défiler.',
    'Set the time speed at the bottom of the screen (×60, ×600, ×3600) to watch the hours go by.',
  ],

  // ---- status line
  statusRunning: ['Le bélier tourne.', 'The ram is running.'],
  statusDraining: [
    'Il prend plus d’eau que la source n’en donne : la réserve se vide.',
    'It takes more water than the spring gives: the buffer tank is draining.',
  ],
  statusEmptyIn: ['Réserve vide dans', 'Tank empty in'],
  statusStalledTank: [
    'Arrêté : la réserve s’est vidée et l’air est entré dans la conduite. Il faut le remettre en marche à la main.',
    'Stopped: the tank ran dry and air got into the drive pipe. It has to be restarted by hand.',
  ],
  statusStalledStuck: [
    'Arrêté : le clapet de choc reste fermé, le recul est trop faible pour le rouvrir (refoulement trop proche de la chute).',
    'Stopped: the waste valve stays shut, the recoil is too weak to reopen it (delivery head too close to the fall).',
  ],
  statusNoDelivery: [
    'Le bélier frappe mais ne refoule rien : le clapet se ferme trop lentement pour que le coup de bélier ouvre le clapet de refoulement.',
    'The ram strikes but delivers nothing: the valve closes too slowly for the water hammer to open the delivery check valve.',
  ],
  statusSoftPipe: [
    'Conduite trop souple : à {a} m/s, l’onde donne un choc de {surge} bar (ρ·a·v), or il en faut {need} bar pour ouvrir le clapet de refoulement. Le clapet de choc se ferme pourtant à {v} m/s, assez vite pour une conduite rigide (acier, 900 m/s). Le bélier frappe mais ne refoule rien.',
    'Pipe too soft: at {a} m/s the wave gives a surge of {surge} bar (ρ·a·v), but {need} bar are needed to open the delivery check valve. The waste valve does close at {v} m/s, fast enough for a rigid pipe (steel, 900 m/s). The ram strikes but delivers nothing.',
  ],
  statusStalledGate: [
    'Arrêté : la vanne de départ de la conduite motrice est fermée, plus d’eau ne descend. La réserve se remplit. Rouvrez la vanne pour relancer le bélier.',
    'Stopped: the gate valve at the start of the drive pipe is closed, no water comes down. The tank is filling. Open the valve to start the ram again.',
  ],
  statusStalledHand: [
    'Arrêté : le clapet de choc est tenu fermé à la main (simulation : jamais un doigt dans le clapet d’un bélier qui tourne). La réserve se remplit. Relâchez le clapet pour relancer le bélier.',
    'Stopped: the waste valve is held shut by hand (a simulation: never a finger in the valve of a running ram). The tank is filling. Let go of the valve to start the ram again.',
  ],
  statusDrain: [
    'La vidange de la réserve est ouverte : la réserve se vide en',
    'The tank drain is open: the tank empties in',
  ],
  statusValveOpen: [
    'Le clapet de choc ne se ferme jamais : l’eau s’échappe en continu, rien n’est refoulé.',
    'The waste valve never closes: the water just runs out and nothing is delivered.',
  ],

  // ---- sections and controls
  secSite: ['Site : chute et conduites', 'Site: fall and pipes'],
  secRam: ['Bélier : clapet et cloche', 'Ram: valve and air chamber'],
  fall: ['Chute h', 'Fall h'],
  driveLength: ['Longueur de la conduite motrice L', 'Drive pipe length L'],
  driveDiameter: ['Ø intérieur de la conduite motrice', 'Drive pipe inner Ø'],
  pipeMaterial: ['Matière de la conduite motrice', 'Drive pipe material'],
  matSteel: ['Acier', 'Steel'],
  matPvc: ['PVC', 'PVC'],
  matHdpe: ['Polyéthylène', 'Polyethylene'],
  deliveryHead: ['Hauteur de refoulement H', 'Delivery head H'],
  deliveryLength: ['Longueur du refoulement', 'Delivery pipe length'],
  sourceFlow: ['Débit de la source', 'Spring flow'],
  tankVolume: ['Réserve tampon', 'Buffer tank'],
  valve: ['Clapet de choc', 'Waste valve'],
  stroke: ['Course (écrou de réglage)', 'Stroke (stroke nut)'],
  counterweight: ['Contrepoids', 'Counterweight'],
  chamberVolume: ['Cloche à air', 'Air chamber'],
  waterLogged: ['Cloche noyée (plus d’air)', 'Water-logged (no air left)'],
  snifterBlocked: ['Reniflard bouché', 'Snifter blocked'],
  valveHint: [
    'Le changement de clapet reprend ses réglages de la vidéo (course et contrepoids, calibrés sur ses chiffres).',
    'Changing the valve loads its settings from the video (stroke and counterweight, calibrated on its figures).',
  ],

  // ---- live readouts
  liveStrokes: ['Coups / min', 'Strokes / min'],
  liveDrive: ['Eau prise Q', 'Drive flow Q'],
  liveWaste: ['Eau perdue', 'Lost at valve'],
  liveDelivered: ['Refoulé q', 'Delivered q'],
  liveDeliveredDay: ['Refoulé/jour', 'Daily output'],
  liveEtaD: ['η Aubuisson', 'η Aubuisson'],
  liveEtaR: ['η Rankine', 'η Rankine'],
  liveClosing: ['V. fermeture', 'Close speed'],
  liveClosingMin: ['V. requise', 'Min. speed'],
  liveSurge: ['Choc ρ·a·v', 'Surge ρ·a·v'],
  liveBody: ['P. du corps', 'Body press.'],
  liveChamber: ['P. cloche', 'Chamber P.'],
  liveTank: ['Réserve', 'Buffer tank'],
  liveAir: ['Air cloche', 'Chamber air'],
  liveWave: ['Vit. de l’onde', 'Wave speed'],
  liveRate: ['Cadence', 'Rate'],
  liveDeliveredStrip: ['Refoulé', 'Delivered'],
  liveEfficiency: ['Rendement', 'Efficiency'],
  liveTankStrip: ['Réserve', 'Tank'],
  liveDriveStrip: ['Consomme', 'Uses'],
  clockDay: ['Jour', 'Day'],
  unitPerDay: ['L/jour', 'L/day'],
  unitPerMin: ['coups/min', 'strokes/min'],

  // ---- charts
  chartScope: ['Dernier coup : pression du corps (bar)', 'Last strokes: body pressure (bar)'],
  chartScopeSpeed: ['Vitesse dans la conduite motrice (m/s)', 'Drive pipe velocity (m/s)'],
  chartScopeHint: [
    'La pression monte au coup de bélier jusqu’à celle du refoulement ; la vitesse devient négative au recul, ce qui rouvre le clapet.',
    'The pressure jumps to the delivery pressure at the water hammer; the velocity goes negative in the recoil, which reopens the valve.',
  ],
  chartHead: [
    'Eau refoulée (L/jour) selon la hauteur de refoulement',
    'Delivered water (L/day) against the delivery head',
  ],
  chartHeadHint: [
    'Les trois clapets avec leurs réglages de la vidéo, pour le site ci-dessus. Le point est votre réglage actuel.',
    'The three valves with the settings of the video, for the site above. The dot is your present setting.',
  ],
  chartStroke: ['Consommation selon la course (L/min)', 'Water used against the stroke (L/min)'],
  chartStrokeDelivered: ['Eau refoulée selon la course (L/jour)', 'Delivered water against the stroke (L/day)'],
  chartStrokeHint: [
    'Visser l’écrou réduit la consommation, mais en dessous d’une course minimale le bélier ne refoule plus (vidéo, 13:13).',
    'Turning the nut in cuts the water use, but below a minimum stroke the ram no longer delivers (video, 13:13).',
  ],
  chartTank: ['Niveau de la réserve tampon (%)', 'Buffer tank level (%)'],
  chartTankHint: [
    'Dernières 48 h simulées. Quand la courbe touche zéro, le bélier s’arrête.',
    'Last 48 simulated hours. When the curve reaches zero the ram stops.',
  ],
  sweepBy: ['Courbes selon', 'Curves against'],
  sweepStroke: ['la course', 'the stroke'],
  sweepWeight: ['le contrepoids', 'the counterweight'],
  chartWeight: ['Consommation selon le contrepoids (L/min)', 'Water used against the counterweight (L/min)'],
  chartWeightDelivered: [
    'Eau refoulée selon le contrepoids (L/jour)',
    'Delivered water against the counterweight (L/day)',
  ],
  chartWeightHint: [
    'Un contrepoids plus lourd refoule plus d’eau au début, mais consomme bien plus : le refoulé passe par un maximum puis retombe, et vers 1 000 g le clapet ne se ferme plus.',
    'A heavier counterweight delivers more water at first but uses a lot more: the delivery goes through a maximum and then falls, and around 1,000 g the valve no longer closes.',
  ],
  seriesValve1: ['Clapet n°1', 'Valve n°1'],
  seriesValve2: ['Clapet n°2', 'Valve n°2'],
  seriesValve3: ['Clapet n°3', 'Valve n°3'],
  seriesConsumption: ['Consommation Q', 'Water used Q'],
  seriesSource: ['Source', 'Spring'],
  seriesDelivered: ['Refoulé', 'Delivered'],
  seriesTank: ['Réserve', 'Tank'],
  seriesPressure: ['Pression du corps', 'Body pressure'],
  seriesVelocity: ['Vitesse', 'Velocity'],
  computing: ['Calcul des courbes…', 'Computing the curves…'],

  // ---- alarms of the bottom strip
  alarm_stalledTank: ['Arrêté : réserve vide', 'Stopped: tank empty'],
  alarm_stalledStuck: ['Arrêté : clapet bloqué fermé', 'Stopped: valve stuck shut'],
  alarm_tankLow: ['La réserve se vide', 'Tank draining'],
  alarm_noDelivery: ['Ne refoule rien', 'Nothing delivered'],
  alarm_valveOpen: ['Le clapet ne se ferme pas', 'Valve never closes'],
  alarm_pipeShort: ['Conduite motrice courte', 'Drive pipe short'],
  alarm_headHigh: ['Refoulement trop haut', 'Delivery head too high'],
  alarm_waterLogged: ['Cloche noyée', 'Water-logged chamber'],
  alarm_snifterBlocked: ['Reniflard bouché', 'Snifter blocked'],
  alarm_softPipe: ['Conduite trop souple', 'Pipe too soft'],
  alarm_gateClosed: ['Vanne de départ fermée', 'Gate valve closed'],
  alarm_heldShut: ['Clapet tenu fermé', 'Valve held shut'],
  alarm_drainOpen: ['Vidange ouverte', 'Drain open'],

  // ---- the cycle, step by step
  secCycle: ['Le cycle, pas à pas', 'The cycle, step by step'],
  phaseAccel: ['Accélération', 'Acceleration'],
  phaseClose: ['Fermeture', 'Closing'],
  phaseDeliver: ['Refoulement', 'Delivery'],
  phaseRecoil: ['Recul', 'Recoil'],
  cycleStep: ['Phase suivante', 'Next phase'],
  cycleResume: ['Reprendre', 'Resume'],
  cycleHint: [
    'Figez une phase pour la voir sur le bélier en 3D et lire ses chiffres, ou avancez phase par phase. L’horloge et la réserve continuent de tourner.',
    'Freeze a phase to see it on the 3D ram and read its figures, or step phase by phase. The clock and the tank keep running.',
  ],
  cycleLive: [
    'Le cycle tourne : un coup dure {t} ms (accélération {a} ms, fermeture {c} ms, refoulement {d} ms, recul {r} ms).',
    'The cycle is running: one stroke lasts {t} ms (acceleration {a} ms, closing {c} ms, delivery {d} ms, recoil {r} ms).',
  ],
  cycleStopped: [
    'Le bélier est arrêté : il n’y a pas de cycle à figer.',
    'The ram is stopped: there is no cycle to freeze.',
  ],
  cycleNoDelivery: [
    'Cette phase n’existe pas avec ces réglages : le clapet de refoulement ne s’ouvre jamais.',
    'This phase does not happen with these settings: the delivery check valve never opens.',
  ],
  cycleNow: ['À cet instant', 'At this instant'],
  cardValve: ['Clap. choc', 'Waste v.'],
  cardCheck: ['Anti-retour', 'Check v.'],
  cardSpeed: ['Vitesse eau', 'Flow speed'],
  cardBody: ['P. du corps', 'Body P.'],
  cardJet: ['Jet clapet', 'Waste jet'],
  cardInto: ['Vers cloche', 'Inflow'],
  cardInPhase: ['Écoulé', 'Elapsed'],
  descAccel: [
    'Le clapet de choc est ouvert, retombé sur son écrou. L’eau de la conduite motrice, entraînée par la chute de {h} m, accélère et s’échappe par le clapet ({v} m/s, jet de {jet} L/min). Plus elle va vite, plus elle pousse le clapet vers sa portée. Le clapet de refoulement est fermé : rien n’est refoulé.',
    'The waste valve is open, resting on its nut. The water in the drive pipe, pulled by the {h} m fall, speeds up and runs out through the valve ({v} m/s, a jet of {jet} L/min). The faster it goes, the harder it pushes the valve towards its seat. The delivery check valve is shut: nothing is delivered.',
  ],
  descClose: [
    'Le jet a vaincu le poids : le clapet de choc vient de claquer sur sa portée. La colonne d’eau, lancée à {vc} m/s, est stoppée net, c’est le coup de bélier. La pression du corps monte à {p} bar, jusqu’à celle du refoulement ({head} bar) ; si elle ne pouvait pas s’échapper, le choc serait de {surge} bar (ρ·a·v).',
    'The jet has overcome the weight: the waste valve has just slammed onto its seat. The column of water, launched at {vc} m/s, is stopped dead: that is the water hammer. The body pressure climbs to {p} bar, up to the delivery pressure ({head} bar); if it could not escape, the surge would be {surge} bar (ρ·a·v).',
  ],
  descCloseWeak: [
    'Le clapet de choc vient de claquer et la colonne d’eau, lancée à {vc} m/s, est stoppée net. Mais avec une onde à {a} m/s, le choc ρ·a·v n’est que de {surge} bar : la pression du corps n’atteint que {p} bar. Pour ouvrir le clapet de refoulement, il faudrait un choc de {need} bar (la pression de refoulement, {head} bar, moins la charge de la conduite motrice). Il ne s’ouvrira pas : pas de phase de refoulement.',
    'The waste valve has just slammed and the column of water, launched at {vc} m/s, is stopped dead. But with a wave at {a} m/s the surge ρ·a·v is only {surge} bar: the body pressure reaches only {p} bar. To open the delivery check valve a surge of {need} bar would be needed (the delivery pressure, {head} bar, minus the static head of the drive pipe). It will not open: there is no delivery phase.',
  ],
  descDeliver: [
    'La surpression soulève le clapet de refoulement ({check} % ouvert) : {q} L/min passent dans la cloche à air, qui se comprime puis pousse l’eau dans la conduite de refoulement vers le château d’eau. Cette phase ne dure que {ms} ms, mais c’est la seule où de l’eau entre dans la cloche.',
    'The surge lifts the delivery check valve ({check} % open): {q} L/min goes into the air chamber, which compresses and then pushes the water up the delivery pipe to the tower. This phase lasts only {ms} ms, but it is the only one in which water enters the chamber.',
  ],
  descRecoil: [
    'Le choc rebondit : la colonne repart en arrière ({v} m/s), la pression tombe à celle de l’air et le clapet de refoulement se referme. Le clapet de choc retombe de lui-même ({valve} % ouvert) et de l’air entre par le reniflard, puis par le clapet. Quand la colonne s’arrête, elle repart vers le bélier : tout recommence.',
    'The shock rebounds: the column flows backwards ({v} m/s), the pressure falls to that of the air and the delivery check valve shuts. The waste valve drops open by itself ({valve} % open) and air comes in through the snifter, then through the valve. When the column stops, it sets off towards the ram again: everything starts over.',
  ],
  chartCycle: ['Un coup entier : pression (bar)', 'One whole stroke: pressure (bar)'],
  chartCycleSpeed: ['Vitesse dans la conduite (m/s)', 'Drive pipe velocity (m/s)'],
  chartCycleHint: [
    'Les chiffres 1 à 4 marquent le début de chaque phase. Le trait « Figé » est l’instant montré sur le bélier.',
    'The numbers 1 to 4 mark the start of each phase. The “Frozen” line is the instant shown on the ram.',
  ],
  cycleFrozen: ['Figé', 'Frozen'],

  // ---- sizing calculator
  secSize: ['Dimensionner un bélier', 'Size a ram'],
  sizeIntro: [
    'Entrez un site : le calcul donne la conduite motrice minimale, le débit de source qu’il faut et ce qu’on peut espérer refouler. Il ne touche pas à la simulation en cours.',
    'Enter a site: the calculation gives the minimum drive pipe, the spring flow it needs and what you can expect to deliver. It does not touch the running simulation.',
  ],
  sizePipe: ['Diamètre de la conduite motrice', 'Drive pipe size'],
  sizeLength: ['Longueur prévue de la conduite', 'Planned pipe length'],
  sizeLoad: ['Valeurs du site', 'Site values'],
  sizeApply: ['Essayer dans la simulation', 'Try it in the simulation'],
  sizeMinLength: ['Conduite minimale', 'Minimum pipe'],
  sizeUsualLength: ['Longueur courante', 'Usual length'],
  sizeTable: ['Tableau S4 pour', 'S4 table for'],
  sizeDelivery: ['Refoulé attendu (η {eta})', 'Expected delivery (η {eta})'],
  sizeDeliveryLive: ['Avec le η de la simulation ({eta})', 'With the simulation’s η ({eta})'],
  sizeVerdictOk: [
    'Source suffisante : {src} L/min contre {min} L/min demandés par une conduite de {pipe}.',
    'Enough spring: {src} L/min against the {min} L/min a {pipe} drive pipe asks for.',
  ],
  sizeVerdictShort: [
    'Source insuffisante : {src} L/min contre {min} L/min demandés par une conduite de {pipe} ({pct} %).',
    'Not enough spring: {src} L/min against the {min} L/min a {pipe} drive pipe asks for ({pct} %).',
  ],
  sizeTipSmaller: [
    'Une conduite de {pipe} conviendrait à cette source. Sinon, comme dans la vidéo, réglez le clapet pour qu’il consomme moins d’eau que la source n’en donne (préréglage « Clapet n°1 »).',
    'A {pipe} pipe would suit this spring. Otherwise, as in the video, tune the valve so that it uses less than the spring gives (the “Valve n°1” preset).',
  ],
  sizeTipNone: [
    'Aucun diamètre du tableau ne convient : la source donne moins que les {min} L/min du plus petit. Comme dans la vidéo, il faut régler le clapet pour qu’il consomme moins d’eau que la source n’en donne (préréglage « Clapet n°1 »).',
    'No size of the table fits: the spring gives less than the {min} L/min of the smallest. As in the video, the valve has to be tuned to use less than the spring gives (the “Valve n°1” preset).',
  ],
  sizeWarnHeadHigh: [
    'H/h = {r} : au-delà de 12, le coup de bélier ne suffit plus à monter l’eau (la règle est d’environ 10 m de refoulement par mètre de chute).',
    'H/h = {r}: above 12 the water hammer is no longer enough to lift the water (the rule is about 10 m of lift per metre of fall).',
  ],
  sizeWarnHeadLow: [
    'H/h = {r} : le refoulement est trop près de la chute, le recul ne rouvre plus le clapet de choc (dans le modèle, le bélier reste bloqué sous 1,5).',
    'H/h = {r}: the delivery head is too close to the fall, the recoil no longer reopens the waste valve (in the model, the ram stays shut below 1.5).',
  ],
  sizeWarnLengthShort: [
    'L/h = {r} : conduite plus courte que 3 fois la chute (S6), coups trop rapides et rendement plus faible. Visez au moins {min} m (5 × h, S4).',
    'L/h = {r}: pipe shorter than 3 times the fall (S6), strokes too fast and a lower efficiency. Aim for at least {min} m (5 × h, S4).',
  ],
  sizeWarnLengthS4: [
    'L/h = {r} : sous les 5 fois la chute que demande S4 ({min} m), mais dans l’usage courant (3 à 7 fois, S6).',
    'L/h = {r}: under the 5 times the fall that S4 asks for ({min} m), but within common practice (3 to 7 times, S6).',
  ],
  sizeNote: [
    'Ordres de grandeur de NC State (S4, tableau 2 : les conditions du tableau ne sont pas précisées) et de Wikipédia (S6) : ce n’est pas un plan de réalisation. Le refoulé est q = η·Q·h/H. La simulation modélise un bélier de 1″.',
    'Orders of magnitude from NC State (S4, table 2: the conditions of the table are not stated) and Wikipedia (S6): this is not a build plan. The delivery is q = η·Q·h/H. The simulation models a 1″ ram.',
  ],

  // ---- "test" buttons on the part sheets
  actNutIn: ['Visser l’écrou −0,1 mm', 'Turn the nut in −0.1 mm'],
  actNutInTitle: [
    'Un dixième de tour d’une tige de 6 mm : la course diminue, le bélier consomme moins d’eau et frappe plus vite, jusqu’à ne plus rien refouler.',
    'A tenth of a turn of a 6 mm rod: the stroke shrinks, the ram uses less water and strikes faster, until it delivers nothing.',
  ],
  actNutOut: ['Dévisser l’écrou +0,1 mm', 'Turn the nut out +0.1 mm'],
  actNutOutTitle: [
    'La course augmente : le bélier consomme plus d’eau et frappe moins vite.',
    'The stroke grows: the ram uses more water and strikes more slowly.',
  ],
  actDrown: ['Noyer la cloche', 'Drown the chamber'],
  actDrownTitle: [
    'Toute l’air de la cloche disparaît : les coups deviennent plus durs et le refoulé baisse.',
    'All the air of the chamber is gone: the strokes get harsher and the delivery falls.',
  ],
  actRefill: ['Remettre de l’air', 'Refill with air'],
  actRefillTitle: ['La cloche retrouve son coussin d’air.', 'The chamber gets its air cushion back.'],
  actBlock: ['Boucher le reniflard ×3600', 'Block the snifter ×3600'],
  actBlockTitle: [
    'L’air de la cloche se dissout lentement : le temps passe à ×3600 pour voir la cloche se noyer en quelques secondes.',
    'The air of the chamber slowly dissolves: time runs at ×3600 so that you see the chamber flood within seconds.',
  ],
  actUnblock: ['Débloquer le reniflard', 'Unblock the snifter'],
  actUnblockTitle: [
    'Le reniflard laisse de nouveau entrer l’air à chaque recul.',
    'The snifter lets air in at every recoil again.',
  ],
  actHold: ['Tenir le clapet fermé', 'Hold the valve shut'],
  actHoldTitle: [
    'Simulation seulement : ne mettez jamais un doigt dans le clapet d’un bélier qui tourne. Le clapet tenu fermé, la colonne s’arrête et le bélier avec elle.',
    'A simulation only: never put a finger in the valve of a running ram. With the valve held shut the column stops, and the ram with it.',
  ],
  actRelease: ['Relâcher et relancer', 'Let go and restart'],
  actReleaseTitle: [
    'Le clapet est poussé une fois, le bélier repart.',
    'The valve is pushed once and the ram starts again.',
  ],
  actCloseGate: ['Fermer la vanne ×600', 'Close the gate valve ×600'],
  actCloseGateTitle: [
    'Plus d’eau dans la conduite motrice : le bélier s’arrête et la réserve se remplit (le temps passe à ×600 pour la voir monter).',
    'No more water in the drive pipe: the ram stops and the tank fills (time runs at ×600 so that you see it rise).',
  ],
  actOpenGate: ['Rouvrir la vanne', 'Open the gate valve'],
  actOpenGateTitle: [
    'L’eau redescend et le bélier repart de lui-même.',
    'The water comes down again and the ram starts by itself.',
  ],
  actOpenDrain: ['Ouvrir la vidange ×600', 'Open the drain ×600'],
  actOpenDrainTitle: [
    'La réserve se vide en 40 minutes environ (le temps passe à ×600). Le clapet n°1 s’en moque, le n°3 s’arrête faute d’eau.',
    'The tank empties in about 40 minutes (time runs at ×600). Valve n°1 does not care, valve n°3 stops for lack of water.',
  ],
  actCloseDrain: ['Fermer la vidange', 'Close the drain'],
  actCloseDrainTitle: ['La réserve ne se vide plus.', 'The tank no longer empties.'],

  // ---- sources panel and guides (data role): wording shared by the notes of the lab
  legal: [
    'En France, prélever l’eau d’une source ou d’un cours d’eau est réglementé (droit d’eau, continuité écologique) : renseignez-vous auprès de la DDT (direction départementale des territoires) et de l’OFB (Office français de la biodiversité) avant tout projet. L’eau d’une source n’est pas garantie potable : faites-la analyser avant de la boire. Les règles diffèrent d’un pays à l’autre : renseignez-vous sur place.',
    'In France, taking water from a spring or a stream is regulated (water rights, ecological continuity): check with the DDT (departmental land directorate) and the OFB (French biodiversity office) before any project. Spring water is not guaranteed potable: have it tested before drinking it. Rules differ from one country to another: check locally.',
  ],
  safety: [
    'Un bélier ne coûte rien à faire tourner, mais ses coups atteignent plusieurs bars : conduite motrice rigide (acier, fonte), bélier ancré, manomètre côté refoulement, et jamais un doigt dans le clapet de choc quand il tourne.',
    'A ram costs nothing to run, but its strokes reach several bar: a rigid drive pipe (steel, cast iron), an anchored ram, a pressure gauge on the delivery side, and never a finger in the waste valve while it runs.',
  ],
  genericRam: [
    'Le bélier montré est un bélier générique de 1″, pas le Walton n°3 de la vidéo : aucune fiche du constructeur n’a été trouvée, donc les dimensions du corps sont des estimations. Seul le clapet de choc suit la vidéo.',
    'The ram shown is a generic 1″ ram, not the Walton n°3 of the video: no maker data sheet was found, so the body dimensions are estimates. Only the waste valve follows the video.',
  ],
  chapters: ['Chapitres de la vidéo', 'Video chapters'],
} as const satisfies Record<string, readonly [string, string]>;

registerStrings(LAB);

/** The lab's own strings, `key: [fr, en]` (read by the parity test of src/panels/strings.test.ts). */
export const UI_STRINGS: Record<string, readonly [string, string]> = LAB;

export type UiKey = keyof typeof LAB | CommonKey;

export { colon } from '@onigam/lab-kit/i18n';

export function t(key: UiKey): string {
  return tx(key);
}

/** A string with `{name}` placeholders filled in (the numbers are formatted by the caller with `num`). */
export function tf(key: UiKey, vars: Record<string, string | number>): string {
  return tx(key).replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''));
}

/** Number with the decimal separator of the interface language (7,5 in French, 7.5 in English). */
export function num(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '—';
  if (Math.round(Math.abs(value) * 10 ** digits) === 0) value = 0; // no "-0,0" for tiny negatives
  return value.toLocaleString(getLang() === 'fr' ? 'fr-FR' : 'en-GB', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
