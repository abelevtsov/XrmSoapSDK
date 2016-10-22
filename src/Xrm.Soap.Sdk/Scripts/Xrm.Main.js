(function() {
    var appScriptEl = document.getElementById("xrm_app"),
        baseUrl = appScriptEl.getAttribute("data-baseurl"),
        parameters = appScriptEl.getAttribute("data-parameters"),
        etn = appScriptEl.getAttribute("data-etn"),
        etnLowerCased = etn.toLowerCase(),
        lastetnPart = etnLowerCased.split(".").reverse()[0];

    require.config({
        baseUrl: ".." + baseUrl, // note: in CRM 2015 remove ".."
        paths: {
            underscore: "new_lib_underscore",
            jquery: "new_lib_jquery",
            soap: "new_lib_xrmsoap",
            text: "new_lib_requirejs_text",
            common: "new_lib_common",
            form: "new_form_" + etnLowerCased,
            ribbon: "new_ribbon." + etnLowerCased,
            formbase: "new_form.base." + lastetnPart
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
                    return this.Xrm.Soap.init(["new_"]);
                }
            },
            common: {
                deps: ["jquery", "underscore"],
                exports: "Xrm.Common"
            }
        }
    });

    require(["form", "underscore"], function(form, _) {
        if (parameters && parameters.length) {
            parameters = parameters.split("|");
        }

        if (_.isFunction(form.init)) {
            form.init.apply(null, parameters || []);
        }
    });
})();
