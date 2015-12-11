var util = require('./util');
var istanbul = require('gulp-istanbul');

module.exports = function (options) {
  util.writeTemplate('test-all.js', options);

  var mocha = require('gulp-mocha');
  if (options.debugMode) {
    mocha = require('gulp-spawn-mocha');
  }

  var gulp = options.gulp;

  var streams = [
    gulp.src(options.outputPath + '/test-all.js'),
    mocha(options.mochaOptions)
  ];

  if (options.istanbul) {
    streams.push(istanbul.writeReports(options.istanbul));

    if (options.istanbul.thresholds) {
      streams.push(istanbul.enforceThresholds({
        thresholds: options.istanbul.thresholds
      }));
    }
  }

  return streams;
};
