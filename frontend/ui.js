import { state, MAX_PLAYERS } from './state.js';
import { spriteColors } from './assets.js';

export const elements = {
  overlayPlayerCount: document.getElementById('overlay-player-count'),
  overlayScoreFill: document.getElementById('overlay-score-fill'),
  overlayScoreText: document.getElementById('overlay-score-text'),
  overlayTime: document.getElementById('overlay-time'),
  overlayStage: document.getElementById('overlay-stage'),
  overlayStatus: document.getElementById('overlay-status'),
  overlayBottom: document.getElementById('overlay-bottom'),
  titleOverlay: document.getElementById('title-overlay'),
  overlayStageTransition: document.getElementById('overlay-stage-transition'),
  overlayGameOver: document.getElementById('overlay-gameover'),
  stageTransitionText: document.getElementById('stage-transition-text'),
  returnNoticeOverlay: document.getElementById('return-notice'),
  returnNoticeSeconds: document.getElementById('return-notice-seconds'),
  titleCountdown: document.getElementById('title-countdown'),
  titlePlayers: document.getElementById('title-players'),
  titleDifficultyNormal: document.getElementById('title-difficulty-normal'),
  titleDifficultyHard: document.getElementById('title-difficulty-hard'),
  overlayClear: document.getElementById('overlay-clear'),
  overlayClearScore: document.getElementById('overlay-clear-score'),
  overlayClearTime: document.getElementById('overlay-clear-time'),
  qrOverlay: document.getElementById('qr-overlay')
};

export const setTitleVisible = (visible) => {
  if (!elements.titleOverlay) return;
  elements.titleOverlay.classList.toggle('show', visible);
};

export const setDifficultyUI = (difficulty) => {
  if (elements.titleDifficultyNormal) elements.titleDifficultyNormal.classList.toggle('active', difficulty === 'normal');
  if (elements.titleDifficultyHard) elements.titleDifficultyHard.classList.toggle('active', difficulty === 'hard');
};

