'use strict';

const { DiffEdit, DiffNew, DiffDeleted, DiffArray } = require('./types');
const { realTypeOf } = require('./utils');

/**
 * Recursively compares two values and emits differences via the changes callback.
 * @param {*} lhs - Left-hand side value
 * @param {*} rhs - Right-hand side value
 * @param {Function} changes - Callback to receive diff objects
 * @param {Array} [path] - Current path in the object tree
 * @param {string|number} [key] - Current key being compared
 * @param {Array} [stack] - Stack for circular reference detection
 */
function deepDiff(lhs, rhs, changes, path, key, stack) {
  path = path || [];
  const currentPath = path.slice(0);

  if (typeof key !== 'undefined') {
    currentPath.push(key);
  }

  // Use string comparison for regexes
  if (realTypeOf(lhs) === 'regexp' && realTypeOf(rhs) === 'regexp') {
    lhs = lhs.toString();
    rhs = rhs.toString();
  }

  const ltype = typeof lhs;
  const rtype = typeof rhs;

  if (ltype === 'undefined') {
    if (rtype !== 'undefined') {
      changes(new DiffNew(currentPath, rhs));
    }
  } else if (rtype === 'undefined') {
    changes(new DiffDeleted(currentPath, lhs));
  } else if (realTypeOf(lhs) !== realTypeOf(rhs)) {
    changes(new DiffEdit(currentPath, lhs, rhs));
  } else if (
    Object.prototype.toString.call(lhs) === '[object Date]' &&
    Object.prototype.toString.call(rhs) === '[object Date]' &&
    lhs - rhs !== 0
  ) {
    changes(new DiffEdit(currentPath, lhs, rhs));
  } else if (ltype === 'object' && lhs !== null && rhs !== null) {
    stack = stack || [];
    if (!stack.includes(lhs)) {
      stack.push(lhs);

      if (Array.isArray(lhs)) {
        let i = 0;
        const len = lhs.length;

        for (i = 0; i < len; i++) {
          if (i >= rhs.length) {
            changes(new DiffArray(currentPath, i, new DiffDeleted(undefined, lhs[i])));
          } else {
            deepDiff(lhs[i], rhs[i], changes, currentPath, i, stack);
          }
        }

        while (i < rhs.length) {
          changes(new DiffArray(currentPath, i, new DiffNew(undefined, rhs[i])));
          i++;
        }
      } else {
        const lhsKeys = Object.keys(lhs);
        let rhsKeys = Object.keys(rhs);

        for (const k of lhsKeys) {
          const otherIndex = rhsKeys.indexOf(k);
          if (otherIndex >= 0) {
            deepDiff(lhs[k], rhs[k], changes, currentPath, k, stack);
            rhsKeys.splice(otherIndex, 1);
          } else {
            deepDiff(lhs[k], undefined, changes, currentPath, k, stack);
          }
        }

        for (const k of rhsKeys) {
          deepDiff(undefined, rhs[k], changes, currentPath, k, stack);
        }
      }

      stack.length = stack.length - 1;
    }
  } else if (lhs !== rhs) {
    // Handle NaN !== NaN case
    if (!(ltype === 'number' && Number.isNaN(lhs) && Number.isNaN(rhs))) {
      changes(new DiffEdit(currentPath, lhs, rhs));
    }
  }
}

/**
 * Computes differences between two values and returns them as an array.
 * @param {*} lhs - Left-hand side value
 * @param {*} rhs - Right-hand side value
 * @returns {Array|undefined} Array of differences, or undefined if none
 */
function accumulateDiff(lhs, rhs) {
  const accum = [];
  deepDiff(lhs, rhs, (diff) => {
    if (diff) {
      accum.push(diff);
    }
  });
  return accum.length ? accum : undefined;
}

module.exports = { deepDiff, accumulateDiff };
