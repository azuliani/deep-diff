/**
 * Nested objects example for @azuliani/deep-diff
 *
 * Run with: node --experimental-strip-types examples/nested-objects.ts
 */

import { diff, applyDiff } from '../src/index.ts';

// Deeply nested objects
const before = {
  user: {
    profile: {
      name: 'Alice',
      settings: {
        theme: 'dark',
        notifications: {
          email: true,
          push: false,
        },
      },
    },
    metadata: {
      createdAt: '2024-01-01',
    },
  },
};

const after = {
  user: {
    profile: {
      name: 'Alice',
      settings: {
        theme: 'light', // changed
        notifications: {
          email: true,
          push: true, // changed
          sms: true, // new
        },
      },
    },
    metadata: {
      createdAt: '2024-01-01',
      updatedAt: '2024-06-15', // new
    },
  },
};

const differences = diff(before, after);

console.log('Differences found:');
if (differences) {
  for (const d of differences) {
    const path = d.path?.join('.') || '(root)';
    console.log(`  [${d.kind}] ${path}`);
    if ('lhs' in d) console.log(`      lhs: ${JSON.stringify(d.lhs)}`);
    if ('rhs' in d) console.log(`      rhs: ${JSON.stringify(d.rhs)}`);
  }

  // Apply differences
  applyDiff(before, differences);
  console.log('\nAfter applying differences:');
  console.log(JSON.stringify(before, null, 2));
}
