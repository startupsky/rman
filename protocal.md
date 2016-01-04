#Game

##Constants

```
var GAME_NOT_FOUND = "没有这个游戏！";
var GAME_FULL = "游戏人数已满！";
var GAME_STARTED = "游戏状态不是等待！";
var ALREADY_IN_GAME = "已经加入这个游戏！";
var NOT_IN_GAME = "不在这个游戏！";
var NOT_HOST_IN_GAME = "不是游戏创建者！";
var GAME_NOT_READY = "游戏状态不能开始！";
var GAME_NOT_STARTED = "游戏没有开始！";

var GAME_STATE_WAITING = 0;
var GAME_STATE_STARTED = 1;
var GAME_STATE_STOPPED = 2;
```

##CreateGame
###Request

```
{
	userid: userid,
	gamename: gamename,
	maxplayer: maxplayer,
	city: city,
	x1: x1,
	y1: y1,
	x2: x2,
	y2: y2,
	gametype: gametype
}
```
###Response

```
{
	GameID: 1,
	GameName: gameName
}
```

##ListGame
###Request
```
{
	city: city
}
```
###Response
```
[
	{
		"ID":1,
		"GameName":"game1",
		"Maxplayer":"10",
		"City":"beijing",
		"X1":"1",
		"Y1":"2",
		"X2":"3",
		"Y2":"4",
		"GameType":"pacman",
		"Host":"dxu",
		"CurrentPlayers":["dxu"]
	},
	{
		"ID":2,
		"GameName":"game2",
		"Maxplayer":"10",
		"City":"beijing",
		"X1":"11",
		"Y1":"12",
		"X2":"13",
		"Y2":"14",
		"GameType":"pacman",
		"Host":"fli",
		"CurrentPlayers":["fli"]
	},
```

##JoinGame
###Request
```
{
	gameid: gameid,
	userid: userid
}
```
###Response
```
{
	success: false,
	message: 已经加入这个游戏！
}
```

##LeaveGame
###Request
```
{
	gameid: gameid,
	userid: userid
}
```
###Response
```
{
	success: false,
	message: 不在这个游戏！
}
```

##StartGame
###Request
```
{
    gameid:gameid,
	userid: userid
}
```
###Response
```
{
	success: false,
	message: 不是游戏创建者！
}
```

##QueryMap
###Request
```
{
    gameid:gameid,
	userid: userid
}
```
###Response
```
{
	success: false,
	message: 游戏没有开始！
}
```
```
{
	success: true,
	map: {"Row":55,"Column":55,"Grid":[{"X":"10.00009090909090909090","Y":"10.00009090909090909090","Role":"player"},{"X":"10.00009090909090909090","Y":"10.00009090909090909090.0001818181818181818","Role":"bean"},...
}

```

##Report
###Request
```
{
	userid: userid,
    x:x,
    y:y
}
```
###Response
```
{
	player: player
}

```


##ReportAllUser
###Request
```
{
}
```
###Response
```
{
	players: players
}

```

##StopGame
###Request
```
{
    userid:userid,
    gameid:gameid
}
```
###Response
```
{
	success: false,
	message: 游戏没有开始！
}

```