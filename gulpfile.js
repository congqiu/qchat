var gulp = require('gulp');
var config = require('config-lite')(__dirname);

var jshint = require('gulp-jshint');
var less = require('gulp-less');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var browserSync = require('browser-sync').create();
var lessPluginAutoPrefix = require("less-plugin-autoprefix");
var nodemon = require('gulp-nodemon');

var autoprefix = new lessPluginAutoPrefix({browsers: [
  "ie >= 8",
  "ie_mob >= 10",
  "ff >= 26",
  "chrome >= 30",
  "safari >= 6",
  "opera >= 23",
  "ios >= 5",
  "android >= 2.3",
  "bb >= 10"
]});

gulp.task('nodemon', function (cb) {
  var started = false;
  nodemon({
    script: './bin/www',
    ext: 'js',
    env: {
      "NODE_ENV": "development",
      "PORT": "3000"
    }
  }).on('start', function() {
    if (!started) {
      cb();
      started = true;
    }
  });
});

gulp.task('browser-sync', ['nodemon'], function () {
  browserSync.init({
    proxy: config.proxy,
    port: 4000,
    open: false
  });
});

// 检查脚本
gulp.task('jslint', function() {
  gulp.src('./public/js/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

// 编译less
gulp.task('less', function() {
  gulp.src('./public/less/*.less')
    .pipe(less({plugins: [autoprefix]}))
    .pipe(gulp.dest('./public/css'))
    .pipe(browserSync.reload({stream:true}));
});


// 默认任务
gulp.task('default', ['browser-sync', 'less'], function(){
    gulp.watch('./**/*.ejs').on("change", browserSync.reload);
    gulp.watch('./**/**/*.ejs').on("change", browserSync.reload);
    gulp.watch('./**/*.js').on("change", browserSync.reload);
    gulp.watch('./**/*.less', ['less']).on("change", browserSync.reload);
});