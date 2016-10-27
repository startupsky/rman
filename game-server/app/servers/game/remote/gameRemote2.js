gr = require('./gameModule.js')

module.exports = function(app) {
	return new GameRemote(app);
};

var GameRemote = function(app) {
	this.app = app;
	this.channelService = app.get('channelService');
};

var gameConfigs = gr.ConfigureReader()


var channels = new Map()
var gameManager = gr.GameManager.createNew()
var games = new Map()
var maps = new Map()
var players = new Map()

var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/rman';

function SaveUserInfo(userid, score)
{
    MongoClient.connect(url, function (err, db) {
        var collection = db.collection('User');
        var result = collection.find({"name": userid}, {"score":1,"_id":0})
        result.each(function(err, doc) {
            if (doc != null) {
                var newscore = parseInt(doc.score) + score
                collection.update({'name':userid},{$set:{'score':newscore}})
            } 
            db.close();
        });
    });     
}


function GameStopInfo(gameid, winer)
{
    this.GameID = gameid
    this.Winer = winer
    this.Players = []
}

function SetupMap(game, channelService)
{
    
    var params = new Array()
    var receiverList = new Array()
    
    var gomap = game.SetupMap(params, receiverList)

    maps.set(game.ID.toString(), gomap)

    var channel = channels.get(game.ID.toString())
    for (var i = 0; i < params.length; i++) 
    {
        var member = channel.getMember(receiverList[i])
        if(!!member)
        {
            var receivers = []
            receivers.push({
                uid: member.uid,
                sid: member.sid                        
            })                          
        }
        else
        {
            console.log("get user info from channel failed")
            throw "No member " + receiverList[i]
        }
        channelService.pushMessageByUids('onRoleAssigned', params[i], receivers); 
    }
}


function UpdateMap(gameid, userid, x, y)
{
    var pushMessageArray = new Array()

    gameManager.game[gameid].UpdateMap(userid, x, y, pushMessageArray)
    

    var channel = channels.get(gameid)
    for(var index in pushMessageArray)
    {
        channel.pushMessage(pushMessageArray[index].event, pushMessageArray[index].msg);
    }


}

GameRemote.prototype.create = function (msg, serverid, next) { 
    
    var radius = parseInt(msg.radius)

    var centerLati = parseFloat(msg.centerlati)
    var centerLong = parseFloat(msg.centerlong)

    var success = true
    var message = ""
    var game
    var userid = msg.userid
    // if(players.has(userid))
    // {
    //     success = false
    //     message = ALREADY_IN_GAME
    //     game = games.get(players.get(userid).GameID)
    // }
    // else
    {
        game = gameManager.Create(msg.userid,msg.gamename, msg.maxplayer, msg.city, radius, centerLati, centerLong, msg.gametype)

        // add channel
        var channel = this.channelService.getChannel(this.ID, true);
        channel.add(userid, serverid)
        channels.set(game.ID.toString(), channel)  
    }

    next(null, {
        success: success,
        message: message,
        game: JSON.stringify(game)
    });
};

GameRemote.prototype.list = function (msg, next) {
    var gamesincity = gameManager.List(msg)
    
    next(null, {
        games: JSON.stringify(gamesincity)
    });  
};

