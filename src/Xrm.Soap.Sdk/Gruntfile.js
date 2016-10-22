module.exports = function(grunt) {
    "use strict";

    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        bower: {
            install: {
                options: {
                    targetDir: "./Scripts/Lib",
                    layout: "byType",
                    install: true,
                    verbose: false,
                    cleanTargetDir: false,
                    cleanBowerDir: false,
                    bowerOptions: {}
                }
            }
        },
        jscs: {
            src: [
                "Gruntfile.js",
                "scripts/**/*.js",
                "!scripts/Lib/**/*.js"
            ],
            options: {
                config: ".jscsrc"
            }
        },
        jshint: {
            jshintrc: ".jshintrc",
            gruntfile: {
                src: "Gruntfile.js"
            },
            files: [
                "Gruntfile.js",
                "scripts/**/*.js",
                "!scripts/Lib/**/*.js"
            ]
        },
        watch: {
            gruntfile: {
                files: ["<%= jshint.gruntfile.src %>", "<%= jshint.files %>"],
                tasks: ["jshint:gruntfile", "jscs"]
            }
        }
    });

    grunt.loadNpmTasks("grunt-bower-task");
    grunt.loadNpmTasks("grunt-jscs");
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-watch");

    grunt.registerTask("default", [
        "bower",
        "jscs",
        "jshint"
    ]);
};
