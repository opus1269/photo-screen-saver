'use strict';

// paths and files
const base = {
	app: 'photo-screen-saver',
	src: 'app/',
	dist: 'dist/',
	dev: 'dev/',
	store: 'store/',
};
const path = {
	scripts: base.src + 'scripts/',
	html: base.src + 'html/',
	elements: base.src + 'elements/',
	styles: base.src + 'styles/',
	images: base.src + 'images/',
	assets: base.src + 'assets/',
	lib: base.src + 'lib/',
	bower: base.src + 'bower_components/',
};
const files = {
	manifest: base.src + 'manifest.json',
	scripts: path.scripts + '*.*',
	html: path.html + '*.*',
	styles: path.styles + '**/*.*',
	elements: path.elements + '**/*.*',
	images: path.images + '*.*',
	assets: path.assets + '*.*',
	lib: path.lib + '**/*.*',
	bower: [path.bower + '**/*', '!' + path.bower + '**/test/*',
		'!' + path.bower + '**/demo/*'],
};

// command options
const minifierOpts = {
	preserveComments: 'license',
};
const crisperOpts = {
	scriptInHead: false,
};
const vulcanizeOpts = {
	stripComments: true,
	inlineCss: true,
	inlineScripts: true,
};

// flag for production release build
let isProd = false;
// flag to keep key in production build for testing purposes
let isProdTest = false;

const gulp = require('gulp');
const del = require('del');
const runSequence = require('run-sequence');
const gutil = require('gulp-util');
// for ECMA6
const uglifyjs = require('uglify-js-harmony');
const minifier = require('gulp-uglify/minifier');

// load the rest
const plugins = require('gulp-load-plugins')({
	pattern: ['gulp-*', 'gulp.*'],
	replaceString: /\bgulp[\-.]/,
});

const regex = new RegExp('^(.*?)' + base.app + '\\\\', 'g');

/**
 * Output filenames that changed
 *
 * @param {Event} event
 */
function onChange(event) {
	gutil.log('File', gutil.colors.cyan(event.path.replace(regex, '')),
		'was', gutil.colors.magenta(event.type));
}

// Default - watch for changes in development
gulp.task('default', ['watch']);

// track changes in development
gulp.task('watch', ['manifest', 'scripts', 'html', 'styles', 'elements',
		'images', 'assets', 'lib'],
	function() {
		gulp.watch(files.manifest, ['manifest']).on('change', onChange);
		gulp.watch([files.scripts, 'gulpfile.js', '.eslintrc.js',
			base.src + '*.js'], ['scripts']).on('change', onChange);
		gulp.watch(files.html, ['html']).on('change', onChange);
		gulp.watch(files.styles, ['styles']).on('change', onChange);
		gulp.watch(files.elements, ['elements']).on('change', onChange);
		gulp.watch(files.images, ['images']).on('change', onChange);
		gulp.watch(files.assets, ['assets']).on('change', onChange);
		gulp.watch(files.lib, ['lib']).on('change', onChange);
	});

// Development build
gulp.task('dev', function(callback) {
	isProd = false;
	runSequence('clean', ['bower', 'manifest', 'html', 'scripts', 'styles',
		'elements', 'images', 'assets', 'lib'], callback);
});

// Production build
gulp.task('prod', function(callback) {
	isProd = true;
	isProdTest = false;
	runSequence('clean', ['manifest', 'html', 'scripts', 'styles', 'vulcanize',
		'images', 'assets', 'lib'], 'zip', callback);
});

// Production test build
gulp.task('prodTest', function(callback) {
	isProd = true;
	isProdTest = true;
	runSequence('clean', ['manifest', 'html', 'scripts', 'styles', 'vulcanize',
		'images', 'assets', 'lib'], 'zip', callback);
});

// clean output directories
gulp.task('clean', function() {
	return del(isProd ? base.dist : base.dev);
});

// clean output directories
gulp.task('clean-all', function() {
	return del([base.dist, base.dev]);
});

// manifest.json
gulp.task('manifest', function() {
	return gulp.src(base.src + 'manifest.json', {base: '.'})
		.pipe(plugins.changed(isProd ? base.dist : base.dev))
		.pipe((isProd && !isProdTest) ? plugins.stripLine('"key":') :
			gutil.noop())
		.pipe(isProd ? gulp.dest(base.dist) : gulp.dest(base.dev));
});

