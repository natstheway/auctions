var express = require('express');
var app = express();
var path = require('path');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var players = require('./app/players.js');
app.use(express.static('public'));
var playerList = players.getAllPlayers();
var currentPlayerIndex = 0;
var timer = null;
var setExpiration = function () {
  clearTimeout(timer);
  timer = setTimeout(function () {
    io.emit("Timer Stop");
    if (playerList[currentPlayerIndex].team) {
       playerList[currentPlayerIndex].status = "sold";
       io.emit('bid message',  playerList[currentPlayerIndex].name + ' sold to ' + playerList[currentPlayerIndex].team);
    } else {
      playerList[currentPlayerIndex].status = "unsold";
      io.emit('bid message',  playerList[currentPlayerIndex].name + ' is unsold');
    }
    io.emit('player update', playerList[currentPlayerIndex]);
    if (currentPlayerIndex < playerList.length - 1) {
      currentPlayerIndex = currentPlayerIndex + 1;
      io.emit("Current Player", playerList[currentPlayerIndex]);
      io.emit('bid update', playerList[currentPlayerIndex].basePrice);
      io.emit("Timer Start", 30);
      setExpiration(io);
    } else {
      playerList.splice(0, playerList.length);
      playerList = null;      
    }
  }, 30 * 1000);  
};
var startAuction = function (socket, name) {
  socket.on('bid message', function(msg){
    io.emit('bid message', name + ":" + msg);
    playerList[currentPlayerIndex].currentPrice = msg;
    playerList[currentPlayerIndex].team = name;
    io.emit('player update', playerList[currentPlayerIndex]);
    io.emit('bid update', playerList[currentPlayerIndex].currentPrice + 10);
    io.emit("Timer Start", 30);
    setExpiration(io);
  });
  if (!playerList || !playerList.length) {
    playerList = players.getAllPlayers();
    currentPlayerIndex = 0;
  }
  socket.emit("Current Player", playerList[currentPlayerIndex]);
  socket.emit("Timer Start", 30);
  setExpiration(io);
};
io.on('connection', function(socket){
  socket.on('Registration', function (name) {
    io.emit('bid message', name + ' : connected');
    socket.on('disconnect', function(){
      io.emit('bid message', name + ' : disconnected');
    });
    socket.on('start auction', function () {
      startAuction(socket, name);
      io.emit('bid message', name + " joined the auction");
    });    
  });
  io.emit("Register", "Please provide your name");
});
app.get('/', function (req, res) {
  res.sendFile('index.html', { root: path.join(__dirname, '/public') })
});
http.listen(8000, function () {
  console.log('Example app listening on port 8000!');
});