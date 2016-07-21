var gulp = require("gulp");
var hb = require("gulp-handlebars");
var deploy      = require('gulp-gh-pages');

/**
 * Push build to gh-pages
 */
gulp.task('deploy', function () {
  return gulp.src("./.dist/**/*")
    .pipe(deploy())
});