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
  var separateTests = options.separateTests = !!options.rootTestsDir;
  var scriptsDirName = options.scriptsDirName || 'js';
  var taskName = options.taskName || 'test';
  var testsDirName = options.testsDirName || 'tests';

  options = Object.assign({}, options, {
    taskName: taskName,
    scriptsDirName: scriptsDirName,
    testFilePattern: options.testFilePattern || '{name}-test',
    separateTests: separateTests,
    testsDirName: options.testsDirName || (separateTests ? 'tests' : '_tests'),
    glob: separateTests ? [scriptsDirName + '/**/*', testsDirName + '/**/*'] : scriptsDirName + '/**/*',
    initFunction: options.init ? ('(' + options.init + ')();') : '',
    outputPath: options.outputPath || './.test',
    gulp: gulp
  });
  options.mochaOptions = getMochaOptions(options);
  options.debugMode = options.mochaOptions['debug-brk'];
  options.testsDirName = options.testsDirName || testsDirName;

  // don't do coverage if we are using grep
  if ((argv.grep || options.debugMode) && options.istanbul) {
    delete options.istanbul;
  }

  // define task names
  var prepareAssetsTask = taskName + '-prepare-assets';
  var istanbulTask = taskName + '-istanbul';
  var watchTask = taskName + '-watch';
  var cleanTask = taskName + '-clean';
  var executeTask = taskName + '-execute';

  function combine(streams, watch) {
    var pipeline = streams[0];
    for (var i = 1; i < streams.length; i++) {
      pipeline = pipeline.pipe(streams[i]);
      pipeline = pipeline.on('error', function (err) {
        gulpUtil.log(gulpUtil.colors.red(err.message));
        if (!watch) {
          gulpUtil.log(err.stack);
          process.exit(1);
        } else if (options.readyForTesting) {
          process.stdout.write('\033c');
          gulpUtil.log('=======================\n');
          gulpUtil.log(err.stack);
          gulpUtil.beep();
        }
      });
    }
    return pipeline;
  }

  /**
   * WATCHER TASK
   */
  gulp.task(watchTask, [cleanTask], function () {
    delete options.istanbul;
    return combine(require('./tasks/watching-test-task')(options), true);
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
    return combine(require('./tasks/prepare-assets-task')(options));
  });

  /**
   * PROCESS FILES FOR ISTANBUL
   */
  gulp.task(istanbulTask, function () {
    return combine(require('./tasks/prepare-istanbul-task')(options));
  });

  /**
   * RUN THE TEST
   */
  gulp.task(executeTask, function () {
    return combine(require('./tasks/run-test-task')(options));
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

function getMochaOptions(options) {
  var mochaArgs = Object.assign({}, argv, {
    R: 'spec',
    'debug-brk': argv.d
  }, options.mocha);
  return mochaArgs;
}
