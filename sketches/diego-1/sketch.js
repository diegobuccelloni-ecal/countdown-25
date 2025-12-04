import { createEngine } from "../_shared/engine.js";
import { createSpringSettings, Spring } from "../_shared/spring.js";

const { renderer, input, math, run, finish } = createEngine();
const { ctx, canvas } = renderer;

// État de l'animation
let phase = "circle"; // "circle" -> "zero"
let eggs = [];
let zeroSpring = null;
let circleSpring = new Spring({ position: 1 });

const settings1 = createSpringSettings({
  frequency: 3.5,
  halfLife: 0.05,
});

const settings2 = createSpringSettings({
  frequency: 0.2,
  halfLife: 1.15,
});

// Classe pour les œufs
class Egg {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vy = 0;
    this.rotation = Math.random() * 0.4 - 0.2;
    this.rotationSpeed = Math.random() * 0.1 - 0.05;
  }

  update(dt) {
    this.vy += 600 * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotationSpeed;

    // Rebond au sol
    if (this.y > canvas.height - 30) {
      this.y = canvas.height - 30;
      this.vy *= -0.5;
      this.rotationSpeed *= 0.7;

      if (Math.abs(this.vy) < 50) {
        this.vy = 0;
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

run(update);

function update(dt) {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (phase === "circle") {
    if (input.isPressed()) {
      circleSpring.target = 0.8;
      circleSpring.settings = settings2;

      // Pondre un œuf
      eggs.push(new Egg(canvas.width / 2, canvas.height / 2));
    } else {
      circleSpring.target = 1;
      circleSpring.settings = settings1;
    }

    circleSpring.step(dt);

    // Dessiner le cercle rouge
    const x = canvas.width / 2;
    const y = canvas.height / 2;
    const radius = 80 * circleSpring.position;

    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Après 10 œufs, passer au zéro
    if (eggs.length >= 10 && !zeroSpring) {
      phase = "zero";
      zeroSpring = new Spring({ position: 0 });
      zeroSpring.target = 1;
      zeroSpring.settings = settings1;
    }
  }

  if (phase === "zero") {
    if (input.isPressed()) {
      zeroSpring.target = -0.1;
      zeroSpring.settings = settings2;
    } else {
      zeroSpring.target = 1;
      zeroSpring.settings = settings1;
    }

    zeroSpring.step(dt);

    const x = canvas.width / 2;
    const y = canvas.height / 2;
    const scale = Math.max(zeroSpring.position, 0);

    ctx.fillStyle = "white";
    ctx.textBaseline = "middle";
    ctx.font = `${canvas.height}px Helvetica Neue, Helvetica, bold`;
    ctx.textAlign = "center";
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillText("0", 0, 0);

    if (scale <= 0) {
      finish();
    }
  }

  // Mettre à jour et dessiner les œufs
  eggs.forEach((egg) => {
    egg.update(dt);
    egg.draw(ctx);
  });
}
