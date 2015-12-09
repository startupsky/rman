#Game

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