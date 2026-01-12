'use strict';

const { arrayRemove } = require('./utils');

/**
 * Applies an array change to an array element.
 * @param {Array} arr - The array to modify
 * @param {number} index - The index of the element
 * @param {Object} change - The change to apply
 * @returns {Array} The modified array
 */
function applyArrayChange(arr, index, change) {
  if (change.path && change.path.length) {
    let it = arr[index];
    const u = change.path.length - 1;

    for (let i = 0; i < u; i++) {
      it = it[change.path[i]];
    }

    switch (change.kind) {
      case 'A':
        applyArrayChange(it[change.path[u]], change.index, change.item);
        break;
      case 'D':
        delete it[change.path[u]];
        break;
      case 'E':
      case 'N':
        it[change.path[u]] = change.rhs;
        break;
    }
  } else {
    switch (change.kind) {
      case 'A':
        applyArrayChange(arr[index], change.index, change.item);
        break;
      case 'D':
        arr = arrayRemove(arr, index);
        break;
      case 'E':
      case 'N':
        arr[index] = change.rhs;
        break;
    }
  }
  return arr;
}

/**
 * Applies a single change to transform target toward source.
 * @param {Object} target - The object to modify
 * @param {Object} source - The source object (used for reference)
 * @param {Object} change - The change to apply
 */
function applyChange(target, source, change) {
  let it = target;
  const last = change.path ? change.path.length - 1 : 0;

  for (let i = 0; i < last; i++) {
    if (typeof it[change.path[i]] === 'undefined') {
      it[change.path[i]] = typeof change.path[i + 1] === 'number' ? [] : {};
    }
    it = it[change.path[i]];
  }

  switch (change.kind) {
    case 'A':
      applyArrayChange(change.path ? it[change.path[last]] : it, change.index, change.item);
      break;
    case 'D':
      delete it[change.path[last]];
      break;
    case 'E':
    case 'N':
      it[change.path[last]] = change.rhs;
      break;
  }
}

/**
 * Reverts an array change.
 * @param {Array} arr - The array to modify
 * @param {number} index - The index of the element
 * @param {Object} change - The change to revert
 * @returns {Array} The modified array
 */
function revertArrayChange(arr, index, change) {
  if (change.path && change.path.length) {
    let it = arr[index];
    const u = change.path.length - 1;

    for (let i = 0; i < u; i++) {
      it = it[change.path[i]];
    }

    switch (change.kind) {
      case 'A':
        revertArrayChange(it[change.path[u]], change.index, change.item);
        break;
      case 'D':
        it[change.path[u]] = change.lhs;
        break;
      case 'E':
        it[change.path[u]] = change.lhs;
        break;
      case 'N':
        delete it[change.path[u]];
        break;
    }
  } else {
    switch (change.kind) {
      case 'A':
        revertArrayChange(arr[index], change.index, change.item);
        break;
      case 'D':
        arr[index] = change.lhs;
        break;
      case 'E':
        arr[index] = change.lhs;
        break;
      case 'N':
        arr = arrayRemove(arr, index);
        break;
    }
  }
  return arr;
}

/**
 * Reverts a single change to restore the original value.
 * @param {Object} target - The object to modify
 * @param {Object} source - The source object (used for reference)
 * @param {Object} change - The change to revert
 */
function revertChange(target, source, change) {
  let it = target;
  const u = change.path.length - 1;

  for (let i = 0; i < u; i++) {
    if (typeof it[change.path[i]] === 'undefined') {
      it[change.path[i]] = {};
    }
    it = it[change.path[i]];
  }

  switch (change.kind) {
    case 'A':
      revertArrayChange(it[change.path[u]], change.index, change.item);
      break;
    case 'D':
      it[change.path[u]] = change.lhs;
      break;
    case 'E':
      it[change.path[u]] = change.lhs;
      break;
    case 'N':
      delete it[change.path[u]];
      break;
  }
}

/**
 * Applies differences to transform target to match the rhs.
 * applyDiff(before, diff(before, after)) modifies before to equal after.
 * @param {Object} target - The object to modify
 * @param {Array} differences - Array of diff objects from diff()
 */
function applyDiff(target, differences) {
  if (target && differences) {
    // Sort to process array deletions (D applied) from highest index first
    // to avoid index shifting issues
    const sorted = [...differences].sort((a, b) => {
      if (a.kind === 'A' && b.kind === 'A' && a.item.kind === 'D' && b.item.kind === 'D') {
        // Both are array deletions - process higher indices first
        return b.index - a.index;
      }
      return 0;
    });

    for (const change of sorted) {
      applyChange(target, true, change);
    }
  }
}

module.exports = {
  applyArrayChange,
  applyChange,
  revertArrayChange,
  revertChange,
  applyDiff
};
