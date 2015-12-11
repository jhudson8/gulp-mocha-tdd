var gulpWatch = require('gulp-watch');
var gulpUtil = require('gulp-util');
var mkdirp = require('mkdirp');
var through = require('through2');
var fs = require('fs');
var util = require('./util');
var gutil = require('gulp-util');
var mocha = require('gulp-spawn-mocha');
var Path = require('path');

module.exports = function (options) {
  var gulp = options.gulp;

  // simple watch handler that will batch events to work the fact that the watch
  // stream handler does not trigger the "end" event
  var cache = {};
  function fileVisited (file) {
    var hasBeenVisited = !!cache[file.path];
    cache[file.path] = true;
    return hasBeenVisited;
  }

  var pipeline = gulp.src(options.glob)
    .pipe(gulpWatch(options.glob, {}))
    .pipe(util.plumber())

  pipeline = util.applyStandardHandlers(pipeline, options);

  pipeline = pipeline.pipe(through.obj(function(file, enc, cb) {
    var self = this;

    if (file.stat && file.stat.isFile()) {
      // as long as it's a file, we will write the file out
      // not using gulp.dest because it will suppress the "data" event
      var relativePath = file.path.substring(file.base.length);
      var newPath = options.outputPath + '/' + relativePath;
      var dir = newPath.replace(/\/[^\/]*$/, '');

      mkdirp(dir, function (err) {
        if (err) { return cb(err); }

        fs.writeFile( newPath, file.contents, { encoding: 'utf-8' }, function (err) {
          if (err) { return cb(err); }

          // but, only if we have seen the file before do we want to run the test
          // AKA: it's a file save *after* the process has started
          if (fileVisited(file)) {
            file.path = newPath;
            var contents = createTestFile(file, options);

            gulp.src(options.outputPath + '/test-single.js')
              .pipe(util.plumber({
                errorHandler: function (err) {
                  gulpUtil.beep();
                }
              }))
              .pipe(mocha(options.mochaArgs));
          }

          cb();
        });
      });

    } else {
      cb();
    }
  }));

  return pipeline
};

function createTestFile(file, options) {
  process.stdout.write('\033c');
  process.stdout.write('=======================\n');
  return util.writeTemplate('test-single.js', options, file.path);
}
