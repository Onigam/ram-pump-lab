// In-page measurement functions of the QA audit. Each export is serialised by puppeteer (`page.evaluate(fn, arg)`):
// it must be self-contained (no reference to anything outside its own body) and return plain JSON.

/**
 * Layout of the whole frame in the current state: page scroll, controls outside the view or cut by a container,
 * controls covered by another element, overlapping blocks, truncated text, small tap targets, text contrast, hotspots.
 * @param {{ phone: boolean }} opts
 */
export function layoutProbe(opts) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const phone = !!opts.phone;
  const R = (r) => ({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
  const area = (r) => Math.max(0, r.right - r.left) * Math.max(0, r.bottom - r.top);
  const inter = (a, b) => ({
    left: Math.max(a.left, b.left),
    top: Math.max(a.top, b.top),
    right: Math.min(a.right, b.right),
    bottom: Math.min(a.bottom, b.bottom),
  });
  const cs = (el) => getComputedStyle(el);

  const sheetOpen = document.body.classList.contains('sheet-open');
  const panelClosed = document.body.classList.contains('panel-closed');
  const panel = document.querySelector('.panel');
  const panelBody = document.querySelector('.panel__body');
  // on a phone the collapsed bottom sheet keeps only its grip on screen; the rest is off screen by design
  const sheetHidden = phone && !sheetOpen;

  const text = (el) =>
    (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim();
  const describe = (el) => {
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    const t = text(el);
    return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}${t ? ' "' + t.slice(0, 40) + '"' : ''}`;
  };
  const region = (el) => {
    for (const [sel, name] of [
      ['.topbar', 'topbar'],
      ['.rail', 'rail'],
      ['.toolbar', 'toolbar'],
      ['.peek', 'peek'],
      ['.strip', 'strip'],
      ['.panel', 'panel'],
      ['.label-layer', '3d-labels'],
      ['.dv', 'drawing-viewer'],
      ['.panel-toggle', 'panel-toggle'],
    ]) {
      if (el.closest(sel)) return name;
    }
    return 'view';
  };

  /** Painted and reachable: not display none, not hidden, not transparent (self or ancestor), on screen. */
  const shown = (el) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const s = cs(n);
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.05) return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  /** The part of the element that is not cut by an overflow container; `scroll` tells whether the cut can be scrolled. */
  const visibleRect = (el) => {
    let r = el.getBoundingClientRect();
    let cutBy = null;
    let scrollable = false;
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const s = cs(n);
      const ox = s.overflowX;
      const oy = s.overflowY;
      if (ox === 'visible' && oy === 'visible') continue;
      const nr = n.getBoundingClientRect();
      const next = {
        left: ox === 'visible' ? r.left : Math.max(r.left, nr.left),
        right: ox === 'visible' ? r.right : Math.min(r.right, nr.right),
        top: oy === 'visible' ? r.top : Math.max(r.top, nr.top),
        bottom: oy === 'visible' ? r.bottom : Math.min(r.bottom, nr.bottom),
      };
      if (area(next) < area(r) - 1) {
        cutBy = cutBy || n;
        const sx = (ox === 'auto' || ox === 'scroll') && n.scrollWidth > n.clientWidth + 1;
        const sy = (oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 1;
        scrollable = scrollable || sx || sy;
      }
      r = next;
    }
    return { rect: r, cutBy, scrollable };
  };

  const out = {
    viewport: { w: vw, h: vh },
    phone,
    sheetOpen,
    panelClosed,
    pageScroll: {
      docW: document.documentElement.scrollWidth,
      bodyW: document.body.scrollWidth,
      docH: document.documentElement.scrollHeight,
      overW: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - vw,
      overH: document.documentElement.scrollHeight - vh,
    },
    outOfViewport: [],
    cutOff: [],
    scrollHidden: [],
    covered: [],
    overlaps: [],
    truncated: [],
    stickOut: [],
    smallTargets: [],
    smallText: [],
    contrast: [],
    panelOverflow: null,
    hotspots: { count: 0, overlapping: [], outsideView: [], underOverlay: [] },
    counts: { interactive: 0, frameBlocks: 0, textNodes: 0 },
  };

  // ---------------------------------------------------------------- interactive elements
  const interactiveSel =
    'button, a[href], input, select, textarea, summary, [role="tab"], [role="button"], [tabindex]:not([tabindex="-1"])';
  const interactive = [...document.querySelectorAll(interactiveSel)].filter((el) => {
    if (el.disabled || el.getAttribute('aria-hidden') === 'true') return false;
    if (el.closest('.label-layer') && !el.classList.contains('hotspot')) return false;
    if (sheetHidden && el.closest('.panel') && !el.classList.contains('panel__grip')) return false;
    if (panelClosed && !phone && el.closest('.panel')) return false;
    if (cs(el).pointerEvents === 'none') return false;
    return shown(el);
  });
  out.counts.interactive = interactive.length;

  const rectOf = new Map();
  for (const el of interactive) {
    const v = visibleRect(el);
    rectOf.set(el, v);
    if (el.classList.contains('hotspot')) continue; // judged with the other 3D labels below
    const full = el.getBoundingClientRect();
    const label = describe(el);
    const where = region(el);
    // outside the screen (the frame is meant to fit it: nothing scrolls the page)
    const off = area(full) - area(inter(full, { left: 0, top: 0, right: vw, bottom: vh }));
    if (off > 0.2 * area(full) && !(v.cutBy && v.scrollable)) {
      out.outOfViewport.push({
        el: label,
        region: where,
        rect: R(full),
        outsidePct: Math.round((100 * off) / area(full)),
      });
    }
    // cut by an overflow container with no way to scroll to it
    if (v.cutBy && area(v.rect) < 0.6 * area(full)) {
      const item = {
        el: label,
        region: where,
        rect: R(full),
        container: describe(v.cutBy),
        visiblePct: Math.round((100 * Math.max(0, area(v.rect))) / area(full)),
      };
      if (v.scrollable) {
        // reachable by scrolling; but a container whose scrollbar is hidden gives no sign that there is more
        const cs2 = cs(v.cutBy);
        const hiddenBar = cs2.scrollbarWidth === 'none' || v.cutBy.matches('.toolbar, .rail');
        const horizontal = v.cutBy.scrollWidth > v.cutBy.clientWidth + 1;
        const key = describe(v.cutBy).split(' ')[0];
        const g = out.scrollHidden.find((x) => x.container === key);
        if (g) g.labels.length < 12 && g.labels.push(text(el).slice(0, 30));
        else
          out.scrollHidden.push({
            container: key,
            horizontal,
            hiddenBar,
            region: where,
            labels: [text(el).slice(0, 30)],
          });
      } else out.cutOff.push(item);
    }
  }

  // hit test: what is really on top at five points of each control
  const related = (a, b) => {
    if (a === b || a.contains(b) || b.contains(a)) return true;
    const la = a.closest('label');
    return !!la && la === b.closest('label');
  };
  for (const el of interactive) {
    if (el.classList.contains('hotspot')) continue;
    const v = rectOf.get(el);
    const r = v.rect;
    if (area(r) < 4 || v.cutBy) continue;
    // only what is inside the screen can be hit-tested
    const x0 = Math.max(0, r.left);
    const x1 = Math.min(vw - 1, r.right);
    const y0 = Math.max(0, r.top);
    const y1 = Math.min(vh - 1, r.bottom);
    if (x1 <= x0 || y1 <= y0) continue;
    const pts = [
      [(x0 + x1) / 2, (y0 + y1) / 2],
      [x0 + (x1 - x0) * 0.25, y0 + (y1 - y0) * 0.5],
      [x0 + (x1 - x0) * 0.75, y0 + (y1 - y0) * 0.5],
      [(x0 + x1) / 2, y0 + (y1 - y0) * 0.25],
      [(x0 + x1) / 2, y0 + (y1 - y0) * 0.75],
    ];
    let hidden = 0;
    let by = null;
    for (const [x, y] of pts) {
      const hit = document.elementFromPoint(x, y);
      if (!hit || !related(el, hit)) {
        hidden++;
        by = by || hit;
      }
    }
    if (hidden >= 3) {
      out.covered.push({
        el: describe(el),
        region: region(el),
        rect: R(el.getBoundingClientRect()),
        by: by ? describe(by) : 'nothing',
        byRegion: by ? region(by) : '',
        hiddenPoints: hidden,
      });
    }
  }

  // ---------------------------------------------------------------- frame blocks (text and controls of the frame)
  const contentRect = (el) => {
    const hasOwnText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasOwnText && !el.matches('button, a, input, select, summary')) {
      const rg = document.createRange();
      rg.selectNodeContents(el);
      const rr = rg.getBoundingClientRect();
      if (rr.width && rr.height) return rr;
    }
    return el.getBoundingClientRect();
  };
  const blocks = [];
  for (const sel of [
    '.topbar .brand h1',
    '.topbar .brand p',
    '.topbar .scene-switch button',
    '.topbar .progress',
    '.topbar .lang-switch button',
    '.rail .rail__btn',
    '.toolbar .tool',
    '.toolbar .tool--range',
    '.strip .strip__clock > *',
    '.strip .live',
    '.strip .alarm',
    '.panel-toggle',
    '.peek',
    '.panel__grip',
  ]) {
    for (const el of document.querySelectorAll(sel)) {
      if (!shown(el)) continue;
      if (sheetHidden && el.closest('.panel') && !el.classList.contains('panel__grip')) continue;
      const v = visibleRect(el);
      blocks.push({ el, rect: contentRect(el), clip: v.rect, label: describe(el), region: region(el) });
    }
  }
  out.counts.frameBlocks = blocks.length;
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i];
      const b = blocks[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const x = inter(a.rect, b.rect);
      const ia = area(x);
      if (ia < 6) continue;
      const small = Math.min(area(a.rect), area(b.rect));
      if (ia / small < 0.08) continue;
      // a block that the container cuts away is not seen overlapping
      if (area(inter(a.clip, b.clip)) < 6) continue;
      out.overlaps.push({
        a: a.label,
        aRegion: a.region,
        b: b.label,
        bRegion: b.region,
        px: Math.round(ia),
        pctOfSmaller: Math.round((100 * ia) / small),
        rectA: R(a.rect),
        rectB: R(b.rect),
      });
    }
  }

  // ---------------------------------------------------------------- truncated text and text sticking out of its box
  const seen = new Set();
  for (const el of document.querySelectorAll('#app *')) {
    if (el.closest('.label-layer') && !el.classList.contains('hotspot__text')) continue;
    if (el.closest('svg, canvas')) continue;
    if (sheetHidden && el.closest('.panel') && !el.classList.contains('panel__grip')) continue;
    if (panelClosed && !phone && el.closest('.panel')) continue;
    if (!shown(el)) continue;
    const s = cs(el);
    const clipsX = s.overflowX === 'hidden' || s.overflowX === 'clip';
    const clipsY = s.overflowY === 'hidden' || s.overflowY === 'clip';
    const sw = el.scrollWidth - el.clientWidth;
    const sh = el.scrollHeight - el.clientHeight;
    const hasText = (el.textContent || '').trim().length > 0;
    if (!hasText) continue;
    if ((clipsX && sw > 1) || (s.textOverflow === 'ellipsis' && sw > 1) || (clipsY && sh > 1 && s.display !== 'none')) {
      // the elements that are cut: either this one, or its children that leave the box
      const box = el.getBoundingClientRect();
      const cut = [];
      for (const ch of el.children) {
        const r = ch.getBoundingClientRect();
        if (r.width && (r.right > box.right + 1 || r.bottom > box.bottom + 1 || r.left < box.left - 1)) {
          cut.push(text(ch).slice(0, 80));
        }
      }
      // a container that is only a decorative clip (progress bar, loss bar, canvases) has no text to lose
      if (
        el.children.length &&
        !cut.length &&
        !(el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
      )
        continue;
      const key = `${describe(el)}|${sw}|${sh}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.truncated.push({
        el: describe(el),
        region: region(el),
        full: text(el).slice(0, 120),
        cutChildren: cut,
        needPx: el.scrollWidth,
        havePx: el.clientWidth,
        needPy: el.scrollHeight,
        havePy: el.clientHeight,
        ellipsis: s.textOverflow === 'ellipsis',
      });
    } else if (
      sw > 2 &&
      s.overflowX === 'visible' &&
      (s.whiteSpace === 'nowrap' || s.whiteSpace === 'pre') &&
      !el.matches('input, select, textarea, canvas, svg') &&
      [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    ) {
      // nowrap text wider than its box, nothing clips it: it spills over the neighbour
      const key = `${describe(el)}|so|${sw}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.stickOut.push({ el: describe(el), region: region(el), needPx: el.scrollWidth, havePx: el.clientWidth });
    }
  }

  // ---------------------------------------------------------------- the panel
  if (panelBody && shown(panelBody) && !sheetHidden && !(panelClosed && !phone)) {
    const pr = panel.getBoundingClientRect();
    const wide = [];
    for (const el of panelBody.querySelectorAll('*')) {
      if (!shown(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > pr.right + 1 || r.left < pr.left - 1) {
        const v = visibleRect(el);
        // an element cut by a scrolling container (a wide table) is fine
        if (v.cutBy && v.scrollable) continue;
        if (area(v.rect) < 0.9 * area(r) && v.cutBy) continue;
        wide.push({
          el: describe(el),
          overRight: Math.round(r.right - pr.right),
          overLeft: Math.round(pr.left - r.left),
        });
      }
    }
    out.panelOverflow = {
      rect: R(pr),
      bodyScrollW: panelBody.scrollWidth,
      bodyClientW: panelBody.clientWidth,
      bodyScrollH: panelBody.scrollHeight,
      bodyClientH: panelBody.clientHeight,
      hScroll: panelBody.scrollWidth > panelBody.clientWidth + 1,
      vScrollable: panelBody.scrollHeight > panelBody.clientHeight + 1,
      overflowY: cs(panelBody).overflowY,
      wide: wide.slice(0, 8),
    };
  }

  // ---------------------------------------------------------------- small tap targets (phone only)
  if (phone) {
    for (const el of interactive) {
      if (el.matches('a') && cs(el).display === 'inline') continue; // a link inside a sentence
      const v = rectOf.get(el);
      if (v.cutBy && v.rect.right - v.rect.left < 4) continue;
      const r = el.getBoundingClientRect();
      const wpx = Math.round(r.width);
      const hpx = Math.round(r.height);
      if (wpx < 32 || hpx < 32) {
        out.smallTargets.push({ el: describe(el), region: region(el), w: wpx, h: hpx });
      }
    }
  }

  // ---------------------------------------------------------------- contrast of text on its background
  const parse = (str) => {
    let m = str.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
      const p = m[1]
        .split(/[ ,/]+/)
        .filter(Boolean)
        .map(Number);
      return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
    }
    m = str.match(/^color\(srgb ([^)]+)\)$/);
    if (m) {
      const p = m[1].split(/[ /]+/).filter(Boolean).map(Number);
      return [p[0] * 255, p[1] * 255, p[2] * 255, p.length > 3 ? p[3] : 1];
    }
    return [0, 0, 0, 0];
  };
  const over = (top, bottom) => {
    const a = top[3] + bottom[3] * (1 - top[3]);
    if (a === 0) return [0, 0, 0, 0];
    return [0, 1, 2].map((i) => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / a).concat([a]);
  };
  const background = (el) => {
    const layers = [];
    let gradient = false;
    let opaque = false;
    for (let n = el; n && n !== document.documentElement && !opaque; n = n.parentElement) {
      const s = cs(n);
      const c = parse(s.backgroundColor);
      if (c[3] > 0) layers.push(c);
      if (c[3] >= 0.999) opaque = true;
      if (s.backgroundImage !== 'none' && s.backgroundImage.includes('gradient')) gradient = true;
      if (n.tagName === 'CANVAS') return null;
    }
    let base = [243, 236, 223, 1]; // --paper, under everything
    if (!opaque) layers.push(base);
    let c = layers[layers.length - 1];
    for (let i = layers.length - 2; i >= 0; i--) c = over(layers[i], c);
    return { c, gradient };
  };
  const lum = (c) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const groups = new Map();
  const textEls = [...document.querySelectorAll('#app *')].filter(
    (el) =>
      [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) &&
      !el.closest('svg, canvas, script, style') &&
      !(sheetHidden && el.closest('.panel') && !el.classList.contains('panel__grip')) &&
      !(panelClosed && !phone && el.closest('.panel')),
  );
  out.counts.textNodes = textEls.length;
  for (const el of textEls) {
    if (!shown(el)) continue;
    const v = visibleRect(el);
    if (area(v.rect) < 4 && v.cutBy) continue;
    const s = cs(el);
    if (el.closest('button:disabled, [disabled]')) continue; // disabled controls are exempt
    const bgInfo = background(el);
    if (!bgInfo) continue;
    const fg0 = parse(s.color);
    const bg = bgInfo.c;
    const fg = over(fg0, bg);
    const L1 = lum(fg);
    const L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const px = parseFloat(s.fontSize);
    const bold = parseInt(s.fontWeight, 10) >= 700;
    const large = px >= 24 || (px >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    if (px < 11) {
      out.smallText.push({ el: describe(el), region: region(el), px, text: text(el).slice(0, 40) });
    }
    if (ratio < need) {
      const key = `${s.color}|${s.backgroundColor}|${px}|${region(el)}|${typeof el.className === 'string' ? el.className : ''}`;
      const g = groups.get(key) || {
        el: describe(el),
        region: region(el),
        ratio: Math.round(ratio * 100) / 100,
        need,
        px,
        color: s.color,
        bg: `rgb(${bg.slice(0, 3).map(Math.round).join(',')})`,
        count: 0,
        sample: text(el).slice(0, 50),
      };
      g.count++;
      groups.set(key, g);
    }
  }
  out.contrast = [...groups.values()].sort((a, b) => a.ratio - b.ratio).slice(0, 12);
  // identical small texts are listed once
  const smallSeen = new Map();
  for (const s of out.smallText) smallSeen.set(`${s.region}|${s.px}`, (smallSeen.get(`${s.region}|${s.px}`) || 0) + 1);
  out.smallText = [...smallSeen.entries()].map(([k, n]) => ({ key: k, count: n }));

  // ---------------------------------------------------------------- 3D labels (hotspots)
  const viewport = document.getElementById('viewport');
  const vr = viewport ? viewport.getBoundingClientRect() : { left: 0, top: 0, right: vw, bottom: vh };
  const hs = [...document.querySelectorAll('.hotspot')].filter(shown);
  out.hotspots.count = hs.length;
  const overlays = [];
  const addOverlay = (sel, name) => {
    const el = document.querySelector(sel);
    if (!el || !shown(el)) return;
    if (name === 'sheet' && sheetHidden) {
      // the collapsed sheet: only its top strip
      const r = el.getBoundingClientRect();
      overlays.push({
        name: 'sheet-grip',
        rect: { left: r.left, top: r.top, right: r.right, bottom: Math.min(r.bottom, r.top + 34) },
      });
      return;
    }
    overlays.push({ name, rect: el.getBoundingClientRect() });
  };
  addOverlay('.panel', phone ? 'sheet' : 'panel');
  addOverlay('.toolbar', 'toolbar');
  addOverlay('.peek', 'peek');
  addOverlay('.strip', 'strip');
  addOverlay('.topbar', 'topbar');
  addOverlay('.rail', 'rail');
  addOverlay('.panel-toggle', 'panel-toggle');
  const hsRects = hs.map((el) => ({ el, r: el.getBoundingClientRect(), label: text(el) }));
  const onScreen = [];
  for (const h of hsRects) {
    const a = area(h.r);
    const vis = inter(h.r, vr);
    const inside = area(vis);
    const pct = a > 0 ? (100 * inside) / a : 0;
    // a label whose anchor is out of the picture is simply not seen; one cut by the edge loses its words
    if (pct < 5) continue;
    h.vis = vis;
    onScreen.push(h);
    if (pct < 80) {
      out.hotspots.outsideView.push({ label: h.label, rect: R(h.r), insidePct: Math.round(pct) });
    }
    for (const o of overlays) {
      const x = area(inter(vis, o.rect));
      if (x > 0.35 * a) {
        out.hotspots.underOverlay.push({ label: h.label, by: o.name, pct: Math.round((100 * x) / a), rect: R(h.r) });
        break;
      }
    }
  }
  out.hotspots.onScreen = onScreen.length;
  for (let i = 0; i < onScreen.length; i++) {
    for (let j = i + 1; j < onScreen.length; j++) {
      const x = area(inter(onScreen[i].vis, onScreen[j].vis));
      const small = Math.min(area(onScreen[i].vis), area(onScreen[j].vis));
      if (x > 0.15 * small && x > 20) {
        out.hotspots.overlapping.push({
          a: onScreen[i].label,
          b: onScreen[j].label,
          pct: Math.round((100 * x) / small),
        });
      }
    }
  }
  return out;
}

/**
 * Where the subject of the active world lands on screen: union of the projected boxes of the visible parts against the
 * free part of the view (not under the panel, the sheet, the toolbar, the strip).
 * @param {{ phone: boolean, ids?: string[] }} opts  `ids`: look at these parts only (the selected part, the parts of a guide step)
 */
export function subjectProbe(opts) {
  const lab = window.__lab;
  const stage = lab.stage;
  const mod = stage.active;
  const reg = mod.registry;
  const canvas = stage.renderer.domElement;
  const cr = canvas.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const sheetOpen = document.body.classList.contains('sheet-open');
  const rects = [];
  const add = (sel, name, clipTop) => {
    const el = document.querySelector(sel);
    if (!el) return;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.05) return;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    rects.push({ name, x0: r.left, y0: clipTop ? Math.max(r.top, clipTop) : r.top, x1: r.right, y1: r.bottom });
  };
  if (opts.phone) {
    const p = document.querySelector('.panel');
    const r = p.getBoundingClientRect();
    // open sheet: the whole sheet; collapsed: its grip (34 px) only
    rects.push({
      name: sheetOpen ? 'sheet' : 'sheet-grip',
      x0: r.left,
      y0: r.top,
      x1: r.right,
      y1: sheetOpen ? r.bottom : r.top + 34,
    });
  } else if (!document.body.classList.contains('panel-closed')) add('.panel', 'panel');
  add('.toolbar', 'toolbar');
  add('.peek', 'peek');
  const bodyClass = document.body.classList;
  const hidden = bodyClass.contains('panel-wide') && !bodyClass.contains('panel-closed');
  // the part of the canvas nobody covers
  const free = { x0: cr.left, y0: cr.top, x1: cr.right, y1: cr.bottom };
  for (const o of rects) {
    if (o.name === 'toolbar' || o.name === 'peek') continue;
    if (opts.phone) free.y1 = Math.min(free.y1, o.y0);
    else free.x1 = Math.min(free.x1, o.x0);
  }
  const v = stage.camera.position.clone();
  const projectBox = (box) => {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    let behind = false;
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) {
          v.set(x, y, z).project(stage.camera);
          if (v.z > 1) behind = true;
          const sx = cr.left + ((v.x + 1) / 2) * cr.width;
          const sy = cr.top + ((1 - v.y) / 2) * cr.height;
          x0 = Math.min(x0, sx);
          y0 = Math.min(y0, sy);
          x1 = Math.max(x1, sx);
          y1 = Math.max(y1, sy);
        }
      }
    }
    return { x0, y0, x1, y1, behind };
  };
  const parts = [];
  let u = null;
  for (const p of reg.parts.values()) {
    if (p.display === 'hidden') continue;
    if (opts.ids && !opts.ids.includes(p.id)) continue;
    const box = reg.bounds(p.id);
    if (box.isEmpty()) continue;
    const b = projectBox(box);
    parts.push({ id: p.id, display: p.display, ...b });
    if (!b.behind) {
      u = u
        ? { x0: Math.min(u.x0, b.x0), y0: Math.min(u.y0, b.y0), x1: Math.max(u.x1, b.x1), y1: Math.max(u.y1, b.y1) }
        : { ...b };
    }
  }
  const A = (r) => Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0);
  const I = (a, b) => ({
    x0: Math.max(a.x0, b.x0),
    y0: Math.max(a.y0, b.y0),
    x1: Math.min(a.x1, b.x1),
    y1: Math.min(a.y1, b.y1),
  });
  const canvasRect = { x0: cr.left, y0: cr.top, x1: cr.right, y1: cr.bottom };
  const res = {
    world: mod.id,
    canvas: { w: Math.round(cr.width), h: Math.round(cr.height), x: Math.round(cr.left), y: Math.round(cr.top) },
    free: { x0: Math.round(free.x0), y0: Math.round(free.y0), x1: Math.round(free.x1), y1: Math.round(free.y1) },
    overlays: rects.map((r) => ({
      name: r.name,
      x0: Math.round(r.x0),
      y0: Math.round(r.y0),
      x1: Math.round(r.x1),
      y1: Math.round(r.y1),
    })),
    partsVisible: parts.length,
    viewHiddenByWideReading: hidden,
    union: null,
    outsideCanvasPct: 0,
    outsideFreePct: 0,
    underSheetPct: 0,
    underToolbarPct: 0,
    centerInFree: null,
    sizePct: 0,
    partsOutsideFree: [],
    explodeUi: lab.store.state.explode,
    fov: stage.camera.fov,
    aspect: Math.round(stage.camera.aspect * 100) / 100,
    camDist: Math.round(stage.camera.position.distanceTo(stage.controls.target) * 1000) / 1000,
  };
  if (u) {
    const ua = A(u);
    res.union = { x0: Math.round(u.x0), y0: Math.round(u.y0), x1: Math.round(u.x1), y1: Math.round(u.y1) };
    if (ua > 0) {
      res.outsideCanvasPct = Math.round(100 * (1 - A(I(u, canvasRect)) / ua));
      res.outsideFreePct = Math.round(100 * (1 - A(I(u, free)) / ua));
      for (const o of rects) {
        const pct = Math.round((100 * A(I(u, o))) / ua);
        if (o.name === 'toolbar') res.underToolbarPct = pct;
        else if (o.name !== 'peek') res.underSheetPct = Math.max(res.underSheetPct, pct);
      }
      const cx = (u.x0 + u.x1) / 2;
      const cy = (u.y0 + u.y1) / 2;
      res.centerInFree = cx >= free.x0 && cx <= free.x1 && cy >= free.y0 && cy <= free.y1;
      res.sizePct = Math.round((100 * ua) / Math.max(1, A(free)));
    }
    for (const p of parts) {
      const cx = (p.x0 + p.x1) / 2;
      const cy = (p.y0 + p.y1) / 2;
      if (cx < free.x0 || cx > free.x1 || cy < free.y0 || cy > free.y1) res.partsOutsideFree.push(p.id);
    }
  }
  return res;
}

/**
 * Render cost of the active world over `frames` frames: calls and triangles per frame including every post-processing pass
 * (autoReset is switched off while counting), plus geometry/texture/program counts and the draw state of the scene graph.
 * @param {{ frames: number }} opts
 */
export async function renderStats(opts) {
  const { stage } = window.__lab;
  const r = stage.renderer;
  const info = r.info;
  const before = { auto: info.autoReset };
  info.autoReset = false;
  // an app frame = one call of stage.render (the composer then calls renderer.render once per pass)
  const origRender = stage.render;
  let appFrames = 0;
  stage.render = function (...a) {
    appFrames++;
    return origRender.apply(this, a);
  };
  info.reset();
  const f0 = info.render.frame;
  const t0 = performance.now();
  await new Promise((resolve) => {
    let n = 0;
    const tick = () => {
      if (++n >= opts.frames) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const ms = performance.now() - t0;
  stage.render = origRender;
  const frames = Math.max(1, appFrames);
  const res = {
    frames,
    rendererPassesPerFrame: Math.round(((info.render.frame - f0) / frames) * 10) / 10,
    callsPerFrame: Math.round(info.render.calls / frames),
    trianglesPerFrame: Math.round(info.render.triangles / frames),
    pointsPerFrame: Math.round(info.render.points / frames),
    linesPerFrame: Math.round(info.render.lines / frames),
    msPerFrame: Math.round(ms / frames),
    geometries: info.memory.geometries,
    textures: info.memory.textures,
    programs: info.programs ? info.programs.length : 0,
  };
  info.autoReset = before.auto;
  // static weight of the scene graph
  const scene = stage.active.scene;
  let meshes = 0;
  let instanced = 0;
  let tris = 0;
  let lights = 0;
  let shadowCasters = 0;
  let transparent = 0;
  let sprites = 0;
  const geos = new Set();
  const mats = new Set();
  scene.traverse((o) => {
    if (o.isLight) lights++;
    if (o.isMesh || o.isInstancedMesh) {
      meshes++;
      if (o.castShadow) shadowCasters++;
      const g = o.geometry;
      if (g) {
        geos.add(g);
        const idx = g.index ? g.index.count : g.attributes.position ? g.attributes.position.count : 0;
        const n = o.isInstancedMesh ? o.count : 1;
        if (o.isInstancedMesh) instanced++;
        tris += (idx / 3) * n;
      }
      const m = Array.isArray(o.material) ? o.material : [o.material];
      for (const mm of m) {
        if (mm) {
          mats.add(mm);
          if (mm.transparent) transparent++;
        }
      }
    }
    if (o.isSprite) sprites++;
  });
  res.scene = {
    meshes,
    instancedMeshes: instanced,
    sceneTriangles: Math.round(tris),
    uniqueGeometries: geos.size,
    uniqueMaterials: mats.size,
    lights,
    shadowCasters,
    transparentMaterialUses: transparent,
    sprites,
  };
  return res;
}

/**
 * Is the world drawn? Renders one frame now and reads the 3D canvas back (the drawing buffer is valid inside the task
 * that rendered it), without the DOM on top: mean luminance, spread, share of pixels that are not the background.
 */
export function canvasHealth() {
  const { stage } = window.__lab;
  stage.render(0);
  const c = stage.renderer.domElement;
  const w = 160;
  const h = Math.max(1, Math.round((w * c.height) / c.width));
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(c, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const hist = new Map();
  let sum = 0;
  let sum2 = 0;
  const n = w * h;
  const luma = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = d[i * 4];
    const g = d[i * 4 + 1];
    const b = d[i * 4 + 2];
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    luma[i] = l;
    sum += l;
    sum2 += l * l;
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    hist.set(key, (hist.get(key) || 0) + 1);
  }
  const mean = sum / n;
  const sd = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
  let best = 0;
  let bestKey = 0;
  for (const [k, v] of hist) {
    if (v > best) {
      best = v;
      bestKey = k;
    }
  }
  const br = ((bestKey >> 10) & 31) << 3;
  const bg = ((bestKey >> 5) & 31) << 3;
  const bb = (bestKey & 31) << 3;
  let differ = 0;
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  let opaque = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] > 8) opaque++;
      if (Math.abs(d[i] - br) + Math.abs(d[i + 1] - bg) + Math.abs(d[i + 2] - bb) > 48) {
        differ++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const border = (test) => {
    let k = 0;
    let m = 0;
    for (let t = 0; t < Math.max(w, h); t++) {
      for (const [x, y] of test(t)) {
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        m++;
        const i = (y * w + x) * 4;
        if (Math.abs(d[i] - br) + Math.abs(d[i + 1] - bg) + Math.abs(d[i + 2] - bb) > 48) k++;
      }
    }
    return m ? Math.round((100 * k) / m) : 0;
  };
  return {
    meanLuma: Math.round(mean),
    spread: Math.round(sd),
    dominantPct: Math.round((100 * best) / n),
    distinctColours: hist.size,
    nonBackgroundPct: Math.round((100 * differ) / n),
    opaquePct: Math.round((100 * opaque) / n),
    bbox: differ ? { x0: x0 / w, y0: y0 / h, x1: (x1 + 1) / w, y1: (y1 + 1) / h } : null,
    touches: {
      left: border((t) => [[0, t]]),
      right: border((t) => [[w - 1, t]]),
      top: border((t) => [[t, 0]]),
      bottom: border((t) => [[t, h - 1]]),
    },
  };
}

/** The real boxes of the texts of the sheet on screen: overlaps, texts that leave the sheet, smallest text. */
export function drawingProbe() {
  const dv = document.querySelector('.dv');
  const svg = dv && dv.querySelector('svg.dv__svg');
  if (!svg || getComputedStyle(dv).display === 'none') return null;
  const sr = svg.getBoundingClientRect();
  const pxPerMm = sr.width / 420;
  const items = [];
  for (const t of svg.querySelectorAll('text')) {
    const s = (t.textContent || '').trim();
    if (!s) continue;
    const r = t.getBoundingClientRect();
    if (r.width < 0.5 || r.height < 0.5) continue;
    items.push({ s, r, el: t });
  }
  const out = {
    sheetRect: { x: Math.round(sr.left), y: Math.round(sr.top), w: Math.round(sr.width), h: Math.round(sr.height) },
    pxPerMm: Math.round(pxPerMm * 1000) / 1000,
    texts: items.length,
    outside: [],
    overlaps: [],
    smallest: null,
    paperFrame: null,
  };
  // the frame of the sheet: the largest rect of the svg
  let frame = null;
  for (const r of svg.querySelectorAll('rect')) {
    const b = r.getBoundingClientRect();
    if (!frame || b.width * b.height > frame.width * frame.height) frame = b;
  }
  const limit = frame || sr;
  out.paperFrame = frame ? { w: Math.round(frame.width), h: Math.round(frame.height) } : null;
  let min = Infinity;
  let minText = '';
  for (const { s, r } of items) {
    if (r.left < limit.left - 1 || r.right > limit.right + 1 || r.top < limit.top - 1 || r.bottom > limit.bottom + 1) {
      out.outside.push({
        text: s.slice(0, 50),
        overRight: Math.round(r.right - limit.right),
        overBottom: Math.round(r.bottom - limit.bottom),
      });
    }
    if (r.height < min && s.length > 1) {
      min = r.height;
      minText = s.slice(0, 30);
    }
  }
  if (items.length)
    out.smallest = {
      heightMm: Math.round((min / pxPerMm) * 100) / 100,
      heightPx: Math.round(min * 10) / 10,
      text: minText,
    };
  // overlaps of the inked part of the boxes (a line box is taller than the glyphs: shrink by 18% above and below)
  const boxes = items.map(({ s, r }) => ({
    s,
    l: r.left,
    r: r.right,
    t: r.top + r.height * 0.18,
    b: r.bottom - r.height * 0.18,
  }));
  boxes.sort((a, b) => a.l - b.l);
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (boxes[j].l >= boxes[i].r) break;
      const x = Math.min(boxes[i].r, boxes[j].r) - Math.max(boxes[i].l, boxes[j].l);
      const y = Math.min(boxes[i].b, boxes[j].b) - Math.max(boxes[i].t, boxes[j].t);
      if (x <= 0 || y <= 0) continue;
      const a = x * y;
      const small = Math.min(
        (boxes[i].r - boxes[i].l) * (boxes[i].b - boxes[i].t),
        (boxes[j].r - boxes[j].l) * (boxes[j].b - boxes[j].t),
      );
      if (a > 0.2 * small && a > 0.6 * pxPerMm * pxPerMm) {
        out.overlaps.push({
          a: boxes[i].s.slice(0, 40),
          b: boxes[j].s.slice(0, 40),
          pctOfSmaller: Math.round((100 * a) / small),
        });
      }
    }
  }
  out.overlaps = out.overlaps.slice(0, 20);
  out.outside = out.outside.slice(0, 20);
  // how much of the sheet the open bottom sheet hides (phone)
  const panel = document.querySelector('.panel');
  const pr = panel.getBoundingClientRect();
  const vis = getComputedStyle(panel).display !== 'none';
  const ix = Math.max(0, Math.min(sr.right, pr.right) - Math.max(sr.left, pr.left));
  const iy = Math.max(0, Math.min(sr.bottom, pr.bottom) - Math.max(sr.top, pr.top));
  out.hiddenByPanelPct = vis ? Math.round((100 * ix * iy) / Math.max(1, sr.width * sr.height)) : 0;
  return out;
}

/** The store and the DOM of the shell, with the invariants that must hold in every state. */
export function stateProbe() {
  const lab = window.__lab;
  const s = lab.store.state;
  const stage = lab.stage;
  const reg = stage.active.registry;
  const display = { solid: 0, ghost: 0, wire: 0, hidden: 0 };
  let maxFactor = 0;
  for (const p of reg.parts.values()) {
    display[p.display] = (display[p.display] || 0) + 1;
    maxFactor = Math.max(maxFactor, p.factor || 0);
  }
  const activeScene = document.querySelector('.scene-switch button.is-active');
  const activeRail = document.querySelector('.rail__btn.is-active');
  const rail = [...document.querySelectorAll('.rail__btn')];
  const modes = ['explore', 'assembly', 'install', 'sim', 'plans', 'lessons', 'parts', 'about'];
  const body = document.querySelector('.panel__body');
  const bad = [];
  if (stage.active.id !== s.scene) bad.push(`stage shows "${stage.active.id}" but the store says "${s.scene}"`);
  const scenes = [...document.querySelectorAll('.scene-switch button')];
  if (activeScene && scenes.indexOf(activeScene) !== ['site', 'catchment', 'ram', 'valve'].indexOf(s.scene)) {
    bad.push('the scene switch highlights another world than the store');
  }
  if (activeRail && rail.length === modes.length && modes[rail.indexOf(activeRail)] !== s.mode) {
    bad.push(`the rail highlights "${modes[rail.indexOf(activeRail)]}" but the mode is "${s.mode}"`);
  }
  if (s.mode !== 'plans' && body && !body.children.length) bad.push('the side panel is empty');
  return {
    ui: { ...s },
    active: stage.active.id,
    lang: document.documentElement.lang,
    title: document.title,
    display,
    maxFactor: Math.round(maxFactor * 100) / 100,
    fly: !!stage.fly,
    panelChildren: body ? body.children.length : 0,
    bodyClasses: document.body.className,
    invariants: bad,
  };
}

/** Visible texts of the frame and of the side panel, for the language parity scan. */
export function visibleTexts() {
  const out = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('#app *')) {
    if (el.closest('svg, canvas, script, style')) continue;
    const own = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!own || own.length < 4) continue;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (el.closest('.panel') && document.body.classList.contains('panel-closed')) continue;
    if (seen.has(own)) continue;
    seen.add(own);
    out.push(own);
  }
  return out;
}

/**
 * Numerical check of the assembled model: which visible parts touch no other part (their boxes, grown by `tol` metres,
 * meet nothing), and the size of the whole subject. Called at explode 0.
 * @param {{ tol: number }} opts
 */
export function floatingProbe(opts) {
  const { stage } = window.__lab;
  const reg = stage.active.registry;
  const items = [];
  for (const p of reg.parts.values()) {
    if (p.display === 'hidden') continue;
    const b = reg.bounds(p.id);
    if (b.isEmpty()) continue;
    items.push({ id: p.id, b });
  }
  const touch = (a, b) =>
    a.min.x <= b.max.x + opts.tol &&
    a.max.x >= b.min.x - opts.tol &&
    a.min.y <= b.max.y + opts.tol &&
    a.max.y >= b.min.y - opts.tol &&
    a.min.z <= b.max.z + opts.tol &&
    a.max.z >= b.min.z - opts.tol;
  // connected components of the touch graph
  const parent = items.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const degree = items.map(() => 0);
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (touch(items[i].b, items[j].b)) {
        parent[find(i)] = find(j);
        degree[i]++;
        degree[j]++;
      }
    }
  }
  const comps = new Map();
  items.forEach((it, i) => {
    const k = find(i);
    if (!comps.has(k)) comps.set(k, []);
    comps.get(k).push(it.id);
  });
  const sizeOf = (ids) => {
    const box = reg.bounds(ids[0]).clone();
    for (const id of ids) box.union(reg.bounds(id));
    const v = box.max.clone().sub(box.min);
    return { x: +v.x.toFixed(3), y: +v.y.toFixed(3), z: +v.z.toFixed(3) };
  };
  const all = items.map((i) => i.id);
  return {
    world: stage.active.id,
    parts: items.length,
    components: [...comps.values()].map((ids) => ({ ids, size: ids.length })),
    isolated: items.filter((_, i) => degree[i] === 0).map((i) => i.id),
    size: all.length ? sizeOf(all) : null,
    boxes: Object.fromEntries(
      items.map((it) => {
        const v = it.b.max.clone().sub(it.b.min);
        return [
          it.id,
          {
            min: [it.b.min.x, it.b.min.y, it.b.min.z].map((n) => +n.toFixed(4)),
            size: [v.x, v.y, v.z].map((n) => +n.toFixed(4)),
          },
        ];
      }),
    ),
  };
}
