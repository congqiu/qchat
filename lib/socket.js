var redis = require('redis');
var cookie = require('cookie');
var cookieParser = require('cookie-parser');
var config = require('config-lite')(__dirname);
var client = redis.createClient();


var online_user_chat_key = "private-qchat:";
var online_group_chat_key = "group-qchat:";
var online_user_list_key = "qchatuser:list";

var socket_users = [];
var user_info_hash = {};
var socket_user_hash = {};
var break_users = {};		//断开连接用户


var socketLib = function (io, sessionStore) {
	io.set('authorization', function(handshakeData, cb) {
    var cookies = cookie.parse(handshakeData.headers.cookie);
    var connectKey = cookies[config.session.key];
    if (connectKey) {
      var connected = cookieParser.signedCookie(connectKey, config.session.secret);
      if(connected) {
        client.get('sess:' + connected, function (error, session) {
          if (error) {
            cb(error, false);
          } else {
            var session = JSON.parse(session);
            handshakeData.headers.sessions = session;
            if (session && session.user) {
              cb(null, true);
            } else {  
              cb('No login', false);
            }
          }
        });
      } else {
        cb('No session', false);
      }
    }
  });

	io.sockets.on('connection', function (socket) {
    socket.on('init', function () {
      if (socket.handshake.headers.sessions) {
        var user = socket.handshake.headers.sessions.user;
        var nickname = user.nickname || user.username;
        socket.emit('loginSuccess', user);
        delete break_users[user.uid];
        socket.nickname = nickname;
        socket.user = user;
        socket_users.push(nickname);
        client.sadd(online_user_list_key, user.uid, function(err, res){
          update_user_list(user.uid, socket);
        });
        socket_user_hash[user.uid] = socket;
        if (user_info_hash[user.uid]) {
          return;
        }
        user_info_hash[user.uid] = user;
        socket.broadcast.emit('systemMsg', nickname + '加入房间！', socket_users.length);
      } else {
        return socket.emit('loginFail', '请先登录！');
      }
    });

    socket.on('groupMsg', function (msg, to) {
    	var mType = 'group';
      if (!socket.nickname) {
        socket.emit('loginFail', '请先登录！');
      } else {
        socket.broadcast.emit('newMsg', socket.nickname, msg);
        var message = {from: socket.user.uid, to: to, content: msg};
        var json = JSON.stringify(message);
        client.lpush(online_group_chat_key, json, function(err, res){
          
        });
      }
    });

    socket.on('privateMsg', function (msg, to) {
      if (!socket.nickname) {
        socket.emit('loginFail', '请先登录！');
      } else {
       	socket.to(socket_user_hash[to].id).emit('newPrivateMsg', socket.nickname, msg, socket.user.uid);
        var message = {from: socket.user.uid, to: to, content: msg, status: 0};
        var json = JSON.stringify(message);
        client.lpush(online_user_chat_key, json, function(err, res){
        });
      }
    });

    socket.on('disconnect', function(reason) {
      if (socket.user) {
        var user_id = socket.user.uid;
        break_users[user_id] = socket.id;
        setTimeout(function () {
          if(user_id && break_users[user_id]) {
            socket_users.shift(socket.nickname);
            socket.broadcast.emit('systemMsg', socket.nickname + '离开！', socket_users.length);
            client.srem(online_user_list_key, user_id, function(){
              update_user_list(user_id, socket);
            });
            delete user_info_hash[user_id];
            delete break_users[user_id];
          }
        }, 10000);
      }
    });
	});

	function update_user_list(id_user, socket) {
		client.smembers(online_user_list_key, function(error, users) {
			if(users.length > 0) {
				var user_info = {};
				for(var i in users) {
					var user_id = users[i];
					if(undefined != user_info_hash[user_id]) {
						user_info[user_id] = user_info_hash[user_id];
					}
				}
				io.sockets.emit('showOnline', user_info);
			}
		});
	}
}

module.exports = socketLib;