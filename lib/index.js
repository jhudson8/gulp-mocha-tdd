var yargs = require('yargs');
var argv = require('yargs').argv;
var combiner = require('stream-combiner2');
var fs = require('fs');
var Path = require('path');
var gulpUtil = require('gulp-util');
var runSequence = require('run-sequence');
var del = require('del');

/**
 * test task arguments
 * grep: grep string
 * d (boolean): allow debugger breakpoints (using node-inspector)
 */
module.exports = function(gulp, options) {
  var separateTests = !!options.rootTestsDir;
  var scriptsDirName = options.scriptsDirName || 'js';
  var taskName = options.taskName || 'test';

  options = Object.assign({}, options, {
    taskName: taskName,
    scriptsDirName: scriptsDirName,
    testFilePattern: options.testFilePattern || '{name}-test',
    separateTests: separateTests,
    testsDirName: options.testsDirName || (separateTests ? 'tests' : '_tests'),
    glob: separateTests ? [scriptsDirName + '/**/*', testsDirName + '/**/*'] : scriptsDirName + '/**/*',
    initFunction: options.init ? ('(' + options.init + ')();') : '',
    outputPath: './.test',
    gulp: gulp,
    mochaArgs: getMochaArgs()
  });

  // don't do coverage if we are using grep
  if (argv.grep && options.istanbul) {
    delete options.istanbul;
  }

  var prepareAssetsTask = taskName + '-prepare-assets';
  var istanbulTask = taskName + '-istanbul';
  var prepareWatchTask = taskName + '-prepare-watch';
  var watchTask = taskName + '-watch';
  var cleanTask = taskName + '-clean';
  var executeTask = taskName + '-execute';

  function combine(streamHandlers) {
    var root = streamHandlers[0];
    for (var i = 0; i < streamHandlers.length; i++) {
      root = root.pipe(streamHandlers[i]);
      root = root.on('error', function (err) {
        if (err.stack && err.stack.indexOf('gulp-spawn-mocha') >= 0) {
          return;
        }
        gulpUtil.beep();
        gulpUtil.log(gulpUtil.colors.magenta(err.fileName));
        gulpUtil.log(gulpUtil.colors.red(err.stack || err));
        process.exit(1);
      });
    }
    return root;
  }

  /**
   * WATCHER TASK
   */
  gulp.task(watchTask, function (cb) {
    runSequence.use([
      cleanTask,
      prepareWatchTask,
      cb
    ]);
  });

  /**
   * REAL WATCHER TASK
   */
  gulp.task(prepareWatchTask, function () {
    delete options.istanbul;
    return require('./tasks/watching-test-task')(options);
  });

  /**
   * CLEAN TEMP DIR
   */
  gulp.task(cleanTask, function (cb) {
    return del([options.outputPath + '/**/*']);
  });

  /**
   * PREPARE FILES FOR TESTING
   */
  gulp.task(prepareAssetsTask, function () {
    return require('./tasks/prepare-assets-task')(options);
  });

  /**
   * PROCESS FILES FOR ISTANBUL
   */
  gulp.task(istanbulTask, function () {
    return require('./tasks/prepare-istanbul-task')(options);
  });

  /**
   * RUN THE TEST
   */
  gulp.task(executeTask, function () {
    return require('./tasks/run-test-task')(options);
  });

  gulp.task(taskName, function (cb) {
    var tasks = [
      cleanTask,
      prepareAssetsTask,
      options.istanbul && istanbulTask,
      executeTask
    ].filter(function (task) { return !!task });

    var args = tasks.concat([cb]);
    var context = runSequence.use(gulp);

    context.apply(context, args);
  });
}

function getMochaArgs(options) {
  var mochaArgs = Object.assign({}, argv, {
    R: 'spec',
    debugBrk: argv.d
  });

  return mochaArgs;
}
