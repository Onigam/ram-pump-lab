import type { SceneModule } from '@onigam/lab-kit/three';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PARTS } from '../data/parts';
import type { RamState } from '../sim/types';
import { createCatchmentScene } from './catchment/scene';
import { labelBoxes, type LabelBox } from './framing';
import { createRamScene } from './ram/scene';
import { createSiteScene } from './site/scene';
import { createValveScene } from './valve';

// The labels of the default view of each world (the "Principales" mode: every hotspot that is not `minor`). The camera of the
// kit's `frameAll` and the box of each label are replicated in framing.ts, so that the labels of a world can be checked
// without a browser at the sizes of the 3D view: no two labels overlap, none leaves the picture or hides under the toolbar,
// and there are never more than six. Every label also says what the sheet of its part says, and its dot sits on the part.

/** The 3D view in pixels, from the real layout at 1280×800, 768×1024 and 390×844 (`bottom`: the toolbar stands there). */
const VIEWS: { name: string; w: number; h: number; bottom: number }[] = [
  { name: 'desktop 1280×800', w: 842, h: 678, bottom: 96 },
  { name: 'desktop, taller view', w: 842, h: 736, bottom: 96 },
  { name: 'tablet 768×1024', w: 380, h: 902, bottom: 130 },
  { name: 'phone 390×844, sheet closed', w: 390, h: 632, bottom: 92 },
  { name: 'phone, above the open sheet', w: 390, h: 420, bottom: 0 },
];
const MARGIN = 3;
const MAX_MAIN = 6;

const WORLDS: [string, () => SceneModule<RamState>, number][] = [
  // the last number: how far from the box of its part the dot of a label may be, metres
  ['site', () => createSiteScene(), 1.5],
  ['catchment', () => createCatchmentScene(), 1.3],
  ['ram', () => createRamScene(), 0.04],
  ['valve', () => createValveScene(), 0.03],
];

const overlap = (a: LabelBox, b: LabelBox): boolean =>
  a.x0 - MARGIN < b.x1 && b.x0 - MARGIN < a.x1 && a.y0 - MARGIN < b.y1 && b.y0 - MARGIN < a.y1;

describe('hotspot labels of the default views', () => {
  for (const [name, make, onPart] of WORLDS) {
    describe(name, () => {
      const mod = make();

      it(`shows at most ${MAX_MAIN} labels at once`, () => {
        expect(mod.hotspots.filter((h) => !h.minor).length).toBeLessThanOrEqual(MAX_MAIN);
        expect(mod.hotspots.filter((h) => !h.minor).length).toBeGreaterThanOrEqual(3);
      });

      for (const lang of ['fr', 'en'] as const) {
        for (const v of VIEWS) {
          it(`keeps the labels apart, inside the view and above the toolbar: ${v.name}, ${lang}`, () => {
            const boxes = labelBoxes(mod, v, lang).filter((b) => !b.minor);
            const problems: string[] = [];
            boxes.forEach((b, i) => {
              if (!b.inFront) problems.push(`${b.id}: behind the camera`);
              if (b.x0 < 2 || b.x1 > v.w - 2)
                problems.push(
                  `${b.id} (${b.text}): leaves the view sideways [${b.x0.toFixed(0)}, ${b.x1.toFixed(0)}] of ${v.w}`,
                );
              if (b.y0 < 2 || b.y1 > v.h - v.bottom)
                problems.push(
                  `${b.id}: outside the free height [${b.y0.toFixed(0)}, ${b.y1.toFixed(0)}] of ${v.h - v.bottom}`,
                );
              for (const o of boxes.slice(i + 1)) if (overlap(b, o)) problems.push(`${b.id} overlaps ${o.id}`);
            });
            expect(problems).toEqual([]);
          });
        }
      }

      it('puts the dot of every label on its part', () => {
        mod.scene.updateMatrixWorld(true);
        for (const h of mod.hotspots) {
          const p = new THREE.Vector3().setFromMatrixPosition(h.anchor.matrixWorld);
          expect(mod.registry.bounds(h.partId).distanceToPoint(p), h.partId).toBeLessThan(onPart);
        }
      });

      it('names every part as its sheet does, or by a shortened form of that name', () => {
        // the words of the label, in order, are words of the name of the sheet (the parentheses of a name are dropped)
        const words = (s: string) => s.toLowerCase().replace(/[()]/g, ' ').split(/\s+/).filter(Boolean);
        for (const h of mod.hotspots) {
          const part = PARTS.find((p) => p.id === h.partId);
          expect(part, h.partId).toBeDefined();
          for (const lang of ['fr', 'en'] as const) {
            const sheet = words(part!.name[lang]);
            let from = 0;
            for (const w of words(h.label[lang])) {
              const at = sheet.indexOf(w, from);
              expect(
                at,
                `${h.partId} ${lang}: "${h.label[lang]}" against the sheet "${part!.name[lang]}"`,
              ).toBeGreaterThanOrEqual(0);
              from = at + 1;
            }
          }
        }
      });
    });
  }
});
