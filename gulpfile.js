'use strict';

// Include Gulp & tools we'll use
var gulp = require('gulp');
var changed = require('gulp-changed');
var newer = require('gulp-newer');
var replace = require('gulp-replace');
var vulcanize = require('gulp-vulcanize');
var crisper = require('gulp-crisper');
var watch = require('gulp-watch');
var open = require('gulp-open');
var jshint = require('gulp-jshint');
var gutil = require('gulp-util');
var print = require('gulp-print');
var iff = require('gulp-if');
var gbower = require('gulp-bower');

var $ = require('gulp-load-plugins')();
var del = require('del');
var runSequence = require('run-sequence');
var merge = require('merge-stream');
var path = require('path');
var fs = require('fs');
var glob = require('glob');
var packageJson = require('./package.json');
var crypto = require('crypto');
var polybuild = require('polybuild');

// for production build
var isProduction = false;

// Path variables
var destDev = 'dev';
var destProd = 'dist';
var destBower = destDev + '/bower_components';

var baseDev = destDev;
var baseProd = destProd;
var baseApp = 'app';
var baseBower = baseApp + '/bower_components';

var srcAll = baseApp + '/**/*';
var srcElementsHtml = baseApp + '/elements/**/*.html';
var srcBase = baseApp + '/*';
var srcElements = baseApp + '/elements/**/*';
var srcScripts = baseApp + '/scripts/**/*';
var srcStyles = baseApp + '/styles/**/*';
var srcImages = baseApp + '/images/**/*';
var srcHtml = baseApp + '/html/**/*';
var srcBower = baseBower + '/**/*';
var srcBowerHtml = baseBower + '/**/*.html';

var srcJs = [baseApp + '/{scripts,elements,html}/**/{*.js,*.html}'];
var srcCsp = [srcBowerHtml, srcElementsHtml];
var srcCsp = [srcElementsHtml];
var srcCsp = [baseApp + '/{bower_components,elements}/**/*.html'];
var srcCss = [baseApp + '/**/*.css'];

var AUTOPREFIXER_BROWSERS = [
	'ie >= 10',
	'ie_mob >= 10',
	'ff >= 30',
	'chrome >= 34',
	'safari >= 7',
	'opera >= 23',
	'ios >= 7',
	'android >= 4.4',
	'bb >= 10'
];

// Update bower and enforce CSP
gulp.task('bower', function () {
	return gbower({ cmd: 'update'})
		.pipe(crisper())
		.pipe(gulp.dest(destBower));
});

// copy files to dev
gulp.task('copy-dev', function () {
	return gulp.src(srcAll, { base: baseApp })
		.pipe(newer(destDev))
		.pipe(iff('*.html', replace('<google-analytics-tracker','<!-- <google-analytics-tracker')))
		.pipe(iff('*.html', replace('</google-analytics-tracker>','</google-analytics-tracker> -->')))
		.pipe(gulp.dest(destDev))
		.pipe($.size({title: 'copy-dev'}));
});

// enforce CSP
gulp.task('csp', ['jshint'], function () {
	return gulp.src(srcCsp, { base: baseApp })
		.pipe(newer(destDev))
		.pipe(crisper())
		.pipe(gulp.dest(destDev))
		.pipe($.size({title: 'csp'}));
});

// Clean output directories
gulp.task('clean', function (cb) {
	del(['.tmp', 'dist', 'dev'], cb);
});

// Initialize the dev directory
gulp.task('dev', function (cb) {
	runSequence('clean', 'csp', 'copy-dev', cb);
});

// Lint JavaScript
gulp.task('jshint', function () {
	return gulp.src(srcJs, { base: baseApp })
		.pipe(newer(destDev))
		.pipe(jshint.extract()) // for inline code
		.pipe(jshint())
		.pipe(jshint.reporter('jshint-stylish'))
		.pipe(iff(isProduction, jshint.reporter('fail')));
});

// Watch files for changes & reload extension
gulp.task('watch',  ['csp', 'copy-dev'], function () {
	gulp.watch(srcStyles, ['copy-dev']);
	gulp.watch(srcImages, ['copy-dev']);
	gulp.watch(srcJs, ['csp', 'copy-dev']);
	gulp.watch(srcBase, ['copy-dev']);
});

