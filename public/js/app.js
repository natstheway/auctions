angular.module('app', ['socketFactory'])
.controller('MainController', ['$scope', 'socket', '$interval', function ($scope, $socket, $interval) {
	$scope.timer = null;
	$socket.$on('Current Player', function (msg) {
		$scope.currentPlayer = msg;
		$scope.playerList.push(msg);
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
	$scope.register = function () {
		$socket.$emit('Registration', $scope.userName);
		$scope.$parent.registered = true;
	}
}])
.controller('BidController', ['$scope', 'socket', function ($scope, $socket) {
	$scope.moneyLeft = 1000;
	$scope.makeBid = function () {
		$socket.$emit('bid message', $scope.currentBid);
		$scope.currentBid = "";
		return false;
	};
	$scope.startAuction = function () {
		$socket.$emit('start auction');		
		$scope.started = true;
	};
	$socket.$on('bid message', function (msg) {
		$('#messages').append($('<li>').text(msg));
	});
	$socket.$on('bid update', function (bid) {
		$scope.currentBid = bid;
	});
}])
.controller('ListController', ['$scope', 'socket', function ($scope, $socket) {
	$scope.$parent.playerList = [];
	$socket.$on('player update', function (data) {
		$scope.playerList.pop();
		$scope.playerList.push(data);
	});
}]);