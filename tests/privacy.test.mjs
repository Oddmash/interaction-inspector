import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classifyModality, labelForTag, readAria, readTabIndex } from '../src/privacy.ts';

test('ARIA only emits allowlisted tokens and does not read naming attributes', () => {
  const visited = [];
  const values = { 'aria-expanded': 'true', 'aria-checked': 'mixed', 'aria-hidden': 'secret' };
  const result = readAria((key) => {
    visited.push(key);
    return values[key] ?? null;
  });
  assert.deepEqual(result, [
    ['aria-hidden', '(invalid token)'],
    ['aria-expanded', 'true'],
    ['aria-checked', 'mixed'],
  ]);
  assert.ok(!visited.includes('aria-label'));
});

test('tabindex and custom element names are normalized', () => {
  assert.deepEqual([null, '-9', '-1', '0', '1', 'private123'].map(readTabIndex),
    ['(absent)', '< −1', '-1', '0', '> 0', '(invalid integer)']);
  assert.equal(labelForTag('input'), 'input');
  assert.equal(labelForTag('private-custom-tag'), 'element');
});

test('click and focus events do not imply input modality', () => {
  assert.equal(classifyModality('keydown'), 'Keyboard');
  for (const type of ['click', 'focusin', 'focusout']) {
    assert.equal(classifyModality(type), 'Undetermined');
  }
});

test('manifest requires explicit active-tab activation and no persistent host access', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.json', import.meta.url)));
  assert.deepEqual(manifest.permissions, ['activeTab', 'scripting']);
  for (const key of ['host_permissions', 'content_scripts', 'externally_connectable']) {
    assert.ok(!(key in manifest));
  }
});

test('toolbar action injects only into the clicked tab and reports restricted pages', async () => {
  let listener;
  let deny = false;
  const calls = [];
  globalThis.chrome = {
    action: {
      onClicked: { addListener: (callback) => { listener = callback; } },
      setBadgeText: async (options) => { calls.push(options); },
    },
    scripting: {
      executeScript: async (options) => {
        calls.push(options);
        if (deny) throw new Error('Restricted tab');
      },
    },
  };
  try {
    await import('../src/worker.ts');
    await listener({});
    assert.deepEqual(calls, []);
    await listener({ id: 12 });
    deny = true;
    await listener({ id: 13 });
    assert.deepEqual(calls, [
      { target: { tabId: 12 }, files: ['inspector.js'] },
      { tabId: 12, text: '' },
      { target: { tabId: 13 }, files: ['inspector.js'] },
      { tabId: 13, text: '×' },
    ]);
  } finally {
    delete globalThis.chrome;
  }
});
