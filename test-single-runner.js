var fs = require('fs');

var scriptPathPrefix = '{scriptPathPrefix}';
var testFileSuffix = '{testFileSuffix}';
var testsDirName = '{testsDirName}';
var scriptInitFileName = '_init';
var testBase = __dirname.replace(new RegExp('\/' + testsDirName + '$'), '');

// allow for global initialization logic
var initFilePath = './' + scriptPathPrefix + testsDirName + '/' + scriptInitFileName + '.js';
{init}

function evalFile(path) {
  var testFilePath = path.replace(new RegExp('\\/' + testsDirName + '\\/[^\\/]*'), function(fileName) {
    var _fileName = fileName.substring(testsDirName.length+1);
    return _fileName.replace(testFileSuffix, '');
  });
  if (path.match(/\/_[^\/]*$/)) {
    // files in tests dir prefixed with _ won't be tested - good for utility classes
    return;
  }
  if (!fs.existsSync(testFilePath)) {
    // we have a test file without a match
    console.error('invalid test file (no source match) ' + testFilePath);
  }

  if (fs.existsSync(path)) {
    describe(testFilePath.substring(testBase.length+1), function() {
      if (fs.existsSync(path)) {
        require(path);
      }
    });
  } else {
    console.error(path + ' could not be found');
  }
}
evalFile('{filePath}');
