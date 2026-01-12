# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Instructions

- Never use emoji in code, comments, commit messages, or documentation
- Never add Co-Authored-By lines to commit messages

## Project Overview

deep-diff is a CommonJS library for computing structural differences between objects. It produces detailed difference records that can be used to detect changes, apply patches, or revert modifications.

**Requires Node.js 18+**

## Running the Code

```javascript
const { diff, applyDiff } = require('./index.js');

const a = { name: 'Alice', age: 30 };
const b = { name: 'Bob', age: 25 };

const differences = diff(a, b);
applyDiff(a, differences);  // a now equals b
```

No build step required. No external dependencies.

## Testing

Uses Node's built-in test runner (no dependencies to install):

```bash
npm test
```

## Project Structure

```
index.js           # Public API exports
lib/
  types.js         # Diff classes (Diff, DiffEdit, DiffNew, DiffDeleted, DiffArray)
  utils.js         # Utilities (arrayRemove, realTypeOf)
  diff.js          # Core diff logic (deepDiff, accumulateDiff)
  apply.js         # Apply/revert logic (applyChange, revertChange, applyDiff)
test/
  diff.test.js     # Tests for diff() and observableDiff()
  apply.test.js    # Tests for applyChange(), revertChange(), applyDiff()
```

## Architecture

The library centers on a recursive `deepDiff()` function that traverses two object trees simultaneously, emitting difference records via a callback.

### Difference Types (kind property)

- `N` (DiffNew): Property/element exists only in rhs
- `D` (DiffDeleted): Property/element exists only in lhs
- `E` (DiffEdit): Property exists in both but values differ
- `A` (DiffArray): Array modification, wraps another diff in `item` property

All diff types are ES6 classes extending `Diff` base class. Each includes a `path` array showing the property path to the change.

### Public API (index.js)

- `diff(lhs, rhs)` - Returns array of differences, or undefined if identical
- `observableDiff(lhs, rhs, callback)` - Calls callback for each difference found
- `applyChange(target, source, change)` - Apply a single diff (sets rhs values)
- `revertChange(target, source, change)` - Revert a single diff (sets lhs values)
- `applyDiff(target, differences)` - Apply diff array; `applyDiff(before, diff(before, after))` makes before equal after

### Type Detection (lib/utils.js)

`realTypeOf()` provides extended type detection beyond `typeof`, distinguishing: array, date, regexp, null, math object.
