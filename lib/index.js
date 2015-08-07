var plumber = require('gulp-plumber');
var gulpMocha = require('gulp-spawn-mocha');
var filter = require('gulp-filter');
var gulpFile = require('gulp-file');
var gulpIf = require('gulp-if');
var gulpUtil = require('gulp-util');
var gulpWatch = require('gulp-watch');
var yargs = require('yargs');
var argv = require('yargs').argv;
var moment = require('moment');
var through = require('through2');
var combiner = require('stream-combiner2');
var fs = require('fs');
var Path = require('path');

/**
 * test task arguments
 * grep: grep string
 * d (boolean): allow debugger breakpoints (using node-inspector)
 * i (boolean): generate istanbul code coverate reports
 * clean: clean out test dir contents
 */

module.exports = function(gulp, options) {
  options = options || {};

  var taskName = options.taskName || 'test';
  var scriptsDirName = options.scriptsDirName || 'js';
  var testFilePattern = options.testFilePattern || '{name}-test';
  var separateTests = !!options.rootTestsDir;
  var testsDirName = options.testsDirName || (separateTests ? 'tests' : '_tests');
  var glob = separateTests ? [scriptsDirName + '/**/*', testsDirName + '/**/*'] : scriptsDirName + '/**/*';
  var initFunction = options.init ? ('(' + options.init + ')();') : '';

  gulp.task(taskName, function() {
    var mochaArgs = getMochaArgs();
    var clean = mochaArgs.c || mochaArgs.clean;
    mochaArgs.c = true;
    var watch = mochaArgs.w || mochaArgs.watch;
    mochaArgs.w = mochaArgs.watch = undefined;

    if (clean) {
      // clean the tests
      deleteFolderRecursive('.test');
    }

    var newCodeFilter = filter(function(file) {
      if (!file.stat) return false;
      return file.stat.isDirectory() || hasBeenModified(file);
    });

    // load the template contents
    function loadTemplate(testFile) {
      return fs.readFileSync(__dirname + '/test-runner.js', {encoding: 'utf8'})
        .replace('{init}', initFunction)
        .replace('{testFilePattern}', testFilePattern)
        .replace('{testsDirName}', testsDirName)
        .replace('{scriptsDirName}', scriptsDirName)
        .replace('{separateTests}', separateTests)
        .replace('{testFilePath}', testFile || '');
    }

    // write the template out to the filesystem
    function writeTemplate(testFile, output) {
      var template = loadTemplate(testFile);

      fs.writeFileSync(
        '.test/' + (output || 'test-all.js'), template, {encoding: 'utf8'});
    }

    // run mocha tests against all files
    function testAllFiles() {
      writeTemplate();
      mocha('./.test/test-all.js', mochaArgs, watch);
    }

    // run mocha tests against a single file
    function testFile(file) {
      writeTemplate(file.path, 'test-single.js');
      mocha('./.test/test-single.js', mochaArgs, watch);
    }


    // create the gulp stream handlers
    var streamHandlers = [
      gulp.src(glob)
    ];

    if (watch) {
      // we can't use the gulp stream to run tests if we're watching because
      // the end event is never received
      streamHandlers.push(gulpWatch(glob, callOnlyIfNew(function(file) {
        testFile(file);
      })));
      streamHandlers.push(plumber({
        errorHandler: function(err) {
          gulpUtil.beep();
          gulpUtil.log(gulpUtil.colors.magenta(err.fileName));
          gulpUtil.log(gulpUtil.colors.red(err.message));
        }
      }));
    }

    // filter out files that have not changed in the .test dir
    streamHandlers.push(newCodeFilter);
    // apply the options "pipe" stream handlers
    if (options.pipe && options.pipe.length) {
      Array.prototype.push.apply(streamHandlers, options.pipe);
    }

    // rename file paths so output location is correct
    streamHandlers.push(renamer(process.cwd(), scriptsDirName, testsDirName));
    streamHandlers.push(gulp.dest('.test'));

    if (!watch) {
      // get rid of all existing files
      streamHandlers.push(filter('_'));
      // execute the mocha test as part of the standard gulp stream so it will
      // hook up correctly to other tasks
      streamHandlers.push(gulpFile('test-all.js', loadTemplate()));
      streamHandlers.push(gulp.dest('.test'));
      streamHandlers.push(gulpMocha(mochaArgs));
    }

    var combined = combiner.obj(streamHandlers);
    combined.on('error', function(err) {
      if (err.stack.indexOf('gulp-spawn-mocha') === -1) {
        gulpUtil.beep();
        gulpUtil.log(gulpUtil.colors.magenta(err.fileName));
        gulpUtil.log(gulpUtil.colors.red(err.stack));
      }
      process.exit(1);
    });
    return combined;

    function getMochaArgs() {
      var mochaArgs = {};
      var allowedArgs = ['A', 'c', 'C', 'G', 'R', 'S', 'b', 'd', 'g', 'i', 'r', 's', 't', 'u', 'w',
          'asyncOnly', 'colors', 'noColors', 'growl', 'reporter', 'sort', 'bail', 'debug', 'grep',
          'invert', 'require', 'slow', 'timeout', 'ui', 'watch', 'checkLeaks', 'compilers', 'debugBrk', 'globals',
          'harmony', 'harmonyCollections', 'harmonyGenerators', 'harmonyProxies', 'inlineDiffs', 'interfaces',
          'noDeprecation', 'noExit', 'noTimeouts', 'opts', 'prof', 'throwDeprecation', 'trace', 'traceDeprecation'];

      for (i=0; i<allowedArgs.length; i++) {
        name = allowedArgs[i];
        value = argv[name];
        if (typeof value !== 'undefined') {
          mochaArgs[name] = value;
        }
      }

      function defaultValue(key, value) {
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
      argv.d = undefined;
      argv.debug = undefined;
      mochaArgs.istanbul = options.istanbul;
      return mochaArgs;
    }
  });

  function hasBeenModified(file) {
    var path = file.path;
    var sourceModified = moment(file.stat.mtime);
    var destFilePath = Path.join(__dirname, '.test', file.path.substring(__dirname.length));
    if (fs.existsSync(destFilePath)) {
      var destFileStat = fs.statSync(destFilePath);
      var destModified = moment(destFileStat.mtime);
      return sourceModified.diff(destModified) > 0;
    }
    return true;
  }

  function deleteFolderRecursive(path) {
    if( fs.existsSync(path) ) {
      fs.readdirSync(path).forEach(function(file, index){
        var curPath = Path.join(path, file);
        if(fs.lstatSync(curPath).isDirectory()) {
          deleteFolderRecursive(curPath);
        } else {
          // delete file
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  }

  // simple watch handler that will batch events to work the fact that the watch
  // stream handler does not trigger the "end" event
  function callOnlyIfNew(callback) {
    return function(file) {
      // new files changes will be in /.test
      if (file.path.indexOf('/.test/') >= 0) {
        callback(file);
      }
    };
  }

  function mocha(runner, args, watch) {
    gulpMocha(args).end({ path: runner }).on('error', function(err) {
      if (!watch) {
        process.exit(1);
      }
    });
  }
};

// remove the last path segment to so the files are in the correct output location
function renamer(root, scriptsDirName, testsDirName) {
  return through.obj(function (file, enc, callback) {
    file.base = file.base.replace('\\', '/');
    file.base = file.base.replace(root + '/' + scriptsDirName, root).replace(root + '/' + testsDirName, root);

    this.push(file);
    callback();
  });
}
