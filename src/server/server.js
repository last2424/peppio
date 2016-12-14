/*jslint bitwise: true, node: true */
'use strict';

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var SAT = require('sat');

// Import game settings.
var c = require('../../config.json');

// Import utilities.
var util = require('./lib/util');

// Import quadtree.
var quadtree = require('simple-quadtree');

var tree = quadtree(0, 0, c.gameWidth, c.gameHeight);

var users = [];
var massFood = [];
var food = [];
var walls = [];
var virus = [];
var sockets = {};

var leaderboard = [];
var leaderboardChanged = false;

var V = SAT.Vector;
var C = SAT.Circle;

var initMassLog = util.log(c.defaultPlayerMass, c.slowBase);

app.use(express.static(__dirname + '/../client'));
function addFood(toAdd) {
var radius = util.massToRadius(c.foodMass)/2;
while (toAdd--) {
var position;

position = {
x: Math.floor(Math.random() * (c.gameWidth/c.cellSize)),
y: Math.floor(Math.random() * (c.gameHeight/c.cellSize))
};


for(var i = 0; i < food.length; i++)
{
if(food[i].x == position.x * c.cellSize && food[i].y == position.y*c.cellSize)
{
toAdd++;
continue;
}
}
//920
//731
food.push({
// Make IDs unique.
id: ((new Date()).getTime() + '' + food.length) > 0,
x: position.x*c.cellSize,
y: position.y*c.cellSize,
radius: radius,
mass: Math.random() + 2,
hue: Math.round(Math.random() * 360)
});
walls.push({
// Make IDs unique.
id: ((new Date()).getTime() + '' + walls.length) > 0,
x: (position.x*c.cellSize)-c.cellSize,
y: (position.y*c.cellSize)-c.cellSize,
radius: 23,
mass: Math.random() + 2,
hue: 0
});
walls.push({
// Make IDs unique.
id: ((new Date()).getTime() + '' + walls.length) > 0,
x: (position.x*c.cellSize)-c.cellSize,
y: (position.y*c.cellSize)-c.cellSize+23,
radius: 23,
mass: Math.random() + 2,
hue: 21
});
}
}

function addVirus(toAdd) {
    while (toAdd--) {
        var mass = util.randomInRange(c.virus.defaultMass.from, c.virus.defaultMass.to, true);
        var radius = util.massToRadius(mass);
        var position = c.virusUniformDisposition ? util.uniformPosition(virus, radius) : util.randomPosition(radius);
        virus.push({
            id: ((new Date()).getTime() + '' + virus.length) >>> 0,
            x: position.x,
            y: position.y,
            radius: radius,
            mass: mass,
            fill: c.virus.fill,
            stroke: c.virus.stroke,
            strokeWidth: c.virus.strokeWidth,
			stageMove: 0,
			move: false,
			target: {
				x: 0,
				y: 0
			}
        });
    }
}//GANHRIST

function removeFood(toRem) {
    while (toRem--) {
        food.pop();
    }
}

