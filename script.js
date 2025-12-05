// ============================================
// HYDRA RACING - Complete Game Engine v2.0
// ============================================

// Game Configuration
const CONFIG = {
  // Lanes
  lanes: 5,
  laneWidth: 0,
  
  // Player
  playerWidth: 40,
  playerHeight: 75,
  playerSpeed: 8,
  
  // Enemies
  enemyWidth: 40,
  enemyHeight: 75,
  initialEnemySpeed: 4,
  maxEnemySpeed: 12,
  enemySpawnRate: 1500,
  minEnemySpawnRate: 600,
  
  // Coins
  coinSize: 30,
  coinValue: 10,
  coinSpawnRate: 2000,
  
  // Power-ups
  powerUpSize: 40,
  powerUpSpawnRate: 8000,
  shieldDuration: 5000,
  magnetDuration: 7000,
  slowMoDuration: 5000,
  doublePointsDuration: 10000,
  
  // Game
  speedIncreaseRate: 0.0005,
  comboTimeout: 2000,
  difficultyIncreaseInterval: 5000,
  
  // Visual
  roadMarkingSpeed: 5,
  starCount: 50,
};

// Game State
const gameState = {
  isPlaying: false,
  isPaused: false,
  isGameOver: false,
  score: 0,
  topScore: parseInt(localStorage.getItem('hydraTopScore')) || 0,
  coins: parseInt(localStorage.getItem('hydraCoins')) || 0,
  totalCoins: parseInt(localStorage.getItem('hydraTotalCoins')) || 0,
  distance: 0,
  dodgedCars: 0,
  combo: 0,
  lastDodgeTime: 0,
  currentSpeed: 1,
  difficultyLevel: 1,
  
  // Power-up states
  hasShield: false,
  hasMagnet: false,
  hasSlowMo: false,
  hasDoublePoints: false,
  activePowerUp: null,
  powerUpEndTime: 0,
};

// Game Objects
let player = null;
let enemies = [];
let coins = [];
let powerUps = [];
let particles = [];
let roadMarkings = [];
let stars = [];

// Timers
let enemySpawnTimer = null;
let coinSpawnTimer = null;
let powerUpSpawnTimer = null;
let gameLoop = null;
let countdownInterval = null;

// Canvas & Context
let canvas, ctx;
let canvasWidth, canvasHeight;

// Sound System
const sounds = {
  enabled: true,
  coin: null,
  crash: null,
  powerUp: null,
  dodge: null,
  engine: null,
};

// Input State
const inputState = {
  left: false,
  right: false,
  targetLane: 1,
};

// Car designs (emoji-based for simplicity, could be replaced with sprites)
const carColors = ['#ff4757', '#2ed573', '#1e90ff', '#ffa502', '#a55eea', '#ff6b81', '#00d2d3', '#ff9ff3'];
const playerCarColor = '#00d2d3';

// Power-up types
const POWER_UP_TYPES = {
  SHIELD: { icon: '🛡️', color: 'rgba(100, 255, 200, 0.8)', name: 'Shield' },
  MAGNET: { icon: '🧲', color: 'rgba(255, 100, 200, 0.8)', name: 'Magnet' },
  SLOW_MO: { icon: '⏱️', color: 'rgba(100, 200, 255, 0.8)', name: 'Slow Mo' },
  DOUBLE_POINTS: { icon: '✨', color: 'rgba(255, 215, 0, 0.8)', name: '2x Points' },
};

// ============================================
// INITIALIZATION
// ============================================

function init() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  initSounds();
  initStars();
  initRoadMarkings();
  initPlayer();
  setupEventListeners();
  updateUI();
  
  // Start render loop (always running for background effects)
  requestAnimationFrame(render);
}

function resizeCanvas() {
  const container = document.querySelector('.game-container');
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  canvasWidth = canvas.width;
  canvasHeight = canvas.height;
  
  CONFIG.laneWidth = canvasWidth / CONFIG.lanes;
  
  // Reinitialize road markings on resize
  initRoadMarkings();
  
  // Reinitialize road texture
  initRoadTexture();
  
  // Update player position if exists
  if (player) {
    player.x = getLaneX(inputState.targetLane);
  }
}

function initSounds() {
  // Create audio context for sound effects
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    sounds.context = new AudioContext();
  } catch (e) {
    console.log('Web Audio API not supported');
    sounds.enabled = false;
  }
}

function initStars() {
  stars = [];
  for (let i = 0; i < CONFIG.starCount; i++) {
    stars.push({
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.5 + 0.2,
      opacity: Math.random() * 0.5 + 0.3,
    });
  }
}

function initRoadMarkings() {
  roadMarkings = [];
  const markingHeight = 50;
  const gap = 60;
  const totalHeight = markingHeight + gap;
  
  for (let lane = 1; lane < CONFIG.lanes; lane++) {
    const x = lane * CONFIG.laneWidth;
    for (let y = -totalHeight; y < canvasHeight + totalHeight; y += totalHeight) {
      roadMarkings.push({ x, y, lane });
    }
  }
}

