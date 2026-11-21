// Lightweight canvas confetti.
const COLORS = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff8fab', '#00c2a8'];
let parts = [];
let running = false;

export function confetti({ count = 140, x = 0.5, y = 0.35 } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) count = Math.min(count, 25);
  const cv = document.getElementById('confetti');
  const dpr = devicePixelRatio || 1;
  cv.width = innerWidth * dpr;
  cv.height = innerHeight * dpr;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = 4 + Math.random() * 9;
    parts.push({
      x: innerWidth * x, y: innerHeight * y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6,
      r: 4 + Math.random() * 5, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      c: COLORS[i % COLORS.length], life: 120 + Math.random() * 60,
    });
  }
  if (!running) loop(cv, dpr);
}

function loop(cv, dpr) {
  running = true;
  const g = cv.getContext('2d');
  const step = () => {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(p => p.life > 0 && p.y < innerHeight + 20);
    for (const p of parts) {
      p.vy += 0.25;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life--;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.fillStyle = p.c;
      g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      g.restore();
    }
    if (parts.length) requestAnimationFrame(step);
    else {
      g.clearRect(0, 0, innerWidth, innerHeight);
      running = false;
    }
  };
  requestAnimationFrame(step);
}
