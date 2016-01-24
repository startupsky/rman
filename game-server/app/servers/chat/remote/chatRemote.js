var USER_NOT_FOUND = "没有这个用户！";

module.exports = function(app) {
	return new ChatRemote(app);
};

var ChatRemote = function(app) {
	this.app = app;
	this.channelService = app.get('channelService');
};

/**
 * Add user into chat channel.
 *
 * @param {String} uid unique id for user
 * @param {String} sid server id
 * @param {String} name channel name
 * @param {boolean} flag channel parameter
 *
 */
ChatRemote.prototype.add = function(uid, sid, name, flag, cb) {
	var channel = this.channelService.getChannel(name, flag);
	var username = uid.split('*')[0];
	var param = {
		route: 'onAdd',
		user: username
	};
	channel.pushMessage(param);

	if( !! channel) {
		channel.add(uid, sid);
	}

	cb(this.get(name, flag));
};

/**
 * Get user from chat channel.
 *
 * @param {Object} opts parameters for request
 * @param {String} name channel name
 * @param {boolean} flag channel parameter
 * @return {Array} users uids in channel
 *
 */
ChatRemote.prototype.get = function(name, flag) {
	var users = [];
	var channel = this.channelService.getChannel(name, flag);
	if( !! channel) {
		users = channel.getMembers();
	}
	for(var i = 0; i < users.length; i++) {
		users[i] = users[i].split('*')[0];
	}
	return users;
};

/**
 * Kick user out chat channel.
 *
 * @param {String} uid unique id for user
 * @param {String} sid server id
 * @param {String} name channel name
 *
 */
ChatRemote.prototype.kick = function(uid, sid, name) {
	var channel = this.channelService.getChannel(name, false);
	// leave channel
	if( !! channel) {
		channel.leave(uid, sid);
	}
	var username = uid.split('*')[0];
	var param = {
		route: 'onLeave',
		user: username
	};
	channel.pushMessage(param);
};

ChatRemote.prototype.send = function(msg, next) {
	var rid = msg.rid;
	var channelService = this.app.get('channelService');
	var param = {
		msg: msg.content,
		from: msg.from,
		target: msg.target
	};
	var channel = channelService.getChannel(rid, false);

    var sucess = true
    var data = ""
	//the target is all users
	if(msg.target == '*') {
		channel.pushMessage('onChat', param);
	}
	//the target is specific user
	else
    {
        var member = channel.getMember(msg.target)
        if(!!member)
        {
            channelService.pushMessageByUids('onChat', param, [{
                uid: member.uid,
                sid: member.sid
            }]);            
        }
        {
            sucess = false
            data = USER_NOT_FOUND
        }
	}
	next(null, {
		sucess: sucess,
        data: data
	});
};