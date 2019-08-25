'use strict'; // set ES5 strict mode on.
var _ = require('lodash'); // importing lodash to use in this file

// Constructor function
function Scope() {
  this.$$watchers = [];
  this.$$lastDirtyWatch = null;
}

// Makes Scope available to require() in other modules/files
// This is the CommonJS package standard way.
module.exports = Scope;

// initWatchVal is used in Scope.watcher.last to be oldValue.
// in $digest. It's an empty function because when $digest() 
// first runs it tests if oldValue is different than newValue,
// so simply having oldValue be 'undefined' could cause unintended
// results if the first new value was also undefined.
function initWatchVal() { }


// $watch takes two functions as arguments, and stores them in 
// $$watchers array. Every Scope object will have the $watch function
// because it is on the Scope prototype.
Scope.prototype.$watch = function(watchFn, listenerFn, valueEq) {
  var self = this;

  var watcher = {
    watchFn: watchFn,
    listenerFn: listenerFn || function() { },
    valueEq: !!valueEq,
    last: initWatchVal
  };
  // Pushes the watcher object onto $$watchers array in Scope 
  // prototype. 
  this.$$watchers.unshift(watcher);
  this.$$lastDirtyWatch = null;

  // When watchers are set, returns this function to be called
  // later to remove the wachers from the $$watchers array.
  return function() {
    var index = self.$$watchers.indexOf(watcher);
    if (index >= 0) {
      self.$$watchers.splice(index, 1);
      self.$$lastDirtyWatch = null;
    }
  };
};


// $digest iterates over all registered watchers in the $$watchers
// array and calls their watch function and compares its return
// value to whatever the same function returned last time. If 
// the values differ, the watcher is dirty and its lisenerFn will
// be called.
Scope.prototype.$$digestOnce = function() {
  var self = this;
  var newValue, oldValue, dirty;

  _.forEachRight(this.$$watchers, function(watcher) {
    
    try {
      if (watcher) {
        newValue = watcher.watchFn(self);
        oldValue = watcher.last;

        if (!self.$$areEqual(newValue, oldValue, watcher.valueEq)) {
          self.$$lastDirtyWatch = watcher;
          watcher.last = (watcher.valueEq ? _.cloneDeep(newValue) : newValue);

          // Check if oldValue is initial value and replace it if so
          watcher.listenerFn(newValue, (oldValue === initWatchVal ? newValue : oldValue), self);
          dirty = true;
        } else if (self.$$lastDirtyWatch === watcher) {
          return false;
        }
      }
    } catch (e) {
      console.error(e);
    }

  });

  return dirty;
};

Scope.prototype.$digest = function() {
  var ttl = 10;
  var dirty;
  this.$$lastDirtyWatch = null;

  do {
    dirty = this.$$digestOnce();
    if (dirty && !(ttl--)) {
      throw '10 digest iterations reached';
    }
  } while (dirty);
};

Scope.prototype.$$areEqual = function(newValue, oldValue, valueEq) {
  if (valueEq) {
    return _.isEqual(newValue, oldValue);
  } else {
    return newValue === oldValue || (typeof newValue === 'number' && typeof oldValue === 'number' && isNaN(newValue) && isNaN(oldValue));
  }
};