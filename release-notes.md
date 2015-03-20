0.4.0

- added the ability to export a function call that accepts the target module and target module directory path as parameters.  Below is from the README

Test modules do not need the top level ```describe``` function (it will be created automatically based on file structure).  You can either just have your tests directly in the file (no usage of ```module.exports```) or you can export a function callback that contains your tests.  This callback accepts 2 parameters ```(targetModule, targetModuleDirectoryPath)```.  For example:

```
var targetModule = require('path/to/target/module');
it('should ...', function() {
  expect(targetModule...).to...
});
```
or
```
module.exports = function(targetModule, targetBase) {
  it('should ...', function() {
    expect(targetModule...).to...
  });
  it('should ...', function() {
    expect(require(targetBase + '/targetModuleName')...).to...
  });
}
```


0.3.0

- general code cleanup
- changed "testFilePattern" init option to *not* include the extension.  For example, a valid value might be "{name}-test"


0.2.0

- Added ability to use a completely separate tests directory (in addition to module-relative tests)
- Added new configuration options
    - init: init function executed once before the tests
    - testFilePattern: unit test file name pattern (use "{name}" to reference the module name; "{name}-test.js" if undefined).  note: "testFileSuffix" param is no longer a valid option.
    - rootTestsDir: true if using a root tests directory and undefined/false if tests are in a directory relative to the module ([see examples](https://github.com/jhudson8/gulp-mocha-tdd/tree/master/examples)) 

- Change configuration names 
    - "scriptsDir" was changed to "scriptsDirName"
