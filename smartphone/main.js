// --- Fullscreen Workaround (Swipe fallback) ---
let fsInitialInnerHeight = 0;
let fsResizeTimer = null;

const fs_display = () => {
    const fsEl = document.getElementById('fs');
    if (fsEl && fsEl.style.display === 'flex') {
        // Debounce resize to wait for address bar animation to completely finish
        clearTimeout(fsResizeTimer);
        fsResizeTimer = setTimeout(() => {
            // If innerHeight significantly increased, address bar is hidden
            if (window.innerHeight > fsInitialInnerHeight + 20) {
                fsEl.style.display = 'none';
                document.body.classList.remove('fs-active');
                document.documentElement.classList.remove('fs-active');
                
                // Restore original styles
                document.documentElement.style.height = '';
                document.documentElement.style.overflow = '';
                document.documentElement.style.touchAction = '';
                document.documentElement.style.webkitUserSelect = '';
                document.documentElement.style.userSelect = '';

                document.body.style.minHeight = '';
                document.body.style.height = '';
                document.body.style.overflow = '';
                document.body.style.touchAction = '';
                document.body.style.webkitUserSelect = '';
                document.body.style.userSelect = '';

                const mainLayout = document.querySelector('.main-layout');
                if (mainLayout) {
                    mainLayout.style.touchAction = '';
                    mainLayout.style.webkitUserSelect = '';
                    mainLayout.style.userSelect = '';
                }
                
                const dummy = document.getElementById('chrome-ios-dummy');
                if (dummy) dummy.style.display = 'none';
            }
        }, 300);
    }
};
window.addEventListener('resize', fs_display);
// Workaround is triggered manually via fullscreen button

// --- 1. UUIDの生成 ---
const myUUID = window.crypto && crypto.randomUUID ? crypto.randomUUID() : "local-test-uuid";

// --- 変数定義 ---
let ws = null;
let lastMoveSendTime = 0;
const THROTTLE_MS = 20;

// --- DOM要素 ---
const wsUrlInput = document.getElementById('ws-url');
const btnJoin = document.getElementById('btn-join');
const btnShoot = document.getElementById('btn-shoot');
const btnResetPosition = document.getElementById('btn-reset-position');
const btnFullscreen = document.getElementById('btn-fullscreen');
const iconFullscreenEnter = document.getElementById('icon-fullscreen-enter');
const iconFullscreenExit = document.getElementById('icon-fullscreen-exit');
const btnUseItem = document.getElementById('btn-use-item');
const itemIcon = document.getElementById('item-icon');
const itemSection = document.getElementById('item-section');
const playerInfoContainer = document.getElementById('player-info');
const pcbMeter = document.getElementById('pcb-meter');
const pcbIcon = document.getElementById('pcb-icon');
const pcbName = document.getElementById('pcb-name');
const pcbStatus = document.getElementById('pcb-status');
const pcbRespawn = document.getElementById('pcb-respawn');
const respawnSecSpan = document.getElementById('respawn-sec');
const pcbHpBlocks = document.getElementById('pcb-hp-blocks');
const customizationPanel = document.getElementById('customization-panel');
const playerNameInput = document.getElementById('player-name-input');
let _currentHeldItem = null;
const difficultyControls = document.getElementById('difficulty-controls');
const difficultyNormalBtn = document.getElementById('difficulty-normal');
const difficultyHardBtn = document.getElementById('difficulty-hard');
let _localPlayerNumber = null;

// --- キャラクター選択（カルーセル） ---
let selectedCharacterNumber = 1;
const CHAR_COUNT = 8;

const charPreview = document.getElementById('char-preview');
const charLabel = document.getElementById('char-label');
const charPrevBtn = document.getElementById('char-prev');
const charNextBtn = document.getElementById('char-next');

const updateCharPreview = () => {
    const base = `${window.location.protocol}//${window.location.host}/asset/images/`;
    if (charPreview) {
        charPreview.src = `${base}character-${selectedCharacterNumber}.png`;
        charPreview.alt = `キャラ ${selectedCharacterNumber}`;
    }
    if (charLabel) charLabel.textContent = `${selectedCharacterNumber} / ${CHAR_COUNT}`;
};

