/**
 * The kind of difference detected.
 * - 'N': New property (exists only in rhs)
 * - 'D': Deleted property (exists only in lhs)
 * - 'E': Edited property (exists in both but values differ)
 * - 'A': Array modification (wraps another diff in item property)
 */
export type DiffKind = 'N' | 'D' | 'E' | 'A';

/**
 * Path to a property in an object tree.
 */
export type PropertyPath = (string | number)[];

/**
 * Represents a new array element (no path, used inside DiffArray.item).
 */
export class DiffNewItem {
  readonly kind = 'N' as const;
  readonly rhs: unknown;
  $dates?: PropertyPath[];

  constructor(value: unknown, datePaths?: PropertyPath[]) {
    this.rhs = value;
    if (datePaths && datePaths.length > 0) {
      this.$dates = datePaths;
    }
  }
}

/**
 * Represents a deleted array element (no path, used inside DiffArray.item).
 */
export class DiffDeletedItem {
  readonly kind = 'D' as const;
  readonly lhs: unknown;
  $dates?: PropertyPath[];

  constructor(value: unknown, datePaths?: PropertyPath[]) {
    this.lhs = value;
    if (datePaths && datePaths.length > 0) {
      this.$dates = datePaths;
    }
  }
}

/**
 * Union type for array item diffs (no path).
 */
export type ArrayItemDiff = DiffNewItem | DiffDeletedItem;

/**
 * Represents an edited value (property exists in both lhs and rhs but values differ).
 * Path is omitted for root-level diffs.
 */
export class DiffEdit {
  readonly kind = 'E' as const;
  readonly path?: PropertyPath;
  readonly lhs: unknown;
  readonly rhs: unknown;
  $dates?: PropertyPath[];

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
 * Represents a new value (property exists only in rhs).
 * Path is omitted for root-level diffs.
 */
export class DiffNew {
  readonly kind = 'N' as const;
  readonly path?: PropertyPath;
  readonly rhs: unknown;
  $dates?: PropertyPath[];

  constructor(path: PropertyPath, value: unknown, datePaths?: PropertyPath[]) {
    if (path.length) this.path = path;
    this.rhs = value;
    if (datePaths && datePaths.length > 0) {
      this.$dates = datePaths;
    }
  }
}

/**
 * Represents a deleted value (property exists only in lhs).
 * Path is omitted for root-level diffs.
 */
export class DiffDeleted {
  readonly kind = 'D' as const;
  readonly path?: PropertyPath;
  readonly lhs: unknown;
  $dates?: PropertyPath[];

  constructor(path: PropertyPath, value: unknown, datePaths?: PropertyPath[]) {
    if (path.length) this.path = path;
    this.lhs = value;
    if (datePaths && datePaths.length > 0) {
      this.$dates = datePaths;
    }
  }
}

/**
 * Represents an array change (wraps an ArrayItemDiff in the item property).
 * Path is omitted for root-level array diffs.
 */
export class DiffArray {
  readonly kind = 'A' as const;
  readonly path?: PropertyPath;
  readonly index: number;
  readonly item: ArrayItemDiff;
  $dates?: PropertyPath[];

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
 */
export type AnyDiff = DiffEdit | DiffNew | DiffDeleted | DiffArray;

/**
 * Type guard for DiffArray.
 */
export function isDiffArray(d: AnyDiff): d is DiffArray {
  return d.kind === 'A';
}

/**
 * Type guard for DiffEdit.
 */
export function isDiffEdit(d: AnyDiff): d is DiffEdit {
  return d.kind === 'E';
}

/**
 * Type guard for DiffNew.
 */
export function isDiffNew(d: AnyDiff): d is DiffNew {
  return d.kind === 'N';
}

/**
 * Type guard for DiffDeleted.
 */
export function isDiffDeleted(d: AnyDiff): d is DiffDeleted {
  return d.kind === 'D';
}

/**
 * Type guard for DiffNewItem (array item).
 */
export function isDiffNewItem(d: ArrayItemDiff): d is DiffNewItem {
  return d.kind === 'N';
}

/**
 * Type guard for DiffDeletedItem (array item).
 */
export function isDiffDeletedItem(d: ArrayItemDiff): d is DiffDeletedItem {
  return d.kind === 'D';
}
