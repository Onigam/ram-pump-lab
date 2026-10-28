import {
  fill,
  h,
  icon,
  ICONS,
  LineChart,
  paragraphs,
  SERIES_COLORS,
  section as kitSection,
  select as kitSelect,
  slider as kitSlider,
  toggle as kitToggle,
  type AppContext,
  type PanelController,
} from '@onigam/lab-kit/ui';
import { num, t, tf, type UiKey } from '../i18n/ui';
import type { RamSim } from '../sim/engine';
import { WAVE_SPEED } from '../sim/physics';
import { CYCLE_PHASES, PRESET_IDS, RANGES, SCENARIO_IDS, VALVE_SETTINGS } from '../sim/presets';
import { nearestPipeSize, PIPE_SIZES, sizeRam, TYPICAL_ETA, type PipeSizeId, type SizingWarning } from '../sim/sizing';
import type {
  CyclePhase,
  Means,
  PipeMaterial,
  PresetId,
  RamParams,
  RamState,
  ScenarioId,
  StrokeTrace,
  ValveId,
} from '../sim/types';
import {
  headPatches,
  HEADS,
  KEY_READOUTS,
  MORE_READOUTS,
  PHASE_HEADLINE_KEYS,
  PHASE_KEYS,
  PRESET_KEYS,
  pumpQueues,
  SCENARIO_CAPTION_KEYS,
  SCENARIO_KEYS,
  STROKES,
  strokePatches,
  SWEEP_BUDGET_MS,
  WEIGHTS,
  type CurveJob,
  type ReadoutDef,
} from './model';

// Simulation mode, in the order a visitor needs it: what the panel is for, the story of the video (the three valves),
// the status of the ram, the cycle step by step (freeze a phase, one whole stroke drawn with the frozen instant on it),
// the scenarios with the line that says what to look at, the six main figures and the nine behind "More figures" (with a
// "Reading the figures" help), the site and ram controls, the sizing calculator and the charts (oscilloscope, sweeps,
// tank level). The stroke cycle itself is in the 3D view. What is shown is described in model.ts.

const MATERIALS: [PipeMaterial, UiKey][] = [
  ['steel', 'matSteel'],
  ['pvc', 'matPvc'],
  ['hdpe', 'matHdpe'],
];

const VALVE_COLORS: Record<ValveId, string> = { 1: SERIES_COLORS.hydro, 2: SERIES_COLORS.load, 3: SERIES_COLORS.dump };

type SweepVar = 'stroke' | 'weight';

/** The inputs of the sizing calculator: its own values, so that trying a site never disturbs the live run. */
interface SizeInputs {
  fall: number;
  head: number;
  source: number;
  pipe: PipeSizeId;
  length: number;
}

/** Real seconds the parameters must stay unchanged before a sweep starts (the sliders keep moving meanwhile). */
const SWEEP_DELAY = 0.4;

/** One cell of the grid of figures (label, value, unit): the readouts and the figures of a frozen phase. */
function readoutCell(label: string, value: string, unit = ''): HTMLElement {
  return h(
    'div',
    { class: 'readout' },
    h('span', {}, label),
    h('b', {}, value, unit ? h('small', {}, ` ${unit}`) : null),
  );
}

/**
 * Layout of the grids of figures: as many columns as fit, none narrower than 100 px. The kit's grid is three columns (two on
 * a phone) whatever the width of the panel, which is only 270 px wide on a tablet: the labels, written in full, were then
 * cut by an ellipsis. (A kit request, `.readouts` as auto-fit, would make this line unnecessary.)
 */
const GRID_STYLE = 'grid-template-columns: repeat(auto-fit, minmax(100px, 1fr))';

/**
 * A grid of live figures. The cells are built once (label, value, unit) and only their text is replaced when a value
 * changes, five times a second: rebuilding the grid at that rate created about 300 elements a second.
 */
class ReadoutGrid {
  readonly el = h('div', { class: 'readouts', style: GRID_STYLE });
  private readonly values: Text[] = [];

  constructor(private readonly defs: readonly ReadoutDef[]) {
    for (const d of defs) {
      const value = document.createTextNode('');
      this.values.push(value);
      this.el.append(
        h(
          'div',
          { class: 'readout' },
          h('span', {}, t(d.key)),
          h('b', {}, value, d.unit ? h('small', {}, ` ${d.unit}`) : null),
        ),
      );
    }
  }

  update(s: RamState): void {
    this.defs.forEach((d, i) => {
      const text = num(d.value(s), d.digits);
      if (this.values[i].data !== text) this.values[i].data = text;
    });
  }
}

/** Nominal size of a drive pipe as written in the sources: ¾″, 1″, 1½″, 2″. */
function sizeLabel(id: PipeSizeId): string {
  return { '3/4': '¾″', '1': '1″', '1-1/2': '1½″', '2': '2″' }[id];
}

/** A duration in hours: minutes under an hour ("38 min"), hours with a decimal above ("11,9 h"). */
function duration(hours: number): string {
  return hours < 1 ? `${num(hours * 60)} min` : `${num(hours, 1)} h`;
}

interface StrokeSweep {
  xs: number[];
  q: number[];
  d: number[];
}

