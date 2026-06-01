import express from 'express';
import http from 'http';
import https from 'https';
import WebSocket, { WebSocketServer } from 'ws';
import { Stage } from './Stage.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

const app = express();
const opt = {
  key: fs.readFileSync('../shared/server-key.pem'),
  cert: fs.readFileSync('../shared/server.pem')
};

// const server = http.createServer(app);
const server = https.createServer(opt, app);
const wss = new WebSocketServer({ server });

// clientとviewerも同じサーバーでホストする
app.use('/client', express.static('../smartphone')); // スマートフォン操作用
app.use('/viewer', express.static('../frontend')); // モニター表示用

app.use('/play', express.static('../frontend/play')); // キーボード操作ができる
app.use('/asset', express.static('../asset')); // アイテムの画像などの静的ファイル

const LOCALHOST_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);
const VIRTUAL_INTERFACE_PATTERNS = [
  /virtual/i,
  /vmware/i,
  /vbox/i,
  /virtualbox/i,
  /hyper-?v/i,
  /vethernet/i,
  /docker/i,
  /wsl/i,
  /loopback/i,
  /hamachi/i,
  /tunnel/i,
  /tap/i,
  /tailscale/i,
  /wireguard/i,
  /vpn/i,
];
const PREFERRED_INTERFACE_PATTERNS = [
  /wi-?fi/i,
  /wlan/i,
  /ethernet/i,
  /^en/i,
  /^eth/i,
  /local area connection/i,
];

const FRONTEND_URL = null; // nullの場合は自動に
// const FRONTEND_URL = 'https://hackathon-team-weii.fly.dev/client/';

const getLanIPv4 = () => {
  const interfaces = os.networkInterfaces();
  let fallbackPrivateIp = null;

  const isVirtualInterface = (name) => VIRTUAL_INTERFACE_PATTERNS.some((pattern) => pattern.test(name));
  const isPreferredInterface = (name) => PREFERRED_INTERFACE_PATTERNS.some((pattern) => pattern.test(name));

  for (const [name, entries] of Object.entries(interfaces)) {
    if (!entries) continue;

    for (const address of entries) {
      if (address.family !== 'IPv4' || address.internal) {
        continue;
      }

      const [first, second] = address.address.split('.').map(Number);
      const isPrivateIPv4 =
        first === 10 ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168);
      const isLinkLocalIPv4 = first === 169 && second === 254;

      if (isLinkLocalIPv4 || isVirtualInterface(name)) {
        continue;
      }

      if (isPrivateIPv4 && isPreferredInterface(name)) {
        return address.address;
      }

      if (isPrivateIPv4 && !fallbackPrivateIp) {
        fallbackPrivateIp = address.address;
      }
    }
  }

  return fallbackPrivateIp;
};

const buildClientUrl = (req) => {
  if (FRONTEND_URL) return FRONTEND_URL;

  const hostHeader = req.headers.host || `localhost:${PORT}`;
  const hostName = req.hostname || hostHeader.split(':')[0];
  const portMatch = hostHeader.match(/:(\d+)$/);
  const port = portMatch ? `:${portMatch[1]}` : '';
  const protocol = req.protocol || 'https';

  if (LOCALHOST_HOSTNAMES.has(hostName)) {
    const lanIp = getLanIPv4();
    if (lanIp) return `${protocol}://${lanIp}${port}/client/`;
  }

  return `${protocol}://${hostHeader}/client/`;
};

app.get('/api/client-url', (req, res) => {
  res.json({ clientUrl: buildClientUrl(req) });
});

const stage = new Stage();
const socketToPlayerId = new Map();
const viewers = new Set(); // モニター用のWebSocket接続

const TICK_MS = 40; // ゲームの状態を更新してViewer(フロントエンド)に送る間隔 (40ms = 25fps)

const sendToViewer = (data) => {
  const payload = JSON.stringify(data);
  viewers.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN)
      ws.send(payload);
  });
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
    if (!player) return;

    const payload = stage.buildPlayerState(player, now);
    if (ws.readyState === WebSocket.OPEN)
      ws.send(JSON.stringify(payload));

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

  stage.movePlayer(id, msg.delta, Date.now());
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

  console.log('Received message:', msg);

  switch (msg.type) {
    case 'join':
      handleJoin(ws, msg);
      break;
    case 'viewer':
      viewers.add(ws);
      if (ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify(stage.buildViewerPayload(Date.now())));
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
    viewers.delete(ws);
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
