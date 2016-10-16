module.exports = function(app) {
	return new GameRemote(app);
};

var GameRemote = function(app) {
	this.app = app;
};

GameRemote.prototype.testMocha = function () { 
    
    return true
};