// Run with Node.js and an already installed Playwright package; no browser download.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawn, spawnSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const repo = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const demo = path.join(repo, 'technical-teaching-demo/assets/minimal-demo');
const output = path.resolve(process.env.TEST_OUTPUT || path.join(repo, 'test-results'));
fs.mkdirSync(output, { recursive: true });
const python = process.env.PYTHON || 'python3';

async function start(folder) {
  const child = spawn(python, [path.join(folder, 'serve.py'), '--port', '0']);
  const url = await new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('Server readiness timed out')); }, 10000);
    child.stdout.on('data', data => {
      buffer += data;
      const match = buffer.match(/http:\/\/127\.0\.0\.1:\d+\//);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Server stopped: ${code}`)); });
  });
  return { child, url };
}

async function exercise(browser, url, label, offline) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.setOffline(offline);
  const failures = [];
  const requests = [];
  const page = await context.newPage();
  page.on('pageerror', error => failures.push(error.message));
  page.on('requestfailed', request => failures.push(`${request.url()} ${request.failure().errorText}`));
  page.on('request', request => requests.push(request.url()));
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  try {
    await page.goto(url);
    await page.locator('#score').waitFor();
    assert.equal(await page.locator('#score').innerText(), '68.0');
    assert.equal(await page.locator('#weight-value').innerText(), '60%');
    const slider = page.locator('#weight');
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await slider.inputValue(), '61');
    assert.equal(await page.locator('#weight-value').innerText(), '61%');
    assert.equal(await page.locator('#score').innerText(), '68.3');
    for (const [weight, a, b, expected] of [[0, 80, 50, '50.0'], [100, 80, 50, '80.0'], [25, 100, 0, '25.0'], [50, 0, 0, '0.0'], [50, 100, 100, '100.0'], [25, 80, 50, '57.5'], [25, 20, 80, '65.0'], [69, 42, 42, '42.0']]) {
      await page.evaluate(({ weight, a, b }) => {
        for (const [id, value] of [['weight', weight], ['score-a', a], ['score-b', b]]) {
          const input = document.getElementById(id);
          input.value = value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, { weight, a, b });
      assert.equal(await page.locator('#score').innerText(), expected);
    }
    await page.locator('#reset').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.getElementById('score').textContent === '68.0');
    assert.equal(await page.locator('#score').innerText(), '68.0');
    assert.equal(await slider.inputValue(), '60');
    const answer = page.locator('#answer');
    assert.equal(await answer.isVisible(), false);
    await page.locator('#self-check summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await answer.isVisible(), true);
    await page.keyboard.press('Enter');
    assert.equal(await answer.isVisible(), false);
    await page.locator('nav a[href="#lab"]').click();
    await page.waitForFunction(() => location.hash === '#lab');
    assert.ok(await page.locator('#lab').isVisible());
    await page.locator('#contents summary').click();
    assert.equal(await page.locator('nav').isVisible(), false);
    await page.locator('#contents summary').click();
    assert.equal(await page.locator('nav').isVisible(), true);
    await page.goto(url);
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('.skip').evaluate(node => node === document.activeElement), true);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.activeElement.id === 'main');
    await page.screenshot({ path: path.join(output, `${label}-desktop.png`), fullPage: true });
    for (const width of [375, 320]) {
      await page.setViewportSize({ width, height: 850 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: path.join(output, `${label}-${width}.png`), fullPage: true });
    }
    const outside = requests.filter(item => /^https?:/.test(item) && !item.startsWith('http://127.0.0.1:'));
    assert.deepEqual(outside, []);
    assert.deepEqual(failures, []);
    return { label, offline, numericCases: 10, widths: [1440, 375, 320], errors: failures.length };
  } finally { await context.close(); }
}

(async () => {
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const servers = [];
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'teaching-demo-'));
  try {
    const results = [];
    results.push(await exercise(browser, pathToFileURL(path.join(demo, 'index.html')).href, 'file', true));
    const server = await start(demo); servers.push(server.child);
    results.push(await exercise(browser, server.url, 'http', false));
    const pack = spawnSync(python, ['-c', 'import pathlib,sys,zipfile; p=pathlib.Path(sys.argv[1]); z=zipfile.ZipFile(sys.argv[2],"w",zipfile.ZIP_DEFLATED); [z.write(f,"minimal-demo/"+f.name) for f in p.iterdir() if f.is_file()]; z.close(); z=zipfile.ZipFile(sys.argv[2]); assert z.testzip() is None; z.extractall(sys.argv[3])', demo, path.join(scratch, 'demo.zip'), scratch], { encoding: 'utf8' });
    assert.equal(pack.status, 0, pack.stderr);
    const extracted = path.join(scratch, 'minimal-demo');
    results.push(await exercise(browser, pathToFileURL(path.join(extracted, 'index.html')).href, 'zip-file', true));
    const zipServer = await start(extracted); servers.push(zipServer.child);
    results.push(await exercise(browser, zipServer.url, 'zip-http', false));
    const result = { status: 'PASS', browser: await browser.version(), modes: results };
    fs.writeFileSync(path.join(output, 'browser-results.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
  } finally {
    for (const server of servers) {
      if (server.exitCode === null) {
        const closed = new Promise(resolve => server.once('exit', resolve));
        server.kill('SIGINT'); await closed;
      }
    }
    await browser.close();
    fs.rmSync(scratch, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
