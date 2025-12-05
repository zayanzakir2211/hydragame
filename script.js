// ============================================
// HYDRA RACING - AAA Game Engine v3.0
// Ultra HD Graphics Edition
// ============================================

// Game Configuration
const CONFIG = {
  // Lanes
  lanes: 5,
  laneWidth: 0,
  
  // Player
  playerWidth: 45,
  playerHeight: 85,
  playerSpeed: 8,
  
  // Enemies
  enemyWidth: 45,
  enemyHeight: 85,
  initialEnemySpeed: 4,
  maxEnemySpeed: 12,
  enemySpawnRate: 1500,
  minEnemySpawnRate: 600,
  
  // Coins
  coinSize: 28,
  coinValue: 10,
  coinSpawnRate: 2000,
  
  // Power-ups
  powerUpSize: 38,
  powerUpSpawnRate: 8000,
  shieldDuration: 5000,
  magnetDuration: 7000,
  slowMoDuration: 5000,
  doublePointsDuration: 10000,
  nitroDuration: 3000,
  
  // Game
  speedIncreaseRate: 0.0005,
  comboTimeout: 2000,
  difficultyIncreaseInterval: 5000,
  
  // Visual Effects
  roadMarkingSpeed: 5,
  starCount: 80,
  enableMotionBlur: true,
  enableLensFlare: true,
  enableParticles: true,
  enableReflections: true,
};

// Visual Effects State
const visualFX = {
  screenShake: 0,
  screenShakeIntensity: 0,
  motionBlur: 0,
  nitroActive: false,
  nitroEndTime: 0,
  speedLines: [],
  exhaustParticles: [],
  sparkParticles: [],
  dustParticles: [],
  lensFlares: [],
  ambientLight: 1.0,
  time: 0,
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
  hasNitro: false,
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
  NITRO: { icon: '🔥', color: 'rgba(255, 100, 0, 0.8)', name: 'Nitro Boost' },
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
    
    // AAA Effect: Spawn dust/tire smoke when changing lanes
    if (player && CONFIG.enableParticles) {
      spawnDustParticle(player.x + player.width, player.y + player.height - 10, 1);
      spawnDustParticle(player.x + player.width, player.y + 20, 1);
    }
  }
}

