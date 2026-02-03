/**
 * Error handling example for @azuliani/deep-diff
 * Demonstrates DiffError class and error codes
 *
 * Run with: node --experimental-strip-types examples/error-handling.ts
 */

import { diff, applyChange, revertChange, DiffError, DiffEdit } from '../src/index.ts';

console.log('=== DiffError Examples ===\n');

// Example 1: Invalid target (null)
console.log('1. Applying change to null target:');
try {
  const change = new DiffEdit(['name'], 'Alice', 'Bob');
  applyChange(null as unknown as Record<string, unknown>, {}, change);
} catch (e) {
  if (e instanceof DiffError) {
    console.log(`   DiffError caught!`);
    console.log(`   Code: ${e.code}`);
    console.log(`   Message: ${e.message}`);
  }
}

// Example 2: Invalid target (primitive)
console.log('\n2. Applying change to primitive target:');
try {
  const change = new DiffEdit(['name'], 'Alice', 'Bob');
  applyChange('string' as unknown as Record<string, unknown>, {}, change);
} catch (e) {
  if (e instanceof DiffError) {
    console.log(`   DiffError caught!`);
    console.log(`   Code: ${e.code}`);
    console.log(`   Message: ${e.message}`);
  }
}

// Example 3: Path traversal through non-object
console.log('\n3. Traversing path through non-object:');
try {
  const target = { name: 'Alice' };
  const change = new DiffEdit(['name', 'first'], 'Alice', 'Bob');
  applyChange(target, {}, change);
} catch (e) {
  if (e instanceof DiffError) {
    console.log(`   DiffError caught!`);
    console.log(`   Code: ${e.code}`);
    console.log(`   Message: ${e.message}`);
  }
}

// Example 4: Revert with empty path
console.log('\n4. Reverting change with no path:');
try {
  const target = { name: 'Bob' };
  // Root-level change has no path
  const differences = diff('Alice', 'Bob');
  if (differences) {
    revertChange(target, {}, differences[0]);
  }
} catch (e) {
  if (e instanceof DiffError) {
    console.log(`   DiffError caught!`);
    console.log(`   Code: ${e.code}`);
    console.log(`   Message: ${e.message}`);
  }
}

// Example 5: Programmatic error handling
console.log('\n5. Programmatic error code handling:');
try {
  applyChange(null as unknown as Record<string, unknown>, {}, new DiffEdit(['x'], 1, 2));
} catch (e) {
  if (e instanceof DiffError) {
    switch (e.code) {
      case 'INVALID_TARGET':
        console.log('   Target is invalid - check your input object');
        break;
      case 'INVALID_CHANGE':
        console.log('   Change is malformed - check the diff structure');
        break;
      case 'NOT_OBJECT':
        console.log('   Path traversal failed - intermediate value is not an object');
        break;
      case 'EMPTY_PATH':
        console.log('   Operation requires a path - cannot revert root-level changes');
        break;
      default:
        console.log('   Unknown error:', e.code);
    }
  }
}
