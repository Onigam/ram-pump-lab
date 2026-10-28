import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { getLang, setLang } from '@onigam/lab-kit/i18n';
import type { AppContext } from '@onigam/lab-kit/ui';
import { t, type UiKey } from '../i18n/ui';
import { RamSim } from '../sim/engine';
import { SCENARIO_IDS } from '../sim/presets';
import {
  headPatches,
  HEADS,
  KEY_READOUTS,
  MORE_READOUTS,
  panelPatches,
  pumpQueues,
  SCENARIO_CAPTION_KEYS,
  SCENARIO_KEYS,
  STROKES,
  strokePatches,
  SWEEP_BUDGET_MS,
  WEIGHTS,
  type CurveJob,
} from './model';
import { SimPanel } from './sim';
import { FakeElement, installFakeDom } from './test-dom';

// The simulation panel rendered by a stand-in for the DOM: what it opens on, how the figures are grouped, what the chips
// say, how the curves are computed, in both languages. The wording itself is held by strings.test.ts.

beforeAll(() => installFakeDom());
afterEach(() => setLang('fr'));

interface Fixture {
  sim: RamSim;
  panel: SimPanel;
  root: FakeElement;
}

function open(lang: 'fr' | 'en' = 'fr', sim = new RamSim('valve-1')): Fixture {
  setLang(lang);
  const ctx = { sim, ui: { scene: 'ram' }, gotoScene: () => undefined } as unknown as AppContext<RamSim>;
  const panel = new SimPanel(ctx);
  panel.render();
  return { sim, panel, root: panel.el as unknown as FakeElement };
}

/** A string as the panel shows it (the kit adds the fixed spaces of French typography when it resolves a text). */
const str = (key: string, lang: 'fr' | 'en' = 'fr'): string => {
  const before = getLang();
  setLang(lang);
  const text = t(key as UiKey);
  setLang(before);
  return text;
};
const buttons = (root: FakeElement): FakeElement[] => root.find('button');
const button = (root: FakeElement, label: string): FakeElement => {
  const found = buttons(root).find((b) => b.textContent === label);
  if (!found) throw new Error(`no button « ${label} »`);
  return found;
};
/** The titles of the blocks, in reading order: eyebrows and the summary of every section. */
const outline = (root: FakeElement): string[] =>
  root
    .all()
    .filter((e) => e.classList.contains('eyebrow') || e.tagName === 'summary')
    .map((e) => e.textContent);
const cells = (grid: FakeElement): string[] => grid.find('div.readout').map((c) => c.textContent);

describe('the simulation panel opens on its purpose and the story, then the cycle, before the figures', () => {
  it('reads in the order intro → story → cycle → scenarios → figures → site → ram → calculator → charts', () => {
    const { root } = open();
    const titles = outline(root);
    const at = (title: string) => {
      const i = titles.findIndex((x) => x.startsWith(title));
      expect(i, `« ${title} » in ${JSON.stringify(titles)}`).toBeGreaterThanOrEqual(0);
      return i;
    };
    const order = [
      str('simTitle'),
      str('story'),
      str('secCycle'),
      str('scenarios'),
      str('readouts'),
      str('moreFigures'),
      str('readFigures'),
      str('secSite'),
      str('secRam'),
      str('secSize'),
      str('chartScope'),
    ].map(at);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    const text = root.textContent;
    expect(text).toContain(str('simIntro'));
    expect(text).toContain(str('presetHint'));
  });

  it('shows the three valves of the video as chips, the present one lit, and a disabled "Custom" chip', () => {
    const { root, sim } = open();
    const chips = [str('presetValve3'), str('presetValve2'), str('presetValve1'), str('custom')].map((l) =>
      button(root, l),
    );
    expect(chips[2].classList.contains('is-on')).toBe(true);
    expect(chips[0].classList.contains('is-on')).toBe(false);
    expect(chips[3].disabled).toBe(true);
    // editing a site value leaves the story: "Custom" lights up at the next refresh
    sim.set({ fall: 9 });
    const fixture = open('fr', sim);
    expect(button(fixture.root, str('custom')).classList.contains('is-on')).toBe(true);
    expect(button(fixture.root, str('presetValve1')).classList.contains('is-on')).toBe(false);
  });

  it('choosing the n°3 valve speeds time up like a scenario, and never slows a faster pace', () => {
    const { root, sim } = open();
    button(root, str('presetValve3')).click();
    expect(sim.params.preset).toBe('valve-3');
    expect(sim.params.timeScale).toBe(600);
    sim.set({ timeScale: 3600 });
    button(root, str('presetValve2')).click();
    expect(sim.params.timeScale).toBe(3600);
  });
});

