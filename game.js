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
  let userInfo = { name: "", age: "", sex: "", gamer: "" };

  // User info modal logic
  const userInfoModal = document.getElementById("userInfoModal");
  const userInfoForm = document.getElementById("userInfoForm");
  const userNameInput = document.getElementById("userName");
  const userAgeInput = document.getElementById("userAge");
  const userSexInput = document.getElementById("userSex");
  const userGamerInput = document.getElementById("userGamer");
  const userInfoError = document.getElementById("userInfoError");

  function showUserInfoModal() {
    userInfoModal.style.display = "flex";
  }
  function hideUserInfoModal() {
    userInfoModal.style.display = "none";
  }

  userInfoForm.addEventListener("submit", function(e) {
    e.preventDefault();
    userInfoError.style.display = "none";
    const name = userNameInput.value.trim();
    const age = userAgeInput.value.trim();
    const sex = userSexInput.value;
    const gamer = userGamerInput.value;
    if (!age || isNaN(Number(age)) || Number(age) < 1) {
      userInfoError.textContent = "Please enter a valid age.";
      userInfoError.style.display = "block";
      return;
    }
    if (!sex) {
      userInfoError.textContent = "Please select your sex.";
      userInfoError.style.display = "block";
      return;
    }
    if (!gamer) {
      userInfoError.textContent = "Please select if you often play games.";
      userInfoError.style.display = "block";
      return;
    }
    userInfo = { name, age, sex, gamer };
    hideUserInfoModal();
    startLevel();
    setInterval(gameLoop, 1000/FPS);
  });

  // Show modal before game starts
  showUserInfoModal();

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
    hideShareBtn();
  }

  // =====================
  // DRAW STATS TABLE (UPDATED)
  // =====================
  function drawStatsTable() {
    const tableX = 50;
    const tableY = 50;
    const tableWidth = VIRTUAL_WIDTH - 100;
    const tableHeight = VIRTUAL_HEIGHT - 100;
    ctx.fillStyle = "white";
    ctx.fillRect(tableX, tableY, tableWidth, tableHeight);

    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    ctx.fillText("Level", tableX + 50, tableY + 50);
    ctx.fillText("Time (s)", tableX + 150, tableY + 50);
    ctx.fillText("Chances Used", tableX + 270, tableY + 50);
    ctx.fillText("Replays", tableX + 420, tableY + 50);

    const totalStats = levelStats.reduce((acc, stat) => {
      acc.totalTime += stat.time; // Sum up total time across levels
      acc.totalChances += stat.chancesUsed; // Sum up total chances used across levels
      acc.totalReplays += stat.replays; // Sum up total replays across levels
      return acc;
    }, { totalTime: 0, totalChances: 0, totalReplays: 0 });

    levelStats.forEach((stat, index) => {
      const y = tableY + 80 + index * 30;
      ctx.fillText(stat.level, tableX + 50, y);
      ctx.fillText(stat.time, tableX + 150, y);
      ctx.fillText(stat.chancesUsed, tableX + 270, y);
      ctx.fillText(stat.replays, tableX + 420, y);
    });

    ctx.fillText("Summary:", tableX + 50, tableY + tableHeight - 120);
    ctx.fillText(`Total Time: ${totalStats.totalTime}s`, tableX + 50, tableY + tableHeight - 90);
    ctx.fillText(`Total Chances: ${totalStats.totalChances}`, tableX + 50, tableY + tableHeight - 60);
    ctx.fillText(`Total Replays: ${totalStats.totalReplays}`, tableX + 50, tableY + tableHeight - 30);

    // Draw user info in a box at the bottom right of the table, below the summary
    const infoBoxWidth = 320;
    const infoBoxHeight = 120;
    const infoBoxX = tableX + tableWidth - infoBoxWidth - 20;
    const infoBoxY = tableY + tableHeight - infoBoxHeight - 20;
    ctx.fillStyle = "#f2f2f2";
    ctx.fillRect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight);
    ctx.strokeStyle = "#bbb";
    ctx.strokeRect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight);
    ctx.fillStyle = "black";
    ctx.font = "18px Arial";
    ctx.fillText("User Info:", infoBoxX + 10, infoBoxY + 28);
    ctx.font = "16px Arial";
    ctx.fillText(`Name: ${userInfo.name ? userInfo.name : "(Not provided)"}`, infoBoxX + 10, infoBoxY + 50);
    ctx.fillText(`Age: ${userInfo.age}`, infoBoxX + 10, infoBoxY + 70);
    ctx.fillText(`Sex: ${userInfo.sex}`, infoBoxX + 10, infoBoxY + 90);
    ctx.fillText(`Often plays games: ${userInfo.gamer}`, infoBoxX + 10, infoBoxY + 110);
    ctx.font = "20px Arial";

    // Show share button
    const shareBtn = document.getElementById("shareBtn");
    if (shareBtn) shareBtn.style.display = "block";
  }

  // Hide share button when not on stats table
  function hideShareBtn() {
    const shareBtn = document.getElementById("shareBtn");
    if (shareBtn) shareBtn.style.display = "none";
  }

  // Share button logic
  function getStatsSummaryText() {
    let text = `Planet Shooter Game Results\n`;
    text += `--------------------------\n`;
    text += `User Info:\n`;
    text += `  Name: ${userInfo.name ? userInfo.name : "(Not provided)"}\n`;
    text += `  Age: ${userInfo.age}\n`;
    text += `  Sex: ${userInfo.sex}\n`;
    text += `  Often plays games: ${userInfo.gamer}\n`;
    text += `--------------------------\n`;
    text += `Level | Time(s) | Chances Used | Replays\n`;
    levelStats.forEach(stat => {
      text += `${stat.level}     | ${stat.time}      | ${stat.chancesUsed}           | ${stat.replays}\n`;
    });
    const totalStats = levelStats.reduce((acc, stat) => {
      acc.totalTime += stat.time;
      acc.totalChances += stat.chancesUsed;
      acc.totalReplays += stat.replays;
      return acc;
    }, { totalTime: 0, totalChances: 0, totalReplays: 0 });
    text += `--------------------------\n`;
    text += `Total Time: ${totalStats.totalTime}s\n`;
    text += `Total Chances: ${totalStats.totalChances}\n`;
    text += `Total Replays: ${totalStats.totalReplays}\n`;
    return text;
  }

  document.getElementById("shareBtn").addEventListener("click", function() {
    const summary = getStatsSummaryText();
    // Offer options for Email and WhatsApp
    const mailto = `mailto:?subject=My Planet Shooter Game Results&body=${encodeURIComponent(summary)}`;
    const whatsapp = `https://wa.me/?text=${encodeURIComponent(summary)}`;
    // Simple prompt for user to choose
    const shareChoice = window.prompt("Type 'email' to share via Email, 'whatsapp' to share via WhatsApp:");
    if (shareChoice && shareChoice.toLowerCase().includes("email")) {
      window.open(mailto, "_blank");
    } else if (shareChoice && shareChoice.toLowerCase().includes("whatsapp")) {
      window.open(whatsapp, "_blank");
    } else {
      // Optionally, copy to clipboard
      navigator.clipboard.writeText(summary);
      alert("Stats copied to clipboard! You can paste and share anywhere.");
    }
  });

});
