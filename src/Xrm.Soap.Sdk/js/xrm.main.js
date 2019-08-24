(function(global) {
    "use strict";

    const appScriptEl = document.getElementById("xrm.app");
    const baseUrl = appScriptEl.getAttribute("data-baseurl");
    var parameters = appScriptEl.getAttribute("data-parameters");
    const etn = appScriptEl.getAttribute("data-etn");
    const etnLowerCased = etn.toLowerCase();
    const etnPart = etnLowerCased.split(".").reverse()[0];

    global.require.config({
        baseUrl: baseUrl,
        paths: {
            underscore: "new_lib.underscore",
            soap: "new_lib.xrm.soap.sdk",
            text: "new_lib_requirejs.text",
            common: "new_lib.xrm.common",
            form: `new_form.${etnLowerCased}`,
            ribbon: `new_ribbon.${etnLowerCased}`,
            formbase: `new_form.base.${etnPart}`
        },
        shim: {
            base64: {
                exports: "Base64"
            },
            underscore: {
                exports: "_"
            },
            soap: {
                deps: ["underscore"],
                exports: "Xrm.Soap.Sdk",
                init: function() {
                    return global.Xrm.Soap.Sdk.init(["new_"]);
                }
            },
            common: {
                deps: ["underscore"],
                exports: "Xrm.Common"
            }
        }
    });

    global.require(["form", "underscore"], function(form, _) {
        if (parameters && parameters.length) {
            parameters = parameters.split("|");
        }

        if (_.isFunction(form.init)) {
            form.init.apply(null, parameters || []);
        }
    });
})(this);
