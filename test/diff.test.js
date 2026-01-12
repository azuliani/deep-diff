'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { diff, observableDiff } = require('../index');

describe('diff', () => {
  describe('identical values return undefined', () => {
    it('returns undefined for identical objects', () => {
      const obj = { a: 1, b: 2 };
      assert.strictEqual(diff(obj, { a: 1, b: 2 }), undefined);
    });

    it('returns undefined for identical arrays', () => {
      assert.strictEqual(diff([1, 2, 3], [1, 2, 3]), undefined);
    });

    it('returns undefined for identical nested structures', () => {
      const obj = { a: { b: { c: 1 } }, arr: [1, 2] };
      assert.strictEqual(diff(obj, { a: { b: { c: 1 } }, arr: [1, 2] }), undefined);
    });

    it('returns undefined for empty objects', () => {
      assert.strictEqual(diff({}, {}), undefined);
    });

    it('returns undefined for empty arrays', () => {
      assert.strictEqual(diff([], []), undefined);
    });
  });

  describe('edit detection (kind: E)', () => {
    it('detects changed primitive property', () => {
      const result = diff({ a: 1 }, { a: 2 });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].kind, 'E');
    });

    it('includes correct path for edits', () => {
      const result = diff({ a: 1 }, { a: 2 });
      assert.deepStrictEqual(result[0].path, ['a']);
    });

    it('lhs contains original value, rhs contains new value', () => {
      const result = diff({ a: 1 }, { a: 2 });
      assert.strictEqual(result[0].lhs, 1);
      assert.strictEqual(result[0].rhs, 2);
    });

    it('detects multiple edits', () => {
      const result = diff({ a: 1, b: 2 }, { a: 10, b: 20 });
      assert.strictEqual(result.length, 2);
      assert.ok(result.every(d => d.kind === 'E'));
    });
  });

  describe('new property detection (kind: N)', () => {
    it('detects property that exists only in rhs', () => {
      const result = diff({}, { a: 1 });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].kind, 'N');
    });

    it('includes correct path for new properties', () => {
      const result = diff({}, { a: 1 });
      assert.deepStrictEqual(result[0].path, ['a']);
    });

    it('rhs contains the new value, no lhs property', () => {
      const result = diff({}, { a: 1 });
      assert.strictEqual(result[0].rhs, 1);
      assert.ok(!('lhs' in result[0]));
    });
  });

  describe('deleted property detection (kind: D)', () => {
    it('detects property that exists only in lhs', () => {
      const result = diff({ a: 1 }, {});
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].kind, 'D');
    });

    it('includes correct path for deleted properties', () => {
      const result = diff({ a: 1 }, {});
      assert.deepStrictEqual(result[0].path, ['a']);
    });

    it('lhs contains the deleted value, no rhs property', () => {
      const result = diff({ a: 1 }, {});
      assert.strictEqual(result[0].lhs, 1);
      assert.ok(!('rhs' in result[0]));
    });
  });

  describe('array change detection (kind: A)', () => {
    it('detects added array elements', () => {
      const result = diff({ arr: [1, 2] }, { arr: [1, 2, 3] });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].kind, 'A');
      assert.strictEqual(result[0].index, 2);
      assert.strictEqual(result[0].item.kind, 'N');
      assert.strictEqual(result[0].item.rhs, 3);
    });

    it('detects removed array elements', () => {
      const result = diff({ arr: [1, 2, 3] }, { arr: [1, 2] });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].kind, 'A');
      assert.strictEqual(result[0].index, 2);
      assert.strictEqual(result[0].item.kind, 'D');
      assert.strictEqual(result[0].item.lhs, 3);
    });

    it('detects modified array elements', () => {
      const result = diff({ arr: [1, 2, 3] }, { arr: [1, 20, 3] });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].kind, 'E');
      assert.deepStrictEqual(result[0].path, ['arr', 1]);
      assert.strictEqual(result[0].lhs, 2);
      assert.strictEqual(result[0].rhs, 20);
    });

    it('detects multiple array additions', () => {
      const result = diff({ arr: [1] }, { arr: [1, 2, 3, 4] });
      assert.strictEqual(result.length, 3);
      assert.ok(result.every(d => d.kind === 'A' && d.item.kind === 'N'));
    });

    it('detects multiple array removals', () => {
      const result = diff({ arr: [1, 2, 3, 4] }, { arr: [1] });
      assert.strictEqual(result.length, 3);
      assert.ok(result.every(d => d.kind === 'A' && d.item.kind === 'D'));
    });
  });

  describe('nested objects', () => {
    it('detects changes in deeply nested properties', () => {
      const lhs = { a: { b: { c: { d: 1 } } } };
      const rhs = { a: { b: { c: { d: 2 } } } };
      const result = diff(lhs, rhs);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].kind, 'E');
    });

    it('path correctly reflects nesting depth', () => {
      const lhs = { a: { b: { c: 1 } } };
      const rhs = { a: { b: { c: 2 } } };
      const result = diff(lhs, rhs);
      assert.deepStrictEqual(result[0].path, ['a', 'b', 'c']);
    });

    it('detects new nested property', () => {
      const lhs = { a: { b: {} } };
      const rhs = { a: { b: { c: 1 } } };
      const result = diff(lhs, rhs);
      assert.strictEqual(result[0].kind, 'N');
      assert.deepStrictEqual(result[0].path, ['a', 'b', 'c']);
    });
  });

  describe('special types', () => {
    it('detects different dates', () => {
      const date1 = new Date('2020-01-01');
      const date2 = new Date('2020-01-02');
      const result = diff({ d: date1 }, { d: date2 });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].kind, 'E');
    });

    it('identical dates return no diff', () => {
      const date1 = new Date('2020-01-01');
      const date2 = new Date('2020-01-01');
      assert.strictEqual(diff({ d: date1 }, { d: date2 }), undefined);
    });

    it('compares RegExp by pattern string', () => {
      const result = diff({ r: /abc/ }, { r: /def/ });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].kind, 'E');
    });

    it('identical RegExp patterns return no diff', () => {
      assert.strictEqual(diff({ r: /abc/g }, { r: /abc/g }), undefined);
    });

    it('detects null vs non-null', () => {
      const result = diff({ a: null }, { a: 1 });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].kind, 'E');
      assert.strictEqual(result[0].lhs, null);
    });

    it('detects non-null vs null', () => {
      const result = diff({ a: 1 }, { a: null });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].rhs, null);
    });

    it('reports type changes as edits', () => {
      const result = diff({ a: '1' }, { a: 1 });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].kind, 'E');
      assert.strictEqual(result[0].lhs, '1');
      assert.strictEqual(result[0].rhs, 1);
    });

    it('detects array to object type change', () => {
      const result = diff({ a: [1, 2] }, { a: { 0: 1, 1: 2 } });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].kind, 'E');
    });
  });

  describe('NaN handling', () => {
    it('NaN compared to NaN produces no diff', () => {
      assert.strictEqual(diff({ a: NaN }, { a: NaN }), undefined);
    });

    it('NaN compared to number produces diff', () => {
      const result = diff({ a: NaN }, { a: 1 });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].kind, 'E');
    });
  });

  describe('circular references', () => {
    it('does not infinite loop on circular object references', () => {
      const obj1 = { a: 1 };
      obj1.self = obj1;
      const obj2 = { a: 2 };
      obj2.self = obj2;

      const result = diff(obj1, obj2);
      assert.notStrictEqual(result, undefined);
      assert.ok(result.some(d => d.path.includes('a')));
    });

    it('handles circular reference in nested object', () => {
      const obj1 = { nested: { value: 1 } };
      obj1.nested.parent = obj1;
      const obj2 = { nested: { value: 2 } };
      obj2.nested.parent = obj2;

      const result = diff(obj1, obj2);
      assert.notStrictEqual(result, undefined);
    });
  });
});

describe('observableDiff', () => {
  it('calls callback for each difference', () => {
    let callCount = 0;
    observableDiff({ a: 1, b: 2 }, { a: 10, b: 20 }, () => callCount++);
    assert.strictEqual(callCount, 2);
  });

  it('callback receives properly structured diff objects', () => {
    const diffs = [];
    observableDiff({ a: 1 }, { a: 2 }, (d) => diffs.push(d));

    assert.strictEqual(diffs.length, 1);
    assert.strictEqual(diffs[0].kind, 'E');
    assert.ok('path' in diffs[0]);
    assert.strictEqual(diffs[0].lhs, 1);
    assert.strictEqual(diffs[0].rhs, 2);
  });

  it('does not call callback when objects are identical', () => {
    let callCount = 0;
    observableDiff({ a: 1 }, { a: 1 }, () => callCount++);
    assert.strictEqual(callCount, 0);
  });
});
