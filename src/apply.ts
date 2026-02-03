import { arrayRemove, assertTarget, assertValidChange, traversePath, DiffError } from './utils.ts';
import type { AnyDiff, ArrayItemDiff, PropertyPath } from './types.ts';
import { isDiffArray, isDiffDeleted, isDiffEdit, isDiffNew, isDiffDeletedItem } from './types.ts';

type Target = Record<string | number, unknown>;

/**
 * Converts ISO date strings to Date objects at specified paths within a value.
 * Mutates the value in place.
 * @param value - The value to process
 * @param datePaths - Array of paths to Date values (e.g., [['rhs'], ['rhs', 'created']])
 * @param prefix - The prefix to match (e.g., 'rhs' for apply, 'lhs' for revert)
 * @returns The value with dates restored (may be the original value or a new Date)
 */
function restoreDates(value: unknown, datePaths: PropertyPath[], prefix: string): unknown {
  for (const path of datePaths) {
    if (path[0] !== prefix) continue;

    if (path.length === 1) {
      // The value itself is a date
      return new Date(value as string);
    }

    // Navigate to the nested location and convert
    let current: unknown = value;
    const restPath = path.slice(1);
    for (let i = 0; i < restPath.length - 1; i++) {
      current = (current as Record<string | number, unknown>)[restPath[i]];
    }
    const lastKey = restPath[restPath.length - 1];
    (current as Record<string | number, unknown>)[lastKey] = new Date(
      (current as Record<string | number, unknown>)[lastKey] as string
    );
  }
  return value;
}

/**
 * Gets the value to apply, restoring Dates if $dates marker is present.
 */
function getApplyValue(change: AnyDiff & { $dates?: PropertyPath[] }, field: 'rhs' | 'lhs'): unknown {
  const value = (change as unknown as Record<string, unknown>)[field];
  if (change.$dates && change.$dates.length > 0) {
    return restoreDates(value, change.$dates, field);
  }
  return value;
}

/**
 * Applies an array item change to an array element.
 * @param arr - The array to modify
 * @param index - The index of the element
 * @param item - The array item change to apply (DiffNewItem or DiffDeletedItem)
 * @param datePaths - Optional date paths from parent DiffArray (already prefixed with 'item')
 * @returns The modified array
 */
export function applyArrayChange(arr: unknown[], index: number, item: ArrayItemDiff, datePaths?: PropertyPath[]): unknown[] {
  if (isDiffDeletedItem(item)) {
    arrayRemove(arr, index);
  } else {
    // DiffNewItem - set the new value at index, restoring dates if needed
    let value = item.rhs;
    if (datePaths && datePaths.length > 0) {
      // Convert paths from ['item', 'rhs', ...] to ['rhs', ...]
      const rhsPaths = datePaths
        .filter(p => p[0] === 'item' && p[1] === 'rhs')
        .map(p => p.slice(1));
      if (rhsPaths.length > 0) {
        value = restoreDates(value, rhsPaths, 'rhs');
      }
    }
    arr[index] = value;
  }
  return arr;
}

/**
 * Applies a single change to transform target toward source.
 * @param target - The object to modify
 * @param _source - The source object (unused, kept for API compatibility)
 * @param change - The change to apply
 * @throws DiffError if target is invalid or change is malformed
 * @deprecated The _source parameter is unused and will be removed in a future version
 */
export function applyChange(target: Target, _source: unknown, change: AnyDiff): void {
  assertTarget(target, 'target');
  assertValidChange(change);

  const path = change.path;
  const datePaths = (change as AnyDiff & { $dates?: PropertyPath[] }).$dates;

  // Handle root-level changes (no path or empty path)
  if (!path || path.length === 0) {
    if (isDiffArray(change)) {
      applyArrayChange(target as unknown as unknown[], change.index, change.item, datePaths);
    }
    return;
  }

  // Traverse to parent, creating missing intermediate objects/arrays
  const result = traversePath(target, path, true);
  if (!result.ok) {
    throw result.error;
  }

  const { target: parent, key } = result;

  if (isDiffArray(change)) {
    applyArrayChange(parent[key] as unknown[], change.index, change.item, datePaths);
  } else if (isDiffDeleted(change)) {
    delete parent[key];
  } else if (isDiffEdit(change) || isDiffNew(change)) {
    parent[key] = getApplyValue(change as AnyDiff & { $dates?: PropertyPath[] }, 'rhs');
  }
}