function movePlayer(player) {
    function funcWalls(f) {
     //   return SAT.pointInCircle(new V(f.x, f.y), playerCircle);
	 return false;
    }
    var x =0,y =0;
    for(var i=0; i<player.cells.length; i++)
    {
		
		if(player.frame === -1){
			player.frame += 1;
		}else{
			player.frame += 1;
			if(player.frame >= 8){
				if(player.sex === 0){
				player.sw = 166;
				player.sh = 166;
				player.sx = 362;
				player.sy = 458;
				}else if(player.sex == 1) {
				player.sw = 187;
				player.sh = 187;
				player.sx = 1361;
				player.sy = 437;	
				}else {
                    player.sw = 197;
                    player.sh = 197;
                    player.sx = 1866;
                    player.sy = 124;
                }
			}		
			if(player.frame >= 16){
				if(player.sex === 0){
				player.sw = 166;
				player.sh = 166;
				player.sx = 602;
				player.sy = 460;
				}else if(player.sex == 1) {
				player.sw = 187;
				player.sh = 187;
				player.sx = 1112;
				player.sy = 437;
				}else {
                    player.sw = 197;
                    player.sh = 197;
                    player.sx = 2085;
                    player.sy = 124;
                }
			}
			if(player.frame >= 24){
				if(player.sex === 0){
				player.sw = 166;
				player.sh = 166;
				player.sx = 129;
				player.sy = 453;
				}else if(player.sex == 1){
				player.sw = 187;
				player.sh = 187;
				player.sx = 873;
				player.sy = 437;
				}else {
                    player.sw = 197;
                    player.sh = 197;
                    player.sx = 2333;
                    player.sy = 124;
                }
				player.frame = 0;
			}
		}
		
		if(player.dir === 0){
			player.target.x = 50;
			player.target.y = 0;
			player.rot = 0;
		}
		if(player.dir === 1){
			player.target.x = -50;
			player.target.y = 0;
			player.rot = -3.14;
		}
		if(player.dir === 2){
			player.target.x = 0;
			player.target.y = 50;
			player.rot = 1.57;
		}
		if(player.dir === 3){
			player.target.x = 0;
			player.target.y = -50;
			player.rot = -1.57;
		}
		
        var target = {
            x: player.x - player.cells[i].x + player.target.x,
            y: player.y - player.cells[i].y + player.target.y
        };
        var dist = Math.sqrt(Math.pow(target.y, 2) + Math.pow(target.x, 2));
        var deg = Math.atan2(target.y, target.x);
        var slowDown = 1;
        if(player.cells[i].speed <= 6.25) {
            slowDown = util.log(player.cells[i].mass, c.slowBase) - initMassLog + 1;
        }

        var deltaY = player.cells[i].speed * Math.sin(deg)/ slowDown;
        var deltaX = player.cells[i].speed * Math.cos(deg)/ slowDown;

        if(player.cells[i].speed > 6.25) {
            player.cells[i].speed -= 0.5;
        }
        if (dist < (50 + player.cells[i].radius)) {
            deltaY *= dist / (50 + player.cells[i].radius);
            deltaX *= dist / (50 + player.cells[i].radius);
        }
        
        var currentCell = player.cells[i];
        var playerCircle = new C(
            new V(currentCell.x, currentCell.y),
            currentCell.radius
        );
        var a = walls.map(funcWalls)
            .reduce( function(a, b, c) { return b ? a.concat(c) : a; }, []);
            
        if (!isNaN(deltaY)) {
           
            player.cells[i].y += deltaY;
            currentCell = player.cells[i];
            playerCircle = new C(
                new V(currentCell.x, currentCell.y),
                currentCell.radius
            );
            a = walls.map(funcWalls)
            .reduce( function(a, b, c) { return b ? a.concat(c) : a; }, []);
            if(a.length > 0)
                player.cells[i].y -= deltaY;
                
        }
        if (!isNaN(deltaX)) {
            player.cells[i].x += deltaX;
           currentCell = player.cells[i];
           playerCircle = new C(
                new V(currentCell.x, currentCell.y),
                currentCell.radius
            );
            a = walls.map(funcWalls)
            .reduce( function(a, b, c) { return b ? a.concat(c) : a; }, []);
            if(a.length > 0)
                player.cells[i].x -=deltaX;
        }
        // Find best solution.
        for(var j=0; j<player.cells.length; j++) {
            if(j != i && player.cells[i] !== undefined) {
                var distance = Math.sqrt(Math.pow(player.cells[j].y-player.cells[i].y,2) + Math.pow(player.cells[j].x-player.cells[i].x,2));
                var radiusTotal = (player.cells[i].radius + player.cells[j].radius);
                if(distance < radiusTotal) {
                    if(player.lastSplit > new Date().getTime() - 1000 * c.mergeTimer) {
                        if(player.cells[i].x < player.cells[j].x) {
                            player.cells[i].x--;
                        } else if(player.cells[i].x > player.cells[j].x) {
                            player.cells[i].x++;
                        }
                        if(player.cells[i].y < player.cells[j].y) {
                            player.cells[i].y--;
                        } else if((player.cells[i].y > player.cells[j].y)) {
                            player.cells[i].y++;
                        }
                    }
                    else if(distance < radiusTotal / 1.75) {
                        player.cells[i].mass += player.cells[j].mass;
                        player.cells[i].radius = util.massToRadius(player.cells[i].mass);
                        player.cells.splice(j, 1);
                    }
                }
            }
        }
        if(player.cells.length > i) {
            var borderCalc = player.cells[i].radius / 3;
            if (player.cells[i].x > c.gameWidth - borderCalc) {
                player.cells[i].x = c.gameWidth - borderCalc;
            }
            if (player.cells[i].y > c.gameHeight - borderCalc) {
                player.cells[i].y = c.gameHeight - borderCalc;
            }
            if (player.cells[i].x < borderCalc) {
                player.cells[i].x = borderCalc;
            }
            if (player.cells[i].y < borderCalc) {
                player.cells[i].y = borderCalc;
            }
            x += player.cells[i].x;
            y += player.cells[i].y;
        }
    }
    player.x = x/player.cells.length;
    player.y = y/player.cells.length;
}

