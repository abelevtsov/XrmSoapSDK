; define(["soap"], function(soap) {
    ///<summary>
    /// This file contains examples of usage Xrm.Soap library
    ///</summary>
    var xrmPage,
        orgService,
        crmProvider,
        // ReSharper disable InconsistentNaming
        QueryByAttribute = soap.QueryByAttribute,
        QueryExpression = soap.QueryExpression,
        ConditionExpression = soap.ConditionExpression,
        ColumnSet = soap.ColumnSet,
        Entity = soap.Entity,
        EntityReference = soap.EntityReference,
        Guid = soap.Guid,

        fetchTest = function() {
            var fetchXml = [
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
                "</fetch>"].join(""),
                contacts = orgService.Fetch(fetchXml);

            for (var i = 0, l = contacts.length; i < l; i++) {
                var contact = contacts[i];
                console.log([
                        "FullName: " + contact.getAttributeValue("fullname"),
                        "Owner email: " + contact.getAttributeValue("aa.internalemailaddress")
                    ].join("\n"));
            }
        },

        queryByAttributeExample = function() {
            var query = new QueryByAttribute("contact", ["firstname"], ["test"], new ColumnSet("fullname")),
                contacts = orgService.RetrieveMultiple(query);

            for (var i = 0, l = contacts.length; i < l; i++) {
                console.log("FullName: " + contacts[i].getAttributeValue("fullname"));
            }

            query = new QueryByAttribute("contact", ["contactid"], ["dcbfe8f3-c5c0-e311-9777-00155d011e01"], new ColumnSet("firstname"), 1);
            contacts = orgService.RetrieveMultiple(query);
            if (contacts.length) {
                console.log("FirstName: " + contacts[0].getAttributeValue("firstname"));
            }
        },

        queryExpressionExample = function() {
            var i, l,
                query = new QueryExpression("contact", [new ConditionExpression("middlename", soap.ConditionOperator.NotNull)], new ColumnSet(true)),
                contacts = orgService.RetrieveMultiple(query);

            for (i = 0, l = contacts.length; i < l; i++) {
                console.log("FullName: " + contacts[i].getAttributeValue("fullname"));
            }

            var now = (new Date()).toISOString();

            query = new QueryExpression(
                "pricelevel",
                [
                    new ConditionExpression("statuscode", soap.ConditionOperator.Equal, [100001]),
                    new ConditionExpression("begindate", soap.ConditionOperator.LessEqual, [now]),
                    new ConditionExpression("enddate", soap.ConditionOperator.GreaterEqual, [now])
                ],
                new ColumnSet("name"));

            var linkVatrate = new soap.LinkEntity("pricelevel", "wm_vatrate", "wm_vatrate", "wm_vatrateid", soap.JoinOperator.LeftOuter);
            linkVatrate.SetColumns(new ColumnSet("wm_vatrate"));

            query.AddLink(linkVatrate);
            query.NoLock(true);
            query.AddOrders(
                new soap.OrderExpression("name", soap.OrderType.Ascending),
                new soap.OrderExpression("enddate", soap.OrderType.Descending));

            var activePriceLevels = orgService.RetrieveMultiple(query);
            for (i = 0, l = activePriceLevels.length; i < l; i++) {
                console.log("Active PriceLevel name is '" + activePriceLevels[i].getAttributeValue("name") + "'");
            }
        },

        crmProviderExample = function() {
            var currentUserId = Xrm.Page.context.getUserId();
            var allEntitiesMetadata = crmProvider.RetrieveAllEntitiesMetadata(soap.EntityFilters.All, true);
            var contactMetadata = crmProvider.RetrieveEntityMetadata(soap.EntityFilters.All, "contact", true);
            var contactFirstnameAttributeMetadata = crmProvider.RetrieveAttributeMetadata("contact", "firstname", true);
            var sharedAccesses = crmProvider.RetrieveSharedPrincipalsAndAccess("dcbfe8f3-c5c0-e311-9777-00155d011e01", "contact");
            var currentUserTeams = crmProvider.GetSystemUserTeams(currentUserId);
            var currentUserBusinessunit = crmProvider.GetSystemUserBusinessUnit(currentUserId);
            var asyncOperationId = crmProvider.ExecuteWorkflow("dcbfe8f3-c5c0-e311-9777-00155d011e01", "2099D78C-94BF-4494-A21E-6ED46C111C98");
        },

        crudExample = function() {
            var entity = new Entity("contact");
            entity.setAttribute("parentcustomerid", new EntityReference("account", new Guid("8A2C9BB0-2E7D-E311-A409-00155D011E01")));
            entity.setAttribute("firstname", "test");
            entity.setAttribute("rare_int", 123);
            entity.setAttribute("rare_float", 123.55);
            entity.setAttribute("rare_decimal", new soap.Decimal(222.33));
            entity.setAttribute("rare_currency", new soap.Money(555.55));
            entity.setAttribute("rare_datetime", new Date());
            entity.setAttribute("rare_optionset", new soap.OptionSetValue(2, "Перерасчет по факту поставки"));
            var id = orgService.Create(entity);

            entity = new Entity("contact", id);
            entity.setAttribute("middlename", "testovich");
            orgService.Update(entity);

            orgService.Delete("contact", new Guid(id));
        },

        test = function() {
            fetchExample();

            queryByAttributeExample();

            queryExpressionExample();

            crmProviderExample();

            crudExample();

            var contact = orgService.Retrieve("contact", "8A2C9BB0-2E7D-E311-A409-00155D011E01", ["firstname", "lastname"]);
            console.log("Contact name is '" + contact.getAttributeValue("firstname") + "'");
        },

        init = function() {
            xrmPage = xrmPage || Xrm.Page;
            orgService = orgService || soap.GetOrganizationService();
            crmProvider = crmProvider || soap.GetCrmProvider();
        };

    return {
        init: init,
        test: test
    }
});
