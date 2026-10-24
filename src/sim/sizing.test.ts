import { describe, expect, it } from 'vitest';
import { RamSim } from './engine';
import { SOURCE_FLOW_TODAY } from './presets';
import {
  expectedDelivery,
  GPD_TO_M3_DAY,
  GPM_TO_LPM,
  largestPipeFor,
  minDriveLength,
  nearestPipeSize,
  PIPE_SIZES,
  pipeSize,
  sizeRam,
  TYPICAL_ETA,
  usualDriveLength,
} from './sizing';

// The sizing calculator against the sources of docs/research.md: S4 table 2 (K21), the length rules (K20), the delivery
// formula (K17, K18), and the video's own site (K1–K6) as a sanity check (K8 ↔ K21).

const VIDEO = { fall: 7.5, deliveryHead: 65, sourceFlow: SOURCE_FLOW_TODAY, pipe: '1', driveLength: 20 } as const;

describe('K21: S4 table 2, converted from US units', () => {
  it('converts gallons explicitly', () => {
    expect(GPM_TO_LPM).toBeCloseTo(3.7854, 4);
    expect(2 * GPM_TO_LPM).toBeCloseTo(7.57, 2);
    expect(1000 * GPD_TO_M3_DAY).toBeCloseTo(3.785, 3);
  });

  it('gives K21 for the four sizes: 7.6 / 22.7 / 53 / 95 L/min and 3.8 / 7.6 / 15 / 26 m³/day (±2 %)', () => {
    const lpm = [7.6, 22.7, 53, 95];
    const m3 = [3.8, 7.6, 15, 26];
    PIPE_SIZES.forEach((s, i) => {
      expect(Math.abs(s.minSourceLpm / lpm[i] - 1)).toBeLessThan(0.02);
      expect(Math.abs(s.maxDeliveryLpd / 1000 / m3[i] - 1)).toBeLessThan(0.025);
    });
    expect(PIPE_SIZES.map((s) => s.id)).toEqual(['3/4', '1', '1-1/2', '2']);
  });

  it('the inner diameters stay inside the range of the simulation, and the lab’s 27 mm pipe is the 1″', () => {
    for (const s of PIPE_SIZES) {
      expect(s.innerMm).toBeGreaterThanOrEqual(15);
      expect(s.innerMm).toBeLessThanOrEqual(54);
    }
    expect(nearestPipeSize(27).id).toBe('1');
    expect(nearestPipeSize(20).id).toBe('3/4');
    expect(nearestPipeSize(50).id).toBe('2');
    expect(pipeSize('1-1/2').inch).toBe(1.5);
  });
});

describe('K20: drive pipe length', () => {
  it('S4: at least 5 × the fall; S6: usually 3 to 7 ×', () => {
    expect(minDriveLength(7.5)).toBeCloseTo(37.5, 6);
    const [lo, hi] = usualDriveLength(7.5);
    expect(lo).toBeCloseTo(22.5, 6);
    expect(hi).toBeCloseTo(52.5, 6);
  });
});

describe('K17, K18, K14: expected delivery', () => {
  it('K18: η = 0.6, Q = 7.5 L/min, h = 7.5, H = 65 → ≈ 750 L/day (±1 %)', () => {
    const d = expectedDelivery(7.5, 7.5, 65, TYPICAL_ETA);
    expect(Math.abs(d.lpd / 750 - 1)).toBeLessThan(0.01);
    expect(d.lpm).toBeCloseTo(0.519, 3);
  });

  it('K10 and K18: the video’s 500 L/day is η ≈ 0.4', () => {
    expect(Math.abs(expectedDelivery(7.5, 7.5, 65, 0.4).lpd / 500 - 1)).toBeLessThan(0.01);
  });

  it('K14: η = 1 is the upper bound, 1 250 L/day at 7.5 L/min', () => {
    expect(Math.abs(expectedDelivery(7.5, 7.5, 65, 1).lpd / 1250 - 1)).toBeLessThan(0.01);
  });

  it('is proportional to the flow and to h/H, and zero without a head', () => {
    const a = expectedDelivery(10, 5, 50, 0.6).lpd;
    expect(expectedDelivery(20, 5, 50, 0.6).lpd).toBeCloseTo(2 * a, 6);
    expect(expectedDelivery(10, 10, 50, 0.6).lpd).toBeCloseTo(2 * a, 6);
    expect(expectedDelivery(10, 5, 100, 0.6).lpd).toBeCloseTo(a / 2, 6);
    expect(expectedDelivery(10, 5, 0, 0.6).lpd).toBe(0);
  });
});

