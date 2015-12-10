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

  if (argv.grep && options.istanbul) {
    // don't do istanbul if it's a grep
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
    }
    if (!options.watch) {
      root.on('error', function (err) {
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
/*
    var combined = combiner.obj(streamHandlers);
    if (!options.watch) {
      combined.on('error', function(err) {
        if (err.stack && err.stack.indexOf('gulp-spawn-mocha') >= 0) {
          return;
        }
        gulpUtil.beep();
        gulpUtil.log(gulpUtil.colors.magenta(err.fileName));
        gulpUtil.log(gulpUtil.colors.red(err.stack || err));
        process.exit(1);
      });
    }
    return combined;
*/
  }

  /**
   * WATCHER TASK
   */
  gulp.task(watchTask, function (cb) {
/*
  return gulp.src(options.glob)
    .pipe(require('gulp-watch')(options.glob))
    .pipe(require('gulp-debug')())
*/

    var args = [
      cleanTask,
      prepareWatchTask,
      cb
    ];
    var context = runSequence.use(gulp);
    context.apply(context, args);
  });

  /**
   * REAL WATCHER TASK
   */
  gulp.task(prepareWatchTask, function () {
    delete options.istanbul;

/*
    return gulp.src(options.glob)
      .pipe(require('gulp-watch')(options.glob))
      // .pipe(util.plumber())
      .pipe(require('gulp-debug')())
*/

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
    return require('./tasks/prepare-assets-task')(options)
      .on('error', function (err) {
        if (err.stack && err.stack.indexOf('gulp-spawn-mocha') >= 0) {
          return;
        }
        gulpUtil.beep();
        gulpUtil.log(gulpUtil.colors.magenta(err.fileName));
        gulpUtil.log(gulpUtil.colors.red(err.stack || err));
        process.exit(1);
      });
  });

  /**
   * PROCESS FILES FOR ISTANBUL
   */
  gulp.task(istanbulTask, function () {
    return require('./tasks/prepare-istanbul-task')(options)
      .on('error', function (err) {
        if (err.stack && err.stack.indexOf('gulp-spawn-mocha') >= 0) {
          return;
        }
        gulpUtil.beep();
        gulpUtil.log(gulpUtil.colors.magenta(err.fileName));
        gulpUtil.log(gulpUtil.colors.red(err.stack || err));
        process.exit(1);
      });
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
  var mochaArgs = {};
  var allowedArgs = ['A', 'c', 'C', 'G', 'R', 'S', 'b', 'd', 'g', 'i', 'r', 's', 't', 'u', 'w',
      'asyncOnly', 'colors', 'noColors', 'growl', 'reporter', 'sort', 'bail', 'debug', 'grep',
      'invert', 'require', 'slow', 'timeout', 'ui', 'watch', 'checkLeaks', 'compilers', 'debugBrk', 'globals',
      'harmony', 'harmonyCollections', 'harmonyGenerators', 'harmonyProxies', 'inlineDiffs', 'interfaces',
      'noDeprecation', 'noExit', 'noTimeouts', 'opts', 'prof', 'throwDeprecation', 'trace', 'traceDeprecation'];

  for (i = 0; i < allowedArgs.length; i++) {
    name = allowedArgs[i];
    value = argv[name];
    if (typeof value !== 'undefined') {
      mochaArgs[name] = value;
    }
  }

  function defaultValue (key, value) {
    var _value = mochaArgs[key];
    for (var i=2; i<arguments.length; i++) {
      if (typeof _value === 'undefined') {
        _value = mochaArgs[arguments[i]];
      }
    }
    if (typeof _value === 'undefined') {
      _value = value;
    }
    mochaArgs[key] = value;
  }

  defaultValue('R', 'spec', 'reporter');
  defaultValue('debugBrk', argv.d || argv.debug);
  return mochaArgs;
}
