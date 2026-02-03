'use strict';

const { diff, applyDiff } = require('../index.js');
const {
  generateFlatObject,
  generateNestedObject,
  generateArray,
  generateMixedObject,
  generateUserRecord,
  generateConfig,
  generateObjectWithDates,
  generateEventLog,
  generateSchedule,
  clone,
  mutate,
} = require('./fixtures.cjs');

// Deep clone that preserves Date objects
function cloneWithDates(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (Array.isArray(obj)) return obj.map(cloneWithDates);
  const result = {};
  for (const key of Object.keys(obj)) {
    result[key] = cloneWithDates(obj[key]);
  }
  return result;
}

// Mutate object with Dates - always changes dates and some other fields
function mutateWithDates(obj, changeRatio = 0.1) {
  const result = cloneWithDates(obj);

  // Always modify top-level dates
  for (const key of Object.keys(result)) {
    if (result[key] instanceof Date) {
      result[key] = new Date(result[key].getTime() + 86400000); // Add one day
    }
  }

  // If there's an items or events array, modify some items
  if (Array.isArray(result.items) && result.items.length > 0) {
    const idx = Math.floor(result.items.length * 0.5);
    if (result.items[idx].timestamp instanceof Date) {
      result.items[idx].timestamp = new Date(result.items[idx].timestamp.getTime() + 86400000);
    }
    if (result.items[idx].name) {
      result.items[idx].name = result.items[idx].name + '_modified';
    }
  }
  if (Array.isArray(result.events) && result.events.length > 0) {
    const idx = Math.floor(result.events.length * 0.5);
    if (result.events[idx].timestamp instanceof Date) {
      result.events[idx].timestamp = new Date(result.events[idx].timestamp.getTime() + 86400000);
    }
    if (result.events[idx].type) {
      result.events[idx].type = result.events[idx].type + '_modified';
    }
  }

  // If there's a meetings array, modify it
  if (Array.isArray(result.meetings) && result.meetings.length > 0) {
    result.meetings[0].title = result.meetings[0].title + '_modified';
    if (result.meetings[0].start instanceof Date) {
      result.meetings[0].start = new Date(result.meetings[0].start.getTime() + 3600000);
    }
  }

  // If there's a deadlines array, modify it
  if (Array.isArray(result.deadlines) && result.deadlines.length > 0) {
    if (result.deadlines[0].due instanceof Date) {
      result.deadlines[0].due = new Date(result.deadlines[0].due.getTime() + 86400000);
    }
  }

  return result;
}

const WARMUP_ITERATIONS = 200;
const BENCHMARK_ITERATIONS = 2000;

function measure(name, fn, iterations = BENCHMARK_ITERATIONS) {
  // Warmup
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    fn();
  }

  // Force GC if available
  if (global.gc) {
    global.gc();
  }

  const times = [];
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    fn();
    const end = process.hrtime.bigint();
    times.push(Number(end - start));
  }

  const sorted = times.slice().sort((a, b) => a - b);
  const total = times.reduce((a, b) => a + b, 0);
  const avg = total / iterations;
  const median = sorted[Math.floor(iterations / 2)];
  const p95 = sorted[Math.floor(iterations * 0.95)];
  const p99 = sorted[Math.floor(iterations * 0.99)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  return {
    name,
    iterations,
    avg: avg / 1000,
    median: median / 1000,
    p95: p95 / 1000,
    p99: p99 / 1000,
    min: min / 1000,
    max: max / 1000,
    opsPerSec: Math.round(1e9 / avg),
  };
}

function formatResult(result) {
  return [
    result.name.padEnd(40),
    `${result.opsPerSec.toLocaleString().padStart(10)} ops/s`,
    `avg: ${result.avg.toFixed(2).padStart(8)} us`,
    `median: ${result.median.toFixed(2).padStart(8)} us`,
    `p95: ${result.p95.toFixed(2).padStart(8)} us`,
  ].join('  |  ');
}