function initPlayer() {
  inputState.targetLane = 2; // Start in middle lane (0-4)
  player = {
    x: getLaneX(1),
    y: canvasHeight - 150,
    width: CONFIG.playerWidth,
    height: CONFIG.playerHeight,
    lane: 1,
    color: playerCarColor,
  };
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Control buttons
  const leftBtn = document.getElementById('leftBtn');
  const rightBtn = document.getElementById('rightBtn');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const restartBtn = document.getElementById('restartBtn');
  const resetTopScoreBtn = document.getElementById('resetTopScoreBtn');
  const soundBtn = document.getElementById('soundBtn');
  
  // Touch/Click events for movement
  leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); moveLeft(); });
  leftBtn.addEventListener('mousedown', moveLeft);
  
  rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); moveRight(); });
  rightBtn.addEventListener('mousedown', moveRight);
  
  playPauseBtn.addEventListener('click', togglePlayPause);
  playPauseBtn.addEventListener('touchstart', (e) => { e.preventDefault(); togglePlayPause(); });
  
  restartBtn.addEventListener('click', restartGame);
  resetTopScoreBtn.addEventListener('click', resetTopScore);
  soundBtn.addEventListener('click', toggleSound);
  
  // Keyboard controls
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  
  // Swipe controls for mobile
  let touchStartX = 0;
  let touchStartY = 0;
  
  canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  
  canvas.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 30) {
      if (diffX > 0) {
        moveRight();
      } else {
        moveLeft();
      }
    }
  }, { passive: true });
  
  // Prevent context menu on long press
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

function handleKeyDown(e) {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    moveLeft();
  } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    moveRight();
  } else if (e.key === ' ' || e.key === 'Escape') {
    e.preventDefault();
    togglePlayPause();
  }
}

function handleKeyUp(e) {
  // Can be used for continuous movement if needed
}

// ============================================
// GAME CONTROLS
// ============================================

function moveLeft() {
  if (!gameState.isPlaying || gameState.isPaused) return;
  if (inputState.targetLane > 0) {
    inputState.targetLane--;
    playSound('whoosh');
  }
}

function moveRight() {
  if (!gameState.isPlaying || gameState.isPaused) return;
  if (inputState.targetLane < CONFIG.lanes - 1) {
    inputState.targetLane++;
    playSound('whoosh');
  }
}

function togglePlayPause() {
  if (gameState.isGameOver) {
    restartGame();
    return;
  }
  
  if (!gameState.isPlaying) {
    startGame();
  } else {
    if (gameState.isPaused) {
      resumeGame();
    } else {
      pauseGame();
    }
  }
}

function startGame() {
  showCountdown(() => {
    gameState.isPlaying = true;
    gameState.isPaused = false;
    gameState.isGameOver = false;
    
    updatePlayPauseButton();
    startSpawners();
    playSound('start');
  });
}

function showCountdown(callback) {
  const overlay = document.getElementById('countdownOverlay');
  const numberEl = document.getElementById('countdownNumber');
  let count = 3;
  
  overlay.classList.add('active');
  numberEl.textContent = count;
  
  countdownInterval = setInterval(() => {
    count--;
    if (count > 0) {
      numberEl.textContent = count;
      numberEl.style.animation = 'none';
      numberEl.offsetHeight; // Trigger reflow
      numberEl.style.animation = 'countdownPop 1s ease-out';
      playSound('beep');
    } else {
      clearInterval(countdownInterval);
      overlay.classList.remove('active');
      playSound('start');
      callback();
    }
  }, 1000);
}

function pauseGame() {
  gameState.isPaused = true;
  document.getElementById('pauseOverlay').classList.add('active');
  updatePlayPauseButton();
  stopSpawners();
}

function resumeGame() {
  gameState.isPaused = false;
  document.getElementById('pauseOverlay').classList.remove('active');
  updatePlayPauseButton();
  startSpawners();
}

function gameOver() {
  gameState.isPlaying = false;
  gameState.isGameOver = true;
  stopSpawners();
  
  // Update high score
  const isNewRecord = gameState.score > gameState.topScore;
  if (isNewRecord) {
    gameState.topScore = gameState.score;
    localStorage.setItem('hydraTopScore', gameState.topScore);
  }
  
  // Save total coins
  gameState.totalCoins += gameState.coins;
  localStorage.setItem('hydraTotalCoins', gameState.totalCoins);
  
  // Update game over screen
  document.getElementById('finalScore').textContent = gameState.score;
  document.getElementById('finalCoins').textContent = gameState.coins;
  document.getElementById('finalDistance').textContent = Math.floor(gameState.distance) + 'm';
  
  const newRecordEl = document.getElementById('newRecord');
  if (isNewRecord) {
    newRecordEl.classList.add('active');
  } else {
    newRecordEl.classList.remove('active');
  }
  
  document.getElementById('gameOverScreen').style.display = 'flex';
  updatePlayPauseButton();
  
  // Create explosion particles
  createExplosion(player.x + player.width / 2, player.y + player.height / 2);
  
  playSound('crash');
  
  // Vibrate on mobile
  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 100, 50, 200]);
  }
}

