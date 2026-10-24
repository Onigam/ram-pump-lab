// A minimal stand-in for the few DOM calls the kit's `Drawing` makes (createElementNS, setAttribute, append, cloneNode,
// textContent, XMLSerializer), so that the sheets can be rendered and checked in Node by `mechanical.test.ts`. Not imported
// by the application.

export class FakeElement {
  readonly attrs = new Map<string, string>();
  children: FakeElement[] = [];
  text = '';
  readonly style: Record<string, string> = {};
  readonly classList = { add: (): void => undefined };
  readonly lang = '';

  constructor(readonly tag: string) {}

  setAttribute(name: string, value: unknown): void {
    this.attrs.set(name, String(value));
  }
  getAttribute(name: string): string | null {
    return this.attrs.get(name) ?? null;
  }
  removeAttribute(name: string): void {
    this.attrs.delete(name);
  }
  append(...nodes: (FakeElement | string)[]): void {
    for (const n of nodes) {
      if (typeof n === 'string') this.text += n;
      else this.children.push(n);
    }
  }
  remove(): void {}
  cloneNode(deep = false): FakeElement {
    const c = new FakeElement(this.tag);
    for (const [k, v] of this.attrs) c.attrs.set(k, v);
    if (deep) {
      c.text = this.text;
      c.children = this.children.map((x) => x.cloneNode(true));
    }
    return c;
  }
  set textContent(v: string) {
    this.text = v;
    this.children = [];
  }
  get textContent(): string {
    return this.text + this.children.map((c) => c.textContent).join('');
  }
  toXML(): string {
    const attrs = [...this.attrs].map(([k, v]) => ` ${k}="${escapeXml(v)}"`).join('');
    const inner = escapeXml(this.text) + this.children.map((c) => c.toXML()).join('');
    return inner ? `<${this.tag}${attrs}>${inner}</${this.tag}>` : `<${this.tag}${attrs}/>`;
  }
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const fakeDocument = {
  createElementNS: (_ns: string, tag: string): FakeElement => new FakeElement(tag),
  documentElement: { lang: '' },
};

export class FakeXMLSerializer {
  serializeToString(node: FakeElement): string {
    return node.toXML();
  }
}

/** One `<text>` element of a rendered sheet, with the attributes the layout checks need. */
export interface TextBox {
  x: number;
  y: number;
  size: number;
  anchor: 'start' | 'middle' | 'end';
  baseline: 'alphabetic' | 'central' | 'hanging';
  bold: boolean;
  mono: boolean;
  rotated: boolean;
  content: string;
}

/** Every `<text>` of a serialized sheet. */
export function textBoxes(svg: string): TextBox[] {
  const out: TextBox[] = [];
  const re = /<text ([^>]*)>([^<]*)<\/text>/g;
  for (const m of svg.matchAll(re)) {
    const attrs = new Map<string, string>();
    for (const a of (m[1] ?? '').matchAll(/([\w-]+)="([^"]*)"/g)) attrs.set(a[1] ?? '', a[2] ?? '');
    out.push({
      x: Number(attrs.get('x')),
      y: Number(attrs.get('y')),
      size: Number(attrs.get('font-size')),
      anchor: (attrs.get('text-anchor') as TextBox['anchor']) ?? 'start',
      baseline:
        attrs.get('dominant-baseline') === 'hanging'
          ? 'hanging'
          : attrs.get('dominant-baseline') === 'central'
            ? 'central'
            : 'alphabetic',
      bold: attrs.get('font-weight') === '700',
      mono: (attrs.get('font-family') ?? '').includes('Mono'),
      rotated: attrs.has('transform'),
      content: (m[2] ?? '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"'),
    });
  }
  return out;
}

/** Estimated bounding box of a text (paper mm): the same width estimate the layout helpers use. */
export function textExtent(t: TextBox): { x0: number; x1: number; y0: number; y1: number } {
  const w = t.content.length * t.size * (t.mono ? 0.6 : t.bold ? 0.56 : 0.52);
  const x0 = t.anchor === 'start' ? t.x : t.anchor === 'middle' ? t.x - w / 2 : t.x - w;
  const h = t.size * 0.9;
  const y0 = t.baseline === 'hanging' ? t.y : t.baseline === 'central' ? t.y - h / 2 : t.y - h * 0.85;
  return { x0, x1: x0 + w, y0, y1: y0 + h };
}
