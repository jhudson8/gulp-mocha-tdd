var util = require('./util');

module.exports = function (options) {
  var gulp = options.gulp;

  var pipeline = gulp.src(options.glob)
    .pipe(util.plumber());

  return util.applyStandardHandlers(pipeline, options)
    .pipe(gulp.dest(options.outputPath));
};
