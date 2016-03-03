@echo off
cd web-server && start node app.js && cd .. && cd game-server && start pomelo start
"C:\Program Files\MongoDB\Server\3.0\bin\mongod.exe" -f "C:\Program Files\MongoDB\Server\3.0\bin\mongo.conf"