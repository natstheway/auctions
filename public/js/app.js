var socket = io();
window.onload = function (event) {
	$('#form button').click(function(){
	    socket.emit('chat message', $('#m').val());
	    $('#m').val('');
	    return false;
	});
	socket.on('chat message', function(msg){
	    $('#messages').append($('<li>').text(msg));
	});
	$.ajax({
	  url: "./json/players.json",
	  method: "get",
	  dataType: "text",
	  contentType: "application/json"
	}).always(function (response) {
		var list = $.parseJSON(response);
		var playerDetail= "";
		$("#list").append(('<span>Name</span>'));
		$("#list").append(('<span>Base Price</span>'));
		$("#list").append(('<span>Current Price</span>'));
		$("#list").append(('<span>Team</span>'));
		$("#list").append(('<span>Status</span><br>'));
		$("#list").append(list.map(function(value) {
			playerDetail = "";
			for (key in value) {
		    	playerDetail += ('<span>' + value[key] + '</span>');
		    }
		    playerDetail += ('<br>');
		    return playerDetail;
		}).join(""));
	});
};