function restartGame() {
  // Reset game state
  gameState.score = 0;
  gameState.coins = 0;
  gameState.distance = 0;
  gameState.dodgedCars = 0;
  gameState.combo = 0;
  gameState.currentSpeed = 1;
  gameState.difficultyLevel = 1;
  gameState.isGameOver = false;
  gameState.isPlaying = false;
  gameState.isPaused = false;
  
  // Reset power-ups
  gameState.hasShield = false;
  gameState.hasMagnet = false;
  gameState.hasSlowMo = false;
  gameState.hasDoublePoints = false;
  gameState.activePowerUp = null;
  
  // Clear objects
  enemies = [];
  coins = [];
  powerUps = [];
  particles = [];
  
  // Reset player
  initPlayer();
  
  // Hide overlays
  document.getElementById('gameOverScreen').style.display = 'none';
  document.getElementById('pauseOverlay').classList.remove('active');
  document.getElementById('powerupIndicator').classList.remove('active');
  document.getElementById('comboDisplay').classList.remove('active');
  
  updateUI();
  startGame();
}

function resetTopScore() {
  gameState.topScore = 0;
  localStorage.setItem('hydraTopScore', 0);
  updateUI();
  showToast('🗑️ High score reset!', 'warning');
}

// ============================================
// SPAWNERS
// ============================================

function startSpawners() {
  stopSpawners(); // Clear any existing
  
  const spawnRate = Math.max(CONFIG.minEnemySpawnRate, 
    CONFIG.enemySpawnRate - (gameState.difficultyLevel * 100));
  
  enemySpawnTimer = setInterval(spawnEnemy, spawnRate);
  coinSpawnTimer = setInterval(spawnCoin, CONFIG.coinSpawnRate);
  powerUpSpawnTimer = setInterval(spawnPowerUp, CONFIG.powerUpSpawnRate);
}

function stopSpawners() {
  if (enemySpawnTimer) clearInterval(enemySpawnTimer);
  if (coinSpawnTimer) clearInterval(coinSpawnTimer);
  if (powerUpSpawnTimer) clearInterval(powerUpSpawnTimer);
}

function spawnEnemy() {
  if (!gameState.isPlaying || gameState.isPaused) return;
  
  const lane = Math.floor(Math.random() * CONFIG.lanes);
  const color = carColors[Math.floor(Math.random() * carColors.length)];
  
  // Check if lane is clear enough
  const minDistance = CONFIG.enemyHeight * 2;
  const canSpawn = !enemies.some(e => e.lane === lane && e.y < minDistance);
  
  if (canSpawn) {
    enemies.push({
      x: getLaneX(lane),
      y: -CONFIG.enemyHeight,
      width: CONFIG.enemyWidth,
      height: CONFIG.enemyHeight,
      lane: lane,
      color: color,
      speed: CONFIG.initialEnemySpeed + (gameState.difficultyLevel * 0.5),
      passed: false,
    });
  }
}

function spawnCoin() {
  if (!gameState.isPlaying || gameState.isPaused) return;
  
  const lane = Math.floor(Math.random() * CONFIG.lanes);
  
  // Don't spawn on top of enemies
  const isSafe = !enemies.some(e => e.lane === lane && e.y < CONFIG.coinSize * 3);
  
  if (isSafe) {
    coins.push({
      x: getLaneX(lane),
      y: -CONFIG.coinSize,
      size: CONFIG.coinSize,
      lane: lane,
      rotation: 0,
      collected: false,
    });
  }
}

function spawnPowerUp() {
  if (!gameState.isPlaying || gameState.isPaused) return;
  
  // Random chance to spawn
  if (Math.random() > 0.5) return;
  
  const lane = Math.floor(Math.random() * CONFIG.lanes);
  const types = Object.keys(POWER_UP_TYPES);
  const type = types[Math.floor(Math.random() * types.length)];
  
  powerUps.push({
    x: getLaneX(lane),
    y: -CONFIG.powerUpSize,
    size: CONFIG.powerUpSize,
    lane: lane,
    type: type,
    rotation: 0,
    pulse: 0,
  });
}

// ============================================
// GAME LOGIC
// ============================================

