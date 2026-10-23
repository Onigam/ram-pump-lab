import {
  fill,
  h,
  icon,
  ICONS,
  LineChart,
  SERIES_COLORS,
  section as kitSection,
  select as kitSelect,
  slider as kitSlider,
  toggle as kitToggle,
  type AppContext,
  type PanelController,
} from '@onigam/lab-kit/ui';
import { num, t, type UiKey } from '../i18n/ui';
import type { RamSim } from '../sim/engine';
import { WAVE_SPEED } from '../sim/physics';
import { PRESET_IDS, RANGES, SCENARIO_IDS, VALVE_SETTINGS } from '../sim/presets';
import type { PipeMaterial, PresetId, RamParams, ScenarioId, ValveId } from '../sim/types';

// Simulation mode: presets and scenarios, grouped controls, live readouts and charts. The stroke cycle itself is in
// the 3D view; the panel shows its numbers (cycle averages) and an oscilloscope of the last strokes.

const PRESET_KEYS: Record<PresetId, UiKey> = {
  'valve-3': 'presetValve3',
  'valve-2': 'presetValve2',
  'valve-1': 'presetValve1',
};

const SCENARIO_KEYS: Record<ScenarioId, UiKey> = {
  'source-drop': 'scenarioSourceDrop',
  'stroke-nut': 'scenarioStrokeNut',
  'water-logged': 'scenarioWaterLogged',
  'short-pipe': 'scenarioShortPipe',
  'high-lift': 'scenarioHighLift',
  'snifter-blocked': 'scenarioSnifterBlocked',
};

const MATERIALS: [PipeMaterial, UiKey][] = [
  ['steel', 'matSteel'],
  ['pvc', 'matPvc'],
  ['hdpe', 'matHdpe'],
];

const VALVE_COLORS: Record<ValveId, string> = { 1: SERIES_COLORS.hydro, 2: SERIES_COLORS.load, 3: SERIES_COLORS.dump };

/** Delivery heads (m) and strokes (mm) of the two sweeps shown as charts. */
const HEADS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130];
const STROKES = Array.from({ length: 23 }, (_, i) => 0.5 + i * 0.25);

/** Real seconds the parameters must stay unchanged before a sweep starts (the sliders keep moving meanwhile). */
const SWEEP_DELAY = 0.4;

interface Sweep<T> {
  key: string;
  wait: number;
  queue: (() => void)[];
  data: T;
}

export class SimPanel implements PanelController {
  readonly el = h('div', { class: 'sim' });
  private presetSelect: HTMLSelectElement | null = null;
  private restartButton: HTMLButtonElement | null = null;
  private status = h('div', {});
  private readouts = h('div', { class: 'readouts' });
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
  private sweepStroke: Sweep<{ q: number[]; d: number[] }> = { key: '', wait: 0, queue: [], data: { q: [], d: [] } };

