const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const gameOverScreen = document.getElementById('gameOverScreen');
const restartButton = document.getElementById('restartButton');

let gameRunning = false;
let obstacles = [];
let score = 0;
let rewardGiven = false;
let lastObstacleTime = 0;
let baseSpeed = 6;

// Load images
const potImg = new Image();
potImg.src = "sbgamepot.png";	

const potCrouchImg = new Image();
potCrouchImg.src = "sbgamepot-crouch.png"; 

const potDeadImg = new Image();
potDeadImg.src = "sbgamepot-dead.png";

const potJumpImg = new Image();
potJumpImg.src = "sbgamepot-jump.png"; 

const herbImg = new Image();
herbImg.src = "ARUGULA.png";

const seedImg = new Image();
seedImg.src = "SEEDS.png";

// --- Sound Effects ---
const bgMusic = new Audio("sounds/bg-music.mp3");
bgMusic.loop = true;

const jumpSound = new Audio("sounds/jump.mp3");
const crouchSound = new Audio("sounds/crouch.mp3");
const dieSound = new Audio("sounds/die.mp3");
const scoreSound = new Audio("sounds/score.mp3");
const rewardSound = new Audio("sounds/reward.mp3");

let isMuted = false;
const musicVolumeSlider = document.getElementById("musicVolume");
const sfxVolumeSlider = document.getElementById("sfxVolume");
const muteButton = document.getElementById("muteButton");

const sfxList = [jumpSound, crouchSound, dieSound, scoreSound, rewardSound];

// Volume sliders
musicVolumeSlider.addEventListener("input", () => {
  bgMusic.volume = isMuted ? 0 : parseFloat(musicVolumeSlider.value);
});

sfxVolumeSlider.addEventListener("input", () => {
  const newVolume = isMuted ? 0 : parseFloat(sfxVolumeSlider.value);
  sfxList.forEach(sfx => sfx.volume = newVolume);
});

// Mute toggle
muteButton.addEventListener("click", () => {
  isMuted = !isMuted;

  bgMusic.volume = isMuted ? 0 : parseFloat(musicVolumeSlider.value);
  sfxList.forEach(sfx => sfx.volume = isMuted ? 0 : parseFloat(sfxVolumeSlider.value));

  muteButton.textContent = isMuted ? "Unmute" : "Mute";
});


// Player (pot)
const player = {
  x: 80,
  y: 200,
  width: 120,
  height: 120,
  velocityY: 0,
  jumpPower: -15,
  gravity: 1,
  grounded: true,
  isCrouching: false,
  isDead: false,

  draw() {
    let img;
    let drawWidth = this.width;
    let drawHeight = this.height;
    let yOffset = 0;

	if (this.isDead) {
      img = potDeadImg;
      drawHeight = 185;
      drawWidth = 185;
      yOffset = this.height - 131; // align feet to ground
	} else if (!this.grounded) {
      img = potJumpImg;
      drawHeight = 160;
      drawWidth = 160;
      yOffset = this.height - 120; // align feet to ground
    } else if (this.isCrouching) {
      img = potCrouchImg;
      drawHeight = 183;
      drawWidth = 218;
      yOffset = this.height - 120; // align feet to ground
    } else {
      img = potImg;
	  drawHeight = 125;
	  drawWidth = 125;
	  yOffset = this.height - 98; // align feet to ground
    }

    ctx.drawImage(img, this.x, this.y + yOffset, drawWidth, drawHeight);
  },

  update() {
    this.velocityY += this.gravity;
    this.y += this.velocityY;

    if (this.y >= canvas.height - this.height) {
      this.y = canvas.height - this.height;
      this.velocityY = 0;
      this.grounded = true;
    }
  },

  jump() {
    if (this.grounded && !this.isCrouching) {
      this.velocityY = this.jumpPower;
      this.grounded = false;
	  
	  jumpSound.currentTime = 0;
    jumpSound.play();
    }
  },

  crouch(enable) {
    this.isCrouching = enable;
	
	if (enable) {
    crouchSound.currentTime = 0;
    crouchSound.play();
		}
	}
};

