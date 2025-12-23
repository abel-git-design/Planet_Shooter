document.addEventListener("DOMContentLoaded", () => {

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

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
    {speed:1.0, balls:4, hits:7},
    {speed:1.0, balls:4, hits:8},
    {speed:1.0, balls:4, hits:9},
    {speed:1.0, balls:4, hits:10},
    {speed:1.0, balls:4, hits:11},
    {speed:1.0, balls:4, hits:12}
  ];

  // =====================
  // DATA COLLECTION
  // =====================
  const SERVER_URL = "http://localhost:3000/log";

  function getUserId() {
    let id = localStorage.getItem("planet_user_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("planet_user_id", id);
    }
    return id;
  }

  const USER_ID = getUserId();

  let sessionStart = performance.now();
  let levelStart = 0;

  let totalErrors = 0;
  let totalReplays = 0;
  let levelsCompleted = 0;

  function send(event, payload) {
    fetch(SERVER_URL, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        userId: USER_ID,
        event,
        ...payload
      })
    }).catch(()=>{});
  }

  window.addEventListener("beforeunload", () => {
    send("game_quit", {
      level: levelIndex + 1,
      totalErrors,
      totalReplays,
      totalTimeSec: ((performance.now()-sessionStart)/1000).toFixed(2)
    });
  });

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

  function startLevel() {
    enemyAngle = 0;
    chances = 3;
    hits = 0;
    shooting = false;
    attachedAngles = [];
    levelStart = performance.now();

    for (let i=0;i<LEVELS[levelIndex].balls;i++) {
      attachedAngles.push(i * (360/LEVELS[levelIndex].balls));
    }

    gameState = "COUNTDOWN";
    stateStartTime = performance.now();
  }

  function angleCollision(a1,a2) {
    const d = Math.abs(a1-a2)%360;
    return d<14||d>346;
  }

  document.addEventListener("keydown", e=>{
    if(e.code==="Space" && canShoot && !shooting) shooting=true;
  });

  canvas.addEventListener("touchstart", e=>{
    e.preventDefault();
    if(canShoot && !shooting) shooting=true;
  },{passive:false});

  function gameLoop() {
    ctx.fillStyle=`rgb(${BG_COLOR.join(",")})`;
    ctx.fillRect(0,0,VIRTUAL_WIDTH,VIRTUAL_HEIGHT);

    const now = performance.now();

    if(gameState==="COUNTDOWN"){
      if(now-stateStartTime>3000){
        gameState="PLAYING";
        canShoot=true;
      }
      return;
    }

    const lvl = LEVELS[levelIndex];
    enemyAngle += lvl.speed;

    if(shooting){
      shotY -= 12;
      if(shotY <= VIRTUAL_HEIGHT/2 + ENEMY_RADIUS){
        shooting=false;
        shotY = VIRTUAL_HEIGHT-50;
        const hitAngle = (90-enemyAngle+360)%360;
        if(attachedAngles.some(a=>angleCollision(a,hitAngle))){
          chances--;
          totalErrors++;
        } else {
          attachedAngles.push(hitAngle);
          hits++;
        }
      }
    }

    if(chances<=0){
      totalReplays++;
      send("level_failed",{
        level: levelIndex+1,
        levelTimeSec: ((performance.now()-levelStart)/1000).toFixed(2),
        totalErrors,
        totalReplays
      });
      startLevel();
    }

    if(hits>=lvl.hits){
      levelsCompleted++;
      send("level_complete",{
        level: levelIndex+1,
        levelTimeSec: ((performance.now()-levelStart)/1000).toFixed(2),
        totalErrors,
        totalReplays
      });
      levelIndex++;
      if(levelIndex>=LEVELS.length){
        send("game_summary",{
          totalTimeSec: ((performance.now()-sessionStart)/1000).toFixed(2),
          totalErrors,
          totalReplays,
          levelsCompleted
        });
        return;
      }
      startLevel();
    }
  }

  startLevel();
  setInterval(gameLoop,1000/FPS);
});

