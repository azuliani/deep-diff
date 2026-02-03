# deep-diff

Compute structural differences between JavaScript objects. Produces detailed difference records that can be used to detect changes, apply patches, or transform objects.

## Installation

```bash
npm install github:azuliani/deep-diff
```

Requires Node.js 23.6+ (for native TypeScript stripping).

## Usage

### ESM (recommended)

```typescript
import { diff, applyDiff } from 'deep-diff';

const before = { name: 'Alice', age: 30 };
const after = { name: 'Bob', age: 25 };

const differences = diff(before, after);
// [
//   { kind: 'E', path: ['name'], lhs: 'Alice', rhs: 'Bob' },
//   { kind: 'E', path: ['age'], lhs: 30, rhs: 25 }
// ]

applyDiff(before, differences);
// before is now { name: 'Bob', age: 25 }
```

### CommonJS

```javascript
const { diff, applyDiff } = require('deep-diff');

const differences = diff(before, after);
applyDiff(before, differences);
```

## API

### diff(lhs, rhs)

Returns an array of differences between two objects, or `undefined` if identical.

### applyDiff(target, differences)

Applies an array of differences to transform `target`.

`applyDiff(before, diff(before, after))` makes `before` equal `after`.

### applyChange(target, source, change)

Applies a single difference (sets `rhs` values).

### revertChange(target, source, change)

Reverts a single difference (restores `lhs` values).

## Difference Types

Each difference has a `kind` property:

| Kind | Description | Properties |
|------|-------------|------------|
| `E` | Edit | `path`, `lhs`, `rhs` |
| `N` | New | `path`, `rhs` |
| `D` | Deleted | `path`, `lhs` |
| `A` | Array | `path`, `index`, `item` |

- `path` - Array of property keys to the changed value
- `lhs` - Original value (left-hand side)
- `rhs` - New value (right-hand side)
- `index` - Array index (for kind `A`)
- `item` - Nested difference (for kind `A`)

## TypeScript

Full TypeScript support with exported types:

```typescript
import { diff, AnyDiff, DiffKind, PropertyPath } from 'deep-diff';

const differences: AnyDiff[] | undefined = diff(obj1, obj2);
```

## License

MIT
