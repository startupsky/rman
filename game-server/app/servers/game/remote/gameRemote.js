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
var USER_UNDER_ITEM = "用户已经被使用道具！"

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

var fs = require('fs')
var dir = "gameconfig"
var files = fs.readdirSync(dir);
console.log(files.length)
for(var index=0;index<files.length;index++)
{
    var str = fs.readFileSync(dir + "/" + files[index], "utf8")
    var config = JSON.parse(str)
    console.log(config.Name)
    gameConfigs.set(config.Name, config)
}
console.log(gameConfigs)

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

function SetupMap(game, channelService){
    
    // get game config by game type
    var gameConfig = gameConfigs.get(game.GameType)
    console.log(gameConfigs)
    console.log(game.GameType)
    if(!gameConfig)
    {
        console.log("No game config found for ")
        throw "No game config found for " + game.GameType
    }
    
    var gomap = new Map();
    
    var roles = gameConfig.Roles
    
    // Part 1: assign role for players
    // TODO: now assume 2 roles for players to simplify the logic, and the first 2 are for players
    // and the 1st role has more number
    if(roles.length < 2)
    {
        console.log("At least need 2 Roles in the game for ")
        throw "At least need 2 Roles in the game for " + game.GameType
    }
    var majorRole = roles[1]
    var minorRole = roles[0]
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
            
            var gameRole = game.Roles.get(role.Name)
            if(!gameRole)
            {
                game.Roles.set(role.Name, 1)
            }
            else
            {
                game.Roles.set(role.Name, gameRole+1)
            }
        }
    }

    // Part 2: assign non-player roles
    // TODO: assume the AI roles start from index 2
    for(var index = 2; index < roles.length; index++)
    {
        var role = roles[index]
        var distribution;
        
        if(role.Type === "AI")
        {
            var distance = 2
            if (!!role.Distance)
                distance = role.Distance
            var distanceX = distance/11000.0
            var distanceY = distanceX
                
            var row = Math.round((game.Y2-game.Y1)/distanceY)
            var column = Math.round((game.X2 - game.X1)/distanceX)
            
            console.log("Map grid for role: " + role.Name)
            console.log(" row:"+row)
            console.log(" column:"+column)
            console.log(process.cwd())
    
            if(role.Pattern === "Picture")
            {
                var improcesser = require('../../ImageProcesser/imangeHandler/ImageProcesser');
                distribution = improcesser.BinaryArrayFromImage('./taiji.jpg',row,column);
            }
            else if(role.Pattern === "Spread")
            {
                distribution = new Array()
                if(!!role.Number)
                {
                    for(var i = 0;i<row;i++)
                    {
                        distribution[i] = new Array()
                        for(var j=0;j<column;j++)
                            distribution[i][j] = 0
                    }     
                    var itemNumber = role.Number
                    var count = 0
                    while(count < itemNumber)
                    {
                        var rowIndex = Math.floor((Math.random() * row));
                        var columnIndex = Math.floor((Math.random() * column));
                        if(distribution[rowIndex][columnIndex]==0)
                        {
                            distribution[rowIndex][columnIndex] = 1
                            count++
                        }
                    }                      
                }
                else
                {
                    for(var i = 0;i<row;i++)
                    {
                        distribution[i] = new Array()
                        for(var j=0;j<column;j++)
                            distribution[i][j] = 1
                    }                    
                }
            }
        }  
        else if(role.Type === "Item")  // random distribute based on number
        {
            var distanceX = 2/11000.0 // 2m for the item
            var distanceY = distanceX
                
            var row = Math.round((game.Y2-game.Y1)/distanceY)
            var column = Math.round((game.X2 - game.X1)/distanceX)
                        
            distribution = new Array()
            for(var i = 0;i<row;i++)
            {
                distribution[i] = new Array()
                for(var j=0;j<column;j++)
                    distribution[i][j] = 0
            }     
            var itemNumber = role.Number
            var count = 0
            while(count < itemNumber)
            {
                var rowIndex = Math.floor((Math.random() * row));
                var columnIndex = Math.floor((Math.random() * column));
                if(distribution[rowIndex][columnIndex]==0)
                {
                    distribution[rowIndex][columnIndex] = 1
                    count++
                }
            }       
        } 

        var roleid = 0
        for (var i = 0; i < row; i++){
            for (var j=0; j < column;j++){
                if(distribution[i][j]==1)
                {
                    var pointX = game.X1 + 0.5*distanceX + i*distanceX
                    var pointY = game.Y1 + 0.5*distanceY + j*distanceY
                    
                    var rolegoid = role.Name + "_"+ roleid
                    roleid = roleid + 1
                    var cloneRole = JSON.parse(JSON.stringify(role))
                    var beango = new GameObject(rolegoid, pointX.toString(), pointY.toString(), cloneRole, role.Name, "normal")
                    gomap.set(rolegoid, beango)
                    
                    var gameRole = game.Roles.get(role.Name)
                    if(!gameRole)
                    {
                        game.Roles.set(role.Name, 1)
                    }
                    else
                    {
                        game.Roles.set(role.Name, gameRole+1)
                    }    
                }
            }
        } 
    }

    maps.set(game.ID.toString(), gomap)
}

