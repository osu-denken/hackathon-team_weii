// --- 1. UUIDの生成 ---
const myUUID = window.crypto && crypto.randomUUID ? crypto.randomUUID() : "local-test-uuid";

// --- 変数定義 ---
let ws = null;
let lastMoveSendTime = 0;
const THROTTLE_MS = 100; 

// --- DOM要素 ---
const wsUrlInput = document.getElementById('ws-url');
const btnJoin = document.getElementById('btn-join');
const btnShoot = document.getElementById('btn-shoot');
const btnUseItem = document.getElementById('btn-use-item');
const itemIcon = document.getElementById('item-icon');
const playerInfoContainer = document.getElementById('player-info');
const playerBadge = document.getElementById('player-badge');
const playerNumberSpan = document.getElementById('player-number');
const playerNumberText = document.getElementById('player-number-text');
let _currentHeldItem = null;
const difficultyControls = document.getElementById('difficulty-controls');
const difficultyNormalBtn = document.getElementById('difficulty-normal');
const difficultyHardBtn = document.getElementById('difficulty-hard');
let _localPlayerNumber = null;

let neutralBeta = null; // 傾きのニュートラル位置（初期値はnullで、最初のセンサーイベントで設定）

const assetBase = `${window.location.protocol}//${window.location.host}/asset/images/`;
const itemIconMap = {
    health_potion: `${assetBase}health_potion.png`,
    score_up: `${assetBase}score_up.png`,
    shield: `${assetBase}shield.png`,
    triple_shot: `${assetBase}triple_shot.png`,
    empty: `${assetBase}empty.png`
};

const currentUrl = window.location.href;
const defaultWsUrl = currentUrl.replace(/^http/, 'ws').replace(/\/client\/?$/, '');
wsUrlInput.value = defaultWsUrl;

// --- 2. WebSocket 接続と iOS センサー許可 ---
btnJoin.addEventListener('click', async (e) => {
    e.preventDefault();

    if (ws && ws.readyState === WebSocket.OPEN) {
        const leaveData = { type: "leave" };
        ws.send(JSON.stringify(leaveData));
        ws.close();
        return;
    }

    try {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            const response = await DeviceOrientationEvent.requestPermission();
            if (response !== 'granted') {
                alert('センサーの使用が許可されませんでした');
                return;
            }
        }

        window.addEventListener('deviceorientation', handleOrientation); 
    } catch (error) {
        console.error('センサーの許可エラー:', error);
        alert('センサーの使用が許可されませんでした');
        return;
    }

    connectWebSocket();
});

function connectWebSocket() {
    const url = wsUrlInput.value;
    ws = new WebSocket(url);

    ws.onopen = () => {
        neutralBeta = null;

        updateUI(true);
        const joinData = {
            type: "join",
            id: myUUID
        };
        ws.send(JSON.stringify(joinData));
    };

    ws.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if (data && (data.type === 'joinAck' || data.type === 'playerState')) { // joinAck or playerState
                if (data.player) updatePlayerInfo(data.player);
                if (data.game) updateGameInfo(data.game);
            }
        } catch (err) {
            console.error('ws.onmessage parse error', err);
        }
    };

    ws.onclose = () => {
        updateUI(false);
        updatePlayerInfo(null);
    };

    ws.onerror = (err) => {
        console.error("WebSocket Error:", err);
        alert("WebSocket接続エラー。サーバーが起動しているか確認してください。");
        updateUI(false);
    };
}

// --- プレイヤー表示更新ユーティリティ ---
function updatePlayerInfo(player) {
    if (!player) {
        playerInfoContainer.style.visibility = 'hidden';
        _currentHeldItem = null;
        if (btnUseItem) btnUseItem.disabled = true;
        if (itemIcon) {
            itemIcon.src = itemIconMap.empty;
            itemIcon.style.opacity = 0.3;
        }
        _localPlayerNumber = null;
        if (difficultyControls) difficultyControls.style.display = 'none';
        return;
    }

    playerInfoContainer.style.visibility = 'visible';
    const num = player.number || player.id || '';
    const color = player.color || '#888';
    _currentHeldItem = player.heldItem || null;
    
    if (playerNumberSpan) playerNumberSpan.textContent = num;
    if (playerNumberText) playerNumberText.textContent = num;
    if (playerBadge) playerBadge.style.backgroundColor = color;
    _localPlayerNumber = player.number || null;
    
    if (btnUseItem) btnUseItem.disabled = !_currentHeldItem;
    if (itemIcon) {
        const iconSrc = _currentHeldItem ? itemIconMap[_currentHeldItem.type] : itemIconMap.empty;
        itemIcon.src = iconSrc || itemIconMap.empty;
        itemIcon.style.opacity = _currentHeldItem ? 1 : 0.3;
    }
}

