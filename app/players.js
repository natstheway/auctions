var fs = require('fs');
var players;
fs.readFile('./data/players.json', 'utf8', function (err, data) {
  if (err) throw err;
  players = JSON.parse(data);
});
module.exports = {
//Getters
    getCurrentPlayer: function(index) {
      return players[index];
    },
    getCurrentPlayerName: function(index) {
      return players[index].name;
    },
    getCurrentPlayerBasePrice: function(index) {
      return players[index].basePrice;
    },
    getCurrentPlayerCurrentPrice: function(index) {
      return players[index].currentPrice;
    },
    getCurrentPlayerStatus: function(index) {
      return players[index].status;
    },
    getCurrentPlayerSummary: function(index) {
      return players[index].summary;
    },
    getCurrentPlayerAge: function (index) {
      return players[index].age;
    },
    getCurrentPlayerCategory: function(index) {
      return players[index].category;
    },
    getCurrentPlayerCountry: function(index) {
      return players[index].country;
    },
    getCurrentPlayerTeam: function (index) {
      return players[index].team;
    },
    getCurrentPlayerNextBidAmount: function (index) {
      return this.getNextBidAmount(this.getCurrentPlayerCurrentPrice(index), this.getCurrentPlayerBasePrice(index));
    },    
    // get the next bid amount based on the current amount
    getNextBidAmount: function (currentPrice,basePrice) {
      if(currentPrice == "")
        return basePrice;
      // need to changed based on auction rules
      if(currentPrice <=480)
        return currentPrice+20;
      else if(currentPrice > 480)
        return currentPrice + 25;
    },
    getAllPlayers: function () { 
        return players;
    },
    // Setters
    setCurrentPlayerCurrentPrice: function (index, currentPrice) {
      players[index].currentPrice = currentPrice;  
    },
    setCurrentPlayerStatus: function (index, status) {
      players[index].status = status;  
    },
    setCurrentPlayerTeam: function (index, team) {
      players[index].team = team;  
    }    
};
