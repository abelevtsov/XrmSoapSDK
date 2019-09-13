(function(global) {
    global.Type.registerNamespace("Xrm.Soap.Sdk");
})(this);

(function(global) {
    "use strict";

    var self = this,
        $ = global.$ || global.parent.$,
        _ = global._,
        trueString = true + "",
        falseString = false + "",

        notify = function(msg) {
            Xrm && Xrm.Utility && Xrm.Utility.alertDialog ? Xrm.Utility.alertDialog(msg) : alert(msg);
        },

        htmlEncode = function(s) {
            if (!s) {
                return s;
            }

            var buffer = "",
                encoded = "";

            for (var count = 0, cnt = 0, l = s.length; cnt < l; cnt++) {
                const c = s.charCodeAt(cnt);
                if (c > 96 && c < 123 || c > 64 && c < 91 || c === 32 || c > 47 && c < 58 || c === 46 || c === 44 || c === 45 || c === 95) {
                    buffer += String.fromCharCode(c);
                } else {
                    buffer += `&#${c};`;
                }

                if (++count === 500) {
                    encoded += buffer;
                    buffer = "";
                    count = 0;
                }
            }

            if (buffer.length) {
                encoded += buffer;
            }

            return encoded;
        },

        stringToDate = function(s) {
            const b = s.split(/\D/);
            return new Date(Date.UTC(b[0], --b[1], b[2], b[3], b[4], b[5]));
        },

        innerSurrogateAmpersandWorkaround = function(s) {
            var buffer = "",
                c0,
                cnt,
                l;

            for (cnt = 0, l = s.length; cnt < l; cnt++) {
                c0 = s.charCodeAt(cnt);
                if (c0 >= 55296 && c0 <= 57343) {
                    if (cnt + 1 < s.length) {
                        const c1 = s.charCodeAt(cnt + 1);
                        if (c1 >= 56320 && c1 <= 57343) {
                            buffer += `CRMEntityReferenceOpen${((c0 - 55296) * 1024 + (c1 & 1023) + 65536).toString(16)}CRMEntityReferenceClose`;
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
            buffer = "";
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
            var xmlString = "";

            try {
                if (response) {
                    if (typeof(XMLSerializer) !== "undefined" &&
                        typeof(response.xml) === "undefined") {
                        xmlString = (new XMLSerializer()).serializeToString(response[0]);
                    } else {
                        if (typeof(response.xml) !== "undefined") {
                            xmlString = response.xml;
                        } else if (typeof(response[0].xml) !== "undefined") {
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
                // code for Mozilla, Firefox, Opera, and other normal browsers
                parseXml = function(data) {
                    try {
                        const parser = new DOMParser();
                        return parser.parseFromString(data, "text/xml");
                    } catch (ex) {
                        return notifyAboutNotSupport();
                    }
                };
            } else {
                // IE
                parseXml = function(data) {
                    try {
                        const xmlDoc = new global.ActiveXObject("Microsoft.XMLDOM");
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
            return typeof(s) === "string" ? s : s.toString();
        },

        crmXmlEncode = function(s) {
            const stype = typeof(s);
            // ReSharper disable once ConditionIsAlwaysConst - weird IE it's for you
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

            if (value && typeof(value) === typeof("") && value.slice(0, 1) === "{" && value.slice(-1) === "}") {
                value = value.slice(1, -1);
            }

            return value && typeof(value) === "object" && value.getTime ? value.toISOString() : crmXmlEncode(value);
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

            if (typeof(Array.prototype.some) === "function") {
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
            return typeof(node.baseName) !== "undefined" ? node.baseName : node.localName;
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

        publishersPrefixes = [""],
        context = typeof(global.GetGlobalContext) === "function" ? global.GetGlobalContext() : global.Xrm.Page.context,
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
        noLockTemplate = compile("<a:noLock><%= noLock %></a:noLock>"),
        distinctTemplate = compile("<a:distinct><%= distinct %></a:distinct>"),
        entityNameTemplate = compile("<a:EntityName><%= name %></a:EntityName>"),
        hasOwnProp = Object.prototype.hasOwnProperty,

        extend = function(child, base) {
            // ReSharper disable once MissingHasOwnPropertyInForeach
            for (let key in base) {
                if (hasOwnProp.call(base, key)) {
                    child[key] = base[key];
                }
            }

            const Ctor = function() {
                this.constructor = child;
            };

            Ctor.prototype = base.prototype;
            child.prototype = new Ctor();
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
        const columnsTemplate = compile(`<a:AllColumns><%= allColumns %></a:AllColumns><a:Columns xmlns:b='${arraysNs}'><% _.each(columns, function(column) { %><%= column %><% }) %></a:Columns>`);
        const columnSetTemplate = compile("<a:ColumnSet><%= columnSet %></a:ColumnSet>");
        const asLinkColumnSetTemplate = compile("<a:Columns><%= columnSet %></a:Columns>");
        const simpleColumnSetTemplate = compile(`<columnSet xmlns:a='${contractsXrmNs}'><%= columnSet %></columnSet>`);

        const initColumns = function(columns) {
            if (columns && columns.length) {
                if (columns.length === 1 && $.isArray(columns[0])) {
                    return columns[0];
                } else if (typeof(columns[0]) === "boolean") {
                    return [columns[0]];
                } else {
                    return columns;
                }
            }

            return [false];
        };

        const getColumnSetTemplate = function(asLink, simple) {
            if (asLink) {
                return asLinkColumnSetTemplate;
            } else if (simple) {
                return simpleColumnSetTemplate;
            }

            return columnSetTemplate;
        };

        const getSoap = function(asLink, simple, allColumns, columns) {
            return getColumnSetTemplate(asLink, simple)({
                columnSet: columnsTemplate({ allColumns: allColumns, columns: columns })
            });
        };

        const ctor = function() {
            this.columns = initColumns(arguments);
            this.count = this.columns.length;
        };

        ctor.prototype.addColumn = function(columnName) {
            if (typeof(this.columns[0]) !== "boolean") {
                this.columns[this.count] = columnName;
                this.count++;
            }
        };

        ctor.prototype.serialize = function(asLink, simple) {
            if (this.count) {
                if (this.columns[0] === true) {
                    return getSoap(asLink, simple, true, []);
                }

                let columns = [];
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

        ctor.getAllColumnsSoap = function(asLink, simple) {
            return getSoap(asLink, simple, true, []);
        };

        return ctor;
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
        const orderTemplate = compile("<a:OrderExpression><a:AttributeName><%= attributeName %></a:AttributeName><a:OrderType><%= orderType %></a:OrderType></a:OrderExpression>");

        /**
         * OrderExpression for use with QueryByAttribute
         * @param {String} attributeName
         * @param {OrderType} orderType
         */
        const ctor = function(attributeName, orderType) {
            this.attributeName = attributeName;
            this.orderType = !orderType ? self.OrderType.Descending : orderType;
        };

        ctor.prototype.serialize = function() {
            return orderTemplate({
                attributeName: this.attributeName,
                orderType: this.orderType
            });
        };

        return ctor;
    })();

    this.ConditionExpression = (function() {
        const valueTemplate = compile("<b:anyType i:type='c:<%= type %>' xmlns:c='<%= xmlns %>'><%= value %></b:anyType>");
        const valuesTemplate = compile(`<a:Values xmlns:b='${arraysNs}'><% _.each(values, function(value) { %><%= value %><% }) %></a:Values>`);
        const conditionExpressionTemplate = compile("<a:ConditionExpression><a:AttributeName><%= attributeName %></a:AttributeName><a:Operator><%= operator %></a:Operator><%= values %></a:ConditionExpression>");

        /**
         * ConditionExpression for use with QueryByAttribute/QueryExpression
         * @param {String} attributeName - Name of ordering by attribute
         * @param {ConditionOperator} operator - Condition operator
         * @param {Array} values - Condition values
         */
        const ctor = function(attributeName, operator, values) {
            this.attributeName = attributeName;
            this.operator = operator;
            this.values = values; // ToDo: param array
        };

        ctor.prototype.serialize = function() {
            if (this.values && this.values.length) {
                const values = _.map(this.values, function(value) {
                    const typed = value.hasOwnProperty("type");
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

        return ctor;
    })();

    this.FilterOperator = (function() {
        return {
            And: "And",
            Or: "Or"
        };
    })();

    this.FilterExpression = (function() {
        const template = compile([
            "<a:LinkCriteria>",
                 "<a:Conditions>",
                     "<% _.each(conditions, function(condition) { %><%= condition %><% }) %>",
                 "</a:Conditions>",
                 "<a:FilterOperator>",
                     "<%= filterOperator %>",
                 "</a:FilterOperator>",
             "</a:LinkCriteria>"
            ].join(""));

        const ctor = function(logicalOperator) {
            this.conditions = [];
            this.filterOperator = logicalOperator ? logicalOperator : self.FilterOperator.And;
        };

        /**
         * Add condition expression to conditions list
         * @param {ConditionExpression} condition
         */
        ctor.prototype.addCondition = function(condition) {
            condition && condition instanceof self.ConditionExpression && (this.conditions[this.conditions.length] = condition);
        };

        ctor.prototype.addConditions = function(/* conditions list */) {
            if (arguments && arguments.length) {
                let count = this.conditions.length;
                for (let i = arguments.length; i--;) {
                    const condition = arguments[i];
                    condition && condition instanceof self.ConditionExpression && (this.conditions[count++] = condition);
                }
            }
        };

        ctor.prototype.setFilterOperator = function(logicalOperator) {
            logicalOperator && (this.filterOperator = logicalOperator);
        };

        ctor.prototype.serialize = function() {
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

        return ctor;
    })();

    this.JoinOperator = (function() {
        return {
            Inner: "Inner",
            LeftOuter: "LeftOuter",
            Natural: "Natural"
        };
    })();

    this.LinkEntity = (function() {
        const template = compile([
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
        ].join(""));

        /**
         * LinkEntity like in Microsoft.Xrm.Sdk
         * @param {String} linkFromEntityName
         * @param {String} linkToEntityName
         * @param {String} linkFromAttributeName
         * @param {String} linkToAttributeName
         * @param {JoinOperator} joinOperator
         */
        const ctor = function(linkFromEntityName, linkToEntityName, linkFromAttributeName, linkToAttributeName, joinOperator) {
            this.linkFromEntityName = linkFromEntityName;
            this.linkToEntityName = linkToEntityName;
            this.linkFromAttributeName = linkFromAttributeName;
            this.linkToAttributeName = linkToAttributeName;
            this.joinOperator = joinOperator;
        };

        /**
         * Set filter expression as link criteria
         * @param {FilterExpression} filterExpression - Current filter criteria
         */
        ctor.prototype.setLinkCriteria = function(filterExpression) {
            this.linkCriteria = filterExpression;
        };

        ctor.prototype.setColumns = function(columnSet) {
            columnSet && columnSet instanceof self.ColumnSet && (this.columns = columnSet);
        };

        ctor.prototype.serialize = function() {
            return template({
                columns: (this.columns ? this.columns : new self.ColumnSet(false)).serialize(true),
                joinOperator: this.joinOperator,
                linkCriteria: this.linkCriteria ? this.linkCriteria.serialize() : "",
                linkFromAttributeName: this.linkFromAttributeName,
                linkFromEntityName: this.linkFromEntityName,
                linkToAttributeName: this.linkToAttributeName,
                linkToEntityName: this.linkToEntityName
            });
        };

        return ctor;
    })();

    this.PageInfo = (function() {
        const template = compile([
            "<a:PageInfo>",
                "<a:Count><%= count %></a:Count>",
                "<a:PageNumber><%= pageNumber %></a:PageNumber>",
                "<a:PagingCookie i:nil='true'/>",
                "<a:ReturnTotalRecordCount><%= returnTotalRecordCount %></a:ReturnTotalRecordCount>",
            "</a:PageInfo>"
        ].join(""));

        const ctor = function(count, pageNumber, returnTotalRecordCount) {
            this.count = count || 0;
            this.pageNumber = pageNumber || 0;
            this.returnTotalRecordCount = returnTotalRecordCount || false;
        };

        ctor.prototype.serialize = function() {
            return template({
                count: this.count,
                pageNumber: this.pageNumber,
                returnTotalRecordCount: this.returnTotalRecordCount
            });
        };

        var instance;
        ctor.instance = function() {
            instance = instance || new self.PageInfo();
            return instance;
        };

        return ctor;
    })();

    this.QueryByAttribute = (function() {
        const queryTemplate = compile(`<query i:type='a:QueryByAttribute' xmlns:a='${contractsXrmNs}'><%= query %></query>`);
        const ordersTemplate = compile("<a:Orders><% _.each(orders, function(order) { %><%= order %><% }) %></a:Orders>");
        const attributesTemplate = compile(`<a:Attributes xmlns:b='${arraysNs}'><% _.each(attributes, function(attribute) { %><%= attribute %><% }) %></a:Attributes>`);
        const valuesTemplate = compile(`<a:Values xmlns:b='${arraysNs}'><% _.each(values, function(value) { %><%= value %><% }) %></a:Values>`);
        const valueTemplate = compile(`<b:anyType i:type='c:<%= type %>' xmlns:c='${xmlSchemaNs}'><%= value %></b:anyType>`);
        const topCountTemplate = compile("<a:topCount<% if (topCount === null) { %> i:nil='true'<% } %>><%= topCount %></a:topCount>");

        /**
         * QueryByAttribute like in Microsoft.Xrm.Sdk
         * @param {String} entityName
         * @param {Array<String>} attributes
         * @param {Array} values
         * @param {ColumnSet} columnSet
         * @param {Number} topCount
         */
        const ctor = function(entityName, attributes, values, columnSet, topCount) {
            this.entityName = entityName;
            this.attributes = attributes;
            this.values = values;
            this.columns = columnSet || new self.ColumnSet(false);
            this.distinct = false;
            this.noLock = false;
            this.orders = [];
            this.topCount = topCount || null;
            this.pageInfo = self.PageInfo.instance();
        };

        /**
         * Add order expression to current query
         * @param {OrderExpression} order
         */
        ctor.prototype.addOrder = function(order) {
            order && order instanceof self.OrderExpression && (this.orders[this.orders.length] = order);
        };

        /**
         * Add order expressions to current query
         * @param {Array<OrderExpression>} orders
         */
        ctor.prototype.addOrders = function(/* order list */) {
            if (arguments && arguments.length) {
                let counter = this.orders.length;
                for (var i = 0, l = arguments.length; i < l; i++) {
                    const order = arguments[i];
                    order && order instanceof self.OrderExpression && (this.orders[counter++] = order);
                }
            }
        };

        ctor.prototype.distinct = function(/* value */) {
            if (arguments && arguments.length === 1) {
                this.distinct = !!arguments[0];
            }

            return this.distinct;
        };

        ctor.prototype.noLock = function(/* value */) {
            if (arguments && arguments.length === 1) {
                this.noLock = !!arguments[0];
            }

            return this.noLock;
        };

        ctor.prototype.pageInfo = function(/* value */) {
            if (arguments && arguments.length === 1 && arguments[0] instanceof self.PageInfo) {
                this.pageInfo = arguments[0];
            }

            return this.pageInfo;
        };

        ctor.prototype.serialize = function() {
            // ToDo: improve result creation
            var result = [];
            if (this.attributes.length) {
                result.push(attributesTemplate({
                    attributes: _.map(this.attributes, function(attr) {
                        return attributeTemplate({ value: attr });
                    })
                }));
            }

            result.push(this.columns.serialize());
            result.push(entityNameTemplate({ name: this.entityName }));

            if (this.orders && this.orders.length) {
                result.push(ordersTemplate({
                    orders: _.map(this.orders, function(order) {
                        return order.serialize();
                    })
                }));
            }

            result.push(this.pageInfo.serialize());

            if (this.attributes.length) {
                result.push(valuesTemplate({
                    values: _.map(this.values, function(value) {
                        const typed = value.hasOwnProperty("type");
                        return valueTemplate({
                            type: typed ? value.type : "string",
                            value: value.hasOwnProperty("value") ? value.value : value
                        });
                    })
                }));
            }

            result.push(distinctTemplate({ distinct: this.distinct }));
            result.push(noLockTemplate({ noLock: this.noLock }));
            result.push(topCountTemplate({ topCount: this.topCount }));

            return queryTemplate({ query: result.join("") });
        };

        return ctor;
    })();

    this.QueryExpression = (function() {
        const queryTemplate = compile(`<query i:type='a:QueryExpression' xmlns:a='${contractsXrmNs}'><%= query %></query>`);
        const criteriaTemplate = compile("<a:Criteria><%= conditions %><a:FilterOperator><%= filterOperator %></a:FilterOperator><a:Filters></a:Filters></a:Criteria>");
        const conditionsTemplate = compile("<a:Conditions><% _.each(conditions, function(condition) { %><%= condition.serialize() %><% }) %></a:Conditions>");
        const linkEntitiesTemplate = compile("<a:LinkEntities><% _.each(linkEntities, function(entity) { %><%= entity.serialize() %><% }) %></a:LinkEntities>");
        const ordersTemplate = compile("<a:Orders><% _.each(orders, function(order) { %><%= order.serialize() %><% }) %></a:Orders>");
        const topCountTemplate = compile("<a:topCount <% if (topCount === null) { %> i:nil='true'<% } %>><%= topCount %></a:topCount>");

        /**
         * QueryByAttribute like in Microsoft.Xrm.Sdk
         * @param {String} entityName
         * @param {Array<ConditionExpression>} conditions
         * @param {(Array|ColumnSet)} columnSet
         */
        const ctor = function(entityName, conditions, columnSet) {
            this.entityName = entityName;
            this.conditions = conditions;
            this.filterOperator = self.FilterOperator.And;
            this.columnSet = columnSet || new self.ColumnSet(false);
            this.distinct = false;
            this.noLock = false;
            this.orders = [];
            this.linkEntities = [];
            this.pageInfo = self.PageInfo.instance();
            this.topCount = null;
        };

        /**
         * Add order expression to current query
         * @param {OrderExpression} order
         */
        ctor.prototype.addOrder = function(order) {
            order && order instanceof self.OrderExpression && (this.orders[this.orders.length] = order);
        };

        ctor.prototype.addOrders = function(/* order list */) {
            if (arguments && arguments.length) {
                let counter = this.orders.length;
                for (var i = 0, l = arguments.length; i < l; i++) {
                    const order = arguments[i];
                    order && order instanceof self.OrderExpression && (this.orders[counter++] = order);
                }
            }
        };

        /**
         * Set filter operator to current query
         * @param {OrderExpression} filterOperator
         */
        ctor.prototype.setFilterOperator = function(filterOperator) {
            filterOperator && (this.filterOperator = filterOperator);
        };

        /**
          * Add linked entity to current query
          * @param {LinkEntity} linkEntity
          * @returns {Void}
          */
        ctor.prototype.addLink = function(linkEntity) {
            linkEntity && linkEntity instanceof self.LinkEntity && (this.linkEntities[this.linkEntities.length] = linkEntity);
        };

        ctor.prototype.addLinks = function(/* linkEntity list */) {
            if (arguments && arguments.length) {
                let counter = this.linkEntities.length;
                for (var i = 0, l = arguments.length; i < l; i++) {
                    const linkEntity = arguments[i];
                    linkEntity && linkEntity instanceof self.LinkEntity && (this.linkEntities[counter++] = linkEntity);
                }
            }
        };

        ctor.prototype.distinct = function(/* value */) {
            if (arguments && arguments.length === 1) {
                this.distinct = !!arguments[0];
            }

            return this.distinct;
        };

        ctor.prototype.noLock = function(/* value */) {
            if (arguments && arguments.length === 1) {
                this.noLock = !!arguments[0];
            }

            return this.noLock;
        };

        ctor.prototype.pageInfo = function(/* value */) {
            if (arguments && arguments.length === 1 && arguments[0] instanceof self.PageInfo) {
                this.pageInfo = arguments[0];
            }

            return this.pageInfo;
        };

        ctor.prototype.topCount = function(/* value */) {
            if (arguments && arguments.length === 1 && typeof(arguments[0]) === "number") {
                this.topCount = parseInt(arguments[0], 10);
            }

            return this.topCount;
        };

        ctor.prototype.serialize = function() {
            // ToDo: improve result accumulation
            var result = [this.columnSet ? this.columnSet.serialize() : self.ColumnSet.getAllColumnsSoap()];

            result.push(criteriaTemplate({
                conditions: this.conditions && this.conditions.length ? conditionsTemplate({ conditions: this.conditions }) : "<a:Conditions/>",
                filterOperator: this.filterOperator
            }));

            result.push(distinctTemplate({ distinct: this.distinct }));
            result.push(entityNameTemplate({ name: this.entityName }));

            if (this.orders && this.orders.length) {
                result.push(ordersTemplate({ orders: this.orders }));
            }

            if (this.linkEntities && this.linkEntities.length) {
                result += linkEntitiesTemplate({ linkEntities: this.linkEntities });
            } else {
                result.push("<a:LinkEntities/>");
            }

            result.push(this.pageInfo.serialize());
            result.push(noLockTemplate({ noLock: this.noLock }));
            result.push(topCountTemplate({ topCount: this.topCount }));

            return queryTemplate({ query: result.join("") });
        };

        return ctor;
    })();

    this.Entity = (function() {
        /**
         * Universal class for creating, updating and deleting any entity
         * @param {String} logicalName
         * @param {Guid} id
         */
        const entity = function(logicalName, id) {
            this.attributes = {};
            this.logicalName = logicalName;
            this.id = id && id.type === "guid" ? id : new self.Guid(id || self.Guid.empty());
        };

        entity.prototype = {
            /**
             * Get entity attribute by name
             * @param {String} name
             */
            getAttribute: function(name) {
                return this.attributes[name] || null;
            },

            getAttributeValue: function(name) {
                const attr = this.getAttribute(name);
                if (attr) {
                    return attr.hasOwnProperty("value") ? attr.value : attr;
                }

                return null;
            },

            /**
             * Set entity attribute
             * @param {String} name
             * @param {any} attribute
             */
            setAttribute: function(name, attribute) {
                name && (this.attributes[name] = attribute);
            },

            getName: function() {
                if (this.logicalName === "systemuser") {
                    return this.getAttributeValue("fullname");
                }

                for (let i = publishersPrefixes.length; i--;) {
                    const name = this.getAttributeValue(publishersPrefixes[i] + "name");
                    if (name) {
                        return name;
                    }
                }

                return "";
            },

            logicalName: function() {
                return this.logicalName;
            },

            getIdValue: function() {
                return this.id.value;
            },

            getId: function(id) {
                if (id) {
                    this.id = id.type === "guid" ? id : new self.Guid(id);
                }

                return this.id;
            },

            toEntityReference: function() {
                return new self.EntityReference(
                    this.logicalName(),
                    this.getId(),
                    this.getName());
            },

            toLookupValue: function() {
                return [{
                    id: this.getIdValue(),
                    name: this.getName(),
                    entityType: this.logicalName()
                }];
            },

            clone: function() {
                const clone = new self.Entity(this.logicalName);
                const attributes = this.attributes;

                for (let name in attributes) {
                    if (attributes.hasOwnProperty(name)) {
                        if (hasOwnProp.call(attributes, name)) {
                            clone.setAttribute(name, attributes[name]);
                        }
                    }
                }

                if (this.logicalName + "id" in clone.attributes) {
                    delete clone.attributes[this.logicalName + "id"];
                }

                return clone;
            },

            serialize: function() {
                var xml = [`<entity xmlns:a='${contractsXrmNs}'>`],
                    counter = 1;

                xml[counter++] = `<a:Attributes xmlns:b='${genericNs}'>`;

                // ReSharper disable once MissingHasOwnPropertyInForeach
                for (var attributeName in this.attributes) {
                    var attribute = this.attributes[attributeName];
                    xml[counter++] = "<a:KeyValuePairOfstringanyType>";
                    xml[counter++] = `<b:key>${attributeName}</b:key>`;
                    if (attribute === null || attribute.value === null) {
                        xml[counter++] = "<b:value i:nil='true'/>";
                    } else {
                        var sType = attribute.type ? crmXmlEncode(attribute.type) : typeof(attribute),
                            value,
                            encodedValue,
                            id,
                            encodedId,
                            logicalName,
                            encodedLogicalName;

                        value = attribute.hasOwnProperty("value") ? attribute.value : attribute;
                        encodedValue = attributeName === "documentbody" ? value : encodeValue(value);
                        switch (sType) {
                            case "OptionSetValue":
                                xml[counter++] = "<b:value i:type='a:OptionSetValue'>";
                                xml[counter++] = `<a:Value>${encodedValue}</a:Value></b:value>`;
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
                                    xml[counter++] = `<a:Id>${encodedId}</a:Id>`;
                                    xml[counter++] = `<a:LogicalName>${encodedLogicalName}</a:LogicalName>`;
                                    xml[counter++] = "<a:Name i:nil='true'/>";
                                    xml[counter++] = "</b:value>";
                                    xml[counter++] = "</a:KeyValuePairOfstringanyType>";
                                    xml[counter++] = "</a:Attributes>";
                                    xml[counter++] = "<a:EntityState i:nil='true'/>";
                                    xml[counter++] = "<a:FormattedValues />";
                                    xml[counter++] = `<a:Id>${self.Guid.empty().value}</a:Id>`;
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
                                xml[counter++] = `<a:Id>${encodedId}</a:Id>`;
                                xml[counter++] = `<a:LogicalName>${encodedLogicalName}</a:LogicalName>`;
                                xml[counter++] = "<a:Name i:nil='true'/>" + "</b:value>";
                                break;
                            case "Money":
                                xml[counter++] = "<b:value i:type='a:Money'>";
                                xml[counter++] = `<a:Value>${encodedValue}</a:Value></b:value>`;
                                break;
                            case "guid":
                                xml[counter++] = `<b:value i:type='c:guid' xmlns:c='${serializationNs}'>`;
                                xml[counter++] = encodedValue + "</b:value>";
                                break;
                            case "decimal":
                                xml[counter++] = `<b:value i:type='c:decimal' xmlns:c='${xmlSchemaNs}'>`;
                                xml[counter++] = encodedValue + "</b:value>";
                                break;
                            case "number":
                                // eslint-disable-next-line eqeqeq
                                var oType = parseInt(encodedValue, 10) == encodedValue ? "int" : "double";
                                xml[counter++] = `<b:value i:type='c:${oType}' xmlns:c='${xmlSchemaNs}'>`;
                                xml[counter++] = encodedValue + "</b:value>";
                                break;
                            default:
                                sType = typeof(value) === "object" && value.getTime ? "dateTime" : sType;
                                xml[counter++] = `<b:value i:type='c:${sType}' xmlns:c='${xmlSchemaNs}'>${encodedValue}</b:value>`;
                                break;
                        }
                    }

                    xml[counter++] = "</a:KeyValuePairOfstringanyType>";
                }

                xml[counter++] = "</a:Attributes>";
                xml[counter++] = "<a:EntityState i:nil='true'/>";
                xml[counter++] = `<a:FormattedValues xmlns:b='${genericNs}'/>`;
                xml[counter++] = `<a:Id>${encodeValue(this.guid)}</a:Id>`;
                xml[counter++] = `<a:LogicalName>${this.logicalName}</a:LogicalName>`;
                xml[counter++] = `<a:RelatedEntities xmlns:b='${genericNs}'/>`;
                xml[counter++] = "</entity>";

                return xml.join("");
            }
        };

        entity.deserialize = function(resultNode) {
            var obj = {},
                resultNodes = resultNode.childNodes,
                instance = new self.Entity(),

                getEntityReference = function(nodesList) {
                    const attrs = _.chain(nodesList).map(function(n) {
                        return {
                            name: n.nodeName,
                            value: $(n).text()
                        };
                    }).reduce(function(o, a) {
                        o[a.name] = a.value;
                        return o;
                    }, {}).value();

                    return new self.EntityReference(attrs["a:LogicalName"], attrs["a:Id"], attrs["a:Name"]);
                };

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
                            var sType = "",
                                attributes = attr.childNodes[k].childNodes[1].attributes;

                            for (l = 0, al = attributes.length; l < al; l++) {
                                if (attributes[l].nodeName === "i:type") {
                                    sType = ($(attributes[l]).val() || "")
                                        .replace("c:", "")
                                        .replace("a:", "");
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
                                    obj[sKey] = getEntityReference(nodes);
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
                                            var itemRef = getEntityReference(nodes);
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
                                            entCv = getEntityReference($attr.children());
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
                        instance.id = new self.Guid($(resultNodes[j]).text());
                        break;
                    case "a:LogicalName":
                        instance.logicalName = $(resultNodes[j]).text();
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
        /**
         * Like OptionSetValue in Microsoft.Xrm.Sdk
         * @param {Number} value Value of option
         * @param {String} name Name of option
         */
        const ctor = function(value, name) {
            if (typeof(value) !== "number") {
                throw "value must be a number";
            }

            const nameIsExist = typeof(name) !== "undefined";
            if (nameIsExist && typeof(name) !== "string") {
                throw "name must be a string";
            }

            this.value = value;
            this.name = nameIsExist ? name : "";
            this.type = "OptionSetValue";
        };

        ctor.prototype.getValue = function() {
            return this.value;
        };

        ctor.prototype.getName = function() {
            return this.name;
        };

        return ctor;
    })();

    this.Money = (function() {
        const ctor = function(value) {
            this.value = value;
            this.type = "Money";
        };

        return ctor;
    })();

    this.Decimal = (function() {
        const ctor = function(value) {
            this.value = value;
            this.type = "decimal";
        };

        return ctor;
    })();

    this.Guid = (function() {
        const regex = /^(\{){0,1}[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(\}){0,1}$/;
        const empty = "{00000000-0000-0000-0000-000000000000}";
        const ctor = function(value) {
            if (typeof(value) === "object" &&
            ((value instanceof self.Guid) ||
                (value instanceof self.XrmValue && value.type === "guid"))) {
                this.value = value.value.toUpperCase();
                this.type = value.type;
            } else {
                value = value ? value.toUpperCase() : "";
                if (!regex.test(value)) {
                    throw new TypeError("value must be a valid Guid");
                }

                if (value.indexOf("{") === 0) {
                    this.value = value;
                } else {
                    this.value = `{${value}}`;
                }

                this.type = "guid";
            }
        };

        ctor.prototype.equals = function(other) {
            if (!other) {
                return false;
            }

            if (typeof(other) === "object" &&
                other instanceof self.XrmValue &&
                other.type === "guid") {
                return this.equals(self.Guid.tryParse(other.value));
            } else if (typeof(other) === "object" && other instanceof self.Guid) {
                return this.value === other.value;
            } else if (typeof(other) === "string") {
                return this.equals(self.Guid.tryParse(other));
            }

            return false;
        };

        ctor.prototype.notEquals = function(other) {
            return !this.equals(other);
        };

        ctor.parse = function(value) {
            return new self.Guid(value);
        };

        ctor.tryParse = function(value) {
            try {
                return new self.Guid(value);
            } catch (ex) {
                return null;
            }
        };

        ctor.empty = function() {
            return new self.Guid(empty);
        };

        return ctor;
    })();

    this.EntityCollection = (function() {
        const entityCollection = function(value) {
            this.value = value;
            this.type = "EntityCollection";
        };

        return entityCollection;
    })();

    this.EntityReference = (function() {
        /**
         * Like EntityReference in Microsoft.Xrm.Sdk
         * @param {String} logicalName Entity logical name
         * @param {Guid} id Entity Id
         * @param {String} name Entity name
         */
        const ctor = function(logicalName, id, name) {
            this.id = id ? new self.Guid(id) : self.Guid.empty();
            this.logicalName = logicalName || "";
            this.name = name || "";
            this.type = "EntityReference";
        };

        ctor.prototype.getId = function() {
            return this.id;
        };

        ctor.prototype.getIdValue = function() {
            return this.id.value;
        };

        ctor.prototype.getLogicalName = function() {
            return this.logicalName;
        };

        ctor.prototype.getName = function() {
            return this.name;
        };

        ctor.prototype.toLookupValue = function() {
            return [{
                id: this.getIdValue(),
                name: this.getName(),
                entityType: this.getLogicalName()
            }];
        };

        ctor.prototype.equals = function(other) {
            if (!other) {
                return false;
            }

            if (typeof(other) === "object" && other instanceof self.EntityReference) {
                return this.id.equals(other.id);
            }

            return false;
        };

        return ctor;
    })();

    this.StateCode = (function() {
        const ctor = function(value) {
            this.value = value;
            this.type = "int";
        };

        return ctor;
    })();

    this.StatusCode = (function() {
        const ctor = function(value) {
            this.value = value;
            this.type = "int";
        };

        return ctor;
    })();

    this.XrmValue = (function() {
        const ctor = function(value, type) {
            this.value = value;
            this.type = type;
        };

        return ctor;
    })();

    this.RequestParameter = (function() {
        const ctor = function(name, value) {
            this.name = name;
            this.value = value;
        };

        return ctor;
    })();

    this.EntityFilters = (function() {
        return {
            Instance: "Instance",
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
        /**
         * Abstract base class for all requests
         */
        const ctor = function() {
            this.RequestName = arguments[0] || "";
            this.Parameters = arguments[1];
            this.RequestId = self.Guid.empty();
        };

        ctor.prototype.serialize = function() {
            return this.template(this.Parameters);
        };

        return ctor;
    })();

    this.RetrieveAllEntitiesRequest = (function(base) {
        const template = compile([
                `<request i:type='a:RetrieveAllEntitiesRequest' xmlns:a='${contractsXrmNs}'>`,
                  `<a:Parameters xmlns:b='${genericNs}'>`,
                    "<a:KeyValuePairOfstringanyType>",
                      "<b:key>EntityFilters</b:key>",
                      `<b:value i:type='c:EntityFilters' xmlns:c='${metadataNs}'>`,
                        "<%= entityFilters %>",
                      "</b:value>",
                    "</a:KeyValuePairOfstringanyType>",
                    "<a:KeyValuePairOfstringanyType>",
                      "<b:key>RetrieveAsIfPublished</b:key>",
                      `<b:value i:type='c:boolean' xmlns:c='${xmlSchemaNs}'>`,
                        "<%= retrieveAsIfPublished %>",
                      "</b:value>",
                    "</a:KeyValuePairOfstringanyType>",
                  "</a:Parameters>",
                  "<a:RequestId i:nil='true'/>",
                  "<a:RequestName>RetrieveAllEntities</a:RequestName>",
                "</request>"
            ].join(""));

        const ctor = function(entityFilters, retrieveAsIfPublished) {
                this.entityFilters = entityFilters;
                this.retrieveAsIfPublished = !!retrieveAsIfPublished;
                this.template = template;
                ctor.base.constructor.call(
                    this,
                    "RetrieveAllEntitiesRequest",
                    {
                        entityFilters: this.entityFilters,
                        retrieveAsIfPublished: this.retrieveAsIfPublished
                    });
            };

        ctor.prototype.serialize = function() {
            return this.base.prototype.serialize.apply(this);
        };

        extend(ctor, base);

        return ctor;
    })(self.OrganizationRequest);

    this.RetrieveEntityRequest = (function(base) {
        const template = compile([
                `<request i:type='a:RetrieveEntityRequest' xmlns:a='${contractsXrmNs}'>`,
                  `<a:Parameters xmlns:b='${genericNs}'>`,
                    "<a:KeyValuePairOfstringanyType>",
                      "<b:key>EntityFilters</b:key>",
                      `<b:value i:type='c:EntityFilters' xmlns:c='${metadataNs}'>`,
                        "<%= entityFilters %>",
                      "</b:value>",
                    "</a:KeyValuePairOfstringanyType>",
                    "<a:KeyValuePairOfstringanyType>",
                      "<b:key>MetadataId</b:key>",
                      `<b:value i:type='c:guid' xmlns:c='${serializationNs}'>`,
                        self.Guid.empty().value,
                      "</b:value>",
                    "</a:KeyValuePairOfstringanyType>",
                    "<a:KeyValuePairOfstringanyType>",
                      "<b:key>RetrieveAsIfPublished</b:key>",
                      `<b:value i:type='c:boolean' xmlns:c='${xmlSchemaNs}'>`,
                        "<%= retrieveAsIfPublished %>",
                      "</b:value>",
                    "</a:KeyValuePairOfstringanyType>",
                    "<a:KeyValuePairOfstringanyType>",
                      "<b:key>LogicalName</b:key>",
                      `<b:value i:type='c:string' xmlns:c='${xmlSchemaNs}'>`,
                        "<%= logicalName %>",
                      "</b:value>",
                    "</a:KeyValuePairOfstringanyType>",
                  "</a:Parameters>",
                  "<a:RequestId i:nil='true'/>",
                  "<a:RequestName>RetrieveEntity</a:RequestName>",
                "</request>"
            ].join(""));

        const ctor = function(logicalName, entityFilters, retrieveAsIfPublished) {
            this.logicalName = logicalName;
            this.entityFilters = entityFilters;
            this.retrieveAsIfPublished = !!retrieveAsIfPublished;
            this.template = template;
            ctor.base.constructor.call(
                this,
                "RetrieveEntityRequest",
                {
                    logicalName: this.logicalName,
                    entityFilters: this.entityFilters,
                    retrieveAsIfPublished: this.retrieveAsIfPublished
                });
        };

        ctor.prototype.serialize = function() {
            return this.base.prototype.serialize.apply(this);
        };

        extend(ctor, base);

        return ctor;
    })(self.OrganizationRequest);

    this.RetrieveAttributeRequest = (function(base) {
        const template = compile([
                `<request i:type='a:RetrieveAttributeRequest' xmlns:a='${contractsXrmNs}'>`,
                  `<a:Parameters xmlns:b='${genericNs}'>`,
                    "<a:KeyValuePairOfstringanyType>",
                      "<b:key>EntityLogicalName</b:key>",
                      `<b:value i:type='c:string' xmlns:c='${xmlSchemaNs}'>`,
                        "<%= entityLogicalName %>",
                      "</b:value>",
                    "</a:KeyValuePairOfstringanyType>",
                    "<a:KeyValuePairOfstringanyType>",
                      "<b:key>MetadataId</b:key>",
                      `<b:value i:type='ser:guid' xmlns:ser='${serializationNs}'>`,
                        self.Guid.empty().value,
                      "</b:value>",
                    "</a:KeyValuePairOfstringanyType>",
                    "<a:KeyValuePairOfstringanyType>",
                      "<b:key>RetrieveAsIfPublished</b:key>",
                      `<b:value i:type='c:boolean' xmlns:c='${xmlSchemaNs}'>`,
                        "<%= retrieveAsIfPublished %>",
                      "</b:value>",
                    "</a:KeyValuePairOfstringanyType>",
                    "<a:KeyValuePairOfstringanyType>",
                      "<b:key>LogicalName</b:key>",
                      `<b:value i:type='c:string' xmlns:c='${xmlSchemaNs}'>`,
                        "<%= attributeLogicalName %>",
                      "</b:value>",
                    "</a:KeyValuePairOfstringanyType>",
                  "</a:Parameters>",
                  "<a:RequestId i:nil='true' />",
                  "<a:RequestName>RetrieveAttribute</a:RequestName>",
                "</request>"
            ].join(""));

        const ctor = function(entityLogicalName, attributeLogicalName, retrieveAsIfPublished) {
            this.entityLogicalName = entityLogicalName;
            this.attributeLogicalName = attributeLogicalName;
            this.retrieveAsIfPublished = !!retrieveAsIfPublished;
            this.template = template;
            ctor.base.constructor.call(
                this,
                "RetrieveAttributeRequest",
                {
                    entityLogicalName: this.entityLogicalName,
                    attributeLogicalName: this.attributeLogicalName,
                    retrieveAsIfPublished: this.retrieveAsIfPublished
                });
        };

        ctor.prototype.serialize = function() {
            return this.base.prototype.serialize.apply(this);
        };

        extend(ctor, base);

        return ctor;
    })(self.OrganizationRequest);

    this.SetStateRequest = (function(base) {
        const template = compile([
                `<request i:type='b:SetStateRequest' xmlns:a='${contractsXrmNs}' xmlns:b='${contractsCrmNs}'>`,
                  `<a:Parameters xmlns:c='${genericNs}'>`,
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
            ].join(""));

        const ctor = function(entityName, entityId, state, status) {
            this.entityName = entityName;
            this.entityId = new self.Guid(entityId);
            this.state = state;
            this.status = status;
            this.template = template;
            ctor.base.constructor.call(
                this,
                "SetStateRequest",
                {
                    entityName: this.entityName,
                    entityId: this.entityId.value,
                    state: this.state,
                    status: this.status
                });
        };

        ctor.prototype.serialize = function() {
            return this.base.prototype.serialize.apply(this);
        };

        extend(ctor, base);

        return ctor;
    })(self.OrganizationRequest);

    this.ExecuteWorkflowRequest = (function(base) {
        const template = compile([
                `<request i:type='b:ExecuteWorkflowRequest' xmlns:a='${contractsXrmNs}' xmlns:b='${contractsCrmNs}'>`,
                  `<a:Parameters xmlns:c='${genericNs}'>`,
                    "<a:KeyValuePairOfstringanyType>",
                      "<c:key>EntityId</c:key>",
                      `<c:value i:type='d:guid' xmlns:d='${serializationNs}'>`,
                        "<%= entityId %>",
                      "</c:value>",
                    "</a:KeyValuePairOfstringanyType>",
                    "<a:KeyValuePairOfstringanyType>",
                      "<c:key>WorkflowId</c:key>",
                      `<c:value i:type='d:guid' xmlns:d='${serializationNs}'>`,
                        "<%= workflowId %>",
                      "</c:value>",
                    "</a:KeyValuePairOfstringanyType>",
                  "</a:Parameters>",
                  "<a:RequestId i:nil='true'/>",
                  "<a:RequestName>ExecuteWorkflow</a:RequestName>",
                "</request>"
            ].join(""));

        const ctor = function(entityId, workflowId) {
            this.entityId = new self.Guid(entityId);
            this.workflowId = new self.Guid(workflowId);
            this.template = template;
            ctor.base.constructor.call(
                this,
                "ExecuteWorkflowRequest",
                {
                    entityId: this.entityId.value,
                    workflowId: this.workflowId.value
                });
        };

        ctor.prototype.serialize = function() {
            return this.base.prototype.serialize.apply(this);
        };

        extend(ctor, base);

        return ctor;
    })(self.OrganizationRequest);

    this.RetrieveSharedPrincipalsAndAccessRequest = (function(base) {
        const template = compile([
                `<request i:type='b:RetrieveSharedPrincipalsAndAccessRequest' xmlns:a='${contractsXrmNs}' xmlns:i='${xmlSchemaInstanceNs}' xmlns:b='${contractsCrmNs}'>`,
                  `<a:Parameters xmlns:c='${genericNs}'>`,
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
            ].join(""));

        /**
         * RetrieveSharedPrincipalsAndAccessRequest like in Microsoft.Xrm.Sdk
         */
        const ctor = function(entityName, entityId) {
            this.entityName = entityName;
            this.entityId = entityId;
            this.template = template;
            ctor.base.constructor.call(
                this,
                "RetrieveSharedPrincipalsAndAccessRequest",
                {
                    entityName: this.entityName,
                    entityId: this.entityId.value
                });
        };

        ctor.prototype.serialize = function() {
            return this.base.prototype.serialize.apply(this);
        };

        extend(ctor, base);

        return ctor;
    })(self.OrganizationRequest);

    this.ExecuteActionRequest = (function(base) {
        const template = compile([
            `<request  xmlns:a='${contractsXrmNs}' xmlns:i='${xmlSchemaInstanceNs}' xmlns:b='${genericNs}'>`,
              "<%= parameters %>",
              "<a:RequestId i:nil='true'/>",
              "<a:RequestName><%= actionName %></a:RequestName>",
            "</request>"
        ].join(""));

        const targetTemplate = compile([
            "<a:KeyValuePairOfstringanyType>",
                "<b:key>Target</b:key>",
                "<b:value i:type='a:<%= type %>'>",
                    "<a:Id><%= id.value %></a:Id>",
                    "<a:LogicalName><%= logicalName %></a:LogicalName>",
                    "<a:Name i:nil='true'/>",
                "</b:value>",
            "</a:KeyValuePairOfstringanyType>"
        ].join(""));

        const parameterTemplate = compile([
            "<a:KeyValuePairOfstringanyType>",
              "<b:key><%= name %></b:key>",
              `<b:value i:type='c:<%= type %>' xmlns:c='${xmlSchemaNs}'>`,
                "<%= value %>",
              "</b:value>",
            "</a:KeyValuePairOfstringanyType>"
        ].join(""));

        const emptyParametersTemplate = `<a:Parameters xmlns:c='${xmlSchemaNs}' i:nil='true'/>`;
        const parametersTemplate = compile(`<a:Parameters xmlns:c='${xmlSchemaNs}'><% _.each(parameters, function(p) { %><%= p %><% }) %></a:Parameters>`);

        const ctor = function(actionName, entityName, entityId, parameters) {
            this.actionName = actionName;
            this.target = new self.EntityReference(entityName, entityId);
            this.parameters = parameters.length ? parametersTemplate({
                parameters: _.map(parameters, function(p) {
                    // ToDo: extract this method to common usage
                    const typed = p.value ? p.value.hasOwnProperty("type") : false;
                    return parameterTemplate({
                        name: p.name,
                        type: typed ? p.value.type : "string",
                        value: p.value === undefined ? null : (p.value.hasOwnProperty("value") ? p.value.value : p.value)
                    });
                }).concat(targetTemplate(this.target))
            }) : emptyParametersTemplate;
            this.template = template;

            ctor.base.constructor.call(
                this,
                "",
                {
                    parameters: this.parameters,
                    actionName: this.actionName
                });
        };

        ctor.prototype.serialize = function() {
            return this.base.prototype.serialize.apply(this);
        };

        extend(ctor, base);

        return ctor;
    })(self.OrganizationRequest);

    this.ExecuteGlobalActionRequest = (function(base) {
        const template = compile([
            `<request  xmlns:a='${contractsXrmNs}' xmlns:i='${xmlSchemaInstanceNs}' xmlns:b='${genericNs}'>`,
              "<%= parameters %>",
              "<a:RequestId i:nil='true'/>",
              "<a:RequestName><%= actionName %></a:RequestName>",
            "</request>"
        ].join(""));

        const parameterTemplate = compile([
            "<a:KeyValuePairOfstringanyType>",
              "<b:key><%= name %></b:key>",
              `<b:value i:type='c:<%= type %>' xmlns:c='${xmlSchemaNs}'>`,
                "<%= value %>",
              "</b:value>",
            "</a:KeyValuePairOfstringanyType>"
        ].join(""));

        const emptyParametersTemplate = `<a:Parameters xmlns:c='${xmlSchemaNs}' i:nil='true'/>`;
        const parametersTemplate = compile(`<a:Parameters xmlns:c='${xmlSchemaNs}'><% _.each(parameters, function(p) { %><%= p %><% }) %></a:Parameters>`);

        const ctor = function(actionName, parameters) {
            this.actionName = actionName;
            this.parameters = parameters.length ? parametersTemplate({
                parameters: _.map(parameters, function(p) {
                    // ToDo: extract this method to common usage
                    const typed = p.value ? p.value.hasOwnProperty("type") : false;
                    return parameterTemplate({
                        name: p.name,
                        type: typed ? p.value.type : "string",
                        value: p.value === undefined ? null : (p.value.hasOwnProperty("value") ? p.value.value : p.value)
                    });
                })
            }) : emptyParametersTemplate;
            this.template = template;

            ctor.base.constructor.call(
                this,
                "",
                {
                    actionName: this.actionName,
                    parameters: this.parameters
                });
        };

        ctor.prototype.serialize = function() {
            return this.base.prototype.serialize.apply(this);
        };

        extend(ctor, base);

        return ctor;
    })(self.OrganizationRequest);

    /**
     * Like IOrganizationService in Microsoft.Xrm.Sdk
     */
    this.OrganizationService = (function() {
        var url = splittedUrl[0] + "//" + splittedUrl[1],
            serviceUrl = url + (splittedUrl.length === 3 && splittedUrl[2] === orgName ? (`/${orgName}`) : "") + xrmServiceUrl,
            soapTemplate = compile([
                utf8Root,
                "<soap:Envelope xmlns:soap='http://schemas.xmlsoap.org/soap/envelope/'>",
                    "<soap:Body>",
                        `<<%= soapAction %> xmlns='${contractsXrmNs}/Services' xmlns:i='${xmlSchemaInstanceNs}'>`,
                            "<%= soapBody %>",
                        "</<%= soapAction %>>",
                    "</soap:Body>",
                "</soap:Envelope>"
            ].join("")),

            processResponse = function(response) {
                if (!response || (response.hasOwnProperty("xml") && !response.xml)) {
                    return "No response received from the server";
                }

                const $response = $(response);
                const error = $response.find("error").text();
                const faultString = $response.find("faultstring").text();

                if (!(error === "" && faultString === "")) {
                    return error !== "" ? $response.find("description").text() : faultString;
                }

                const currentType = typeof(response);
                const ieXmlType = typeof(response.xml);

                // ReSharper disable once ConditionIsAlwaysConst
                if (currentType !== "object" && (ieXmlType === "undefined" || ieXmlType === "unknown")) {
                    return parseXml(response);
                } else if (currentType === "object") {
                    return response;
                } else {
                    return parseXml(xmlToString(response));
                }
            },

            executeSync = function(soapBody, soapAction) {
                const soapXml = soapTemplate({ soapAction: soapAction, soapBody: soapBody });
                const req = new global.XMLHttpRequest();

                req.open("POST", serviceUrl, false);
                req.setRequestHeader("Accept", "application/xml, text/xml, */*");
                req.setRequestHeader("Content-Type", "text/xml; charset=utf-8");
                req.setRequestHeader("SOAPAction", xrmSoapActionPrefix + soapAction);
                req.send(soapXml);

                const parsedResponse = processResponse(req.responseXML);
                if (req.status === 200) {
                    return parsedResponse;
                } else {
                    return Error(parsedResponse);
                }
            };

        const sync = {
            /**
             * Create like create in Microsoft.Xrm.Sdk
             * @param {Entity} entity
             */
            create: function(entity) {
                const result = executeSync(entity.serialize(), "Create");
                return result && !(result instanceof Error) ? $(result).find("CreateResult").text() : result;
            },

            /**
             * Update like update in Microsoft.Xrm.Sdk
             * @param {Entity} entity
             */
            update: function(entity) {
                const result = executeSync(entity.serialize(), "Update");
                return result && !(result instanceof Error) ? $(result).find("UpdateResponse").text() : result;
            },

            /**
             * Delete like delete in Microsoft.Xrm.Sdk
             * @param {String} entityName
             * @param {Guid} id
             */
            "delete": function(entityName, id) {
                const request = `<entityName>${entityName}</entityName><id>${new self.Guid(id).value}</id>`;
                return executeSync(request, "Delete");
            },

            /**
             * Retrieve like in Microsoft.Xrm.Sdk
             * @param {String} entityName
             * @param {Guid} id
             * @param {Array|ColumnSet} columnSet
             */
            retrieve: function(entityName, id, columnSet) {
                const soapBodyTemplate = compile("<entityName><%= entityName %></entityName><id><%= id %></id><%= columnSet %>");
                if (columnSet && $.isArray(columnSet)) {
                    columnSet = new self.ColumnSet(columnSet);
                    columnSet = columnSet.serialize(false, true);
                } else if (columnSet && columnSet instanceof self.ColumnSet) {
                    columnSet = columnSet.serialize(false, true);
                } else {
                    columnSet = self.ColumnSet.getAllColumnsSoap(false, true);
                }

                const result = executeSync(
                    soapBodyTemplate({
                        entityName: entityName,
                        id: new self.Guid(id).value,
                        columnSet: columnSet
                    }),
                    "Retrieve");

                if (result && result instanceof Error) {
                    return result;
                }

                const retrieveResult = $(result).find("RetrieveResult")[0];
                if (!retrieveResult) {
                    return null;
                }

                return self.Entity.deserialize(retrieveResult);
            },

            /**
             * RetrieveMultiple like in Microsoft.Xrm.Sdk
             * @param {QueryExpression|QueryByAttribute} query Query for perform retrieve operation
             */
            retrieveMultiple: function(query) {
                const result = executeSync(query.serialize(), "RetrieveMultiple");

                if (result && result instanceof Error) {
                    return result;
                }

                const $resultXml = $(result);
                var resultNodes;

                if ($resultXml.find("a\\:Entities").length) {
                    resultNodes = $resultXml.find("a\\:Entities")[0];
                } else {
                    // chrome could not load node properly
                    resultNodes = $resultXml.find("Entities")[0];
                }

                if (!resultNodes) {
                    return [];
                }

                const retrieveMultipleResults = [];
                for (let i = 0, l = resultNodes.childNodes.length; i < l; i++) {
                    retrieveMultipleResults[i] = self.Entity.deserialize(resultNodes.childNodes[i]);
                }

                return retrieveMultipleResults;
            },

            /**
             * Execute like in Microsoft.Xrm.Sdk
             * @param {OrganizationRequest} request
             */
            execute: function(request) {
                return executeSync(request.serialize(), "Execute");
            },

            /**
             * Execute fetch Xml query
             * @param {String} fetchXml Fetch xml expression
             */
            fetch: function(fetchXml) {
                // ToDo: implement fetchXmlBuilder
                const fetchQuery = [
                    `<query i:type='a:FetchExpression' xmlns:a='${contractsXrmNs}'>`,
                    "<a:Query>",
                    crmXmlEncode(fetchXml),
                    "</a:Query>",
                    "</query>"
                ].join("");

                const result = executeSync(fetchQuery, "RetrieveMultiple");

                if (result && result instanceof Error) {
                    return result;
                }

                const $resultXml = $(result);
                const fetchResults = [];
                let fetchResult;
                let $entities = $resultXml.find("a\\:Entities");

                if ($entities.length) {
                    fetchResult = $entities[0];
                } else {
                    $entities = $resultXml.find("Entities");

                    // chrome could not load node
                    fetchResult = $entities[0];
                }

                for (let i = 0, l = fetchResult.childNodes.length; i < l; i++) {
                    fetchResults[fetchResults.length] = self.Entity.deserialize(fetchResult.childNodes[i]);
                }

                return fetchResults;
            }
        };

        var execute = function(soapBody, soapAction, async) {
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

        orgService.prototype.sync = sync;

        /**
         * Create like create in Microsoft.Xrm.Sdk
         * @param {Entity} entity
         * @param {Boolean} async
         */
        orgService.prototype.create = function(entity, async) {
            return execute(entity.serialize(), "Create", async).then(function(resultXml) {
                return resultXml ? $(resultXml).find("CreateResult").text() : null;
            });
        };

        /**
         * Create like create in Microsoft.Xrm.Sdk
         * @param {Entity} entity
         */
        orgService.prototype.createAsync = function(entity) {
            return this.create(entity, true);
        };

        /**
         * Update like update in Microsoft.Xrm.Sdk
         * @param {Entity} entity
         * @param {Boolean} async
         */
        orgService.prototype.update = function(entity, async) {
            return execute(entity.serialize(), "Update", async).then(function(resultXml) {
                return resultXml ? $(resultXml).find("UpdateResponse").text() : null;
            });
        };

        /**
         * Update like update in Microsoft.Xrm.Sdk
         * @param {Entity} entity
         */
        orgService.prototype.updateAsync = function(entity) {
            return this.update(entity, true);
        };

        /**
         * Delete like delete in Microsoft.Xrm.Sdk
         * @param {String} entityName
         * @param {Guid} id
         * @param {Boolean} async
         */
        orgService.prototype.delete = function(entityName, id, async) {
            const request = `<entityName>${entityName}</entityName><id>${new self.Guid(id).value}</id>`;

            return execute(request, "Delete", async);
        };

        /**
         * Delete like delete in Microsoft.Xrm.Sdk
         * @param {String} entityName
         * @param {Guid} id
         */
        orgService.prototype.deleteAsync = function(entityName, id) {
            return this.delete(entityName, id, true);
        };

        /**
         * Retrieve like in Microsoft.Xrm.Sdk
         * @param {String} entityName
         * @param {Guid} id
         * @param {(Array<String>|ColumnSet)} columnSet
         * @param {Boolean} async
         */
        orgService.prototype.retrieve = function(entityName, id, columnSet, async) {
            const soapBodyTemplate = compile("<entityName><%= entityName %></entityName><id><%= id %></id><%= columnSet %>");
            if (columnSet && $.isArray(columnSet)) {
                columnSet = new self.ColumnSet(columnSet);
                columnSet = columnSet.serialize(false, true);
            } else if (columnSet && columnSet instanceof self.ColumnSet) {
                columnSet = columnSet.serialize(false, true);
            } else {
                columnSet = self.ColumnSet.getAllColumnsSoap(false, true);
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

        /**
         * Retrieve like in Microsoft.Xrm.Sdk
         * @param {String} entityName
         * @param {Guid} id
         * @param {(Array<String>|ColumnSet)} columnSet
         */
        orgService.prototype.retrieveAsync = function(entityName, id, columnSet) {
            return this.retrieve(entityName, id, columnSet, true);
        };

        /**
         * RetrieveMultiple like in Microsoft.Xrm.Sdk
         * @param {(QueryExpression|QueryByAttribute))} query - Query for perform retrieve operation
         * @param {Boolean} async
         */
        orgService.prototype.retrieveMultiple = function(query, async) {
            return execute(query.serialize(), "RetrieveMultiple", async).then(function(result) {
                const $resultXml = $(result);
                var resultNodes;

                if ($resultXml.find("a\\:Entities").length) {
                    resultNodes = $resultXml.find("a\\:Entities")[0];
                } else {
                    // chrome could not load node properly
                    resultNodes = $resultXml.find("Entities")[0];
                }

                if (!resultNodes) {
                    return [];
                }

                const retrieveMultipleResults = [];
                for (let i = 0, l = resultNodes.childNodes.length; i < l; i++) {
                    retrieveMultipleResults[i] = self.Entity.deserialize(resultNodes.childNodes[i]);
                }

                return retrieveMultipleResults;
            });
        };

        /**
         * RetrieveMultiple like in Microsoft.Xrm.Sdk
         * @param {(QueryExpression|QueryByAttribute)} query - Query for perform retrieve operation
         */
        orgService.prototype.retrieveMultipleAsync = function(query) {
            return this.retrieveMultiple(query, true);
        };

        /**
         * Execute like in Microsoft.Xrm.Sdk
         * @param {OrganizationRequest} request
         * @param {Boolean} async
         */
        orgService.prototype.execute = function(request, async) {
            return execute(request.serialize(), "Execute", async);
        };

        /**
         * Execute like in Microsoft.Xrm.Sdk
         * @param {OrganizationRequest} request
         */
        orgService.prototype.executeAsync = function(request) {
            return this.execute(request, true);
        };

        /**
         * Execute fetch Xml query
         * @param {String} fetchXml
         * @param {Boolean} async
         */
        orgService.prototype.fetch = function(fetchXml, async) {
            // ToDo: implement fetchXmlBuilder
            const fetchQuery = [
                    `<query i:type='a:FetchExpression' xmlns:a='${contractsXrmNs}'>`,
                        "<a:Query>",
                            crmXmlEncode(fetchXml),
                        "</a:Query>",
                    "</query>"
            ].join("");

            return execute(fetchQuery, "RetrieveMultiple", async).then(function(resultXml) {
                let fetchResult;
                const fetchResults = [];
                let $entities = $(resultXml).find("a\\:Entities");

                if ($entities.length) {
                    fetchResult = $entities[0];
                } else {
                    $entities = $(resultXml).find("Entities");

                    // chrome could not load node
                    fetchResult = $entities[0];
                }

                for (let i = 0, l = fetchResult.childNodes.length; i < l; i++) {
                    fetchResults[fetchResults.length] = self.Entity.deserialize(fetchResult.childNodes[i]);
                }

                return fetchResults;
            });
        };

        /**
         * Execute fetch Xml query
         * @param {String} fetchXml
         */
        orgService.prototype.fetchAsync = function(fetchXml) {
            return this.fetch(fetchXml, true);
        };

        return orgService;
    })();

    this.CrmProvider = (function() {
        const entityMetadataType = "EntityMetadata";
        const orgService = new self.OrganizationService();
        const crmProvider = function() {};

        /**
         * Execute ExecuteWorkflowRequest like in Microsoft.Xrm.Sdk
         * @param {Guid} entityId - Current entity Id
         * @param {Guid} workflowId - Executing workflow Id
         * @param {Boolean} async
         * @returns {Guid} Async operation Id
         */
        crmProvider.prototype.executeWorkflow = function(entityId, workflowId, async) {
            const request = new self.ExecuteWorkflowRequest(entityId, workflowId);

            return orgService.execute(request, async).then(function(result) {
                const $xml = $(typeof(result.xml) === "undefined" ? result : result.xml);
                const id = $xml.find("c\\:value").text() || $xml.find("value").text();

                return id ? new self.Guid(id) : null;
            }).catch(function(err) {
                notify(err);
            });
        };

        /**
         * Execute ExecuteWorkflowRequest like in Microsoft.Xrm.Sdk
         * @param {Guid} entityId - Current entity Id
         * @param {Guid} workflowId - Executing workflow Id
         * @returns {Guid} Async operation Id
         */
        crmProvider.prototype.executeWorkflowAsync = function(entityId, workflowId) {
            return this.executeWorkflow(entityId, workflowId, true);
        };

        /**
         * Obtains user teams
         * @param {Guid} userId - Current user Id
         * @param {ColumnSet=ColumnSet("name")} teamColumnSet
         * @param {Boolean} async
         */
        crmProvider.prototype.getSystemUserTeams = function(userId, teamColumnSet, async) {
            const query = new self.QueryExpression("team", [], teamColumnSet || new self.ColumnSet("name"));
            const linkEntity = new self.LinkEntity("team", "teammembership", "teamid", "teamid", self.JoinOperator.Inner);
            const filterExpression = new self.FilterExpression();

            filterExpression.addCondition(new self.ConditionExpression("systemuserid", self.ConditionOperator.Equal, [new self.Guid(userId)]));
            linkEntity.setLinkCriteria(filterExpression);
            query.addLink(linkEntity);

            return orgService.retrieveMultiple(query, async);
        };

        /**
         * Obtains user teams
         * @param {Guid} userId - Current user Id
         * @param {ColumnSet=ColumnSet("name")} teamColumnSet
         */
        crmProvider.prototype.getSystemUserTeamsAsync = function(userId, teamColumnSet) {
            return this.getSystemUserTeams(userId, teamColumnSet, true);
        };

        /**
         * Obtains user businessunit
         * @param {Guid} userId - Current user Id
         * @param {Boolean} async
         */
        crmProvider.prototype.getSystemUserBusinessUnit = function(userId, async) {
            return orgService.retrieve("systemuser", new self.Guid(userId).value, ["businessunitid"], async).then(function(user) {
                return user.getAttributeValue("businessunitid");
            });
        };

        /**
         * Obtains user businessunit
         * @param {Guid} userId - Current user Id
         */
        crmProvider.prototype.getSystemUserBusinessUnitAsync = function(userId) {
            return this.getSystemUserBusinessUnit(userId, true);
        };

        /**
         * Execute RetrieveSharedPrincipalsAndAccessRequest like in Microsoft.Xrm.Sdk
         * @param {String} entityName - Entity Logical Name
         * @param {Guid} entityId - Entity instance Id for check access
         * @param {Boolean} async
         */
        crmProvider.prototype.retrieveSharedPrincipalsAndAccess = function(entityName, entityId, async) {
            const request = new self.RetrieveSharedPrincipalsAndAccessRequest(entityName, new self.Guid(entityId));

            return orgService.execute(request, async).then(function(result) {
                const sharedAccessRights = [];
                const principalAccess = $(typeof(result.xml) === "undefined" ? result : result.xml).find("PrincipalAccess");
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

        /**
         * Execute RetrieveSharedPrincipalsAndAccessRequest like in Microsoft.Xrm.Sdk
         * @param {String} entityName - Entity Logical Name
         * @param {Guid} entityId - Entity instance Id for check access
         */
        crmProvider.prototype.retrieveSharedPrincipalsAndAccessAsync = function(entityName, entityId) {
            return this.retrieveSharedPrincipalsAndAccess(entityName, entityId, true);
        };

        /**
         * Execute SetStateRequest like in Microsoft.Xrm.Sdk
         * @param {String} entityName
         * @param {Guid} entityId
         * @param {Number} state
         * @param {Number} status
         * @param {Boolean} async
         */
        crmProvider.prototype.setState = function(entityName, entityId, state, status, async) {
            const request = new self.SetStateRequest(entityName, entityId, state, status);

            return orgService.execute(request, async).then(function(result) {
                const $response = $(result).find("ExecuteResult").eq(0);
                return crmXmlDecode($response.text());
            });
        };

        /**
         * Execute SetStateRequest like in Microsoft.Xrm.Sdk
         * @param {String} entityName
         * @param {Guid} entityId
         * @param {Number} state
         * @param {Number} status
         */
        crmProvider.prototype.setStateAsync = function(entityName, entityId, state, status) {
            return this.setState(entityName, entityId, state, status, true);
        };

        /**
         * Obtains entity metadata
         * @param {String} logicalName
         * @param {Array<String>} entityFilters
         * @param {Boolean} retrieveAsIfPublished
         * @param {Boolean} async
         */
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

        /**
         * Obtains entity metadata
         * @param {String} logicalName
         * @param {Array<String>} entityFilters
         * @param {Boolean} retrieveAsIfPublished
         */
        crmProvider.prototype.retrieveEntityMetadataAsync = function(logicalName, entityFilters, retrieveAsIfPublished) {
            return this.retrieveEntityMetadata(logicalName, entityFilters, retrieveAsIfPublished, true);
        };

        /**
         * Obtains entity attribute metadata
         * @param {String} entityLogicalName
         * @param {String} attributeLogicalName
         * @param {Boolean} retrieveAsIfPublished
         * @param {Boolean} async
         */
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

        /**
         * Obtains entity attribute metadata
         * @param {String} entityLogicalName
         * @param {String} attributeLogicalName
         * @param {Boolean} retrieveAsIfPublished
         */
        crmProvider.prototype.retrieveAttributeMetadataAsync = function(entityLogicalName, attributeLogicalName, retrieveAsIfPublished) {
            return this.retrieveAttributeMetadata(entityLogicalName, attributeLogicalName, retrieveAsIfPublished, true);
        };

        /**
         * Obtains all entities metadata
         * @param {Array<String} entityFilters
         * @param {Boolean} retrieveIfPublished
         * @param {Boolean} async
         */
        crmProvider.prototype.retrieveAllEntitiesMetadataAsync = function(entityFilters, retrieveIfPublished) {
            entityFilters = $.isArray(entityFilters) ? entityFilters : [entityFilters];
            entityFilters = entityFilters.join(" ");
            const request = new self.RetrieveAllEntitiesRequest(entityFilters, retrieveIfPublished);

            return orgService.execute(request, true).then(function(result) {
                const $resultXml = $(result);
                const results = [];
                const $metadata = $resultXml.find(`c\\:${entityMetadataType}`);
                const response = $metadata.length ? $metadata : $resultXml.find(entityMetadataType);

                for (let i = 0, l = response.length; i < l; i++) {
                    const a = objectifyNode(response[i]);
                    a._type = entityMetadataType;
                    results[results.length] = a;
                }

                return results;
            });
        };

        /**
         * Execute action request like in Microsoft.Xrm.Sdk
         * Action must return exactly one string parameter. If you want to pass more than one use JSON.
         * @param {String} actionName
         * @param {String} entityName
         * @param {Guid} entityId
         * @param {Array} parameters
         * @param {Boolean} async
         */
        crmProvider.prototype.callAction = function(actionName, entityName, entityId, parameters, async) {
            const request = new self.ExecuteActionRequest(actionName, entityName, entityId, parameters);

            return orgService.execute(request, async).then(function(result) {
                const $response = $(result).find("ExecuteResult").eq(0);
                return crmXmlDecode($response.text());
            }).catch(function(err) {
                notify(`Ошибка:\n${err && err.description ? err.description : err}`);
            });
        };

        /**
         * Execute action request like in Microsoft.Xrm.Sdk
         * Action must return exactly one string parameter. If you want to pass more than one use JSON.
         * @param {String} actionName
         * @param {String} entityName
         * @param {Guid} entityId
         * @param {Array} parameters
         */
        crmProvider.prototype.callActionAsync = function(actionName, entityName, entityId, parameters) {
            return this.callAction(actionName, entityName, entityId, parameters, true);
        };

        /**
         * Execute global action request like in Microsoft.Xrm.Sdk
         * Action must return exactly one string parameter. If you want to pass more than one use JSON.
         * @param {String} actionName
         * @param {Array} parameters
         * @param {Boolean} async
         */
        crmProvider.prototype.callGlobalAction = function(actionName, parameters, async) {
            const request = new self.ExecuteGlobalActionRequest(actionName, parameters);

            return orgService.execute(request, async).then(function(result) {
                const $response = $(result).find("ExecuteResult").eq(0);
                return crmXmlDecode($response.text());
            }).catch(function(err) {
                notify(`Ошибка:\n${err && err.description ? err.description : err}`);
            });
        };

        /**
         * Execute global action request like in Microsoft.Xrm.Sdk
         * Action must return exactly one string parameter. If you want to pass more than one use JSON.
         * @param {String} actionName
         * @param {Array} parameters
         */
        crmProvider.prototype.callGlobalActionAsync = function(actionName, parameters) {
            return this.callGlobalAction(actionName, parameters, true);
        };

        return crmProvider;
    })();
}).call(this.Xrm.Soap.Sdk, this);
