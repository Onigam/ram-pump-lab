import { describe, expect, it } from 'vitest';
import { RamSim } from './engine';
import { CYCLE_PHASES, SCENARIO_IDS } from './presets';
import type { RamParams, ScenarioId } from './types';

// Determinism: the stroke model was rewritten to allocate nothing in its hot loop (one Float64Array of scratch numbers
// instead of a closure, boxed arguments and return values), which must not change a single figure. The numbers below
// were recorded from the engine BEFORE that rewrite (and were found identical to the last digit after it) for a spread of
// settings, a long live run, a run at x3600 that ends in a stall, the eight scenarios and the four frozen phases. They are a
// guard against any later change of the cycle model that is not a deliberate recalibration: if you recalibrate, regenerate
// them (print the same fields from the new engine) and say so in docs/physics.md.

/**
 * Relative tolerance. The model is event-driven (a valve closes when a threshold is crossed), so the last bits of
 * Math.exp / Math.pow, which differ between platforms (macOS and the Linux of the CI), move a few figures by up to
 * about 1e-4: the tolerance sits above that and far below any model change (a recalibration moves figures by percents).
 */
const REL = 1e-3;
const near = (actual: number, expected: number, what: string) => {
  const tol = REL * Math.max(1, Math.abs(expected));
  expect(Math.abs(actual - expected), `${what}: ${actual} against ${expected}`).toBeLessThanOrEqual(tol);
};

/** Settings given to RamSim.sweep and, for each, strokes/min, Q (L/min), q (L/min), closing velocity (m/s), peak, minimum and chamber pressures (bar). */
const SWEEPS: [Partial<RamParams>, number[]][] = [
  [
    { valve: 1, deliveryHead: 65 },
    [
      109.33940774488025, 6.662583925696053, 0.3471066818012143, 0.8711516254659067, 6.505090465570678,
      -0.17777427165906484, 6.493351073310827,
    ],
  ],
  [
    { valve: 2, deliveryHead: 65 },
    [
      110.66027296201217, 6.636107135938387, 0.43436682793850795, 0.9163360820185676, 6.537318579381597,
      -0.16806504002950737, 6.5227055293940746,
    ],
  ],
  [
    { valve: 2, deliveryHead: 130 },
    [
      100.30090270812995, 2.9732451336776764, 0, 0.9163368277870987, 8.836809400261934, -0.2668933148929116,
      12.753000000001508,
    ],
  ],
  [
    { valve: 3, deliveryHead: 40 },
    [
      119.05943049906284, 10.57216045841455, 1.362286814995633, 0.962371390588564, 4.403063874370529,
      -0.07957657360593881, 4.377294872400904,
    ],
  ],
  [
    { valve: 3, deliveryHead: 65 },
    [
      109.54902318788211, 7.021715350429317, 0.5145252945047878, 0.9623714577963253, 6.567387060264113,
      -0.15511448503778197, 6.549770088953555,
    ],
  ],
  [
    { valve: 3, deliveryHead: 130 },
    [
      97.95918367347495, 2.731784779884563, 0, 0.9623717965633606, 9.247300458215733, -0.2539142687966894,
      12.753000000001574,
    ],
  ],
  [
    { stroke: 3 },
    [
      87.30447435431611, 12.826617601593917, 0.7222846051047108, 1.1614549005549917, 6.654832513946251,
      -0.18442049533518126, 6.622840692949125,
    ],
  ],
  [
    { stroke: 6 },
    [
      66.93813800413278, 21.044734382023368, 1.0168361844167095, 1.4769530868378369, 6.790931685367286,
      -0.19034886906192075, 6.729470520235405,
    ],
  ],
  [
    { counterweight: 100 },
    [
      148.75418371142123, 1.1008652779767696, 0, 0.5903650630182697, 5.976823661432569, -0.15687729212095644,
      6.376500000000132,
    ],
  ],
  [
    { counterweight: 720 },
    [
      75.43374402816714, 15.510034596724333, 0.5471782675006012, 1.1187198179599709, 6.592456992130035,
      -0.16059103088514667, 6.564574392629674,
    ],
  ],
  [
    { counterweight: 905 },
    [
      35.21850145276639, 29.33506865345159, 0.3204186778282138, 1.2184103826080783, 6.529464809416234,
      -0.14527286297688263, 6.493176291349235,
    ],
  ],
  [{ counterweight: 1000 }, [0, 41.87780995579327, 0, 1.219032548756742, 0, 0, 0]],
  [
    { driveLength: 20 },
    [
      109.33940774488025, 6.662583925696053, 0.3471066818012143, 0.8711516254659067, 6.505090465570678,
      -0.17777427165906484, 6.493351073310827,
    ],
  ],
  [
    { driveLength: 50 },
    [
      43.404347668828585, 6.908366462736947, 0.27097330702437744, 0.8316159129462928, 6.485667549786717,
      -0.08935440213839262, 6.472752278192551,
    ],
  ],
  [
    { pipeMaterial: 'pvc' },
    [
      90.52504526252814, 3.153418285081214, 0, 0.8883782005190216, 5.096707731857838, -0.12029305880838305,
      6.376500000000886,
    ],
  ],
  [
    { pipeMaterial: 'hdpe' },
    [
      82.10180623974264, 3.039829928322357, 0, 0.9057490556770316, 3.8328362541892576, -0.0551147370197223,
      6.376500000000999,
    ],
  ],
  [
    { waterLogged: true },
    [
      105.87612493383298, 5.524967552224634, 0.20490074990122512, 0.8711514814505275, 7.25971079692933,
      -0.21357484719511216, 6.447923624728036,
    ],
  ],
  [
    { snifterBlocked: true },
    [
      109.43912448700964, 6.687430279487787, 0.3473916883792264, 0.8711509487714062, 6.505176781554623,
      -0.33488700746633215, 6.493444511795594,
    ],
  ],
  [
    { chamberVolume: 0.5 },
    [
      108.98192716375088, 6.555927737438149, 0.33316799151920284, 0.8711511541135769, 6.569732106813459,
      -0.181169712782282, 6.508766200858819,
    ],
  ],
];