function update() {
  if (!gameState.isPlaying || gameState.isPaused) return;
  
  const deltaSpeed = gameState.hasSlowMo ? 0.5 : 1;
  
  // Update speed and difficulty
  gameState.currentSpeed += CONFIG.speedIncreaseRate;
  gameState.distance += gameState.currentSpeed * deltaSpeed;
  
  // Increase difficulty over time
  if (gameState.distance % CONFIG.difficultyIncreaseInterval < 10) {
    gameState.difficultyLevel = Math.floor(gameState.distance / CONFIG.difficultyIncreaseInterval) + 1;
  }
  
  // Update player position (smooth lane transition)
  const targetX = getLaneX(inputState.targetLane);
  const dx = targetX - player.x;
  player.x += dx * 0.15;
  player.lane = inputState.targetLane;
  
  // Update road markings
  updateRoadMarkings(deltaSpeed);
  
  // Update stars
  updateStars();
  
  // Update enemies
  updateEnemies(deltaSpeed);
  
  // Update coins
  updateCoins(deltaSpeed);
  
  // Update power-ups
  updatePowerUps(deltaSpeed);
  
  // Update particles
  updateParticles();
  
  // Update power-up timers
  updatePowerUpTimers();
  
  // Update combo
  updateCombo();
  
  // Update score
  gameState.score += Math.floor(gameState.currentSpeed * deltaSpeed);
  
  // Update UI
  updateUI();
}

function updateRoadMarkings(deltaSpeed) {
  const speed = CONFIG.roadMarkingSpeed * gameState.currentSpeed * deltaSpeed;
  
  roadMarkings.forEach(marking => {
    marking.y += speed;
    if (marking.y > canvasHeight + 50) {
      marking.y = -50;
    }
  });
}

function updateStars() {
  stars.forEach(star => {
    star.y += star.speed * gameState.currentSpeed;
    if (star.y > canvasHeight) {
      star.y = 0;
      star.x = Math.random() * canvasWidth;
    }
    star.opacity = 0.3 + Math.sin(Date.now() * 0.001 + star.x) * 0.2;
  });
}

function updateEnemies(deltaSpeed) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    enemy.y += enemy.speed * gameState.currentSpeed * deltaSpeed;
    
    // Check collision
    if (!gameState.hasShield && checkCollision(player, enemy)) {
      gameOver();
      return;
    }
    
    // Check if passed player (for dodging score)
    if (!enemy.passed && enemy.y > player.y + player.height) {
      enemy.passed = true;
      gameState.dodgedCars++;
      handleDodge();
    }
    
    // Remove off-screen enemies
    if (enemy.y > canvasHeight + enemy.height) {
      enemies.splice(i, 1);
    }
  }
}

function updateCoins(deltaSpeed) {
  const magnetRange = gameState.hasMagnet ? 150 : 0;
  
  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i];
    coin.y += CONFIG.roadMarkingSpeed * gameState.currentSpeed * deltaSpeed;
    coin.rotation += 0.1;
    
    // Magnet effect
    if (gameState.hasMagnet) {
      const dx = player.x - coin.x;
      const dy = player.y - coin.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < magnetRange) {
        coin.x += dx * 0.1;
        coin.y += dy * 0.1;
      }
    }
    
    // Check collection
    if (checkCoinCollision(player, coin)) {
      collectCoin(coin);
      coins.splice(i, 1);
      continue;
    }
    
    // Remove off-screen coins
    if (coin.y > canvasHeight + coin.size) {
      coins.splice(i, 1);
    }
  }
}

