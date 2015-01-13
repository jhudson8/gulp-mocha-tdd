var gulp = require('gulp');
var gulpMochaTDD = require('gulp-mocha-tdd');

gulpMochaTDD(gulp, {
  init: function() {
    global.expect = require('chai').expect;
  }
});
