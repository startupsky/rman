var GAME_NOT_FOUND = "没有这个游戏！";
var GAME_FULL = "游戏人数已满！";
var GAME_STARTED = "游戏状态不是等待！";
var ALREADY_IN_GAME = "已经加入这个游戏！";
var NOT_IN_GAME = "不在这个游戏！";
var NOT_HOST_IN_GAME = "不是游戏创建者！";
var GAME_NOT_READY = "游戏状态不能开始！";
var GAME_NOT_STARTED = "游戏没有开始！";
var USER_NOT_IN_GAME = "游戏中没有这个用户！";
var PLAYERS_OUT_OF_GAME = "玩家不在地图内！"
var NOT_CAPABLE = "玩家没有这个道具！";
var USER_UNDER_ITEM = "用户已被使用道具！"

var GAME_STATE_WAITING = 0;
var GAME_STATE_STARTED = 1;
var GAME_STATE_STOPPED = 2;

function GameObject(id, x, y, role, displayname, state)
{
    this.GOID = id
    this.X = x
    this.Y = y
    this.Role = role.Name
    this.CloneRole = role
    this.DisplayName = displayname
    this.State = state
    this.Score = 0
    this.Items = []
    this.ItemGos = []
    this.UnderItem = false
}

function CanAttack(playergo, go)
{
    if(go.CloneRole.HealthPoint<=0)  //already dead, can not attack
        return false;

    if(playergo.CloneRole.AttackPoint > 0 // player can attack
            && playergo.CloneRole.AttackRange > 0
            && go.CloneRole.HealthPoint > 0 // go is still alive
    )
    {
        var attackRoles = playergo.CloneRole.AttackRole.split(",")

        if(attackRoles.indexOf(go.CloneRole.Name) > -1)
        {
            var attackrange = parseFloat(playergo.CloneRole.AttackRange)
            return IsInRange(parseFloat(playergo.X), parseFloat(playergo.Y),parseFloat(go.X),parseFloat(go.Y), attackrange)
        }
    }
    return false
}

function CanAcquire(playergo, go)
{
    if(playergo.Items.length < playergo.CloneRole.AcquireLimit && playergo.CloneRole.AcquireRange > 0 && go.CloneRole.HealthPoint > 0)
    {
        var acquireRoles = playergo.CloneRole.AcquireRole.split(",")
        if(acquireRoles.indexOf(go.CloneRole.Name) > -1)
        {
            var acquirerange = 2
            return IsInRange(parseFloat(playergo.X), parseFloat(playergo.Y),parseFloat(go.X),parseFloat(go.Y), acquirerange)
        }
    }
    return false
}

function IsInRange(x1, y1, x2, y2, range)
{
    var distance = getFlatternDistance(x1,y1,x2,y2)  
    return distance < range
}

function ConfigureReader()
{
    var gameConfigs = new Map()

    var fs = require('fs')
    var dir = "gameconfig"
    var files = fs.readdirSync(dir);
    for(var index=0;index<files.length;index++)
    {
        var str = fs.readFileSync(dir + "/" + files[index], "utf8")
        var config = JSON.parse(str)
        gameConfigs.set(config.Name, config)
    }
        return gameConfigs
}

var EARTH_RADIUS = 6378137.0; //单位M 
var PI = Math.PI; 

function getRad(d)
{ 
    return d*PI/180.0; 
};

function getFlatternDistance(lat1,lng1,lat2,lng2)
{ 
    if(lat1 == lat2 && lng1 == lng2)
        return 0
        
    var f = getRad((lat1 + lat2)/2); 
    var g = getRad((lat1 - lat2)/2); 
    var l = getRad((lng1 - lng2)/2); 

    var sg = Math.sin(g); 
    var sl = Math.sin(l); 
    var sf = Math.sin(f); 

    var s,c,w,r,d,h1,h2; 
    var a = EARTH_RADIUS; 
    var fl = 1/298.257; 

    

    sg = sg*sg; 
    sl = sl*sl; 
    sf = sf*sf; 

    s = sg*(1-sl) + (1-sf)*sl; 
    c = (1-sg)*(1-sl) + sf*sl; 

    w = Math.atan(Math.sqrt(s/c)); 
    r = Math.sqrt(s*c)/w; 
    d = 2*w*a; 
    h1 = (3*r -1)/2/c; 
    h2 = (3*r +1)/2/s; 

 //   console.log(f+" "+g+" "+l+" "+sg+" "+sl+" "+sf+" "+s+" "+c+" "+w+" "+h1+" "+h2+" "+fl+" "+d)
    return d*(1 + fl*(h1*sf*(1-sg) - h2*(1-sf)*sg)); 
} 

