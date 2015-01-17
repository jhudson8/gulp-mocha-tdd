0.2.0

- Added ability to use a completely separate tests directory (in addition to module-relative tests)
- Added new configuration options
    - init: init function executed once before the tests
    - testFilePattern: unit test file name pattern (use "{name}" to reference the module name; "{name}-test.js" if undefined).  note: "testFileSuffix" param is no longer a valid option.
    - rootTestsDir: true if using a root tests directory and undefined/false if tests are in a directory relative to the module ([see examples](https://github.com/jhudson8/gulp-mocha-tdd/tree/master/examples)) 

- Change configuration names 
    - "scriptsDir" was changed to "scriptsDirName"
