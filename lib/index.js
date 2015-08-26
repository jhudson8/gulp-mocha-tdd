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
var mkdirp = require('mkdirp');

/**
 * test task arguments
 * grep: grep string
 * d (boolean): allow debugger breakpoints (using node-inspector)
 * i (boolean): generate istanbul code coverate reports
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
    var watch = mochaArgs.w || mochaArgs.watch;
    mochaArgs.w = mochaArgs.watch = undefined;

    // clean the tests but we'll always clean if we aren't watching
    deleteFolderRecursive('.test');

    // load the template contents
    function loadTemplate(testFile, options) {
      return fs.readFileSync(__dirname + '/test-runner.js', {encoding: 'utf8'})
        .replace('{init}', initFunction)
        .replace('{testFilePattern}', testFilePattern)
        .replace('{testsDirName}', testsDirName)
        .replace('{scriptsDirName}', scriptsDirName)
        .replace('{separateTests}', separateTests)
        .replace('{testFilePath}', testFile || '')
        .replace('{options}', JSON.stringify(options || {}))
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
      process.stdout.write('\033c');
      process.stdout.write('=======================================================================================\n');
      writeTemplate(file.path, 'test-single.js');
      mocha('./.test/test-single.js', mochaArgs, watch, function(err) {
        if (err) {
          gulpUtil.beep();
        }
      });
    }

    // create the gulp stream handlers
    var streamHandlers = [
      gulp.src(glob)
    ];

    if (watch) {
      streamHandlers.push(gulpWatch(glob));
      streamHandlers.push(plumber({
        errorHandler: function(err) {
          var filePath = err.file || err.fileName;
          var fileSeen = filePath ? cache[filePath] : false;

          if (!fileSeen) {
            cache[filePath] = true;
            return;
          }

          process.stdout.write('\033c');
          process.stdout.write('=======================================================================================\n');
          gulpUtil.beep();

          gulpUtil.log(gulpUtil.colors.red(err.message));
          gulpUtil.log('');

          filePath = filePath.path || filePath;
          if (filePath) {
            gulpUtil.log('\t' + 'file:   ' + filePath);
          }

          var line = err.line || err.lineNumber;
          var column = err.column;
          if (typeof line === 'undefined') {
            // see if we can extract from message
            var match = err.message && err.message.match(/\(([0-9]+)\:([0-9]+)\)/);
            if (match) {
              line = parseInt(match[1], 10);
              column = parseInt(match[2], 10);
            }
          }

          if (line) {
            gulpUtil.log('\t' + 'line:   ' + line);
          }          
          if (column) {
            gulpUtil.log('\t' + 'column: ' + column);
          }
          
          logFileContents({
            path: filePath,
            line: line
          });
        }
      }));
    }

    // apply the options "pipe" stream handlers
    if (options.pipe && options.pipe.length) {
      Array.prototype.push.apply(streamHandlers, options.pipe);
    }

    // rename file paths so output location is correct
    streamHandlers.push(fileNameNormalizer(process.cwd(), scriptsDirName, testsDirName));

    if (watch) {
      streamHandlers.push(through.obj(function(file, enc, cb) {
        if (file.stat.isFile()) {
          // as long as it's a file, we will write the file out
          // not using gulp.dest because it will suppress the "data" event
          var relativePath = file.path.substring(file.base.length);
          var newPath = file.base + '.test/' + relativePath;
          var dir = newPath.replace(/\/[^\/]*$/, '');

          mkdirp(dir, function (err) {
            if (err) { return cb(err); }

            fs.writeFile( newPath, file.contents, { encoding: 'utf-8' }, function(err) {
              if (err) { return cb(err); }

              // but, only if we have seen the file before do we want to run the test
              // AKA: it's a file save *after* the process has started
              if (fileVisited(file)) {
                file.path = newPath;
                testFile(file, { logNoTest: true });
              }

              cb(null, file);
            });
          });

        } else {
          cb(null, file);
        }
      }));

    } else {
      // write out the files
      streamHandlers.push(gulp.dest('.test'));
      // get rid of all existing files
      streamHandlers.push(filter('_'));
      // execute the mocha test as part of the standard gulp stream so it will
      // hook up correctly to other tasks
      streamHandlers.push(gulpFile('test-all.js', loadTemplate()));
      // write out the test file
      streamHandlers.push(gulp.dest('.test'));
      // execute mocha
      streamHandlers.push(gulpMocha(mochaArgs));

    }

    var combined = combiner.obj(streamHandlers);
    combined.on('error', function(err) {
      if (!watch) {
        if (err.stack.indexOf('gulp-spawn-mocha') === -1) {
          gulpUtil.beep();
          gulpUtil.log(gulpUtil.colors.magenta(err.fileName));
          gulpUtil.log(gulpUtil.colors.red(err.stack));
        }
        process.exit(1);
      }
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
  var cache = {};
  function fileVisited(file) {
    var hasBeenVisited = !!cache[file.path];
    cache[file.path] = true;
    return hasBeenVisited;
  }

  function mocha(runner, args, watch, callback) {
    gulpMocha(args).end({ path: runner }).on('error', function(err) {
      if (callback) {
        callback(err);
      }
      if (!watch) {
        process.exit(1);
      }
    });
  }
};

// remove the last path segment to so the files are in the correct output location
function fileNameNormalizer(root, scriptsDirName, testsDirName) {
  return through.obj(function (file, enc, callback) {
    file.base = file.base.replace('\\', '/');
    file.base = file.base.replace(root + '/' + scriptsDirName, root).replace(root + '/' + testsDirName, root);

    this.push(file);
    callback();
  });
}

function logFileContents(options) {
  var showAround = 15;
  if (options.path && options.line) {
    var contents = fs.readFileSync(options.path, {encoding: 'utf-8'});
    var lines = contents.split('\n');
    var minLine = Math.max(options.line - showAround, 0);
    var maxLine = Math.min(options.line + showAround, lines.length - 1);
  }

  var lineCheck = Math.max(options.line - 1, 0);
  gulpUtil.log('');
  for (var i=minLine; i<=maxLine; i++) {
    if (i === lineCheck) {
      gulpUtil.log(gulpUtil.colors.red('\t' + lines[i]));
    } else {
      gulpUtil.log(gulpUtil.colors.magenta('\t' + lines[i]));
    }
  }
}
