var GAME_NOT_FOUND = "没有这个游戏！";
var GAME_FULL = "游戏人数已满！";
var GAME_STARTED = "游戏状态不是等待！";
var ALREADY_IN_GAME = "已经加入这个游戏！";
var NOT_IN_GAME = "不在这个游戏！";
var NOT_HOST_IN_GAME = "不是游戏创建者！";
var GAME_NOT_READY = "游戏状态不能开始！";
var GAME_NOT_STARTED = "游戏没有开始！";

var GAME_STATE_WAITING = 0;
var GAME_STATE_STARTED = 1;
var GAME_STATE_STOPPED = 2;

module.exports = function(app) {
	return new GameRemote(app);
};

var GameRemote = function(app) {
	this.app = app;
	this.channelService = app.get('channelService');
};

var currentgameid = 0;

var games = new Map()
var maps = new Map()
var players = new Map()

var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/rman';

function SaveUserInfo(userid)
{
    var player = players.get(userid)
   
    MongoClient.connect(url, function (err, db) {
        var collection = db.collection('User');
        var result = collection.find({"name": userid}, {"score":1,"_id":0})
        result.each(function(err, doc) {
            if (doc != null) {
                var newscore = parseInt(doc.score) + player.Score
                collection.update({'name':userid},{$set:{'score':newscore}})
            } 
            db.close();
        });
    });     
}

function Player(userid, x, y, gameid)
{
    this.X = x
    this.Y = y
    this.Userid = userid
    this.GameID = gameid.toString()
    this.Score = 0
    this.Role = "pacman"
}

function Game(userid, gamename, maxplayer, city, x1, y1, x2, y2, gametype) {
    currentgameid = currentgameid + 1;
    this.ID = currentgameid;
    this.GameName = gamename;
    this.Maxplayer = maxplayer;
    this.City = city;
    this.X1 = x1;
    this.Y1 = y1;
    this.X2 = x2;
    this.Y2 = y2;
    this.GameType = gametype;
    this.Host = userid
    this.CurrentPlayers = []
    this.CurrentPlayers.push(userid)
    this.State = GAME_STATE_WAITING
    this.Distance = NaN
}

function Cell(x,y,role)
{
    this.X = x
    this.Y = y
    this.Role = role
}

function GameMap(row, column, grid) {
    this.Row = row
    this.Column = column
    this.Grid = grid
}

function SetupMap(game){
    var distanceX = 2.0/11000.0 // 2m
    var distanceY = 2.0/11000.0 // 2m
    
    var cellgrid = [];
    
    var row = Math.round((game.Y2-game.Y1)/distanceY)
    var column = Math.round((game.X2 - game.X1)/distanceX)
    
    for (var i = 0; i < row; i++){
        for (var j=0; j < column;j++){
            var pointX = game.X1 + 0.5*distanceX + i*distanceX
            var pointY = game.Y1 + 0.5*distanceY + j*distanceY
            var cell = new Cell(pointX, pointY, "bean")
            cellgrid.push(cell)	
        }
    }
    
    for(var i = 0; i<game.CurrentPlayers.length;i++)
    {
        var userid = game.CurrentPlayers[i]
        if(players.has(userid))
        {
            var player = players.get(userid)
            var cellindex = 0
            if(player.X > game.X1 && player.X < game.X2 && player.Y > game.Y1 && player.Y < game.Y2)
            {
                var playerRow = Math.round( (player.X - game.X1)/distanceX)
                var playerColumn =Math.round( (player.Y - game.Y1)/distanceY)
                cellindex = playerRow*column + playerColumn
            }
            while(cellgrid[cellindex].Role === "player"){
                cellindex = (cellindex+1)%(row*column)
            }
            player.X = cellgrid[cellindex].X
            player.Y = cellgrid[cellindex].Y
            cellgrid[cellindex].Role = "player"            
        }
    }
    var map = new GameMap(row, column, cellgrid)
    maps.set(game.ID.toString(), map)
}

function NotifyGameStart(gameid, app)
{
    var channelService = app.get('channelService');
	var param = {
        route: 'onStart',
		msg: "hehe"
	};
	var channel = channelService.getChannel(gameid, true);
    channel.pushMessage(param);
	
}

