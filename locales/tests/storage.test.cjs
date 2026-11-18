const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resetAllData } = require('../../src/storage.ts');

function setup({ confirm = true, fail = false } = {}) {
  const keys = [
    'periodHistory',
    'bbtData',
    'cycleSettings',
    'audienceMode',
    'language',
    'regionPreference',
    'installBannerDismissed',
  ];
  const data = new Map([...keys, 'unrelatedApp'].map((key) => [key, 'saved']));
  const redirects = [];
  const messages = [];
  const options = {
    confirm: () => confirm,
    notify: (message) => messages.push(message),
    storage: {
      removeItem(key) {
        if (fail) throw new Error('Storage blocked');
        data.delete(key);
      },
    },
    location: {
      href: 'https://example.com/app/?lang=ja&other=1',
      replace: (url) => redirects.push(url),
    },
  };
  return { options, data, redirects, messages };
}

test('reset deletes all app records and preferences and removes the URL language override', () => {
  const { options, data, redirects, messages } = setup();
  assert.equal(resetAllData(options), 'reset');
  assert.deepEqual([...data.keys()], ['unrelatedApp']);
  assert.deepEqual(redirects, ['https://example.com/app/?other=1']);
  assert.deepEqual(messages, []);
});

test('canceling reset leaves data and page intact', () => {
  const { options, data, redirects } = setup({ confirm: false });
  const before = [...data];
  assert.equal(resetAllData(options), 'cancelled');
  assert.deepEqual([...data], before);
  assert.deepEqual(redirects, []);
});

test('storage failure reports incomplete deletion without redirecting', () => {
  const { options, redirects, messages } = setup({ fail: true });
  assert.equal(resetAllData(options), 'failed');
  assert.deepEqual(redirects, []);
  assert.deepEqual(messages, ['reset.failed']);
});
