'use strict';

/**
 * Base class for all diff types.
 */
class Diff {
  constructor(kind, path) {
    this.kind = kind;
    if (path?.length) {
      this.path = path;
    }
  }
}

/**
 * Represents an edited value (property exists in both lhs and rhs but values differ).
 */
class DiffEdit extends Diff {
  constructor(path, origin, value) {
    super('E', path);
    this.lhs = origin;
    this.rhs = value;
  }
}

/**
 * Represents a new value (property exists only in rhs).
 */
class DiffNew extends Diff {
  constructor(path, value) {
    super('N', path);
    this.rhs = value;
  }
}

/**
 * Represents a deleted value (property exists only in lhs).
 */
class DiffDeleted extends Diff {
  constructor(path, value) {
    super('D', path);
    this.lhs = value;
  }
}

/**
 * Represents an array change (wraps another diff type in the item property).
 */
class DiffArray extends Diff {
  constructor(path, index, item) {
    super('A', path);
    this.index = index;
    this.item = item;
  }
}

module.exports = { Diff, DiffEdit, DiffNew, DiffDeleted, DiffArray };