/**
 * Reverts an array item change.
 * @param arr - The array to modify
 * @param index - The index of the element
 * @param item - The array item change to revert (DiffNewItem or DiffDeletedItem)
 * @param datePaths - Optional date paths from parent DiffArray (already prefixed with 'item')
 * @returns The modified array
 */
export function revertArrayChange(arr: unknown[], index: number, item: ArrayItemDiff, datePaths?: PropertyPath[]): unknown[] {
  if (isDiffDeletedItem(item)) {
    // Restore the deleted element, restoring dates if needed
    let value = item.lhs;
    if (datePaths && datePaths.length > 0) {
      // Convert paths from ['item', 'lhs', ...] to ['lhs', ...]
      const lhsPaths = datePaths
        .filter(p => p[0] === 'item' && p[1] === 'lhs')
        .map(p => p.slice(1));
      if (lhsPaths.length > 0) {
        value = restoreDates(value, lhsPaths, 'lhs');
      }
    }
    arr[index] = value;
  } else {
    // DiffNewItem - remove the added element
    arrayRemove(arr, index);
  }
  return arr;
}

/**
 * Reverts a single change to restore the original value.
 * @param target - The object to modify
 * @param _source - The source object (unused, kept for API compatibility)
 * @param change - The change to revert
 * @throws DiffError if target is invalid, change is malformed, or path is empty
 * @deprecated The _source parameter is unused and will be removed in a future version
 */
export function revertChange(target: Target, _source: unknown, change: AnyDiff): void {
  assertTarget(target, 'target');
  assertValidChange(change);

  const path = change.path;
  if (!path || path.length === 0) {
    throw new DiffError('revertChange requires a non-empty path', 'EMPTY_PATH');
  }

  const datePaths = (change as AnyDiff & { $dates?: PropertyPath[] }).$dates;

  // Traverse to parent, creating missing intermediate objects
  const result = traversePath(target, path, true);
  if (!result.ok) {
    throw result.error;
  }

  const { target: parent, key } = result;

  if (isDiffArray(change)) {
    revertArrayChange(parent[key] as unknown[], change.index, change.item, datePaths);
  } else if (isDiffDeleted(change)) {
    parent[key] = getApplyValue(change as AnyDiff & { $dates?: PropertyPath[] }, 'lhs');
  } else if (isDiffEdit(change)) {
    parent[key] = getApplyValue(change as AnyDiff & { $dates?: PropertyPath[] }, 'lhs');
  } else if (isDiffNew(change)) {
    delete parent[key];
  }
}

/**
 * Applies differences to transform target to match the rhs.
 * applyDiff(before, diff(before, after)) modifies before to equal after.
 * @param target - The object to modify
 * @param differences - Array of diff objects from diff()
 */
export function applyDiff(target: Target, differences: AnyDiff[] | undefined): void {
  if (!target || !differences || differences.length === 0) {
    return;
  }

  // Check if we need to sort (has array deletions)
  const hasArrayDeletions = differences.some(
    (d) => isDiffArray(d) && d.item.kind === 'D'
  );

  // Only copy and sort if needed to avoid unnecessary array allocation
  const toApply = hasArrayDeletions
    ? [...differences].sort((a, b) => {
        if (isDiffArray(a) && isDiffArray(b) && a.item.kind === 'D' && b.item.kind === 'D') {
          // Both are array deletions - process higher indices first
          return b.index - a.index;
        }
        return 0;
      })
    : differences;

  for (const change of toApply) {
    applyChange(target, true, change);
  }
}
