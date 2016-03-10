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
			if ($('#Sold Player Thread').length) {
				$('#Sold Player Thread').animate({scrollTop: 2 * $('#LeftZone').height()}, 500);
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
	$scope.toggleModeLabel = "Manual-Bidding"
	$scope.secretbiddingModeEnabled = false;
	$scope.autoBidCap = 0;
	$scope.toggleModes = function () {
		$scope.toggleModeLabel = $scope.toggleModeLabel == "Manual-Bidding" ? "Auto-Bidding" : "Manual-Bidding";
		$scope.autoEnabled = !$scope.autoEnabled;
	}
	$scope.makeBid = function () {
		$socket.$emit('bid message', $scope.currentBid);
		$scope.currentBid = "";
		return false;
	};

	$scope.makeAutoBid = function () {
		//if($scope.toggleModeLabel == "In Manual")
		if(!$scope.autoEnabled)
			$socket.$emit('manualbid message', $scope.autoBidCap);
		else
			$socket.$emit('autobid message', $scope.autoBidCap);
		return false;
	};
	$scope.makeSecretBid = function () {
		$socket.$emit('secretbid message', $scope.secretBid);
		$scope.secretbiddingModeEnabled = false;
		//$scope.secretBid = "";
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
		$('#messages').animate({scrollTop: 2 * $('#LeftZone').height()}, 500);
	});
	$socket.$on('chat message', function (msg) {
		$('#messages').append($('<li class="chatMessage">').text(msg));
		$('#messages').animate({scrollTop: 2 * $('#LeftZone').height()}, 500);
	});
	$socket.$on('waitees update', function (msg) {
		$scope.waiteesLeft = msg;
	});
	$socket.$on('bid update', function (bid) {
		$scope.currentBid = bid;
	});
	$socket.$on('manual mode',function () {
		$scope.toggleModeLabel = "Manual-Bidding";
		$scope.autoBidCap= 0;
		$scope.autoEnabled = false;
	});
	$socket.$on('secretbid message',function () {
		$scope.secretbiddingModeEnabled = true;
		$scope.currentBid = "";
		$scope.toggleModeLabel = "Manual-Bidding";
		$scope.autoBidCap= 0;
		$scope.autoEnabled = false;
	});
	$socket.$on('secretbid reset',function () {
		$scope.secretbiddingModeEnabled = false;
		$scope.secretBid="";
	});
	$socket.$on('online users',function (userList) {
		var popover = $('#OnlineUsers').data('bs.popover');
		if (!popover) {
			$("#OnlineUsers").popover("destroy").popover( {
				title : "Online Users",
				content : userList.join("\r\n")
			});
		} else {			
			popover.options.content = userList.join("\r\n");
		}
	});
	$("#OnlineUsers").popover( {
		title : "Online Users"
	});
}])
.controller('ListController', ['$scope', 'socket', function ($scope, $socket) {
	$scope.$parent.playerList = [];
	$scope.toggleLabel = "Sold Player Thread"
	$scope.toggleFeeds = function () {
		$scope.toggleLabel = $scope.toggleLabel == "Sold Player Thread" ? "Reports" : "Sold Player Thread";
		$scope.feedsEnabled = !$scope.feedsEnabled;
	}
	$socket.$on('player update', function (data) {
		$scope.playerList.pop();
		$scope.playerList.push(data);
		if (data.status== "Sold" && data.team == $scope.userName) {
			$scope.$parent.myPlayers[data.category].push(data.name);
		}
		if ($scope.feedsEnabled) {
			$('#Feeds').animate({scrollTop: 2 * $('#Feeds').height()}, 500);
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