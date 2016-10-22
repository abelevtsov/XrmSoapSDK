Type.registerNamespace("Xrm.App");

(function() {
    "use strict";
    /* jshint esnext: true */

    this.load = function(requirejsResourceName, mainResourceName, etn, parameters) {
        const time = (new Date()).getTime();
        const baseUrl = `/%7B${time}%7D/WebResources/`;
        const oscript = document.createElement("script");

        oscript.setAttribute("id", "xrm.app");
        oscript.setAttribute("src", baseUrl + requirejsResourceName);
        oscript.setAttribute("data-main", baseUrl + mainResourceName);
        oscript.setAttribute("data-baseurl", baseUrl);
        oscript.setAttribute("data-etn", etn);
        if (parameters && parameters.length) {
            oscript.setAttribute("data-parameters", parameters.join("|"));
        }

        document.body.appendChild(oscript);
    };
}).call(Xrm.App);