interface Sweep<T> {
  key: string;
  wait: number;
  /** Slices of the cycle solve still to do (the first queue of `pumpQueues` goes first). */
  queue: CurveJob[];
  data: T;
}

export class SimPanel implements PanelController {
  readonly el = h('div', { class: 'sim' });
  /** The chips of the story (the three valves and "Custom"), refreshed from the parameters. */
  private presetChips: [PresetId | 'custom', HTMLButtonElement][] = [];
  private restartButton: HTMLButtonElement | null = null;
  private status = h('div', {});
  /** The six main figures, and the nine behind "More figures". */
  private readouts = new ReadoutGrid(KEY_READOUTS);
  private moreReadouts = new ReadoutGrid(MORE_READOUTS);
  /** The last scenario played (null after a preset or at the start): its caption says what to look at. */
  private scenario: ScenarioId | null = null;
  private scenarioNote = h('p', { class: 'hint' });
  private moreOpen = false;
  private helpOpen = false;
  private scopeP: LineChart;
  private scopeV: LineChart;
  private headChart: LineChart;
  private strokeQ: LineChart;
  private strokeD: LineChart;
  private tankChart: LineChart;
  private computing = h('p', { class: 'hint' });
  private lastReadouts = 0;
  private lastCharts = 0;
  private lastScope = 0;
  private sweepHead: Sweep<Record<string, number[]>> = { key: '', wait: 0, queue: [], data: {} };
  private sweepStroke: Sweep<StrokeSweep> = { key: '', wait: 0, queue: [], data: { xs: [], q: [], d: [] } };
  private sweepTrace: Sweep<StrokeTrace | null> = { key: '', wait: 0, queue: [], data: null };
  private sweepVar: SweepVar = 'stroke';
  // the cycle section
  private traceP: LineChart;
  private traceV: LineChart;
  private phaseChips: HTMLButtonElement[] = [];
  private stepButton: HTMLButtonElement | null = null;
  private resumeButton: HTMLButtonElement | null = null;
  private cycleNote = h('p', { class: 'hint' });
  private cycleCard = h('div', {});
  private cycleOpen = true;
  // the sizing calculator
  private sizeOpen = false;
  private size: SizeInputs;
  private sizeResult = h('div', {});

  constructor(private ctx: AppContext<RamSim>) {
    this.size = this.siteInputs();
    const seconds = (v: number) => (v === 0 ? '0' : `${num(v, 1)} s`);
    const ms = (v: number) => (v === 0 ? '0' : `${num(v)} ms`);
    this.traceP = new LineChart({
      height: 90,
      series: [{ key: 'p', label: () => t('seriesPressure'), color: SERIES_COLORS.dump }],
      yMin: -0.5,
      yFmt: (v) => num(v, 1),
      xFmt: ms,
      markers: () => this.traceMarkers('p'),
    });
    this.traceV = new LineChart({
      height: 90,
      series: [{ key: 'v', label: () => t('seriesVelocity'), color: SERIES_COLORS.hydro }],
      yMin: -1,
      yFmt: (v) => num(v, 1),
      xFmt: ms,
      markers: () => this.traceMarkers('v'),
    });
    this.scopeP = new LineChart({
      height: 70,
      series: [{ key: 'p', label: () => t('seriesPressure'), color: SERIES_COLORS.dump }],
      yMin: 0,
      yFmt: (v) => num(v, 1),
      xFmt: seconds,
      markers: () => this.scopeMarkers(),
    });
    this.scopeV = new LineChart({
      height: 70,
      series: [{ key: 'v', label: () => t('seriesVelocity'), color: SERIES_COLORS.hydro }],
      yMin: -1,
      yFmt: (v) => num(v, 1),
      xFmt: seconds,
      markers: () => this.scopeMarkers(),
    });
    this.headChart = new LineChart({
      height: 160,
      series: ([1, 2, 3] as ValveId[]).map((v) => ({
        key: String(v),
        label: () => t(`seriesValve${v}` as UiKey),
        color: VALVE_COLORS[v],
      })),
      yFmt: (v) => num(v),
      xFmt: (v) => `${num(v)} m`,
      markers: () => {
        const s = this.ctx.sim.state;
        return [{ x: s.deliveryHead, y: s.deliveredPerDay, label: `${num(s.deliveredPerDay)} ${t('unitPerDay')}` }];
      },
    });
    this.strokeQ = new LineChart({
      height: 110,
      series: [
        { key: 'q', label: () => t('seriesConsumption'), color: SERIES_COLORS.hydro },
        { key: 'source', label: () => t('seriesSource'), color: SERIES_COLORS.pv, dash: true },
      ],
      yFmt: (v) => num(v),
      xFmt: (v) => this.sweepX(v),
      markers: () => {
        const s = this.ctx.sim.state;
        return [{ x: this.sweepPoint(), y: s.driveFlow, label: `${num(s.driveFlow, 1)} L/min` }];
      },
    });
    this.strokeD = new LineChart({
      height: 110,
      series: [{ key: 'd', label: () => t('seriesDelivered'), color: SERIES_COLORS.dump }],
      yFmt: (v) => num(v),
      xFmt: (v) => this.sweepX(v),
      markers: () => {
        const s = this.ctx.sim.state;
        return [{ x: this.sweepPoint(), y: s.deliveredPerDay, label: `${num(s.deliveredPerDay)} ${t('unitPerDay')}` }];
      },
    });
    this.tankChart = new LineChart({
      height: 90,
      series: [{ key: 'tank', label: () => t('seriesTank'), color: SERIES_COLORS.hydro }],
      yMin: 0,
      yMax: 100,
      yFmt: (v) => `${Math.round(v)} %`,
      xFmt: (v) => `${num(v, 1)} h`,
    });
  }

