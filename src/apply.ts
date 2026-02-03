import { arrayRemove, assertTarget, assertValidChange, traversePath, DiffError } from './utils.ts';
import type { AnyDiff, ArrayItemDiff } from './types.ts';
import { isDiffArray, isDiffDeleted, isDiffEdit, isDiffNew, isDiffDeletedItem } from './types.ts';

type Target = Record<string | number, unknown>;

/**
 * Applies an array item change to an array element.
 * @param arr - The array to modify
 * @param index - The index of the element
 * @param item - The array item change to apply (DiffNewItem or DiffDeletedItem)
 * @returns The modified array
 */
export function applyArrayChange(arr: unknown[], index: number, item: ArrayItemDiff): unknown[] {
  if (isDiffDeletedItem(item)) {
    arrayRemove(arr, index);
  } else {
    // DiffNewItem - set the new value at index
    arr[index] = item.rhs;
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

  // Handle root-level changes (no path or empty path)
  if (!path || path.length === 0) {
    if (isDiffArray(change)) {
      applyArrayChange(target as unknown as unknown[], change.index, change.item);
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
    applyArrayChange(parent[key] as unknown[], change.index, change.item);
  } else if (isDiffDeleted(change)) {
    delete parent[key];
  } else if (isDiffEdit(change) || isDiffNew(change)) {
    parent[key] = change.rhs;
  }
}

/**
 * Reverts an array item change.
 * @param arr - The array to modify
 * @param index - The index of the element
 * @param item - The array item change to revert (DiffNewItem or DiffDeletedItem)
 * @returns The modified array
 */
export function revertArrayChange(arr: unknown[], index: number, item: ArrayItemDiff): unknown[] {
  if (isDiffDeletedItem(item)) {
    // Restore the deleted element
    arr[index] = item.lhs;
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

  // Traverse to parent, creating missing intermediate objects
  const result = traversePath(target, path, true);
  if (!result.ok) {
    throw result.error;
  }

  const { target: parent, key } = result;

  if (isDiffArray(change)) {
    revertArrayChange(parent[key] as unknown[], change.index, change.item);
  } else if (isDiffDeleted(change)) {
    parent[key] = change.lhs;
  } else if (isDiffEdit(change)) {
    parent[key] = change.lhs;
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
