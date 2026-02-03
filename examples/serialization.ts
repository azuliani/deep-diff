/**
 * JSON serialization example for @azuliani/deep-diff
 * Demonstrates Date handling with $dates metadata
 *
 * Run with: node --experimental-strip-types examples/serialization.ts
 */

import { diff, applyDiff } from '../src/index.ts';

// Objects with Date values
const before = {
  event: 'Conference',
  startDate: new Date('2024-01-15'),
  endDate: new Date('2024-01-17'),
  metadata: {
    created: new Date('2023-12-01'),
  },
};

const after = {
  event: 'Conference 2024',
  startDate: new Date('2024-06-15'),
  endDate: new Date('2024-06-17'),
  metadata: {
    created: new Date('2023-12-01'),
    updated: new Date('2024-05-01'),
  },
};

console.log('Before:', before);
console.log('After:', after);

// Compute diff
const differences = diff(before, after);

if (differences) {
  console.log('\nDifferences (with $dates metadata):');
  console.log(JSON.stringify(differences, null, 2));

  // Simulate sending over network (JSON round-trip)
  const json = JSON.stringify(differences);
  console.log('\nSerialized JSON:', json);

  // Parse back
  const restored = JSON.parse(json);
  console.log('\nParsed back from JSON:', restored);

  // Apply to a fresh copy
  const target = {
    event: 'Conference',
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-01-17'),
    metadata: {
      created: new Date('2023-12-01'),
    },
  };

  applyDiff(target, restored);

  console.log('\nAfter applyDiff on target:');
  console.log('  event:', target.event);
  console.log('  startDate:', target.startDate, '(instanceof Date:', target.startDate instanceof Date, ')');
  console.log('  endDate:', target.endDate, '(instanceof Date:', target.endDate instanceof Date, ')');
  console.log('  metadata.updated:', (target.metadata as Record<string, unknown>).updated);
}
