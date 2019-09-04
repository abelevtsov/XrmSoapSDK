const gulp = require("gulp");
const eslint = require("gulp-eslint");
const runSequence = require("run-sequence");
const console = require("better-console");
const pump = require("pump");
const yarn = require("gulp-yarn");

const watchFiles = [
        "js/**/*.js",
        "!js/lib/**/*.js",
        "!node_modules/**/*.js"
    ];

gulp.task("yarn", function(done) {
    return pump([
        gulp.src(["./package.json", "./yarn.lock"]),
        yarn({ production: true })
    ], done);
});

gulp.task("eslint", function(done) {
    return pump([
        gulp.src(watchFiles),
        eslint(),
        eslint.format(),
        eslint.failAfterError()
    ], done);
});

gulp.task("watch", function() {
    console.clear();

    return gulp.watch(watchFiles, function() {
        console.clear();

        runSequence("yarn", "eslint", function() {
           console.log("Tasks Completed.");
        });
    });
});
