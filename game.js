document.addEventListener("DOMContentLoaded", () => {

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  // =====================
  // GOOGLE SHEET CONFIG
  // =====================
  const GOOGLE_SHEET_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzwevpxQZ_tDUDYOZAx3deIEsuCavlb2CyiPh25dapltiSkPjOUJ6WMivK6nndNexWPlg/exec";

  // =====================
  // CREATE SUBMIT BUTTON
  // =====================
  const submitBtn = document.createElement("button");
  submitBtn.id = "submitResultsBtn";
  submitBtn.textContent = "Submit Results";
  submitBtn.style.position = "absolute";
  submitBtn.style.bottom = "20px";
  submitBtn.style.left = "50%";
  submitBtn.style.transform = "translateX(-50%)";
  submitBtn.style.padding = "12px 26px";
  submitBtn.style.fontSize = "18px";
  submitBtn.style.cursor = "pointer";
  submitBtn.style.display = "none";
  document.body.appendChild(submitBtn);

  submitBtn.addEventListener("click", submitResultsToGoogleSheet);

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

  // =====================
  // CONTRAST MAP
  // =====================
  const CONTRAST_MAP = [0.00,0.30,0.40,0.50,0.65,0.75,0.80,0.85,0.90,0.95];

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
  // STATS
  // =====================
  const levelStats = [];
  let totalReplays = 0;
  let levelStartTime = 0;
  let chancesUsedThisLevel = 0;

  // =====================
  // USER INFO (FROM MODAL)
  // =====================
  let userInfo = { name:"", age:"", sex:"", gamer:"" };

  // =====================
  // HELPERS
  // =====================
  function amblyopiaColor(base, bg, strength) {
    return `rgb(${base.map((v,i)=>
      Math.round(bg[i] + (v-bg[i])*(1-strength))
    ).join(",")})`;
  }

  function drawBackground() {
    ctx.fillStyle = `rgb(${BG_COLOR.join(",")})`;
    ctx.fillRect(0,0,VIRTUAL_WIDTH,VIRTUAL_HEIGHT);
  }

  function drawCenteredText(txt, size=40, yOffset=0) {
    ctx.fillStyle = "black";
    ctx.font = `${size}px Arial`;
    const m = ctx.measureText(txt);
    ctx.fillText(txt, VIRTUAL_WIDTH/2 - m.width/2, VIRTUAL_HEIGHT/2 + yOffset);
  }

  // =====================
  // LEVEL INIT
  // =====================
  function startLevel() {
    if (levelIndex >= LEVELS.length) {
      gameState = "GAME_COMPLETE";
      return;
    }
    enemyAngle = 0;
    chances = 3;
    hits = 0;
    attachedAngles = [];
    shooting = false;
    shotY = VIRTUAL_HEIGHT - 50;
    chancesUsedThisLevel = 0;
    levelStartTime = performance.now();
    gameState = "COUNTDOWN";
    stateStartTime = performance.now();
  }

  // =====================
  // INPUT
  // =====================
  document.addEventListener("keydown", e => {
    if (e.code === "Space" && canShoot && !shooting && gameState==="PLAYING") {
      shooting = true;
    }
  });

  // =====================
  // GAME LOOP
  // =====================
  function gameLoop() {
    drawBackground();

    if (gameState === "GAME_COMPLETE" || gameState === "GAME_QUIT") {
      drawStatsTable();
      submitBtn.style.display = "block";
      return;
    }

    submitBtn.style.display = "none";

    requestAnimationFrame(gameLoop);
  }

  // =====================
  // DRAW STATS TABLE
  // =====================
  function drawStatsTable() {
    ctx.fillStyle = "white";
    ctx.fillRect(50,50,VIRTUAL_WIDTH-100,VIRTUAL_HEIGHT-100);
    ctx.fillStyle = "black";
    ctx.font = "26px Arial";
    ctx.fillText("GAME RESULTS", 280, 90);
  }

  // =====================
  // COLLECT DATA
  // =====================
  function collectStatsForSheet() {
    const totals = levelStats.reduce((a,s)=>{
      a.time+=s.time; a.chances+=s.chancesUsed; a.replays+=s.replays;
      return a;
    },{time:0,chances:0,replays:0});

    return {
      level: levelStats.map(s=>s.level).join(","),
      time: levelStats.map(s=>s.time).join(","),
      chancesUsed: levelStats.map(s=>s.chancesUsed).join(","),
      replays: levelStats.map(s=>s.replays).join(","),
      totalTime: totals.time,
      totalChances: totals.chances,
      totalReplays: totals.replays,
      name: userInfo.name,
      age: userInfo.age,
      sex: userInfo.sex,
      gamer: userInfo.gamer
    };
  }

  // =====================
  // SEND TO GOOGLE SHEET
  // =====================
  function submitResultsToGoogleSheet() {
    fetch(GOOGLE_SHEET_WEBAPP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(collectStatsForSheet())
    });
    alert("Results submitted successfully!");
  }

  // =====================
  // START GAME LOOP
  // =====================
  startLevel();
  gameLoop();

});

