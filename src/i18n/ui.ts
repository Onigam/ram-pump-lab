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
    'Planches A3 tracées d’après les cotes du bélier du laboratoire.',
    'A3 sheets drawn from the dimensions of the lab’s ram.',
  ],
  lessonsIntro: [
    'Six leçons, à lire dans l’ordre (environ 3 minutes chacune) : chacune ouvre la 3D ou la simulation sur ce dont elle parle, puis un quiz de deux questions. Les premières expliquent le principe, les dernières les réglages, le dimensionnement et le choix du site.',
    'Six lessons, to read in order (about 3 minutes each): each opens the 3D view or the simulation on what it talks about, then a two-question quiz. The first ones explain the principle, the last ones the tuning, the sizing and the choice of site.',
  ],
  groupDevice: ['Dispositif', 'Device'],
  disclaimer: [
    'Reconstitution pédagogique indépendante. Ce n’est pas un plan officiel.',
    'Independent educational reconstruction. It is not an official drawing.',
  ],

  // ---- simulation panel: what it is for, the story of the video, presets, scenarios
  simTitle: ['Simulation', 'Simulation'],
  simIntro: [
    'Ici, vous réglez le bélier du site de la vidéo : changez le clapet, jouez une panne ou réglez le site, et suivez les chiffres de la barre du bas. Pour voir ce qui se passe à chaque coup, ouvrez « Le cycle, pas à pas » juste en dessous.',
    'Here you run the ram of the video’s site: change the valve, play a fault or set up the site, and follow the figures in the bottom bar. To see what happens at each stroke, open “The cycle, step by step” just below.',
  ],
  story: ['L’histoire de la vidéo', 'The video’s story'],
  preset: ['Préréglage', 'Preset'],
  presetHint: [
    'D’après la vidéo, le clapet n°3 prend plus d’eau que la source n’en donne : la réserve se vide en une dizaine d’heures et le bélier s’arrête. Le n°1 en prend moins et refoule environ 500 L par jour. Avec le n°3 ou le n°2, le temps accélère tout seul pour que vous voyiez la réserve baisser.',
    'According to the video, the No. 3 valve takes more water than the spring gives: the tank empties in about ten hours and the ram stops. The No. 1 takes less and delivers about 500 L a day. With the No. 3 or the No. 2, time speeds up by itself so that you can watch the tank fall.',
  ],
  presetValve3: ['Clapet n°3 : consomme trop', 'Valve No. 3: uses too much water'],
  presetValve2: ['Clapet n°2 : fonctionne mal', 'Valve No. 2: works badly'],
  presetValve1: ['Clapet n°1 : 500 L par jour', 'Valve No. 1: 500 L a day'],
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
  scenarioHeavyWeight: ['Poids doublé', 'Doubled weight'],
  scenarioPrompt: [
    'Un scénario met le bélier dans une situation et dit ce qu’il faut regarder.',
    'A scenario puts the ram in a situation and says what to look at.',
  ],
  scenarioHint: [
    'Les scénarios accélèrent le temps tout seuls pour qu’on voie les heures passer. Pour revoir les coups, revenez à ×1 en bas de l’écran et activez Ralenti.',
    'Scenarios speed time up by themselves so that you can watch the hours go by. To see the strokes again, go back to ×1 at the bottom of the screen and switch on Slow-mo.',
  ],
  capSourceDrop: [
    'La source passe de 10 à 7,5 L/min au bout d’une heure, avec le clapet n°3. Regardez la courbe « Niveau de la réserve tampon » : elle tombe à zéro et le bélier s’arrête.',
    'The spring falls from 10 to 7.5 L/min after an hour, with the No. 3 valve. Watch the “Buffer tank level” curve: it falls to zero and the ram stops.',
  ],
  capStrokeNut: [
    'Le clapet n°1, dont l’écrou est vissé de 0,1 mm toutes les 10 minutes simulées. Regardez la consommation baisser, puis le refoulé tomber à zéro sous la course minimale.',
    'Valve No. 1, its nut turned in 0.1 mm every 10 simulated minutes. Watch the drive flow fall, then the delivery drop to zero below the minimum stroke.',
  ],
  capWaterLogged: [
    'La cloche n’a plus d’air. Regardez « Dernier pic » (dans « Plus de chiffres ») et le refoulé : les coups sont plus durs (plus de 7 bar) et on refoule environ 40 % de moins (résultats du modèle).',
    'The chamber has no air left. Watch “Last peak” (in “More figures”) and the delivery: harder strokes (over 7 bar) and about 40% less delivered (model results).',
  ],
  capShortPipe: [
    'Une conduite motrice de 8 m seulement pour 7,5 m de chute. Regardez la cadence (plus rapide) et l’alerte « Conduite trop courte ».',
    'A drive pipe of only 8 m for a 7.5 m fall. Watch the stroke rate (faster) and the “Drive pipe too short” alarm.',
  ],
  capHighLift: [
    'On veut monter à 100 m avec la même chute (H/h = 13). Regardez l’alerte « Refoulement trop haut » : dans le modèle, le bélier ne refoule plus.',
    'The water must go up 100 m with the same fall (H/h = 13). Watch the “Delivery head too high” alarm: in the model the ram no longer delivers.',
  ],
  capSnifterBlocked: [
    'Le reniflard ne laisse plus entrer d’air. Le temps passe à ×3600 : regardez « Air (cloche) » (dans « Plus de chiffres ») baisser pendant des heures, puis le refoulé chuter.',
    'The snifter no longer lets air in. Time runs at ×3600: watch “Chamber air” (in “More figures”) fall over hours, then the delivery drop.',
  ],
  capPlasticPipe: [
    'Conduite en PVC au lieu d’acier. Le clapet se ferme aussi vite mais le choc ρ·a·v est plus faible : lisez le message en rouge, le bélier frappe sans rien refouler (résultat du modèle, pour une vitesse d’onde supposée).',
    'A PVC drive pipe instead of steel. The valve closes just as fast but the surge ρ·a·v is weaker: read the red message, the ram strikes without delivering (model result, for an assumed wave speed).',
  ],
  capHeavyWeight: [
    'Un poids deux fois plus lourd (720 g). Regardez la consommation dépasser la source, puis la réserve se vider.',
    'A weight twice as heavy (720 g). Watch the drive flow exceed the spring, then the tank empty.',
  ],

  // ---- status line
  statusRunning: ['Le bélier tourne.', 'The ram is running.'],
  statusDraining: [
    'Il prend plus d’eau que la source n’en donne : la réserve se vide.',
    'It takes more water than the spring gives: the buffer tank is draining.',
  ],
  statusEmptyIn: ['Réserve vide dans', 'Tank empty in'],
  statusStalledTank: [
    'Arrêté : la réserve s’est vidée, plus d’eau ne descend dans la conduite. Dans la vidéo, le bélier devait alors être relancé à la main.',
    'Stopped: the tank ran dry and no more water comes down the pipe. In the video the ram then had to be restarted by hand.',
  ],
  statusStalledStuck: [
    'Arrêté : le clapet de choc reste fermé ; le recul est trop faible pour le rouvrir (refoulement trop proche de la chute).',
    'Stopped: the waste valve stays shut; the recoil is too weak to reopen it (delivery head too close to the fall).',
  ],
  statusNoDelivery: [
    'Le bélier frappe mais ne refoule rien : quand le clapet se ferme, l’eau va trop lentement (ou la hauteur est trop grande) pour que le coup de bélier ouvre le clapet de refoulement.',
    'The ram strikes but delivers nothing: when the valve shuts, the water is moving too slowly (or the head is too high) for the water hammer to open the delivery check valve.',
  ],
  statusSoftPipe: [
    'Conduite trop souple : à {a} m/s, l’onde donne un choc de {surge} bar (ρ·a·v), or il en faut {need} bar pour ouvrir le clapet de refoulement. Le clapet de choc se ferme pourtant à {v} m/s, assez vite pour une conduite rigide (acier, 900 m/s). Le bélier frappe mais ne refoule rien. Ce « rien » est un résultat du modèle pour ce clapet réglé pour l’acier ; Wikipédia note que le PVC fonctionne dans certaines installations, l’acier restant préféré.',
    'Pipe too flexible: at {a} m/s the wave gives a surge of {surge} bar (ρ·a·v), but {need} bar are needed to open the delivery check valve. The waste valve does close at {v} m/s, fast enough for a rigid pipe (steel, 900 m/s). The ram strikes but delivers nothing. That “nothing” is a model result for this valve set for steel; Wikipedia notes that PVC works in some installations, steel remaining preferred.',
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
  driveDiameter: ['Ø intérieur de la conduite motrice', 'Drive pipe inner diameter'],
  pipeMaterial: ['Matière de la conduite motrice', 'Drive pipe material'],
  matSteel: ['Acier', 'Steel'],
  matPvc: ['PVC', 'PVC'],
  matHdpe: ['Polyéthylène', 'Polyethylene'],
  deliveryHead: ['Hauteur de refoulement H', 'Delivery head H'],
  deliveryLength: ['Longueur du refoulement', 'Delivery pipe length'],
  sourceFlow: ['Débit de la source', 'Spring flow'],
  tankVolume: ['Réserve tampon', 'Buffer tank'],
  valve: ['Clapet de choc', 'Waste valve'],
  valveOption1: ['n°1 · DN15', 'No. 1 · DN15'],
  valveOption2: ['n°2 · DN20', 'No. 2 · DN20'],
  valveOption3: ['n°3 · DN25', 'No. 3 · DN25'],
  stroke: ['Course (écrou de réglage)', 'Stroke (stroke nut)'],
  counterweight: ['Poids du clapet', 'Valve weight'],
  chamberVolume: ['Cloche à air', 'Air chamber'],
  waterLogged: ['Cloche noyée (plus d’air)', 'Water-logged (no air left)'],
  snifterBlocked: ['Reniflard bouché', 'Snifter blocked'],
  valveHint: [
    'Changer de clapet recharge sa course et son poids, calibrés sur les chiffres de la vidéo (la vidéo ne donne pas ces réglages).',
    'Changing the valve loads its stroke and weight, calibrated on the figures of the video (the video does not give these settings).',
  ],

  // ---- live readouts (the six main ones, then the nine behind "More figures"); labels stay under 16 characters
  readouts: ['Les chiffres', 'The figures'],
  moreFigures: ['Plus de chiffres', 'More figures'],
  readFigures: ['Lire les chiffres', 'Reading the figures'],
  readoutsHelp: [
    '**Coups/min** : combien de fois par minute le clapet de choc claque.\n\n**Consommation** (Q) : l’eau qui descend de la réserve dans la conduite motrice.\n\n**Eau rejetée** : la part qui ressort par le clapet de choc ; c’est elle qui fait le travail.\n\n**Refoulé q** : l’eau qui monte au château d’eau, par minute puis par jour.\n\n**Rendement** : énergie de l’eau montée divisée par celle de l’eau prise (rendement d’Aubuisson). **η Rankine** : le même rapport, en ne comptant que l’eau rejetée comme eau qui tombe.\n\nDans « Plus de chiffres » : **Vit. fermeture**, la vitesse de l’eau quand le clapet claque ; **Vit. minimale**, celle qu’il faut pour ouvrir le clapet de refoulement ; **Choc ρ·a·v**, la surpression du coup de bélier si l’eau ne pouvait pas s’échapper ; **Dernier pic**, la plus haute pression du corps du bélier atteinte au dernier coup ; **P. cloche**, la pression dans la cloche à air ; **Réserve**, l’eau qui reste dans la cuve tampon ; **Air (cloche)**, la part d’air dans la cloche ; **Vit. de l’onde**, la vitesse du coup de bélier dans la conduite (valeur du modèle). 1 bar ≈ 10 m de hauteur d’eau.',
    '**Strokes/min**: how many times a minute the waste valve slams.\n\n**Drive flow** (Q): the water that comes down from the tank into the drive pipe.\n\n**Waste flow**: the share that leaves through the waste valve; it is what does the work.\n\n**Delivered q**: the water that rises to the water tower, per minute and then per day.\n\n**Efficiency**: energy of the water lifted divided by that of the water taken (D’Aubuisson efficiency). **η Rankine**: the same ratio, counting only the waste water as the water that falls.\n\nIn “More figures”: **Closing speed**, the water speed when the valve slams; **Speed needed**, the one required to open the delivery check valve; **Surge ρ·a·v**, the water-hammer overpressure if the water could not escape; **Last peak**, the highest pressure reached in the ram body during the last stroke; **Chamber P.**, the pressure in the air chamber; **Buffer tank**, the water left in the tank; **Chamber air**, the share of air in the chamber; **Wave speed**, the speed of the water hammer along the pipe (a model value). 1 bar ≈ 10 m of water height.',
  ],
  liveStrokes: ['Coups/min', 'Strokes/min'],
  liveDrive: ['Consommation', 'Drive flow'],
  liveWaste: ['Eau rejetée', 'Waste flow'],
  liveDelivered: ['Refoulé q', 'Delivered q'],
  liveDeliveredDay: ['Refoulé/jour', 'Delivered/day'],
  liveEtaD: ['Rendement', 'Efficiency'],
  liveEtaR: ['η Rankine', 'η Rankine'],
  liveClosing: ['Vit. fermeture', 'Closing speed'],
  liveClosingMin: ['Vit. minimale', 'Speed needed'],
  liveSurge: ['Choc ρ·a·v', 'Surge ρ·a·v'],
  livePeak: ['Dernier pic', 'Last peak'],
  liveChamber: ['P. cloche', 'Chamber P.'],
  liveTank: ['Réserve', 'Buffer tank'],
  liveAir: ['Air (cloche)', 'Chamber air'],
  liveWave: ['Vit. de l’onde', 'Wave speed'],
  liveRate: ['Cadence', 'Stroke rate'],
  liveDeliveredStrip: ['Refoulé', 'Delivered'],
  liveEfficiency: ['Rendement', 'Efficiency'],
  liveTankStrip: ['Réserve', 'Tank'],
  liveDriveStrip: ['Consommation', 'Drive flow'],
  clockDay: ['Jour', 'Day'],
  unitPerDay: ['L/jour', 'L/day'],
  unitPerMin: ['coups/min', 'strokes/min'],

  // ---- charts
  chartScope: ['Derniers coups : pression du corps (bar)', 'Last strokes: body pressure (bar)'],
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
    'Les trois clapets avec leurs réglages calibrés sur la vidéo, pour le site ci-dessus. Le point est votre réglage actuel.',
    'The three valves with their settings calibrated on the video, for the site above. The dot is your current setting.',
  ],
  chartStroke: ['Consommation selon la course (L/min)', 'Drive flow against the stroke (L/min)'],
  chartStrokeDelivered: ['Eau refoulée selon la course (L/jour)', 'Delivered water against the stroke (L/day)'],
  chartStrokeHint: [
    'Visser l’écrou réduit la consommation, mais en dessous d’une course minimale le bélier ne refoule plus (vidéo, 13:13).',
    'Turning the nut in cuts the drive flow, but below a minimum stroke the ram no longer delivers (video, 13:13).',
  ],
  chartTank: ['Niveau de la réserve tampon (%)', 'Buffer tank level (%)'],
  chartTankHint: [
    'Les 48 dernières heures simulées. Quand la courbe touche zéro, le bélier s’arrête.',
    'The last 48 simulated hours. When the curve reaches zero the ram stops.',
  ],
  sweepBy: ['Courbes selon', 'Curves against'],
  sweepStroke: ['la course', 'the stroke'],
  sweepWeight: ['le poids', 'the weight'],
  chartWeight: ['Consommation selon le poids (L/min)', 'Drive flow against the weight (L/min)'],
  chartWeightDelivered: ['Eau refoulée selon le poids (L/jour)', 'Delivered water against the weight (L/day)'],
  chartWeightHint: [
    'Un poids plus lourd refoule plus d’eau au début, mais consomme bien plus : le refoulé passe par un maximum puis retombe, et au-delà de ≈ 900 g le clapet ne se ferme plus.',
    'A heavier weight delivers more water at first but uses a lot more: the delivery goes through a maximum and then falls, and above ≈ 900 g the valve no longer closes.',
  ],
  seriesValve1: ['Clapet n°1', 'Valve No. 1'],
  seriesValve2: ['Clapet n°2', 'Valve No. 2'],
  seriesValve3: ['Clapet n°3', 'Valve No. 3'],
  seriesConsumption: ['Consommation Q', 'Drive flow Q'],
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
  alarm_pipeShort: ['Conduite trop courte', 'Drive pipe too short'],
  alarm_headHigh: ['Refoulement trop haut', 'Delivery head too high'],
  alarm_waterLogged: ['Cloche noyée', 'Water-logged chamber'],
  alarm_snifterBlocked: ['Reniflard bouché', 'Snifter blocked'],
  alarm_softPipe: ['Conduite trop souple', 'Pipe too flexible'],
  alarm_gateClosed: ['Vanne de départ fermée', 'Gate valve closed'],
  alarm_heldShut: ['Clapet tenu fermé', 'Valve held shut'],
  alarm_drainOpen: ['Vidange ouverte', 'Drain open'],

  // ---- the cycle, step by step
  secCycle: ['Le cycle, pas à pas', 'The cycle, step by step'],
  phaseAccel: ['Accélération', 'Acceleration'],
  phaseClose: ['Fermeture', 'Closing'],
  phaseDeliver: ['Refoulement', 'Delivery'],
  phaseRecoil: ['Recul', 'Recoil'],
  headAccel: [
    'L’eau dévale et s’échappe par le clapet resté ouvert.',
    'The water rushes down and escapes through the open valve.',
  ],
  headClose: [
    'Le clapet claque : l’eau est stoppée net et la pression bondit.',
    'The valve slams: the water is stopped dead and the pressure jumps.',
  ],
  headDeliver: [
    'Le choc ouvre le clapet de refoulement : un peu d’eau entre dans la cloche.',
    'The shock opens the delivery check valve: a little water goes into the chamber.',
  ],
  headRecoil: [
    'L’eau rebondit en arrière, le clapet de choc se rouvre : tout recommence.',
    'The water bounces back and the waste valve reopens: it all starts again.',
  ],
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
  cardValve: ['Clapet de choc', 'Waste valve'],
  cardCheck: ['Clapet refoul.', 'Delivery valve'],
  cardSpeed: ['Vitesse eau', 'Water speed'],
  cardBody: ['P. du corps', 'Body P.'],
  cardJet: ['Jet du clapet', 'Waste jet'],
  cardInto: ['Vers la cloche', 'Into chamber'],
  cardInPhase: ['Temps écoulé', 'Elapsed time'],
  descAccel: [
    'Le clapet de choc est ouvert, retombé sur son écrou. L’eau de la conduite motrice, entraînée par la chute de {h} m, accélère et s’échappe par le clapet ({v} m/s, jet de {jet} L/min). Plus elle va vite, plus elle pousse le clapet vers sa portée. Le clapet de refoulement est fermé : rien n’est refoulé.',
    'The waste valve is open, resting on its nut. The water in the drive pipe, pulled by the {h} m fall, speeds up and runs out through the valve ({v} m/s, a jet of {jet} L/min). The faster it goes, the harder it pushes the valve towards its seat. The delivery check valve is shut: nothing is delivered.',
  ],
  descClose: [
    'Le jet a vaincu le poids : le clapet de choc vient de claquer sur sa portée. La colonne d’eau, lancée à {vc} m/s, est stoppée net : c’est le coup de bélier. La pression du corps monte à {p} bar, jusqu’à celle du refoulement ({head} bar) ; si elle ne pouvait pas s’échapper, le choc serait de {surge} bar (ρ·a·v).',
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
  sizeLoad: ['Reprendre le site simulé', 'Use the simulated site'],
  sizeApply: ['Essayer dans la simulation', 'Try it in the simulation'],
  sizeMinLength: ['Conduite minimale', 'Minimum pipe'],
  sizeUsualLength: ['Longueur courante', 'Usual length'],
  sizeTable: ['Tableau NC State pour', 'NC State table for'],
  sizeDelivery: ['Refoulé attendu (η {eta})', 'Expected delivery (η {eta})'],
  sizeDeliveryLive: ['Avec le η de la simulation ({eta})', 'With the simulation’s η ({eta})'],
  sizeVerdictOk: [
    'Source suffisante : {src} L/min contre {min} L/min demandés par une conduite de {pipe}.',
    'The spring is enough: {src} L/min against the {min} L/min that a {pipe} drive pipe asks for.',
  ],
  sizeVerdictShort: [
    'Source insuffisante : {src} L/min contre {min} L/min demandés par une conduite de {pipe} ({pct} %).',
    'The spring is too small: {src} L/min against the {min} L/min that a {pipe} drive pipe asks for ({pct} %).',
  ],
  sizeTipSmaller: [
    'Une conduite de {pipe} conviendrait à cette source. Sinon, comme dans la vidéo, réglez le clapet pour qu’il consomme moins d’eau que la source n’en donne (préréglage « Clapet n°1 »).',
    'A {pipe} pipe would suit this spring. Otherwise, as in the video, tune the valve so that it uses less than the spring gives (the “Valve No. 1” preset).',
  ],
  sizeTipNone: [
    'Aucun diamètre du tableau ne convient : la source donne moins que les {min} L/min du plus petit. Comme dans la vidéo, il faut régler le clapet pour qu’il consomme moins d’eau que la source n’en donne (préréglage « Clapet n°1 »).',
    'None of the sizes in the table fits: the spring gives less than the {min} L/min of the smallest. As in the video, the valve has to be tuned to use less than the spring gives (the “Valve No. 1” preset).',
  ],
  sizeWarnHeadHigh: [
    'H/h = {r} : au-delà d’environ 12, le bélier du modèle (clapet n°1 réglé comme dans la vidéo) ne refoule plus. La vidéo parle d’environ 10 m de refoulement par mètre de chute, et Practical Action donne des performances de béliers du commerce jusqu’à H/h = 20 : la limite dépend du réglage et de la taille.',
    'H/h = {r}: above about 12, the model’s ram (No. 1 valve set as in the video) no longer delivers. The video talks of about 10 m of lift per metre of fall, and Practical Action gives the performance of commercial rams up to H/h = 20: the limit depends on the setting and the size.',
  ],
  sizeWarnHeadLow: [
    'H/h = {r} : le refoulement est trop près de la chute, le recul ne rouvre plus le clapet de choc (dans le modèle, le bélier reste bloqué sous 1,5).',
    'H/h = {r}: the delivery head is too close to the fall, the recoil no longer reopens the waste valve (in the model, the ram stays shut below 1.5).',
  ],
  sizeWarnLengthShort: [
    'L/h = {r} : conduite plus courte que 3 fois la chute (Wikipédia), coups trop rapides et rendement plus faible. Visez au moins {min} m (5 × h, NC State).',
    'L/h = {r}: pipe shorter than 3 times the fall (Wikipedia), strokes too fast and a lower efficiency. Aim for at least {min} m (5 × h, NC State).',
  ],
  sizeWarnLengthS4: [
    'L/h = {r} : sous les 5 fois la chute que demande NC State ({min} m), mais dans l’usage courant (3 à 7 fois, Wikipédia).',
    'L/h = {r}: under the 5 times the fall that NC State asks for ({min} m), but within common practice (3 to 7 times, Wikipedia).',
  ],
  sizeNote: [
    'Ordres de grandeur de NC State (tableau 2 : les conditions du tableau ne sont pas précisées) et de Wikipédia : ce n’est pas un plan de réalisation. Le refoulé est q = η·Q·h/H. La simulation modélise un bélier de 1″.',
    'Orders of magnitude from NC State (table 2: the conditions of the table are not stated) and Wikipedia: this is not a build plan. The delivery is q = η·Q·h/H. The simulation models a 1″ ram.',
  ],

  // ---- "test" buttons on the part sheets: the label, a tooltip, and a line saying what to look at
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
    'Tout l’air de la cloche disparaît : les coups deviennent plus durs et le refoulé baisse.',
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
    'Simulation only: never put a finger in the valve of a running ram. With the valve held shut the column stops, and the ram with it.',
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
    'L’eau redescend et le bélier repart de lui-même (hypothèse du modèle ; sur le terrain, il faudra peut-être le relancer à la main).',
    'The water comes down again and the ram starts by itself (model assumption; in the field it may need a hand restart).',
  ],
  actOpenDrain: ['Ouvrir la vidange ×600', 'Open the drain ×600'],
  actOpenDrainTitle: [
    'La réserve se vide en 40 minutes environ (vidange de 150 L/min supposée ; le temps passe à ×600). Le clapet n°1 s’en moque, le n°3 s’arrête faute d’eau.',
    'The tank empties in about 40 minutes (a 150 L/min drain assumed; time runs at ×600). Valve No. 1 does not care, valve No. 3 stops for lack of water.',
  ],
  actCloseDrain: ['Fermer la vidange', 'Close the drain'],
  actCloseDrainTitle: ['La réserve ne se vide plus.', 'The tank no longer empties.'],
  hintAirChamber: [
    'Regardez l’eau envahir la cloche, puis le refoulé par jour baisser dans la barre du bas (environ 40 % de moins, résultat du modèle) et l’alerte « Cloche noyée » s’allumer.',
    'Watch the water fill the chamber, then the delivery per day fall in the bottom bar (about 40% less, model result) and the “Water-logged chamber” alarm light up.',
  ],
  hintSnifter: [
    'Regardez le niveau d’eau monter dans la cloche pendant des heures simulées, puis le refoulé chuter dans la barre du bas.',
    'Watch the water level rise in the chamber over simulated hours, then the delivery drop in the bottom bar.',
  ],
  hintWasteValve: [
    'Regardez le jet s’arrêter et le bélier avec lui (alerte « Clapet tenu fermé »). Simulation seulement : jamais un doigt dans le clapet d’un bélier qui tourne.',
    'Watch the jet stop and the ram with it (“Valve held shut” alarm). A simulation only: never a finger in the valve of a running ram.',
  ],
  hintDriveGate: [
    'Regardez la réserve se remplir dans la barre du bas pendant que le bélier s’arrête.',
    'Watch the tank fill in the bottom bar while the ram stops.',
  ],
  hintTankDrain: [
    'Regardez la réserve baisser dans la barre du bas : avec le clapet n°3 le bélier s’arrête faute d’eau, le n°1 continue.',
    'Watch the tank level fall in the bottom bar: with the No. 3 valve the ram stops for lack of water, the No. 1 carries on.',
  ],
  hintStrokeNut: [
    'Regardez la consommation baisser et la cadence monter dans la barre du bas ; sous la course minimale, le refoulé tombe à zéro.',
    'Watch the drive flow fall and the stroke rate rise in the bottom bar; below the minimum stroke the delivery drops to zero.',
  ],

  // ---- sources panel and guides (data role): wording shared by the notes of the lab
  legal: [
    'En France, prélever l’eau d’une source ou d’un cours d’eau est réglementé (droit d’eau, continuité écologique) : renseignez-vous auprès de la DDT (direction départementale des territoires) et de l’OFB (Office français de la biodiversité) avant tout projet. L’eau d’une source n’est pas garantie potable : faites-la analyser avant de la boire. Les règles diffèrent d’un pays à l’autre : renseignez-vous sur place.',
    'In France, taking water from a spring or a stream is regulated (water rights, ecological continuity): check with the DDT (departmental land directorate) and the OFB (French biodiversity office) before any project. Spring water is not guaranteed potable: have it tested before drinking it. Rules differ from one country to another: check locally.',
  ],
  safety: [
    'Un bélier ne coûte rien à faire tourner, mais ses coups atteignent plusieurs bars. Prévoyez une conduite motrice rigide (acier, fonte), un bélier ancré et un manomètre côté refoulement, et ne mettez jamais un doigt dans le clapet de choc quand il tourne.',
    'A ram costs nothing to run, but its strokes reach several bars. Use a rigid drive pipe (steel, cast iron), an anchored ram and a pressure gauge on the delivery side, and never put a finger in the waste valve while it runs.',
  ],
  genericRam: [
    'Le bélier montré est un bélier générique de 1″, pas le Walton n°3 de la vidéo : aucune fiche du constructeur n’a été trouvée, donc les dimensions du corps sont des estimations. Seul le clapet de choc suit la vidéo.',
    'The ram shown is a generic 1″ ram, not the Walton No. 3 of the video: no maker data sheet was found, so the body dimensions are estimates. Only the waste valve follows the video.',
  ],
  chapters: ['Sommaire de la vidéo', 'Video outline'],
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
