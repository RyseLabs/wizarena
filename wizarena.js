var game = new Phaser.Game(1920, 1080, Phaser.AUTO, '', {
  preload: preload,
  create: create,
  update: update
});


var map;
var player;
var score = 0;
var playerAffinity;
var mapSize = 10000;
var playerSize = 50;
var moveSpeed = 4;
var energyGroup;
var spellGroup;
var totalEnergy = 0;
var energyCount = 0;
var energyMaxCount = 500;
var energyMinDistance = 50;
var bulletsGroup;
var bulletSpeed = 800;
var enemiesGroup;
var enemySpeed = 400;
var innerSpellSize = 15;
var outerSpellSize = 30;
var canShootProjectile = true;
var canUseUltimate = true;
var isUsingUltimate = false;
var ultimateTimer = 1;
var isGameOver = false;

// Define spell types and their colors
var spellTypes = {
  fire: 0xff0000, // red
  water: 0x00008b, // dark blue
  earth: 0x8b4513, // brown
};

function preload() {}

function buildMap() {
  map = game.add.graphics(0, 0);
  map.beginFill(0xffffff);
  map.drawRect(0, 0, mapSize, mapSize);
  map.endFill();
  map.x = game.world.centerX - mapSize / 2;
  map.y = game.world.centerY - mapSize / 2;
}

function buildPlayer() {
  player = game.add.graphics(0, 0);
  player.beginFill(0x000000);
  player.drawCircle(0, 0, playerSize);
  player.endFill();
  player.x = game.world.centerX;
  player.y = game.world.centerY;
  game.physics.arcade.enable(player);
}

function buildEnergyGroup() {
  energyGroup = game.add.group();
  energyGroup.enableBody = true;
  energyGroup.physicsBodyType = Phaser.Physics.ARCADE;
}

function buildBulletsGroup() {
  bulletsGroup = game.add.group();
  bulletsGroup.enableBody = true;
  bulletsGroup.physicsBodyType = Phaser.Physics.ARCADE;
}

function detectBulletFire() {
  var rightMouseButton;
  var progressCircle;

  game.input.mouse.capture = true;
  // Add a listener for left mouse button click
  game.input.onDown.add(function() {
    if (event.button === Phaser.Mouse.LEFT_BUTTON) {
      if (totalEnergy == 0) return;
      totalEnergy -= 1;
      updateTotalEnergy();
      // Create a new bullet sprite at the player's position
      var bullet = game.add.graphics(player.x, player.y);
      bullet.beginFill(0x9400D3);
      bullet.drawCircle(0, 0, 20);
      bullet.endFill();
      bulletsGroup.add(bullet);

      // Calculate the direction from the player to the cursor position
      var angle = Phaser.Math.angleBetween(player.x, player.y, game.input.mousePointer.x, game.input.mousePointer.y);

      // Set the bullet's velocity to move in that direction
      bullet.body.velocity.x = Math.cos(angle) * bulletSpeed;
      bullet.body.velocity.y = Math.sin(angle) * bulletSpeed;

      // Store the bullet's original angle
      bullet.originalAngle = angle;
    } else if (event.button === Phaser.Mouse.RIGHT_BUTTON) {
      if (!playerAffinity) return;

      rightMouseButton = game.time.events.add(Phaser.Timer.SECOND * 0, function() {
      	if(!canShootProjectile) return;
        
        if (totalEnergy < 5) return;
        totalEnergy -= 5;
        updateTotalEnergy();
				canShootProjectile = false;
				
        var affinity = game.add.graphics(0, 0);
        var spellType = spellTypes[playerAffinity];

        // Create a new bullet sprite at the player's position
        var bullet = game.add.graphics(player.x, player.y);
        bullet.beginFill(spellType);
        bullet.drawCircle(0, 0, 35);
        bullet.endFill();
        bullet.affinity = playerAffinity;
        bullet.type = 1; //blast
        bulletsGroup.add(bullet);

        // Calculate the direction from the player to the cursor position
        var angle = Phaser.Math.angleBetween(player.x, player.y, game.input.mousePointer.x, game.input.mousePointer.y);

        // Set the bullet's velocity to move in that direction
        bullet.body.velocity.x = Math.cos(angle) * bulletSpeed;
        bullet.body.velocity.y = Math.sin(angle) * bulletSpeed;

        // Store the bullet's original angle
        bullet.originalAngle = angle;
        
				setTimeout(()=>{canShootProjectile = true;}, 1000);
      });
    }
  }, this);

}

