var istanbul = require('gulp-istanbul');
var util = require('./util');

module.exports = function (options) {
  var gulp = options.gulp;

  return gulp.src(options.outputPath + '/**/*.js')
    .pipe(istanbul())
    .pipe(istanbul.hookRequire())
};
