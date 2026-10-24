// The list of findings of a run: one entry per cause, with every place where it was seen.

export const SEVERITIES = ['blocker', 'major', 'minor', 'info'];

export class Findings {
  constructor() {
    this.map = new Map();
  }

  /**
   * @param {{ sev: string, key: string, cat: string, title: string, where?: string, detail?: any, shot?: string, agg?: string, source?: string, ref?: string }} f
   * `key` identifies the cause (the same key at many places is one finding); `source` is `lab` or `kit`.
   */
  add(f) {
    let e = this.map.get(f.key);
    if (!e) {
      e = {
        key: f.key,
        sev: f.sev,
        cat: f.cat,
        title: f.title,
        source: f.source ?? 'lab',
        ref: f.ref ?? null,
        places: [],
        count: 0,
        examples: [],
        shots: [],
        agg: {},
      };
      this.map.set(f.key, e);
    }
    // the worst severity seen wins
    if (SEVERITIES.indexOf(f.sev) < SEVERITIES.indexOf(e.sev)) e.sev = f.sev;
    e.count++;
    if (f.where && !e.places.includes(f.where) && e.places.length < 400) e.places.push(f.where);
    if (f.detail !== undefined && e.examples.length < 3) e.examples.push(f.detail);
    if (f.agg) e.agg[f.agg] = (e.agg[f.agg] || 0) + 1;
    if (f.shot && e.shots.length < 3 && !e.shots.includes(f.shot)) e.shots.push(f.shot);
  }

  list() {
    return [...this.map.values()].sort(
      (a, b) => SEVERITIES.indexOf(a.sev) - SEVERITIES.indexOf(b.sev) || b.places.length - a.places.length,
    );
  }

  counts() {
    const c = { blocker: 0, major: 0, minor: 0, info: 0 };
    for (const e of this.map.values()) c[e.sev]++;
    return c;
  }
}
