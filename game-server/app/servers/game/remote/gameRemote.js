var GAME_NOT_FOUND = "没有这个游戏！";
var GAME_FULL = "游戏人数已满！";
var GAME_STARTED = "游戏状态不是等待！";
var ALREADY_IN_GAME = "已经加入这个游戏！";
var NOT_IN_GAME = "不在这个游戏！";
var NOT_HOST_IN_GAME = "不是游戏创建者！";
var GAME_NOT_READY = "游戏状态不能开始！";
var GAME_NOT_STARTED = "游戏没有开始！";
var USER_NOT_IN_GAME = "游戏中没有这个用户！";
var PLAYERS_OUT_OF_GAME = "玩家不在地图内！"

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
var channels = new Map()

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

function GameObject(id, x, y, role, displayname, state)
{
    this.GOID = id
    this.X = x
    this.Y = y
    this.Role = role
    this.DisplayName = displayname
    this.State = state
}

function SetupMap(game){
    var distanceX = 2.0/11000.0 // 2m
    var distanceY = 2.0/11000.0 // 2m
    
    var gomap = new Map();
    
    var row = Math.round((game.Y2-game.Y1)/distanceY)
    var column = Math.round((game.X2 - game.X1)/distanceX)

    // call the imageprocessor here!!!
    var result = new Array();
    for (var i = 0; i < row; i++) {
        result[i] = new Array();
        for (var j = 0; j < column; j++) {
            if (i % 10 == 0 && j % 10 == 0)
                result[i][j] = 1
            else
                result[i][j] = 0
        }
    }

    var beanid = 0
    for (var i = 0; i < row; i++){
        for (var j=0; j < column;j++){
            if(result[i][j]==1)
            {
                var pointX = game.X1 + 0.5*distanceX + i*distanceX
                var pointY = game.Y1 + 0.5*distanceY + j*distanceY
                
                var beangoid = "bean_"+beanid
                beanid = beanid + 1
                var beango = new GameObject(beangoid, pointX, pointY, "bean", "bean", "normal")
               	gomap.set(beangoid, beango)           
            }
        }
    }
    
    for(var i = 0; i<game.CurrentPlayers.length;i++)
    {
        var userid = game.CurrentPlayers[i]
        if(players.has(userid))
        {
            var player = players.get(userid)
            var playergoid = "player_" + userid
            var role = "pacman"
            var playergo = new GameObject(playergoid, player.X, player.Y, role, userid, "normal")
            gomap.set(playergoid, playergo)        
        }
    }
    maps.set(game.ID.toString(), gomap)
}

function UpdateMap(gameid, userid)
{
	var distanceX = 0.5/11000.0 // 0.5m
	var distanceY = distanceX	

    var gomap = maps.get(gameid)
    var player = players.get(userid)

    for(var goid in gomap)
    {
        var go = gomap[goid]
		if (go.Role == "bean" && go.State == "normal"){
			var startX = go.X - distanceX
			var stopX = go.X + distanceX
			var startY = go.Y - distanceY
			var stopY = go.Y + distanceY
			
			if( player.X > startX && player.X < stopX && player.Y > startY && player.Y < stopY){
				console.log("UpdateMap: eat :[" +  go.X + "][" + go.Y + "]")
				go.State = "eaten"
                player.Score = player.Score + 1
                var channel = channels.get(gameid)
                channel.pushMessage('onMapUpdate', {goid: goid, go: go});
				channel.pushMessage('onPlayerScore', {userid: userid, score: player.Score});
			}			
		}
	}  
}

GameRemote.prototype.create = function (msg, serverid, next) { 
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
    var success = true
    var message = ""
    var game
    var userid = msg.userid
    if(players.has(userid))
    {
        success = false
        message = ALREADY_IN_GAME
        game = games.get(players.get(userid).GameID)
    }
    else
    {
        game = new Game(msg.userid,msg.gamename, msg.maxplayer, msg.city, smallx, smally, bigx, bigy, msg.gametype)

        // add channel
        var channel = this.channelService.getChannel(this.ID, true);
        channel.add(userid, serverid)
        channels.set(game.ID.toString(), channel)
    
        var player = new Player(userid, parseFloat(msg.playerx), parseFloat(msg.playery), game.ID)
        players.set(userid,player)
        games.set(game.ID.toString(), game)
    }

    next(null, {
        success: success,
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

GameRemote.prototype.join = function (msg, serverid, next) {
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
                var channel = channels.get(gameid)
                channel.pushMessage('onJoin', {user:userid});
                channel.add(userid, serverid)
                message = ""
                success = true
            }
        }
    }

    next(null, {
        success: success,
        message: message
    });
};

GameRemote.prototype.leave = function (msg, serverid, next) {
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
            var channel = channels.get(gameid)
            channel.leave(userid, serverid)
            channel.pushMessage('onLeave', {user:userid});
            if (game.CurrentPlayers.length == 0) {
                games.delete(gameid)
                channels.delete(gameid)
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
                var allplayersinsidemap = true
                for(var i = 0; i<game.CurrentPlayers.length;i++)
                {
                    var playerid = game.CurrentPlayers[i]
                    if(players.has(playerid))
                    {
                        var player = players.get(userid)
                        if(player.X >= game.X1 && player.X <= game.X2 && player.Y >= game.Y1 && player.Y <= game.Y2)
                        {
                        }
                        else
                        {
                            allplayersinsidemap = false
                            break
                        }
                    }
                }
                
                if(allplayersinsidemap)
                {
                    success = true
                    message = ""
                    game.State = GAME_STATE_STARTED
                    SetupMap(game)
                    var channel = channels.get(gameid)
                    channel.pushMessage('onStart', {user:userid});                    
                }
                else
                {
                    message = PLAYERS_OUT_OF_GAME
                }
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
        map: JSON.stringify(Array.from(map.entries()))
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
        var channel = channels.get(player.GameID)
        channel.pushMessage('onPlayerUpdate', {userid:userid,x:player.X,y:player.Y});
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
                    
GameRemote.prototype.reportusersforgame = function (msg, next){
    var gameid = msg.gameid
    var success = false
    var message = GAME_NOT_FOUND
    var players = ""
    
    if(games.has(gameid))
    {
        success = true
        message = ""
        var game = games.get(gameid)
        players = JSON.stringify(game.CurrentPlayers)
    }
    next(null, {
        success: success,
        message: message,
        players: players
    })
}

GameRemote.prototype.send = function(msg, next) {
    var gameid = msg.gameid
    
    if(games.has(gameid))
    {
        var param = {
            msg: msg.content,
            from: msg.from,
            target: msg.target
        };
        var channel = channels.get(gameid)
        var receivers = []
        if(msg.target == '*') {
            channel.pushMessage('onChat', param);
        }
        else
        {
            var member = channel.getMember(msg.target)
            if(!!member)
            {
                receivers.push({
                    uid: member.uid,
                    sid: member.sid                        
                })
                channel.pushMessageByUids('onChat', param, receivers);                            
            }
        }
        next(null, {
        });        
    }
	
};