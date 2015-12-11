var istanbul = require('gulp-istanbul');
var Path = require('path');

module.exports = function (options) {
  var gulp = options.gulp;

  return [
    gulp.src(Path.resolve(options.outputPath + '/**/*.js')),
    istanbul(),
    istanbul.hookRequire()
  ];
};
