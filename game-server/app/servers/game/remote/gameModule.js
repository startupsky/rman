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
var USER_UNDER_ITEM = "用户已被使用道具！"

var GAME_STATE_WAITING = 0;
var GAME_STATE_STARTED = 1;
var GAME_STATE_STOPPED = 2;

exports.ConfigureReader = function()
{
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
    return gameConfigs
}

var Ayo_GameManager=
{
    createNew: function()
    {
        var gameManager={};
        
        gameManager.currentgameid =0;

        gameManager.Create = function(userid, gamename, maxplayer, city, radius, centerlati, centerlong, gametype)
        {
            gameManager.currentgameid = gameManager.currentgameid + 1;
            var game = Ayo_Game.createNew(gameManager.currentgameid, userid, gamename, maxplayer, city, radius, centerlati, centerlong, gametype)
            return game
        };

        return gameManager;
    }
}

var Ayo_Game=
{
    currentgameid:0,
    createNew: function(userid, gamename, maxplayer, city, radius, centerlati, centerlong, gametype)
    {
        var game={};

        Ayo_Game.currentgameid = Ayo_Game.currentgameid+1
        game.ID = Ayo_Game.currentgameid;
        game.GameName = gamename;
        game.Maxplayer = maxplayer;
        game.City = city;
        game.Radius = radius;
        game.CenterLati = centerlati;
        game.CenterLong = centerlong;
        game.GameType = gametype;
        game.Host = userid
        game.CurrentPlayers = []
        game.CurrentPlayers.push(userid)
        game.State = GAME_STATE_WAITING
        game.Distance = NaN
        game.Roles = new Map()

        game.GetRoleCount = function(roles,overallCounts, percentage)
        {
            // Part 1: assign role for players
            // TODO: now assume 2 roles for players to simplify the logic, and the first 2 are for players
            // and the 1st role has more number
            if(roles.length < 2)
            {
                console.log("At least need 2 Roles in the game for ")
                throw "At least need 2 Roles in this game"
            }
    
    
            var multipleValue = overallCounts/(100/percentage);
            var offSet = overallCounts%(100/percentage);
            
            Math.floor(Math.random()*overallCounts);
            
            
            if(offSet>0 && overallCounts>1)
                multipleValue=multipleValue+1;

            var minorRoleNumber = Math.round(multipleValue);
            return minorRoleNumber
        }

        game.GetPlayerRoles = function(roles,overallCounts, percentage)
        {
            var playerRoles = new Array();
            var majorRole = roles[1]
            var minorRole = roles[0]

            var minorRoleNumber = game.GetRoleCount(roles, overallCounts, percentage)    
            
            for (var i = 0; i < overallCounts; i++)
            {
                playerRoles[i] = majorRole;
            }
            
            for (var i = 0; i < minorRoleNumber; i++)
            {
                var index = Math.floor(Math.random()*overallCounts);
                while(playerRoles[index] == minorRole)
                {
                    index = Math.floor(Math.random()*overallCounts);
                }
                playerRoles[index] = minorRole;
            }

            return playerRoles
        }

        game.SetupMap = function()
        {
            // get game config by game type
            var gameConfig = gameConfigs.get(game.GameType)
            if(!gameConfig)
            {
                console.log("No game config found for ")
                throw "No game config found for " + game.GameType
            }
    
            var gomap = new Map();
            
            var roles = gameConfig.Roles
            

            var playerRoles = game.GetPlayerRoles(roles, game.CurrentPlayers.length, minorRole.Percentage)

            for (var i = 0; i < game.CurrentPlayers.length; i++) 
            {
                var userid = game.CurrentPlayers[i]
                if (players.has(userid)) 
                {
                    var player = players.get(userid)
                    var playergoid = "player_" + userid
                    var role = playerRoles[i]
                    
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

            var distanceX = 2/11000.0 // 2m for the item
            var distanceY = distanceX
            // Part 2: assign non-player roles
            // TODO: assume the AI roles start from index 2
        //  for(var index = 2; index < roles.length; index++)
        for(var index = 2; index < roles.length; index++)
            {
                var role = roles[index]
                var distribution;
                
                if(role.Type === "AI")
                {
                    var distance = 2
                    if (!!role.Distance)
                        distance = role.Distance
                        
                    var row = Math.round((game.Radius*2/1.414)/distance)
                    var column = Math.round((game.Radius*2/1.414)/distance)
                    
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
                    

                    var distanceMeter = 2
                        
                    var row = Math.round((game.Radius*2/1.414)/distanceMeter)
                    var column = Math.round((game.Radius*2/1.414)/distanceMeter)
                                
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
                var startPointLati = parseFloat(game.CenterLati)-(parseInt(game.Radius)/(1.414*111000))
                var startPointLong = parseFloat(game.CenterLong) - (parseInt(game.Radius)/(1.414*111000))

                row=1;
                colum = 1

                for (var i = 0; i < row; i++){
                    for (var j=0; j < column;j++){
                        if(distribution[i][j]==1)
                        {
                            var pointX = startPointLati + 0.5*distanceX + i*distanceX
                            var pointY = startPointLong + 0.5*distanceY + j*distanceY

                            console.log("distanceX: "+distanceX+" distanceY:"+distanceY)
                            
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
        return game;
    }
}

var Ayo_Player=
{
    createNew: function(userid, x, y, gameid)
    {
        var player={};
        player.X = x
        player.Y = y
        player.Userid = userid
        player.GameID = gameid.toString()  //maybe remove later
        player.Role = "deamon"
    
        // TODO: will be removed later
        player.State = "normal"
    }
}

function Ayo_Item(name, description, targetRole, itemProperty)
{
    this.Name = name
    this.Description = description
    this.TargetRole = targetRole
    this.ItemProperty = itemProperty
}

exports.gameManager = Ayo_GameManager
exports.Game = Ayo_Game
exports.Player = Ayo_Player
exports.Item = Ayo_Item