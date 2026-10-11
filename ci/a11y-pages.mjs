// axe-core (WCAG 2.2 A/AA + best-practice) on every inner page at 390px (reduced motion) and 1440px,
// plus open states: menu, every tab, read-more, quote expanders, flip cards. Exits 1 on any violation.
// Usage: BASE=http://localhost:8080 node scripts/a11y-pages.mjs [page1.html,page2.html]
import { chromium } from 'playwright';
import fs from 'fs';
const axeSrc = fs.readFileSync(new URL('../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const BASE = (process.env.BASE || 'http://localhost:8080').replace(/\/$/, '');
const PAGES = (process.argv[2] || JSON.parse(fs.readFileSync(new URL('./pages.json', import.meta.url), 'utf8')).join(',')).split(',');
const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const browser = await chromium.launch(process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : {});
let total = 0;
async function audit(page, label) {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: axeSrc });
  const r = await page.evaluate(async (tags) => await axe.run(document, { runOnly: { type: 'tag', values: tags } }), tags);
  for (const v of r.violations) { total += v.nodes.length; console.log(`✗ [${label}] ${v.id} (${v.impact}): ${v.help}\n   ${v.nodes.slice(0, 5).map((n) => n.target.join(' ')).join('\n   ')}`); }
  console.log(`${r.violations.length ? '✗' : '✓'} [${label}] ${r.violations.length} violation types, ${r.passes.length} rules passed`);
}
for (const [w, h, motion] of [[390, 844, 'reduce'], [1440, 900, 'no-preference']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: motion, isMobile: w < 500, hasTouch: w < 500 });
  for (const p of PAGES) {
    const page = await ctx.newPage();
    await page.goto(`${BASE}/${p}`, { waitUntil: 'networkidle' });
    for (let y = 0; y < 20000; y += 700) { await page.evaluate((y) => scrollTo(0, y), y); await page.waitForTimeout(30); }
    await page.waitForTimeout(600);
    await audit(page, `${p} ${w}px`);
    // open states
    await page.evaluate(() => {
      document.querySelectorAll('.read-more[aria-expanded="false"], [data-expand][aria-expanded="false"], .flip-btn[aria-expanded="false"]').forEach((b) => b.click());
      document.querySelectorAll('[role="tab"][aria-selected="false"]').forEach((t) => t.click());
    });
    await page.waitForTimeout(400);
    await audit(page, `${p} ${w}px states`);
    if (w < 500) { await page.evaluate(() => scrollTo(0, 0)); await page.click('.menu-btn'); await page.waitForTimeout(400); await audit(page, `${p} ${w}px menu`); }
    await page.close();
  }
  await ctx.close();
}
await browser.close();
console.log(total ? `\n${total} violation nodes` : '\nNo axe violations on any page/state.');
process.exit(total ? 1 : 0);
