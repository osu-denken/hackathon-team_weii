const MAX_PLAYERS = 4;
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

/* overlay elements */
const overlayPlayerCount = document.getElementById('overlay-player-count');
const overlayScoreFill = document.getElementById('overlay-score-fill');
const overlayScoreText = document.getElementById('overlay-score-text');
const overlayTime = document.getElementById('overlay-time');
const overlayStage = document.getElementById('overlay-stage');
const overlayStatus = document.getElementById('overlay-status');
const overlayBottom = document.getElementById('overlay-bottom');
const titleOverlay = document.getElementById('title-overlay');
const overlayStageTransition = document.getElementById('overlay-stage-transition');
const stageTransitionText = document.getElementById('stage-transition-text');
const returnNoticeOverlay = document.getElementById('return-notice');
const returnNoticeSeconds = document.getElementById('return-notice-seconds');
const titleCountdown = document.getElementById('title-countdown');
const titlePlayers = document.getElementById('title-players');
const titleDifficultyNormal = document.getElementById('title-difficulty-normal');
const titleDifficultyHard = document.getElementById('title-difficulty-hard');
const overlayClear = document.getElementById('overlay-clear');
const overlayClearScore = document.getElementById('overlay-clear-score');
const overlayClearTime = document.getElementById('overlay-clear-time');
const qrOverlay = document.getElementById('qr-overlay');

const setTitleVisible = (visible) => {
  if (!titleOverlay) return;
  titleOverlay.classList.toggle('show', visible);
};

const setDifficultyUI = (difficulty) => {
  if (titleDifficultyNormal) titleDifficultyNormal.classList.toggle('active', difficulty === 'normal');
  if (titleDifficultyHard) titleDifficultyHard.classList.toggle('active', difficulty === 'hard');
};

const selectDifficulty = (difficulty) => {
  if (state.game.difficulty === difficulty) return;
  state.game.difficulty = difficulty;
  setDifficultyUI(difficulty);
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'setDifficulty', difficulty }));
  }
};

const state = {
  characters: [],
  enemies: [],
  bullets: [],
  items: [],
  game: {
    stageScore: 0,
    totalPlayerScore: 0,
    targetScore: 100,
    timeLimitMs: 0,
    timeRemainingMs: 0,
    cleared: false,
    showReturnNotice: false,
    returnToTitleRemainingMs: 0,
    showTitle: true,
    waitingForStart: true,
    countdownRemainingMs: 10000,
    countdownStarted: false,
    playerCount: 0,
    difficulty: 'normal',
    stage: 1,
    stageLabel: 'Stage 1',
  },
};

const spritePaths = {
  1: '/asset/images/character-1.png',
  2: '/asset/images/character-2.png',
  3: '/asset/images/character-3.png',
  4: '/asset/images/character-4.png',
  5: '/asset/images/character-5.png',
};

const itemSpritePaths = {
  health_potion: '/asset/images/health_potion.png',
  score_up: '/asset/images/score_up.png',
  shield: '/asset/images/shield.png',
  triple_shot: '/asset/images/triple_shot.png',
};

const guideSpritePaths = {
  phone: '/asset/images/phone.png',
  arrow: '/asset/images/arrow.png',
};
const bulletSpritePath = '/asset/images/bullet.png';
const enemyBulletSpritePath = '/asset/images/enemy_bullet.png';
const stageBackgroundPaths = {
  2: '/asset/images/stage-second.png',
  3: '/asset/images/stage-final.png',
};

const spriteCache = new Map();
const spriteColors = new Map();
const itemSpriteCache = new Map();
const guideSpriteCache = new Map();
const stageBackgroundCache = new Map();
const bulletSprite = new Image();
const enemyBulletSprite = new Image();

const IDLE_GUIDE_DELAY_MS = 3500;
const IDLE_GUIDE_FADE_MS = 700;

