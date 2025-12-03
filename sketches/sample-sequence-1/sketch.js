import { createEngine } from "../_shared/engine.js";
import { Spring } from "../_shared/spring.js";

const { renderer, input, math, run, finish } = createEngine();
const { ctx, canvas } = renderer;

canvas.style.cursor = "none"; // hide the default cursor

// HAND SVG AS CUSTOM CURSOR
const handImage = new Image();
handImage.src = "assets/hand.svg";
let handLoaded = false;
handImage.onload = () => (handLoaded = true);

// Scale of the SVG (viewBox 1640x2360)
const handScale = 0.3;

// Where the mouse should sit on the hand image (image space coords)
const handCursorOffset = { x: 820, y: 1300 };

// Where the halo should sit (the “small stick” tip) in image space
const haloHotspotOffset = { x: 900, y: 750 }; // tweak after visual check

// This will store the halo tip position in canvas space each frame
let haloTip = { x: 0, y: 0 };

function drawHandCursor() {
  if (!isMouseOverCanvas || !handLoaded) return;

  const baseW = 1640;
  const baseH = 2360;
  const w = baseW * handScale;
  const h = baseH * handScale;

  // Place the hand so mouse is at handCursorOffset
  const x = mouse.x - handCursorOffset.x * handScale;
  const y = mouse.y - handCursorOffset.y * handScale;

  // Compute the stick tip position in canvas space
  haloTip.x = x - 290 + haloHotspotOffset.x * handScale;
  haloTip.y = y - 60 + haloHotspotOffset.y * handScale;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(handImage, x, y, w, h);
  ctx.restore();
}

run(update);

// --------------------------------------------------------
// IMAGE DE LA BOUGIE
// --------------------------------------------------------
const candleImage = new Image();
candleImage.src = "assets/candle.svg";
let candleLoaded = false;
candleImage.onload = () => (candleLoaded = true);

// --------------------------------------------------------
// SPRINGS
// --------------------------------------------------------
const maskSpring = new Spring({ position: 0, frequency: 2, halfLife: 0.3 });
const flameSpring = new Spring({ position: 1, frequency: 1.5, halfLife: 0.3 });
const heatHaloSpring = new Spring({
  position: 0,
  frequency: 3,
  halfLife: 0.25,
});

// --------------------------------------------------------
// SOURIS
// --------------------------------------------------------
let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
let isMouseOverCanvas = false;

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) * canvas.width) / rect.width;
  mouse.y = ((e.clientY - rect.top) * canvas.height) / rect.height;
  isMouseOverCanvas = true;
});
canvas.addEventListener("mouseleave", () => (isMouseOverCanvas = false));

// --------------------------------------------------------
// PARAMS + VERROU DE FLAMME
// --------------------------------------------------------
let heat = 0;
const heatUpSpeed = 0.06;
const triggerDistance = 130;

let flameUnlocked = false;

