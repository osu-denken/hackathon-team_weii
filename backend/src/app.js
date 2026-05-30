import express from 'express';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import * as players from './player.js';
import * as enemies from './enemy.js';
import * as bullets from './bullet.js';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// /smartphone 配下のファイルを静的に配信
app.use("/client", express.static("../smartphone"));
app.use("/viewer", express.static("../frontend"));

let viewer = null;

const TICK_MS = 50;

const sendToViewer = (data) => {
  const payload = JSON.stringify(data);
  if (viewer && viewer.readyState === WebSocket.OPEN) {
    viewer.send(payload);
  }
};

const sendState = () => {
  const payload = {
    type: 'update',
    characters: players.list(),
    enemies: enemies.list(),
    bullets: bullets.list(),
  };

  sendToViewer(payload);
};

const handleJoin = (ws, message) => {
  if (!message.id || typeof message.id !== 'string') {
    ws.send(JSON.stringify({ type: 'error', reason: 'missing id' }));
    return;
  }

  players.join(ws, message.id);
};

const handleLeave = (ws) => {
  players.leave(ws);
};

const handleMove = (ws, message) => {
  players.move(ws, message.delta);
};

const handleShoot = (ws) => {
  const player = players.getPlayerBySocket(ws);
  if (!player) {
    return;
  }

  bullets.spawn(player.x);
};

const parseMessage = (ws, raw) => {
  let message;
  try {
    message = JSON.parse(raw);
  } catch (error) {
    ws.send(JSON.stringify({ type: 'error', reason: 'invalid json' }));
    return;
  }

  if (!message || typeof message.type !== 'string') {
    ws.send(JSON.stringify({ type: 'error', reason: 'missing type' }));
    return;
  }

  console.log('Received message:', message);

  switch (message.type) {
    case 'join':
      handleJoin(ws, message);
      break;
    case 'viewer':
      viewer = ws;
      break;
    case 'leave':
      handleLeave(ws);
      break;
    case 'move':
      handleMove(ws, message);
      break;
    case 'shoot':
      handleShoot(ws);
      break;
    default:
      ws.send(JSON.stringify({ type: 'error', reason: 'unknown type' }));
  }
};

app.get('/', (req, res) => {
  res.send('Backend is running.');
});

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    parseMessage(ws, data.toString());
  });

  ws.on('close', () => {
    if (viewer === ws) {
      viewer = null;
    }
    handleLeave(ws);
  });
});

setInterval(() => {
  const now = Date.now();
  enemies.maybeSpawn(now);
  enemies.update();
  bullets.update();
  sendState();
}, TICK_MS);

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
