import { describe, it } from 'node:test';
import assert from 'node:assert';
import { diff, applyChange, revertChange, applyDiff, DiffError } from '../src/index.ts';
import type { AnyDiff } from '../src/index.ts';

describe('applyChange', () => {
  describe('edit changes', () => {
    it('sets property to rhs value', () => {
      const target: Record<string, unknown> = { a: 1 };
      const change = { kind: 'E' as const, path: ['a'], lhs: 1, rhs: 2 };
      applyChange(target, null, change);
      assert.strictEqual(target.a, 2);
    });

    it('handles nested property edits', () => {
      const target: Record<string, Record<string, unknown>> = { a: { b: 1 } };
      const change = { kind: 'E' as const, path: ['a', 'b'], lhs: 1, rhs: 2 };
      applyChange(target, null, change);
      assert.strictEqual(target.a.b, 2);
    });
  });

  describe('new property changes', () => {
    it('adds new property with rhs value', () => {
      const target: Record<string, unknown> = {};
      const change = { kind: 'N' as const, path: ['a'], rhs: 1 };
      applyChange(target, null, change);
      assert.strictEqual(target.a, 1);
    });

    it('adds nested new property', () => {
      const target: Record<string, Record<string, unknown>> = { a: {} };
      const change = { kind: 'N' as const, path: ['a', 'b'], rhs: 1 };
      applyChange(target, null, change);
      assert.strictEqual(target.a.b, 1);
    });
  });

  describe('delete changes', () => {
    it('removes property from target', () => {
      const target: Record<string, unknown> = { a: 1, b: 2 };
      const change = { kind: 'D' as const, path: ['a'], lhs: 1 };
      applyChange(target, null, change);
      assert.ok(!('a' in target));
      assert.strictEqual(target.b, 2);
    });
  });

  describe('nested paths', () => {
    it('creates intermediate objects if path does not exist', () => {
      const target: Record<string, unknown> = {};
      const change = { kind: 'N' as const, path: ['a', 'b', 'c'], rhs: 1 };
      applyChange(target, null, change);
      assert.strictEqual((target.a as Record<string, Record<string, number>>).b.c, 1);
    });

    it('creates intermediate arrays if path index is numeric', () => {
      const target: Record<string, unknown> = {};
      const change = { kind: 'N' as const, path: ['arr', 0], rhs: 'first' };
      applyChange(target, null, change);
      assert.ok(Array.isArray(target.arr));
      assert.strictEqual((target.arr as string[])[0], 'first');
    });
  });

  describe('array changes', () => {
    it('applies edit to array element', () => {
      const target: Record<string, unknown[]> = { arr: [1, 2, 3] };
      const change = {
        kind: 'A' as const,
        path: ['arr'],
        index: 1,
        item: { kind: 'E' as const, lhs: 2, rhs: 20 },
      };
      applyChange(target, null, change);
      assert.strictEqual(target.arr[1], 20);
    });

    it('applies new array element', () => {
      const target: Record<string, unknown[]> = { arr: [1, 2] };
      const change = {
        kind: 'A' as const,
        path: ['arr'],
        index: 2,
        item: { kind: 'N' as const, rhs: 3 },
      };
      applyChange(target, null, change);
      assert.strictEqual(target.arr[2], 3);
    });
  });
});

describe('revertChange', () => {
  describe('edit changes', () => {
    it('sets property to lhs value (original)', () => {
      const target: Record<string, unknown> = { a: 2 };
      const change = { kind: 'E' as const, path: ['a'], lhs: 1, rhs: 2 };
      revertChange(target, null, change);
      assert.strictEqual(target.a, 1);
    });
  });

  describe('new property changes', () => {
    it('deletes the property (reverting addition)', () => {
      const target: Record<string, unknown> = { a: 1 };
      const change = { kind: 'N' as const, path: ['a'], rhs: 1 };
      revertChange(target, null, change);
      assert.ok(!('a' in target));
    });
  });

  describe('delete changes', () => {
    it('restores property with lhs value', () => {
      const target: Record<string, unknown> = {};
      const change = { kind: 'D' as const, path: ['a'], lhs: 1 };
      revertChange(target, null, change);
      assert.strictEqual(target.a, 1);
    });
  });

  describe('array changes', () => {
    it('reverts array element edit via DiffEdit path', () => {
      // Array element edits are DiffEdit with path including the index,
      // not DiffArray wrapping an edit
      const target: Record<string, unknown[]> = { arr: [1, 20, 3] };
      const change = { kind: 'E' as const, path: ['arr', 1], lhs: 2, rhs: 20 };
      revertChange(target, null, change);
      assert.strictEqual(target.arr[1], 2);
    });

    it('reverts array element addition by removing it', () => {
      const target: Record<string, unknown[]> = { arr: [1, 2, 3] };
      const change = {
        kind: 'A' as const,
        path: ['arr'],
        index: 2,
        item: { kind: 'N' as const, rhs: 3 },
      };
      revertChange(target, null, change);
      assert.deepStrictEqual(target.arr, [1, 2]);
    });

    it('reverts array element deletion by restoring it', () => {
      const target: Record<string, unknown[]> = { arr: [1, 2] };
      const change = {
        kind: 'A' as const,
        path: ['arr'],
        index: 2,
        item: { kind: 'D' as const, lhs: 3 },
      };
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
      const before: Record<string, unknown> = { x: 1 };
      const after = { x: 1, y: 2 };
      applyDiff(before, diff(before, after));
      assert.deepStrictEqual(before, after);
    });

    it('handles property deletions', () => {
      const before: Record<string, unknown> = { x: 1, y: 2 };
      const after = { x: 1 };
      applyDiff(before, diff(before, after));
      assert.deepStrictEqual(before, after);
    });

    it('handles mixed add/edit/delete operations', () => {
      const before: Record<string, unknown> = { keep: 1, edit: 'original', remove: 'old' };
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
      const after = { items: [] as number[] };
      applyDiff(before, diff(before, after));
      assert.deepStrictEqual(before, after);
    });

    it('handles empty array gaining elements', () => {
      const before = { items: [] as number[] };
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
      const before = {
        matrix: [
          [1, 2, 3],
          [3, 4, 5, 6],
        ],
      };
      const after = {
        matrix: [
          [1, 2],
          [3, 4],
        ],
      };
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
          { id: 2, name: 'Bob', roles: ['user'] },
        ],
        settings: { theme: 'dark' },
      };
      const after = {
        users: [
          { id: 1, name: 'Alice', roles: ['admin', 'editor'] },
          { id: 2, name: 'Robert', roles: ['user', 'viewer'] },
          { id: 3, name: 'Charlie', roles: ['guest'] },
        ],
        settings: { theme: 'light', language: 'en' },
      };
      applyDiff(before, diff(before, after));
      assert.deepStrictEqual(before, after);
    });
  });
});

