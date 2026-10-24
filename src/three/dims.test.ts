import { describe, expect, it } from 'vitest';
import * as DIMS from './dims';

// The single source of dimensions: finite, positive, and the reported figures of the video.

describe('dimensions', () => {
  const positive = (obj: Record<string, unknown>, path: string, out: string[]) => {
    for (const [k, v] of Object.entries(obj)) {
      const name = `${path}.${k}`;
      if (typeof v === 'number') {
        if (!Number.isFinite(v)) out.push(`${name} is not finite`);
        else if (v <= 0 && !SIGNED.has(name)) out.push(`${name} = ${v} is not positive`);
      } else if (Array.isArray(v)) {
        v.forEach((x, i) => {
          if (typeof x === 'number' && !Number.isFinite(x)) out.push(`${name}[${i}] is not finite`);
          if (Array.isArray(x)) x.forEach((y) => !Number.isFinite(y) && out.push(`${name}[${i}] is not finite`));
        });
      } else if (v && typeof v === 'object') positive(v as Record<string, unknown>, name, out);
    }
  };
  // negative or zero by nature: heights below the datum, the datum itself, plan coordinates
  const SIGNED = new Set([
    'RAM.axisY',
    'RAM.floorY',
    'PIT.floorY',
    'TOWER.planZ',
    'TOWER.troughZ',
    'TOWER.riserZ',
    'HOUSE.planZ',
  ]);

  it('exports finite, positive numbers', () => {
    const out: string[] = [];
    for (const [name, v] of Object.entries(DIMS)) {
      if (v && typeof v === 'object') positive(v as Record<string, unknown>, name, out);
    }
    expect(out).toEqual([]);
  });

  it('quotes the reported figures of the video', () => {
    expect(DIMS.SITE.fall).toBe(7.5);
    expect(DIMS.SITE.driveLength).toBe(20);
    expect(DIMS.SITE.deliveryLength).toBe(300);
    expect(DIMS.SITE.deliveryHead).toBe(65);
    expect(DIMS.VALVE.seatBore).toEqual({ 1: 0.015, 2: 0.02, 3: 0.026 });
  });

  it('keeps the guide bore clearly larger than the rod and the sleeves a tenth of a millimetre under it', () => {
    expect(DIMS.VALVE.guideTubeInnerDiameter).toBeGreaterThanOrEqual(0.009);
    expect(DIMS.VALVE.guideTubeInnerDiameter - DIMS.VALVE.stemSleeveDiameter).toBeCloseTo(0.0001, 5);
  });
});
