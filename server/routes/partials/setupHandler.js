(function (process) {
    "use strict";

    module.exports = function (app, request) {

        // This code is called only when subscribing the webhook //
        app.get('/setupFB/', function (req, res) {
            console.log("get-start");
            request({
                url: 'https://graph.facebook.com/v2.6/me/messenger_profile',
                qs: {access_token: process.env.FB_TOKEN},
                method: 'POST',
                json: { 
                    "get_started":{
                        "payload":"GET_STARTED_PAYLOAD"
                    }
                }
            }, function (error, response, body) {
                if (error) {
                    console.log('Error sending message: ', error);
                } else if (response.body.error) {
                    console.log('Error: ', response.body.error);
                }
            });
            console.log("greeting");
            request({
                url: 'https://graph.facebook.com/v2.6/me/thread_settings',
                qs: {access_token: process.env.FB_TOKEN},
                method: 'POST',
                json: { 
                    "setting_type":"greeting", 
                    "greeting":{ "text":"A paz do Senhor. Consulte a disponibilidade da cantora com o assistente pessoal." } 
                }
            }, function (error, response, body) {
                if (error) {
                    console.log('Error sending message: ', error);
                } else if (response.body.error) {
                    console.log('Error: ', response.body.error);
                }
            });
            res.send("Sucesso!");
        });  

        // This code is called only when subscribing the webhook //
        app.get('/webhook/', function (req, res) {
            console.log("Validating token");
            if (req.query['hub.verify_token'] === process.env.FB_VERIFY_TOKEN) {
                res.send(req.query['hub.challenge']);
            } else {
                res.send('Error, wrong validation token');
            }
        });         

    };

}(process));