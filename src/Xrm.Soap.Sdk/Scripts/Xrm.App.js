Type.registerNamespace("Xrm.App");

(function() {
    "use strict";

    this.Load = function(requirejsResourceName, mainResourceName, etn, parameters) {
        var baseUrl = "/%7B" + (new Date()).getTime() + "%7D/WebResources/",
            oscript = document.createElement("script");

        oscript.setAttribute("id", "xrm_app");
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