function moveMass(mass) {
    var deg = Math.atan2(mass.target.y, mass.target.x);
    var deltaY = mass.speed * Math.sin(deg);
    var deltaX = mass.speed * Math.cos(deg);

    mass.speed -= 0.5;
    if(mass.speed < 0) {
        mass.speed = 0;
    }
    if (!isNaN(deltaY)) {
        mass.y += deltaY;
    }
    if (!isNaN(deltaX)) {
        mass.x += deltaX;
    }

    var borderCalc = mass.radius + 5;

    if (mass.x > c.gameWidth - borderCalc) {
        mass.x = c.gameWidth - borderCalc;
    }
    if (mass.y > c.gameHeight - borderCalc) {
        mass.y = c.gameHeight - borderCalc;
    }
    if (mass.x < borderCalc) {
        mass.x = borderCalc;
    }
    if (mass.y < borderCalc) {
        mass.y = borderCalc;
    }
}

function balanceMass() {
    var totalMass = food.length * c.foodMass +
        users
            .map(function(u) {return u.massTotal; })
            .reduce(function(pu,cu) { return pu+cu;}, 0);

    var massDiff = c.gameMass - totalMass;
    var maxFoodDiff = c.maxFood - food.length;
    var foodDiff = parseInt(massDiff / c.foodMass) - maxFoodDiff;
    var foodToAdd = Math.min(foodDiff, maxFoodDiff);
    var foodToRemove = -Math.max(foodDiff, maxFoodDiff);

    if (foodToAdd > 0) {
        //console.log('[DEBUG] Adding ' + foodToAdd + ' food to level!');
        addFood(foodToAdd);
        //console.log('[DEBUG] Mass rebalanced!');
    }
    else if (foodToRemove > 0) {
        //console.log('[DEBUG] Removing ' + foodToRemove + ' food from level!');
        removeFood(foodToRemove);
        //console.log('[DEBUG] Mass rebalanced!');
    }

    var virusToAdd = c.maxVirus - virus.length;

    if (virusToAdd > 0) {
        addVirus(virusToAdd);
    }
}