function createEnemies() {
  enemiesGroup = game.add.group();
  enemiesGroup.enableBody = true;
  enemiesGroup.physicsBodyType = Phaser.Physics.ARCADE;

  game.time.events.loop(Phaser.Timer.SECOND * 2, createEnemy, this);
  game.time.events.loop(Phaser.Timer.SECOND * 2, createEnemy, this);
}

function createSpells() {
  spellGroup = game.add.group();
  spellGroup.enableBody = true;
  spellGroup.physicsBodyType = Phaser.Physics.ARCADE;
}

function createEnemy() {
  if (enemiesGroup != null && enemiesGroup.countLiving() >= 200) {

    return;
  }

  var enemy = game.add.graphics(0, 0);
  enemy.beginFill(0xff7a00);
  enemy.drawCircle(0, 0, 50);
  enemy.endFill();
  enemy.health = 2;

  var playerRect = new Phaser.Rectangle(player.x - 150, player.y - 150, 300, 300);
  var enemyRect = new Phaser.Rectangle(0, 0, enemy.width, enemy.height);
  var maxTries = 2;

  var x, y, i = 0;
  do {
    x = Math.random() * (mapSize - enemy.width) + map.x;
    y = Math.random() * (mapSize - enemy.height) + map.y;
    enemyRect.x = x;
    enemyRect.y = y;
    i++;
  } while (i < maxTries && playerRect.intersects(enemyRect));

  if (i >= maxTries) {
    console.log('cannot generate enemy far enough from player');
    return;
  }

  enemy.x = x;
  enemy.y = y;

  game.physics.arcade.enable(enemy);

  // Set enemy velocity to move randomly
  enemy.body.velocity.x = (Math.random() - 0.5) * enemySpeed;
  enemy.body.velocity.y = (Math.random() - 0.5) * enemySpeed;

  enemiesGroup.add(enemy);

  // Create more enemies if there are not enough alive enemies
  if (enemiesGroup.countLiving() <= 201) {
    game.time.events.add(Phaser.Timer.SECOND * 2, createEnemy, this);
  }
}

function createEnergy() {
  var x = Math.random() * mapSize + map.x;
  var y = Math.random() * mapSize + map.y;

  // Check that the energy is not too close to the player or other energies
  var distanceToPlayer = Phaser.Math.distance(player.x, player.y, x, y);
  var isTooCloseToEnergy = energyGroup.children.some(function(energy) {
    return Phaser.Math.distance(energy.x, energy.y, x, y) < energyMinDistance;
  });

  if (distanceToPlayer > energyMinDistance && !isTooCloseToEnergy) {
    var energy = game.add.graphics(x, y);
    energy.beginFill(0x9400D3);
    energy.drawCircle(0, 0, 20);
    energy.endFill();
    energyGroup.add(energy);
    energyCount++;
  }
}

function createSpellFromEnemy(enemy) {
	score += 1;
  updateScore();
  var x = enemy.x;
  var y = enemy.y;

  // Select a random spell type
  // Select a random spell type
  var spellName = Object.keys(spellTypes)[Math.floor(Math.random() * Object.keys(spellTypes).length)];
  var spellType = spellTypes[spellName];

  var spell = game.add.graphics(x, y);
  spell.beginFill(spellType);
  spell.drawCircle(0, 0, 30);
  spell.endFill();
  spell.spellName = spellName;

  spellGroup.add(spell);
}

