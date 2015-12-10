var GAME_NOT_FOUND = "没有这个游戏！";
var GAME_FULL = "游戏人数已满！";
var GAME_STARTED = "游戏状态不是等待！";
var ALREADY_IN_GAME = "已经加入这个游戏！";
var NOT_IN_GAME = "不在这个游戏！";

module.exports = function (app) {
    return new Handler(app);
};

var Handler = function (app) {
    this.app = app;
};

var handler = Handler.prototype;


var currentgameid = 0;
var currentgames = [];

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
}


handler.create = function (msg, session, next) {
    var game = new Game(msg.userid, msg.gamename, msg.maxplayer, msg.city, msg.x1, msg.y1, msg.x2, msg.y2, msg.gametype);
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
    var success = false
    var message = GAME_NOT_FOUND
    currentgames.forEach(function (element) {
        if (gameid == element.ID) {
            if (element.CurrentPlayers.length >= element.Maxplayer) {
                message = GAME_FULL
            }
            else {
                var index = element.CurrentPlayers.indexOf(userid);
                if (index != -1) {
                    message = ALREADY_IN_GAME
                }
                else {
                    element.CurrentPlayers.push(userid)
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
            var index = game.CurrentPlayers.indexOf(userid);
            if (index != -1) {
                message = ""
                success = true
                game.CurrentPlayers.splice(index, 1)
                if (game.CurrentPlayers == 0) {
                    currentgames.splice(i, 1);
                }
                else if (game.Host == userid) {
                    game.Host = game.CurrentPlayers[0]
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