function updatePowerUps(deltaSpeed) {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const powerUp = powerUps[i];
    powerUp.y += CONFIG.roadMarkingSpeed * gameState.currentSpeed * deltaSpeed;
    powerUp.rotation += 0.02;
    powerUp.pulse = Math.sin(Date.now() * 0.005) * 0.2 + 1;
    
    // Check collection
    if (checkPowerUpCollision(player, powerUp)) {
      collectPowerUp(powerUp);
      powerUps.splice(i, 1);
      continue;
    }
    
    // Remove off-screen power-ups
    if (powerUp.y > canvasHeight + powerUp.size) {
      powerUps.splice(i, 1);
    }
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.2; // gravity
    p.life -= 0.02;
    p.size *= 0.98;
    
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function updatePowerUpTimers() {
  if (gameState.activePowerUp && Date.now() > gameState.powerUpEndTime) {
    deactivatePowerUp();
  }
  
  // Update power-up indicator
  if (gameState.activePowerUp) {
    const remaining = Math.ceil((gameState.powerUpEndTime - Date.now()) / 1000);
    document.getElementById('powerupTimer').textContent = remaining + 's';
  }
}

function updateCombo() {
  const now = Date.now();
  if (gameState.combo > 0 && now - gameState.lastDodgeTime > CONFIG.comboTimeout) {
    gameState.combo = 0;
    document.getElementById('comboDisplay').classList.remove('active');
  }
}

// ============================================
// COLLISIONS
// ============================================

function checkCollision(a, b) {
  const padding = 10; // Add some forgiveness
  return (
    a.x < b.x + b.width - padding &&
    a.x + a.width > b.x + padding &&
    a.y < b.y + b.height - padding &&
    a.y + a.height > b.y + padding
  );
}

function checkCoinCollision(player, coin) {
  const centerX = coin.x + coin.size / 2;
  const centerY = coin.y + coin.size / 2;
  
  const closestX = Math.max(player.x, Math.min(centerX, player.x + player.width));
  const closestY = Math.max(player.y, Math.min(centerY, player.y + player.height));
  
  const dx = centerX - closestX;
  const dy = centerY - closestY;
  
  return (dx * dx + dy * dy) < (coin.size / 2) * (coin.size / 2);
}

function checkPowerUpCollision(player, powerUp) {
  const centerX = powerUp.x + powerUp.size / 2;
  const centerY = powerUp.y + powerUp.size / 2;
  
  const closestX = Math.max(player.x, Math.min(centerX, player.x + player.width));
  const closestY = Math.max(player.y, Math.min(centerY, player.y + player.height));
  
  const dx = centerX - closestX;
  const dy = centerY - closestY;
  
  return (dx * dx + dy * dy) < (powerUp.size / 2) * (powerUp.size / 2);
}

// ============================================
// COLLECTION & SCORING
// ============================================

function collectCoin(coin) {
  const value = gameState.hasDoublePoints ? CONFIG.coinValue * 2 : CONFIG.coinValue;
  gameState.coins += value;
  gameState.score += value * 10;
  
  createCoinParticles(coin.x + coin.size / 2, coin.y + coin.size / 2);
  playSound('coin');
}

function collectPowerUp(powerUp) {
  const type = powerUp.type;
  const powerUpInfo = POWER_UP_TYPES[type];
  
  // Deactivate current power-up if any
  if (gameState.activePowerUp) {
    deactivatePowerUp();
  }
  
  gameState.activePowerUp = type;
  
  switch (type) {
    case 'SHIELD':
      gameState.hasShield = true;
      gameState.powerUpEndTime = Date.now() + CONFIG.shieldDuration;
      break;
    case 'MAGNET':
      gameState.hasMagnet = true;
      gameState.powerUpEndTime = Date.now() + CONFIG.magnetDuration;
      break;
    case 'SLOW_MO':
      gameState.hasSlowMo = true;
      gameState.powerUpEndTime = Date.now() + CONFIG.slowMoDuration;
      break;
    case 'DOUBLE_POINTS':
      gameState.hasDoublePoints = true;
      gameState.powerUpEndTime = Date.now() + CONFIG.doublePointsDuration;
      break;
  }
  
  // Show power-up indicator
  const indicator = document.getElementById('powerupIndicator');
  document.getElementById('powerupIcon').textContent = powerUpInfo.icon;
  document.getElementById('powerupText').textContent = powerUpInfo.name;
  indicator.classList.add('active');
  
  createPowerUpParticles(powerUp.x + powerUp.size / 2, powerUp.y + powerUp.size / 2, powerUpInfo.color);
  showToast(`${powerUpInfo.icon} ${powerUpInfo.name} Active!`);
  playSound('powerup');
}

function deactivatePowerUp() {
  gameState.hasShield = false;
  gameState.hasMagnet = false;
  gameState.hasSlowMo = false;
  gameState.hasDoublePoints = false;
  gameState.activePowerUp = null;
  
  document.getElementById('powerupIndicator').classList.remove('active');
}

function handleDodge() {
  const now = Date.now();
  
  // Check for combo
  if (now - gameState.lastDodgeTime < CONFIG.comboTimeout) {
    gameState.combo++;
  } else {
    gameState.combo = 1;
  }
  
  gameState.lastDodgeTime = now;
  
  // Bonus points for combo
  const comboBonus = gameState.combo * 50;
  const doubleMultiplier = gameState.hasDoublePoints ? 2 : 1;
  gameState.score += comboBonus * doubleMultiplier;
  
  // Update combo display
  if (gameState.combo >= 2) {
    const comboDisplay = document.getElementById('comboDisplay');
    document.getElementById('comboCount').textContent = gameState.combo;
    comboDisplay.classList.add('active');
  }
  
  if (gameState.combo >= 3) {
    playSound('combo');
  }
}

// ============================================
// PARTICLES
// ============================================

function createCoinParticles(x, y) {
  for (let i = 0; i < 10; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8 - 3,
      size: Math.random() * 6 + 3,
      color: '#ffd700',
      life: 1,
    });
  }
}

function createPowerUpParticles(x, y, color) {
  for (let i = 0; i < 20; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12,
      size: Math.random() * 10 + 5,
      color: color,
      life: 1,
    });
  }
}

function createExplosion(x, y) {
  for (let i = 0; i < 40; i++) {
    const angle = (Math.PI * 2 / 40) * i;
    const speed = Math.random() * 10 + 5;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 15 + 5,
      color: `hsl(${Math.random() * 60 + 10}, 100%, 50%)`,
      life: 1,
    });
  }
}

// ============================================
// RENDERING
// ============================================