// Obstacles (herbs or seeds)
function createObstacle() {
  const type = Math.random() < 0.52 ? "herb" : "seed";
  const img = type === "herb" ? herbImg : seedImg;
  const isSeed = type === "seed";
  return {
    x: canvas.width,
    y: isSeed ? canvas.height - 138 : canvas.height - 108,
    width: 150,
    height: 150,
    speed: baseSpeed + score / 5,
    img: img
  };
}

// Handle keyboard input
document.addEventListener("keydown", (e) => {
  if (!gameRunning) return;

  if (e.code === "Space" || e.code === "ArrowUp") {
    e.preventDefault();
    player.jump();
  }

  if (e.code === "ArrowDown") {
    e.preventDefault();
    player.crouch(true);
  }
});

document.addEventListener("keyup", (e) => {
  if (!gameRunning) return;

  if (e.code === "ArrowDown") {
    player.crouch(false);
  }
});

let spawnInterval = 1000;       // Initial time between obstacles (ms)
let minSpawnInterval = 575;     // Smallest allowed interval
let spawnDecrement = 7.5;       // Decrease spawnInterval by 0.5ms per frame

function gameLoop(timestamp) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  player.update();
  player.draw();

  // Spawn new obstacles if enough time has passed
  if (timestamp - lastObstacleTime > spawnInterval) {
    obstacles.push(createObstacle());
    lastObstacleTime = timestamp;

    // Gradually decrease spawnInterval (but not below the minimum)
    if (spawnInterval > minSpawnInterval) {
      spawnInterval -= spawnDecrement;
    }
  }

  // Update and draw all obstacles
obstacles.forEach((obs, index) => {
  obs.x -= obs.speed;
  ctx.drawImage(obs.img, obs.x, obs.y, obs.width, obs.height);

  if (checkCollision(player, obs)) {
    endGame();
  }

  if (obs.x + obs.width < 0) {
    obstacles.splice(index, 1);
    score++;
    document.getElementById("score").innerText = `Score: ${score}`;

	scoreSound.currentTime = 0;
	scoreSound.play();
	
    if (score >= 50 && !rewardGiven) {
      rewardGiven = true;
      const rewardMsg = document.getElementById("rewardMessage");
      rewardMsg.style.display = "block";
	  
	  rewardSound.play();
    }
  }
}); 

	if (gameRunning) {
	requestAnimationFrame(gameLoop);
	}

}

// Score management
function getPlayerName() {
  return localStorage.getItem("playerName") || "anonymous";
}

function setPlayerName(name) {
  localStorage.setItem("playerName", name || "anonymous");
}

function getHighScore() {
  return parseInt(localStorage.getItem("highScore") || "0", 10);
}

function setHighScore(score) {
  localStorage.setItem("highScore", score);
}

function getLeaderboard() {
  const raw = localStorage.getItem("leaderboard");
  return raw ? JSON.parse(raw) : [];
}

function updateLeaderboard(newScore, name) {
  const leaderboard = getLeaderboard();
  leaderboard.push({ name: name || "anonymous", score: newScore });
  leaderboard.sort((a, b) => b.score - a.score);
  const top5 = leaderboard.slice(0, 5);
  localStorage.setItem("leaderboard", JSON.stringify(top5));
  return top5;
}

function displayLeaderboard() {
  const leaderboardList = document.getElementById("leaderboardList");
  leaderboardList.innerHTML = "";
  const leaderboard = getLeaderboard();
  leaderboard.forEach((entry, i) => {
    const name = entry.name || "anonymous";
    const score = entry.score || 0;
    const li = document.createElement("li");
    li.textContent = `#${i + 1} – ${name}: ${score}`;
    leaderboardList.appendChild(li);
  });
}


