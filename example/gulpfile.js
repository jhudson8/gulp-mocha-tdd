var gulp = require('gulp');
var gulpMochaTDD = require('gulp-mocha-tdd');

gulpMochaTDD(gulp);

gulp.task('test', ['test-js']);
