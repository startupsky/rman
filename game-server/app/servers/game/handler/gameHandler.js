var GAME_NOT_FOUND = "没有这个游戏！";
var GAME_FULL = "游戏人数已满！";
var GAME_STARTED = "游戏状态不是等待！";
var ALREADY_IN_GAME = "已经加入这个游戏！";
var NOT_IN_GAME = "不在这个游戏！";
var NOT_HOST_IN_GAME = "不是游戏创建者！";
var GAME_NOT_READY = "游戏状态不能开始！";

var GAME_STATE_WAITING = 0;
var GAME_STATE_STARTED = 1;
var GAME_STATE_STOPPED = 2;

module.exports = function (app) {
    return new Handler(app);
};

var Handler = function (app) {
    this.app = app;
};

var handler = Handler.prototype;


var currentgameid = 0;
var currentgames = [];

function Player(userid, x, y)
{
    this.X = x
    this.Y = y
    this.Userid = userid
}

function Cell(x,y,role)
{
    this.X = x
    this.Y = y
    this.Role = role
}

function Game(userid, playerx, playery, gamename, maxplayer, city, x1, y1, x2, y2, gametype) {
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
    var user = new Player(userid,playerx,playery)
    this.CurrentPlayers.push(user)
    this.State = GAME_STATE_WAITING
    
}

function SetupMap(game){
    var distanceX = 2.0/11000.0 // 2m
    var distanceY = 2.0/11000.0 // 2m
    
    var cellgrid = [];
    
    game.Row = Math.round((game.Y2-game.Y1)/distanceY)
    game.Column = Math.round((game.X2 - game.X1)/distanceX)
    
    for (var i = 0; i < game.Row; i++){
        for (var j=0; j < game.Column;j++){
            var pointX = game.X1 + 0.5*distanceX + i*distanceX
            var pointY = game.Y1 + 0.5*distanceY + j*distanceY
            var cell = new Cell(pointX, pointY, "bean")
            cellgrid.push(cell)	
        }
    }
    
    for(var i = 0; i<game.CurrentPlayers.length;i++)
    {
        var player = game.CurrentPlayers[i]
        var cellindex = 0
        if(player.X > game.X1 && player.X < game.X2 && player.Y > game.Y1 && player.Y < game.Y2)
        {
            var playerRow = Math.round( (player.X - game.X1)/distanceX)
            var playerColumn =Math.round( (player.Y - game.Y1)/distanceY)
            cellindex = playerRow*game.Column + playerColumn
        }
        while(cellgrid[cellindex].Role === "player"){
            cellindex = (cellindex+1)%(game.Row*game.Column)
        }
        player.X = cellgrid[cellindex].X
        player.Y = cellgrid[cellindex].Y
        cellgrid[cellindex].Role = "player"
    }
    game.Grid = cellgrid
}

handler.create = function (msg, session, next) {
    var smallx = msg.x1
    var bigx = msg.x2
    if(smallx > bigx)
    {
        var temp = smallx
        smallx = bigx
        bigx = temp
    }
    var smally = msg.x1
    var bigy = msg.x2
    if(smally > bigy)
    {
        var temp = smally
        smally = bigy
        bigy = temp
    }
    var game = new Game(msg.userid, msg.playerx, msg.playery, msg.gamename, msg.maxplayer, msg.city, smallx, smally, bigx, bigy, msg.gametype);
    currentgames.push(game);
    next(null, {
        GameID: game.ID,
        GameName: game.GameName
    });
};


handler.list = function (msg, session, next) {
    var city = msg.city;
    var games = [];
    currentgames.forEach(function (element) {
        if (city == "-1" || city == element.City) {
            games.push(element)
        }

    }, this);

    next(null, {
        games: JSON.stringify(games)
    });
};


handler.join = function (msg, session, next) {
    var gameid = msg.gameid
    var userid = msg.userid
    var playerx = msg.playerx
    var playery = msg.playery
    var success = false
    var message = GAME_NOT_FOUND
    currentgames.forEach(function (game) {
        if (gameid == game.ID) {
            if (game.CurrentPlayers.length >= game.Maxplayer) {
                message = GAME_FULL
            }
            else {
                var found = false
                for(var i = 0;i<game.CurrentPlayers.length;i++)
                {
                    if(game.CurrentPlayers[i].Userid = userid)
                    {
                        found = true
                        break
                    }
                }
                if (found) {
                    message = ALREADY_IN_GAME
                }
                else {
                    var player = new Player(userid, playerx, playery)
                    game.CurrentPlayers.push(player)
                    message = ""
                    success = true
                }
            }
        }

    }, this);

    next(null, {
        success: success,
        message: message
    });
};


handler.leave = function (msg, session, next) {
    var gameid = msg.gameid
    var userid = msg.userid
    var success = false
    var message = GAME_NOT_FOUND

    for (var i = currentgames.length - 1; i >= 0; i--) {
        var game = currentgames[i]
        if (game.ID == gameid) {
            var index = -1
            for(var i = 0;i<game.CurrentPlayers.length;i++)
            {
                if(game.CurrentPlayers[i].Userid = userid)
                {
                    index = i
                    break
                }
            }            
            if (index > -1) {
                message = ""
                success = true
                game.CurrentPlayers.splice(index, 1)
                if (game.CurrentPlayers == 0) {
                    currentgames.splice(i, 1);
                }
                else if (game.Host == userid) {
                    game.Host = game.CurrentPlayers[0].Userid
                }
            }
            else {
                message = NOT_IN_GAME
            }
        }
    }

    next(null, {
        success: success,
        message: message
    });
};


handler.start = function (msg, session, next) {
    var gameid = msg.gameid
    var userid = msg.userid
    var success = false
    var message = GAME_NOT_FOUND

    for (var i = currentgames.length - 1; i >= 0; i--) {
        var game = currentgames[i]
        if (game.ID == gameid) {
            if (userid === game.Host) {
                if (game.State === GAME_STATE_WAITING) {
                    success = true
                    message = ""
                    game.State = GAME_STATE_STARTED
                    SetupMap(game)
                }
                else {
                    message = GAME_NOT_READY
                }
            }
            else {
                message = NOT_HOST_IN_GAME
            }
        }
    }

    next(null, {
        success: success,
        message: message
    });
};