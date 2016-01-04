var WRONG_PASSWORD_CODE = 502;
var ALREADY_LOGIN_CODE = 503;

module.exports = function (app) {
	return new Handler(app);
};

var Handler = function (app) {
	this.app = app;
};

var handler = Handler.prototype;

var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/rman';

var addUser = function (db, userid, password, callback) {
	var collection = db.collection('User');
	collection.insertMany([
		{
			name: userid, password: password, displayname: userid, score: 0
		}
	], function (err, result) {
		if (err != null) {
			console.log("Error when add user" + userid)
		}
		callback();
	});
}

var validateUser = function (db, userid, password, callback) {
	var collection = db.collection('User');
	collection.find({ name: { $eq: userid }, password: { $eq: password } }).toArray(function (err, users) {
		callback(users);
	});
}

var findUser = function (db, userid, callback) {
	var collection = db.collection('User');
	collection.find({ name: { $eq: userid } }).toArray(function (err, users) {
		callback(users);
	});
}

var passLogin = function (user, app, session, next) {
	var sessionService = app.get('sessionService');

	var userid = user.userid;
	//duplicate log in
	if (!!sessionService.getByUid(userid)) {
		next(null, {
			code: ALREADY_LOGIN_CODE,
		});
		return;
	}

	session.bind(userid);
	session.set('rid', userid);
	session.push('rid', function (err) {
		if (err) {
			console.error('set rid for session service failed! error is : %j', err.stack);
		}
	});
	session.on('closed', onUserLeave.bind(null, app));

	//put user into channel
	var uid = userid
	var rid = "gameid"
	app.rpc.chat.chatRemote.add(session, uid, app.get('serverId'), rid, true, function (users) {
		next(null, {
			displayname: user.displayname,
			users: users
		});
	});
}
/**
 * New client entry chat server.
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next stemp callback
 * @return {Void}
 */
handler.enter = function (msg, session, next) {
	var self = this;
    var userid = msg.userid;
    var pwd = msg.pwd;

	// validate user
	MongoClient.connect(url, function (err, db) {
		validateUser(db, userid, pwd, function (users) {
			if (users.length <= 0) {
				findUser(db, userid, function (users) {
					if (users.length <= 0) {
						addUser(db, userid, pwd, function () { })
						console.log("new user: " + userid)
						passLogin({userid:userid, displayname:userid}, self.app, session, next);
					}
					else {
						console.log("wrong password: " + userid)
						next(null, {
							code: WRONG_PASSWORD_CODE,
						});
						return;
					}
					db.close();
				})
			}
			else {
				console.log("correct password: " + userid)
				db.close();
				passLogin({userid:userid, displayname:users[0].displayname}, self.app, session, next);
			}
		})
	});
};

/**
 * User log out handler
 *
 * @param {Object} app current application
 * @param {Object} session current session object
 *
 */
var onUserLeave = function (app, session) {
	if (!session || !session.uid) {
		return;
	}
	app.rpc.chat.chatRemote.kick(session, session.uid, app.get('serverId'), session.get('rid'), null);
};