# gulp-mocha-tdd
easy test driven development with gulp and mocha

* it('should use mocha for unit tests')
* it('should auto-generate the boilerplate module test describe statement')
* it('should be able to work with your test naming conventions')
* it('should make test driven development easy and convienant')
* it('should support mocha options like breakpoints and grep')
* it('should use conventions to associate modules with unit tests')
* it('should support additional gulp stream handlers (like JSX)')
* it('should re-run module tests when either the module or unit test code changes')


Usage
-----------

To execute all tests
```
> gulp test
```
And watch for module or unit test changes
```
> gulp test -w
```
Stop on any debugger statements
```
> gulp test -d
> node-inspector  {in another window}
browse to http://127.0.0.1:8080/debug?port=5858
```
Any other mocha params can be used as well: see ```mocha -h```


All modules must be within a root directory ("js" by default) and tests can either be in a separate root directory ("tests" by default) or tests can be in a directory relative ("_tests" by default) to the module.  Tests can use any naming pattern ("{module name}-test.js" by default).

For example
```
|-- js
    |-- _tests
        |-- foo-test.js
    |-- foo.js
```
or
```
|-- lib
    |-- foo.js
|-- tests
    |-- foo.spec.js
```

See Options below for available configuration

[see examples for details](https://github.com/jhudson8/gulp-mocha-tdd/tree/master/examples)

Any files within the test directories prefixed with ```_``` will be ignored for testing allowing for utility modules.


Additional Transformations
------------
The ```pipe``` option (array of gulp stream handlers) can be used to perform additional transformations.  The
following gulpfile can be used to support React JSX
```
var gulp = require('gulp');
var react = require('gulp-react');
var gulpMochaTDD = require('gulp-mocha-tdd');

gulpMochaTDD(gulp, {
  pipe: [react({ harmony: true })]
});
```

Options
------------
* ***taskName***: the gulp task name ("test" if undefined)
* ***pipe***: array of gulp stream handlers (See above for example)
* ***init***: init function executed once before the tests
* ***scriptsDirName***: top level directory ("js" if undefined)
* ***testFilePattern***: unit test file name pattern (use "{name}" to reference the module name; "{name}-test.js" if undefined)
* ***testsDirName***: name of directory which contains the unit test files ("_tests" if undefined)
* ***rootTestsDir***: true if using a root tests directory and undefined/false if tests are in a directory relative to the module ([see examples](https://github.com/jhudson8/gulp-mocha-tdd/tree/master/examples))


Installation
------------
Install dependencies
```
npm install --save-dev mocha
npm install --save-dev gulp
npm install --save-dev gulp-mocha-tdd
```

Inject the ```test``` task in ```gulpfile.js```
```
var gulp = require('gulp');
var gulpMochaTDD = require('gulp-mocha-tdd', {
  // add options here
});

gulpMochaTDD(gulp);
```

Add ```.test``` to your ```.gitignore``` file
