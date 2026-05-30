import express from 'express';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { Stage } from './Stage.js';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// clientとviewerも同じサーバーでホストする
app.use('/client', express.static('../smartphone'));
app.use('/viewer', express.static('../frontend'));

const stage = new Stage();
const socketToPlayerId = new Map();
let viewer = null; // モニター用のWebSocket接続

const TICK_MS = 40; // ゲームの状態を更新してViewer(フロントエンド)に送る間隔 (40ms = 25fps)

const sendToViewer = (data) => {
  const payload = JSON.stringify(data);
  if (viewer && viewer.readyState === WebSocket.OPEN) {
    viewer.send(payload);
  }
};

// ゲームの状態を更新してViewer(フロントエンド)に送る
const sendState = () => {
  const payload = stage.buildViewerPayload(Date.now());
  sendToViewer(payload);
};

// 各プレイヤー(スマートフォン)に自分の状態を送る
const sendStateToPlayers = () => {
  const now = Date.now();
  socketToPlayerId.forEach((id, ws) => {
    const player = stage.getPlayer(id);
    if (!player) {
      return;
    }

    const payload = stage.buildPlayerState(player, now);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  });
};

const handleJoin = (ws, msg) => {
  if (!msg.id) {
    ws.send(JSON.stringify({ type: 'error', reason: 'missing id' }));
    return;
  }

  const player = stage.addPlayer(msg.id);
  socketToPlayerId.set(ws, player.id);

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'joinAck',
      player: {
        id: player.id,
        number: player.number,
        color: player.color,
      },
    }));
  }
};

const handleLeave = (ws) => {
  const id = socketToPlayerId.get(ws);
  if (id) stage.removePlayer(id);

  socketToPlayerId.delete(ws);
};

const handleMove = (ws, msg) => {
  const id = socketToPlayerId.get(ws);
  if (!id) return;

  stage.movePlayer(id, msg.delta);
};

const handleShoot = (ws) => {
  const id = socketToPlayerId.get(ws);
  if (!id) return;

  stage.shootPlayer(id, Date.now());
};

const handleUseItem = (ws) => {
  const id = socketToPlayerId.get(ws);
  if (!id) return;

  stage.useHeldItem(id, Date.now());
};

const parseMsg = (ws, raw) => {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch (error) {
    ws.send(JSON.stringify({ type: 'error', reason: 'invalid json' }));
    return;
  }

  if (!msg || typeof msg.type !== 'string') {
    ws.send(JSON.stringify({ type: 'error', reason: 'missing type' }));
    return;
  }

  switch (msg.type) {
    case 'join':
      handleJoin(ws, msg);
      break;
    case 'viewer':
      viewer = ws;
      break;
    case 'leave':
      handleLeave(ws);
      break;
    case 'move':
      handleMove(ws, msg);
      break;
    case 'shoot':
      handleShoot(ws);
      break;
    case 'useItem':
      handleUseItem(ws);
      break;
    default:
      ws.send(JSON.stringify({ type: 'error', reason: 'unknown type' }));
  }
};

app.get('/', (req, res) => {
  res.redirect('/client');
});

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    parseMsg(ws, data.toString());
  });

  ws.on('close', () => {
    if (viewer === ws) {
      viewer = null;
    }
    handleLeave(ws);
  });
});

setInterval(() => {
  stage.update(Date.now());
  sendState();
  sendStateToPlayers();
}, TICK_MS);

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
