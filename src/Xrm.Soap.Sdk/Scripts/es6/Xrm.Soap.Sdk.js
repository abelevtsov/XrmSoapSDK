Type.registerNamespace("Xrm.Soap.Sdk");

(function(global) {
    "use strict";

    /* jshint -W030 */
    /* jshint esnext: true */

    var self = this,
        emptyString = "",
        trueString = true + emptyString,
        falseString = false + emptyString,

        notify = function(msg) {
            Xrm && Xrm.Utility && Xrm.Utility.alertDialog ? Xrm.Utility.alertDialog(msg) : alert(msg);
        },

        htmlEncode = function(s) {
            if (!s) {
                return s;
            }

            var buffer = emptyString,
                encoded = emptyString;

            for (var count = 0, cnt = 0, l = s.length; cnt < l; cnt++) {
                var c = s.charCodeAt(cnt);
                if (c > 96 && c < 123 || c > 64 && c < 91 || c === 32 || c > 47 && c < 58 || c === 46 || c === 44 || c === 45 || c === 95) {
                    buffer += String.fromCharCode(c);
                } else {
                    buffer += "&#" + c + ";";
                }

                if (++count === 500) {
                    encoded += buffer;
                    buffer = emptyString;
                    count = 0;
                }
            }

            if (buffer.length) {
                encoded += buffer;
            }

            return encoded;
        },

        removeBraces = function(value) {
            if (!!!value) {
                return emptyString;
            }

            return value.replace("{", emptyString).replace("}", emptyString).toLowerCase();
        },

        stringToDate = function(s) {
            var b = s.split(/\D/);
            return new Date(Date.UTC(b[0], --b[1], b[2], b[3], b[4], b[5]));
        },

        innerSurrogateAmpersandWorkaround = function(s) {
            var buffer = emptyString,
                c0,
                cnt,
                l;

            for (cnt = 0, l = s.length; cnt < l; cnt++) {
                c0 = s.charCodeAt(cnt);
                if (c0 >= 55296 && c0 <= 57343) {
                    if (cnt + 1 < s.length) {
                        var c1 = s.charCodeAt(cnt + 1);
                        if (c1 >= 56320 && c1 <= 57343) {
                            buffer += "CRMEntityReferenceOpen" + ((c0 - 55296) * 1024 + (c1 & 1023) + 65536).toString(16) + "CRMEntityReferenceClose";
                            cnt++;
                        } else {
                            buffer += String.fromCharCode(c0);
                        }
                    } else {
                        buffer += String.fromCharCode(c0);
                    }
                } else {
                    buffer += String.fromCharCode(c0);
                }
            }

            s = buffer;
            buffer = emptyString;
            for (cnt = 0, l = s.length; cnt < l; cnt++) {
                c0 = s.charCodeAt(cnt);
                if (c0 >= 55296 && c0 <= 57343) {
                    buffer += String.fromCharCode(65533);
                } else {
                    buffer += String.fromCharCode(c0);
                }
            }

            return htmlEncode(buffer).replace(/CRMEntityReferenceOpen/g, "&#x").replace(/CRMEntityReferenceClose/g, ";");
        },

        xmlToString = function(response) {
            var xmlString = emptyString;

            try {
                if (response) {
                    if (typeof XMLSerializer !== "undefined" &&
                        typeof response.xml === "undefined") {
                        xmlString = (new XMLSerializer()).serializeToString(response[0]);
                    } else {
                        if (typeof response.xml !== "undefined") {
                            xmlString = response.xml;
                        } else if (typeof response[0].xml !== "undefined") {
                            xmlString = response[0].xml;
                        }
                    }
                }
            } catch (ex) {
                notify("Cannot convert XML to a string");
            }

            return xmlString;
        },

        parseXml = function(xml) {
            var notifyAboutNotSupport = function() {
                    notify("Cannot convert the XML string to a cross-browser XML object.");
                };

            if (global.DOMParser) {
                parseXml = function(data) {
                    // code for Mozilla, Firefox, Opera, and other normal browsers
                    try {
                        var parser = new DOMParser();
                        return parser.parseFromString(data, "text/xml");
                    } catch (ex) {
                        return notifyAboutNotSupport();
                    }
                };
            } else {
                parseXml = function(data) {
                    // IE
                    try {
                        var xmlDoc = new global.ActiveXObject("Microsoft.XMLDOM");
                        xmlDoc.async = false;
                        xmlDoc.loadXML(data);
                        return xmlDoc;
                    } catch (ex) {
                        return notifyAboutNotSupport();
                    }
                };
            }

            return parseXml(xml);
        },

        crmXmlDecode = function(s) {
            return typeof s !== "string" ? s.toString() : s;
        },

        crmXmlEncode = function(s) {
            var stype = typeof s;
            if (stype === "undefined" || stype === "unknown") {
                return s;
            } else if (stype !== "string") {
                s = s.toString();
            }

            return innerSurrogateAmpersandWorkaround(s);
        },

        encodeValue = function(value) {
            if (value === null || value === "undefined") {
                return null;
            }

            if (value && value.type === "guid") {
                return value.value;
            }

            if (value && typeof value === typeof emptyString && value.slice(0, 1) === "{" && value.slice(-1) === "}") {
                value = value.slice(1, -1);
            }

            return value && typeof value === "object" && value.getTime ? value.toISOString() : crmXmlEncode(value);
        },

        isMetadataArray = (function() {
            var arrayElements = [
                    "Attributes",
                    "ManyToManyRelationships",
                    "ManyToOneRelationships",
                    "OneToManyRelationships",
                    "Privileges",
                    "LocalizedLabels",
                    "Options",
                    "Targets"
                ];

            if (typeof Array.prototype.some === "function") {
                return function(elementName) {
                    return arrayElements.some(function(value, index, array) {
                        return elementName === array[index];
                    });
                };
            } else {
                return function(elementName) {
                    for (var i = 0, l = arrayElements.length; i < l; i++) {
                        if (elementName === arrayElements[i]) {
                            return true;
                        }
                    }

                    return false;
                };
            }
        })(),

        getNodeName = function(node) {
            return typeof node.baseName !== "undefined" ? node.baseName : node.localName;
        },

        objectifyNode = function(node) {
            if (node.attributes && node.attributes.length === 1) {
                var nil = node.attributes.getNamedItem("i:nil");
                if (nil && nil.nodeValue === trueString) {
                    return null;
                }
            }

            if (node.firstChild && node.firstChild.nodeType === 3) {
                var nodeName = getNodeName(node),
                    nodeValue = node.firstChild.nodeValue,

                    parseIntFunc = function() {
                        return parseInt(nodeValue, 10);
                    },

                    parseBoolFunc = function() {
                        return nodeValue === trueString ? true : false;
                    },

                    nodeNames = {
                        ActivityTypeMask: parseIntFunc,
                        ObjectTypeCode: parseIntFunc,
                        ColumnNumber: parseIntFunc,
                        DefaultFormValue: parseIntFunc,
                        MaxValue: parseIntFunc,
                        MinValue: parseIntFunc,
                        MaxLength: parseIntFunc,
                        Order: parseIntFunc,
                        Precision: parseIntFunc,
                        PrecisionSource: parseIntFunc,
                        LanguageCode: parseIntFunc,
                        AutoRouteToOwnerQueue: parseBoolFunc,
                        CanBeChanged: parseBoolFunc,
                        CanTriggerWorkflow: parseBoolFunc,
                        IsActivity: parseBoolFunc,
                        IsActivityParty: parseBoolFunc,
                        IsAvailableOffline: parseBoolFunc,
                        IsChildEntity: parseBoolFunc,
                        IsCustomEntity: parseBoolFunc,
                        IsCustomOptionSet: parseBoolFunc,
                        IsDocumentManagementEnabled: parseBoolFunc,
                        IsEnabledForCharts: parseBoolFunc,
                        IsGlobal: parseBoolFunc,
                        IsImportable: parseBoolFunc,
                        IsIntersect: parseBoolFunc,
                        IsManaged: parseBoolFunc,
                        IsReadingPaneEnabled: parseBoolFunc,
                        IsValidForAdvancedFind: parseBoolFunc,
                        CanBeSecuredForCreate: parseBoolFunc,
                        CanBeSecuredForRead: parseBoolFunc,
                        CanBeSecuredForUpdate: parseBoolFunc,
                        IsCustomAttribute: parseBoolFunc,
                        IsPrimaryId: parseBoolFunc,
                        IsPrimaryName: parseBoolFunc,
                        IsSecured: parseBoolFunc,
                        IsValidForCreate: parseBoolFunc,
                        IsValidForRead: parseBoolFunc,
                        IsValidForUpdate: parseBoolFunc,
                        IsCustomRelationship: parseBoolFunc,
                        CanBeBasic: parseBoolFunc,
                        CanBeDeep: parseBoolFunc,
                        CanBeGlobal: parseBoolFunc,
                        CanBeLocal: parseBoolFunc,
                        Value: function() {
                            if (nodeValue === trueString || nodeValue === falseString) {
                                return nodeValue === trueString ? true : false;
                            }

                            if (nodeValue === "ApplicationRequired" ||
                                nodeValue === "None" ||
                                nodeValue === "Recommended" ||
                                nodeValue === "SystemRequired") {
                                return nodeValue;
                            } else {
                                return parseInt(nodeValue, 10);
                            }
                        }
                    };

                if (nodeNames.hasOwnProperty(nodeName)) {
                    return nodeNames[nodeName]();
                } else {
                    return nodeValue;
                }
            }

            var i, l, typeItem;

            if (isMetadataArray(getNodeName(node))) {
                var arrayValue = [],
                    counter = 0;

                for (i = 0, l = node.childNodes.length; i < l; i++) {
                    var objectTypeName,
                        attrs = node.childNodes[i].attributes;

                    if (attrs && (typeItem = attrs.getNamedItem("i:type"))) {
                        objectTypeName = typeItem.nodeValue.split(":")[1];
                    } else {
                        objectTypeName = getNodeName(node.childNodes[i]);
                    }

                    var b = objectifyNode(node.childNodes[i]);
                    b._type = objectTypeName;
                    arrayValue[counter++] = b;
                }

                return arrayValue;
            }

            if (!node.childNodes.length) {
                return null;
            }

            var c = {};
            if ((typeItem = node.attributes.getNamedItem("i:type"))) {
                c._type = typeItem.nodeValue.split(":")[1];
            }

            for (i = 0, l = node.childNodes.length; i < l; i++) {
                var childNode = node.childNodes[i];
                if (childNode.nodeType === 3) {
                    c[getNodeName(childNode)] = childNode.nodeValue;
                } else {
                    c[getNodeName(childNode)] = objectifyNode(childNode);
                }
            }

            return c;
        },

        publishersPrefixes = [emptyString],
        context = typeof global.GetGlobalContext === "function" ? global.GetGlobalContext() : global.Xrm.Page.context,
        loc = global.location,
        clientUrl = context.getClientUrl(),
        splittedUrl = clientUrl.replace(/^(http|https):\/\/([_a-zA-Z0-9\-\.]+)(:([0-9]{1,5}))?/, loc.protocol + "//" + loc.host).split(/\/+/g),
        xrmServiceUrl = "/XRMServices/2011/Organization.svc/web",
        contractsXrmNs = "http://schemas.microsoft.com/xrm/2011/Contracts",
        contractsCrmNs = "http://schemas.microsoft.com/crm/2011/Contracts",
        xrmSoapActionPrefix = contractsXrmNs + "/Services/IOrganizationService/",
        xmlSchemaNs = "http://www.w3.org/2001/XMLSchema",
        xmlSchemaInstanceNs = xmlSchemaNs + "-instance",
        serializationNs = "http://schemas.microsoft.com/2003/10/Serialization/",
        arraysNs = serializationNs + "Arrays",
        genericNs = "http://schemas.datacontract.org/2004/07/System.Collections.Generic",
        metadataNs = "http://schemas.microsoft.com/xrm/2011/Metadata",
        utf8Root = "<?xml version='1.0' encoding='utf-8'?>",
        orgName = context.getOrgUniqueName(),
        compile = _.template,
        attributeTemplate = compile("<b:string><%= value %></b:string>"),
        noLockTemplate = compile("<a:NoLock><%= noLock %></a:NoLock>"),
        distinctTemplate = compile("<a:Distinct><%= distinct %></a:Distinct>"),
        entityNameTemplate = compile("<a:EntityName><%= name %></a:EntityName>"),
        hasOwnProp = Object.prototype.hasOwnProperty,

        extend = function(child, base) {
            // ReSharper disable once MissingHasOwnPropertyInForeach
            for (var key in base) {
                if (hasOwnProp.call(base, key)) {
                    child[key] = base[key];
                }
            }

            var ctor = function() {
                    this.constructor = child;
                };

            ctor.prototype = base.prototype;
            /* jshint newcap: false */
            child.prototype = new ctor();
            child.base = base.prototype;

            return child;
        };

    if (loc.host.indexOf("localhost") !== -1) {
        splittedUrl[1] = loc.host;
    }

    this.init = function(prefixes) {
        publishersPrefixes = _.union(publishersPrefixes, prefixes);
    };

    this.ColumnSet = (function() {
        var columnsTemplate = compile("<a:AllColumns><%= allColumns %></a:AllColumns><a:Columns xmlns:b='" + arraysNs + "'><% _.each(columns, function(column) { %><%= column %><% }) %></a:Columns>"),
            columnSetTemplate = compile("<a:ColumnSet><%= columnSet %></a:ColumnSet>"),
            asLinkColumnSetTemplate = compile("<a:Columns><%= columnSet %></a:Columns>"),
            simpleColumnSetTemplate = compile("<columnSet xmlns:a='" + contractsXrmNs + "'><%= columnSet %></columnSet>"),

            initColumns = function(columns) {
                if (columns && columns.length) {
                    if (columns.length === 1 && $.isArray(columns[0])) {
                        return columns[0];
                    } else if (typeof columns[0] === "boolean") {
                        return [columns[0]];
                    } else {
                        return columns;
                    }
                }

                return [false];
            },

            getColumnSetTemplate = function(asLink, simple) {
                if (asLink) {
                    return asLinkColumnSetTemplate;
                } else if (simple) {
                    return simpleColumnSetTemplate;
                }

                return columnSetTemplate;
            },

            getSoap = function(asLink, simple, allColumns, columns) {
                return getColumnSetTemplate(asLink, simple)({ columnSet: columnsTemplate({ allColumns: allColumns, columns: columns }) });
            },

            columnSet = function() {
                this.columns = initColumns(arguments);
                this.count = this.columns.length;
            };

        columnSet.prototype.AddColumn = function(columnName) {
            if (typeof this.columns[0] !== "boolean") {
                this.columns[this.count] = columnName;
                this.count++;
            }
        };

        columnSet.prototype.serialize = function(asLink, simple) {
            if (this.count) {
                if (this.columns[0] === true) {
                    return getSoap(asLink, simple, true, []);
                }

                var columns = [];
                if (this.columns[0] !== false) {
                    columns = _.map(this.columns, function(column) {
                        return attributeTemplate({ value: column });
                    });
                }

                return getSoap(asLink, simple, false, columns);
            } else {
                return getSoap(asLink, simple, false, []);
            }
        };

        columnSet.GetAllColumnsSoap = function(asLink, simple) {
            return getSoap(asLink, simple, true, []);
        };

        return columnSet;
    })();

    this.ConditionOperator = (function() {
        return {
            Equal: "Equal",
            NotEqual: "NotEqual",
            GreaterThan: "GreaterThan",
            LessThan: "LessThan",
            GreaterEqual: "GreaterEqual",
            LessEqual: "LessEqual",
            Like: "Like",
            NotLike: "NotLike",
            In: "In",
            NotIn: "NotIn",
            Between: "Between",
            NotBetween: "NotBetween",
            Null: "Null",
            NotNull: "NotNull",
            Yesterday: "Yesterday",
            Today: "Today",
            Tomorrow: "Tomorrow",
            Last7Days: "Last7Days",
            Next7Days: "Next7Days",
            LastWeek: "LastWeek",
            ThisWeek: "ThisWeek",
            NextWeek: "NextWeek",
            LastMonth: "LastMonth",
            ThisMonth: "ThisMonth",
            NextMonth: "NextMonth",
            On: "On",
            OnOrBefore: "OnOrBefore",
            OnOrAfter: "OnOrAfter",
            LastYear: "LastYear",
            ThisYear: "ThisYear",
            NextYear: "NextYear",
            LastXHours: "LastXHours",
            NextXHours: "NextXHours",
            LastXDays: "LastXDays",
            NextXDays: "NextXDays",
            LastXWeeks: "LastXWeeks",
            NextXWeeks: "NextXWeeks",
            LastXMonths: "LastXMonths",
            NextXMonths: "NextXMonths",
            LastXYears: "LastXYears",
            NextXYears: "NextXYears",
            EqualUserId: "EqualUserId",
            NotEqualUserId: "NotEqualUserId",
            EqualBusinessId: "EqualBusinessId",
            NotEqualBusinessId: "NotEqualBusinessId",
            ChildOf: "ChildOf",
            Mask: "Mask",
            NotMask: "NotMask",
            MasksSelect: "MasksSelect",
            Contains: "Contains",
            DoesNotContain: "DoesNotContain",
            EqualUserLanguage: "EqualUserLanguage",
            NotOn: "NotOn",
            OlderThanXMonths: "OlderThanXMonths",
            BeginsWith: "BeginsWith",
            DoesNotBeginWith: "DoesNotBeginWith",
            EndsWith: "EndsWith",
            DoesNotEndWith: "DoesNotEndWith",
            ThisFiscalYear: "ThisFiscalYear",
            ThisFiscalPeriod: "ThisFiscalPeriod",
            NextFiscalYear: "NextFiscalYear",
            NextFiscalPeriod: "NextFiscalPeriod",
            LastFiscalYear: "LastFiscalYear",
            LastFiscalPeriod: "LastFiscalPeriod",
            LastXFiscalYears: "LastXFiscalYears",
            LastXFiscalPeriods: "LastXFiscalPeriods",
            NextXFiscalYears: "NextXFiscalYears",
            NextXFiscalPeriods: "NextXFiscalPeriods",
            InFiscalYear: "InFiscalYear",
            InFiscalPeriod: "InFiscalPeriod",
            InFiscalPeriodAndYear: "InFiscalPeriodAndYear",
            InOrBeforeFiscalPeriodAndYear: "InOrBeforeFiscalPeriodAndYear",
            InOrAfterFiscalPeriodAndYear: "InOrAfterFiscalPeriodAndYear",
            EqualUserTeams: "EqualUserTeams"
        };
    })();

    this.OrderType = (function() {
        return {
            Ascending: "Ascending",
            Descending: "Descending"
        };
    })();

    this.OrderExpression = (function() {
        var orderTemplate = compile("<a:OrderExpression><a:AttributeName><%= attributeName %></a:AttributeName><a:OrderType><%= orderType %></a:OrderType></a:OrderExpression>"),
            orderExpression = function(attributeName, orderType) {
                /// <summary>OrderExpression for use with QueryByAttribute</summary>
                /// <param name="attributeName" type="String">Name of ordering by attribute</param>
                /// <param name="orderType" type="OrderType">Ascending or Descending</param>
                this.attributeName = attributeName;
                this.orderType = !orderType ? self.OrderType.Descending : orderType;
            };

        orderExpression.prototype.serialize = function() {
            return orderTemplate({
                attributeName: this.attributeName,
                orderType: this.orderType
            });
        };

        return orderExpression;
    })();

    this.ConditionExpression = (function() {
        var valueTemplate = compile("<b:anyType i:type='c:<%= type %>' xmlns:c='<%= xmlns %>'><%= value %></b:anyType>"),
            valuesTemplate = compile("<a:Values xmlns:b='" + arraysNs + "'><% _.each(values, function(value) { %><%= value %><% }) %></a:Values>"),
            conditionExpressionTemplate = compile("<a:ConditionExpression><a:AttributeName><%= attributeName %></a:AttributeName><a:Operator><%= operator %></a:Operator><%= values %></a:ConditionExpression>"),

            conditionExpression = function(attributeName, operator, values) {
                /// <summary>ConditionExpression for use with QueryByAttribute/QueryExpression</summary>
                /// <param name="attributeName" type="String">Name of ordering by attribute</param>
                /// <param name="operator" type="ConditionOperator">Condition operator</param>
                /// <param name="values" type="Array">Condition values</param>
                this.attributeName = attributeName;
                this.operator = operator;
                this.values = values; // ToDo: param array
            };

        conditionExpression.prototype.serialize = function() {
            if (this.values && this.values.length) {
                var values = _.map(this.values, function(value) {
                    var typed = value.hasOwnProperty("type");
                    return valueTemplate({
                        type: typed ? value.type : "string",
                        xmlns: value instanceof self.StateCode || value instanceof self.StatusCode || !typed ? xmlSchemaNs : serializationNs,
                        value: value.hasOwnProperty("value") ? value.value : value
                    });
                });

                return conditionExpressionTemplate({
                    attributeName: this.attributeName,
                    operator: this.operator,
                    values: valuesTemplate({ values: values })
                });
            } else {
                return conditionExpressionTemplate({
                    attributeName: this.attributeName,
                    operator: this.operator,
                    values: []
                });
            }
        };

        return conditionExpression;
    })();

    this.FilterOperator = (function() {
        return {
            And: "And",
            Or: "Or"
        };
    })();

    this.FilterExpression = (function() {
        var template = compile([
            "<a:LinkCriteria>",
                 "<a:Conditions>",
                     "<% _.each(conditions, function(condition) { %><%= condition %><% }) %>",
                 "</a:Conditions>",
                 "<a:FilterOperator>",
                     "<%= filterOperator %>",
                 "</a:FilterOperator>",
             "</a:LinkCriteria>"
            ].join(emptyString)),

            filterExpression = function(logicalOperator) {
                this.conditions = [];
                this.filterOperator = logicalOperator ? logicalOperator : self.FilterOperator.And;
            };

        filterExpression.prototype.AddCondition = function(condition) {
            /// <summary>Add condition expression to conditions list</summary>
            /// <param name="condition" type="ConditionExpression">Condition</param>
            condition && condition instanceof self.ConditionExpression && (this.conditions[this.conditions.length] = condition);
        };

        filterExpression.prototype.AddConditions = function(/* conditions list */) {
            if (arguments && arguments.length) {
                var count = this.conditions.length;
                for (var i = arguments.length; i--;) {
                    var condition = arguments[i];
                    condition && condition instanceof self.ConditionExpression && (this.conditions[count++] = condition);
                }
            }
        };

        filterExpression.prototype.SetFilterOperator = function(logicalOperator) {
            logicalOperator && (this.filterOperator = logicalOperator);
        };

        filterExpression.prototype.serialize = function() {
            if (!this.conditions.length) {
                return template({
                    conditions: [],
                    filterOperator: this.filterOperator
                });
            }

            return template({
                conditions: _.map(this.conditions, function(condition) {
                    return condition.serialize();
                }),
                filterOperator: this.filterOperator
            });
        };

        return filterExpression;
    })();

    this.JoinOperator = (function() {
        return {
            Inner: "Inner",
            LeftOuter: "LeftOuter",
            Natural: "Natural"
        };
    })();

    this.LinkEntity = (function() {
        var template = compile([
                "<a:LinkEntity>",
                   "<%= columns %>",
                   "<a:EntityAlias i:nil='true'/>",
                   "<a:JoinOperator>",
                       "<%= joinOperator %>",
                   "</a:JoinOperator>",
                   "<%= linkCriteria %>",
                   "<a:LinkFromAttributeName>",
                     "<%= linkFromAttributeName %>",
                   "</a:LinkFromAttributeName>",
                   "<a:LinkFromEntityName>",
                     "<%= linkFromEntityName %>",
                   "</a:LinkFromEntityName>",
                   "<a:LinkToAttributeName>",
                     "<%= linkToAttributeName %>",
                   "</a:LinkToAttributeName>",
                   "<a:LinkToEntityName>",
                     "<%= linkToEntityName %>",
                   "</a:LinkToEntityName>",
                 "</a:LinkEntity>"
            ].join(emptyString)),

            linkEntity = function(linkFromEntityName, linkToEntityName, linkFromAttributeName, linkToAttributeName, joinOperator) {
                /// <summary>LinkEntity like in Microsoft.Xrm.Sdk</summary>
                this.linkFromEntityName = linkFromEntityName;
                this.linkToEntityName = linkToEntityName;
                this.linkFromAttributeName = linkFromAttributeName;
                this.linkToAttributeName = linkToAttributeName;
                this.joinOperator = joinOperator;
            };

        linkEntity.prototype.SetLinkCriteria = function(filterExpression) {
            /// <summary>Set filter expression as link criteria</summary>
            /// <param name="filterExpression" type="FilterExpression">Current filter criteria</param>
            this.linkCriteria = filterExpression;
        };

        linkEntity.prototype.SetColumns = function(columnSet) {
            columnSet && columnSet instanceof self.ColumnSet && (this.columns = columnSet);
        };

        linkEntity.prototype.serialize = function() {
            return template({
                columns: (this.columns ? this.columns : new self.ColumnSet(false)).serialize(true),
                joinOperator: this.joinOperator,
                linkCriteria: this.linkCriteria ? this.linkCriteria.serialize() : emptyString,
                linkFromAttributeName: this.linkFromAttributeName,
                linkFromEntityName: this.linkFromEntityName,
                linkToAttributeName: this.linkToAttributeName,
                linkToEntityName: this.linkToEntityName
            });
        };

        return linkEntity;
    })();

    this.PageInfo = (function() {
        var template = compile([
                "<a:PageInfo>",
                  "<a:Count><%= count %></a:Count>",
                  "<a:PageNumber><%= pageNumber %></a:PageNumber>",
                  "<a:PagingCookie i:nil='true'/>",
                  "<a:ReturnTotalRecordCount><%= returnTotalRecordCount %></a:ReturnTotalRecordCount>",
                "</a:PageInfo>"
            ].join(emptyString)),

            pageInfo = function(count, pageNumber, returnTotalRecordCount) {
                this.count = count || 0;
                this.pageNumber = pageNumber || 0;
                this.returnTotalRecordCount = returnTotalRecordCount || false;
            };

        pageInfo.prototype.serialize = function() {
            return template({
                count: this.count,
                pageNumber: this.pageNumber,
                returnTotalRecordCount: this.returnTotalRecordCount
            });
        };

        pageInfo.Default = function() {
            return new self.PageInfo();
        };

        return pageInfo;
    })();

    this.QueryByAttribute = (function() {
        var queryTemplate = compile("<query i:type='a:QueryByAttribute' xmlns:a='" + contractsXrmNs + "'><%= query %></query>"),
            ordersTemplate = compile("<a:Orders><% _.each(orders, function(order) { %><%= order %><% }) %></a:Orders>"),
            attributesTemplate = compile("<a:Attributes xmlns:b='" + arraysNs + "'><% _.each(attributes, function(attribute) { %><%= attribute %><% }) %></a:Attributes>"),
            valuesTemplate = compile("<a:Values xmlns:b='" + arraysNs + "'><% _.each(values, function(value) { %><%= value %><% }) %></a:Values>"),
            valueTemplate = compile("<b:anyType i:type='c:<%= type %>' xmlns:c='" + xmlSchemaNs + "'><%= value %></b:anyType>"),
            topCountTemplate = compile("<a:TopCount <% if (topCount === null) { %> i:nil='true'<% } %>><%= topCount %></a:TopCount>"),

            queryByAttribute = function(entityName, attributes, values, columnSet, topCount) {
                /// <summary>QueryByAttribute like in Microsoft.Xrm.Sdk</summary>
                /// <param name="entityName" type="String">Name of object for retrieve</param>
                /// <param name="attributes" type="Array">Attributes for conditions</param>
                /// <param name="values" type="Array">Values of the attributes for conditions</param>
                /// <param name="columnSet" type="ColumnSet">Columns of the entity for retrieve</param>
                /// <param name="topCount" type="Integer">Count for retrieve</param>
                this.entityName = entityName;
                this.attributes = attributes;
                this.values = values;
                this.columns = columnSet || new self.ColumnSet(false);
                this.distinct = false;
                this.noLock = false;
                this.orders = [];
                this.topCount = topCount || null;
                this.pageInfo = self.PageInfo.Default();
            };

        queryByAttribute.prototype.AddOrder = function(order) {
            /// <summary>Add order expression to current query</summary>
            /// <param name="order" type="OrderExpression">Order</param>
            order && order instanceof self.OrderExpression && (this.orders[this.orders.length] = order);
        };

        queryByAttribute.prototype.AddOrders = function(/* order list */) {
            if (arguments && arguments.length) {
                var counter = this.orders.length;
                for (var i = 0, l = arguments.length; i < l; i++) {
                    var order = arguments[i];
                    order && order instanceof self.OrderExpression && (this.orders[counter++] = order);
                }
            }
        };

        queryByAttribute.prototype.Distinct = function(/* value */) {
            if (arguments && arguments.length === 1) {
                this.distinct = !!arguments[0];
            }

            return this.distinct;
        };

        queryByAttribute.prototype.NoLock = function(/* value */) {
            if (arguments && arguments.length === 1) {
                this.noLock = !!arguments[0];
            }

            return this.noLock;
        };

        queryByAttribute.prototype.PageInfo = function(/* value */) {
            if (arguments && arguments.length === 1 && arguments[0] instanceof self.PageInfo) {
                this.pageInfo = arguments[0];
            }

            return this.pageInfo;
        };

        queryByAttribute.prototype.serialize = function() {
            /// <summary>Gets soap xml for query</summary>
            // ToDo: improve result creation
            var result = emptyString;
            if (this.attributes.length) {
                result += attributesTemplate({
                    attributes: _.map(this.attributes, function(attr) {
                        return attributeTemplate({ value: attr });
                    })
                });
            }

            result += this.columns.serialize();
            result += entityNameTemplate({ name: this.entityName });

            if (this.orders && this.orders.length) {
                result += ordersTemplate({
                    orders: _.map(this.orders, function(order) {
                        return order.serialize();
                    })
                });
            }

            result += this.pageInfo.serialize();

            if (this.attributes.length) {
                result += valuesTemplate({
                    values: _.map(this.values, function(value) {
                        var typed = value.hasOwnProperty("type");
                        return valueTemplate({
                            type: typed ? value.type : "string",
                            value: value.hasOwnProperty("value") ? value.value : value
                        });
                    })
                });
            }

            result += distinctTemplate({ distinct: this.distinct });
            result += noLockTemplate({ noLock: this.noLock });
            result += topCountTemplate({ topCount: this.topCount });

            return queryTemplate({ query: result });
        };

        return queryByAttribute;
    })();

    this.QueryExpression = (function() {
        var queryTemplate = compile("<query i:type='a:QueryExpression' xmlns:a='" + contractsXrmNs + "'><%= query %></query>"),
            criteriaTemplate = compile("<a:Criteria><%= conditions %><a:FilterOperator><%= filterOperator %></a:FilterOperator><a:Filters></a:Filters></a:Criteria>"),
            conditionsTemplate = compile("<a:Conditions><% _.each(conditions, function(condition) { %><%= condition.serialize() %><% }) %></a:Conditions>"),
            linkEntitiesTemplate = compile("<a:LinkEntities><% _.each(linkEntities, function(entity) { %><%= entity.serialize() %><% }) %></a:LinkEntities>"),
            ordersTemplate = compile("<a:Orders><% _.each(orders, function(order) { %><%= order.serialize() %><% }) %></a:Orders>"),
            topCountTemplate = compile("<a:TopCount <% if (topCount === null) { %> i:nil='true'<% } %>><%= topCount %></a:TopCount>"),

            queryExpression = function(entityName, conditions, columnSet) {
                /// <summary>QueryByAttribute like in Microsoft.Xrm.Sdk</summary>
                /// <param name="entityName" type="String">Logical name of entity for retrieve</param>
                /// <param name="conditions" type="Array of ConditionExpression">Condition expressions</param>
                /// <param name="columnSet" type="Array of ColumnSet">Attributes of the entity for retrieve</param>
                this.entityName = entityName;
                this.conditions = conditions;
                this.filterOperator = self.FilterOperator.And;
                this.columnSet = columnSet || new self.ColumnSet(false);
                this.distinct = false;
                this.noLock = false;
                this.orders = [];
                this.linkEntities = [];
                this.pageInfo = self.PageInfo.Default();
                this.topCount = null;
            };

        queryExpression.prototype.AddOrder = function(order) {
            /// <summary>Add order expression to current query</summary>
            /// <param name="order" type="OrderExpression">Order</param>
            order && order instanceof self.OrderExpression && (this.orders[this.orders.length] = order);
        };

        queryExpression.prototype.AddOrders = function(/* order list */) {
            if (arguments && arguments.length) {
                var counter = this.orders.length;
                for (var i = 0, l = arguments.length; i < l; i++) {
                    var order = arguments[i];
                    order && order instanceof self.OrderExpression && (this.orders[counter++] = order);
                }
            }
        };

        queryExpression.prototype.SetFilterOperator = function(filterOperator) {
            /// <summary>Set filter operator to current query</summary>
            /// <param name="order" type="OrderExpression">Filter operator</param>
            filterOperator && (this.filterOperator = filterOperator);
        };

        queryExpression.prototype.AddLink = function(linkEntity) {
            /// <summary>Add linked entity to current query</summary>
            /// <param name="linkEntity" type="LinkEntity">LinkEntity</param>
            linkEntity && linkEntity instanceof self.LinkEntity && (this.linkEntities[this.linkEntities.length] = linkEntity);
        };

        queryExpression.prototype.AddLinks = function(/* linkEntity list */) {
            if (arguments && arguments.length) {
                var counter = this.linkEntities.length;
                for (var i = 0, l = arguments.length; i < l; i++) {
                    var linkEntity = arguments[i];
                    linkEntity && linkEntity instanceof self.LinkEntity && (this.linkEntities[counter++] = linkEntity);
                }
            }
        };

        queryExpression.prototype.Distinct = function(/* value */) {
            if (arguments && arguments.length === 1) {
                this.distinct = !!arguments[0];
            }

            return this.distinct;
        };

        queryExpression.prototype.NoLock = function(/* value */) {
            if (arguments && arguments.length === 1) {
                this.noLock = !!arguments[0];
            }

            return this.noLock;
        };

        queryExpression.prototype.PageInfo = function(/* value */) {
            if (arguments && arguments.length === 1 && arguments[0] instanceof self.PageInfo) {
                this.pageInfo = arguments[0];
            }

            return this.pageInfo;
        };

        queryExpression.prototype.TopCount = function(/* value */) {
            if (arguments && arguments.length === 1 && typeof arguments[0] === "number") {
                this.topCount = parseInt(arguments[0], 10);
            }

            return this.topCount;
        };

        queryExpression.prototype.serialize = function() {
            /// <summary>Gets soap xml for query</summary>
            // ToDo: improve result accumulation
            var result = this.columnSet ? this.columnSet.serialize() : self.ColumnSet.GetAllColumnsSoap();

            result += criteriaTemplate({
                conditions: this.conditions && this.conditions.length ? conditionsTemplate({ conditions: this.conditions }) : "<a:Conditions/>",
                filterOperator: this.filterOperator
            });

            result += distinctTemplate({ distinct: this.distinct });
            result += entityNameTemplate({ name: this.entityName });

            if (this.orders && this.orders.length) {
                result += ordersTemplate({ orders: this.orders });
            }

            if (this.linkEntities && this.linkEntities.length) {
                result += linkEntitiesTemplate({ linkEntities: this.linkEntities });
            } else {
                result += "<a:LinkEntities/>";
            }

            result += this.pageInfo.serialize();
            result += noLockTemplate({ noLock: this.noLock });
            result += topCountTemplate({ topCount: this.topCount });

            return queryTemplate({ query: result });
        };

        return queryExpression;
    })();

    this.Entity = (function() {
        var entity = function(logicalName, id) {
            /// <summary>Universal class for creating, updating and deleting any entity</summary>
            /// <param name="logicalName" type="String">Logical name of entity. Example: av_sms</param>
            this.attributes = {};
            this.logicalName = logicalName;
            this.id = id && id.type === "guid" ? id : new self.Guid(!id ? self.Guid.Empty() : id);
        };

        entity.prototype = {
            getAttribute: function(name) {
                /// <summary>Get entity attribute by name</summary>
                return this.attributes[name] || null;
            },

            getAttributeValue: function(name) {
                var attr = this.getAttribute(name);
                if (attr) {
                    return attr.hasOwnProperty("value") ? attr.value : attr;
                }

                return null;
            },

            setAttribute: function(name, attribute) {
                /// <summary>Set entity attribute</summary>
                name && (this.attributes[name] = attribute);
            },

            getName: function() {
                for (var i = publishersPrefixes.length; i--;) {
                    var name = this.getAttributeValue(publishersPrefixes[i] + "name");
                    if (name) {
                        return name;
                    }
                }

                return emptyString;
            },

            LogicalName: function() {
                return this.logicalName;
            },

            getIdValue: function() {
                return this.id.value;
            },

            Id: function(id) {
                if (id) {
                    this.id = id.type === "guid" ? id : new self.Guid(id);
                }

                return this.id;
            },

            ToEntityReference: function() {
                return new self.EntityReference(
                    this.LogicalName(),
                    this.Id(),
                    this.getName());
            },

            toLookupValue: function() {
                return [
                    {
                        id: this.getIdValue(),
                        name: this.getName(),
                        entityType: this.LogicalName()
                    }
                ];
            },

            clone: function() {
                var clone = new self.Entity(this.logicalName),
                    attributes = this.attributes;

                for (var name in attributes) {
                    if (hasOwnProp.call(attributes, name)) {
                        clone.setAttribute(name, attributes[name]);
                    }
                }

                if (this.logicalName + "id" in clone.attributes) {
                    delete clone.attributes[this.logicalName + "id"];
                }

                return clone;
            },

            serialize: function() {
                var xml = ["<entity xmlns:a='" + contractsXrmNs + "'>"],
                    counter = 1;

                xml[counter++] = "<a:Attributes xmlns:b='" + genericNs + "'>";

                // ReSharper disable once MissingHasOwnPropertyInForeach
                for (var attributeName in this.attributes) {
                    var attribute = this.attributes[attributeName];
                    xml[counter++] = "<a:KeyValuePairOfstringanyType>";
                    xml[counter++] = "<b:key>" + attributeName + "</b:key>";
                    if (attribute === null || attribute.value === null) {
                        xml[counter++] = "<b:value i:nil='true'/>";
                    } else {
                        var sType = !attribute.type ? typeof attribute : crmXmlEncode(attribute.type),
                            value,
                            encodedValue,
                            id,
                            encodedId,
                            logicalName,
                            encodedLogicalName;

                        value = attribute.hasOwnProperty("value") ? attribute.value : attribute;
                        encodedValue = encodeValue(value);
                        switch (sType) {
                        case "OptionSetValue":
                            xml[counter++] = "<b:value i:type='a:OptionSetValue'>";
                            xml[counter++] = "<a:Value>" + encodedValue + "</a:Value>" + "</b:value>";
                            break;
                        case "EntityCollection":
                            xml[counter++] = "<b:value i:type='a:EntityCollection'>";
                            xml[counter++] = "<a:Entities>";
                            var collections = $.isArray(value) ? value : [value];
                            for (var i = 0, l = collections.length; i < l; i++) {
                                var item = collections[i];
                                id = item.hasOwnProperty("id") ? item.id : item;
                                encodedId = encodeValue(id);
                                logicalName = item.hasOwnProperty("logicalName") ? item.logicalName : item;
                                encodedLogicalName = encodeValue(logicalName);
                                xml[counter++] = "<a:Entity>";
                                xml[counter++] = "<a:Attributes>";
                                xml[counter++] = "<a:KeyValuePairOfstringanyType>";
                                xml[counter++] = "<b:key>partyid</b:key>";
                                xml[counter++] = "<b:value i:type='a:EntityReference'>";
                                xml[counter++] = "<a:Id>" + encodedId + "</a:Id>";
                                xml[counter++] = "<a:LogicalName>" + encodedLogicalName + "</a:LogicalName>";
                                xml[counter++] = "<a:Name i:nil='true'/>";
                                xml[counter++] = "</b:value>";
                                xml[counter++] = "</a:KeyValuePairOfstringanyType>";
                                xml[counter++] = "</a:Attributes>";
                                xml[counter++] = "<a:EntityState i:nil='true'/>";
                                xml[counter++] = "<a:FormattedValues />";
                                xml[counter++] = "<a:Id>" + self.Guid.Empty().value + "</a:Id>";
                                xml[counter++] = "<a:LogicalName>activityparty</a:LogicalName>";
                                xml[counter++] = "<a:RelatedEntities />";
                                xml[counter++] = "</a:Entity>";
                            }

                            xml[counter++] = "</a:Entities>";
                            xml[counter++] = "<a:EntityName i:nil='true'/>";
                            xml[counter++] = "<a:MinActiveRowVersion i:nil='true'/>";
                            xml[counter++] = "<a:MoreRecords>false</a:MoreRecords>";
                            xml[counter++] = "<a:PagingCookie i:nil='true'/>";
                            xml[counter++] = "<a:TotalRecordCount>0</a:TotalRecordCount>";
                            xml[counter++] = "<a:TotalRecordCountLimitExceeded>false</a:TotalRecordCountLimitExceeded>";
                            xml[counter++] = "</b:value>";
                            break;
                        case "EntityReference":
                            id = attribute.hasOwnProperty("id") ? attribute.id : attribute;
                            encodedId = encodeValue(id);
                            logicalName = attribute.hasOwnProperty("logicalName") ? attribute.logicalName : attribute;
                            encodedLogicalName = encodeValue(logicalName);
                            xml[counter++] = "<b:value i:type='a:EntityReference'>";
                            xml[counter++] = "<a:Id>" + encodedId + "</a:Id>";
                            xml[counter++] = "<a:LogicalName>" + encodedLogicalName + "</a:LogicalName>";
                            xml[counter++] = "<a:Name i:nil='true'/>" + "</b:value>";
                            break;
                        case "Money":
                            xml[counter++] = "<b:value i:type='a:Money'>";
                            xml[counter++] = "<a:Value>" + encodedValue + "</a:Value>" + "</b:value>";
                            break;
                        case "guid":
                            xml[counter++] = "<b:value i:type='c:guid' xmlns:c='" + serializationNs + "'>";
                            xml[counter++] = encodedValue + "</b:value>";
                            break;
                        case "decimal":
                            xml[counter++] = "<b:value i:type='c:decimal' xmlns:c='" + xmlSchemaNs + "'>";
                            xml[counter++] = encodedValue + "</b:value>";
                            break;
                        case "number":
                            /* jshint eqeqeq: false */
                            var oType = parseInt(encodedValue, 10) == encodedValue ? "int" : "double";
                            xml[counter++] = "<b:value i:type='c:" + oType + "' xmlns:c='" + xmlSchemaNs + "'>";
                            xml[counter++] = encodedValue + "</b:value>";
                            break;
                        default:
                            sType = typeof value === "object" && value.getTime ? "dateTime" : sType;
                            xml[counter++] = "<b:value i:type='c:" + sType + "' xmlns:c='" + xmlSchemaNs + "'>" + encodedValue + "</b:value>";
                            break;
                        }
                    }

                    xml[counter++] = "</a:KeyValuePairOfstringanyType>";
                }

                xml[counter++] = "</a:Attributes>";
                xml[counter++] = "<a:EntityState i:nil='true'/>";
                xml[counter++] = "<a:FormattedValues xmlns:b='" + genericNs + "'/>";
                xml[counter++] = "<a:Id>" + encodeValue(this.id) + "</a:Id>";
                xml[counter++] = "<a:LogicalName>" + this.logicalName + "</a:LogicalName>";
                xml[counter++] = "<a:RelatedEntities xmlns:b='" + genericNs + "'/>";
                xml[counter++] = "</entity>";

                return xml.join(emptyString);
            }
        };

        entity.deserialize = function(resultNode) {
            var obj = {},
                resultNodes = resultNode.childNodes,
                instance = new self.Entity();

            for (var j = 0, rl = resultNodes.length; j < rl; j++) {
                var k,
                    l,
                    al,
                    cnl,
                    attr,
                    sKey;

                switch (resultNodes[j].nodeName) {
                    case "a:Attributes":
                        attr = resultNodes[j];
                        for (k = 0, cnl = attr.childNodes.length; k < cnl; k++) {
                            sKey = $(attr.childNodes[k].firstChild).text();
                            var sType = emptyString,
                                attributes = attr.childNodes[k].childNodes[1].attributes;

                            for (l = 0, al = attributes.length; l < al; l++) {
                                if (attributes[l].nodeName === "i:type") {
                                    sType = ($(attributes[l]).val() || emptyString).replace("c:", emptyString)
                                        .replace("a:", emptyString);
                                    break;
                                }
                            }

                            var entRef,
                                nodes,
                                entCv;

                            switch (sType) {
                                case "OptionSetValue":
                                    obj[sKey] = new self.OptionSetValue(parseInt($(attr.childNodes[k].childNodes[1]).text()));
                                    break;
                                case "EntityReference":
                                    nodes = attr.childNodes[k].childNodes[1].childNodes;
                                    obj[sKey] = new self.EntityReference($(nodes[1]).text(), $(nodes[0]).text(), $(nodes[2]).text());
                                    break;
                                case "EntityCollection":
                                    var items = [],
                                        childNodes = attr.childNodes[k].childNodes[1].childNodes[0].childNodes;

                                    for (var y = 0; y < childNodes.length; y++) {
                                        var itemNodes = childNodes[y].childNodes[0].childNodes;
                                        for (var z = 0; z < itemNodes.length; z++) {
                                            if ($(itemNodes[z].childNodes[0]).text() !== "partyid") {
                                                continue;
                                            }

                                            nodes = itemNodes[z].childNodes[1].childNodes;
                                            var itemRef = new self
                                                .EntityReference($(nodes[1]).text(), $(nodes[0]).text(), $(nodes[2]).text());
                                            items[y] = itemRef;
                                        }
                                    }

                                    entRef = new self.EntityCollection(items);
                                    obj[sKey] = entRef;
                                    break;
                                case "Money":
                                    obj[sKey] = new self.Money(parseFloat($(attr.childNodes[k].childNodes[1]).text()));
                                    break;
                                case "guid":
                                    obj[sKey] = new self.Guid($(attr.childNodes[k].childNodes[1]).text());
                                    break;
                                default:
                                    entCv = new self.XrmValue();
                                    entCv.type = sType;
                                    if (entCv.type === "int") {
                                        entCv.value = parseInt($(attr.childNodes[k].childNodes[1]).text());
                                    } else if (entCv.type === "decimal" || entCv.type === "double") {
                                        entCv.value = parseFloat($(attr.childNodes[k].childNodes[1]).text());
                                    } else if (entCv.type === "dateTime") {
                                        entCv.value = stringToDate($(attr.childNodes[k].childNodes[1]).text());
                                    } else if (entCv.type === "boolean") {
                                        entCv.value = ($(attr.childNodes[k].childNodes[1]).text() === "false") ? false : true;
                                    } else if (entCv.type === "AliasedValue") {
                                        var $attr = $(attr).children().eq(k).children().eq(1).children().eq(2),
                                            aliasedType = $attr.attr("i:type");

                                        if (aliasedType === "a:EntityReference") {
                                            var aliasedRef = $attr.children();
                                            entCv = new self
                                                .EntityReference(aliasedRef.eq(1).text(),
                                                    aliasedRef.eq(0).text(),
                                                    aliasedRef.eq(2).text());
                                        } else if (aliasedType === "c:boolean") {
                                            entCv.value = $attr.text() === trueString;
                                        } else {
                                            entCv.value = $attr.text();
                                        }
                                    } else {
                                        entCv.value = $(attr.childNodes[k].childNodes[1]).text();
                                    }

                                    obj[sKey] = entCv;
                                    break;
                            }
                        }

                        instance.attributes = obj;
                        break;
                    case "a:Id":
                        this.id = new self.Guid($(resultNodes[j]).text());
                        break;
                    case "a:LogicalName":
                        this.logicalName = $(resultNodes[j]).text();
                        break;
                    case "a:FormattedValues":
                        var foVal = resultNodes[j];
                        for (k = 0, l = foVal.childNodes.length; k < l; k++) {
                            var childNode = foVal.childNodes[k];
                            sKey = $(childNode.firstChild).text();
                            instance.attributes[sKey].formattedValue = $(childNode.childNodes[1]).text();
                            if (isNaN(instance.attributes[sKey].value) && instance.attributes[sKey].type === "dateTime") {
                                instance.attributes[sKey].value = new Date(instance.attributes[sKey].formattedValue);
                            }
                        }

                        break;
                }
            }

            return instance;
        };

        return entity;
    })();

    this.OptionSetValue = (function() {
        var optionSetValue = function(value, name) {
                /// <summary>Like OptionSetValue in Microsoft.Xrm.Sdk</summary>
                /// <param name="value" type="Number">Value of option</param>
                /// <param name="name" type="String">Name of option</param>
                if (typeof value !== "number") {
                    throw "value must be a number";
                }

                var nameIsExist = typeof name !== "undefined";
                if (nameIsExist && typeof name !== "string") {
                    throw "name must be a string";
                }

                this.value = value;
                this.name = nameIsExist ? name : emptyString;
                this.type = "OptionSetValue";
            };

        optionSetValue.prototype.getValue = function() {
            /// <returns type="Number">value</returns>
            return this.value;
        };

        optionSetValue.prototype.getName = function() {
            /// <returns type="String">name</returns>
            return this.name;
        };

        return optionSetValue;
    })();

    this.Money = (function() {
        var money = function(value) {
                this.value = value;
                this.type = "Money";
            };

        return money;
    })();

    this.Decimal = (function() {
        var decimal = function(value) {
                this.value = value;
                this.type = "decimal";
            };

        return decimal;
    })();

    this.Guid = (function() {
        var regex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
            empty = "00000000-0000-0000-0000-000000000000",
            guid = function(value) {
                if (typeof value === "object" &&
                    ((value instanceof self.Guid) ||
                    (value instanceof self.XrmValue && value.type === "guid"))) {
                    this.value = removeBraces(value.value);
                    this.type = value.type;
                } else {
                    value = removeBraces(value);
                    if (!regex.test(value)) {
                        throw new TypeError("value must be a valid Guid");
                    }

                    this.value = removeBraces(value);
                    this.type = "guid";
                }
            };

        guid.prototype.Equals = function(other) {
            if (!other) {
                return false;
            }

            if (typeof other === "object" &&
                ((other instanceof self.Guid) ||
                 (other instanceof self.XrmValue && other.type === "guid"))) {
                return this.value === removeBraces(other.value);
            } else if (typeof other === "string") {
                return this.value === removeBraces(other);
            }

            return false;
        };

        guid.prototype.NotEquals = function(other) {
            return !this.Equals(other);
        };

        guid.Parse = function(value) {
            return new self.Guid(value);
        };

        guid.TryParse = function(value) {
            try {
                return new self.Guid(value);
            } catch (ex) {
                return null;
            }
        };

        guid.Empty = function() {
            return new self.Guid(empty);
        };

        return guid;
    })();

    this.EntityCollection = (function() {
        var entityCollection = function(value) {
                this.value = value;
                this.type = "EntityCollection";
            };

        return entityCollection;
    })();

    this.EntityReference = (function() {
        var entityReference = function(logicalName, id, name) {
                /// <summary>Like EntityReference in Microsoft.Xrm.Sdk</summary>
                /// <param name="logicalName" type="String">Entity logical name</param>
                /// <param name="id" type="Guid">Entity Id</param>
                /// <param name="name" type="String">Entity name</param>
                this.id = id ? new self.Guid(id) : self.Guid.Empty();
                this.logicalName = logicalName || emptyString;
                this.name = name || emptyString;
                this.type = "EntityReference";
            };

        entityReference.prototype.getId = function() {
            /// <returns type="Guid">id</returns>
            return this.id;
        };

        entityReference.prototype.getIdValue = function() {
            /// <returns type="String">Guid value</returns>
            return this.id.value;
        };

        entityReference.prototype.getLogicalName = function() {
            /// <returns type="String">Logical name</returns>
            return this.logicalName;
        };

        entityReference.prototype.getName = function() {
            /// <returns type="String">name</returns>
            return this.name;
        };

        entityReference.prototype.toLookupValue = function() {
            return [{
                id: this.getIdValue(),
                name: this.getName(),
                entityType: this.getLogicalName()
            }];
        };

        entityReference.prototype.Equals = function(other) {
            if (!other) {
                return false;
            }

            if (typeof other === "object" && other instanceof self.EntityReference) {
                return this.id.Equals(other.id);
            }

            return false;
        };

        return entityReference;
    })();

    this.StateCode = (function() {
        var stateCode = function(value) {
            this.value = value;
            this.type = "int";
        };

        return stateCode;
    })();

    this.StatusCode = (function() {
        var statusCode = function(value) {
            this.value = value;
            this.type = "int";
        };

        return statusCode;
    })();

    this.XrmValue = (function() {
        var xrmValue = function(value, type) {
                this.value = value;
                this.type = type;
            };

        return xrmValue;
    })();

    this.EntityFilters = (function() {
        return {
            Default: "Default",
            Entity: "Entity",
            Attributes: "Attributes",
            Privileges: "Privileges",
            Relationships: "Relationships",
            All: [
                "Relationships",
                "Privileges",
                "Attributes",
                "Entity"
            ]
        };
    })();

    this.OrganizationRequest = (function() {
        /// <summary>Abstarct base class for all requests</summary>
        var organizationRequest = function() {
                this.RequestName = arguments[0] || emptyString;
                this.Parameters = arguments[1];
                this.RequestId = self.Guid.Empty();
            };

        organizationRequest.prototype.serialize = function() {
            return this.template(this.Parameters);
        };

        return organizationRequest;
    })();

    this.RetrieveAllEntitiesRequest = (function(base) {
        var template = compile([
                "<request i:type='a:RetrieveAllEntitiesRequest' xmlns:a='" + contractsXrmNs + "'>",
                  "<a:Parameters xmlns:b='" + genericNs + "'>",
                    "<a:KeyValuePairOfstringanyType>",
                      "<b:key>EntityFilters</b:key>",
                      "<b:value i:type='c:EntityFilters' xmlns:c='" + metadataNs + "'>",
                        "<%= entityFilters%>",
                      "</b:value>",
                    "</a:KeyValuePairOfstringanyType>",
                    "<a:KeyValuePairOfstringanyType>",
                      "<b:key>RetrieveAsIfPublished</b:key>",
                      "<b:value i:type='c:boolean' xmlns:c='" + xmlSchemaNs + "'>",
                        "<%= retrieveAsIfPublished %>",
                      "</b:value>",
                    "</a:KeyValuePairOfstringanyType>",
                  "</a:Parameters>",
                  "<a:RequestId i:nil='true'/>",
                  "<a:RequestName>RetrieveAllEntities</a:RequestName>",
                "</request>"
            ].join(emptyString)),
            request = function(entityFilters, retrieveAsIfPublished) {
                this.entityFilters = entityFilters;
                this.retrieveAsIfPublished = !!retrieveAsIfPublished;
                this.template = template;
                request.base.constructor.call(
                    this,
                    "RetrieveAllEntitiesRequest",
                    {
                        entityFilters: this.entityFilters,
                        retrieveAsIfPublished: this.retrieveAsIfPublished
                    });
            };

        request.prototype.serialize = function() {
            return this.base.prototype.serialize.apply(this);
        };

        extend(request, base);

        return request;
    })(self.OrganizationRequest);

    this.RetrieveEntityRequest = (function(base) {
        var template = compile([
                "<request i:type='a:RetrieveEntityRequest' xmlns:a='" + contractsXrmNs + "'>",
                  "<a:Parameters xmlns:b='" + genericNs + "'>",
                    "<a:KeyValuePairOfstringanyType>",
                      "<b:key>EntityFilters</b:key>",
                      "<b:value i:type='c:EntityFilters' xmlns:c='" + metadataNs + "'>",
                        "<%= entityFilters %>",
                      "</b:value>",
                    "</a:KeyValuePairOfstringanyType>",
                    "<a:KeyValuePairOfstringanyType>",
                      "<b:key>MetadataId</b:key>",
                      "<b:value i:type='c:guid' xmlns:c='" + serializationNs + "'>",
                        self.Guid.Empty().value,
                      "</b:value>",
                    "</a:KeyValuePairOfstringanyType>",
                    "<a:KeyValuePairOfstringanyType>",
                      "<b:key>RetrieveAsIfPublished</b:key>",
                      "<b:value i:type='c:boolean' xmlns:c='" + xmlSchemaNs + "'>",
                        "<%= retrieveAsIfPublished %>",
                      "</b:value>",
                    "</a:KeyValuePairOfstringanyType>",
                    "<a:KeyValuePairOfstringanyType>",
                      "<b:key>LogicalName</b:key>",
                      "<b:value i:type='c:string' xmlns:c='" + xmlSchemaNs + "'>",
                        "<%= logicalName %>",
                      "</b:value>",
                    "</a:KeyValuePairOfstringanyType>",
                  "</a:Parameters>",
                  "<a:RequestId i:nil='true'/>",
                  "<a:RequestName>RetrieveEntity</a:RequestName>",
                "</request>"
            ].join(emptyString)),
            request = function(logicalName, entityFilters, retrieveAsIfPublished) {
                this.logicalName = logicalName;
                this.entityFilters = entityFilters;
                this.retrieveAsIfPublished = !!retrieveAsIfPublished;
                this.template = template;
                request.base.constructor.call(
                    this,
                    "RetrieveEntityRequest",
                    {
                        logicalName: this.logicalName,
                        entityFilters: this.entityFilters,
                        retrieveAsIfPublished: this.retrieveAsIfPublished
                    });
            };

        request.prototype.serialize = function() {
            return this.base.prototype.serialize.apply(this);
        };

        extend(request, base);

        return request;
    })(self.OrganizationRequest);

    this.RetrieveAttributeRequest = (function(base) {
        var template = compile([
                "<request i:type='a:RetrieveAttributeRequest' xmlns:a='" + contractsXrmNs + "'>",
                  "<a:Parameters xmlns:b='" + genericNs + "'>",
                    "<a:KeyValuePairOfstringanyType>",
                      "<b:key>EntityLogicalName</b:key>",
                      "<b:value i:type='c:string' xmlns:c='" + xmlSchemaNs + "'>",
                        "<%= entityLogicalName %>",
                      "</b:value>",
                    "</a:KeyValuePairOfstringanyType>",
                    "<a:KeyValuePairOfstringanyType>",
                      "<b:key>MetadataId</b:key>",
                      "<b:value i:type='ser:guid' xmlns:ser='" + serializationNs + "'>",
                        self.Guid.Empty().value,
                      "</b:value>",
                    "</a:KeyValuePairOfstringanyType>",
                    "<a:KeyValuePairOfstringanyType>",
                      "<b:key>RetrieveAsIfPublished</b:key>",
                      "<b:value i:type='c:boolean' xmlns:c='" + xmlSchemaNs + "'>",
                        "<%= retrieveAsIfPublished %>",
                      "</b:value>",
                    "</a:KeyValuePairOfstringanyType>",
                    "<a:KeyValuePairOfstringanyType>",
                      "<b:key>LogicalName</b:key>",
                      "<b:value i:type='c:string' xmlns:c='" + xmlSchemaNs + "'>",
                        "<%= attributeLogicalName %>",
                      "</b:value>",
                    "</a:KeyValuePairOfstringanyType>",
                  "</a:Parameters>",
                  "<a:RequestId i:nil='true' />",
                  "<a:RequestName>RetrieveAttribute</a:RequestName>",
                "</request>"
            ].join(emptyString)),
            request = function(entityLogicalName, attributeLogicalName, retrieveAsIfPublished) {
                this.entityLogicalName = entityLogicalName;
                this.attributeLogicalName = attributeLogicalName;
                this.retrieveAsIfPublished = !!retrieveAsIfPublished;
                this.template = template;
                request.base.constructor.call(
                    this,
                    "RetrieveAttributeRequest",
                    {
                        entityLogicalName: this.entityLogicalName,
                        attributeLogicalName: this.attributeLogicalName,
                        retrieveAsIfPublished: this.retrieveAsIfPublished
                    });
            };

        request.prototype.serialize = function() {
            return this.base.prototype.serialize.apply(this);
        };

        extend(request, base);

        return request;
    })(self.OrganizationRequest);

    this.SetStateRequest = (function(base) {
        var template = compile([
                "<request i:type='b:SetStateRequest'" + " xmlns:a='" + contractsXrmNs + "'" + " xmlns:b='" + contractsCrmNs + "'>",
                  "<a:Parameters xmlns:c='" + genericNs + "'>",
                    "<a:KeyValuePairOfstringanyType>",
                      "<c:key>EntityMoniker</c:key>",
                      "<c:value i:type='a:EntityReference'>",
                        "<a:Id>",
                          "<%= entityId %>",
                        "</a:Id>",
                        "<a:LogicalName>",
                          "<%= entityName %>",
                        "</a:LogicalName>",
                        "<a:Name i:nil='true'/>",
                      "</c:value>",
                    "</a:KeyValuePairOfstringanyType>",
                    "<a:KeyValuePairOfstringanyType>",
                      "<c:key>State</c:key>",
                      "<c:value i:type='a:OptionSetValue'>",
                        "<a:Value>",
                          "<%= state %>",
                        "</a:Value>",
                      "</c:value>",
                    "</a:KeyValuePairOfstringanyType>",
                    "<a:KeyValuePairOfstringanyType>",
                      "<c:key>Status</c:key>",
                      "<c:value i:type='a:OptionSetValue'>",
                        "<a:Value>",
                          "<%= status %>",
                        "</a:Value>",
                      "</c:value>",
                    "</a:KeyValuePairOfstringanyType>",
                  "</a:Parameters>",
                  "<a:RequestId i:nil='true' />",
                  "<a:RequestName>SetState</a:RequestName>",
                "</request>"
            ].join(emptyString)),
            request = function(entityName, entityId, state, status) {
                this.entityName = entityName;
                this.entityId = new self.Guid(entityId);
                this.state = state;
                this.status = status;
                this.template = template;
                request.base.constructor.call(
                    this,
                    "SetStateRequest",
                    {
                        entityName: this.entityName,
                        entityId: this.entityId.value,
                        state: this.state,
                        status: this.status
                    });
            };

        request.prototype.serialize = function() {
            return this.base.prototype.serialize.apply(this);
        };

        extend(request, base);

        return request;
    })(self.OrganizationRequest);

    this.ExecuteWorkflowRequest = (function(base) {
        var template = compile([
                "<request i:type='b:ExecuteWorkflowRequest'" + " xmlns:a='" + contractsXrmNs + "'" + " xmlns:b='" + contractsCrmNs + "'>",
                  "<a:Parameters xmlns:c='" + genericNs + "'>",
                    "<a:KeyValuePairOfstringanyType>",
                      "<c:key>EntityId</c:key>",
                      "<c:value i:type='d:guid' xmlns:d='" + serializationNs + "'>",
                        "<%= entityId %>",
                      "</c:value>",
                    "</a:KeyValuePairOfstringanyType>",
                    "<a:KeyValuePairOfstringanyType>",
                      "<c:key>WorkflowId</c:key>",
                      "<c:value i:type='d:guid' xmlns:d='" + serializationNs + "'>",
                        "<%= workflowId %>",
                      "</c:value>",
                    "</a:KeyValuePairOfstringanyType>",
                  "</a:Parameters>",
                  "<a:RequestId i:nil='true'/>",
                  "<a:RequestName>ExecuteWorkflow</a:RequestName>",
                "</request>"
            ].join(emptyString)),
            request = function(entityId, workflowId) {
                this.entityId = new self.Guid(entityId);
                this.workflowId = new self.Guid(workflowId);
                this.template = template;
                request.base.constructor.call(
                    this,
                    "ExecuteWorkflowRequest",
                    {
                        entityId: this.entityId.value,
                        workflowId: this.workflowId.value
                    });
            };

        request.prototype.serialize = function() {
            return this.base.prototype.serialize.apply(this);
        };

        extend(request, base);

        return request;
    })(self.OrganizationRequest);

    this.RetrieveSharedPrincipalsAndAccessRequest = (function(base) {
        var template = compile([
                "<request i:type='b:RetrieveSharedPrincipalsAndAccessRequest'" + " xmlns:a='" + contractsXrmNs + "'" + " xmlns:i='" + xmlSchemaInstanceNs + "'" + " xmlns:b='" + contractsCrmNs + "'>",
                  "<a:Parameters xmlns:c='" + genericNs + "'>",
                    "<a:KeyValuePairOfstringanyType>",
                      "<c:key>Target</c:key>",
                      "<c:value i:type='a:EntityReference'>",
                        "<a:Id><%= entityId %></a:Id>",
                        "<a:LogicalName><%= entityName %></a:LogicalName>",
                        "<a:Name i:nil='true'/>",
                      "</c:value>",
                    "</a:KeyValuePairOfstringanyType>",
                  "</a:Parameters>",
                  "<a:RequestId i:nil='true'/>",
                  "<a:RequestName>RetrieveSharedPrincipalsAndAccess</a:RequestName>",
                "</request>"
            ].join(emptyString)),
            request = function(entityName, entityId) {
                /// <summary>RetrieveSharedPrincipalsAndAccessRequest like in Microsoft.Xrm.Sdk</summary>
                this.entityName = entityName;
                this.entityId = entityId;
                this.template = template;
                request.base.constructor.call(
                    this,
                    "RetrieveSharedPrincipalsAndAccessRequest",
                    {
                        entityName: this.entityName,
                        entityId: this.entityId.value
                    });
            };

        request.prototype.serialize = function() {
            return this.base.prototype.serialize.apply(this);
        };

        extend(request, base);

        return request;
    })(self.OrganizationRequest);

    this.OrganizationService = (function() {
        /// <summary>Like IOrganizationService in Microsoft.Xrm.Sdk</summary>
        var url = splittedUrl[0] + "//" + splittedUrl[1],
            serviceUrl = url + (splittedUrl.length === 3 && splittedUrl[2] === orgName ? (`/${orgName}`) : emptyString) + xrmServiceUrl,
            soapTemplate = compile([
                utf8Root,
                "<soap:Envelope xmlns:soap='http://schemas.xmlsoap.org/soap/envelope/'>",
                    "<soap:Body>",
                        "<<%= soapAction %> xmlns='" + contractsXrmNs + "/Services' xmlns:i='" + xmlSchemaInstanceNs + "'>",
                            "<%= soapBody %>",
                        "</<%= soapAction %>>",
                    "</soap:Body>",
                "</soap:Envelope>"
            ].join(emptyString)),

            processResponse = function(response) {
                if (!response || (response.hasOwnProperty("xml") && !response.xml)) {
                    return "No response received from the server";
                }

                const $response = $(response);
                const error = $response.find("error").text();
                const faultString = $response.find("faultstring").text();

                if (!(error === emptyString && faultString === emptyString)) {
                    return error !== emptyString ? $response.find("description").text() : faultString;
                }

                const currentType = typeof response;
                const ieXmlType = typeof response.xml;

                if (currentType !== "object" && (ieXmlType === "undefined" || ieXmlType === "unknown")) {
                    return parseXml(response);
                } else if (currentType === "object") {
                    return response;
                } else {
                    return parseXml(xmlToString(response));
                }
            },

            execute = function(soapBody, soapAction, async) {
                return new Promise(function(resolve, reject) {
                    const soapXml = soapTemplate({ soapBody: soapBody, soapAction: soapAction });
                    const req = new global.XMLHttpRequest();

                    req.open("POST", serviceUrl, async || false);
                    req.setRequestHeader("Accept", "application/xml, text/xml, */*");
                    req.setRequestHeader("Content-Type", "text/xml; charset=utf-8");
                    req.setRequestHeader("SOAPAction", xrmSoapActionPrefix + soapAction);

                    req.onload = function() {
                        const parsedResponse = processResponse(req.responseXML);
                        if (req.status === 200) {
                            req.onreadystatechange = null;
                            resolve(parsedResponse);
                        } else {
                            reject(Error(parsedResponse));
                        }
                    };

                    req.onerror = function() {
                        req.onreadystatechange = null;
                        reject(Error("network error occured"));
                    };

                    req.send(soapXml);
                });
            };

        const orgService = function() {
                this.url = function() {
                    return url;
                };

                this.orgName = function() {
                    return orgName;
                };
            };

        orgService.prototype.create = function(entity, async) {
            /// <summary>Create like create in Microsoft.Xrm.Sdk</summary>
            return execute(entity.serialize(), "Create", async).then(function(resultXml) {
                return resultXml ? $(resultXml).find("CreateResult").text() : null;
            });
        };

        orgService.prototype.createAsync = function(entity) {
            /// <summary>Create like create in Microsoft.Xrm.Sdk</summary>
            return this.create(entity, true);
        };

        orgService.prototype.update = function(entity, async) {
            /// <summary>Update like update in Microsoft.Xrm.Sdk</summary>
            return execute(entity.serialize(), "Update", async).then(function(resultXml) {
                return resultXml ? $(resultXml).find("UpdateResponse").text() : null;
            });
        };

        orgService.prototype.updateAsync = function(entity) {
            /// <summary>Update like update in Microsoft.Xrm.Sdk</summary>
            return this.update(entity, true);
        };

        orgService.prototype.delete = function(entityName, id, async) {
            /// <summary>Delete like delete in Microsoft.Xrm.Sdk</summary>
            const request = `<entityName>${entityName}</entityName><id>${new self.Guid(id).value}</id>`;

            return execute(request, "Delete", async);
        };

        orgService.prototype.deleteAsync = function(entityName, id) {
            /// <summary>Delete like delete in Microsoft.Xrm.Sdk</summary>
            return this.delete(entityName, id, true);
        };

        orgService.prototype.retrieve = function(entityName, id, columnSet, async) {
            /// <summary>Retrieve like in Microsoft.Xrm.Sdk</summary>
            const soapBodyTemplate = compile("<entityName><%= entityName %></entityName><id><%= id %></id><%= columnSet %>");
            if (columnSet && $.isArray(columnSet)) {
                columnSet = new self.ColumnSet(columnSet);
                columnSet = columnSet.serialize(false, true);
            } else if (columnSet && columnSet instanceof self.ColumnSet) {
                columnSet = columnSet.serialize(false, true);
            } else {
                columnSet = self.ColumnSet.GetAllColumnsSoap(false, true);
            }

            return execute(soapBodyTemplate({
                    entityName: entityName,
                    id: new self.Guid(id).value,
                    columnSet: columnSet
                }), "Retrieve", async).then(function(resultXml) {
                const retrieveResult = $(resultXml).find("RetrieveResult")[0];
                if (!retrieveResult) {
                    return null;
                }

                return self.Entity.deserialize(retrieveResult);
            });
        };

        orgService.prototype.retrieveAsync = function(entityName, id, columnSet) {
            /// <summary>Retrieve like in Microsoft.Xrm.Sdk</summary>
            return this.retrieve(entityName, id, columnSet, true);
        };

        orgService.prototype.retrieveMultiple = function(query, async) {
            /// <summary>RetrieveMultiple like in Microsoft.Xrm.Sdk</summary>
            /// <param name="query" type="QueryExpression|QueryByAttribute">Query for perform retrieve operation</param>
            return execute(query.serialize(), "RetrieveMultiple", async).then(function(result) {
                const $resultXml = $(result);
                var resultNodes;
                const retriveMultipleResults = [];

                if ($resultXml.find("a\\:Entities").length) {
                    resultNodes = $resultXml.find("a\\:Entities")[0];
                } else {
                    resultNodes = $resultXml.find("Entities")[0]; // chrome could not load node properly
                }

                if (!resultNodes) {
                    return retriveMultipleResults; // return empty results
                }

                for (let i = 0, l = resultNodes.childNodes.length; i < l; i++) {
                    retriveMultipleResults[i] = self.Entity.deserialize(resultNodes.childNodes[i]);
                }

                return retriveMultipleResults;
            });
        };

        orgService.prototype.retrieveMultipleAsync = function(query) {
            /// <summary>RetrieveMultiple like in Microsoft.Xrm.Sdk</summary>
            /// <param name="query" type="QueryExpression|QueryByAttribute">Query for perform retrieve operation</param>
            return this.retrieveMultiple(query, true);
        };

        orgService.prototype.execute = function(request, async) {
            /// <summary>Execute like in Microsoft.Xrm.Sdk</summary>
            /// <param name="request" type="OrganizationRequest">Current request</param>
            return execute(request.serialize(), "Execute", async);
        };

        orgService.prototype.executeAsync = function(request) {
            /// <summary>Execute like in Microsoft.Xrm.Sdk</summary>
            /// <param name="request" type="OrganizationRequest">Current request</param>
            return this.execute(request, true);
        };

        orgService.prototype.fetch = function(fetchXml, async) {
            /// <summary>Execute fetch Xml query</summary>
            /// <param name="fetchXml" type="String">Fetch xml expression</param>
            // ToDo: implement fetchXmlBuilder
            const fetchQuery = [
                    `<query i:type='a:FetchExpression' xmlns:a='${contractsXrmNs}'>`,
                        "<a:Query>",
                            crmXmlEncode(fetchXml),
                        "</a:Query>",
                    "</query>"
            ].join(emptyString);

            return execute(fetchQuery, "RetrieveMultiple", async).then(function(resultXml) {
                let fetchResult;
                const fetchResults = [];
                let $entities = $(resultXml).find("a\\:Entities");

                if ($entities.length) {
                    fetchResult = $entities[0];
                } else {
                    $entities = $(resultXml).find("Entities");
                    fetchResult = $entities[0]; // chrome could not load node
                }

                for (let i = 0, l = fetchResult.childNodes.length; i < l; i++) {
                    fetchResults[fetchResults.length] = self.Entity.deserialize(fetchResult.childNodes[i]);
                }

                return fetchResults;
            });
        };

        orgService.prototype.fetchAsync = function(fetchXml) {
            /// <summary>Execute fetch Xml query</summary>
            /// <param name="fetchXml" type="String">Fetch xml expression</param>
            return this.fetch(fetchXml, true);
        };

        return orgService;
    })();

    this.CrmProvider = (function() {
        const entityMetadataType = "EntityMetadata";
        const orgService = new self.OrganizationService();
        const crmProvider = function() {};

        crmProvider.prototype.executeWorkflow = function(entityId, workflowId, async) {
            /// <summary>Execute ExecuteWorkflowRequest like in Microsoft.Xrm.Sdk</summary>
            /// <param name="entityId" type="Guid">Current entity Id</param>
            /// <param name="workflowId" type="Guid">Executing workflow Id</param>
            /// <returns type="Guid">Async operation Id</returns>
            const request = new self.ExecuteWorkflowRequest(entityId, workflowId);

            return orgService.execute(request, async).then(function(result) {
                const $xml = $(typeof result.xml === "undefined" ? result : result.xml);
                const id = $xml.find("c\\:value").text() || $xml.find("value").text();

                return id ? new self.Guid(id) : null;
            }).catch(function(err) {
                notify(err);
            });
        };

        crmProvider.prototype.executeWorkflowAsync = function(entityId, workflowId) {
            /// <summary>Execute ExecuteWorkflowRequest like in Microsoft.Xrm.Sdk</summary>
            /// <param name="entityId" type="Guid">Current entity Id</param>
            /// <param name="workflowId" type="Guid">Executing workflow Id</param>
            /// <returns type="Guid">Async operation Id</returns>
            return this.executeWorkflow(entityId, workflowId, true);
        };

        crmProvider.prototype.getSystemUserTeams = function(userId, teamColumnSet, async) {
            /// <summary>Get user teams</summary>
            /// <param name="userId" type="Guid">Current user Identifier</param>
            const query = new self.QueryExpression("team", [], teamColumnSet || new self.ColumnSet("name"));
            const linkEntity = new self.LinkEntity("team", "teammembership", "teamid", "teamid", self.JoinOperator.Inner);
            const filterExpression = new self.FilterExpression();

            filterExpression.AddCondition(new self.ConditionExpression("systemuserid", self.ConditionOperator.Equal, [new self.Guid(userId)]));
            linkEntity.SetLinkCriteria(filterExpression);
            query.AddLink(linkEntity);

            return orgService.retrieveMultiple(query, async);
        };

        crmProvider.prototype.getSystemUserTeamsAsync = function(userId, teamColumnSet) {
            /// <summary>Get user teams</summary>
            /// <param name="userId" type="Guid">Current user Identifier</param>
            return this.getSystemUserTeams(userId, teamColumnSet, true);
        };

        crmProvider.prototype.getSystemUserBusinessUnit = function(userId, async) {
            /// <summary>Get user businessunit</summary>
            /// <param name="userId" type="Guid">Current user Identifier</param>
            return orgService.retrieve("systemuser", new self.Guid(userId).value, ["businessunitid"], async).then(function(user) {
                return user.getAttributeValue("businessunitid");
            });
        };

        crmProvider.prototype.getSystemUserBusinessUnitAsync = function(userId) {
            /// <summary>Get user businessunit</summary>
            /// <param name="userId" type="Guid">Current user Identifier</param>
            return this.getSystemUserBusinessUnit(userId, true);
        };

        crmProvider.prototype.retrieveSharedPrincipalsAndAccess = function(entityName, entityId, async) {
            /// <summary>Execute RetrieveSharedPrincipalsAndAccessRequest like in Microsoft.Xrm.Sdk</summary>
            /// <param name="entityName" type="String">EntityLogicalName</param>
            /// <param name="entityId" type="Guid">Entity Id for check access</param>
            const request = new self.RetrieveSharedPrincipalsAndAccessRequest(entityName, new self.Guid(entityId));

            return orgService.execute(request, async).then(function(result) {
                const sharedAccessRights = [];
                const principalAccess = $(typeof result.xml === "undefined" ? result : result.xml).find("PrincipalAccess");
                for (let i = 0, l = principalAccess.length; i < l; i++) {
                    const parsedResult = principalAccess[i].childNodes;
                    sharedAccessRights[sharedAccessRights.length] = {
                        Rights: $(parsedResult[0]).text().split(" "),
                        Id: $(parsedResult[1].childNodes[0]).text(),
                        Principal: $(parsedResult[1].childNodes[1]).text()
                    };
                }

                return sharedAccessRights.length ? sharedAccessRights : null;
            }).catch(function(err) {
                notify(`Ошибка:\n${err && err.description ? err.description : err}`);
            });
        };

        crmProvider.prototype.retrieveSharedPrincipalsAndAccessAsync = function(entityName, entityId) {
            /// <summary>Execute RetrieveSharedPrincipalsAndAccessRequest like in Microsoft.Xrm.Sdk</summary>
            /// <param name="entityName" type="String">EntityLogicalName</param>
            /// <param name="entityId" type="Guid">Entity Id for check access</param>
            return this.retrieveSharedPrincipalsAndAccess(entityName, entityId, true);
        };

        crmProvider.prototype.setState = function(entityName, entityId, state, status, async) {
            /// <summary>Execute SetStateRequest like in Microsoft.Xrm.Sdk</summary>
            const request = new self.SetStateRequest(entityName, entityId, state, status);

            return orgService.execute(request, async).then(function(result) {
                const $response = $(result).find("ExecuteResult").eq(0);
                return crmXmlDecode($response.text());
            });
        };

        crmProvider.prototype.setStateAsync = function(entityName, entityId, state, status) {
            /// <summary>Execute SetStateRequest like in Microsoft.Xrm.Sdk</summary>
            return this.setState(entityName, entityId, state, status, true);
        };

        crmProvider.prototype.retrieveEntityMetadata = function(logicalName, entityFilters, retrieveAsIfPublished, async) {
            entityFilters = $.isArray(entityFilters) ? entityFilters : [entityFilters];
            entityFilters = entityFilters.join(" ");
            const request = new self.RetrieveEntityRequest(logicalName, entityFilters, retrieveAsIfPublished);

            return orgService.execute(request, async).then(function(result) {
                const $resultXml = $(result);
                const results = [];
                const $value = $resultXml.find("b\\:value");
                const response = $value.length ? $value : $resultXml.find("value");

                for (let i = 0, l = response.length; i < l; i++) {
                    const a = objectifyNode(response[i]);
                    a._type = entityMetadataType;
                    results[results.length] = a;
                }

                return results;
            });
        };

        crmProvider.prototype.retrieveEntityMetadataAsync = function(logicalName, entityFilters, retrieveAsIfPublished) {
            return this.retrieveEntityMetadata(logicalName, entityFilters, retrieveAsIfPublished, true);
        };

        crmProvider.prototype.retrieveAttributeMetadata = function(entityLogicalName, attributeLogicalName, retrieveAsIfPublished, async) {
            const request = new self.RetrieveAttributeRequest(entityLogicalName, attributeLogicalName, retrieveAsIfPublished);

            return orgService.execute(request, async).then(function(result) {
                const $resultXml = $(result);
                const results = [];
                const $value = $resultXml.find("b\\:value");
                const response = $value.length ? $value : $resultXml.find("value");

                for (let i = 0, l = response.length; i < l; i++) {
                    results[results.length] = objectifyNode(response[i]);
                }

                return results;
            });
        };

        crmProvider.prototype.retrieveAttributeMetadataAsync = function(entityLogicalName, attributeLogicalName, retrieveAsIfPublished) {
            return this.retrieveAttributeMetadata(entityLogicalName, attributeLogicalName, retrieveAsIfPublished, true);
        };

        crmProvider.prototype.retrieveAllEntitiesMetadata = function(entityFilters, retrieveIfPublished, async) {
            entityFilters = $.isArray(entityFilters) ? entityFilters : [entityFilters];
            entityFilters = entityFilters.join(" ");
            const request = new self.RetrieveAllEntitiesRequest(entityFilters, retrieveIfPublished);

            return orgService.execute(request, async).then(function(result) {
                const $resultXml = $(result);
                const results = [];
                const $metadata = $resultXml.find("c\\:" + entityMetadataType);
                const response = $metadata.length ? $metadata : $resultXml.find(entityMetadataType);

                for (let i = 0, l = response.length; i < l; i++) {
                    const a = objectifyNode(response[i]);
                    a._type = entityMetadataType;
                    results[results.length] = a;
                }

                return results;
            });
        };

        crmProvider.prototype.retrieveAllEntitiesMetadataAsync = function(entityFilters, retrieveIfPublished) {
            return this.retrieveAllEntitiesMetadata(entityFilters, retrieveIfPublished, true);
        };

        return crmProvider;
    })();
}).call(Xrm.Soap.Sdk, this);
