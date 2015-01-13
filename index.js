var plumber = require('gulp-plumber');
var gulpMocha = require('gulp-spawn-mocha');
var filter = require('gulp-filter');
var gulpFile = require('gulp-file');
var gulpIf = require('gulp-if');
var gulpWatch = require('gulp-watch');
var yargs = require('yargs');
var argv = require('yargs').argv;
var moment = require('moment');
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
  var scriptPathPrefix = (options.scriptsDir || 'js') + '/';
  var testFileSuffix = options.testFileSuffix || '-test';
  var testsDirName = options.testsDirName || '_tests';

  var initFunction = options.init ? ('(' + options.init + ')();') : '';

  gulp.task(options.taskName || 'test-js', function() {
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
      if (file.stat.isDirectory()) {
        return true;
      }
      if (hasBeenModified(file)) {
        return true;
      }
    });

    function loadTemplate(fileName) {
      return fs.readFileSync(__dirname + '/' + fileName, {encoding: 'utf8'})
        .replace('{init}', initFunction)
        .replace('{scriptPathPrefix}', scriptPathPrefix)
        .replace('{testFileSuffix}', testFileSuffix)
        .replace('{testsDirName}', testsDirName);
    }

    // run mocha tests against all files
    function testAllFiles() {
      fs.writeFileSync(
        '.test/test-all.js',
        loadTemplate('test-runner.js'),
        {encoding: 'utf8'});

      mocha('.test/test-all.js', mochaArgs, watch);
    }

    // run mocha tests against a single file
    function testFile(file) {
      var path = file.path;
      // this should always be a test file
      var match = path.match(new RegExp('\/' + testsDirName + '\/[^\/]*'));
      if (!match) {
        path = path.replace(/(\/[^\/]*)$/, '/' + testsDirName + '$1', '').replace('.js', testFileSuffix + '.js');
      }

      fs.writeFileSync(
        './.test/test-single.js',
        loadTemplate('test-single-runner.js')
          .replace('{filePath}', path),
        {encoding: 'utf8'});

      mocha('./.test/test-single.js', mochaArgs, watch);
    }


    // create the gulp stream handlers
    var parts = [
      gulp.src('js/**/*')
    ];

    if (watch) {
      // we can't use the gulp stream to run tests if we're watching because
      // the end event is never received
      parts.push(gulpWatch('js/**/*', batch(function(files) {
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

    parts.push(gulp.dest('.test/js'));

    if (!watch) {
      // get rid of all existing files
      parts.push(filter('_nada_'));
      // execute the mocha test as part of the standard gulp stream so it will
      // hook up correctly to other tasks
      parts.push(gulpFile('test-all.js', loadTemplate('test-runner.js')));
      parts.push(gulp.dest('.test'));
      parts.push(gulpMocha(mochaArgs));
    }

    var combiner = require('stream-combiner2');
    var combined = combiner.obj(parts);
    combined.on('error', function(err) {
      console.error(err.stack);
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
    var WAIT = 500;

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
