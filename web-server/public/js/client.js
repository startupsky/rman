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
		addOutput("add: " + user);
	});

	//update user list
	pomelo.on('onLeave', function(data) {
		var user = data.user;
		addOutput("leave: " + user);
	});

    pomelo.on('onChat', function(data){
        addOutput("From: " + data.from + ", Msg: " + data.msg)
    })
    
    pomelo.on("onJoin", function(data) {
		var user = data.user;
		addOutput("join: " + user);
	});
    
    pomelo.on('onStart', function(data){
        addOutput("game started!")
    })
        
    pomelo.on('onStop', function(data){
        addOutput("game stopped!" + JSON.stringify(data))
    })
    
    pomelo.on('onPlayerUpdate', function(data){
        addOutput("onPlayerUpdate:" + JSON.stringify(data))
    })
        
    pomelo.on('onMapUpdate', function(data){
        addOutput("onMapUpdate:" + JSON.stringify(data))
    })
    
    pomelo.on('onPlayerScore', function(data){
        addOutput("onPlayerScore:" + JSON.stringify(data))
    })
    
    pomelo.on('onPlayerItem', function(data){
        addOutput("onPlayerItem:" + JSON.stringify(data))
    })
    
    pomelo.on('onRoleAssigned', function(data){
        addOutput("onRoleAssigned:" + JSON.stringify(data))
    })
        
    pomelo.on('onPlayerFreezed', function(data){
        addOutput("onPlayerFreezed:" + JSON.stringify(data))
    })
                
    pomelo.on('onPlayerUnFreezed', function(data){
        addOutput("onPlayerUnFreezed:" + JSON.stringify(data))
    })
    
    pomelo.on('onOutScope', function(data){
        addOutput("onOutScope:" + JSON.stringify(data))
    })
        
    pomelo.on('onPlayerTargeted', function(data){
        addOutput("onPlayerTargeted:" + JSON.stringify(data))
    })    
        
    pomelo.on('onReachTarget', function(data){
        addOutput("onReachTarget:" + JSON.stringify(data))
    })      
        
    pomelo.on('onNotReachTarget', function(data){
        addOutput("onNotReachTarget:" + JSON.stringify(data))
    })  
            
    pomelo.on('onPlayerBeItemed', function(data){
        addOutput("onPlayerBeItemed:" + JSON.stringify(data))
    })  
    
        
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
		var x1 = $("#x1").attr("value");
        var y1 = $("#y1").attr("value");
        var x2 = $("#x2").attr("value");
		var y2 = $("#y2").attr("value");
        var playerX = $("#playerx").attr("value")
        var playerY = $("#playery").attr("value")
        var gametype = $("#gameTypeList").attr("value");

        pomelo.request(route, {
			userid: userid,
            playerx:playerX,
            playery:playerY,
            gamename: gamename,
            maxplayer: maxplayer,
            city: city,
            x1: x1,
			y1: y1,
            x2: x2,
			y2: y2,
            gametype: gametype
        }, function (data) {
			if(!data.sucess)
            {
				addOutput(data.message);
			}
            else{
                addOutput(data.game);
            }
        });
    });
    
    $("#listgame").click(function () {
        var route = "game.gameHandler.list";
        var city = $("#city_listgame").attr("value");
        var x = $("#x_listgame").attr("value")
        var y = $("#y_listgame").attr("value")
        pomelo.request(route, {
            city: city,
            X: x,
            Y: y
        }, function (data) {
            addOutput(data.games);
        });
    });
	    
    $("#joingame").click(function () {
        var route = "game.gameHandler.join";
        var gameid = $("#gameid").attr("value");
        var playerX = $("#playerx").attr("value")
        var playerY = $("#playery").attr("value")
        pomelo.request(route, {
            gameid: gameid,
			userid: userid,
            playerx: playerX,
            playery:playerY
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
	
    $("#startgame").click(function () {
        var route = "game.gameHandler.start";
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
    
    $("#querymap").click(function () {
        var route = "game.gameHandler.querymap";
        var gameid = $("#gameid").attr("value");
        
        pomelo.request(route, {
            gameid: gameid,
			userid: userid
        }, function (data) {
			if(!data.success)
            {
				addOutput(data.message);
			}
            else{
                addOutput(data.map);
            }
        });
    });	
     
         
    $("#report").click(function () {
        var route = "game.gameHandler.report";
        var x = $("#playerx").attr("value");
        var y = $("#playery").attr("value");
        
        pomelo.request(route, {
			userid: userid,
            x:x,
            y:y
        }, function (data) {
			addOutput(data.player)
        });
    });	   
             
    $("#reportalluser").click(function () {
        var route = "game.gameHandler.reportalluser";
       
        pomelo.request(route, {
        }, function (data) {
			addOutput(data.players)
        });
    });	
                 
    $("#stopgame").click(function () {
        var route = "game.gameHandler.stop";
       var gameid = $("#gameid").attr("value");
       
        pomelo.request(route, {
            userid:userid,
            gameid:gameid
        }, function (data) {
			addOutput(data.players)
        });
    });	
                 
    $("#send").click(function () {
        var msg = $("#msg").attr("value");
        var target = $("#target").attr("value");

		var route = "chat.chatHandler.send";

		if(!util.isBlank(msg)) {
			pomelo.request(route, {
				rid: "rmangame",
				content: msg,
				from: userid,
				target: target
			}, function(data) {
			});
		}
    });	  
               
    $("#gamesend").click(function () {
        var msg = $("#gamemsg").attr("value");
        var target = $("#gametarget").attr("value");
        var gameid = $("#gameid").attr("value");

        var route = "game.gameHandler.send";

        if(!util.isBlank(msg)) {
            pomelo.request(route, {
                gameid: gameid,
                content: msg,
                from: userid,
                target: target
            }, function(data) {
            });
        }
    });	
    
    $("#reportusersforgame").click(function () {
        var gameid = $("#gameid").attr("value");
        var route = "game.gameHandler.reportusersforgame";
        pomelo.request(route, {
            gameid: gameid
        }, function(data) {
            addOutput(data.players)
        });
    });	
    
    $("#kickuser").click(function () {
        var gameid = $("#gameid").attr("value");
        var kickuserid = $("#kickuserid").attr("value");
        var route = "game.gameHandler.kickuser";
        pomelo.request(route, {
            gameid: gameid,
            userid: userid,
            kickuserid: kickuserid
        }, function(data) {
            if(!data.success)
            {
				addOutput(data.message);
			}
        });
    });	
     
    $("#test").click(function () {
        for(var i = 0; i< 100; i++)
        {
            var route = "game.gameHandler.report";
            var x = $("#playerx").attr("value");
            var y = $("#playery").attr("value");
            
            pomelo.request(route, {
                userid: userid,
                x:x,
                y:y
            }, function (data) {
                //addOutput(data.player)
            });
        }
    });	    
     
    $("#freezeuser").click(function () {
        var gameid = $("#gameid").attr("value");
        var freezeuserid = $("#kickuserid").attr("value");
        var route = "game.gameHandler.freezeuser";
        pomelo.request(route, {
            gameid: gameid,
            userid: userid,
            freezeuserid: freezeuserid
        }, function(data) {
            if(!data.success)
            {
				addOutput(data.message);
			}
        });
    });    
          
    $("#unfreezeuser").click(function () {
        var gameid = $("#gameid").attr("value");
        var unfreezeuserid = $("#kickuserid").attr("value");
        var route = "game.gameHandler.unfreezeuser";
        pomelo.request(route, {
            gameid: gameid,
            userid: userid,
            unfreezeuserid: unfreezeuserid
        }, function(data) {
            if(!data.success)
            {
				addOutput(data.message);
			}
        });
    }); 
    
    $("#targetuser").click(function () {
        var gameid = $("#gameid").attr("value");
        var targetuserid = $("#kickuserid").attr("value");
        var targetx = $("#x_target").attr("value")
        var targety = $("#y_target").attr("value")
        var route = "game.gameHandler.targetuser";
        pomelo.request(route, {
            gameid: gameid,
            userid: userid,
            targetuserid: targetuserid,
            targetx: targetx,
            targety: targety
        }, function(data) {
            if(!data.success)
            {
				addOutput(data.message);
			}
        });
    });    
    
        
    $("#attackrange").click(function () {
        var gameid = $("#gameid").attr("value");
        var range = $("#range").attr("value");
        var route = "game.gameHandler.attackrange";
        pomelo.request(route, {
            gameid: gameid,
            userid: userid,
            range: range
        }, function(data) {
            if(!data.success)
            {
				addOutput(data.message);
			}
        });
    });  
    
    $("#useitem").click(function () {
        var gameid = $("#gameid").attr("value");
        var targetuserid = $("#kickuserid").attr("value");
        var item = $("#itemname").attr("value")
        var route = "game.gameHandler.useitem";
        pomelo.request(route, {
            gameid: gameid,
            userid: userid,
            targetuserid: targetuserid,
            item: item
        }, function(data) {
            if(!data.success)
            {
				addOutput(data.message);
			}
        });
    });   
     
    $("#dropitem").click(function () {
        var gameid = $("#gameid").attr("value");
        var item = $("#itemname").attr("value")
        var route = "game.gameHandler.dropitem";
        pomelo.request(route, {
            gameid: gameid,
            userid: userid,
            item: item
        }, function(data) {
            if(!data.success)
            {
				addOutput(data.message);
			}
        });
    });        
});

                     
