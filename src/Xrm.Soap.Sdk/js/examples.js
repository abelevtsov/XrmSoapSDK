/**
 * This file contains examples of usage Xrm.Soap.Sdk library now using es6 features, Promise API for example
*/
define(["soap"], function(soap) {
    "use strict";
    var orgService,
        crmProvider,

        // ReSharper disable InconsistentNaming
        OrganizationService = soap.OrganizationService,
        CrmProvider = soap.CrmProvider,
        QueryByAttribute = soap.QueryByAttribute,
        QueryExpression = soap.QueryExpression,
        ConditionExpression = soap.ConditionExpression,
        OrderExpression = soap.OrderExpression,
        ColumnSet = soap.ColumnSet,
        Entity = soap.Entity,
        EntityReference = soap.EntityReference,
        Guid = soap.Guid,
        contactState = {
            Active: 0,
            Inactive: 1
        },

        fetchExample = function() {
            /* eslint-disable */
            const fetchXml = [
                "<fetch version='1.0' output-format='xml-platform' mapping='logical' distinct='false'>",
                    "<entity name='contact'>",
                    "<attribute name='fullname'/>",
                    "<attribute name='ownerid'/>",
                    "<order attribute='fullname' descending='false'/>",
                    "<filter type='and'>",
                        "<condition attribute='statecode' operator='eq' value='0'/>",
                    "</filter>",
                    "<link-entity name='systemuser' from='systemuserid' to='owninguser' visible='false' link-type='outer' alias='aa'>",
                        "<attribute name='internalemailaddress'/>",
                    "</link-entity>",
                    "</entity>",
                "</fetch>"
            ].join("");
            /* eslint-enable */
            orgService.fetch(fetchXml).then(function(contacts) {
                for (let i = 0, l = contacts.length; i < l; i++) {
                    const contact = contacts[i];
                    console.table({
                        fullName: contact.getAttributeValue("fullname"),
                        internalEmailAddress: contact.getAttributeValue("aa.internalemailaddress")
                    });
                }
            });
        },

        fetchAsyncExample = function() {
            /* eslint-disable */
            const fetchXml = [
                "<fetch version='1.0' output-format='xml-platform' mapping='logical' distinct='false'>",
                    "<entity name='contact'>",
                        "<attribute name='fullname'/>",
                        "<attribute name='ownerid'/>",
                        "<order attribute='fullname' descending='false'/>",
                        "<filter type='and'>",
                            "<condition attribute='statecode' operator='eq' value='0'/>",
                        "</filter>",
                        "<link-entity name='systemuser' from='systemuserid' to='owninguser' visible='false' link-type='outer' alias='aa'>",
                            "<attribute name='internalemailaddress'/>",
                        "</link-entity>",
                    "</entity>",
                "</fetch>"
            ].join("");

            /* eslint-enable */
            orgService.fetchAsync(fetchXml).then(function(contacts) {
                for (let i = 0, l = contacts.length; i < l; i++) {
                    const contact = contacts[i];
                    console.table({
                        fullName: contact.getAttributeValue("fullname"),
                        internalEmailAddress: contact.getAttributeValue("aa.internalemailaddress")
                    });
                }
            });
        },

        queryByAttributeExample = function() {
            var query = new QueryByAttribute("contact", ["firstname"], ["test"], new ColumnSet("fullname"));
            orgService.retrieveMultiple(query).then(function(contacts) {
                for (let i = 0, l = contacts.length; i < l; i++) {
                    console.log(`FullName: ${contacts[i].getAttributeValue("fullname")}`);
                }
            }).then(function() {
                query = new QueryByAttribute("contact", ["contactid"], ["dcbfe8f3-c5c0-e311-9777-00155d011e01"], new ColumnSet("firstname"), 1);
                orgService.retrieveMultiple(query).then(function(contacts) {
                    if (contacts.length) {
                        console.log(`FirstName: ${contacts[0].getAttributeValue("firstname")}`);
                    }
                });
            });
        },

        queryByAttributeAsyncExample = function() {
            var query = new QueryByAttribute("contact", ["firstname"], ["test"], new ColumnSet("fullname"));
            orgService.retrieveMultipleAsync(query).then(function(contacts) {
                for (let i = 0, l = contacts.length; i < l; i++) {
                    console.log(`FullName: ${contacts[i].getAttributeValue("fullname")}`);
                }
            }).then(function() {
                query = new QueryByAttribute("contact", ["contactid"], ["dcbfe8f3-c5c0-e311-9777-00155d011e01"], new ColumnSet("firstname"), 1);
                orgService.retrieveMultipleAsync(query).then(function(contacts) {
                    if (contacts.length) {
                        console.log(`FirstName: ${contacts[0].getAttributeValue("firstname")}`);
                    }
                });
            });
        },

        queryExpressionExample = function() {
            const query = new QueryExpression(
                "contact",
                [
                    new ConditionExpression("middlename", soap.ConditionOperator.NotNull),
                    new ConditionExpression("statecode", soap.ConditionOperator.Equal, [new soap.StateCode(contactState.Active)])
                ],
                new ColumnSet(true));

            orgService.retrieveMultiple(query).then(function(contacts) {
                for (let i = 0, l = contacts.length; i < l; i++) {
                    console.log(`FullName: ${contacts[i].getAttributeValue("fullname")}`);
                }
            }).then(function() {
                const now = (new Date()).toISOString();
                query = new QueryExpression(
                    "pricelevel",
                    [
                        new ConditionExpression("statuscode", soap.ConditionOperator.Equal, [100001]),
                        new ConditionExpression("begindate", soap.ConditionOperator.LessEqual, [now]),
                        new ConditionExpression("enddate", soap.ConditionOperator.GreaterEqual, [now])
                    ],
                    new ColumnSet("name"));

                const linkVatrate = new soap.LinkEntity("pricelevel", "new_vatrate", "new_vatrate", "new_vatrateid", soap.JoinOperator.LeftOuter);
                linkVatrate.setColumns(new ColumnSet("new_vatrate"));

                query.addLink(linkVatrate);
                query.noLock(true);
                query.addOrders(
                    new OrderExpression("name", soap.OrderType.Ascending),
                    new OrderExpression("enddate", soap.OrderType.Descending));

                orgService.retrieveMultipleAsync(query).then(function(activePriceLevels) {
                    for (let i = 0, l = activePriceLevels.length; i < l; i++) {
                        console.log(`Active PriceLevel name is '${activePriceLevels[i].getAttributeValue("name")}'`);
                    }
                });
            });
        },

        crmProviderExample = function() {
            crmProvider.retrieveAllEntitiesMetadataAsync(soap.EntityFilters.All, true).then(function(allEntitiesMetadata) {
                console.log(allEntitiesMetadata);
            }).then(function() {
                crmProvider.retrieveEntityMetadataAsync(soap.EntityFilters.All, "contact", true).then(function(contactMetadata) {
                    console.log(contactMetadata);
                });
            }).then(function() {
                crmProvider.retrieveAttributeMetadata("contact", "firstname", true).then(function(contactFirstNameAttributeMetadata) {
                    console.log(contactFirstNameAttributeMetadata);
                });
            }).then(function() {
                crmProvider.retrieveSharedPrincipalsAndAccess("dcbfe8f3-c5c0-e311-9777-00155d011e01", "contact").then(function(sharedAccesses) {
                    console.log(sharedAccesses);
                });
            }).then(function() {
                const currentUserId = Xrm.Page.context.getUserId();
                crmProvider.getSystemUserTeams(currentUserId).then(function(userTeams) {
                    console.log(userTeams);
                    return currentUserId;
                }).then(function(userId) {
                    crmProvider.getSystemUserBusinessUnit(userId).then(function(currentUserBusinessUnit) {
                        console.log(currentUserBusinessUnit);
                    });
                });
            }).catch(function(err) {
                console.error(err);
                crmProvider.executeWorkflowAsync("dcbfe8f3-c5c0-e311-9777-00155d011e01", "2099D78C-94BF-4494-A21E-6ED46C111C98").then(function(asyncOperationId) {
                    console.log(asyncOperationId);
                });
            });
        },

        callCustomActionExample = function() {
            const leadId = soap.Guid.empty();
            // pass entity logical name and Id
            crmProvider.callActionAsync("new_NotifyLead", "lead", new soap.Guid(leadId), [new soap.RequestParameter("Message", "TEST MESSAGE")]).then(function(result) {
                console.log(result);
            });

            // without pass entity logical name and Id
            crmProvider.callGlobalActionAsync("new_Trigger_Annoying_Notifications", [new soap.RequestParameter("Message", "TEST MESSAGE")]).then(function(result) {
                console.log(result);
            });
        },

        crudExample = function() {
            const contact = new Entity("contact");
            contact.setAttribute("parentcustomerid", new EntityReference("account", new Guid("8A2C9BB0-2E7D-E311-A409-00155D011E01")));
            contact.setAttribute("firstname", "test");
            contact.setAttribute("new_int", 123);
            contact.setAttribute("new_float", 123.55);
            contact.setAttribute("new_bool", true);
            contact.setAttribute("new_decimal", new soap.Decimal(222.33));
            contact.setAttribute("new_currency", new soap.Money(555.55));
            contact.setAttribute("new_datetime", new Date());
            contact.setAttribute("new_optionset", new soap.OptionSetValue(2, "Recalculate"));
            orgService.create(contact).then(function(contactId) {
                const contactWithMiddleName = new Entity("contact", contactId);
                contactWithMiddleName.setAttribute("middlename", "testovich");
                return contactWithMiddleName;
            }).then(function(contactWithMiddleName) {
                orgService.updateAsync(contactWithMiddleName).catch(function(err) {
                    Xrm.Utility.alertDialog(`Contact update failed:${err}`);
                });
            }).then(function() {
                orgService.delete(contact.logicalName(), contact.getId());
            });

            // working with Activity
            orgService.createAsync(new Entity("phonecall")).then(function(phonecallId) {
                const from = contact.toEntityReference();
                const phonecall = new Entity("phonecall", phonecallId);
                phonecall.setAttribute("from", new soap.EntityCollection([from]));
                orgService.updateAsync(phonecall).then(function() {
                    orgService.delete(phonecall.logicalName(), phonecall.getId());
                });
            });
        },

        runExamples = function() {
            fetchExample();

            fetchAsyncExample();

            queryByAttributeExample();

            queryByAttributeAsyncExample();

            queryExpressionExample();

            crmProviderExample();

            crudExample();

            orgService.retrieve("contact", "8A2C9BB0-2E7D-E311-A409-00155D011E01", ["firstname", "lastname"]).then(function(contact) {
                console.log(`Contact name is '${contact.getAttributeValue("firstname")}'`);
            });

            // working with ActivityParties
            orgService.retrieveAsync("phonecall", "8A2C9BB0-2E7D-E311-A409-00155D011E01", ["to", "from", "regardingobjectid"]).then(function(phonecall) {
                return phonecall.getAttributeValue("to");
            }).then(function(to) {
                for (let i = 0, l = to.length; i < l; i++) {
                    console.log(`PhoneCall recipient ${i}: '${to[i].getName()}'`);
                }
            });

            callCustomActionExample();
        },

        init = function() {
            orgService = orgService || new OrganizationService();
            crmProvider = crmProvider || new CrmProvider();
        };

    return {
        init: init,
        runExamples: runExamples
    };
});
