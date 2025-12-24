document.addEventListener("DOMContentLoaded", () => {

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  // =====================
  // GOOGLE SHEET CONFIG
  // =====================
  const GOOGLE_SHEET_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzwevpxQZ_tDUDYOZAx3deIEsuCavlb2CyiPh25dapltiSkPjOUJ6WMivK6nndNexWPlg/exec" ;

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
  let isReplay = false;

  // =====================
  // GAME STATS
  // =====================
  const levelStats = [];
  let totalReplays = 0;
  let levelStartTime = 0;
  let chancesUsedThisLevel = 0;

  // =====================
  // USER INFO
  // =====================
  let userInfo = { name: "", age: "", sex: "", gamer: "" };

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

  function drawCenteredText(txt, size=48, yOffset=0) {
    ctx.fillStyle = "black";
    ctx.font = `${size}px Arial`;
    const m = ctx.measureText(txt);
    ctx.fillText(txt, VIRTUAL_WIDTH/2 - m.width/2, VIRTUAL_HEIGHT/2 + yOffset);
  }

  function drawCleanOverlay() {
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillRect(0, VIRTUAL_HEIGHT/2 - 90, VIRTUAL_WIDTH, 180);
  }

  // =====================
  // SUBMIT BUTTON (AUTO CREATE)
  // =====================
  const submitBtn = document.createElement("button");
  submitBtn.textContent = "Submit Results";
  submitBtn.style.position = "absolute";
  submitBtn.style.bottom = "20px";
  submitBtn.style.left = "50%";
  submitBtn.style.transform = "translateX(-50%)";
  submitBtn.style.padding = "12px 24px";
  submitBtn.style.fontSize = "18px";
  submitBtn.style.display = "none";
  document.body.appendChild(submitBtn);

  submitBtn.addEventListener("click", submitResultsToGoogleSheet);

  // =====================
  // COLLECT STATS
  // =====================
  function collectStatsForSheet() {
    const totalStats = levelStats.reduce((acc, stat) => {
      acc.totalTime += stat.time;
      acc.totalChances += stat.chancesUsed;
      acc.totalReplays += stat.replays;
      return acc;
    }, { totalTime: 0, totalChances: 0, totalReplays: 0 });

    return {
      level: levelStats.map(s => s.level).join(","),
      time: levelStats.map(s => s.time).join(","),
      chancesUsed: levelStats.map(s => s.chancesUsed).join(","),
      replays: levelStats.map(s => s.replays).join(","),

      totalTime: totalStats.totalTime,
      totalChances: totalStats.totalChances,
      totalReplays: totalStats.totalReplays,

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
  // DRAW STATS TABLE
  // =====================
  function drawStatsTable() {
    drawCleanOverlay();
    drawCenteredText("GAME RESULTS", 36, -100);
    submitBtn.style.display = "block";
  }

  // =====================
  // GAME LOOP (END STATES ONLY SHOWN)
  // =====================
  function gameLoop() {
    drawBackground();
    if (gameState === "GAME_COMPLETE" || gameState === "GAME_QUIT") {
      drawStatsTable();
      return;
    }
  }

});