  /** Apply a change live. Sliders pass rerender=false so the dragged input survives. */
  private set(patch: Partial<RamParams>, rerender = true): void {
    this.ctx.sim.set(patch);
    if (rerender) this.render();
    else this.tick(0, true);
  }

  render(): void {
    const sim = this.ctx.sim;
    const p = sim.params;

    // the story of the video: valve No. 3 empties the tank, No. 2 is a trial, No. 1 saves it
    this.presetChips = [
      ...PRESET_IDS.map((id): [PresetId | 'custom', HTMLButtonElement] => [
        id,
        h(
          'button',
          {
            class: 'part-chip',
            onclick: () => {
              this.scenario = null;
              sim.applyPreset(id);
              this.render();
            },
          },
          t(PRESET_KEYS[id]),
        ),
      ]),
      ['custom', h('button', { class: 'part-chip', disabled: true }, t('custom'))],
    ];

    const restart = h(
      'button',
      {
        class: 'btn',
        disabled: sim.state.status !== 'stalled' || sim.state.stallReason === 'gate',
        onclick: () => {
          sim.restart();
          this.render();
        },
      },
      icon(ICONS.play, 16),
      t('restart'),
    );
    this.restartButton = restart;

    const slider = (
      key: UiKey,
      field: keyof typeof RANGES,
      fmt: (v: number) => string,
      value: number = p[field] as number,
    ) =>
      kitSlider(t(key), value, RANGES[field].min, RANGES[field].max, RANGES[field].step, fmt, (v) =>
        this.set({ [field]: v } as Partial<RamParams>, false),
      );

    this.readouts = new ReadoutGrid(KEY_READOUTS);
    this.moreReadouts = new ReadoutGrid(MORE_READOUTS);
    fill(
      this.el,
      h('div', { class: 'eyebrow eyebrow--accent' }, t('simTitle')),
      h('p', { class: 'hint' }, t('simIntro')),
      h('div', { class: 'eyebrow' }, t('story')),
      h('div', { class: 'part-chips' }, ...this.presetChips.map(([, chip]) => chip)),
      h('p', { class: 'hint' }, t('presetHint')),
      h(
        'div',
        { class: 'sim-top' },
        h('button', { class: 'btn', onclick: () => (sim.reset(), this.render()) }, icon(ICONS.reset, 16), t('reset')),
        restart,
      ),
      this.status,
      this.buildCycle(),
      h('div', { class: 'eyebrow' }, t('scenarios')),
      h(
        'div',
        { class: 'part-chips' },
        ...SCENARIO_IDS.map((id) =>
          h(
            'button',
            {
              class: `part-chip${this.scenario === id ? ' is-on' : ''}`,
              'aria-pressed': this.scenario === id ? 'true' : 'false',
              onclick: () => {
                this.scenario = id;
                sim.applyScenario(id);
                this.render();
              },
            },
            t(SCENARIO_KEYS[id]),
          ),
        ),
      ),
      this.scenarioNote,
      h('p', { class: 'hint' }, t('scenarioHint')),
      h('div', { class: 'eyebrow' }, t('readouts')),
      this.readouts.el,
      this.collapsible(t('moreFigures'), this.moreOpen, (open) => (this.moreOpen = open), this.moreReadouts.el),
      this.collapsible(
        t('readFigures'),
        this.helpOpen,
        (open) => (this.helpOpen = open),
        ...paragraphs(t('readoutsHelp'), 'hint'),
      ),
      kitSection(
        t('secSite'),
        slider('fall', 'fall', (v) => `${num(v, 1)} m`),
        slider('driveLength', 'driveLength', (v) => `${num(v)} m`),
        slider('driveDiameter', 'driveDiameter', (v) => `${num(v)} mm`),
        kitSelect<PipeMaterial>(
          t('pipeMaterial'),
          p.pipeMaterial,
          MATERIALS.map(([id, key]) => [id, `${t(key)} · ${WAVE_SPEED[id]} m/s`] as [PipeMaterial, string]),
          (v) => this.set({ pipeMaterial: v }),
        ),
        slider('deliveryHead', 'deliveryHead', (v) => `${num(v)} m`),
        slider('deliveryLength', 'deliveryLength', (v) => `${num(v)} m`),
        slider('sourceFlow', 'sourceFlow', (v) => `${num(v, 1)} L/min`),
        slider('tankVolume', 'tankVolume', (v) => `${num(v)} L`),
      ),
      kitSection(
        t('secRam'),
        kitSelect<ValveId>(
          t('valve'),
          p.valve,
          [
            [1, t('valveOption1')],
            [2, t('valveOption2')],
            [3, t('valveOption3')],
          ],
          (v) => this.set({ valve: v, ...VALVE_SETTINGS[v] }),
        ),
        h('p', { class: 'hint' }, t('valveHint')),
        slider('stroke', 'stroke', (v) => `${num(v, 1)} mm`),
        slider('counterweight', 'counterweight', (v) => `${num(v)} g`),
        slider('chamberVolume', 'chamberVolume', (v) => `${num(v, 1)} L`),
        kitToggle(t('waterLogged'), p.waterLogged, (v) => this.set({ waterLogged: v })),
        kitToggle(t('snifterBlocked'), p.snifterBlocked, (v) => this.set({ snifterBlocked: v })),
      ),
      this.buildSize(),
      h('div', { class: 'eyebrow' }, t('chartScope')),
      this.scopeP.el,
      h('div', { class: 'eyebrow' }, t('chartScopeSpeed')),
      this.scopeV.el,
      h('p', { class: 'hint' }, t('chartScopeHint')),
      h('div', { class: 'eyebrow' }, t('chartHead')),
      this.headChart.el,
      h('p', { class: 'hint' }, t('chartHeadHint')),
      kitSelect<SweepVar>(
        t('sweepBy'),
        this.sweepVar,
        [
          ['stroke', t('sweepStroke')],
          ['weight', t('sweepWeight')],
        ],
        (v) => {
          this.sweepVar = v;
          this.sweepStroke.data = { xs: [], q: [], d: [] }; // no curve of the other variable under the new axis
          this.sweepStroke.key = '';
          this.render();
        },
      ),
      h('div', { class: 'eyebrow' }, t(this.sweepVar === 'stroke' ? 'chartStroke' : 'chartWeight')),
      this.strokeQ.el,
      h('div', { class: 'eyebrow' }, t(this.sweepVar === 'stroke' ? 'chartStrokeDelivered' : 'chartWeightDelivered')),
      this.strokeD.el,
      h('p', { class: 'hint' }, t(this.sweepVar === 'stroke' ? 'chartStrokeHint' : 'chartWeightHint')),
      this.computing,
      h('div', { class: 'eyebrow' }, t('chartTank')),
      this.tankChart.el,
      h('p', { class: 'hint' }, t('chartTankHint')),
    );
    this.tick(0, true);
  }

