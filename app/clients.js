var clients = [];
var utils = require("./utils.js"); 
module.exports = {
	addClient: function(client) {
    	clients.push(client);
	},
	getLength: function() {
		return clients.length;
	},
	/********************* OPERATIONS ON CLIENT OBJECT ************************/
	//get client purse left
	getClientPurseLeft: function(name){
	  var tempUser = utils.getObjects(clients, "name", name)[0];
	  return tempUser.purseBalance;
	},
	// get the number of players purchased by the client
	getClientPurchasedCount: function(name) {
	  var tempUser = utils.getObjects(clients, "name", name)[0];
	  return tempUser.playersPurschasedCount;
	},
	// getting user profile - waitees available
	getWaiteesAvailable: function(name) {
	  var tempUser = utils.getObjects(clients, "name", name)[0];
	  /**
	   * Need to define message interfaces and layout in ui to display this information
	  **/
	  return tempUser ? tempUser.waiteesAvailable : 0;
	},
	// updating user profile - waitees available
	deductWaiteesAvailable: function(name) {
	  var tempUser = utils.getObjects(clients, "name", name)[0];
	  tempUser.waiteesAvailable = tempUser.waiteesAvailable - 1;
	},
	// updating user ( client ) profile after purchase
	clientPurchaseUpdate: function(name, team, currentPrice) {
	  var tempUser = utils.getObjects(clients, "name", team)[0];
	  tempUser.purseBalance = tempUser.purseBalance - currentPrice;
	  tempUser.playersPurschasedCount = tempUser.playersPurschasedCount + 1;
	  console.log(JSON.stringify(tempUser));
	  /**
	   * Need to define message interfaces and layout in ui to display this information
	  **/
	  return tempUser.purseBalance;
	},
	// delete user on exit
	deleteFromClientList: function(name) {
	  var objects = utils.getObjects(clients, "name", name);
	  if(objects.length)
	    clients.splice(clients.indexOf(objects[0]), 1);
	}
};