var styleTask = function (stylesPath, srcs) {
	return gulp.src(srcs.map(function(src) {
			return path.join('app', stylesPath, src);
		}))
		.pipe($.changed(stylesPath, {extension: '.css'}))
		.pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
		.pipe(gulp.dest('.tmp/' + stylesPath))
		.pipe($.cssmin())
		.pipe(gulp.dest('dist/' + stylesPath))
		.pipe($.size({title: stylesPath}));
};

// Compile and automatically prefix stylesheets
gulp.task('styles', function () {
	return styleTask('styles', ['**/*.css']);
});

gulp.task('elements', function () {
	return styleTask('elements', ['**/*.css']);
});


// Optimize images
gulp.task('images', function () {
	return gulp.src('app/images/**/*')
		.pipe($.cache($.imagemin({
			progressive: true,
			interlaced: true
		})))
		.pipe(gulp.dest('dist/images'))
		.pipe($.size({title: 'images'}));
});

// Copy web fonts to dist
gulp.task('fonts', function () {
	return gulp.src(['app/fonts/**'])
		.pipe(gulp.dest('dist/fonts'))
		.pipe($.size({title: 'fonts'}));
});

// Scan your HTML for assets & optimize them
gulp.task('html', function () {
	var assets = $.useref.assets({searchPath: ['.tmp', 'app', 'dist']});

	return gulp.src(['app/**/*.html', '!app/{elements,test}/**/*.html'])
		// Replace path for vulcanized assets
		.pipe($.if('*.html', $.replace('elements/elements.html', 'elements/elements.vulcanized.html')))
		.pipe(assets)
		// Concatenate and minify JavaScript
		.pipe($.if('*.js', $.uglify({preserveComments: 'some'})))
		// Concatenate and minify styles
		// In case you are still using useref build blocks
		.pipe($.if('*.css', $.cssmin()))
		.pipe(assets.restore())
		.pipe($.useref())
		// Minify any HTML
		.pipe($.if('*.html', $.minifyHtml({
			quotes: true,
			empty: true,
			spare: true
		})))
		// Output files
		.pipe(gulp.dest('dist'))
		.pipe($.size({title: 'html'}));
});

// Polybuild will take care of inlining HTML imports,
// scripts and CSS for you.
gulp.task('vulcanize', function () {
	return gulp.src('dist/index.html')
		.pipe(polybuild({maximumCrush: true}))
		.pipe(gulp.dest('dist/'));
});

// If you require more granular configuration of Vulcanize
// than polybuild provides, follow instructions from readme at:
// https://github.com/PolymerElements/polymer-starter-kit/#if-you-require-more-granular-configuration-of-vulcanize-than-polybuild-provides-you-an-option-by
// Vulcanize granular configuration
//gulp.task('vulcanize', function () {
//	var DEST_DIR = 'dist/elements';
//	return gulp.src('dist/elements/elements.vulcanized.html')
//	  .pipe($.vulcanize({
//	  	stripComments: true,
//	  	inlineCss: true,
//	  	inlineScripts: true
//	  }))
//	  .pipe(gulp.dest(DEST_DIR))
//	  .pipe($.size({ title: 'vulcanize' }));
//});

// Rename Polybuild's index.build.html to index.html
gulp.task('rename-index', function () {
	gulp.src('dist/index.build.html')
		.pipe($.rename('index.html'))
		.pipe(gulp.dest('dist/'));
	return del(['dist/index.build.html']);
});

// Build production files, the default task
// gulp.task('default', ['clean'], function (cb) {
// 	// Uncomment 'cache-config' after 'rename-index' if you are going to use service workers.
// 	runSequence(
// 		['copy', 'styles'],
// 		'elements',
// 		['jshint', 'images', 'fonts', 'html'],
// 		'vulcanize','rename-index', // 'cache-config',
// 		cb);
// });

// Load custom tasks from the `tasks` directory
try { require('require-dir')('tasks'); } catch (err) {}
