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
};