function runSuite(name, benchmarks) {
  console.log(`\n${'='.repeat(120)}`);
  console.log(`  ${name}`);
  console.log('='.repeat(120));

  for (const bench of benchmarks) {
    const result = measure(bench.name, bench.fn, bench.iterations);
    console.log(formatResult(result));
  }
}

// Prepare fixtures once
const fixtures = {
  flatSmall: { a: generateFlatObject(10), b: null },
  flatMedium: { a: generateFlatObject(100), b: null },
  flatLarge: { a: generateFlatObject(1000), b: null },

  nestedShallow: { a: generateNestedObject(3, 3), b: null },
  nestedDeep: { a: generateNestedObject(6, 2), b: null },
  nestedWide: { a: generateNestedObject(2, 10), b: null },

  arraySmall: { a: generateArray(10), b: null },
  arrayMedium: { a: generateArray(100), b: null },
  arrayLarge: { a: generateArray(1000), b: null },

  mixed: { a: generateMixedObject(50), b: null },
  user: { a: generateUserRecord(), b: null },
  config: { a: generateConfig(), b: null },

  // Date-containing fixtures
  datesSmall: { a: generateObjectWithDates(10), b: null },
  datesMedium: { a: generateObjectWithDates(50), b: null },
  datesLarge: { a: generateObjectWithDates(100), b: null },
  eventLog: { a: generateEventLog(50), b: null },
  schedule: { a: generateSchedule(), b: null },
};

// Create variants for each fixture
const dateFixtureKeys = ['datesSmall', 'datesMedium', 'datesLarge', 'eventLog', 'schedule'];
for (const key of Object.keys(fixtures)) {
  const f = fixtures[key];
  if (dateFixtureKeys.includes(key)) {
    // Use date-aware clone/mutate for date fixtures
    f.identical = cloneWithDates(f.a);
    f.modified10 = mutateWithDates(f.a, 0.1);
    f.modified50 = mutateWithDates(f.a, 0.5);
  } else {
    f.identical = clone(f.a);
    f.modified10 = mutate(f.a, 0.1);
    f.modified50 = mutate(f.a, 0.5);
    f.totallyDifferent = typeof f.a === 'object' && Array.isArray(f.a)
      ? generateArray(f.a.length)
      : generateFlatObject(Object.keys(f.a).length);
  }
}

console.log('deep-diff benchmark');
console.log(`Node.js ${process.version}`);
console.log(`Warmup: ${WARMUP_ITERATIONS} iterations, Benchmark: ~1s per test`);
console.log(`Tip: Run with --expose-gc for more accurate results`);

// Identical objects (fast path)
runSuite('Identical Objects (no differences)', [
  { name: 'flat-10-identical', fn: () => diff(fixtures.flatSmall.a, fixtures.flatSmall.identical), iterations: 550000 },
  { name: 'flat-100-identical', fn: () => diff(fixtures.flatMedium.a, fixtures.flatMedium.identical), iterations: 72000 },
  { name: 'flat-1000-identical', fn: () => diff(fixtures.flatLarge.a, fixtures.flatLarge.identical), iterations: 6500 },
  { name: 'nested-3x3-identical', fn: () => diff(fixtures.nestedShallow.a, fixtures.nestedShallow.identical), iterations: 115000 },
  { name: 'nested-6x2-identical', fn: () => diff(fixtures.nestedDeep.a, fixtures.nestedDeep.identical), iterations: 40000 },
  { name: 'array-100-identical', fn: () => diff(fixtures.arrayMedium.a, fixtures.arrayMedium.identical), iterations: 28000 },
]);

