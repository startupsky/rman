gr = require('./gameModule.js')

module.exports = function(app) {
	return new GameRemote(app);
};

var GameRemote = function(app) {
	this.app = app;
	this.channelService = app.get('channelService');
};

var currentgameid = 0;

var gameConfigs = gr.ConfigureReader()

// gameConfigs.set("pacman", {
//     Name: 'pacman',
//     Description: 'eat bean game',
//     Roles: [
//         {
//             Name: 'Pacman',
//             Description: 'eat bean',
//             HealthPoint: 1,
//             AttackPoint: 1,
//             AttackRange: 1,
//             AttackRole: "Bean",
//             AttackReward: 10,
//             AcquireRange: 1,
//             AcquireRole: "Freezer,Targeter,RangeAttacker",
//             AcquireLimit:3,
//             Percentage: 80,
//             Type: "Player"
//         },
//         {
//             Name: 'Ghost',
//             Description: 'Kill Pacman',
//             HealthPoint: 1,
//             AttackPoint: 1,
//             AttackRange: 0,
//             AttackRole: "Pacman",
//             AcquireRange: 1,
//             AcquireRole: "Freezer,Targeter,RangeAttacker",
//             AcquireLimit:3,
//             Percentage: 20,
//             Type: "Player"
//         },
//         {
//             Name: 'Bean',
//             Description: 'bean',
//             HealthPoint: 1,
//             AttackPoint: 0,
//             AttackRange: 0,
//             AttackReward: 1,
//             Distance: 2,
//             Pattern: "Spread",
//             Type: "AI"
//         },
//         {
//             Name: "Freezer",
//             Description: "Freeze Player",
//             HealthPoint: 1,
//             Number: 6,
//             Pattern: "Spread",
//             Type: "Item",
//             Result:
//             [
//                 {
//                     Type:"Timer",
//                     Count: 30, //unit: second
//                     MoveRange: 0,
//                     AttackRange: 0
//                 }
//             ],
//             AttackRange:10, //unit: m
//             TargetRole:"Pacman, Ghost",
//             Effect:[]
//         }
//         ,
//         {
//             Name: "Targeter",
//             Description: "Target Player",
//             HealthPoint: 1,
//             Number: 4,
//             Pattern: "Spread",
//             Type: "Item",
//             Result:
//             [
//                 {
//                     Type:"Target",
//                     AttackRange: 0
//                 }
//             ],
//             AttackRange:10, //unit: m
//             TargetRole:"Pacman, Ghost",
//             Effect:[]
//         }
//         ,
//         {
//             Name: "RangeAttacker",
//             Description: "Attack in range",
//             HealthPoint: 1,
//             Number: 4,
//             Pattern: "Spread",
//             Type: "Item",
//             Result:
//             [
//                 {
//                     Type:"Once",
//                     AttackRange: 100
//                 }
//             ],
//             AttackRange:10, //unit: m
//             TargetRole:"Pacman, Ghost",
//             Effect:[]
//         }
//     ],
//     StopCondition: [
//         {
//             Type: "RoleCondition",
//             Role: "Bean",
//             Count: 0,
//             Winer: "Pacman"
//         },
//         {
//             Type: "RoleCondition",
//             Role: "Pacman",
//             Count: 0,
//             Winer: "Ghost"
//         },
//         {
//             Type: "Timer",
//             Count: 600,  //unit: second, 10min
//             Winer: "Ghost"
//         }
//     ]
// })

var games = new Map()
var maps = new Map()
var players = new Map()
var channels = new Map()
var gameManager = gr.GameManager.createNew()

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



function Player(userid, x, y, gameid)
{
    this.X = x
    this.Y = y
    this.Userid = userid
    this.GameID = gameid.toString()
    this.Role = "deamon"
    
    // TODO: will be removed later
    this.State = "normal"
}

function Item(name, description, targetRole, itemProperty)
{
    this.Name = name
    this.Description = description
    this.TargetRole = targetRole
    this.ItemProperty = itemProperty
}

function Game(userid, gamename, maxplayer, city, radius, centerlati, centerlong, gametype) {
    currentgameid = currentgameid + 1;
    this.ID = currentgameid;
    this.GameName = gamename;
    this.Maxplayer = maxplayer;
    this.City = city;
    this.Radius = radius;
    this.CenterLati = centerlati;
    this.CenterLong = centerlong;
    this.GameType = gametype;
    this.Host = userid
    this.CurrentPlayers = []
    this.CurrentPlayers.push(userid)
    this.State = GAME_STATE_WAITING
    this.Distance = NaN
    this.Roles = new Map()
}

function GameObject(id, x, y, role, displayname, state)
{
    this.GOID = id
    this.X = x
    this.Y = y
    this.Role = role.Name
    this.CloneRole = role
    this.DisplayName = displayname
    this.State = state
    this.Score = 0
    this.Items = []
    this.ItemGos = []
    this.UnderItem = false
}

function GameStopInfo(gameid, winer)
{
    this.GameID = gameid
    this.Winer = winer
    this.Players = []
}

