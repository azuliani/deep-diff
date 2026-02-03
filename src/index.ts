/**
 * @azuliani/deep-diff - Compute structural differences between JavaScript objects
 *
 * @packageDocumentation
 */

// Re-export types
export type { DiffKind, PropertyPath, AnyDiff, ArrayItemDiff } from './types.ts';

/**
 * Difference class representing an edited value.
 * @see {@link DiffEdit}
 */
export { DiffEdit } from './types.ts';

/**
 * Difference class representing a new value.
 * @see {@link DiffNew}
 */
export { DiffNew } from './types.ts';

/**
 * Difference class representing a deleted value.
 * @see {@link DiffDeleted}
 */
export { DiffDeleted } from './types.ts';

/**
 * Difference class representing an array modification.
 * @see {@link DiffArray}
 */
export { DiffArray } from './types.ts';

/**
 * Difference class representing a new array element.
 * @see {@link DiffNewItem}
 */
export { DiffNewItem } from './types.ts';

/**
 * Difference class representing a deleted array element.
 * @see {@link DiffDeletedItem}
 */
export { DiffDeletedItem } from './types.ts';

// Re-export type guards
export {
  /**
   * Type guard for {@link DiffArray}.
   */
  isDiffArray,
  /**
   * Type guard for {@link DiffEdit}.
   */
  isDiffEdit,
  /**
   * Type guard for {@link DiffNew}.
   */
  isDiffNew,
  /**
   * Type guard for {@link DiffDeleted}.
   */
  isDiffDeleted,
  /**
   * Type guard for {@link DiffNewItem}.
   */
  isDiffNewItem,
  /**
   * Type guard for {@link DiffDeletedItem}.
   */
  isDiffDeletedItem,
} from './types.ts';

// Re-export utility types and classes
export type { RealType } from './utils.ts';

/**
 * Error class for diff operations with structured error codes.
 * @see {@link DiffError}
 */
export { DiffError } from './utils.ts';

// Public API

/**
 * Computes structural differences between two values.
 * @see {@link diff}
 */
export { diff } from './diff.ts';

/**
 * Functions for applying and reverting differences.
 * @see {@link applyChange}
 * @see {@link revertChange}
 * @see {@link applyDiff}
 */
export { applyChange, revertChange, applyDiff } from './apply.ts';
