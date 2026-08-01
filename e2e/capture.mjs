import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const artifactDirectory = '/app/artifacts/sample-app-e2e';
const viewport = { width: 1200, height: 900 };
await mkdir(artifactDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport });

const result = {
  verifiedAt: new Date().toISOString(),
  viewport,
  local: {
    url: 'http://local-app/',
    loaded: false,
    title: null,
    taskCreated: false,
    taskCompleted: false,
    emptyTaskRejected: false,
    viewportFit: null,
  },
  external: {
    url: 'https://example.com/',
    triggeredByClick: false,
    loaded: false,
    finalUrl: null,
    responseStatus: null,
    error: null,
  },
  screenshots: [
    '01-initial-app.png',
    '02-task-created.png',
    '03-task-completed.png',
    '04-external-url-blocked.png',
  ],
};

async function capture(name) {
  await page.screenshot({
    path: `${artifactDirectory}/${name}`,
    animations: 'disabled',
    fullPage: false,
  });
}

try {
  await page.goto(result.local.url, { waitUntil: 'load', timeout: 10_000 });
  result.local.title = await page.title();
  await page.getByRole('heading', { name: 'Offline Sprint Board' }).waitFor();
  result.local.loaded = result.local.title === 'Offline Sprint Board';

  result.local.viewportFit = await page.evaluate(() => {
    const shell = document.querySelector('.shell').getBoundingClientRect();
    const externalControl = document.querySelector('[data-testid="external-link"]').getBoundingClientRect();
    return {
      canScrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      shellWithinViewport: shell.left >= 0 && shell.right <= window.innerWidth && shell.top >= 0 && shell.bottom <= window.innerHeight,
      externalControlVisible: externalControl.top >= 0 && externalControl.bottom <= window.innerHeight,
    };
  });
  await capture('01-initial-app.png');

  const tasksBeforeEmptySubmit = await page.locator('.task').count();
  await page.getByTestId('task-input').fill('   ');
  await page.getByTestId('add-task').click();
  result.local.emptyTaskRejected = await page.locator('.task').count() === tasksBeforeEmptySubmit;

  await page.getByTestId('task-input').fill('allowlistの証拠をレビュー');
  await page.getByTestId('add-task').click();
  const createdTask = page.getByTestId('created-task');
  await createdTask.getByText('allowlistの証拠をレビュー').waitFor();
  result.local.taskCreated =
    (await page.locator('#openCount').textContent()) === '2' &&
    (await page.locator('#doneCount').textContent()) === '0';
  await capture('02-task-created.png');

  await page.getByTestId('created-task-checkbox').check();
  result.local.taskCompleted =
    (await createdTask.evaluate((element) => element.classList.contains('done'))) &&
    (await page.locator('#openCount').textContent()) === '1' &&
    (await page.locator('#doneCount').textContent()) === '1';
  await capture('03-task-completed.png');

  result.external.triggeredByClick = true;
  try {
    const externalOutcome = Promise.race([
      page.waitForEvent('requestfailed', {
        predicate: (request) => request.isNavigationRequest() && request.url().startsWith(result.external.url),
        timeout: 12_000,
      }).then((request) => ({
        kind: 'failed',
        error: request.failure()?.errorText ?? 'navigation request failed',
      })),
      page.waitForResponse(
        (response) => response.request().isNavigationRequest() && response.url().startsWith(result.external.url),
        { timeout: 12_000 },
      ).then((response) => ({
        kind: 'response',
        status: response.status(),
      })),
    ]);

    await page.getByTestId('external-link').click({ noWaitAfter: true, timeout: 12_000 });
    const outcome = await externalOutcome;
    result.external.finalUrl = page.url();
    if (outcome.kind === 'response') {
      result.external.loaded = true;
      result.external.responseStatus = outcome.status;
    } else {
      result.external.error = outcome.error;
    }
  } catch (error) {
    result.external.finalUrl = page.url();
    result.external.error = String(error.message).split('\n')[0];
  }

  if (!result.external.loaded && result.external.error) {
    await execFileAsync(chromium.executablePath(), [
      '--no-sandbox',
      '--headless=new',
      '--hide-scrollbars',
      '--disable-dev-shm-usage',
      '--window-size=1200,900',
      '--force-device-scale-factor=1',
      `--screenshot=${artifactDirectory}/04-external-url-blocked.png`,
      result.external.url,
    ]);
  }

  await writeFile(
    `${artifactDirectory}/result.json`,
    `${JSON.stringify(result, null, 2)}\n`,
    'utf8',
  );
} finally {
  await browser.close();
}

const localChecksPassed =
  result.local.loaded &&
  result.local.taskCreated &&
  result.local.taskCompleted &&
  result.local.emptyTaskRejected &&
  result.local.viewportFit?.shellWithinViewport &&
  result.local.viewportFit?.externalControlVisible &&
  !result.local.viewportFit?.canScrollX;
const externalCheckPassed =
  result.external.triggeredByClick &&
  !result.external.loaded &&
  Boolean(result.external.error);

if (!localChecksPassed || !externalCheckPassed) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log('SAMPLE_APP=LOADED');
console.log('TASK_FLOW=CREATED_AND_COMPLETED');
console.log('EMPTY_TASK=REJECTED');
console.log(`EXTERNAL_URL=BLOCKED (${result.external.error})`);
console.log(`SCREENSHOTS=${artifactDirectory}`);
