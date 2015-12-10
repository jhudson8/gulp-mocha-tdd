var util = require('./util');
var mocha = require('gulp-mocha');
var istanbul = require('gulp-istanbul');

module.exports = function (options) {
  util.writeTemplate('test-all.js', options);

  var gulp = options.gulp;

  var pipeline = gulp.src(options.outputPath + '/test-all.js')
    .pipe(mocha(options.mochaArgs));

  if (options.istanbul) {
    pipeline = pipeline.pipe(
      istanbul.writeReports(options.istanbul))

    if (options.istanbul.thresholds) {
      pipeline = pipeline.pipe(istanbul.enforceThresholds({
        thresholds: options.istanbul.thresholds
      }))
    }
  }

  return pipeline;
};
