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
var client = [];   // variable to store all the users logged in .. the list is updated when some one is disconnected
var clientSockets = {};
var AUCTION_SIZE = 3;  // number of players to be in the auction group ..can be changed here..
var AUCTION_TIME_LIMIT = 15000; // 15 seconds
var AUCTION_TIME_LIMIT_SEC = 15; // 15 seconds
var PLAYER_BID_GAP = 5000; // 5 seconds
var MAX_PURSE_AMOUNT = 6000; // 6000 Lakhs

// finding objects by key value pair in JSON
function getObjects(obj, key, val) {
    var objects = [];
    for (var i in obj) {
      if (!obj.hasOwnProperty(i)) continue;
        if (typeof obj[i] == 'object') {
            objects = objects.concat(getObjects(obj[i], key, val));
        } else if (i == key && obj[key] == val) {
            objects.push(obj);
        }
    }
    return objects;
}
// User Profile Init
function getClientObj(name) {
    return  {
        "name": name,
        "purseBalance": MAX_PURSE_AMOUNT,
        "playersPurschasedCount": 0,
        "biddingMode": "manual"
      };
}
// updating user ( client ) profile after purchase
function clientPurchaseUpdate(name, team, currentPrice) {
  var tempUser = getObjects(client,"name", team)[0];
  tempUser.purseBalance = tempUser.purseBalance - currentPrice;
  tempUser.playersPurschasedCount = tempUser.playersPurschasedCount + 1;
  console.log(JSON.stringify(tempUser));
  console.log(team + " purschased "+ name + " for " + currentPrice + " Lakhs");
  console.log("purseBalance of " + team + " is " + tempUser.purseBalance + " Lakhs");
  console.log(team + " has purschased "+tempUser.playersPurschasedCount +" players" );
  clientSockets[team].emit("purse balance", tempUser.purseBalance);
  return tempUser;
}
var setExpiration = function () {
  clearTimeout(timer);
  timer = setTimeout(function () {
    if(client.length == AUCTION_SIZE) {  // setting timers only when all the participants are in !!
      io.emit("Timer Stop");
      if (playerList[currentPlayerIndex].team) {
         playerList[currentPlayerIndex].status = "sold";
         io.emit('bid message',  playerList[currentPlayerIndex].name + ' sold to ' + playerList[currentPlayerIndex].team);
          // Updating the user purse balance, players purschased count
          clientPurchaseUpdate(playerList[currentPlayerIndex].name, playerList[currentPlayerIndex].team, playerList[currentPlayerIndex].currentPrice);
      } else {
        playerList[currentPlayerIndex].status = "unsold";
        io.emit('bid message',  playerList[currentPlayerIndex].name + ' is unsold');
      }
      io.emit('player update', playerList[currentPlayerIndex]);
      // Here a player bid is done ..give a 5 seconds gap !!!
      timer_auction_gap = setTimeout(function () {
        if (currentPlayerIndex < playerList.length - 1) {
          currentPlayerIndex = currentPlayerIndex + 1;
          io.emit("Current Player", playerList[currentPlayerIndex]);
          io.emit('bid update', playerList[currentPlayerIndex].basePrice);
          io.emit("Timer Start", AUCTION_TIME_LIMIT_SEC);
          setExpiration();
        } else {
          playerList.splice(0, playerList.length);
          playerList = [];      
        }
      }, PLAYER_BID_GAP);
    }
  }, AUCTION_TIME_LIMIT);  
};
var startAuction = function (socket, name) {
    socket.on('bid message', function(msg){
      if(client.length == AUCTION_SIZE && playerList.length && name !=  playerList[currentPlayerIndex].team) {    // starting the auction and showing the first player only after everyone joins
        socket.emit('bid message', name + ":" + msg);
        socket.broadcast.emit('bid message', name + ":" + msg);
        playerList[currentPlayerIndex].currentPrice = msg;
        playerList[currentPlayerIndex].team = name;
        socket.emit('player update', playerList[currentPlayerIndex]);
        socket.emit('bid update', playerList[currentPlayerIndex].currentPrice + 10);
        socket.emit("Timer Start", AUCTION_TIME_LIMIT_SEC);
        socket.broadcast.emit('player update', playerList[currentPlayerIndex]);
        socket.broadcast.emit('bid update', playerList[currentPlayerIndex].currentPrice + 10);
        socket.broadcast.emit("Timer Start", AUCTION_TIME_LIMIT_SEC);
        setExpiration();
      }      
    });
    socket.on('chat message', function(msg){
      io.emit('chat message', name + ":" + msg);
    });
    if (!playerList || !playerList.length) {
      playerList = players.getAllPlayers();
      currentPlayerIndex = 0;
    }  
    if(client.length == AUCTION_SIZE) {
      io.emit("Current Player", playerList[currentPlayerIndex]);
      io.emit("Timer Start", AUCTION_TIME_LIMIT_SEC);
      setExpiration();
    }  
 };
io.on('connection', function(socket){
  socket.on('Registration', function (name) {
    socket.emit('bid message', name + ' : connected');
    client.push(getClientObj(name));
    clientSockets[name] = socket;
    socket.emit("purse balance", MAX_PURSE_AMOUNT);
    socket.on('disconnect', function(){
      socket.emit('bid message', name + ' : disconnected');
      socket.broadcast.emit('bid message', name + ' : disconnected');
      client.splice(client.indexOf(getObjects(client, "name", name)), 1);
      clientSockets[name] = null;
      delete clientSockets[name];
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