function render() {
  // Clear canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  
  // Draw background gradient (road)
  drawRoad();
  
  // Draw stars (background)
  drawStars();
  
  // Draw road markings
  drawRoadMarkings();
  
  // Draw game objects
  if (gameState.isPlaying || gameState.isGameOver) {
    // Draw coins
    coins.forEach(coin => drawCoin(coin));
    
    // Draw power-ups
    powerUps.forEach(powerUp => drawPowerUp(powerUp));
    
    // Draw enemies
    enemies.forEach(enemy => drawCar(enemy, enemy.color));
    
    // Draw player
    if (player) {
      drawPlayer();
    }
    
    // Draw particles
    drawParticles();
  }
  
  // Update game logic
  update();
  
  // Continue render loop
  requestAnimationFrame(render);
}

// Road texture variables (declared before use)
let roadTextureOffset = 0;
let textureParticles = [];
let roadCracks = [];

function initRoadTexture() {
  textureParticles = [];
  roadCracks = [];
  
  // Create asphalt grain particles (more particles for better texture)
  for (let i = 0; i < 400; i++) {
    textureParticles.push({
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight,
      size: Math.random() * 2 + 0.3,
      opacity: Math.random() * 0.12 + 0.03,
      type: Math.random() > 0.7 ? 'light' : 'dark'
    });
  }
  
  // Create random crack lines
  for (let i = 0; i < 8; i++) {
    roadCracks.push({
      x: Math.random() * canvasWidth * 0.8 + canvasWidth * 0.1,
      y: Math.random() * canvasHeight,
      length: Math.random() * 40 + 20,
      angle: Math.random() * Math.PI - Math.PI / 2,
      width: Math.random() * 1.5 + 0.5
    });
  }
}