describe('the cycle model gives the same figures as before the allocation-free rewrite', () => {
  it('cycle averages over a spread of settings', () => {
    const sim = new RamSim('valve-1');
    for (const [patch, expected] of SWEEPS) {
      const m = sim.sweep(patch);
      const got = [
        m.strokesPerMin,
        m.driveFlow,
        m.deliveredFlow,
        m.closingVelocity,
        m.peakPressure,
        m.minPressure,
        m.chamberPressure,
      ];
      got.forEach((v, i) => near(v, expected[i], `${JSON.stringify(patch)}[${i}]`));
    }
  });

  it('a 30 s live run of the n°1 valve at 60 frames a second', () => {
    const sim = new RamSim('valve-1');
    for (let i = 0; i < 1800; i++) sim.step(1 / 60);
    const s = sim.state;
    near(s.simTime, 29.999999999999577, 'simTime');
    near(s.strokeCount, 55, 'strokeCount');
    near(s.tankLitres, 5700, 'tankLitres');
    near(s.deliveredTotal, 0.17355334090060182, 'deliveredTotal');
    near(s.drivenTotal, 3.331291962848092, 'drivenTotal');
    near(s.bodyPressure, -0.00095093787519625, 'bodyPressure');
    near(s.chamberPressure, 6.493088091911373, 'chamberPressure');
    near(s.peakPressure, 6.499840763355568, 'peakPressure');
    near(s.airFraction, 0.6, 'airFraction');
    expect(s.phase).toBe('recoil');
  });

  it('the n°3 valve at x3600 empties the tank and stalls at the same moment', () => {
    const sim = new RamSim('valve-3');
    sim.set({ timeScale: 3600 });
    for (let i = 0; i < 2400; i++) sim.step(1 / 60);
    const s = sim.state;
    near(s.simTime, 144000, 'simTime');
    near(s.strokeCount, 13, 'strokeCount');
    near(s.tankLitres, 5700, 'tankLitres');
    near(s.deliveredTotal, 637.6638080621989, 'deliveredTotal');
    expect(s.status).toBe('stalled');
    expect(s.stallReason).toBe('tank');
  });

  // simTime, strokes, tank (L), delivered (L), air share, body pressure (bar) after 30 s at 30 frames a second
  const SCENARIOS: Record<ScenarioId, number[]> = {
    'source-drop': [18000, 39, 3003.5934271173937, 318.30140169494115, 0.6, -0.000012584409844599229],
    'stroke-nut': [18000, 90, 5700, 12.942786418013762, 0.6, -0.00016053219626440595],
    'water-logged': [30.00000000000065, 53, 5700, 0.10245037495061399, 0.004, -0.0000011887668097846483],
    'short-pipe': [30.00000000000065, 129, 5699.660865746955, 0.19932865716192263, 0.6, 1.8581796441612146],
    'high-lift': [30.00000000000065, 50, 5700, 0, 0.6, 0.1653927069577538],
    'snifter-blocked': [108000, 54, 5700, 559.7104058729485, 0.004042768199451185, 0.13793584635078868],
    'plastic-pipe': [30.00000000000065, 45, 5700, 0, 0.6, 0.11909356209301765],
    'heavy-weight': [30.00000000000065, 38, 5695.994982701359, 0.27358913375030125, 0.6, 5.6865287923436485],
  };
  it.each(SCENARIO_IDS)('the scenario %s', (id) => {
    const sim = new RamSim('valve-1');
    sim.applyScenario(id);
    for (let i = 0; i < 900; i++) sim.step(1 / 30);
    const s = sim.state;
    const got = [s.simTime, s.strokeCount, s.tankLitres, s.deliveredTotal, s.airFraction, s.bodyPressure];
    got.forEach((v, i) => near(v, SCENARIOS[id][i], `${id}[${i}]`));
  });

  // phase, body pressure (bar), velocity (m/s), waste valve, check valve, chamber pressure (bar), time in phase (s)
  const FROZEN: [string, number, number, number, number, number, number][] = [
    ['accel', 0.21724350578489005, 0.7787947220416036, 1, 0, 6.376500000000003, 0.25160000000000493],
    ['close', 6.3622342794560245, 0.5865244119797738, 0, 0, 6.376500000000003, 0.06079999999999974],
    ['deliver', 6.39085156635749, 0.3078135568199622, 0, 0.8047224371643141, 6.385559714177109, 0.0096],
    [
      'recoil',
      -0.0005585186093750642,
      -0.5600356586521229,
      0.5074156163847277,
      0.012606314445355857,
      6.388910393872648,
      0.0511999999999998,
    ],
  ];
  it.each(CYCLE_PHASES)('the instant held at the phase %s', (phase) => {
    const sim = new RamSim('valve-1');
    sim.holdPhase(phase);
    sim.step(1 / 60);
    const s = sim.state;
    const want = FROZEN[CYCLE_PHASES.indexOf(phase)];
    expect(s.phase).toBe(want[0]);
    [s.bodyPressure, s.driveVelocity, s.wasteValve, s.deliveryValve, s.chamberPressure, s.phaseTime].forEach((v, i) =>
      near(v, want[i + 1] as number, `${phase}[${i}]`),
    );
  });

  it('one whole stroke is sampled the same way', () => {
    const trace = new RamSim('valve-1').strokeTrace();
    expect(trace).not.toBeNull();
    near(trace?.period ?? 0, 548.9999999999396, 'period');
    expect(trace?.t.length).toBe(305);
    near(Math.max(...(trace?.pressure ?? [])), 6.505054274955048, 'pressure peak');
    near(Math.min(...(trace?.velocity ?? [])), -0.631111094633656, 'recoil velocity');
  });
});
