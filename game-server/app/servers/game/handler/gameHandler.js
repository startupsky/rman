

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;


var currentgameid = 0;
var currentgames = [];

function Game(gamename, maxplayer, city, x1,y1, x2,y2, gametype) {
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
}


handler.create = function(msg, session, next) {
    var game = new Game(msg.gamename, msg.maxplayer, msg.city, msg.x1, msg.y1, msg.x2, msg.y2, msg.gametype);
    currentgames.push(game);
	next(null, {
        msg: "create game: "+ game.ID + ", " + game.GameName
	});
};

handler.list = function (msg, session, next) {
    var city = msg.city;
    var result = "";
    currentgames.forEach(function(element) {
        if(city == "-1" || city == element.City)
        {
            result += element.ID + " " + element.City + " " + element.GameName + " " + element.X1 + ":" + element.Y1 + " " + element.X2 + ":" + element.Y2 + " " + element.GameType + "\r\n"
        }
        
    }, this);
    next(null, {
        msg: result
    });
};