io.on('connection', function (socket) {
    console.log('A user connected!', socket.handshake.query.type);

    var type = socket.handshake.query.type;
    var radius = util.massToRadius(c.defaultPlayerMass);
    var position = c.newPlayerInitialPosition == 'farthest' ? util.uniformPosition(users, radius) : util.randomPosition(radius);

    var cells = [];
    var massTotal = 0;
    if(type === 'player') {
        cells = [{
            mass: c.defaultPlayerMass,
            x: position.x,
            y: position.y,
            radius: radius
        }];
        massTotal = c.defaultPlayerMass;
    }

    var currentPlayer = {
        id: socket.id,
        x: position.x,
        y: position.y,
        w: c.defaultPlayerMass,
        h: c.defaultPlayerMass,
		dir: 0,
        cells: cells,
        massTotal: massTotal,
        hue: Math.round(Math.random() * 360),
        type: type,
        lastHeartbeat: new Date().getTime(),
        target: {
            x: 0,
            y: 0
        },
		frame: -1,
		sex: Math.round(Math.random() *2),
		sx: 0,
		sy: 0,
		sw: 0,
		sh: 0,
		rot: 0
    };
	currentPlayer.sx = (currentPlayer.sex === 0) ? 129 : 873;
	currentPlayer.sy = (currentPlayer.sex === 0) ? 437 : 437;
	currentPlayer.sw = (currentPlayer.sex === 0) ? 166 : 187;
	currentPlayer.sh = (currentPlayer.sex === 0) ? 166 : 187;
    socket.on('gotit', function (player) {
        console.log('[INFO] Player ' + player.name + ' connecting!');

        if (util.findIndex(users, player.id) > -1) {
            console.log('[INFO] Player ID is already connected, kicking.');
            socket.disconnect();
        } else if (!util.validNick(player.name)) {
            socket.emit('kick', 'Invalid username.');
            socket.disconnect();
        } else {
            console.log('[INFO] Player ' + player.name + ' connected!');
            sockets[player.id] = socket;

            var radius = util.massToRadius(c.defaultPlayerMass);
            var position = c.newPlayerInitialPosition == 'farthest' ? util.uniformPosition(users, radius) : util.randomPosition(radius);

            player.x = position.x;
            player.y = position.y;
            player.target.x = 0;
            player.target.y = 0;
            if(type === 'player') {
                player.cells = [{
                    mass: c.defaultPlayerMass,
                    x: position.x,
                    y: position.y,
                    radius: radius
                }];
                player.massTotal = c.defaultPlayerMass;
            }
            else {
                 player.cells = [];
                 player.massTotal = 0;
            }
            player.hue = Math.round(Math.random() * 360);
            currentPlayer = player;
            currentPlayer.lastHeartbeat = new Date().getTime();
            users.push(currentPlayer);

            io.emit('playerJoin', { name: currentPlayer.name });

            socket.emit('gameSetup', {
                gameWidth: c.gameWidth,
                gameHeight: c.gameHeight
            });
            console.log('Total players: ' + users.length);
        }

    });

    socket.on('pingcheck', function () {
        socket.emit('pongcheck');
    });

    socket.on('windowResized', function (data) {
        currentPlayer.screenWidth = data.screenWidth;
        currentPlayer.screenHeight = data.screenHeight;
    });

    socket.on('respawn', function () {
        if (util.findIndex(users, currentPlayer.id) > -1)
            users.splice(util.findIndex(users, currentPlayer.id), 1);
        socket.emit('welcome', currentPlayer);
        console.log('[INFO] User ' + currentPlayer.name + ' respawned!');
    });

    socket.on('disconnect', function () {
        if (util.findIndex(users, currentPlayer.id) > -1)
            users.splice(util.findIndex(users, currentPlayer.id), 1);
        console.log('[INFO] User ' + currentPlayer.name + ' disconnected!');

        socket.broadcast.emit('playerDisconnect', { name: currentPlayer.name });
    });

    socket.on('playerChat', function(data) {
        var _sender = data.sender.replace(/(<([^>]+)>)/ig, '');
        var _message = data.message.replace(/(<([^>]+)>)/ig, '');
        if (c.logChat === 1) {
            console.log('[CHAT] [' + (new Date()).getHours() + ':' + (new Date()).getMinutes() + '] ' + _sender + ': ' + _message);
        }
        socket.broadcast.emit('serverSendPlayerChat', {sender: _sender, message: _message.substring(0,35)});
    });

    socket.on('pass', function(data) {
        if (data[0] === c.adminPass) {
            console.log('[ADMIN] ' + currentPlayer.name + ' just logged in as an admin!');
            socket.emit('serverMSG', 'Welcome back ' + currentPlayer.name);
            socket.broadcast.emit('serverMSG', currentPlayer.name + ' just logged in as admin!');
            currentPlayer.admin = true;
        } else {
            console.log('[ADMIN] ' + currentPlayer.name + ' attempted to log in with incorrect password.');
            socket.emit('serverMSG', 'Password incorrect, attempt logged.');
            // TODO: Actually log incorrect passwords.
        }
    });

    socket.on('kick', function(data) {
        if (currentPlayer.admin) {
            var reason = '';
            var worked = false;
            for (var e = 0; e < users.length; e++) {
                if (users[e].name === data[0] && !users[e].admin && !worked) {
                    if (data.length > 1) {
                        for (var f = 1; f < data.length; f++) {
                            if (f === data.length) {
                                reason = reason + data[f];
                            }
                            else {
                                reason = reason + data[f] + ' ';
                            }
                        }
                    }
                    if (reason !== '') {
                       console.log('[ADMIN] User ' + users[e].name + ' kicked successfully by ' + currentPlayer.name + ' for reason ' + reason);
                    }
                    else {
                       console.log('[ADMIN] User ' + users[e].name + ' kicked successfully by ' + currentPlayer.name);
                    }
                    socket.emit('serverMSG', 'User ' + users[e].name + ' was kicked by ' + currentPlayer.name);
                    sockets[users[e].id].emit('kick', reason);
                    sockets[users[e].id].disconnect();
                    users.splice(e, 1);
                    worked = true;
                }
            }
            if (!worked) {
                socket.emit('serverMSG', 'Could not locate user or user is an admin.');
            }
        } else {
            console.log('[ADMIN] ' + currentPlayer.name + ' is trying to use -kick but isn\'t an admin.');
            socket.emit('serverMSG', 'You are not permitted to use this command.');
        }
    });

    // Heartbeat function, update everytime.
    socket.on('0', function(target) {
        currentPlayer.lastHeartbeat = new Date().getTime();
        if (target.x !== currentPlayer.x || target.y !== currentPlayer.y) {
			currentPlayer.dir = target.dir;
        }
    });

    socket.on('1', function() {
        // Fire food.
        for(var i=0; i<currentPlayer.cells.length; i++)
        {
            if(((currentPlayer.cells[i].mass >= c.defaultPlayerMass + c.fireFood) && c.fireFood > 0) || (currentPlayer.cells[i].mass >= 20 && c.fireFood === 0)){
                var masa = 1;
                if(c.fireFood > 0)
                    masa = c.fireFood;
                else
                    masa = currentPlayer.cells[i].mass*0.1;
                currentPlayer.cells[i].mass -= masa;
                currentPlayer.massTotal -=masa;
                massFood.push({
                    id: currentPlayer.id,
                    num: i,
                    masa: masa,
                    hue: currentPlayer.hue,
                    target: {
                        x: currentPlayer.x - currentPlayer.cells[i].x + currentPlayer.target.x,
                        y: currentPlayer.y - currentPlayer.cells[i].y + currentPlayer.target.y
                    },
                    x: currentPlayer.cells[i].x,
                    y: currentPlayer.cells[i].y,
                    radius: util.massToRadius(masa),
                    speed: 25,
					spritenum: Math.floor(Math.random() * (4 - 1 + 1)) + 1,
					sprite: {
						sx: 0,
						sy: 0,
						sw: 0,
						sh: 0
					}
                });
            }
        }
    });
    socket.on('2', function(virusCell) {
        function splitCell(cell) {
            if(cell.mass >= c.defaultPlayerMass*2) {
                cell.mass = cell.mass/2;
                cell.radius = util.massToRadius(cell.mass);
                currentPlayer.cells.push({
                    mass: cell.mass,
                    x: cell.x,
                    y: cell.y,
                    radius: cell.radius,
                    speed: 50
                });
            }
        }

        if(currentPlayer.cells.length < c.limitSplit && currentPlayer.massTotal >= c.defaultPlayerMass*2) {
            //Split single cell from virus
            if(virusCell) {
              splitCell(currentPlayer.cells[virusCell]);
            }
            else {
              //Split all cells
              if(currentPlayer.cells.length < c.limitSplit && currentPlayer.massTotal >= c.defaultPlayerMass*2) {
                  var numMax = currentPlayer.cells.length;
                  for(var d=0; d<numMax; d++) {
                      splitCell(currentPlayer.cells[d]);
                  }
              }
            }
            currentPlayer.lastSplit = new Date().getTime();
        }
    });
});

