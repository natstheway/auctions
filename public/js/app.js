angular.module('app', ['socketFactory'])
.controller('MainController', ['$scope', 'socket', '$interval', function ($scope, $socket, $interval) {
	$scope.timer = null;	
	$scope.purseBalance = 0;
	$socket.$on('Current Player', function (msg) {
		if (!$scope.currentPlayer || $scope.currentPlayer.name !== msg.name) {
			$scope.playerList.push(msg);
			if ($scope.started){
				$('#messages').children().remove();
			}
			if ($('#Feeds').length) {
				$('#Feeds').animate({scrollTop: $('#messages').height()}, 500);
			}
		}
		$scope.currentPlayer = msg;
		$scope.$parent.currentBid = msg.currentPrice || msg.basePrice;
	});
	$socket.$on('Register', function (msg) {
		$scope.registrationRequest = msg;
	});
	$socket.$on('Timer Start', function (seconds) {
		$scope.clock = seconds;
		$interval.cancel($scope.timer);
		$scope.timer = $interval(function () {
			if ($scope.clock) {
				$scope.clock = $scope.clock - 1;
			} else {
				$interval.cancel($scope.timer);
			}
		}, 1000);
	});
	$socket.$on('Timer Stop', function () {
		$scope.clock = 0;
		$interval.cancel($scope.timer);
		$scope.currentPlayer = null;
	});
	$socket.$on('purse balance', function (balance) {
		$scope.purseBalance = balance;
	});
	$scope.register = function () {
		$socket.$emit('Registration', $scope.userName);
		$scope.$parent.userName = $scope.userName;
		$scope.$parent.registered = true;
	}
}])
.controller('BidController', ['$scope', 'socket', function ($scope, $socket) {
	$scope.makeBid = function () {
		$socket.$emit('bid message', $scope.currentBid);
		$scope.currentBid = "";
		return false;
	};
	$scope.chat = function () {
		$socket.$emit('chat message', $scope.chatText);
		$scope.chatText = "";
		return false;
	};
	$scope.waitees = function () {
		$socket.$emit('waitees message', $scope.userName);
		return false;
	};
	$scope.startAuction = function () {
		$socket.$emit('start auction');		
		$scope.$parent.started = true;
	};
	$socket.$on('bid message', function (msg) {
		$('#messages').append($('<li>').text(msg));
		$('#messages').animate({scrollTop: $('#messages').height()}, 500);
	});
	$socket.$on('chat message', function (msg) {
		$('#messages').append($('<li>').text(msg));
		$('#messages').animate({scrollTop: $('#messages').height()}, 500);
	});
	$socket.$on('bid update', function (bid) {
		$scope.currentBid = bid;
	});
}])
.controller('ListController', ['$scope', 'socket', function ($scope, $socket) {
	$scope.$parent.playerList = [];
	$scope.toggleLabel = "Feeds"
	$scope.toggleFeeds = function () {
		$scope.toggleLabel = $scope.toggleLabel == "Feeds" ? "Reports" : "Feeds";
		$scope.feedsEnabled = !$scope.feedsEnabled;
	}
	$socket.$on('player update', function (data) {
		$scope.playerList.pop();
		$scope.playerList.push(data);
		if (data.status== "sold" && data.team == $scope.userName) {
			$scope.$parent.myPlayers[data.category].push(data.name);
		}
		if ($scope.feedsEnabled) {
			$('#Feeds').animate({scrollTop: $('#messages').height()}, 500);
		}
	});
}])
.controller('StatsController', ['$scope', function ($scope) {
	$scope.$parent.myPlayers = {
		"Batsman": [],
		"Bowler": [],
		"All Rounder": [],
		"Wicket Keeper" : []	
	};
}])
.filter('reverse', function() {
  return function(items) {
    return items.slice().reverse();
  };
});