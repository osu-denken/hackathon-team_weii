import { elements, updateCharPreview, updateFullscreenIcons, localState, setDifficultyUI } from './ui.js';
import { connectWebSocket, sendMove, sendShoot, sendLeave, sendDifficulty, sendUseItem, ws } from './network.js';

// --- Fullscreen Workaround (Swipe fallback) ---
let fsInitialInnerHeight = 0;
let fsResizeTimer = null;

const fs_display = () => {
    const fsEl = document.getElementById('fs');
    if (fsEl && fsEl.style.display === 'flex') {
        clearTimeout(fsResizeTimer);
        fsResizeTimer = setTimeout(() => {
            if (window.innerHeight > fsInitialInnerHeight + 20) {
                fsEl.style.display = 'none';
                document.body.classList.remove('fs-active');
                document.documentElement.classList.remove('fs-active');
                
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

const myUUID = window.crypto && crypto.randomUUID ? crypto.randomUUID() : "local-test-uuid";
let selectedCharacterNumber = 0;
const CHAR_COUNT = 8;
let neutralBeta = null;

// Initialize
updateCharPreview(selectedCharacterNumber, CHAR_COUNT);

const currentUrl = window.location.href;
const defaultWsUrl = currentUrl.replace(/^http/, 'ws').replace(/\/client\/?$/, '');
if (elements.wsUrlInput) elements.wsUrlInput.value = defaultWsUrl;

// Event Listeners for UI
if (elements.charPrevBtn) {
    elements.charPrevBtn.addEventListener('click', () => {
        selectedCharacterNumber = selectedCharacterNumber <= 0 ? CHAR_COUNT : selectedCharacterNumber - 1;
        updateCharPreview(selectedCharacterNumber, CHAR_COUNT);
    });
}

if (elements.charNextBtn) {
    elements.charNextBtn.addEventListener('click', () => {
        selectedCharacterNumber = selectedCharacterNumber >= CHAR_COUNT ? 0 : selectedCharacterNumber + 1;
        updateCharPreview(selectedCharacterNumber, CHAR_COUNT);
    });
}

if (elements.btnJoin) {
    elements.btnJoin.addEventListener('click', async (e) => {
        e.preventDefault();

        if (ws && ws.readyState === WebSocket.OPEN) {
            sendLeave();
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

        const name = elements.playerNameInput ? elements.playerNameInput.value.trim() : '';
        const joinData = {
            type: "join",
            id: myUUID,
            name: name || undefined,
            characterNumber: selectedCharacterNumber,
        };

        const onGameReset = () => {
            const name2 = elements.playerNameInput ? elements.playerNameInput.value.trim() : '';
            const rejoinData = { type: 'join', id: myUUID, name: name2 || undefined, characterNumber: selectedCharacterNumber };
            ws.send(JSON.stringify(rejoinData));
        };

        connectWebSocket(elements.wsUrlInput.value, joinData, onGameReset);
    });
}

// Orientation
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

    const SPEED_SCALE = 0.25;
    const ratio = steer / MAX_TILT;
    const delta = (ratio * Math.abs(ratio)) * SPEED_SCALE;

    sendMove(delta, 0, e.beta, e.gamma);
}

// Shooting
const SHOOT_INTERVAL_MS = 300;
let _shootTimer = null;
let _isHolding = false;
let _lastTouchTime = 0;

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

if (elements.btnShoot) {
    elements.btnShoot.addEventListener('touchstart', startShooting, { passive: false });
    elements.btnShoot.addEventListener('touchend', stopShooting);
    elements.btnShoot.addEventListener('touchcancel', stopShooting);
    elements.btnShoot.addEventListener('mousedown', (e) => {
        if (Date.now() - _lastTouchTime < 500) return;
        startShooting(e);
    });
    elements.btnShoot.addEventListener('mouseleave', stopShooting);
}
document.addEventListener('mouseup', stopShooting);

// Use Item
const tryUseItem = (e) => {
    if (e) e.preventDefault();
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (!localState.currentHeldItem) return;
    sendUseItem();
};

if (elements.btnUseItem) {
    elements.btnUseItem.addEventListener('click', tryUseItem);
    elements.btnUseItem.addEventListener('touchstart', tryUseItem, { passive: false });
}

// Reset Position
const tryResetPosition = (e) => {
    if (e) e.preventDefault();
    neutralBeta = null;
};

if (elements.btnResetPosition) {
    elements.btnResetPosition.addEventListener('click', tryResetPosition);
    elements.btnResetPosition.addEventListener('touchstart', tryResetPosition, { passive: false });
}

// Difficulty
if (elements.difficultyNormalBtn) {
    elements.difficultyNormalBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sendDifficulty('normal');
        setDifficultyUI('normal');
    });
}

if (elements.difficultyHardBtn) {
    elements.difficultyHardBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sendDifficulty('hard');
        setDifficultyUI('hard');
    });
}

// Fullscreen
const triggerSwipeWorkaround = () => {
    const fsEl = document.getElementById('fs');
    if (fsEl) {
        fsInitialInnerHeight = window.innerHeight;
        document.body.classList.add('fs-active');
        document.documentElement.classList.add('fs-active');
        fsEl.style.display = 'flex';

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
        triggerSwipeWorkaround();
    }
};

if (elements.btnFullscreen) {
    elements.btnFullscreen.addEventListener('click', toggleFullscreen);
}
document.addEventListener('fullscreenchange', updateFullscreenIcons);

// Unload
window.addEventListener('beforeunload', () => {
    sendLeave();
});