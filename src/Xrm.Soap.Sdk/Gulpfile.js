const gulp = require("gulp");
const jscs = require("gulp-jscs");
const jsHint = require("gulp-jshint");
const jsHintStylish = require("jshint-stylish");
const runSequence = require("run-sequence");
const console = require("better-console");
const flatten = require("gulp-flatten");
const yarn = require("gulp-yarn");

const watchFiles = [
        "js/**/*.js",
        "!js/lib/**/*.js",
        "!node_modules/**/*.js"
    ];

const handleJscsError = function(err) {
        console.log("Error: " + err.toString());
        this.emit("end");
    };

gulp.task("yarn", function() {
    return gulp
        .src(["./package.json", "./yarn.lock"])
        .pipe(yarn({
            production: true
        }));
});

gulp.task("jscs", function() {
    return gulp
        .src(watchFiles)
        .pipe(jscs())
        .on("error", handleJscsError);
});

gulp.task("jshint", function() {
    return gulp
        .src(watchFiles)
        .pipe(jsHint())
        .pipe(jsHint.reporter(jsHintStylish));
});

gulp.task("watch", function() {
    console.clear();

    return gulp.watch(watchFiles, function() {
        console.clear();

        runSequence("jscs", "jshint", function() {
           console.log("Tasks Completed.");
        });
    });
});
