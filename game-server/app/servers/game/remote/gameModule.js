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

        game.SetupMap = function()
        {
            var s = 3
            console.log(s)
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

exports.gameManager = Ayo_GameManager
exports.Game = Ayo_Game
exports.Player = Ayo_Player