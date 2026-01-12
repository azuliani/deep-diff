'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { diff, applyChange, revertChange, applyDiff } = require('../index');

describe('applyChange', () => {
  describe('edit changes', () => {
    it('sets property to rhs value', () => {
      const target = { a: 1 };
      const change = { kind: 'E', path: ['a'], lhs: 1, rhs: 2 };
      applyChange(target, null, change);
      assert.strictEqual(target.a, 2);
    });

    it('handles nested property edits', () => {
      const target = { a: { b: 1 } };
      const change = { kind: 'E', path: ['a', 'b'], lhs: 1, rhs: 2 };
      applyChange(target, null, change);
      assert.strictEqual(target.a.b, 2);
    });
  });

  describe('new property changes', () => {
    it('adds new property with rhs value', () => {
      const target = {};
      const change = { kind: 'N', path: ['a'], rhs: 1 };
      applyChange(target, null, change);
      assert.strictEqual(target.a, 1);
    });

    it('adds nested new property', () => {
      const target = { a: {} };
      const change = { kind: 'N', path: ['a', 'b'], rhs: 1 };
      applyChange(target, null, change);
      assert.strictEqual(target.a.b, 1);
    });
  });

  describe('delete changes', () => {
    it('removes property from target', () => {
      const target = { a: 1, b: 2 };
      const change = { kind: 'D', path: ['a'], lhs: 1 };
      applyChange(target, null, change);
      assert.ok(!('a' in target));
      assert.strictEqual(target.b, 2);
    });
  });

  describe('nested paths', () => {
    it('creates intermediate objects if path does not exist', () => {
      const target = {};
      const change = { kind: 'N', path: ['a', 'b', 'c'], rhs: 1 };
      applyChange(target, null, change);
      assert.strictEqual(target.a.b.c, 1);
    });

    it('creates intermediate arrays if path index is numeric', () => {
      const target = {};
      const change = { kind: 'N', path: ['arr', 0], rhs: 'first' };
      applyChange(target, null, change);
      assert.ok(Array.isArray(target.arr));
      assert.strictEqual(target.arr[0], 'first');
    });
  });

  describe('array changes', () => {
    it('applies edit to array element', () => {
      const target = { arr: [1, 2, 3] };
      const change = { kind: 'A', path: ['arr'], index: 1, item: { kind: 'E', lhs: 2, rhs: 20 } };
      applyChange(target, null, change);
      assert.strictEqual(target.arr[1], 20);
    });

    it('applies new array element', () => {
      const target = { arr: [1, 2] };
      const change = { kind: 'A', path: ['arr'], index: 2, item: { kind: 'N', rhs: 3 } };
      applyChange(target, null, change);
      assert.strictEqual(target.arr[2], 3);
    });
  });
});

describe('revertChange', () => {
  describe('edit changes', () => {
    it('sets property to lhs value (original)', () => {
      const target = { a: 2 };
      const change = { kind: 'E', path: ['a'], lhs: 1, rhs: 2 };
      revertChange(target, null, change);
      assert.strictEqual(target.a, 1);
    });
  });

  describe('new property changes', () => {
    it('deletes the property (reverting addition)', () => {
      const target = { a: 1 };
      const change = { kind: 'N', path: ['a'], rhs: 1 };
      revertChange(target, null, change);
      assert.ok(!('a' in target));
    });
  });

  describe('delete changes', () => {
    it('restores property with lhs value', () => {
      const target = {};
      const change = { kind: 'D', path: ['a'], lhs: 1 };
      revertChange(target, null, change);
      assert.strictEqual(target.a, 1);
    });
  });

  describe('array changes', () => {
    it('reverts array element edit', () => {
      const target = { arr: [1, 20, 3] };
      const change = { kind: 'A', path: ['arr'], index: 1, item: { kind: 'E', lhs: 2, rhs: 20 } };
      revertChange(target, null, change);
      assert.strictEqual(target.arr[1], 2);
    });

    it('reverts array element addition by removing it', () => {
      const target = { arr: [1, 2, 3] };
      const change = { kind: 'A', path: ['arr'], index: 2, item: { kind: 'N', rhs: 3 } };
      revertChange(target, null, change);
      assert.deepStrictEqual(target.arr, [1, 2]);
    });

    it('reverts array element deletion by restoring it', () => {
      const target = { arr: [1, 2] };
      const change = { kind: 'A', path: ['arr'], index: 2, item: { kind: 'D', lhs: 3 } };
      revertChange(target, null, change);
      assert.strictEqual(target.arr[2], 3);
    });
  });
});

