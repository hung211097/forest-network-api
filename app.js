var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var logger = require('morgan');
var cors = require('cors');

var Sequelize = require('sequelize');
var session = require('express-session');
var SequelizeStore = require('connect-session-sequelize')(session.Store);
var dbConfig = require('./settingDev').databaseConfig;
var StartWebSocket = require('./websocket')
var handleLayoutMDW = require('./middleware/handle-layout');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var loginRouter = require('./routes/login');
var logoutRouter = require('./routes/logout');
var registerRouter = require('./routes/register');
var followRouter = require('./routes/follow');
var transactionRouter = require('./routes/transactions');

var app = express();
app.use(cors({
  credentials: true,
  origin: 'http://localhost:3000',
  methods: ['GET', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTION'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204
}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
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
    rolling: true,
    unset: 'destroy',
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: false,
      secure: false
    }, // 30 days
}));

myStore.sync();
StartWebSocket(); //Chạy web socket bắt thay đổi của height blockchain -> hiện chỉ bắt, ko update db vì db chưa hoàn chỉnh

app.use(handleLayoutMDW);

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/login', loginRouter);
app.use('/logout', logoutRouter);
app.use('/register', registerRouter);
app.use('/follow', followRouter);
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