function updatePlayerMovement() {
  var maxMoveSpeed = 4; // the maximum movespeed
  var minMoveSpeed = 2.5; // the minimum movespeed
  var maxEnergy = 100; // the maximum energy
  var totalEnergyForCalc = totalEnergy;
  
  if(isUsingUltimate) {
  	maxMoveSpeed = 6;
    if(totalEnergy >= 100)
    	totalEnergyForCalc = 50;
  }
  
  var moveSpeed = maxMoveSpeed - ((maxMoveSpeed - minMoveSpeed) * totalEnergyForCalc / maxEnergy);
  
  // Clamp moveSpeed between minMoveSpeed and maxMoveSpeed
  moveSpeed = Phaser.Math.clamp(moveSpeed, minMoveSpeed, maxMoveSpeed);

  if (game.input.keyboard.isDown(Phaser.Keyboard.A)) {
    if (map.x <= game.world.centerX - playerSize / 2)
      map.x += moveSpeed;
  } else if (game.input.keyboard.isDown(Phaser.Keyboard.D)) {
    if (map.x + mapSize >= game.world.centerX + playerSize / 2)
      map.x -= moveSpeed;
  }

  if (game.input.keyboard.isDown(Phaser.Keyboard.W)) {
    if (map.y <= game.world.centerY - playerSize / 2)
      map.y += moveSpeed;
  } else if (game.input.keyboard.isDown(Phaser.Keyboard.S)) {
    if (map.y + mapSize >= game.world.centerY + playerSize / 2)
      map.y -= moveSpeed;
  }
}



function updateEnergyMovement(dx, dy) {
  // Calculate the change in background position

  // Move the energy sprites with the background
  energyGroup.children.forEach(function(energy) {
    energy.body.x += dx;
    energy.body.y += dy;
  });

  // Update the previous position of the background
  map.previousPosition.x = map.x;
  map.previousPosition.y = map.y;
}

function updateSpellMovement(dx, dy) {
  // Calculate the change in background position

  // Move the energy sprites with the background
  spellGroup.children.forEach(function(spell) {
    spell.body.x += dx;
    spell.body.y += dy;
  });

  // Update the previous position of the background
  map.previousPosition.x = map.x;
  map.previousPosition.y = map.y;
}

function checkEnergyCollisions() {
  game.physics.arcade.overlap(player, energyGroup, function(player, energy) {
    energy.kill();
    energyCount--;
    totalEnergy += 1;
    updateTotalEnergy();
  });
}

function updateTotalEnergy() {
  energyTotalText.text = 'Energy: ' + totalEnergy;

  var color;
  var graphics = player;
  var greenThresh = 50;
  var goldThresh = 100;

  graphics.clear();

  if (totalEnergy < greenThresh) {
    var energyPercentage = Math.min(1, totalEnergy / greenThresh);
    color = Phaser.Color.interpolateColor(0x000000, 0x00ff00, 100, Math.floor(energyPercentage * 100));
  } else if (totalEnergy >= greenThresh && totalEnergy < goldThresh) {
    var energyPercentage = Math.min(1, totalEnergy / goldThresh);
    color = Phaser.Color.interpolateColor(0x00ff00, 0xffd700, 100, Math.floor(energyPercentage * 100));

  } else {
    color = 0xffd700; // yellow
  }

  player = game.add.graphics(0, 0);
  player.beginFill(color);
  player.drawCircle(0, 0, playerSize);
  player.endFill();
  player.x = game.world.centerX;
  player.y = game.world.centerY;
  game.physics.arcade.enable(player);

  if (!playerAffinity) return;
  // create the affinity circle on top of the player
  var affinity = game.add.graphics(0, 0);
  var spellType = spellTypes[playerAffinity];
  affinity.clear();
  affinity.beginFill(spellType);
  affinity.drawCircle(0, 0, innerSpellSize);
  affinity.endFill();
  affinity.x = game.world.centerX;
  affinity.y = game.world.centerY;
}

function createNewEnergy() {
  // Create new energy if there are not enough
  if (energyCount < energyMaxCount) {
    createEnergy();
    createEnergy();
    createEnergy();
  }
}

function updateBulletMovement(dx, dy) {
  // Move the bullets with the background
  if (bulletsGroup != null && bulletsGroup.length > 0) {
    bulletsGroup.children.forEach(function(bullet) {
      if (!bullet.alive) return;

      bullet.body.x += dx;
      bullet.body.y += dy;
      // Check if the bullet is out of the map
      if (bullet.body.x < map.x || bullet.body.x > map.x + mapSize ||
        bullet.body.y < map.y || bullet.body.y > map.y + mapSize) {
        bullet.kill();
      }
    });
  }
}

