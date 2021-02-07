const express = require('express');
const session = require('express-session');
const redis = require('redis');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const flash = require('connect-flash');
const connectRedis = require('connect-redis');
const path = require('path');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const passportInit = passport.initialize();
const passportSession = passport.session();
const {Pool, Client} = require('pg');
// const pg = require('pg');
const bodyParser = require('body-parser');
const sharedsession = require("express-socket.io-session");

//Imports
// const INDEXROUTER = require('./routers/index');
const PSQLConfig = require('./config/psqlConf.js');
const tableQueries = require('./queries/createTables.js');

//Consts
const EXPRESSPORT = 3000;
const REDISPORT = 6379;
const MAXAGE = 1000*60*60*24*365;
const SECRET = 'wingardium leviosa';
const RedisStore = connectRedis(session);
const REDISHOST = '127.0.0.1';
const redisClient = redis.createClient({
    host: REDISHOST,
    port: REDISPORT
})
const STORE = new RedisStore({ client: redisClient });

//Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(flash());
app.use(express.static(__dirname + '/public'));

//App Config
app.set('trust proxy', 1);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');


// app.use('/', INDEXROUTER);

//Redis co
redisClient.on('error', (err)=>{
	console.log('Failed to connect to redis server.' + err);
});

redisClient.on('connect', (err)=>{
	console.log('Successfully connected to redis server.');
});


var SESSION = session({
	store: STORE,
	secret: SECRET,
	resave: false,
	saveUninitialized: false,
	cookie: {
		secure: false, 
		httpOnly: false, 
		maxAge: MAXAGE
	}
})

app.use(SESSION)

// Psql co & creating tables
const pool = new Pool(PSQLConfig);

pool.query(tableQueries.Game, (err, res) => 
{
	if (err) {	
		console.log(err);
	} else {
		console.log(res.command + " Table Game");
	}
});

pool.query(tableQueries.User, (err, res) => 
{
	if (err) {	
		console.log(err);
	} else {
		console.log(res.command + " Table User");
	}
});

pool.query(tableQueries.GameMove, (err, res) => 
{
	if (err) {	
		console.log(err);
	} else {
		console.log(res.command + " Table GameMove");
	}
});

pool.query(tableQueries.InitGameState, (err, res) => 
{
	if (err) {	
		console.log(err);
	} else {
		console.log(res.command + " Table InitGameState");
	}
});

app.use((req, res, next)=>{
	sess = req.session;
    if (sess.uid && sess.username){
    	console.log(sess.username, "making request");
    	sess.loggedIn=true;
    }else if(sess.uid === -1){
    	console.log("Anonymous user making request");
    	sess.loggedIn=false;
    }else{
    	sess.uid = -1;
    	sess.hostname = req.hostname;
    	sess.loggedIn=false;
    	console.log("New user making request");
    }
    next();
})

io.use(sharedsession(SESSION));


//GETS

app.get('/favicon.ico', (req, res) => res.status(204));

app.get("/", (req, res) => {
    sess = req.session;
	res.render('index', {title: 'Ochess', username: sess.username, loggedIn:req.session.loggedIn})
	// pool.query('SELECT * FROM "Game" WHERE uid2 = $1;', [0], (err, r) =>{
	// 	if (err) {
	// 		console.log(err);
	// 	} else {
	// 	}
	// });

});

app.get('/signup', (req, res)=>{res.render('signup', {title: 'Sign up', loggedIn:req.session.loggedIn})});


app.get("/login", (req, res)=>{
	res.render('login', {title: 'Ochess', loggedIn:req.session.loggedIn, success: req.flash('success')[0]});
});


app.get("/logout", (req, res)=>{
    req.session.destroy(err => {
        if (err) {
            return console.log(err);
        }
        res.redirect('/');
    });
});

app.get("/create", (req, res)=>{
	res.render('create', {title: 'Create a game', loggedIn:req.session.loggedIn});
});

app.get("/initData/:gid", (req, res)=>{
	const query = 'SELECT * FROM "Game" WHERE gid = $1';
	const values = [req.params.gid];
	pool.query(query, values, (err, r) =>{
		if (err) {
			console.log("error");
		} else {	
			var result = r.rows[0];
			if(result.white == req.session.uid){
				result.eyeView = "white";
				result.uid = req.session.uid;
				res.json(result);
			}else{
				result.eyeView = "black";
				result.uid = req.session.uid;
				res.json(result);
			}
		}
	});
}) 

app.get("/:gid", (req, res)=>{
	pool.query('SELECT * FROM "Game" WHERE gid = $1;', [req.params.gid], (err, r) =>{
		if (err) {
			console.log(err);
			res.redirect('/');
		} else {
			if(r.rows === undefined || r.rows.length == 0) {
				res.redirect('/');
			}else{
				res.render('play', {title: '...Playing', loggedIn:req.session.loggedIn});
			}
			// console.log(r.command + " New User");
		}
	});
});


//POSTS

app.post('/signup', (req, res)=>{
	const signupQuery = 'INSERT INTO "User"(username, email, password, rw, rx, rs) VALUES($1, $2, $3, $4, $5, $6);'
	const {username, email, password} = req.body;
	const values = [username, email, password, 1000, 1000, 1000];
	//before adding, data needs to go through verification stage.
	//password also still needs to get hashed
	pool.query(signupQuery, values, (err, r) =>{
		if (err) {
			console.log(err);
			res.render('signup', {title: 'Sign up', error: true, loggedIn:req.session.loggedIn});
		} else {	
			console.log(r.command + " New User");
			req.flash('success', true);
			res.redirect('/login');
		}
	});
});


