var util = require('./util');

module.exports = function (options) {
  var gulp = options.gulp;

  var streams = [
    gulp.src(options.glob),
    util.plumber()
  ];
  util.applyStandardHandlers(streams, options);
  streams.push(gulp.dest(options.outputPath));

  return streams;
};
