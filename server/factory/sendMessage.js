(function (process) {
    "use strict";

    var request = require("request");

    module.exports = {
        //
        // Busca dados do usuario
        getProfileInfo: function(sender) {
            return new Promise(function (resolve, reject) {
                request({
                    url: 'https://graph.facebook.com/v2.6/' + sender,
                    qs: {access_token: process.env.FB_TOKEN,
                        fields: "first_name,last_name,locale,timezone,gender" },
                    method: 'GET'
                }, function (error, response, body) {
                    //
                    if (error) {
                        return reject(error);
                    } 
                    //
                    body = JSON.parse(body);
                    //
                    if (body.error) {
                        return reject(body.error.message);
                    }
                    //
                    return resolve(body);
                    //
                });
            });
        },
        //
        // Dispara mensagem para facebook
        sendMessage: function(mainJsonData) {
            return new Promise(function (resolve, reject) {
                request({
                    url: 'https://graph.facebook.com/v2.6/me/messages',
                    qs: {access_token: process.env.FB_TOKEN},
                    method: 'POST',
                    json: mainJsonData
                }, function (error, response, body) {
                    if (error) {
                        return reject(error);
                    } else if (response.body.error) {
                        return reject(response.body.error);
                    }
                    //
                    resolve(response.body);
                });
            });
        },
        //
        // Trata a resposta e monta dados para enviar para o facebook (via sendMessage)
        processTextMessage: function(sender, text, context) {
            return new Promise(function (resolve, reject) {
                //
                // Só faz o tratamento especial na mensagem se for o ultimo texto [idx == (text.length - 1)]
                var messageType  = (context.fcb && context.fcb.message_type  ? context.fcb.message_type : null);
                var quickReplies = (context.fcb && context.fcb.quick_replies ? context.fcb.quick_replies : null);
                var senderAction = (context.fcb && context.fcb.sender_action ? context.fcb.sender_action : null); 
                //
                // Mensagem padrão (somente texto)
                var messageData = {
                    text: text
                };
                //
                // Para mostrar aquele botoes pequenos de sugestão
                if(quickReplies)
                {
                    messageData.quick_replies = quickReplies;
                }        
                //
                // Pra mostrar um box com botões
                if(messageType && messageType.type == "button")
                {
                    delete messageData.text;
                    //
                    // inicio generic
                    if(messageType.template_type == "generic")
                    {
                        /*
                        "default_action":
                        {
                        "type": "web_url",
                        "url": "https://peterssendreceiveapp.ngrok.io/view?item=103",
                        "messenger_extensions": true,
                        "webview_height_ratio": "tall",
                        "fallback_url": "https://peterssendreceiveapp.ngrok.io/"
                        },
                        */
                        //
                        console.log("SEND < " + sender + " < " + "button generic");
                        //
                        messageData.attachment = {
                                "type":"template",
                                "payload":{
                                    "template_type":"generic",
                                    "elements":[
                                    {
                                        "title": messageType.title,
                                        "subtitle": messageType.subtitle,
                                        "default_action": messageType.default_action,
                                        "buttons": messageType.buttons
                                    }
                                    ]
                                }
                            }
                    }
                    // fim generic
                    //
                    // inicio button
                    if(messageType.template_type == "button")
                    {
                        //
                        console.log("SEND < " + sender + " < " + "button button");
                        //
                        messageData.attachment = {
                                "type":"template",
                                "payload":{
                                    "template_type":"button",
                                    "text": text,
                                    "buttons": messageType.buttons
                                }
                            }
                    }
                    // fim button
                }
                else
                {
                    console.log("SEND < " + sender + " < " + text);
                }
                //
                // Dispara o processamento
                module.exports.sendMessage({ recipient: {id: sender}, message: messageData }).then(function(body){ 
                    //
                    // Para mostrar uns '...' como se estivesse digitando alguma coisa
                    if(senderAction)
                    {
                        module.exports.sendMessage({
                            recipient: {id: sender},
                            sender_action: senderAction
                        });
                    }
                    //
                    resolve(body);
                    //
                }).catch(function(err){
                    console.log("sendMessage: " + err);
                    reject(err);
                });
            });
        },
        sendTextMessage: function(sender, textArray, context) {
            //return new Promise(function (resolve, reject) {
                //
                // Trata se receber um string em vez de array
                if(typeof textArray === 'string') textArray = [textArray];
                if(!context) context = {};
                //
                // Dispara o fluxo em sequencia (seguindo a ordem do array)
                var initialValue = Promise.resolve();
                return textArray.map(function (text, idx) {
                    return function() {
                        return module.exports.processTextMessage(sender, text, ((idx == textArray.length - 1) ? context : {} ));
                    };
                }).reduce(function(previousValue, currentFunction) {
                    return previousValue.then(currentFunction);
                }, initialValue);
            //});
        }
    };

}(process));