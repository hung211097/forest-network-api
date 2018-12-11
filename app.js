var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var Sequelize = require('sequelize');
var session = require('express-session');
var SequelizeStore = require('connect-session-sequelize')(session.Store);
var dbConfig = require('./settingDev').databaseConfig;

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var loginRouter = require('./routes/login');
var transactionRouter = require('./routes/transactions');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//session
var sequelize = new Sequelize(dbConfig);

var myStore = new SequelizeStore({
    db: sequelize,
    expiration: 24 * 60 * 60 * 1000 * 30,  // The maximum age (in milliseconds) of a valid session.
})

app.use(session({
    key: 'session_cookie_name',
    secret: 'session_cookie_secret',
    store: myStore,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
}));

myStore.sync();

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/login', loginRouter);
app.use('/transactions', transactionRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

const server_port = process.env.PORT || 8888;

const server = app.listen(server_port, function () {
  console.log(`App listening at port ${server_port}`)
});
