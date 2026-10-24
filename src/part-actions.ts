import type { PartInfo } from '@onigam/lab-kit/content';
import { fill, h, icon, ICONS, type AppContext } from '@onigam/lab-kit/ui';
import { t, type UiKey } from './i18n/ui';
import { runPartTest, testsForPart, turnNut, type PartTest, type PartTestId } from './sim/actions';
import type { RamSim } from './sim/engine';

// The "test" buttons of the part sheets, like the "test the trip" of Pelton Lab: the button frames the part, then acts on
// the simulation, so that the part (the cause) and what it does to the ram (the effect: the 3D view, the strip and the
// alarms at the bottom) are seen together. What each test does is in src/sim/actions.ts, where it is unit-tested.

/** Labels (UI keys) and icon of the two states of a test button. */
const TEST_UI: Record<PartTestId, { on: UiKey; off: UiKey; icon: string }> = {
  'air-chamber': { on: 'actDrown', off: 'actRefill', icon: ICONS.drop },
  snifter: { on: 'actBlock', off: 'actUnblock', icon: ICONS.warn },
  'waste-valve': { on: 'actHold', off: 'actRelease', icon: ICONS.pause },
  'drive-gate': { on: 'actCloseGate', off: 'actOpenGate', icon: ICONS.close },
  'tank-drain': { on: 'actOpenDrain', off: 'actCloseDrain', icon: ICONS.drop },
};

/** Milliseconds the camera needs to settle on the part before the action starts. */
const FRAME_DELAY = 800;
/** Padding of the camera around the part (Pelton uses 1.7 for its deflector). */
const FRAME_PADDING = 1.8;
/** A part framed less than this long ago is not framed again (repeated clicks on the stroke nut), ms. */
const FRAME_MEMORY = 6000;

let lastFrame = { id: '', at: -Infinity };

/** Look at the part, then act once the camera is there. */
function frameThen(ctx: AppContext<RamSim>, id: string, act: () => void): void {
  const now = performance.now();
  if (lastFrame.id === id && now - lastFrame.at < FRAME_MEMORY) {
    act();
    return;
  }
  lastFrame = { id, at: now };
  ctx.stage.frameParts([id], FRAME_PADDING);
  window.setTimeout(act, FRAME_DELAY);
}

// The labels of the toggle buttons follow the simulation (the same fault can be put in place from the panel): a single
// listener on the simulation refreshes every button still on screen.
const live = new Set<{ el: HTMLElement; refresh: () => void }>();
let wired: RamSim | null = null;

function track(sim: RamSim, el: HTMLElement, refresh: () => void): void {
  if (wired !== sim) {
    wired = sim;
    sim.onChange(() => {
      for (const item of [...live]) {
        if (item.el.isConnected) item.refresh();
        else live.delete(item);
      }
    });
  }
  live.add({ el, refresh });
}

/** A button that puts a fault in place and takes it away, its label following the state of the simulation. */
function testButton(ctx: AppContext<RamSim>, info: PartInfo, test: PartTest): HTMLElement {
  const ui = TEST_UI[test.id];
  const btn = h('button', {
    class: 'btn',
    onclick: () => {
      const on = !test.active(ctx.sim);
      frameThen(ctx, info.id, () => runPartTest(ctx.sim, test, on));
    },
  });
  const refresh = () => {
    const on = test.active(ctx.sim);
    const label = on ? ui.off : ui.on;
    fill(btn, icon(ui.icon, 16), t(label));
    btn.title = t(`${label}Title` as UiKey);
    btn.classList.toggle('is-on', on);
  };
  refresh();
  track(ctx.sim, btn, refresh);
  return btn;
}

/** A button that turns the stroke nut by one step. */
function nutButton(ctx: AppContext<RamSim>, info: PartInfo, direction: 'in' | 'out'): HTMLElement {
  const label: UiKey = direction === 'in' ? 'actNutIn' : 'actNutOut';
  return h(
    'button',
    {
      class: 'btn',
      title: t(`${label}Title` as UiKey),
      onclick: () => frameThen(ctx, info.id, () => turnNut(ctx.sim, direction)),
    },
    icon(ICONS.reset, 16),
    t(label),
  );
}

/** Extra buttons on a part sheet ("test" actions that put the simulation in the state the part is about). */
export function partActions(ctx: AppContext<RamSim>, info: PartInfo): HTMLElement[] {
  if (info.id === 'stroke-nut') return [nutButton(ctx, info, 'in'), nutButton(ctx, info, 'out')];
  return testsForPart(info.id).map((test) => testButton(ctx, info, test));
}
