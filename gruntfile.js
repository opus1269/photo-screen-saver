module.exports = function(grunt) {

	var appFiles = [
		'app/elements/**',
		'app/html/**',
		'app/images/**',
		'app/scripts/**',
		'app/styles/**',
		'app/*'
	];
	var appFilesJs = ['app/scripts/**/*.js', 'gruntfile.js'];
	var appFilesHtml = ['app/elements/**/*.html', 'app/html/**/*.html'];
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
			//		'newer:htmllint:all',
					'newer:crisper:dev',
					'newer:copy:dev',
					'newer:replace:dev'
				]
			}
		},
		copy: {
			prod: {
				files: [{expand: true, src: ['app/**/*', '!app/bower_components/**'], dest: destProd},]
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
		lineremover: {
			prod: {
				options: {exclusionPattern: /"key":/g},
				files: {'dist/manifest.json': 'dist/manifest.json'}
			}
		},
		// don't track usage in development
		replace: {
			dev: {
				options: {
					force: false,
					usePrefix: false,
					patterns: [{
						match: '<google-analytics-tracker',
						replacement: '<!-- <google-analytics-tracker'
					}, {
						match: '</google-analytics-tracker>',
						replacement: '</google-analytics-tracker> -->'
					}]
				},
				files: [{expand: true,  cwd: destDev, src: [appFilesHtml, '!**/google-analytics-tracker.html'], dest: destDev}]
			}
		},
		compress: {
			prod: {
				options: {archive: 'dist/store.zip'},
				files: [{expand: true, cwd: destProd, src: ['**', '!*.zip', '!images/*.db']}]
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
		crisper: {
			dev: {
				options: {
					cleanup: false,
					scriptInHead: false,
					onlySplit: false
				},
				files: [{expand: true, src: [appFilesHtml], dest: destDev}]
			},
			bower: {
				options: {
					cleanup: false,
					scriptInHead: false,
					onlySplit: false
				},
				files: [{expand: true, src: [bowerFilesHtml], dest: destDev}]
			}
		},
		vulcanize: {
			prod: {
				options: {
					// specifying both csp and inline will include external sources as well as inline
					csp: true,
					inline: true,
					strip: true
				},
				files: {
					'options-csp.html': 'options.html',
					'screensaver-csp.html': 'screensaver.html'
				}
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
	grunt.loadNpmTasks('grunt-line-remover');
	grunt.loadNpmTasks('grunt-jscs');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-htmllint');
	grunt.loadNpmTasks('grunt-htmlhint-plus');

	// Default task.
	grunt.registerTask('default', ['watch']);

	// production build task
	grunt.registerTask(
		'prod',
		['clean:prod', 'vulcanize:prod', 'copy:prod', 'lineremover:prod', 'compress:prod']
	);

	// development build task
	grunt.registerTask(
		'dev',
		['clean:dev', 'jscs:all', 'jshint:all', 'bower', 'copy:dev', 'crisper:dev', 'replace:dev']
	);

	// copy bower files and enforce csp
	grunt.registerTask('bower', ['copy:bower', 'crisper:bower']);

};
