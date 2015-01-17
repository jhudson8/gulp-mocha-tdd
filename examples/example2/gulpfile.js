var gulp = require('gulp');
var gulpMochaTDD = require('gulp-mocha-tdd');

gulpMochaTDD(gulp, {
  rootTestsDir: true,
  scriptsDirName: 'lib',
  testFilePattern: '{name}.spec.js',
  init: function() {
    global.expect = require('chai').expect;
  }
});