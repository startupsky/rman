module.exports = function (app) {
    return new Handler(app);
};

var Handler = function (app) {
    this.app = app;
};

var handler = Handler.prototype;



handler.create = function (msg, session, next) {
    this.app.rpc.game.gameRemote.create(session, msg, session.frontendId, next);
};


handler.list = function (msg, session, next) {
    this.app.rpc.game.gameRemote.list(session, msg, next);
};


handler.join = function (msg, session, next) {
    this.app.rpc.game.gameRemote.join(session, msg, session.frontendId, next);
};


handler.leave = function (msg, session, next) {
    this.app.rpc.game.gameRemote.leave(session, msg, session.frontendId, next);
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

handler.reportusersforgame = function (msg, session, next){
    this.app.rpc.game.gameRemote.reportusersforgame(session, msg, next);
}

handler.send = function (msg, session, next) {
    this.app.rpc.game.gameRemote.send(session, msg, next);
};

handler.kickuser = function (msg, session, next) {
    this.app.rpc.game.gameRemote.kickuser(session, msg, session.frontendId, next);
};

handler.freezeuser = function (msg, session, next) {
    this.app.rpc.game.gameRemote.freezeuser(session, msg, next);
};

handler.unfreezeuser = function (msg, session, next) {
    this.app.rpc.game.gameRemote.unfreezeuser(session, msg, next);
};

handler.targetuser = function (msg, session, next) {
    this.app.rpc.game.gameRemote.targetuser(session, msg, next);
};

handler.attackrange = function (msg, session, next) {
    this.app.rpc.game.gameRemote.attackrange(session, msg, next);
};

handler.useitem = function (msg, session, next) {
    this.app.rpc.game.gameRemote.useitem(session, msg, next);
};

handler.dropitem = function (msg, session, next) {
    this.app.rpc.game.gameRemote.dropitem(session, msg, next);
};