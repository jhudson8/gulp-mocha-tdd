var util = require('./util');

module.exports = function (options) {
  var gulp = options.gulp;

  var pipeline = gulp.src(options.glob)
    .pipe(util.plumber());


  pipeline = util.applyStandardHandlers(pipeline, options);

  return pipeline.pipe(gulp.dest(options.outputPath));
};
