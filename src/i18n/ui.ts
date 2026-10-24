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
  lessonsIntro: ['Leçons courtes liées à la 3D.', 'Short lessons tied to the 3D view.'],
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
  liveDrive: ['Débit moteur Q', 'Drive flow Q'],
  liveWaste: ['Perdu au clapet', 'Lost at the valve'],
  liveDelivered: ['Refoulé q', 'Delivered q'],
  liveDeliveredDay: ['Refoulé par jour', 'Delivered a day'],
  liveEtaD: ['η d’Aubuisson', 'η D’Aubuisson'],
  liveEtaR: ['η Rankine', 'η Rankine'],
  liveClosing: ['V. fermeture', 'Closing speed'],
  liveClosingMin: ['V. min. requise', 'Min. speed'],
  liveSurge: ['Choc ρ·a·v', 'Surge ρ·a·v'],
  liveBody: ['P. du corps', 'Body pressure'],
  liveChamber: ['P. de la cloche', 'Chamber press.'],
  liveTank: ['Réserve tampon', 'Buffer tank'],
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

export type UiKey = keyof typeof LAB | CommonKey;

export { colon } from '@onigam/lab-kit/i18n';

export function t(key: UiKey): string {
  return tx(key);
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