const sampleSpriteColor = (img) => {
  if (!img.naturalWidth || !img.naturalHeight) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const context = canvas.getContext('2d');
  context.drawImage(img, 0, 0);

  const sampleX = Math.min(51, img.naturalWidth - 1);
  const sampleY = Math.min(22, img.naturalHeight - 1);
  const pixel = context.getImageData(sampleX, sampleY, 1, 1).data;
  return `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
};

const loadSprites = () => {
  Object.entries(spritePaths).forEach(([key, src]) => {
    const img = new Image();
    img.onload = () => {
      const color = sampleSpriteColor(img);
      if (color) {
        spriteColors.set(Number(key), color);
      }
    };
    img.src = src;
    spriteCache.set(Number(key), img);
  });

  Object.entries(itemSpritePaths).forEach(([key, src]) => {
    const img = new Image();
    img.src = src;
    itemSpriteCache.set(key, img);
  });

  Object.entries(guideSpritePaths).forEach(([key, src]) => {
    const img = new Image();
    img.src = src;
    guideSpriteCache.set(key, img);
  });

  Object.entries(stageBackgroundPaths).forEach(([key, src]) => {
    const img = new Image();
    img.src = src;
    stageBackgroundCache.set(Number(key), img);
  });

  bulletSprite.src = bulletSpritePath;
  enemyBulletSprite.src = enemyBulletSpritePath;
};

const formatTime = (ms) => {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

const renderPlayerSummary = () => {
  overlayBottom.innerHTML = '';

  state.characters.forEach((player, index) => {
    const color = player.color || ['#3D8FCD', '#E25252', '#40AD1D', '#C38F24', '#C846D6'][index] || '#38bdf8';
    const hp = player.hp ?? 0;
    const maxHp = player.maxHp ?? 1;
    const score = player.score ?? 0;
    const healthRatio = Math.max(0, Math.min(1, maxHp === 0 ? 0 : hp / maxHp));
    const isDead = player.dead ?? false;
    const deadUntil = player.deadUntil ?? 0;
    const respawnRemainingMs = isDead && deadUntil > Date.now() ? deadUntil - Date.now() : 0;
    const respawnSec = Math.ceil(respawnRemainingMs / 1000);

    // side panel card
    const card = document.createElement('div');
    card.className = 'player-card';
    card.innerHTML = `
      <div class="player-icon" style="background: ${color};">${player.number ?? index + 1}</div>
      <div class="player-info">
        <div>HP: ${hp} / ${maxHp} ・ Score: ${score}</div>
        <div class="player-bar"><div class="player-bar-fill" style="width: ${Math.round(healthRatio * 100)}%; background: linear-gradient(90deg, ${color}, #ffffff);"></div></div>
      </div>
    `;
    // no side panel; only bottom overlay

    // bottom overlay (horizontal)
    const bottom = document.createElement('div');
    bottom.className = 'player-card-bottom';
    if (isDead) {
      bottom.style.background = 'rgba(239,68,68,0.15)';
      bottom.style.borderColor = 'rgba(239,68,68,0.4)';
    }
    bottom.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="width:28px;height:28px;border-radius:50%;background:${isDead ? 'rgba(239,68,68,0.5)' : color};display:grid;place-items:center;font-weight:700;color:#fff;${isDead ? 'filter:grayscale(1);' : ''}">${player.number ?? index + 1}</div>
        <div style="display:flex;flex-direction:column;align-items:flex-start;">
          <div style="font-weight:700;${isDead ? 'color:#fca5a5;' : ''}">P${player.number ?? index + 1}</div>
          <div style="font-size:12px;color:#cfeffd">${isDead ? `リスポーンまで ${respawnSec} 秒` : `HP: ${hp}/${maxHp} ・ ${score}pt`}</div>
        </div>
      </div>
      <div style="width:80px;">
        ${isDead
          ? `<div style="font-size:18px;font-weight:700;color:#f87171;text-align:right;">${respawnSec}<span style="font-size:11px;margin-left:2px;">秒</span></div>`
          : `<div style="height:8px;background:rgba(255,255,255,0.08);border-radius:6px;overflow:hidden;"><div style="height:100%;width:${Math.round(healthRatio*100)}%;background:${color};"></div></div>`
        }
      </div>
    `;
    overlayBottom.appendChild(bottom);
  });
};

