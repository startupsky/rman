

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;


var currentgameid = 0;
var currentgames = [];

function Game(userid, gamename, maxplayer, city, x1,y1, x2,y2, gametype) {
    currentgameid = currentgameid + 1;
    this.ID = currentgameid;
    this.GameName = gamename;
    this.Maxplayer = maxplayer;
    this.City = city;
    this.X1= x1;
    this.Y1 = y1;
    this.X2 = x2;
    this.Y2 = y2;
    this.GameType = gametype;
    this.Host = userid
    this.CurrentPlayers = []
    this.CurrentPlayers.push(userid)
}


handler.create = function(msg, session, next) {
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
    currentgames.forEach(function(element) {
        if(city == "-1" || city == element.City)
        {
            games.push(element)
        }
        
    }, this);
    
    next(null, {
        games: JSON.stringify(games)
    });
};