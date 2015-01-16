var fs = require('fs');

var testFilePattern = '{testFilePattern}';
var testsDirName = '{testsDirName}';
var testFilePath = '{testFilePath}';
var separateTests = {separateTests};
var scriptsDirName = '{scriptsDirName}';
var base = __dirname;
var testBase = __dirname.replace(new RegExp('\/' + testsDirName + '$'), '') + '/' + (separateTests ? testsDirName : scriptsDirName);

// allow for global initialization logic
{init}

function getFilePaths(path) {
  var testFileNameMatch = path.match(new RegExp(testFilePattern.replace('{name}', '([^\/]*)') + '$'));
  var fileName, moduleName;
  if (testFileNameMatch) {
  moduleName = testFileNameMatch[1];
  } else {
  moduleName = path.match(/([^\/]+?)(\.[^.]*$|$)/)[1];
  }
  fileName = moduleName + '.js';

  // return both the test file and standard file from this path (which could be either)
  var relativePath = path.substring(base.length + 1);
  var modulePath = relativePath.replace(new RegExp('\/' + testsDirName + '\/[^\/]*$'), '/').replace(/\/[^\/]*$/, '/').replace(/^[^\/]*\//, '');
  var testFileName = testFilePattern.replace('{name}', moduleName);

  var rtn;
  if (separateTests) {
  rtn = {
    moduleFile: base + '/' + scriptsDirName + '/' + modulePath.replace(new RegExp('^' + testsDirName + '\/'), scriptsDirName + '/') + fileName,
    testFile: base + '/' + testsDirName + '/' + modulePath.replace(new RegExp('^' + scriptsDirName + '\/'), testsDirName + '/') + testFileName,
    isTestFile: !(relativePath.indexOf(scriptsDirName + '/') === 0)
  };
  } else {
  rtn = {
    moduleFile: base + '/' + scriptsDirName + '/' + modulePath.replace('/' + testsDirName + '/', '/' + scriptsDirName + '/') + fileName,
    testFile: base + '/' + scriptsDirName + '/' + modulePath.replace('/' + scriptsDirName + '/', '/' + testsDirName + '/') + testsDirName + '/' + testFileName,
    isTestFile: !!path.match(new RegExp('\/' + testsDirName + '\/[^\\/]*'))
  };
  }
  rtn.relativeModulePath = rtn.moduleFile.substring(base.length + scriptsDirName.length + 1);
  return rtn;
}

// test all
function evalDir(path) {
  fs.readdirSync(path).forEach(function(name) {
    if (!name.match(/^\./)) {
      var _path = path + '/' + name;
      var stats = fs.lstatSync(_path);
      if (stats.isDirectory()) {
        evalDir(_path);
      } else if (stats.isFile() && isTestFile(path, name)) {
        evalFile(_path);
      }
    }
  });
}

function isTestFile(path, name) {
  if (name.indexOf('_') === 0) {
    return false;
  }
  if (separateTests) {
    var relativePath = path.substring(base.length + 1);
    return relativePath === testsDirName || relativePath.match(new RegExp('^' + testsDirName + '\/'));
  } else {
    return path.match(new RegExp('\/' + testsDirName + '$'));
  }
}

function evalFile(path) {
  var filePaths = getFilePaths(path);
  if (filePaths.isTestFile && path.match(/\/_[^\/]*$/)) {
    // files in tests dir prefixed with _ won't be tested - good for utility classes
    return;
  }
  if (!fs.existsSync(filePaths.moduleFile)) {
    // we have a test file without a match
    console.error(filePaths.relativeModulePath + ' does not exist');
  }
  if (!fs.existsSync(filePaths.testFile)) {
    return;
  }

  describe(filePaths.relativeModulePath, function() {
    require(filePaths.testFile);
  });
}

if (testFilePath) {
  evalFile(testFilePath);
} else {
  evalDir(testBase);
}
