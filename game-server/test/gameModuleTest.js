gr = require('../app/servers/game/remote/gameModule.js')
var assert = require("assert")

describe("Game Create",function(){
  describe("new game created", function(){
     it("check all the game info is been updated",function(){
         var gameMgr = new gr.GameManager.createNew()
         var game = gameMgr.Create("123","testGame", 3, "beijing", 100, 1, 1, "pacman")
         assert.equal(1,game.ID,"game id is not 1")
         assert.equal("testGame",game.GameName,"game name not correct")
         assert.equal("123",game.Host,"game name not correct")
         assert.equal(3,game.Maxplayer,"max player not correct")
         assert.equal(100,game.Radius,"game radius not correct")
         assert.equal(1,game.CenterLati,"game CenterLati not correct")
         assert.equal(1,game.CenterLong,"game CenterLong not correct")
         assert.equal("pacman",game.GameType,"game name not correct")
         assert.ok(game.CurrentPlayers[0].toString()=="123")
         assert.ok((game.Players.get("123")).X ==game.CenterLati) 

         var game2 = gameMgr.Create(123,"testGame", "3", "beijing", 100, 1, 1, 0)
         assert.equal(2,game2.ID,"game id is not 2")
    });
   });
});

describe("Game List",function(){
  describe("list the games in city", function(){
     it("list all the games with city number as -1",function(){
         var gameMgr = new gr.GameManager.createNew()
         
         gameMgr.Create("user1","testGame", 10, "beijing", 0.5, 1, 1, "pacman")
         gameMgr.Create("user2","testGame2", 10, "beijing", 0.5, 2, 2, "flag")
         gameMgr.Create("user3","testGame3", 10, "hangzhou", 0.5, 3, 3, "pacman")

         var param = {city: -1, X: 4, Y: 4} 
         gameInCity = gameMgr.List(param)
         assert.ok(gameInCity[0].GameName == "testGame3")
         assert.ok(gameInCity[1].GameName == "testGame2")
         assert.ok(gameInCity[2].GameName == "testGame")
    });
   });
});

describe("Game Configure Reader",function(){
  describe("should read the configure files and return the configure map", function(){
     it("output the configure map",function(){
         var gameConfigures = gr.ConfigureReader()
         console.log(gameConfigures)    
    });
   });
});

describe("Game SetupMap",function(){
  describe("get role Count", function(){
     it("2 roles, should assign as 1-1",function(){
         var game = new gr.Game.createNew(1,123,"testGame", "3", "beijing", 100, 1, 1, 0)
         var playerRoles =game.GetPlayerRoles(["pacman","ghost"],10,0.2)
         console.log(playerRoles)
      //   assert.equal(1,game.GetRoleCount(["pacman","ghost"],2,0.2),"get role count has problem")
    });
   });
});

describe("Game SetupMap",function(){
  describe("get role Count", function(){
     it("2 roles, should assign as 1-1",function(){
        var gameMgr = new gr.GameManager.createNew()
         var game = gameMgr.Create("123","testGame", 3, "beijing", 100, 1, 1, "Angel&deamon")
         
         var params = new Array()
         var receiverList = new Array()
         game.SetupMap(params, receiverList)
      //   assert.equal(1,game.GetRoleCount(["pacman","ghost"],2,0.2),"get role count has problem")
    });
   });
});

describe("test can attack",function(){
  describe("give 2 gameobject, return true or false", function(){
    
    var cloneRole = 
                        { Name: 'pacman',
                          Description: 'pacman',
                          HealthPoint: 1,
                          AttackPoint: 5,
                          AttackRange: 0,
                          AttackReward: 1,
                          Distance: 2,
                          Pattern: 'Spread',
                          Type: 'AI' }
    var go = new gr.GameObject(1, 10, 10, "pacman", "pacman", 0)
     go.CloneRole = cloneRole
    var cloneRole2 = 
                        { Name: 'apple',
                          Description: 'apple',
                          HealthPoint: 1,
                          AttackPoint: 0,
                          AttackRange: 0,
                          AttackReward: 1,
                          Distance: 2,
                          Pattern: 'Spread',
                          Type: 'AI' }
      var go2 = new gr.GameObject(1, 10, 10, "apple", "apple", 0)
     go2.CloneRole = cloneRole2

     it("should return false if has 0 health point",function(){
       go.CloneRole.AttachPoint = 5
       go2.CloneRole.HealthPoint = 0
       assert.equal(false,gr.CanAttack(go,go2),"")
    });

    it("should return false if not in the attack list",function(){
       go.CloneRole.AttachPoint = 5
       go2.CloneRole.HealthPoint = 1
       assert.equal(false,gr.CanAttack(go,go2),"")
    });

    it("should return true if in the attack list",function(){
       go.CloneRole.AttackPoint = 5
       go.CloneRole.AttackRange = 5
       go.CloneRole.AttackRole = "apple"
       go2.CloneRole.HealthPoint = 1
       go2.Role = "apple"
       console.log(go)
       console.log(go2)
       assert.equal(true,gr.CanAttack(go,go2),"")
    });
   });
});

describe("Game Update Map",function(){
  describe("handle user position report and do the right update", function(){
     it("update Map general",function(){
        var gameMgr = new gr.GameManager.createNew()
         var game = gameMgr.Create("123","testGame", 3, "beijing", 100, 1, 1, "Angel&deamon")
         
         var params = new Array()
         var receiverList = new Array()
         game.SetupMap(params, receiverList)
         var pushMessageMap= new Map()
         game.UpdateMap("123", 10, 10, pushMessageMap)
         console.log(pushMessageMap)
      //   assert.equal(1,game.GetRoleCount(["pacman","ghost"],2,0.2),"get role count has problem")
    });
   });
});