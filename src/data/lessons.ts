// The six lessons of the lab (docs/research.md §11, wave 3b), each with a 3D or simulation focus and two quiz questions.
//
// Who says what. A figure of a lesson is either REPORTED (the video S1, the NC State table S4, Wikipedia S6, the NITK page
// S5: named in the text), DERIVED (computed from reported figures or from src/three/dims.ts), a MODEL RESULT (an output of
// src/sim for the preset or the scenario the lesson opens: the text says « dans le modèle / in the model ») or an
// ASSUMPTION of the model (the text says so). The numbers are written once, in FIG (the sheets' table, parts/site.ts) and
// in LESSON_FIG below, and placed in the French and the English text through {name} placeholders, so that the two
// languages cannot drift apart; lessons.test.ts re-runs the engine and checks every one of them.
//
// What the video does not show must not be said to be shown: the catchment, the snifter, the gauge, the strainer, the
// valves V1–V3, the union and the foundation are common practice (the lab draws them), and nothing here says that the fins
// turn the valve (unproven) or that the video gives the 5 700 L of the tank (derived from its ten hours). The private
// transcript is only used to check what the video says and where; none of its wording is copied.

import type { Lesson, Spec } from '@onigam/lab-kit/content';
import { l, type L } from '@onigam/lab-kit/i18n';
import { WAVE_SPEED } from '../sim/physics';
import { SOURCE_FLOW_TODAY } from '../sim/presets';
import { LENGTH_RATIO_S4, PIPE_SIZES, TYPICAL_ETA } from '../sim/sizing';
import { CHAMBER, SITE } from '../three/dims';
import { MODEL as RAM } from './parts/ram';
import { FIG } from './parts/site';
import { nEn, nFr } from './units';

type Fig = readonly [value: number, decimals: number];

/**
 * Numbers of the lessons that the sheets' FIG table does not hold, as [value, decimals] (the value is the one the text
 * shows, rounded as written: lessons.test.ts compares each with the engine, the dims or the sources within that rounding).
 */
export const LESSON_FIG = {
  // ---- derived from dims.ts and the reported figures (K1, K2, K3, K6, K10, K13, K14, K18, K20, K21)
  liftRatio: [SITE.deliveryHead / SITE.fall, 1], // H/h = 65 / 7.5 (K3 / K1)
  lenRatio: [SITE.driveLength / SITE.fall, 1], // L/h = 20 / 7.5 (K2 / K1), K20
  minLen: [LENGTH_RATIO_S4 * SITE.fall, 1], // 5 × 7.5 m (S4: at least 5 times the fall)
  ceilingLpm: [(SOURCE_FLOW_TODAY * SITE.fall) / SITE.deliveryHead, 2], // q ≤ Q·h/H with Q = 7.5 L/min (K14)
  ceilingDay: [1250, 0], // the same in L/day, 1 246 rounded as in K14
  ceilingPct: [40, 0], // 500 L/day out of the ceiling, % (K18: η ≈ 0.4)
  eta04: [0.4, 1], // the same as an efficiency
  etaLow: [0.3, 1], // implied by the video for a drive flow of 10 L/min (K13)
  etaHigh: [0.6, 1], // implied by the video for a drive flow of 5 L/min (K13)
  sourcePct: [33, 0], // spring 7.5 L/min out of the 22.7 of a 1" ram, % (K21)
  min34: [PIPE_SIZES[0].minSourceLpm, 1], // S4 table 2: a 3/4" ram asks for 7.6 L/min (K21)
  calcDay: [750, 0], // q = η·Q·h/H with η = 0.6, Q = 7.5 L/min: 748 L/day (K18)
  // ---- reported by a source
  etaTypical: [TYPICAL_ETA, 1], // S4 (E = 0.6), S6 (60 %), K17
  etaMax: [0.8, 1], // S6, K17
  // ---- assumptions of the model (the video is silent)
  bore: [SITE.driveBore * 1000, 0], // drive pipe inner diameter, mm (a 1" ram)
  chamberL: [CHAMBER.volumeL, 0], // air chamber volume, L
  airPct: [60, 0], // air share of the chamber at working pressure, %
  waveSteel: [WAVE_SPEED.steel, 0], // wave speed in the model's steel drive pipe, m/s (calibrated)
  pvcA: [WAVE_SPEED.pvc, 0], // wave speed assumed for the PVC drive pipe of the scenario, m/s
  refillMin: [RAM.refillMinutes, 0], // time constant of the chamber refill by the snifter, min
  // ---- model results, preset valve n°1 (docs/physics.md §5–6, §8)
  strokes: [RAM.strokesPerMin, 0], // strokes/min (K11: 100–110)
  slamMs: [18, 0], // closing time of the waste valve, ms
  vc: [RAM.closingVelocity, 2], // water speed when the valve closes, m/s
  surge: [7.8, 1], // ρ·a·v at that speed, bar
  deliverShare: [RAM.deliverSharePct, 0], // share of the stroke with the check valve open, %
  ml: [RAM.mlPerStroke, 1], // mL pushed into the chamber per stroke (K12: 3.2–3.5)
  takenPerL: [19, 0], // litres taken from the tank for 1 L delivered
  swing: [0.012, 2], // pressure swing of the chamber per stroke, bar
  etaD: [RAM.etaD, 2], // D'Aubuisson efficiency
  etaR: [0.42, 2], // Rankine efficiency
  // ---- model results, stroke and weight (valve n°1)
  s3: [3, 0], // a long stroke, mm
  q3: [RAM.longStrokeFlow, 1], // L/min taken at 3 mm
  d3: [RAM.longStrokePerDay, 0], // L/day delivered at 3 mm
  s22: [2.2, 1], // the calibrated stroke, mm
  s15: [RAM.noDeliveryStroke, 1], // stroke at which the delivery stops, mm
  s23: [RAM.springLimitStroke, 1], // stroke at which the valve takes the whole spring, mm
  turns: [0.8, 1], // the window between the two, in turns of the 1 mm thread (derived from the two strokes)
  w720: [720, 0], // the heavier counterweight of the scenario, g
  spm75: [RAM.heavyWeightStrokes, 0], // strokes/min with it
  q155: [RAM.heavyWeightFlow, 1], // L/min taken with it
  d788: [RAM.heavyWeightPerDay, 0], // L/day delivered with it
  hoursHeavy: [12, 0], // hours for the tank to empty with it
  // ---- model results, other scenarios
  wlPerDay: [300, 0], // L/day with a water-logged chamber (295)
  wlDropPct: [40, 0], // % less than the 500 L/day (41)
  loggedHours: [RAM.loggedHours, 0], // hours for a blocked snifter to water-log the chamber
  shortLen: [8, 0], // m of drive pipe of the `short-pipe` scenario
  shortSpm: [259, 0], // strokes/min with it
  shortQ: [8.2, 1], // L/min taken with it
  zeroHead: [90, 0], // m of delivery head from which valve n°1 delivers nothing
  zeroRatio: [12, 0], // the same as H/h
  d75: [230, 0], // L/day delivered at H = 75 m
  pvcSurge: [4.4, 1], // surge of the PVC drive pipe, bar
  pvcVc: [0.89, 2], // water speed at the closing with it, m/s
  need: [5.6, 1], // surge the check valve needs at H = 65 m: ρ·g·(H − h), bar
  thrustN: [370, 0], // push of the body at each stroke, N (372)
  kg: [38, 0], // the same as the weight of a mass, kg
} as const satisfies Record<string, Fig>;