describe('the figures are grouped: six main ones, nine behind "More figures"', () => {
  it('shows the six main figures and keeps the nine others in a collapsed section', () => {
    const { root } = open();
    const main = cells(root.find('div.readouts')[0]);
    expect(main).toHaveLength(KEY_READOUTS.length);
    for (const d of KEY_READOUTS)
      expect(
        main.some((c) => c.startsWith(str(d.key as string))),
        d.key,
      ).toBe(true);
    const more = root.find('details').find((d) => d.find('summary')[0]?.textContent === str('moreFigures'));
    expect(more, 'the More figures section').toBeDefined();
    expect(more?.open).toBe(false);
    const nine = cells(more!.find('div.readouts')[0]);
    expect(nine).toHaveLength(MORE_READOUTS.length);
    for (const d of MORE_READOUTS)
      expect(
        nine.some((c) => c.startsWith(str(d.key as string))),
        d.key,
      ).toBe(true);
  });

  it('keeps the section open or closed when the panel is rendered again', () => {
    const { root, panel } = open();
    const section = (title: string) =>
      root.find('details').find((d) => d.find('summary')[0]?.textContent === title) as FakeElement;
    const more = section(str('moreFigures'));
    more.open = true;
    more.dispatch('toggle');
    const help = section(str('readFigures'));
    help.open = true;
    help.dispatch('toggle');
    panel.render(); // a change of language or of a control rebuilds the panel
    expect(section(str('moreFigures')).open).toBe(true);
    expect(section(str('readFigures')).open).toBe(true);
    expect(section(str('secCycle')).open).toBe(true);
    section(str('moreFigures')).open = false;
    section(str('moreFigures')).dispatch('toggle');
    panel.render();
    expect(section(str('moreFigures')).open).toBe(false);
  });

  it('explains the figures in a "Reading the figures" section, one paragraph per idea', () => {
    for (const lang of ['fr', 'en'] as const) {
      const { root } = open(lang);
      const help = root.find('details').find((d) => d.find('summary')[0]?.textContent === str('readFigures', lang));
      expect(help, lang).toBeDefined();
      const paragraphs = help!.find('p');
      expect(paragraphs.length, lang).toBeGreaterThanOrEqual(5);
      // every figure is explained under its own label (the per-day figure is explained with the per-minute one)
      for (const d of [...KEY_READOUTS, ...MORE_READOUTS].filter((x) => x.key !== 'liveDeliveredDay')) {
        const label = str(d.key as string, lang);
        expect(help!.textContent, `${lang}: ${label}`).toContain(label);
      }
    }
  });

  it('shows the pressure peak of the last stroke, not the instantaneous sawtooth that flickers between 0 and 7 bar', () => {
    const { root, sim, panel } = open();
    for (let i = 0; i < 180; i++) sim.step(1 / 60); // 3 s: several strokes
    const peaks: number[] = [];
    for (let i = 0; i < 40; i++) {
      sim.step(0.2); // five times a second, as the panel samples
      panel.tick(0.2, true);
      const cell = root
        .find('div.readouts')
        .flatMap(cells)
        .find((c) => c.startsWith(str('livePeak')));
      expect(cell, 'the pressure peak cell').toBeDefined();
      peaks.push(
        Number(
          cell!
            .slice(str('livePeak').length)
            .replace(',', '.')
            .replace(/[^\d.]/g, ''),
        ),
      );
    }
    expect(Math.min(...peaks)).toBeGreaterThan(5);
    expect(Math.max(...peaks) - Math.min(...peaks)).toBeLessThan(0.3);
  });
});

