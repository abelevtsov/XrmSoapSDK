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
        "!js/lib/**/*.js"
    ];

const handleJscsError = function(err) {
        console.log("Error: " + err.toString());
        this.emit("end");
    };

gulp.task("yarn", function() {
    return gulp
        .src(["./package.json", "./yarn.lock"])
        .pipe(gulp.dest("./dist"))
        .pipe(yarn({
            production: true
        }));
});

gulp.task("copy", function() {
    return gulp
        .src("./dist/**/*.js")
        .pipe(flatten())
        .pipe(flatten())
        .pipe(gulp.dest("./js/lib"));
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

        runSequence("yarn", "copy", "jscs", "jshint", function() {
           console.log("Tasks Completed.");
        });
    });
});
