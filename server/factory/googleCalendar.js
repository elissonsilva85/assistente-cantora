(function (process) {
    "use strict";

    var fs = require('fs'),
        readline = require('readline'),
        google = require('googleapis'),
        googleAuth = require('google-auth-library');

    module.exports = {
        TOKEN_DIR: process.env.GCAL_TOKEN_DIR,
        TOKEN_PATH: process.env.GCAL_TOKEN_DIR + process.env.GCAL_TOKEN_FILE,
        authClient: null,
        /*
        start: function() {
            // Load client secrets from a local file.
            fs.readFile('client_secret.json', function processClientSecrets(err, content) {
                if (err) {
                    console.log('Error loading client secret file: ' + err);
                    return;
                }
                var CLIENT_SECRET = JSON.parse(content);
                module.exports.authorize(CLIENT_SECRET);
            });
        },
        */
        start: function() {
            // Create the JWT client
            var authClient = new google.auth.JWT(
                "cantora-kelly-silva@appspot.gserviceaccount.com", 
                module.exports.TOKEN_PATH, 
                "",
                ['https://www.googleapis.com/auth/calendar']);

            // Authorize it to produce an access token
            authClient.authorize(function(err, tokens) {
                if(err) {
                    console.log("authClient: " + err);
                    return;
                }

                module.exports.authClient = authClient;
            });
        },
        listEvents: function(max) {
            return new Promise(function (resolve, reject) {
                var calendar = google.calendar('v3');
                calendar.events.list({
                    auth: module.exports.authClient,
                    calendarId: process.env.GCAL_CALENDAR_ID,
                    timeMin: (new Date()).toISOString(),
                    maxResults: max || 10,
                    singleEvents: true,
                    orderBy: 'startTime'
                }, function(err, response) {
                    if (err) {
                        return reject(err);
                    }
                    var events = response.items;
                    return resolve(events);
                });
            });
        },
        insertEvent: function(eventData) {
            return new Promise(function (resolve, reject) {
                var calendar = google.calendar('v3');
                calendar.events.insert({
                    auth: module.exports.authClient,
                    calendarId: process.env.GCAL_CALENDAR_ID,
                    resource: eventData
                }, function(err, event) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(event);
                });
            });
        },
        checkAvailability: function(dataRange) {
            return new Promise(function (resolve, reject) {
                var calendar = google.calendar('v3');
                calendar.freebusy.query({
                    auth: module.exports.authClient,
                    headers: { "content-type" : "application/json" },
                    resource: {
                        items: [{ id: process.env.GCAL_CALENDAR_ID }],
                        timeMin: dataRange.inicio,
                        timeMax: dataRange.fim
                    }
                }, function(err, response) {
                    if (err) {
                        return reject(err);
                    }
                    var busy = response.calendars[process.env.GCAL_CALENDAR_ID].busy;
                    resolve((busy.length == 0));
                });
            });
        }
    };

}(process));