// Runs axe-core in Playwright at 390px (mobile) and 1440px, with and without reduced motion,
// after opening interactive states (menu, each explorer tab, lightbox). Exits 1 on any violation.
import { chromium } from 'playwright';
import fs from 'fs';
const axeSrc = fs.readFileSync(new URL('../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const BASE = process.env.BASE || 'http://localhost:8080';
const tags = ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice'];
const launch = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : {};
const browser = await chromium.launch(launch);
let total = 0;
async function audit(page, label) {
  await page.addScriptTag({ content: axeSrc });
  const r = await page.evaluate(async (tags) => await axe.run(document, { runOnly: { type: 'tag', values: tags } }), tags);
  for (const v of r.violations) { total += v.nodes.length; console.log(`✗ [${label}] ${v.id} (${v.impact}): ${v.help}\n   ${v.nodes.slice(0,5).map(n=>n.target.join(' ')).join('\n   ')}`); }
  console.log(`[${label}] ${r.violations.length} violation types, ${r.passes.length} rules passed`);
}
for (const [w,h,motion] of [[390,844,'reduce'],[390,844,'no-preference'],[1440,900,'no-preference']]) {
  const ctx = await browser.newContext({ viewport:{width:w,height:h}, reducedMotion: motion, isMobile: w<500, hasTouch: w<500 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
  for (let y=0; y<30000; y+=800) { await page.evaluate(y=>scrollTo(0,y), y); await page.waitForTimeout(40); }
  await page.waitForTimeout(800);
  await audit(page, `${w}px ${motion}`);
  if (w < 500) { await page.evaluate(()=>scrollTo(0,0)); await page.click('.menu-btn'); await page.waitForTimeout(400); await audit(page, `${w}px menu open`); await page.keyboard.press('Escape'); }
  for (const id of ['tab-psy','tab-parent']) { await page.click('#'+id); }
  await page.click('.flip-btn'); await page.click('#masonry .tile'); await page.waitForTimeout(500);
  await audit(page, `${w}px lightbox+states`);
  await ctx.close();
  const ctx2 = await browser.newContext({ viewport:{width:w,height:h}, reducedMotion: motion });
  const p2 = await ctx2.newPage(); await p2.goto(`${BASE}/accessibility.html`); await audit(p2, `${w}px accessibility.html`); await ctx2.close();
}
await browser.close();
console.log(total ? `\nFAIL: ${total} violation nodes` : '\nPASS: 0 axe violations');
process.exit(total ? 1 : 0);
