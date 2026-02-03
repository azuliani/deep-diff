# @azuliani/deep-diff

[![npm version](https://img.shields.io/npm/v/@azuliani/deep-diff.svg)](https://www.npmjs.com/package/@azuliani/deep-diff)
[![CI](https://github.com/azuliani/deep-diff/actions/workflows/ci.yml/badge.svg)](https://github.com/azuliani/deep-diff/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/azuliani/deep-diff/branch/main/graph/badge.svg)](https://codecov.io/gh/azuliani/deep-diff)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Compute structural differences between JavaScript objects. Produces detailed difference records that can be used to detect changes, apply patches, or transform objects.

**Requires Node.js 23.6+** (for native TypeScript stripping)

## Installation

```bash
npm install @azuliani/deep-diff
```

## Quick Start

```typescript
import { diff, applyDiff } from '@azuliani/deep-diff';

const before = { name: 'Alice', age: 30, active: true };
const after = { name: 'Bob', age: 30, role: 'admin' };

const differences = diff(before, after);
// [
//   DiffEdit { kind: 'E', path: ['name'], lhs: 'Alice', rhs: 'Bob' },
//   DiffDeleted { kind: 'D', path: ['active'], lhs: true },
//   DiffNew { kind: 'N', path: ['role'], rhs: 'admin' }
// ]

applyDiff(before, differences);
// before is now { name: 'Bob', age: 30, role: 'admin' }
```

## API

### diff(lhs, rhs)

Computes structural differences between two values.

```typescript
function diff(lhs: unknown, rhs: unknown): AnyDiff[] | undefined;
```

**Parameters:**
- `lhs` - Left-hand side (original) value
- `rhs` - Right-hand side (new) value

**Returns:** Array of differences, or `undefined` if values are identical.

```typescript
const differences = diff(
  { users: [{ name: 'Alice' }] },
  { users: [{ name: 'Bob' }] }
);
// [DiffEdit { kind: 'E', path: ['users', 0, 'name'], lhs: 'Alice', rhs: 'Bob' }]
```

### applyDiff(target, differences)

Applies an array of differences to transform target toward rhs values.

```typescript
function applyDiff(target: object, differences: AnyDiff[] | undefined): void;
```

**Parameters:**
- `target` - The object to modify (mutated in place)
- `differences` - Array of diff objects from `diff()`

```typescript
const obj = { name: 'Alice' };
applyDiff(obj, diff(obj, { name: 'Bob' }));
// obj is now { name: 'Bob' }
```

### applyChange(target, source, change)

Applies a single difference to the target.

```typescript
function applyChange(target: object, source: unknown, change: AnyDiff): void;
```

**Parameters:**
- `target` - The object to modify
- `source` - Source object (unused, kept for API compatibility)
- `change` - Single diff object to apply

**Throws:** `DiffError` if target is invalid or change is malformed.

### revertChange(target, source, change)

Reverts a single difference, restoring the original value.

```typescript
function revertChange(target: object, source: unknown, change: AnyDiff): void;
```

**Parameters:**
- `target` - The object to modify
- `source` - Source object (unused, kept for API compatibility)
- `change` - Single diff object to revert

**Throws:** `DiffError` if target is invalid, change is malformed, or path is empty.

## Difference Types

Each difference object has a `kind` property indicating the type of change:

| Kind | Class | Description | Properties |
|------|-------|-------------|------------|
| `E` | `DiffEdit` | Value changed | `path?`, `lhs`, `rhs` |
| `N` | `DiffNew` | Property added | `path?`, `rhs` |
| `D` | `DiffDeleted` | Property removed | `path?`, `lhs` |
| `A` | `DiffArray` | Array element changed | `path?`, `index`, `item` |

**Properties:**
- `path` - Array of keys to the changed value (omitted for root-level changes)
- `lhs` - Original value (left-hand side)
- `rhs` - New value (right-hand side)
- `index` - Array index (for `DiffArray`)
- `item` - Nested `DiffNewItem` or `DiffDeletedItem` (for `DiffArray`)

### Array Item Types

Array changes use wrapper types for the nested `item`:

| Kind | Class | Description | Properties |
|------|-------|-------------|------------|
| `N` | `DiffNewItem` | Element added | `rhs` |
| `D` | `DiffDeletedItem` | Element removed | `lhs` |

### Type Guards

Use type guards to narrow diff types:

```typescript
import {
  isDiffEdit,
  isDiffNew,
  isDiffDeleted,
  isDiffArray,
  isDiffNewItem,
  isDiffDeletedItem
} from '@azuliani/deep-diff';

for (const d of differences) {
  if (isDiffEdit(d)) {
    console.log(`Changed ${d.path}: ${d.lhs} -> ${d.rhs}`);
  } else if (isDiffNew(d)) {
    console.log(`Added ${d.path}: ${d.rhs}`);
  } else if (isDiffDeleted(d)) {
    console.log(`Removed ${d.path}: ${d.lhs}`);
  } else if (isDiffArray(d)) {
    console.log(`Array ${d.path}[${d.index}]:`, d.item);
  }
}
```

## Error Handling

The library throws `DiffError` for invalid operations:

```typescript
import { DiffError, applyChange } from '@azuliani/deep-diff';

try {
  applyChange(null, {}, someChange);
} catch (e) {
  if (e instanceof DiffError) {
    console.log(e.code);    // 'INVALID_TARGET'
    console.log(e.message); // 'target cannot be null or undefined'
  }
}
```

**Error Codes:**
- `INVALID_TARGET` - Target is null, undefined, or not an object
- `INVALID_CHANGE` - Change object is malformed or has invalid kind
- `EMPTY_PATH` - Operation requires a non-empty path
- `NOT_OBJECT` - Cannot traverse path through non-object value
- `INVALID_PATH` - Path contains null or undefined segment

## JSON Serialization

Diff objects serialize to JSON and can be restored, including `Date` values:

```typescript
const before = { created: new Date('2024-01-01') };
const after = { created: new Date('2024-06-15') };

const differences = diff(before, after);
const json = JSON.stringify(differences);

// Later...
const restored = JSON.parse(json);
applyDiff(before, restored);
// before.created is a Date object (not a string)
```

The `$dates` property on diff objects tracks paths to Date values, enabling automatic restoration during `applyDiff`.

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import {
  diff,
  applyDiff,
  // Types
  AnyDiff,
  DiffKind,
  PropertyPath,
  ArrayItemDiff,
  // Classes
  DiffEdit,
  DiffNew,
  DiffDeleted,
  DiffArray,
  DiffNewItem,
  DiffDeletedItem,
  // Type guards
  isDiffEdit,
  isDiffNew,
  isDiffDeleted,
  isDiffArray,
  // Error handling
  DiffError,
  RealType
} from '@azuliani/deep-diff';

const differences: AnyDiff[] | undefined = diff(obj1, obj2);
```

## License

[MIT](LICENSE)
