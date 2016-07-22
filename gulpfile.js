const DEPLOY_PATH = "./dist";

var gulp = require("gulp");
var hb = require("gulp-handlebars");
var deploy = require('gulp-gh-pages');
var clean = require('gulp-clean');
var wrap = require('gulp-wrap');
var declare = require('gulp-declare');
var concat = require('gulp-concat');
var runSequence = require('gulp-run-sequence');

gulp.task("default", ["build"]);

gulp.task("clean", function() {
  gulp.src(DEPLOY_PATH, {read:false})
    .pipe(clean());
});

/* Deploy tasks */
gulp.task('deploy', ["build"], function () {
  return gulp.src(DEPLOY_PATH+"/**/*")
    .pipe(deploy());
});

gulp.task('build_pages', function() {
  gulp.src('index.html')
    .pipe(gulp.dest(DEPLOY_PATH));  
});

gulp.task("build_templates", function() {  
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
    .pipe(gulp.dest(DEPLOY_PATH+"/templates/"));
});

gulp.task("build_styles", function() {
  gulp.src("stylesheets/*")
    .pipe(gulp.dest(DEPLOY_PATH+"/stylesheets/"));
});

gulp.task("build_scripts", function () {
  gulp.src("js/*.js").pipe(gulp.dest(DEPLOY_PATH+"/js/"));
});

gulp.task("build_media", function() {
  gulp.src("media/**/*").pipe(gulp.dest(DEPLOY_PATH+"/media/"));
});

gulp.task("build_dependencies", function() {
  var nodeModules = [
    "jquery/dist/jquery.min.js",
    "firebase/firebase.js", 
    "geofire/dist/geofire.min.js",
    "handlebars/dist/handlebars.runtime.min.js"
  ];

  for (var i = 0; i < nodeModules.length; i++) {
    nodeModules[i] = "node_modules/"+nodeModules[i];
  }

  gulp.src(nodeModules)
    .pipe(gulp.dest(DEPLOY_PATH+"/dependencies/"));
});

gulp.task("build", ["build_pages", "build_templates", "build_styles", "build_scripts", "build_media", "build_dependencies"]);