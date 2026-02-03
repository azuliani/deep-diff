# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Instructions

- Never use emoji in code, comments, commit messages, or documentation
- Never add Co-Authored-By lines to commit messages

## Project Overview

deep-diff is a TypeScript library for computing structural differences between objects. It produces detailed difference records that can be used to detect changes, apply patches, or revert modifications.

**Requires Node.js 23.6+** (for native TypeScript stripping)

## Running the Code

ESM (recommended):
```typescript
import { diff, applyDiff } from 'deep-diff';

const a = { name: 'Alice', age: 30 };
const b = { name: 'Bob', age: 25 };

const differences = diff(a, b);
applyDiff(a, differences);  // a now equals b
```

CommonJS:
```javascript
const { diff, applyDiff } = require('deep-diff');
```

## Build

```bash
npm run build
```

Outputs to `dist/esm/` (ESM) and `dist/cjs/` (CommonJS).

## Testing

Uses Node's built-in test runner with native TypeScript support:

```bash
npm test
```

## Project Structure

```
src/                      # TypeScript source
  index.ts                # Public API exports
  types.ts                # Diff classes with types
  utils.ts                # Utility functions
  diff.ts                 # Core diff logic
  apply.ts                # Apply/revert logic
dist/                     # Build output (generated)
  esm/                    # ESM output (.js + .d.ts)
  cjs/                    # CommonJS output (.js + .d.ts)
test/                     # Tests (TypeScript)
  diff.test.ts
  apply.test.ts
bench/                    # Benchmarks (JavaScript, imports from dist)
  fixtures.js
  run.js
tsconfig.json             # Base TypeScript config
tsconfig.esm.json         # ESM build config
tsconfig.cjs.json         # CJS build config
```

## Architecture

The library centers on a recursive internal function that traverses two object trees simultaneously, collecting difference records.

### Difference Types (kind property)

- `N` (DiffNew): Property/element exists only in rhs
- `D` (DiffDeleted): Property/element exists only in lhs
- `E` (DiffEdit): Property exists in both but values differ
- `A` (DiffArray): Array modification, wraps another diff in `item` property

All diff types are ES6 classes extending `Diff` base class. Each includes a `path` array showing the property path to the change.

### Public API (src/index.ts)

- `diff(lhs, rhs)` - Returns array of differences, or undefined if identical
- `applyChange(target, source, change)` - Apply a single diff (sets rhs values)
- `revertChange(target, source, change)` - Revert a single diff (sets lhs values)
- `applyDiff(target, differences)` - Apply diff array; `applyDiff(before, diff(before, after))` makes before equal after

### Exported Types

- `DiffKind` - Union type: 'N' | 'D' | 'E' | 'A'
- `PropertyPath` - Type alias: (string | number)[]
- `AnyDiff` - Union type of all diff classes

### Type Detection (src/utils.ts)

`realTypeOf()` provides extended type detection beyond `typeof`, distinguishing: array, date, regexp, null, math object.
