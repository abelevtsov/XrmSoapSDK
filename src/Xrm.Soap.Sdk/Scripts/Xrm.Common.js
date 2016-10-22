Type.registerNamespace("Xrm.Common");

(function(global) {
    "use strict";

    /* jshint -W030 */

    var self = this,
        mscrm = global.Mscrm,
        xrmPage = Xrm.Page,
        emptyString = "",

        areEqualGuids = function(guid1, guid2) {
            if (!guid1 || !guid2) {
                return false;
            } else {
                var regex = /[{}]/g;
                return guid1.replace(regex, emptyString).toLowerCase() === guid2.replace(regex, emptyString).toLowerCase();
            }
        },

        showNavPanel = function() {
            var navContainers = document.getElementsByClassName("ms-crm-Form-Nav-Container");
            for (var i = navContainers.length; i--;) {
                var navContainer = navContainers[i];
                if (navContainer.tagName.toLowerCase() === "div") {
                    navContainer.style.display = "block";
                    break;
                }
            }
        };

    (function() {
        /* jshint freeze: false */
        String.prototype.format = function(/* arguments list */) {
            var formattedString = this.toString();
            for (var i = 0, l = arguments.length; i < l; i++) {
                var regex = new RegExp("\\{" + i + "\\}", "g");
                formattedString = formattedString.replace(regex, arguments[i]);
            }

            return formattedString;
        };

        Number.prototype.format = function(n) {
            return this.toFixed(n);
        };
    })();

    this.openCustomLookupDialog = function(callee, lookupStyle, lookupTypes, additionalParams, defaultType, defaultViewId, customViews, behavior, isMobileRefresh, isInlineMultiLookup, params) {
        var args = new global.LookupArgsClass(),
            oUrl = mscrm.CrmUri.create("/_controls/lookup/lookupinfo.aspx"),
            query = oUrl.get_query(),
            behaviorDefined = behavior && behavior instanceof self.LookupDialogBehavior;

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
            var queryString = (new mscrm.GlobalContext()).getQueryStringParameters();
            query.client_type = queryString.client_type;
            query.user_lcid = queryString.user_lcid;
        }

        global.setMobilePopupMode();
        var oFeatures = global.BuildFeatures(lookupStyle);
        if (!oFeatures) {
            return null;
        }

        var callbackFunctionObject = mscrm.Utilities.createCallbackFunctionObject("BuildAndReturnLookupItems", callee, params ? [params] : null, false),
            crmDialog = new mscrm.CrmDialog(oUrl, args, oFeatures.width, oFeatures.height, null);

        crmDialog.setCallbackReference(callbackFunctionObject);
        return crmDialog.show();
    };

    this.LookupDialogBehavior = (function() {
        var lookupDialogBehavior = function(showNew, showProp, enableNew, allowFilterOff, disableQuickFind, disableViewPicker) {
                this.ShowNew = function() {
                    return showNew ? "1" : "0";
                };

                this.ShowProp = function() {
                    return showProp ? "1" : "0";
                };

                this.EnableNew = function() {
                    return enableNew ? "1" : "0";
                };

                this.AllowFilterOff = function() {
                    return allowFilterOff ? "1" : "0";
                };

                this.DisableQuickFind = function() {
                    return disableQuickFind ? "1" : "0";
                };

                this.DisableViewPicker = function() {
                    return disableViewPicker ? "1" : "0";
                };
            };

        return lookupDialogBehavior;
    })();

    this.setLookupBehavior = function(lookupName, behavior) {
        // Отключаем смену Представлений в диалоговом окне лукапа
        var showProp = behavior.ShowProp(),
            lookupControl = document.getElementById(lookupName) || document.getElementById(lookupName + "_i");

        if (lookupControl && lookupControl._behaviors) {
            var currentBehavior = lookupControl._behaviors[0];
            if (currentBehavior.AddParam) {
                behavior = behavior || new self.LookupDialogBehavior(false, false, true, true, false, true);
                currentBehavior.AddParam("ShowNewButton", behavior.ShowNew());
                currentBehavior.AddParam("ShowPropButton", showProp);
                currentBehavior.AddParam("EnableNewButton", behavior.EnableNew());
                currentBehavior.AddParam("AllowFilterOff", behavior.AllowFilterOff());
                currentBehavior.AddParam("DisableQuickFind", behavior.DisableQuickFind());
                currentBehavior.AddParam("DisableViewPicker", behavior.DisableViewPicker());
            }

            lookupControl.setAttribute("showproperty", showProp);
        }
    };

    this.setVisibleTabSection = function(tabName, sectionName, show, sectionFunc) {
        /// <summary>Показать/спрятать секцию панели</summary>
        /// <param name="tabName" type="String">Имя вкладки</param>
        /// <param name="sectionName" type="String">Имя панели</param>
        /// <param name="show" type="Boolean">Признак "показать"</param>
        /// <param name="sectionFunc" type="Function">Дополнительное действие над секцией при её показе/скрытии</param>
        var tab = xrmPage.ui.tabs.get(tabName);
        if (tab && sectionName) {
            var section = tab.sections.get(sectionName);
            if (section) {
                if (show === true) {
                    tab.setVisible(show);
                }

                section.setVisible(show);
                sectionFunc && sectionFunc(section, show);
            }
        }
    };

    this.setVisibleAdminTab = function(tabName, sectionName, show) {
        /// <summary>Показать/спрятать секцию панели администратора</summary>
        /// <param name="tabName" type="String">Имя вкладки</param>
        /// <param name="sectionName" type="String">Имя панели</param>
        /// <param name="show" type="Boolean">Признак "показать"</param>
        var tab = xrmPage.ui.tabs.get(tabName);
        if (tab && sectionName) {
            var section = tab.sections.get(sectionName);
            if (section) {
                tab.setVisible(show);
                section.setVisible(show);
            }
        }
    };

    this.setVisibleTab = function(tabName, show) {
        /// <summary>Показать/спрятать вкладку</summary>
        /// <param name="tabName" type="String">Имя вкладки</param>
        /// <param name="show" type="Boolean">Признак "показать"</param>
        var tab = xrmPage.ui.tabs.get(tabName);
        tab && tab.setVisible(show);
    };

    this.setDisabledSectionFields = function(sectionName, isDisabled) {
        /// <summary>Делает доступными/недоступными для редактирования поля секции</summary>
        /// <param name="sectionName" type="String">Название секции</param>
        /// <param name="isDisabled" type="Boolean">Признак доступности</param>
        var controls = Xrm.Page.ui.controls.get();
        for (var prop in controls) {
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
        /// <summary>Установка уровня обязательности полей секции</summary>
        /// <param name="sectionName" type="String">Название секции</param>
        /// <param name="level" type="String">Уровень обязательности</param>
        var controls = xrmPage.ui.controls.get();
        for (var prop in controls) {
            if (controls.hasOwnProperty(prop)) {
                var control = controls[prop],
                    parent = control.getParent(),
                    controlSectionName = parent ? parent.getName() : emptyString;

                if (controlSectionName === sectionName) {
                    var attribute = xrmPage.getAttribute(control.getName());
                    attribute.setRequiredLevel(level);
                }
            }
        }
    };

    this.setDisabledTabFields = function(tabName, isDisabled) {
        /// <summary>Делает доступными/недоступными для редактирования поля вкладки</summary>
        /// <param name="tabName" type="String">Название вкладки</param>
        /// <param name="isDisabled" type="Boolean">Признак доступности</param>
        var tab = xrmPage.ui.tabs.get(tabName);
        if (tab) {
            var sections = tab.sections.get(),
                controls = Xrm.Page.ui.controls.get();

            for (var i = sections.length; i--;) {
                var sectionName = sections[i].getName();
                for (var prop in controls) {
                    if (!controls.hasOwnProperty(prop)) {
                        continue;
                    }

                    var control = controls[prop],
                        parent = control.getParent(),
                        controlSectionName = parent ? parent.getName() : emptyString;

                    if (controlSectionName === sectionName) {
                        control.setDisabled(isDisabled);
                    }
                }
            }
        }
    };

    this.setDisabledValueForAllFields = function(isDisabled) {
        /// <summary>Set disable value from parameter for all controls in form</summary>
        /// <param name="isDisabled" type="Boolean">Disable (true) or enable (false) control</param>
        var doesControlHaveAttribute = function(control) {
                var controlType = control.getControlType();
                return controlType !== "iframe" &&
                       controlType !== "webresource" &&
                       controlType !== "subgrid";
            };

        xrmPage.ui.controls.forEach(function(control) {
            if (doesControlHaveAttribute(control)) {
                control.setDisabled(isDisabled);
            }
        });
    };

    this.setAllRecommendedAttributesToRequired = function() {
        /// <summary>Сделать все "рекомендованные" атрибуты обязательными</summary>
        var attributes = xrmPage.data.entity.attributes.get();
        for (var name in attributes) {
            if (attributes.hasOwnProperty(name)) {
                var attribute = attributes[name];
                if (attribute.getRequiredLevel() === "recommended") {
                    attribute.setRequiredLevel("required");
                }
            }
        }
    };

    this.setAllMandatoryAttributesToNone = function() {
        /// <summary>Сделать все "обязательные" атрибуты необязательными</summary>
        var attributes = xrmPage.data.entity.attributes.get();
        for (var name in attributes) {
            if (attributes.hasOwnProperty(name)) {
                var attribute = attributes[name];
                if (attribute.getRequiredLevel() === "required") {
                    attribute.setRequiredLevel("none");
                }
            }
        }
    };

    this.getAllMandatoryAttributes = function() {
        var result = [],
            attributes = xrmPage.data.entity.attributes.get();

        for (var name in attributes) {
            if (attributes.hasOwnProperty(name)) {
                var attribute = attributes[name];
                if (attribute.getRequiredLevel() === "required") {
                    result[result.length] = attribute.getName();
                }
            }
        }

        return result;
    };

    this.getPageNavItem = function(name) {
        /// <summary>Возвращает объект навигации по имени</summary>
        /// <param name="name" type="String">Имя объекта навигации</param>
        return xrmPage.ui.navigation.items.get("nav_" + name);
    };

    this.setImmediate = function(func) {
        /// <summary>Запускает переданную функцию на выполнение асинхронно</summary>
        /// <param name="func" type="Function">Функция для выполнения</param>
        if (global.setImmediate) {
            global.setImmediate(func);
        } else {
            global.setTimeout(func, 0);
        }
    };

    this.getObjectTypeCode = function(entityName) {
        /// <summary>Возвращает код сущности по имени</summary>
        /// <param name="entityName" type="String">Имя сущности</param>
        try {
            var etc = mscrm.InternalUtilities.EntityTypeCode[entityName];
            if (typeof etc !== "undefined") {
                return etc;
            }
        } catch (ex) {
            var lookupService = new global.RemoteCommand("LookupService", "RetrieveTypeCode");
            lookupService.SetParameter("entityName", entityName);
            var result = lookupService.Execute();
            if (result.Success && typeof result.ReturnValue === "number") {
                return result.ReturnValue;
            }
        }

        return null;
    };

    this.isUserInRole = function(roleName) {
        /// <summary>Check if current user is in role with name equal roleName</summary>
        /// <param name="roleName" type="String">Role name for check</param>
        var serverUrl = xrmPage.context.getClientUrl(),
            odataPath = "/xrmservices/2011/organizationdata.svc",
            oDataEndpointUrl = serverUrl + odataPath + "/RoleSet",
            requestResults = [],
            retrieveAllRoles = function(queryOptions) {
                queryOptions = queryOptions || "?$filter=Name eq '" + encodeURIComponent(roleName) + "'&$select=RoleId";
                var xmlHttp = new global.XMLHttpRequest();
                xmlHttp.open("GET", oDataEndpointUrl + queryOptions, false);
                xmlHttp.setRequestHeader("Accept", "application/json");
                xmlHttp.setRequestHeader("Content-Type", "application/json; charset=utf-8");
                xmlHttp.send(null);
                var data = JSON.parse(xmlHttp.responseText).d;
                requestResults = requestResults.concat(data.results);
                if (data.__next) {
                    retrieveAllRoles(data.__next.substring(oDataEndpointUrl.length));
                }
            };

        retrieveAllRoles();
        if (requestResults.length) {
            var currentUserRoles = xrmPage.context.getUserRoles();
            for (var i = requestResults.length; i--;) {
                for (var j = currentUserRoles.length; j--;) {
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

                var parentDoc = global.parent.document;
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
            var $this = $(this);
            $this.removeAttr("contentEditable")
                 .attr("contenteditable", false)
                 .attr("disabled", true);

            if ($this.is(":text")) {
                $this.css("background-color", "white");
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
        var attr = xrmPage.getAttribute(name);
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
        var notificationsArea = window.$find("crmNotifications");
        if (!notificationsArea) {
            return;
        }

        var notifications = notificationsArea.GetNotifications(),
            updateWithAdditionalParams = notifications && notifications.length >= 2,
            ie = false;

        if (updateWithAdditionalParams) {
            var missingElementClasses = [
                    "BorderTopWidth",
                    "BorderBottomWidth",
                    "PaddingTop",
                    "PaddingBottom"
                ];

            for (var c in missingElementClasses) {
                if (missingElementClasses.hasOwnProperty(c)) {
                    var className = missingElementClasses[c],
                        correctName;

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