// prep bower files
gulp.task('bower', function() {
	return gulp.src(files.bower, {base: '.'})
		.pipe(plugins.if('*.html', plugins.crisper(crisperOpts)))
		.pipe(gulp.dest(base.dev));
});

// lint Javascript
gulp.task('lintjs', function() {
	return gulp.src([files.scripts, files.elements, './gulpfile.js',
		'./.eslintrc.js', base.src + '*.js'], {base: '.'})
		.pipe(plugins.changed(base.dev))
		.pipe(plugins.eslint())
		.pipe(plugins.eslint.format())
		.pipe(plugins.eslint.failAfterError());
});

// scripts - lint first
gulp.task('scripts', ['lintjs'], function() {
	return gulp.src([files.scripts, base.src + '*.js'], {base: '.'})
		.pipe(plugins.changed(isProd ? base.dist : base.dev))
		.pipe(isProd ? minifier(minifierOpts,
			uglifyjs).on('error', gutil.log) : gutil.noop())
		.pipe(isProd ? gulp.dest(base.dist) : gulp.dest(base.dev));
});

// html
gulp.task('html', function() {
	return gulp.src(files.html, {base: '.'})
		.pipe(plugins.changed(isProd ? base.dist : base.dev))
		.pipe((isProd && !isProdTest) ?
			gutil.noop() : plugins.replace('<!--@@build:replace -->', '<!--'))
		.pipe(isProd ? plugins.minifyHtml() : gutil.noop())
		.pipe(isProd ? gulp.dest(base.dist) : gulp.dest(base.dev));
});

// elements - lint first
gulp.task('elements', ['lintjs'], function() {
	return gulp.src(files.elements, {base: '.'})
		.pipe(plugins.changed(base.dev))
		.pipe(plugins.if('*.html', plugins.crisper(crisperOpts)))
		.pipe(gulp.dest(base.dev));
});

// styles
gulp.task('styles', function() {
	return gulp.src(files.styles, {base: '.'})
		.pipe(plugins.changed(isProd ? base.dist : base.dev))
		.pipe(plugins.if('*.css', isProd ? plugins.cleanCss() : gutil.noop()))
		.pipe(isProd ? gulp.dest(base.dist) : gulp.dest(base.dev));
});

// images
gulp.task('images', function() {
	return gulp.src(files.images, {base: '.'})
		.pipe(plugins.changed(isProd ? base.dist : base.dev))
		.pipe(plugins.imagemin({progressive: true, interlaced: true}))
		.pipe(isProd ? gulp.dest(base.dist) : gulp.dest(base.dev));
});

// assets
gulp.task('assets', function() {
	return gulp.src(files.assets, {base: '.'})
		.pipe(plugins.changed(isProd ? base.dist : base.dev))
		.pipe(isProd ? gulp.dest(base.dist) : gulp.dest(base.dev));
});

// lib
gulp.task('lib', function() {
	return gulp.src(files.lib, {base: '.'})
		.pipe(plugins.changed(isProd ? base.dist : base.dev))
		.pipe(isProd ? gulp.dest(base.dist) : gulp.dest(base.dev));
});

// vulcanize for production
gulp.task('vulcanize', function() {
	return gulp.src(base.src + 'elements/' + 'elements.html', {base: '.'})
		.pipe(plugins.vulcanize(vulcanizeOpts))
		.pipe(plugins.crisper(crisperOpts))
		.pipe(plugins.if('*.html', plugins.minifyInline()))
		.pipe(plugins.if('*.js',
			minifier(minifierOpts, uglifyjs).on('error', gutil.log)))
		.pipe(gulp.dest(base.dist));
});

// compress for the Chrome Web Store
gulp.task('zip', function() {
	return gulp.src(base.dist + base.src + '**')
		.pipe(!isProdTest ? plugins.zip('store.zip') :
			plugins.zip('store-test.zip'))
		.pipe(!isProdTest ? gulp.dest(base.store) : gulp.dest(base.dist));
});

