const express = require('express');
const app = express();
const session = require('express-session');
const path = require('path');
const pgSession = require('connect-pg-simple')(session);
const SessionPool = require('pg').Pool
const cookieParser = require('cookie-parser');

//include
const indexRouter = require('./routers/index');
const config = require('./config/psqlConf.js');

//config
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

//consts
const {
	PORT = 5000,
	NODE_ENV = 'development',
	SESS_NAME = 'sid',
	SESS_SECRET = 'wingardium leviosa',
	SESS_DURATION = 1000*60*60*2
} = process.env

const sessionConfig = {
	store: new pgSession({
		pool: new SessionPool(config),
		tableName: 'session'
	}),
	name: SESS_NAME,
	secret: SESS_SECRET,
	resave: false,
	saveUninitialized: true,
	cookie: {
		maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
		sameSite: true,
		secure: false 
	}
}

//middleware
app.use(express.json());
app.use(express.urlencoded({extended:false}));
app.use(cookieParser());
app.use('/', indexRouter);
app.use(session(sessionConfig))

//error catching
app.use((req, res, next)=>{
	next(createError(404));
});

app.use((err, req, res, next)=>{
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};
	res.status(err.status || 500);
	res.render('error', {title: 'Ochess'});
})

app.listen(5000, ()=>{
	console.log('server listening on port 5000');
});