  /** Refresh the readouts (5 Hz) and the charts (2–4 Hz); runs the curve computations a few at a time. */
  tick(dt: number, force = false): void {
    this.lastReadouts += dt;
    this.lastCharts += dt;
    this.lastScope += dt;
    this.runSweeps(dt);
    if (force || this.lastReadouts > 0.2) {
      this.lastReadouts = 0;
      this.renderStatus();
      this.renderReadouts();
      this.renderCycle();
    }
    if (force || this.lastScope > 0.25) {
      this.lastScope = 0;
      this.drawScope();
    }
    if (force || this.lastCharts > 0.5) {
      this.lastCharts = 0;
      this.drawCurves();
    }
  }

  // ------------------------------------------------------------------ the cycle, step by step

  /** A collapsible section whose open state survives a re-render of the panel. */
  private collapsible(title: string, open: boolean, onToggle: (open: boolean) => void, ...children: HTMLElement[]) {
    const el = kitSection(title, ...children) as HTMLDetailsElement;
    el.open = open;
    el.addEventListener('toggle', () => onToggle(el.open));
    return el;
  }

  private buildCycle(): HTMLElement {
    const sim = this.ctx.sim;
    this.phaseChips = CYCLE_PHASES.map((phase, i) =>
      h(
        'button',
        {
          class: 'part-chip',
          onclick: () => {
            if (sim.state.phaseHeld !== phase) this.showRam();
            sim.holdPhase(sim.state.phaseHeld === phase ? null : phase);
            this.renderCycle();
          },
        },
        `${i + 1} · ${t(PHASE_KEYS[phase])}`,
      ),
    );
    this.stepButton = h(
      'button',
      {
        class: 'btn',
        onclick: () => {
          this.showRam();
          sim.stepPhase();
          this.renderCycle();
        },
      },
      icon(ICONS.next, 16),
      t('cycleStep'),
    );
    this.resumeButton = h(
      'button',
      {
        class: 'btn',
        onclick: () => {
          sim.holdPhase(null);
          this.renderCycle();
        },
      },
      icon(ICONS.play, 16),
      t('cycleResume'),
    );
    const el = this.collapsible(
      t('secCycle'),
      this.cycleOpen,
      (open) => (this.cycleOpen = open),
      h('div', { class: 'part-chips' }, ...this.phaseChips),
      h('div', { class: 'sim-top' }, this.stepButton, this.resumeButton),
      this.cycleNote,
      this.cycleCard,
      h('div', { class: 'eyebrow' }, t('chartCycle')),
      this.traceP.el,
      h('div', { class: 'eyebrow' }, t('chartCycleSpeed')),
      this.traceV.el,
      h('p', { class: 'hint' }, t('chartCycleHint')),
    );
    this.renderCycle();
    return el;
  }

  /** A frozen phase is for looking at the ram: leave the landscape and the catchment for the ram's own world. */
  private showRam(): void {
    if (this.ctx.ui.scene === 'site' || this.ctx.ui.scene === 'catchment') this.ctx.gotoScene('ram');
  }

