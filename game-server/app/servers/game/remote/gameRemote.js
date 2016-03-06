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
var NOT_CAPABLE = "玩家没有这个道具！";

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
    this.State = "normal"
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

function SetupMap(game, channelService){
    var distanceX = 2.0/111000.0 // 2m
    var distanceY = 2.0/111000.0 // 2m
    console.log("distance for bean (setup): " + distanceX)
    
    var gomap = new Map();
    
    // assign role for players
    // assume pacman:ghost = 3
    var ratio = 3
    for (var i = 0; i < game.CurrentPlayers.length; i++) 
    {
        var userid = game.CurrentPlayers[i]
        if (players.has(userid)) 
        {
            var player = players.get(userid)
            var playergoid = "player_" + userid
            var role = "pacman"
            if (i % (ratio + 1) == 0)
                role = "ghost"
            
            var channel = channels.get(game.ID.toString())
            var member = channel.getMember(userid)
            if(!!member)
            {
                var receivers = []
                receivers.push({
                    uid: member.uid,
                    sid: member.sid                        
                })
                var param = {role: role, instruction: "your role is to ..."}
                channelService.pushMessageByUids('onRoleAssigned', param, receivers);                            
            }
            player.Role = role
            var playergo = new GameObject(playergoid, player.X, player.Y, role, userid, "normal")
            gomap.set(playergoid, playergo)
        }
    }

    var row = Math.round((game.Y2-game.Y1)/distanceY)
    var column = Math.round((game.X2 - game.X1)/distanceX)
    
    console.log(" row:"+row)
    console.log(" column:"+column)

    // call the imageprocessor here!!!
    var result = new Array();
    for (var i = 0; i < row; i++) {
        result[i] = new Array();
        for (var j = 0; j < column; j++) {
            if (i % 10 == 0 && j % 10 == 0)
                result[i][j] = 1
            else
                result[i][j] = 0 // 0, //make all as bean for testing
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
                var beango = new GameObject(beangoid, pointX.toString(), pointY.toString(), "bean", "bean", "normal")
               	gomap.set(beangoid, beango)           
            }
        }
    }
    
    maps.set(game.ID.toString(), gomap)
}

function UpdateMap(gameid, userid)
{
	var distanceX = 0.5/111000.0 // 0.5m
	var distanceY = distanceX	
    console.log("distance for bean (eat): " + distanceX)

    var gomap = maps.get(gameid)
    var player = players.get(userid)

    gomap.forEach(function loop(go, goid, map) {
        if (go.State == "normal"){
            var startX = go.X - distanceX
            var stopX = parseFloat(go.X + distanceX)
            var startY = go.Y - distanceY
            var stopY = parseFloat(go.Y + distanceY)
            
            if( player.X > startX && player.X < stopX && player.Y > startY && player.Y < stopY)
            {
                if(go.Role === "bean" && player.Role === "pacman")
                {
                    console.log("UpdateMap: eat bean :[" +  go.X + "][" + go.Y + "]")
                    go.State = "eaten"
                    player.Score = player.Score + 1
                    var channel = channels.get(gameid)
                    channel.pushMessage('onMapUpdate', {goid: goid, go: go});
                    channel.pushMessage('onPlayerScore', {userid: userid, score: player.Score});                        
                }
                else if(go.Role === "pacman" && player.Role === "ghost")
                {
                    console.log("UpdateMap: eat pacman :[" +  go.X + "][" + go.Y + "]")
                    go.State = "dead"
                    player.Score = player.Score + 10
                    var channel = channels.get(gameid)
                    channel.pushMessage('onMapUpdate', {goid: goid, go: go});
                    channel.pushMessage('onPlayerScore', {userid: userid, score: player.Score});                        
                }
            }			
        }
    })
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
                
                // if(allplayersinsidemap)
                // {
                    success = true
                    message = ""
                    game.State = GAME_STATE_STARTED
                    SetupMap(game, this.channelService)
                    var channel = channels.get(gameid)
                    channel.pushMessage('onStart', {user:userid});                    
                // }
                // else
                // {
                //     message = PLAYERS_OUT_OF_GAME
                // }
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
                
                for(var playerid of game.CurrentPlayers)
                {
                    players.delete(playerid)
                }
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
        var limit = 1.0/111000 // 1m
        player = players.get(userid)
        var channel = channels.get(player.GameID)
        if(player.State === "freeze")
        {
            if(Math.abs(x-player.X) >= limit || Math.abs(y-player.Y) >= limit)
            {
                channel.pushMessage('onOutScope', {userid:userid,x:player.X,y:player.Y});                
            }
        }
        else if(player.State === "target")
        {
            player.X = x
            player.Y = y

            if(Math.abs(player.TargetX-player.X) >= limit || Math.abs(player.TargetY-player.Y) >= limit)
            {
                channel.pushMessage('onNotReachTarget', {userid:userid,x:player.X,y:player.Y});
            }
            else
            {
                channel.pushMessage('onReachTarget', {userid:userid,x:player.X,y:player.Y});
                player.State = "normal"                                
            }
        }
        else if(player.State === "normal")
        {
            player.X = x
            player.Y = y

            channel.pushMessage('onPlayerUpdate', {userid:userid,x:player.X,y:player.Y});
                    
            var gomap = maps.get(player.GameID)
            if(!!gomap)
            {
                var playergo = gomap.get("player_"+userid)
                if(!!playergo)
                {
                    playergo.X = x
                    playergo.Y = y
                    UpdateMap(player.GameID, userid)                 
                }                
            }
        }
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
                this.channelService.pushMessageByUids('onChat', param, receivers);                            
            }
        }
        next(null, {
        });        
    }
	
};

