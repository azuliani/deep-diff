/**
 * The kind of difference detected.
 * - `'N'`: New property (exists only in rhs)
 * - `'D'`: Deleted property (exists only in lhs)
 * - `'E'`: Edited property (exists in both but values differ)
 * - `'A'`: Array modification (wraps another diff in item property)
 */
export type DiffKind = 'N' | 'D' | 'E' | 'A';

/**
 * Path to a property in an object tree.
 * Each element is either a string (object key) or number (array index).
 *
 * @example
 * // Path to obj.users[0].name
 * const path: PropertyPath = ['users', 0, 'name'];
 */
export type PropertyPath = (string | number)[];

/**
 * Represents a new array element.
 * Used inside {@link DiffArray.item} when an element was added to an array.
 * Does not have a path property as the path is on the parent DiffArray.
 *
 * @example
 * // Array [1, 2] changed to [1, 2, 3]
 * // Results in: DiffArray { index: 2, item: DiffNewItem { rhs: 3 } }
 */
export class DiffNewItem {
  /** Discriminator for this diff type */
  readonly kind = 'N' as const;

  /** The new value that was added */
  readonly rhs: unknown;

  /**
   * Paths to Date values within rhs for JSON serialization restoration.
   * Format: `[['rhs'], ['rhs', 'nested', 'date']]`
   * @internal
   */
  $dates?: PropertyPath[];

  /**
   * Creates a new DiffNewItem.
   * @param value - The new array element value
   * @param datePaths - Optional paths to Date values within the value
   */
  constructor(value: unknown, datePaths?: PropertyPath[]) {
    this.rhs = value;
    if (datePaths && datePaths.length > 0) {
      this.$dates = datePaths;
    }
  }
}

/**
 * Represents a deleted array element.
 * Used inside {@link DiffArray.item} when an element was removed from an array.
 * Does not have a path property as the path is on the parent DiffArray.
 *
 * @example
 * // Array [1, 2, 3] changed to [1, 2]
 * // Results in: DiffArray { index: 2, item: DiffDeletedItem { lhs: 3 } }
 */
export class DiffDeletedItem {
  /** Discriminator for this diff type */
  readonly kind = 'D' as const;

  /** The original value that was removed */
  readonly lhs: unknown;

  /**
   * Paths to Date values within lhs for JSON serialization restoration.
   * Format: `[['lhs'], ['lhs', 'nested', 'date']]`
   * @internal
   */
  $dates?: PropertyPath[];

  /**
   * Creates a new DiffDeletedItem.
   * @param value - The deleted array element value
   * @param datePaths - Optional paths to Date values within the value
   */
  constructor(value: unknown, datePaths?: PropertyPath[]) {
    this.lhs = value;
    if (datePaths && datePaths.length > 0) {
      this.$dates = datePaths;
    }
  }
}

/**
 * Union type for array item diffs.
 * Used as the type for {@link DiffArray.item}.
 */
export type ArrayItemDiff = DiffNewItem | DiffDeletedItem;

/**
 * Represents an edited value where a property exists in both lhs and rhs but values differ.
 * Path is omitted for root-level diffs (when comparing primitives directly).
 *
 * @example
 * // { name: 'Alice' } changed to { name: 'Bob' }
 * // Results in: DiffEdit { path: ['name'], lhs: 'Alice', rhs: 'Bob' }
 */
export class DiffEdit {
  /** Discriminator for this diff type */
  readonly kind = 'E' as const;

  /** Path to the changed property. Omitted for root-level changes. */
  readonly path?: PropertyPath;

  /** The original value (left-hand side) */
  readonly lhs: unknown;

  /** The new value (right-hand side) */
  readonly rhs: unknown;

  /**
   * Paths to Date values within lhs/rhs for JSON serialization restoration.
   * Format: `[['lhs'], ['rhs', 'nested', 'date']]`
   * @internal
   */
  $dates?: PropertyPath[];

  /**
   * Creates a new DiffEdit.
   * @param path - Path to the changed property (empty array for root)
   * @param origin - The original value
   * @param value - The new value
   * @param datePaths - Optional paths to Date values
   */
  constructor(path: PropertyPath, origin: unknown, value: unknown, datePaths?: PropertyPath[]) {
    if (path.length) this.path = path;
    this.lhs = origin;
    this.rhs = value;
    if (datePaths && datePaths.length > 0) {
      this.$dates = datePaths;
    }
  }
}

/**
 * Represents a new value where a property exists only in rhs.
 * Path is omitted for root-level diffs (when lhs is undefined).
 *
 * @example
 * // { } changed to { name: 'Alice' }
 * // Results in: DiffNew { path: ['name'], rhs: 'Alice' }
 */
export class DiffNew {
  /** Discriminator for this diff type */
  readonly kind = 'N' as const;

  /** Path to the new property. Omitted for root-level changes. */
  readonly path?: PropertyPath;

  /** The new value (right-hand side) */
  readonly rhs: unknown;

  /**
   * Paths to Date values within rhs for JSON serialization restoration.
   * Format: `[['rhs'], ['rhs', 'nested', 'date']]`
   * @internal
   */
  $dates?: PropertyPath[];

  /**
   * Creates a new DiffNew.
   * @param path - Path to the new property (empty array for root)
   * @param value - The new value
   * @param datePaths - Optional paths to Date values
   */
  constructor(path: PropertyPath, value: unknown, datePaths?: PropertyPath[]) {
    if (path.length) this.path = path;
    this.rhs = value;
    if (datePaths && datePaths.length > 0) {
      this.$dates = datePaths;
    }
  }
}