function UpdateMap(gameid, userid)
{
	var distanceX = 0.5/11000.0 // 0.5m
	var distanceY = distanceX	

    var gamemap = maps.get(gameid)
    var player = players.get(userid)

    for(var i = 0; i<gamemap.Grid.length;i++)
	{
        var cell = gamemap.Grid[i]
		if (cell.Role == "bean"){
			var startX = cell.X - distanceX
			var stopX = cell.X + distanceX
			var startY = cell.Y - distanceY
			var stopY = cell.Y + distanceY
			
			if( player.X > startX && player.X < stopX && player.Y > startY && player.Y < stopY){
				console.log("UpdateMap: eat :[" +  cell.X + "][" + cell.Y + "]")
				cell.Role = "empty"
				player.Score = player.Score + 1
			}			
		}
	}  
}

GameRemote.prototype.create = function (msg, next) {
    console.log(msg)
    
    var smallx = parseFloat(msg.x1)
    var bigx = parseFloat(msg.x2)
    if(smallx > bigx)
    {
        var tempx = smallx
        smallx = bigx
        bigx = tempx
    }
    var smally = parseFloat(msg.y1)
    var bigy = parseFloat(msg.y2)
    if(smally > bigy)
    {
        var tempy = smally
        smally = bigy
        bigy = tempy
    }
    var sucess = true
    var message = ""
    var game
    var userid = msg.userid
    if(players.has(userid))
    {
        sucess = false
        message = ALREADY_IN_GAME
        game = games.get(players.get(userid).GameID)
    }
    else
    {
        game = new Game(msg.userid,msg.gamename, msg.maxplayer, msg.city, smallx, smally, bigx, bigy, msg.gametype);
        var player = new Player(userid, parseFloat(msg.playerx), parseFloat(msg.playery), game.ID)
        players.set(userid,player)
        games.set(game.ID.toString(), game)
        
        // create channel for this game
        // var channelService = this.app.get('channelService');
        // var channel = channelService.getChannel(game.ID, true);
        // console.log(channel)
        // channel.add(userid, this.app.get('serverId'))
        
        //put user into channel
        //this.app.rpc.game.gameRemote.add(session, userid, this.app.get('serverId'), game.ID, true);
        
        //this.app.rpc.chat.chatRemote.add(session, )
    }

    next(null, {
        sucess: sucess,
        message: message,
        game: JSON.stringify(game)
    });
};

GameRemote.prototype.list = function (msg, next) {
    var city = msg.city;  
    var gamesincity = [];
    for (var game of games.values()) {
        if (city == "-1" || city == game.City) {
            gamesincity.push(game)
        }
    }
    

    if(!!msg.X && !!msg.Y)
    {
        var x = parseFloat(msg.X);
        var y = parseFloat(msg.Y);
        if(!isNaN(x) && !isNaN(y))
        {
            for(var game of gamesincity)
            {
                if(game.X1 <= x && game.X2>=x && game.Y1<=y&&game.Y2>=y)
                {
                    game.Distance = 0;
                }
                else
                {
                    game.Distance = Math.sqrt((Math.pow((game.X1 + game.X2)/2 - x,2) + Math.pow((game.Y1 + game.Y2)/2-y, 2)))
                }
            }
            gamesincity.sort(function(a, b){
                return a.Distance - b.Distance
            })
        }
    }
    next(null, {
        games: JSON.stringify(gamesincity)
    });
    for (var game of games.values()) {
        game.Distance = NaN
    }    
};

GameRemote.prototype.join = function (msg, next) {
    var gameid = msg.gameid
    var userid = msg.userid
    var playerx = parseFloat(msg.playerx)
    var playery = parseFloat(msg.playery)
    var success = false
    var message = GAME_NOT_FOUND
    if (games.has(gameid)) {
        var game = games.get(gameid)
        if (game.CurrentPlayers.length >= game.Maxplayer) 
        {
            message = GAME_FULL
        }
        else 
        {
            var found = false
            for (var i = 0; i < game.CurrentPlayers.length; i++) {
                if (game.CurrentPlayers[i] === userid) {
                    found = true
                    break
                }
            }
            if (found) {
                message = ALREADY_IN_GAME
            }
            else {
                var player = new Player(userid, playerx, playery, game.ID)
                players.set(userid, player)
                game.CurrentPlayers.push(userid)
                message = ""
                success = true
                
                        
                //put user into channel
                //this.app.rpc.game.gameRemote.add(session, userid, this.app.get('serverId'), game.ID, true);
        
                // var channelService = this.app.get('channelService');
                // var channel = channelService.getChannel(game.ID, false);
                // console.log(channel)
                // channel.pushMessage({route: 'onJoin',user: userid})
                // channel.add(userid, this.app.get('serverId'))
            }
        }
    }

    next(null, {
        success: success,
        message: message
    });
};

