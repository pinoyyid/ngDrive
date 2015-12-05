var gulp = require('gulp');
var Server = require('karma').Server;

/**
 * Run test once and exit
 */
gulp.task('test', function (done) {
  new Server({
    configFile:  '../../../test/karma.conf.js',
    singleRun: true
  }, done).start();
});
