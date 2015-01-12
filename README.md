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

All modules must be with a root ```js``` directory and have a sibling "_tests" directory containing test modules with the ```-test``` suffix.  For example
```
js
|-- _tests
    |-- foo-test.js
|-- foo.js
|-- some-dir
    |-- _tests
        |-- bar-test.js
    |-- bar.js
```
[see example for details](https://github.com/jhudson8/gulp-mocha-tdd/tree/master/example)

To execute all tests
```
> gulp test-js
```
And watch for module or unit test changes
```
> gulp test-js -w
```
Stop on any debugger statements
```
                    > gulp test -d
{in another window} > node-inspector
{in browser}        > http://127.0.0.1:8080/debug?port=5858
```
Any other mocha params can be used as well: see ```mocha -h```


Any files within the ```_tests``` directories prefixed with ```_``` will be ignored for testing allowing for utility modules.  In addition, a special test module in the root ```_tests``` directory called ```_init.js``` can be created to include any pre-test initialization logic.
```
js
|--
  |-- _tests
      |-- _init.js
```


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

// make the "test-js" task available
gulpMochaTDD(gulp);

// make the "test" task available using "test-js" if desired
gulp.task('test', ['test-js']);
```