function checkEnemyBulletCollision() {
  game.physics.arcade.overlap(bulletsGroup, enemiesGroup, function(bullet, enemy) {
  	
    if (bullet.type == 1) {
    	
      switch (bullet.affinity) {
        case "fire":
          createFireBall(bullet);
          break;
        case "water":
          createWaterGeyser(bullet);
          break;
        case "earth":
          createEarthSpire(bullet);
          break;
        case "air":
          createTornado(bullet);
          break;
      }
      
      
    } else {
      // Kill the bullet and the enemy when they collide

      bullet.kill();
      enemy.health -= 1;
      
      switch(enemy.health){
        case 1:
            enemy.beginFill(0xff00000);
            enemy.drawCircle(0, 0, 50);
            enemy.endFill();
          break;
      }
      
      if(enemy.health <= 0) {
      	enemy.kill();
      	createSpellFromEnemy(enemy);
      }
    }
    
  });
  game.physics.arcade.overlap(bulletsGroup, spellGroup, function(bullet, spell) {
      if (bullet.type == 1) {
        // Blasts don't destroy other blasts
        if (spell.type == 1) {
          return;
        }
      }
      // Kill the bullet when it collides with a blast
      bullet.kill();
    });
}

function createTornado(bullet) {
  var blastRadius = 250;
  
  var spellType = spellTypes[playerAffinity];
  // Create an AOE blast at the bullet's position
  var blast = game.add.graphics(bullet.x, bullet.y);
  blast.beginFill(spellType);
  blast.drawCircle(0, 0, blastRadius);
  blast.endFill();
  blast.renderable = false; // don't show the blast for player and enemies
  spellGroup.add(blast);

  // Kill the enemies that are within the blast radius
  enemiesGroup.forEachAlive(function(otherEnemy) {
    if (game.physics.arcade.distanceBetween(blast, otherEnemy) <= blastRadius) {
      otherEnemy.kill();
      createSpellFromEnemy(otherEnemy);
    }
  });

  // Kill the bullet and the blast after a short delay
  bullet.kill();
  game.time.events.add(Phaser.Timer.SECOND * 0.35, function() {
    blast.kill();
  }, this);
}

function createEarthSpire(bullet) {
  var blastRadius = 250;
  var spellType = spellTypes[playerAffinity];

  // Create an AOE blast at the bullet's position
  var blast = game.add.graphics(bullet.x, bullet.y);
  blast.beginFill(spellType);
  blast.drawCircle(0, 0, blastRadius);
  blast.endFill();
  blast.renderable = false;

  // Add physics body to the blast graphic
  game.physics.arcade.enable(blast);
  blast.body.immovable = true;

  spellGroup.add(blast);

  // Kill the bullets that collide with the blast
  bulletsGroup.forEachAlive(function(otherBullet) {
    if (game.physics.arcade.overlap(blast, otherBullet)) {
      otherBullet.kill();
    }
  });

  // Kill the enemies that are within the blast radius
  enemiesGroup.forEachAlive(function(otherEnemy) {
    if (game.physics.arcade.distanceBetween(blast, otherEnemy) <= blastRadius) {
      otherEnemy.kill();
      createSpellFromEnemy(otherEnemy);
    }
  });

  // Kill the bullet and the blast after a short delay
  bullet.kill();
  game.time.events.add(Phaser.Timer.SECOND * 3, function() {
    blast.kill();
  }, this);
}




function createWaterGeyser(bullet) {
  var blastRadius = 750;
  var spellType = spellTypes[playerAffinity];

  // Create an AOE blast at the bullet's position
  var blast = game.add.graphics(bullet.x, bullet.y);
  blast.beginFill(spellType);
  blast.drawCircle(0, 0, blastRadius);
  blast.endFill();
  blast.renderable = false;

  // Add physics body to the blast graphic
  game.physics.arcade.enable(blast);
  blast.body.immovable = true;

  spellGroup.add(blast);

  // Kill the bullets that collide with the blast
  bulletsGroup.forEachAlive(function(otherBullet) {
    if (game.physics.arcade.overlap(blast, otherBullet)) {
      otherBullet.kill();
    }
  });

  // Kill the enemies that are within the blast radius
  enemiesGroup.forEachAlive(function(otherEnemy) {
    if (game.physics.arcade.distanceBetween(blast, otherEnemy) <= blastRadius) {
      otherEnemy.kill();
      createSpellFromEnemy(otherEnemy);
    }
  });

  // Kill the bullet and the blast after a short delay
  bullet.kill();
  game.time.events.add(Phaser.Timer.SECOND * 2, function() {
    blast.kill();
  }, this);
}