  /** Refresh the chips, the note and the card of the frozen phase from the live state. */
  private renderCycle(): void {
    const sim = this.ctx.sim;
    const s = sim.state;
    const held = s.phaseHeld;
    const running = s.status === 'running';
    CYCLE_PHASES.forEach((phase, i) => {
      const chip = this.phaseChips[i];
      if (!chip) return;
      chip.classList.toggle('is-on', held === phase);
      chip.setAttribute('aria-pressed', String(held === phase));
      const absent = running && !sim.phaseOccurs(phase);
      chip.disabled = !running || absent;
      chip.title = absent ? t('cycleNoDelivery') : '';
    });
    if (this.stepButton) this.stepButton.disabled = !running;
    if (this.resumeButton) this.resumeButton.disabled = held === null;

    const m = sim.averages;
    if (!running) {
      fill(this.cycleNote, t('cycleStopped'));
      fill(this.cycleCard);
    } else if (held === null) {
      const period = m.strokesPerMin > 0 ? 60000 / m.strokesPerMin : 0;
      const [a, c, d, r] = m.phaseShare.map((share) => num(share * period));
      fill(this.cycleNote, tf('cycleLive', { t: num(period), a, c, d, r }), ' ', t('cycleHint'));
      fill(this.cycleCard);
    } else {
      fill(this.cycleNote);
      fill(this.cycleCard, this.phaseCard(held));
    }
  }

  /** The explanation of a frozen phase: what moves, and what the numbers are at that instant. */
  private phaseCard(phase: CyclePhase): HTMLElement {
    const sim = this.ctx.sim;
    const s = sim.state;
    const m = sim.averages;
    const k = CYCLE_PHASES.indexOf(phase);
    const phaseMs = m.strokesPerMin > 0 ? m.phaseShare[k] * (60000 / m.strokesPerMin) : 0;
    let text: string;
    switch (phase) {
      case 'accel':
        text = tf('descAccel', { h: num(s.fall, 1), v: num(s.driveVelocity, 2), jet: num(s.wasteJetFlow, 1) });
        break;
      case 'close':
        text = sim.phaseOccurs('deliver')
          ? tf('descClose', {
              vc: num(s.closingVelocity, 2),
              p: num(s.bodyPressure, 1),
              head: num(s.deliveryStaticBar, 1),
              surge: num(s.surgeBar, 1),
            })
          : tf('descCloseWeak', {
              vc: num(s.closingVelocity, 2),
              a: num(s.waveSpeed),
              surge: num(s.surgeBar, 1),
              p: num(s.bodyPressure, 1),
              need: num(s.surgeNeededBar, 1),
              head: num(s.deliveryStaticBar, 1),
            });
        break;
      case 'deliver':
        text = tf('descDeliver', {
          check: num(s.deliveryValve * 100),
          q: num(s.deliveredFlowNow, 1),
          ms: num(phaseMs),
        });
        break;
      default:
        text = tf('descRecoil', { v: num(Math.abs(s.driveVelocity), 2), valve: num(s.wasteValve * 100) });
    }
    return h(
      'div',
      {},
      h('div', { class: 'eyebrow eyebrow--accent' }, `${k + 1} · ${t(PHASE_KEYS[phase])}`),
      h(
        'div',
        { class: 'callout callout--tip' },
        h('span', {}, h('strong', {}, t(PHASE_HEADLINE_KEYS[phase])), ' ', text),
      ),
      h('div', { class: 'eyebrow' }, t('cycleNow')),
      h(
        'div',
        { class: 'readouts', style: GRID_STYLE },
        readoutCell(t('cardValve'), num(s.wasteValve * 100), '%'),
        readoutCell(t('cardCheck'), num(s.deliveryValve * 100), '%'),
        readoutCell(t('cardSpeed'), num(s.driveVelocity, 2), 'm/s'),
        readoutCell(t('cardBody'), num(s.bodyPressure, 1), 'bar'),
        readoutCell(t('liveChamber'), num(s.chamberPressure, 1), 'bar'),
        readoutCell(t('cardJet'), num(s.wasteJetFlow, 1), 'L/min'),
        readoutCell(t('cardInto'), num(s.deliveredFlowNow, 1), 'L/min'),
        readoutCell(t('cardInPhase'), num(s.phaseTime * 1000, 1), 'ms'),
      ),
    );
  }

  private drawTrace(): void {
    const tr = this.sweepTrace.data;
    if (tr) {
      this.traceP.setData(tr.t, { p: tr.pressure });
      this.traceV.setData(tr.t, { v: tr.velocity });
    } else {
      this.traceP.setData([], { p: [] });
      this.traceV.setData([], { v: [] });
    }
    this.traceP.draw();
    this.traceV.draw();
  }

