import * as THREE from 'three';
import { FITTINGS } from '../dims';
import { DEG } from '../common';

// The face of the pressure gauge as a DataTexture (no canvas, so it also builds in Node): cream dial, ticks every 0.2 bar,
// long ticks and numbers every 2 bar from 0 to the full scale, a red band over the last two. A 5x7 bitmap font.

const GLYPHS: Record<string, string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
};

/** Gauge angle (radians, counter-clockwise from the top) of a pressure: 0 bar at 135 degrees, then 270 degrees clockwise. */
export const dialAngle = (bar: number): number =>
  (135 - (270 * Math.min(Math.max(bar, 0), FITTINGS.gaugeFullScaleBar)) / FITTINGS.gaugeFullScaleBar) * DEG;

export function dialTexture(size = 256): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const ink = [38, 40, 44];
  const red = [190, 50, 40];
  const paper = [244, 239, 228];
  const full = FITTINGS.gaugeFullScaleBar;
  const put = (x: number, y: number, c: number[]) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const k = (y * size + x) * 4;
    data[k] = c[0];
    data[k + 1] = c[1];
    data[k + 2] = c[2];
    data[k + 3] = 255;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = ((x + 0.5) / size) * 2 - 1;
      const ny = ((y + 0.5) / size) * 2 - 1;
      const rho = Math.hypot(nx, ny);
      let c = paper;
      if (rho <= 1) {
        const theta = Math.atan2(-nx, ny); // angle of the pixel in the dial's convention
        // bar value of this direction, measured clockwise from the 0 mark (theta - zero is in (-2pi, 0] clockwise)
        const clockwise = ((((dialAngle(0) - theta) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / DEG;
        const b = (clockwise / 270) * full;
        if (clockwise <= 270.5) {
          const major = Math.abs(b / 1 - Math.round(b / 1)) < 0.012 / Math.max(rho, 0.3);
          const minor = Math.abs(b / 0.2 - Math.round(b / 0.2)) < 0.02 / Math.max(rho, 0.3);
          if (major && rho > 0.78 && rho < 0.94) c = ink;
          else if (minor && rho > 0.86 && rho < 0.94) c = ink;
          if (b >= 8 && rho > 0.95 && rho < 0.985) c = red;
        }
      }
      put(x, y, c);
    }
  }
  // numbers every 2 bar
  const cell = Math.round(size / 64);
  for (let v = 0; v <= full; v += 2) {
    const a = dialAngle(v);
    const cx = Math.round(((-Math.sin(a) * 0.6 + 1) / 2) * size);
    const cy = Math.round(((Math.cos(a) * 0.6 + 1) / 2) * size);
    const text = String(v);
    const w = text.length * 6 * cell - cell;
    let ox = cx - Math.round(w / 2);
    for (const ch of text) {
      GLYPHS[ch].forEach((row, j) => {
        for (let i = 0; i < 5; i++) {
          if (row[i] !== '1') continue;
          for (let dy = 0; dy < cell; dy++) {
            for (let dx = 0; dx < cell; dx++)
              put(ox + i * cell + dx, cy + (3 - j) * cell + dy - Math.round(cell / 2), ink);
          }
        }
      });
      ox += 6 * cell;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}
