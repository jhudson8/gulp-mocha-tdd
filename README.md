# gulp-mocha-tdd
easy test driven development with gulp and mocha

* it('should use mocha for unit tests')
* it('should auto-generate the boilerplate module test describe statement')
* it('should make test driven development easy and convienant')
* it('should support mocha options like breakpoints and grep')
* it('should use conventions to associate modules with unit tests')
* it('should support additional gulp stream handlers (like JSX)')
* it('should re-run module tests when either the module or unit test code changes')

By keeping unit tests in a subdirectory of the module javascript directory, the tests are more flexible when code is refactored and module references from the unit tests are more convienant.

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
> node-inspector  {in another window} (install globally if it does not exist)
browse to http://127.0.0.1:8080/debug?port=5858
```
Any other mocha params can be used as well: see ```mocha -h```


All modules must be with a root ```js``` directory and have a sibling "_tests" directory containing test modules with the ```-test``` suffix.  For example
```
js
|-- _tests
    |-- foo-test.js
|
|-- foo.js
|
|-- some-dir
    |-- _tests
        |-- bar-test.js
    |
    |-- bar.js
```
[see example for details](https://github.com/jhudson8/gulp-mocha-tdd/tree/master/example)

Any files within the ```_tests``` directories prefixed with ```_``` will be ignored for testing allowing for utility modules.


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
* ***scriptsDir***: top level directory ("js" if undefined)
* ***testFileSuffix***: unit test file name suffix ("-test" if undefined)
* ***testsDirName***: name of directory which contains the unit test files ("_tests" if undefined)


Installation
------------
Install dependencies
```
npm install --save-dev mocha
npm install --save-dev gulp
npm install --save-dev gulp-mocha-tdd
```

Inject the ```test-js``` task in ```gulpfile.js```
```
var gulp = require('gulp');
var gulpMochaTDD = require('gulp-mocha-tdd');

gulpMochaTDD(gulp);
```

Add ```.test``` to your ```.gitignore``` file