// Fumée
const smokeParticles = [];
class SmokeParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vy = -0.5 - Math.random() * 0.5;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.size = 1 + Math.random() * 0.1;
    this.life = 2;
    this.opacity = Math.min(1, Math.max(0, 0.5 + Math.random() * 0.5));
  }
  update(dt) {
    this.y += this.vy * dt * 60;
    this.x += this.vx * dt * 60;
    this.size += 0.2 * dt * 60;
    this.life -= 0.01 * dt * 60;
  }
  draw(ctx) {
    ctx.fillStyle = `rgba(255,255,255, ${this.opacity * this.life})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --------------------------------------------------------
// FUNC FLICKER (candle-like)
// --------------------------------------------------------
function getCandleFlicker(base = 1) {
  const t = Date.now() * 0.001;
  const slow = Math.sin(t * 1.1) * 0.05;
  const mid = Math.sin(t * 7.3) * 0.08;
  const fast = Math.sin(t * 13.7 + Math.random() * 0.5) * 0.04;
  const noise = (Math.random() - 0.5) * 0.06;
  return base + slow + mid + fast + noise; // autour de base ± ~0.2
}

// --------------------------------------------------------
// UPDATE
// --------------------------------------------------------
let haloDrawn = false; // Track if the halo has been drawn at least once
let timeSinceUnlock = 0; // delay smoke near the candle at the beginning
const minSmokeDistanceFromWick = 90; // no smoke too close to the wick
const wickSmokeDelay = 1.2; // seconds after unlock before wick smoke starts

function update(dt) {
  // Always draw background and cursor so the screen isn’t white
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawHandCursor();

  // If candle not ready, still draw halo/reveal aligned to hand tip
  if (!candleLoaded) {
    drawPermanentFlameHalo();
    drawTorchReveal();
    return;
  }

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  // BOUGIE
  const candleWidth = 300;
  const candleHeight = 600;
  const candleX = centerX - candleWidth / 2;
  const candleY = centerY - candleHeight / 2;

  // FONTE
  const maskValue = maskSpring.position;
  const meltOffset = Math.pow(maskValue, 1) * candleHeight;

  // MÈCHE (placée en haut + suit la fonte totalement)
  const wickX = centerX + 90; // adjust according to your SVG
  const wickY = candleY + meltOffset;

  // distance from halo tip (not raw cursor) to wick
  const dx = haloTip.x - wickX;
  const dy = haloTip.y - wickY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const isNearWick = dist < triggerDistance;

  // 🔥 VERROUILLAGE
  if (isNearWick) flameUnlocked = true;
  if (flameUnlocked) {
    timeSinceUnlock += dt;
  } else {
    timeSinceUnlock = 0;
  }

  heatHaloSpring.target = flameUnlocked ? 1 : isNearWick ? 1 : 0;
  heatHaloSpring.step(dt);

  if (flameUnlocked) {
    heat += heatUpSpeed * dt * (1 - heat);
    heat = Math.min(1, heat);
  }

  maskSpring.target = heat;
  maskSpring.step(dt);

  flameSpring.target = 1;
  flameSpring.step(dt);

  // Fumée - cursor halo (now emitted at halo tip)
  if (
    flameUnlocked &&
    flameSpring.position > 0.03 &&
    dist > minSmokeDistanceFromWick &&
    Math.random() < 0.08
  ) {
    smokeParticles.push(new SmokeParticle(haloTip.x, haloTip.y));
  }

  // Fumée - wick halo
  if (
    flameUnlocked &&
    timeSinceUnlock > wickSmokeDelay &&
    heatHaloSpring.position > 0.2 &&
    Math.random() < 0.05
  ) {
    smokeParticles.push(new SmokeParticle(wickX, wickY - 5));
  }

  // ---------------------- FUMÉE ------------------------
  ctx.save();
  ctx.filter = "blur(1px)";
  for (let i = smokeParticles.length - 1; i >= 0; i--) {
    smokeParticles[i].update(dt);
    smokeParticles[i].draw(ctx);
    if (smokeParticles[i].life <= 0) smokeParticles.splice(i, 1);
  }
  ctx.restore();

  // --------------------------------------------------------
  // CLIP DE FONTE
  // --------------------------------------------------------
  ctx.save();
  const waveTime = Date.now() * 0.002;

  ctx.beginPath();
  for (let x = 0; x <= candleWidth; x += 2) {
    const waveY = Math.sin(x * 0.05 + waveTime) * 2 * maskValue;
    const px = candleX + x;
    const py = candleY + meltOffset + waveY;
    if (x === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.lineTo(candleX + candleWidth, candleY + candleHeight);
  ctx.lineTo(candleX, candleY + candleHeight);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(candleImage, candleX, candleY, candleWidth, candleHeight);
  ctx.restore();

  // --------------------------------------------------------
  // HALO TORCHE (curseur) – avec flicker
  // --------------------------------------------------------
  drawPermanentFlameHalo();

  // --------------------------------------------------------
  // HALO DE CHALEUR (autour de la mèche)
  // --------------------------------------------------------
  drawHeatHalo(heatHaloSpring.position, wickX, wickY);

  // --------------------------------------------------------
  // VOILE + OUVERTURE (spotlight)
  // --------------------------------------------------------
  drawTorchReveal();

  // --------------------------------------------------------
  // HALO DE LA MÈCHE (suit la fonte)
  // --------------------------------------------------------
  drawWickGlow(wickX, wickY);
}

// --------------------------------------------------------
// HALO PERMANENT DU CURSEUR (au bout du bâton)
// --------------------------------------------------------
function drawPermanentFlameHalo() {
  if (!isMouseOverCanvas) return;
  if (!flameUnlocked) return;

  // Use haloTip in canvas space
  const x = haloTip.x;
  const y = haloTip.y;

  const flicker = Math.max(0.6, getCandleFlicker(1));
  const g = ctx.createRadialGradient(x, y, 0, x, y, 140);
  g.addColorStop(0, `rgba(255, 255, 255, ${0.45 * flicker})`);
  g.addColorStop(0.2, `rgba(255, 255, 255, ${0.25 * flicker})`);
  g.addColorStop(1, "rgba(0,0,0,0)");

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 140, 0, Math.PI * 2);
  ctx.fill();
}

// --------------------------------------------------------
// HALO DE CHALEUR (autour de la mèche)
// --------------------------------------------------------
function drawHeatHalo(strength, x, y) {
  if (!flameUnlocked) return;

  const s = Math.max(0.1, strength);
  const r = 400 * s; // Keep the same radius
  const flicker = Math.max(0.6, getCandleFlicker(1));

  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,255,255, ${0.45 * s * flicker})`);
  g.addColorStop(0.2, `rgba(255,255,255, ${0.25 * s * flicker})`);
  g.addColorStop(1, "rgba(0,0,0,0)");

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// --------------------------------------------------------
// VOILE + OPENING
// --------------------------------------------------------
function drawTorchReveal() {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.95)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (isMouseOverCanvas) {
    ctx.globalCompositeOperation = "destination-out";

    const flicker = Math.max(0.7, getCandleFlicker(1));
    const radius = 200 * flicker;

    // Use the stick tip for the reveal center (haloTip)
    const x = haloTip.x;
    const y = haloTip.y;

    const reveal = ctx.createRadialGradient(x, y, 0, x, y, radius);
    reveal.addColorStop(0, `rgba(255,255,255, ${0.95 * flicker})`);
    reveal.addColorStop(0.2, `rgba(255,255,255, ${0.35 * flicker})`);
    reveal.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = reveal;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// --------------------------------------------------------
// HALO DE LA MÈCHE (corrigé + suit la fonte)
// --------------------------------------------------------
function drawWickGlow(x, y) {
  if (!flameUnlocked) return;

  const r = 300;
  const flicker = Math.max(0.7, getCandleFlicker(1));

  const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
  glow.addColorStop(0, `rgba(255,255,255, ${0.95 * flicker})`);
  glow.addColorStop(0.2, `rgba(255,255,255, ${0.35 * flicker})`);
  glow.addColorStop(1, "rgba(0,0,0,0)");

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