describe('input validation', () => {
  describe('applyChange validation', () => {
    it('throws DiffError for null target', () => {
      const change = { kind: 'E' as const, path: ['a'], lhs: 1, rhs: 2 };
      assert.throws(
        () => applyChange(null as unknown as Record<string, unknown>, null, change),
        (err: Error) => err instanceof DiffError && err.code === 'INVALID_TARGET'
      );
    });

    it('throws DiffError for undefined target', () => {
      const change = { kind: 'E' as const, path: ['a'], lhs: 1, rhs: 2 };
      assert.throws(
        () => applyChange(undefined as unknown as Record<string, unknown>, null, change),
        (err: Error) => err instanceof DiffError && err.code === 'INVALID_TARGET'
      );
    });

    it('throws DiffError for primitive target', () => {
      const change = { kind: 'E' as const, path: ['a'], lhs: 1, rhs: 2 };
      assert.throws(
        () => applyChange('string' as unknown as Record<string, unknown>, null, change),
        (err: Error) => err instanceof DiffError && err.code === 'INVALID_TARGET'
      );
    });

    it('throws DiffError for invalid change kind', () => {
      const target: Record<string, unknown> = { a: 1 };
      const change = { kind: 'X' as const, path: ['a'] } as unknown as AnyDiff;
      assert.throws(
        () => applyChange(target, null, change),
        (err: Error) => err instanceof DiffError && err.code === 'INVALID_CHANGE'
      );
    });

    it('throws DiffError for array change without index', () => {
      const target: Record<string, unknown[]> = { arr: [1, 2, 3] };
      const change = {
        kind: 'A' as const,
        path: ['arr'],
        item: { kind: 'E' as const, lhs: 1, rhs: 2 },
      } as unknown as AnyDiff;
      assert.throws(
        () => applyChange(target, null, change),
        (err: Error) => err instanceof DiffError && err.code === 'INVALID_CHANGE'
      );
    });

    it('throws DiffError for array change without item', () => {
      const target: Record<string, unknown[]> = { arr: [1, 2, 3] };
      const change = { kind: 'A' as const, path: ['arr'], index: 1 } as unknown as AnyDiff;
      assert.throws(
        () => applyChange(target, null, change),
        (err: Error) => err instanceof DiffError && err.code === 'INVALID_CHANGE'
      );
    });
  });

  describe('revertChange validation', () => {
    it('throws DiffError for null target', () => {
      const change = { kind: 'E' as const, path: ['a'], lhs: 1, rhs: 2 };
      assert.throws(
        () => revertChange(null as unknown as Record<string, unknown>, null, change),
        (err: Error) => err instanceof DiffError && err.code === 'INVALID_TARGET'
      );
    });

    it('throws DiffError for empty path', () => {
      const target: Record<string, unknown> = { a: 1 };
      const change = { kind: 'E' as const, path: [] as string[], lhs: 1, rhs: 2 };
      assert.throws(
        () => revertChange(target, null, change),
        (err: Error) => err instanceof DiffError && err.code === 'EMPTY_PATH'
      );
    });

    it('throws DiffError for undefined path', () => {
      const target: Record<string, unknown> = { a: 1 };
      const change = { kind: 'E' as const, lhs: 1, rhs: 2 } as unknown as AnyDiff;
      assert.throws(
        () => revertChange(target, null, change),
        (err: Error) => err instanceof DiffError && err.code === 'EMPTY_PATH'
      );
    });
  });

  describe('path traversal errors', () => {
    it('throws DiffError when traversing into primitive (createMissing=false scenario)', () => {
      // This tests the error path when path traversal encounters a primitive
      // Note: applyChange uses createMissing=true, so this specific error path
      // is less common in practice, but traversePath handles it
      const target: Record<string, unknown> = { a: 'string' };
      const change = { kind: 'E' as const, path: ['a', 'b'], lhs: 1, rhs: 2 };
      assert.throws(
        () => applyChange(target, null, change),
        (err: Error) => err instanceof DiffError && err.code === 'NOT_OBJECT'
      );
    });
  });
});