const updateGameUI = () => {
  const {
    stageScore,
    totalPlayerScore,
    targetScore,
    timeRemainingMs,
    cleared,
    showTitle,
    showReturnNotice,
    returnToTitleRemainingMs,
    waitingForStart,
    countdownRemainingMs,
    countdownStarted,
    playerCount,
    difficulty,
    stage,
    stageLabel,
  } = state.game;
  const percent = targetScore > 0 ? Math.min(100, Math.round((stageScore / targetScore) * 100)) : 0;
  // overlay updates (no side panel elements)
  if (overlayScoreFill) overlayScoreFill.style.width = `${percent}%`;
  if (overlayScoreText) overlayScoreText.textContent = `${percent}%`;
  if (overlayTime) overlayTime.textContent = formatTime(timeRemainingMs);
  if (overlayStage) overlayStage.textContent = stageLabel || `Stage ${stage || 1}`;
  if (overlayPlayerCount) overlayPlayerCount.textContent = `${playerCount} / ${MAX_PLAYERS}`;
  if (returnNoticeOverlay) {
    returnNoticeOverlay.classList.toggle('show', showReturnNotice);
  }
  if (returnNoticeSeconds) {
    returnNoticeSeconds.textContent = String(Math.max(1, Math.ceil(returnToTitleRemainingMs / 1000)));
  }
  if (overlayClear) {
    if (cleared && !showTitle && !showReturnNotice && !waitingForStart) {
      overlayClear.classList.add('show');
      if (overlayClearScore) overlayClearScore.textContent = `${stageScore} / ${targetScore}`;
      if (overlayClearTime) overlayClearTime.textContent = formatTime(timeRemainingMs);
    } else {
      overlayClear.classList.remove('show');
    }
  }
  const shouldShowTitle = showTitle || waitingForStart;
  setTitleVisible(shouldShowTitle && !showReturnNotice);

  if (waitingForStart) {
    if (titleCountdown) {
      if (countdownStarted && playerCount > 0) {
        titleCountdown.textContent = `ゲーム開始まで ${Math.ceil(countdownRemainingMs / 1000)} 秒`;
      } else {
        titleCountdown.textContent = '参加プレイヤーを待っています';
      }
    }
    if (titlePlayers) {
      titlePlayers.textContent = `参加プレイヤー: ${playerCount}人`;
    }
    if (titleDifficultyNormal && titleDifficultyHard) {
      titleDifficultyNormal.classList.toggle('active', difficulty === 'normal');
      titleDifficultyHard.classList.toggle('active', difficulty === 'hard');
    }
    const titleStage = document.getElementById('title-stage');
    if (titleStage) {
      titleStage.textContent = stageLabel || `Stage ${stage || 1}`;
    }
  }
  renderPlayerSummary();
};

const resize = () => {
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * scale);
  canvas.height = Math.floor(rect.height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
};

window.addEventListener('resize', resize);
resize();
loadSprites();

const fallbackClientUrl = `${window.location.protocol}//${window.location.host}/client/`;
const setQrOverlay = (clientUrl) => {
  if (qrOverlay)
    qrOverlay.src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(clientUrl)}`;
};

const loadClientUrl = async () => {
  try {
    const response = await fetch('/api/client-url', { cache: 'no-store' });
    if (!response.ok) {
      return fallbackClientUrl;
    }

    const data = await response.json();
    return typeof data.clientUrl === 'string' && data.clientUrl ? data.clientUrl : fallbackClientUrl;
  } catch (error) {
    return fallbackClientUrl;
  }
};

loadClientUrl().then(setQrOverlay);

const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const wsUrl = `${wsProtocol}://${window.location.host}`;
const socket = new WebSocket(wsUrl);

if (titleDifficultyNormal) {
  titleDifficultyNormal.addEventListener('click', () => selectDifficulty('normal'));
}
if (titleDifficultyHard) {
  titleDifficultyHard.addEventListener('click', () => selectDifficulty('hard'));
}

const setConnected = (connected) => {
  if (overlayStatus) {
    overlayStatus.textContent = connected ? 'connected' : 'disconnected';
    overlayStatus.className = `overlay-status ${connected ? 'connected' : 'disconnected'}`;
  }
};

socket.addEventListener('open', () => {
  setConnected(true);
  socket.send(JSON.stringify({ type: 'viewer' }));
});

socket.addEventListener('close', () => {
  setConnected(false);
});

socket.addEventListener('error', () => {
  setConnected(false);
});

