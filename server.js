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
var initial_timer_expiry = 30;
var extension_timer = 10;
var client = [];    // variable to store all the users logged in .. the list is updated when some one is disconnected
var AUCTION_SIZE = 3;  // number of players to be in the auction group ..can be changed here..
var setExpiration = function () {
  clearTimeout(timer);
  timer = setTimeout(function () {
  if(client.length == AUCTION_SIZE) {  // setting timers only when all the participants are in !!
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
      io.emit("Timer Start", initial_timer_expiry);
      setExpiration(io);
    } else {
      playerList.splice(0, playerList.length);
      playerList = [];      
    }
  }
  }, initial_timer_expiry * 1000);  
};
var startAuction = function (socket, name) {
    socket.on('bid message', function(msg){
      if(client.length == AUCTION_SIZE && playerList.length) {    // starting the auction and showing the first player only after everyone joins
        socket.emit('bid message', name + ":" + msg);
        socket.broadcast.emit('bid message', name + ":" + msg);
        playerList[currentPlayerIndex].currentPrice = msg;
        playerList[currentPlayerIndex].team = name;
        socket.emit('player update', playerList[currentPlayerIndex]);
        socket.emit('bid update', playerList[currentPlayerIndex].currentPrice + 10);
        socket.emit("Timer Start", initial_timer_expiry);
        socket.broadcast.emit('player update', playerList[currentPlayerIndex]);
        socket.broadcast.emit('bid update', playerList[currentPlayerIndex].currentPrice + 10);
        socket.broadcast.emit("Timer Start", initial_timer_expiry);
        setExpiration(socket);
      }      
    });
    if (!playerList || !playerList.length) {
      playerList = players.getAllPlayers();
      currentPlayerIndex = 0;
    }  
    if(client.length == AUCTION_SIZE) {
      io.emit("Current Player", playerList[currentPlayerIndex]);
      io.emit("Timer Start", initial_timer_expiry);
      setExpiration(socket);
    }  
 };
io.on('connection', function(socket){
  socket.on('Registration', function (name) {
    socket.emit('bid message', name + ' : connected');
    client.push(name);
    socket.on('disconnect', function(){
      socket.emit('bid message', name + ' : disconnected');
      socket.broadcast.emit('bid message', name + ' : disconnected');
      client.splice(client.indexOf(name), 1);
    });
    socket.on('start auction', function () {
      startAuction(socket, name); // start auction for all here ...
      socket.emit('bid message', name + " joined the auction");
    });    
  });
  socket.emit("Register", "Please provide your name");
});
app.get('/', function (req, res) {
  res.sendFile('index.html', { root: path.join(__dirname, '/public') })
});



http.listen(8000, function () {
  console.log('Example app listening on port 8000!');
});