GameRemote.prototype.kickuser = function (msg, serverid, next) {
    var gameid = msg.gameid
    var userid = msg.userid
    var kickuserid = msg.kickuserid
    var success = false
    var message = GAME_NOT_FOUND

    if(games.has(gameid))
    {
        var game = games.get(gameid)
        if (userid === game.Host) {
            var index = -1
            for(var i = 0;i<game.CurrentPlayers.length;i++)
            {
                if(game.CurrentPlayers[i] === kickuserid)
                {
                    index = i
                    break
                }
            }            
            if (index > -1) {
                message = ""
                success = true
                players.delete(kickuserid)
                game.CurrentPlayers.splice(index, 1)
                var channel = channels.get(gameid)
                channel.leave(kickuserid, serverid)
                channel.pushMessage('onLeave', {user:kickuserid});
                if (game.CurrentPlayers.length == 0) {
                    games.delete(gameid)
                    channels.delete(gameid)
                }
                else if (game.Host == userid) {
                    game.Host = game.CurrentPlayers[0]
                }                
            }
            else
            {
                message = USER_NOT_IN_GAME
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


GameRemote.prototype.freezeuser = function (msg, next) {
    var gameid = msg.gameid
    var userid = msg.userid
    var freezeuserid = msg.freezeuserid
    var success = false
    var message = GAME_NOT_FOUND

    if(games.has(gameid))
    {
        var game = games.get(gameid)
        if (true) { // later need check if user have this ability
            var index = -1
            for(var i = 0;i<game.CurrentPlayers.length;i++)
            {
                if(game.CurrentPlayers[i] === freezeuserid)
                {
                    index = i
                    break
                }
            }            
            if (index > -1) {
                message = ""
                success = true
                var channel = channels.get(gameid)
                channel.pushMessage('onPlayerFreezed', {user:freezeuserid})
                var player = players.get(freezeuserid)
                player.State = "freeze"
            }
            else
            {
                message = USER_NOT_IN_GAME
            }
        }
        else {
            message = NOT_CAPABLE
        }        
    }

    next(null, {
        success: success,
        message: message
    });
};

GameRemote.prototype.unfreezeuser = function (msg, next) {
    var gameid = msg.gameid
    var userid = msg.userid
    var unfreezeuserid = msg.unfreezeuserid
    var success = false
    var message = GAME_NOT_FOUND

    if(games.has(gameid))
    {
        var game = games.get(gameid)
        if (true) { // later need check if user have this ability
            var index = -1
            for(var i = 0;i<game.CurrentPlayers.length;i++)
            {
                if(game.CurrentPlayers[i] === unfreezeuserid)
                {
                    index = i
                    break
                }
            }            
            if (index > -1) {
                message = ""
                success = true
                var channel = channels.get(gameid)
                channel.pushMessage('onPlayerUnFreezed', {user:unfreezeuserid})
                var player = players.get(unfreezeuserid)
                player.State = "normal"
            }
            else
            {
                message = USER_NOT_IN_GAME
            }
        }
        else {
            message = NOT_CAPABLE
        }        
    }

    next(null, {
        success: success,
        message: message
    });
};

GameRemote.prototype.targetuser = function (msg, next) {
    var gameid = msg.gameid
    var userid = msg.userid
    var targetuserid = msg.targetuserid
    var targetx = msg.targetx
    var targety = msg.targety
    var success = false
    var message = GAME_NOT_FOUND

    if(games.has(gameid))
    {
        var game = games.get(gameid)
        if (true) { // later need check if user have this ability
            var index = -1
            for(var i = 0;i<game.CurrentPlayers.length;i++)
            {
                if(game.CurrentPlayers[i] === targetuserid)
                {
                    index = i
                    break
                }
            }            
            if (index > -1) {
                message = ""
                success = true
                var channel = channels.get(gameid)
                channel.pushMessage('onPlayerTargeted', {user:targetuserid, targetx:targetx, targety:targety})
                var player = players.get(targetuserid)
                player.State = "target"
                player.TargetX = targetx
                player.TargetY = targety
            }
            else
            {
                message = USER_NOT_IN_GAME
            }
        }
        else {
            message = NOT_CAPABLE
        }        
    }

    next(null, {
        success: success,
        message: message
    });
};