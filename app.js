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
	res.render('index', {title: 'Ochess', username: req.session.username, loggedIn:req.session.loggedIn})
});

app.get('/signup', (req, res)=>{res.render('signup', {title: 'Sign up', loggedIn:req.session.loggedIn})});


app.get("/login", (req, res)=>{
	res.render('login', {title: 'Ochess', loggedIn:req.session.loggedIn, success: req.flash('success')[0]});
});

app.get("/xiangqi", (req, res)=>{
	res.render('xiangqi', {title: 'Ochess', username: req.session.username, loggedIn:req.session.loggedIn});
});

app.get("/shogi", (req, res)=>{
	res.render('shogi', {title: 'Ochess', username: req.session.username, loggedIn:req.session.loggedIn});
});

app.get("/western", (req, res)=>{
	res.render('western', {title: 'Ochess', username: req.session.username, loggedIn:req.session.loggedIn});
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
	res.render('create', {title: 'Create a game', username: req.session.username,  loggedIn:req.session.loggedIn});
});

app.get("/initData/:gid", (req, res)=>{
	const query = 'SELECT "g".uid1, "g".uid2, "g".variant, "g".time, "g".increment, "g".live, "g".white, "g".winner, "u".username, "u".country, "u".rw, "u".rx, "u".rs FROM "Game" AS "g" INNER JOIN "User" AS "u" ON "g".gid = $1 WHERE "u".uid IN ("g".uid1, "g".uid2);';
	const values = [req.params.gid];
	pool.query(query, values, (err, r) =>{
		if (err) {
			console.log("error");
		} else {	
			var result = r.rows[0];
			// Insert eyeView according to player's role 
			if(result.white == req.session.uid){ //white
				result.eyeView = "white";
			}else if(result.uid1 == req.session.uid || result.uid2 == req.session.uid){ //black
				result.eyeView = "black";
			}else{ //spectator
				result.eyeView = "spectator";
			}
			console.log(r.rows)
			if(result.uid1 == result.white){
				result.wusername = result.username;
				result.wcountry = result.country;
				result.wrw = result.rw;
				result.wrx = result.rx;
				result.wrs = result.rs;
				result.busername = r.rows[1].username;
				result.bcountry = r.rows[1].country;
				result.brw = r.rows[1].rw;
				result.brx = r.rows[1].rx;
				result.brs = r.rows[1].rs;
			}else{
				result.busername = result.username;
				result.bcountry = result.country;
				result.brw = result.rw;
				result.brx = result.rx;
				result.brs = result.rs;
				result.wusername = r.rows[1].username;
				result.wcountry = r.rows[1].country;
				result.wrw = r.rows[1].rw;
				result.wrx = r.rows[1].rx;
				result.wrs = r.rows[1].rs;
			}
			["white", "uid1", "uid2", "username", "country", "rw", "rx", "rs"].forEach(e => delete result[e]);
			res.json(result);
		}
	});
}) 

app.get("/:gid", (req, res)=>{
	pool.query('SELECT * FROM "Game" WHERE gid = $1;', [req.params.gid], (err, r) =>{
		if (err) {
			pool.query('SELECT * FROM "User" WHERE username = $1;', [req.params.gid], (err, r) =>{
				if(err){
					console.log(err);
					res.redirect('/');
				}else{
					if(r.rows === undefined || r.rows.length == 0) {
						res.redirect('/');
					}else{
						res.render('user', {title: 'Profile', loggedIn:req.session.loggedIn, username:req.session.username});
					}
				}
			});
		} else {
			if(r.rows === undefined || r.rows.length == 0) {
				res.redirect('/');
			}else{
				if(r.rows[0].variant==3){
					res.render('play', {title: '...Playing', username: req.session.username, loggedIn:req.session.loggedIn, shogi:true});
				}else{
					res.render('play', {title: '...Playing', username: req.session.username, loggedIn:req.session.loggedIn});
				}
			}
		}
	});
});


//POSTS

