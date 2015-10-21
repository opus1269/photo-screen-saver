module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		pkg: '<json:package.json>',
		watch: {
			default: {
				options: {
					spawn: false,
					interrupt: true
				},
				files: ['app/**/*', 'gruntfile.js'],
				tasks: ['newer:jscs:all',
						'newer:jshint:all',
						'newer:crisper:dev',
						'newer:copy:dev',
						'newer:string-replace:dev'
						]
			}
		},
		copy: {
			prod: {
				files: [
					// includes files within path and its sub-directories
					{expand: true, src: ['app/**/*', '!app/bower_components/**'], dest: 'dist/'},
					{src: 'options-csp.html', dest: 'dist/options.html'},
					{src: 'screensaver-csp.html', dest: 'dist/screensaver.html'}
				]
			},
			dev: {
				files: [
					{expand: true, src: ['app/**/*'], dest: 'dev/'}
				]
			}
		},
		clean: {
			prod: {
				src: ['dist']
			},
			dev: {
				src: ['dev']
			}
		},
		'line-remover': {
			prod: {
				options: {
					exclusionPattern: /"key":/g
				},
				files: {
					'dist/manifest.json': 'dist/manifest.json'
				}
			}
		},
		'string-replace': {
			dev: {
				options: {
					saveUnchanged: false,
					replacements: [{
						pattern: '<google-analytics-tracker',
						replacement: '<!-- <google-analytics-tracker'
					}, {
						pattern: '</google-analytics-tracker>',
						replacement: '</google-analytics-tracker> -->'
					}]
				},
				files: {
					'dev/': ['dev/app/elements/**/*.html', 'dev/app/html/**/*.html', '!dev/app/elements/google-analytics-tracker/google-analytics-tracker.html']
				}
			}
		},
		compress: {
			prod: {
				options: {
					archive: 'dist/store.zip'
				},
				files: [
					{expand: true, cwd: 'dist/', src: ['**', '!*.zip', '!images/*.db']}
				]
			}
		},
		jscs: {
			all: {
				options: {
					config: '.jscsrc'
				},
				src: ['app/**/*.js', 'gruntfile.js', '!app/scripts/chromecast.js', '!app/bower_components/**']
			}
		},
		jshint: {
			all: {
				options: {
					jshintrc: '.jshintrc',
					extract: 'auto'
				},
				src: ['app/**/*.js', 'app/elements/**/*.html', 'gruntfile.js', '!app/bower_components/**']
			}
		},
		crisper: {
			dev: {
				options: {
					cleanup: false,
					scriptInHead: false,
					onlySplit: false
				},
				files: [
					{expand: true, src: ['app/elements/**/*.html', '!elements.html', 'app/bower_components/**/*.html'], dest: 'dev/'}
				]
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
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-vulcanize');
	grunt.loadNpmTasks('grunt-crisper');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-jscs');
	grunt.loadNpmTasks('grunt-newer');
	grunt.loadNpmTasks('grunt-contrib-compress');
	grunt.loadNpmTasks('grunt-line-remover');
	grunt.loadNpmTasks('grunt-string-replace');

	// Default task.
	grunt.registerTask('default', ['watch']);

	// production build task
	grunt.registerTask(
		'prod',
		['clean:prod', 'vulcanize:prod', 'copy:prod', 'lineremover:prod', 'compress:prod']
	);

};
