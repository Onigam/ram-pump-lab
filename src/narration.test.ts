import { readManifest, validateManifest } from '@onigam/lab-kit/narration';
import { describe, expect, it } from 'vitest';
import { lab } from './lab';

// The spoken guide: the scripts (narration/<lang>.json) and the manifests generated from them (public/audio/<lang>) must
// agree with the lab's worlds, parts and modes. The audio files are only listed, never loaded.

const sceneIds = lab.scenes.map((s) => s.id);
const partIds = lab.parts.map((p) => p.id);
const worldOf = (partId: string) => lab.parts.find((p) => p.id === partId)?.scene;

const CUE = /\[\[([a-z]+)(?::([^\]]*))?\]\]/g;
const BOOLEAN_CUES = ['xray', 'cutaway', 'flows', 'isolate'];
const MODES = ['explore', 'assembly', 'install', 'sim', 'plans', 'lessons'];
/** Ceiling set by the owner for the spoken characters of one language. */
const BUDGET = 30_000;

interface Script {
  lang: string;
  segments: { id: string; scope: string; title: string; scene: string; text: string }[];
}

const langOf = (path: string, folder: RegExp): string => folder.exec(path)![1]!;
const scripts = Object.fromEntries(
  Object.entries(
    import.meta.glob('../narration/*.json', { import: 'default', eager: true }) as Record<string, Script>,
  ).map(([path, script]) => [langOf(path, /\/(\w+)\.json$/), script]),
);
const manifests = Object.fromEntries(
  Object.entries(import.meta.glob('../public/audio/*/manifest.json', { import: 'default', eager: true })).map(
    ([path, raw]) => [langOf(path, /\/audio\/(\w+)\//), raw],
  ),
);
const audioFiles = Object.keys(import.meta.glob('../public/audio/*/*.mp3'));

describe('narration wiring', () => {
  it('asks for the manifest of the interface language', () => {
    expect(lab.narration?.manifest).toBe('audio/{lang}/manifest.json');
  });
});

describe.each(Object.keys(scripts))('narration script %s', (lang) => {
  const script = scripts[lang]!;

  it('has the lab language and a segment for the intro, every world and every part, once each', () => {
    expect(script.lang).toBe(lang);
    const scopes = script.segments.map((s) => s.scope);
    expect(new Set(scopes).size).toBe(scopes.length);
    expect(new Set(script.segments.map((s) => s.id)).size).toBe(script.segments.length);
    expect([...scopes].sort()).toEqual(
      ['intro', ...sceneIds.map((id) => `scene:${id}`), ...partIds.map((id) => `part:${id}`)].sort(),
    );
  });

  it('starts every segment in the right world', () => {
    for (const s of script.segments) {
      const [kind, id = ''] = s.scope.split(':');
      const expected = kind === 'part' ? worldOf(id) : kind === 'scene' ? id : undefined;
      if (expected) expect(s.scene, s.id).toBe(expected);
      expect(sceneIds, s.id).toContain(s.scene);
    }
  });

  it('writes only cues the app knows, on worlds, parts and modes of the lab', () => {
    for (const s of script.segments) {
      for (const [, name = '', arg = ''] of s.text.matchAll(CUE)) {
        const where = `${s.id}: [[${name}${arg ? ':' + arg : ''}]]`;
        if (name === 'home') expect(arg, where).toBe('');
        else if (name === 'scene') expect(sceneIds, where).toContain(arg);
        else if (name === 'frame') for (const id of arg.split(',')) expect(partIds, where).toContain(id);
        else if (name === 'select') expect([...partIds, 'none'], where).toContain(arg);
        else if (name === 'explode') expect(Number(arg), where).toBeGreaterThanOrEqual(0);
        else if (BOOLEAN_CUES.includes(name)) expect(['on', 'off'], where).toContain(arg);
        else if (name === 'mode') expect(MODES, where).toContain(arg);
        else expect.fail(`${where}: unknown cue`);
      }
    }
  });

  it('frames only parts of the current world and switches off what it switches on', () => {
    for (const s of script.segments) {
      let world = s.scene;
      const on = new Set<string>();
      for (const [, name = '', arg = ''] of s.text.matchAll(CUE)) {
        if (name === 'scene') world = arg;
        if (name === 'frame') for (const id of arg.split(',')) expect(worldOf(id), `${s.id}: frame ${id}`).toBe(world);
        if (name === 'select' && arg !== 'none') expect(worldOf(arg), `${s.id}: select ${arg}`).toBe(world);
        if (BOOLEAN_CUES.includes(name)) arg === 'on' ? on.add(name) : on.delete(name);
        if (name === 'explode') arg === '0' ? on.delete(name) : on.add(name);
      }
      expect([...on], `${s.id} leaves cues on`).toEqual([]);
    }
  });

  it('moves the camera at most once every 35 spoken characters', () => {
    for (const s of script.segments) {
      let last: { at: number; cue: string } | undefined;
      let removed = 0;
      for (const m of s.text.matchAll(CUE)) {
        const at = m.index - removed;
        removed += m[0].length;
        if (!['home', 'scene', 'frame', 'select'].includes(m[1] ?? '')) continue;
        if (last) expect(at - last.at, `${s.id}: ${last.cue} then ${m[0]}`).toBeGreaterThanOrEqual(35);
        last = { at, cue: m[0] };
      }
    }
  });

  it('says its disclaimers once: the reconstruction notice in the intro, the drinkability warning once', () => {
    const words = {
      fr: { notice: /reconstitution pédagogique|plan officiel/i, drink: /potable/i, hedge: /dans le modèle/i },
      en: { notice: /educational reconstruction|official plan/i, drink: /drinkable|potable/i, hedge: /in the model/i },
    }[lang as 'fr' | 'en'];
    if (!words) return;
    const where = (re: RegExp) => script.segments.filter((s) => re.test(s.text)).map((s) => s.id);
    expect(where(words.notice)).toEqual(['intro']);
    expect(where(words.drink).length).toBeLessThanOrEqual(1);
    expect(where(words.hedge).length).toBeLessThanOrEqual(2);
  });

  it('stays within the budget and has no symbol or digit in the spoken text', () => {
    let total = 0;
    for (const s of script.segments) {
      const spoken = s.text.replace(CUE, '');
      total += spoken.length;
      expect(spoken, s.id).not.toMatch(/[*≈×Ø″%]|\d/);
    }
    expect(total).toBeLessThanOrEqual(BUDGET);
  });
});

describe.each(Object.keys(manifests))('narration audio %s', (lang) => {
  const { manifest, problems } = readManifest(manifests[lang]);

  it('is a usable manifest that agrees with the lab', () => {
    expect(problems).toEqual([]);
    expect(manifest).not.toBeNull();
    expect(validateManifest(manifest!, { scenes: sceneIds, parts: partIds })).toEqual([]);
  });

  it('has an audio file for every segment and none without a segment', () => {
    const files = audioFiles.filter((f) => f.includes(`/audio/${lang}/`)).map((f) => f.split('/').pop());
    expect(files.sort()).toEqual(manifest!.segments.map((s) => s.file).sort());
  });

  it('is the audio of the script of the same language', () => {
    const script = scripts[lang];
    if (!script) return;
    expect(manifest!.segments.map((s) => s.id).sort()).toEqual(script.segments.map((s) => s.id).sort());
  });
});

describe('the private transcript', () => {
  // docs/transcript.md is git-ignored: when it is present on this machine, no run of seven words of a narration script may
  // be copied from it (the captions only serve to check facts). Absent in CI: skipped. Same rule as the interface strings.
  const transcript = Object.values(
    import.meta.glob('../docs/transcript.md', { query: '?raw', import: 'default', eager: true }) as Record<
      string,
      string
    >,
  )[0];
  const words = (t: string): string[] =>
    t
      .toLowerCase()
      .replace(/\*\*/g, '')
      .replace(/’/g, "'")
      .replace(/[^a-zàâäçéèêëîïôöùûüÿœ0-9' ]+/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  const grams = (w: string[], n: number): string[] =>
    Array.from({ length: Math.max(0, w.length - n + 1) }, (_, i) => w.slice(i, i + n).join(' '));

  it.skipIf(!transcript)('copies no seven-word run of the video captions', () => {
    const body = transcript!.split('## Média24')[0]!.replace(/^\d\d:\d\d:\d\d /gm, '');
    const source = new Set(grams(words(body.replace(/\n/g, ' ')), 7));
    const copied = Object.entries(scripts)
      .filter(([lang]) => lang === 'fr')
      .flatMap(([lang, script]) =>
        script.segments.flatMap((s) =>
          grams(words(s.text.replace(CUE, '')), 7)
            .filter((g) => source.has(g))
            .map((g) => `${lang}/${s.id}: "${g}"`),
        ),
      );
    expect(copied).toEqual([]);
  });
});
