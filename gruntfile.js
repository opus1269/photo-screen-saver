module.exports = function(grunt) {

	// common paths and file collections
	var appFiles = ['app/**', '!app/bower_components/**'];
	var appFilesJs = ['app/scripts/**/*.js', 'gruntfile.js'];
	var appFilesHtml = ['app/elements/**/*.html', 'app/html/**/*.html'];
	var appFilesCss = ['app/styles/**/*.css'];
	var bowerFiles = ['app/bower_components/**'];
	var bowerFilesHtml = ['app/bower_components/**/*.html'];
	var destDev = 'dev/';
	var destProd = 'dist/';

	// Project configuration.
	grunt.initConfig({
		pkg: '<json:package.json>',
		watch: {
			default: {
				options: {spawn: false, interrupt: true},
				files: [appFiles, 'gruntfile.js', '.jscrc', '.jshintrc'],
				tasks: [
					'newer:jscs:all',
					'newer:jshint:all',
					'newer:csslint:all',
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
					dest: destProd
				}]
			},
			dev: {
				verbose: true,
				files: [{expand: true, src: [appFiles], dest: destDev}]
			},
			devquiet: {
				files: [{expand: true, src: [appFiles], dest: destDev}]
			},
			bower: {
				files: [{expand: true, src: [bowerFiles], dest: destDev}]
			}
		},
		clean: {
			prod: {
				src: [destProd + 'app', destProd + '*.zip']
			},
			dev: {
				src: destDev
			}
		},
		lineremover: {
			prod: {
				options: {exclusionPattern: /"key":/},
				files: {'dist/app/manifest.json': 'dist/app/manifest.json'}
			}
		},
		replace: {
			prod: {
				// remove manifest key and use non-dev flickr API for productionn
				options: {
					force: false,
					usePrefix: false,
					patterns: [{
						match: 'flickrapi.dev.js',
						replacement: 'flickrapi.js'
					}]
				},
				files: {'dist/app/manifest.json': 'dist/app/manifest.json'}
			},
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
				files: [{expand: true, cwd: destDev, src: [appFilesHtml], dest: destDev}]
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
			all: {
				options: {config: '.jscsrc'},
				src: [appFilesJs]
			}
		},
		jshint: {
			all: {
				options: {jshintrc: '.jshintrc', extract: 'auto'},
				src: [appFilesJs, appFilesHtml]
			}
		},
		csslint: {
			all: {
				options: {csslintrc: '.csslintrc'},
				src: [appFilesCss]
			}
		},
		htmllint: {
			all: {
				options: {htmllintrc: '.htmllintrc'},
				src: [appFilesHtml]
			}
		},
		vulcanize: {
			prod: {
				options: {inlineScripts: true, inlineCss: true},
				files: [{expand: true, src: ['app/elements/elements.html'], dest: destProd}]
			}
		},
		crisper: {
			prod: {
				options: {cleanup: false},
				files: [{expand: true, cwd: destProd, src: ['app/elements/elements.html'], dest: destProd}]
			},
			dev: {
				options: {cleanup: false},
				files: [{expand: true, src: [appFilesHtml], dest: destDev}]
			},
			bower: {
				options: {cleanup: false},
				files: [{expand: true, src: [bowerFilesHtml], dest: destDev}]
			}
		},
		uglify: {
			prod: {
				files: [{expand: true, cwd: destProd, src: ['**/*.js'], dest: destProd}]
			}
		},
		minifyHtml: {
			prod: {
				files: [{expand: true, cwd: destProd, src: ['**/*.html'], dest: destProd}]
			}
		},
		cssmin: {
			prod: {
				files: [{expand: true, cwd: destProd, src: ['**/styles/*.css'], dest: destProd}]
			}
		},
		imagemin: {
			prod: {
				files: [{expand: true, cwd: destProd, src: ['**/images/*'], dest: destProd}]
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

	// Default task.
	grunt.registerTask('default', ['watch']);

	// production build task
	grunt.registerTask('prod',
		[
			'clean:prod',
			'jscs:all',
			'jshint:all',
			'sync:prod',
			'vulcanize:prod',
			'crisper:prod',
			'uglify:prod',
			'minifyHtml:prod',
			'cssmin:prod',
			'imagemin:prod',
			'lineremover:prod',
			'replace:prod',
			'compress:prod'
		]
	);

	// production test build task - leaving manifest key in
	grunt.registerTask('prodTest',
		[
			'clean:prod',
			'jscs:all',
			'jshint:all',
			'sync:prod',
			'vulcanize:prod',
			'crisper:prod',
			'uglify:prod',
			'minifyHtml:prod',
			'cssmin:prod',
			'imagemin:prod',
			'replace:prod',
			'compress:prodTest'
		]
	);

	// development build task
	grunt.registerTask('dev',
		[
			'clean:dev',
			'jscs:all',
			'jshint:all',
			'bower',
			'sync:devquiet',
			'crisper:dev',
			'replace:dev'
		]
	);

	// copy bower files and enforce csp
	grunt.registerTask('bower', ['sync:bower', 'crisper:bower']);

};