var Ayo_GameManager=
{
    createNew: function()
    {
        var gameManager={};
        
        gameManager.games = new Map()
        gameManager.currentgameid =0;

        gameManager.Create = function(userid, gamename, maxplayer, city, radius, centerlati, centerlong, gametype)
        {
            gameManager.currentgameid = gameManager.currentgameid + 1;
            var game = Ayo_Game.createNew(gameManager.currentgameid, userid, gamename, maxplayer, city, radius, centerlati, centerlong, gametype)
            gameManager.games.set(game.ID.toString(), game)
            return game
        };

        gameManager.List = function(msg)
        {
            for (var game of gameManager.games.values()) 
            {
                game.Distance = NaN
            }  
            
            var city = msg.city;  
            var gamesincity = [];
            for (var game of gameManager.games.values()) {
                if (city == "-1" || city == game.City) {
                    gamesincity.push(game)
                }
            }
            

            if(!!msg.X && !!msg.Y)
            {
                var x = parseFloat(msg.X);
                var y = parseFloat(msg.Y);
                if(!isNaN(x) && !isNaN(y))
                {
                    for(var game of gamesincity)
                    {
                        game.Distance = getFlatternDistance(x,y,game.CenterLati,game.CenterLong)-game.Radius
                        if(game.Distance<0)
                            game.Distance = 0
                    }
                    gamesincity.sort(function(a, b){
                        return a.Distance - b.Distance
                    })
                }
            }
            return gamesincity
        }

        return gameManager;
    }
}

var Ayo_Player=
{
    createNew: function(userid, x, y, gameid)
    {
        var player={};
        player.X = x
        player.Y = y
        player.Userid = userid
        player.GameID = gameid.toString()  //maybe remove later
        player.Role = "deamon"
    
        // TODO: will be removed later
        player.State = "normal"
        
        return player
    }
}

