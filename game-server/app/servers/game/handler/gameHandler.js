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

module.exports = function (app) {
    return new Handler(app);
};

var Handler = function (app) {
    this.app = app;
};

var handler = Handler.prototype;


var currentgameid = 0;

var games = new Map()
var maps = new Map()
var players = new Map()

function Player(userid, x, y, gameid)
{
    this.X = x
    this.Y = y
    this.Userid = userid
    this.GameID = gameid.toString()
    this.Score = 0
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

handler.create = function (msg, session, next) {
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
    }

    next(null, {
        sucess: sucess,
        message: message,
        game: JSON.stringify(game)
    });
};


handler.list = function (msg, session, next) {
    var city = msg.city;
    var gamesincity = [];
    for (var game of games.values()) {
        if (city == "-1" || city == game.City) {
            gamesincity.push(game)
        }
    }

    next(null, {
        games: JSON.stringify(gamesincity)
    });
};


handler.join = function (msg, session, next) {
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
            }
        }
    }

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


handler.start = function (msg, session, next) {
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


handler.querymap = function (msg, session, next) {
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


handler.report = function (msg, session, next) {
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

handler.reportalluser = function (msg, session, next) {
    next(null, {
        players: JSON.stringify(Array.from(players.values()))
    });
};