  /** Phase starts (1 to 4) on the whole-stroke chart, and the frozen instant as a dot on the curve with its value. */
  private traceMarkers(which: 'p' | 'v') {
    const tr = this.sweepTrace.data;
    const s = this.ctx.sim.state;
    const out: { x: number; y?: number; label: string }[] = [];
    if (!tr) return out;
    CYCLE_PHASES.forEach((_, k) => {
      if (tr.start[k] >= 0) out.push({ x: tr.start[k], label: tr.length[k] >= 0.04 * tr.period ? String(k + 1) : '' });
    });
    if (s.phaseHeld && s.status === 'running') {
      const k = CYCLE_PHASES.indexOf(s.phaseHeld);
      const x = tr.start[k] + s.phaseTime * 1000;
      let i = 0;
      while (i < tr.t.length - 1 && tr.t[i + 1] <= x) i++;
      const y = which === 'p' ? tr.pressure[i] : tr.velocity[i];
      const value = which === 'p' ? `${num(s.bodyPressure, 1)} bar` : `${num(s.driveVelocity, 2)} m/s`;
      out.push({ x, label: '' });
      out.push({ x, y, label: `${t('cycleFrozen')} ${value}` });
    }
    return out;
  }

  /** On the live oscilloscope: while the cycle is frozen, its last instant is the right edge. */
  private scopeMarkers() {
    const s = this.ctx.sim.state;
    if (!s.phaseHeld || s.status !== 'running') return [];
    const k = CYCLE_PHASES.indexOf(s.phaseHeld);
    return [{ x: 0, label: `${k + 1} · ${t(PHASE_KEYS[s.phaseHeld])}` }];
  }

  // ------------------------------------------------------------------ the sizing calculator

  /** The site of the live simulation as calculator inputs. */
  private siteInputs(): SizeInputs {
    const p = this.ctx.sim.params;
    return {
      fall: p.fall,
      head: p.deliveryHead,
      source: p.sourceFlow,
      pipe: nearestPipeSize(p.driveDiameter).id,
      length: p.driveLength,
    };
  }

  private buildSize(): HTMLElement {
    const sim = this.ctx.sim;
    const inputs = this.size;
    const input = (
      label: UiKey,
      key: 'fall' | 'head' | 'source' | 'length',
      min: number,
      max: number,
      step: number,
      fmt: (v: number) => string,
    ) =>
      kitSlider(t(label), inputs[key], min, max, step, fmt, (v) => {
        inputs[key] = v;
        this.renderSize();
      });
    const el = this.collapsible(
      t('secSize'),
      this.sizeOpen,
      (open) => (this.sizeOpen = open),
      h('p', { class: 'hint' }, t('sizeIntro')),
      input('fall', 'fall', RANGES.fall.min, RANGES.fall.max, RANGES.fall.step, (v) => `${num(v, 1)} m`),
      input(
        'deliveryHead',
        'head',
        RANGES.deliveryHead.min,
        RANGES.deliveryHead.max,
        RANGES.deliveryHead.step,
        (v) => `${num(v)} m`,
      ),
      input('sourceFlow', 'source', 1, 120, 0.5, (v) => `${num(v, 1)} L/min`),
      kitSelect<PipeSizeId>(
        t('sizePipe'),
        inputs.pipe,
        PIPE_SIZES.map((sz) => [sz.id, `${sizeLabel(sz.id)} · Ø ${sz.innerMm} mm`] as [PipeSizeId, string]),
        (v) => {
          inputs.pipe = v;
          this.renderSize();
        },
      ),
      input('sizeLength', 'length', 5, 150, 1, (v) => `${num(v)} m`),
      h(
        'div',
        { class: 'sim-top' },
        h(
          'button',
          {
            class: 'btn',
            onclick: () => {
              this.size = this.siteInputs();
              this.render();
            },
          },
          icon(ICONS.reset, 16),
          t('sizeLoad'),
        ),
        h(
          'button',
          {
            class: 'btn',
            onclick: () => {
              // the pipe size is left alone: the simulation models one ram, a 1" with the three waste valves
              sim.set({
                fall: inputs.fall,
                deliveryHead: inputs.head,
                sourceFlow: inputs.source,
                driveLength: inputs.length,
              });
              this.render();
            },
          },
          icon(ICONS.play, 16),
          t('sizeApply'),
        ),
      ),
      this.sizeResult,
    );
    this.renderSize();
    return el;
  }

