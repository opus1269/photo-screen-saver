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
				files: ['*.js', '*.html', '*.css', 'manifest.json', '!*-csp.js'],
				tasks: [ 'newer:copy:dev', 'newer:jshint:all'],
			}
		},
		copy: {
			prod: {
				files: [
					// includes files within path and its sub-directories 
					{expand: true, src: [ 'manifest.json', '*.html', '!options-csp.html', '!screensaver-csp.html', '*.css', '*.js', '!Gruntfile.js', '!options.js', '!screensaver.js', 'assets/**' ], dest: 'dist/'},
					{src: 'options-csp.html', dest: 'dist/options.html'},
					{src: 'screensaver-csp.html', dest: 'dist/screensaver.html'},
				],
			},
			dev: {
				files: [
					{ expand: true, src: ['manifest.json', '*.html', '*.css', '*.js', '!Gruntfile.js', 'assets/**', 'bower.json', '.bowerrc',  '!*-csp.*'], dest: 'dev/' },
				],
			},
		},
		clean: {
			prod: {
				src: [ 'dist', '*-csp.*' ]
			},
			dev: {
				src: [ 'dev', '!components/**' ]
			},
		},		
		lineremover: {
			prod: {
				files: {
					'dist/manifest.json': 'dist/manifest.json'
				},
				options: {
					exclusionPattern: /"key":/g
				}
			},
		},
		compress: {
			prod: {
				options: {
					archive: 'dist/store.zip'
				},
				files: [
					{expand: true, cwd: 'dist/', src: ['**', '!*.zip']}, 
				]
			}
		},
		jshint: {
			all: {
				options: {
					browser: true,
					loopfunc: true,
					expr: true,
					globals: {
						browser: true,
						chrome: true
					},
				},
				src: ['*.js', '!*-csp.js', '!chromecast.js'],
			},
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
				},
			},
		}
	});

	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-vulcanize');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-newer');
	grunt.loadNpmTasks('grunt-contrib-compress');
	grunt.loadNpmTasks('grunt-line-remover');

	// Default task.
	grunt.registerTask('default', ['watch']);
	
	// production build task
	grunt.registerTask(
				'prod', 
				'Preps all of the assets and copies the files to the dist directory.', 
				[ 'clean:prod', 'vulcanize:prod', 'copy:prod', 'lineremover:prod', 'compress:prod' ]
	);

};