GameRemote.prototype.join = function (msg, serverid, next) {
    var gameid = msg.gameid
    var userid = msg.userid

    var success = false
    var message = GAME_NOT_FOUND

    var game = gameManager.games[gameid]
    if(!!game)
    {
        game.Join(msg, success, message)
    }

    if(success == true)
    {
        var channel = channels.get(gameid)
        channel.pushMessage('onJoin', {user:userid});
        channel.add(userid, serverid)
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
        if (game.CurrentPlayers.indexOf(userid) > -1) {
            message = ""
            success = true
            players.delete(userid)
            game.CurrentPlayers.splice(index, 1)
            var channel = channels.get(gameid)
            console.log("***use leave the game.")
            channel.leave(userid, serverid)
            channel.pushMessage('onLeave', {user:userid});
            if (game.CurrentPlayers.length == 0) {
                DeleteGame(gameid)
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
                    var now = new Date();
                    game.StartTime = now.getTime();
                    SetupMap(game, this.channelService)
                    var channel = channels.get(gameid)
                    channel.pushMessage('onStart', {user:userid});      
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
                
                DeleteGame(gameid)
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

// delete game. 1) delete users. 2) save scores. 3) delete game. 4) delete channel. 5) delete game map.
function DeleteGame(gameid)
{ 
    // var gomap = maps.get(gameid)
    // var game = games.get(gameid)
    
    // var gameStopInfo = new GameStopInfo(gameid, game.Winer)
    
    // for(var playerid of game.CurrentPlayers)
    // {
    //     players.delete(playerid)
    //     var playergo = gomap.get("player_"+playerid)
    //     if(!!playergo)
    //     {
    //         SaveUserInfo(playerid, playergo.Score) 
    //         gameStopInfo.Players.push(playerid + ":" + playergo.Score)              
    //     }
    // }



    var game = games.get(gameid)
    var playerList = new Array()

    var startIndex = 0
    var endIndex = game.CurrentPlayers.length-1
    for (var i = 0; i < game.CurrentPlayers.length; i++) {
                if (game.CurrentPlayers[i].role === game.Winer) {
                    var playerInfo = new GameResultInfo(game.CurrentPlayers[i].Userid, "+20")

                    playerList[startIndex++] = playerInfo;
                }
                else
                {
                    var playerInfo = new GameResultInfo(game.CurrentPlayers[i].Userid, "-5")
                    playerList[endIndex--] = playerInfo;
                }
            }



    
    var channel = channels.get(gameid)
    channel.pushMessage('onStop', playerList);
    
    // games.delete(gameid)     
    // channels.delete(gameid)
    // maps.delete(gameid)
}

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
        if(player.State == "Dead")
        {
            return;
        }
        if(player.State === "freeze")
        {
            if(Math.abs(x-player.X) >= limit || Math.abs(y-player.Y) >= limit)
            {
                channel.pushMessage('onOutScope', {userid:userid,x:msg.x,y:msg.y});                
            }
        }
        else if(player.State === "target")
        {
            player.X = x
            player.Y = y

            if(Math.abs(player.TargetX-player.X) >= limit || Math.abs(player.TargetY-player.Y) >= limit)
            {
                channel.pushMessage('onNotReachTarget', {userid:userid,x:msg.x,y:msg.y});
            }
            else
            {
                channel.pushMessage('onReachTarget', {userid:userid,x:msg.x,y:msg.y});
                player.State = "normal"                                
            }
        }
        else if(player.State === "normal")
        {       
            player.X = x
            player.Y = y

            channel.pushMessage('onPlayerUpdate', {userid:"player_"+userid,x:msg.x,y:msg.y});
                    
            var gomap = maps.get(player.GameID)
            if(!!gomap)
            {
                var playergo = gomap.get("player_"+userid)
                if(!!playergo)
                {
                    
                    UpdateMap(player.GameID, userid, x, y)                 
                }                
            }
        }
    }

    // next(null, {
    //     player: JSON.stringify(player)
    // });
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
            if (game.CurrentPlayers.indexOf(kickuserid) > -1) {
                message = ""
                success = true
                players.delete(kickuserid)
                game.CurrentPlayers.splice(index, 1)
                var channel = channels.get(gameid)
                console.log("user is been kicked")
                channel.leave(kickuserid, serverid)
                channel.pushMessage('onLeave', {user:kickuserid});
                if (game.CurrentPlayers.length == 0) {
                    DeleteGame(gameid)
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


GameRemote.prototype.useitem = function (msg, next) {

    var success = false
    var message = GAME_NOT_FOUND


    var gameid = msg.gameid
    var game = gameManager.games[gameid]
    var pushMessageArray = Array()
    var channel = channels.get(gameid)
    
    if(!!game)
        game.UseItem(msg, success, message, pushMessageArray)
    

    channel.pushMessage('onPlayerItemUpdate', {userid: userid, items: playergo.Items}); 

    next(null, {
        success: success,
        message: message
    });
};

GameRemote.prototype.dropitem = function (msg, next) {
    var gameid = msg.gameid
    var userid = msg.userid
    var item = msg.item
    var success = false
    var message = GAME_NOT_FOUND

    if(games.has(gameid))
    {
        var game = games.get(gameid)
        var gomap = maps.get(gameid)
        if(!!gomap)
        {
            var playergo = gomap.get("player_"+userid)
            
            var index = playergo.Items.indexOf(item)
            if (index > -1) {          

                message = ""
                success = true
                var channel = channels.get(gameid)
                
                var go = playergo.ItemGos[index]
                go.X = playergo.X
                go.Y = playergo.Y
                go.CloneRole.HealthPoint = 1
                channel.pushMessage('onMapUpdate', {goid: go.ID, go: go});
                
                playergo.Items.splice(index, 1)
                playergo.ItemGos.splice(index, 1)
                channel.pushMessage('onPlayerItemUpdate', {userid: userid, items: playergo.Items});   
            }
            else {
                message = NOT_CAPABLE
            }             
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
            if (game.CurrentPlayers.indexOf(targetuserid) > -1) {
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
            if (game.CurrentPlayers.indexOf(targetuserid) > -1) {
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
            if (game.CurrentPlayers.indexOf(targetuserid) > -1) {
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


GameRemote.prototype.attackrange = function (msg, next) {
    var userid = msg.userid
    var range = parseFloat(msg.range)

    var player
    if(players.has(userid))
    {
        player = players.get(userid)
        
        var gameid = player.GameID
        var gomap = maps.get(gameid)
        var playergo = gomap.get("player_"+userid)
        var oldrange = playergo.CloneRole.AttackRange
        playergo.CloneRole.AttackRange = range
        UpdateMap(gameid, userid)
        playergo.CloneRole.AttackRange = oldrange
    }

    next(null, {
        player: JSON.stringify(player)
    });
};