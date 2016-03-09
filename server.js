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
var SECRET_BID_TIME_LIMIT = 45000; // 45 seconds
var SECRET_BID_TIME_LIMIT_SEC = 45;
var AUCTION_TIME_LIMIT_SEC = 15; // 15 seconds
var WAITEES_TIME_LIMIT = 30000; // 30 seconds
var WAITEES_TIME_LIMIT_SEC = 30; // seconds
var PLAYER_BID_GAP = 5000; // 5 seconds
var MAX_PURSE_AMOUNT = 2000; // 2000 Lakhs .. change later
var MAX_WAITEES_PER_USER = 2; // maximum waitees that can be used up by the user
// Autobid variables 
var autobidList = [];
var MANUAL_MODE = 0;
var AUTOBID_MODE = 1;
var secretBidMode = false;
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
        "waiteesAvailable": MAX_WAITEES_PER_USER,
        "biddingMode": "manual"
      };
}
//get client purse left
function getClientPurseLeft(name){
  var tempUser = getObjects(client,"name", name)[0];
  return tempUser.purseBalance;
}
// updating user ( client ) profile after purchase
function clientPurchaseUpdate(name, team, currentPrice) {
  var tempUser = getObjects(client,"name", team)[0];
  tempUser.purseBalance = tempUser.purseBalance - currentPrice;
  tempUser.playersPurschasedCount = tempUser.playersPurschasedCount + 1;
  console.log(JSON.stringify(tempUser));
  /**
   * Need to define message interfaces and layout in ui to display this information
  **/
  clientSockets[team].emit("purse balance", tempUser.purseBalance);
  return tempUser;
}
// updating user profile - waitees available
function deductWaiteesAvailable(name) {
  var tempUser = getObjects(client,"name", name)[0];
  tempUser.waiteesAvailable = tempUser.waiteesAvailable - 1;
}
// getting user profile - waitees available
function getWaiteesAvailable(name) {
  var tempUser = getObjects(client,"name", name)[0];
  /**
   * Need to define message interfaces and layout in ui to display this information
  **/
  return tempUser.waiteesAvailable;
}
// delete a entry from autobid list
function deleteFromAutoBidList(name) {
  // deleting only if there any objects with the particular name .. otherwise it is deleting random element
  var objects = getObjects(autobidList, "name", name);
  if(objects.length)
    autobidList.splice(autobidList.indexOf(getObjects(autobidList, "name", name)[0]), 1);
}
// adding user and amount to autobid list
function addToAutoBidList(name,amount) {
  var autobidEntry = {
    "name": name,
    "amount": amount
  };
  // delete any previous autobid of different amount by the user to the same player..
  deleteFromAutoBidList(name);
  // add the new autobid entry to the list
  autobidList.push(autobidEntry);
}
//
function clearAutoBidList() {
  // clearing the autobidlist...
  autobidList.splice(0, autobidList.length);
  autobidList = [];
}
// number of autobids
function getAutobidsAvailable() {
  return autobidList.length;
}
// get the next bid amount based on the current amount
function getNextBidAmount(currentPrice,basePrice) {
  if(currentPrice == "")
    return basePrice;
  // need to changed based on auction rules
  if(currentPrice <=480)
    return currentPrice+20;
  else if(currentPrice > 480)
    return currentPrice + 25;

}
// delete user on exit
function deleteFromClientList(name) {
  var objects = getObjects(client, "name", name);
  if(objects.length)
    client.splice(client.indexOf(getObjects(client, "name", name)[0]), 1);
}