/**
 * Represents a deleted value where a property exists only in lhs.
 * Path is omitted for root-level diffs (when rhs is undefined).
 *
 * @example
 * // { name: 'Alice' } changed to { }
 * // Results in: DiffDeleted { path: ['name'], lhs: 'Alice' }
 */
export class DiffDeleted {
  /** Discriminator for this diff type */
  readonly kind = 'D' as const;

  /** Path to the deleted property. Omitted for root-level changes. */
  readonly path?: PropertyPath;

  /** The original value that was deleted (left-hand side) */
  readonly lhs: unknown;

  /**
   * Paths to Date values within lhs for JSON serialization restoration.
   * Format: `[['lhs'], ['lhs', 'nested', 'date']]`
   * @internal
   */
  $dates?: PropertyPath[];

  /**
   * Creates a new DiffDeleted.
   * @param path - Path to the deleted property (empty array for root)
   * @param value - The deleted value
   * @param datePaths - Optional paths to Date values
   */
  constructor(path: PropertyPath, value: unknown, datePaths?: PropertyPath[]) {
    if (path.length) this.path = path;
    this.lhs = value;
    if (datePaths && datePaths.length > 0) {
      this.$dates = datePaths;
    }
  }
}

/**
 * Represents an array change where an element was added or removed.
 * The actual change is wrapped in the {@link item} property.
 * Path is omitted for root-level array diffs.
 *
 * @example
 * // { items: [1, 2] } changed to { items: [1, 2, 3] }
 * // Results in: DiffArray { path: ['items'], index: 2, item: DiffNewItem { rhs: 3 } }
 */
export class DiffArray {
  /** Discriminator for this diff type */
  readonly kind = 'A' as const;

  /** Path to the array. Omitted for root-level changes. */
  readonly path?: PropertyPath;

  /** Index of the changed array element */
  readonly index: number;

  /** The nested diff describing the array element change */
  readonly item: ArrayItemDiff;

  /**
   * Paths to Date values within item for JSON serialization restoration.
   * Format: `[['item', 'rhs'], ['item', 'lhs', 'nested']]`
   * @internal
   */
  $dates?: PropertyPath[];

  /**
   * Creates a new DiffArray.
   * @param path - Path to the array (empty array for root)
   * @param index - Index of the changed element
   * @param item - The array item diff (DiffNewItem or DiffDeletedItem)
   */
  constructor(path: PropertyPath, index: number, item: ArrayItemDiff) {
    if (path.length) this.path = path;
    this.index = index;
    this.item = item;
    // Lift $dates from item to this level, prefixing paths with 'item'
    if (item.$dates && item.$dates.length > 0) {
      this.$dates = item.$dates.map((p) => ['item', ...p]);
      delete item.$dates;
    }
  }
}

/**
 * Union type of all top-level diff types.
 * Use type guards ({@link isDiffEdit}, {@link isDiffNew}, etc.) to narrow the type.
 *
 * @example
 * const differences: AnyDiff[] | undefined = diff(obj1, obj2);
 * if (differences) {
 *   for (const d of differences) {
 *     if (isDiffEdit(d)) {
 *       console.log('Edit:', d.lhs, '->', d.rhs);
 *     }
 *   }
 * }
 */
export type AnyDiff = DiffEdit | DiffNew | DiffDeleted | DiffArray;

/**
 * Type guard that checks if a diff is a {@link DiffArray}.
 * @param d - The diff to check
 * @returns `true` if the diff is a DiffArray
 *
 * @example
 * if (isDiffArray(d)) {
 *   console.log('Array change at index', d.index);
 * }
 */
export function isDiffArray(d: AnyDiff): d is DiffArray {
  return d.kind === 'A';
}

/**
 * Type guard that checks if a diff is a {@link DiffEdit}.
 * @param d - The diff to check
 * @returns `true` if the diff is a DiffEdit
 *
 * @example
 * if (isDiffEdit(d)) {
 *   console.log('Changed from', d.lhs, 'to', d.rhs);
 * }
 */
export function isDiffEdit(d: AnyDiff): d is DiffEdit {
  return d.kind === 'E';
}

/**
 * Type guard that checks if a diff is a {@link DiffNew}.
 * @param d - The diff to check
 * @returns `true` if the diff is a DiffNew
 *
 * @example
 * if (isDiffNew(d)) {
 *   console.log('New value:', d.rhs);
 * }
 */
export function isDiffNew(d: AnyDiff): d is DiffNew {
  return d.kind === 'N';
}

/**
 * Type guard that checks if a diff is a {@link DiffDeleted}.
 * @param d - The diff to check
 * @returns `true` if the diff is a DiffDeleted
 *
 * @example
 * if (isDiffDeleted(d)) {
 *   console.log('Deleted value:', d.lhs);
 * }
 */
export function isDiffDeleted(d: AnyDiff): d is DiffDeleted {
  return d.kind === 'D';
}

/**
 * Type guard that checks if an array item diff is a {@link DiffNewItem}.
 * @param d - The array item diff to check
 * @returns `true` if the diff is a DiffNewItem
 *
 * @example
 * if (isDiffArray(d) && isDiffNewItem(d.item)) {
 *   console.log('Added element:', d.item.rhs);
 * }
 */
export function isDiffNewItem(d: ArrayItemDiff): d is DiffNewItem {
  return d.kind === 'N';
}

/**
 * Type guard that checks if an array item diff is a {@link DiffDeletedItem}.
 * @param d - The array item diff to check
 * @returns `true` if the diff is a DiffDeletedItem
 *
 * @example
 * if (isDiffArray(d) && isDiffDeletedItem(d.item)) {
 *   console.log('Removed element:', d.item.lhs);
 * }
 */
export function isDiffDeletedItem(d: ArrayItemDiff): d is DiffDeletedItem {
  return d.kind === 'D';
}