const tryUseItem = (e) => {
    if (e) e.preventDefault();
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (!_currentHeldItem) return;
    ws.send(JSON.stringify({ type: "useItem" }));
};

if (btnUseItem) {
    btnUseItem.addEventListener('click', tryUseItem);
    btnUseItem.addEventListener('touchstart', tryUseItem, { passive: false });
}

// --- 4. 移動量検知と送信 (move) ---
function handleOrientation(e) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    if (e.beta == null) return;

    if (neutralBeta === null) {
        neutralBeta = e.beta;
        return;
    }

    let steer = e.beta - neutralBeta;

    const DEAD_ZONE = 5;

    if (Math.abs(steer) < DEAD_ZONE) {
        steer = 0;
    }

    const MAX_TILT = 45;

    steer = Math.max(-MAX_TILT, Math.min(MAX_TILT, steer));

    const delta = Math.round((steer / MAX_TILT) * 1000) / 1000;

    sendMove(delta, 0, e.beta, e.gamma);
}

function sendMove(delta, angle, beta, gamma) {
    const now = Date.now();
    if (now - lastMoveSendTime > THROTTLE_MS) {
        const moveData = { type: "move", delta: delta, angle: angle, beta: beta, gamma: gamma };
        ws.send(JSON.stringify(moveData));
        lastMoveSendTime = now;
    }
}

// --- 5. 射撃 (shoot) ---
const SHOOT_INTERVAL_MS = 300;
let _shootTimer = null;
let _isHolding = false;
let _lastTouchTime = 0;

function sendShoot() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "shoot" }));
    }
}

function startShooting(e) {
    if (e) e.preventDefault();
    if (e && e.type === 'touchstart') _lastTouchTime = Date.now();
    if (_isHolding) return;
    _isHolding = true;
    sendShoot();
    _shootTimer = setInterval(sendShoot, SHOOT_INTERVAL_MS);
}

function stopShooting(e) {
    if (e) e.preventDefault();
    _isHolding = false;
    if (_shootTimer) {
        clearInterval(_shootTimer);
        _shootTimer = null;
    }
}

btnShoot.addEventListener('touchstart', startShooting, { passive: false });
btnShoot.addEventListener('touchend', stopShooting);
btnShoot.addEventListener('touchcancel', stopShooting);

btnShoot.addEventListener('mousedown', (e) => {
    if (Date.now() - _lastTouchTime < 500) return; 
    startShooting(e);
});
document.addEventListener('mouseup', stopShooting);
btnShoot.addEventListener('mouseleave', stopShooting);

// --- UI更新ユーティリティ ---
function updateUI(isConnected) {
    btnJoin.textContent = isConnected ? 'LEAVE' : 'JOIN';
    btnShoot.disabled = !isConnected;
    
    btnJoin.classList.toggle('leave-state', isConnected);
    btnJoin.classList.toggle('join-state', !isConnected);
    
    if (!isConnected) {
        window.removeEventListener('deviceorientation', handleOrientation);
    }
}

window.addEventListener('beforeunload', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "leave" }));
        ws.close();
    }
});

// --- Difficulty UI helpers ---
function showDifficultyControls(visible) {
    if (!difficultyControls) return;
    difficultyControls.style.display = visible ? 'flex' : 'none';
}

function setDifficultyUI(difficulty) {
    if (difficultyNormalBtn) difficultyNormalBtn.classList.toggle('active', difficulty === 'normal');
    if (difficultyHardBtn) difficultyHardBtn.classList.toggle('active', difficulty === 'hard');
}

function updateGameInfo(game) {
    const waiting = game && game.waitingForStart;
    const is1p = _localPlayerNumber === 1;
    showDifficultyControls(Boolean(waiting && is1p));
    if (game && typeof game.difficulty === 'string') {
        setDifficultyUI(game.difficulty);
    }
}

if (difficultyNormalBtn) {
    difficultyNormalBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({ type: 'setDifficulty', difficulty: 'normal' }));
        setDifficultyUI('normal');
    });
}

if (difficultyHardBtn) {
    difficultyHardBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({ type: 'setDifficulty', difficulty: 'hard' }));
        setDifficultyUI('hard');
    });
}