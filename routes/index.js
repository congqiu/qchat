var express = require('express');
var router = express.Router();
var crypto = require('crypto');
var moment = require('moment');
var Hashids = require('hashids');
var redis = require('redis');
var client = redis.createClient();
var hashids = new Hashids('qchat-id');


router.get('*', function(req, res, next) {
	res.locals.page = 'chat-page';
  res.render('chat');
});

router.get('/chat', function(req, res, next) {
	res.locals.page = 'chat-page';
  res.render('chat');
});

router.post('/login', function (req, res, next) {
	var username = req.body.username;
	var password = req.body.password;
	var md5 = crypto.createHash('md5');
	
	if (username.length <= 0) {
		return res.json({status: 0, message: '用户名必填'});
	}
	if (password.length <= 4) {
		return res.json({status: 0, message: '密码长度大于4'});
	}

 	client.get('users:' + username, function(err, result){
 		if (!err && result) {
 			var user = JSON.parse(result);
 			var md5pwd = md5.update(new Buffer(username + password + user.create)).digest('hex');
 			
 			if (md5pwd === user.password) {
 				delete user.password;
 				req.session.user = user;
 				res.json({status: 1, message: '登录成功', user: user});
 			} else {
 				res.json({status: 0, message: '用户名或密码错误1'});
 			}
 		} else {
			res.json({status: 0, message: '用户名或密码错误2'});
 		}
  });
});

router.post('/register', function (req, res, next) {
	var username = req.body.username;
	var password = req.body.password;
	var date = moment().unix();
	var md5 = crypto.createHash('md5');
	var uid = hashids.encode(date, parseInt(Math.random() * 1000), parseInt(Math.random() * 100));

	if (username.length <= 0) {
		return res.json({status: 0, message: '用户名必填'});
	}
	if (password.length <= 4) {
		return res.json({status: 0, message: '密码长度大于4'});
	}

	client.get('users:' + username, function(err, result) {
		if (!err) {
			if (!result) {
				var md5pwd = md5.update(new Buffer(username + password + date)).digest('hex');
				var user = {uid: uid, username: username, password: md5pwd, create: date};
			 	client.set('users:' + username, JSON.stringify(user), function(err, addRes){
			 		if (err) {
 						res.json({status: 0, message: '注册失败'});
			 		} else {
 						delete user.password;
 						req.session.user = user;
 						res.json({status: 1, message: '注册成功'});
			 		}
			  });
			} else {
				res.json({status: 0, message: '用户名已存在'});
			}
		} else {
			res.json({status: 0, message: '连接失败'});
		}
	});
});


module.exports = router;
