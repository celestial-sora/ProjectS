// 2D Canvas Game Engine - dola.ai (Anime Deep Dark Fantasy Endless Runner)
import { sound } from './audio.js';

export class DolaGame {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.callbacks = {
      onScoreUpdate: callbacks.onScoreUpdate || (() => {}),
      onTimeUpdate: callbacks.onTimeUpdate || (() => {}),
      onBonusCombo: callbacks.onBonusCombo || (() => {}),
      onGameOver: callbacks.onGameOver || (() => {}),
    };

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.reset();
  }

  resizeCanvas() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.groundY = this.height - 110;
    if (this.player) {
      this.player.groundY = this.groundY;
      if (this.player.y > this.groundY - this.player.height) {
        this.player.y = this.groundY - this.player.height;
      }
    }
  }

  reset() {
    this.state = 'IDLE'; // 'IDLE', 'PLAYING', 'GAMEOVER'
    this.score = 0;
    this.timeLeft = 45; // 45 seconds game
    this.lastTime = 0;
    this.gameSpeed = 6;
    this.groundY = this.height - 110;

    // Statistics
    this.stats = {
      collectiblesPicked: 0,
      obstaclesHit: 0,
      jumpsExecuted: 0,
      bonusesEarned: 0,
      maxStreak: 0,
      currentStreak: 0
    };

    // Anime Heroine character ("Dola")
    this.player = {
      x: 120,
      y: this.groundY - 70,
      width: 44,
      height: 70,
      vy: 0,
      gravity: 0.85,
      jumpForce: -17.5,
      isGrounded: true,
      groundY: this.groundY,
      trail: [],
      runCycle: 0,
      hitCooldown: 0, // i-frames
      capeWave: 0
    };

    // Parallax background layers
    this.bgStars = Array.from({ length: 65 }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * (this.height * 0.7),
      size: Math.random() * 2 + 1,
      alpha: Math.random() * 0.8 + 0.2,
      pulseSpeed: Math.random() * 0.05 + 0.02
    }));

    this.mistParticles = Array.from({ length: 25 }, () => ({
      x: Math.random() * this.width,
      y: this.groundY - Math.random() * 60,
      radius: Math.random() * 40 + 20,
      speed: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.15 + 0.05
    }));

    // Objects
    this.obstacles = [];
    this.collectibles = [];
    this.particles = [];
    this.floatingTexts = [];

    // Spawning timers
    this.obstacleTimer = 0;
    this.collectibleTimer = 0;
    this.screenShake = 0;

    // Gesture workout tracker (track Fan actions)
    this.workoutCount = 0;
    this.lastFanTrigger = 0;
  }

  start() {
    this.reset();
    this.state = 'PLAYING';
    this.lastTime = performance.now();
    sound.init();
    
    // Timer interval
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.state === 'PLAYING') {
        this.timeLeft--;
        this.callbacks.onTimeUpdate(this.timeLeft);
        if (this.timeLeft <= 0) {
          this.endGame();
        }
      }
    }, 1000);

    this.callbacks.onScoreUpdate(this.score, this.stats);
    this.callbacks.onTimeUpdate(this.timeLeft);
  }

  jump() {
    if (this.state !== 'PLAYING') return;

    if (this.player.isGrounded) {
      this.player.vy = this.player.jumpForce;
      this.player.isGrounded = false;
      this.stats.jumpsExecuted++;
      sound.playJump();

      // Workout progress check
      this.workoutCount++;
      if (this.workoutCount >= 5) {
        this.workoutCount = 0;
        this.stats.bonusesEarned++;
        this.score += 5;
        sound.playBonus();
        this.createFloatingText("+5 WORKOUT BONUS!", this.player.x + 20, this.player.y - 30, "#ffd700", true);
        this.callbacks.onBonusCombo("5x Workout Sequence Complete! +5");
      }

      // Jump dust/mana particles
      for (let i = 0; i < 12; i++) {
        this.particles.push({
          x: this.player.x + this.player.width / 2,
          y: this.player.groundY,
          vx: (Math.random() - 0.5) * 6,
          vy: -Math.random() * 4,
          size: Math.random() * 4 + 2,
          color: Math.random() > 0.5 ? '#7928ca' : '#00dfd8',
          life: 1,
          decay: 0.04
        });
      }

      this.callbacks.onScoreUpdate(this.score, this.stats);
    }
  }

  createFloatingText(text, x, y, color = '#00dfd8', isLarge = false) {
    this.floatingTexts.push({
      text,
      x,
      y,
      vy: -2,
      color,
      isLarge,
      life: 1,
      decay: 0.02
    });
  }

  endGame() {
    this.state = 'GAMEOVER';
    if (this.timerInterval) clearInterval(this.timerInterval);
    sound.playGameOver();
    this.callbacks.onGameOver(this.score, this.stats);
  }

  update(dt) {
    if (this.state !== 'PLAYING') return;

    // Gradual difficulty speed increase
    this.gameSpeed = 6 + (45 - this.timeLeft) * 0.08;

    // Player physics
    this.player.y += this.player.vy;
    this.player.vy += this.player.gravity;
    this.player.runCycle += 0.25;
    this.player.capeWave += 0.15;

    if (this.player.hitCooldown > 0) {
      this.player.hitCooldown--;
    }

    if (this.player.y >= this.player.groundY - this.player.height) {
      this.player.y = this.player.groundY - this.player.height;
      this.player.vy = 0;
      this.player.isGrounded = true;
    }

    // Player shadow trail
    if (Math.random() < 0.35) {
      this.player.trail.push({
        x: this.player.x,
        y: this.player.y,
        life: 0.6,
        color: this.player.isGrounded ? '#7928ca' : '#00dfd8'
      });
    }

    this.player.trail.forEach(t => t.life -= 0.05);
    this.player.trail = this.player.trail.filter(t => t.life > 0);

    // Screen shake decay
    if (this.screenShake > 0) {
      this.screenShake *= 0.88;
      if (this.screenShake < 0.5) this.screenShake = 0;
    }

    // Update mist particles
    this.mistParticles.forEach(m => {
      m.x -= m.speed * (this.gameSpeed / 4);
      if (m.x < -m.radius * 2) {
        m.x = this.width + m.radius * 2;
        m.y = this.groundY - Math.random() * 70;
      }
    });

    // Spawn Obstacles (Dark Spikes, Cursed Monoliths)
    this.obstacleTimer += dt;
    const obstacleSpawnInterval = Math.max(1400, 2400 - (45 - this.timeLeft) * 25);
    if (this.obstacleTimer > obstacleSpawnInterval) {
      this.obstacleTimer = 0;
      const type = Math.random() > 0.4 ? 'spike' : 'totem';
      const obsHeight = type === 'spike' ? 46 : 64;
      const obsWidth = type === 'spike' ? 36 : 40;
      this.obstacles.push({
        x: this.width + 50,
        y: this.groundY - obsHeight,
        width: obsWidth,
        height: obsHeight,
        type: type,
        color: '#ff0055'
      });
    }

    // Spawn Collectibles (Souls / Astral Orbs)
    this.collectibleTimer += dt;
    if (this.collectibleTimer > 1100) {
      this.collectibleTimer = 0;
      // High or ground elevation
      const isHigh = Math.random() > 0.45;
      const colY = isHigh ? this.groundY - 120 - Math.random() * 40 : this.groundY - 45;
      this.collectibles.push({
        x: this.width + 30,
        y: colY,
        radius: 12,
        baseY: colY,
        floatOffset: Math.random() * Math.PI * 2,
        color: '#00dfd8'
      });
    }

    // Update Obstacles & Collision Check
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.gameSpeed;

      // Hit box collision with player
      if (
        this.player.hitCooldown === 0 &&
        this.player.x + 10 < obs.x + obs.width &&
        this.player.x + this.player.width - 10 > obs.x &&
        this.player.y + 10 < obs.y + obs.height &&
        this.player.y + this.player.height > obs.y + 10
      ) {
        // Hit obstacle: -1 point
        this.score = Math.max(0, this.score - 1);
        this.stats.obstaclesHit++;
        this.stats.currentStreak = 0;
        this.player.hitCooldown = 45; // ~0.75 second invulnerability
        this.screenShake = 14;
        sound.playHit();
        this.createFloatingText("-1 DAMAGE", this.player.x, this.player.y - 20, "#ff0055");

        // Blood / curse sparks
        for (let k = 0; k < 15; k++) {
          this.particles.push({
            x: obs.x + obs.width / 2,
            y: obs.y + obs.height / 2,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            size: Math.random() * 5 + 2,
            color: '#ff0055',
            life: 1,
            decay: 0.05
          });
        }
        this.callbacks.onScoreUpdate(this.score, this.stats);
      }

      if (obs.x < -100) {
        this.obstacles.splice(i, 1);
      }
    }

    // Update Collectibles & Collision Check
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const col = this.collectibles[i];
      col.x -= this.gameSpeed;
      col.floatOffset += 0.08;
      col.y = col.baseY + Math.sin(col.floatOffset) * 6;

      const pCenterX = this.player.x + this.player.width / 2;
      const pCenterY = this.player.y + this.player.height / 2;
      const dist = Math.hypot(pCenterX - col.x, pCenterY - col.y);

      if (dist < col.radius + 26) {
        // Collect item: +1 point
        this.score += 1;
        this.stats.collectiblesPicked++;
        this.stats.currentStreak++;
        if (this.stats.currentStreak > this.stats.maxStreak) {
          this.stats.maxStreak = this.stats.currentStreak;
        }

        sound.playCollect();
        this.createFloatingText("+1 SOUL", col.x, col.y - 15, "#00dfd8");

        // Soul explosion particles
        for (let k = 0; k < 12; k++) {
          this.particles.push({
            x: col.x,
            y: col.y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            size: Math.random() * 4 + 2,
            color: '#00dfd8',
            life: 1,
            decay: 0.04
          });
        }

        this.callbacks.onScoreUpdate(this.score, this.stats);
        this.collectibles.splice(i, 1);
        continue;
      }

      if (col.x < -50) {
        this.collectibles.splice(i, 1);
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.life -= ft.decay;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.save();

    // Screen Shake effect
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(sx, sy);
    }

    // 1. Deep Dark Fantasy Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.groundY);
    skyGrad.addColorStop(0, '#040409');
    skyGrad.addColorStop(0.5, '#0b091a');
    skyGrad.addColorStop(1, '#18122c');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Cosmic / Fantasy Moon & Dark Nebula
    const moonX = this.width * 0.78;
    const moonY = this.height * 0.28;
    
    // Moon halo
    const haloGrad = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 140);
    haloGrad.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
    haloGrad.addColorStop(0.5, 'rgba(121, 40, 202, 0.15)');
    haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 140, 0, Math.PI * 2);
    ctx.fill();

    // Blood-Eclipse Moon
    ctx.fillStyle = '#f1e6ff';
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Dark eclipse rim
    ctx.fillStyle = '#0a0815';
    ctx.beginPath();
    ctx.arc(moonX + 16, moonY - 10, 42, 0, Math.PI * 2);
    ctx.fill();

    // Distant Fantasy Castle Spire Silhouettes
    ctx.fillStyle = '#0e0b1c';
    this.drawCastleBackground(ctx);

    // Parallax Stars
    this.bgStars.forEach(s => {
      s.alpha += Math.sin(performance.now() * s.pulseSpeed) * 0.01;
      ctx.fillStyle = `rgba(220, 220, 255, ${Math.max(0.1, Math.min(1, s.alpha))})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. Ground / Abyssal Platform
    const groundGrad = ctx.createLinearGradient(0, this.groundY, 0, this.height);
    groundGrad.addColorStop(0, '#161328');
    groundGrad.addColorStop(0.1, '#0e0c1b');
    groundGrad.addColorStop(1, '#05040a');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    // Glowing Rune Border on Ground
    ctx.strokeStyle = '#7928ca';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00dfd8';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(this.width, this.groundY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Floor stone cracks & grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, this.groundY);
      ctx.lineTo(x - 40, this.height);
      ctx.stroke();
    }

    // 4. Ethereal Ground Mist
    this.mistParticles.forEach(m => {
      const mistGrad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.radius);
      mistGrad.addColorStop(0, `rgba(121, 40, 202, ${m.alpha})`);
      mistGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = mistGrad;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. Draw Collectibles (Soul Orbs)
    this.collectibles.forEach(col => {
      // Glow
      const orbGrad = ctx.createRadialGradient(col.x, col.y, 2, col.x, col.y, col.radius + 10);
      orbGrad.addColorStop(0, '#ffffff');
      orbGrad.addColorStop(0.3, '#00dfd8');
      orbGrad.addColorStop(0.7, 'rgba(0, 223, 216, 0.3)');
      orbGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(col.x, col.y, col.radius + 10, 0, Math.PI * 2);
      ctx.fill();

      // Core Diamond
      ctx.fillStyle = '#e6ffff';
      ctx.shadowColor = '#00dfd8';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(col.x, col.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // 6. Draw Obstacles (Cursed Spikes / Dark Obelisks)
    this.obstacles.forEach(obs => {
      if (obs.type === 'spike') {
        // Dark cursed crystal spike
        ctx.fillStyle = '#1c0d22';
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 8;
        
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.width / 2, obs.y);
        ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
        ctx.lineTo(obs.x, obs.y + obs.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner crimson rune line
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.width / 2, obs.y + 6);
        ctx.lineTo(obs.x + obs.width / 2, obs.y + obs.height - 4);
        ctx.strokeStyle = '#ff4b8b';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        // Totem / Obelisk
        ctx.fillStyle = '#110d1c';
        ctx.strokeStyle = '#9333ea';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#9333ea';
        ctx.shadowBlur = 10;
        
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        
        // Evil eye rune
        ctx.fillStyle = '#ff0055';
        ctx.beginPath();
        ctx.arc(obs.x + obs.width / 2, obs.y + obs.height * 0.35, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // 7. Draw Player Trail
    this.player.trail.forEach(t => {
      ctx.fillStyle = t.color;
      ctx.globalAlpha = t.life * 0.35;
      ctx.fillRect(t.x, t.y, this.player.width, this.player.height);
    });
    ctx.globalAlpha = 1.0;

    // 8. Draw Anime Player ("Dola")
    if (this.player.hitCooldown % 6 < 3) { // flash effect when hit
      this.drawAnimeCharacter(ctx);
    }

    // 9. Draw Spell Particles
    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1.0;

    // 10. Draw Floating Texts
    this.floatingTexts.forEach(ft => {
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.font = ft.isLarge ? 'bold 22px "Cinzel", serif' : 'bold 15px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 10;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1.0;

    ctx.restore();
  }

  drawCastleBackground(ctx) {
    const baseY = this.groundY;
    // Spire 1
    ctx.beginPath();
    ctx.moveTo(80, baseY);
    ctx.lineTo(130, baseY - 180);
    ctx.lineTo(140, baseY - 240);
    ctx.lineTo(150, baseY - 180);
    ctx.lineTo(200, baseY);
    ctx.fill();

    // Spire 2
    ctx.beginPath();
    ctx.moveTo(320, baseY);
    ctx.lineTo(380, baseY - 260);
    ctx.lineTo(390, baseY - 320);
    ctx.lineTo(400, baseY - 260);
    ctx.lineTo(460, baseY);
    ctx.fill();

    // Spire 3 (far right)
    const rightOffset = this.width - 320;
    ctx.beginPath();
    ctx.moveTo(rightOffset, baseY);
    ctx.lineTo(rightOffset + 70, baseY - 210);
    ctx.lineTo(rightOffset + 80, baseY - 280);
    ctx.lineTo(rightOffset + 90, baseY - 210);
    ctx.lineTo(rightOffset + 160, baseY);
    ctx.fill();
  }

  drawAnimeCharacter(ctx) {
    const p = this.player;
    const px = p.x;
    const py = p.y;
    const pw = p.width;
    const ph = p.height;

    ctx.save();
    ctx.translate(px, py);

    // Magical Flowing Cape (Deep purple & cyan edge)
    ctx.fillStyle = '#4c1d95';
    ctx.beginPath();
    const wave = Math.sin(p.capeWave) * 10;
    ctx.moveTo(pw * 0.2, ph * 0.35);
    ctx.quadraticCurveTo(-15 + wave, ph * 0.65, -28 + wave * 1.5, ph * 0.95);
    ctx.lineTo(pw * 0.5, ph * 0.7);
    ctx.closePath();
    ctx.fill();

    // Legs / Running animation
    ctx.fillStyle = '#1e1b4b';
    const legOffset = Math.sin(p.runCycle) * 8;
    if (p.isGrounded) {
      // Left leg
      ctx.fillRect(pw * 0.25 - legOffset, ph * 0.65, 8, ph * 0.35);
      // Right leg
      ctx.fillRect(pw * 0.6 + legOffset, ph * 0.65, 8, ph * 0.35);
    } else {
      // Jumping pose (tucked/streamlined)
      ctx.fillRect(pw * 0.2, ph * 0.65, 8, ph * 0.25);
      ctx.fillRect(pw * 0.55, ph * 0.6, 8, ph * 0.3);
    }

    // Fantasy Robe / Torso
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(pw * 0.2, ph * 0.32, pw * 0.6, ph * 0.38);

    // Silver / Amethyst armor vest
    ctx.fillStyle = '#581c87';
    ctx.fillRect(pw * 0.25, ph * 0.35, pw * 0.5, ph * 0.25);
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pw * 0.25, ph * 0.35, pw * 0.5, ph * 0.25);

    // Anime Head / Skin
    ctx.fillStyle = '#fde2e4'; // Anime porcelain skin
    ctx.beginPath();
    ctx.arc(pw * 0.5, ph * 0.22, 13, 0, Math.PI * 2);
    ctx.fill();

    // Anime Hair (Silver-Lilac twin tails / bob)
    ctx.fillStyle = '#e9d5ff';
    ctx.beginPath();
    ctx.arc(pw * 0.5, ph * 0.18, 14, Math.PI, Math.PI * 2);
    ctx.lineTo(pw * 0.5 + 14, ph * 0.3);
    ctx.lineTo(pw * 0.5 - 14, ph * 0.3);
    ctx.closePath();
    ctx.fill();

    // Anime Fringe / bangs
    ctx.beginPath();
    ctx.moveTo(pw * 0.25, ph * 0.16);
    ctx.lineTo(pw * 0.45, ph * 0.26);
    ctx.lineTo(pw * 0.55, ph * 0.18);
    ctx.lineTo(pw * 0.75, ph * 0.26);
    ctx.lineTo(pw * 0.75, ph * 0.15);
    ctx.fill();

    // Anime Eye (Glowing Cyan)
    ctx.fillStyle = '#00dfd8';
    ctx.shadowColor = '#00dfd8';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(pw * 0.62, ph * 0.23, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Workout Aura / Ring when fan is engaged
    if (this.workoutCount > 0) {
      ctx.strokeStyle = `rgba(0, 223, 216, ${this.workoutCount * 0.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pw * 0.5, ph * 0.5, 36, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  loop = (timestamp) => {
    const dt = timestamp - (this.lastTime || timestamp);
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    requestAnimationFrame(this.loop);
  };
}
