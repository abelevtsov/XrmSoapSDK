var gulp = require("gulp"),
    jscs = require("gulp-jscs"),
    jsHint = require("gulp-jshint"),
    jsHintStylish = require("jshint-stylish"),
    runSequence = require("run-sequence"),
    console = require("better-console"),

    handleJscsError = function(err) {
        console.log("Error: " + err.toString());
        this.emit("end");
    };

gulp.task("default", ["watch"]);

gulp.task("jscs", function() {
    return gulp.src([
        "scripts/**/*.js",
        "!scripts/Lib/**/*.js"
    ]).pipe(jscs())
      .on("error", handleJscsError);
});

gulp.task("lint", function() {
    return gulp.src([
        "scripts/**/*.js",
        "!scripts/Lib/**/*.js"
    ]).pipe(jsHint())
      .pipe(jsHint.reporter(jsHintStylish));
});

gulp.task("watch", function() {
    console.clear();

    return gulp.watch([
            "scripts/**/*.js",
            "!scripts/Lib/**/*.js"
        ],
        function() {
            console.clear();

            runSequence("jscs", "lint", function() {
               console.log("Tasks Completed.");
            });
    });
});
