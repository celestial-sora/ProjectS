import confetti from 'canvas-confetti';
import { sound } from './audio.js';
import { TeachableClassifier } from './teachable.js';
import { DolaGame } from './game.js';

// DOM elements
const canvas = document.getElementById('game-canvas');
const hudTime = document.getElementById('hud-time');
const hudScore = document.getElementById('hud-score');
const hudComboDots = document.getElementById('hud-combo-dots');

const btnStart = document.getElementById('btn-start');
const btnRestart = document.getElementById('btn-restart');
const btnSoundToggle = document.getElementById('btn-sound-toggle');
const iconSound = document.getElementById('icon-sound');

const startModal = document.getElementById('start-modal');
const gameoverModal = document.getElementById('gameover-modal');

const aiStatusText = document.getElementById('ai-status-text');
const aiStatusPill = document.getElementById('ai-status-pill');
const webcamContainer = document.getElementById('webcam-container');
const gestureBadge = document.getElementById('gesture-badge');
const jumpIndicator = document.getElementById('jump-indicator');
const fanProbEl = document.getElementById('fan-prob');
const fanBarEl = document.getElementById('fan-bar');
const emptyProbEl = document.getElementById('empty-prob');
const emptyBarEl = document.getElementById('empty-bar');

const comboBanner = document.getElementById('combo-banner');
const comboBannerText = document.getElementById('combo-banner-text');

// Modal Live Camera & Calibration Elements
const modalWebcamMount = document.getElementById('modal-webcam-mount');
const modalTestBadge = document.getElementById('modal-test-badge');
const modalJumpFlash = document.getElementById('modal-jump-flash');
const modalFanProb = document.getElementById('modal-fan-prob');
const modalFanBar = document.getElementById('modal-fan-bar');
const modalEmptyProb = document.getElementById('modal-empty-prob');
const modalEmptyBar = document.getElementById('modal-empty-bar');
const modalFeedbackHint = document.getElementById('modal-feedback-hint');

// Game Over Summary Elements
const summaryRank = document.getElementById('summary-rank');
const summaryScore = document.getElementById('summary-score');
const summaryEval = document.getElementById('summary-eval');
const statCollected = document.getElementById('stat-collected');
const statHits = document.getElementById('stat-hits');
const statJumps = document.getElementById('stat-jumps');
const statBonuses = document.getElementById('stat-bonuses');

// Initialize Game Engine
let game = null;
let lastFanJumpTime = 0;
const FAN_JUMP_COOLDOWN_MS = 650; // prevent continuous triggers in rapid frames

function updateComboDots(count) {
  if (!hudComboDots) return;
  const dots = hudComboDots.children;
  for (let i = 0; i < dots.length; i++) {
    if (i < count) {
      dots[i].className = 'w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b] transition-all';
    } else {
      dots[i].className = 'w-2 h-2 rounded-full bg-slate-700 transition-all';
    }
  }
}

function showComboBanner(message) {
  comboBannerText.innerText = message;
  comboBanner.classList.remove('opacity-0', '-translate-y-4');
  comboBanner.classList.add('opacity-100', 'translate-y-0');
  
  setTimeout(() => {
    comboBanner.classList.remove('opacity-100', 'translate-y-0');
    comboBanner.classList.add('opacity-0', '-translate-y-4');
  }, 2200);
}

// Game callbacks
game = new DolaGame(canvas, {
  onScoreUpdate: (score, stats) => {
    hudScore.innerText = score;
    updateComboDots(game.workoutCount);
  },
  onTimeUpdate: (timeLeft) => {
    hudTime.innerHTML = `${timeLeft}<span class="text-xs text-slate-400 font-normal">s</span>`;
    if (timeLeft <= 10) {
      hudTime.className = "font-mono text-xl font-bold text-rose-400 animate-pulse";
    } else {
      hudTime.className = "font-mono text-xl font-bold text-cyan-300";
    }
  },
  onBonusCombo: (message) => {
    showComboBanner(message);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#00dfd8', '#ffd700', '#7928ca']
    });
  },
  onGameOver: (finalScore, stats) => {
    // Show summary modal
    summaryScore.innerText = finalScore;
    statCollected.innerText = stats.collectiblesPicked;
    statHits.innerText = stats.obstaclesHit;
    statJumps.innerText = stats.jumpsExecuted;
    statBonuses.innerText = stats.bonusesEarned;

    // Rank evaluation
    let rank = 'C';
    let evalText = 'Initiate of Shadows';
    if (finalScore >= 35) {
      rank = 'S';
      evalText = 'Transcendent Shadow Monarch';
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
    } else if (finalScore >= 20) {
      rank = 'A';
      evalText = 'Abyssal Blademaster';
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } else if (finalScore >= 10) {
      rank = 'B';
      evalText = 'Ethereal Wanderer';
    }

    summaryRank.innerText = rank;
    summaryEval.innerText = evalText;

    gameoverModal.classList.remove('hidden');
  }
});

// Start loop
requestAnimationFrame(game.loop);