  constructor(private ctx: AppContext<RamSim>) {
    const seconds = (v: number) => (v === 0 ? '0' : `${num(v, 1)} s`);
    this.scopeP = new LineChart({
      height: 70,
      series: [{ key: 'p', label: () => t('seriesPressure'), color: SERIES_COLORS.dump }],
      yMin: 0,
      yFmt: (v) => num(v, 1),
      xFmt: seconds,
    });
    this.scopeV = new LineChart({
      height: 70,
      series: [{ key: 'v', label: () => t('seriesVelocity'), color: SERIES_COLORS.hydro }],
      yMin: -1,
      yFmt: (v) => num(v, 1),
      xFmt: seconds,
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
      xFmt: (v) => `${num(v, 1)} mm`,
      markers: () => {
        const s = this.ctx.sim.state;
        return [{ x: s.stroke, y: s.driveFlow, label: `${num(s.driveFlow, 1)} L/min` }];
      },
    });
    this.strokeD = new LineChart({
      height: 110,
      series: [{ key: 'd', label: () => t('seriesDelivered'), color: SERIES_COLORS.dump }],
      yFmt: (v) => num(v),
      xFmt: (v) => `${num(v, 1)} mm`,
      markers: () => {
        const s = this.ctx.sim.state;
        return [{ x: s.stroke, y: s.deliveredPerDay, label: `${num(s.deliveredPerDay)} ${t('unitPerDay')}` }];
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

    const presetSelect = h(
      'select',
      {
        'aria-label': t('preset'),
        onchange: (ev: Event) => {
          sim.applyPreset((ev.target as HTMLSelectElement).value as PresetId);
          this.render();
        },
      },
      ...PRESET_IDS.map((id) => h('option', { value: id, selected: p.preset === id }, t(PRESET_KEYS[id]))),
      h('option', { value: 'custom', selected: p.preset === 'custom', disabled: true }, t('custom')),
    );
    this.presetSelect = presetSelect;

    const restart = h(
      'button',
      {
        class: 'btn',
        disabled: sim.state.status !== 'stalled',
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

    fill(
      this.el,
      h('div', { class: 'eyebrow eyebrow--accent' }, t('simTitle')),
      h(
        'div',
        { class: 'sim-top' },
        presetSelect,
        h(
          'button',
          {
            class: 'btn',
            'aria-label': t('reset'),
            title: t('reset'),
            onclick: () => (sim.reset(), this.render()),
          },
          icon(ICONS.reset, 16),
        ),
      ),
      h('div', { class: 'eyebrow' }, t('scenarios')),
      h(
        'div',
        { class: 'part-chips' },
        ...SCENARIO_IDS.map((id) =>
          h(
            'button',
            { class: 'part-chip', onclick: () => (sim.applyScenario(id), this.render()) },
            t(SCENARIO_KEYS[id]),
          ),
        ),
      ),
      h('p', { class: 'hint' }, t('scenarioHint')),
      this.status,
      h('div', { class: 'sim-top' }, restart),
      this.readouts,
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
            [1, 'n°1 · DN15'],
            [2, 'n°2 · DN20'],
            [3, 'n°3 · DN25'],
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
      h('div', { class: 'eyebrow' }, t('chartScope')),
      this.scopeP.el,
      h('div', { class: 'eyebrow' }, t('chartScopeSpeed')),
      this.scopeV.el,
      h('p', { class: 'hint' }, t('chartScopeHint')),
      h('div', { class: 'eyebrow' }, t('chartHead')),
      this.headChart.el,
      h('p', { class: 'hint' }, t('chartHeadHint')),
      h('div', { class: 'eyebrow' }, t('chartStroke')),
      this.strokeQ.el,
      h('div', { class: 'eyebrow' }, t('chartStrokeDelivered')),
      this.strokeD.el,
      h('p', { class: 'hint' }, t('chartStrokeHint')),
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

  // ------------------------------------------------------------------ status and readouts

  private renderStatus(): void {
    const sim = this.ctx.sim;
    const s = sim.state;
    const p = sim.params;
    if (this.presetSelect && this.presetSelect.value !== p.preset) this.presetSelect.value = p.preset;
    if (this.restartButton) this.restartButton.disabled = s.status !== 'stalled';

    const warn = (text: string) =>
      h('div', { class: 'callout callout--warn' }, icon(ICONS.warn, 16), h('span', {}, text));
    const note = (text: string) => h('p', { class: 'hint' }, text);
    if (s.status === 'stalled') {
      fill(this.status, warn(t(s.stallReason === 'tank' ? 'statusStalledTank' : 'statusStalledStuck')));
    } else if (sim.averages.valveStaysOpen) {
      fill(this.status, warn(t('statusValveOpen')));
    } else if (s.alarms.includes('noDelivery')) {
      fill(this.status, warn(t('statusNoDelivery')));
    } else if (Number.isFinite(s.hoursToEmpty)) {
      fill(this.status, note(`${t('statusDraining')} ${t('statusEmptyIn')} ${num(s.hoursToEmpty, 1)} h.`));
    } else {
      fill(this.status, note(t('statusRunning')));
    }
  }

  private renderReadouts(): void {
    const s = this.ctx.sim.state;
    const cell = (label: string, value: string, unit = '') =>
      h('div', { class: 'readout' }, h('span', {}, label), h('b', {}, value, unit ? h('small', {}, ` ${unit}`) : null));
    fill(
      this.readouts,
      cell(t('liveStrokes'), num(s.strokesPerMin), ''),
      cell(t('liveDrive'), num(s.driveFlow, 1), 'L/min'),
      cell(t('liveWaste'), num(s.wasteFlow, 1), 'L/min'),
      cell(t('liveDelivered'), num(s.deliveredFlow, 2), 'L/min'),
      cell(t('liveDeliveredDay'), num(s.deliveredPerDay), 'L'),
      cell(t('liveEtaD'), num(s.etaD * 100), '%'),
      cell(t('liveEtaR'), num(s.etaR * 100), '%'),
      cell(t('liveClosing'), num(s.closingVelocity, 2), 'm/s'),
      cell(t('liveClosingMin'), num(s.minClosingVelocity, 2), 'm/s'),
      cell(t('liveSurge'), num(s.surgeBar, 1), 'bar'),
      cell(t('liveBody'), num(s.bodyPressure, 1), 'bar'),
      cell(t('liveChamber'), num(s.chamberPressure, 1), 'bar'),
      cell(t('liveTank'), num(s.tankLitres), 'L'),
      cell(t('liveAir'), num(s.airFraction * 100), '%'),
      cell(t('liveWave'), num(s.waveSpeed), 'm/s'),
    );
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
    this.strokeQ.setData(STROKES, { q: this.sweepStroke.data.q, source: STROKES.map(() => sim.params.sourceFlow) });
    this.strokeQ.draw();
    this.strokeD.setData(STROKES, { d: this.sweepStroke.data.d });
    this.strokeD.draw();
    const hist = sim.history;
    this.tankChart.setData(hist.hours, { tank: hist.tank });
    this.tankChart.draw();
    const busy = this.sweepHead.queue.length + this.sweepStroke.queue.length;
    this.computing.textContent = busy > 0 ? t('computing') : '';
  }

  /**
   * The two sweeps solve the cycle model for many settings (about 12 ms each): they start once the sliders have been
   * quiet for a moment and run one solve per frame.
   */
  private runSweeps(dt: number): void {
    const sim = this.ctx.sim;
    const p = sim.params;
    const air = Math.round(Math.log(Math.max(sim.state.airFraction, 0.004)) / 0.7);
    const site = [p.fall, p.driveLength, p.driveDiameter, p.pipeMaterial, p.deliveryLength, p.chamberVolume, air];
    this.refreshSweep(this.sweepHead, JSON.stringify(site), dt, () => {
      const data: Record<string, number[]> = { '1': [], '2': [], '3': [] };
      for (const valve of [1, 2, 3] as ValveId[]) {
        for (let i = 0; i < HEADS.length; i++) {
          data[String(valve)].push(NaN);
          this.sweepHead.queue.push(() => {
            const m = sim.sweep({ valve, ...VALVE_SETTINGS[valve], deliveryHead: HEADS[i] });
            data[String(valve)][i] = m.deliveredFlow * 1440;
          });
        }
      }
      return data;
    });
    this.refreshSweep(this.sweepStroke, JSON.stringify([...site, p.deliveryHead, p.valve, p.counterweight]), dt, () => {
      const data = { q: STROKES.map(() => NaN), d: STROKES.map(() => NaN) };
      STROKES.forEach((stroke, i) => {
        this.sweepStroke.queue.push(() => {
          const m = sim.sweep({ stroke });
          data.q[i] = m.driveFlow;
          data.d[i] = m.deliveredFlow * 1440;
        });
      });
      return data;
    });
    // one solve per frame, head curves first
    const job = this.sweepHead.queue.shift() ?? this.sweepStroke.queue.shift();
    job?.();
  }

  private refreshSweep<T>(sweep: Sweep<T>, key: string, dt: number, start: () => T): void {
    if (key !== sweep.key) {
      sweep.key = key;
      sweep.wait = SWEEP_DELAY;
      sweep.queue.length = 0;
      return;
    }
    if (sweep.wait > 0) {
      sweep.wait -= dt;
      if (sweep.wait <= 0) sweep.data = start();
    }
  }
}
