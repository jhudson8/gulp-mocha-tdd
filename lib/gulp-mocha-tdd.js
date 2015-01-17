var plumber = require('gulp-plumber');
var gulpMocha = require('gulp-spawn-mocha');
var filter = require('gulp-filter');
var gulpFile = require('gulp-file');
var gulpIf = require('gulp-if');
var gulpWatch = require('gulp-watch');
var yargs = require('yargs');
var argv = require('yargs').argv;
var moment = require('moment');
var through = require('through2');
var fs = require('fs');

/**
 * test task arguments
 * grep: grep string
 * d (boolean): allow debugger breakpoints (using node-inspector)
 * i (boolean): generate istanbul code coverate reports
 * clean: clean out test dir contents
 */

module.exports = function(gulp, options) {
  options = options || {};
  var scriptsDirName = options.scriptsDirName || 'js';
  var testFilePattern = options.testFilePattern || '{name}-test.js';
  var separateTests = !!options.rootTestsDir;
  var testsDirName = options.testsDirName || (separateTests ? 'tests' : '_tests');
  var glob = separateTests ? [scriptsDirName + '/**/*', testsDirName + '/**/*'] : scriptsDirName + '/**/*';
  var initFunction = options.init ? ('(' + options.init + ')();') : '';

  gulp.task(options.taskName || 'test', function() {
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
      if (file.stat.isDirectory()) {
        return true;
      }
      if (hasBeenModified(file)) {
        return true;
      }
    });

    function loadTemplate(testFile) {
      return fs.readFileSync(__dirname + '/test-runner.js', {encoding: 'utf8'})
        .replace('{init}', initFunction)
        .replace('{testFilePattern}', testFilePattern)
        .replace('{testsDirName}', testsDirName)
        .replace('{scriptsDirName}', scriptsDirName)
        .replace('{separateTests}', separateTests)
        .replace('{testFilePath}', testFile || '');
    }

    function writeTemplate(testFile) {
      var template = loadTemplate(testFile);

      fs.writeFileSync(
        '.test/test-all.js', template, {encoding: 'utf8'});
    }

    // run mocha tests against all files
    function testAllFiles() {
      writeTemplate();
      mocha('./.test/test-all.js', mochaArgs, watch);
    }

    // run mocha tests against a single file
    function testFile(file) {
      writeTemplate(file.path);
      mocha('./.test/test-all.js', mochaArgs, watch);
    }


    // create the gulp stream handlers
    var parts = [
      gulp.src(glob),
    ];

    if (watch) {
      // we can't use the gulp stream to run tests if we're watching because
      // the end event is never received
      parts.push(gulpWatch(glob, batch(function(files) {
        if (files.length > 1) {
          testAllFiles();
        } else {
          testFile(files[0]);
        }
      })));
      parts.push(plumber());
    }
    parts.push(newCodeFilter);
    if (options.pipe && options.pipe.length) {
      Array.prototype.push.apply(parts, options.pipe);
    }

    parts.push(renamer);
    parts.push(gulp.dest('.test'));

    if (!watch) {
      // get rid of all existing files
      parts.push(filter('_nada_'));
      // execute the mocha test as part of the standard gulp stream so it will
      // hook up correctly to other tasks
      parts.push(gulpFile('test-all.js', loadTemplate()));
      parts.push(gulp.dest('.test'));
      parts.push(gulpMocha(mochaArgs));
    }

    var combiner = require('stream-combiner2');
    var combined = combiner.obj(parts);
    combined.on('error', function(err) {
      if (err.stack.indexOf('gulp-spawn-mocha') === -1) {
        console.error(err.stack);
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
    var destFilePath = "" + __dirname + '/.test' + file.path.substring(__dirname.length);
    if (fs.existsSync(destFilePath)) {
      var destFileStat = fs.statSync(destFilePath);
      var destModified = moment(destFileStat.mtime);
      return sourceModified.diff(destModified) > 0;
    }
    return true;
  }

  function deleteFolderRecursive(path) {
    if( fs.existsSync(path) ) {
      fs.readdirSync(path).forEach(function(file,index){
        var curPath = path + "/" + file;
        if(fs.lstatSync(curPath).isDirectory()) {
          deleteFolderRecursive(curPath);
        } else { // delete file
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  }

  function batch(callback) {
    var buffer = [];
    var timer;
    var WAIT = 250;

    function flush() {
      callback(buffer);
      buffer = [];
    }

    return function(file) {
      buffer.push(file);
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(flush, WAIT);
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

var renamer = through.obj(function (file, enc, callback) {
  // take away the js/test dir
  file.base = file.base.replace(/\/[^\/]*\/$/, '\/');
  this.push(file);
  callback();
});
