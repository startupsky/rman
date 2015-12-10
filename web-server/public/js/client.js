var pomelo = window.pomelo;
var userid;
var displayname;
var users;
var base = 1000;
var increase = 25;
var reg = /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/;
var LOGIN_ERROR = "服务器忙，请稍后！";
var NAME_ERROR = "用户名包含非法字符，只能使用数字、中英文字母和下划线(_)！";


var WRONG_PASSWORD_CODE = 502;
var WRONG_PASSWORD = "密码错误或者用户名已存在！";
var ALREADY_LOGIN_CODE = 503;
var ALREADY_LOGIN = "用户已登陆！";

var util = {
	urlRE: /https?:\/\/([-\w\.]+)+(:\d+)?(\/([^\s]*(\?\S+)?)?)?/g,
	//  html sanitizer
	toStaticHTML: function(inputHtml) {
		inputHtml = inputHtml.toString();
		return inputHtml.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	},
	//pads n with zeros on the left,
	//digits is minimum length of output
	//zeroPad(3, 5); returns "005"
	//zeroPad(2, 500); returns "500"
	zeroPad: function(digits, n) {
		n = n.toString();
		while(n.length < digits)
		n = '0' + n;
		return n;
	},
	//it is almost 8 o'clock PM here
	//timeString(new Date); returns "19:49"
	timeString: function(date) {
		var minutes = date.getMinutes().toString();
		var hours = date.getHours().toString();
		return this.zeroPad(2, hours) + ":" + this.zeroPad(2, minutes);
	},

	//does the argument only contain whitespace?
	isBlank: function(text) {
		var blank = /^\s*$/;
		return(text.match(blank) !== null);
	}
};

//always view the most recent message when it is added
function scrollDown(base) {
	window.scrollTo(0, base);
	$("#entry").focus();
};

// add message on board
function addOutput(text) {
    if (text === null) return;
    var time = new Date();
    //every message you see is actually a table with 3 cols:
    //  the time,
    //  the person who caused the event,
    //  and the content
    var messageElement = $(document.createElement("table"));
    messageElement.addClass("message");
    // sanitize
    text = util.toStaticHTML(text);
    var content = '<tr>' + '  <td class="date">' + util.timeString(time) + '</td>' + '  <td class="msg-text">' + text + '</td>' + '</tr>';
    messageElement.html(content);
    $("#gameresultpanel").append(messageElement);
    base += increase;
    scrollDown(base);
};

// show tip
function tip(type, name) {
	var tip,title;
	switch(type){
		case 'online':
			tip = name + ' is online now.';
			title = 'Online Notify';
			break;
		case 'offline':
			tip = name + ' is offline now.';
			title = 'Offline Notify';
			break;
		case 'message':
			tip = name + ' is saying now.'
			title = 'Message Notify';
			break;
	}
	var pop=new Pop(title, tip);
};

// set user name/id
function setUserName() {
	$("#userid").text(userid);
	$("#displayname").text(displayname);
};


// show error
function showError(content) {
	$("#loginError").text(content);
	$("#loginError").show();
};

// show login panel
function showLogin() {
	$("#loginView").show();
	$("#loginUser").focus();
    $("#gamepanel").hide();
	$("gameresultpanel").hide();
	$("#loginError").hide();
};

// show game panel
function showGamePanel() {
	$("#loginView").hide();
	$("#loginError").hide();
    $("#gamepanel").show();
	$("gameresultpanel").show();
	scrollDown(base);
};

// query connector
function queryEntry(uid, callback) {
	var route = 'gate.gateHandler.queryEntry';
	pomelo.init({
		host: window.location.hostname,
		port: 3014,
		log: true
	}, function() {
		pomelo.request(route, {
			uid: uid
		}, function(data) {
			pomelo.disconnect();
			if(data.code === 500) {
				showError(LOGIN_ERROR);
				return;
			}
			callback(data.host, data.port);
		});
	});
};

$(document).ready(function() {
	//when first time into chat room.
	showLogin();

	//update user list
	pomelo.on('onAdd', function(data) {
		var user = data.user;
		tip('online', user);
		addUser(user);
	});

	//update user list
	pomelo.on('onLeave', function(data) {
		var user = data.user;
		tip('offline', user);
		removeUser(user);
	});


	//handle disconect message, occours when the client is disconnect with servers
	pomelo.on('disconnect', function(reason) {
		showLogin();
	});

	$("#login").click(function() {
        userid = $("#loginUser").attr("value");
        var pwd = $("#password").attr("value");

		if(!reg.test(userid)) {
			showError(NAME_ERROR);
			return false;
		}

		//query entry of connection
		queryEntry(userid, function(host, port) {
			pomelo.init({
				host: host,
				port: port,
				log: true
			}, function() {
				var route = "connector.entryHandler.enter";
				pomelo.request(route, {
                    userid: userid,
                    pwd: pwd,
				}, function(data) {
					if (data.code == WRONG_PASSWORD_CODE) {
						showError(WRONG_PASSWORD);
						return;
					}
					displayname = data.displayname;
					setUserName();
					showGamePanel();
				});
			});
		});
	});
    
    $("#creategame").click(function () {
        var route = "game.gameHandler.create";
        var gamename = $("#gamename").attr("value");
        var maxplayer = $("#maxplayer").attr("value");
        var city = $("#city").attr("value")
		var y1 = $("#x1").attr("value");
        var x1 = $("#x1").attr("value");
        var x2 = $("#x2").attr("value");
		var y2 = $("#y2").attr("value");
        var gametype = $("#gameTypeList").attr("value");

        pomelo.request(route, {
			userid: userid,
            gamename: gamename,
            maxplayer: maxplayer,
            city: city,
            x1: x1,
			y1: y1,
            x2: x2,
			y2: y2,
            gametype: gametype
        }, function (data) {
            addOutput("create game: "+ data.GameID + ", " + data.GameName);
        });
    });
    
    $("#listgame").click(function () {
        var route = "game.gameHandler.list";
        var city = $("#city_listgame").attr("value");
        
        pomelo.request(route, {
            city: city
        }, function (data) {
            addOutput(data.games);
        });
    });
	    
    $("#joingame").click(function () {
        var route = "game.gameHandler.join";
        var gameid = $("#gameid").attr("value");
        
        pomelo.request(route, {
            gameid: gameid,
			userid: userid
        }, function (data) {
			if(!data.success)
            {
				addOutput(data.message);
			}
        });
    });
	
    $("#leavegame").click(function () {
        var route = "game.gameHandler.leave";
        var gameid = $("#gameid").attr("value");
        
        pomelo.request(route, {
            gameid: gameid,
			userid: userid
        }, function (data) {
			if(!data.success)
            {
				addOutput(data.message);
			}
        });
    });	
});