(function () {
    "use strict";

    var watsonRoutes = require("./partials/watsonHandler"),
        setupRoutes = require("./partials/setupHandler");

    module.exports = function (app, fs, request, conversation, googleCalendar, sendMessageToFB, handleContext) {
        watsonRoutes(app, fs, request, conversation, googleCalendar, sendMessageToFB, handleContext);
        setupRoutes(app, request);
    };

}());