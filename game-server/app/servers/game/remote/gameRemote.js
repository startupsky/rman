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

var gameConfigs = new Map()
gameConfigs.set("pacman", {
  Name: 'pacman',
  Description: 'eat bean game',
  Roles:
    [
      {
        Name: 'Pacman',
        Description: 'eat bean',
        HealthPoint: 1,
        AttackPoint: 1,
        AttackRange: 1,
        AttackRole: "Bean",
        AttackReward: 1,
        Percentage:80,
        AI:false
      },
      {
        Name: 'Ghost',
        Description: 'Kill Pacman',
        HealthPoint: 1,
        AttackPoint: 1,
        AttackRange: 0,
        AttackRole: "Pacman",
        AttackReward: 10,
        Percentage:20,
        AI:false
      },
      {
        Name: 'Bean',
        Description: 'bean',
        HealthPoint: 1,
        AttackPoint: 0,
        AttackRange: 0,
        Distance:2,
        Pattern: "Spread",
        AI:true
      }      
    ]
})

var games = new Map()
var maps = new Map()
var players = new Map()
var channels = new Map()

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
    this.Role = "pacman"
    
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

function StopCondition(time, role)
{
    
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
    this.Role = role.Name
    this.CloneRole = role
    this.DisplayName = displayname
    this.State = state
    this.Score = 0
}

function SetupMap(game, channelService){
    
    // get game config by game type
    var gameConfig = gameConfigs.get(game.GameType)
    if(!gameConfig)
    {
        throw "No game config found for " + game.GameType
    }
    
    var gomap = new Map();
    
    var roles = gameConfig.Roles
    
    // Part 1: assign role for players
    // TODO: now assume 2 roles for players to simplify the logic, and the first 2 are for players
    // and the 1st role has more number
    if(roles.length < 2)
    {
        throw "At least need 2 Roles in the game for " + game.GameType
    }
    var majorRole = roles[0]
    var minorRole = roles[1]
    var ratio = Math.floor(majorRole.Percentage/minorRole.Percentage)
    for (var i = 0; i < game.CurrentPlayers.length; i++) 
    {
        var userid = game.CurrentPlayers[i]
        if (players.has(userid)) 
        {
            var player = players.get(userid)
            var playergoid = "player_" + userid
            var role = majorRole
            if (i % (ratio + 1) == 0)
                role = minorRole
            
            var channel = channels.get(game.ID.toString())
            var member = channel.getMember(userid)
            if(!!member)
            {
                var receivers = []
                receivers.push({
                    uid: member.uid,
                    sid: member.sid                        
                })
                var param = {role: role.Name, instruction: role.Description}
                channelService.pushMessageByUids('onRoleAssigned', param, receivers);                            
            }
            player.Role = role.Name
            var cloneRole = JSON.parse(JSON.stringify(role))
            var playergo = new GameObject(playergoid, player.X, player.Y, cloneRole, userid, "normal")
            gomap.set(playergoid, playergo)
        }
    }

    // Part 2: assign non-player roles
    // TODO: assume the AI roles start from index 2
    for(var i = 2; i < roles.length; i++)
    {
        var role = roles[i]
        if(!role.AI)
        {
            continue
        }
        var distanceX = role.Distance/11000.0 // 2m
        var distanceY = distanceX
            
        var row = Math.round((game.Y2-game.Y1)/distanceY)
        var column = Math.round((game.X2 - game.X1)/distanceX)
        
        console.log("Map grid for role: " + role.Name)
        console.log(" row:"+row)
        console.log(" column:"+column)
        console.log(process.cwd())

        var result;
        if(role.Pattern === "Picture")
        {
            var improcesser = require('../../ImageProcesser/imangeHandler/ImageProcesser');
            result = improcesser.BinaryArrayFromImage('./taiji.jpg',row,column);
        }
        else if(role.Pattern === "Spread")
        {
            result = new Array()
            for(var i = 0;i<row;i++)
            {
                result[i] = new Array()
                for(var j=0;j<column;j++)
                    result[i][j] = 1
            }
        }

        var roleid = 0
        for (var i = 0; i < row; i++){
            for (var j=0; j < column;j++){
                if(result[i][j]==1)
                {
                    var pointX = game.X1 + 0.5*distanceX + i*distanceX
                    var pointY = game.Y1 + 0.5*distanceY + j*distanceY
                    
                    var rolegoid = role.Name + "_"+ roleid
                    roleid = roleid + 1
                    var cloneRole = JSON.parse(JSON.stringify(role))
                    var beango = new GameObject(rolegoid, pointX.toString(), pointY.toString(), cloneRole, role.Name, "normal")
                    gomap.set(rolegoid, beango)           
                }
            }
        }        
    }

    maps.set(game.ID.toString(), gomap)
}

function CanAttack(player, go)
{
    if(player.CloneRole.AttackPoint > 0 // player can attack
            && player.CloneRole.AttackRange > 0
            && go.CloneRole.HealthPoint > 0 // go is still alive
    )
    {
        var attackRoles = player.CloneRole.AttackRole.split(",")
        if(attackRoles.indexOf(go.CloneRole.Name) > -1)
        {
            return true
        }
    }
    return false
}
function UpdateMap(gameid, userid)
{

    var gomap = maps.get(gameid)
    var playergo = gomap.get("player_"+userid)
    
	var distanceX = playergo.CloneRole.AttackRange/111000.0
	var distanceY = distanceX	

    gomap.forEach(function loop(go, goid, map) {
        if (CanAttack(playergo, go)){ 
            var startX = parseFloat(go.X) -  parseFloat(distanceX.toString())
            var stopX = parseFloat(go.X) + parseFloat(distanceX.toString())
            var startY = parseFloat(go.Y) -  parseFloat(distanceY.toString())
            var stopY = parseFloat(go.Y) + parseFloat(distanceY.toString())        
            
            if( playergo.X > startX && playergo.X < stopX && playergo.Y > startY && playergo.Y < stopY)
            {
                go.CloneRole.HealthPoint = go.CloneRole.HealthPoint - playergo.CloneRole.AttackPoint

                console.log("UpdateMap: ["+ playergo.CloneRole.Name + "]("+ playergo.GOID + ")" + " attack [" + go.CloneRole.Name + "](" + go.GOID +")")

                playergo.Score = playergo.Score + playergo.CloneRole.AttackReward
                var channel = channels.get(gameid)
                channel.pushMessage('onMapUpdate', {goid: goid, go: go});
                channel.pushMessage('onPlayerScore', {userid: userid, score: playergo.Score}); 
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
                
                // TODO: set to true for testing purpose
                allplayersinsidemap = true
                if(allplayersinsidemap)
                {
                    success = true
                    message = ""
                    game.State = GAME_STATE_STARTED
                    SetupMap(game, this.channelService)
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
    var gomap = maps.get(gameid)
    
    var game = games.get(gameid)
    for(var playerid of game.CurrentPlayers)
    {
        players.delete(playerid)
        var playergo = gomap.get("player_"+playerid)
        if(!!playergo)
        {
            SaveUserInfo(playerid, playergo.Score)               
        }
    }
    games.delete(gameid)     
    channels.delete(gameid)
    maps.delete(gameid)
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