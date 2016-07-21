var gulp = require("gulp");
var hb = require("gulp-handlebars");
var deploy = require('gulp-gh-pages');

/**
 * Push build to gh-pages
 */
gulp.task('default', function () {
  return gulp.src("./.dist/**/*")
    .pipe(deploy())
});