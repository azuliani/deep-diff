// Re-export types
export type { DiffKind, PropertyPath, AnyDiff, ArrayItemDiff } from './types.ts';
export {
  DiffEdit,
  DiffNew,
  DiffDeleted,
  DiffArray,
  DiffNewItem,
  DiffDeletedItem,
} from './types.ts';

// Re-export type guards
export {
  isDiffArray,
  isDiffEdit,
  isDiffNew,
  isDiffDeleted,
  isDiffNewItem,
  isDiffDeletedItem,
} from './types.ts';

// Re-export utility types and classes
export type { RealType } from './utils.ts';
export { DiffError } from './utils.ts';

// Public API
export { diff } from './diff.ts';
export { applyChange, revertChange, applyDiff } from './apply.ts';
