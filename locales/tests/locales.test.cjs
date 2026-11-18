const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { catalogs, supportedLanguages } = require('../../src/i18n.ts');
const { guideEmphasis } = require('../../src/locales/guide-emphasis.ts');

const root = path.resolve(__dirname, '../..');
const languages = ['zh-TW', 'en', 'ja', 'ko', 'es', 'de', 'th', 'vi'];

test('guide emphasis matches actual translated copy in all eight languages', () => {
  assert.deepEqual(Object.keys(guideEmphasis).sort(), [...languages].sort());
  for (const language of languages) {
    for (const [key, phrases] of Object.entries(guideEmphasis[language])) {
      for (const phrase of phrases) {
        assert(catalogs[language][key].includes(phrase), [language, key, phrase].join(':'));
      }
    }
  }
});

test('eight complete catalogs with matching placeholders', () => {
  assert.deepEqual(supportedLanguages, languages);
  const keys = Object.keys(catalogs.en).sort();
  const params = (message) => [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  for (const language of languages) {
    assert.deepEqual(Object.keys(catalogs[language]).sort(), keys, language);
    for (const key of keys) {
      const translated = catalogs[language][key];
      const label = language + ':' + key;
      assert(translated.trim(), label);
      assert.deepEqual(params(translated), params(catalogs.en[key]), label);
    }
  }
});

test('static translation keys in the application source exist', () => {
  const files = fs.readdirSync(path.join(root, 'src'), { recursive: true, withFileTypes: true });
  for (const file of files) {
    if (!file.isFile() || !/\.(?:ts|vue)$/.test(file.name)) continue;
    const filename = path.join(file.parentPath, file.name);
    const source = fs.readFileSync(filename, 'utf8');
    for (const match of source.matchAll(/\bt\(\s*['"]([.\w]+)['"]\s*[,)]/g)) {
      assert(Object.hasOwn(catalogs.en, match[1]), path.relative(root, filename) + ': ' + match[1]);
    }
  }
});

test('both HTML entries load actual Vue modules and local assets', () => {
  const entries = [['index.html', '/src/main.ts'], ['404.html', '/src/not-found.ts']];
  for (const [file, entry] of entries) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const scripts = [...html.matchAll(/<script\s+type="module"\s+src="([^"]+)"/g)];
    assert.deepEqual(scripts.map((match) => match[1]), [entry], file);
    for (const match of html.matchAll(/\b(?:src|href)="(?:\.\/|\/)?((?:src|images|locales)\/[^"]+)"/g)) {
      const publicDir = match[1].startsWith('src/') ? root : path.join(root, 'public');
      assert(fs.existsSync(path.join(publicDir, match[1])), match[1]);
    }
    assert(!/<style\b|\sstyle=|\son(?:click|change|submit)=/.test(html), file);
  }
});

test('localized manifests use one application identity and valid icons', () => {
  const publicRoot = path.join(root, 'public');
  for (const language of languages) {
    const manifestPath = path.join(publicRoot, 'locales', 'manifest.' + language + '.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.lang, language);
    assert.equal(manifest.id, '../');
    for (const icon of manifest.icons) {
      assert(fs.existsSync(path.resolve(path.dirname(manifestPath), icon.src)), icon.src);
    }
  }
});
