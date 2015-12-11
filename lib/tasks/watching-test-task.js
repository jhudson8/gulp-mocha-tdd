var gulpWatch = require('gulp-watch');
var gulpUtil = require('gulp-util');
var mkdirp = require('mkdirp');
var through = require('through2');
var fs = require('fs');
var util = require('./util');
var gutil = require('gulp-util');
var mocha = require('gulp-spawn-mocha');
var batch = require('gulp-batch');
var Path = require('path');

module.exports = function (options) {
  var gulp = options.gulp;
  var streams = [
    gulp.src(options.glob),
    gulpWatch(options.glob),
    util.plumber(),
  ];
  streams.push.apply(streams, util.applyStandardHandlers(streams, options));
  streams.push(completionNotifier(options));
  streams.push(tester(options));

  return streams;
};

function tester (options) {
  return through.obj(function(file, enc, cb) {
    var self = this;

    if (file.stat && file.stat.isFile()) {
      // as long as it's a file, we will write the file out
      // not using gulp.dest because it will suppress the "data" event
      var relativePath = file.path.substring(file.base.length);
      var newPath = options.outputPath + '/' + relativePath;
      var dir = newPath.replace(/\/[^\/]*$/, '');

      // ensure the output directory exists
      mkdirp(dir, function (err) {
        if (err) { return cb(err); }

        // write the update contents out
        fs.writeFile( newPath, file.contents, { encoding: 'utf-8' }, function (err) {
          if (err) { return cb(err); }

          // but, only if we have seen the file before do we want to run the test
          // AKA: it's a file save *after* the process has started
          if (options.readyForTesting) {
            executeTest(file, newPath, options);
          }
          cb();
        });
      });
    } else {
      cb();
    }
  });
}

function executeTest(file, path, options) {
  util.writeTemplate('test-single.js', options, path)

  process.stdout.write('\033c');
  process.stdout.write('=======================\n');

  options.gulp.src(options.outputPath + '/test-single.js')
    .pipe(util.plumber({
      errorHandler: function (err) {
        gulpUtil.beep();
      }
    }))
    .pipe(mocha(options.mochaArgs));
}

function completionNotifier (options) {
  var WAIT_TIME = 1000;
  var lastFileSeenTime = -1;
  var timer;

  return through.obj( function (file, enc, cb) {
    // log a message when we "think" we're ready
    if (timer) {
      clearTimeout(timer);
    }
    if (WAIT_TIME) {
      timer = setTimeout(function () {
        timer = undefined;
        options.readyForTesting = true;
        console.log('ready for testing...');
        WAIT_TIME = false;
      }, WAIT_TIME);
    }
    
    this.push(file);
    cb();
  });
}