app.post("/login", (req, res) => {
	sess = req.session;
	const loginQuery = 'SELECT uid, password FROM "User" WHERE username=$1;'
	const {username, password} = req.body;
	var data;
	pool.query(loginQuery, [username], (err, r) =>{
		if (err) {
			console.log(err);
			res.render('login', {title: 'Log in', error: true, loggedIn:req.session.loggedIn});
		} else {	
			data = r.rows[0];
			console.log(r.rows[0])
			if(data.password===password){
				sess.uid = data.uid;
				sess.username = username;
				res.redirect('/');
			}else{
				res.render('login', {title: 'Log in', error: true, loggedIn:req.session.loggedIn});
			}
		}
	});
});

app.post('/create', (req, res)=>{
	const insertGameQuery = 'INSERT INTO "Game"(uid1, uid2, variant, time, increment, live, movecount) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING gid'
	const {variant} = req.body;
	console.log(req.body);
	const values = [req.session.uid, 0, variant, 10, 3, false, 0];
	pool.query(insertGameQuery, values, (err, r) =>{
		if (err) {
			console.log(err);
			res.render('create', {title: 'Create a game', error: true, loggedIn:req.session.loggedIn});
		} else {	
			res.render('waiting', {title: 'Create a game', id: r.rows[0].gid, error: true, loggedIn:req.session.loggedIn});
		}
	});
});

//Socket.io

io.on('connection', (socket) => {
	var session = socket.handshake.session;

	console.log('user with id', session.uid, ' connected');

	socket.on('getGames', (data)=>{ //gets games where oppponent is waiting for partner
		const query = 'SELECT * FROM "Game" WHERE uid2 = $1';
		pool.query(query, [0], (err, r) =>{
			if (err) {
				console.log(err);
			} else {
				socket.emit('getGames', r.rows);
			}
		});
	});


	socket.on('waiting', (gid)=>{ //loads page where user waits for opponent
		const query = 'SELECT uid2 FROM "Game" WHERE gid = $1';
		const values = [gid];
		pool.query(query, values, (err, r) =>{
			if (err) {
				console.log(err);
			} else {	
				socket.emit('waiting', r.rows[0].uid2);
			}
		});
	})	

	socket.on('joinGame', (data, callback)=>{ //opponent joins game through link on home page
		var rand = Math.floor(Math.random() * Math.floor(2));
		var query;
		if(rand == 0){
			query = 'UPDATE "Game" SET uid2 = $1, live = $2, white = uid1 WHERE gid = $3';
		}else{
			query = 'UPDATE "Game" SET uid2 = $1, live = $2, white = $1 WHERE gid = $3';
		}
		const values = [session.uid, true, data];
		pool.query(query, values, (err, r) =>{
			if (err) {
				console.log(err);
				callback('error');
			} else {	
				socket.emit('redirect', '/'+data);
			}
		});
	});


	socket.on('setRoom', (roomid)=>{
		console.log('user with id', session.uid, ' joined room '+roomid);
		socket.join(roomid);
	});

	socket.on('leaveRoom', (roomid)=>{
		console.log('user with id', session.uid, ' left room '+roomid);
		socket.leave(roomid);
	})

	socket.on('getInitBoardState', (variant)=>{ //gets the initial state of the board
		const query = 'SELECT gamestate FROM "InitGameState" WHERE variant = $1';
		const values = [variant];
		pool.query(query, values, (err, r) =>{
			if (err) {
				console.log(err);
			} else {	
				socket.emit('getInitBoardState', r.rows[0].gamestate);
			}
		});
	})

	socket.on('getBoardStates', (gid)=>{
		const query = 'SELECT * FROM "GameMove" WHERE gid = $1 ORDER BY tid ASC';
		const values = [gid];
		pool.query(query, values, (err, r) =>{
			if (err) {
				console.log(err);
			} else {
				socket.emit('getBoardStates', r.rows);
			}
		});
    })

	socket.on('sendGameState', (moveInfo)=>{
		const query1 = 'UPDATE "Game" SET movecount = movecount + 1 WHERE gid = $1 RETURNING movecount';
		const values1 = [moveInfo.gid];
		pool.query(query1, values1, (err, r) =>{
			if (err) {
				console.log(err);
			} else {
				const query2 = 'INSERT INTO "GameMove"(tid, gid, gamestate, timeremaining) VALUES($1, $2, $3, $4)';
				const values2 = [r.rows[0].movecount, moveInfo.gid, moveInfo.state, null];
				pool.query(query2, values2, (err, r) =>{
					if (err) {
						console.log(err);
					} else {
						pool.query('COMMIT', err => {
							if (err) {
								console.error('Error committing transaction', err.stack)
							}
							socket.to(moveInfo.gid).emit('sendGameState', moveInfo.state);
						});
					}
				});
			}

		});
	});

	socket.on('disconnect', () => {
		console.log('user disconnected');
	});
});


app.use((req, res, next)=>{
	next(createError(404));
});

app.use((err, req, res, next)=>{
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};
	res.status(err.status || 500);
	res.render('error', {title: 'Ochess'});
})

http.listen(EXPRESSPORT, ()=>{
	console.log(`server listening on port ${EXPRESSPORT}`);
});


