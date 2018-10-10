(function () {
    "use strict";

    require("dotenv").config({"silent": true});
    var express = require("express"),
        app = express(),
        path = require("path"),
        cfenv = require("cfenv"),
        appEnv = cfenv.getAppEnv(),
        fs = require("fs"),
        bodyParser = require("body-parser"),
        server = require("http").createServer(app),
        request = require("request"),
        wcsFactory = require("./server/factory/conversation")(),
        sendMessageToFB = require("./server/factory/sendMessage"),
        handleContext = require("./server/factory/handleContext")(fs),
        gcalFactory = require("./server/factory/googleCalendar");

    app.use(express.static(path.join(__dirname, "./client/")));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json({limit: "50mb"}));
    app.all("/*", function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
        res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-type, Accept, X-Access-Token, X-Key");

        if (req.method === "OPTIONS") {
            res.status(200).end();
        } else {
            next();
        }
    });
    //
    // Inicializa Google Calendar
    gcalFactory.start();
    //
    // Inicializa rotas
    require("./server/routes/index.script")(app, fs, request, wcsFactory, gcalFactory, sendMessageToFB, handleContext);
    //
    // Tenta pegar as credenciais do proprio ambiente do CF
    try
    {
        process.env.CONV_URL  = appEnv.services.conversation[0].credentials.url;
        process.env.CONV_USER = appEnv.services.conversation[0].credentials.username;
        process.env.CONV_PASS = appEnv.services.conversation[0].credentials.password;
    } catch(e) {
    }
    //
    // Inicializa servidor
    server.listen(appEnv.port, appEnv.bind, function () {
        console.log(appEnv.url);
    });
}());