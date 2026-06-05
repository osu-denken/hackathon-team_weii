import Peer from 'peerjs';
import '../../frontend/styles.css';
import { Stage } from '../../backend/src/Stage.js';
import * as config from '../../backend/src/constants/systemConfig.js';
import { MessageHandler } from '../../backend/src/systems/MessageHandler.js';

// Import frontend logic to reuse the exact same monitor UI
import { state, serverInfo, MAX_PLAYERS } from '../../frontend/state.js';
import { loadSprites } from '../../frontend/assets.js';
import { elements, setDifficultyUI, updateGameUI, showStageTransition, setConnected } from '../../frontend/ui.js';
import { draw, resize } from '../../frontend/render.js';
import { initViewer, processViewerPayload, setViewerConnected } from '../../frontend/core.js';

// Setup frontend rendering (Viewer Core)
const networkAdapter = {
  sendDifficulty: (diff) => {
    stage.setDifficulty(diff);
  }
};
initViewer(networkAdapter);

// Initialize Game Stage (The Backend)
const stage = new Stage();
const connectedPeers = new Map(); // peerId -> connection

const messageHandler = new MessageHandler(stage, {
  send: (peerId, data) => {
    const conn = connectedPeers.get(peerId);
    if (conn) conn.send(data);
  },
  sendError: (peerId, err) => {
    console.error(`Error for ${peerId}:`, err);
  }
});

// Initialize PeerJS
const peer = new Peer({
  // Use public PeerJS server
  host: '0.peerjs.com',
  port: 443,
  secure: true
});

peer.on('open', (id) => {
  console.log('PeerJS Host connection established. ID:', id);
  setViewerConnected(true);

  // Create Join URL (e.g., https://domain.com/p2p/?room=xyz)
  const currentUrl = new URL(window.location.href);
  const clientUrl = `${currentUrl.origin}${currentUrl.pathname.replace('/host.html', '/client.html')}?room=${id}`;

  const roomIdDisplay = document.getElementById('room-id-display');
  if (roomIdDisplay) {
    roomIdDisplay.textContent = id;
  }

  if (elements.qrOverlay) {
    elements.qrOverlay.src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(clientUrl)}`;
  }
});

peer.on('connection', (conn) => {
  console.log('Client connected:', conn.peer);
  connectedPeers.set(conn.peer, conn);

  conn.on('data', (data) => {
    let msg;
    try {
      msg = typeof data === 'string' ? JSON.parse(data) : data;
    } catch (e) {
      return;
    }

    if (!msg || typeof msg.type !== 'string') return;
    const now = Date.now();

    switch (msg.type) {
      case 'join':
        messageHandler.handleJoin(conn.peer, msg);
        break;
      case 'move':
        messageHandler.handleMove(conn.peer, msg, now);
        break;
      case 'shoot':
        messageHandler.handleShoot(conn.peer, now);
        break;
      case 'useItem':
        messageHandler.handleUseItem(conn.peer, now);
        break;
      case 'resetPosition':
        messageHandler.handleResetPosition(conn.peer, now);
        break;
    }
  });

  conn.on('close', () => {
    console.log('Client disconnected:', conn.peer);
    connectedPeers.delete(conn.peer);
    messageHandler.handleLeave(conn.peer);
  });
});

const handleGameReset = () => {
  messageHandler.socketToPlayerId.forEach((id, peerId) => {
    const conn = connectedPeers.get(peerId);
    if (conn) conn.send({ type: 'gameReset' });
  });
  messageHandler.clear();
};

peer.on('error', (err) => {
  console.error('PeerJS error:', err);
  setConnected(false);
});

peer.on('disconnected', () => {
  setConnected(false);
});

// UI Event Listeners
const selectDifficulty = (difficulty) => {
  if (state.game.difficulty === difficulty) return;
  state.game.difficulty = difficulty;
  setDifficultyUI(difficulty);
  // Apply difficulty to backend
  stage.setDifficulty(difficulty);
};

if (elements.titleDifficultyNormal) {
  elements.titleDifficultyNormal.addEventListener('click', () => selectDifficulty('normal'));
}
if (elements.titleDifficultyHard) {
  elements.titleDifficultyHard.addEventListener('click', () => selectDifficulty('hard'));
}

window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'simulateClick') {
    const { x, y } = event.data;
    const target = document.elementFromPoint(x, y);
    if (target && typeof target.click === 'function') {
      target.click();
    }
  }
});

// Game Loop
setInterval(() => {
  const wasStarted = stage.gameStarted;
  const wasPlayers = stage.players.size;
  const now = Date.now();

  stage.update(now);

  if ((wasStarted || wasPlayers > 0) && !stage.gameStarted && stage.players.size === 0 && stage.mode === 'title') {
    handleGameReset();
  }

  // Update Monitor UI state
  const payload = stage.buildViewerPayload(now); // Full state payload
  serverInfo.serverTimeOffset = 0; // Host IS the server, so offset is 0

  processViewerPayload({
    type: 'update',
    isDelta: false,
    ...payload,
  });

  // Send state to connected players
  for (const [peerId, playerId] of messageHandler.socketToPlayerId.entries()) {
    const conn = connectedPeers.get(peerId);
    if (conn) {
      const playerPayload = stage.buildPlayerPayload(playerId, now);
      conn.send({ type: 'update', ...playerPayload });
    }
  }

}, config.TICK_MS);