function CanAttack(playergo, go)
{
    if(playergo.CloneRole.AttackPoint > 0 // player can attack
            && playergo.CloneRole.AttackRange > 0
            && go.CloneRole.HealthPoint > 0 // go is still alive
    )
    {
        var attackRoles = playergo.CloneRole.AttackRole.split(",")
        if(attackRoles.indexOf(go.CloneRole.Name) > -1)
        {
            var attackrange = playergo.CloneRole.AttackRange/111000.0
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
            var acquirerange = playergo.CloneRole.AcquireRange/111000.0
            return IsInRange(parseFloat(playergo.X), parseFloat(playergo.Y),parseFloat(go.X),parseFloat(go.Y), acquirerange)
        }
    }
    return false
}

function IsInRange(x1, y1, x2, y2, range)
{
    var startX2 = x2 - range
    var stopX2 = x2 + range
    var startY2 = y2 - range
    var stopY2 = y2 + range     
    
    return x1 > startX2 && x1 < stopX2 && y1 > startY2 && y1 < stopY2
}

function UpdateMap(gameid, userid, x, y)
{
    var gomap = maps.get(gameid)
    var game = games.get(gameid)
    var playergo = gomap.get("player_"+userid)
    var channel = channels.get(gameid)
    
    var canmove = true
    if(!!playergo.CloneRole.MoveRange)
    {
        var limit = playergo.CloneRole.MoveRange/111000 // 1m
        if(Math.abs(x-playergo.X) >= limit || Math.abs(y-playergo.Y) >= limit)
        {
            channel.pushMessage('onOutScope', {userid:userid,x:playergo.X,y:playergo.Y});
            canmove = false
        }
    }
    if(canmove)
    {
        playergo.X = x
        playergo.Y = y    
        gomap.forEach(function loop(go, goid, map) {
            if (CanAttack(playergo, go))
            {     
                go.CloneRole.HealthPoint = go.CloneRole.HealthPoint - playergo.CloneRole.AttackPoint
                
                if(go.CloneRole.HealthPoint <= 0)
                {
                    var roleName = go.CloneRole.Name
                    var roleCount = game.Roles.get(roleName)
                    game.Roles.set(roleName, roleCount-1)            
                }

                console.log("UpdateMap: ["+ playergo.CloneRole.Name + "]("+ playergo.GOID + ")" + " attack [" + go.CloneRole.Name + "](" + go.GOID +")")

                playergo.Score = playergo.Score + go.CloneRole.AttackReward

                channel.pushMessage('onMapUpdate', {goid: goid, go: go});
                channel.pushMessage('onPlayerScore', {userid: userid, score: playergo.Score}); 
            }
            else if(CanAcquire(playergo, go))
            {
                go.CloneRole.HealthPoint = 0

                var roleName = go.CloneRole.Name
                var roleCount = game.Roles.get(roleName)
                game.Roles.set(roleName, roleCount-1)     
                
                console.log(go)
                console.log("*****"+go.CloneRole)               

                console.log("UpdateMap: ["+ playergo.CloneRole.Name + "]("+ playergo.GOID + ")" + " acquire [" + go.CloneRole.Name + "](" + go.GOID +")")

                playergo.Items.push(go.CloneRole.Name)
                playergo.ItemGos.push(go)

                channel.pushMessage('onMapUpdate', {goid: goid, go: go});
                channel.pushMessage('onPlayerItemUpdate', {userid: userid, items: playergo.Items});                   
            }
        })              
    }

    UpdatePlayerUnderItem(gameid)
    UpdateGameStopCondition(gameid)
}

