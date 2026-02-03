import { describe, it } from 'node:test';
import assert from 'node:assert';
import { diff, applyDiff } from '../src/index.ts';
import type { AnyDiff } from '../src/index.ts';

describe('JSON serialization of diffs with Date objects', () => {
  describe('JSON.stringify adds $dates marker field', () => {
    it('adds $dates marker for Date values in DiffEdit lhs/rhs', () => {
      const date1 = new Date('2020-01-01T00:00:00.000Z');
      const date2 = new Date('2020-06-15T12:30:00.000Z');
      const diffs = diff({ d: date1 }, { d: date2 })!;

      const json = JSON.stringify(diffs);
      const parsed = JSON.parse(json);

      // lhs/rhs are normal ISO strings
      assert.strictEqual(parsed[0].lhs, '2020-01-01T00:00:00.000Z');
      assert.strictEqual(parsed[0].rhs, '2020-06-15T12:30:00.000Z');
      // $dates marker indicates which fields are Dates
      assert.deepStrictEqual(parsed[0].$dates, [['lhs'], ['rhs']]);
    });

    it('adds $dates marker for Date in DiffNew rhs', () => {
      const date = new Date('2020-01-01T00:00:00.000Z');
      const diffs = diff({}, { d: date })!;

      const json = JSON.stringify(diffs);
      const parsed = JSON.parse(json);

      assert.strictEqual(parsed[0].rhs, '2020-01-01T00:00:00.000Z');
      assert.deepStrictEqual(parsed[0].$dates, [['rhs']]);
    });

    it('adds $dates marker for Date in DiffDeleted lhs', () => {
      const date = new Date('2020-01-01T00:00:00.000Z');
      const diffs = diff({ d: date }, {})!;

      const json = JSON.stringify(diffs);
      const parsed = JSON.parse(json);

      assert.strictEqual(parsed[0].lhs, '2020-01-01T00:00:00.000Z');
      assert.deepStrictEqual(parsed[0].$dates, [['lhs']]);
    });

    it('adds $dates marker with nested paths for Dates in nested objects', () => {
      const before = { user: { created: new Date('2020-01-01T00:00:00.000Z') } };
      const after = {};
      const diffs = diff(before, after)!;

      const json = JSON.stringify(diffs);
      const parsed = JSON.parse(json);

      // lhs contains the nested object with Date as ISO string
      assert.strictEqual(parsed[0].lhs.created, '2020-01-01T00:00:00.000Z');
      // $dates marker shows path within the diff object
      assert.deepStrictEqual(parsed[0].$dates, [['lhs', 'created']]);
    });

    it('adds $dates marker with paths for Dates in arrays', () => {
      const before = { dates: [new Date('2020-01-01T00:00:00.000Z'), new Date('2020-06-01T00:00:00.000Z')] };
      const after = {};
      const diffs = diff(before, after)!;

      const json = JSON.stringify(diffs);
      const parsed = JSON.parse(json);

      assert.strictEqual(parsed[0].lhs[0], '2020-01-01T00:00:00.000Z');
      assert.strictEqual(parsed[0].lhs[1], '2020-06-01T00:00:00.000Z');
      assert.deepStrictEqual(parsed[0].$dates, [['lhs', 0], ['lhs', 1]]);
    });

    it('adds $dates marker for DiffArray items with Date values', () => {
      const date = new Date('2020-01-01T00:00:00.000Z');
      const diffs = diff({ arr: [] }, { arr: [date] })!;

      const json = JSON.stringify(diffs);
      const parsed = JSON.parse(json);

      assert.strictEqual(parsed[0].item.rhs, '2020-01-01T00:00:00.000Z');
      assert.deepStrictEqual(parsed[0].$dates, [['item', 'rhs']]);
    });

    it('omits $dates field when no Date values present', () => {
      const diffs = diff({ a: 1, b: 'hello' }, { a: 2, b: 'world' })!;

      const json = JSON.stringify(diffs);
      const parsed = JSON.parse(json);

      // No $dates field should be present
      assert.ok(!('$dates' in parsed[0]));
      assert.ok(!('$dates' in parsed[1]));
    });

    it('handles multiple Dates in nested structure', () => {
      const before = {
        user: {
          created: new Date('2020-01-01T00:00:00.000Z'),
          updated: new Date('2020-06-01T00:00:00.000Z'),
        },
      };
      const after = {};
      const diffs = diff(before, after)!;

      const json = JSON.stringify(diffs);
      const parsed = JSON.parse(json);

      assert.deepStrictEqual(parsed[0].$dates, [['lhs', 'created'], ['lhs', 'updated']]);
    });
  });

  describe('applyDiff restores Date objects using $dates marker', () => {
    it('restores Date from marker when applying DiffEdit', () => {
      const date1 = new Date('2020-01-01T00:00:00.000Z');
      const date2 = new Date('2020-06-15T12:30:00.000Z');
      const diffs = diff({ d: date1 }, { d: date2 })!;

      const json = JSON.stringify(diffs);
      const parsed = JSON.parse(json);

      const target = { d: new Date('2020-01-01T00:00:00.000Z') };
      applyDiff(target, parsed);

      assert.ok(target.d instanceof Date);
      assert.strictEqual(target.d.toISOString(), '2020-06-15T12:30:00.000Z');
    });

    it('restores Date from marker when applying DiffNew', () => {
      const date = new Date('2020-01-01T00:00:00.000Z');
      const diffs = diff({}, { d: date })!;

      const json = JSON.stringify(diffs);
      const parsed = JSON.parse(json);

      const target: Record<string, unknown> = {};
      applyDiff(target, parsed);

      assert.ok(target.d instanceof Date);
      assert.strictEqual((target.d as Date).toISOString(), '2020-01-01T00:00:00.000Z');
    });

    it('restores Date in nested structures', () => {
      const before = { user: { lastLogin: new Date('2020-01-01T00:00:00.000Z') } };
      const after = { user: { lastLogin: new Date('2020-06-15T12:30:00.000Z') } };
      const diffs = diff(before, after)!;

      const json = JSON.stringify(diffs);
      const parsed = JSON.parse(json);

      const target = { user: { lastLogin: new Date('2020-01-01T00:00:00.000Z') } };
      applyDiff(target, parsed);

      assert.ok(target.user.lastLogin instanceof Date);
      assert.strictEqual(target.user.lastLogin.toISOString(), '2020-06-15T12:30:00.000Z');
    });

    it('restores Date when adding to array', () => {
      const date = new Date('2020-01-01T00:00:00.000Z');
      const diffs = diff({ arr: [] }, { arr: [date] })!;

      const json = JSON.stringify(diffs);
      const parsed = JSON.parse(json);

      const target = { arr: [] as Date[] };
      applyDiff(target, parsed);

      assert.strictEqual(target.arr.length, 1);
      assert.ok(target.arr[0] instanceof Date);
      assert.strictEqual(target.arr[0].toISOString(), '2020-01-01T00:00:00.000Z');
    });

    it('preserves non-Date values unchanged', () => {
      const diffs = diff({ a: 1, b: 'hello' }, { a: 2, b: 'world' })!;

      const json = JSON.stringify(diffs);
      const parsed = JSON.parse(json);

      const target = { a: 1, b: 'hello' };
      applyDiff(target, parsed);

      assert.strictEqual(target.a, 2);
      assert.strictEqual(target.b, 'world');
    });

    it('ignores $dates marker if not present (backwards compatibility)', () => {
      // Manually construct a diff without $dates marker
      const parsed = [{ kind: 'E', path: ['a'], lhs: 1, rhs: 2 }];

      const target = { a: 1 };
      applyDiff(target, parsed as AnyDiff[]);

      assert.strictEqual(target.a, 2);
    });
  });

  describe('round-trip: full JSON serialization cycle', () => {
    it('applyDiff works after JSON.stringify -> JSON.parse', () => {
      const date1 = new Date('2020-01-01T00:00:00.000Z');
      const date2 = new Date('2020-06-15T12:30:00.000Z');

      const before = { d: date1 };
      const after = { d: date2 };
      const diffs = diff(before, after)!;

      // Simulate sending over network/storage
      const json = JSON.stringify(diffs);
      const parsed = JSON.parse(json);

      // Apply the parsed diff
      const target = { d: new Date('2020-01-01T00:00:00.000Z') };
      applyDiff(target, parsed);

      assert.ok(target.d instanceof Date);
      assert.strictEqual(target.d.toISOString(), '2020-06-15T12:30:00.000Z');
    });

    it('handles complex objects with multiple Date fields', () => {
      const before = {
        user: {
          name: 'Alice',
          createdAt: new Date('2020-01-01T00:00:00.000Z'),
          lastLogin: new Date('2020-06-01T00:00:00.000Z'),
        },
      };
      const after = {
        user: {
          name: 'Alice',
          createdAt: new Date('2020-01-01T00:00:00.000Z'),
          lastLogin: new Date('2020-12-25T10:30:00.000Z'),
        },
      };

      const diffs = diff(before, after)!;
      const json = JSON.stringify(diffs);
      const parsed = JSON.parse(json);

      const target = {
        user: {
          name: 'Alice',
          createdAt: new Date('2020-01-01T00:00:00.000Z'),
          lastLogin: new Date('2020-06-01T00:00:00.000Z'),
        },
      };
      applyDiff(target, parsed);

      assert.ok(target.user.lastLogin instanceof Date);
      assert.strictEqual(target.user.lastLogin.toISOString(), '2020-12-25T10:30:00.000Z');
      // createdAt should be unchanged
      assert.strictEqual(target.user.createdAt.toISOString(), '2020-01-01T00:00:00.000Z');
    });

    it('handles adding new Date property', () => {
      const before: Record<string, unknown> = { name: 'Test' };
      const after = { name: 'Test', createdAt: new Date('2020-01-01T00:00:00.000Z') };

      const diffs = diff(before, after)!;
      const json = JSON.stringify(diffs);
      const parsed = JSON.parse(json);

      const target: Record<string, unknown> = { name: 'Test' };
      applyDiff(target, parsed);

      assert.ok(target.createdAt instanceof Date);
      assert.strictEqual((target.createdAt as Date).toISOString(), '2020-01-01T00:00:00.000Z');
    });

    it('handles removing Date property', () => {
      const before = { name: 'Test', createdAt: new Date('2020-01-01T00:00:00.000Z') };
      const after: Record<string, unknown> = { name: 'Test' };

      const diffs = diff(before, after)!;
      const json = JSON.stringify(diffs);
      const parsed = JSON.parse(json);

      const target: Record<string, unknown> = { name: 'Test', createdAt: new Date('2020-01-01T00:00:00.000Z') };
      applyDiff(target, parsed);

      assert.ok(!('createdAt' in target));
    });

    it('handles array of objects with Date fields', () => {
      const before = {
        events: [
          { name: 'Event 1', date: new Date('2020-01-01T00:00:00.000Z') },
          { name: 'Event 2', date: new Date('2020-02-01T00:00:00.000Z') },
        ],
      };
      const after = {
        events: [
          { name: 'Event 1', date: new Date('2020-01-01T00:00:00.000Z') },
          { name: 'Event 2', date: new Date('2020-03-15T00:00:00.000Z') },
        ],
      };

      const diffs = diff(before, after)!;
      const json = JSON.stringify(diffs);
      const parsed = JSON.parse(json);

      const target = {
        events: [
          { name: 'Event 1', date: new Date('2020-01-01T00:00:00.000Z') },
          { name: 'Event 2', date: new Date('2020-02-01T00:00:00.000Z') },
        ],
      };
      applyDiff(target, parsed);

      assert.ok(target.events[1].date instanceof Date);
      assert.strictEqual(target.events[1].date.toISOString(), '2020-03-15T00:00:00.000Z');
    });

    it('handles adding Date to array', () => {
      const date = new Date('2020-01-01T00:00:00.000Z');
      const before = { dates: [] as Date[] };
      const after = { dates: [date] };

      const diffs = diff(before, after)!;
      const json = JSON.stringify(diffs);
      const parsed = JSON.parse(json);

      const target = { dates: [] as Date[] };
      applyDiff(target, parsed);

      assert.strictEqual(target.dates.length, 1);
      assert.ok(target.dates[0] instanceof Date);
      assert.strictEqual(target.dates[0].toISOString(), '2020-01-01T00:00:00.000Z');
    });
  });

  describe('edge cases', () => {
    it('handles null values correctly', () => {
      const before = { d: new Date('2020-01-01T00:00:00.000Z') };
      const after = { d: null };

      const diffs = diff(before, after as unknown as typeof before)!;
      const json = JSON.stringify(diffs);
      const parsed = JSON.parse(json);

      const target: { d: Date | null } = { d: new Date('2020-01-01T00:00:00.000Z') };
      applyDiff(target, parsed);

      assert.strictEqual(target.d, null);
    });

    it('handles Date changing to non-Date', () => {
      const before = { value: new Date('2020-01-01T00:00:00.000Z') };
      const after = { value: 'not a date anymore' };

      const diffs = diff(before, after as unknown as typeof before)!;
      const json = JSON.stringify(diffs);
      const parsed = JSON.parse(json);

      const target: { value: Date | string } = { value: new Date('2020-01-01T00:00:00.000Z') };
      applyDiff(target, parsed);

      assert.strictEqual(target.value, 'not a date anymore');
    });

    it('handles non-Date changing to Date', () => {
      const before = { value: 'just a string' };
      const after = { value: new Date('2020-01-01T00:00:00.000Z') };

      const diffs = diff(before, after as unknown as typeof before)!;
      const json = JSON.stringify(diffs);
      const parsed = JSON.parse(json);

      const target: { value: string | Date } = { value: 'just a string' };
      applyDiff(target, parsed);

      assert.ok(target.value instanceof Date);
      assert.strictEqual((target.value as Date).toISOString(), '2020-01-01T00:00:00.000Z');
    });

    it('handles deeply nested Date in deleted object', () => {
      const before = {
        level1: {
          level2: {
            level3: {
              timestamp: new Date('2020-01-01T00:00:00.000Z'),
            },
          },
        },
      };
      const after = {};

      const diffs = diff(before, after)!;
      const json = JSON.stringify(diffs);
      const parsed = JSON.parse(json);

      // Verify the $dates marker has the full nested path
      assert.deepStrictEqual(parsed[0].$dates, [['lhs', 'level2', 'level3', 'timestamp']]);
    });

    it('handles mixed Date and non-Date in same object', () => {
      const before = {};
      const after = {
        config: {
          name: 'test',
          count: 42,
          created: new Date('2020-01-01T00:00:00.000Z'),
          tags: ['a', 'b'],
        },
      };

      const diffs = diff(before, after)!;
      const json = JSON.stringify(diffs);
      const parsed = JSON.parse(json);

      // Only the Date field should be in $dates
      assert.deepStrictEqual(parsed[0].$dates, [['rhs', 'created']]);

      // Apply and verify
      const target: Record<string, unknown> = {};
      applyDiff(target, parsed);

      const config = target.config as { name: string; count: number; created: Date; tags: string[] };
      assert.strictEqual(config.name, 'test');
      assert.strictEqual(config.count, 42);
      assert.ok(config.created instanceof Date);
      assert.deepStrictEqual(config.tags, ['a', 'b']);
    });
  });
});
