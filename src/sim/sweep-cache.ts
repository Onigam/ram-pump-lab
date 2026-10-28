// A small bounded cache for the results of the cycle model (pure, no DOM). Solving the averages of a stroke cycle costs
// about 6 ms; the charts of the simulation panel and the performance sheet ask for hundreds of them, many of them for
// the very same settings (a second visit, a change of language, the panel closed and opened again). The model is
// deterministic, so a result only has to be computed once per set of settings.

/** Least recently used entries are dropped first once `limit` is reached. */
export class SolveCache<T> {
  private readonly map = new Map<string, T>();
  hits = 0;
  misses = 0;

  constructor(readonly limit: number) {}

  get size(): number {
    return this.map.size;
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  /** The cached value, or undefined. A hit becomes the most recently used entry. */
  get(key: string): T | undefined {
    const value = this.map.get(key);
    if (value === undefined) {
      this.misses += 1;
      return undefined;
    }
    this.hits += 1;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: string, value: T): void {
    this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.limit) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  clear(): void {
    this.map.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

/** Work for a few milliseconds at a time while the browser is idle (or from a timer where it has no idle callback). */
export interface IdleQueue {
  /** Add a unit of work: it is called with the milliseconds it may use and returns true when it has finished. */
  push(work: (budgetMs: number) => boolean): void;
  /** Number of units not finished. */
  readonly pending: number;
  /** Forget all the work not started. */
  clear(): void;
}

type IdleDeadline = { timeRemaining(): number };
type IdleRequest = (cb: (deadline: IdleDeadline) => void, opts?: { timeout: number }) => number;

/**
 * A queue that runs its work in slices of at most `sliceMs` milliseconds, one slice per idle period of the browser
 * (`requestIdleCallback`, with a timeout so that a busy page still makes progress), or per timer tick elsewhere.
 */
export function idleQueue(sliceMs = 4): IdleQueue {
  const work: ((budgetMs: number) => boolean)[] = [];
  let scheduled = false;
  const now = () => performance.now();

  const run = (deadline?: IdleDeadline) => {
    scheduled = false;
    const start = now();
    // an idle period gives its own time left; a timer tick gets the slice
    const room = deadline ? Math.min(sliceMs, Math.max(1, deadline.timeRemaining())) : sliceMs;
    while (work.length > 0) {
      const left = room - (now() - start);
      if (left <= 0) break;
      if (work[0](left)) work.shift();
    }
    if (work.length > 0) schedule();
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    const ric = (globalThis as { requestIdleCallback?: IdleRequest }).requestIdleCallback;
    if (ric) ric((deadline) => run(deadline), { timeout: 250 });
    else setTimeout(() => run(), 16);
  };

  return {
    push(item) {
      work.push(item);
      schedule();
    },
    get pending() {
      return work.length;
    },
    clear() {
      work.length = 0;
    },
  };
}