GameRemote.prototype.leave = function (msg, next) {
    var gameid = msg.gameid
    var userid = msg.userid
    var success = false
    var message = GAME_NOT_FOUND

    if(games.has(gameid))
    {
        var game = games.get(gameid)
        var index = -1
        for(var i = 0;i<game.CurrentPlayers.length;i++)
        {
            if(game.CurrentPlayers[i] === userid)
            {
                index = i
                break
            }
        }            
        if (index > -1) {
            message = ""
            success = true
            players.delete(userid)
            game.CurrentPlayers.splice(index, 1)
            if (game.CurrentPlayers.length == 0) {
                games.delete(game.ID)
            }
            else if (game.Host == userid) {
                game.Host = game.CurrentPlayers[0]
            }
        }
        else {
            message = NOT_IN_GAME
        }        
    }

    next(null, {
        success: success,
        message: message
    });
};

GameRemote.prototype.start = function (msg, next) {
    var gameid = msg.gameid
    var userid = msg.userid
    var success = false
    var message = GAME_NOT_FOUND

    if(games.has(gameid))
    {
        var game = games.get(gameid)
        if (userid === game.Host) {
            if (game.State === GAME_STATE_WAITING) {
                success = true
                message = ""
                game.State = GAME_STATE_STARTED
                SetupMap(game)
                //NotifyGameStart(game.ID, this.app)
            }
            else {
                message = GAME_NOT_READY
            }
        }
        else {
            message = NOT_HOST_IN_GAME
        }        
    }

    next(null, {
        success: success,
        message: message
    });
};

GameRemote.prototype.stop = function (msg, next) {
    var gameid = msg.gameid
    var userid = msg.userid
    var success = false
    var message = GAME_NOT_FOUND

    if(games.has(gameid))
    {
        var game = games.get(gameid)
        if (userid === game.Host) {
            if (game.State === GAME_STATE_STARTED) {
                success = true
                message = ""
                game.State = GAME_STATE_STOPPED
                SaveUserInfo(userid)
            }
            else {
                message = GAME_NOT_STARTED
            }
        }
        else {
            message = NOT_HOST_IN_GAME
        }        
    }

    next(null, {
        success: success,
        message: message
    });
};

GameRemote.prototype.querymap = function (msg, next) {
    var gameid = msg.gameid
    var success = false
    var message = GAME_NOT_FOUND

    if(games.has(gameid))
    {
        var game = games.get(gameid)
        if(game.State === GAME_STATE_STARTED)
        {
            var map = maps.get(gameid)
            success = true
            message = ""
        }
        else
        {
            message = GAME_NOT_STARTED
        }
    }

    next(null, {
        success: success,
        message: message,
        map: JSON.stringify(map)
    });
};

GameRemote.prototype.report = function (msg, next) {
    var userid = msg.userid
    var x = parseFloat(msg.x)
    var y = parseFloat(msg.y)
    var player
    if(players.has(userid))
    {
        player = players.get(userid)
        player.X = x
        player.Y = y
        UpdateMap(player.GameID, userid)
    }

    next(null, {
        player: JSON.stringify(player)
    });
};

GameRemote.prototype.reportalluser = function (msg, next) {
    next(null, {
        players: JSON.stringify(Array.from(players.values()))
    });
};

/**
 * Add user into chat channel.
 *
 * @param {String} uid unique id for user
 * @param {String} sid server id
 * @param {String} name channel name
 * @param {boolean} flag channel parameter
 *
 */
GameRemote.prototype.add = function(uid, sid, name, flag) {
	var channel = this.channelService.getChannel(name, flag);
	var param = {
		route: 'onJoin',
		user: uid
	};
	channel.pushMessage(param);

	if( !! channel) {
		channel.add(uid, sid);
	}
};

/**
 * Get user from chat channel.
 *
 * @param {Object} opts parameters for request
 * @param {String} name channel name
 * @param {boolean} flag channel parameter
 * @return {Array} users uids in channel
 *
 */
GameRemote.prototype.get = function(name, flag) {
	var users = [];
	var channel = this.channelService.getChannel(name, flag);
	if( !! channel) {
		users = channel.getMembers();
	}
	for(var i = 0; i < users.length; i++) {
		users[i] = users[i].split('*')[0];
	}
	return users;
};

/**
 * Kick user out chat channel.
 *
 * @param {String} uid unique id for user
 * @param {String} sid server id
 * @param {String} name channel name
 *
 */
GameRemote.prototype.kick = function(uid, sid, name) {
	var channel = this.channelService.getChannel(name, false);
	// leave channel
	if( !! channel) {
		channel.leave(uid, sid);
	}
	var username = uid.split('*')[0];
	var param = {
		route: 'onLeave',
		user: username
	};
	channel.pushMessage(param);
};
