import { createEngine } from "../_shared/engine.js";
import { createSpringSettings, Spring } from "../_shared/spring.js";

const { renderer, run } = createEngine();
const { ctx, canvas } = renderer;

// ---- ÉTAT ----
let eggs = [];
let isDropping = false;
let finished = false;

let eggTimer = 0;
const EGG_INTERVAL = 0.2; // 1 œuf / 0.1s

// ---- IMAGES ----
const feet = new Image();
feet.src = "assets/feet.svg";

const face = new Image();
face.src = "assets/face.svg";

let feetLoaded = false;
let faceLoaded = false;

feet.onload = () => (feetLoaded = true);
face.onload = () => (faceLoaded = true);

// positions (ajuste visuellement si besoin)
let feetWidth = 1500;
let feetHeight = 1900;
let faceWidth = 500;
let faceHeight = 2000;

// pieds bien en haut de la page, centrés
let feetX = canvas.width * 0.5;
let feetY = 100; // plus petit = plus haut à l'écran

// visage un peu en haut à droite
let faceX = canvas.width * 0.8;
let faceY = canvas.height * 0.15;

// centre du 0 plus bas que les pieds
let zeroCenterX = canvas.width * 0.5;
let zeroCenterY = canvas.height * 0.5;
const zeroFontSize = 1000;

// approximation géométrique du 0 comme anneau
const zeroOuterRadius = zeroFontSize * 0.45;
const zeroInnerRadius = zeroFontSize * 0.2;

// ---- FONT ----
const font = new FontFace("TWKBurns", "url(assets/TWKBurns-Ultra.otf)");
font
  .load()
  .then(() => {
    document.fonts.add(font);
    console.log("Font loaded");
  })
  .catch((err) => console.error("Font error", err));

// ---- SON ----
const chickenSound = new Audio("assets/chicken.mp3");
chickenSound.loop = true; // Set to loop
chickenSound.volume = 0.5;

// Function to play background sound from 0 to 10 seconds
function playBackgroundSound() {
  chickenSound.currentTime = 0; // Start from 0 seconds
  chickenSound.play();
}

// Event listener for mouse click to start the background sound
canvas.addEventListener("click", () => {
  if (chickenSound.paused) {
    playBackgroundSound(); // Play sound only on the first click
  }
});

// ---- CLASSE ŒUF ----
class Egg {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 80;
    this.vy = 0;
    this.rotation = Math.random() * 0.4 - 0.2;
    this.rotationSpeed = (Math.random() - 0.5) * 1.5;
    this.radius = 35;

