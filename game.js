document.addEventListener("DOMContentLoaded", () => {

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  /* =====================
     BASE GAME SIZE
  ===================== */
  const WIDTH = 800;
  const HEIGHT = 600;
  const FPS = 60;

  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function resizeCanvas() {
    const sw = window.innerWidth;
    const sh = window.innerHeight;

    canvas.width = sw;
    canvas.height = sh;

    scale = Math.min(sw / WIDTH, sh / HEIGHT);
    offsetX = (sw - WIDTH * scale) / 2;
    offsetY = (sh - HEIGHT * scale) / 2;
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  /* =====================
     COLORS (RESTORED)
  ===================== */
  const BG_COLOR = [120,120,120];
  const PLANET_LIGHT = "rgb(230,230,230)";
  const PLANET_DARK = "rgb(20,20,20)";
  const BASE_ENEMY_COLOR = [150,150,150];
  const BASE_BALL_COLOR = [200,200,200];

  const ENEMY_RADIUS = 100;

  /* =====================
     CONTRAST MAP (RESTORED)
  ===================== */
  const CONTRAST_MAP = [
    0.00, 0.20, 0.40, 0.50, 0.60,
    0.70, 0.70, 0.85, 0.85, 0.90
  ];

  /* =====================
     LEVEL DATA (RESTORED)
  ===================== */
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
     BACKGROUND PLANETS (RESTORED)
  ===================== */
  const bgPlanets = [
    [120,120,45,PLANET_LIGHT],
    [680,120,40,PLANET_DARK],
    [120,480,35,PLANET_DARK],
    [680,480,50,PLANET_LIGHT],
    [90,300,30,PLANET_LIGHT],
    [710,300,30,PLANET_DARK]
  ];

  /* =====================
     GAME STATE
  ===================== */
  let levelIndex = 0;
  let enemyAngle = 0;
  let attachedAngles = [];
  let shooting = false;
  let shotY = HEIGHT - 50;
  let chances = 3;
  let hits = 0;
  let canShoot = false;

  let gameState = "COUNTDOWN";
  let stateStartTime = 0;
  let endMessage = "";

  /* =====================
     HELPERS
  ===================== */
  function amblyopiaColor(base, bg, strength) {
    return `rgb(${base.map((v,i)=>
      Math.round(bg[i] + (v - bg[i]) * (1 - strength))
    ).join(",")})`;
  }

  function angleCollision(a1, a2) {
    let diff = Math.abs(a1 - a2) % 360;
    return diff < 14 || diff > 346;
  }

  function drawBackground() {
    ctx.fillStyle = `rgb(${BG_COLOR.join(",")})`;
    ctx.fillRect(0,0,WIDTH,HEIGHT);

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
      WIDTH/2 - m.width/2,
      HEIGHT/2 + size/2 + yOffset
    );
  }

  /* =====================
     LEVEL INIT
  ===================== */
  function startLevel() {
    if (levelIndex >= LEVELS.length) {
      gameState = "GAME_COMPLETE";
      return;
    }

    const lvl = LEVELS[levelIndex];
    enemyAngle = 0;
    chances = 3;
    hits = 0;
    shooting = false;
    shotY = HEIGHT - 50;

    attachedAngles = [];
    for (let i=0;i<lvl.balls;i++) {
      attachedAngles.push(i * (360 / lvl.balls));
    }

    gameState = "COUNTDOWN";
    stateStartTime = performance.now();
    canShoot = false;
  }

  /* =====================
     INPUT (DESKTOP + MOBILE)
  ===================== */
  function fire() {
    if (canShoot && !shooting && gameState === "PLAYING") {
      shooting = true;
      shotY = HEIGHT - 50;
    }
  }

  document.addEventListener("keydown", e=>{
    if (e.code === "Space") fire();
  });

  canvas.addEventListener("pointerdown", fire);

  /* =====================
     GAME LOOP
  ===================== */
  function gameLoop() {

    ctx.setTransform(scale,0,0,scale,offsetX,offsetY);
    drawBackground();

    const now = performance.now();

    if (gameState === "GAME_COMPLETE") {
      drawCenteredText("ALL LEVELS", 42, -10);
      drawCenteredText("COMPLETED", 42, 35);
      return;
    }

    if (gameState === "COUNTDOWN") {
      const t = now - stateStartTime;
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
    const strength = CONTRAST_MAP[levelIndex];

    const enemyColor = amblyopiaColor(BASE_ENEMY_COLOR, BG_COLOR, strength);
    const ballColor = amblyopiaColor(BASE_BALL_COLOR, BG_COLOR, strength);

    enemyAngle = (enemyAngle + lvl.speed + levelIndex * 0.08) % 360;

    // Enemy planet
    ctx.fillStyle = enemyColor;
    ctx.beginPath();
    ctx.arc(WIDTH/2, HEIGHT/2, ENEMY_RADIUS, 0, Math.PI*2);
    ctx.fill();

    // Attached balls
    attachedAngles.forEach(a=>{
      const r = (a + enemyAngle) * Math.PI/180;
      ctx.fillStyle = ballColor;
      ctx.beginPath();
      ctx.arc(
        WIDTH/2 + Math.cos(r)*ENEMY_RADIUS,
        HEIGHT/2 + Math.sin(r)*ENEMY_RADIUS,
        7,0,Math.PI*2
      );
      ctx.fill();
    });

    // Loaded ball
    if (!shooting) {
      ctx.beginPath();
      ctx.arc(WIDTH/2, HEIGHT-50, 7,0,Math.PI*2);
      ctx.fill();
    }

    // Shooting
    if (shooting) {
      shotY -= 12;
      ctx.beginPath();
      ctx.arc(WIDTH/2, shotY, 7,0,Math.PI*2);
      ctx.fill();

      if (shotY <= HEIGHT/2 + ENEMY_RADIUS) {
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
    ctx.font = "20px Arial";
    ctx.fillText(`Level: ${levelIndex+1}/10`,10,25);
    ctx.fillText(`Score: ${hits*10}`,10,50);
    ctx.fillText(`Chances: ${chances}`,10,75);

    if (chances <= 0) {
      gameState = "COUNTDOWN";
      startLevel();
    }

    if (hits >= lvl.hits) {
      levelIndex++;
      startLevel();
    }
  }

  startLevel();
  setInterval(gameLoop, 1000/FPS);
});