function UpdatePlayerUnderItem(gameid)
{
    var game = games.get(gameid)
    var gomap = maps.get(gameid)
    for(var playerid of game.CurrentPlayers)
    {
        var playergo = gomap.get("player_"+playerid)
        if(!!playergo && !!playergo.UnderItem)
        {
            if(!!playergo.UnderItemStopTime)
            {
                var now = new Date()
                if(now.getTime() > playergo.UnderItemStopTime)
                {
                    playergo.CloneRole = JSON.parse(JSON.stringify(playergo.OldRole))
                    playergo.UnderItem = false
                    playergo.UnderItemStartTime = null
                    playergo.UnderItemStopTime = null
                    var channel = channels.get(gameid)
                    channel.pushMessage('onPlayerOffItem', {user:playerid})
                }
            }
            else if(!!playergo.TargetX && !!playergo.TargetY)
            {
                var limit = 1.0/111000 // 1m
                if(IsInRange(playergo.X, playergo.Y, playergo.TargetX, playergo.TargetY, limit))
                {
                    playergo.CloneRole = JSON.parse(JSON.stringify(playergo.OldRole))
                    playergo.UnderItem = false
                    playergo.TargetX = null
                    playergo.TargetY = null 
                    var channel = channels.get(gameid)
                    channel.pushMessage('onPlayerOffItem', {user:playerid})                    
                }
            }
            else if(!!playergo.Once)
            {
                playergo.CloneRole = JSON.parse(JSON.stringify(playergo.OldRole))
                playergo.UnderItem = false
                playergo.Once = false
                var channel = channels.get(gameid)
                channel.pushMessage('onPlayerOffItem', {user:playerid})                   
            }
        }
    }
}

 function UpdateGameStopCondition(gameid)
{
    var game = games.get(gameid)
    var stopCondition = gameConfigs.get(game.GameType).StopCondition
    var stateInfo = []
    for(var i = 0; i < stopCondition.length; i++)
    {
        var condition = stopCondition[i]
        if(condition.Type === "Timer")
        {
            var now = new Date()
            var currentTime = condition.Count * 1000 + game.StartTime - now.getTime();
            if(currentTime <= 0)
            {
                game.Winer = condition.Winer
                DeleteGame(gameid)
                return
            }
            
            var hour = parseInt(currentTime/(1000*60*60))
            var min = parseInt(currentTime/(1000*60))
            var sec = parseInt(currentTime%(1000*60)).toString().substr(0, 2)
            var timer= hour+":"+min+":"+sec
            
            stateInfo.push({role:condition.Role,value:timer})
        }
        else if(condition.Type === "RoleCondition")
        {
            var roleCount = game.Roles.get(condition.Role)
            if(roleCount == condition.Count)
            {
                game.Winer = condition.Winer
                DeleteGame(gameid)
                return
            }
            stateInfo.push({role:condition.Role,value:roleCount})
        }
    }
    
    var channel = channels.get(gameid)
    channel.pushMessage('onStateUpdate', {state:stateInfo});
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
        if (game.CurrentPlayers.indexOf(userid) > -1) {
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
                    var now = new Date();
                    game.StartTime = now.getTime();
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
    
    var gameStopInfo = new GameStopInfo(gameid, game.Winer)
    
    for(var playerid of game.CurrentPlayers)
    {
        players.delete(playerid)
        var playergo = gomap.get("player_"+playerid)
        if(!!playergo)
        {
            SaveUserInfo(playerid, playergo.Score) 
            gameStopInfo.Players.push(playerid + ":" + playergo.Score)              
        }
    }
    
    var channel = channels.get(gameid)
    channel.pushMessage('onStop', gameStopInfo);
    
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
                    
                    UpdateMap(player.GameID, userid, x, y)                 
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
            if (game.CurrentPlayers.indexOf(kickuserid) > -1) {
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
        if(!!gomap)
        {           
            
            userGo = gomap.get("player_"+userid)
            console.log(userGo)
            
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
                
            game.CurrentPlayers.forEach(function(playerid)
            {
                var playergo = gomap.get("player_"+playerid);
                if(playergo.UnderItem)  //if the player is under item effect, do nothing, let the poor guy go...
                {
                    return;
                }
                
                var targetRoleIndex = targetRoles.indexOf(playergo.Role);
                
                if(targetRoleIndex<0)  // not in the target list, do nothing for him/her
                {
                    return;
                }
                
                var attackrange = userGo.ItemGos[index].CloneRole.AttackRange/111000.0;
                console.log(playergo.GOID)
                console.log(parseInt(playergo.GOID.substr(7, playergo.GOID.length-6)))
                
                if(IsInRange(parseFloat(playergo.x),parseFloat(playergo.y),x,y, attackrange))
                {
                     console.log(userGo.Role+" use "+item.Name+" to "+playergo.Role)
                    
                     var channel = channels.get(gameid)
                     channel.pushMessage('onPlayerUnderItem', {user:parseInt(playergo.GOID.substr(6, playergo.GOID.length-6)),item:item})
                     
                     
                     for(var resultindex = 0;resultindex<itemResults.length;resultindex++)
                        {
                            var result = itemResults[resultindex]
                            
                            if(typeof(result.Power) != "undefined")
                            {
                                playergo.HealthPoint = playergo.HealthPoint-result.Power;
                                
                                if(playergo.HealthPoint <=0)
                                {
                                    var roleCount = game.Roles.get(playergo.Role)
                                    game.Roles.set(roleName, roleCount-1) 
                                    console.log("one of "+playergo.Role+" is been eliminate by"+userGo.Role)
                                    //这里需要添加分数系统逻辑
                                }
                            }
                            
                            if(typeof(result.MoveRange) != "undefined")
                            {
                                playergo.CloneRole.MoveRange = result.MoveRange
                            }
                            if(typeof(result.AttackRange) != "undefined")
                            {
                                playergo.CloneRole.AttackRange = result.AttackRange
                            }
                            
                            if(result.Type == "Timer")
                            {
                                var now = new Date()
                                targetgo.UnderItemStartTime = now.getTime()
                                targetgo.UnderItemStopTime = targetgo.UnderItemStartTime + result.Timer*1000
                            }
                            else if(result.Type == "Target")
                            {
                                var targetx = parseFloat(msg.targetx)
                                var targety = parseFloat(msg.targety)
                                targetgo.TargetX = targetx
                                targetgo.TargetY = targety
                            }
                            else if(result.Type == "Once")
                            {
                                targetgo.Once = true
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