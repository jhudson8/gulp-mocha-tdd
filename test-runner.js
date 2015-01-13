var fs = require('fs');

var scriptPathPrefix = '{scriptPathPrefix}';
var testFileSuffix = '{testFileSuffix}';
var testsDirName = '{testsDirName}';
var scriptInitFileName = '_init';
var testBase = __dirname.replace(new RegExp('\/' + testsDirName + '$'), '');

// allow for global initialization logic
{init}

// test all
function evalDir(path) {
  fs.readdirSync(path).forEach(function(name) {
    if (!name.match(/^\./)) {
      var _path = path + '/' + name;
      var stats = fs.lstatSync(_path);
      if (stats.isDirectory()) {
        evalDir(_path);
      } else if (stats.isFile() && path.match(new RegExp('\/' + testsDirName + '$'))) {
        evalFile(_path);
      }
    }
  });
}

function evalFile(path) {
  var testFilePath = path.replace(new RegExp(testsDirName + '\/[^\/]*'), function(fileName) {
    var _fileName = fileName.substring(testsDirName.length+1);
    return _fileName.replace(testFileSuffix, '');
  });
  if (path.match(/\/_[^\/]*$/)) {
    // files in tests dir prefixed with _ won't be tested - good for utility classes
    return;
  }
  if (!fs.existsSync(testFilePath)) {
    // we have a test file without a match
    throw new Error('invalid test file (no source match) ' + path);
  }

  describe(testFilePath.substring(testBase.length), function() {
    require(path);
  });
}
evalDir(testBase);