    // Initialize sound for each egg
    this.eggSound = new Audio("assets/egg.mp3");
    this.eggSound.preload = "auto";
    this.eggSound.volume = 0.5;
  }

  playSound() {
    try {
      this.eggSound.currentTime = 11.8; // Set to start time for egg sound
      this.eggSound.play();

      // Stop the sound after 12.5 seconds
      this.eggSound.addEventListener("timeupdate", () => {
        if (this.eggSound.currentTime >= 12.3) {
          this.eggSound.pause();
          this.eggSound.currentTime = 12; // Reset to start for next use
        }
      });
    } catch (e) {}
  }

  update(dt) {
    // gravité
    this.vy += 400 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotationSpeed * dt;

    // collision avec le bas du canvas (sécurité)
    if (this.y + this.radius >= canvas.height) {
      this.y = canvas.height - this.radius;
      this.vy = 0;
      this.vx *= 0.7;
      this.rotationSpeed *= 0.5;
      if (Math.abs(this.vx) < 5) this.vx = 0;
      if (Math.abs(this.rotationSpeed) < 0.02) this.rotationSpeed = 0;
    }

    // collisions avec le "vase 0"
    this.collideWithZero();
  }

  collideWithZero() {
    const dx = this.x - zeroCenterX;
    const dy = this.y - zeroCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;

    // 1) empêcher de SORTIR par l'extérieur du 0
    if (dist + this.radius > zeroOuterRadius) {
      const nX = dx / dist;
      const nY = dy / dist;

      const overlap = dist + this.radius - zeroOuterRadius;
      this.x -= nX * overlap;
      this.y -= nY * overlap;

      const dot = this.vx * nX + this.vy * nY;
      this.vx -= 2 * dot * nX;
      this.vy -= 2 * dot * nY;

      this.vx *= 0.6;
      this.vy *= 0.6;
    }

    // 2) empêcher de tomber dans le TROU du 0
    if (dist - this.radius < zeroInnerRadius) {
      const nX = dx / dist;
      const nY = dy / dist;

      const overlap = zeroInnerRadius - (dist - this.radius);
      this.x += nX * overlap;
      this.y += nY * overlap;

      const dot = this.vx * nX + this.vy * nY;
      this.vx -= 2 * dot * nX;
      this.vy -= 2 * dot * nY;

      this.vx *= 0.6;
      this.vy *= 0.6;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius, this.radius * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ---- COLLISIONS ENTRE ŒUFS ----
function resolveEggCollisions() {
  for (let i = 0; i < eggs.length; i++) {
    for (let j = i + 1; j < eggs.length; j++) {
      const a = eggs[i];
      const b = eggs[j];

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
      const minDist = a.radius + b.radius;

      if (dist < minDist) {
        const overlap = minDist - dist;

        const nx = dx / dist;
        const ny = dy / dist;

        // on sépare les deux œufs
        a.x -= nx * overlap * 0.5;
        a.y -= ny * overlap * 0.5;
        b.x += nx * overlap * 0.5;
        b.y += ny * overlap * 0.5;

        // simple réponse de vitesse amortie
        const relVx = b.vx - a.vx;
        const relVy = b.vy - a.vy;
        const relDot = relVx * nx + relVy * ny;

        const impulse = relDot * 0.5;

        a.vx += nx * impulse;
        a.vy += ny * impulse;
        b.vx -= nx * impulse;
        b.vy -= ny * impulse;

        a.vx *= 0.9;
        a.vy *= 0.9;
        b.vx *= 0.9;
        b.vy *= 0.9;
      }
    }
  }
}

// ---- HITBOX FACE ----
function isFaceClicked(mx, my) {
  return (
    mx > faceX - faceWidth / 2 &&
    mx < faceX + faceWidth / 2 &&
    my > faceY - faceHeight / 2 &&
    my < faceY + faceHeight / 2
  );
}

// ---- HITBOX PIEDS ----
function isFeetClicked(mx, my) {
  return (
    mx > feetX - feetWidth / 2 &&
    mx < feetX + feetWidth / 2 &&
    my > feetY - feetHeight / 2 &&
    my < feetY + feetHeight / 2
  );
}

// ---- SOURIS ----
let mouseX = 0;
let mouseY = 0;

function updateMouseFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  mouseX = mx * scaleX;
  mouseY = my * scaleY;
}

canvas.addEventListener("mousemove", (e) => {
  updateMouseFromEvent(e);
  if (finished) {
    canvas.style.cursor = "default";
    return;
  }
  if (feetLoaded && isFeetClicked(mouseX, mouseY)) {
    canvas.style.cursor = "pointer";
  } else {
    canvas.style.cursor = "default";
  }
});

canvas.addEventListener("mousedown", (e) => {
  if (finished) return;
  updateMouseFromEvent(e);
  if (feetLoaded && isFeetClicked(mouseX, mouseY)) {
    isDropping = true;
  }
});

window.addEventListener("mouseup", () => {
  isDropping = false;
});

// ---- FADE IN / OUT ----
let introFade = 1; // Start fully visible
let outroFade = 0; // Start fully transparent
const introSpeed = 0.9; // Speed of fade-in
const outroSpeed = 0.8; // Speed of fade-out
let fadeOutDelay = 2; // Delay before starting fade-out (in seconds)
let fadeOutTimer = 0; // Timer for fade-out delay

// ---- LOOP ----
run(update);

function update(dt) {
  // Update fade-in
  if (introFade > 0) {
    introFade = Math.max(0, introFade - dt / introSpeed);
  }

  // Clear canvas with opacity
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 1) spawn œufs DEPUIS LE HAUT
  eggTimer += dt;
  if (isDropping && !finished && eggTimer >= EGG_INTERVAL) {
    eggTimer -= EGG_INTERVAL;

    const spawnX = zeroCenterX; // Centered above the zero
    const spawnY = -50; // Start above the canvas (adjust as needed)

    const newEgg = new Egg(spawnX, spawnY);
    newEgg.playSound(); // Play sound for the new egg
    eggs.push(newEgg);
  }

  // 2) update des œufs (gravité + vase 0 + sol)
  eggs.forEach((egg) => egg.update(dt));

  // 3) collisions entre œufs
  resolveEggCollisions();

  // 4) dessin des œufs
  eggs.forEach((egg) => egg.draw(ctx));

  // 5) décor (pieds + visage) - moved to draw after eggs
  if (feetLoaded) {
    ctx.drawImage(
      feet,
      feetX - feetWidth / 2,
      feetY - feetHeight / 2,
      feetWidth,
      feetHeight
    );
  }
  if (faceLoaded) {
    ctx.drawImage(
      face,
      faceX - faceWidth / 2,
      faceY - faceHeight / 2,
      faceWidth,
      faceHeight
    );
  }

  // 6) condition de fin
  if (!finished && eggs.length > 100) {
    finished = true;
    isDropping = false;
    canvas.style.cursor = "default";
    chickenSound.pause(); // Stop the background sound when finished// Reset to start for next use
  }

  // Check for fade-out condition
  if (finished) {
    fadeOutTimer += dt; // Increment the fade-out timer
    if (fadeOutTimer >= fadeOutDelay) {
      outroFade = Math.min(5, outroFade + dt / outroSpeed);
      if (outroFade >= 5) {
        chickenSound.pause(); // Pause the background sound when fully faded out
        try {
          finish(); // Call finish when fully faded out
        } catch (e) {}
      }
    }
  }

  // Draw overlay for fade effects
  const overlayAlpha = Math.max(introFade, outroFade);
  if (overlayAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = overlayAlpha;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}
