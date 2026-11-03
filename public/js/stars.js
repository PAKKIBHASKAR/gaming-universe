// ==========================================
// DYNAMIC GAMING UNIVERSE STARFIELD & NEBULA
// ==========================================
(function() {
  const canvas = document.getElementById('universe-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initStars();
  });

  const STAR_COUNT = 180;
  let stars = [];

  class Star {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = (Math.random() - 0.5) * width * 2;
      this.y = (Math.random() - 0.5) * height * 2;
      this.z = Math.random() * width;
      this.pz = this.z;
      this.color = ['#00f0ff', '#b026ff', '#ffffff', '#ff0077', '#00ffaa'][Math.floor(Math.random() * 5)];
    }

    update(speed) {
      this.pz = this.z;
      this.z -= speed;
      if (this.z < 1) {
        this.reset();
        this.z = width;
        this.pz = this.z;
      }
    }

    draw() {
      const cx = width / 2;
      const cy = height / 2;

      const sx = (this.x / this.z) * 350 + cx;
      const sy = (this.y / this.z) * 350 + cy;

      const px = (this.x / this.pz) * 350 + cx;
      const py = (this.y / this.pz) * 350 + cy;

      if (sx < 0 || sx > width || sy < 0 || sy > height) return;

      const r = Math.max(0.6, (1 - this.z / width) * 2.5);

      ctx.beginPath();
      ctx.strokeStyle = this.color;
      ctx.lineWidth = r;
      ctx.moveTo(px, py);
      ctx.lineTo(sx, sy);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = this.color;
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function initStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push(new Star());
    }
  }

  let speed = 1.5;
  document.addEventListener('mousemove', (e) => {
    const normX = (e.clientX / width - 0.5) * 2;
    speed = 1.2 + Math.abs(normX) * 1.5;
  });

  function animate() {
    ctx.fillStyle = 'rgba(6, 8, 24, 0.35)';
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < stars.length; i++) {
      stars[i].update(speed);
      stars[i].draw();
    }

    requestAnimationFrame(animate);
  }

  initStars();
  animate();
})();
