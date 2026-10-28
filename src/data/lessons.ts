// The six lessons of the lab (docs/research.md §11, wave 3b, rewritten in the fix wave), each with a 3D or simulation focus
// and a quiz of two questions (three for the last lesson).
//
// Who says what. A figure of a lesson is either REPORTED (the video, the NC State table, Wikipedia, the NITK page, Practical
// Action: named in the text), DERIVED (computed from reported figures or from src/three/dims.ts), a MODEL RESULT (an output
// of src/sim for the preset or the scenario the lesson opens: the text says « dans le modèle / in the model ») or an
// ASSUMPTION of the model (the text says so). The numbers are written once, in FIG (the sheets' table, parts/site.ts) and
// in LESSON_FIG below, and placed in the French and the English text through {name} placeholders, so that the two
// languages cannot drift apart; lessons.test.ts re-runs the engine and checks every one of them.
//
// What the video does not show must not be said to be shown: the catchment, the snifter, the gauge, the strainer, the
// valves V1–V3, the union and the foundation are common practice (the lab draws them), and nothing here says that the fins
// turn the valve (unproven) or that the video gives the 5 700 L of the tank (derived from its ten hours, for a spring
// assumed at today's flow). The private transcript is only used to check what the video says and where; none of its
// wording is copied.
//
// Shape of a lesson (lessons.test.ts pins it): 3 to 6 paragraphs of at most 60 words, sentences of at most 28 words, a
// « Regardez… / Look at… » sentence in the first paragraph that tells what to look at in the view the lesson opens; 2 or 3
// figure chips; 2 questions (3 for the last lesson) whose choices are within ±10 % of each other in length. Every term is
// defined before it is used: the waste valve, the tank, the efficiency and the bar in the first lesson, Joukowsky in the
// second, d'Aubuisson and Rankine in the fifth. Visitor text never carries a source code, « monde / world » or a part id.

