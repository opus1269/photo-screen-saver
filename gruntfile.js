module.exports = function(grunt) {

	// common paths and file collections
	var appFiles = ['app/**', '!app/bower_components/**'];
	var appFilesJs = ['app/scripts/**/*.js', 'gruntfile.js'];
	var appFilesHtml = ['app/elements/**/*.html', 'app/html/**/*.html'];
	var appFilesCss = ['app/styles/**/*.css'];
	var bowerFiles = ['app/bower_components/**'];
	var bowerFilesHtml = ['app/bower_components/**/*.html'];
	var vulcanizeFile = ['app/elements/elements.html'];
	var manifestFile = 'dist/app/manifest.json';
	var devDir = 'dev/';
	var distDir = 'dist/';

	// Project configuration.
	grunt.initConfig({

		watch: {
			default: {
				options: {spawn: false, interrupt: true},
				files: [appFiles, 'gruntfile.js', '.jscrc', '.jshintrc'],
				tasks: [
					'jscs',
					'newer:jshint',
					'newer:csslint',
					'newer:crisper:dev',
					'sync:dev',
					'newer:replace:dev'
				]
			}
		},
		sync: {
			prod: {
				files: [{
					expand: true,
					src: [
						appFiles,
						'!app/images/*.db',
						'!app/elements/*/**',
						'!app/lib/flickrapi.dev.js'
					],
					dest: distDir
				}]
			},
			dev: {files: [{expand: true, src: [appFiles], dest: devDir}]},
			bower: {files: [{expand: true, src: [bowerFiles], dest: devDir}]}
		},
		clean: {
			prod: {src: distDir},
			dev: {src: devDir}
		},
		lineremover: {
			default: {
				// remove key from manifest
				options: {exclusionPattern: /"key":/},
				src: manifestFile,
				dest: manifestFile,
			}
		},
		replace: {
			dev: {
				// remove Google analytics tracking
				options: {
					force: false,
					usePrefix: true,
					preservePrefix: false,
					patterns: [{
						match: 'build:replace -->',
						replacement: 'build:replace'
					}]
				},
				files: [{expand: true, cwd: devDir, src: [appFilesHtml], dest: devDir}]
			}
		},
		compress: {
			prod: {
				options: {archive: 'store/store.zip'},
				files: [{expand: true, cwd: 'dist/app/', src: ['**']}]
			},
			prodTest: {
				options: {archive: 'dist/store-test.zip'},
				files: [{expand: true, cwd: 'dist/app/', src: ['**']}]
			}
		},
		jscs: {
			default: {
				options: {
					config: '.jscsrc',
					esnext: false,
					verbose: true,
					fix: false,
					extract: ['app/elements/**/*.html']
				},
				src: [appFilesJs, 'app/elements/']
			}
		},
		jshint: {
			default: {
				options: {jshintrc: '.jshintrc', extract: 'auto'},
				src: [appFilesJs, appFilesHtml]
			}
		},
		csslint: {
			default: {
				options: {csslintrc: '.csslintrc'},
				src: [appFilesCss]
			}
		},
		htmllint: {
			default: {
				options: {htmllintrc: '.htmllintrc'},
				src: [appFilesHtml]
			}
		},
		vulcanize: {
			default: {
				options: {inlineScripts: true, inlineCss: true},
				files: [{expand: true, src: vulcanizeFile, dest: distDir}]
			}
		},
		crisper: {
			prod: {
				options: {cleanup: false},
				files: [{expand: true, cwd: distDir, src: vulcanizeFile, dest: distDir}]
			},
			dev: {
				options: {cleanup: false},
				files: [{expand: true, src: [appFilesHtml], dest: devDir}]
			},
			bower: {
				options: {cleanup: false},
				files: [{expand: true, src: [bowerFilesHtml], dest: devDir}]
			}
		},
		uglify: {
			default: {
				files: [{expand: true, cwd: distDir, src: ['**/*.js'], dest: distDir}]
			}
		},
		minifyHtml: {
			default: {
				files: [{expand: true, cwd: distDir, src: ['**/*.html'], dest: distDir}]
			}
		},
		cssmin: {
			default: {
				files: [{expand: true, cwd: distDir, src: ['**/styles/*.css'], dest: distDir}]
			}
		},
		imagemin: {
			default: {
				files: [{expand: true, cwd: distDir, src: ['**/images/*'], dest: distDir}]
			}
		}

	});

	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-compress');
	grunt.loadNpmTasks('grunt-sync');
	grunt.loadNpmTasks('grunt-newer');
	grunt.loadNpmTasks('grunt-vulcanize');
	grunt.loadNpmTasks('grunt-crisper');
	grunt.loadNpmTasks('grunt-line-remover');
	grunt.loadNpmTasks('grunt-replace');
	grunt.loadNpmTasks('grunt-jscs');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-csslint');
	grunt.loadNpmTasks('grunt-htmllint');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-minify-html');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-imagemin');

	// Default task. Watch for file changes
	grunt.registerTask('default', ['watch']);

	// production build task
	grunt.registerTask('prod',
		[
			'clean:prod',
			'jscs',
			'jshint',
			'sync:prod',
			'vulcanize',
			'crisper:prod',
			'uglify',
			'minifyHtml',
			'cssmin',
			'imagemin',
			'lineremover',
			'compress:prod'
		]
	);

	// production test build task - leaving manifest key in
	grunt.registerTask('prodTest',
		[
			'clean:prod',
			'jscs',
			'jshint',
			'sync:prod',
			'vulcanize',
			'crisper:prod',
			'uglify',
			'minifyHtml',
			'cssmin',
			'imagemin',
			'compress:prodTest'
		]
	);

	// development build task
	grunt.registerTask('dev',
		[
			'clean:dev',
			'jscs',
			'jshint',
			'bower',
			'sync:dev',
			'crisper:dev',
			'replace:dev'
		]
	);

	// copy bower files and enforce csp
	grunt.registerTask('bower', ['sync:bower', 'crisper:bower']);

};