// Initialize Teachable Machine Classifier
const classifier = new TeachableClassifier({
  onStatusChange: ({ status, message }) => {
    aiStatusText.innerText = message;
    if (status === 'active') {
      aiStatusPill.classList.remove('text-slate-300');
      aiStatusPill.classList.add('text-emerald-400', 'border-emerald-500/30');
      const dot = aiStatusPill.querySelector('span');
      if (dot) dot.className = 'w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]';
    } else if (status === 'error' || status === 'camera-error') {
      aiStatusPill.classList.add('text-rose-400', 'border-rose-500/30');
      const dot = aiStatusPill.querySelector('span');
      if (dot) dot.className = 'w-2 h-2 rounded-full bg-rose-400';
    }
  },
  onPrediction: ({ topClass, fanProbability, emptyProbability, isFanConfident }) => {
    const fanPct = Math.round(fanProbability * 100);
    const emptyPct = Math.round(emptyProbability * 100);

    // Update bottom HUD webcam gauge
    fanProbEl.innerText = `${fanPct}%`;
    fanBarEl.style.width = `${fanPct}%`;
    emptyProbEl.innerText = `${emptyPct}%`;
    emptyBarEl.style.width = `${emptyPct}%`;

    // Update Start Modal live preview gauge (Before game starts)
    if (modalFanProb) modalFanProb.innerText = `${fanPct}%`;
    if (modalFanBar) modalFanBar.style.width = `${fanPct}%`;
    if (modalEmptyProb) modalEmptyProb.innerText = `${emptyPct}%`;
    if (modalEmptyBar) modalEmptyBar.style.width = `${emptyPct}%`;

    // Highlight active badge & test indicator
    if (isFanConfident) {
      gestureBadge.innerText = 'FAN (JUMP)';
      gestureBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-400/40 uppercase shadow-[0_0_8px_rgba(0,223,216,0.5)]';
      fanBarEl.className = 'h-full bg-cyan-400 shadow-[0_0_8px_#00dfd8] rounded-full transition-all duration-75';

      if (modalTestBadge) {
        modalTestBadge.innerText = 'FAN DETECTED (READY!)';
        modalTestBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-400 shadow-[0_0_10px_rgba(0,223,216,0.6)] uppercase animate-pulse';
      }
      if (modalJumpFlash) {
        modalJumpFlash.style.opacity = '1';
        setTimeout(() => { if (modalJumpFlash) modalJumpFlash.style.opacity = '0'; }, 300);
      }
      if (modalFeedbackHint) {
        modalFeedbackHint.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span><span class="text-emerald-300 font-semibold">Perfect! Confidence is ≥ 90% — you are ready to jump in game!</span>';
      }

      // Trigger Jump if cooldown passed and game is playing
      const now = performance.now();
      if (now - lastFanJumpTime > FAN_JUMP_COOLDOWN_MS) {
        lastFanJumpTime = now;
        
        // Flash Jump Indicator in PIP
        jumpIndicator.style.opacity = '1';
        setTimeout(() => {
          jumpIndicator.style.opacity = '0';
        }, 300);

        game.jump();
      }
    } else {
      gestureBadge.innerText = topClass.toUpperCase();
      gestureBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-white/5 uppercase';
      fanBarEl.className = 'h-full bg-cyan-600/70 rounded-full transition-all duration-75';

      if (modalTestBadge) {
        modalTestBadge.innerText = `${topClass.toUpperCase()} (${Math.max(fanPct, emptyPct)}%)`;
        modalTestBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-white/10 uppercase';
      }
      if (modalFeedbackHint) {
        modalFeedbackHint.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span><span>Raise/wave fan until Confidence reaches ≥ 90% to trigger Jump.</span>';
      }
    }
  }
});

// Setup Classifier & Webcam (Streaming to both modal preview and PIP monitor)
async function initAI() {
  try {
    await classifier.load();
    await classifier.setupWebcam([webcamContainer, modalWebcamMount], 220, 220, true);
  } catch (err) {
    console.warn("AI Init Notice:", err.message);
    const placeholder = document.getElementById('camera-placeholder');
    if (placeholder) {
      placeholder.innerHTML = `
        <div class="text-amber-400 text-xs font-semibold mb-1">Webcam not active</div>
        <div class="text-[10px] text-slate-400">You can still play using <kbd class="text-cyan-300 bg-white/10 px-1 py-0.5 rounded">Spacebar</kbd></div>
      `;
    }
    if (modalWebcamMount) {
      modalWebcamMount.innerHTML = `
        <div class="text-center p-2">
          <div class="text-amber-400 text-[10px] font-semibold">Camera Denied</div>
          <span class="text-[9px] text-slate-400">Spacebar enabled</span>
        </div>
      `;
    }
  }
}

// Start button
btnStart.addEventListener('click', () => {
  sound.init();
  startModal.classList.add('hidden');
  game.start();
});

// Restart button
btnRestart.addEventListener('click', () => {
  sound.init();
  gameoverModal.classList.add('hidden');
  game.start();
});

// Sound toggle
let soundMuted = false;
btnSoundToggle.addEventListener('click', () => {
  soundMuted = !soundMuted;
  sound.enabled = !soundMuted;
  if (soundMuted) {
    iconSound.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />`;
    btnSoundToggle.classList.add('text-rose-400');
  } else {
    iconSound.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />`;
    btnSoundToggle.classList.remove('text-rose-400');
  }
});

// Backup Keyboard controls (Space / ArrowUp)
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    if (game.state === 'PLAYING') {
      game.jump();
    } else if (game.state === 'IDLE' && !startModal.classList.contains('hidden')) {
      btnStart.click();
    } else if (game.state === 'GAMEOVER' && !gameoverModal.classList.contains('hidden')) {
      btnRestart.click();
    }
  }
});

// Boot AI on page ready
initAI();