function GameResultInfo(userid, username, gain)
{
    this.UserId = userid
    this.Gain = gain
}

function PushMessage_AssignRole(gameid, params, receivers)
{
    var channel = channels.get(gameid)
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

function CanAttack(playergo, go)
{
    if(go.CloneRole.HealthPoint<=0)  //already dead, can not attack
        return false;

    if(playergo.CloneRole.AttackPoint > 0 // player can attack
            && playergo.CloneRole.AttackRange > 0
            && go.CloneRole.HealthPoint > 0 // go is still alive
    )
    {
        var attackRoles = playergo.CloneRole.AttackRole.split(",")
        if(attackRoles.indexOf(go.CloneRole.Name) > -1)
        {
            var attackrange = playergo.CloneRole.AttackRange
            return IsInRange(parseFloat(playergo.X), parseFloat(playergo.Y),parseFloat(go.X),parseFloat(go.Y), attackrange)
        }
    }
    return false
}

function CanAcquire(playergo, go)
{
    if(playergo.Items.length < playergo.CloneRole.AcquireLimit && playergo.CloneRole.AcquireRange > 0 && go.CloneRole.HealthPoint > 0)
    {
        var acquireRoles = playergo.CloneRole.AcquireRole.split(",")
        if(acquireRoles.indexOf(go.CloneRole.Name) > -1)
        {
            var acquirerange = 2
            return IsInRange(parseFloat(playergo.X), parseFloat(playergo.Y),parseFloat(go.X),parseFloat(go.Y), acquirerange)
        }
    }
    return false
}

function IsInRange(x1, y1, x2, y2, range)
{
    var distance = getFlatternDistance(x1,y1,x2,y2)    
    
    return distance < range
}

function UpdateMap(gameid, userid, x, y)
{
    var pushMessageMap = new map()

    gameManager.game[gameid].UpdateMap(userid, x, y, pushMessageMap)
    

    var channel = channels.get(gameid)
    for(var key in pushMessageMap)
    {
        channel.pushMessage(key, pushMessageMap[key]);
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
    var gameid = msg.gameid
    var userid = msg.userid
    var x = parseFloat(msg.x)
    var y = parseFloat(msg.y)
    var index = parseInt(msg.itemIndex)
    var player
  //  var item = msg.item
  //  var targetuserid = msg.targetuserid
    var success = false
    var message = GAME_NOT_FOUND

    var targetList;
    
    
    console.log(games)

    if(games.has(gameid))
    {
        var game = games.get(gameid)
        var gomap = maps.get(gameid)
        var channel = channels.get(gameid)
        if(!!gomap)
        {           
            
            userGo = gomap.get("player_"+userid)
            
            
            if(userGo.ItemGos.count<index+1)
            {
                message = "client is using a item which is not exist! must be somethingwrong";
                console.log(message);
                success = false;
            }
            else
            {
                message = "";
                success = true;
                 
                var item = JSON.parse(JSON.stringify(userGo.ItemGos[index].CloneRole));
                console.log(item);
                console.log(item.Name);
                var targetRoles = item.TargetRole.split(",");
                var itemResults = item.Result;
                
                //channel.pushMessage('onPlayerUpdate', {userid:userGo.GOID,state:"Attack"});
                
            game.CurrentPlayers.forEach(function(playerid)
            {
                var playergo = gomap.get("player_"+playerid);
                if(playergo.UnderItem || playergo.State == "Dead")  //if the player is under item effect, do nothing, let the poor guy go...
                {
                    return;
                }
                
                var targetRoleIndex = targetRoles.indexOf(playergo.Role);
                
                if(targetRoleIndex<0)  // not in the target list, do nothing for him/her
                {
                    return;
                }
                
                console.log("find one player in the target list: "+playergo)
                var attackrange = userGo.ItemGos[index].CloneRole.AttackRange;
   
                
                if(IsInRange(parseFloat(playergo.X),parseFloat(playergo.Y),x,y, attackrange))
                {
                     console.log(userGo.Role+" use "+item.Name+" to "+playergo.Role)
                    
                     channel.pushMessage('onPlayerUnderItem', {user:parseInt(playergo.GOID.substr(6, playergo.GOID.length-6)),item:item})
                     
                     
                     for(var resultindex = 0;resultindex<itemResults.length;resultindex++)
                        {
                            var result = itemResults[resultindex]
                            console.log("***result: "+result)
                            
                            if(typeof(result.Power) != "undefined")
                            {
                                console.log("power: "+result.Power)
                                console.log("health point :"+playergo.CloneRole.HealthPoint)
                                playergo.CloneRole.HealthPoint = playergo.CloneRole.HealthPoint-result.Power;
                                
                                if(playergo.CloneRole.HealthPoint <=0)
                                {
                                    console.log("one of "+playergo.Role+" is been eliminate by"+userGo.Role)
                                    playergo.State = "Dead"
                                    
                                    channel.pushMessage('onPlayerUpdate', {userid:playergo.GOID,state:"Dead"});
                                    var roleCount = game.Roles.get(playergo.Role)
                                    game.Roles.set(roleName, roleCount-1) 
                                    
                                    //这里需要添加分数系统逻辑
                                }
                            }
                            
                            if(typeof(result.MoveRange) != "undefined")
                            {
                                playergo.CloneRole.MoveRange = result.MoveRange;
                                if(playergo.CloneRole.MoveRange == 0)
                                {
                                    playergo.State = "Freeze"
                                    channel.pushMessage('onPlayerUpdate', {userid:playergo.GOID,state:"Freeze"});
                                }
                            }
                            if(typeof(result.AttackRange) != "undefined")
                            {
                                playergo.CloneRole.AttackRange = result.AttackRange
                            }
                            
                            if(result.Type == "Timer")
                            {
                                playergo.UnderItem = true;
                                var now = new Date();
                                playergo.UnderItemStartTime = now.getTime()
                                playergo.UnderItemStopTime = playergo.UnderItemStartTime + result.Timer*1000
                            }
                            else if(result.Type == "Target")
                            {
                                var targetx = parseFloat(msg.targetx)
                                var targety = parseFloat(msg.targety)
                                playergo.TargetX = targetx
                                playergo.TargetY = targety
                            }
                            else if(result.Type == "Once")
                            {
                                playergo.Once = true
                            }                            
                        }
                        
                        playergo.Items.splice(index, 1)
                        playergo.ItemGos.splice(index, 1)
                        channel.pushMessage('onPlayerItemUpdate', {userid: userid, items: playergo.Items}); 
                     
                }
            });
            }
            // var playergo = gomap.get("player_"+userid)
            
            // var index = playergo.Items.indexOf(item)
            // if (index > -1) {          
            //     if (game.CurrentPlayers.indexOf(targetuserid) > -1) {
                    
            //         var targetgo = gomap.get("player_"+targetuserid)
            //         if(!targetgo.UnderItem)
            //         {
            //             message = ""
            //             success = true
            //             var channel = channels.get(gameid)
            //             channel.pushMessage('onPlayerUnderItem', {user:targetuserid, item:item})
                        
            //             // apply result here
            //             targetgo.UnderItem = true
            //             targetgo.OldRole = JSON.parse(JSON.stringify(targetgo.CloneRole))
            //             var results = playergo.ItemGos[index].CloneRole.Result
            //             for(var resultindex = 0;resultindex<results.length;resultindex++)
            //             {
            //                 var result = results[resultindex]
            //                 if(typeof(result.MoveRange) != "undefined")
            //                 {
            //                     targetgo.CloneRole.MoveRange = result.MoveRange
            //                 }
            //                 if(typeof(result.AttackRange) != "undefined")
            //                 {
            //                     targetgo.CloneRole.AttackRange = result.AttackRange
            //                 }
            //                 if(result.Type == "Timer")
            //                 {
            //                     var now = new Date()
            //                     targetgo.UnderItemStartTime = now.getTime()
            //                     targetgo.UnderItemStopTime = targetgo.UnderItemStartTime + result.Timer*1000
            //                 }
            //                 else if(result.Type == "Target")
            //                 {
            //                     var targetx = parseFloat(msg.targetx)
            //                     var targety = parseFloat(msg.targety)
            //                     targetgo.TargetX = targetx
            //                     targetgo.TargetY = targety
            //                 }
            //                 else if(result.Type == "Once")
            //                 {
            //                     targetgo.Once = true
            //                 }                            
            //             }
                        
            //             playergo.Items.splice(index, 1)
            //             playergo.ItemGos.splice(index, 1)
            //             channel.pushMessage('onPlayerItemUpdate', {userid: userid, items: playergo.Items});   
            //         }
            //         else
            //         {
            //             message = USER_UNDER_ITEM
            //         }
            //     }
            //     else
            //     {
            //         message = USER_NOT_IN_GAME
            //     }
            // }
            // else {
            //     message = NOT_CAPABLE
            // }             
        }
       
    }

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

var EARTH_RADIUS = 6378137.0; //单位M 
var PI = Math.PI; 

GameRemote.prototype.getRad = function getRad(d){ 
return d*PI/180.0; 
};

GameRemote.prototype.testMocha= function testMocha()
{
    return true
}

function getFlatternDistance(lat1,lng1,lat2,lng2){ 

var f = getRad((lat1 + lat2)/2); 
var g = getRad((lat1 - lat2)/2); 
var l = getRad((lng1 - lng2)/2); 

var sg = Math.sin(g); 
var sl = Math.sin(l); 
var sf = Math.sin(f); 

var s,c,w,r,d,h1,h2; 
var a = EARTH_RADIUS; 
var fl = 1/298.257; 

sg = sg*sg; 
sl = sl*sl; 
sf = sf*sf; 

s = sg*(1-sl) + (1-sf)*sl; 
c = (1-sg)*(1-sl) + sf*sl; 

w = Math.atan(Math.sqrt(s/c)); 
r = Math.sqrt(s*c)/w; 
d = 2*w*a; 
h1 = (3*r -1)/2/c; 
h2 = (3*r +1)/2/s; 

return d*(1 + fl*(h1*sf*(1-sg) - h2*(1-sf)*sg)); 
} 