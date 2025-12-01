const balloonPath =
  "M2.5,22.9C54.89-14.88,107.32,11.39,107.32,11.39c26.7,12.83,64.8,50.03,52.56,95.71-11.66,43.48-60.23,62.21-94.6,55.87-23.64-4.36-50.08-22.33-48.13-37.07,2.07-15.6,36.04-28.1,63.07-22.13,35.87,7.92,60.64,48.61,60.85,86.3.14,25.03-10.41,70.38-48.13,80.22-27.08,7.06-58.57-6.69-76.9-34.85";
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
const spring = new Spring({ position: 0, frequency: 1.2, halfLife: 0.15 });
const balloonP2D = new Path2D(balloonPath);

function getPumpTransform() {
  return { x: canvas.width - 80, y: canvas.height / 2 };
}

function isInsideSVGBounds(mx, my) {
  const { x, y } = getPumpTransform();
  const svgSize = Math.min(canvas.width, canvas.height) * 0.2;
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
  }
});

canvas.addEventListener("mouseup", () => {
  isPumping = false;
});

canvas.addEventListener("mouseleave", () => {
  isPumping = false;
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

function update(dt) {
  if (popped) {
    popTimer += dt;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (popTimer < 0.08) {
      const alpha = 1 - popTimer / 0.08;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    return;
  }

  spring.target = pumpTarget;
  spring.step(dt);
  const squeeze = Math.max(spring.position, 0);

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const maxSize = Math.min(canvas.width, canvas.height) * 0.5;
  const baseBalloonScale = maxSize / Math.max(223.99, 326.09);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(baseBalloonScale, baseBalloonScale);
  ctx.translate(-223.99 / 2, -326.09 / 2);
  ctx.lineWidth = (40 + squeeze * 220) / baseBalloonScale;
  ctx.strokeStyle = "white";
  ctx.fill(balloonP2D);
  ctx.stroke(balloonP2D);
  ctx.restore();

  const svgSize = Math.min(canvas.width, canvas.height) * 0.2;
  const { x, y } = getPumpTransform();
  ctx.strokeStyle = "white";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx - 200, cy + 350);
  ctx.quadraticCurveTo(
    (cx - 200 + x) / 2,
    (cy + 350 + y) * 1,
    x - svgSize / 2,
    y + 20
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
  }

  if (!isPumping) {
    pumpTarget = Math.max(pumpTarget - dt * 0.3, 0);
  }
}
