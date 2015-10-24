module.exports = function(grunt) {

	var appFiles = [
		'app/**',
		'!app/bower_components/**'
	];
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
					'newer:copy:dev',
					'newer:replace:dev'
				]
			}
		},
		copy: {
			prod: {
				files: [{
					expand: true,
					src: [appFiles, '!app/images/*.db', '!app/elements/*/**'],
					dest: destProd
				}]
			},
			dev: {
				files: [{expand: true, src: [appFiles], dest: destDev}]
			},
			bower: {
				files: [{expand: true, src: [bowerFiles], dest: destDev}]
			}
		},
		clean: {
			prod: {
				src: destProd
			},
			dev: {
				src: destDev
			}
		},
		// remove key for productionn
		// don't track usage in development
		replace: {
			prod: {
				options: {
					force: false,
					usePrefix: false,
					patterns: [{
						match: /\t"key".*\n/,
						replacement: ''
					}]
				},
				files: {'dist/app/manifest.json': 'app/manifest.json'}
			},
			dev: {
				options: {
					force: false,
					usePrefix: true,
					preservePrefix: false,
					patterns: [{
						match: 'build:replace -->',
						replacement: 'build:replace'
					}]
				},
				files: [{expand: true,  cwd: destDev, src: [appFilesHtml], dest: destDev}]
			}
		},
		compress: {
			prod: {
				options: {archive: 'dist/store.zip'},
				files: [{expand: true, cwd: 'dist/app/', src: ['**']}]
			}
		},
		jscs: {
			all: {
				options: {config: '.jscsrc'},
				src: [appFilesJs, '!app/scripts/chromecast.js']
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
		htmlhintplus: {
			all: {
				options: {htmlhintrc: '.htmlhintrc'},
				src: [appFilesHtml]
			}
		},
		vulcanize: {
			prod: {
				options: {
					inlineScripts: true,
					inlineCss: true
				},
				files: [{expand: true, src: ['app/elements/elements.html'], dest: destProd}]
			}
		},
		crisper: {
			prod: {
				options: {
					cleanup: false
				},
				files: [{expand: true, cwd: destProd, src: ['app/elements/elements.html'], dest: destProd}]
			},
			dev: {
				options: {
					cleanup: false
				},
				files: [{expand: true, src: [appFilesHtml], dest: destDev}]
			},
			bower: {
				options: {
					cleanup: false
				},
				files: [{expand: true, src: [bowerFilesHtml], dest: destDev}]
			}
		},
		uglify: {
			prod: {
				files: [{expand: true,  cwd: destProd, src: ['**/*.js'], dest: destProd}]
			}
		},
		minifyHtml: {
			prod: {
				files: [{expand: true,  cwd: destProd, src: ['**/*.html'], dest: destProd}]
			}
		},
		cssmin: {
			prod: {
				files: [{expand: true,  cwd: destProd, src: ['**/styles/*.css'], dest: destProd}]
			}
		},
		imagemin: {
			prod: {
				files: [{expand: true,  cwd: destProd, src: ['**/images/*'], dest: destProd}]
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-compress');
	grunt.loadNpmTasks('grunt-newer');
	grunt.loadNpmTasks('grunt-vulcanize');
	grunt.loadNpmTasks('grunt-crisper');
	grunt.loadNpmTasks('grunt-replace');
	grunt.loadNpmTasks('grunt-jscs');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-csslint');
	grunt.loadNpmTasks('grunt-htmllint');
	grunt.loadNpmTasks('grunt-htmlhint-plus');
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
			'copy:prod',
			'vulcanize:prod',
			'crisper:prod',
			'uglify:prod',
			'minifyHtml:prod',
			'cssmin:prod',
			'imagemin:prod',
			'replace:prod',
			'compress:prod'
		]
	);

	// development build task
	grunt.registerTask('dev',
		[
			'clean:dev',
			'jscs:all',
			'jshint:all',
			'bower',
			'copy:dev',
			'crisper:dev',
			'replace:dev'
		]
	);

	// copy bower files and enforce csp
	grunt.registerTask('bower', ['copy:bower', 'crisper:bower']);

};
