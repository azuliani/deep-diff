/**
 * Basic usage example for @azuliani/deep-diff
 *
 * Run with: node --experimental-strip-types examples/basic-usage.ts
 */

import { diff, applyDiff, isDiffEdit, isDiffNew, isDiffDeleted } from '../src/index.ts';

// Two simple objects
const before = { name: 'Alice', age: 30, active: true };
const after = { name: 'Bob', age: 30, role: 'admin' };

// Compute differences
const differences = diff(before, after);

console.log('Before:', before);
console.log('After:', after);
console.log('\nDifferences:');

if (differences) {
  for (const d of differences) {
    if (isDiffEdit(d)) {
      console.log(`  EDIT ${d.path?.join('.')}: ${d.lhs} -> ${d.rhs}`);
    } else if (isDiffNew(d)) {
      console.log(`  NEW ${d.path?.join('.')}: ${d.rhs}`);
    } else if (isDiffDeleted(d)) {
      console.log(`  DELETE ${d.path?.join('.')}: ${d.lhs}`);
    }
  }

  // Apply the differences
  applyDiff(before, differences);
  console.log('\nAfter applyDiff, before is now:', before);
  console.log('Equals after?', JSON.stringify(before) === JSON.stringify(after));
} else {
  console.log('  Objects are identical');
}
