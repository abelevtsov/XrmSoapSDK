(function() {
    "use strict";
    /* jshint esnext: true */

    const appScriptEl = document.getElementById("xrm.app");
    const baseUrl = appScriptEl.getAttribute("data-baseurl");
    var parameters = appScriptEl.getAttribute("data-parameters");
    const etn = appScriptEl.getAttribute("data-etn");
    const etnLowerCased = etn.toLowerCase();
    const lastetnPart = etnLowerCased.split(".").reverse()[0];

    require.config({
        baseUrl: baseUrl,
        paths: {
            underscore: "new_lib.underscore",
            soap: "new_lib.xrm.soap.sdk",
            text: "new_lib_requirejs.text",
            common: "new_lib.xrm.common",
            form: `new_form.${etnLowerCased}`,
            ribbon: `new_ribbon.${etnLowerCased}`,
            formbase: `new_form.base.${lastetnPart}`,
            es6Promise: "new_lib.es6promise"
        },
        shim: {
            base64: {
                exports: "Base64"
            },
            underscore: {
                exports: "_"
            },
            soap: {
                deps: ["underscore", "es6Promise"],
                exports: "Xrm.Soap",
                init: function() {
                    return this.Xrm.Soap.init(["new_"]);
                }
            },
            common: {
                deps: ["underscore"],
                exports: "Xrm.Common"
            }
        }
    });

    require(["form", "underscore", "es6Promise"], function(form, _, es6Promise) {
        es6Promise.polifill();
        if (parameters && parameters.length) {
            parameters = parameters.split("|");
        }

        if (_.isFunction(form.init)) {
            form.init.apply(null, parameters || []);
        }
    });
})();
