Type.registerNamespace("Xrm.App");

(function(global) {
    "use strict";

    this.load = function(executionContext, requirejsResourceName, mainResourceName, etn, parameters) {
        const time = (new Date()).getTime();
        const baseUrl = `/%7B${time}%7D/WebResources/`;
        const script = global.document.createElement("script");

        script.setAttribute("id", "xrm.app");
        script.setAttribute("src", baseUrl + requirejsResourceName);
        script.setAttribute("data-main", baseUrl + mainResourceName);
        script.setAttribute("data-baseurl", baseUrl);
        script.setAttribute("data-etn", etn);
        if (parameters && parameters.length) {
            script.setAttribute("data-parameters", parameters.join("|"));
        }

        global.document.body.appendChild(script);
    };
}).call(Xrm.App, this);