function tickPlayer(currentPlayer) {
    if(currentPlayer.lastHeartbeat < new Date().getTime() - c.maxHeartbeatInterval) {
        sockets[currentPlayer.id].emit('kick', 'Last heartbeat received over ' + c.maxHeartbeatInterval + ' ago.');
        sockets[currentPlayer.id].disconnect();
    }
	

    movePlayer(currentPlayer);

    function funcFood(f) {
        return SAT.pointInCircle(new V(f.x, f.y), playerCircle);
    }
	function shotFood(f) {
		return { res: SAT.pointInCircle(new V(f.x, f.y), virusCircle), r: f };
    }


    function deleteFood(f) {
        food[f] = {};
        food.splice(f, 1);
    }

    function eatMass(m) {
        if(SAT.pointInCircle(new V(m.x, m.y), playerCircle)){
            if(m.id == currentPlayer.id && m.speed > 0 && z == m.num)
                return false;
            return true;
        }
        return false;
    }

    function check(user) {
        for(var i=0; i<user.cells.length; i++) {
            if(user.cells[i].mass > 10 && user.id !== currentPlayer.id) {
                var response = new SAT.Response();
                var collided = SAT.testCircleCircle(playerCircle,
                    new C(new V(user.cells[i].x, user.cells[i].y), user.cells[i].radius),
                    response);
                if (collided) {
                    response.aUser = currentCell;
                    response.bUser = {
                        id: user.id,
                        name: user.name,
                        x: user.cells[i].x,
                        y: user.cells[i].y,
                        num: i,
                        mass: user.cells[i].mass,
						radius: user.cells[i].radius
                    };
                    playerCollisions.push(response);
                }
            }
        }
        return true;
    }

    function collisionCheck(collision) {
		var p2 = new C(
            new V(collision.bUser.x, collision.bUser.y),
            collision.bUser.radius
        );
		
		var proc = (collision.aUser.radius - collision.bUser.radius);
        if(SAT.pointInCircle(new V(collision.aUser.x, collision.aUser.y), p2) && proc >= 5){
		//if (collision.aUser.mass > collision.bUser.mass * 1.1  && collision.aUser.radius > Math.sqrt(Math.pow(collision.aUser.x - collision.bUser.x, 2) + Math.pow(collision.aUser.y - collision.bUser.y, 2))*1.75) {
			console.log('[DEBUG] Killing user: ' + collision.bUser.id);
            console.log('[DEBUG] Collision info:');
            console.log(collision);
		//	console.log(collision.aUser.mass + " > " + collision.bUser.mass + " * 1.1"+(collision.bUser.mass * 1.1) + " &&" + collision.aUser.radius + " > " + Math.sqrt(Math.pow(collision.aUser.x - collision.bUser.x, 2) + Math.pow(collision.aUser.y - collision.bUser.y, 2))*1.75);

            var numUser = util.findIndex(users, collision.bUser.id);
            if (numUser > -1) {
                if(users[numUser].cells.length > 1) {
                    users[numUser].massTotal -= collision.bUser.mass;
                    users[numUser].cells.splice(collision.bUser.num, 1);
                } else {
                    users.splice(numUser, 1);
                    io.emit('playerDied', { name: collision.bUser.name });
                    sockets[collision.bUser.id].emit('RIP');
                }
            }
            currentPlayer.massTotal += collision.bUser.mass;
            collision.aUser.mass += collision.bUser.mass;
        }
    }

    for(var z=0; z<currentPlayer.cells.length; z++) {
        var currentCell = currentPlayer.cells[z];
        var playerCircle = new C(
            new V(currentCell.x, currentCell.y),
            currentCell.radius
        );
        var foodEaten = food.map(funcFood)
            .reduce( function(a, b, c) { return b ? a.concat(c) : a; }, []);

        foodEaten.forEach(deleteFood);

        var massEaten = massFood.map(eatMass)
            .reduce(function(a, b, c) {return b ? a.concat(c) : a; }, []);

        var virusCollision = virus.map(funcFood).reduce( function(a, b, c) { return b ? a.concat(c) : a; }, []);

		   
		  
        if(virusCollision > 0 && currentCell.radius > virus[virusCollision].radius+10) {
          sockets[currentPlayer.id].emit('virusSplit', z);
		  virus.splice(virusCollision, 1);
        }

        var masaGanada = 0;
        for(var m=0; m<massEaten.length; m++) {
            masaGanada += massFood[massEaten[m]].masa;
            massFood[massEaten[m]] = {};
            massFood.splice(massEaten[m],1);
            for(var n=0; n<massEaten.length; n++) {
                if(massEaten[m] < massEaten[n]) {
                    massEaten[n]--;
                }
            }
        }

        if(typeof(currentCell.speed) == "undefined")
            currentCell.speed = 6.25;
        masaGanada += (foodEaten.length * c.foodMass);
        currentCell.mass += masaGanada;
        currentPlayer.massTotal += masaGanada;
        currentCell.radius = util.massToRadius(currentCell.mass);
        playerCircle.r = currentCell.radius;

        tree.clear();
        users.forEach(tree.put);
        var playerCollisions = [];

        var otherUsers =  tree.get(currentPlayer, check);

        playerCollisions.forEach(collisionCheck);
    }
	
	
    for(var y=0; y<virus.length; y++) {
        var vir = virus[y];
        var virusCircle = new C(
            new V(vir.x, vir.y),
            vir.radius
        );
		var shotCollision;
		shotCollision = massFood.map(shotFood);
		for(var i = 0; i < shotCollision.length; i++){
		if(shotCollision.length > 0 && shotCollision[i].res){
		if(virus[y].stageMove >= 7){
			virus[y].move = true;
			virus[y].target.x = shotCollision[i].r.target.x;
			virus[y].target.y = shotCollision[i].r.target.y;
			virus[y].stageMove = 0;
		}else{
		virus[y].stageMove += 1;
		}
		virus[y].radius += 1;
		massFood.splice(massFood.indexOf(shotCollision[i].r), 1);
		}
		}
		
		
		if(virus[y].move){
			virus[y].target.x = (virus[y].target.x > 0) ? virus[y].target.x - 1 : virus[y].target.x + 1;
			virus[y].target.y = (virus[y].target.y > 0) ? virus[y].target.y - 1 : virus[y].target.y + 1;
			virus[y].x += virus[y].target.x;
            virus[y].y += virus[y].target.y;
			var borderCalc = virus[y].radius;
			if (virus[y].x > c.gameWidth - borderCalc) {
				virus[y].x = c.gameWidth - borderCalc;
			}
			if (virus[y].y > c.gameHeight - borderCalc) {
				virus[y].y = c.gameHeight - borderCalc;
			}
			if (virus[y].x < borderCalc) {
				virus[y].x = borderCalc;
			}
			if (virus[y].y < borderCalc) {
				virus[y].y = borderCalc;
			}
			virus[y].move = (virus[y].target.x === 0 && virus[y].target.y === 0) ? false : true;
		}
	}

}

