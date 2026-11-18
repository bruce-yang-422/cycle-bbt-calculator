const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// README.md (Traditional Chinese) is the primary version and README.en.md is its translation.
// Prose can't be compared across languages, so these checks pin everything language-neutral.
const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const primary = read('README.md');
const english = read('README.en.md');

function outside(markdown) {
  return markdown.replace(/^```[\s\S]*?^```/gm, '').replace(/<!--[\s\S]*?-->/g, '');
}

const headingLevels = (md) => [...outside(md).matchAll(/^(#{1,6}) /gm)].map((match) => match[1].length);
const tableRows = (md) => {
  const sizes = [];
  let rows = 0;
  for (const line of outside(md).split('\n')) {
    if (line.startsWith('|')) rows++;
    else if (rows) { sizes.push(rows); rows = 0; }
  }
  return rows ? [...sizes, rows] : sizes;
};
// Shell blocks must match line for line, ignoring translated comments.
const shellBlocks = (md) => [...md.matchAll(/^```sh\n([\s\S]*?)^```/gm)]
  .map((match) => match[1].split('\n').filter((line) => line.trim() && !line.trim().startsWith('#')).join('\n'));
const inlineCode = (md) => [...outside(md).matchAll(/`([^`\n]+)`/g)].map((match) => match[1]).sort();
// Link targets, excluding in-page anchors and the cross-links between the two READMEs.
const links = (md) => [...outside(md).matchAll(/\]\(([^)\s]+)\)|<(https?:\/\/[^>]+)>/g)]
  .map((match) => match[1] ?? match[2])
  .filter((target) => !target.startsWith('#') && !/^README(\.en)?\.md$/.test(target))
  .sort();

test('both READMEs link to each other and name the primary version', () => {
  assert.match(primary, /\]\(README\.en\.md\)/);
  assert.match(english, /\]\(README\.md\)/);
  assert.match(english, /primary version/);
});

test('README.en.md mirrors the structure of README.md', () => {
  assert.deepEqual(headingLevels(english), headingLevels(primary), 'heading outline');
  assert.deepEqual(tableRows(english), tableRows(primary), 'table rows');
  assert.deepEqual(shellBlocks(english), shellBlocks(primary), 'shell commands');
  assert.deepEqual(links(english), links(primary), 'link targets');
});

test('code identifiers match between both READMEs', () => {
  // Identifiers such as storage keys, file names and commands are not translated.
  const identifiers = (md) => inlineCode(md).filter((code) => !/[^\x00-\x7F]/.test(code));
  assert.deepEqual(identifiers(english), identifiers(primary));
});
