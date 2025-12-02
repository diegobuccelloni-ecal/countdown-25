const balloonPath =
  "M2.5,22.9C54.89-14.88,107.32,11.39,107.32,11.39c26.7,12.83,64.8,50.03,52.56,95.71-11.66,43.48-57.76,47.55-92.13,41.21-27.99-5.38-52.55-7.67-50.6-22.41,1.44-10.83,13.83-14.03,30.32-12.98,14.78.95,29.11,5.31,42.26,12.13,26.45,13.72,51.16,34.51,51.33,65.01.14,25.03-10.41,70.38-48.13,80.22-27.08,7.06-58.57-6.69-76.9-34.85";
const trianglePath = "M129.71 241.34 L132.95 251.55 L140.49 242.44 Z";

import { createEngine } from "../_shared/engine.js";
import { Spring } from "../_shared/spring.js";
const { renderer, run } = createEngine();
const { ctx, canvas } = renderer;
run(update);

let pumpTarget = 0;
const pumpStep = 0.3;
const maxPumpTarget = 2.5;
let popped = false;
let popTimer = 0;
let isPumping = false;
const spring = new Spring({ position: 0, frequency: 0.8, halfLife: 0.9 });
const balloonP2D = new Path2D(balloonPath);
const triangleP2D = new Path2D(trianglePath);

const breathSound = new Audio("assets/breath.mp3");
const inflateSound = new Audio("assets/inflate.mp3");
const popSound = new Audio("assets/pop.mp3");

breathSound.volume = 0;
breathSound.playbackRate = 2;
inflateSound.volume = 0;
inflateSound.playbackRate = 1;
popSound.volume = 0.8;
popSound.playbackRate = 1.0;

const breathTargetVolume = 1;
const inflateTargetVolume = 0.2;

breathSound.load();
inflateSound.load();
popSound.load();

function fadeAudio(audio, targetVolume, duration = 0.2) {
  const startVolume = audio.volume;
  const startTime = Date.now();

  const fade = () => {
    const elapsed = (Date.now() - startTime) / 1000;
    const progress = Math.min(elapsed / duration, 1);

    audio.volume = startVolume + (targetVolume - startVolume) * progress;

    if (progress < 1) {
      requestAnimationFrame(fade);
    }
  };

  fade();
}

function getPumpTransform() {
  return { x: canvas.width - 80, y: canvas.height / 2 };
}

function isInsideSVGBounds(mx, my) {
  const { x, y } = getPumpTransform();
  const svgSize = Math.min(canvas.width, canvas.height) * 0.5;
  const svgOffset = 50;
  const bounds = {
    left: x - svgSize / 2 - svgOffset,
    right: x + svgSize / 2 - svgOffset,
    top: y - svgSize / 2,
    bottom: y + svgSize / 2,
  };
  return (
    mx >= bounds.left &&
    mx <= bounds.right &&
    my >= bounds.top &&
    my <= bounds.bottom
  );
}

canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);

  if (isInsideSVGBounds(mx, my)) {
    isPumping = true;
    pumpBalloon();

    if (!breathSound.paused) {
      fadeAudio(breathSound, 0, 0.15);
      setTimeout(() => breathSound.pause(), 150);
    }

    inflateSound.currentTime = 0;
    inflateSound.volume = 0;
    inflateSound.play().catch((e) => console.log("Audio play failed:", e));
    fadeAudio(inflateSound, inflateTargetVolume, 0.15);
  }
});

canvas.addEventListener("mouseup", () => {
  if (isPumping) {
    isPumping = false;

    fadeAudio(inflateSound, 0, 0.15);
    setTimeout(() => inflateSound.pause(), 150);

    breathSound.currentTime = 0;
    breathSound.volume = 0;
    breathSound.play().catch((e) => console.log("Audio play failed:", e));
    fadeAudio(breathSound, breathTargetVolume, 0.15);
  }
});