describe('applyDiff', () => {
  describe('core contract: applyDiff(before, diff(before, after)) makes before equal after', () => {
    it('handles simple property edit', () => {
      const before = { x: 1 };
      const after = { x: 2 };
      applyDiff(before, diff(before, after));
      assert.deepStrictEqual(before, after);
    });

    it('handles multiple property changes', () => {
      const before = { x: 1, y: 2, z: 3 };
      const after = { x: 10, y: 20, z: 30 };
      applyDiff(before, diff(before, after));
      assert.deepStrictEqual(before, after);
    });

    it('handles nested object changes', () => {
      const before = { user: { name: 'Alice', age: 30 } };
      const after = { user: { name: 'Bob', age: 25 } };
      applyDiff(before, diff(before, after));
      assert.deepStrictEqual(before, after);
    });

    it('handles property additions', () => {
      const before = { x: 1 };
      const after = { x: 1, y: 2 };
      applyDiff(before, diff(before, after));
      assert.deepStrictEqual(before, after);
    });

    it('handles property deletions', () => {
      const before = { x: 1, y: 2 };
      const after = { x: 1 };
      applyDiff(before, diff(before, after));
      assert.deepStrictEqual(before, after);
    });

    it('handles mixed add/edit/delete operations', () => {
      const before = { keep: 1, edit: 'original', remove: 'old' };
      const after = { keep: 1, edit: 'changed', add: 'new' };
      applyDiff(before, diff(before, after));
      assert.deepStrictEqual(before, after);
    });
  });

  describe('CRITICAL - array index shifting bug', () => {
    it('correctly removes multiple elements from end of array', () => {
      const before = { items: [1, 2, 3, 4, 5] };
      const after = { items: [1, 2, 3] };
      applyDiff(before, diff(before, after));
      assert.deepStrictEqual(before, after);
    });

    it('correctly removes multiple elements from end of array (larger)', () => {
      const before = { items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] };
      const after = { items: [1] };
      applyDiff(before, diff(before, after));
      assert.deepStrictEqual(before, after);
    });

    it('correctly adds multiple elements to array', () => {
      const before = { items: [1, 2] };
      const after = { items: [1, 2, 3, 4, 5] };
      applyDiff(before, diff(before, after));
      assert.deepStrictEqual(before, after);
    });

    it('handles mixed modifications within array', () => {
      const before = { items: [1, 2, 3] };
      const after = { items: [10, 2, 30] };
      applyDiff(before, diff(before, after));
      assert.deepStrictEqual(before, after);
    });

    it('handles array becoming empty', () => {
      const before = { items: [1, 2, 3] };
      const after = { items: [] };
      applyDiff(before, diff(before, after));
      assert.deepStrictEqual(before, after);
    });

    it('handles empty array gaining elements', () => {
      const before = { items: [] };
      const after = { items: [1, 2, 3] };
      applyDiff(before, diff(before, after));
      assert.deepStrictEqual(before, after);
    });

    it('handles array of objects', () => {
      const before = { items: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] };
      const after = { items: [{ id: 1 }, { id: 2 }] };
      applyDiff(before, diff(before, after));
      assert.deepStrictEqual(before, after);
    });

    it('handles nested arrays', () => {
      const before = { matrix: [[1, 2, 3], [3, 4, 5, 6]] };
      const after = { matrix: [[1, 2], [3, 4]] };
      applyDiff(before, diff(before, after));
      assert.deepStrictEqual(before, after);
    });
  });

  describe('edge cases', () => {
    it('does nothing with empty diff array', () => {
      const target = { a: 1 };
      const original = { ...target };
      applyDiff(target, []);
      assert.deepStrictEqual(target, original);
    });

    it('handles undefined diff (no changes)', () => {
      const target = { a: 1 };
      const original = { ...target };
      applyDiff(target, undefined);
      assert.deepStrictEqual(target, original);
    });

    it('works with deeply nested arrays', () => {
      const before = { deep: { nested: { arr: [1, 2, 3, 4, 5] } } };
      const after = { deep: { nested: { arr: [1, 2] } } };
      applyDiff(before, diff(before, after));
      assert.deepStrictEqual(before, after);
    });

    it('handles complex real-world-like structure', () => {
      const before = {
        users: [
          { id: 1, name: 'Alice', roles: ['admin'] },
          { id: 2, name: 'Bob', roles: ['user'] }
        ],
        settings: { theme: 'dark' }
      };
      const after = {
        users: [
          { id: 1, name: 'Alice', roles: ['admin', 'editor'] },
          { id: 2, name: 'Robert', roles: ['user', 'viewer'] },
          { id: 3, name: 'Charlie', roles: ['guest'] }
        ],
        settings: { theme: 'light', language: 'en' }
      };
      applyDiff(before, diff(before, after));
      assert.deepStrictEqual(before, after);
    });
  });
});
