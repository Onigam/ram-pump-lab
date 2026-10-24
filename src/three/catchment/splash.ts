import * as THREE from 'three';
import { softDotTexture } from '../common';

// A small fountain of drops for places where water falls onto something: the trickle on the gravel, the feed pipe into the
// tank, the overflow into the ditch, the waste water into the soakaway. Cheap Points; positions only, the rate follows the
// flow the simulation gives. Live drops are kept at the start of the arrays and only they are drawn.

export interface SplashOptions {
  max?: number;
  /** Where the drops start (the frame of the object the splash is added to). */
  emitter: THREE.Vector3;
  /** Radius of the disc the drops start on, m. */
  radius?: number;
  /** Horizontal speed, m/s, and upward speed of a drop thrown by the impact. */
  spread?: number;
  up?: number;
  /** Height the drops die at; a function so that it can follow the water level. */
  floorY: () => number;
  /** Drop size in metres and colour. */
  size?: number;
  color?: number;
}

export class Splash {
  readonly object: THREE.Points;
  private readonly max: number;
  private readonly pos: Float32Array;
  private readonly vel: Float32Array;
  private readonly life: Float32Array;
  private live = 0;
  private carry = 0;
  private seed = 1;

  constructor(private readonly o: SplashOptions) {
    this.max = o.max ?? 120;
    this.pos = new Float32Array(this.max * 3);
    this.vel = new Float32Array(this.max * 3);
    this.life = new Float32Array(this.max);
    for (let i = 0; i < this.max; i++) this.pos.set([o.emitter.x, o.emitter.y, o.emitter.z], i * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setDrawRange(0, 0);
    const mat = new THREE.PointsMaterial({
      color: o.color ?? 0xcfe9fa,
      size: o.size ?? 0.022,
      map: softDotTexture(),
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.object = new THREE.Points(geo, mat);
    this.object.frustumCulled = false;
    this.object.userData.noShadow = true;
    this.object.castShadow = false;
    this.object.visible = false;
  }

  /** A deterministic pseudo-random number in [0, 1) (the tests must not depend on Math.random). */
  private rnd(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  /** `rate` drops per second (0 = none); `active` false clears everything. */
  update(dt: number, rate: number, active: boolean): void {
    const step = Math.min(Math.max(dt, 0), 0.05);
    if (!active) this.live = 0;
    if (active && rate > 0) {
      this.carry += step * rate;
      while (this.carry >= 1 && this.live < this.max) {
        this.carry -= 1;
        this.spawn();
      }
      this.carry = Math.min(this.carry, 1);
    }
    const floor = this.o.floorY();
    for (let i = 0; i < this.live;) {
      const k = i * 3;
      this.vel[k + 1] -= 9.81 * step;
      this.pos[k] += this.vel[k] * step;
      this.pos[k + 1] += this.vel[k + 1] * step;
      this.pos[k + 2] += this.vel[k + 2] * step;
      this.life[i] -= step;
      if (this.life[i] <= 0 || (this.vel[k + 1] < 0 && this.pos[k + 1] < floor)) this.remove(i);
      else i++;
    }
    this.object.visible = this.live > 0;
    this.object.geometry.setDrawRange(0, this.live);
    (this.object.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  private remove(i: number): void {
    const last = --this.live;
    if (i === last) return;
    for (let c = 0; c < 3; c++) {
      const a = i * 3 + c;
      const b = last * 3 + c;
      [this.pos[a], this.pos[b]] = [this.pos[b], this.pos[a]];
      [this.vel[a], this.vel[b]] = [this.vel[b], this.vel[a]];
    }
    [this.life[i], this.life[last]] = [this.life[last], this.life[i]];
  }

  private spawn(): void {
    const i = this.live++;
    const k = i * 3;
    const a = this.rnd() * Math.PI * 2;
    const r = Math.sqrt(this.rnd()) * (this.o.radius ?? 0.03);
    const sp = (this.o.spread ?? 0.35) * (0.4 + 0.6 * this.rnd());
    this.pos[k] = this.o.emitter.x + Math.cos(a) * r;
    this.pos[k + 1] = this.o.emitter.y;
    this.pos[k + 2] = this.o.emitter.z + Math.sin(a) * r;
    this.vel[k] = Math.cos(a) * sp;
    this.vel[k + 1] = (this.o.up ?? 0.9) * (0.4 + 0.6 * this.rnd());
    this.vel[k + 2] = Math.sin(a) * sp;
    this.life[i] = 0.9;
  }

  /** Change the height the drops die at. */
  setFloor(fn: () => number): void {
    this.o.floorY = fn;
  }

  /** Move the emitter (it follows the water level or the ground). */
  setEmitter(x: number, y: number, z: number): void {
    this.o.emitter.set(x, y, z);
  }

  get count(): number {
    return this.live;
  }
}
