const { test } = require('node:test');
const assert = require('node:assert/strict');
const { analyzeBBT, cycleBBT } = require('../../src/cycle.ts');

const context = {
  calcParams: { lpv: '2026-01-01', cLen: 28 },
  today: '2026-01-10',
};
const readings = Array.from({ length: 9 }, (_, index) => ({
  date: '2026-01-' + String(index + 1).padStart(2, '0'),
  temp: index < 6 ? 36.3 : 36.6,
}));

test('six baseline days and three consecutive high days show a trend, not an ovulation date', () => {
  const result = analyzeBBT(readings, '2026-01-09', context);
  assert.equal(result.consecutiveHighDays, 3);
  assert.equal(result.highTempStartDate, '2026-01-07');
  assert.equal(result.ovulationDate, null);
});

test('later readings do not confirm a past date', () => {
  assert.equal(analyzeBBT(readings, '2026-01-08', context).consecutiveHighDays, 0);
});

test('missing high day breaks the run', () => {
  const incomplete = readings.filter(({ date }) => date !== '2026-01-08');
  assert.equal(analyzeBBT(incomplete, '2026-01-09', context).consecutiveHighDays, 0);
});

test('missing baseline day cannot be replaced with an older low reading', () => {
  const incomplete = readings.filter(({ date }) => date !== '2026-01-03');
  assert.equal(analyzeBBT(incomplete, '2026-01-09', context).consecutiveHighDays, 0);
});

test('drop and stale last reading do not carry forward a trend', () => {
  const cooled = [...readings, { date: '2026-01-10', temp: 36.2 }];
  assert.equal(analyzeBBT(cooled, '2026-01-10', context).consecutiveHighDays, 0);
  assert.equal(analyzeBBT(readings, '2026-01-10', context).consecutiveHighDays, 0);
});

test('a recorded next period starts a separate analysis', () => {
  const history = [{ date: '2026-01-08' }];
  assert.equal(analyzeBBT(readings, '2026-01-09', { ...context, history }), null);
});

test('no configured or recorded start yields no trend', () => {
  assert.equal(analyzeBBT(readings, '2026-01-09', { ...context, calcParams: null }), null);
});

test('future measurements and previous cycle readings are excluded', () => {
  const outOfRange = [
    { date: '2099-01-01', temp: 36.6 },
    { date: '2025-12-31', temp: 36.2 },
  ];
  assert.deepEqual(cycleBBT(outOfRange, '2099-01-01', context), []);
});