function moveRight() {
  if (!gameState.isPlaying || gameState.isPaused) return;
  if (inputState.targetLane < CONFIG.lanes - 1) {
    inputState.targetLane++;
    playSound('whoosh');
    
    // AAA Effect: Spawn dust/tire smoke when changing lanes
    if (player && CONFIG.enableParticles) {
      spawnDustParticle(player.x, player.y + player.height - 10, -1);
      spawnDustParticle(player.x, player.y + 20, -1);
    }
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
  
  // AAA Effects - Screen shake and sparks
  triggerScreenShake(15);
  for (let i = 0; i < 10; i++) {
    spawnSparkParticle(player.x + player.width / 2, player.y + player.height / 2);
  }
  
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
  gameState.hasNitro = false;
  gameState.activePowerUp = null;
  
  // Clear objects
  enemies = [];
  coins = [];
  powerUps = [];
  particles = [];
  
  // Reset visual effects
  visualFX.exhaustParticles = [];
  visualFX.sparkParticles = [];
  visualFX.dustParticles = [];
  visualFX.speedLines = [];
  visualFX.screenShake = 0;
  visualFX.nitroActive = false;
  
  // Reset player
  initPlayer();
  
  // Hide overlays
  document.getElementById('gameOverScreen').style.display = 'none';
  document.getElementById('pauseOverlay').classList.remove('active');
  document.getElementById('powerupIndicator').classList.remove('active');
  document.getElementById('comboDisplay').classList.remove('active');
  document.getElementById('nitroBarContainer').classList.remove('active');
  
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
  const nitroMultiplier = gameState.hasNitro ? 1.8 : 1; // Nitro doubles effective speed
  
  // Update speed and difficulty
  gameState.currentSpeed += CONFIG.speedIncreaseRate;
  gameState.distance += gameState.currentSpeed * deltaSpeed * nitroMultiplier;
  
  // Nitro score bonus
  if (gameState.hasNitro) {
    gameState.score += Math.floor(10 * deltaSpeed); // Bonus points during nitro
  }
  
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
  updateRoadMarkings(deltaSpeed * nitroMultiplier);
  
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
    
    // Update nitro bar if nitro is active
    if (gameState.hasNitro) {
      const totalDuration = CONFIG.nitroDuration;
      const elapsed = Date.now() - (gameState.powerUpEndTime - totalDuration);
      const progress = Math.max(0, 1 - (elapsed / totalDuration));
      document.getElementById('nitroFill').style.width = (progress * 100) + '%';
    }
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
    case 'NITRO':
      gameState.hasNitro = true;
      visualFX.nitroActive = true;
      visualFX.nitroEndTime = Date.now() + CONFIG.nitroDuration;
      gameState.powerUpEndTime = visualFX.nitroEndTime;
      // Show nitro bar
      document.getElementById('nitroBarContainer').classList.add('active');
      // Trigger screen shake for impact
      triggerScreenShake(5, 100);
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
  gameState.hasNitro = false;
  gameState.activePowerUp = null;
  visualFX.nitroActive = false;
  
  document.getElementById('powerupIndicator').classList.remove('active');
  document.getElementById('nitroBarContainer').classList.remove('active');
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
  
  ctx.save();
  
  // Apply screen shake if active
  if (visualFX.screenShake > 0) {
    const shakeX = (Math.random() - 0.5) * visualFX.screenShakeIntensity * visualFX.screenShake;
    const shakeY = (Math.random() - 0.5) * visualFX.screenShakeIntensity * visualFX.screenShake;
    ctx.translate(shakeX, shakeY);
  }
  
  // Draw background gradient (road)
  drawRoad();
  
  // Draw stars (background)
  drawStars();
  
  // Draw speed lines (at high speeds)
  if (gameState.isPlaying && gameState.currentSpeed > 1.5) {
    visualFX.speedLines.forEach(line => {
      ctx.strokeStyle = `rgba(255, 255, 255, ${line.opacity})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(line.x, line.y);
      ctx.lineTo(line.x, line.y + line.length);
      ctx.stroke();
    });
  }
  
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
    
    // Draw AAA visual effects
    drawVisualFX();
  }
  
  // Update visual effects
  updateVisualFX();
  
  // Update game logic
  update();
  
  ctx.restore();
  
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
  
  // ========== AAA QUALITY CAR RENDERING ==========
  
  // Dynamic shadow based on speed
  const shadowOffset = 3 + gameState.currentSpeed * 2;
  const shadowBlur = 8 + gameState.currentSpeed * 3;
  
  // Car shadow (multi-layered for realism)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2 + shadowOffset, y + h - 3, w / 2 + 2, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2 + shadowOffset * 1.5, y + h, w / 2 + 5, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // ========== CAR BODY ==========
  
  // Base metallic gradient
  const bodyGradient = ctx.createLinearGradient(x, y, x + w, y + h);
  bodyGradient.addColorStop(0, shadeColor(color, 40));
  bodyGradient.addColorStop(0.2, color);
  bodyGradient.addColorStop(0.5, shadeColor(color, -15));
  bodyGradient.addColorStop(0.8, shadeColor(color, -30));
  bodyGradient.addColorStop(1, shadeColor(color, -45));
  
  // Main body shape
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.moveTo(x + 8, y + h - 12);
  ctx.lineTo(x + 8, y + 25);
  ctx.quadraticCurveTo(x + 8, y + 15, x + 15, y + 12);
  ctx.lineTo(x + w - 15, y + 12);
  ctx.quadraticCurveTo(x + w - 8, y + 15, x + w - 8, y + 25);
  ctx.lineTo(x + w - 8, y + h - 12);
  ctx.quadraticCurveTo(x + w - 8, y + h - 5, x + w - 15, y + h - 5);
  ctx.lineTo(x + 15, y + h - 5);
  ctx.quadraticCurveTo(x + 8, y + h - 5, x + 8, y + h - 12);
  ctx.closePath();
  ctx.fill();
  
  // Body highlight (chrome effect)
  ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // ========== ROOF / CABIN ==========
  
  const roofGradient = ctx.createLinearGradient(x, y + 20, x + w, y + 45);
  roofGradient.addColorStop(0, shadeColor(color, 30));
  roofGradient.addColorStop(0.5, shadeColor(color, 10));
  roofGradient.addColorStop(1, shadeColor(color, -20));
  
  ctx.fillStyle = roofGradient;
  ctx.beginPath();
  ctx.moveTo(x + 12, y + 45);
  ctx.lineTo(x + 14, y + 25);
  ctx.quadraticCurveTo(x + w / 2, y + 20, x + w - 14, y + 25);
  ctx.lineTo(x + w - 12, y + 45);
  ctx.closePath();
  ctx.fill();
  
  // ========== WINDOWS (Tinted glass effect) ==========
  
  // Windshield gradient (reflective glass)
  const glassGradient = ctx.createLinearGradient(x + 12, y + 25, x + w - 12, y + 42);
  glassGradient.addColorStop(0, 'rgba(150, 220, 255, 0.9)');
  glassGradient.addColorStop(0.3, 'rgba(100, 180, 255, 0.7)');
  glassGradient.addColorStop(0.7, 'rgba(60, 120, 180, 0.8)');
  glassGradient.addColorStop(1, 'rgba(40, 80, 140, 0.9)');
  
  // Rear window
  ctx.fillStyle = glassGradient;
  ctx.beginPath();
  ctx.moveTo(x + 14, y + 26);
  ctx.quadraticCurveTo(x + w / 2, y + 22, x + w - 14, y + 26);
  ctx.lineTo(x + w - 13, y + 38);
  ctx.lineTo(x + 13, y + 38);
  ctx.closePath();
  ctx.fill();
  
  // Glass reflection highlight
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 16, y + 28);
  ctx.lineTo(x + w / 2, y + 25);
  ctx.stroke();
  
  // ========== TAILLIGHTS (Glowing) ==========
  
  // Taillight glow
  ctx.shadowColor = 'rgba(255, 50, 50, 0.8)';
  ctx.shadowBlur = 15;
  
  ctx.fillStyle = '#ff3333';
  ctx.beginPath();
  ctx.roundRect(x + 10, y + 14, 7, 5, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x + w - 17, y + 14, 7, 5, 2);
  ctx.fill();
  
  // Taillight inner glow
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255, 150, 150, 0.9)';
  ctx.beginPath();
  ctx.roundRect(x + 11, y + 15, 3, 2, 1);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x + w - 15, y + 15, 3, 2, 1);
  ctx.fill();
  
  // ========== HEADLIGHTS ==========
  
  ctx.fillStyle = 'rgba(200, 200, 180, 0.9)';
  ctx.beginPath();
  ctx.roundRect(x + 10, y + h - 16, 7, 5, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x + w - 17, y + h - 16, 7, 5, 2);
  ctx.fill();
  
  // ========== SIDE DETAILS ==========
  
  // Door line
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + 25);
  ctx.lineTo(x + w / 2, y + h - 15);
  ctx.stroke();
  
  // Side mirror hints
  ctx.fillStyle = shadeColor(color, -20);
  ctx.fillRect(x + 5, y + 32, 4, 6);
  ctx.fillRect(x + w - 9, y + 32, 4, 6);
  
  // ========== WHEELS (Visible from top-down angle) ==========
  
  // Wheel shadows
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(x + 4, y + 18, 6, 14);
  ctx.fillRect(x + w - 10, y + 18, 6, 14);
  ctx.fillRect(x + 4, y + h - 28, 6, 14);
  ctx.fillRect(x + w - 10, y + h - 28, 6, 14);
  
  // Wheel rims
  ctx.fillStyle = '#333';
  ctx.fillRect(x + 5, y + 19, 4, 12);
  ctx.fillRect(x + w - 9, y + 19, 4, 12);
  ctx.fillRect(x + 5, y + h - 27, 4, 12);
  ctx.fillRect(x + w - 9, y + h - 27, 4, 12);
  
  // Rim shine
  ctx.fillStyle = 'rgba(200, 200, 200, 0.4)';
  ctx.fillRect(x + 5, y + 19, 2, 4);
  ctx.fillRect(x + w - 9, y + 19, 2, 4);
  ctx.fillRect(x + 5, y + h - 27, 2, 4);
  ctx.fillRect(x + w - 9, y + h - 27, 2, 4);
  
  ctx.restore();
  
  // ========== EXHAUST PARTICLES ==========
  if (CONFIG.enableParticles && gameState.isPlaying) {
    spawnExhaustParticle(x + w / 2 - 5, y + h + 2);
    spawnExhaustParticle(x + w / 2 + 5, y + h + 2);
  }
}

function drawPlayer() {
  const x = player.x;
  const y = player.y;
  const w = player.width;
  const h = player.height;
  const color = player.color;
  
  ctx.save();
  
  // ========== NITRO BOOST EFFECT ==========
  if (visualFX.nitroActive || gameState.hasNitro) {
    // Nitro flames from exhaust
    const flameHeight = 30 + Math.random() * 20;
    const flameGradient = ctx.createLinearGradient(x + w/2, y + h, x + w/2, y + h + flameHeight);
    flameGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    flameGradient.addColorStop(0.2, 'rgba(100, 200, 255, 0.8)');
    flameGradient.addColorStop(0.5, 'rgba(50, 100, 255, 0.6)');
    flameGradient.addColorStop(1, 'rgba(100, 50, 255, 0)');
    
    ctx.fillStyle = flameGradient;
    ctx.beginPath();
    ctx.moveTo(x + w/2 - 8, y + h);
    ctx.quadraticCurveTo(x + w/2 - 12, y + h + flameHeight/2, x + w/2, y + h + flameHeight);
    ctx.quadraticCurveTo(x + w/2 + 12, y + h + flameHeight/2, x + w/2 + 8, y + h);
    ctx.fill();
    
    // Nitro glow around car
    ctx.shadowColor = 'rgba(100, 150, 255, 0.8)';
    ctx.shadowBlur = 30;
  }
  
  // ========== SHIELD EFFECT (Enhanced) ==========
  if (gameState.hasShield) {
    // Hexagonal shield pattern
    const shieldRadius = w * 1.0;
    const time = Date.now() * 0.003;
    
    // Outer glow
    ctx.shadowColor = 'rgba(0, 255, 200, 0.8)';
    ctx.shadowBlur = 25;
    
    // Shield dome
    const shieldGradient = ctx.createRadialGradient(
      x + w/2, y + h/2, 0,
      x + w/2, y + h/2, shieldRadius
    );
    shieldGradient.addColorStop(0, 'rgba(0, 255, 200, 0.05)');
    shieldGradient.addColorStop(0.5, 'rgba(0, 255, 200, 0.1)');
    shieldGradient.addColorStop(0.8, 'rgba(0, 255, 200, 0.2)');
    shieldGradient.addColorStop(1, 'rgba(0, 255, 200, 0.4)');
    
    ctx.fillStyle = shieldGradient;
    ctx.beginPath();
    ctx.arc(x + w/2, y + h/2, shieldRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Rotating shield ring
    ctx.strokeStyle = `rgba(0, 255, 200, ${0.5 + Math.sin(time) * 0.3})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.arc(x + w/2, y + h/2, shieldRadius - 5, time, time + Math.PI * 1.5);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Hexagon pattern
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i + time * 0.5;
      const hx = x + w/2 + Math.cos(angle) * shieldRadius * 0.7;
      const hy = y + h/2 + Math.sin(angle) * shieldRadius * 0.7;
      ctx.beginPath();
      ctx.arc(hx, hy, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.shadowBlur = 0;
  }
  
  // ========== PREMIUM PLAYER CAR ==========
  
  // Multi-layer shadow for depth
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.ellipse(x + w/2 + 4, y + h - 2, w/2 + 3, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(x + w/2 + 6, y + h + 2, w/2 + 8, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // ========== SPORTS CAR BODY ==========
  
  // Metallic paint with clear coat effect
  const bodyGradient = ctx.createLinearGradient(x, y, x + w, y + h);
  bodyGradient.addColorStop(0, shadeColor(color, 50));
  bodyGradient.addColorStop(0.15, shadeColor(color, 30));
  bodyGradient.addColorStop(0.3, color);
  bodyGradient.addColorStop(0.5, shadeColor(color, -10));
  bodyGradient.addColorStop(0.7, shadeColor(color, -25));
  bodyGradient.addColorStop(1, shadeColor(color, -40));
  
  // Sleek sports car shape
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.moveTo(x + 10, y + h - 10);
  ctx.lineTo(x + 6, y + h - 25);
  ctx.lineTo(x + 6, y + 30);
  ctx.quadraticCurveTo(x + 6, y + 12, x + 18, y + 8);
  ctx.lineTo(x + w - 18, y + 8);
  ctx.quadraticCurveTo(x + w - 6, y + 12, x + w - 6, y + 30);
  ctx.lineTo(x + w - 6, y + h - 25);
  ctx.lineTo(x + w - 10, y + h - 10);
  ctx.quadraticCurveTo(x + w - 10, y + h - 4, x + w - 18, y + h - 4);
  ctx.lineTo(x + 18, y + h - 4);
  ctx.quadraticCurveTo(x + 10, y + h - 4, x + 10, y + h - 10);
  ctx.closePath();
  ctx.fill();
  
  // Chrome outline
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  
  // ========== HOOD DETAILS ==========
  
  // Hood scoop
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.roundRect(x + w/2 - 8, y + h - 35, 16, 12, 3);
  ctx.fill();
  
  // Hood lines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 12, y + h - 45);
  ctx.lineTo(x + 12, y + h - 10);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + w - 12, y + h - 45);
  ctx.lineTo(x + w - 12, y + h - 10);
  ctx.stroke();
  
  // ========== CABIN / ROOF ==========
  
  const roofGradient = ctx.createLinearGradient(x + 10, y + 15, x + w - 10, y + 50);
  roofGradient.addColorStop(0, shadeColor(color, 35));
  roofGradient.addColorStop(0.3, shadeColor(color, 15));
  roofGradient.addColorStop(0.7, shadeColor(color, -5));
  roofGradient.addColorStop(1, shadeColor(color, -20));
  
  ctx.fillStyle = roofGradient;
  ctx.beginPath();
  ctx.moveTo(x + 12, y + 48);
  ctx.lineTo(x + 16, y + 22);
  ctx.quadraticCurveTo(x + w/2, y + 16, x + w - 16, y + 22);
  ctx.lineTo(x + w - 12, y + 48);
  ctx.closePath();
  ctx.fill();
  
  // ========== WINDSHIELD (Front - facing up in game) ==========
  
  const windshieldGradient = ctx.createLinearGradient(x + 14, y + 22, x + w - 14, y + 45);
  windshieldGradient.addColorStop(0, 'rgba(180, 230, 255, 0.95)');
  windshieldGradient.addColorStop(0.3, 'rgba(120, 200, 255, 0.85)');
  windshieldGradient.addColorStop(0.6, 'rgba(80, 150, 220, 0.8)');
  windshieldGradient.addColorStop(1, 'rgba(50, 100, 180, 0.9)');
  
  ctx.fillStyle = windshieldGradient;
  ctx.beginPath();
  ctx.moveTo(x + 17, y + 23);
  ctx.quadraticCurveTo(x + w/2, y + 18, x + w - 17, y + 23);
  ctx.lineTo(x + w - 14, y + 42);
  ctx.lineTo(x + 14, y + 42);
  ctx.closePath();
  ctx.fill();
  
  // Windshield reflection streak
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 20, y + 26);
  ctx.quadraticCurveTo(x + w/2 - 5, y + 22, x + w/2 + 5, y + 24);
  ctx.stroke();
  
  // ========== HEADLIGHTS (Bright LED style) ==========
  
  // Headlight housings
  ctx.fillStyle = 'rgba(30, 30, 30, 0.9)';
  ctx.beginPath();
  ctx.roundRect(x + 8, y + 10, 10, 8, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x + w - 18, y + 10, 10, 8, 2);
  ctx.fill();
  
  // LED headlights with glow
  ctx.shadowColor = 'rgba(255, 255, 220, 0.9)';
  ctx.shadowBlur = 20;
  
  ctx.fillStyle = '#ffffee';
  ctx.beginPath();
  ctx.roundRect(x + 9, y + 11, 8, 6, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x + w - 17, y + 11, 8, 6, 2);
  ctx.fill();
  
  // Headlight beam effect
  ctx.shadowBlur = 0;
  const beamGradient = ctx.createLinearGradient(x + w/2, y + 10, x + w/2, y - 40);
  beamGradient.addColorStop(0, 'rgba(255, 255, 220, 0.3)');
  beamGradient.addColorStop(1, 'rgba(255, 255, 220, 0)');
  
  ctx.fillStyle = beamGradient;
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 12);
  ctx.lineTo(x - 10, y - 30);
  ctx.lineTo(x + 25, y - 30);
  ctx.lineTo(x + 18, y + 12);
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(x + w - 8, y + 12);
  ctx.lineTo(x + w + 10, y - 30);
  ctx.lineTo(x + w - 25, y - 30);
  ctx.lineTo(x + w - 18, y + 12);
  ctx.fill();
  
  // ========== TAILLIGHTS (Red LED) ==========
  
  ctx.shadowColor = 'rgba(255, 50, 50, 0.8)';
  ctx.shadowBlur = 15;
  
  ctx.fillStyle = '#ff2222';
  ctx.beginPath();
  ctx.roundRect(x + 8, y + h - 14, 10, 5, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x + w - 18, y + h - 14, 10, 5, 2);
  ctx.fill();
  
  ctx.shadowBlur = 0;
  
  // Taillight inner LED dots
  ctx.fillStyle = 'rgba(255, 150, 150, 0.9)';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(x + 11 + i * 3, y + h - 11.5, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w - 15 + i * 3, y + h - 11.5, 1, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // ========== RACING STRIPES ==========
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(x + w/2 - 5, y + 10, 3, h - 20);
  ctx.fillRect(x + w/2 + 2, y + 10, 3, h - 20);
  
  // ========== SPOILER ==========
  
  ctx.fillStyle = shadeColor(color, -30);
  ctx.beginPath();
  ctx.roundRect(x + 6, y + h - 8, w - 12, 4, 1);
  ctx.fill();
  
  // Spoiler supports
  ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
  ctx.fillRect(x + 10, y + h - 10, 3, 6);
  ctx.fillRect(x + w - 13, y + h - 10, 3, 6);
  
  // ========== WHEELS ==========
  
  // Wheel wells
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(x + 2, y + 15, 8, 16);
  ctx.fillRect(x + w - 10, y + 15, 8, 16);
  ctx.fillRect(x + 2, y + h - 28, 8, 16);
  ctx.fillRect(x + w - 10, y + h - 28, 8, 16);
  
  // Alloy wheels
  const wheelGradient = ctx.createLinearGradient(0, 0, 6, 0);
  wheelGradient.addColorStop(0, '#666');
  wheelGradient.addColorStop(0.5, '#999');
  wheelGradient.addColorStop(1, '#555');
  
  ctx.fillStyle = wheelGradient;
  ctx.fillRect(x + 3, y + 16, 6, 14);
  ctx.fillRect(x + w - 9, y + 16, 6, 14);
  ctx.fillRect(x + 3, y + h - 27, 6, 14);
  ctx.fillRect(x + w - 9, y + h - 27, 6, 14);
  
  // Wheel shine
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillRect(x + 3, y + 16, 2, 5);
  ctx.fillRect(x + w - 9, y + 16, 2, 5);
  ctx.fillRect(x + 3, y + h - 27, 2, 5);
  ctx.fillRect(x + w - 9, y + h - 27, 2, 5);
  
  // ========== SIDE MIRRORS ==========
  
  ctx.fillStyle = shadeColor(color, -15);
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 35, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + w - 3, y + 35, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
  
  // ========== EXHAUST PARTICLES ==========
  if (CONFIG.enableParticles && gameState.isPlaying) {
    // Normal exhaust
    if (Math.random() > 0.7) {
      spawnExhaustParticle(x + w/2 - 6, y + h + 3);
      spawnExhaustParticle(x + w/2 + 6, y + h + 3);
    }
    
    // Nitro boost particles
    if (visualFX.nitroActive || gameState.hasNitro) {
      for (let i = 0; i < 3; i++) {
        spawnNitroParticle(x + w/2, y + h + 5);
      }
    }
  }
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
// AAA PARTICLE EFFECTS SYSTEM
// ============================================

function spawnExhaustParticle(x, y) {
  if (Math.random() > 0.3) return; // Throttle spawn rate
  
  visualFX.exhaustParticles.push({
    x: x + (Math.random() - 0.5) * 4,
    y: y,
    vx: (Math.random() - 0.5) * 0.5,
    vy: 2 + Math.random() * 2,
    size: 2 + Math.random() * 3,
    life: 1,
    decay: 0.03 + Math.random() * 0.02,
    color: `rgba(${100 + Math.random() * 50}, ${100 + Math.random() * 50}, ${100 + Math.random() * 50}, `,
  });
}

function spawnNitroParticle(x, y) {
  visualFX.exhaustParticles.push({
    x: x + (Math.random() - 0.5) * 10,
    y: y,
    vx: (Math.random() - 0.5) * 2,
    vy: 5 + Math.random() * 5,
    size: 4 + Math.random() * 6,
    life: 1,
    decay: 0.05 + Math.random() * 0.03,
    isNitro: true,
  });
}

function spawnSparkParticle(x, y) {
  for (let i = 0; i < 5; i++) {
    visualFX.sparkParticles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8 - 2,
      size: 1 + Math.random() * 2,
      life: 1,
      decay: 0.08 + Math.random() * 0.05,
    });
  }
}

function spawnDustParticle(x, y, direction) {
  visualFX.dustParticles.push({
    x: x,
    y: y,
    vx: direction * (2 + Math.random() * 3),
    vy: -1 + Math.random() * 2,
    size: 8 + Math.random() * 12,
    life: 0.6,
    decay: 0.015,
  });
}

function updateVisualFX() {
  // Update time
  visualFX.time += 0.016;
  
  // Update exhaust particles
  for (let i = visualFX.exhaustParticles.length - 1; i >= 0; i--) {
    const p = visualFX.exhaustParticles[i];
    p.x += p.vx;
    p.y += p.vy * gameState.currentSpeed;
    p.life -= p.decay;
    p.size *= 1.02;
    
    if (p.life <= 0 || p.y > canvasHeight) {
      visualFX.exhaustParticles.splice(i, 1);
    }
  }
  
  // Update spark particles
  for (let i = visualFX.sparkParticles.length - 1; i >= 0; i--) {
    const p = visualFX.sparkParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.3; // Gravity
    p.life -= p.decay;
    
    if (p.life <= 0) {
      visualFX.sparkParticles.splice(i, 1);
    }
  }
  
  // Update dust particles
  for (let i = visualFX.dustParticles.length - 1; i >= 0; i--) {
    const p = visualFX.dustParticles[i];
    p.x += p.vx;
    p.y += p.vy + gameState.currentSpeed * 2;
    p.vx *= 0.98;
    p.life -= p.decay;
    p.size *= 1.03;
    
    if (p.life <= 0 || p.y > canvasHeight) {
      visualFX.dustParticles.splice(i, 1);
    }
  }
  
  // Update speed lines
  updateSpeedLines();
  
  // Update screen shake
  if (visualFX.screenShake > 0) {
    visualFX.screenShake -= 0.1;
  }
  
  // Update nitro state
  if (visualFX.nitroActive && Date.now() > visualFX.nitroEndTime) {
    visualFX.nitroActive = false;
  }
}

function updateSpeedLines() {
  // Spawn new speed lines at high speeds
  if (gameState.currentSpeed > 1.5 && gameState.isPlaying && Math.random() > 0.7) {
    visualFX.speedLines.push({
      x: Math.random() > 0.5 ? Math.random() * 50 : canvasWidth - Math.random() * 50,
      y: -20,
      length: 30 + Math.random() * 50,
      speed: 15 + gameState.currentSpeed * 5,
      opacity: 0.3 + Math.random() * 0.3,
    });
  }
  
  // Update existing speed lines
  for (let i = visualFX.speedLines.length - 1; i >= 0; i--) {
    const line = visualFX.speedLines[i];
    line.y += line.speed;
    line.opacity -= 0.01;
    
    if (line.y > canvasHeight || line.opacity <= 0) {
      visualFX.speedLines.splice(i, 1);
    }
  }
}

function drawVisualFX() {
  // Apply screen shake
  if (visualFX.screenShake > 0) {
    const shakeX = (Math.random() - 0.5) * visualFX.screenShakeIntensity * visualFX.screenShake;
    const shakeY = (Math.random() - 0.5) * visualFX.screenShakeIntensity * visualFX.screenShake;
    ctx.translate(shakeX, shakeY);
  }
  
  // Draw speed lines
  visualFX.speedLines.forEach(line => {
    ctx.strokeStyle = `rgba(255, 255, 255, ${line.opacity})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(line.x, line.y);
    ctx.lineTo(line.x, line.y + line.length);
    ctx.stroke();
  });
  
  // Draw exhaust particles
  visualFX.exhaustParticles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life * 0.6;
    
    if (p.isNitro) {
      // Nitro flame colors
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      gradient.addColorStop(0.3, 'rgba(100, 200, 255, 0.7)');
      gradient.addColorStop(0.6, 'rgba(50, 100, 255, 0.5)');
      gradient.addColorStop(1, 'rgba(100, 50, 200, 0)');
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = p.color + p.life * 0.5 + ')';
    }
    
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  
  // Draw spark particles
  visualFX.sparkParticles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life;
    
    // Bright yellow-orange sparks
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
    gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 200, 50, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  });
  
  // Draw dust particles
  visualFX.dustParticles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life * 0.4;
    ctx.fillStyle = 'rgba(150, 140, 120, 1)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  
  // Draw motion blur effect at high speeds
  if (gameState.currentSpeed > 2 && CONFIG.enableMotionBlur) {
    drawMotionBlur();
  }
  
  // Draw vignette effect
  drawVignette();
  
  // Draw lens flare if enabled
  if (CONFIG.enableLensFlare && gameState.isPlaying) {
    drawLensFlare();
  }
}

function drawMotionBlur() {
  const blurIntensity = Math.min((gameState.currentSpeed - 2) * 0.1, 0.3);
  
  // Edge blur gradient on sides
  const leftBlur = ctx.createLinearGradient(0, 0, 60, 0);
  leftBlur.addColorStop(0, `rgba(0, 0, 0, ${blurIntensity})`);
  leftBlur.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  ctx.fillStyle = leftBlur;
  ctx.fillRect(0, 0, 60, canvasHeight);
  
  const rightBlur = ctx.createLinearGradient(canvasWidth, 0, canvasWidth - 60, 0);
  rightBlur.addColorStop(0, `rgba(0, 0, 0, ${blurIntensity})`);
  rightBlur.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  ctx.fillStyle = rightBlur;
  ctx.fillRect(canvasWidth - 60, 0, 60, canvasHeight);
}

function drawVignette() {
  const gradient = ctx.createRadialGradient(
    canvasWidth / 2, canvasHeight / 2, canvasHeight * 0.3,
    canvasWidth / 2, canvasHeight / 2, canvasHeight * 0.8
  );
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
}

function drawLensFlare() {
  // Sun/light position at top
  const sunX = canvasWidth * 0.7;
  const sunY = 30;
  const time = Date.now() * 0.001;
  
  // Main flare
  ctx.save();
  ctx.globalAlpha = 0.15 + Math.sin(time * 2) * 0.05;
  
  const flareGradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 80);
  flareGradient.addColorStop(0, 'rgba(255, 255, 200, 0.8)');
  flareGradient.addColorStop(0.3, 'rgba(255, 220, 150, 0.4)');
  flareGradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
  
  ctx.fillStyle = flareGradient;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 80, 0, Math.PI * 2);
  ctx.fill();
  
  // Secondary flares along the line
  const flarePositions = [0.3, 0.5, 0.7, 0.85];
  const flareSizes = [15, 25, 10, 20];
  const flareColors = [
    'rgba(255, 100, 50, 0.3)',
    'rgba(100, 200, 255, 0.2)',
    'rgba(255, 255, 100, 0.25)',
    'rgba(200, 100, 255, 0.15)',
  ];
  
  const endX = canvasWidth * 0.3;
  const endY = canvasHeight * 0.8;
  
  flarePositions.forEach((pos, i) => {
    const fx = sunX + (endX - sunX) * pos;
    const fy = sunY + (endY - sunY) * pos;
    
    ctx.globalAlpha = 0.1 + Math.sin(time * 3 + i) * 0.05;
    ctx.fillStyle = flareColors[i];
    ctx.beginPath();
    ctx.arc(fx, fy, flareSizes[i], 0, Math.PI * 2);
    ctx.fill();
  });
  
  ctx.restore();
}

function triggerScreenShake(intensity = 10) {
  visualFX.screenShake = 1;
  visualFX.screenShakeIntensity = intensity;
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
