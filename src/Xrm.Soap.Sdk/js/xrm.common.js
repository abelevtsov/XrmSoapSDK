Type.registerNamespace("Xrm.Common");

(function(global) {
    "use strict";

    /* jshint -W030 */

    var self = this,
        mscrm = global.Mscrm,
        xrmPage = Xrm.Page,
        emptyString = "",

        areEqualGuids = function(guid1, guid2) {
            if (!(guid1 && guid2)) {
                return false;
            } else {
                const regex = /[{}]/g;
                return guid1.replace(regex, emptyString).toLowerCase() === guid2.replace(regex, emptyString).toLowerCase();
            }
        },

        showNavPanel = function() {
            const navContainers = document.getElementsByClassName("ms-crm-Form-Nav-Container");
            for (let i = navContainers.length; i--;) {
                const navContainer = navContainers[i];
                if (navContainer.tagName.toLowerCase() === "div") {
                    navContainer.style.display = "block";
                    break;
                }
            }
        };

    this.openCustomLookupDialog = function(callee, lookupStyle, lookupTypes, additionalParams, defaultType, defaultViewId, customViews, behavior, isMobileRefresh, isInlineMultiLookup, params) {
        const args = new global.LookupArgsClass();
        const oUrl = mscrm.CrmUri.create("/_controls/lookup/lookupinfo.aspx");
        const query = oUrl.get_query();
        const behaviorDefined = behavior && behavior instanceof self.LookupDialogBehavior;

        args.customViews = customViews;
        query.browse = false;
        query.DisableViewPicker = behaviorDefined ? behavior.DisableViewPicker() : "0";
        query.DisableQuickFind = behaviorDefined ? behavior.DisableQuickFind() : "0";
        query.AllowFilterOff = behaviorDefined ? behavior.AllowFilterOff() : "0";
        query.IsInlineMultiLookup = !!isInlineMultiLookup ? "1" : "0";
        query.LookupStyle = lookupStyle;
        additionalParams && additionalParams.length > 0 && oUrl.appendToQuery(additionalParams);
        query.ShowNewButton = behaviorDefined ? behavior.ShowNew() : "1";
        query.EnableNewButton = behaviorDefined ? behavior.EnableNew() : "1";
        query.ShowPropButton = behaviorDefined ? behavior.ShowProp() : "1";
        query.DefaultType = defaultType;
        defaultViewId && (query.DefaultViewId = defaultViewId);
        query.objecttypes = lookupTypes;
        query.ObjectTypeCode = lookupTypes;
        query.mrsh = isMobileRefresh;
        if (isMobileRefresh) {
            const queryString = (new mscrm.GlobalContext()).getQueryStringParameters();
            query.client_type = queryString.client_type;
            query.user_lcid = queryString.user_lcid;
        }

        global.setMobilePopupMode();
        const oFeatures = global.BuildFeatures(lookupStyle);
        if (!oFeatures) {
            return null;
        }

        let callbackFunctionObject = mscrm.Utilities.createCallbackFunctionObject("BuildAndReturnLookupItems", callee, params ? [params] : null, false),
            crmDialog = new mscrm.CrmDialog(oUrl, args, oFeatures.width, oFeatures.height, null);

        crmDialog.setCallbackReference(callbackFunctionObject);
        return crmDialog.show();
    };

    this.LookupDialogBehavior = class {
        constructor(showNew, showProp, enableNew, allowFilterOff, disableQuickFind, disableViewPicker) {
            this.showNew = showNew ? "1" : "0";

            this.showProp = showProp ? "1" : "0";

            this.enableNew = enableNew ? "1" : "0";

            this.allowFilterOff = allowFilterOff ? "1" : "0";

            this.disableQuickFind = disableQuickFind ? "1" : "0";

            this.disableViewPicker = disableViewPicker ? "1" : "0";
        }

        get showNew() {
            return this.showNew;
        }

        get showProp() {
            return this.showProp;
        }

        get enableNew() {
            return this.enableNew;
        }

        get allowFilterOff() {
            return this.allowFilterOff;
        }

        get disableQuickFind() {
            return this.disableQuickFind;
        }

        get disableViewPicker() {
            return this.disableViewPicker;
        }
    };

    this.setLookupBehavior = function(lookupName, behavior) {
        const lookupControl = document.getElementById(lookupName + "_i");
        if (lookupControl && lookupControl._behaviors) {
            const currentBehavior = lookupControl._behaviors[0];
            if (currentBehavior.AddParam) {
                behavior = behavior || new self.LookupDialogBehavior(false, false, true, true, false, true);
                currentBehavior.AddParam("ShowNewButton", behavior.showNew);
                currentBehavior.AddParam("ShowPropButton", behavior.showProp);
                currentBehavior.AddParam("EnableNewButton", behavior.enableNew);
                currentBehavior.AddParam("AllowFilterOff", behavior.allowFilterOff);
                currentBehavior.AddParam("DisableQuickFind", behavior.disableQuickFind);
                currentBehavior.AddParam("DisableViewPicker", behavior.disableViewPicker);
            }

            lookupControl.setAttribute("showproperty", behavior.showProp);
        }
    };

    this.setVisibleTabSection = function(tabName, sectionName, show, callback) {
        const tab = xrmPage.ui.tabs.get(tabName);
        if (tab && sectionName) {
            const section = tab.sections.get(sectionName);
            if (section) {
                if (show === true) {
                    tab.setVisible(show);
                }

                section.setVisible(show);
                callback && callback(section, show);
            }
        }
    };

    this.setVisibleAdminTab = function(tabName, sectionName, show, callback) {
        const tab = xrmPage.ui.tabs.get(tabName);
        if (tab && sectionName) {
            const section = tab.sections.get(sectionName);
            if (section) {
                tab.setVisible(show);
                section.setVisible(show);
                callback && callback(tab, section, show);
            }
        }
    };

    this.setVisibleTab = function(tabName, show) {
        const tab = xrmPage.ui.tabs.get(tabName);
        tab && tab.setVisible(show);
    };

    this.setDisabledSectionFields = function(sectionName, isDisabled) {
        const controls = Xrm.Page.ui.controls.get();
        for (let prop in controls) {
            if (controls.hasOwnProperty(prop)) {
                var control = controls[prop],
                    parent = control.getParent(),
                    controlSectionName = parent ? parent.getName() : emptyString;

                if (controlSectionName === sectionName) {
                    control.setDisabled(isDisabled);
                }
            }
        }
    };

    this.setRequiredSectionFieldsLevel = function(sectionName, level) {
        const controls = xrmPage.ui.controls.get();
        for (let prop in controls) {
            if (controls.hasOwnProperty(prop)) {
                var control = controls[prop],
                    parent = control.getParent(),
                    controlSectionName = parent ? parent.getName() : emptyString;

                if (controlSectionName === sectionName) {
                    const attribute = xrmPage.getAttribute(control.getName());
                    attribute.setRequiredLevel(level);
                }
            }
        }
    };

    this.setDisabledTabFields = function(tabName, isDisabled) {
        const tab = xrmPage.ui.tabs.get(tabName);
        if (tab) {
            var sections = tab.sections.get(),
                controls = Xrm.Page.ui.controls.get();

            for (let i = sections.length; i--;) {
                const sectionName = sections[i].getName();
                for (let prop in controls) {
                    if (!controls.hasOwnProperty(prop)) {
                        continue;
                    }

                    const control = controls[prop];
                    const parent = control.getParent();
                    const controlSectionName = parent ? parent.getName() : emptyString;
                    if (controlSectionName === sectionName) {
                        control.setDisabled(isDisabled);
                    }
                }
            }
        }
    };

    this.setDisabledValueForAllFields = function(isDisabled) {
        var doesControlHaveAttribute = function(control) {
                const controlType = control.getControlType();
                return !(controlType === "iframe" ||
                         controlType === "webresource" ||
                         controlType === "subgrid");
            };

        xrmPage.ui.controls.forEach(function(control) {
            if (doesControlHaveAttribute(control)) {
                control.setDisabled(isDisabled);
            }
        });
    };

    this.setAllRecommendedAttributesToRequired = function() {
        const attributes = xrmPage.data.entity.attributes.get();
        for (let name in attributes) {
            if (attributes.hasOwnProperty(name)) {
                const attribute = attributes[name];
                if (attribute.getRequiredLevel() === "recommended") {
                    attribute.setRequiredLevel("required");
                }
            }
        }
    };

    this.setAllMandatoryAttributesToNone = function() {
        const attributes = xrmPage.data.entity.attributes.get();
        for (let name in attributes) {
            if (attributes.hasOwnProperty(name)) {
                const attribute = attributes[name];
                if (attribute.getRequiredLevel() === "required") {
                    attribute.setRequiredLevel("none");
                }
            }
        }
    };

    this.getAllMandatoryAttributes = function() {
        var result = [],
            attributes = xrmPage.data.entity.attributes.get();

        for (let name in attributes) {
            if (attributes.hasOwnProperty(name)) {
                const attribute = attributes[name];
                if (attribute.getRequiredLevel() === "required") {
                    result[result.length] = attribute.getName();
                }
            }
        }

        return result;
    };

    this.getPageNavItem = function(name) {
        return xrmPage.ui.navigation.items.get("nav_" + name);
    };

    this.getObjectTypeCode = function(entityName) {
        try {
            const etc = mscrm.InternalUtilities.EntityTypeCode[entityName];
            if (typeof etc !== "undefined") {
                return etc;
            }
        } catch (ex) {
            const lookupService = new global.RemoteCommand("LookupService", "RetrieveTypeCode");
            lookupService.SetParameter("entityName", entityName);
            const result = lookupService.Execute();
            if (result.Success && typeof result.ReturnValue === "number") {
                return result.ReturnValue;
            }
        }

        return null;
    };

    this.isUserInRole = function(roleName) {
        var serverUrl = xrmPage.context.getClientUrl(),
            odataPath = "/xrmservices/2011/organizationdata.svc",
            oDataEndpointUrl = serverUrl + odataPath + "/RoleSet",
            requestResults = [],

            retrieveAllRoles = function(queryOptions) {
                queryOptions = queryOptions || "?$filter=Name eq '" + encodeURIComponent(roleName) + "'&$select=RoleId";
                const req = new global.XMLHttpRequest();
                req.open("GET", oDataEndpointUrl + queryOptions, false);
                req.setRequestHeader("Accept", "application/json");
                req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
                req.send(null);
                const data = JSON.parse(req.responseText).d;
                requestResults = requestResults.concat(data.results);
                if (data.__next) {
                    retrieveAllRoles(data.__next.substring(oDataEndpointUrl.length));
                }
            };

        retrieveAllRoles();
        if (requestResults.length) {
            const currentUserRoles = xrmPage.context.getUserRoles();
            for (let i = requestResults.length; i--;) {
                for (let j = currentUserRoles.length; j--;) {
                    if (areEqualGuids(currentUserRoles[j], requestResults[i].RoleId)) {
                        return true;
                    }
                }
            }
        }

        return false;
    };

    this.isAdmin = function() {
        return self.isUserInRole("System administrator");
    };

    this.setFormViewMode = function(readOnly) {
        try {
            if (readOnly) {
                if (!Xrm.Page.ui) {
                    setTimeout(self.setFormViewMode, 100);
                    return;
                }

                self.setDisableValueForAllFields(true);
                self.preventCopyPaste("span, label, input:text");
                global.openObjCustom = function(type, id) {
                    if (type === "8" || type === "9") {
                        return global.openObj(type, id, null, null, null, { rof: true });
                    } else {
                        return false;
                    }
                };

                /* jshint evil: true */
                eval(global.openlui.toString().replace("openObj", "openObjCustom") + " openlui");
                $("span.ms-crm-Lookup-Item, span.ms-crm-Lookup-Item-Read").each(function() {
                    // ToDo: this.onkeydown = "Mscrm.ReadFormUtilities.keyDownHandler(new Sys.UI.DomEvent(event));";
                    this.onkeydown = function() {
                        return false;
                    };

                    this.onclick = function onclick(event) {
                        global.openlui(new global.Sys.UI.DomEvent(event)); // ToDo: Mscrm.ReadFormUtilities.openLookup(true, new Sys.UI.DomEvent(event));
                    };
                });

                // hide ribbons move content to top
                const parentDoc = global.parent.document;
                $("#crmTopBar", parentDoc).hide();
                $("#crmContentPanel", parentDoc).css("top", "0");
            } else {
                showNavPanel();
            }
        } catch (ex) {
            setTimeout(self.setFormViewMode, 50);
        }
    };

    this.preventCopyPaste = function(selector) {
        $(selector).each(function() {
            const $this = $(this);
            $this.removeAttr("contentEditable")
                 .attr("contenteditable", false)
                 .attr("disabled", true);

            if ($this.is(":text")) {
                $this.css("background-color", "#ffffff");
            }

            $this.unbind();
            $this.bind({
                copy: function(e) {
                    e.preventDefault();
                    return false;
                },
                paste: function(e) {
                    e.preventDefault();
                    return false;
                },
                cut: function(e) {
                    e.preventDefault();
                    return false;
                }
            });
        });
    };

    this.setLookupValue = function(name, value, checkNull) {
        const attr = xrmPage.getAttribute(name);
        if (attr) {
            if (value) {
                if (value instanceof Xrm.Soap.EntityReference) {
                    attr.setValue([{ id: value.id.value, name: value.name || emptyString, entityType: value.logicalName }]);
                } else if (value instanceof global.LookupControlItem) {
                    attr.setValue([{ id: value.id, name: value.name || emptyString, entityType: value.entityType }]);
                } else {
                    attr.setValue(value);
                }
            } else {
                if (checkNull) {
                    value === null && attr.setValue(null);
                } else {
                    attr.setValue(null);
                }
            }
        }
    };

    this.addNotification = function(id, level, source, message) {
        /// <summary>
        /// Add a notification bar message with CRM 2011 style
        /// </summary>
        /// <param name="message" type="String">
        /// Details of the message
        /// </param>
        /// <param name="level" type="Integer">
        /// The warning level of the message: [1 critical, 2 information, 3 warning]
        /// </param>
        const notificationsArea = window.$find("crmNotifications");
        if (!notificationsArea) {
            return;
        }

        var notifications = notificationsArea.GetNotifications(),
            updateWithAdditionalParams = notifications && notifications.length >= 2,
            ie = false;

        if (updateWithAdditionalParams) {
            const missingElementClasses = [
                    "BorderTopWidth",
                    "BorderBottomWidth",
                    "PaddingTop",
                    "PaddingBottom"
                ];

            for (let c in missingElementClasses) {
                if (missingElementClasses.hasOwnProperty(c)) {
                    const className = missingElementClasses[c];
                    let correctName;

                    if (notificationsArea._element.currentStyle && !notificationsArea._element.currentStyle[className]) {
                        correctName = className.charAt(0).toLowerCase() + className.substr(1, className.length);
                        notificationsArea._element.currentStyle[className] = notificationsArea._element.currentStyle[correctName];
                        ie = true;
                    } else if (notificationsArea._element.style && !notificationsArea._element.style[className]) {
                        correctName = className.charAt(0).toLowerCase() + className.substr(1, className.length);
                        notificationsArea._element.style[className] = notificationsArea._element.style[correctName];
                    }
                }
            }
        }

        if (!notificationsArea.AddNotification || (notificationsArea.control && !notificationsArea.control.AddNotification)) {
            alert("Add Notification is no longer supported");
            return;
        }

        if (notificationsArea.AddNotification) {
            notificationsArea.AddNotification(id, level, source, message);
        } else if (notificationsArea.control.AddNotification) {
            notificationsArea.control.AddNotification(id, level, source, message);
        }

        if (!message) {
            if (notificationsArea.SetNotifications) {
                notificationsArea.SetNotifications(null, null);
            } else if (notificationsArea.control.SetNotifications) {
                notificationsArea.control.SetNotifications(null, null);
            } else {
                alert("Set Notification is no longer supported");
            }
        }

        if (ie) {
            notificationsArea._element.style.height = null;
        }
    };
}).call(Xrm.Common, this);
