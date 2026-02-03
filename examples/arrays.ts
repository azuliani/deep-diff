/**
 * Array diffing example for @azuliani/deep-diff
 *
 * Run with: node --experimental-strip-types examples/arrays.ts
 */

import { diff, applyDiff, isDiffArray, isDiffNewItem, isDiffDeletedItem } from '../src/index.ts';

// Array changes
const before = {
  items: [
    { id: 1, name: 'Apple' },
    { id: 2, name: 'Banana' },
    { id: 3, name: 'Cherry' },
  ],
  tags: ['fruit', 'food'],
};

const after = {
  items: [
    { id: 1, name: 'Apple' },
    { id: 2, name: 'Blueberry' }, // modified
    // Cherry removed
    { id: 4, name: 'Date' }, // new item
  ],
  tags: ['fruit', 'food', 'healthy'], // added
};

const differences = diff(before, after);

console.log('Before:', JSON.stringify(before, null, 2));
console.log('\nAfter:', JSON.stringify(after, null, 2));
console.log('\nDifferences:');

if (differences) {
  for (const d of differences) {
    const path = d.path?.join('.') || '(root)';

    if (isDiffArray(d)) {
      if (isDiffNewItem(d.item)) {
        console.log(`  ARRAY ADD at ${path}[${d.index}]: ${JSON.stringify(d.item.rhs)}`);
      } else if (isDiffDeletedItem(d.item)) {
        console.log(`  ARRAY REMOVE at ${path}[${d.index}]: ${JSON.stringify(d.item.lhs)}`);
      }
    } else {
      console.log(`  [${d.kind}] ${path}`);
      if ('lhs' in d) console.log(`      was: ${JSON.stringify(d.lhs)}`);
      if ('rhs' in d) console.log(`      now: ${JSON.stringify(d.rhs)}`);
    }
  }

  // Apply differences
  applyDiff(before, differences);
  console.log('\nAfter applying differences:');
  console.log(JSON.stringify(before, null, 2));
}
