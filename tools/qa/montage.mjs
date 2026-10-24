#!/usr/bin/env node
// Contact sheet of screenshots, to review many states at a glance (Chrome draws it: no image library needed).
//
//   node tools/qa/montage.mjs --dir <out>/shots/390x844-fr --match 'explore|sim' --cols 4 --cell 300 --to montage.png
//   node tools/qa/montage.mjs --cols 3 --to m.png a.jpg b.jpg c.jpg
import fs from 'node:fs';
import path from 'node:path';
import { launch, loadDeps } from './drive.mjs';

const args = process.argv.slice(2);
const opt = { cols: 4, cell: 300, to: 'montage.png', dir: null, match: null, files: [] };
for (let i = 0; i < args.length; i++) {
  const k = args[i];
  if (k === '--cols') opt.cols = Number(args[++i]);
  else if (k === '--cell') opt.cell = Number(args[++i]);
  else if (k === '--to') opt.to = args[++i];
  else if (k === '--dir') opt.dir = args[++i];
  else if (k === '--match') opt.match = new RegExp(args[++i], 'i');
  else opt.files.push(args[i]);
}
let files = opt.files;
if (opt.dir) {
  files = fs
    .readdirSync(opt.dir)
    .filter((f) => /\.(png|jpe?g)$/i.test(f) && (!opt.match || opt.match.test(f)))
    .sort()
    .map((f) => path.join(opt.dir, f));
}
if (!files.length) {
  console.error('no files');
  process.exit(1);
}
const b64 = (f) => `data:image/${/\.png$/i.test(f) ? 'png' : 'jpeg'};base64,${fs.readFileSync(f).toString('base64')}`;
const cells = files
  .map((f) => `<figure><img src="${b64(f)}"><figcaption>${path.basename(f)}</figcaption></figure>`)
  .join('');
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#222;font:11px monospace;color:#eee}
main{display:grid;grid-template-columns:repeat(${opt.cols},${opt.cell}px);gap:6px;padding:6px}
figure{margin:0}img{width:${opt.cell}px;display:block;background:#fff}figcaption{padding:2px 0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
</style><main>${cells}</main>`;
const { puppeteer } = await loadDeps();
const browser = await launch(puppeteer);
const page = await browser.newPage();
await page.setViewport({ width: opt.cols * (opt.cell + 6) + 6, height: 600 });
await page.setContent(html, { waitUntil: 'load' });
await page.screenshot({ path: opt.to, fullPage: true });
await browser.close();
console.log(`${files.length} images -> ${opt.to}`);
