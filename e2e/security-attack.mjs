import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const artifactDirectory = '/app/artifacts/security-attack';
const viewport = { width: 1200, height: 900 };
await mkdir(artifactDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport });
const page = await context.newPage();
const result = { verifiedAt: new Date().toISOString(), viewport, cases: {}, network: {} };
const caseScreenshots = [
  ['injection', '03-injection-contained.png'],
  ['post', '04-post-contained.png'],
  ['query', '05-query-contained.png'],
  ['path', '06-path-contained.png'],
  ['ssrf', '07-ssrf-contained.png'],
  ['action', '08-action-contained.png'],
];

try {
  await page.goto('http://research-console/attack-lab.html', { waitUntil: 'load', timeout: 15_000 });
  await page.screenshot({ path: `${artifactDirectory}/01-before-attack.png`, animations: 'disabled' });
  await page.locator('#run').click();
  await page.locator('#verdict').filter({ hasText: 'CONTAINED' }).waitFor({ timeout: 20_000 });
  result.cases = await page.evaluate(() => window.__attackLabResult);
  await page.screenshot({ path: `${artifactDirectory}/02-attacks-contained.png`, animations: 'disabled' });
  for (const [caseName, screenshotName] of caseScreenshots) {
    await page.locator(`[data-test="${caseName}"]`).click();
    await page.locator('#caseTitle').filter({ hasText: caseName === 'injection' ? '悪意ある指示' : caseName === 'post' ? 'POST送信' : caseName === 'query' ? 'GETクエリ持ち出し' : caseName === 'path' ? 'GETパス持ち出し' : caseName === 'ssrf' ? '内部IP SSRF' : '未承認アクション' }).waitFor();
    await page.screenshot({ path: `${artifactDirectory}/${screenshotName}`, animations: 'disabled' });
  }

  result.network.actionSinkReachable = await page.evaluate(async () => {
    try { await fetch('http://action-sink/', { mode: 'no-cors', signal: AbortSignal.timeout(4000) }); return true; }
    catch { return false; }
  });
  result.network.directInternetReachable = await page.evaluate(async () => {
    try { await fetch('https://example.com/', { mode: 'no-cors', signal: AbortSignal.timeout(6000) }); return true; }
    catch { return false; }
  });
  await writeFile(`${artifactDirectory}/result.json`, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
} finally {
  await browser.close();
}

const allContained = Object.values(result.cases).length === 6 && Object.values(result.cases).every((item) => item.passed);
if (!allContained || result.network.actionSinkReachable || result.network.directInternetReachable) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log('VIRTUAL_INTRUSION_CASES=6/6_CONTAINED');
console.log('ACTION_NETWORK=UNREACHABLE');
console.log('DIRECT_INTERNET=UNREACHABLE');
