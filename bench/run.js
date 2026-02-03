import { diff, applyDiff } from '../dist/esm/index.js';
import {
  generateFlatObject,
  generateNestedObject,
  generateArray,
  generateMixedObject,
  generateUserRecord,
  generateConfig,
  clone,
  mutate,
} from './fixtures.js';

const WARMUP_ITERATIONS = 100;
const BENCHMARK_ITERATIONS = 1000;

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
};

// Create variants for each fixture
for (const key of Object.keys(fixtures)) {
  const f = fixtures[key];
  f.identical = clone(f.a);
  f.modified10 = mutate(f.a, 0.1);
  f.modified50 = mutate(f.a, 0.5);
  f.totallyDifferent = typeof f.a === 'object' && Array.isArray(f.a)
    ? generateArray(f.a.length)
    : generateFlatObject(Object.keys(f.a).length);
}

console.log('deep-diff benchmark');
console.log(`Node.js ${process.version}`);
console.log(`Warmup: ${WARMUP_ITERATIONS} iterations, Benchmark: ${BENCHMARK_ITERATIONS} iterations`);
console.log(`Tip: Run with --expose-gc for more accurate results`);

// Identical objects (fast path)
runSuite('Identical Objects (no differences)', [
  { name: 'flat-10-identical', fn: () => diff(fixtures.flatSmall.a, fixtures.flatSmall.identical) },
  { name: 'flat-100-identical', fn: () => diff(fixtures.flatMedium.a, fixtures.flatMedium.identical) },
  { name: 'flat-1000-identical', fn: () => diff(fixtures.flatLarge.a, fixtures.flatLarge.identical) },
  { name: 'nested-3x3-identical', fn: () => diff(fixtures.nestedShallow.a, fixtures.nestedShallow.identical) },
  { name: 'nested-6x2-identical', fn: () => diff(fixtures.nestedDeep.a, fixtures.nestedDeep.identical) },
  { name: 'array-100-identical', fn: () => diff(fixtures.arrayMedium.a, fixtures.arrayMedium.identical) },
]);

// Flat objects with modifications
runSuite('Flat Objects', [
  { name: 'flat-10-modified-10%', fn: () => diff(fixtures.flatSmall.a, fixtures.flatSmall.modified10) },
  { name: 'flat-100-modified-10%', fn: () => diff(fixtures.flatMedium.a, fixtures.flatMedium.modified10) },
  { name: 'flat-100-modified-50%', fn: () => diff(fixtures.flatMedium.a, fixtures.flatMedium.modified50) },
  { name: 'flat-1000-modified-10%', fn: () => diff(fixtures.flatLarge.a, fixtures.flatLarge.modified10) },
  { name: 'flat-1000-modified-50%', fn: () => diff(fixtures.flatLarge.a, fixtures.flatLarge.modified50) },
]);

// Nested objects
runSuite('Nested Objects', [
  { name: 'nested-3x3-modified-10%', fn: () => diff(fixtures.nestedShallow.a, fixtures.nestedShallow.modified10) },
  { name: 'nested-6x2-modified-10%', fn: () => diff(fixtures.nestedDeep.a, fixtures.nestedDeep.modified10) },
  { name: 'nested-2x10-modified-10%', fn: () => diff(fixtures.nestedWide.a, fixtures.nestedWide.modified10) },
]);

// Arrays
runSuite('Arrays', [
  { name: 'array-10-modified-10%', fn: () => diff(fixtures.arraySmall.a, fixtures.arraySmall.modified10) },
  { name: 'array-100-modified-10%', fn: () => diff(fixtures.arrayMedium.a, fixtures.arrayMedium.modified10) },
  { name: 'array-100-modified-50%', fn: () => diff(fixtures.arrayMedium.a, fixtures.arrayMedium.modified50) },
  { name: 'array-1000-modified-10%', fn: () => diff(fixtures.arrayLarge.a, fixtures.arrayLarge.modified10) },
]);

// Real-world objects
runSuite('Real-World Objects', [
  { name: 'user-record-modified', fn: () => diff(fixtures.user.a, fixtures.user.modified10) },
  { name: 'config-modified', fn: () => diff(fixtures.config.a, fixtures.config.modified10) },
  { name: 'mixed-50-modified', fn: () => diff(fixtures.mixed.a, fixtures.mixed.modified10) },
]);

// Apply diff
runSuite('Apply Diff', [
  {
    name: 'applyDiff-flat-100',
    fn: () => {
      const target = clone(fixtures.flatMedium.a);
      const differences = diff(fixtures.flatMedium.a, fixtures.flatMedium.modified10);
      applyDiff(target, differences);
    },
  },
  {
    name: 'applyDiff-nested-6x2',
    fn: () => {
      const target = clone(fixtures.nestedDeep.a);
      const differences = diff(fixtures.nestedDeep.a, fixtures.nestedDeep.modified10);
      applyDiff(target, differences);
    },
  },
  {
    name: 'applyDiff-array-100',
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
    fn: () => {
      const target = clone(fixtures.flatMedium.a);
      applyDiff(target, diff(fixtures.flatMedium.a, fixtures.flatMedium.modified10));
    },
  },
  {
    name: 'roundtrip-user-record',
    fn: () => {
      const target = clone(fixtures.user.a);
      applyDiff(target, diff(fixtures.user.a, fixtures.user.modified10));
    },
  },
  {
    name: 'roundtrip-config',
    fn: () => {
      const target = clone(fixtures.config.a);
      applyDiff(target, diff(fixtures.config.a, fixtures.config.modified10));
    },
  },
]);

console.log('\n' + '='.repeat(120));
console.log('  Benchmark complete');
console.log('='.repeat(120) + '\n');
