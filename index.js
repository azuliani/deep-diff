'use strict';

const { deepDiff, accumulateDiff } = require('./lib/diff');
const { applyChange, revertChange, applyDiff } = require('./lib/apply');

module.exports = {
  diff: accumulateDiff,
  observableDiff: deepDiff,
  applyDiff,
  applyChange,
  revertChange
};
