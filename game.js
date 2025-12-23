document.addEventListener("DOMContentLoaded", () => {

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  /* =====================
     VIRTUAL WORLD
  ===================== */
  const VW = 800;
  const VH = 600;

  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function resizeCanvas() {
    const sw = window.innerWidth;
    const sh = window.innerHeight;

    canvas.width = sw;
    canvas.height = sh;

    scale = Math.min(sw / VW, sh / VH);

    // ✅ PERFECT CENTERING (FIXES LEFT SHIFT)
    offsetX = Math.round((sw - VW * scale) / 2);
    offsetY = Math.round((sh - VH * scale) / 2);
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  /* =====================
     CONSTANTS
  ===================== */
  const BG_COLOR = "rgb(120,120,120)";
  const ENEMY_RADIUS = 100;
  const FPS = 60;

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

  /* =====================
     BACKGROUND (SCREEN SPACE)
  ===================== */
  const bgPlanets = [
    [0.20,0.25,45],
    [0.80,0.25,40],
    [0.20,0.75,35],
    [0.80,0.75,50],
    [0.50,0.12,30],
    [0.50,0.88,30]
  ];

  function drawBackground() {
    ctx.setTransform(1,0,0,1,0,0);

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle = "rgb(200,200,200)";
    bgPlanets.forEach(p=>{
      ctx.beginPath();
      ctx.arc(
        canvas.width * p[0],
        canvas.height * p[1],
        p[2],
        0, Math.PI*2
      );
      ctx.fill();
    });
  }

  /* =====================
     GAME STATE
  ===================== */
  let levelIndex = 0;
  let enemyAngle = 0;
  let attachedAngles = [];
  let shooting = false;
  let shotY = VH - 90;
  let chances = 3;
  let hits = 0;

  let gameState = "COUNTDOWN";
  let stateStart = performance.now();
  let canShoot = false;

  /* =====================
     HELPERS
  ===================== */
  function angleCollision(a1, a2) {
    let diff = Math.abs(a1 - a2) % 360;
    return diff < 14 || diff > 346;
  }

  function drawCenteredText(txt, size=48, yOffset=0) {
    ctx.fillStyle = "black";
    ctx.font = `${size}px Arial`;
    const m = ctx.measureText(txt);
    ctx.fillText(
      txt,
      VW/2 - m.width/2,
      VH/2 + size/2 + yOffset
    );
  }

  function startLevel() {
    if (levelIndex >= LEVELS.length) {
      gameState = "GAME_COMPLETE";
      return;
    }

    const lvl = LEVELS[levelIndex];
    enemyAngle = 0;
    attachedAngles = [];
    shooting = false;
    shotY = VH - 90;
    chances = 3;
    hits = 0;

    for (let i=0;i<lvl.balls;i++) {
      attachedAngles.push(i * (360 / lvl.balls));
    }

    gameState = "COUNTDOWN";
    stateStart = performance.now();
    canShoot = false;
  }

  /* =====================
     INPUT (DESKTOP + MOBILE)
  ===================== */
  function fire() {
    if (canShoot && !shooting && gameState === "PLAYING") {
      shooting = true;
      shotY = VH - 90;
    }
  }

  canvas.addEventListener("pointerdown", fire);
  document.addEventListener("keydown", e=>{
    if (e.code === "Space") fire();
  });

  /* =====================
     MAIN LOOP
  ===================== */
  function gameLoop() {

    drawBackground();

    ctx.setTransform(scale,0,0,scale,offsetX,offsetY);

    const now = performance.now();

    if (gameState === "GAME_COMPLETE") {
      drawCenteredText("ALL LEVELS", 42, -10);
      drawCenteredText("COMPLETED", 42, 35);
      return;
    }

    if (gameState === "COUNTDOWN") {
      const t = now - stateStart;
      let txt =
        t < 800  ? "3" :
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

    const lvl = LEVELS[levelIndex];

    enemyAngle = (enemyAngle + lvl.speed) % 360;

    // Enemy planet
    ctx.fillStyle = "rgb(60,60,60)";
    ctx.beginPath();
    ctx.arc(VW/2, VH/2, ENEMY_RADIUS, 0, Math.PI*2);
    ctx.fill();

    // Attached balls
    ctx.fillStyle = "rgb(230,230,230)";
    attachedAngles.forEach(a=>{
      const r = (a + enemyAngle) * Math.PI/180;
      ctx.beginPath();
      ctx.arc(
        VW/2 + Math.cos(r)*ENEMY_RADIUS,
        VH/2 + Math.sin(r)*ENEMY_RADIUS,
        7, 0, Math.PI*2
      );
      ctx.fill();
    });

    // Loaded ball
    if (!shooting) {
      ctx.beginPath();
      ctx.arc(VW/2, VH-90, 7, 0, Math.PI*2);
      ctx.fill();
    }

    // Shooting
    if (shooting) {
      shotY -= 12;
      ctx.beginPath();
      ctx.arc(VW/2, shotY, 7, 0, Math.PI*2);
      ctx.fill();

      if (shotY <= VH/2 + ENEMY_RADIUS) {
        shooting = false;
        const hitAngle = (90 - enemyAngle + 360) % 360;

        if (attachedAngles.some(a=>angleCollision(hitAngle,a))) {
          chances--;
        } else {
          attachedAngles.push(hitAngle);
          hits++;
        }
      }
    }

    // HUD
    ctx.fillStyle = "black";
    ctx.font = "18px Arial";
    ctx.fillText(`Level ${levelIndex+1}/10`, 15, 25);
    ctx.fillText(`Score ${hits*10}`, 15, 45);
    ctx.fillText(`Chances ${chances}`, 15, 65);

    // Fail
    if (chances <= 0) {
      gameState = "COUNTDOWN";
      stateStart = performance.now();
      startLevel();
    }

    // Win
    if (hits >= lvl.hits) {
      levelIndex++;
      startLevel();
    }

    requestAnimationFrame(gameLoop);
  }

  startLevel();
  gameLoop();
});

