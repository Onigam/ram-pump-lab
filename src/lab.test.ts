import { describe, expect, it } from 'vitest';
import { WORLDS, partIds } from './part-ids';
import { lab } from './lab';
import { PRESET_IDS, SCENARIO_IDS } from './sim/presets';

// The lead's integration checks: the pieces written by different roles must agree with each other.

const sceneIds = lab.scenes.map((s) => s.id);
const module = (id: string) => lab.scenes.find((s) => s.id === id)!.module;

describe('lab definition', () => {
  it('declares the four worlds, the site first', () => {
    expect(sceneIds).toEqual(['site', 'catchment', 'ram', 'valve']);
    expect([...sceneIds].sort()).toEqual([...WORLDS].sort());
    expect(lab.defaultScene).toBe('site');
  });

  it.each(WORLDS)('world %s registers exactly the frozen and catalogued parts', (id) => {
    const registered = module(id).registry.ids().sort();
    expect(registered).toEqual(partIds(id).sort());
    expect(
      lab.parts
        .filter((p) => p.scene === id)
        .map((p) => p.id)
        .sort(),
    ).toEqual(partIds(id).sort());
  });

  it.each(WORLDS)('world %s has hotspots that point at registered parts and existing worlds', (id) => {
    const mod = module(id);
    expect(mod.hotspots.length).toBeGreaterThan(0);
    for (const hs of mod.hotspots) {
      expect(mod.registry.get(hs.partId), `hotspot of ${hs.partId}`).toBeDefined();
      if (hs.goto) expect(sceneIds).toContain(hs.goto);
    }
  });

  it('plays the guides in the worlds that hold their parts', () => {
    for (const guide of [lab.guides?.assembly, lab.guides?.install]) {
      expect(guide).toBeDefined();
      for (const step of guide!.steps) {
        const world = step.scene ?? guide!.scene;
        expect(sceneIds, `${step.id}: world ${world}`).toContain(world);
        for (const id of step.parts) expect(module(world).registry.get(id), `${step.id} → ${id}`).toBeDefined();
      }
    }
  });

  it('links only existing parts to existing worlds, and overview shortcuts to existing worlds', () => {
    for (const [partId, link] of Object.entries(lab.partLinks ?? {})) {
      expect(
        lab.parts.some((p) => p.id === partId),
        partId,
      ).toBe(true);
      expect(sceneIds).toContain(link.scene);
    }
    for (const scene of lab.scenes) {
      for (const action of scene.overview?.actions ?? []) expect(sceneIds).toContain(action.scene);
    }
  });

  it('opens every lesson on an existing world, part, preset and scenario', () => {
    for (const lesson of lab.lessons?.items ?? []) {
      const { scene, part, preset, scenario } = lesson.focus;
      expect(sceneIds, `${lesson.id}: scene`).toContain(scene);
      if (part) expect(module(scene).registry.get(part), `${lesson.id}: part ${part}`).toBeDefined();
      if (preset) expect(PRESET_IDS as string[], `${lesson.id}: preset ${preset}`).toContain(preset);
      if (scenario) expect(SCENARIO_IDS as string[], `${lesson.id}: scenario ${scenario}`).toContain(scenario);
    }
  });

  it('draws each sheet of the plans from existing worlds, parts and groups', () => {
    const groups = (lab.plans?.groups ?? []).map((g) => g.id);
    for (const sheet of lab.plans?.sheets ?? []) {
      expect(groups, `${sheet.id}: group`).toContain(sheet.group);
      if (!sheet.scene) continue;
      expect(sceneIds, `${sheet.id}: scene`).toContain(sheet.scene);
      for (const id of sheet.parts ?? [])
        expect(module(sheet.scene).registry.get(id), `${sheet.id}: ${id}`).toBeDefined();
    }
  });

  it('feeds the bottom strip from the simulation state', () => {
    const values = lab.strip.values(lab.sim);
    expect(values.length).toBeGreaterThan(0);
    for (const v of values) {
      expect(v.label).not.toBe('');
      expect(v.value).not.toBe('');
    }
    expect(lab.strip.clock(lab.sim).time).toMatch(/^\d\d:\d\d$/);
  });
});
