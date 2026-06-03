import express from 'express';
import http from 'http';
import https from 'https';
import WebSocket, { WebSocketServer } from 'ws';
import { Stage } from './Stage.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import * as config from './constants/systemConfig.js';
import { sendRaw, send, sendError } from './utilites/NetworkUtil.js';
import { PayloadBuilder } from './utils/PayloadBuilder.js';

const app = express();

const opt = {
  key: fs.readFileSync('../shared/server-key.pem'),
  cert: fs.readFileSync('../shared/server.pem')
};

const server = config.USE_HTTPS ? https.createServer(opt, app) : http.createServer(app);
const wss = new WebSocketServer({ server });

// clientとviewerも同じサーバーでホストする
app.use('/client', express.static('../smartphone')); // スマートフォン操作用
app.use('/viewer', express.static('../frontend')); // モニター表示用
app.use('/play', express.static('../frontend/play')); // キーボード操作ができる
app.use('/asset', express.static('../asset')); // アイテムの画像などの静的ファイル

app.get('/api/client-url', (req, res) => {
  res.json({ clientUrl: config.buildClientUrl(req) });
});

const stage = new Stage();
const socketToPlayerId = new Map();
const viewers = new Set(); // モニター用のWebSocket接続

const sendToViewer = (data) => {
  const payload = JSON.stringify(data);
  viewers.forEach((ws) => {
    sendRaw(ws, payload);
  });
};

// ゲームの状態を更新してViewer(フロントエンド)に送る
const sendState = () => {
  const payload = stage.buildViewerPayload(Date.now());
  sendToViewer(payload);
};

// タイトルリセット時に全プレイヤーのスマホに通知しsocketToPlayerIdをクリアする
const handleGameReset = () => {
  socketToPlayerId.forEach((id, ws) => {
    send(ws, { type: 'gameReset' });
  });
  socketToPlayerId.clear();
};

// 各プレイヤー(スマートフォン)に自分の状態を送る
const sendStateToPlayers = () => {
  const now = Date.now();
  socketToPlayerId.forEach((id, ws) => {
    const player = stage.getPlayer(id);
    if (!player) return;

    const payload = PayloadBuilder.buildPlayerState(stage, player, now);
    send(ws, payload);
  });
};

const handleJoin = (ws, msg) => {
  if (!msg.id) {
    sendError(ws, 'missing id');
    return;
  }

  const name = typeof msg.name === 'string' ? msg.name.trim().slice(0, 12) : '';
  const characterNumber = (Number.isInteger(msg.characterNumber) && msg.characterNumber >= 1 && msg.characterNumber <= 7)
    ? msg.characterNumber : null;

  const player = stage.addPlayer(msg.id, Date.now(), { name, characterNumber });
  socketToPlayerId.set(ws, player.id);

  if (ws.readyState === WebSocket.OPEN) {
    send(ws, {
      type: 'joinAck',
      player: {
        id: player.id,
        number: player.number,
        color: player.color,
        name: player.name,
        characterNumber: player.characterNumber,
      },
    });
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

const handleResetPosition = (ws) => {
  const id = socketToPlayerId.get(ws);
  if (!id) return;

  stage.resetPlayerPosition(id, Date.now());
};

const parseMsg = (ws, raw) => {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch (error) {
    sendError(ws, 'invalid json');
    return;
  }

  if (!msg || typeof msg.type !== 'string') {
    sendError(ws, 'missing type');
    return;
  }

  // console.log('Received message:', msg);

  switch (msg.type) {
    case 'join':
      handleJoin(ws, msg);
      break;
    case 'viewer':
      viewers.add(ws);
      send(ws, stage.buildViewerPayload(Date.now()));
      break;
    case 'setDifficulty':
      if (typeof msg.difficulty === 'string') {
        stage.setDifficulty(msg.difficulty);
        sendState();
      }
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
    case 'resetPosition':
      handleResetPosition(ws);
      break;
    default:
      sendError(ws, 'unknown type');
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
  const wasStarted = stage.gameStarted;
  const wasPlayers = stage.players.size;
  stage.update(Date.now());
  // resetToTitleの検知：ゲーム中かつプレイヤーがいたのに、リセット後はゲーム削除・プレイヤー0になる
  if ((wasStarted || wasPlayers > 0) && !stage.gameStarted && stage.players.size === 0 && stage.mode === 'title') {
    handleGameReset();
  }
  sendState();
  sendStateToPlayers();
}, config.TICK_MS);

server.listen(config.PORT, () => {
  console.log(`Server is running on http://localhost:${config.PORT}`);
});