socket.addEventListener('message', (e) => {
  let payload;
  try {
    payload = JSON.parse(e.data);
  } catch (error) {
    return;
  }

  if (payload.type === 'update') {
    const prevStage = state.game.stage;
    state.characters = Array.isArray(payload.characters)
      ? payload.characters.slice(0, MAX_PLAYERS)
      : [];
    state.enemies = Array.isArray(payload.enemies) ? payload.enemies : [];
    state.bullets = Array.isArray(payload.bullets) ? payload.bullets : [];
    state.items = Array.isArray(payload.items) ? payload.items : [];
    state.game = payload.game
      ? {
          stageScore: payload.game.stageScore ?? 0,
          totalPlayerScore: payload.game.totalPlayerScore ?? 0,
          targetScore: payload.game.targetScore ?? 100,
          timeLimitMs: payload.game.timeLimitMs ?? 0,
          timeRemainingMs: payload.game.timeRemainingMs ?? 0,
          cleared: payload.game.cleared ?? false,
          showReturnNotice: payload.game.showReturnNotice ?? false,
          returnToTitleRemainingMs: payload.game.returnToTitleRemainingMs ?? 0,
          showTitle: payload.game.showTitle ?? false,
          waitingForStart: payload.game.waitingForStart ?? false,
          countdownRemainingMs: payload.game.countdownRemainingMs ?? 0,
          countdownStarted: payload.game.countdownStarted ?? false,
          playerCount: payload.game.playerCount ?? 0,
          difficulty: payload.game.difficulty ?? 'normal',
          stageNumber: payload.game.stageNumber ?? 1,
          stage: payload.game.stage ?? 1,
          stageLabel: payload.game.stageLabel ?? 'Stage 1',
        }
      : state.game;

    if (payload.game && typeof payload.game.stage === 'number' && payload.game.stage > prevStage) {
      showStageTransition(payload.game.stage, payload.game.stageLabel);
    }

    updateGameUI();
  }
});

let stageTransitionTimeout = null;

const showStageTransition = (stage, stageLabel) => {
  if (!overlayStageTransition || !stageTransitionText) return;
  const labelText = stageLabel || `Stage ${stage}`;
  stageTransitionText.textContent = `${labelText} へ進みます`;
  overlayStageTransition.classList.add('show');
  if (stageTransitionTimeout) {
    clearTimeout(stageTransitionTimeout);
  }
  stageTransitionTimeout = setTimeout(() => {
    overlayStageTransition.classList.remove('show');
    stageTransitionTimeout = null;
  }, 3000);
};

const toCanvasX = (x, width) => width / 2 + x * 70;
const toCanvasY = (y, height) => height - 120 - y * 42;

const drawGrid = (width, height) => {
  ctx.save();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
  ctx.lineWidth = 1;
  for (let gx = width / 2 - 320; gx <= width / 2 + 320; gx += 64) {
    ctx.globalAlpha = gx === width / 2 ? 0.75 : 0.18;
    ctx.beginPath();
    ctx.moveTo(gx, 34);
    ctx.lineTo(gx, height - 96);
    ctx.stroke();
  }
  for (let gy = height - 120; gy >= 36; gy -= 48) {
    ctx.globalAlpha = gy === height - 120 ? 0.4 : 0.14;
    ctx.beginPath();
    ctx.moveTo(36, gy);
    ctx.lineTo(width - 36, gy);
    ctx.stroke();
  }
  ctx.restore();
};

const drawItem = (item, width, height) => {
  const x = toCanvasX(item.x, width);
  const y = toCanvasY(item.y, height);
  const sprite = itemSpriteCache.get(item.type);
  if (sprite && sprite.complete) {
    const size = 36;
    ctx.save();
    ctx.shadowColor = 'rgba(255,255,255,0.35)';
    ctx.shadowBlur = 16;
    ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
    ctx.restore();
    return;
  }
  ctx.save();
  if (item.type === 'health_potion') {
    ctx.shadowColor = '#34d399';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(x - 10, y - 10, 20, 20);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 3, y - 8, 6, 16);
    ctx.fillRect(x - 8, y - 3, 16, 6);
  } else if (item.type === 'score_up') {
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
  } else if (item.type === 'shield') {
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#8b5cf6';
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 6);
    ctx.lineTo(x + 4, y + 6);
    ctx.lineTo(x - 2, y - 6);
    ctx.lineTo(x + 10, y - 6);
    ctx.lineTo(x - 4, y + 6);
    ctx.lineTo(x + 2, y + 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
};

