var express = require('express');
var app = express();
var path = require('path');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var players = require('./app/players.js');
app.use(express.static('public'));
io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
  socket.on('chat message', function(msg){
  	console.log(msg);
    io.emit('chat message', msg);
  });
  socket.emit("Current Player", players()[0]);
});
app.get('/', function (req, res) {
  res.sendFile('index.html', { root: path.join(__dirname, '/public') })
});
http.listen(8000, function () {
  console.log('Example app listening on port 8000!');
});