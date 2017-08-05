var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var config = require('config-lite')(__dirname);
var sio = require('socket.io')();

var index = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var sessionStore = new RedisStore({
  "host": config.redis.host,
  "port": config.redis.port,
});

app.use(session({
	name: config.session.key,
	secret: config.session.secret,
	resave: true,
	saveUninitialized: true,
  store: sessionStore,
	cookie: {
		maxAge: config.session.maxAge
	}
}));

app.use(function (req, res, next) {
	res.locals.user = req.session.user;
  res.locals.staticUrl = config.static;
  res.locals.page = 'default';
	res.locals.errors = '';
	next();
});


app.use('/', index);

app.sio = sio;
var socketLib = require('./lib/socket')(sio, sessionStore);

app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
