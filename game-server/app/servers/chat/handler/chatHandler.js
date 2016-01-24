var chatRemote = require('../remote/chatRemote');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

Handler.prototype.send = function(msg, session, next) {
    this.app.rpc.chat.chatRemote.send(session, msg, next);
};