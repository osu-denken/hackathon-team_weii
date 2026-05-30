import express from 'express';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import * as players from './player.js';
import * as enemies from './enemy.js';
import * as bullets from './bullet.js';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// clientとviewerも同じサーバーでホストする
app.use("/client", express.static("../smartphone"));
app.use("/viewer", express.static("../frontend"));

let viewer = null; // モニター用のWebSocket接続

const TICK_MS = 40; // ゲームの状態を更新してクライアントに送る間隔 (40ms = 25fps)

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

const handleJoin = (ws, msg) => {
    if (!msg.id) { // idがないならエラー
        ws.send(JSON.stringify({ type: 'error', reason: 'missing id' }));
        return;
    }

    players.join(ws, msg.id);
};

const handleLeave = (ws) => {
    players.leave(ws);
};

const handleMove = (ws, msg) => {
    players.move(ws, msg.delta);
};

const handleShoot = (ws, msg) => {
    const player = players.getPlayerBySocket(ws);
    if (!player) {
        return;
    }

    bullets.spawn(player.x);
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
            viewer = ws;
            break;
        case 'leave':
            handleLeave(ws);
            break;
        case 'move':
            handleMove(ws, msg);
            break;
        case 'shoot':
            handleShoot(ws, msg);
            break;
        default:
            ws.send(JSON.stringify({ type: 'error', reason: 'unknown type' }));
    }
};

app.get('/', (req, res) => {
    // res.send('Backend is running.');
    res.redirect('/client'); // ルートにアクセスしたらクライアントにリダイレクト
});

wss.on('connection', (ws) => {
    ws.on('message', (data) => {
        parseMsg(ws, data.toString());
    });

    ws.on('close', () => {
        if (viewer === ws)
            viewer = null;
            
        handleLeave(ws);
    });
});

setInterval(() => {
    const now = Date.now();
    enemies.maybeSpawn(now);
    enemies.update();
    bullets.update();
    const enemyList = enemies.list();
    const bulletList = bullets.list();
    const hitRange = 0.5;
    const enemiesToRemove = new Set();
    const bulletsToRemove = new Set();

    bulletList.forEach((bullet) => {
        enemyList.forEach((enemy) => {
            const dx = Math.abs(bullet.x - enemy.x);
            const dy = Math.abs(bullet.y - enemy.y);
            if (dx <= hitRange && dy <= hitRange) {
                enemiesToRemove.add(enemy.id);
                bulletsToRemove.add(bullet.id);
            }
        });
    });

    enemiesToRemove.forEach((id) => enemies.removeById(id));
    bulletsToRemove.forEach((id) => bullets.removeById(id));
    sendState();
}, TICK_MS);

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