var setExpiration = function (socket,timeout) {

    var exitAutobid = false;
    // check for autobid possibility before clearing timeout .. if so, start autobidding..
      while(getAutobidsAvailable()) {
        console.log("autobids available : "+getAutobidsAvailable())
        if(exitAutobid == true || secretBidMode == true ) {
          // based on inputs from for loop
          break;
        }
        // for every entry in the autobids list, we have to check for the below condition
        for(var i=0;i<autobidList.length;i++) {
          var element = autobidList[i];
          console.log(" checking autobid for "+ element.name);
          // if there is only one guy in autobid list and he is the current bidder for the player, then no need to enter this loop...you can quit the while loop also
          if(element.name == playerList[currentPlayerIndex].team && getAutobidsAvailable() == 1) {
            //exiting from autobidding temporarily... wait for other bidders or autobidders
            exitAutobid = true;
            break;
          } else if(element.name == playerList[currentPlayerIndex].team) {
            // need to check for other players in the autobid list
            continue;
          }
          if(playerList.length && element.name != playerList[currentPlayerIndex].team && playerList[currentPlayerIndex].status != "Sold" && playerList[currentPlayerIndex].status != "Unsold") {    // starting the auction and showing the first player only after everyone joins
            // auto bid code -
            if(element.amount >= getNextBidAmount(playerList[currentPlayerIndex].currentPrice,playerList[currentPlayerIndex].basePrice) && getClientPurseLeft(element.name) >= getNextBidAmount(playerList[currentPlayerIndex].currentPrice,playerList[currentPlayerIndex].basePrice) && getNextBidAmount(playerList[currentPlayerIndex].currentPrice,playerList[currentPlayerIndex].basePrice) <= 1000) {
              if(getNextBidAmount(playerList[currentPlayerIndex].currentPrice,playerList[currentPlayerIndex].basePrice) == 1000 && secretBidMode ==false) {
                secretBidMode = true;
                //console.log(element.name + " auto-bidding for "+getNextBidAmount(playerList[currentPlayerIndex].currentPrice,playerList[currentPlayerIndex].basePrice));
                //console.log(element.name + "purse left is "+ getClientPurseLeft(element.name));
                io.emit('bid message', element.name + ":" + getNextBidAmount(playerList[currentPlayerIndex].currentPrice,playerList[currentPlayerIndex].basePrice));
                playerList[currentPlayerIndex].currentPrice = getNextBidAmount(playerList[currentPlayerIndex].currentPrice);
                playerList[currentPlayerIndex].team = element.name;
                io.emit('player update', playerList[currentPlayerIndex]);
                io.emit('bid update', getNextBidAmount(playerList[currentPlayerIndex].currentPrice,playerList[currentPlayerIndex].basePrice));
                io.emit('bid message', "Please enter your secret bids now. You have "+ SECRET_BID_TIME_LIMIT_SEC+" seconds time.");
                io.emit('secretbid message'); // updates the user to be able to send secret bids ..
                io.emit("Timer Start", SECRET_BID_TIME_LIMIT_SEC);
                clearAutoBidList();
		clearTimeout(timer);
		timeout = SECRET_BID_TIME_LIMIT;
              } else { 
                console.log(element.name + " auto-bidding for "+getNextBidAmount(playerList[currentPlayerIndex].currentPrice,playerList[currentPlayerIndex].basePrice));
                console.log(element.name + "purse left is "+ getClientPurseLeft(element.name));
                io.emit('bid message', element.name + ":" + getNextBidAmount(playerList[currentPlayerIndex].currentPrice,playerList[currentPlayerIndex].basePrice));
                playerList[currentPlayerIndex].currentPrice = getNextBidAmount(playerList[currentPlayerIndex].currentPrice,playerList[currentPlayerIndex].basePrice);
                playerList[currentPlayerIndex].team = element.name;
        	io.emit('player update', playerList[currentPlayerIndex]);
	        io.emit('bid update', getNextBidAmount(playerList[currentPlayerIndex].currentPrice,playerList[currentPlayerIndex].basePrice));
              	io.emit("Timer Start", AUCTION_TIME_LIMIT_SEC);
              	clearTimeout(timer);
		}
            }else {
              // delete user from autobid list .. new autobid message will come if he increase the autobid value .. as of now , keeping him in the list is waste of space
              console.log("deleting "+element.name+" autobidList");
              deleteFromAutoBidList(element.name);
            }
          }
        }
      }

  clearTimeout(timer);
  timer = setTimeout(function () {
    if(client.length == AUCTION_SIZE) {  // setting timers only when all the participants are in !!
      io.emit("Timer Stop");
      if (playerList[currentPlayerIndex].team) {
         playerList[currentPlayerIndex].status = "Sold";
         io.emit('bid message',  playerList[currentPlayerIndex].name + ' sold to ' + playerList[currentPlayerIndex].team);
         // Updating the user purse balance, players purschased count and autobidlist
         clearAutoBidList();
         io.emit('manual mode');
         io.emit('secretbid reset');
         secretBidMode = false;
         clientPurchaseUpdate(playerList[currentPlayerIndex].name, playerList[currentPlayerIndex].team, playerList[currentPlayerIndex].currentPrice);
      } else {
         playerList[currentPlayerIndex].status = "Unsold";
         io.emit('bid message',  playerList[currentPlayerIndex].name + ' is unsold');
         // Updating the user purse balance, players purschased count and autobidlist .. Not necessary..just simply doing..
         clearAutoBidList();
         io.emit('manual mode');
         io.emit('secretbid reset');
         secretBidMode = false;
      }
      io.emit('player update', playerList[currentPlayerIndex]);
      // Here a player bid is done ..give a 5 seconds gap !!!
      timer_auction_gap = setTimeout(function () {
        if (currentPlayerIndex < playerList.length - 1) {
          currentPlayerIndex = currentPlayerIndex + 1;
          io.emit("Current Player", playerList[currentPlayerIndex]);
          io.emit('bid message', playerList[currentPlayerIndex].summary);
          io.emit('bid update', playerList[currentPlayerIndex].basePrice);
          io.emit("Timer Start", AUCTION_TIME_LIMIT_SEC);
          setExpiration(socket,AUCTION_TIME_LIMIT);
        } else {
          playerList.splice(0, playerList.length);
          playerList = [];      
        }
      }, PLAYER_BID_GAP);
    }
  }, timeout);  
};
var startAuction = function (socket, name) {
    socket.on('bid message', function(msg){
      console.log("client " +name+ " purse left  is "+ getClientPurseLeft(name));
      if(client.length == AUCTION_SIZE && playerList.length && name !=  playerList[currentPlayerIndex].team && playerList[currentPlayerIndex].status != "Sold" && playerList[currentPlayerIndex].status != "Unsold" && getClientPurseLeft(name) >= getNextBidAmount(playerList[currentPlayerIndex].currentPrice,playerList[currentPlayerIndex].basePrice)) {    // starting the auction and showing the first player only after everyone joins
        if(getNextBidAmount(playerList[currentPlayerIndex].currentPrice,playerList[currentPlayerIndex].basePrice) == 1000 && secretBidMode == false) {
           io.emit('bid message', name + ":" + msg);
           playerList[currentPlayerIndex].currentPrice = msg;
           playerList[currentPlayerIndex].team = name;
           io.emit('player update', playerList[currentPlayerIndex]);
           socket.broadcast.emit('bid update', msg);
           secretBidMode = true;
           io.emit('bid message', "Please enter your secret bids now. You have" + SECRET_BID_TIME_LIMIT_SEC +" seconds time.");
           io.emit('secretbid message'); // updates the user to be able to send secret bids ..
           io.emit("Timer Start", SECRET_BID_TIME_LIMIT_SEC);
           setExpiration(socket,SECRET_BID_TIME_LIMIT);
        } else {
           io.emit('bid message', name + ":" + msg);
           playerList[currentPlayerIndex].currentPrice = msg;
           playerList[currentPlayerIndex].team = name;
           /**
            * use socket.emit to reply to same user 
            * use socket.broadcast.emit to reply to other users (apart from sent)
            * use io.emit to send to everyone
           **/
            io.emit('player update', playerList[currentPlayerIndex]);
            socket.broadcast.emit('bid update',getNextBidAmount(playerList[currentPlayerIndex].currentPrice,playerList[currentPlayerIndex].basePrice));
            io.emit("Timer Start", AUCTION_TIME_LIMIT_SEC);
            setExpiration(socket,AUCTION_TIME_LIMIT);
        }
      }
    });
    socket.on('secretbid message',function(amount){
        console.log("secretbid received from "+name+ " is "+amount);
        io.emit('bid message',"Secret bid received from "+ name);
        if(playerList[currentPlayerIndex].currentPrice < amount && getClientPurseLeft(name) >= amount)
        {
          playerList[currentPlayerIndex].currentPrice = amount;
          playerList[currentPlayerIndex].team = name;
        }
    });
    socket.on('autobid message',function(amount){
      console.log("autobid received amount is "+amount);
      // what to do when u receive a autobid message
      // add him to autobid list ... 
      if(client.length == AUCTION_SIZE && playerList.length && name !=  playerList[currentPlayerIndex].team && playerList[currentPlayerIndex].status != "Sold" && playerList[currentPlayerIndex].status != "Unsold") {    // starting the auction and showing the first player only after everyone joins
        if(amount >= getNextBidAmount(playerList[currentPlayerIndex].currentPrice,playerList[currentPlayerIndex].basePrice)) {
          console.log("added "+name+"  and "+amount+" to autobid list");
          addToAutoBidList(name,amount);
          setExpiration(socket,AUCTION_TIME_LIMIT);
        }
      }
    });
    socket.on('manualbid message',function(amount){
      console.log("manualbid received amount is "+amount);
      deleteFromAutoBidList(name);
      console.log("autobidList length is "+autobidList.length);
    });
    socket.on('chat message', function(msg){
      io.emit('chat message', name + ":" + msg);
    });
    socket.on('waitees message', function(msg){
      /**
       * Resets the timer to WAITEES_TIME_LIMIT_SEC
      **/
      if(getWaiteesAvailable(name) && playerList[currentPlayerIndex].status != "Sold" && playerList[currentPlayerIndex].status != "Unsold") {
        deductWaiteesAvailable(name);
        io.emit('bid message', name + ": requested time top-up ");
        socket.emit("waitees update", getWaiteesAvailable(name));
        io.emit("Timer Start", WAITEES_TIME_LIMIT_SEC);
        setExpiration(socket,WAITEES_TIME_LIMIT);
      }
    });
    if (!playerList || !playerList.length) {
      playerList = players.getAllPlayers();
      currentPlayerIndex = 0;
    }  
    if(client.length == AUCTION_SIZE) {
      io.emit("Current Player", playerList[currentPlayerIndex]);
      io.emit('bid message', playerList[currentPlayerIndex].summary);
      io.emit("Timer Start", AUCTION_TIME_LIMIT_SEC);
      setExpiration(socket,AUCTION_TIME_LIMIT);
    }  
 };
io.on('connection', function(socket){
  socket.on('Registration', function (name) {
    io.emit('bid message', name + ' : connected');
    client.push(getClientObj(name));
    clientSockets[name] = socket;
    socket.emit("purse balance", MAX_PURSE_AMOUNT);
    socket.emit("waitees update", getWaiteesAvailable(name));
    if(client.length == AUCTION_SIZE) // welcome message before auction starts ..
      io.emit("LET THE BATTLE BEGIN");
    socket.on('disconnect', function(){
      io.emit('bid message', name + ' : disconnected');
      deleteFromClientList(name);
      clientSockets[name] = null;
      delete clientSockets[name];
    });
    socket.on('start auction', function () {
      startAuction(socket, name); // start auction for all here ...
      io.emit('bid message', name + " joined the auction");
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