const drawEnemy = (enemy, width, height) => {
  const x = toCanvasX(enemy.x, width);
  const y = toCanvasY(enemy.y, height);
  const isBig = enemy.type === 'big';
  const radius = isBig ? 24 : 16;
  const color = isBig ? '#f43f5e' : '#ef4444';
  const border = isBig ? '#fbbf24' : '#ffffff';

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = isBig ? 26 : 16;
  ctx.fillStyle = color;
  ctx.beginPath();
  const points = isBig ? 6 : 4;
  for (let i = 0; i < points; i++) {
    const angle = (Math.PI * 2 * i) / points - Math.PI / 4;
    const offset = radius + (i % 2 === 0 ? 6 : 0);
    const px = x + Math.cos(angle) * offset;
    const py = y + Math.sin(angle) * offset;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < points; i++) {
    const angle = (Math.PI * 2 * i) / points - Math.PI / 4;
    const offset = radius + (i % 2 === 0 ? 6 : 0);
    const px = x + Math.cos(angle) * offset;
    const py = y + Math.sin(angle) * offset;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();

  const hp = enemy.hp ?? 0;
  const maxHp = enemy.maxHp ?? 1;
  const hpRatio = Math.max(0, Math.min(1, hp / maxHp));
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x - 24, y - radius - 18, 48, 8);
  ctx.fillStyle = '#fb7185';
  ctx.fillRect(x - 24, y - radius - 18, 48 * hpRatio, 8);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 24, y - radius - 18, 48, 8);
};