describe('the checks and the verdict', () => {
  it('largest pipe the spring can feed: none under 7.6 L/min, then ¾″, 1″, 1½″, 2″', () => {
    expect(largestPipeFor(5)).toBeNull();
    expect(largestPipeFor(7.6)?.id).toBe('3/4');
    expect(largestPipeFor(22.7)?.id).toBe('1');
    expect(largestPipeFor(40)?.id).toBe('1');
    expect(largestPipeFor(53)?.id).toBe('1-1/2');
    expect(largestPipeFor(200)?.id).toBe('2');
  });

  it('the video’s site: a 1″ ram on 7.5 L/min is short of water (33 % of 22.7) and its pipe is short (L/h = 2.7)', () => {
    const r = sizeRam(VIDEO);
    expect(r.sourceEnough).toBe(false);
    expect(r.sourceRatio).toBeCloseTo(7.5 / 22.7, 3);
    expect(r.warnings).toContain('sourceShort');
    expect(r.warnings).toContain('lengthShort'); // 20 m for 7.5 m of fall: L/h = 2.67 < 3 (K20)
    expect(r.warnings).not.toContain('headHigh'); // H/h = 8.7
    expect(r.liftRatio).toBeCloseTo(8.667, 3);
    expect(r.lengthRatio).toBeCloseTo(2.667, 3);
    expect(r.minLength).toBeCloseTo(37.5, 6);
    expect(r.minSource).toBe(22.7);
    expect(Math.abs(r.delivery.lpd / 750 - 1)).toBeLessThan(0.01); // K18: ≈ 750 L/day at η = 0.6
    // the 7.5–7.8 L/min of the spring (K6) is the ¾″ minimum (7.6): that is what the spring can feed
    expect(largestPipeFor(7.8)?.id).toBe('3/4');
    expect(r.largestPipe).toBeNull(); // 7.5 is a hair under 7.6
  });

  it('K8 and K21 agree with the model: the n°3 valve takes 17 L/min, close to the 22.7 a 1″ ram asks; the n°1 valve takes less than the spring', () => {
    const q3 = new RamSim('valve-3').averages.driveFlow;
    const q1 = new RamSim('valve-1').averages.driveFlow;
    const asked = pipeSize('1').minSourceLpm;
    expect(q3 / asked).toBeGreaterThan(0.6);
    expect(q3 / asked).toBeLessThan(1);
    expect(q3).toBeGreaterThan(SOURCE_FLOW_TODAY); // it starves the spring: the tank empties (K8)
    // what the video did: retune the valve until the ram takes less than the spring gives (K10)
    expect(q1).toBeLessThan(SOURCE_FLOW_TODAY);
    expect(q1).toBeLessThan(asked / 3);
  });

  it('a site that satisfies the sources has no warning', () => {
    const r = sizeRam({ fall: 5, deliveryHead: 40, sourceFlow: 30, pipe: '1', driveLength: 30 });
    expect(r.warnings).toEqual([]);
    expect(r.sourceEnough).toBe(true);
    expect(r.sourceRatio).toBeGreaterThan(1);
    expect(r.largestPipe?.id).toBe('1');
  });

  it('H/h above 12 is flagged, H/h below 1.5 too', () => {
    expect(sizeRam({ fall: 5, deliveryHead: 61, sourceFlow: 30, pipe: '1' }).warnings).toContain('headHigh');
    expect(sizeRam({ fall: 5, deliveryHead: 60, sourceFlow: 30, pipe: '1' }).warnings).not.toContain('headHigh');
    expect(sizeRam({ fall: 5, deliveryHead: 7, sourceFlow: 30, pipe: '1' }).warnings).toContain('headLow');
  });

  it('the length warnings: under 3 × is short, 3 to 5 × is below S4’s minimum, 5 × and more is fine; none without a length', () => {
    const w = (L?: number) =>
      sizeRam({ fall: 5, deliveryHead: 40, sourceFlow: 30, pipe: '1', driveLength: L }).warnings;
    expect(w(14)).toContain('lengthShort');
    expect(w(15)).toContain('lengthBelowS4');
    expect(w(24)).toContain('lengthBelowS4');
    expect(w(25)).toEqual([]);
    expect(w(60)).toEqual([]);
    expect(w(undefined)).toEqual([]);
  });

  it('a bigger pipe needs more water: the minimum spring flow rises with the size', () => {
    const mins = PIPE_SIZES.map((s) => sizeRam({ ...VIDEO, pipe: s.id }).minSource);
    for (let i = 1; i < mins.length; i++) expect(mins[i]).toBeGreaterThan(mins[i - 1]);
  });

  it('every number is finite for any input, even degenerate ones', () => {
    for (const fall of [0, 2, 30])
      for (const head of [0, 5, 150])
        for (const src of [0, 1, 40]) {
          const r = sizeRam({ fall, deliveryHead: head, sourceFlow: src, pipe: '2', driveLength: 10 });
          expect(Number.isFinite(r.delivery.lpd)).toBe(true);
          expect(Number.isFinite(r.sourceRatio)).toBe(true);
          expect(Number.isFinite(r.minLength)).toBe(true);
        }
  });
});
