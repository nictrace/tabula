// Setup basic express server
var express = require('express');
var jwt = require('jsonwebtoken');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var util = require('util');

var port = process.env.PORT || 50000;
var secret = 'E38A794745DB11459AC4565C6C417';
var room;													// комната для общения

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// Chatroom

var numUsers = 0;

io.on('connection', function (socket) {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
    io.to(socket.chatroom).emit('new message', {
      username: socket.username,
      message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (token) {
    console.log('loft!');
    var decoded;
    try {
      decoded = jwt.verify(token, secret);
    }
    catch(ex) { 
      console.log('decode error:' + ex);
      socket.disconnect();
      return;
    }
   
    console.log('decoded:['+ JSON.stringify(decoded) +']');

    socket.chatroom = decoded.company.company.name;
    socket.join(socket.chatroom);
    console.log('joining to ' + socket.chatroom);
    //io.to(socket.chatroom).emit( 'welcome, '+ decoded.login);

    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = decoded.login;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers,
      username: decoded.login,
      room: decoded.company.company.name
    });

    var k=Array();
    //console.log('broadcast:['+ util.inspect(socket.broadcast.nsp.sockets) +']');
    for(var s in socket.broadcast.nsp.sockets) {
    	k.push(socket.broadcast.nsp.sockets[s].username);
    	console.log(socket.broadcast.nsp.sockets[s].id);	//'socket id='+s.id);
    }

    //socket.broadcast.emit('user joined', {
    io.to(socket.chatroom).emit('user joined', {
      username: decoded.login,
      numUsers: numUsers,
      members: k,
      protect: socket.id
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      // socket.broadcast.emit('user left', {
      io.to(socket.chatroom).emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});
