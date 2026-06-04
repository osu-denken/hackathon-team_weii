import { state, serverInfo, MAX_PLAYERS } from './state.js';
import { loadSprites } from './assets.js';
import { elements, setDifficultyUI, updateGameUI, showStageTransition, setConnected } from './ui.js';
import { draw, resize } from './render.js';

window.addEventListener('resize', resize);
resize();
loadSprites();
draw(); // Start render loop

// Simulate clicks from parent window
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'simulateClick') {
    const { x, y } = event.data;
    const target = document.elementFromPoint(x, y);
    if (target && typeof target.click === 'function') {
      target.click();
    }
  }
});

const selectDifficulty = (difficulty) => {
  if (state.game.difficulty === difficulty) return;
  state.game.difficulty = difficulty;
  setDifficultyUI(difficulty);
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'setDifficulty', difficulty }));
  }
};

if (elements.titleDifficultyNormal) {
  elements.titleDifficultyNormal.addEventListener('click', () => selectDifficulty('normal'));
}
if (elements.titleDifficultyHard) {
  elements.titleDifficultyHard.addEventListener('click', () => selectDifficulty('hard'));
}

const fallbackClientUrl = `${window.location.protocol}//${window.location.host}/client/`;
const setQrOverlay = (clientUrl) => {
  if (elements.qrOverlay)
    elements.qrOverlay.src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(clientUrl)}`;
};

const loadClientUrl = async () => {
  try {
    const response = await fetch('/api/client-url', { cache: 'no-store' });
    if (!response.ok)
      return fallbackClientUrl;

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
    
    if (payload.isDelta) {
      if (payload.players !== undefined) state.players = payload.players;
      if (payload.enemies !== undefined) state.enemies = payload.enemies;
      if (payload.bullets !== undefined) state.bullets = payload.bullets;
      if (payload.items !== undefined) state.items = payload.items;
      if (payload.game !== undefined) {
        for (const key in payload.game) {
          state.game[key] = payload.game[key];
        }
        if (payload.game.serverNow) {
          serverInfo.serverTimeOffset = Date.now() - payload.game.serverNow;
        }
      }
    } else {
      state.players = Array.isArray(payload.players)
        ? payload.players.slice(0, MAX_PLAYERS)
        : [];
      state.enemies = Array.isArray(payload.enemies) ? payload.enemies : [];
      state.bullets = Array.isArray(payload.bullets) ? payload.bullets : [];
      state.items = Array.isArray(payload.items) ? payload.items : [];
      if (payload.game) {
        state.game = { ...state.game, ...payload.game };
        if (payload.game.serverNow) {
          serverInfo.serverTimeOffset = Date.now() - payload.game.serverNow;
        }
      }
    }

    if (payload.game && typeof payload.game.stage === 'number' && payload.game.stage > prevStage) {
      showStageTransition(payload.game.stage, payload.game.stageLabel);
    }

    updateGameUI();
  }
});