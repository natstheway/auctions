angular.module('app', ['socketFactory'])
.controller('MainController', ['$scope', 'socket', function ($scope, $socket) {
	$socket.$on('Current Player', function (msg) {
		$scope.currentPlayer = msg;
		$scope.$parent.currentBid = msg.currentPrice || msg.basePrice;
	});
}])
.controller('BidController', ['$scope', 'socket', function ($scope, $socket) {
	$scope.makeBid = function () {
		$socket.$emit('chat message', $scope.currentBid);
		$scope.currentBid = "";
		return false;
	};
	$socket.$on('chat message', function (msg) {
		$('#messages').append($('<li>').text(msg));
	});
}])
.controller('ListController', ['$scope', 'socket', function ($scope, $socket) {
	
}]);