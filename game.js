document.addEventListener("DOMContentLoaded", () => {

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  // =====================
  // VIRTUAL GAME SPACE
  // =====================
  const VIRTUAL_WIDTH = 800;
  const VIRTUAL_HEIGHT = 600;

  function resizeCanvas() {
    const scale = Math.min(
      window.innerWidth / VIRTUAL_WIDTH,
      window.innerHeight / VIRTUAL_HEIGHT
    );

    canvas.width = VIRTUAL_WIDTH * scale;
    canvas.height = VIRTUAL_HEIGHT * scale;

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  const FPS = 60;

  // =====================
  // COLORS
  // =====================
  const BG_COLOR = [120,120,120];
  const PLANET_LIGHT = "rgb(230,230,230)";
  const PLANET_DARK = "rgb(20,20,20)";
  const BASE_ENEMY_COLOR = [150,150,150];
  const BASE_BALL_COLOR = [200,200,200];

  const ENEMY_RADIUS = 100;

  // =====================
  // CONTRAST MAP
  // =====================
  const CONTRAST_MAP = [
    0.00, 0.30, 0.40, 0.50, 0.65,
    0.75, 0.80, 0.85, 0.90, 0.95
  ];

  // =====================
  // LEVEL DATA
  // =====================
  const LEVELS = [
    {speed:0.7, balls:1, hits:5},
    {speed:0.7, balls:2, hits:5},
    {speed:0.8, balls:3, hits:6},
    {speed:0.9, balls:3, hits:6},
    {speed:0.9, balls:3, hits:6},
    {speed:1.0, balls:3, hits:7},
    {speed:1.0, balls:4, hits:8},
    {speed:1.0, balls:4, hits:9},
    {speed:1.0, balls:4, hits:10},
    {speed:1.0, balls:4, hits:11}
  ];

  // =====================
  // BACKGROUND PLANETS
  // =====================
  const bgPlanets = [
    [120,120,45,PLANET_LIGHT],
    [680,120,40,PLANET_DARK],
    [120,480,35,PLANET_DARK],
    [680,480,50,PLANET_LIGHT],
    [90,300,30,PLANET_LIGHT],
    [710,300,30,PLANET_DARK]
  ];

  // =====================
  // GAME STATE
  // =====================
  let levelIndex = 0;
  let enemyAngle = 0;
  let attachedAngles = [];
  let shooting = false;
  let shotY = VIRTUAL_HEIGHT - 50;
  let chances = 3;
  let hits = 0;
  let canShoot = false;

  let gameState = "COUNTDOWN";
  let stateStartTime = 0;
  let endMessage = "";

  // Track if the next startLevel is a replay or a new level
  let isReplay = false;

  // =====================
  // GAME STATS
  // =====================
  const levelStats = [];
  let totalReplays = 0;
  let levelStartTime = 0;
  let chancesUsedThisLevel = 0;

  // =====================
  // HELPERS
  // =====================
  function amblyopiaColor(base, bg, strength) {
    return `rgb(${base.map((v,i)=>
      Math.round(bg[i] + (v-bg[i])*(1-strength))
    ).join(",")})`;
  }

  function angleCollision(a1, a2) {
    const diff = Math.abs(a1 - a2) % 360;
    return diff < 14 || diff > 346;
  }

  function drawBackground() {
    ctx.fillStyle = `rgb(${BG_COLOR.join(",")})`;
    ctx.fillRect(0,0,VIRTUAL_WIDTH,VIRTUAL_HEIGHT);

    bgPlanets.forEach(p=>{
      ctx.fillStyle = p[3];
      ctx.beginPath();
      ctx.arc(p[0],p[1],p[2],0,Math.PI*2);
      ctx.fill();
    });
  }

  function drawCenteredText(txt, size=48, yOffset=0) {
    ctx.fillStyle = "black";
    ctx.font = `${size}px Arial`;
    const m = ctx.measureText(txt);
    ctx.fillText(
      txt,
      VIRTUAL_WIDTH/2 - m.width/2,
      VIRTUAL_HEIGHT/2 + yOffset
    );
  }

  function drawCleanOverlay() {
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillRect(0, VIRTUAL_HEIGHT/2 - 90, VIRTUAL_WIDTH, 180);
  }

  // =====================
  // LEVEL INIT (UPDATED)
  // =====================
  function startLevel() {
    if (levelIndex >= LEVELS.length) {
      gameState = "GAME_COMPLETE";
      return;
    }

    if (gameState === "LEVEL_END" && endMessage === "LEVEL FAILED!") {
      totalReplays++;
      isReplay = true;
    } else {
      isReplay = false;
      chancesUsedThisLevel = 0; // Reset for new level
    }

    const lvl = LEVELS[levelIndex];
    enemyAngle = 0;
    chances = 3;
    hits = 0;
    shooting = false;
    shotY = VIRTUAL_HEIGHT - 50;

    attachedAngles = [];
    for (let i = 0; i < lvl.balls; i++) {
      attachedAngles.push(i * (360 / lvl.balls));
    }

    // Only set levelStartTime if this is a new level, not a replay
    if (!isReplay) {
      levelStartTime = performance.now();
      totalReplays = 0; // Reset replays for the new level
    }

    gameState = "COUNTDOWN";
    stateStartTime = performance.now();
    canShoot = false;
  }

  // =====================
  // INPUT (DESKTOP)
  // =====================
  document.addEventListener("keydown", e=>{
    if (e.code === "Space" && canShoot && !shooting && gameState==="PLAYING") {
      shooting = true;
      shotY = VIRTUAL_HEIGHT - 50;
    }
  });

  // =====================
  // INPUT (MOBILE)
  // =====================
  canvas.addEventListener("touchstart", e=>{
    e.preventDefault();
    if (canShoot && !shooting && gameState==="PLAYING") {
      shooting = true;
      shotY = VIRTUAL_HEIGHT - 50;
    }
  }, { passive:false });

  // =====================
  // GAME LOOP (UPDATED)
  // =====================
  let quitTriggered = false;

  // Add quit button event
  document.getElementById("quitBtn").addEventListener("click", () => {
    quitTriggered = true;
    gameState = "GAME_QUIT";
  });

  function gameLoop() {
    drawBackground();
    const now = performance.now();

    if (quitTriggered || gameState === "GAME_QUIT") {
      drawCleanOverlay();
      drawCenteredText("GAME QUIT", 44, -10);
      drawStatsTable();
      return;
    }

    if (gameState === "GAME_COMPLETE") {
      drawCleanOverlay();
      drawCenteredText("ALL LEVELS", 44, -10);
      drawCenteredText("COMPLETED", 44, 40);
      drawStatsTable();
      return;
    }

    if (gameState === "COUNTDOWN") {
      const t = now - stateStartTime;
      const txt =
        t < 800 ? "3" :
        t < 1600 ? "2" :
        t < 2400 ? "1" :
        t < 3200 ? "START" : "";

      if (txt) drawCenteredText(txt);
      else {
        gameState = "PLAYING";
        canShoot = true;
      }
      return;
    }

    if (gameState === "LEVEL_END") {
      drawCleanOverlay();
      drawCenteredText(endMessage);
      return;
    }

    const lvl = LEVELS[levelIndex];
    const strength = CONTRAST_MAP[levelIndex];

    const enemyColor = amblyopiaColor(BASE_ENEMY_COLOR, BG_COLOR, strength);
    const ballColor = amblyopiaColor(BASE_BALL_COLOR, BG_COLOR, strength);

    enemyAngle = (enemyAngle + (lvl.speed + levelIndex * 0.08)) % 360;

    ctx.fillStyle = enemyColor;
    ctx.beginPath();
    ctx.arc(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2, ENEMY_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = ballColor;
    attachedAngles.forEach(a => {
      const r = (a + enemyAngle) * Math.PI / 180;
      ctx.beginPath();
      ctx.arc(
        VIRTUAL_WIDTH / 2 + Math.cos(r) * ENEMY_RADIUS,
        VIRTUAL_HEIGHT / 2 + Math.sin(r) * ENEMY_RADIUS,
        7, 0, Math.PI * 2
      );
      ctx.fill();
    });

    if (!shooting) {
      ctx.beginPath();
      ctx.arc(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT - 50, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    if (shooting) {
      shotY -= 12;
      ctx.beginPath();
      ctx.arc(VIRTUAL_WIDTH / 2, shotY, 7, 0, Math.PI * 2);
      ctx.fill();

      if (shotY <= VIRTUAL_HEIGHT / 2 + ENEMY_RADIUS) {
        shooting = false;
        const hitAngle = (90 - enemyAngle + 360) % 360;

        if (attachedAngles.some(a => angleCollision(hitAngle, a))) {
          chances--;
        } else {
          attachedAngles.push(hitAngle);
          hits++;
        }
      }
    }

    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    ctx.fillText(`Level: ${levelIndex + 1}/10`, 10, 25);
    ctx.fillText(`Score: ${hits * 10}`, 10, 50);
    ctx.fillText(`Chances: ${chances}`, 10, 75);

    if (chances <= 0) {
      chancesUsedThisLevel += 3; // Add 3 chances lost for this replay
      gameState = "LEVEL_END";
      endMessage = "LEVEL FAILED!";
      canShoot = false;
      setTimeout(startLevel, 1500);
    }

    if (hits >= lvl.hits) {
      chancesUsedThisLevel += (3 - chances); // Add remaining chances lost in this run
      const levelTime = Math.round((performance.now() - levelStartTime) / 1000); // Use performance.now() for accuracy
      levelStats.push({
        level: levelIndex + 1,
        time: levelTime,
        chancesUsed: chancesUsedThisLevel,
        replays: totalReplays
      });
      gameState = "LEVEL_END";
      endMessage = "LEVEL COMPLETE!";
      canShoot = false;
      levelIndex++;
      setTimeout(startLevel, 1500);
    }
  }

  // =====================
  // DRAW STATS TABLE (UPDATED)
  // =====================
  function drawStatsTable() {
    const totalStats = levelStats.reduce((acc, stat) => {
      acc.totalTime += stat.time; // Sum up total time across levels
      acc.totalChances += stat.chancesUsed; // Sum up total chances used across levels
      acc.totalReplays += stat.replays; // Sum up total replays across levels
      return acc;
    }, { totalTime: 0, totalChances: 0, totalReplays: 0 });

    ctx.fillStyle = "white";
    ctx.fillRect(50, 50, VIRTUAL_WIDTH - 100, VIRTUAL_HEIGHT - 100);

    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    ctx.fillText("Level", 100, 100);
    ctx.fillText("Time (s)", 200, 100);
    ctx.fillText("Chances Used", 300, 100); // Ensure correct column label
    ctx.fillText("Replays", 450, 100); // Ensure correct column label

    levelStats.forEach((stat, index) => {
      const y = 130 + index * 30;
      ctx.fillText(stat.level, 100, y);
      ctx.fillText(stat.time, 200, y); // Display distinct time for each level
      ctx.fillText(stat.chancesUsed, 300, y); // Display distinct chances used for each level
      ctx.fillText(stat.replays, 450, y); // Display distinct replays for each level
    });

    ctx.fillText("Summary:", 100, VIRTUAL_HEIGHT - 150);
    ctx.fillText(`Total Time: ${totalStats.totalTime}s`, 100, VIRTUAL_HEIGHT - 120);
    ctx.fillText(`Total Chances: ${totalStats.totalChances}`, 100, VIRTUAL_HEIGHT - 90);
    ctx.fillText(`Total Replays: ${totalStats.totalReplays}`, 100, VIRTUAL_HEIGHT - 60);
  }

  startLevel();
  setInterval(gameLoop, 1000/FPS);
});

