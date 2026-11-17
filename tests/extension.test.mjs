import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { chromium } from 'playwright';

test('MV3 inspector picks, observes, protects input, stops, resets, and closes', { timeout: 45_000 }, async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'interaction-inspector-'));
  const extension = join(temporary, 'extension');
  const html = await readFile(new URL('../demo/index.html', import.meta.url));
  const js = await readFile(new URL('../demo/demo.js', import.meta.url));
  const origin = 'https://inspector.test';
  let context;
  try {
    await cp(new URL('../dist/', import.meta.url), extension, { recursive: true });
    const manifestPath = join(extension, 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.content_scripts = [{
      matches: [`${origin}/*`], js: ['test-shadow.js', 'inspector.js'],
    }];
    await writeFile(manifestPath, JSON.stringify(manifest));
    await writeFile(join(extension, 'test-shadow.js'), `{
      const attachShadow = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function (options) {
        if (!this.hasAttribute('data-oddmash-inspector')) return attachShadow.call(this, options);
        Element.prototype.attachShadow = attachShadow;
        return attachShadow.call(this, { ...options, mode: 'open' });
      };
    }`);
    context = await chromium.launchPersistentContext(join(temporary, 'profile'), {
      channel: 'chromium',
      executablePath: process.env.INSPECTOR_CHROMIUM_PATH,
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    const page = context.pages()[0];
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
    assert.equal(await worker.evaluate(() => chrome.runtime.getManifest().manifest_version), 3);
    const cdp = await context.newCDPSession(page);
    const root = page.locator('[data-oddmash-inspector]');
    const panel = root.getByRole('region', { name: 'Interaction Inspector' });
    const button = page.getByRole('button', { name: 'Toggle details' });
    const field = (name) => panel.locator('dt').filter({ hasText: name })
      .locator('xpath=following-sibling::dd[1]');
    await context.route(`${origin}/**`, (route) => {
      const script = new URL(route.request().url()).pathname === '/demo.js';
      return route.fulfill({
        contentType: script ? 'text/javascript' : 'text/html',
        body: script ? js : html,
      });
    });
    await page.goto(origin);
    await panel.waitFor();
    const pickButton = panel.getByRole('button', { name: 'Pick element' });
    await pickButton.hover();
    assert.equal(await pickButton.evaluate((node) => getComputedStyle(node).backgroundColor), 'rgb(57, 73, 96)');
    await panel.getByRole('button', { name: 'Pick element' }).click();
    await button.hover();
    const { root: documentNode } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
    const flatten = (node) => [node, ...[...(node.children ?? []), ...(node.shadowRoots ?? [])].flatMap(flatten)];
    const highlight = flatten(documentNode).find((node) =>
      node.attributes?.some((value, index) => value === 'class' && node.attributes[index + 1] === 'highlight'));
    assert.ok(highlight);
    assert.ok(!highlight.attributes.includes('hidden'));
    await button.click();
    assert.equal(await button.getAttribute('aria-expanded'), 'false');
    await panel.getByText('aria-expanded', { exact: true }).waitFor();
    assert.equal(await field(/^aria-expanded$/).innerText(), 'false');
    await panel.getByRole('button', { name: 'Start' }).click();
    await button.click();
    await field(/^aria-expanded$/).filter({ hasText: /^true$/ }).waitFor();
    await button.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await field(/^:focus-visible$/).filter({ hasText: /^true$/ }).waitFor();
    const password = page.getByLabel('Example password');
    await password.focus();
    const timeline = panel.getByRole('list', { name: 'Event timeline' });
    for (const type of ['keydown', 'focusin', 'focusout', 'click']) {
      await timeline.getByText(type, { exact: true }).first().waitFor();
    }
    const beforePassword = await timeline.getByRole('listitem').count();
    await password.press('S');
    assert.equal(await timeline.getByRole('listitem').count(), beforePassword);
    assert.doesNotMatch(await timeline.innerText(), /Example password|\bS\b/);
    await panel.getByRole('button', { name: 'Stop' }).click();
    const count = await timeline.getByRole('listitem').count();
    const eventType = panel.getByLabel('Event type');
    await eventType.selectOption('click');
    await timeline.getByText('click', { exact: true }).first().waitFor();
    assert.ok((await timeline.getByRole('listitem').count()) < count);
    assert.equal(await timeline.getByText('keydown', { exact: true }).count(), 0);
    await eventType.selectOption('all');
    await panel.getByLabel('Selected element').check();
    assert.equal(await timeline.getByText('input', { exact: true }).count(), 0);
    await panel.getByLabel('Selected element').uncheck();
    assert.equal(await timeline.getByRole('listitem').count(), count);
    await button.click();
    assert.equal(await timeline.getByRole('listitem').count(), count);
    await panel.getByRole('button', { name: 'Reset' }).click();
    await panel.getByText('No events recorded.').waitFor();
    await panel.getByRole('button', { name: 'Close inspector' }).click();
    await panel.waitFor({ state: 'detached' });
  } finally {
    await context?.close();
    await rm(temporary, { recursive: true, force: true });
  }
});