function moveloop() {
    for (var i = 0; i < users.length; i++) {
        tickPlayer(users[i]);
    }
    for (i=0; i < massFood.length; i++) {
		if(massFood[i].spritenum === 1) {
			if((massFood[i].sprite.sx === 0 || massFood[i].sprite.sy === 0) || (massFood[i].sprite.sx === 236 || massFood[i].sprite.sy === 1289)) {
				massFood[i].sprite.sx = 228;
				massFood[i].sprite.sy = 1144;
				massFood[i].sprite.sw = 111;
				massFood[i].sprite.sh = 113;
			}else if((massFood[i].sprite.sx === 0 || massFood[i].sprite.sy === 0) || (massFood[i].sprite.sx === 228 || massFood[i].sprite.sy === 1144)){
				massFood[i].sprite.sx = 236;
				massFood[i].sprite.sy = 1289;
				massFood[i].sprite.sw = 111;
				massFood[i].sprite.sh = 113;
			}
		}else if(massFood[i].spritenum === 2){
			if((massFood[i].sprite.sx = 0 || massFood[i].sprite.sy === 0) || (massFood[i].sprite.sx === 489 || massFood[i].sprite.sy === 1280)) {
				massFood[i].sprite.sx = 481;
				massFood[i].sprite.sy = 1135;
				massFood[i].sprite.sw = 111;
				massFood[i].sprite.sh = 113;
			}else if((massFood[i].sprite.sx === 0 || massFood[i].sprite.sy === 0) || (massFood[i].sprite.sx === 481 || massFood[i].sprite.sy === 1135)){
				massFood[i].sprite.sx = 489;
				massFood[i].sprite.sy = 1280;
				massFood[i].sprite.sw = 111;
				massFood[i].sprite.sh = 113;
			}
		}else if(massFood[i].spritenum === 3){
			if((massFood[i].sprite.sx = 0 || massFood[i].sprite.sy === 0) || (massFood[i].sprite.sx === 734 || massFood[i].sprite.sy === 1297)) {
				massFood[i].sprite.sx = 726;
				massFood[i].sprite.sy = 1153;
				massFood[i].sprite.sw = 111;
				massFood[i].sprite.sh = 113;
			}else if((massFood[i].sprite.sx === 0 || massFood[i].sprite.sy === 0) || (massFood[i].sprite.sx === 726 || massFood[i].sprite.sy === 1153)){
				massFood[i].sprite.sx = 734;
				massFood[i].sprite.sy = 1297;
				massFood[i].sprite.sw = 111;
				massFood[i].sprite.sh = 113;
			}
		}else if(massFood[i].spritenum === 4){
			if((massFood[i].sprite.sx = 0 || massFood[i].sprite.sy === 0) || (massFood[i].sprite.sx === 981 || massFood[i].sprite.sy === 1296)) {
				massFood[i].sprite.sx = 973;
				massFood[i].sprite.sy = 1151;
				massFood[i].sprite.sw = 111;
				massFood[i].sprite.sh = 113;
			}else if((massFood[i].sprite.sx === 0 || massFood[i].sprite.sy === 0) || (massFood[i].sprite.sx === 973 || massFood[i].sprite.sy === 1151)){
				massFood[i].sprite.sx = 981;
				massFood[i].sprite.sy = 1296;
				massFood[i].sprite.sw = 111;
				massFood[i].sprite.sh = 113;
			}
		}
        if(massFood[i].speed > 0) moveMass(massFood[i]);
    }
}

