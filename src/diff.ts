import {
  DiffEdit,
  DiffNew,
  DiffDeleted,
  DiffArray,
  DiffNewItem,
  DiffDeletedItem,
} from './types.ts';
import type { AnyDiff, PropertyPath } from './types.ts';
import { realTypeOf } from './utils.ts';

/**
 * Collects paths to all Date values within a value.
 * @param value - The value to search
 * @param basePath - The base path prefix (e.g., ['lhs'] or ['rhs'])
 * @returns Array of paths to Date values
 */
function collectDatePaths(value: unknown, basePath: PropertyPath): PropertyPath[] {
  const paths: PropertyPath[] = [];

  function collect(val: unknown, path: PropertyPath): void {
    if (val instanceof Date) {
      paths.push(path);
    } else if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        collect(val[i], [...path, i]);
      }
    } else if (val !== null && typeof val === 'object') {
      for (const key of Object.keys(val)) {
        collect((val as Record<string, unknown>)[key], [...path, key]);
      }
    }
  }

  collect(value, basePath);
  return paths;
}

/**
 * Combines lhs and rhs date paths, returning undefined if empty.
 */
function combineDatePaths(
  lhsPaths: PropertyPath[],
  rhsPaths: PropertyPath[]
): PropertyPath[] | undefined {
  const combined = [...lhsPaths, ...rhsPaths];
  return combined.length > 0 ? combined : undefined;
}

/**
 * Recursively compares two values and collects differences.
 */
function collectDiffs(
  lhs: unknown,
  rhs: unknown,
  accum: AnyDiff[],
  path?: PropertyPath,
  key?: string | number,
  stack?: unknown[]
): void {
  const currentPath = typeof key !== 'undefined' ? (path ? [...path, key] : [key]) : path || [];

  const lhsType = realTypeOf(lhs);
  const rhsType = realTypeOf(rhs);

  let lhsCompare: unknown = lhs;
  let rhsCompare: unknown = rhs;
  if (lhsType === 'regexp' && rhsType === 'regexp') {
    lhsCompare = (lhs as RegExp).toString();
    rhsCompare = (rhs as RegExp).toString();
  }

  const ltype = typeof lhsCompare;
  const rtype = typeof rhsCompare;

  if (ltype === 'undefined') {
    if (rtype !== 'undefined') {
      accum.push(new DiffNew(currentPath, rhs, collectDatePaths(rhs, ['rhs'])));
    }
  } else if (rtype === 'undefined') {
    accum.push(new DiffDeleted(currentPath, lhs, collectDatePaths(lhs, ['lhs'])));
  } else if (lhsType !== rhsType) {
    accum.push(
      new DiffEdit(
        currentPath,
        lhs,
        rhs,
        combineDatePaths(collectDatePaths(lhs, ['lhs']), collectDatePaths(rhs, ['rhs']))
      )
    );
  } else if (
    lhsCompare instanceof Date &&
    rhsCompare instanceof Date &&
    lhsCompare.getTime() !== rhsCompare.getTime()
  ) {
    accum.push(new DiffEdit(currentPath, lhs, rhs, [['lhs'], ['rhs']]));
  } else if (ltype === 'object' && lhsCompare !== null && rhsCompare !== null) {
    stack = stack || [];
    if (!stack.includes(lhsCompare)) {
      stack.push(lhsCompare);

      if (Array.isArray(lhsCompare)) {
        const lhsArr = lhsCompare as unknown[];
        const rhsArr = rhsCompare as unknown[];
        let i = 0;
        const len = lhsArr.length;

        for (i = 0; i < len; i++) {
          if (i >= rhsArr.length) {
            accum.push(
              new DiffArray(
                currentPath,
                i,
                new DiffDeletedItem(lhsArr[i], collectDatePaths(lhsArr[i], ['lhs']))
              )
            );
          } else {
            collectDiffs(lhsArr[i], rhsArr[i], accum, currentPath, i, stack);
          }
        }

        while (i < rhsArr.length) {
          accum.push(
            new DiffArray(
              currentPath,
              i,
              new DiffNewItem(rhsArr[i], collectDatePaths(rhsArr[i], ['rhs']))
            )
          );
          i++;
        }
      } else {
        const lhsObj = lhsCompare as Record<string, unknown>;
        const rhsObj = rhsCompare as Record<string, unknown>;
        const lhsKeys = Object.keys(lhsObj);
        const rhsKeySet = new Set(Object.keys(rhsObj));

        for (const k of lhsKeys) {
          if (rhsKeySet.has(k)) {
            collectDiffs(lhsObj[k], rhsObj[k], accum, currentPath, k, stack);
            rhsKeySet.delete(k);
          } else {
            collectDiffs(lhsObj[k], undefined, accum, currentPath, k, stack);
          }
        }

        for (const k of rhsKeySet) {
          collectDiffs(undefined, rhsObj[k], accum, currentPath, k, stack);
        }
      }

      stack.pop();
    }
  } else if (lhsCompare !== rhsCompare) {
    if (!(ltype === 'number' && Number.isNaN(lhsCompare) && Number.isNaN(rhsCompare))) {
      accum.push(
        new DiffEdit(
          currentPath,
          lhs,
          rhs,
          combineDatePaths(collectDatePaths(lhs, ['lhs']), collectDatePaths(rhs, ['rhs']))
        )
      );
    }
  }
}

/**
 * Computes differences between two values and returns them as an array.
 * @param lhs - Left-hand side value
 * @param rhs - Right-hand side value
 * @returns Array of differences, or undefined if none
 */
export function diff(lhs: unknown, rhs: unknown): AnyDiff[] | undefined {
  const accum: AnyDiff[] = [];
  collectDiffs(lhs, rhs, accum);
  return accum.length ? accum : undefined;
}
