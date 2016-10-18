gr = require('../app/servers/game/remote/gameModule.js')
var assert = require("assert")

describe("Game Module",function(){
  describe("Create New", function(){
     it("successful",function(){
         var gameMgr = new gr.gameManager.createNew()
    });
   });
});

describe("Game Create",function(){
  describe("current game id udpate", function(){
     it("init as 0 and first game should be 1 and be update",function(){
         var game = new gr.Game.createNew(123,"testGame", "3", "beijing", 100, 1, 1, 0)
         assert.equal(1,game.ID,"game id is not 1")
         assert.equal("testGame",game.GameName,"game id is not 1")
         console.log(JSON.stringify(game))

         var game2 = new gr.Game.createNew(123,"testGame", "3", "beijing", 100, 1, 1, 0)
         assert.equal(2,game2.ID,"game id is not 2")
    });
   });
});

describe("Game Create",function(){
  describe("host information should be saved", function(){
     it("added game creater as host & save to curentplayer",function(){
         var gameMgr = new gr.Game.createNew()
             
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
         var game = new gr.Game.createNew(123,"testGame", "3", "beijing", 100, 1, 1, 0)
         var playerRoles =game.GetPlayerRoles(["pacman","ghost"],10,0.2)
         console.log(playerRoles)
      //   assert.equal(1,game.GetRoleCount(["pacman","ghost"],2,0.2),"get role count has problem")
    });
   });
});