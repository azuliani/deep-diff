import type { AnyDiff, PropertyPath } from './types.ts';

/**
 * Error codes used by {@link DiffError}.
 *
 * - `INVALID_TARGET` - Target is null, undefined, or not an object
 * - `INVALID_CHANGE` - Change object is malformed or has invalid kind
 * - `EMPTY_PATH` - Operation requires a non-empty path
 * - `NOT_OBJECT` - Cannot traverse path through non-object value
 * - `INVALID_PATH` - Path contains null or undefined segment
 */
export type DiffErrorCode =
  | 'INVALID_TARGET'
  | 'INVALID_CHANGE'
  | 'EMPTY_PATH'
  | 'NOT_OBJECT'
  | 'INVALID_PATH';

/**
 * Error class for diff operations with structured error codes.
 * Thrown by {@link applyChange}, {@link revertChange}, and related functions
 * when encountering invalid inputs or paths.
 *
 * @example
 * import { DiffError, applyChange } from 'deep-diff';
 *
 * try {
 *   applyChange(null, {}, someChange);
 * } catch (e) {
 *   if (e instanceof DiffError) {
 *     console.log(e.code);    // 'INVALID_TARGET'
 *     console.log(e.message); // 'target cannot be null or undefined'
 *   }
 * }
 */
export class DiffError extends Error {
  /** The error code identifying the type of error */
  readonly code: string;

  /**
   * Creates a new DiffError.
   * @param message - Human-readable error message
   * @param code - Error code for programmatic handling
   */
  constructor(message: string, code: string) {
    super(message);
    this.name = 'DiffError';
    this.code = code;
  }
}

/**
 * Extended type detection beyond typeof.
 * Distinguishes between types that JavaScript's `typeof` operator conflates.
 *
 * @example
 * realTypeOf([])           // 'array'
 * realTypeOf(null)         // 'null'
 * realTypeOf(new Date())   // 'date'
 * realTypeOf(/regex/)      // 'regexp'
 * realTypeOf({})           // 'object'
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
 * @param to - End index (optional, defaults to from)
 * @returns The modified array
 * @internal
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
 *
 * @param subject - The value to check
 * @returns The type string
 *
 * @example
 * realTypeOf([1, 2, 3])      // 'array'
 * realTypeOf(null)           // 'null'
 * realTypeOf(new Date())     // 'date'
 * realTypeOf(/pattern/)      // 'regexp'
 * realTypeOf(Math)           // 'math'
 * realTypeOf({ key: 'val' }) // 'object'
 * realTypeOf(42)             // 'number'
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
 * Result of successful path traversal.
 * @internal
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
 * @internal
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
 * @internal
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
 * @throws {@link DiffError} if target is null or not an object
 * @internal
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
 * @throws {@link DiffError} if change is invalid
 * @internal
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
