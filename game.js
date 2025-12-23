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
  const BASE_ENEMY_COLOR = [150,150,150];
  const BASE_BALL_COLOR = [200,200,200];
  const ENEMY_RADIUS = 100;

  const CONTRAST_MAP = [0,0.3,0.4,0.5,0.65,0.75,0.8,0.85,0.9,0.95];

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

  // =====================
  // STATS TRACKING
  // =====================
  let levelStats = [];
  let levelStartTime = 0;
  let levelReplays = 0;

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
  }

  function drawCenteredText(txt, y, size=24) {
    ctx.fillStyle = "black";
    ctx.font = `${size}px Arial`;
    ctx.fillText(txt, VIRTUAL_WIDTH/2 - ctx.measureText(txt).width/2, y);
  }

  // =====================
  // LEVEL INIT
  // =====================
  function startLevel() {
    enemyAngle = 0;
    chances = 3;
    hits = 0;
    shooting = false;
    shotY = VIRTUAL_HEIGHT - 50;

    const lvl = LEVELS[levelIndex];
    attachedAngles = [];
    for (let i=0;i<lvl.balls;i++) {
      attachedAngles.push(i * (360 / lvl.balls));
    }

    gameState = "COUNTDOWN";
    stateStartTime = performance.now();
    canShoot = false;
  }

  // =====================
  // INPUT
  // =====================
  document.addEventListener("keydown", e=>{
    if (e.code==="Space" && canShoot && !shooting && gameState==="PLAYING") {
      shooting = true;
      shotY = VIRTUAL_HEIGHT - 50;
    }
  });

  canvas.addEventListener("touchstart", e=>{
    e.preventDefault();
    if (canShoot && !shooting && gameState==="PLAYING") {
      shooting = true;
      shotY = VIRTUAL_HEIGHT - 50;
    }
  },{passive:false});

  // =====================
  // FINAL TABLE
  // =====================
  function drawStatsTable() {
    ctx.fillStyle = "white";
    ctx.fillRect(50,50,700,500);
    ctx.strokeRect(50,50,700,500);

    ctx.fillStyle = "black";
    ctx.font = "18px Arial";

    let y = 90;
    ctx.fillText("Level | Time(s) | Chances Used | Replays", 120, y);
    y += 30;

    let totalTime = 0;
    let totalChances = 0;
    let totalReplays = 0;

    levelStats.forEach(s=>{
      ctx.fillText(
        `${s.level}      ${s.time.toFixed(2)}        ${s.chancesUsed}              ${s.replays}`,
        120, y
      );
      y += 28;
      totalTime += s.time;
      totalChances += s.chancesUsed;
      totalReplays += s.replays;
    });

    y += 20;
    ctx.fillText(`TOTAL TIME: ${totalTime.toFixed(2)} sec`,120,y+=30);
    ctx.fillText(`TOTAL CHANCES USED: ${totalChances}`,120,y+=30);
    ctx.fillText(`TOTAL REPLAYS: ${totalReplays}`,120,y+=30);
  }

  // =====================
  // GAME LOOP
  // =====================
  function gameLoop() {
    drawBackground();
    const now = performance.now();

    if (gameState==="GAME_COMPLETE") {
      drawStatsTable();
      return;
    }

    if (gameState==="COUNTDOWN") {
      const t = now - stateStartTime;
      const txt = t<800?"3":t<1600?"2":t<2400?"1":t<3200?"START":"";
      if (txt) drawCenteredText(txt,VIRTUAL_HEIGHT/2,48);
      else {
        gameState="PLAYING";
        canShoot=true;
        levelStartTime = performance.now();
      }
      return;
    }

    const lvl = LEVELS[levelIndex];
    const strength = CONTRAST_MAP[levelIndex];

    enemyAngle = (enemyAngle + lvl.speed) % 360;

    ctx.fillStyle = amblyopiaColor(BASE_ENEMY_COLOR,BG_COLOR,strength);
    ctx.beginPath();
    ctx.arc(VIRTUAL_WIDTH/2,VIRTUAL_HEIGHT/2,ENEMY_RADIUS,0,Math.PI*2);
    ctx.fill();

    ctx.fillStyle = amblyopiaColor(BASE_BALL_COLOR,BG_COLOR,strength);
    attachedAngles.forEach(a=>{
      const r=(a+enemyAngle)*Math.PI/180;
      ctx.beginPath();
      ctx.arc(
        VIRTUAL_WIDTH/2+Math.cos(r)*ENEMY_RADIUS,
        VIRTUAL_HEIGHT/2+Math.sin(r)*ENEMY_RADIUS,
        7,0,Math.PI*2
      );
      ctx.fill();
    });

    if (!shooting) {
      ctx.beginPath();
      ctx.arc(VIRTUAL_WIDTH/2,VIRTUAL_HEIGHT-50,7,0,Math.PI*2);
      ctx.fill();
    }

    if (shooting) {
      shotY -= 12;
      ctx.beginPath();
      ctx.arc(VIRTUAL_WIDTH/2,shotY,7,0,Math.PI*2);
      ctx.fill();

      if (shotY<=VIRTUAL_HEIGHT/2+ENEMY_RADIUS) {
        shooting=false;
        const hitAngle=(90-enemyAngle+360)%360;
        if (attachedAngles.some(a=>angleCollision(hitAngle,a))) chances--;
        else {attachedAngles.push(hitAngle);hits++;}
      }
    }

    if (chances<=0) {
      levelReplays++;
      startLevel();
    }

    if (hits>=lvl.hits) {
      const timeTaken = (performance.now()-levelStartTime)/1000;
      levelStats.push({
        level: levelIndex+1,
        time: timeTaken,
        chancesUsed: 3 - chances,
        replays: levelReplays
      });
      levelReplays = 0;
      levelIndex++;
      if (levelIndex>=LEVELS.length) gameState="GAME_COMPLETE";
      else startLevel();
    }
  }

  startLevel();
  setInterval(gameLoop,1000/FPS);
});