// Flat objects with modifications
runSuite('Flat Objects', [
  { name: 'flat-10-modified-10%', fn: () => diff(fixtures.flatSmall.a, fixtures.flatSmall.modified10), iterations: 650000 },
  { name: 'flat-100-modified-10%', fn: () => diff(fixtures.flatMedium.a, fixtures.flatMedium.modified10), iterations: 65000 },
  { name: 'flat-100-modified-50%', fn: () => diff(fixtures.flatMedium.a, fixtures.flatMedium.modified50), iterations: 65000 },
  { name: 'flat-1000-modified-10%', fn: () => diff(fixtures.flatLarge.a, fixtures.flatLarge.modified10), iterations: 6000 },
  { name: 'flat-1000-modified-50%', fn: () => diff(fixtures.flatLarge.a, fixtures.flatLarge.modified50), iterations: 5500 },
]);

// Nested objects
runSuite('Nested Objects', [
  { name: 'nested-3x3-modified-10%', fn: () => diff(fixtures.nestedShallow.a, fixtures.nestedShallow.modified10), iterations: 125000 },
  { name: 'nested-6x2-modified-10%', fn: () => diff(fixtures.nestedDeep.a, fixtures.nestedDeep.modified10), iterations: 42000 },
  { name: 'nested-2x10-modified-10%', fn: () => diff(fixtures.nestedWide.a, fixtures.nestedWide.modified10), iterations: 40000 },
]);

// Arrays
runSuite('Arrays', [
  { name: 'array-10-modified-10%', fn: () => diff(fixtures.arraySmall.a, fixtures.arraySmall.modified10), iterations: 270000 },
  { name: 'array-100-modified-10%', fn: () => diff(fixtures.arrayMedium.a, fixtures.arrayMedium.modified10), iterations: 29000 },
  { name: 'array-100-modified-50%', fn: () => diff(fixtures.arrayMedium.a, fixtures.arrayMedium.modified50), iterations: 29000 },
  { name: 'array-1000-modified-10%', fn: () => diff(fixtures.arrayLarge.a, fixtures.arrayLarge.modified10), iterations: 3000 },
]);

// Real-world objects
runSuite('Real-World Objects', [
  { name: 'user-record-modified', fn: () => diff(fixtures.user.a, fixtures.user.modified10), iterations: 220000 },
  { name: 'config-modified', fn: () => diff(fixtures.config.a, fixtures.config.modified10), iterations: 290000 },
  { name: 'mixed-50-modified', fn: () => diff(fixtures.mixed.a, fixtures.mixed.modified10), iterations: 50000 },
]);

// Objects with Date values
runSuite('Objects with Dates', [
  { name: 'dates-10-identical', fn: () => diff(fixtures.datesSmall.a, fixtures.datesSmall.identical), iterations: 180000 },
  { name: 'dates-50-identical', fn: () => diff(fixtures.datesMedium.a, fixtures.datesMedium.identical), iterations: 50000 },
  { name: 'dates-100-identical', fn: () => diff(fixtures.datesLarge.a, fixtures.datesLarge.identical), iterations: 25000 },
  { name: 'dates-10-modified', fn: () => diff(fixtures.datesSmall.a, fixtures.datesSmall.modified10), iterations: 185000 },
  { name: 'dates-50-modified', fn: () => diff(fixtures.datesMedium.a, fixtures.datesMedium.modified10), iterations: 50000 },
  { name: 'dates-100-modified', fn: () => diff(fixtures.datesLarge.a, fixtures.datesLarge.modified10), iterations: 25000 },
  { name: 'event-log-50-modified', fn: () => diff(fixtures.eventLog.a, fixtures.eventLog.modified10), iterations: 28000 },
  { name: 'schedule-modified', fn: () => diff(fixtures.schedule.a, fixtures.schedule.modified10), iterations: 370000 },
]);