function startGame() {
  // Reset player state
   const nameInput = document.getElementById("playerNameInput");
  const name = nameInput.value.trim() || "anonymous";
  setPlayerName(name);
  player.velocityY = 0;
  player.grounded = true;
  player.isCrouching = false;
  player.isDead = false;

  // Reset game state
  obstacles = [];
  score = 0;
  lastObstacleTime = 0;
  baseSpeed = 6;
  spawnInterval = 800;
  gameRunning = true;
  // Ensure volumes are set when game starts
	bgMusic.volume = isMuted ? 0 : parseFloat(musicVolumeSlider.value);
	sfxList.forEach(sfx => sfx.volume = isMuted ? 0 : parseFloat(sfxVolumeSlider.value));
     bgMusic.currentTime = 0;
	bgMusic.play();

  document.getElementById("score").innerText = "Score: 0";
  document.getElementById("startHighScoreDisplay").textContent = `High Score: ${getHighScore()}`;

  // Properly hide start screen and game over screen
  document.getElementById("startScreen").classList.remove("active");
  document.getElementById("gameOverScreen").classList.remove("active");
  document.getElementById("rewardMessage").style.display = "none";

  // Show hints
  const jumpHint = document.getElementById("jumpHint");
  const crouchHint = document.getElementById("crouchHint");

  [jumpHint, crouchHint].forEach((el) => {
    el.style.display = "block";
    el.style.opacity = 1;
  });

  setTimeout(() => {
    [jumpHint, crouchHint].forEach((el) => {
      el.style.opacity = 0;
      setTimeout(() => (el.style.display = "none"), 500);
    });
  }, 3000);

  requestAnimationFrame(gameLoop);
}

function endGame() {
  gameRunning = false;
  player.isDead = true;
  bgMusic.pause();
  dieSound.play();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  player.draw();

  // Show Game Over screen
  gameOverScreen.classList.add('active');

  // Update high score
  const highScore = getHighScore();
  if (score > highScore) {
    setHighScore(score);
  }

  // Save and show scores
  localStorage.setItem("lastScore", score);
  document.getElementById("finalScoreDisplay").textContent = `Your Score: ${score}`;
  document.getElementById("highScoreDisplay").textContent = `High Score: ${getHighScore()}`;

  // Update leaderboard
	const playerName = document.getElementById("playerNameInput").value || "anonymous";
	updateLeaderboard(playerName, score);
	displayLeaderboard();  // Optional, but helpful

  
 if (rewardGiven) {
    document.getElementById("rewardMessage").style.display = "block";
  }
}


function checkCollision(pot, obs) {
  const buffer = 45;
  const isSeed = obs.img === seedImg;

  let topBuffer = buffer;
  let bottom = pot.y + pot.height;

  // Decrease hitbox height while jumping
  if (!pot.grounded) {
    topBuffer = 50; // more buffer from the top
    bottom = pot.y + pot.height - 40; // cut some from the bottom too
  } else if (pot.isCrouching && isSeed) {
    bottom = pot.y + pot.height / 5;
  }

  const potBox = {
    left: pot.x + buffer,
    right: pot.x + pot.width - buffer,
    top: pot.y + topBuffer,
    bottom: bottom - buffer
  };

  const obsBox = {
    left: obs.x + buffer,
    right: obs.x + obs.width - buffer,
    top: obs.y + buffer,
    bottom: obs.y + obs.height - buffer
  };

  return !(
    potBox.right < obsBox.left ||
    potBox.left > obsBox.right ||
    potBox.bottom < obsBox.top ||
    potBox.top > obsBox.bottom
  );
}

document.getElementById("startHighScoreDisplay").textContent = `High Score: ${getHighScore()}`;
document.getElementById("startButton").addEventListener("click", startGame);
document.getElementById("restartButton").addEventListener("click", startGame);
window.addEventListener("load", () => {
  const savedName = getPlayerName();
  document.getElementById("playerNameInput").value = savedName;
});