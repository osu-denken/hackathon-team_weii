import express from 'express';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import * as players from './player.js';
import * as enemies from './enemy.js';
import * as bullets from './bullet.js';
import * as items from './item.js';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// clientとviewerも同じサーバーでホストする
app.use("/client", express.static("../smartphone"));
app.use("/viewer", express.static("../frontend"));

let viewer = null; // モニター用のWebSocket接続

const TICK_MS = 40; // ゲームの状態を更新してクライアントに送る間隔 (40ms = 25fps)
const SHOOT_COOLDOWN_MS = 250; // プレイヤーが弾を撃てるようになるまでのクールダウン時間
const MAX_ACTIVE_BULLETS_PER_PLAYER = 12; // プレイヤーが同時に発射できる弾の最大数
const POWER_DURATION_MS = 5000; // パワーアップの効果が続く時間
const HEAL_AMOUNT = 2; // 回復アイテムを取ったときに回復するHP量
const TARGET_SCORE = 100; // ゲームクリアに必要なスコア
const TIME_LIMIT_MS = 120000; // ゲームの制限時間 (120秒)
const GAME_START_AT = Date.now(); // ゲーム開始時刻

const sendToViewer = (data) => {
    const payload = JSON.stringify(data);
    if (viewer && viewer.readyState === WebSocket.OPEN) {
        viewer.send(payload);
    }
};

const buildGameState = (now) => {
    const totalScore = players.totalScore();
    const timeRemainingMs = Math.max(0, TIME_LIMIT_MS - (now - GAME_START_AT));
    const cleared = totalScore >= TARGET_SCORE && timeRemainingMs > 0;

    return {
        totalScore,
        targetScore: TARGET_SCORE,
        timeLimitMs: TIME_LIMIT_MS,
        timeRemainingMs,
        cleared,
    };
};

const sendState = () => {
    const now = Date.now();
    const payload = {
        type: 'update',
        characters: players.list(),
        enemies: enemies.list(),
        bullets: bullets.list(),
        items: items.list(),
        game: buildGameState(now),
    };

    sendToViewer(payload);
};

const sendStateToPlayers = () => {
    const now = Date.now();
    const availableItem = items.list()[0] || null;
    const gameState = buildGameState(now);

    players.forEachSocket((ws, player) => {
        const cooldownRemainingMs = Math.max(0, SHOOT_COOLDOWN_MS - (now - player.lastShotAt));
        const payload = {
            type: 'playerState',
            player: {
                id: player.id,
                hp: player.hp,
                maxHp: player.maxHp,
                score: player.score,
                attackPower: player.attackPower,
                powerRemainingMs: Math.max(0, player.powerUntil - now),
                bulletsActive: bullets.countByOwner(player.id),
                bulletsMax: MAX_ACTIVE_BULLETS_PER_PLAYER,
                canShoot: players.canShoot(player.id, now, SHOOT_COOLDOWN_MS),
                cooldownRemainingMs,
            },
            item: availableItem,
            game: gameState,
        };

        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(payload));
        }
    });
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

    const now = Date.now();
    if (!players.canShoot(player.id, now, SHOOT_COOLDOWN_MS)) {
        return;
    }

    if (bullets.countByOwner(player.id) >= MAX_ACTIVE_BULLETS_PER_PLAYER) {
        return;
    }

    bullets.spawnTriple(player.x, player.id, player.attackPower);
    players.markShot(player.id, now);
};

const handleUseItem = (ws) => {
    const player = players.getPlayerBySocket(ws);
    if (!player) {
        return;
    }

    const item = items.take();
    if (!item) {
        return;
    }

    if (item.type === 'heal') {
        players.heal(player.id, HEAL_AMOUNT);
        return;
    }

    if (item.type === 'power') {
        players.applyPower(player.id, Date.now(), POWER_DURATION_MS);
    }
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
        case 'useItem':
            handleUseItem(ws);
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
    players.updatePowers(now);
    enemies.maybeSpawn(now);
    enemies.update();
    bullets.update();
    const enemyList = enemies.list();
    const bulletList = bullets.getAll();
    const hitRange = 0.5;
    const enemiesToRemove = new Set();
    const bulletsToRemove = new Set();
    const kills = [];

    bulletList.forEach((bullet) => {
        enemyList.forEach((enemy) => {
            const dx = Math.abs(bullet.x - enemy.x);
            const dy = Math.abs(bullet.y - enemy.y);
            if (dx <= hitRange && dy <= hitRange) {
                bulletsToRemove.add(bullet.id);
                const result = enemies.applyDamage(enemy.id, bullet.damage);
                if (result.killed) {
                    kills.push({ ownerId: bullet.ownerId, enemy: result });
                }
            }
        });
    });

    bulletsToRemove.forEach((id) => bullets.removeById(id));

    kills.forEach((kill) => {
        if (kill.ownerId) {
            players.addScore(kill.ownerId, 1);
        }

        if (kill.enemy.type === 'big' && items.isEmpty()) {
            items.spawnRandom(kill.enemy.x, kill.enemy.y);
        }
    });
    sendState();
    sendStateToPlayers();
}, TICK_MS);

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
