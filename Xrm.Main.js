(function() {
    var appScriptEl = document.getElementById("xrm_app"),
        baseUrl = appScriptEl.getAttribute("data-baseurl"),
        parameters = appScriptEl.getAttribute("data-parameters"),
        etn = appScriptEl.getAttribute("data-etn");

    require.config({
        baseUrl: ".." + baseUrl,
        paths: {
            underscore: "rare_lib_underscore",
            jquery: "rare_lib_jquery",
            soap: "rare_lib_xrmsoap",
            text: "rare_lib_requirejs_text",
            common: "rare_lib_common",
            form: "rare_form_" + etn.toLowerCase()
        },
        shim: {
            base64: {
                exports: "Base64"
            },
            underscore: {
                exports: "_"
            },
            jquery: {
                exports: "$"
            },
            soap: {
                deps: ["jquery", "underscore"],
                exports: "Xrm.Soap",
                init: function() {
                    return this.Xrm.Soap.init(["rare_"]);
                }
            },
            common: {
                deps: ["jquery", "underscore"],
                exports: "Rare.Common"
            }
        }
    });

    require(["form", "underscore"], function(form, _) {
        parameters && parameters.length && (parameters = parameters.split("|"));
        _.isFunction(form.init) && form.init.apply(null, parameters || []);
    });
})();
