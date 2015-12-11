2.0.2
- remove unused peer dependency

2.0.1
- fix bad release

2.0.0
- include istanbul code coverage (use the `istanbul` option value - see README)
- update mocha versions
- watch mode has changed from `gulp test -w` to `gulp test-watch`

1.1.2
- (optimization) don't "requre" target module if the unit test function callback does not accept any parameters

1.1.1
- fixed bug that was introduced with 1.1.0

1.1.0
- Added global before/after hooks
use global.before = function (done) {...} and global.after(...)

1.0.6
- hack fix a mocha build error (will investigate further with another release)

1.0.5
- remove stale jsdom dependency

1.0.4
- log file contents on error in watch mode - 28f49f9

1.0.3
- fix bug with gulp watch not working sometimes - 362dcb4

1.0.2
- remove unnecessary dependencies - 4eebfd8

1.0.1
- add start identifier for current test when in watch mode - 65ecd81

1.0.0
- always clean out the generated test dir for each test run - a324076

0.4.6

- add concole clearing in watch mode

0.4.5

- add better watch error handling

0.4.4

- handle multi-level test/script base - 91238c3


0.4.3

- fix bug when js directory contains multiple segments


0.4.1

- removed unnecessary code


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
