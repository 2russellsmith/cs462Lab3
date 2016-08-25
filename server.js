var http = require('http'); 
var session = require('./node_modules/sesh/lib/core').session;
var https = require('https');
var fs = require('fs');
var url = require('url');
var hskey = fs.readFileSync('key/serverKey.pem');
var hscert = fs.readFileSync('key/serverCert.pem')
var directRequest = require('request');
var users = [{name:"Amanda", fourSquare: ""}, {name:"Russell", fourSquare: ""}];
var finished = false;
var globali = 0;
var options = {
    key: hskey,
    cert: hscert
};
var res = "";
    https.createServer(options, function (request, response) {
      session(request, response, function(request, response){
        if(request.url === '/logout'){
          request.session.data.user = "Guest";
          response.writeHead(200, {'Content-Type': 'text/html'});
          response.write('You\'ve been logged out <br><a href="/">Home</a>');
          response.end();
          return;
        }
        if(request.url === "/"){
          var res = "<html><body><h1>Welcome " + request.session.data.user + "</h1>";
          
          if(request.session.data.user == "Guest"){
            res += "<a href='login'> Login </a><br>";
          }else{
            res += "<a href='logout'> Logout </a><br><a href='https://foursquare.com/oauth2/authenticate?client_id=GDWQFO0K1FNYNOI3USBMMKVMVJYHKREA1PSANVIELVGBRTE4&response_type=code&redirect_uri=https://ec2-52-32-241-114.us-west-2.compute.amazonaws.com/codeRedirect'>Connect FourSquare</a><br>";
          }
          res += "<br> <h3>User Pages</h3>"; 
          for(var i = 0; i < users.length; i++){
            res += "<a href='" + users[i].name + "'>" + users[i].name + "</a><br>"; 
          }
          res += "</body></html>";
          response.writeHead(200, {'Content-Type': 'text/html'});
          response.write(res);
          response.end();
          return;
        }
        if(url.parse(request.url).pathname === "/login"){
          var urlParams = require('url').parse(request.url, true).query || {};

          if(typeof urlParams.name != 'undefined'){
            request.session.data.user = urlParams.name;
            response.writeHead(200, {'Content-Type': 'text/html'});
            var exists = false;
            for(var i = 0; i < users.length; i++){
              if(users[i].name == request.session.data.user){
                exists = true;
              }
            }
            if(!exists){
              users.push({name: request.session.data.user, fourSquare: ""});
            }
            response.write('You are now logged in as ' + request.session.data.user + "<br><a href='/'>Home</a>");
            response.end();
          }else if(request.session.data.user == "Guest"){
            response.writeHead(200, {'Content-Type': 'text/html'});
            response.write("Hello, you are a Guest user. Please log in. <br> <form action='login' method='GET'><div>Username:<input type='text' name='name'/></div><input type='submit' /></form>");
            response.end();
          }
          else{
            response.writeHead(200, {'Content-Type': 'text/plain'});
            response.write('Hello, you are ' + request.session.data.user);
            response.end();
          }
        }
        if(url.parse(request.url).pathname === "/success"){
            response.writeHead(200, {'Content-Type': 'text/html'});
            response.write("You are now linked to FourSquare<br><a href='/'>Home</a>");
            response.end();
        }       
        if(url.parse(request.url).pathname === "/codeRedirect"){
          var urlParams = require('url').parse(request.url, true).query || {};
          if(typeof urlParams.code != 'undefined'){
            directRequest('https://foursquare.com/oauth2/access_token?client_id=GDWQFO0K1FNYNOI3USBMMKVMVJYHKREA1PSANVIELVGBRTE4&client_secret=35XGDC33VE3GNDRGV5WLUQFMYTUHKHDLDRAKV5Y5Q3PHGXB1&grant_type=authorization_code&redirect_uri=https://ec2-52-32-241-114.us-west-2.compute.amazonaws.com/tokenRedirect&code=' + urlParams.code, function (error, response, body) {
              if (!error && response.statusCode == 200) {
                var jsonBody = JSON.parse(body);
                for(var i = 0; i < users.length; i++){
                   if(users[i].name == request.session.data.user){
                     users[i].fourSquare = jsonBody.access_token; 
                     console.log(users[i].name + " Has token of :" + jsonBody.access_token); 
                   }
                 }
              }
            });
            response.writeHead(302, {'Location': '/success'});
            
          }else{
            response.writeHead(404);
          }
          response.end(); 
        }
        else{
          res = "<html><h3>Check ins for ";
          for(var i = 0; i < users.length; i++){
            if("/" + users[i].name == url.parse(request.url).pathname){
              response.writeHead(200, {'Content-Type': 'text/html'});
              res += users[i].name + "</h3><br>";
              if(users[i].fourSquare != ""){
                globali = i;
                var checkInURL = 'https://api.foursquare.com/v2/users/self/checkins?oauth_token=' + users[i].fourSquare + '&v=20160101';
                console.log(checkInURL);
                directRequest(checkInURL, function(error, response2, body) {
                  if(!error && response2.statusCode == 200){
                    var jsonBody = JSON.parse(body);
                    if(users[globali].name != request.session.data.user){
                      res += "<hr>1: <br> NAME: " + JSON.stringify(jsonBody.response.checkins.items[0].venue.name) + "<br>Address: " + JSON.stringify(jsonBody.response.checkins.items[0].venue.location.address) + " " + JSON.stringify(jsonBody.response.checkins.items[0].venue.location.city) + ", " + JSON.stringify(jsonBody.response.checkins.items[0].venue.location.state); 
                      console.log(res);
                    }else{
                      for(var j = 0; j < jsonBody.response.checkins.items.length; j++){
                        res += (j+1) + ": <br>NAME: " + JSON.stringify(jsonBody.response.checkins.items[j].venue.name) + "<br>Address: " + JSON.stringify(jsonBody.response.checkins.items[j].venue.location.address) + " " + JSON.stringify(jsonBody.response.checkins.items[j].venue.location.city) + ", " + JSON.stringify(jsonBody.response.checkins.items[j].venue.location.state) + "<br>"; 
                        res += "FULL VENUE DATA: <code>" + JSON.stringify(jsonBody.response.checkins.items[j].venue) + "</code><hr>"; 
                      }
                      console.log(res);
                    }
                    res += "<br><br><br><a href='/'>Home</a></html>";
                    //console.log(res);
                    response.write(res);
                    response.end();
                  }
                });
              }else{
                res += "This User has not linked their foursquare account";
                res += "<br><br><br><a href='/'>Home</a></html>";
                response.write(res);
                response.end();
                return;
              }
            }
          }
        }
   });

    }).listen(443);

    console.log('> four Square running on port 443');