import type { Lesson, Spec } from '@onigam/lab-kit/content';
import { l, type L } from '@onigam/lab-kit/i18n';
import { AIR_TAU_LOSS, WAVE_SPEED } from '../sim/physics';
import { LENGTH_RATIO_S4, TYPICAL_ETA } from '../sim/sizing';
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
  // ---- derived from dims.ts and the reported figures (K1, K2, K3, K10, K14, K18, K20, K21)
  liftRatio: [SITE.deliveryHead / SITE.fall, 1], // H/h = 65 / 7.5
  lenRatio: [SITE.driveLength / SITE.fall, 1], // L/h = 20 / 7.5
  minLen: [LENGTH_RATIO_S4 * SITE.fall, 1], // 5 × 7.5 m (NC State: at least 5 times the fall)
  ceilingDay: [1250, 0], // q ≤ Q·h/H with Q = 7.5 L/min, in L/day (1 246 rounded)
  ceilingPct: [40, 0], // 500 L/day out of that ceiling, %
  eta04: [0.4, 1], // the same as an efficiency, if the ram took the whole spring
  sourcePct: [33, 0], // spring 7.5 L/min out of the 22.7 L/min of a 1" ram, %
  calcDay: [750, 0], // q = η·Q·h/H with η = 0.6, Q = 7.5 L/min: 748 L/day
  // ---- reported by a source
  etaTypical: [TYPICAL_ETA, 1], // NC State (E = 0.6), Wikipedia (60 %)
  etaMax: [0.8, 1], // Wikipedia
  headRatioMax: [20, 0], // Practical Action: performance of commercial rams up to H/h = 20 (facts review F11)
  // ---- assumptions of the model (the video is silent)
  chamberL: [CHAMBER.volumeL, 0], // air chamber volume, L
  airPct: [60, 0], // air share of the chamber at working pressure, %
  waveSteel: [WAVE_SPEED.steel, 0], // wave speed in the model's steel drive pipe, m/s (calibrated)
  pvcA: [WAVE_SPEED.pvc, 0], // wave speed assumed for the PVC drive pipe of the scenario, m/s
  tauLoss: [AIR_TAU_LOSS / 3600, 0], // time constant of the air loss of the chamber, h (assumed)
  // ---- model results, preset valve n°1 (docs/physics.md §5–6, §8)
  strokes: [RAM.strokesPerMin, 0], // strokes/min (reported 100–110)
  slamMs: [18, 0], // closing time of the waste valve, ms
  vc: [RAM.closingVelocity, 2], // water speed when the valve closes, m/s
  surge: [7.8, 1], // ρ·a·v at that speed, bar
  deliverShare: [3.5, 1], // share of the cycle with the check valve open, % (engine: 3.5, facts review F22)
  ml: [RAM.mlPerStroke, 1], // mL pushed into the chamber per stroke
  takenPerL: [19, 0], // litres taken from the tank for 1 L delivered
  swing: [0.012, 3], // pressure swing of the chamber per stroke, bar
  etaD: [RAM.etaD, 2], // d'Aubuisson efficiency
  etaR: [0.42, 2], // Rankine efficiency
  // ---- model results, stroke and weight (valve n°1)
  s3: [3, 0], // a long stroke, mm
  q3: [RAM.longStrokeFlow, 1], // L/min taken at 3 mm
  s22: [2.2, 1], // the calibrated stroke, mm
  s15: [RAM.noDeliveryStroke, 1], // stroke at which the delivery stops, mm
  s23: [RAM.springLimitStroke, 1], // stroke at which the valve takes the whole spring, mm
  turns: [0.8, 1], // the window between the two, in turns of the 1 mm thread (derived from the two strokes)
  w720: [720, 0], // the doubled weight of the scenario, g
  q155: [RAM.heavyWeightFlow, 1], // L/min taken with it
  d788: [RAM.heavyWeightPerDay, 0], // L/day delivered with it
  hoursHeavy: [12, 0], // hours for the tank to empty with it
  // ---- model results, other scenarios
  wlPerDay: [300, 0], // L/day with a water-logged chamber (295)
  wlDropPct: [40, 0], // % less than the 500 L/day (41)
  loggedHours: [RAM.loggedHours, 0], // hours for a blocked snifter to water-log the chamber
  shortLen: [8, 0], // m of drive pipe of the `short-pipe` scenario
  shortSpm: [259, 0], // strokes/min with it
  etaLong: [0.39, 2], // d'Aubuisson efficiency with a drive pipe of 5 × the fall, valve not re-tuned
  zeroHead: [86, 0], // m of delivery head from which valve n°1 delivers nothing
  zeroRatio: [11.4, 1], // the same as H/h
  pvcSurge: [4.4, 1], // surge of the PVC drive pipe, bar
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
        'Un **bélier hydraulique** n’a ni moteur ni carburant : il n’utilise que l’énergie de l’eau qui tombe. **Regardez** le site : au captage, la **réserve** (la cuve de la source) est à **{fall} m** au-dessus de la fosse du bélier. De la fosse, la conduite de refoulement monte au château d’eau, à **{lift} m**, soit {liftRatio} fois plus haut que la chute.',
        'A **hydraulic ram** has no motor and burns no fuel: it only uses the energy of falling water. **Look at** the site: at the catchment, the **tank** (the spring’s vessel) sits **{fall} m** above the ram pit. From the pit, the delivery pipe climbs to the water tower, **{lift} m** up, that is {liftRatio} times the fall.',
      ),
      lx(
        'Rien n’est créé : c’est un **échange**. Beaucoup d’eau qui descend un peu (un débit Q, en L/min, sur une hauteur h) en fait monter un peu bien plus haut (q, à la hauteur H). Le bilan : q·H ne dépasse jamais Q·h. Pour monter 1 L à {lift} m, il faut donc faire tomber au moins {liftRatio} L de {fall} m.',
        'Nothing is created: it is a **swap**. A lot of water coming down a little (a flow Q, in L/min, through a height h) lifts a little water much higher (q, to the height H). The balance: q·H never exceeds Q·h. To lift 1 L to {lift} m, at least {liftRatio} L must therefore fall {fall} m.',
      ),
      lx(
        'Réglé comme dans la vidéo (clapet n°1), le bélier monte environ **{perDay} L par jour**. Dans la simulation du labo (le « modèle »), il prend {drive1} L/min à la réserve et en monte {delivered1} : ≈ {takenPerL} L pris pour 1 L monté. Le reste ressort par le **clapet de choc**, celui qui claque : cette eau jetée paie la montée.',
        'Set as in the video (valve No. 1), the ram lifts about **{perDay} L a day**. In the lab’s simulation (the “model”) it takes {drive1} L/min from the tank and lifts {delivered1}: ≈ {takenPerL} L taken for every 1 L lifted. The rest leaves through the **waste valve**, the one that slams: that thrown-away water pays for the lift.',
      ),
      lx(
        'La vidéo donne une règle du pouce : **1 m de chute remonte l’eau d’environ 10 m**. Si le bélier prenait toute la source ({source} L/min), le plafond serait ≈ {ceilingDay} L par jour. Les {perDay} L de la vidéo en font {ceilingPct} % : un **rendement** d’environ {eta04}, la part de l’énergie de la chute qui se retrouve dans l’eau montée.',
        'The video gives a rule of thumb: **1 m of fall lifts water about 10 m**. If the ram took the whole spring ({source} L/min), the ceiling would be ≈ {ceilingDay} L a day. The video’s {perDay} L is {ceilingPct}% of that: an **efficiency** of about {eta04}, the share of the fall’s energy that ends up in the water lifted.',
      ),
      lx(
        'Le **bar** mesure la pression : 1 bar équivaut à 10 m de hauteur d’eau. Une question reste : comment {fall} m de chute, qui ne poussent qu’avec {staticBarDrive} bar, envoient-ils l’eau là où la pression atteint {staticBarDelivery} bar ? Par un **coup de bélier** répété, objet de la leçon suivante.',
        'The **bar** measures pressure: 1 bar equals 10 m of water height. One question remains: how can {fall} m of fall, which pushes with only {staticBarDrive} bar, send water to where the pressure reaches {staticBarDelivery} bar? By a repeated **water hammer**, the subject of the next lesson.',
      ),
    ],
    figures: [
      chip('Chute h (vidéo)', 'Fall h (video)', '{fall} m'),
      chip('Hauteur de refoulement H (vidéo)', 'Delivery head H (video)', '{lift} m'),
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
          'Le bélier prend {drive1} L/min de l’eau de la réserve et n’en monte que {delivered1} L/min. Pourquoi n’en monte-t-il pas davantage ?',
          'The ram takes {drive1} L/min of the tank’s water and lifts only {delivered1} L/min of it. Why does it not lift more of it?',
        ),
        choices: [
          l(
            'Monter haut coûte cher en énergie : beaucoup d’eau doit tomber',
            'Lifting high costs energy: a lot of water has to fall',
          ),
          l(
            'Le tuyau de refoulement est trop étroit pour laisser passer plus',
            'The delivery pipe is too narrow to let more through',
          ),
          l(
            'Une partie de l’eau s’infiltre dans le sol avant le bélier',
            'Part of the water soaks into the ground before the ram',
          ),
        ],
        answer: 0,
        explain: lx(
          'Le bélier ne crée pas d’énergie : pour monter 1 L à {lift} m, il faut en faire tomber au moins {liftRatio} de {fall} m, en pratique ≈ {takenPerL} L. Le reste ressort par le clapet de choc : cette eau jetée paie la montée. Un tuyau plus large n’y changerait rien.',
          'The ram creates no energy: to lift 1 L to {lift} m, at least {liftRatio} L must fall {fall} m, in practice ≈ {takenPerL} L. The rest leaves through the waste valve: that thrown-away water pays for the lift. A wider pipe would change nothing.',
        ),
      },
    ],
  },

  // ------------------------------------------------------------------------------------------------ 2. cycle
  {
    id: 'cycle',
    title: l('Le coup de bélier et le cycle en quatre temps', 'The water hammer and the four-phase cycle'),
    summary: lx(
      'Accélérer, claquer, refouler, reculer : environ {strokes} fois par minute, le bélier se réarme tout seul.',
      'Accelerate, slam, deliver, recoil: about {strokes} times a minute, the ram resets itself.',
    ),
    body: [
      lx(
        '**1. Accélération.** **Regardez** le **clapet de choc**, la tige noire à gauche de la cloche bleue : au repos, il pend ouvert. L’eau de la réserve dévale la conduite motrice et s’échappe par lui en prenant de la vitesse. Plus elle va vite, plus elle pousse le clapet vers sa **portée**, son siège conique.',
        '**1. Acceleration.** **Look at** the **waste valve**, the black rod to the left of the blue chamber: at rest it hangs open. Water from the tank rushes down the drive pipe and escapes through it, gathering speed. The faster it goes, the harder it pushes the valve towards its **seat**, the conical face it closes on.',
      ),
      lx(
        '**2. Fermeture.** Le clapet claque en {slamMs} ms et stoppe net la colonne d’eau : c’est le **coup de bélier**. Elle ne roulait qu’à {vc} m/s, moins vite qu’un marcheur, et pourtant la pression bondit de plus de 7 bar. **Joukowsky** l’explique : Δp = ρ·a·v, la densité de l’eau × la vitesse de l’onde d’arrêt (≈ {waveSteel} m/s) × la vitesse de l’eau.',
        '**2. Closing.** The valve slams shut in {slamMs} ms and stops the water column dead: that is the **water hammer**. It moved at only {vc} m/s, slower than a walker, yet the pressure jumps by more than 7 bar. **Joukowsky’s** formula gives it: Δp = ρ·a·v, the water’s density × the stopping wave’s speed (≈ {waveSteel} m/s) × the water’s speed.',
      ),
      lx(
        '**3. Refoulement.** Le choc dépasse les ≈ {need} bar qu’il faut pour soulever le **clapet anti-retour de refoulement** (la colonne de {lift} m moins la chute de {fall} m). Un peu d’eau, ≈ {ml} mL, entre dans la **cloche à air** et monte vers le château d’eau. Puis le clapet se referme.',
        '**3. Delivery.** The surge beats the ≈ {need} bar needed to lift the **delivery check valve** (the {lift} m column minus the {fall} m fall). A little water, ≈ {ml} mL, enters the **air chamber** and goes on up to the water tower. Then the valve shuts.',
      ),
      lx(
        '**4. Recul.** Arrêtée net, l’eau rebondit : un instant, elle repart en arrière. La pression du corps tombe juste sous celle de l’air extérieur, ce qui aspire un peu d’air par le **reniflard**, une minuscule soupape. Le poids rouvre alors le clapet de choc, et tout recommence ≈ {strokes} fois par minute dans le modèle (100 à 110 dans la vidéo).',
        '**4. Recoil.** Stopped, the water bounces back and flows backwards for an instant. The pressure falls just below that of the outside air, which draws a little air in through the **snifter**, a tiny valve. The weight then reopens the waste valve, and it all starts again ≈ {strokes} times a minute in the model (100–110 in the video).',
      ),
      l(
        'Un cycle entier dure environ une demi-seconde. Pour voir chaque phase, activez **Flux** et **Ralenti** (jusqu’à ×1/20) dans la barre d’outils. Ou passez en mode **Simulation** : dans « Le cycle, pas à pas », une pastille par phase fige le bélier, et « Phase suivante » avance d’une phase.',
        'A whole cycle lasts about half a second. To see each phase, switch on **Flows** and **Slow-mo** (down to ×1/20) in the toolbar. Or go to the **Simulation** mode: in “The cycle, step by step”, one chip per phase freezes the ram, and “Next phase” moves on one phase.',
      ),
    ],
    figures: [
      chip('Vitesse à la fermeture (modèle)', 'Speed at closing (model)', '{vc} m/s'),
      chip('Vitesse de l’onde a (modèle, calibrée)', 'Wave speed a (model, calibrated)', '{waveSteel} m/s'),
      chip('Surpression ρ·a·v (modèle)', 'Surge ρ·a·v (model)', '{surge} bar'),
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
          l('La cloche à air, qui comprime l’eau à chaque coup', 'The air chamber, which compresses the water'),
          l('Le poids de l’eau dans la conduite de refoulement', 'The weight of the water in the delivery pipe'),
          l('Une colonne d’eau en mouvement qu’on stoppe net', 'A moving column of water that is stopped dead'),
        ],
        answer: 2,
        explain: lx(
          'C’est l’élan de la colonne de la conduite motrice : stoppée net par le clapet de choc, elle fait monter la pression de ρ·a·v. La cloche ne crée aucune pression, elle lisse le débit ; et la colonne de {lift} m n’est pas la cause du choc, c’est ce qu’il doit vaincre.',
          'It is the momentum of the water column in the drive pipe: stopped dead by the waste valve, it raises the pressure by ρ·a·v. The chamber creates no pressure, it smooths the flow; and the {lift} m column is not the cause of the surge, it is what the surge has to beat.',
        ),
      },
      {
        q: l(
          'Dans quel ordre s’enchaînent les quatre phases d’un cycle du bélier ?',
          'In what order do the four phases of a ram cycle follow one another?',
        ),
        choices: [
          l('Accélération, refoulement, fermeture, recul', 'Acceleration, delivery, closing, recoil'),
          l('Accélération, fermeture, refoulement, recul', 'Acceleration, closing, delivery, recoil'),
          l('Fermeture, accélération, recul, refoulement', 'Closing, acceleration, recoil, delivery'),
        ],
        answer: 1,
        explain: l(
          'L’eau accélère d’abord, jusqu’à plaquer le clapet de choc : c’est la fermeture. Le choc qui en résulte ouvre alors le clapet de refoulement : c’est le refoulement, qui ne peut donc pas venir avant. Enfin l’eau rebondit, c’est le recul, qui rouvre le clapet de choc et relance l’accélération.',
          'The water speeds up first, until it presses the waste valve shut: that is the closing. The shock this causes then opens the delivery check valve: that is the delivery, which therefore cannot come before. Finally the water bounces back, the recoil, which reopens the waste valve and restarts the acceleration.',
        ),
      },
    ],
  },

  // ------------------------------------------------------------------------------------------------ 3. waste-valve
  {
    id: 'waste-valve',
    title: l('Le clapet de choc : là où tout se règle', 'The waste valve: where everything is tuned'),
    summary: lx(
      'Course, poids et taille du clapet fixent le rythme et la consommation : du n°3 (≈ {drawN3} L/min, estimation) au n°1 à {perDay} L par jour.',
      'Stroke, weight and size of the valve set the rhythm and the consumption: from the No. 3 (≈ {drawN3} L/min, estimate) to the No. 1 at {perDay} L a day.',
    ),
    body: [
      lx(
        'Le **clapet de choc** claque. **Regardez** l’écrou de course en surbrillance : il fixe la **course**, l’écart entre la tête du clapet et sa portée quand il est ouvert. Plus la course est longue, plus l’eau s’échappe. Le scénario « Écrou de course vissé » la raccourcit de 0,1 mm toutes les 10 minutes simulées, et le temps accélère de lui-même.',
        'The **waste valve** slams. **Look at** the highlighted stroke nut: it sets the **stroke**, the gap between the valve head and its seat when it is open. The longer the stroke, the more water escapes. The “Stroke nut turned in” scenario shortens it by 0.1 mm every 10 simulated minutes, and time speeds up by itself.',
      ),
      lx(
        'Dans la vidéo, le clapet d’origine (un **n°3**) consommait, selon l’auteur, ≈ {drawN3} L/min (une estimation), alors que la source donne aujourd’hui {source} L/min. La réserve se vidait en ≈ {hoursN3} h et le bélier s’arrêtait. Un **n°2** consommait encore trop ; le **n°1**, fait de raccords de plomberie, monte ≈ {perDay} L par jour.',
        'In the video, the original valve (a **No. 3**) took, according to the author, ≈ {drawN3} L/min (an estimate), while the spring now gives {source} L/min. The tank emptied in ≈ {hoursN3} h and the ram stopped. A **No. 2** still took too much; the **No. 1**, built from plumbing fittings, lifts ≈ {perDay} L a day.',
      ),
      lx(
        'Dans le modèle, la course de {s22} mm (calée sur la vidéo) prend {drive1} L/min et refoule {perDay} L par jour. À {s3} mm, le bélier prend {q3} L/min, plus que la source ; sous {s15} mm, il ne refoule rien : c’est la **course minimale**. La plage utile ne fait que {turns} tour d’écrou, selon le couple course–poids retenu.',
        'In the model, the {s22} mm stroke (calibrated on the video) takes {drive1} L/min and delivers {perDay} L a day. At {s3} mm the ram takes {q3} L/min, more than the spring gives; below {s15} mm it delivers nothing: that is the **minimum stroke**. The useful range is only {turns} turn of the nut, depending on the stroke–weight pair chosen.',
      ),
      lx(
        'Le **poids** tire le clapet vers le bas. Selon la vidéo, il joue un peu dans la fermeture ; dans le modèle, c’est un levier majeur. Doublé à {w720} g (scénario « Poids doublé »), il porte le refoulé à {d788} L par jour, mais la consommation à {q155} L/min. L’eau en plus vient de la réserve, qui se vide en ≈ {hoursHeavy} h.',
        'The **weight** pulls the valve down. The video says it plays a small part in the closing; in the model it is a major lever. Doubled to {w720} g (the “Doubled weight” scenario), it raises the delivery to {d788} L a day, but the consumption to {q155} L/min. The extra water comes from the tank, which empties in ≈ {hoursHeavy} h.',
      ),
      lx(
        'Le but : refouler le plus possible **avec l’eau qu’on a**, donc prendre moins que la source ne donne. Le n°1 prend {drive1} L/min pour {source} L/min de source : l’auteur a ramené la consommation sous le débit de la source avec un clapet plus petit. **Réglez à l’arrêt : jamais un doigt dans le clapet de choc quand le bélier tourne.**',
        'The aim: deliver as much as possible **with the water you have**, so take less than the spring gives. The No. 1 takes {drive1} L/min from a {source} L/min spring: the author brought the consumption below the spring’s flow with a smaller valve. **Adjust at standstill: never a finger in the waste valve while the ram runs.**',
      ),
    ],
    figures: [
      chip('Clapet n°3, estimation de l’auteur', 'No. 3 valve, author’s estimate', '{drawN3} L/min'),
      chip('Clapet n°1 (modèle)', 'No. 1 valve (model)', '{drive1} L/min'),
      chip('Course utile du n°1 (modèle)', 'Working stroke of the No. 1 (model)', '{s15}–{s23} mm'),
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
          l('Mettre un poids plus lourd pour claquer plus fort', 'Fit a heavier weight so the valve slams harder'),
          l('Ouvrir plus grand la vanne de départ de la conduite', 'Open the gate valve of the drive pipe wider'),
        ],
        answer: 0,
        explain: lx(
          'Une course plus courte laisse échapper moins d’eau à chaque cycle : le bélier consomme moins. Un poids plus lourd le ferait consommer davantage ({q155} L/min), et la vanne de départ reste ouverte à fond : elle ne règle pas le débit. La vidéo note qu’une taille de bélier a une consommation minimale : c’est en changeant de taille de clapet que l’auteur est passé sous la source. Le modèle, lui, laisserait marcher un n°3 bien réglé.',
          'A shorter stroke lets less water escape in each cycle: the ram takes less. A heavier weight would make it take more ({q155} L/min), and the gate valve stays fully open while running: it does not set the flow. The video notes that a ram size has a minimum consumption: it is by changing the valve size that the author got below the spring. The model would let a well-tuned No. 3 work.',
        ),
      },
      {
        q: l(
          'Dans le simulateur, on change la course en marche. Sur un vrai bélier, que faut-il faire ?',
          'In the simulator the stroke is changed while the ram runs. On a real ram, what must you do?',
        ),
        choices: [
          l(
            'Régler du bout des doigts, vite, entre deux coups du clapet',
            'Adjust with your fingertips, quickly, between two cycles',
          ),
          l(
            'Retenir le clapet d’un doigt pendant qu’on tourne l’écrou',
            'Hold the valve with a finger while you turn the nut',
          ),
          l(
            'Arrêter l’eau et régler à la clé, jamais avec les doigts',
            'Stop the water and adjust with a spanner, never with fingers',
          ),
        ],
        answer: 2,
        explain: lx(
          'Le clapet se ferme en {slamMs} ms, bien plus vite que la main ne se retire, avec plusieurs bars derrière : entre deux coups, il n’y a pas de « bon moment ». On règle donc à l’arrêt, à la clé. Le simulateur le permet parce que ce n’est qu’un modèle.',
          'The valve shuts in {slamMs} ms, far faster than a hand can pull away, with several bars behind it: between two cycles there is no “right moment”. So you adjust at standstill, with a spanner. The simulator allows it because it is only a model.',
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
      'Three quiet parts that smooth the jolts into a steady flow and keep what each cycle has gained.',
    ),
    body: [
      lx(
        'L’eau ne se comprime pas, l’air si. **Regardez** la **cloche à air** en surbrillance : chaque coup y pousse {ml} mL, qui compriment son coussin d’air. Entre deux coups, l’air se détend et pousse l’eau vers le château d’eau. Dans le modèle (cloche de {chamberL} L à {airPct} % d’air, deux hypothèses), la pression ne varie que de {swing} bar par coup.',
        'Water cannot be compressed, air can. **Look at** the highlighted **air chamber**: each cycle pushes {ml} mL into it, squeezing its cushion of air. Between two cycles the air expands and pushes the water on towards the tower. In the model (a {chamberL} L chamber with {airPct}% air, two assumptions) the pressure moves by only {swing} bar per cycle.',
      ),
      lx(
        'Le **clapet anti-retour de refoulement** ne s’ouvre que le temps du choc, ≈ {deliverShare} % du cycle dans le modèle. Il se referme dès que la pression retombe, et la colonne de {lift} m, qui pèse {staticBarDelivery} bar sur lui, reste en place. Sans lui, chaque recul redescendrait ce que le cycle vient de monter.',
        'The **delivery check valve** opens only for the duration of the shock, ≈ {deliverShare}% of the cycle in the model. It shuts as soon as the pressure falls, and the {lift} m column, which weighs on it with {staticBarDelivery} bar, stays in place. Without it, every recoil would send back down what the cycle had just lifted.',
      ),
      lx(
        'L’air de la cloche se dissout peu à peu dans l’eau sous pression. Le **reniflard**, une minuscule soupape, laisse entrer une pincée d’air à chaque recul, quand la pression passe sous celle de l’air extérieur. Dans le modèle, il recharge la cloche en quelques dizaines de minutes (hypothèse). La vidéo ne le montre pas : c’est une pièce classique des béliers.',
        'The chamber’s air gradually dissolves in the pressurised water. The **snifter**, a tiny valve, lets in a pinch of air at every recoil, when the pressure falls below that of the outside air. In the model it recharges the chamber in a few tens of minutes (assumed). The video does not show it: it is a standard part of rams.',
      ),
      lx(
        'Sans air, la cloche est **noyée** : chaque coup heurte directement la conduite de refoulement. Dans le modèle, la pointe de pression passe de {peak1} bar à plus de 7 bar. Le refoulé tombe à ≈ {wlPerDay} L par jour au lieu de {perDay}, soit {wlDropPct} % de moins.',
        'With no air, the chamber is **water-logged**: every cycle meets the delivery pipe head-on. In the model the pressure peak goes from {peak1} bar to over 7 bar. The delivery falls to ≈ {wlPerDay} L a day instead of {perDay}, about {wlDropPct}% less.',
      ),
      lx(
        'Un reniflard bouché mène à la cloche noyée **sans bruit**, en ≈ {loggedHours} h (résultat du modèle, avec une constante de temps de {tauLoss} h supposée). Le scénario « Cloche à air noyée » montre le résultat, le scénario « Reniflard bouché » la pente qui y mène : le temps accélère de lui-même.',
        'A blocked snifter leads to a water-logged chamber **silently**, in ≈ {loggedHours} h (a model result, with a {tauLoss} h time constant assumed). The “Water-logged air chamber” scenario shows the result, the “Blocked snifter” scenario the slope that leads to it: time speeds up by itself.',
      ),
    ],
    figures: [
      chip('Eau par coup (dérivé)', 'Water per stroke (derived)', '{ml} mL'),
      chip('Refoulé, cloche noyée (modèle)', 'Delivery, water-logged (model)', '−{wlDropPct} %', '−{wlDropPct}%'),
      chip('Reniflard bouché, noyée en (modèle)', 'Blocked snifter, water-logged in (model)', '≈ {loggedHours} h'),
    ],
    focus: { scene: 'ram', part: 'air-chamber', preset: 'valve-1', scenario: 'water-logged' },
    video: '03:26',
    quiz: [
      {
        q: l(
          'À quoi sert le clapet de refoulement, entre le corps et la cloche ?',
          'What is the delivery check valve, between the body and the chamber, for?',
        ),
        choices: [
          l(
            'À laisser entrer l’air dans la cloche à chaque recul',
            'To let fresh air into the chamber at every recoil',
          ),
          l(
            'À garder l’eau déjà montée, sans qu’elle redescende',
            'To keep the water already lifted from running back',
          ),
          l(
            'À claquer pour stopper l’eau et créer le coup de bélier',
            'To slam shut, stop the water and create the hammer',
          ),
        ],
        answer: 1,
        explain: l(
          'Le clapet de refoulement garde ce que le coup a gagné : il se referme quand la pression retombe et la colonne de refoulement ne redescend pas. L’air entre par le reniflard, et c’est le clapet de choc, pas lui, qui claque pour créer le coup de bélier.',
          'The delivery check valve keeps what each cycle has gained: it shuts when the pressure falls so the delivery column does not run back. Air comes in through the snifter, and it is the waste valve, not this one, that slams to create the water hammer.',
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
            'La cloche contient trop d’air et amortit trop chaque coup',
            'The chamber holds too much air and cushions the shock too much',
          ),
          l(
            'Le poids du clapet est devenu trop léger et frappe plus fort',
            'The valve’s weight has become too light and strikes harder',
          ),
        ],
        answer: 0,
        explain: lx(
          'Sans coussin d’air, chaque coup rencontre directement la conduite de refoulement : la pointe passe de {peak1} bar à plus de 7 bar et le refoulé baisse d’environ {wlDropPct} %. Trop d’air ne ferait pas cogner plus fort ; un poids plus léger ferait frapper moins fort (le clapet se ferme sur une eau plus lente) tout en accélérant le rythme.',
          'With no air cushion every cycle meets the delivery pipe head-on: the peak goes from {peak1} bar to over 7 bar and the delivery drops by about {wlDropPct}%. Too much air would not make it knock harder; a lighter weight would make it strike less hard (the valve closes on slower water) while speeding up the rhythm.',
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
        '**Regardez** la conduite motrice en surbrillance. L’université NC State (États-Unis) demande **au moins 5 fois la chute**, soit {minLen} m ici. Celle de la vidéo, {driveLen} m, n’en fait que {lenRatio} fois. Avec {shortLen} m seulement (scénario « Conduite motrice trop courte »), le bélier cogne {shortSpm} fois par minute au lieu de {strokes}.',
        '**Look at** the highlighted drive pipe. NC State University (USA) asks for **at least 5 times the fall**, that is {minLen} m here. The video’s, {driveLen} m, is only {lenRatio} times. With just {shortLen} m (the “Drive pipe too short” scenario) the ram strikes {shortSpm} times a minute instead of {strokes}.',
      ),
      lx(
        'Mais le modèle **ne réajuste pas le clapet** quand on allonge la conduite : à {minLen} m, le rendement baisse à {etaLong}. La règle de NC State suppose un clapet réglé pour cette longueur. Elle donne un ordre de grandeur, pas une garantie.',
        'But the model **does not re-tune the valve** when the pipe is lengthened: at {minLen} m the efficiency falls to {etaLong}. The NC State rule assumes a valve set for that length. It gives an order of magnitude, not a guarantee.',
      ),
      lx(
        'Le **débit de la source** choisit la taille du bélier. Pour un bélier de 1″, NC State demande au moins **{minFlow1in} L/min** ; la source de la vidéo en donne {source}, soit {sourcePct} % de ce minimum. L’auteur a ramené la consommation sous le débit de la source en passant à un clapet plus petit.',
        'The **spring flow** chooses the size of the ram. For a 1″ ram, NC State asks for at least **{minFlow1in} L/min**; the video’s spring gives {source}, that is {sourcePct}% of that minimum. The author brought the consumption below the spring’s flow by moving to a smaller valve.',
      ),
      lx(
        'L’eau monte ici {liftRatio} fois plus haut qu’elle n’est tombée : c’est le **rapport H/h**. Plus il grandit, moins le bélier refoule. Dans le modèle, le n°1 refoule {perDay} L par jour à {lift} m, plus rien dès {zeroHead} m (H/h ≈ {zeroRatio}). Practical Action cite des béliers du commerce jusqu’à H/h = {headRatioMax}. Voyez « Refoulement trop haut ».',
        'The water rises {liftRatio} times higher than it fell here: that is the **H/h ratio**. The bigger it gets, the less the ram delivers. In the model, the No. 1 delivers {perDay} L a day at {lift} m and nothing from {zeroHead} m (H/h ≈ {zeroRatio}). Practical Action cites commercial rams up to H/h = {headRatioMax}. See “Delivery head too high”.',
      ),
      lx(
        'Le **rendement** est la part de l’énergie de la chute qui se retrouve dans l’eau montée. Celui d’**Aubuisson**, η = q·H/(Q·h), la compare à celle de toute l’eau prise : {etaD} pour le n°1 du modèle, {etaTypical} en général (jusqu’à {etaMax}). Celui de **Rankine** ne compte que l’eau rejetée par le clapet de choc, celle qui travaille : {etaR} ici.',
        'The **efficiency** is the share of the fall’s energy found in the water lifted. The **d’Aubuisson** one, η = q·H/(Q·h), compares it with the energy of all the water taken: {etaD} for the model’s No. 1, usually {etaTypical} (up to {etaMax}). The **Rankine** one counts only the water thrown out by the valve, the water that does the work: {etaR} here.',
      ),
      lx(
        'Le calculateur « Dimensionner un bélier » de la **Simulation** estime votre refoulé avec q = η·Q·h/H : ≈ {calcDay} L par jour ici, pour η = {etaTypical}. Retenez deux choses. Une fiche qui annonce un rendement doit dire lequel. Et ce rendement compare des énergies, pas des litres : ≈ {takenPerL} L sont pris pour 1 L monté.',
        'The “Size a ram” calculator in the **Simulation** estimates your delivery with q = η·Q·h/H: ≈ {calcDay} L a day here, for η = {etaTypical}. Keep two things in mind. A datasheet that quotes an efficiency must say which one. And that efficiency compares energies, not litres: ≈ {takenPerL} L are taken for 1 L lifted.',
      ),
    ],
    figures: [
      chip('Conduite minimale pour 7,5 m (dérivé)', 'Minimum pipe for 7.5 m (derived)', '{minLen} m'),
      chip('Débit exigé par un 1″ (NC State)', 'Flow a 1″ ram asks for (NC State)', '{minFlow1in} L/min'),
      chip('Rendement du n°1 (modèle)', 'Efficiency of the No. 1 (model)', '{etaD}'),
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
          'Un bélier prend 10 L/min à la source et en refoule 0,5 L/min à 50 m, avec 5 m de chute. Quel est son rendement d’Aubuisson ?',
          'A ram takes 10 L/min from the spring and delivers 0.5 L/min to 50 m, with a 5 m fall. What is its d’Aubuisson efficiency?',
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
        'La **réserve tampon** reçoit la source et nourrit la conduite motrice. **Regardez** la cuve en surbrillance : la règle d’or est que la source doit donner **plus** que le bélier ne prend. Avec le clapet n°1 du modèle, il prend {drive1} L/min pour {source} L/min de source, et les {surplus1} L/min restants ({margin1Pct} % de marge) partent au trop-plein.',
        'The **buffer tank** receives the spring and feeds the drive pipe. **Look at** the highlighted tank: the golden rule is that the spring must give **more** than the ram takes. With the model’s No. 1 valve it takes {drive1} L/min from a {source} L/min spring, and the remaining {surplus1} L/min ({margin1Pct}% margin) goes to the overflow.',
      ),
      lx(
        'Le clapet n°3 prenait ≈ {drawN3} L/min (estimation de l’auteur) : un **déficit** de {deficitN3} L/min. La réserve, ≈ {tankL} L (dérivés des dix heures de la vidéo, pour une source supposée à {source} L/min), se vidait en ≈ {hoursN3} h. Les sources baissent : le scénario « La source baisse » montre la réserve se vider. Mesurez leur débit à l’étiage, leur niveau le plus bas.',
        'With the No. 3 valve the ram took ≈ {drawN3} L/min (the author’s estimate): a {deficitN3} L/min **deficit**. The tank, ≈ {tankL} L (derived from the video’s ten hours, for a spring assumed at {source} L/min), emptied in ≈ {hoursN3} h. Springs decline: scenario “The spring drops” shows the tank emptying. Measure their flow at low water, the lowest level of the year.',
      ),
      lx(
        'La conduite motrice doit être **rigide** (acier, fonte). Dans le scénario « Conduite en PVC » (résultat du modèle, onde supposée à {pvcA} m/s, non mesurée), le choc tombe à ≈ {pvcSurge} bar pour ≈ {need} nécessaires. Le bélier frappe sans rien refouler. Wikipédia note que le PVC marche parfois, l’acier restant préféré : ce « rien » vaut pour un clapet réglé pour l’acier.',
        'The drive pipe must be **rigid** (steel, cast iron). In the “PVC drive pipe” scenario (a model result, wave speed assumed at {pvcA} m/s, not measured), the surge falls to ≈ {pvcSurge} bar against ≈ {need} needed. The ram strikes and delivers nothing. Wikipedia notes that PVC sometimes works, steel remaining preferred: that “nothing” holds for a valve set for steel.',
      ),
      lx(
        'Chaque coup pousse le corps du bélier de ≈ {thrustN} N, comme le poids de {kg} kg (dérivé). À ≈ {strokes} coups par minute, il doit être **ancré** sur un massif rigide. Et **jamais un doigt dans le clapet de choc** quand il tourne : il se ferme en {slamMs} ms, bien plus vite que la main ne se retire.',
        'Every stroke pushes the ram body with ≈ {thrustN} N, like the weight of {kg} kg (derived). At ≈ {strokes} strokes a minute it must be **anchored** to a rigid block. And **never a finger in the waste valve** while it runs: it shuts in {slamMs} ms, far faster than a hand can pull away.',
      ),
      l(
        'Reste la loi et la santé. En France, prélever l’eau d’une source ou d’un cours d’eau est réglementé (droit d’eau, continuité écologique). Renseignez-vous auprès de la **DDT** et de l’**OFB** avant tout projet ; les règles diffèrent d’un pays à l’autre. Et l’eau d’une source n’est **pas garantie potable** : faites-la analyser avant de la boire.',
        'What remains is the law and health. In France, taking water from a spring or a stream is regulated (water rights, ecological continuity). Check with the **DDT** and the **OFB** before any project; rules differ from one country to another. And spring water is **not guaranteed potable**: have it tested before drinking it.',
      ),
      l(
        '**Et maintenant ?** Rejouez l’histoire de la vidéo dans la **Simulation** (clapet n°3, puis n°1). Essayez votre propre site dans « Dimensionner un bélier », ou suivez le guide d’**Installation**, du captage à la maison.',
        '**What next?** Replay the video’s story in the **Simulation** (valve No. 3, then No. 1). Try your own site in “Size a ram”, or follow the **Installation** guide from the catchment to the house.',
      ),
    ],
    figures: [
      chip('Source aujourd’hui (vidéo)', 'Spring today (video)', '{source} L/min'),
      chip('Débit du clapet n°1 (modèle)', 'Draw of the No. 1 valve (model)', '{drive1} L/min'),
      chip('Marge du clapet n°1 (dérivé)', 'Margin of the No. 1 valve (derived)', '{margin1Pct} %', '{margin1Pct}%'),
    ],
    focus: { scene: 'catchment', part: 'tank-shell', preset: 'valve-1', scenario: 'source-drop' },
    video: '02:07',
    quiz: [
      {
        q: lx(
          'La source ne donne plus que {spring6} L/min et le bélier (clapet n°1) en prend {drive1}. Que se passe-t-il dans le modèle ?',
          'The spring now gives only {spring6} L/min and the ram (No. 1 valve) takes {drive1}. What happens in the model?',
        ),
        choices: [
          lx(
            'La réserve baisse peu à peu : vide en ≈ {days6} jours, le bélier s’arrête',
            'The tank falls gradually: empty in ≈ {days6} days, the ram stops',
          ),
          lx(
            'Rien de grave : le bélier s’adapte et ne prend plus que {spring6} L/min',
            'Nothing serious: the ram adapts and takes only {spring6} L/min now',
          ),
          l(
            'La réserve se vide en quelques heures, comme avec le clapet n°3',
            'The tank empties in a few hours, as with the No. 3 valve',
          ),
        ],
        answer: 0,
        explain: lx(
          'Le déficit n’est que de {deficit6} L/min : une réserve de {tankL} L (dérivée) dure alors ≈ {days6} jours. Le clapet n°3, avec ses {deficitN3} L/min de déficit, la vidait en {hoursN3} h. Un bélier ne s’adapte pas à la source : le réglage du clapet décide de ce qu’il prend, d’où l’intérêt d’une marge.',
          'The deficit is only {deficit6} L/min: a {tankL} L tank (derived) then lasts ≈ {days6} days. The No. 3 valve, with its {deficitN3} L/min deficit, emptied it in {hoursN3} h. A ram does not adapt to the spring: the valve setting decides what it takes, hence the value of a margin.',
        ),
      },
      {
        q: l(
          'Vous installez le bélier de la vidéo sur un vrai site. Quelle installation suit les règles de sécurité ?',
          'You are installing the video’s ram on a real site. Which set-up follows the safety rules?',
        ),
        choices: [
          l(
            'Conduite motrice souple, qui amortit les coups, et bélier simplement posé',
            'A soft drive pipe, which cushions the blows, and a ram just set down',
          ),
          l(
            'Conduite motrice rigide, mais bélier posé sans ancrage dans la fosse',
            'A rigid drive pipe, but a ram set in the pit with no anchor block',
          ),
          l(
            'Conduite motrice rigide en acier, et bélier boulonné sur un massif',
            'A rigid steel drive pipe, and a ram bolted to a rigid anchor block',
          ),
        ],
        answer: 2,
        explain: lx(
          'Un tuyau souple affaiblit le coup : dans le scénario « Conduite en PVC » (résultat du modèle, onde supposée), le choc tombe à ≈ {pvcSurge} bar pour ≈ {need} bar nécessaires. Et chaque coup pousse le corps de ≈ {thrustN} N, ≈ {strokes} fois par minute : le bélier se boulonne sur un massif rigide.',
          'A soft pipe weakens the blow: in the “PVC drive pipe” scenario (a model result, wave speed assumed) the surge falls to ≈ {pvcSurge} bar against ≈ {need} bar needed. And every stroke pushes the body with ≈ {thrustN} N, ≈ {strokes} times a minute: the ram is bolted to a rigid block.',
        ),
      },
      {
        q: l(
          'Vous avez repéré une source sur votre terrain, en France. Que faut-il vérifier avant de la capter pour un bélier ?',
          'You have found a spring on your land, in France. What must you check before tapping it for a ram?',
        ),
        choices: [
          l(
            'Que la source donne au moins 100 L/min, sinon le bélier ne démarre pas',
            'That the spring gives at least 100 L/min, or the ram will not start',
          ),
          l(
            'Les règles de prélèvement (DDT, OFB) et la qualité de l’eau avant de la boire',
            'The water-taking rules (DDT, OFB) and the water quality before drinking',
          ),
          l(
            'Que la conduite motrice est en plastique souple, pour amortir les coups',
            'That the drive pipe is made of soft plastic, so that it cushions the blows',
          ),
        ],
        answer: 1,
        explain: lx(
          'Prélever l’eau d’une source est réglementé (droit d’eau, continuité écologique) : la DDT et l’OFB renseignent avant tout projet. Et la source n’est pas garantie potable : un captage retient la terre, pas les microbes. Quant au débit, la vidéo fait tourner un bélier sur {source} L/min seulement, et un tuyau souple affaiblit le coup.',
          'Taking spring water is regulated (water rights, ecological continuity): the DDT and the OFB advise before any project. And spring water is not guaranteed potable: a catchment holds back soil, not germs. As for flow, the video runs a ram on only {source} L/min, and a soft pipe weakens the blow.',
        ),
      },
    ],
  },
];