describe('the scenarios say what to look at', () => {
  it('shows a prompt first, then the caption of the last scenario clicked, and lights its chip', () => {
    const { root, sim } = open();
    expect(root.textContent).toContain(str('scenarioPrompt'));
    for (const id of SCENARIO_IDS) {
      const key = SCENARIO_CAPTION_KEYS[id] as string;
      const name = str(SCENARIO_KEYS[id]);
      button(root, name).click();
      const fresh = root; // render() rebuilds the children of the same root element
      expect(fresh.textContent, id).toContain(str(key));
      expect(button(fresh, name).classList.contains('is-on'), id).toBe(true);
      expect(sim.params.preset, id).toBe('custom');
    }
  });

  it('forgets the caption when a preset is chosen', () => {
    const { root } = open();
    button(root, str('scenarioWaterLogged')).click();
    expect(root.textContent).toContain(str('capWaterLogged'));
    button(root, str('presetValve1')).click();
    expect(root.textContent).not.toContain(str('capWaterLogged'));
    expect(root.textContent).toContain(str('scenarioPrompt'));
  });

  it('is written in English too, with the same structure', () => {
    const { root } = open('en');
    button(root, str('scenarioPlasticPipe', 'en')).click();
    expect(root.textContent).toContain(str('capPlasticPipe', 'en'));
    expect(root.textContent).toContain(str('simIntro', 'en'));
    expect(buttons(root).map((b) => b.textContent)).toContain(str('presetValve3', 'en'));
    expect(root.textContent).not.toMatch(/n°/);
    expect(root.textContent).toContain('No.');
  });
});

