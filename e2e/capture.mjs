import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const artifactDirectory = '/app/artifacts';
await mkdir(artifactDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });

const result = {
  verifiedAt: new Date().toISOString(),
  local: { url: 'http://local-app/', loaded: false, title: null },
  external: { url: 'https://example.com/', loaded: false, error: null },
};

try {
  await page.goto(result.local.url, { waitUntil: 'load', timeout: 10_000 });
  result.local.title = await page.title();
  result.local.loaded = result.local.title === 'Offline E2E Local App';
  await page.screenshot({ path: `${artifactDirectory}/local-page.png` });

  try {
    await page.goto(result.external.url, { waitUntil: 'load', timeout: 12_000 });
    result.external.loaded = true;
  } catch (error) {
    result.external.error = String(error.message).split('\n')[0];
  }

  if (!result.external.loaded && result.external.error) {
    await execFileAsync(chromium.executablePath(), [
      '--no-sandbox',
      '--headless=new',
      '--hide-scrollbars',
      '--window-size=1200,900',
      '--force-device-scale-factor=1.5',
      `--screenshot=${artifactDirectory}/external-page-error.png`,
      result.external.url,
    ]);
  }
  await writeFile(
    `${artifactDirectory}/offline-e2e-result.json`,
    `${JSON.stringify(result, null, 2)}\n`,
    'utf8',
  );
} finally {
  await browser.close();
}

if (!result.local.loaded || result.external.loaded || !result.external.error) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log('LOCAL_PAGE=LOADED');
console.log(`EXTERNAL_PAGE=BLOCKED (${result.external.error})`);
console.log('SCREENSHOT=/app/artifacts/external-page-error.png');