if (charPrevBtn) {
    charPrevBtn.addEventListener('click', () => {
        selectedCharacterNumber = selectedCharacterNumber <= 1 ? CHAR_COUNT : selectedCharacterNumber - 1;
        updateCharPreview();
    });
}
if (charNextBtn) {
    charNextBtn.addEventListener('click', () => {
        selectedCharacterNumber = selectedCharacterNumber >= CHAR_COUNT ? 1 : selectedCharacterNumber + 1;
        updateCharPreview();
    });
}

updateCharPreview();

let neutralBeta = null; // 傾きのニュートラル位置（初期値はnullで、最初のセンサーイベントで設定）

const assetBase = `${window.location.protocol}//${window.location.host}/asset/images/`;
const itemIconMap = {
    health_potion: `${assetBase}health_potion.png`,
    health_increase: `${assetBase}heart_increase.png`,
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
        // カスタマイズパネルを非表示 → アイテム欄を表示
        if (customizationPanel) customizationPanel.style.display = 'none';
        if (itemSection) itemSection.style.display = 'flex';
        const name = playerNameInput ? playerNameInput.value.trim() : '';
        const joinData = {
            type: "join",
            id: myUUID,
            name: name || undefined,
            characterNumber: selectedCharacterNumber,
        };
        ws.send(JSON.stringify(joinData));
    };

    ws.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if (data && (data.type === 'joinAck' || data.type === 'playerState')) { // joinAck or playerState
                if (data.player) updatePlayerInfo(data.player);
                if (data.game) updateGameInfo(data.game);
            } else if (data && data.type === 'gameReset') {
                // タイトルに戻ったのでjoinを再送（カスタマイズは維持）
                const name2 = playerNameInput ? playerNameInput.value.trim() : '';
                const rejoinData = { type: 'join', id: myUUID, name: name2 || undefined, characterNumber: selectedCharacterNumber };
                ws.send(JSON.stringify(rejoinData));
            }
        } catch (err) {
            console.error('ws.onmessage parse error', err);
        }
    };

    ws.onclose = () => {
        // 切断時：カスタマイズパネルを再表示、アイテム欄を非表示
        if (customizationPanel) customizationPanel.style.display = 'flex';
        if (itemSection) itemSection.style.display = 'none';
        updateUI(false);
        updatePlayerInfo(null);
    };

    ws.onerror = (err) => {
        console.error("WebSocket Error:", err);
        alert("WebSocket接続エラー。サーバーが起動しているか確認してください。");
        if (customizationPanel) customizationPanel.style.display = 'flex';
        if (itemSection) itemSection.style.display = 'none';
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
    const charNum = player.characterNumber || player.number || 1;
    const displayName = player.name || `P${num}`;
    const color = player.color || '#888';
    _currentHeldItem = player.heldItem || null;
    _localPlayerNumber = player.number || null;

    const isDead = Boolean(player.dead);
    const respawnMs = player.respawnRemainingMs || 0;
    const respawnSec = Math.ceil(respawnMs / 1000);
    const hp = Math.floor(player.hp ?? 0);
    const maxHp = Math.floor(player.maxHp ?? 1);
    const score = Math.floor(player.score ?? 0);

    // Update Card UI
    if (playerInfoContainer.dataset.isDead !== String(isDead)) {
        playerInfoContainer.dataset.isDead = String(isDead);
        if (isDead) {
            playerInfoContainer.style.background = 'rgba(239,68,68,0.15)';
            playerInfoContainer.style.borderColor = 'rgba(239,68,68,0.4)';
        } else {
            playerInfoContainer.style.background = '';
            playerInfoContainer.style.borderColor = '';
        }
    }

    if (pcbIcon) {
        const iconHash = `${charNum}:${isDead}`;
        if (pcbIcon.dataset.hash !== iconHash) {
            pcbIcon.dataset.hash = iconHash;

            let validCharNum = charNum;
            if (typeof validCharNum !== 'number' || validCharNum < 1 || validCharNum > 7) {
                validCharNum = 1;
            }
            const spriteUrl = `/asset/images/character-${validCharNum}.png`;

            pcbIcon.style.backgroundImage = `url('${spriteUrl}')`;
            pcbIcon.style.backgroundColor = isDead ? 'rgba(239,68,68,0.5)' : color;
            pcbIcon.style.filter = isDead ? 'grayscale(1)' : '';
        }
    }

    if (pcbName) {
        if (pcbName.dataset.pNum !== String(num) || pcbName.dataset.isDead !== String(isDead)) {
            pcbName.dataset.pNum = String(num);
            pcbName.dataset.isDead = String(isDead);
            pcbName.style.color = isDead ? '#fca5a5' : '';
            pcbName.textContent = isDead ? displayName : displayName;
        }
    }

    if (pcbStatus) {
        const statusHash = `${isDead}:${respawnSec}:${hp}:${maxHp}:${score}`;
        if (pcbStatus.dataset.hash !== statusHash) {
            pcbStatus.dataset.hash = statusHash;
            if (isDead) {
                pcbStatus.textContent = `復活まで: ${respawnSec}秒`;
                pcbStatus.style.color = '#fca5a5';
            } else {
                pcbStatus.textContent = `${score}pt`;
                pcbStatus.style.color = '#cfeffd';
            }
        }
    }

    if (pcbRespawn && pcbHpBlocks) {
        if (isDead) {
            // 死亡中：HPバーを隠す
            pcbRespawn.style.display = 'none';
            pcbHpBlocks.style.display = 'none';
        } else {
            // 生存中：HPバーを常に表示する（復活後も確実に再表示）
            pcbRespawn.style.display = 'none';
            pcbHpBlocks.style.display = 'flex';

            const hpHash = `${hp}:${maxHp}:${color}`;
            if (pcbHpBlocks.dataset.hash !== hpHash) {
                pcbHpBlocks.dataset.hash = hpHash;
                pcbHpBlocks.innerHTML = '';
                for (let i = 0; i < maxHp; i++) {
                    const b = document.createElement('div');
                    b.className = 'hp-block';
                    b.style.transition = 'all 0.2s';
                    const isFilled = i < hp;
                    b.style.background = isFilled ? color : 'transparent';
                    b.style.boxShadow = isFilled ? `0 0 6px ${color}` : 'none';
                    //   b.style.border = isFilled ? 'none' : '1px solid rgba(255,255,255,0.2)';
                    if (!isFilled) {
                        b.classList.add('empty');
                    }
                    pcbHpBlocks.appendChild(b);
                }
            }
        }
    }

    if (pcbMeter) {
        let remaining = 0;
        let maxDuration = 1;
        let meterColor = 'transparent';
        const shieldRem = player.shieldRemainingMs || 0;
        const tripleRem = player.tripleShotRemainingMs || 0;
        const scoreRem = player.scoreDoubleRemainingMs || 0;

        if (shieldRem > 0) {
            remaining = shieldRem;
            maxDuration = 5000;
            meterColor = '#60a5fa';
        } else if (tripleRem > 0) {
            remaining = tripleRem;
            maxDuration = 5000;
            meterColor = '#f87171';
        } else if (scoreRem > 0) {
            remaining = scoreRem;
            maxDuration = 8000;
            meterColor = '#fbbf24';
        }

        if (remaining > 0) {
            const percentage = Math.max(0, Math.min(100, (remaining / maxDuration) * 100));
            const roundedPercentage = percentage.toFixed(1);
            const meterHash = `${meterColor}:${roundedPercentage}`;
            if (pcbMeter.dataset.hash !== meterHash) {
                pcbMeter.dataset.hash = meterHash;
                pcbMeter.style.background = `conic-gradient(${meterColor} 0% ${roundedPercentage}%, rgba(255,255,255,0.2) ${roundedPercentage}% 100%)`;
            }
            if (pcbStatus) {
                pcbStatus.textContent = `${score}pt`;
                pcbStatus.style.color = meterColor;
            }
        } else {
            if (pcbMeter.dataset.hash !== 'empty') {
                pcbMeter.dataset.hash = 'empty';
                pcbMeter.style.background = 'rgba(255,255,255,0.2)';
            }
            if (pcbStatus) {
                pcbStatus.style.color = '#cfeffd';
            }
        }
    }

    if (btnUseItem) btnUseItem.disabled = !_currentHeldItem || isDead;
    if (btnResetPosition) btnResetPosition.disabled = isDead || !ws || ws.readyState !== WebSocket.OPEN;
    if (itemIcon) {
        const iconSrc = _currentHeldItem ? itemIconMap[_currentHeldItem.type] : itemIconMap.empty;
        itemIcon.src = iconSrc || itemIconMap.empty;
        itemIcon.style.opacity = _currentHeldItem ? 1 : 0.3;
    }
    if (btnShoot) btnShoot.disabled = isDead || !ws || ws.readyState !== WebSocket.OPEN;
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

const tryResetPosition = (e) => {
    if (e) e.preventDefault();
    neutralBeta = null;
};

if (btnResetPosition) {
    btnResetPosition.addEventListener('click', tryResetPosition);
    btnResetPosition.addEventListener('touchstart', tryResetPosition, { passive: false });
}

// --- Fullscreen ---
const updateFullscreenIcons = () => {
    if (!iconFullscreenEnter || !iconFullscreenExit) return;
    if (document.fullscreenElement) {
        iconFullscreenEnter.style.display = 'none';
        iconFullscreenExit.style.display = 'block';
    } else {
        iconFullscreenEnter.style.display = 'block';
        iconFullscreenExit.style.display = 'none';
    }
};

document.addEventListener('fullscreenchange', updateFullscreenIcons);

const triggerSwipeWorkaround = () => {
    const fsEl = document.getElementById('fs');
    if (fsEl) {
        fsInitialInnerHeight = window.innerHeight;
        document.body.classList.add('fs-active');
        document.documentElement.classList.add('fs-active');
        fsEl.style.display = 'flex';

        // Apply scrollability and remove ALL touch/select restrictions via JS
        document.documentElement.style.setProperty('height', '100%', 'important');
        document.documentElement.style.setProperty('overflow', 'visible', 'important');
        document.documentElement.style.setProperty('touch-action', 'auto', 'important');
        document.documentElement.style.setProperty('-webkit-user-select', 'auto', 'important');
        document.documentElement.style.setProperty('user-select', 'auto', 'important');

        document.body.style.setProperty('height', 'auto', 'important');
        document.body.style.setProperty('min-height', '200vh', 'important');
        document.body.style.setProperty('overflow', 'visible', 'important');
        document.body.style.setProperty('touch-action', 'auto', 'important');
        document.body.style.setProperty('-webkit-user-select', 'auto', 'important');
        document.body.style.setProperty('user-select', 'auto', 'important');

        const mainLayout = document.querySelector('.main-layout');
        if (mainLayout) {
            mainLayout.style.setProperty('touch-action', 'auto', 'important');
            mainLayout.style.setProperty('-webkit-user-select', 'auto', 'important');
            mainLayout.style.setProperty('user-select', 'auto', 'important');
        }

        // Chrome iOS Hack: Force scroll calculation and unlock scroll
        let dummy = document.getElementById('chrome-ios-dummy');
        if (!dummy) {
            dummy = document.createElement('div');
            dummy.id = 'chrome-ios-dummy';
            dummy.style.height = '150vh';
            dummy.style.width = '1px';
            dummy.style.position = 'static';
            document.body.appendChild(dummy);
        }
        dummy.style.display = 'block';

        setTimeout(() => {
            window.scrollTo(0, 1);
        }, 50);
    }
};

const toggleFullscreen = (e) => {
    if (e) e.preventDefault();
    
    const docEl = document.documentElement;
    const requestFs = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
    const exitFs = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;

    if (requestFs) {
        if (!isFullscreen) {
            const promise = requestFs.call(docEl);
            if (promise) {
                promise.catch(err => {
                    console.error(`Fullscreen API error: ${err.message}`);
                    triggerSwipeWorkaround();
                });
            }
        } else {
            if (exitFs) exitFs.call(document);
        }
    } else {
        // Fullscreen API unavailable (e.g. iOS Safari/Chrome)
        triggerSwipeWorkaround();
    }
};

if (btnFullscreen) {
    btnFullscreen.addEventListener('click', toggleFullscreen);
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

    // 送信頻度を60fpsに上げたため、1回あたりの移動量をスケーリング
    const SPEED_SCALE = 0.25;
    // const delta = (Math.round((steer / MAX_TILT) * 1000) / 1000) * SPEED_SCALE;
    const ratio = steer / MAX_TILT;
    const delta = (ratio * Math.abs(ratio)) * SPEED_SCALE;

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