var Ayo_Game=
{
    currentgameid:0,
    createNew: function(gameid, userid, gamename, maxplayer, city, radius, centerlati, centerlong, gametype)
    {
        var game={};

        game.ID = gameid;
        game.GameName = gamename;
        game.Maxplayer = maxplayer;
        game.City = city;
        game.Radius = radius;
        game.CenterLati = centerlati;
        game.CenterLong = centerlong;
        game.GameType = gametype;
        game.Host = userid
        game.CurrentPlayers = []
        game.CurrentPlayers.push(userid)
        game.State = GAME_STATE_WAITING
        game.Distance = NaN
        game.Roles = new Map()
        game.Players = new Map()
        game.GOmap = new Map()

        var player = new Ayo_Player.createNew(userid, centerlati, centerlong, game.ID)
        game.Players.set(userid,player)

        game.GameResultInfo = function(userid, gain)
        {
            this.userid = userid
            this.gain = gain
        }

        game.GetRoleCount = function(roles,overallCounts, percentage)
        {
            // Part 1: assign role for players
            // TODO: now assume 2 roles for players to simplify the logic, and the first 2 are for players
            // and the 1st role has more number
            if(roles.length < 2)
            {
                console.log("At least need 2 Roles in the game for ")
                throw "At least need 2 Roles in this game"
            }
    
    
            var multipleValue = overallCounts/(100/percentage);
            var offSet = overallCounts%(100/percentage);
            
            Math.floor(Math.random()*overallCounts);
            
            
            if(offSet>0 && overallCounts>1)
                multipleValue=multipleValue+1;

            var minorRoleNumber = Math.round(multipleValue);
            return minorRoleNumber
        }

        game.GetPlayerRoles = function(roles,overallCounts, percentage)
        {
            var playerRoles = new Array();
            var majorRole = roles[1]
            var minorRole = roles[0]

            var minorRoleNumber = game.GetRoleCount(roles, overallCounts, percentage)    
            
            for (var i = 0; i < overallCounts; i++)
            {
                playerRoles[i] = majorRole;
            }
            
            for (var i = 0; i < minorRoleNumber; i++)
            {
                var index = Math.floor(Math.random()*overallCounts);
                while(playerRoles[index] == minorRole)
                {
                    index = Math.floor(Math.random()*overallCounts);
                }
                playerRoles[index] = minorRole;
            }

            return playerRoles
        }

        game.SetupMap = function(params, receiverList)
        {
            // get game config by game type
            var gameConfig = (ConfigureReader()).get(game.GameType)
            if(!gameConfig)
            {
                console.log("No game config found for ")
                throw "No game config found for " + game.GameType
            }
    
            var gomap = new Map();
            
            var roles = gameConfig.Roles
            var majorRole = roles[1]
            var minorRole = roles[0]

            var playerRoles = game.GetPlayerRoles(roles, game.CurrentPlayers.length, minorRole.Percentage)

            for (var i = 0; i < game.CurrentPlayers.length; i++) 
            {
                var userid = game.CurrentPlayers[i]
                
                var player = game.Players.get(userid)
                var playergoid = "player_" + userid
                var role = playerRoles[i]
                
                receiverList[i]=userid  //发送给本人
                
                player.Role = role.Name
                var param = {role: role.Name, instruction: role.Description}
                params[i] = param
                var cloneRole = JSON.parse(JSON.stringify(role))
                var playergo = new GameObject(playergoid, player.X, player.Y, cloneRole, userid, "normal")
                gomap.set(playergoid, playergo)
                
                var gameRole = game.Roles.get(role.Name)
                if(!gameRole)
                {
                    game.Roles.set(role.Name, 1)
                }
                else
                {
                    game.Roles.set(role.Name, gameRole+1)
                }
               
            }


            var distanceX = 2/11000.0 // 2m for the item
            var distanceY = distanceX
            // Part 2: assign non-player roles
            // TODO: assume the AI roles start from index 2
        //  for(var index = 2; index < roles.length; index++)
            for(var index = 2; index < roles.length; index++)
            {
                var role = roles[index]
                var distribution;
                
                if(role.Type === "AI")
                {
                    var distance = 2
                    if (!!role.Distance)
                        distance = role.Distance
                        
                    var row = Math.round((game.Radius*2/1.414)/distance)
                    var column = Math.round((game.Radius*2/1.414)/distance)
                    
                    
            
                    if(role.Pattern === "Picture")
                    {
                        var improcesser = require('../../ImageProcesser/imangeHandler/ImageProcesser');
                        distribution = improcesser.BinaryArrayFromImage('./taiji.jpg',row,column);
                    }
                    else if(role.Pattern === "Spread")
                    {
                        distribution = new Array()
                        if(!!role.Number)
                        {
                            for(var i = 0;i<row;i++)
                            {
                                distribution[i] = new Array()
                                for(var j=0;j<column;j++)
                                    distribution[i][j] = 0
                            }     
                            var itemNumber = role.Number
                            var count = 0
                            while(count < itemNumber)
                            {
                                var rowIndex = Math.floor((Math.random() * row));
                                var columnIndex = Math.floor((Math.random() * column));
                                if(distribution[rowIndex][columnIndex]==0)
                                {
                                    distribution[rowIndex][columnIndex] = 1
                                    count++
                                }
                            }                      
                        }
                        else
                        {
                            for(var i = 0;i<row;i++)
                            {
                                distribution[i] = new Array()
                                for(var j=0;j<column;j++)
                                    distribution[i][j] = 1
                            }                    
                        }
                    }
                }  
                else if(role.Type === "Item")  // random distribute based on number
                {
                    

                    var distanceMeter = 2
                        
                    var row = Math.round((game.Radius*2/1.414)/distanceMeter)
                    var column = Math.round((game.Radius*2/1.414)/distanceMeter)
                                
                    distribution = new Array()
                    for(var i = 0;i<row;i++)
                    {
                        distribution[i] = new Array()
                        for(var j=0;j<column;j++)
                            distribution[i][j] = 0
                    }     
                    var itemNumber = role.Number
                    var count = 0
                    while(count < itemNumber)
                    {
                        var rowIndex = Math.floor((Math.random() * row));
                        var columnIndex = Math.floor((Math.random() * column));
                        if(distribution[rowIndex][columnIndex]==0)
                        {
                            distribution[rowIndex][columnIndex] = 1
                            count++
                        }
                    }   
                    
                } 

                var roleid = 0
                var startPointLati = parseFloat(game.CenterLati)-(parseInt(game.Radius)/(1.414*111000))
                var startPointLong = parseFloat(game.CenterLong) - (parseInt(game.Radius)/(1.414*111000))

                for (var i = 0; i < row; i++){
                    for (var j=0; j < column;j++){
                        if(distribution[i][j]==1)
                        {
                            var pointX = startPointLati + 0.5*distanceX + i*distanceX
                            var pointY = startPointLong + 0.5*distanceY + j*distanceY
                            
                            var rolegoid = role.Name + "_"+ roleid
                            roleid = roleid + 1
                            var cloneRole = JSON.parse(JSON.stringify(role))
                            var beango = new GameObject(rolegoid, pointX.toString(), pointY.toString(), cloneRole, role.Name, "normal")
                            gomap.set(rolegoid, beango)
                            
                            var gameRole = game.Roles.get(role.Name)
                            if(!gameRole)
                            {
                                game.Roles.set(role.Name, 1)
                            }
                            else
                            {
                                game.Roles.set(role.Name, gameRole+1)
                            }    
                        }
                    }
                }

                // draw the map with 0,1
                // console.log("************"+role.Name+"********row:"+row+"***********") 
                // for (var i = 0; i < row; i++){
                //     var strout=""
                //     for (var j=0; j < column;j++){
                //     strout = strout + distribution[i][j]
                //     }
                //     console.log(strout)
                // }
            }

            game.GOmap =gomap
            return gomap
        }

        game.UpdatePlayerUnderItem =function(pushMessageArray)
        {
            var gomap = game.GOmap
            for(var playerid of game.CurrentPlayers)
            {
                var playergo = gomap.get("player_"+playerid)
                if(!!playergo && !!playergo.UnderItem)
                {
                    if(!!playergo.UnderItemStopTime)
                    {
                        var now = new Date()
                        if(now.getTime() > playergo.UnderItemStopTime)
                        {
                            playergo.CloneRole = JSON.parse(JSON.stringify(playergo.OldRole))
                            playergo.UnderItem = false
                            playergo.UnderItemStartTime = null
                            playergo.UnderItemStopTime = null
                            
                            pushMessageArray.push({event:'onPlayerUpdate', msg:{userid:userGo.GOID,state:"Normal"}});
                        }
                    }
                    else if(!!playergo.TargetX && !!playergo.TargetY)
                    {
                        var limit = 2 // 1m
                        if(IsInRange(playergo.X, playergo.Y, playergo.TargetX, playergo.TargetY, limit))
                        {
                            playergo.CloneRole = JSON.parse(JSON.stringify(playergo.OldRole))
                            playergo.UnderItem = false
                            playergo.TargetX = null
                            playergo.TargetY = null 
                            
                            pushMessageArray.push({event:'onPlayerOffItem', msg:{user:playerid}})                    
                        }
                    }
                    else if(!!playergo.Once)
                    {
                        playergo.CloneRole = JSON.parse(JSON.stringify(playergo.OldRole))
                        playergo.UnderItem = false
                        playergo.Once = false
                        
                        pushMessageArray.push({event:'onPlayerOffItem', msg:{user:playerid}})                   
                    }
                }
            }
        }

        game.UpdateGameResult = function(pushMessageArray)
        { 
            var playerList = new Array()

            var startIndex = 0
            var endIndex = game.CurrentPlayers.length-1
            for (var i = 0; i < game.CurrentPlayers.length; i++) {
                        if (game.GOmap.get("player_"+game.CurrentPlayers[i]).Role === game.Winer) {
                            var playerInfo = new game.GameResultInfo(game.CurrentPlayers[i], "+20")

                            playerList[startIndex++] = playerInfo;
                        }
                        else
                        {
                            var playerInfo = new game.GameResultInfo(game.CurrentPlayers[i], "-5")
                            playerList[endIndex--] = playerInfo;
                        }
                    }
            pushMessageArray.push({event:'onStop', msg:playerList});
        }

        function OnGameFinished(gameid)
        {
            
            var playerList = new Array()

            var startIndex = 0
            var endIndex = game.CurrentPlayers.length-1
            for (var i = 0; i < game.CurrentPlayers.length; i++) {
                        if (game.CurrentPlayers[i].role === game.Winer) {
                            var playerInfo = new game.GameResultInfo(game.CurrentPlayers[i].Userid, "+20")

                            playerList[startIndex++] = playerInfo;
                        }
                        else
                        {
                            var playerInfo = new game.GameResultInfo(game.CurrentPlayers[i].Userid, "-5")
                            playerList[endIndex--] = playerInfo;
                        }
                    }
           // var gameResult = new GameStopInfo(gameid,game.Winer,playerList)

        }

        game.UpdateGameStopCondition = function (pushMessageArray)
        {
            var stopCondition = (ConfigureReader()).get(game.GameType).StopCondition
            var stateInfo = []
            for(var i = 0; i < stopCondition.length; i++)
            {
                var condition = stopCondition[i]
                if(condition.Type === "Timer")
                {
                    var now = new Date()
                    var currentTime = condition.Count * 1000 + game.StartTime - now.getTime();
                    if(currentTime <= 0)
                    {
                        game.Winer = condition.Winer
                    // generateGameResult
                        game.UpdateGameResult(pushMessageArray)
                        return
                    }
                    
                    var hour = parseInt(currentTime/(1000*60*60))
                    var min = parseInt(currentTime/(1000*60))
                    var sec = parseInt(currentTime%(1000*60)).toString().substr(0, 2)
                    var timer= hour+":"+min+":"+sec
                    
                    stateInfo.push({role:condition.Role,value:timer})
                }
                else if(condition.Type === "RoleCondition")
                {
                    var roleCount = game.Roles.get(condition.Role)
                    if(roleCount == condition.Count)
                    {
                        game.Winer = condition.Winer
                        game.UpdateGameResult(pushMessageArray)
                        return
                    }
                    stateInfo.push({role:condition.Role,value:roleCount})
                }
            }
            
            pushMessageArray.push({event:'onStateUpdate', msg:{state:stateInfo}});
        }

        game.UpdateMap= function(userid, x, y, pushMessageArray)
        {
            var playergo = game.GOmap.get("player_"+userid)
            var gomap = game.GOmap

            var canmove = true
            if(!!playergo.CloneRole.MoveRange)
            {
                var limit = playergo.CloneRole.MoveRange/111000 // 1m
                if(Math.abs(x-playergo.X) >= limit || Math.abs(y-playergo.Y) >= limit)
                {
                    pushMessageArray.push({event:'onOutScope', msg:{userid:userid,x:playergo.X,y:playergo.Y}})         
                    canmove = false
                }
            }

            if(canmove)
            {
                playergo.X = x
                playergo.Y = y    
                gomap.forEach(function loop(go, goid, map) {
                    if (CanAttack(playergo, go))
                    {     
                        go.CloneRole.HealthPoint = go.CloneRole.HealthPoint - playergo.CloneRole.AttackPoint
                        
                        if(go.CloneRole.HealthPoint <= 0)
                        {
                            var roleName = go.CloneRole.Name
                            var roleCount = game.Roles.get(roleName)
                            game.Roles.set(roleName, roleCount-1)            
                        }

                        console.log("UpdateMap: ["+ playergo.CloneRole.Name + "]("+ playergo.GOID + ")" + " attack [" + go.CloneRole.Name + "](" + go.GOID +")")

                        playergo.Score = playergo.Score + go.CloneRole.AttackReward

                        pushMessageArray.push({event:'onMapUpdate', msg:{goid: goid, go: go}});
                        pushMessageArray.push({event:'onPlayerScore', msg:{userid: userid, score: playergo.Score}}); 
                    }
                    else if(CanAcquire(playergo, go))
                    {
                        go.CloneRole.HealthPoint = 0

                        var roleName = go.CloneRole.Name
                        var roleCount = game.Roles.get(roleName)
                        game.Roles.set(roleName, roleCount-1)                  

                        console.log("UpdateMap: ["+ playergo.CloneRole.Name + "]("+ playergo.GOID + ")" + " acquire [" + go.CloneRole.Name + "](" + go.GOID +")")

                        playergo.Items.push(go.CloneRole.Name)
                        playergo.ItemGos.push(go)

                        pushMessageArray.push({event:'onMapUpdate', msg:{goid: goid, go: go}});
                        pushMessageArray.push({event:'onPlayerItemUpdate', msg:{userid: userid, items: playergo.Items}});
                                        
                    }
                })              
            }

            game.UpdatePlayerUnderItem(pushMessageArray)
            game.UpdateGameStopCondition(pushMessageArray)
        }

        game.UseItem = function(msg, feedbackInfo, pushMessageArray)
        {
            var userid = msg.userid
            var x = parseFloat(msg.x)
            var y = parseFloat(msg.y)
            var index = parseInt(msg.itemIndex)
            var player

            var targetList;

            var gomap = game.GOmap
            
            if(!!gomap)
            {           
                
                userGo = gomap.get("player_"+userid)
                
                
                if(userGo.ItemGos.count<index+1)
                {
                    feedbackInfo.message = "client is using a item which is not exist! must be somethingwrong";
                    feedbackInfo.success = false;
                }
                else
                {
                    feedbackInfo.message = "";
                    feedbackInfo.success = true;
                    
                    var item = JSON.parse(JSON.stringify(userGo.ItemGos[index].CloneRole));
                    var targetRoles = item.TargetRole.split(",");
                    var itemResults = item.Result;
                    
                    //channel.pushMessage('onPlayerUpdate', {userid:userGo.GOID,state:"Attack"});
                    
                game.CurrentPlayers.forEach(function(playerid)
                {
                    var playergo = gomap.get("player_"+playerid);
                    if(playergo.UnderItem || playergo.State == "Dead")  //if the player is under item effect, do nothing, let the poor guy go...
                    {
                        return;
                    }
                    
                    var targetRoleIndex = targetRoles.indexOf(playergo.Role);
                    
                    if(targetRoleIndex<0)  // not in the target list, do nothing for him/her
                    {
                        return;
                    }
                    
                    console.log("find one player in the target list: "+playergo)
                    var attackrange = userGo.ItemGos[index].CloneRole.AttackRange;
    
                    
                    if(IsInRange(parseFloat(playergo.X),parseFloat(playergo.Y),x,y, attackrange))
                    {
                        console.log(userGo.Role+" use "+item.Name+" to "+playergo.Role)
                        
                        channel.pushMessage('onPlayerUnderItem', {user:parseInt(playergo.GOID.substr(6, playergo.GOID.length-6)),item:item})
                        
                        
                        for(var resultindex = 0;resultindex<itemResults.length;resultindex++)
                            {
                                var result = itemResults[resultindex]
                              //  console.log("***result: "+result)
                                
                                if(typeof(result.Power) != "undefined")
                                {
                                    console.log("power: "+result.Power)
                                    console.log("health point :"+playergo.CloneRole.HealthPoint)
                                    playergo.CloneRole.HealthPoint = playergo.CloneRole.HealthPoint-result.Power;
                                    
                                    if(playergo.CloneRole.HealthPoint <=0)
                                    {
                                        console.log("one of "+playergo.Role+" is been eliminate by"+userGo.Role)
                                        playergo.State = "Dead"
                                        
                                        channel.pushMessage('onPlayerUpdate', {userid:playergo.GOID,state:"Dead"});
                                        var roleCount = game.Roles.get(playergo.Role)
                                        game.Roles.set(roleName, roleCount-1) 
                                        
                                        //这里需要添加分数系统逻辑
                                    }
                                }
                                
                                if(typeof(result.MoveRange) != "undefined")
                                {
                                    playergo.CloneRole.MoveRange = result.MoveRange;
                                    if(playergo.CloneRole.MoveRange == 0)
                                    {
                                        playergo.State = "Freeze"
                                        channel.pushMessage('onPlayerUpdate', {userid:playergo.GOID,state:"Freeze"});
                                    }
                                }
                                if(typeof(result.AttackRange) != "undefined")
                                {
                                    playergo.CloneRole.AttackRange = result.AttackRange
                                }
                                
                                if(result.Type == "Timer")
                                {
                                    playergo.UnderItem = true;
                                    var now = new Date();
                                    playergo.UnderItemStartTime = now.getTime()
                                    playergo.UnderItemStopTime = playergo.UnderItemStartTime + result.Timer*1000
                                }
                                else if(result.Type == "Target")
                                {
                                    var targetx = parseFloat(msg.targetx)
                                    var targety = parseFloat(msg.targety)
                                    playergo.TargetX = targetx
                                    playergo.TargetY = targety
                                }
                                else if(result.Type == "Once")
                                {
                                    playergo.Once = true
                                }                            
                            }
                            
                            playergo.Items.splice(index, 1)
                            playergo.ItemGos.splice(index, 1)
                            pushMessageArray.push({event:'onPlayerItemUpdate', msg:{userid: userid, items: playergo.Items}}); 
                        
                    }
                });
                }         
            }
            
            
        }

        game.Join = function(msg, feedbackInfo)
        {
            var userid = msg.userid
            var playerx = parseFloat(msg.playerx)
            var playery = parseFloat(msg.playery)
            feedbackInfo.success = false
            feedbackInfo.message = GAME_NOT_FOUND

            
            if (game.CurrentPlayers.length >= game.Maxplayer) 
            {
                feedbackInfo.message = GAME_FULL
            }
            else 
            {
                var found = false
                for (var i = 0; i < game.CurrentPlayers.length; i++) {
                    if (game.CurrentPlayers[i] === userid) {
                        found = true
                        break
                    }
                }
                if (found) {
                    feedbackInfo.message = ALREADY_IN_GAME
                }
                else {
                    var player = new Ayo_Player.createNew(userid, playerx, playery, game.ID)
                    game.Players.set(userid, player)
                    game.CurrentPlayers.push(userid)
                    feedbackInfo.message = ""
                    feedbackInfo.success = true
                }
            }
            
        }

        game.Leave = function(msg, feedbackInfo, pushMessageArray)
        {
                       
            if (game.CurrentPlayers.indexOf(userid) > -1) {
                feedbackInfo.message = ""
                feedbackInfo.success = true
                game.Players.delete(userid)
                game.CurrentPlayers.splice(game.CurrentPlayers.indexOf(userid), 1)
                console.log("*** user "+userid+" leave the game.")
                
                if (game.CurrentPlayers.length == 0) {
                    game.UpdateGameResult(pushMessageArray)
                }
                else if (game.Host == userid) {
                    game.Host = game.CurrentPlayers[0]
                }
            }
            else {
                feedbackInfo.message = NOT_IN_GAME
            }  
        } 
        return game;
    }
}



function Ayo_Item(name, description, targetRole, itemProperty)
{
    this.Name = name
    this.Description = description
    this.TargetRole = targetRole
    this.ItemProperty = itemProperty
}



exports.GameManager = Ayo_GameManager
exports.Game = Ayo_Game
exports.Player = Ayo_Player
exports.Item = Ayo_Item
exports.getFlatternDistance = getFlatternDistance
exports.ConfigureReader = ConfigureReader
exports.CanAcquire = CanAcquire
exports.CanAttack = CanAttack
exports.GameObject = GameObject
exports.IsInRange = IsInRange