function gameloop() {
    if (users.length > 0) {
        users.sort( function(a, b) { return b.massTotal - a.massTotal; });

        var topUsers = [];

        for (var i = 0; i < Math.min(10, users.length); i++) {
            if(users[i].type == 'player') {
                topUsers.push({
                    id: users[i].id,
                    name: users[i].name
                });
            }
        }
        if (isNaN(leaderboard) || leaderboard.length !== topUsers.length) {
            leaderboard = topUsers;
            leaderboardChanged = true;
        }
        else {
            for (i = 0; i < leaderboard.length; i++) {
                if (leaderboard[i].id !== topUsers[i].id) {
                    leaderboard = topUsers;
                    leaderboardChanged = true;
                    break;
                }
            }
        }
        for (i = 0; i < users.length; i++) {
            for(var z=0; z < users[i].cells.length; z++) {
                if (users[i].cells[z].mass * (1 - (c.massLossRate / 1000)) > c.defaultPlayerMass && users[i].massTotal > c.minMassLoss) {
                    var massLoss = users[i].cells[z].mass * (1 - (c.massLossRate / 1000));
                    users[i].massTotal -= users[i].cells[z].mass - massLoss;
                    users[i].cells[z].mass = massLoss;
                }
            }
        }
    }
    balanceMass();
}