const drawPlayer = (player, index, width, height) => {
  const isDead = player.dead ?? false;
  // 死亡中（リスポーン待ち10秒）は非表示。リスポーン直前3秒は点滅させる
  if (isDead) {
    const respawnRemainingMs = player.deadUntil && player.deadUntil > Date.now() ? player.deadUntil - Date.now() : 0;
    if (respawnRemainingMs > 3000) {
      return; // リスポーンまで3秒以上あれば完全非表示
    }
    // 残り3秒以内なら点滅（100msごと）
    if (Math.floor(Date.now() / 100) % 2 === 0) {
      return;
    }
  }

  const x = toCanvasX(player.x, width);
  const y = height - 130;
  const fallbackColor = player.color || ['#22d3ee', '#fbbf24'][index] || '#38bdf8';
  const hp = player.hp ?? 0;
  const maxHp = player.maxHp ?? 1;
  const hpRatio = Math.max(0, Math.min(1, hp / maxHp));
  const number = player.number ?? index + 1;
  const sprite = spriteCache.get(number);
  const sampledColor = spriteColors.get(number);
  const color = sampledColor || fallbackColor; // キャラクターごとの色をスプライトからサンプリングして使用。失敗した場合はフォールバックカラーを使用
  const spriteSize = 70;
  const lastControlAt = player.lastControlAt ?? 0;
  const idleMs = Date.now() - lastControlAt;
  // 死亡中はガイドを表示しない
  const guideVisible = !isDead && idleMs >= IDLE_GUIDE_DELAY_MS;

  // シールド（無敵）中かどうか
  const shieldUntil = player.shieldUntil ?? 0;
  const hasShield = shieldUntil > Date.now();
  const shieldPulse = hasShield ? (Math.sin(Date.now() / 150) * 0.5 + 0.5) : 0; // 0.0〜1.0で点滅

  if (sprite && sprite.complete) {
    ctx.save();
    if (hasShield) {
      // シールド中は青白いグローを強く
      ctx.shadowColor = `rgba(56, 189, 248, ${0.6 + shieldPulse * 0.4})`;
      ctx.shadowBlur = 28 + shieldPulse * 14;
    } else {
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
    }
    ctx.drawImage(sprite, x - spriteSize / 2, y - spriteSize / 2, spriteSize, spriteSize);
    ctx.restore();
  } else {
    ctx.save();
    ctx.shadowColor = hasShield ? '#38bdf8' : color;
    ctx.shadowBlur = hasShield ? 28 + shieldPulse * 14 : 20;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.stroke();
  }

  // シールド中のオーバーレイ（六角形のバリア風エフェクト）
  if (hasShield) {
    ctx.save();
    const shieldRadius = spriteSize / 2 + 10 + shieldPulse * 4;
    const shieldAlpha = 0.25 + shieldPulse * 0.2;
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.7 + shieldPulse * 0.3})`;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 6;
      const px = x + Math.cos(angle) * shieldRadius;
      const py = y + Math.sin(angle) * shieldRadius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    // 内側の薄い塗り
    ctx.fillStyle = `rgba(56, 189, 248, ${shieldAlpha * 0.3})`;
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`P${number}`, x, y + 52);

  const barWidth = 60;
  const barHeight = 10;
  const barY = y - 52;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x - barWidth / 2, barY, barWidth, barHeight);
  ctx.fillStyle = '#34d399';
  ctx.fillRect(x - barWidth / 2, barY, barWidth * hpRatio, barHeight);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - barWidth / 2, barY, barWidth, barHeight);

  ctx.imageSmoothingEnabled = false;

  if (guideVisible) {
    const guideFade = Math.min(1, (idleMs - IDLE_GUIDE_DELAY_MS) / IDLE_GUIDE_FADE_MS);
    const guideAlpha = Math.max(0, Math.min(1, guideFade));
    const bob = Math.sin(Date.now() / 240 + index) * 5;
    const guideBaseY = barY - 34 + bob;
    const phone = guideSpriteCache.get('phone');
    const arrow = guideSpriteCache.get('arrow');
    const phoneWidth = 64;
    const phoneHeight = 64;
    const arrowWidth = 24;
    const arrowHeight = 24;

    ctx.save();
    ctx.globalAlpha = guideAlpha;

    let rotate = Math.sin(Date.now() / 260 + index) * 0.12;

    if (arrow && arrow.complete) {
      ctx.save();
      ctx.translate(x - 32, guideBaseY);
      ctx.scale(-1, 1);
      ctx.rotate(rotate);
      ctx.drawImage(arrow, -arrowWidth / 2, -arrowHeight / 2, arrowWidth, arrowHeight);
      ctx.restore();

      ctx.save();
      ctx.translate(x + 32, guideBaseY);
      ctx.scale(1, -1);
      ctx.rotate(rotate);
      ctx.drawImage(arrow, -arrowWidth / 2, -arrowHeight / 2, arrowWidth, arrowHeight);
      ctx.restore();
    }

    if (phone && phone.complete) {
      ctx.save();
      ctx.translate(x, guideBaseY + 2);
      ctx.rotate(rotate);
      ctx.drawImage(phone, -phoneWidth / 2, -phoneHeight / 2, phoneWidth, phoneHeight);
      ctx.restore();
    }

    ctx.fillStyle = '#d9f4ff';
    ctx.font = '700 16px sans-serif';
    ctx.fillText('スマホをかたむけてね！', x, guideBaseY - 28);
    ctx.restore();
  }
};

const draw = () => {
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  const stageNumber = state.game.stageNumber || 1;
  const stageBackground = stageBackgroundCache.get(stageNumber);
  if (stageBackground && stageBackground.complete && stageBackground.naturalWidth > 0) {
    ctx.drawImage(stageBackground, 0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#040916';
    ctx.fillRect(0, 0, width, height);
  }

  drawGrid(width, height);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(40, height - 90, width - 80, 6);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(40, height - 96, width - 80, 2);

  state.items.forEach((item) => drawItem(item, width, height));
  state.enemies.forEach((enemy) => drawEnemy(enemy, width, height));
  state.bullets.forEach((bullet) => {
    const x = toCanvasX(bullet.x, width);
    const y = toCanvasY(bullet.y, height);
    ctx.save();
    const isEnemyBullet = bullet.ownerType === 'enemy';
    ctx.shadowColor = isEnemyBullet ? 'rgba(248, 113, 113, 0.75)' : '#22d3ee';
    ctx.shadowBlur = 16;
    if (isEnemyBullet && enemyBulletSprite.complete && enemyBulletSprite.naturalWidth > 0) {
      const drawWidth = 16;
      const drawHeight = 24;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, -1);
      ctx.drawImage(enemyBulletSprite, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();
    } else if (!isEnemyBullet && bulletSprite.complete && bulletSprite.naturalWidth > 0) {
      const drawWidth = 16;
      const drawHeight = 24;
      ctx.drawImage(bulletSprite, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight);
    } else {
      ctx.fillStyle = isEnemyBullet ? '#ef4444' : '#38bdf8';
      ctx.fillRect(x - 5, y - 8, 10, 16);
    }
    ctx.restore();
  });

  state.characters.forEach((player, index) => drawPlayer(player, index, width, height));

  requestAnimationFrame(draw);
};

draw();