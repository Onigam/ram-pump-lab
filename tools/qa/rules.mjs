// What counts as a defect: turns the raw probes of one state into findings (severity, cause key, kit or lab).
// Severity rules: blocker = something a visitor cannot get past (error, unreachable control, empty world, page scroll);
// major = visibly wrong or hard to use; minor = polish. A cause seen at many places is one finding.

const cls = (el) => el.replace(/ ".*$/, '');

/** Where the frame itself is at fault (the kit's CSS), not the lab's content. */
const KIT_REGIONS = new Set([
  'topbar',
  'rail',
  'toolbar',
  'strip',
  'panel',
  'peek',
  'panel-toggle',
  '3d-labels',
  'drawing-viewer',
]);

export function analyzeLayout(F, w, L, shot) {
  const at = w.at;
  if (L.pageScroll.overW > 1) {
    F.add({
      sev: 'blocker',
      key: 'page-hscroll',
      cat: 'layout',
      title: 'The page is wider than the screen (horizontal overflow of the document)',
      where: at,
      detail: L.pageScroll,
      shot,
      source: 'kit',
    });
  }
  if (L.pageScroll.overH > 1) {
    F.add({
      sev: 'major',
      key: 'page-vscroll',
      cat: 'layout',
      title: 'The page is taller than the screen',
      where: at,
      detail: L.pageScroll,
      shot,
      source: 'kit',
    });
  }
  for (const o of L.outOfViewport) {
    F.add({
      sev: o.outsidePct >= 90 ? 'blocker' : 'major',
      key: `ctl-offscreen:${o.region}:${cls(o.el)}`,
      cat: 'layout',
      title: `Control outside the screen: ${cls(o.el)} (${o.region})`,
      where: at,
      detail: o,
      shot,
      source: KIT_REGIONS.has(o.region) ? 'kit' : 'lab',
    });
  }
  for (const o of L.cutOff) {
    F.add({
      sev: o.visiblePct < 20 ? 'blocker' : 'major',
      key: `ctl-cut:${o.region}:${cls(o.el)}:${cls(o.container)}`,
      cat: 'layout',
      title: `Control cut by its container with no way to scroll: ${cls(o.el)} in ${cls(o.container)}`,
      where: at,
      detail: o,
      shot,
      source: KIT_REGIONS.has(o.region) ? 'kit' : 'lab',
    });
  }
  for (const g of L.scrollHidden) {
    if (!g.hiddenBar || !g.horizontal) continue;
    F.add({
      sev: 'major',
      key: `scroll-hidden:${g.container}`,
      cat: 'layout',
      title: `Controls reachable only by a swipe with no scrollbar and no hint: ${g.container} (${g.labels.length} out of sight)`,
      where: at,
      detail: g,
      shot,
      source: 'kit',
    });
  }
  for (const o of L.covered) {
    const underSheet = o.byRegion === 'panel' && w.phone;
    const underViewer = o.byRegion === 'drawing-viewer';
    F.add({
      sev: o.hiddenPoints >= 5 && !underSheet && !underViewer ? 'blocker' : 'major',
      key: `ctl-covered:${o.region}>${o.byRegion}${w.phone ? ':phone' : ''}`,
      cat: 'layout',
      title: `Controls hidden behind another element: the ${o.region} under the ${o.byRegion || 'page'}${w.phone ? ' (phone)' : ''}`,
      where: at,
      detail: o,
      agg: cls(o.el),
      shot,
      source: KIT_REGIONS.has(o.region) ? 'kit' : 'lab',
    });
  }
  for (const o of L.overlaps) {
    const a = cls(o.a);
    const b = cls(o.b);
    const [x, y] = [a, b].sort();
    F.add({
      sev: o.pctOfSmaller >= 30 ? 'major' : 'minor',
      key: `overlap:${o.aRegion}/${o.bRegion}:${x}|${y}`,
      cat: 'layout',
      title: `Overlap: ${a} (${o.aRegion}) and ${b} (${o.bRegion})`,
      where: at,
      detail: o,
      shot,
      source: 'kit',
    });
  }
  for (const o of L.truncated) {
    const strip = o.region === 'strip';
    F.add({
      sev: strip && o.cutChildren.length ? 'major' : 'minor',
      key: `truncated:${o.region}:${cls(o.el)}`,
      cat: 'layout',
      title: `Text cut off: ${cls(o.el)} (${o.region})`,
      where: at,
      detail: o,
      shot,
      source: KIT_REGIONS.has(o.region) ? 'kit' : 'lab',
    });
  }
  for (const o of L.stickOut) {
    F.add({
      sev: 'major',
      key: `stickout:${o.region}:${cls(o.el)}`,
      cat: 'layout',
      title: `Text wider than its box and not clipped: ${cls(o.el)} (${o.region})`,
      where: at,
      detail: o,
      shot,
      source: KIT_REGIONS.has(o.region) ? 'kit' : 'lab',
    });
  }
  if (L.panelOverflow) {
    const p = L.panelOverflow;
    if (p.hScroll || p.wide.length) {
      F.add({
        sev: p.bodyScrollW - p.bodyClientW > 6 || p.wide.length ? 'major' : 'minor',
        key: 'panel-overflow-x',
        cat: 'layout',
        title: 'Content wider than the side panel',
        where: at,
        detail: p,
        shot,
        source: 'lab',
      });
    }
  }
  for (const o of L.smallTargets) {
    F.add({
      sev: 'minor',
      key: `tap-small:${o.region}`,
      cat: 'touch',
      title: `Tap targets under 32 px on a phone in the ${o.region}`,
      where: at,
      detail: o,
      agg: `${cls(o.el)} ${o.w}x${o.h}`,
      shot,
      source: KIT_REGIONS.has(o.region) ? 'kit' : 'lab',
    });
  }
  for (const c of L.contrast) {
    F.add({
      sev: c.ratio < 3 && c.px >= 12 ? 'major' : 'minor',
      key: `contrast:${c.color}`,
      cat: 'a11y',
      title: `Text colour ${c.color} is under the contrast minimum (${c.ratio}:1 on ${c.bg}, ${c.need}:1 needed)`,
      where: at,
      detail: c,
      shot,
      source: 'kit',
    });
  }
  const hs = L.hotspots;
  for (const o of hs.overlapping) {
    F.add({
      sev: o.pct >= 50 ? 'major' : 'minor',
      key: `hotspot-overlap${w.phone ? ':phone' : ''}`,
      cat: '3d-labels',
      title: 'Two 3D labels overlap',
      where: at,
      detail: o,
      agg: `${at.split('/')[0]} ${w.world}: ${o.a} × ${o.b}`,
      shot,
      source: 'lab',
    });
  }
  for (const o of hs.outsideView) {
    F.add({
      sev: w.phone ? 'major' : 'minor',
      key: `hotspot-outside${w.phone ? ':phone' : ''}`,
      cat: '3d-labels',
      title: '3D label cut by the edge of the view',
      where: at,
      detail: o,
      agg: `${at.split('/')[0]} ${w.world}: ${o.label} (${o.insidePct} % inside)`,
      shot,
      source: 'lab',
    });
  }
  for (const o of hs.underOverlay) {
    F.add({
      sev: 'minor',
      key: `hotspot-under:${o.by}`,
      cat: '3d-labels',
      title: `3D label hidden under the ${o.by}`,
      where: at,
      detail: o,
      agg: `${at.split('/')[0]} ${w.world}: ${o.label}`,
      shot,
      source: o.by === 'sheet' ? 'kit' : 'lab',
      ref: o.by === 'sheet' ? 'kit request 7' : undefined,
    });
  }
}

/** The subject of the 3D view against the free part of the view. */
export function analyzeSubject(F, w, S, shot) {
  if (!S || !S.union) return;
  const at = w.at;
  // a selected part or the parts of a guide step: where did the camera put them?
  if (w.kind === 'part' || w.kind === 'step') {
    if (S.outsideFreePct >= 30) {
      const behindSheet = w.phone && S.underSheetPct >= 30;
      F.add({
        sev: 'major',
        key: `framing:${w.kind}:${behindSheet ? 'behind-sheet' : 'outside'}`,
        cat: '3d-view',
        title: behindSheet
          ? `The ${w.kind === 'step' ? 'parts of the guide step' : 'selected part'} end up behind the open bottom sheet`
          : `The camera leaves ${w.kind === 'step' ? 'the parts of the guide step' : 'the selected part'} partly outside the free view`,
        where: at,
        detail: { outsideFreePct: S.outsideFreePct, underSheetPct: S.underSheetPct, union: S.union, free: S.free },
        shot,
        source: 'kit',
        ref: behindSheet ? 'kit request 7' : undefined,
      });
    }
    return;
  }
  // a landscape is framed by its authored pose: only the sheet matters there
  const landscape = S.world === 'site';
  if (!landscape && S.outsideCanvasPct >= 8) {
    F.add({
      sev: S.outsideCanvasPct >= 25 ? 'major' : 'minor',
      key: `subject-cropped:${w.exploded ? 'exploded' : 'home'}`,
      cat: '3d-view',
      title: w.exploded ? 'The exploded subject leaves the view' : 'The subject is cropped by the edge of the view',
      where: at,
      detail: { outsideCanvasPct: S.outsideCanvasPct, union: S.union, canvas: S.canvas },
      shot,
      source: 'kit',
      ref: w.exploded ? 'kit request 6, 9' : undefined,
    });
  }
  if (w.phone && S.underSheetPct >= 30) {
    F.add({
      sev: S.underSheetPct >= 60 ? 'major' : 'minor',
      key: `subject-behind-sheet:${landscape ? 'site' : 'device'}`,
      cat: '3d-view',
      title: 'The subject sits behind the open bottom sheet',
      where: at,
      detail: { underSheetPct: S.underSheetPct, partsOutsideFree: S.partsOutsideFree.length, free: S.free },
      shot,
      source: 'kit',
      ref: 'kit request 7',
    });
  }
  if (!landscape && S.sizePct < 14 && S.partsVisible > 1) {
    F.add({
      sev: 'minor',
      key: 'subject-tiny',
      cat: '3d-view',
      title: 'The subject fills less than 14 % of the free view',
      where: at,
      detail: { sizePct: S.sizePct, union: S.union },
      shot,
      source: 'kit',
    });
  }
  if (!w.phone && S.underToolbarPct >= 10 && !landscape) {
    F.add({
      sev: 'minor',
      key: 'subject-under-toolbar',
      cat: '3d-view',
      title: 'The toolbar covers a tenth or more of the subject',
      where: at,
      detail: { underToolbarPct: S.underToolbarPct },
      shot,
      source: 'kit',
    });
  }
}

export function analyzeCanvas(F, w, C, shot) {
  if (!C) return;
  const at = w.at;
  // close-ups (a part framed in a forest) are legitimately dark or flat: the whole-view states decide
  if (w.kind !== 'device') return;
  if (C.spread < 6 || C.distinctColours < 12) {
    F.add({
      sev: 'blocker',
      key: `world-empty:${w.world}`,
      cat: '3d-view',
      title: `The ${w.world} world is drawn empty (flat colour)`,
      where: at,
      detail: C,
      shot,
      source: 'lab',
    });
  } else if (C.meanLuma < 50) {
    F.add({
      sev: 'blocker',
      key: `world-dark:${w.world}`,
      cat: '3d-view',
      title: `The ${w.world} world is drawn dark (mean luminance ${C.meanLuma})`,
      where: at,
      detail: C,
      shot,
      source: 'lab',
    });
  } else if (C.nonBackgroundPct < 1.5 && w.world !== 'site') {
    F.add({
      sev: 'major',
      key: `world-almost-empty:${w.world}`,
      cat: '3d-view',
      title: `Almost nothing is drawn in the ${w.world} world`,
      where: at,
      detail: C,
      shot,
      source: 'lab',
    });
  }
}

export function analyzeDrawing(F, w, D, shot) {
  if (!D) return;
  const at = w.at;
  if (D.overlaps.length) {
    const worst = Math.max(...D.overlaps.map((o) => o.pctOfSmaller));
    F.add({
      sev: worst >= 60 || D.overlaps.length > 3 ? 'major' : 'minor',
      key: `drawing-text-overlap:${w.sheet}`,
      cat: 'drawings',
      title: `Texts overlap on sheet ${w.sheet} (rendered boxes, real fonts)`,
      where: at,
      detail: { n: D.overlaps.length, first: D.overlaps.slice(0, 4) },
      shot,
      source: 'lab',
    });
  }
  if (D.outside.length) {
    F.add({
      sev: 'major',
      key: `drawing-text-outside:${w.sheet}`,
      cat: 'drawings',
      title: `Texts leave the frame of sheet ${w.sheet}`,
      where: at,
      detail: { n: D.outside.length, first: D.outside.slice(0, 4) },
      shot,
      source: 'lab',
    });
  }
  if (D.smallest && D.smallest.heightMm < 1.6) {
    F.add({
      sev: 'minor',
      key: `drawing-small-text:${w.sheet}`,
      cat: 'drawings',
      title: `Text under 1.6 mm high on sheet ${w.sheet} (smallest ${D.smallest.heightMm} mm)`,
      where: at,
      detail: D.smallest,
      shot,
      source: 'lab',
    });
  }
  if (w.phone && D.hiddenByPanelPct >= 25) {
    F.add({
      sev: 'major',
      key: 'drawing-behind-sheet',
      cat: 'drawings',
      title: 'The open bottom sheet hides a quarter or more of the drawing',
      where: at,
      detail: { hiddenByPanelPct: D.hiddenByPanelPct, sheet: D.sheetRect },
      shot,
      source: 'kit',
    });
  }
  if (w.phone) {
    F.add({
      sev: 'minor',
      key: 'drawing-fit-unreadable-phone',
      cat: 'drawings',
      title: 'At "fit to screen" on a phone the sheet text is about 1.5 px high: it needs zoom to be read',
      where: at,
      detail: { pxPerMm: D.pxPerMm, smallestPx: D.smallest && D.smallest.heightPx },
      shot,
      source: 'kit',
    });
  }
}

export function analyzeState(F, w, st, shot) {
  for (const msg of st.invariants) {
    F.add({
      sev: 'major',
      key: `invariant:${msg.replace(/"[^"]*"/g, '"…"')}`,
      cat: 'state',
      title: `Shell inconsistent: ${msg.replace(/"[^"]*"/g, '"…"')}`,
      where: w.at,
      detail: msg,
      shot,
      source: 'kit',
    });
  }
}
