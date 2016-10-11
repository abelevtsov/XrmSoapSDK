Type.registerNamespace("Xrm.App");

(function(global) {
    this.Load = function(requirejsResourceName, mainResourceName, etn, parameters) {
        var doc = global.document,
            baseUrl = baseUrl = "/%7B" + (new Date()).getTime() + "%7D/WebResources/",
            script = doc.createElement("script");

        script.setAttribute("id", "xrm_app");
        script.setAttribute("src", baseUrl + requirejsResourceName);
        script.setAttribute("data-main", baseUrl + mainResourceName);
        script.setAttribute("data-baseurl", baseUrl);
        script.setAttribute("data-etn", etn);
        if (parameters && parameters.length) {
            script.setAttribute("data-parameters", parameters.join("|"));
        }

        doc.body.appendChild(script);
    };
}).call(Xrm.App, this);
