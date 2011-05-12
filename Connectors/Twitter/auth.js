/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
var fs = require("fs");

var uri,
    completedCallback = null;

exports.auth = {};
exports.isAuthed = function() {
    console.error('isAuthed!');
    try {
        if(!exports.hasOwnProperty("auth"))
            exports.auth = {};
        
        // Already have the stuff read
        if(exports.auth.hasOwnProperty("consumerKey") && 
           exports.auth.hasOwnProperty("consumerSecret") && 
           exports.auth.hasOwnProperty("token")) {
            return true;
        }
        // Try and read it in
        var authData = JSON.parse(fs.readFileSync("auth.json"));
        if(authData.hasOwnProperty("consumerKey") && 
           authData.hasOwnProperty("consumerSecret") && 
           authData.hasOwnProperty("token")) {
            exports.auth = authData;
            return true;
        }
    } catch (E) {
        // TODO:  Could actually check the error type here
    }
    return false;
}


exports.authAndRun = function(app, onCompletedCallback) {
    if (exports.isAuthed()) {
        console.error('authAndRun gives isAuthed = true');
        onCompletedCallback();
        return;
    }
    uri = app.meData.uri;
    console.error('authAndRun gives isAuthed = false');
    completedCallback = onCompletedCallback;
    app.get("/auth", handleAuth);
    app.get("/saveAuth", saveAuth);
}

function handleAuth(req, res) {
    if(!exports.auth)
        exports.auth = {};
        
    if(!(exports.auth.hasOwnProperty("consumerKey") && 
         exports.auth.hasOwnProperty("consumerSecret"))) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end("<html>Enter your personal Twitter app info that will be used to sync your data" + 
                " (create a new one <a href='http://dev.twitter.com/apps/new'>here</a> " +
                "using the callback url of http://"+url.parse(uri).host.replace("localhost", "127.0.0.1")+"/) " +
                "<form method='get' action='saveAuth'>" +
                    "Consumer Key: <input name='consumerKey'><br>" +
                    "Consumer Secret: <input name='consumerSecret'><br>" +
                    "<input type='submit' value='Save'>" +
                "</form></html>");
    } else if(!exports.auth.token) {
        require('./twitter_client')(exports.auth.consumerKey, exports.auth.consumerSecret, uri + 'auth')
            .getAccessToken(req, res, function(err, newToken) {
            if(err)
                console.error(err);
            if(newToken != null) {
                exports.auth.token = newToken;
                fs.writeFileSync('auth.json', JSON.stringify(exports.auth));
                res.redirect(uri);
                completedCallback();
            }
        });    
    } else { 
        completedCallback();
    }
}

function saveAuth(req, res) {
    if(!req.param('consumerKey') || !req.param('consumerSecret')) {
        res.writeHead(400);
        res.end("missing field(s)?");
    } else {
        res.writeHead(200, {'Content-Type': 'text/html'});
        exports.auth.consumerKey = req.param('consumerKey');
        exports.auth.consumerSecret = req.param('consumerSecret');
        res.end("<html>thanks, now we need to <a href='./auth'>auth that app to your account</a>.</html>");
    }
}