function createFireBall(bullet) {
  var blastRadius = 250;
    var spellType = spellTypes[playerAffinity];
  // Create an AOE blast at the bullet's position
  var blast = game.add.graphics(bullet.x, bullet.y);
  blast.beginFill(spellType);
  blast.drawCircle(0, 0, blastRadius);
  blast.endFill();
  blast.renderable = false; // don't show the blast for player and enemies
  spellGroup.add(blast);

  // Kill the enemies that are within the blast radius
  enemiesGroup.forEachAlive(function(otherEnemy) {
    if (game.physics.arcade.distanceBetween(blast, otherEnemy) <= blastRadius) {
      otherEnemy.kill();
      createSpellFromEnemy(otherEnemy);
    }
  });

  // Kill the bullet and the blast after a short delay
  bullet.kill();
  game.time.events.add(Phaser.Timer.SECOND * 0.35, function() {
    blast.kill();
  }, this);
}

function updateEnemyMovement(dx, dy) {
  // Move the enemies with the background
  if (enemiesGroup != null && enemiesGroup.length > 0) {
    enemiesGroup.children.forEach(function(enemy) {
      enemy.body.x += dx;
      enemy.body.y += dy;

      // Check if the enemy is out of the map
      if (enemy.body.x < map.x) {
        enemy.body.x = map.x;
        enemy.body.velocity.x *= -1;
      }
      if (enemy.body.x > map.x + mapSize - enemy.width) {
        enemy.body.x = map.x + mapSize - enemy.width;
        enemy.body.velocity.x *= -1;
      }
      if (enemy.body.y < map.y) {
        enemy.body.y = map.y;
        enemy.body.velocity.y *= -1;
      }
      if (enemy.body.y > map.y + mapSize - enemy.height) {
        enemy.body.y = map.y + mapSize - enemy.height;
        enemy.body.velocity.y *= -1;
      }

      // Check if the enemy collides with the map edges
      if (enemy.body.blocked.left || enemy.body.blocked.right) {
        enemy.body.velocity.x *= -1;
      }
      if (enemy.body.blocked.up || enemy.body.blocked.down) {
        enemy.body.velocity.y *= -1;
      }
    });
  }
}

function checkPlayerEnemyCollision() {
  game.physics.arcade.overlap(player, enemiesGroup, function(player, enemy) {
    gameOver();
  });
}

function checkPlayerSpellCollision() {
  game.physics.arcade.overlap(player, spellGroup, function(player, spell) {
    playerAffinity = spell.spellName;
    // create the affinity circle on top of the player
    var affinity = game.add.graphics(0, 0);
    var spellType = spellTypes[playerAffinity];
    affinity.beginFill(spellType);
    affinity.drawCircle(0, 0, innerSpellSize);
    affinity.endFill();
    affinity.x = game.world.centerX;
    affinity.y = game.world.centerY;
    totalEnergy += 5;
    updateTotalEnergy();
    spell.kill();
  });
}

function shootCircleOfEnergy() {
  var blastRadius = 150;
  var blastCount = 10;
  var blastAngleIncrement = Math.PI * 2 / blastCount;

  for (var i = 0; i < blastCount; i++) {
  	totalEnergy -= 1;
    var blastAngle = blastAngleIncrement * i;
    var blastX = player.x + Math.cos(blastAngle) * blastRadius;
    var blastY = player.y + Math.sin(blastAngle) * blastRadius;

    var blast = game.add.graphics(blastX, blastY);
    blast.beginFill(spellTypes[playerAffinity]);
    blast.drawCircle(0, 0, 15);
    blast.endFill();
    energyGroup.add(blast);
   
  }
}

function updateScore() {
	scoreTotalText.text = "Score: " + score;
}

/////////////////////////////////////////

