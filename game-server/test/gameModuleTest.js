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
         game.CurrentPlayers=["1","2","3"]
         game.SetupMap()
      //   assert.equal(1,game.GetRoleCount(["pacman","ghost"],2,0.2),"get role count has problem")
    });
   });
});