app.post('/signup', (req, res)=>{
	const signupQuery = 'INSERT INTO "User"(username, email, password, rw, rx, rs, firstname, lastname, country) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9);'
	const {username, email, password} = req.body;
	const values = [username, email, password, 1000, 1000, 1000, "Bob", "Smith", "Atlantis"];
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
	const insertGameQuery = 'INSERT INTO "Game"(uid1, uid2, variant, time, increment, live, movecount) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING gid;'
	const values = [req.session.uid, 0, req.body.type, req.body.time, req.body.increment, false, 0];
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
		const query = 'SELECT * FROM "Game" WHERE uid2 = $1 LIMIT 18';
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
			// query = 'UPDATE "Game" SET uid2 = $1, live = true, white = uid1 WHERE gid = $2 RETURNING uid1;';
			query = 'UPDATE "Game" SET uid2 = CASE WHEN uid1 = $1 THEN 0 ELSE $1 END, live = true, white = uid1 WHERE gid = $2 RETURNING uid1;';
		}else{
			// query = 'UPDATE "Game" SET uid2 = $1, live = true, white = $1 WHERE gid = $2 RETURNING uid1;';
			query = 'UPDATE "Game" SET uid2 = CASE WHEN uid1 = $1 THEN 0 ELSE $1 END, live = true, white = $1 WHERE gid = $2 RETURNING uid1;';
		}
		const values = [session.uid, data];
		pool.query(query, values, (err, r) =>{
			if (err) {
				console.log(err);
				callback('error');
			} else {
				console.log(r.rows[0]);
				if(r.rows === undefined || r.rows.length == 0){
					socket.emit('alertuser', 'Something went wrong. It is possible that you are joining a game you have created, please do not as it is not intended to be played like so');
				}else{
					console.log(r.rows[0]);
					if(r.rows[0].uid1 == session.uid){
						socket.emit('alertuser', 'Something went wrong. It is possible that you are joining a game you have created, please do not as it is not intended to be played like so');
					}else{
						socket.emit('redirect', '/'+data);
					}
				}
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
	
	socket.on('gameover', (data)=>{
		const query1 = 'SELECT * FROM "Game" WHERE gid = $1';
		pool.query(query1, [data.gid], (err, r)=>{
			if(err){
				console.log(err);
			} else{
				const uid1 = r.rows[0].uid1;
				const uid2 = r.rows[0].uid2;
				const white = r.rows[0].white;
				const variant = r.rows[0].variant;
				var loser;
				var black;
				var winner;
				(white==uid1)? (black=uid2):(black=uid1);
				(data.winnercolour=="white")?(winner=white,loser=black):(winner=black,loser=white);
				const query2 = 'UPDATE "Game" SET winner = $1, live = $2 WHERE gid = $3';
				var values2;
				if(data.type=="stalemate"){
					values2 = [null, false, data.gid];
				}else{
					values2 = [winner, false, data.gid];
				}
				console.log("winner: "+winner+", loser: "+loser);
				pool.query(query2, values2, (err, r) =>{
					if (err) {
						console.log(err);
					} else {
						console.log("game with id ", data.gid, " is over. reason: "+data.type);
						if (data.type == "stalemate"){
							socket.to(data.gid).emit('gameover', data.type);
						}
						var query3;
						switch(variant){
							case 1:
								query3 = 'UPDATE "User" SET rw = rw + 10 WHERE uid = $1;';
								break;
							case 2:
								query3 = 'UPDATE "User" SET rx = rx + 10 WHERE uid = $1;';
								break;
							case 3:
								query3 = 'UPDATE "User" SET rs = rs + 10 WHERE uid = $1;';
								break;
						}
						pool.query(query3, [winner], (err, r)=>{
							if(err){
								console.log(err);
							}else{
								console.log("player with id "+winner+"'s rating is incremented by 10");
								var query4;
								switch(variant){
									case 1:
										query4 = 'UPDATE "User" SET rw = rw - 10 WHERE uid = $1;';
										break;
									case 2:
										query4 = 'UPDATE "User" SET rx = rx - 10 WHERE uid = $1;';
										break;
									case 3:
										query4 = 'UPDATE "User" SET rs = rs - 10 WHERE uid = $1;';
										break;
								}
								pool.query(query4, [loser], (err, r)=>{
									if(err){
										console.log(err);
									}else{
										console.log("player with id "+loser+"'s rating is decremented by 10");
										socket.to(data.gid).emit('gameover', data.type);
									}
								});
							}
						});
					}
				});
			}
		})
	});

	socket.on('getPlayerInfo', (username)=>{
		pool.query('SELECT * FROM "User" WHERE username = $1', [username], (err, r) =>{
			if (err) {
				console.log(err);
			} else {
				if(r.rows === undefined || r.rows.length == 0) {
					socket.emit("getPlayerInfo", "no");
				}else{
					var uservalues = r.rows[0];
					["uid", "email", "password"].forEach(e => delete uservalues[e]);
					socket.emit("getPlayerInfo", r.rows[0]);
				}
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