function sendUpdates() {
    users.forEach( function(u) {
        // center the view if x/y is undefined, this will happen for spectators
        u.x = u.x || c.gameWidth / 2;
        u.y = u.y || c.gameHeight / 2;
		    var ODZRadius = 0;
            for(var ff=0; ff<u.cells.length; ff++) {
				ODZRadius += u.cells[ff].radius;
            }
        var visibleFood  = food
            .map(function(f) {
                if ( f.x > u.x - u.screenWidth/2 - 20 - ODZRadius*8&&
                    f.x < u.x + u.screenWidth/2 + 20 + ODZRadius*8 &&
                    f.y > u.y - u.screenHeight/2 - 20 - ODZRadius*8 &&
                    f.y < u.y + u.screenHeight/2 + 20 + ODZRadius*8) {
                    return f;
                }
            })
            .filter(function(f) { return f; });
        var visibleWalls  = walls
            .map(function(f) {
                if ( f.x > u.x - u.screenWidth/2 - 22 - ODZRadius*8       &&
                    f.x < u.x + u.screenWidth/2 + 22 + ODZRadius*8 &&
                    f.y > u.y - u.screenHeight/2 - 440 - ODZRadius*8 &&
                    f.y < u.y + u.screenHeight/2 + 440 + ODZRadius*8) {
                    return f;
                }
            })
            .filter(function(f) { return f; });


        var visibleVirus  = virus
            .map(function(f) {
                if ( f.x > u.x - u.screenWidth/2 - f.radius - ODZRadius*8 &&
                    f.x < u.x + u.screenWidth/2 + f.radius + ODZRadius*8 &&
                    f.y > u.y - u.screenHeight/2 - f.radius - ODZRadius*8 &&
                    f.y < u.y + u.screenHeight/2 + f.radius + ODZRadius*8) {
                    return f;
                }
            })
            .filter(function(f) { return f; });

        var visibleMass = massFood
            .map(function(f) {
                if ( f.x+f.radius > u.x - u.screenWidth/2 - 20 - ODZRadius*8 &&
                    f.x-f.radius < u.x + u.screenWidth/2 + 20 + ODZRadius*8 &&
                    f.y+f.radius > u.y - u.screenHeight/2 - 20 - ODZRadius*8 &&
                    f.y-f.radius < u.y + u.screenHeight/2 + 20 + ODZRadius*8) {
                    return f;
                }
            })
            .filter(function(f) { return f; });

        var visibleCells  = users
            .map(function(f) {
                for(var z=0; z<f.cells.length; z++)
                {
                    if ( f.cells[z].x+f.cells[z].radius > u.x - u.screenWidth/2 - 20 - ODZRadius*8 &&
                        f.cells[z].x-f.cells[z].radius < u.x + u.screenWidth/2 + 20 + ODZRadius*8 &&
                        f.cells[z].y+f.cells[z].radius > u.y - u.screenHeight/2 - 20 - ODZRadius*8 &&
                        f.cells[z].y-f.cells[z].radius < u.y + u.screenHeight/2 + 20 + ODZRadius*8) {
                        z = f.cells.lenth;
                        if(f.id !== u.id) {
                            return {
                                id: f.id,
                                x: f.x,
                                y: f.y,
                                cells: f.cells,
                                massTotal: Math.round(f.massTotal),
                                hue: f.hue,
                                name: f.name,
								dir: f.dir,
								frame: f.frame,
								sx: f.sx,
								sy: f.sy,
								sw: f.sw,
								sh: f.sh,
								rot: f.rot,
								sex: f.sex
                            };
                        } else {
                            //console.log("Nombre: " + f.name + " Es Usuario");
                            return {
                                x: f.x,
                                y: f.y,
                                cells: f.cells,
                                massTotal: Math.round(f.massTotal),
                                hue: f.hue,
								dir: f.dir,
								frame: f.frame,
								sx: f.sx,
								sy: f.sy,
								sw: f.sw,
								sh: f.sh,
								rot: f.rot,
								sex: f.sex
                            };
                        }
                    }
                }
            })
            .filter(function(f) { return f; });

        sockets[u.id].emit('serverTellPlayerMove', visibleCells, visibleFood, visibleMass, visibleVirus,visibleWalls);
        if (leaderboardChanged) {
            sockets[u.id].emit('leaderboard', {
                players: users.length,
                leaderboard: leaderboard
            });
        }
    });
    leaderboardChanged = false;
}

setInterval(moveloop, 1000 / 60);
setInterval(gameloop, 1000);
setInterval(sendUpdates, 1000 / c.networkUpdateFactor);

// Don't touch, IP configurations.
var ipaddress = process.env.OPENSHIFT_NODEJS_IP || process.env.IP || '127.0.0.1';
var serverport = process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || c.port;
if (process.env.OPENSHIFT_NODEJS_IP !== undefined) {
    http.listen( serverport, ipaddress, function() {
        console.log('[DEBUG] Listening on *:' + serverport);
    });
} else {
    http.listen( serverport, function() {
        console.log('[DEBUG] Listening on *:' + c.port);
    });
}
