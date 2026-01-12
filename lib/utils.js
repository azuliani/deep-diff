'use strict';

/**
 * Removes element(s) from an array in place.
 * @param {Array} arr - The array to modify
 * @param {number} from - Start index
 * @param {number} [to] - End index (optional)
 * @returns {Array} The modified array
 */
function arrayRemove(arr, from, to) {
  const rest = arr.slice((to || from) + 1 || arr.length);
  arr.length = from < 0 ? arr.length + from : from;
  arr.push(...rest);
  return arr;
}

/**
 * Returns a more specific type string than typeof.
 * Distinguishes: array, date, regexp, null, math, and standard types.
 * @param {*} subject - The value to check
 * @returns {string} The type string
 */
function realTypeOf(subject) {
  const type = typeof subject;
  if (type !== 'object') {
    return type;
  }
  if (subject === Math) {
    return 'math';
  }
  if (subject === null) {
    return 'null';
  }
  if (Array.isArray(subject)) {
    return 'array';
  }
  if (Object.prototype.toString.call(subject) === '[object Date]') {
    return 'date';
  }
  if (typeof subject.toString === 'function' && /^\/.*\//.test(subject.toString())) {
    return 'regexp';
  }
  return 'object';
}

module.exports = { arrayRemove, realTypeOf };
