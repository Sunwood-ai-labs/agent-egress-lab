import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const artifactDirectory = '/app/artifacts/readonly-fetch';
const viewport = { width: 1200, height: 900 };
const consoleUrl = 'http://research-console/';
const externalUrl = 'https://example.com/';
await mkdir(artifactDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport });
const page = await context.newPage();
const result = {
  verifiedAt: new Date().toISOString(),
  viewport,
  console: { loaded: false, title: null, viewportFit: null },
  allowedGet: { passed: false, status: null, evidence: null },
  blockedPost: { passed: false, status: null },
  blockedHost: { passed: false, status: null },
  policyEdges: { httpRejected: false },
  directExternal: { triggeredByClick: false, loaded: false, error: null },
  screenshots: [
    '01-console-ready.png',
    '02-get-allowed.png',
    '03-post-blocked.png',
    '04-host-blocked.png',
    '05-direct-external-blocked.png',
  ],
};

async function capture(name) {
  await page.screenshot({ path: `${artifactDirectory}/${name}`, animations: 'disabled', fullPage: false });
}

try {
  await page.goto(consoleUrl, { waitUntil: 'load', timeout: 15_000 });
  result.console.title = await page.title();
  await page.getByRole('heading', { name: /RESEARCH/ }).waitFor();
  result.console.loaded = result.console.title === 'Research Airlock';
  result.console.viewportFit = await page.evaluate(() => {
    const shell = document.querySelector('.shell').getBoundingClientRect();
    const controls = [...document.querySelectorAll('button, a[data-testid]')].map((element) => {
      const rect = element.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight;
    });
    return {
      canScrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      shellWithinViewport: shell.left >= 0 && shell.right <= innerWidth && shell.top >= 0 && shell.bottom <= innerHeight,
      allControlsVisible: controls.every(Boolean),
    };
  });
  await capture('01-console-ready.png');

  await page.getByTestId('get-button').click();
  await page.locator('#getStatus').filter({ hasText: '200 READ ALLOWED' }).waitFor({ timeout: 15_000 });
  result.allowedGet.status = await page.locator('#getStatus').textContent();
  result.allowedGet.evidence = await page.locator('#responseExcerpt').textContent();
  result.allowedGet.passed = result.allowedGet.evidence.includes('Example Domain');
  await capture('02-get-allowed.png');

  await page.getByTestId('post-button').click();
  await page.locator('#postStatus').filter({ hasText: '405 WRITE BLOCKED' }).waitFor();
  result.blockedPost.status = await page.locator('#postStatus').textContent();
  result.blockedPost.passed = result.blockedPost.status === '405 WRITE BLOCKED';
  await capture('03-post-blocked.png');

  await page.getByTestId('host-button').click();
  await page.locator('#hostStatus').filter({ hasText: '403 HOST BLOCKED' }).waitFor();
  result.blockedHost.status = await page.locator('#hostStatus').textContent();
  result.blockedHost.passed = result.blockedHost.status === '403 HOST BLOCKED';
  await capture('04-host-blocked.png');

  await page.locator('#targetUrl').fill('http://example.com/');
  await page.getByTestId('get-button').click();
  await page.locator('#getStatus').filter({ hasText: '400 BLOCKED' }).waitFor();
  result.policyEdges.httpRejected = (await page.locator('#responseExcerpt').textContent()).includes('https_required');
  await page.locator('#targetUrl').fill(externalUrl);

  result.directExternal.triggeredByClick = true;
  const failedRequest = new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 12_000);
    context.on('requestfailed', (request) => {
      if (request.isNavigationRequest() && request.url().startsWith(externalUrl)) {
        clearTimeout(timeout);
        resolve(request.failure()?.errorText ?? 'navigation failed');
      }
    });
  });
  const responseSeen = new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 12_000);
    context.on('response', (response) => {
      if (response.request().isNavigationRequest() && response.url().startsWith(externalUrl)) {
        clearTimeout(timeout);
        resolve(response.status());
      }
    });
  });
  await page.getByTestId('direct-external').click({ noWaitAfter: true });
  const outcome = await Promise.race([
    failedRequest.then((error) => ({ kind: 'failed', error })),
    responseSeen.then((status) => ({ kind: 'response', status })),
  ]);
  if (outcome.kind === 'response' && outcome.status !== null) result.directExternal.loaded = true;
  else result.directExternal.error = outcome.error || 'navigation failed without a response';

  await execFileAsync(chromium.executablePath(), [
    '--no-sandbox', '--headless=new', '--hide-scrollbars', '--disable-dev-shm-usage',
    '--window-size=1200,900', '--force-device-scale-factor=1',
    `--screenshot=${artifactDirectory}/05-direct-external-blocked.png`, externalUrl,
  ]);

  await writeFile(`${artifactDirectory}/result.json`, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
} finally {
  await browser.close();
}

const passed =
  result.console.loaded && result.console.viewportFit?.shellWithinViewport &&
  result.console.viewportFit?.allControlsVisible && !result.console.viewportFit?.canScrollX &&
  result.allowedGet.passed && result.blockedPost.passed && result.blockedHost.passed &&
  result.policyEdges.httpRejected && result.directExternal.triggeredByClick &&
  !result.directExternal.loaded && Boolean(result.directExternal.error);

if (!passed) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log('GET_ALLOWLISTED=ALLOWED');
console.log('POST=BLOCKED_405');
console.log('OTHER_HOST=BLOCKED_403');
console.log(`DIRECT_EXTERNAL=BLOCKED (${result.directExternal.error})`);
console.log(`SCREENSHOTS=${artifactDirectory}`);