const N: Record<string, Fig> = { ...FIG, ...LESSON_FIG };

/** Every {name} that a text has used, for the test that checks that each one has been compared with the model. */
export const USED_FIGURES = new Set<string>();

function fill(text: string, lang: 'fr' | 'en'): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => {
    const fig = N[key];
    if (!fig) throw new Error(`unknown figure {${key}} in "${text}"`);
    USED_FIGURES.add(key);
    return lang === 'fr' ? nFr(fig[0], fig[1]) : nEn(fig[0], fig[1]);
  });
}

/** Bilingual text whose {placeholders} are numbers of FIG or LESSON_FIG, written the French way and the English way. */
function lx(fr: string, en: string): L {
  return l(fill(fr, 'fr'), fill(en, 'en'));
}

/** Key-figure chip: a short label and a short value (the value is shown in a monospace 17 px font). */
function chip(labelFr: string, labelEn: string, valueFr: string, valueEn: string = valueFr): Spec {
  return { label: lx(labelFr, labelEn), value: lx(valueFr, valueEn) };
}

export const LESSONS: Lesson[] = [
  // ------------------------------------------------------------------------------------------------ 1. principle
  {
    id: 'principle',
    title: l('Le principe : tomber un peu, monter beaucoup', 'The principle: fall a little, lift a lot'),
    summary: l(
      'Beaucoup d’eau qui tombe de quelques mètres en fait monter un peu bien plus haut, sans moteur.',
      'A lot of water falling a few metres lifts a little water much higher, with no motor.',
    ),
    body: [
      lx(
        'Un **bélier hydraulique** n’a ni moteur ni carburant : il n’utilise que l’énergie de l’eau qui tombe. Sur le site de la vidéo, la source est à **{fall} m** au-dessus du bélier, et celui-ci envoie une petite part de cette eau à **{lift} m** de haut, par une conduite d’environ {deliveryLen} m. L’eau monte donc {liftRatio} fois plus haut qu’elle n’est tombée.',
        'A **hydraulic ram** has no motor and burns no fuel: it only uses the energy of falling water. On the video’s site the spring sits **{fall} m** above the ram, and the ram sends a small share of that water up to **{lift} m**, through a pipe of about {deliveryLen} m. So the water rises {liftRatio} times higher than it fell.',
      ),
      lx(
        'Rien n’est créé : c’est un **échange d’énergie**. Un débit Q qui tombe de la hauteur h libère une énergie proportionnelle à Q·h ; un débit q monté à la hauteur H en demande q·H. Pour monter 1 L à {lift} m, il faut donc qu’au moins {liftRatio} L tombent de {fall} m, et c’est l’eau jetée en bas qui paie la note.',
        'Nothing is created: it is an **energy swap**. A flow Q falling through a height h releases an amount of energy proportional to Q·h; a flow q lifted to height H takes q·H. To lift 1 L to {lift} m, at least {liftRatio} L must therefore fall {fall} m, and the water thrown away at the bottom pays the bill.',
      ),
      lx(
        'Avec le clapet n°1 de la vidéo, le bélier monte environ **{perDay} L par jour**. Dans le modèle, il prend {drive1} L/min à la réserve pour en monter {delivered1} : ≈ {takenPerL} L pris pour 1 L monté, le reste ressortant par le clapet de choc.',
        'With the video’s n°1 valve the ram lifts about **{perDay} L a day**. In the model it takes {drive1} L/min from the tank and lifts {delivered1} L/min of it: ≈ {takenPerL} L taken for every 1 L lifted, the rest leaving through the waste valve.',
      ),
      lx(
        'La vidéo donne une règle du pouce : **1 m de chute remonte l’eau d’environ 10 m**, quelle que soit la longueur de la conduite. Le plafond s’en déduit : même si le bélier prenait toute la source ({source} L/min), il ne pourrait pas monter plus de q = Q·h/H, soit {ceilingLpm} L/min ou ≈ {ceilingDay} L par jour. Les {perDay} L de la vidéo en font {ceilingPct} % : si le bélier prenait toute la source, son **rendement** serait d’environ {eta04}.',
        'The video gives a rule of thumb: **1 m of fall lifts water about 10 m**, whatever the length of the pipe. The ceiling follows: even if the ram took the whole spring ({source} L/min), it could not lift more than q = Q·h/H, that is {ceilingLpm} L/min or ≈ {ceilingDay} L a day. The video’s {perDay} L is {ceilingPct}% of that: if the ram took the whole spring, its **efficiency** would be about {eta04}.',
      ),
      lx(
        'Une question reste : comment {fall} m de chute, qui ne poussent qu’avec {staticBarDrive} bar, envoient-ils de l’eau là où la pression atteint {staticBarDelivery} bar ? Par un **coup de bélier** répété, c’est l’objet de la leçon suivante.',
        'One question remains: how can {fall} m of fall, which pushes with only {staticBarDrive} bar, send water to where the pressure reaches {staticBarDelivery} bar? By a repeated **water hammer**, the subject of the next lesson.',
      ),
    ],
    figures: [
      chip('Chute h (vidéo)', 'Fall h (video)', '{fall} m'),
      chip('Hauteur H (vidéo)', 'Lift H (video)', '{lift} m'),
      chip('Règle du pouce (vidéo)', 'Rule of thumb (video)', '1 m → 10 m'),
      chip('Plafond en L/jour, η = 1 (dérivé)', 'Ceiling in L/day, η = 1 (derived)', '{ceilingDay}'),
    ],
    formula: 'q · H ≤ Q · h',
    focus: { scene: 'site', preset: 'valve-1' },
    video: '00:42',
    quiz: [
      {
        q: l(
          'Un site a 4 m de chute et une source de 10 L/min. Au mieux, sans aucune perte, quel débit peut-on monter à 40 m ?',
          'A site has a 4 m fall and a spring of 10 L/min. At best, with no loss at all, what flow can be lifted to 40 m?',
        ),
        choices: [l('0,1 L/min', '0.1 L/min'), l('1 L/min', '1 L/min'), l('10 L/min', '10 L/min')],
        answer: 1,
        explain: l(
          'Le plafond est q = Q·h/H = 10 × 4 / 40 = 1 L/min : monter dix fois plus haut que la chute coûte dix litres tombés pour un litre monté. Avec un rendement réaliste de 0,6, on en monterait 0,6 L/min. Monter les 10 L/min de la source serait créer de l’énergie.',
          'The ceiling is q = Q·h/H = 10 × 4 / 40 = 1 L/min: lifting ten times higher than the fall costs ten litres fallen for each litre lifted. With a realistic efficiency of 0.6 you would lift 0.6 L/min. Lifting the spring’s whole 10 L/min would be creating energy.',
        ),
      },
      {
        q: lx(
          'Dans le modèle, le bélier prend {drive1} L/min à la réserve et n’en monte que {delivered1} L/min. Où passe le reste ?',
          'In the model the ram takes {drive1} L/min from the tank and lifts only {delivered1} L/min of it. Where does the rest go?',
        ),
        choices: [
          l(
            'Il ressort par le clapet de choc : c’est le prix de la montée',
            'It leaves through the waste valve: that is the price of the lift',
          ),
          l('Il s’accumule dans la cloche à air', 'It builds up in the air chamber'),
          l('Il retourne à la source par la conduite motrice', 'It goes back to the spring up the drive pipe'),
        ],
        answer: 0,
        explain: lx(
          'Le clapet de choc jette ≈ {waste1} L/min, soit ≈ {wasteStroke1} mL à chaque coup : c’est cette eau qui tombe et, par son élan, fait monter l’autre. Rien ne s’accumule dans la cloche, qui se vide dans la conduite de refoulement, et rien ne remonte la conduite motrice.',
          'The waste valve throws out ≈ {waste1} L/min, that is ≈ {wasteStroke1} mL at every stroke: this is the water that falls and, with its momentum, lifts the other. Nothing builds up in the chamber, which empties into the delivery pipe, and nothing climbs back up the drive pipe.',
        ),
      },
    ],
  },

  // ------------------------------------------------------------------------------------------------ 2. cycle
  {
    id: 'cycle',
    title: l('Le coup de bélier et le cycle en quatre temps', 'The water hammer and the four-beat cycle'),
    summary: lx(
      'Accélérer, claquer, refouler, reculer : environ {strokes} fois par minute, le bélier se réarme tout seul.',
      'Accelerate, slam, deliver, recoil: about {strokes} times a minute, the ram resets itself.',
    ),
    body: [
      lx(
        '**1. Accélération.** Au repos, le **clapet de choc** pend, ouvert. L’eau de la réserve dévale la conduite motrice et s’échappe par lui en prenant de la vitesse, et plus elle va vite, plus elle pousse le clapet vers son siège.',
        '**1. Acceleration.** At rest the **waste valve** hangs open. Water from the tank rushes down the drive pipe and escapes through it, gathering speed, and the faster it goes, the harder it pushes the valve toward its seat.',
      ),
      lx(
        '**2. Fermeture.** Quand la poussée dépasse le poids du clapet, il claque en {slamMs} ms environ et stoppe net la colonne d’eau de la conduite (≈ {driveLitres} L, lancée à {vc} m/s dans le modèle, moins vite qu’un marcheur). C’est le **coup de bélier** : une surpression Δp = ρ·a·v, où ρ est la masse volumique de l’eau et a la vitesse de l’onde de pression dans le tuyau. Avec ≈ {waveSteel} m/s dans l’acier du modèle, elle vaut ≈ {surge} bar, de quoi vaincre les {staticBarDelivery} bar de la colonne de {lift} m.',
        '**2. Closing.** When the push exceeds the weight of the valve it slams shut in about {slamMs} ms and stops dead the column of water in the pipe (≈ {driveLitres} L, moving at {vc} m/s in the model, slower than a walker). That is the **water hammer**: a pressure surge Δp = ρ·a·v, where ρ is the density of water and a the speed of the pressure wave in the pipe. With ≈ {waveSteel} m/s in the model’s steel pipe it comes to ≈ {surge} bar, enough to beat the {staticBarDelivery} bar of the {lift} m column.',
      ),
      lx(
        '**3. Refoulement.** La surpression soulève le **clapet anti-retour** pendant ≈ {deliverShare} % du cycle, une vingtaine de millisecondes : un peu d’eau, ≈ {ml} mL par coup (moins qu’une cuillère à café), passe dans la **cloche à air** et monte vers le château d’eau. Dès que la pression retombe, le clapet se referme et la colonne de {lift} m reste en place.',
        '**3. Delivery.** The surge lifts the **check valve** for ≈ {deliverShare}% of the cycle, some twenty milliseconds: a little water, ≈ {ml} mL per stroke (less than a teaspoon), goes into the **air chamber** and on up to the water tower. As soon as the pressure falls the valve shuts and the {lift} m column stays where it is.',
      ),
      lx(
        '**4. Recul.** Arrêtée, l’eau rebondit : un instant, elle repart en arrière et la pression tombe sous celle de l’air libre. Le poids rouvre alors le clapet de choc, un peu d’air entre par le **reniflard** et tout recommence. Cela fait ≈ {strokes} coups par minute dans le modèle, et la vidéo en donne 100–110.',
        '**4. Recoil.** Brought to a halt, the water bounces back: for an instant it flows backwards and the pressure drops below that of the open air. The weight then reopens the waste valve, a little air comes in through the **snifter**, and it all starts again. That makes ≈ {strokes} strokes a minute in the model, and the video gives 100–110.',
      ),
      l(
        'Un coup entier dure environ une demi-seconde. Pour voir chaque temps, passez en mode **Simulation** : dans la section « Le cycle, pas à pas », une pastille par phase fige le bélier en 3D avec ses valves, ses débits et ses courbes, et le bouton « Phase suivante » avance d’un temps.',
        'A whole stroke lasts about half a second. To see each beat, switch to the **Simulation** mode: in the “The cycle, step by step” section, one chip per phase freezes the ram in 3D with its valves, flows and curves, and the “Next phase” button moves on one beat.',
      ),
    ],
    figures: [
      chip('Coups par minute (vidéo)', 'Strokes a minute (video)', '100–110'),
      chip('Vitesse à la fermeture (modèle)', 'Speed at closing (model)', '{vc} m/s'),
      chip('Surpression ρ·a·v (modèle)', 'Surge ρ·a·v (model)', '{surge} bar'),
      chip('Eau par coup (dérivé)', 'Water per stroke (derived)', '{ml} mL'),
    ],
    formula: 'Δp = ρ · a · v',
    focus: { scene: 'ram', preset: 'valve-1' },
    video: '03:04',
    quiz: [
      {
        q: l(
          'Qu’est-ce qui crée la surpression qui ouvre le clapet de refoulement ?',
          'What creates the surge that opens the delivery check valve?',
        ),
        choices: [
          l('La cloche à air, qui comprime l’eau', 'The air chamber, which compresses the water'),
          l('Le poids de l’eau dans la conduite de refoulement', 'The weight of the water in the delivery pipe'),
          l('Une colonne d’eau en mouvement qu’on stoppe net', 'A moving column of water that is stopped dead'),
        ],
        answer: 2,
        explain: lx(
          'C’est l’élan de la colonne de la conduite motrice : stoppée net par le clapet de choc, elle fait monter la pression de ρ·a·v. La cloche ne crée aucune pression, elle lisse le débit ; et la colonne de {lift} m n’est pas la cause de la surpression, c’est ce qu’elle doit vaincre.',
          'It is the momentum of the water column in the drive pipe: stopped dead by the waste valve, it raises the pressure by ρ·a·v. The chamber creates no pressure, it smooths the flow; and the {lift} m column is not the cause of the surge, it is what the surge has to beat.',
        ),
      },
      {
        q: l(
          'Au moment où le clapet claque, l’eau de la conduite arrive deux fois plus vite. D’après Δp = ρ·a·v, la surpression est…',
          'When the valve slams, the water in the pipe is arriving twice as fast. According to Δp = ρ·a·v, the surge is…',
        ),
        choices: [
          l('la même', 'the same'),
          l('deux fois plus grande', 'twice as big'),
          l('quatre fois plus grande', 'four times as big'),
        ],
        answer: 1,
        explain: l(
          'Δp est proportionnelle à v : deux fois plus vite, deux fois plus de surpression. C’est l’énergie cinétique, pas la surpression, qui est multipliée par quatre. Voilà pourquoi un clapet qui ne se ferme qu’à une eau plus rapide frappe plus fort : on le voit dans la leçon suivante.',
          'Δp is proportional to v: twice as fast, twice the surge. It is the kinetic energy, not the surge, that is multiplied by four. That is why a valve that only closes on faster water hits harder, as the next lesson shows.',
        ),
      },
    ],
  },

  // ------------------------------------------------------------------------------------------------ 3. waste-valve
  {
    id: 'waste-valve',
    title: l('Le clapet de choc : là où tout se règle', 'The waste valve: where everything is tuned'),
    summary: lx(
      'Course, poids et taille du clapet fixent le rythme et la consommation : du n°3 à {drawN3} L/min au n°1 à {perDay} L par jour.',
      'Stroke, weight and size of the valve set the rhythm and the consumption: from the n°3 at {drawN3} L/min to the n°1 at {perDay} L a day.',
    ),
    body: [
      lx(
        'Dans la vidéo, le clapet d’origine du bélier (un **n°3**, 26×34) consommait, selon l’auteur, ≈ {drawN3} L/min (une estimation, pas une mesure) alors que la source ne donnait plus que {source} L/min : la réserve se vidait en ≈ {hoursN3} h et le bélier s’arrêtait. Un **n°2** (20×27) marchait mal et consommait encore trop ; un **n°1** (15×21), fait de raccords de plomberie, a fait passer la cadence de 70–80 à 100–110 coups/min et monte ≈ {perDay} L par jour.',
        'In the video, the ram’s original valve (a **n°3**, 26×34) took, according to the author, ≈ {drawN3} L/min (an estimate, not a measurement) while the spring now gave only {source} L/min: the tank emptied in ≈ {hoursN3} h and the ram stopped. A **n°2** (20×27) worked badly and still took too much; a **n°1** (15×21), built from plumbing fittings, took the rate from 70–80 to 100–110 strokes/min and lifts ≈ {perDay} L a day.',
      ),
      l(
        'Trois choses règlent le rythme et la consommation : la **taille** du clapet, qui borne le débit, la **course** et le **poids**. La course est l’écart entre la tête du clapet et son siège quand il est ouvert, fixé par l’**écrou de course** (dans la vidéo, le poids lui-même joue ce rôle, et un contre-écrou le bloque) ; plus elle est longue, plus l’eau s’échappe à chaque coup. Le scénario « Écrou de course vissé » la fait varier : l’écrou avance de 0,1 mm toutes les 10 minutes simulées (réglez le temps sur ×600, en bas de l’écran, pour le voir).',
        'Three things set the rhythm and the consumption: the **size** of the valve, which caps the flow, the **stroke** and the **weight**. The stroke is the gap between the valve head and its seat when it is open, set by the **stroke nut** (in the video the weight itself plays that part, with a lock nut holding it); the longer it is, the more water escapes at every stroke. The “Stroke nut turned in” scenario varies it: the nut is turned in by 0.1 mm every 10 simulated minutes (set the time to ×600, at the bottom of the screen, to watch it).',
      ),
      lx(
        'Dans le modèle (clapet n°1), une course de {s3} mm prend {q3} L/min et refoule {d3} L par jour, {s22} mm (le réglage calé sur la vidéo) prend {drive1} L/min et refoule {perDay} L, et à {s15} mm le bélier ne refoule plus rien : c’est la **course minimale**. La vidéo dit la même chose : sous une certaine course, le bélier ne fonctionne plus. Entre ce plancher et le point où le clapet prend toute la source ({s23} mm), il ne reste que {turns} tour d’écrou, au pas de 1 mm de la tige de 6 mm.',
        'In the model (n°1 valve), a {s3} mm stroke takes {q3} L/min and delivers {d3} L a day, {s22} mm (the setting calibrated on the video) takes {drive1} L/min and delivers {perDay} L, and at {s15} mm the ram delivers nothing: that is the **minimum stroke**. The video says the same: below a certain stroke the ram will not run. Between that floor and the point where the valve takes the whole spring ({s23} mm) there is only {turns} of a turn of the nut, at the 1 mm pitch of the 6 mm rod.',
      ),
      lx(
        'Le **poids** tire le clapet vers le bas et fixe la vitesse que l’eau doit atteindre pour le fermer. Doublé à {w720} g (scénario « Contrepoids plus lourd »), il fait passer le modèle de {strokes} à {spm75} coups/min, de {drive1} à {q155} L/min et le refoulé de {perDay} à {d788} L par jour : on refoule plus, mais en empruntant à la réserve, qui se vide alors en ≈ {hoursHeavy} h.',
        'The **weight** pulls the valve down and sets the speed the water must reach to close it. Doubled to {w720} g (the “Heavier counterweight” scenario), it takes the model from {strokes} to {spm75} strokes/min, from {drive1} to {q155} L/min and the delivery from {perDay} to {d788} L a day: more is delivered, but borrowed from the tank, which then empties in ≈ {hoursHeavy} h.',
      ),
      lx(
        'Le but n’est donc pas de refouler le plus possible, mais le plus possible **avec l’eau qu’on a** : que le bélier prenne moins que la source ne donne. Le n°1 prend {drive1} L/min dans le modèle pour {source} L/min de source, quand le n°3 en prenait {drive3} : l’auteur n’a pas trouvé plus d’eau, il a fabriqué un clapet qui en prend moins. Les préréglages « Clapet n°3 : consomme trop » et « Clapet n°1 : 500 L par jour » de la Simulation rejouent cette histoire.',
        'The aim is therefore not to deliver as much as possible, but as much as possible **with the water you have**: the ram must take less than the spring gives. The n°1 takes {drive1} L/min in the model from a {source} L/min spring, where the n°3 took {drive3}: the author did not find more water, he built a valve that takes less. The “Valve n°3: uses too much water” and “Valve n°1: 500 L a day” presets of the Simulation replay that story.',
      ),
    ],
    figures: [
      chip('Clapet n°3, estimation de l’auteur', 'n°3 valve, author’s estimate', '{drawN3} L/min'),
      chip('Clapet n°1 (modèle)', 'n°1 valve (model)', '{drive1} L/min'),
      chip('Course utile du n°1 (modèle)', 'Working stroke of the n°1 (model)', '{s15}–{s23} mm'),
      chip('Largeur de la plage (dérivé)', 'Width of that range (derived)', '{turns} tour', '{turns} turn'),
    ],
    focus: { scene: 'valve', part: 'stroke-nut', preset: 'valve-1', scenario: 'stroke-nut' },
    video: '12:51',
    quiz: [
      {
        q: l(
          'Le bélier prend plus d’eau que la source n’en donne et la réserve se vide. Quel réglage essayer en premier ?',
          'The ram takes more water than the spring gives and the tank is emptying. Which setting should you try first?',
        ),
        choices: [
          l('Visser l’écrou de course, par fractions de tour', 'Turn the stroke nut in, by fractions of a turn'),
          l(
            'Alourdir le contrepoids pour que le clapet claque plus fort',
            'Make the counterweight heavier so the valve slams harder',
          ),
          l('Ouvrir plus grand la vanne de départ de la conduite motrice', 'Open the drive-pipe gate valve wider'),
        ],
        answer: 0,
        explain: lx(
          'Une course plus courte laisse échapper moins d’eau à chaque coup, donc le bélier consomme moins ; on tourne par fractions de tour, car la plage utile fait moins d’un tour, puis on resserre le contre-écrou. Un poids plus lourd ferait consommer davantage ({q155} L/min dans le modèle), et la vanne de départ reste ouverte à fond en marche : elle ne règle pas le débit.',
          'A shorter stroke lets less water escape at each stroke, so the ram takes less; you turn by fractions of a turn, since the working range is less than one turn, then tighten the lock nut again. A heavier weight would make it take more ({q155} L/min in the model), and the gate valve stays fully open while running: it does not set the flow.',
        ),
      },
      {
        q: lx(
          'Dans le modèle, un contrepoids doublé fait passer le refoulé de {perDay} à {d788} L par jour. Pourquoi n’est-ce pas un bon réglage pour le site de la vidéo ?',
          'In the model, a doubled counterweight takes the delivery from {perDay} to {d788} L a day. Why is it not a good setting for the video’s site?',
        ),
        choices: [
          l(
            'Parce qu’un rendement plus bas veut dire moins d’eau refoulée',
            'Because a lower efficiency means less water delivered',
          ),
          l('Parce que le clapet ne se ferme plus du tout', 'Because the valve no longer closes at all'),
          l(
            'Parce que le bélier prend alors le double de la source, empruntée à la réserve',
            'Because the ram then takes twice the spring, borrowed from the tank',
          ),
        ],
        answer: 2,
        explain: lx(
          'Le bélier prend {q155} L/min, le double des {source} L/min de la source : l’eau en plus est empruntée à la réserve, qui se vide en ≈ {hoursHeavy} h, puis le bélier s’arrête. Le rendement baisse bien, mais le volume refoulé monte : rendement et quantité ne sont pas la même chose. Quant au clapet, il se ferme encore bien au-delà : il ne reste ouvert qu’autour de 1 000 g.',
          'The ram takes {q155} L/min, twice the spring’s {source} L/min: the extra water is borrowed from the tank, which empties in ≈ {hoursHeavy} h, and then the ram stops. The efficiency does fall, but the volume delivered rises: efficiency and quantity are not the same thing. As for the valve, it keeps closing well beyond that: it only stays open at around 1,000 g.',
        ),
      },
    ],
  },

  // ------------------------------------------------------------------------------------------------ 4. air-chamber
  {
    id: 'air-chamber',
    title: l(
      'La cloche à air, le clapet anti-retour et le reniflard',
      'The air chamber, the check valve and the snifter',
    ),
    summary: l(
      'Trois pièces discrètes qui lissent les coups en un débit continu et gardent ce que chaque coup a gagné.',
      'Three quiet parts that smooth the jolts into a steady flow and keep what each stroke has gained.',
    ),
    body: [
      lx(
        'Le **clapet anti-retour de refoulement** ne s’ouvre que le temps du coup, ≈ {deliverShare} % du cycle dans le modèle. Dès que la pression retombe il se referme, et la colonne d’eau de {lift} m, qui pèse {staticBarDelivery} bar sur lui, reste en place : sans lui, chaque recul redescendrait ce que le coup vient de monter. D’après la vidéo, ce petit clapet se trouve dans la cloche.',
        'The **delivery check valve** opens only for the duration of the stroke, ≈ {deliverShare}% of the cycle in the model. As soon as the pressure falls it shuts, and the {lift} m column of water, which weighs on it with {staticBarDelivery} bar, stays in place: without it every recoil would send back down what the stroke had just lifted. According to the video, this small valve sits in the chamber.',
      ),
      lx(
        'L’eau ne se comprime pas, l’air si. Chaque coup pousse {ml} mL dans la **cloche à air** et comprime son coussin d’air ; entre deux coups, l’air se détend et pousse l’eau vers le château d’eau, sans interruption. Dans le modèle (une cloche de {chamberL} L à {airPct} % d’air, deux hypothèses : la vidéo n’en donne pas le volume), la pression ne varie que d’environ {swing} bar par coup.',
        'Water cannot be compressed, air can. Each stroke pushes {ml} mL into the **air chamber** and squeezes its cushion of air; between two strokes the air expands and pushes the water on toward the tower without a break. In the model (a {chamberL} L chamber with {airPct}% air, two assumptions: the video does not give its volume) the pressure moves by only about {swing} bar per stroke.',
      ),
      lx(
        'L’air de la cloche se dissout peu à peu dans l’eau sous pression. Le **reniflard**, une minuscule soupape, laisse entrer une pincée d’air à chaque recul, quand la pression du corps passe sous celle de l’air libre : dans le modèle, il recharge la cloche avec une constante de temps de {refillMin} min. La vidéo ne le montre pas ; c’est une pièce classique des béliers.',
        'The chamber’s air gradually dissolves in the pressurised water. The **snifter**, a tiny valve, lets in a pinch of air at every recoil, when the body pressure falls below that of the open air: in the model it recharges the chamber with a time constant of {refillMin} min. The video does not show it; it is a standard part of rams.',
      ),
      lx(
        'Sans air, la cloche est **noyée** : chaque coup se heurte directement à la conduite de refoulement. Dans le modèle, la pointe de pression passe de {peak1} bar à plus de 7 bar et le refoulé tombe à ≈ {wlPerDay} L par jour au lieu de {perDay}, soit environ {wlDropPct} % de moins. Un reniflard bouché y mène sans bruit, en ≈ {loggedHours} h : le scénario « Cloche à air noyée » montre le résultat, le scénario « Reniflard bouché » la pente qui y mène (réglez le temps sur ×3600).',
        'With no air, the chamber is **water-logged**: every stroke meets the delivery pipe head-on. In the model the pressure peak goes from {peak1} bar to over 7 bar and the delivery falls to ≈ {wlPerDay} L a day instead of {perDay}, about {wlDropPct}% less. A blocked snifter leads there silently, in ≈ {loggedHours} h: the “Water-logged air chamber” scenario shows the result, the “Blocked snifter” scenario the slope that leads to it (set the time to ×3600).',
      ),
    ],
    figures: [
      chip('Eau par coup (dérivé)', 'Water per stroke (derived)', '{ml} mL'),
      chip('Variation par coup (dérivé)', 'Swing per stroke (derived)', '{swing} bar'),
      chip('Refoulé, cloche noyée (modèle)', 'Delivery, water-logged (model)', '−{wlDropPct} %', '−{wlDropPct}%'),
      chip('Reniflard bouché, noyée en (modèle)', 'Snifter blocked, logged in (model)', '≈ {loggedHours} h'),
    ],
    focus: { scene: 'ram', part: 'air-chamber', preset: 'valve-1', scenario: 'water-logged' },
    video: '03:26',
    quiz: [
      {
        q: l(
          'À quoi sert le clapet anti-retour entre le corps et la cloche ?',
          'What is the check valve between the body and the chamber for?',
        ),
        choices: [
          l('À laisser entrer l’air dans la cloche à chaque recul', 'To let air into the chamber at every recoil'),
          l(
            'À empêcher l’eau déjà montée de redescendre quand la pression retombe',
            'To stop the water already lifted from running back when the pressure falls',
          ),
          l('À claquer pour créer le coup de bélier', 'To slam shut and create the water hammer'),
        ],
        answer: 1,
        explain: l(
          'Le clapet anti-retour garde ce que le coup a gagné : il se referme quand la pression retombe et la colonne de refoulement ne redescend pas. L’air entre par le reniflard, et c’est le clapet de choc, pas lui, qui claque pour créer le coup de bélier.',
          'The check valve keeps what the stroke has gained: it shuts when the pressure falls so the delivery column does not run back. Air comes in through the snifter, and it is the waste valve, not this one, that slams to create the water hammer.',
        ),
      },
      {
        q: l(
          'Un bélier se met à cogner plus fort et refoule de moins en moins, sans que rien d’autre ait changé. Quelle cause le modèle met-il en évidence ?',
          'A ram starts to knock harder and delivers less and less, with nothing else changed. Which cause does the model point to?',
        ),
        choices: [
          l(
            'La cloche a perdu son air : le reniflard est peut-être bouché',
            'The chamber has lost its air: the snifter may be blocked',
          ),
          l(
            'La cloche contient trop d’air et amortit trop le coup',
            'The chamber holds too much air and cushions the stroke too much',
          ),
          l('Le contrepoids du clapet est devenu trop léger', 'The valve’s counterweight has become too light'),
        ],
        answer: 0,
        explain: lx(
          'Sans coussin d’air, chaque coup rencontre directement la conduite de refoulement : la pointe passe de {peak1} bar à plus de 7 bar et le refoulé baisse d’environ {wlDropPct} % dans le modèle. Trop d’air ne ferait pas cogner plus fort, et un contrepoids plus léger changerait le rythme, pas la dureté des coups. Regardez la cloche et le reniflard avant de toucher au clapet de choc.',
          'With no air cushion every stroke meets the delivery pipe head-on: the peak goes from {peak1} bar to over 7 bar and the delivery drops by about {wlDropPct}% in the model. Too much air would not make it knock harder, and a lighter counterweight would change the rhythm, not the harshness of the strokes. Look at the chamber and the snifter before touching the waste valve.',
        ),
      },
    ],
  },

  // ------------------------------------------------------------------------------------------------ 5. sizing
  {
    id: 'sizing',
    title: l('Dimensionner un bélier et mesurer son rendement', 'Sizing a ram and measuring its efficiency'),
    summary: l(
      'Conduite motrice, débit de la source, rapport H/h : ce que demandent les règles, et ce que rend le bélier.',
      'Drive pipe, spring flow, the H/h ratio: what the rules ask for, and what the ram gives back.',
    ),
    body: [
      lx(
        'La conduite motrice doit mesurer **au moins 5 fois la chute** (NC State ; 3 à 7 fois selon d’autres sources), soit {minLen} m pour {fall} m de chute : plus d’eau en mouvement donne plus d’élan à chaque coup. Celle de la vidéo, {driveLen} m, n’en fait que {lenRatio} fois. Avec {shortLen} m seulement (scénario « Conduite motrice trop courte »), le modèle fait frapper le bélier {shortSpm} fois par minute au lieu de {strokes}, avec un rendement plus bas, et il prend {shortQ} L/min, plus que la source n’en donne.',
        'The drive pipe should be **at least 5 times the fall** long (NC State; 3 to 7 times according to other sources), that is {minLen} m for a {fall} m fall: more water in motion gives more momentum at every stroke. The video’s pipe, {driveLen} m, is only {lenRatio} times. With just {shortLen} m (the “Drive pipe too short” scenario) the model has the ram striking {shortSpm} times a minute instead of {strokes}, with a lower efficiency, and it takes {shortQ} L/min, more than the spring gives.',
      ),
      lx(
        'Le **débit de la source** choisit la taille du bélier. Le tableau de NC State demande au moins **{minFlow1in} L/min** pour un bélier de 1″ ({min34} L/min pour un ¾″) ; la source de la ferme en donne {source}, soit {sourcePct} % de ce qu’il faut à un 1″. Le clapet d’origine, qui prenait {drawN3} L/min selon l’auteur, vidait donc la réserve : l’auteur a fabriqué un clapet plus petit plutôt que de chercher plus d’eau.',
        'The **spring flow** chooses the size of the ram. The NC State table asks for at least **{minFlow1in} L/min** for a 1″ ram ({min34} L/min for a ¾″); the farm’s spring gives {source}, {sourcePct}% of what a 1″ needs. The original valve, which took {drawN3} L/min according to the author, therefore emptied the tank: the author built a smaller valve rather than look for more water.',
      ),
      lx(
        'La hauteur compte autant : le site remonte l’eau {liftRatio} fois plus haut que la chute, et la vidéo donne environ 10 fois comme règle. Plus le **rapport H/h** grandit, moins le bélier refoule : dans le modèle (clapet n°1), {perDay} L par jour à {lift} m, ≈ {d75} L à 75 m et plus rien à {zeroHead} m, soit H/h = {zeroRatio} (le scénario « Refoulement trop haut » monte à 100 m). Au-delà de {zeroRatio} fois la chute, le calculateur signale que le bélier est trop sollicité.',
        'The height matters as much: the site lifts the water {liftRatio} times higher than it fell, and the video gives about 10 times as a rule. The bigger the **H/h ratio** gets, the less the ram delivers: in the model (n°1 valve), {perDay} L a day at {lift} m, ≈ {d75} L at 75 m and nothing at {zeroHead} m, that is H/h = {zeroRatio} (the “Delivery head too high” scenario goes to 100 m). Beyond {zeroRatio} times the fall, the calculator warns that the ram is asked too much.',
      ),
      lx(
        'Le rendement de **D’Aubuisson** compare l’énergie montée (q·H) à celle de toute l’eau prise à la source (Q·h) ; celui de **Rankine** ne compte comme dépensée que l’eau jetée par le clapet de choc, Q − q. Pour le clapet n°1 du modèle, ils valent {etaD} et {etaR}. Les sources donnent {etaTypical} comme valeur courante (jusqu’à {etaMax}), et les chiffres de la vidéo en impliquent de {etaLow} à {etaHigh}, selon un débit pris qu’elle ne mesure pas.',
        'The **D’Aubuisson** efficiency compares the energy lifted (q·H) with that of all the water taken from the spring (Q·h); the **Rankine** one counts as spent only the water thrown out by the waste valve, Q − q. For the model’s n°1 valve they are {etaD} and {etaR}. The sources give {etaTypical} as a usual value (up to {etaMax}), and the video’s figures imply {etaLow} to {etaHigh}, depending on a flow taken that it does not measure.',
      ),
      lx(
        'Dans la **Simulation**, la section « Dimensionner un bélier » applique ces règles à votre site : chute, hauteur, débit de la source et taille de la conduite donnent la longueur minimale, le débit exigé, le refoulé attendu (≈ {calcDay} L par jour pour le site de la vidéo avec η = {etaTypical}) et les alertes. Elle ne perturbe pas la simulation en cours.',
        'In the **Simulation** mode, the “Size a ram” section applies these rules to your own site: fall, height, spring flow and pipe size give the minimum pipe length, the flow required, the expected delivery (≈ {calcDay} L a day for the video’s site with η = {etaTypical}) and the warnings. It does not disturb the running simulation.',
      ),
    ],
    figures: [
      chip('Conduite minimale pour 7,5 m (dérivé)', 'Minimum pipe for 7.5 m (derived)', '{minLen} m'),
      chip('Débit exigé par un 1″ (NC State)', 'Flow a 1″ ram asks for (NC State)', '{minFlow1in} L/min'),
      chip('Rendement du n°1 (modèle)', 'Efficiency of the n°1 (model)', '{etaD}'),
      chip('Rendement courant (sources)', 'Usual efficiency (sources)', '{etaTypical}'),
    ],
    formula: 'η = q · H / (Q · h)',
    focus: { scene: 'site', part: 'drive-pipe', preset: 'valve-1', scenario: 'short-pipe' },
    video: '01:55',
    quiz: [
      {
        q: l(
          'Un site a 4 m de chute. D’après la règle de NC State, quelle est la longueur minimale de la conduite motrice ?',
          'A site has a 4 m fall. According to the NC State rule, what is the minimum length of the drive pipe?',
        ),
        choices: [l('8 m', '8 m'), l('12 m', '12 m'), l('20 m', '20 m')],
        answer: 2,
        explain: l(
          'Au moins 5 fois la chute : 5 × 4 = 20 m. 12 m (3 fois) est le bas de la fourchette courante, et 8 m (2 fois) est franchement court, comme dans le scénario « trop courte » : coups trop rapides et rendement plus bas.',
          'At least 5 times the fall: 5 × 4 = 20 m. 12 m (3 times) is the bottom of the usual range, and 8 m (2 times) is plainly short, as in the “too short” scenario: strokes too fast and a lower efficiency.',
        ),
      },
      {
        q: l(
          'Un bélier prend 10 L/min à la source et en refoule 0,5 L/min à 50 m, avec 5 m de chute. Quel est son rendement de D’Aubuisson ?',
          'A ram takes 10 L/min from the spring and delivers 0.5 L/min to 50 m, with a 5 m fall. What is its D’Aubuisson efficiency?',
        ),
        choices: [l('0,05', '0.05'), l('0,5', '0.5'), l('5', '5')],
        answer: 1,
        explain: l(
          'η = q·H/(Q·h) = 0,5 × 50 / (10 × 5) = 25/50 = 0,5. 0,05 serait le simple rapport des débits q/Q, qui oublie les hauteurs ; 5 est impossible, car un rendement ne peut pas dépasser 1 : on ne sort jamais plus d’énergie qu’on n’en met.',
          'η = q·H/(Q·h) = 0.5 × 50 / (10 × 5) = 25/50 = 0.5. 0.05 would be the plain ratio of the flows q/Q, which forgets the heights; 5 is impossible, since an efficiency cannot exceed 1: you never get out more energy than you put in.',
        ),
      },
    ],
  },

  // ------------------------------------------------------------------------------------------------ 6. siting
  {
    id: 'siting',
    title: l('Choisir le lieu, et le faire en sécurité', 'Choosing the place, and doing it safely'),
    summary: l(
      'La source doit donner plus d’eau que le bélier n’en prend ; puis conduite rigide, bélier ancré, loi et eau potable.',
      'The spring must give more water than the ram takes; then a rigid pipe, an anchored ram, the law and drinking water.',
    ),
    body: [
      lx(
        'La **réserve tampon** reçoit la source et nourrit la conduite motrice. La règle d’or : la source doit donner **plus** que le bélier ne prend. Avec le clapet n°1 du modèle, il prend {drive1} L/min pour {source} L/min de source, et les {surplus1} L/min restants, soit {margin1Pct} % de marge, partent au trop-plein.',
        'The **buffer tank** receives the spring and feeds the drive pipe. The golden rule: the spring must give **more** than the ram takes. With the model’s n°1 valve it takes {drive1} L/min from a {source} L/min spring, and the remaining {surplus1} L/min, a margin of {margin1Pct}%, goes to the overflow.',
      ),
      lx(
        'Avec le clapet n°3, le bélier prenait ≈ {drawN3} L/min (estimation de l’auteur) : un **déficit** de {deficitN3} L/min qui vidait la réserve de ≈ {tankL} L (déduite des dix heures de la vidéo) en ≈ {hoursN3} h, après quoi il s’arrêtait. Une plus grosse cuve ne fait que retarder l’arrêt, et les sources baissent : celle de la vidéo est passée de {sourceBefore} à {source} L/min en deux ans ({dropPct} % de moins). Le scénario « La source baisse » le montre avec le clapet n°3 (réglez le temps sur ×3600, en bas de l’écran) ; mesurez toujours le débit à l’étiage, en fin d’été.',
        'With the n°3 valve the ram took ≈ {drawN3} L/min (the author’s estimate): a {deficitN3} L/min **deficit** that emptied the ≈ {tankL} L tank (derived from the video’s ten hours) in ≈ {hoursN3} h, after which it stopped. A bigger tank only delays the stop, and springs decline: the video’s went from {sourceBefore} to {source} L/min in two years ({dropPct}% less). The scenario “The spring drops” shows it with the n°3 valve (set the time to ×3600, at the bottom of the screen); always measure the flow at low water, at the end of summer.',
      ),
      lx(
        'La conduite motrice doit être **rigide**, en acier ou en fonte. La surpression ρ·a·v croît avec la vitesse a de l’onde, plus faible dans un tuyau souple : dans le scénario « Conduite en PVC », un résultat du modèle pour une vitesse supposée de {pvcA} m/s et non une mesure, elle tombe à ≈ {pvcSurge} bar alors qu’il en faut ≈ {need} bar pour ouvrir le clapet de refoulement, si bien que le bélier frappe sans rien refouler. Un article de presse sur un autre bélier de ferme déconseille aussi le plastique.',
        'The drive pipe must be **rigid**, steel or cast iron. The surge ρ·a·v grows with the speed a of the wave, which is lower in a soft pipe: in the “PVC drive pipe” scenario, a model result for an assumed speed of {pvcA} m/s and not a measurement, it falls to ≈ {pvcSurge} bar while ≈ {need} bar are needed to open the delivery check valve, so the ram strikes and delivers nothing. A press article about another farm ram also discourages plastic.',
      ),
      lx(
        'Chaque coup pousse sur le corps du bélier avec une force de ≈ {thrustN} N, le poids d’environ {kg} kg (une pointe de {peak1} bar sur la section d’un tuyau de {bore} mm, dérivé), ≈ {strokes} fois par minute : le bélier doit être **ancré** sur un massif rigide, et le manomètre se place côté refoulement. Et **jamais un doigt dans le clapet de choc** quand il tourne : il se ferme en {slamMs} ms environ, bien plus vite que la main ne se retire.',
        'Every stroke pushes on the ram body with a force of ≈ {thrustN} N, the weight of about {kg} kg (a {peak1} bar peak on the section of a {bore} mm pipe, derived), ≈ {strokes} times a minute: the ram must be **anchored** to a rigid block, and the gauge goes on the delivery side. And **never a finger in the waste valve** while it runs: it shuts in about {slamMs} ms, far faster than a hand can pull away.',
      ),
      l(
        'Reste la loi et la santé. En France, prélever l’eau d’une source ou d’un cours d’eau est réglementé (droit d’eau, continuité écologique) : renseignez-vous auprès de la **DDT** et de l’**OFB** avant tout projet ; les règles diffèrent d’un pays à l’autre. Et l’eau d’une source n’est **pas garantie potable** : un captage protégé retient la terre et les feuilles, pas les microbes, alors faites-la analyser avant de la boire.',
        'What remains is the law and health. In France, taking water from a spring or a stream is regulated (water rights, ecological continuity): check with the **DDT** and the **OFB** before any project; rules differ from one country to another. And spring water is **not guaranteed potable**: a protected catchment holds back soil and leaves, not germs, so have it tested before drinking it.',
      ),
    ],
    figures: [
      chip('Débit du clapet n°1 (modèle)', 'Draw of the n°1 valve (model)', '{drive1} L/min'),
      chip('Source aujourd’hui (vidéo)', 'Spring today (video)', '{source} L/min'),
      chip('Marge du clapet n°1 (dérivé)', 'Margin of the n°1 valve (derived)', '{margin1Pct} %', '{margin1Pct}%'),
      chip('Réserve (dérivée des 10 h)', 'Tank (derived from the 10 h)', '{tankL} L'),
    ],
    focus: { scene: 'catchment', part: 'tank-shell', preset: 'valve-1', scenario: 'source-drop' },
    video: '02:07',
    quiz: [
      {
        q: lx(
          'La source ne donne plus que {spring6} L/min et le bélier (clapet n°1) en prend {drive1}. Que se passe-t-il dans le modèle ?',
          'The spring now gives only {spring6} L/min and the ram (n°1 valve) takes {drive1}. What happens in the model?',
        ),
        choices: [
          lx(
            'La réserve baisse lentement : en ≈ {days6} jours elle est vide et le bélier s’arrête',
            'The tank level falls slowly: in ≈ {days6} days it is empty and the ram stops',
          ),
          lx(
            'Rien : le bélier s’adapte et ne prend que {spring6} L/min',
            'Nothing: the ram adapts and takes only {spring6} L/min',
          ),
          l(
            'La réserve se vide en quelques heures, comme avec le clapet n°3',
            'The tank empties in a few hours, as with the n°3 valve',
          ),
        ],
        answer: 0,
        explain: lx(
          'Le déficit n’est que de {deficit6} L/min : {tankL} L durent alors ≈ {days6} jours. Le clapet n°3, avec ses {deficitN3} L/min de déficit, vidait la même réserve en {hoursN3} h. Un bélier ne s’adapte pas à la source : c’est le réglage du clapet qui décide de ce qu’il prend, d’où l’intérêt d’une marge.',
          'The deficit is only {deficit6} L/min: {tankL} L then last ≈ {days6} days. The n°3 valve, with its {deficitN3} L/min deficit, emptied the same tank in {hoursN3} h. A ram does not adapt to the spring: the valve setting decides what it takes, hence the value of a margin.',
        ),
      },
      {
        q: l(
          'Dans le modèle, on remplace la conduite d’acier par du PVC sans toucher au clapet, qui se ferme toujours aussi vite. Pourquoi le bélier ne refoule-t-il plus rien ?',
          'In the model, the steel pipe is replaced by PVC without touching the valve, which still closes just as fast. Why does the ram no longer deliver anything?',
        ),
        choices: [
          l(
            'Parce que l’eau prend trop de vitesse dans un tuyau lisse',
            'Because the water gathers too much speed in a smooth pipe',
          ),
          l('Parce que le clapet se ferme plus lentement dans du PVC', 'Because the valve closes more slowly in PVC'),
          l(
            'Parce que ρ·a·v est plus faible et n’ouvre plus le clapet de refoulement',
            'Because ρ·a·v is lower and no longer opens the delivery check valve',
          ),
        ],
        answer: 2,
        explain: lx(
          'L’eau atteint à peu près la même vitesse ({pvcVc} m/s contre {vc}) : c’est la vitesse a de l’onde qui change. La surpression ρ·a·v tombe à ≈ {pvcSurge} bar au lieu de ≈ {surge}, sous les ≈ {need} bar qu’il faut. Rappel : c’est un résultat du modèle pour une vitesse d’onde supposée, pas une mesure.',
          'The water reaches about the same speed ({pvcVc} m/s against {vc}): it is the wave speed a that changes. The surge ρ·a·v falls to ≈ {pvcSurge} bar instead of ≈ {surge}, below the ≈ {need} bar needed. Remember: this is a model result for an assumed wave speed, not a measurement.',
        ),
      },
    ],
  },
];
