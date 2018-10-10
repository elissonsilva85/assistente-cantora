(function (process) {
    "use strict";

    module.exports = function (app, fs, request, watsonConversation, googleCalendar, sendMessageToFB, handleContext) {
        var extend = require('util')._extend;

        //
        // Calling Watson Conversation
        var callWatsonConversation = function(sender, estruturaWatsonConversation) {
            watsonConversation
                .sendMessage(estruturaWatsonConversation)
                .then(function (conversationData) {
                    //
                    var context = conversationData.context;
                    //
                    // Envia o array de textos a serem disparados para o messanger
                    var body = conversationData.output.text;
                    //
                    // Salva o contexto do usuário em um arquivo especifico
                    // (extend serve para clonar o objeto, pq ele é alterado dentro do save)
                    handleContext.save(sender,extend({}, context)).then(function() {
                        //
                        // Envia resposta para o facebook
                        return sendMessageToFB.sendTextMessage(sender, body, context);
                    }).then(function(){
                        //
                        // Trata respota do Watson
                        return processWatsonResponse(sender, context);
                    }).catch(function (err) {
                        console.log("watsonConversation (2): " + err);
                    });
                    //
                }).catch(function (err) {
                    console.log("watsonConversation (1): " + err);
                });
        };        

        var processWatsonResponse = function(sender,context) {
            return new Promise(function (resolve, reject) {
                if (context.payload == "GCAL_LIST_NEXT_EVENTS")
                {
                    //
                    console.log("GCAL | " + sender + " | LIST_NEXT_EVENTS");
                    //
                    var maxEvents = 5;
                    googleCalendar.listEvents(maxEvents).then(function(events) {
                        var exibir = [];
                        try
                        {
                            context.qtde = parseInt(context.qtde);
                            if(isNaN(context.qtde)) context.qtde = maxEvents;
                        } catch(e) {
                            context.qtde = maxEvents;
                        }

                        if( context.qtde > maxEvents )
                        {
                            exibir.push("Desculpe, só posso mostrar os proximos "+maxEvents+" compromissos...");
                            context.qtde = maxEvents;
                        }
                        else
                        { 
                            exibir.push("Sem problemas");
                            if(context.qtde == 1)
                                exibir.push("Este é o próximo compromissos da Cantora Kelly:");
                            else
                                exibir.push("Este são os próximos "+context.qtde+" compromissos da Cantora Kelly:");
                        }

                        var addZero = function(i) {
                            if (i < 10) {
                                i = "0" + i;
                            }
                            return i;
                        }

                        var formatDate = function(date) {
                            var monthNames = [
                                "jan", "fev", "mar",
                                "abr", "mai", "jun", "jul",
                                "ago", "set", "out",
                                "nov", "dez"
                            ];

                            var day = date.getDate();
                            var monthIndex = date.getMonth();
                            var year = date.getFullYear();
                            var hour = date.getHours();
                            var minute = date.getMinutes();

                            return addZero(day) + '/' + monthNames[monthIndex] + " as " + addZero(hour) + ":" + addZero(minute);
                        }

                        for (var i = 0; i < context.qtde; i++) {
                            var event = events[i];
                            var start = new Date(event.start.dateTime || event.start.date);
                            exibir.push((i+1) + ". " + formatDate(start) + " - " + (event.summary || "Ainda não confirmado") );
                        }
                        
                        return sendMessageToFB.sendTextMessage(sender, exibir);

                    }).catch(function(err) {
                        console.log("listEvents: " + err);
                        return sendMessageToFB.sendTextMessage(sender, "Me desculpe, tivemos um problema ao analisar os compromissos da cantora.\nTente novamente mais tarde.");
                    });
                    //
                }
                else if (context.payload == "GCAL_SEARCH_AVAILABILITY")
                {
                    var dataRange = {
                        inicio: context.agenda_data + "T" + context.agenda_hora_inicio + "-0300",
                        fim: context.agenda_data + "T" + context.agenda_hora_fim + "-0300"
                    };
                    //
                    console.log("GCAL | " + sender + " | SEARCH_AVAILABILITY ("+dataRange.inicio+")("+dataRange.fim+")");
                    //
                    googleCalendar.checkAvailability(dataRange).then(function(avaliable) {
                        console.log("GCAL | " + sender + " | SEARCH_AVAILABILITY ("+avaliable+")");

                        context.payload = (avaliable ? "DISPONIVEL" : "INDISPONIVEL");
                        
                        var estruturaWatsonConversation = {
                            "input":{  
                                "text": context.payload
                            },
                            "context": context
                        };                        

                        callWatsonConversation(sender, estruturaWatsonConversation);
                    }).catch(function(err) {
                        if(err.message) err = err.message;
                        console.log("GCAL | " + sender + " | SEARCH_AVAILABILITY ! ("+err+")");
                        sendMessageToFB.sendTextMessage(sender, "Desculpe ... ocorreu um erro ao verificar a agenda da cantora.\nTente novamente.");
                    });
                    //
                }
                else if (context.payload == "GCAL_SAVE_EVENT")
                {
                    console.log("GCAL | " + sender + " | SAVE_EVENT");
                    //
                    var data = context.agenda_data;
                    var inicio = context.agenda_hora_inicio;
                    var fim = context.agenda_hora_inicio;
                    var titulo = "[ASSISTENTE] " + context.nome_evento;
                    var contato = context.nome_contato_full;
                    var igreja = context.nome_igreja;
                    var local  = context.local_igreja;
                    var descr = "Criado em: " + (new Date()).toDateString() + "\nContato: " + contato + "\nIgreja: " + igreja;

                    var eventData = {
                        'summary': titulo,
                        'location': local,
                        'description': descr,
                        'start': {
                            'dateTime': data + 'T' + inicio + '-03:00',
                            'timeZone': 'America/Sao_Paulo',
                        },
                        'end': {
                            'dateTime': data + 'T' + fim + '-03:00',
                            'timeZone': 'America/Sao_Paulo',
                        },
                        'endTimeUnspecified': true,
                        'reminders': {
                            'useDefault': false,
                            'overrides': [
                            {'method': 'email', 'minutes': 24 * 60},
                            {'method': 'popup', 'minutes': 10},
                            ],
                        }
                    }

                    // Se o local foi marcado com uma localização de latitude e longituda, então busca o endereço
                    if(context.hasLocation)
                    {
                        eventData.description += "\nEndereço: " + "(BUSCAR PELA LATITUDE E LONGITUDE)";
                    }

                    googleCalendar.insertEvent(eventData).then(function(eventReturn) {
                        console.log("GCAL | " + sender + " | SAVE_EVENT ("+eventReturn.htmlLink+")");

                        context.payload = "AGENDA_MARCADA";
                        var estruturaWatsonConversation = {
                            "input":{  
                                "text": "Agenda marcada"
                            },
                            "context": context
                        };  
                        callWatsonConversation(sender, estruturaWatsonConversation);
                        
                    }).catch(function(err) {
                        console.log("GCAL | " + sender + " | SAVE_EVENT ! ("+err+")");
                        //
                        context.payload = "";
                        var estruturaWatsonConversation = {
                            "input":{  
                                "text": "Erro ao salvar"
                            },
                            "context": context
                        };
                        callWatsonConversation(sender, estruturaWatsonConversation);
                        //
                    });
                }
            });
        }

        app.post("/contextTest/", function (req, res) {
            var messaging_events = req.body.entry[0].messaging;
            for (var i = 0; i < messaging_events.length; i++) {
                var event = req.body.entry[0].messaging[i];
                var sender = event.sender.id;
                var context = event.context;

                processWatsonResponse(sender,context);

            }
            res.sendStatus(200);
        });

        app.post("/webhook/", function (req, res) {
            console.log(JSON.stringify(req.body));
            var messaging_events = req.body.entry[0].messaging;
            for (var i = 0; i < messaging_events.length; i++) {
                var event = req.body.entry[0].messaging[i];
                var sender = event.sender.id;
                //
                console.log("RECV > " + sender + " > " + (event.message && event.message.text ? event.message.text : ""));
                //
                // Get saved context
                handleContext.read(sender).then(function(context){
                    //
                    // Seta o timezone fixo (por enquanto) (precisa pegar do cliente)
                    context.timezone = "America/Sao_Paulo";
                    context.hasLocation = false;
                    //
                    // Trata paylod
                    if (event.postback && event.postback.payload) {
                        context.payload = event.postback.payload;
                    }
                    else if (event.message && event.message.quick_reply && event.message.quick_reply.payload) {
                        context.payload = event.message.quick_reply.payload;
                    }
                    else {
                        context.payload = "";
                    }
                    //
                    // Trata primeiro acesso
                    var estruturaWatsonConversation = {};
                    if(context.payload == "GET_STARTED_PAYLOAD")
                    {
                        // E perguntar como quer que seja chamado (por exemplo com um nome mais curto)
                        //
                        // Define a estrutura padrão para iniciar a conversa
                        estruturaWatsonConversation = {
                            "input": {
                                "text": ""
                            }, 
                            "context": {
                                "timezone": "America/Sao_Paulo"
                            }, 
                            "alternate_intents": true
                        };

                        //
                        // Pegar o nome e sexo do usuario no facebook
                        sendMessageToFB.getProfileInfo(sender).then(function(body){ 
                            try{
                                estruturaWatsonConversation.context.nome_contato = body.first_name;
                                estruturaWatsonConversation.context.nome_contato_full = body.first_name + " " + body.last_name;
                                estruturaWatsonConversation.context.genero = body.gender;
                            } catch(e) { }
                            
                            callWatsonConversation(sender, estruturaWatsonConversation);
                        }).catch(function(err) {
                            console.log("getProfileInfo (1): " + err);
                        });
                        
                    }
                    // Trata se receber uma localização
                    else if(event.message && event.message.attachments && event.message.attachments[0].type == "location")
                    {
                        context.hasLocation = true;
                        //
                        var lat = event.message.attachments[0].payload.coordinates.lat;
                        var lon = event.message.attachments[0].payload.coordinates.long;
                        //
                        estruturaWatsonConversation = {
                            "input": {
                                "text": lat + ", " + lon
                            },
                            "alternate_intents": true,
                            "context": context,
                            "workspace_id": ""
                        };
                        //
                        callWatsonConversation(sender, estruturaWatsonConversation);
                        //
                    }
                    // Trata se receber uma mensagem de texto
                    else if (event.message && event.message.text)
                    {
                        //
                        estruturaWatsonConversation = {
                            "input": {
                                "text": event.message.text
                            },
                            "alternate_intents": true,
                            "context": context,
                            "workspace_id": ""
                        };
                        //                    
                        // Trata se nao tenho a informação de genero e nome
                        if (!context || !context.genero )
                        {
                            //
                            // Pegar o nome e sexo do usuario no facebook e depois manda o texto para o watson
                            sendMessageToFB.getProfileInfo(sender).then(function(body){ 
                                try{
                                    estruturaWatsonConversation.context.nome_contato = body.first_name;
                                    estruturaWatsonConversation.context.nome_contato_full = body.first_name + " " + body.last_name;
                                    estruturaWatsonConversation.context.genero = body.gender;
                                } catch(e) { }
                                
                                callWatsonConversation(sender, estruturaWatsonConversation);
                            }).catch(function(err) {
                                console.log("getProfileInfo (2): " + err);
                            });
                        }
                        else
                        {
                            //
                            // Se ja tem os dados, entao manda o texto direto
                            callWatsonConversation(sender, estruturaWatsonConversation);
                        }
                        //
                    }
                    // Fim

                }); 
            }
            res.sendStatus(200);
        });

    };

}(process));