import type { AnyDiff, PropertyPath } from './types.ts';

/**
 * Error class for diff operations with error code.
 */
export class DiffError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'DiffError';
    this.code = code;
  }
}

/**
 * Extended type detection beyond typeof.
 */
export type RealType =
  | 'undefined'
  | 'boolean'
  | 'number'
  | 'bigint'
  | 'string'
  | 'symbol'
  | 'function'
  | 'object'
  | 'null'
  | 'array'
  | 'date'
  | 'regexp'
  | 'math';

/**
 * Removes element(s) from an array in place.
 * @param arr - The array to modify
 * @param from - Start index
 * @param to - End index (optional)
 * @returns The modified array
 */
export function arrayRemove<T>(arr: T[], from: number, to?: number): T[] {
  const rest = arr.slice((to ?? from) + 1 || arr.length);
  arr.length = from < 0 ? arr.length + from : from;
  arr.push(...rest);
  return arr;
}

/**
 * Returns a more specific type string than typeof.
 * Distinguishes: array, date, regexp, null, math, and standard types.
 * @param subject - The value to check
 * @returns The type string
 */
export function realTypeOf(subject: unknown): RealType {
  const type = typeof subject;
  if (type !== 'object') {
    return type;
  }
  if (subject === null) {
    return 'null';
  }
  if (Array.isArray(subject)) {
    return 'array';
  }
  if (subject instanceof Date) {
    return 'date';
  }
  if (subject instanceof RegExp) {
    return 'regexp';
  }
  if (subject === Math) {
    return 'math';
  }
  return 'object';
}

type Target = Record<string | number, unknown>;

/**
 * Result of path traversal.
 */
export interface TraverseResult {
  /** The object at the end of the traversal (parent of final key) */
  target: Target;
  /** The final key in the path */
  key: string | number;
  /** Whether traversal succeeded */
  ok: true;
}

/**
 * Error result from path traversal.
 */
export interface TraverseError {
  ok: false;
  error: DiffError;
}

/**
 * Safely traverses an object path, optionally creating missing intermediate objects/arrays.
 * @param target - The object to traverse
 * @param path - The path to traverse
 * @param createMissing - Whether to create missing intermediate objects/arrays
 * @returns TraverseResult on success, TraverseError on failure
 */
export function traversePath(
  target: Target,
  path: PropertyPath,
  createMissing: boolean = false
): TraverseResult | TraverseError {
  if (!path || path.length === 0) {
    return {
      ok: false,
      error: new DiffError('Path cannot be empty', 'EMPTY_PATH'),
    };
  }

  let current: Target = target;
  const lastIndex = path.length - 1;

  for (let i = 0; i < lastIndex; i++) {
    const key = path[i];
    const nextKey = path[i + 1];
    const value = current[key];

    if (value === undefined || value === null) {
      if (!createMissing) {
        return {
          ok: false,
          error: new DiffError(
            `Cannot traverse path: property '${key}' is ${value === null ? 'null' : 'undefined'}`,
            'INVALID_PATH'
          ),
        };
      }
      current[key] = typeof nextKey === 'number' ? [] : {};
    } else if (typeof value !== 'object') {
      return {
        ok: false,
        error: new DiffError(
          `Cannot traverse path: property '${key}' is not an object (found ${typeof value})`,
          'NOT_OBJECT'
        ),
      };
    }

    current = current[key] as Target;
  }

  return {
    ok: true,
    target: current,
    key: path[lastIndex],
  };
}

/**
 * Validates that target is a non-null object.
 * @param target - The value to validate
 * @param paramName - Name of the parameter for error messages
 * @throws DiffError if target is null or not an object
 */
export function assertTarget(
  target: unknown,
  paramName: string = 'target'
): asserts target is Target {
  if (target === null || target === undefined) {
    throw new DiffError(`${paramName} cannot be null or undefined`, 'INVALID_TARGET');
  }
  if (typeof target !== 'object') {
    throw new DiffError(
      `${paramName} must be an object (found ${typeof target})`,
      'INVALID_TARGET'
    );
  }
}

/**
 * Validates that a change object has required fields for its kind.
 * @param change - The change to validate
 * @throws DiffError if change is invalid
 */
export function assertValidChange(change: AnyDiff): void {
  if (!change || typeof change !== 'object') {
    throw new DiffError('Change must be an object', 'INVALID_CHANGE');
  }

  const kind = change.kind;
  if (!kind || !['N', 'D', 'E', 'A'].includes(kind)) {
    throw new DiffError(`Invalid change kind: ${kind}`, 'INVALID_CHANGE');
  }

  if (kind === 'A') {
    const arrayChange = change as AnyDiff & { index?: number; item?: AnyDiff };
    if (typeof arrayChange.index !== 'number') {
      throw new DiffError('Array change must have a numeric index', 'INVALID_CHANGE');
    }
    if (!arrayChange.item) {
      throw new DiffError('Array change must have an item', 'INVALID_CHANGE');
    }
  }
}