// Apply diff with Dates
runSuite('Apply Diff with Dates', [
  {
    name: 'applyDiff-dates-50',
    iterations: 36000,
    fn: () => {
      const target = cloneWithDates(fixtures.datesMedium.a);
      const differences = diff(fixtures.datesMedium.a, fixtures.datesMedium.modified10);
      applyDiff(target, differences);
    },
  },
  {
    name: 'applyDiff-event-log-50',
    iterations: 21000,
    fn: () => {
      const target = cloneWithDates(fixtures.eventLog.a);
      const differences = diff(fixtures.eventLog.a, fixtures.eventLog.modified10);
      applyDiff(target, differences);
    },
  },
  {
    name: 'applyDiff-schedule',
    iterations: 240000,
    fn: () => {
      const target = cloneWithDates(fixtures.schedule.a);
      const differences = diff(fixtures.schedule.a, fixtures.schedule.modified10);
      applyDiff(target, differences);
    },
  },
]);

// Round-trip with Dates (including JSON serialization)
runSuite('Round-Trip with Dates (JSON serialize/deserialize)', [
  {
    name: 'roundtrip-dates-50-json',
    iterations: 28000,
    fn: () => {
      const differences = diff(fixtures.datesMedium.a, fixtures.datesMedium.modified10);
      if (differences) {
        const json = JSON.stringify(differences);
        const parsed = JSON.parse(json);
        const target = cloneWithDates(fixtures.datesMedium.a);
        applyDiff(target, parsed);
      }
    },
  },
  {
    name: 'roundtrip-event-log-json',
    iterations: 20000,
    fn: () => {
      const differences = diff(fixtures.eventLog.a, fixtures.eventLog.modified10);
      if (differences) {
        const json = JSON.stringify(differences);
        const parsed = JSON.parse(json);
        const target = cloneWithDates(fixtures.eventLog.a);
        applyDiff(target, parsed);
      }
    },
  },
  {
    name: 'roundtrip-schedule-json',
    iterations: 80000,
    fn: () => {
      const differences = diff(fixtures.schedule.a, fixtures.schedule.modified10);
      if (differences) {
        const json = JSON.stringify(differences);
        const parsed = JSON.parse(json);
        const target = cloneWithDates(fixtures.schedule.a);
        applyDiff(target, parsed);
      }
    },
  },
]);

// Apply diff
runSuite('Apply Diff', [
  {
    name: 'applyDiff-flat-100',
    iterations: 36000,
    fn: () => {
      const target = clone(fixtures.flatMedium.a);
      const differences = diff(fixtures.flatMedium.a, fixtures.flatMedium.modified10);
      applyDiff(target, differences);
    },
  },
  {
    name: 'applyDiff-nested-6x2',
    iterations: 21000,
    fn: () => {
      const target = clone(fixtures.nestedDeep.a);
      const differences = diff(fixtures.nestedDeep.a, fixtures.nestedDeep.modified10);
      applyDiff(target, differences);
    },
  },
  {
    name: 'applyDiff-array-100',
    iterations: 19000,
    fn: () => {
      const target = clone(fixtures.arrayMedium.a);
      const differences = diff(fixtures.arrayMedium.a, fixtures.arrayMedium.modified10);
      applyDiff(target, differences);
    },
  },
]);

// Full round-trip (diff + apply)
runSuite('Full Round-Trip (diff + apply)', [
  {
    name: 'roundtrip-flat-100',
    iterations: 37000,
    fn: () => {
      const target = clone(fixtures.flatMedium.a);
      applyDiff(target, diff(fixtures.flatMedium.a, fixtures.flatMedium.modified10));
    },
  },
  {
    name: 'roundtrip-user-record',
    iterations: 83000,
    fn: () => {
      const target = clone(fixtures.user.a);
      applyDiff(target, diff(fixtures.user.a, fixtures.user.modified10));
    },
  },
  {
    name: 'roundtrip-config',
    iterations: 155000,
    fn: () => {
      const target = clone(fixtures.config.a);
      applyDiff(target, diff(fixtures.config.a, fixtures.config.modified10));
    },
  },
]);

console.log('\n' + '='.repeat(120));
console.log('  Benchmark complete');
console.log('='.repeat(120) + '\n');
