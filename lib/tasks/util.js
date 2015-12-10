var fs = require('fs');
var plumber = require('gulp-plumber');
var gulpUtil = require('gulp-util');
var through = require('through2');
var Path = require('path');

module.exports = {
  fileNameNormalizer: fileNameNormalizer,
  writeTemplate: writeTemplate,
  plumber: plumber,
  applyStandardHandlers: applyStandardHandlers,
  logFileContents: logFileContents
}

function applyStandardHandlers (pipeline, options) {
  // apply the options "pipe" stream handlers
  if (options.pipe && options.pipe.length) {
    for (var i = 0; i < options.pipe.length; i++) {
      pipeline = pipeline.pipe(options.pipe[i]);
    }
  }

  pipeline = pipeline.pipe(fileNameNormalizer(process.cwd(),
    options.scriptsDirName, options.testsDirName));
  
  return pipeline;
}

function plumber () {
  return plumber({
    errorHandler: function(err) {
      var filePath = err.file || err.fileName;
      var fileSeen = filePath ? cache[filePath] : false;

      if (!fileSeen) {
        cache[filePath] = true;
        return;
      }

      process.stdout.write('\033c');
      process.stdout.write('=======================\n');
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
  });
}

// remove the last path segment to so the files are in the correct output location
function fileNameNormalizer(root, scriptsDirName, testsDirName) {
  return through.obj(function (file, enc, callback) {
    file.base = file.base.replace('\\', '/');
    file.base = file.base.replace(root + '/' + scriptsDirName, root).replace(root + '/' + testsDirName, root);
    this.push(file);
    callback();
  });
}

// load the template contents
function loadTemplate(options, testFilePath) {
  return fs.readFileSync(__dirname + '/test-runner.template', { encoding: 'utf8' })
    .replace('{init}', options.initFunction)
    .replace('{testFilePattern}', options.testFilePattern)
    .replace('{testsDirName}', options.testsDirName && Path.normalize(options.testsDirName))
    .replace('{scriptsDirName}', options.scriptsDirName && Path.normalize(options.scriptsDirName))
    .replace('{separateTests}', options.separateTests)
    .replace('{testFilePath}', testFilePath && Path.normalize(Path.resolve(testFilePath)) || '')
    .replace('{testBase}', Path.normalize(Path.resolve(options.outputPath)))
    .replace('{options}', JSON.stringify({}))
}

// write the template out to the filesystem
function writeTemplate(output, options, testFilePath) {
  var template = loadTemplate(options, testFilePath);

  fs.writeFileSync(
    options.outputPath + '/' + (output || 'test-all.js'), template, {encoding: 'utf8'});
  return template;
}

function logFileContents(options) {
  var showAround = 15;
  if (options.path && options.line) {
    var contents = fs.readFileSync(options.path, { encoding: 'utf-8' });
    var lines = contents.split('\n');
    var minLine = Math.max(options.line - showAround, 0);
    var maxLine = Math.min(options.line + showAround, lines.length - 1);
  }

  var lineCheck = Math.max(options.line - 1, 0);
  gulpUtil.log('');
  for (var i = minLine; i <= maxLine; i++) {
    if (i === lineCheck) {
      gulpUtil.log(gulpUtil.colors.red('\t' + lines[i]));
    } else {
      gulpUtil.log(gulpUtil.colors.magenta('\t' + lines[i]));
    }
  }
}