function gameOver() {
	if(isGameOver) return;
	isGameOver = true;
  // Show a modal with "Game Over" and a "Play Again" button
  var modal = game.add.graphics(0, 0);
  modal.beginFill(0x000000, 0.5);
  modal.drawRect(0, 0, game.width, game.height);
  modal.endFill();

  var gameOverText = game.add.text(game.world.centerX, game.world.centerY - 50, 'Game Over', {
    font: '48px Arial',
    fill: '#ffffff',
    align: 'center'
  });
  gameOverText.anchor.setTo(0.5, 0.5);


  var playAgainText = game.add.text(game.world.centerX, game.world.centerY + 50, 'Play Again', {
    font: '24px Arial',
    fill: '#ffffff',
    align: 'center'
  });
  playAgainText.anchor.setTo(0.5, 0.5);

  // Add the modal and elements to a group so they can be removed later
  var modalGroup = game.add.group();
  modalGroup.add(modal);
  modalGroup.add(gameOverText);
  modalGroup.add(playAgainText);
  
   	

  // Add a click listener to the modal to remove it and resume the game
  modal.inputEnabled = true;
  modal.events.onInputDown.add(function() {
   resetGame();
  }, this);
}

function resetGame() {
	isGameOver = false;
  // Kill all enemies
  enemiesGroup.forEach(function(enemy) {
    enemy.kill();
  });

  // Kill all bullets
  bulletsGroup.forEach(function(bullet) {
    bullet.kill();
  });

  // Reset arrays
  enemiesArray = [];
  bulletsArray = [];

  // Reset player
  player.reset(game.world.centerX, game.world.centerY);
  playerEnergy = 100;
  totalEnergy = 0;
	energyGroup.removeAll(true);
  energyCount = 0;
		playerSize = 50;
		moveSpeed = 4;
		totalEnergy = 0;
    
  // Restart game
  game.state.restart();
}

function create() {
  game.stage.backgroundColor = '#000000';

  buildMap();
  buildPlayer();
  buildEnergyGroup();
  buildBulletsGroup();
  createEnemies();
  createSpells();
  
  scoreTotalText = game.add.text(20, 20, 'Score: ' + score, {
    font: '24px Arial',
    fill: '#9400D3'
  });
  scoreTotalText.fixedToCamera = true;

  energyTotalText = game.add.text(20, 50, 'Energy: ' + totalEnergy, {
    font: '24px Arial',
    fill: '#9400D3'
  });
  energyTotalText.fixedToCamera = true;

  // Set initial player color
  player.tint = 0x0000FF;

  game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;
  game.input.keyboard.addKeyCapture([Phaser.Keyboard.LEFT, Phaser.Keyboard.RIGHT, Phaser.Keyboard.UP, Phaser.Keyboard.DOWN]);

  detectBulletFire();

  // Add a right-click event listener to the canvas
  window.addEventListener('contextmenu', function(event) {
    event.preventDefault();
  });
}

function update() {
	if(isGameOver) return;
  
	if(game) {
  	game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.scale.pageAlignHorizontally = true;
		game.scale.pageAlignVertically = true;
    game.scale.setMinMax(400, 300, 1920, 1080);
	}
  
   if (game.input.keyboard.isDown(Phaser.Keyboard.SHIFT)) {
   		if(canUseUltimate && totalEnergy >= 10) {
        canUseUltimate = false;
        isUsingUltimate = true;
        // Increase moveSpeed for 1 second
        moveSpeed = 6;
        game.time.events.add(Phaser.Timer.SECOND * ultimateTimer, function() {
          moveSpeed = 4; // Reset moveSpeed after 1 second
          isUsingUltimate = false;
        }, this);

        // Shoot 10 energy blasts in a circle from the player
        shootCircleOfEnergy();
        setTimeout(()=>{canUseUltimate = true;}, 500)
    }
  }
  
  var dx = map.x - map.previousPosition.x;
  var dy = map.y - map.previousPosition.y;

  updatePlayerMovement();
  updateEnergyMovement(dx, dy);
  checkEnergyCollisions();
  createNewEnergy();
  updateBulletMovement(dx, dy);
  checkEnemyBulletCollision();
  updateEnemyMovement(dx, dy);
  updateSpellMovement(dx, dy);
  checkPlayerEnemyCollision();
  checkPlayerSpellCollision();
}
