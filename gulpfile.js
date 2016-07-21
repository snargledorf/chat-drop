const DIST_PATH = "./.dist";

var gulp = require("gulp");
var hb = require("gulp-handlebars");
var deploy = require('gulp-gh-pages');
var clean = require('gulp-clean');
var wrap = require('gulp-wrap');
var declare = require('gulp-declare');
var concat = require('gulp-concat');
var runSequence = require('gulp-run-sequence');

gulp.task("default", ["deploy"]);

gulp.task("clean", function() {
  gulp.src(DIST_PATH, {read:false})
    .pipe(clean());
});

gulp.task('pages', function() {
  gulp.src('index.html')
    .pipe(gulp.dest('.dist'));  
});

gulp.task("templates", function() {
  gulp.src("templates/*.handlebars")
    .pipe(hb({
      handlebars: require('handlebars')
    }))
    .pipe(wrap('Handlebars.template(<%= contents %>)'))
    .pipe(declare({
      namespace: 'MyApp.templates',
      noRedeclare: true, // Avoid duplicate declarations 
    }))
    .pipe(concat('templates.js'))
    .pipe(gulp.dest(DIST_PATH+"/templates/"));
});

gulp.task("styles", function() {
  gulp.src("stylesheets/*")
    .pipe(gulp.dest(DIST_PATH+"/stylesheets/"));
});

gulp.task("scripts", function () {
  gulp.src("js/*.js").pipe(gulp.dest(DIST_PATH+"/js/"));
});

gulp.task("media", function() {
  gulp.src("media/**/*").pipe(gulp.dest(DIST_PATH+"/media/"));
});

gulp.task("dependencies", function() {
  var nodeModules = [
    "jquery/dist/jquery.min.js",
    "firebase/firebase.js", 
    "geofire/dist/geofire.min.js",
    "handlebars/dist/handlebars.runtime.min.js"
  ];

  for (var i = 0; i < nodeModules.length; i++) {
    var modPath = "node_modules/"+nodeModules[i];
    gulp.src(modPath)
      .pipe(gulp.dest(DIST_PATH+"/dependencies/"));
  }
});

gulp.task("build", ["pages", "templates", "styles", "scripts", "media", "dependencies"]);

/**
 * Push build to gh-pages
 */
gulp.task('deploy', ["build"], function () {
  return gulp.src(DIST_PATH+"/**/*")
    .pipe(deploy());
});