export const formatTime = (ms) => {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

export const renderPlayerSummary = () => {
  if (!elements.overlayBottom) return;

  while (elements.overlayBottom.children.length > state.players.length) {
    elements.overlayBottom.removeChild(elements.overlayBottom.lastChild);
  }
  while (elements.overlayBottom.children.length < state.players.length) {
    const bottom = document.createElement('div');
    bottom.className = 'player-card-bottom';

    bottom.innerHTML = `
      <div class="pcb-left" style="display:flex;align-items:center;gap:8px;">
        <div class="pcb-item-meter" style="width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.2);transition:background 0.1s;">
          <div class="pcb-icon" style="width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-weight:700;color:#fff;transition:all 0.2s;background-size:180%;background-position:center 20%;image-rendering:pixelated;background-repeat:no-repeat;border:2px solid #1e293b;"></div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-start;">
          <div class="pcb-name" style="font-weight:700;transition:color 0.2s;"></div>
          <div class="pcb-status" style="font-size:12px;color:#cfeffd"></div>
        </div>
      </div>
      <div class="pcb-right" style="display:flex; align-items: center; justify-content: flex-end; min-width: 80px;">
        <div class="pcb-respawn" style="display:none;font-size:18px;font-weight:700;color:#f87171;text-align:right;">
          <span class="respawn-sec"></span><span style="font-size:11px;margin-left:2px;">秒</span>
        </div>
        <div class="pcb-hp-blocks" style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;"></div>
      </div>
    `;
    elements.overlayBottom.appendChild(bottom);
  }

  state.players.forEach((player, index) => {
    const pNum = player.number ?? index + 1;
    const fallbackColor = player.color || ['#3D8FCD', '#E25252', '#40AD1D', '#C38F24', '#C846D6', '#47D8B2', '#2549BA'][index] || '#38bdf8';
    const sampledColor = spriteColors.get(pNum);
    const color = sampledColor || fallbackColor;

    const hp = Math.floor(player.hp ?? 0);
    const maxHp = Math.floor(player.maxHp ?? 1);
    const score = Math.floor(player.score ?? 0);
    const isDead = player.dead ?? false;
    const deadUntil = player.deadUntil ?? 0;
    const respawnRemainingMs = isDead && deadUntil > Date.now() ? deadUntil - Date.now() : 0;
    const respawnSec = Math.ceil(respawnRemainingMs / 1000);

    const bottom = elements.overlayBottom.children[index];

    if (bottom.dataset.isDead !== String(isDead)) {
      bottom.dataset.isDead = String(isDead);
      if (isDead) {
        bottom.style.background = 'rgba(239,68,68,0.15)';
        bottom.style.borderColor = 'rgba(239,68,68,0.4)';
      } else {
        bottom.style.background = '';
        bottom.style.borderColor = '';
      }
    }

    const icon = bottom.querySelector('.pcb-icon');
    const charNum = player.characterNumber || pNum || 1;
    const iconHash = `${charNum}:${isDead}`;
    if (icon.dataset.hash !== iconHash) {
      icon.dataset.hash = iconHash;

      let validCharNum = charNum;
      if (typeof validCharNum !== 'number' || validCharNum < 1 || validCharNum > 8) {
        validCharNum = 1;
      }
      const spriteUrl = `../asset/images/character-${validCharNum}.png`;

      icon.style.backgroundImage = `url('${spriteUrl}')`;
      icon.style.backgroundColor = isDead ? 'rgba(239,68,68,0.5)' : color;
      icon.style.filter = isDead ? 'grayscale(1)' : '';
      icon.textContent = '';
    }

    const name = bottom.querySelector('.pcb-name');
    const displayName = player.name || `P${pNum}`;
    const nameHash = `${displayName}:${isDead}`;
    if (name.dataset.hash !== nameHash) {
      name.dataset.hash = nameHash;
      name.dataset.pNum = String(pNum);
      name.dataset.isDead = String(isDead);
      name.style.color = isDead ? '#fca5a5' : '';
      name.textContent = displayName;
    }

    const status = bottom.querySelector('.pcb-status');
    const statusHash = `${isDead}:${respawnSec}:${hp}:${maxHp}:${score}`;
    if (status.dataset.hash !== statusHash) {
      status.dataset.hash = statusHash;
      status.textContent = isDead ? `リスポーンまで` : `${score}pt`;
    }

    const now = Date.now();
    const shieldUntil = player.shieldUntil || 0;
    const tripleShotUntil = player.tripleShotUntil || 0;
    const scoreDoubleUntil = player.scoreDoubleUntil || 0;

    let remaining = 0;
    let maxDuration = 1;
    let meterColor = 'transparent';

    if (shieldUntil > now) {
      remaining = shieldUntil - now;
      maxDuration = 5000;
      meterColor = '#60a5fa';
    } else if (tripleShotUntil > now) {
      remaining = tripleShotUntil - now;
      maxDuration = 5000;
      meterColor = '#f87171';
    } else if (scoreDoubleUntil > now) {
      remaining = scoreDoubleUntil - now;
      maxDuration = 8000;
      meterColor = '#fbbf24';
    }

    const meter = bottom.querySelector('.pcb-item-meter');
    if (meter) {
      if (remaining > 0) {
        const percentage = Math.max(0, Math.min(100, (remaining / maxDuration) * 100));
        meter.style.background = `conic-gradient(${meterColor} ${percentage}%, rgba(255,255,255,0.2) 0)`;
      } else {
        meter.style.background = 'rgba(255,255,255,0.2)';
      }
    }

    const respawnDiv = bottom.querySelector('.pcb-respawn');
    const hpBlocksDiv = bottom.querySelector('.pcb-hp-blocks');

    if (isDead) {
      if (respawnDiv.style.display !== 'block') {
        respawnDiv.style.display = 'block';
        hpBlocksDiv.style.display = 'none';
      }
      const respawnSecSpan = respawnDiv.querySelector('.respawn-sec');
      if (respawnSecSpan.textContent !== String(respawnSec)) {
        respawnSecSpan.textContent = String(respawnSec);
      }
    } else {
      if (hpBlocksDiv.style.display !== 'flex') {
        hpBlocksDiv.style.display = 'flex';
        respawnDiv.style.display = 'none';
      }

      while (hpBlocksDiv.children.length > maxHp) {
        hpBlocksDiv.removeChild(hpBlocksDiv.lastChild);
      }
      while (hpBlocksDiv.children.length < maxHp) {
        const block = document.createElement('div');
        block.style.width = '8px';
        block.style.height = '12px';
        block.style.transition = 'all 0.2s';
        hpBlocksDiv.appendChild(block);
      }

      for (let i = 0; i < maxHp; i++) {
        const block = hpBlocksDiv.children[i];
        const isFilled = i < hp;
        const blockHash = `${isFilled}:${color}`;
        if (block.dataset.hash !== blockHash) {
          block.dataset.hash = blockHash;
          block.style.background = isFilled ? color : 'rgba(255, 255, 255, 0.15)';
          block.style.boxShadow = isFilled ? `0 0 6px ${color}` : 'none';
        }
      }
    }
  });
};

export const updateGameUI = () => {
  const {
    stageScore,
    targetScore,
    timeRemainingMs,
    cleared,
    gameOver,
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

  if (elements.overlayScoreFill) elements.overlayScoreFill.style.width = `${percent}%`;
  if (elements.overlayScoreText) elements.overlayScoreText.textContent = `${percent}%`;
  if (elements.overlayTime) elements.overlayTime.textContent = formatTime(timeRemainingMs);
  if (elements.overlayStage) elements.overlayStage.textContent = stageLabel + '/3' || `Stage ${stage || 1}/3`;
  if (elements.overlayPlayerCount) elements.overlayPlayerCount.textContent = `${playerCount} / ${MAX_PLAYERS}`;

  if (elements.returnNoticeOverlay) {
    elements.returnNoticeOverlay.classList.toggle('show', showReturnNotice);
  }
  if (elements.returnNoticeSeconds) {
    elements.returnNoticeSeconds.textContent = String(Math.max(1, Math.ceil(returnToTitleRemainingMs / 1000)));
  }

  if (elements.overlayClear) {
    if (cleared && !showTitle && !showReturnNotice && !waitingForStart) {
      elements.overlayClear.classList.add('show');
      if (elements.overlayClearScore) elements.overlayClearScore.textContent = `${stageScore} / ${targetScore}`;
      if (elements.overlayClearTime) elements.overlayClearTime.textContent = formatTime(timeRemainingMs);
    } else {
      elements.overlayClear.classList.remove('show');
    }
  }

  if (elements.overlayGameOver) {
    if (gameOver && !showTitle && !showReturnNotice && !waitingForStart) {
      elements.overlayGameOver.style.display = 'flex';
      elements.overlayGameOver.classList.add('show');
    } else {
      elements.overlayGameOver.style.display = 'none';
      elements.overlayGameOver.classList.remove('show');
    }
  }

  const shouldShowTitle = showTitle || waitingForStart;
  setTitleVisible(shouldShowTitle && !showReturnNotice);

  if (waitingForStart) {
    if (elements.titleCountdown) {
      if (countdownStarted && playerCount > 0) {
        elements.titleCountdown.textContent = `ゲーム開始まで ${Math.ceil(countdownRemainingMs / 1000)} 秒`;
      } else {
        elements.titleCountdown.textContent = '参加プレイヤーを待っています';
      }
    }
    if (elements.titlePlayers) {
      elements.titlePlayers.textContent = `参加プレイヤー: ${playerCount}人`;
    }
    if (elements.titleDifficultyNormal && elements.titleDifficultyHard) {
      elements.titleDifficultyNormal.classList.toggle('active', difficulty === 'normal');
      elements.titleDifficultyHard.classList.toggle('active', difficulty === 'hard');
    }
  }
  renderPlayerSummary();
};

let stageTransitionTimeout = null;

export const showStageTransition = (stage, stageLabel) => {
  if (!elements.overlayStageTransition || !elements.stageTransitionText) return;
  const labelText = stageLabel || `Stage ${stage}`;
  elements.stageTransitionText.textContent = `${labelText}`;

  elements.overlayStageTransition.classList.remove('show');
  void elements.overlayStageTransition.offsetWidth;
  elements.overlayStageTransition.classList.add('show');

  if (stageTransitionTimeout) {
    clearTimeout(stageTransitionTimeout);
  }

  stageTransitionTimeout = setTimeout(() => {
    elements.overlayStageTransition.classList.remove('show');
    stageTransitionTimeout = null;
  }, 3000);
};

export const setConnected = (connected) => {
  if (elements.overlayStatus) {
    elements.overlayStatus.textContent = connected ? 'connected' : 'disconnected';
    elements.overlayStatus.className = `overlay-status ${connected ? 'connected' : 'disconnected'}`;
  }
};