describe('the curves are computed a few milliseconds at a time', () => {
  it('start at once the first time and finish within a few seconds of frames, with the placeholder in between', () => {
    const { panel, root } = open();
    const sweeps = panel as unknown as {
      sweepHead: { queue: unknown[] };
      sweepStroke: { queue: unknown[] };
      sweepTrace: { queue: unknown[] };
    };
    const pending = () =>
      sweeps.sweepHead.queue.length + sweeps.sweepStroke.queue.length + sweeps.sweepTrace.queue.length;
    expect(pending()).toBeGreaterThan(0);
    expect(root.textContent).toContain(str('computing'));
    let frames = 0;
    while (pending() > 0 && frames < 4000) {
      panel.tick(1 / 60);
      frames += 1;
    }
    expect(pending()).toBe(0);
    panel.tick(1, true);
    expect(root.textContent).not.toContain(str('computing'));
  });

  it('answer a panel opened again from the cache: nothing left to compute after one frame', () => {
    const first = open();
    for (let i = 0; i < 4000 && first.panel['sweepHead' as never]; i++) {
      first.panel.tick(1 / 60);
      const q = first.panel as unknown as { sweepHead: { queue: unknown[] }; sweepStroke: { queue: unknown[] } };
      if (q.sweepHead.queue.length + q.sweepStroke.queue.length === 0) break;
    }
    const again = open('fr', first.sim);
    again.panel.tick(1 / 60);
    const q = again.panel as unknown as {
      sweepHead: { queue: unknown[] };
      sweepStroke: { queue: unknown[] };
      sweepTrace: { queue: unknown[] };
    };
    expect(q.sweepHead.queue.length + q.sweepStroke.queue.length + q.sweepTrace.queue.length).toBe(0);
  });

  it('are all cached by a prefetch at idle time, so that the panel then opens with nothing left to compute', () => {
    vi.useFakeTimers();
    try {
      const sim = new RamSim('valve-1');
      sim.set({ fall: 9.5, driveLength: 31 }); // a site nobody solved in this file yet
      const patches = panelPatches();
      expect(patches).toHaveLength(HEADS.length * 3 + STROKES.length);
      sim.prefetch(patches);
      expect(sim.prefetchPending).toBeGreaterThan(0);
      for (let i = 0; i < 2000 && sim.prefetchPending > 0; i++) vi.advanceTimersByTime(16);
      expect(sim.prefetchPending).toBe(0);
      expect(patches.every((patch) => sim.isSweepCached(patch))).toBe(true);
      // the panel asks for exactly these solves
      expect(headPatches().length).toBe(HEADS.length * 3);
      expect(strokePatches('weight')).toHaveLength(WEIGHTS.length);
      const { panel } = open('fr', sim);
      panel.tick(1 / 60);
      const q = panel as unknown as { sweepHead: { queue: unknown[] }; sweepStroke: { queue: unknown[] } };
      expect(q.sweepHead.queue.length + q.sweepStroke.queue.length).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps a frame short: a tick with every curve to compute stays within a few budgets of work', () => {
    const sim = new RamSim('valve-1');
    sim.set({ fall: 8.5, driveLength: 23 }); // settings nobody has solved yet
    const { panel } = open('fr', sim);
    const t0 = performance.now();
    panel.tick(1 / 60);
    const first = performance.now() - t0;
    // one slice of 4 ms, plus the trace of the stroke (one whole solve, a few ms) and some rounding: far less than the
    // 40 sweeps (≈ 300 ms) that used to run before the first frame was released
    expect(first).toBeLessThan(120);
  });
});

describe('pumpQueues (the time budget of a frame)', () => {
  const clock = () => {
    let t = 0;
    return { now: () => t, spend: (ms: number) => (t += ms) };
  };

  it('runs the jobs of the first non-empty queue first, and stops when the budget is spent', () => {
    const c = clock();
    const log: string[] = [];
    const job =
      (name: string, cost: number): CurveJob =>
      () => {
        log.push(name);
        c.spend(cost);
        return true;
      };
    const a = [job('a1', 1), job('a2', 1)];
    const b = [job('b1', 1)];
    const done = pumpQueues([a, b], 4, c.now);
    expect(log).toEqual(['a1', 'a2', 'b1']);
    expect(done).toBe(3);
    const slow = [job('s1', 3), job('s2', 3)];
    log.length = 0;
    pumpQueues([slow], 4, c.now);
    expect(log).toEqual(['s1', 's2']); // the second starts at 3 ms < 4 ms, then the budget is gone
    const many = [job('m1', 5), job('m2', 5)];
    log.length = 0;
    pumpQueues([many], 4, c.now);
    expect(log).toEqual(['m1']); // always one, then over budget: stop
    expect(many).toHaveLength(1);
  });

  it('keeps an unfinished job at the head of its queue and gives it the time that is left', () => {
    const c = clock();
    const budgets: number[] = [];
    let slices = 0;
    const q: CurveJob[] = [
      (budget) => {
        budgets.push(budget);
        c.spend(budget);
        return ++slices >= 3;
      },
    ];
    pumpQueues([q], SWEEP_BUDGET_MS, c.now);
    expect(q).toHaveLength(1);
    expect(budgets).toEqual([SWEEP_BUDGET_MS]);
    pumpQueues([q], SWEEP_BUDGET_MS, c.now);
    pumpQueues([q], SWEEP_BUDGET_MS, c.now);
    expect(q).toHaveLength(0);
  });

  it('does nothing and costs nothing when every queue is empty', () => {
    expect(pumpQueues([[], []], 4)).toBe(0);
  });
});

describe('the part-test lines', () => {
  it('are shown under the buttons of a sheet (partActions), in both languages', async () => {
    vi.stubGlobal('window', { devicePixelRatio: 1, setTimeout });
    const { partActions } = await import('../part-actions');
    for (const lang of ['fr', 'en'] as const) {
      setLang(lang);
      const sim = new RamSim('valve-1');
      const ctx = { sim } as unknown as AppContext<RamSim>;
      for (const [id, key] of [
        ['air-chamber', 'hintAirChamber'],
        ['snifter', 'hintSnifter'],
        ['waste-valve', 'hintWasteValve'],
        ['drive-gate-valve', 'hintDriveGate'],
        ['tank-drain', 'hintTankDrain'],
        ['stroke-nut', 'hintStrokeNut'],
      ] as const) {
        const items = partActions(ctx, { id } as never) as unknown as FakeElement[];
        expect(items.length, id).toBeGreaterThanOrEqual(2);
        const hint = items[items.length - 1];
        expect(hint.tagName, id).toBe('p');
        expect(hint.classList.contains('hint'), id).toBe(true);
        expect(hint.textContent, `${id} ${lang}`).toBe(str(key, lang));
        expect(
          items.slice(0, -1).every((b) => b.tagName === 'button'),
          id,
        ).toBe(true);
      }
      // a part with no test has no line
      expect(partActions(ctx, { id: 'spring' } as never)).toHaveLength(0);
    }
    vi.unstubAllGlobals();
    installFakeDom();
  });
});
