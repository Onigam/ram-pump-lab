import { describe, expect, it } from 'vitest';
import { lab } from './lab';

// The lead's integration checks: the pieces written by different roles must agree with each other.

const sceneIds = lab.scenes.map((s) => s.id);
const partIds = (scene: string) =>
  lab.parts
    .filter((p) => p.scene === scene)
    .map((p) => p.id)
    .sort();

describe('lab definition', () => {
  it('declares the two worlds, the site first', () => {
    expect(sceneIds).toEqual(['site', 'ram']);
    expect(lab.defaultScene).toBe('site');
  });

  it.each(sceneIds)('world %s registers exactly the catalogued parts', (id) => {
    const registered = lab.scenes
      .find((s) => s.id === id)!
      .module.registry.ids()
      .sort();
    expect(registered).toEqual(partIds(id));
  });

  it.each(sceneIds)('world %s has hotspots that point at registered parts and existing worlds', (id) => {
    const mod = lab.scenes.find((s) => s.id === id)!.module;
    expect(mod.hotspots.length).toBeGreaterThan(0);
    for (const hs of mod.hotspots) {
      expect(mod.registry.get(hs.partId), `hotspot of ${hs.partId}`).toBeDefined();
      if (hs.goto) expect(sceneIds).toContain(hs.goto);
    }
  });

  it('plays the guides in the world that holds their parts', () => {
    for (const guide of [lab.guides?.assembly, lab.guides?.install]) {
      expect(guide).toBeDefined();
      const mod = lab.scenes.find((s) => s.id === guide!.scene)!.module;
      for (const step of guide!.steps) {
        for (const id of step.parts) expect(mod.registry.get(id), `${step.id} → ${id}`).toBeDefined();
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