canvas.addEventListener("mouseleave", () => {
  if (isPumping) {
    isPumping = false;

    fadeAudio(inflateSound, 0, 0.15);
    setTimeout(() => inflateSound.pause(), 150);

    breathSound.currentTime = 0;
    breathSound.volume = 0;
    breathSound.play().catch((e) => console.log("Audio play failed:", e));
    fadeAudio(breathSound, breathTargetVolume, 0.15);
  }
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);

  canvas.style.cursor = isInsideSVGBounds(mx, my) ? "pointer" : "default";
});

const blowSVG = new Image();
const inhaleSVG = new Image();
blowSVG.src = "assets/blow.svg";
inhaleSVG.src = "assets/inhale.svg";

function pumpBalloon() {
  pumpTarget = Math.min(maxPumpTarget, pumpTarget + pumpStep);
}

let fadeTimer = 0;
const fadeDuration = 2;
const initialBalloonScale = 0.5;

function update(dt) {
  fadeTimer += dt;
  const fadeAlpha = Math.min(fadeTimer / fadeDuration, 1);

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalAlpha = fadeAlpha;

  if (popped) {
    popTimer += dt;
    if (popTimer < 0.08) {
      const alpha = 1 - popTimer / 0.08;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    inflateSound.pause();
    breathSound.pause();
    ctx.globalAlpha = 1;
    return;
  }

  spring.target = pumpTarget;
  spring.step(dt);
  const squeeze = Math.max(spring.position, 0);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const maxSize = Math.min(canvas.width, canvas.height) * 0.5;
  const baseBalloonScale = maxSize / Math.max(164.74, 274.62);
  const currentScale =
    initialBalloonScale +
    (baseBalloonScale - initialBalloonScale) *
      (spring.position / maxPumpTarget);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(currentScale, currentScale);
  ctx.translate(-164.74 / 2, -274.62 / 2);
  ctx.lineWidth = (10 + squeeze * 150) / baseBalloonScale;
  ctx.strokeStyle = "white";
  ctx.lineCap = "round";
  ctx.fill(balloonP2D);
  ctx.stroke(balloonP2D);

  ctx.fill(triangleP2D);

  const triangleX = 135 - 164.74 / 2;
  const triangleY = 245 - 274.62 / 2;
  ctx.restore();

  const worldTriangleX = cx + triangleX * currentScale;
  const worldTriangleY = cy + triangleY * currentScale;

  const svgSize = Math.min(canvas.width, canvas.height) * 0.2;
  const { x, y } = getPumpTransform();

  const mouthRadius = svgSize * 0.15;
  const mouthCenterX = x - svgSize / 2 + 70;
  const mouthCenterY = y + 20;

  const angle = Math.atan2(
    worldTriangleY - mouthCenterY,
    worldTriangleX - mouthCenterX
  );
  const ropeEndX = mouthCenterX + Math.cos(angle) * mouthRadius;
  const ropeEndY = mouthCenterY + Math.sin(angle) * mouthRadius;

  ctx.strokeStyle = "white";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(worldTriangleX, worldTriangleY);
  ctx.quadraticCurveTo(
    (worldTriangleX + ropeEndX) / 2,
    (worldTriangleY + ropeEndY) * 1.05,
    ropeEndX,
    ropeEndY
  );
  ctx.stroke();

  const svgOffset = 50;
  ctx.drawImage(
    isPumping ? blowSVG : inhaleSVG,
    x - svgSize / 2 - svgOffset,
    y - svgSize / 2,
    svgSize,
    svgSize
  );

  if (pumpTarget >= maxPumpTarget) {
    popped = true;
    popTimer = 0;

    fadeAudio(inflateSound, 0, 0.1);
    fadeAudio(breathSound, 0, 0.1);
    setTimeout(() => {
      inflateSound.pause();
      breathSound.pause();
    }, 50);

    popSound.currentTime = 4;
    popSound.play().catch((e) => console.log("Pop sound failed:", e));
  }

  if (!isPumping) {
    pumpTarget = Math.max(pumpTarget - dt * 0.1, 0);
  }

  ctx.globalAlpha = 1;
}
