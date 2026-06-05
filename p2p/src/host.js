import Peer from 'peerjs';
import '../../frontend/styles.css';
import { Stage } from '../../backend/src/Stage.js';
import * as config from '../../backend/src/constants/systemConfig.js';
import { MessageHandler } from '../../backend/src/systems/MessageHandler.js';

// Import frontend logic to reuse the exact same monitor UI
import { state, serverInfo } from '../../frontend/state.js';
import { elements, setDifficultyUI, setConnected } from '../../frontend/ui.js';
import { initViewer, processViewerPayload, setViewerConnected } from '../../frontend/core.js';
import HostPeerAdapter from './HostPeerAdapter.js';

// Initialize Game Stage (The Backend)
const stage = new Stage();
const connectedPeers = new Map(); // peerId -> connection

// Setup frontend rendering (Viewer Core)
const networkAdapter = new HostPeerAdapter(stage);
initViewer(networkAdapter);

// app.jsの代わり
const messageHandler = new MessageHandler(stage, {
  send: (peerId, data) => {
    const conn = connectedPeers.get(peerId);
    if (conn) conn.send(data);
  },
  sendError: (peerId, err) => {
    console.error(`Error for ${peerId}:`, err);
  }
});

function getRandStr(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const roomId = getRandStr(8);

// Initialize PeerJS
const peer = new Peer(roomId, {
  // Use public PeerJS server
  host: '0.peerjs.com',
  port: 443,
  secure: true
});

peer.on('open', (id) => {
  console.log('PeerJS Host connection established. ID:', id);
  setViewerConnected(true);

  // Create Join URL: host/ の親ディレクトリから client/ を解決する
  const clientBaseUrl = new URL('../client/', window.location.href).href;
  const clientUrl = `${clientBaseUrl}?room=${id}`;

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
      case 'setDifficulty':
        {
          const playerId = messageHandler.getPlayerId(conn.peer);
          const player = stage.getPlayer(playerId);
          if (player && player.number === 1 && msg.difficulty) {
            if (state.game.difficulty !== msg.difficulty) {
              state.game.difficulty = msg.difficulty;
              setDifficultyUI(msg.difficulty);
              stage.setDifficulty(msg.difficulty);
            }
          }
        }
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
      const player = stage.getPlayer(playerId);
      if (player) {
        const playerState = stage.buildPlayerState(player, now);
        playerState.type = 'update';
        conn.send(playerState);
      }
    }
  }

}, config.TICK_MS);
