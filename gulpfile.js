var gulp = require('gulp');
var gulpMochaTDD = require('gulp-mocha-tdd');

gulpMochaTDD(gulp, {
  rootTestsDir: true,
  scriptsDirName: 'lib',
  init: function() {
    global.expect = require('chai').expect;
  }
});

