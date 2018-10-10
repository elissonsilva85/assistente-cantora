(function () {
    "use strict";

    module.exports = function(fs) {
        return {
            save: function(sender, contextToSave) {
                return new Promise(function (resolve, reject) {
                    //
                    // Não salva as informações do Facebook no arquivo de controle
                    if(contextToSave.fcb) delete contextToSave.fcb;
                    //
                    try
                    {
                        fs.writeFile(sender + ".json", JSON.stringify(contextToSave), 'utf8', function(err) {
                            console.log("FILE < " + sender + " < File saved");
                            if(err) {
                                return reject(err);
                            }
                            resolve(contextToSave);
                        }); 
                    } catch(e) {
                        reject(e);
                    }
                });
            },
            read: function(sender) {
                return new Promise(function (resolve, reject) {
                    //
                    // Get saved contextToSave
                    var contextReaded = {};
                    try
                    {
                        fs.readFile(sender + ".json", 'utf8', function(err, data) {
                            console.log("FILE > " + sender + " > File readed");
                            //
                            contextReaded = {};
                            if (!err) {
                                try {
                                    contextReaded = JSON.parse(data); //now it an object
                                } catch(e) {
                                    return reject(e);
                                }
                            }
                            //
                            resolve(contextReaded);
                            //
                        });
                    } catch(e) {
                        reject(e);
                    }
                });
            }
        }
    };

}());