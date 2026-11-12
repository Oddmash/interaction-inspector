import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const connect = (process) => {
  let sequence = 0;
  let buffer = '';
  const pending = new Map();
  const disconnect = (error) => {
    for (const { reject } of pending.values()) reject(error);
    pending.clear();
  };
  process.on('error', disconnect);
  process.on('exit', (code, signal) => disconnect(new Error(`Chromium exited: ${code ?? signal}`)));
  process.stdio[3].on('error', disconnect);
  process.stdio[4].setEncoding('utf8');
  process.stdio[4].on('data', (chunk) => {
    buffer += chunk;
    const messages = buffer.split('\0');
    buffer = messages.pop();
    for (const message of messages) {
      const { id, result, error } = JSON.parse(message);
      const request = pending.get(id);
      if (!request) continue;
      pending.delete(id);
      if (error) request.reject(new Error(`${request.method}: ${error.message}`));
      else request.resolve(result);
    }
  });
  return (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { method, resolve, reject });
    process.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + '\0');
  });
};

const poll = async (read) => {
  for (let attempt = 0; attempt < 60; attempt++) {
    const result = await read();
    if (result) return result;
    await delay(100);
  }
  throw new Error('Timed out waiting for Chromium');
};

test('the production toolbar action opens the inspector using activeTab', { timeout: 30_000 }, async () => {
  const profile = await mkdtemp(join(tmpdir(), 'inspector-toolbar-'));
  const dist = fileURLToPath(new URL('../dist/', import.meta.url));
  const site = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end('<!doctype html><title>Toolbar test</title><button>Example</button>');
  });
  let browser;
  try {
    site.listen(0, '127.0.0.1');
    await once(site, 'listening');
    const url = `http://127.0.0.1:${site.address().port}/`;
    browser = spawn(process.env.INSPECTOR_CHROMIUM_PATH || chromium.executablePath(), [
      '--headless', '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run',
      '--remote-debugging-pipe', '--enable-unsafe-extension-debugging',
      `--user-data-dir=${profile}`, 'about:blank',
    ], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });
    const send = connect(browser);
    const { id } = await send('Extensions.loadUnpacked', { path: dist });
    const { targetId } = await send('Target.createTarget', { url });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const evaluate = async (expression) => {
      const { result } = await send('Runtime.evaluate', { expression, returnByValue: true }, sessionId);
      return result.value;
    };
    await poll(() => evaluate("document.title === 'Toolbar test'"));
    const count = () => evaluate("document.querySelectorAll('[data-oddmash-inspector]').length");
    assert.equal(await count(), 0);
    await send('Target.activateTarget', { targetId });
    await send('Extensions.triggerAction', { id, targetId });
    await poll(() => count());
    const { root } = await send('DOM.getDocument', { depth: -1, pierce: true }, sessionId);
    const flatten = (node) => [node, ...[...(node.children ?? []), ...(node.shadowRoots ?? [])].flatMap(flatten)];
    assert.ok(flatten(root).some((node) => node.nodeValue === 'Interaction Inspector'));
    await send('Extensions.triggerAction', { id, targetId });
    assert.equal(await count(), 1);
  } finally {
    if (browser && browser.exitCode === null && browser.signalCode === null && browser.pid) {
      const exited = once(browser, 'exit');
      browser.kill();
      await exited;
    }
    if (site.listening) await new Promise((resolve) => site.close(resolve));
    await rm(profile, { recursive: true, force: true });
  }
});