function drawRoad() {
  // Dark asphalt base gradient
  const gradient = ctx.createLinearGradient(0, 0, canvasWidth, 0);
  gradient.addColorStop(0, 'rgba(20, 20, 28, 0.98)');
  gradient.addColorStop(0.15, 'rgba(32, 32, 40, 0.95)');
  gradient.addColorStop(0.5, 'rgba(40, 40, 48, 0.92)');
  gradient.addColorStop(0.85, 'rgba(32, 32, 40, 0.95)');
  gradient.addColorStop(1, 'rgba(20, 20, 28, 0.98)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // Asphalt texture - random speckles
  drawAsphaltTexture();
  
  // Road shoulder/curb on left
  const shoulderGradientLeft = ctx.createLinearGradient(0, 0, 20, 0);
  shoulderGradientLeft.addColorStop(0, 'rgba(60, 60, 65, 0.9)');
  shoulderGradientLeft.addColorStop(0.5, 'rgba(45, 45, 50, 0.7)');
  shoulderGradientLeft.addColorStop(1, 'rgba(30, 30, 35, 0.3)');
  ctx.fillStyle = shoulderGradientLeft;
  ctx.fillRect(0, 0, 20, canvasHeight);
  
  // Road shoulder/curb on right
  const shoulderGradientRight = ctx.createLinearGradient(canvasWidth - 20, 0, canvasWidth, 0);
  shoulderGradientRight.addColorStop(0, 'rgba(30, 30, 35, 0.3)');
  shoulderGradientRight.addColorStop(0.5, 'rgba(45, 45, 50, 0.7)');
  shoulderGradientRight.addColorStop(1, 'rgba(60, 60, 65, 0.9)');
  ctx.fillStyle = shoulderGradientRight;
  ctx.fillRect(canvasWidth - 20, 0, 20, canvasHeight);
  
  // Road edge lines (solid white)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 3;
  
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.lineTo(22, canvasHeight);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(canvasWidth - 22, 0);
  ctx.lineTo(canvasWidth - 22, canvasHeight);
  ctx.stroke();
}

function drawAsphaltTexture() {
  // Update texture offset for scrolling effect
  const speedMultiplier = gameState.hasSlowMo ? 0.5 : 1;
  const currentSpeed = gameState.isPlaying ? gameState.currentSpeed : 0.5;
  roadTextureOffset += CONFIG.roadMarkingSpeed * currentSpeed * speedMultiplier;
  if (roadTextureOffset > canvasHeight) roadTextureOffset = 0;
  
  // Initialize particles if needed
  if (textureParticles.length === 0) initRoadTexture();
  
  // Draw asphalt grain texture
  textureParticles.forEach(p => {
    const y = (p.y + roadTextureOffset) % canvasHeight;
    
    if (p.type === 'light') {
      ctx.fillStyle = `rgba(70, 70, 80, ${p.opacity})`;
    } else {
      ctx.fillStyle = `rgba(15, 15, 20, ${p.opacity * 1.5})`;
    }
    ctx.fillRect(p.x, y, p.size, p.size);
  });
  
  // Draw subtle road cracks
  ctx.strokeStyle = 'rgba(20, 20, 25, 0.4)';
  ctx.lineWidth = 1;
  
  roadCracks.forEach(crack => {
    const y = (crack.y + roadTextureOffset * 0.5) % canvasHeight;
    ctx.save();
    ctx.translate(crack.x, y);
    ctx.rotate(crack.angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(crack.length, 0);
    ctx.lineWidth = crack.width;
    ctx.stroke();
    ctx.restore();
  });
  
  // Draw subtle tire wear marks in center of lanes (very subtle)
  ctx.globalAlpha = 0.08;
  for (let lane = 0; lane < CONFIG.lanes; lane++) {
    const laneCenter = lane * CONFIG.laneWidth + CONFIG.laneWidth / 2;
    const trackOffset = CONFIG.playerWidth / 3;
    
    // Subtle darker tire tracks
    ctx.fillStyle = 'rgba(10, 10, 15, 1)';
    ctx.fillRect(laneCenter - trackOffset - 3, 0, 6, canvasHeight);
    ctx.fillRect(laneCenter + trackOffset - 3, 0, 6, canvasHeight);
  }
  ctx.globalAlpha = 1.0;
}

function drawStars() {
  stars.forEach(star => {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
    ctx.fill();
  });
}

function drawRoadMarkings() {
  // Draw dashed lane dividers
  roadMarkings.forEach(marking => {
    // White dashed lane markings
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
    ctx.shadowBlur = 3;
    
    // Draw rounded rectangle for each marking
    const markingWidth = 4;
    const markingHeight = 40;
    ctx.beginPath();
    ctx.roundRect(marking.x - markingWidth/2, marking.y, markingWidth, markingHeight, 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
  });
}

function drawCar(car, color) {
  const x = car.x;
  const y = car.y;
  const w = car.width;
  const h = car.height;
  
  ctx.save();
  
  // Car shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2 + 5, y + h - 5, w / 2 - 5, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Car body
  const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.5, shadeColor(color, -20));
  gradient.addColorStop(1, shadeColor(color, -40));
  ctx.fillStyle = gradient;
  
  // Main body
  ctx.beginPath();
  ctx.roundRect(x + 5, y + 15, w - 10, h - 30, 8);
  ctx.fill();
  
  // Roof
  ctx.fillStyle = shadeColor(color, 20);
  ctx.beginPath();
  ctx.roundRect(x + 10, y + 25, w - 20, h / 2.5, 6);
  ctx.fill();
  
  // Windshield
  ctx.fillStyle = 'rgba(100, 200, 255, 0.6)';
  ctx.beginPath();
  ctx.roundRect(x + 12, y + 28, w - 24, h / 4, 4);
  ctx.fill();
  
  // Rear window
  ctx.beginPath();
  ctx.roundRect(x + 12, y + h / 2 - 5, w - 24, h / 5, 4);
  ctx.fill();
  
  // Headlights
  ctx.fillStyle = 'rgba(255, 255, 200, 0.9)';
  ctx.beginPath();
  ctx.roundRect(x + 10, y + h - 18, 8, 6, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x + w - 18, y + h - 18, 8, 6, 2);
  ctx.fill();
  
  // Taillights (for enemy cars)
  ctx.fillStyle = 'rgba(255, 50, 50, 0.8)';
  ctx.beginPath();
  ctx.roundRect(x + 10, y + 17, 8, 6, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x + w - 18, y + 17, 8, 6, 2);
  ctx.fill();
  
  ctx.restore();
}

function drawPlayer() {
  const x = player.x;
  const y = player.y;
  const w = player.width;
  const h = player.height;
  const color = player.color;
  
  ctx.save();
  
  // Shield effect
  if (gameState.hasShield) {
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, w * 0.8, 0, Math.PI * 2);
    const shieldGradient = ctx.createRadialGradient(
      x + w / 2, y + h / 2, 0,
      x + w / 2, y + h / 2, w * 0.8
    );
    shieldGradient.addColorStop(0, 'rgba(100, 255, 200, 0.1)');
    shieldGradient.addColorStop(0.7, 'rgba(100, 255, 200, 0.2)');
    shieldGradient.addColorStop(1, 'rgba(100, 255, 200, 0.4)');
    ctx.fillStyle = shieldGradient;
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(100, 255, 200, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  // Car shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2 + 5, y + h - 5, w / 2 - 5, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Car body gradient
  const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.5, shadeColor(color, -20));
  gradient.addColorStop(1, shadeColor(color, -40));
  ctx.fillStyle = gradient;
  
  // Main body
  ctx.beginPath();
  ctx.roundRect(x + 5, y + 15, w - 10, h - 30, 8);
  ctx.fill();
  
  // Roof
  ctx.fillStyle = shadeColor(color, 20);
  ctx.beginPath();
  ctx.roundRect(x + 10, y + 25, w - 20, h / 2.5, 6);
  ctx.fill();
  
  // Windshield
  ctx.fillStyle = 'rgba(100, 200, 255, 0.6)';
  ctx.beginPath();
  ctx.roundRect(x + 12, y + h / 2 - 5, w - 24, h / 5, 4);
  ctx.fill();
  
  // Front window
  ctx.beginPath();
  ctx.roundRect(x + 12, y + 28, w - 24, h / 4, 4);
  ctx.fill();
  
  // Headlights (bright for player - facing forward)
  ctx.fillStyle = 'rgba(255, 255, 200, 0.9)';
  ctx.beginPath();
  ctx.roundRect(x + 10, y + 17, 8, 6, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x + w - 18, y + 17, 8, 6, 2);
  ctx.fill();
  
  // Headlight glow
  ctx.fillStyle = 'rgba(255, 255, 200, 0.2)';
  ctx.beginPath();
  ctx.ellipse(x + 14, y + 10, 10, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + w - 14, y + 10, 10, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Taillights (red)
  ctx.fillStyle = 'rgba(255, 50, 50, 0.8)';
  ctx.beginPath();
  ctx.roundRect(x + 10, y + h - 18, 8, 6, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x + w - 18, y + h - 18, 8, 6, 2);
  ctx.fill();
  
  // Racing stripe
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillRect(x + w / 2 - 3, y + 15, 6, h - 30);
  
  ctx.restore();
}

function drawCoin(coin) {
  ctx.save();
  ctx.translate(coin.x + coin.size / 2, coin.y + coin.size / 2);
  
  // Simulate 3D rotation
  const scaleX = Math.abs(Math.cos(coin.rotation));
  ctx.scale(scaleX, 1);
  
  // Coin glow
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 15;
  
  // Coin body
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, coin.size / 2);
  gradient.addColorStop(0, '#fff8dc');
  gradient.addColorStop(0.3, '#ffd700');
  gradient.addColorStop(1, '#daa520');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, coin.size / 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Coin shine
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.beginPath();
  ctx.arc(-coin.size / 6, -coin.size / 6, coin.size / 4, 0, Math.PI * 2);
  ctx.fill();
  
  // Dollar sign
  if (scaleX > 0.3) {
    ctx.fillStyle = '#8b7500';
    ctx.font = `bold ${coin.size / 2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 0);
  }
  
  ctx.restore();
}

function drawPowerUp(powerUp) {
  const info = POWER_UP_TYPES[powerUp.type];
  
  ctx.save();
  ctx.translate(powerUp.x + powerUp.size / 2, powerUp.y + powerUp.size / 2);
  ctx.rotate(powerUp.rotation);
  ctx.scale(powerUp.pulse, powerUp.pulse);
  
  // Glow effect
  ctx.shadowColor = info.color;
  ctx.shadowBlur = 20;
  
  // Background circle
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, powerUp.size / 2);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  gradient.addColorStop(0.5, info.color);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, powerUp.size / 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Icon
  ctx.font = `${powerUp.size / 2}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'white';
  ctx.shadowBlur = 0;
  ctx.fillText(info.icon, 0, 0);
  
  ctx.restore();
}

function drawParticles() {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// ============================================
// UI UPDATES
// ============================================

function updateUI() {
  document.getElementById('score').textContent = gameState.score;
  document.getElementById('topScore').textContent = gameState.topScore;
  document.getElementById('coins').textContent = gameState.coins;
  document.getElementById('speedDisplay').textContent = gameState.currentSpeed.toFixed(1) + 'x';
  document.getElementById('distanceDisplay').textContent = Math.floor(gameState.distance) + 'm';
  document.getElementById('dodgedDisplay').textContent = gameState.dodgedCars;
}

function updatePlayPauseButton() {
  const btn = document.getElementById('playPauseBtn');
  const icon = btn.querySelector('i');
  
  if (gameState.isPlaying && !gameState.isPaused) {
    icon.className = 'fa-solid fa-pause';
  } else {
    icon.className = 'fa-solid fa-play';
  }
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show' + (type === 'warning' ? ' warning' : '');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// ============================================
// SOUND SYSTEM
// ============================================

function toggleSound() {
  sounds.enabled = !sounds.enabled;
  const btn = document.getElementById('soundBtn');
  const icon = btn.querySelector('i');
  
  if (sounds.enabled) {
    icon.className = 'fa-solid fa-volume-high';
    btn.classList.remove('muted');
  } else {
    icon.className = 'fa-solid fa-volume-xmark';
    btn.classList.add('muted');
  }
}

function playSound(type) {
  if (!sounds.enabled || !sounds.context) return;
  
  const ctx = sounds.context;
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  switch (type) {
    case 'coin':
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
      break;
      
    case 'crash':
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(200, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.5);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
      break;
      
    case 'powerup':
      oscillator.frequency.setValueAtTime(400, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
      oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
      break;
      
    case 'whoosh':
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(300, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.05);
      break;
      
    case 'combo':
      oscillator.frequency.setValueAtTime(600, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.1);
      oscillator.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
      break;
      
    case 'beep':
      oscillator.frequency.setValueAtTime(440, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
      break;
      
    case 'start':
      oscillator.frequency.setValueAtTime(523, ctx.currentTime);
      oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
      break;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getLaneX(lane) {
  return lane * CONFIG.laneWidth + (CONFIG.laneWidth - CONFIG.playerWidth) / 2;
}

function shadeColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
}

// ============================================
// INITIALIZE GAME
// ============================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
