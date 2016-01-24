module.exports = function (app) {
    return new Handler(app);
};

var Handler = function (app) {
    this.app = app;
};

var handler = Handler.prototype;



handler.create = function (msg, session, next) {
    this.app.rpc.game.gameRemote.create(session, msg, next);
};


handler.list = function (msg, session, next) {
    this.app.rpc.game.gameRemote.list(session, msg, next);
};


handler.join = function (msg, session, next) {
    this.app.rpc.game.gameRemote.join(session, msg, next);
};


handler.leave = function (msg, session, next) {
    this.app.rpc.game.gameRemote.leave(session, msg, next);
};


handler.start = function (msg, session, next) {
    this.app.rpc.game.gameRemote.start(session, msg, next);
};

handler.stop = function (msg, session, next) {
    this.app.rpc.game.gameRemote.stop(session, msg, next);
};

handler.querymap = function (msg, session, next) {
    this.app.rpc.game.gameRemote.querymap(session, msg, next);
};


handler.report = function (msg, session, next) {
    this.app.rpc.game.gameRemote.report(session, msg, next);
};

handler.reportalluser = function (msg, session, next) {
    this.app.rpc.game.gameRemote.reportalluser(session, msg, next);
};