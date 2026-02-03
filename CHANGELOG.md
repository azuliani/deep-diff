# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-02-03

### Added

- Initial TypeScript implementation
- Core diffing functionality with `diff(lhs, rhs)`
- Apply and revert operations: `applyDiff`, `applyChange`, `revertChange`
- Difference classes: `DiffEdit`, `DiffNew`, `DiffDeleted`, `DiffArray`
- Array item classes: `DiffNewItem`, `DiffDeletedItem`
- Type guards: `isDiffEdit`, `isDiffNew`, `isDiffDeleted`, `isDiffArray`, `isDiffNewItem`, `isDiffDeletedItem`
- `DiffError` class with error codes for structured error handling
- JSON serialization support with automatic Date restoration via `$dates` metadata
- Full TypeScript type exports: `AnyDiff`, `DiffKind`, `PropertyPath`, `ArrayItemDiff`, `RealType`
- Dual ESM/CommonJS package distribution
- Circular reference detection to prevent infinite loops
- Extended type detection for Date, RegExp, arrays, and null values
