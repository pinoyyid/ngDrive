'use strict';

module.exports = function(grunt) {

    // Load grunt tasks automatically
    require('load-grunt-tasks')(grunt);

    // Time how long tasks take. Can help when optimizing build times
    require('time-grunt')(grunt);

    var appConfig = {
        app: 'ngDrive',
        dist: 'build'
    };

    // Define the configuration for all the tasks
    grunt.initConfig({

        ts: {
            default: {
                src: ["src/*.ts", "!node_modules/**/*.ts"]
            },
            build: {
                src: ["src/*.ts", "!node_modules/**/*.ts"],
                out: appConfig.dist+'/module.js'
            }
        },

        // Watches files for changes and runs tasks based on the changed files
        watch: {
            ts: {
                files: ['src/{,*/}*.ts'],
                tasks: ['ts:srcts'],
            },
        },

        // The actual grunt server settings
        connect: {
            options: {
                port: 9000,
                // Change this to '0.0.0.0' to access the server from outside.
                hostname: 'localhost',
                livereload: 35729
            },
            test: {
                options: {
                    port: 9001,
                    middleware: function(connect) {
                        return [
                            connect.static('.tmp'),
                            connect.static('test'),
                            connect().use(
                                '/bower_components',
                                connect.static('./bower_components')
                            ),
                            connect.static(appConfig.app)
                        ];
                    }
                }
            },
        },

        // Empties folders to start fresh
        clean: {
            dist: {
                files: [{
                    dot: true,
                    src: [
                        '.tmp',
                        '<%= yeoman.dist %>/{,*/}*',
                        '!<%= yeoman.dist %>/.git{,*/}*'
                    ]
                }]
            },
            server: '.tmp'
        },

        // Test settings
        karma: {
            // test the demo app
            unit: {
                configFile: 'test/karma.conf.js',
                singleRun: true
            }
        }
    });

    grunt.loadNpmTasks("grunt-ts");

    /*
        Run a simple tsc compile for each file. only useful if IDE isn't compiling automatically
     */
    grunt.registerTask('tsc', [
        'ts:default',
    ]);

    /*
        Run karma tests
     */
    grunt.registerTask('test', [
        'connect:test',
        // 'tsc',      commented out because js files are in the repo. Uncomment is the become .gitignored
        'karma'
    ]);

    /*
        Run a tsc compile with out to concatenate allfiles into build/module.js
     */
    grunt.registerTask('build', [
        'ts:build'
    ]);
};