  /** The result card of the calculator: verdict, figures, warnings. Pure functions of src/sim/sizing.ts. */
  private renderSize(): void {
    const s = this.ctx.sim.state;
    const i = this.size;
    const r = sizeRam({
      fall: i.fall,
      deliveryHead: i.head,
      sourceFlow: i.source,
      pipe: i.pipe,
      driveLength: i.length,
    });
    const pipe = sizeLabel(r.pipe.id);
    const ok = r.sourceEnough;
    const verdictVars = {
      src: num(i.source, 1),
      min: num(r.minSource, 1),
      pipe,
      pct: num(r.sourceRatio * 100),
    };
    const callout = (cls: string, text: string, warn = false) =>
      h('div', { class: `callout ${cls}` }, warn ? icon(ICONS.warn, 16) : icon(ICONS.ok, 16), h('span', {}, text));
    const delivery = (eta: number) => {
      const d = sizeRam({ fall: i.fall, deliveryHead: i.head, sourceFlow: i.source, pipe: i.pipe }, eta).delivery;
      return `${num(d.lpd)} ${t('unitPerDay')}`;
    };
    const rows: [string, string][] = [
      [t('sizeMinLength'), `${num(r.minLength, 1)} m · 5 × h`],
      [t('sizeUsualLength'), `${num(r.usualLength[0], 1)} – ${num(r.usualLength[1], 1)} m · 3–7 × h`],
      [`${t('sizeTable')} ${pipe}`, `≥ ${num(r.minSource, 1)} L/min · ≤ ${num(r.tableCeilingLpd)} ${t('unitPerDay')}`],
      [tf('sizeDelivery', { eta: num(TYPICAL_ETA, 2) }), delivery(TYPICAL_ETA)],
    ];
    // the efficiency the live simulation reaches, when it is running and delivering
    if (s.etaD > 0.05 && Math.abs(s.etaD - TYPICAL_ETA) > 0.02)
      rows.push([tf('sizeDeliveryLive', { eta: num(s.etaD, 2) }), delivery(s.etaD)]);

    const warnText = (w: SizingWarning): { text: string; warn: boolean } | null => {
      switch (w) {
        case 'headHigh':
          return { text: tf('sizeWarnHeadHigh', { r: num(r.liftRatio, 1) }), warn: true };
        case 'headLow':
          return { text: tf('sizeWarnHeadLow', { r: num(r.liftRatio, 1) }), warn: true };
        case 'lengthShort':
          return {
            text: tf('sizeWarnLengthShort', { r: num(r.lengthRatio ?? 0, 1), min: num(r.minLength, 1) }),
            warn: true,
          };
        case 'lengthBelowS4':
          return {
            text: tf('sizeWarnLengthS4', { r: num(r.lengthRatio ?? 0, 1), min: num(r.minLength, 1) }),
            warn: false,
          };
        default:
          return null; // sourceShort is the verdict above
      }
    };
    fill(
      this.sizeResult,
      ok
        ? callout('callout--tip', tf('sizeVerdictOk', verdictVars))
        : callout('callout--warn', tf('sizeVerdictShort', verdictVars), true),
      ok
        ? null
        : h(
            'p',
            { class: 'hint' },
            r.largestPipe
              ? tf('sizeTipSmaller', { pipe: sizeLabel(r.largestPipe.id) })
              : tf('sizeTipNone', { min: num(PIPE_SIZES[0].minSourceLpm, 1) }),
          ),
      h('dl', { class: 'specs' }, ...rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])),
      ...r.warnings
        .map(warnText)
        .map((w) => (w ? callout(w.warn ? 'callout--warn' : 'callout--tip', w.text, w.warn) : null)),
      h('p', { class: 'hint' }, t('sizeNote')),
    );
  }

  // ------------------------------------------------------------------ status and readouts

  private renderStatus(): void {
    const sim = this.ctx.sim;
    const s = sim.state;
    const p = sim.params;
    for (const [id, chip] of this.presetChips) {
      const on = p.preset === id;
      chip.classList.toggle('is-on', on);
      chip.setAttribute('aria-pressed', String(on));
    }
    fill(this.scenarioNote, this.scenario ? t(SCENARIO_CAPTION_KEYS[this.scenario]) : t('scenarioPrompt'));
    if (this.restartButton) this.restartButton.disabled = s.status !== 'stalled' || s.stallReason === 'gate';

    const warn = (text: string) =>
      h('div', { class: 'callout callout--warn' }, icon(ICONS.warn, 16), h('span', {}, text));
    const note = (text: string) => h('p', { class: 'hint' }, text);
    const stalled: Partial<Record<typeof s.stallReason, UiKey>> = {
      tank: 'statusStalledTank',
      stuck: 'statusStalledStuck',
      gate: 'statusStalledGate',
      hand: 'statusStalledHand',
    };
    if (s.status === 'stalled') {
      fill(this.status, warn(t(stalled[s.stallReason] ?? 'statusStalledStuck')));
    } else if (sim.averages.valveStaysOpen) {
      fill(this.status, warn(t('statusValveOpen')));
    } else if (s.alarms.includes('softPipe')) {
      // the cause of the missing delivery is the pipe: say it with the numbers of the wave
      fill(
        this.status,
        warn(
          tf('statusSoftPipe', {
            a: num(s.waveSpeed),
            surge: num(s.surgeBar, 1),
            need: num(s.surgeNeededBar, 1),
            v: num(s.closingVelocity, 2),
          }),
        ),
      );
    } else if (s.alarms.includes('noDelivery')) {
      fill(this.status, warn(t('statusNoDelivery')));
    } else if (s.tankDrainOpen && s.tankLitres > 0) {
      fill(this.status, note(`${t('statusDrain')} ${duration(s.hoursToEmpty)}.`));
    } else if (Number.isFinite(s.hoursToEmpty)) {
      fill(this.status, note(`${t('statusDraining')} ${t('statusEmptyIn')} ${duration(s.hoursToEmpty)}.`));
    } else {
      fill(this.status, note(t('statusRunning')));
    }
  }

  private renderReadouts(): void {
    const s = this.ctx.sim.state;
    this.readouts.update(s);
    this.moreReadouts.update(s);
  }

  // ------------------------------------------------------------------ charts

  private drawScope(): void {
    const sc = this.ctx.sim.scope;
    const n = sc.t.length;
    if (n > 1) {
      const t1 = sc.t[n - 1];
      const xs = sc.t.map((x) => x - t1);
      this.scopeP.setData(xs, { p: sc.pressure });
      this.scopeV.setData(xs, { v: sc.velocity });
    }
    this.scopeP.draw();
    this.scopeV.draw();
  }

  private drawCurves(): void {
    const sim = this.ctx.sim;
    this.headChart.setData(HEADS, this.sweepHead.data);
    this.headChart.draw();
    const sw = this.sweepStroke.data;
    this.strokeQ.setData(sw.xs, { q: sw.q, source: sw.xs.map(() => sim.params.sourceFlow) });
    this.strokeQ.draw();
    this.strokeD.setData(sw.xs, { d: sw.d });
    this.strokeD.draw();
    const hist = sim.history;
    this.tankChart.setData(hist.hours, { tank: hist.tank });
    this.tankChart.draw();
    const busy = this.sweepHead.queue.length + this.sweepStroke.queue.length + this.sweepTrace.queue.length;
    this.computing.textContent = busy > 0 ? t('computing') : '';
    this.drawTrace();
  }

  /** x axis of the consumption charts: millimetres of stroke or grams of counterweight. */
  private sweepX(v: number): string {
    return this.sweepVar === 'stroke' ? `${num(v, 1)} mm` : `${num(v)} g`;
  }

  /** Where the live setting sits on the x axis of the consumption charts. */
  private sweepPoint(): number {
    const p = this.ctx.sim.params;
    return this.sweepVar === 'stroke' ? p.stroke : p.counterweight;
  }

  /**
   * The sweeps solve the cycle model for many settings (about 6 ms each): they start once the sliders have been quiet for
   * a moment (at once the first time, or after a change of variable), and advance a few milliseconds per frame, the head
   * curves and the whole stroke first. The results are cached by `RamSim`, so a panel opened again finds them already.
   */
  private runSweeps(dt: number): void {
    const sim = this.ctx.sim;
    const p = sim.params;
    const air = Math.round(Math.log(Math.max(sim.state.airFraction, 0.004)) / 0.7);
    const site = [p.fall, p.driveLength, p.driveDiameter, p.pipeMaterial, p.deliveryLength, p.chamberVolume, air];
    /** A point of a curve: solved a slice at a time, then handed to `store`. */
    const point = (patch: Partial<RamParams>, store: (m: Means) => void): CurveJob => {
      const task = sim.sweepTask(patch);
      return (budgetMs) => {
        if (!task.advance(budgetMs)) return false;
        store(task.means as Means);
        return true;
      };
    };
    this.refreshSweep(this.sweepHead, JSON.stringify(site), dt, () => {
      const data: Record<string, number[]> = { '1': [], '2': [], '3': [] };
      for (const valve of [1, 2, 3] as ValveId[]) data[String(valve)] = HEADS.map(() => NaN);
      headPatches().forEach((patch, i) => {
        const valve = String(patch.valve);
        const at = i % HEADS.length;
        this.sweepHead.queue.push(
          point(patch, (m) => {
            data[valve][at] = m.deliveredFlow * 1440;
          }),
        );
      });
      return data;
    });
    // the consumption charts sweep the stroke (the other settings as they are) or the weight
    const byStroke = this.sweepVar === 'stroke';
    const xs = byStroke ? STROKES : WEIGHTS;
    const strokeKey = [...site, p.deliveryHead, p.valve, byStroke ? p.counterweight : p.stroke, this.sweepVar];
    this.refreshSweep(this.sweepStroke, JSON.stringify(strokeKey), dt, () => {
      const data: StrokeSweep = { xs, q: xs.map(() => NaN), d: xs.map(() => NaN) };
      strokePatches(this.sweepVar).forEach((patch, i) => {
        this.sweepStroke.queue.push(
          point(patch, (m) => {
            data.q[i] = m.driveFlow;
            data.d[i] = m.deliveredFlow * 1440;
          }),
        );
      });
      return data;
    });
    // one whole stroke for the cycle section (the same settings as the live ram)
    const traceKey = [...site, p.deliveryHead, p.valve, p.stroke, p.counterweight];
    this.refreshSweep(this.sweepTrace, JSON.stringify(traceKey), dt, () => {
      this.sweepTrace.queue.push(() => {
        this.sweepTrace.data = sim.strokeTrace();
        return true;
      });
      return this.sweepTrace.data;
    });
    pumpQueues([this.sweepTrace.queue, this.sweepHead.queue, this.sweepStroke.queue], SWEEP_BUDGET_MS);
  }

  /** Restart a sweep when its settings changed: after a quiet moment, or at once when it never ran or was emptied. */
  private refreshSweep<T>(sweep: Sweep<T>, key: string, dt: number, start: () => T): void {
    if (key !== sweep.key) {
      const first = sweep.key === '';
      sweep.key = key;
      sweep.queue.length = 0;
      if (first) {
        sweep.wait = 0;
        sweep.data = start();
      } else sweep.wait = SWEEP_DELAY;
      return;
    }
    if (sweep.wait > 0) {
      sweep.wait -= dt;
      if (sweep.wait <= 0) sweep.data = start();
    }
  }
}
