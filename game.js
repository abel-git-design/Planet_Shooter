document.addEventListener("DOMContentLoaded", () => {

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  // =====================
  // VIRTUAL WORLD (FIXED)
  // =====================
  const VW = 800;
  const VH = 600;

  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function resizeCanvas() {
    const sw = window.innerWidth;
    const sh = window.innerHeight;

    scale = Math.max(sw / VW, sh / VH);

    canvas.width = sw;
    canvas.height = sh;

    offsetX = (sw - VW * scale) / 2;
    offsetY = (sh - VH * scale) / 2;

    ctx.setTransform(scale, 0, 0, scale, offsetX / scale, offsetY / scale);
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // =====================
  // CONSTANTS
  // =====================
  const BG_COLOR = [120,120,120];
  const PLANET_LIGHT = "rgb(230,230,230)";
  const PLANET_DARK  = "rgb(20,20,20)";
  const BASE_ENEMY_COLOR = [150,150,150];
  const BASE_BALL_COLOR  = [200,200,200];

  const ENEMY_RADIUS = 100;

  const CONTRAST_MAP = [
    0.00, 0.20, 0.40, 0.50, 0.60,
    0.70, 0.70, 0.85, 0.85, 0.90
  ];

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
  // BACKGROUND PLANETS (closer, balanced)
  // =====================
  const bgPlanets = [
    [180,150,45,PLANET_LIGHT],
    [620,150,40,PLANET_DARK],
    [180,450,35,PLANET_DARK],
    [620,450,50,PLANET_LIGHT],
    [110,300,30,PLANET_LIGHT],
    [690,300,30,PLANET_DARK]
  ];

  // =====================
  // GAME STATE
  // =====================
  let levelIndex = 0;
  let enemyAngle = 0;
  let attachedAngles = [];
  let shooting = false;
  let shotY = VH - 90;
  let chances = 3;
  let hits = 0;
  let canShoot = false;

  let gameState = "COUNTDOWN";
  let stateStart = 0;
  let endMessage = "";

  // =====================
  // HELPERS
  // =====================
  function amblyopiaColor(base, bg, s) {
    return `rgb(${base.map((v,i)=>Math.round(bg[i] + (v-bg[i])*(1-s))).join(",")})`;
  }

  function angleCollision(a1, a2) {
    let d = Math.abs(a1 - a2) % 360;
    return d < 14 || d > 346;
  }

  function drawBackground() {
    ctx.fillStyle = `rgb(${BG_COLOR.join(",")})`;
    ctx.fillRect(-offsetX/scale, -offsetY/scale,
                 canvas.width/scale, canvas.height/scale);

    bgPlanets.forEach(p=>{
      ctx.fillStyle = p[3];
      ctx.beginPath();
      ctx.arc(p[0], p[1], p[2], 0, Math.PI*2);
      ctx.fill();
    });
  }

  function drawCenteredText(lines) {
    ctx.fillStyle = "black";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    lines.forEach((t,i)=>{
      ctx.fillText(t, VW/2, VH/2 + i*50);
    });
  }

  // =====================
  // LEVEL INIT
  // =====================
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
    shotY = VH - 90;

    attachedAngles = [];
    for (let i=0;i<lvl.balls;i++) {
      attachedAngles.push(i * (360/lvl.balls));
    }

    gameState = "COUNTDOWN";
    stateStart = performance.now();
    canShoot = false;
  }

  // =====================
  // INPUT (desktop + mobile)
  // =====================
  function fire() {
    if (canShoot && !shooting && gameState==="PLAYING") {
      shooting = true;
      shotY = VH - 90;
    }
  }

  document.addEventListener("keydown", e=>{
    if (e.code==="Space") fire();
  });

  canvas.addEventListener("pointerdown", fire);

  // =====================
  // GAME LOOP
  // =====================
  function loop() {
    drawBackground();
    const now = performance.now();

    if (gameState==="GAME_COMPLETE") {
      drawCenteredText(["ALL LEVELS","COMPLETED"]);
      requestAnimationFrame(loop);
      return;
    }

    if (gameState==="COUNTDOWN") {
      const t = now - stateStart;
      const txt = t<800?"3":t<1600?"2":t<2400?"1":t<3200?"START":"";
      if (txt) drawCenteredText([txt]);
      else { gameState="PLAYING"; canShoot=true; }
      requestAnimationFrame(loop);
      return;
    }

    if (gameState==="LEVEL_END") {
      drawCenteredText([endMessage]);
      requestAnimationFrame(loop);
      return;
    }

    const lvl = LEVELS[levelIndex];
    const strength = CONTRAST_MAP[levelIndex];
    const enemyColor = amblyopiaColor(BASE_ENEMY_COLOR, BG_COLOR, strength);
    const ballColor  = amblyopiaColor(BASE_BALL_COLOR, BG_COLOR, strength);

    enemyAngle = (enemyAngle + lvl.speed + levelIndex*0.08) % 360;

    ctx.fillStyle = enemyColor;
    ctx.beginPath();
    ctx.arc(VW/2, VH/2, ENEMY_RADIUS, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = ballColor;
    attachedAngles.forEach(a=>{
      const r = (a + enemyAngle)*Math.PI/180;
      ctx.beginPath();
      ctx.arc(VW/2 + Math.cos(r)*ENEMY_RADIUS,
              VH/2 + Math.sin(r)*ENEMY_RADIUS, 7, 0, Math.PI*2);
      ctx.fill();
    });

    if (!shooting) {
      ctx.beginPath();
      ctx.arc(VW/2, VH-90, 7, 0, Math.PI*2);
      ctx.fill();
    }

    if (shooting) {
      shotY -= 12;
      ctx.beginPath();
      ctx.arc(VW/2, shotY, 7, 0, Math.PI*2);
      ctx.fill();

      if (shotY <= VH/2 + ENEMY_RADIUS) {
        shooting=false;
        const hitAngle = (90 - enemyAngle + 360) % 360;
        if (attachedAngles.some(a=>angleCollision(hitAngle,a))) chances--;
        else { attachedAngles.push(hitAngle); hits++; }
      }
    }

    ctx.fillStyle="black";
    ctx.font="20px Arial";
    ctx.textAlign="left";
    ctx.fillText(`Level: ${levelIndex+1}/10`,10,25);
    ctx.fillText(`Score: ${hits*10}`,10,50);
    ctx.fillText(`Chances: ${chances}`,10,75);

    if (chances<=0) {
      gameState="LEVEL_END";
      endMessage="LEVEL FAILED!";
      canShoot=false;
      setTimeout(startLevel,1500);
    }

    if (hits>=lvl.hits) {
      gameState="LEVEL_END";
      endMessage="LEVEL COMPLETE!";
      canShoot=false;
      levelIndex++;
      setTimeout(startLevel,1500);
    }

    requestAnimationFrame(loop);
  }

  startLevel();
  loop();
});

