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

    // ✅ FIT (NO CROP, NO ZOOM)
    scale = Math.min(sw / VW, sh / VH);

    offsetX = (sw - VW * scale) / 2;
    offsetY = (sh - VH * scale) / 2;
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  /* =====================
     CONSTANTS
  ===================== */
  const BG_COLOR = "rgb(120,120,120)";
  const ENEMY_RADIUS = 100;

  const LEVELS = [
    {speed:0.7, balls:1, hits:5},
    {speed:0.7, balls:2, hits:5},
    {speed:0.8, balls:3, hits:6},
    {speed:0.9, balls:3, hits:6},
    {speed:1.0, balls:4, hits:7}
  ];

  /* =====================
     BACKGROUND (SCREEN SPACE)
  ===================== */
  const bgPlanets = [
    [0.18,0.25,45],
    [0.82,0.25,40],
    [0.18,0.75,35],
    [0.82,0.75,50],
    [0.50,0.10,30],
    [0.50,0.90,30]
  ];

  function drawScreenBackground() {
    ctx.setTransform(1,0,0,1,0,0);

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle = "rgb(200,200,200)";
    bgPlanets.forEach(p=>{
      ctx.beginPath();
      ctx.arc(
        canvas.width  * p[0],
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
  let level = 0;
  let enemyAngle = 0;
  let attached = [];
  let shooting = false;
  let shotY = VH - 90;
  let chances = 3;
  let hits = 0;

  /* =====================
     INPUT
  ===================== */
  function fire() {
    if (!shooting) {
      shooting = true;
      shotY = VH - 90;
    }
  }

  canvas.addEventListener("pointerdown", fire);
  document.addEventListener("keydown", e=>{
    if (e.code==="Space") fire();
  });

  /* =====================
     GAME LOOP
  ===================== */
  function loop() {

    /* ---- SCREEN SPACE ---- */
    drawScreenBackground();

    /* ---- WORLD SPACE ---- */
    ctx.setTransform(scale,0,0,scale,offsetX,offsetY);

    const lvl = LEVELS[level];
    enemyAngle = (enemyAngle + lvl.speed) % 360;

    // Enemy planet
    ctx.fillStyle = "rgb(60,60,60)";
    ctx.beginPath();
    ctx.arc(VW/2, VH/2, ENEMY_RADIUS, 0, Math.PI*2);
    ctx.fill();

    // Attached balls
    ctx.fillStyle = "rgb(230,230,230)";
    attached.forEach(a=>{
      const r = (a + enemyAngle) * Math.PI/180;
      ctx.beginPath();
      ctx.arc(
        VW/2 + Math.cos(r)*ENEMY_RADIUS,
        VH/2 + Math.sin(r)*ENEMY_RADIUS,
        7, 0, Math.PI*2
      );
      ctx.fill();
    });

    // Shooting ball
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
        shooting = false;
        attached.push((90 - enemyAngle + 360) % 360);
        hits++;
      }
    }

    requestAnimationFrame(loop);
  }

  loop();
});

