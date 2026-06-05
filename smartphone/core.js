import { elements, updateCharPreview, updateFullscreenIcons, localState, setDifficultyUI, updateUI, updatePlayerInfo, updateGameInfo } from './ui.js';

export const setupController = (networkAdapter) => {
    // networkAdapter should provide:
    // { connect(roomId, joinData, onGameReset), sendMove(delta, angle, beta, gamma), sendShoot(), sendLeave(), sendDifficulty(diff), sendUseItem() }
    
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

    // Read room ID from URL (for P2P)
    const urlParams = new URLSearchParams(window.location.search);
    const roomIdParam = urlParams.get('room');

    const currentUrl = window.location.href;
    const defaultWsUrl = currentUrl.replace(/^http/, 'ws').replace(/\/client\.html\/?$/, '').replace(/\/$/, '');
    
    if (elements.wsUrlInput) {
        // If Room ID param exists (P2P), use it. Otherwise use websocket URL default.
        elements.wsUrlInput.value = roomIdParam || defaultWsUrl;
        if (roomIdParam) {
            const label = document.querySelector('label[for="ws-url"]');
            if (label) label.textContent = 'Room ID (ホストの画面を見てください)';
        }
    }

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

    const handleGameReset = () => {
        const name2 = elements.playerNameInput ? elements.playerNameInput.value.trim() : '';
        const rejoinData = { type: 'join', id: myUUID, name: name2 || undefined, characterNumber: selectedCharacterNumber };
        // Automatically rejoin for WS, or leave for P2P based on adapter
        if (networkAdapter.onGameReset) {
            networkAdapter.onGameReset(rejoinData);
        }
    };

    if (elements.btnJoin) {
        elements.btnJoin.addEventListener('click', async (e) => {
            e.preventDefault();

            if (networkAdapter.isConnected()) {
                networkAdapter.sendLeave();
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
                color: ['#22d3ee', '#fbbf24', '#f43f5e', '#a3e635', '#c084fc', '#facc15', '#60a5fa', '#f87171'][selectedCharacterNumber - 1] || '#ffffff',
                characterNumber: selectedCharacterNumber,
            };

            const targetRoom = elements.wsUrlInput ? elements.wsUrlInput.value.trim() : roomIdParam;
            if (!targetRoom) {
                alert('接続先が入力されていません');
                return;
            }

            elements.btnJoin.disabled = true;
            elements.btnJoin.textContent = 'CONNECTING...';

            networkAdapter.connect(targetRoom, joinData, handleGameReset);

            setTimeout(() => {
                elements.btnJoin.disabled = false;
                elements.btnJoin.textContent = networkAdapter.isConnected() ? 'LEAVE' : 'JOIN';
            }, 1500);
        });
    }

    // Orientation
    function handleOrientation(e) {
        if (!networkAdapter.isConnected()) return;
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

        networkAdapter.sendMove(delta, 0, e.beta, e.gamma);
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
        networkAdapter.sendShoot();
        _shootTimer = setInterval(networkAdapter.sendShoot, SHOOT_INTERVAL_MS);
        if (elements.btnShoot) elements.btnShoot.classList.add('active');
    }

    function stopShooting(e) {
        if (e) e.preventDefault();
        _isHolding = false;
        if (_shootTimer) {
            clearInterval(_shootTimer);
            _shootTimer = null;
        }
        if (elements.btnShoot) elements.btnShoot.classList.remove('active');
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

    // Keyboard support for debugging
    document.addEventListener('keydown', (e) => {
        if (document.activeElement === elements.playerNameInput || document.activeElement === elements.wsUrlInput) return;
        if (e.code === 'Space') {
            e.preventDefault();
            if (!_isHolding) startShooting();
        } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
            networkAdapter.sendMove(-1, 0, 0, 0);
        } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
            networkAdapter.sendMove(1, 0, 0, 0);
        } else if (e.code === 'KeyE' || e.code === 'Enter') {
            e.preventDefault();
            networkAdapter.sendUseItem();
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            stopShooting();
        }
    });

    // Use Item
    const tryUseItem = (e) => {
        if (e) e.preventDefault();
        if (!networkAdapter.isConnected()) return;
        // P2P doesn't perfectly sync held items yet, so just send it
        networkAdapter.sendUseItem();
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
            networkAdapter.sendDifficulty('normal');
            setDifficultyUI('normal');
        });
    }

    if (elements.difficultyHardBtn) {
        elements.difficultyHardBtn.addEventListener('click', (e) => {
            e.preventDefault();
            networkAdapter.sendDifficulty('hard');
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
        networkAdapter.sendLeave();
    });
};

export const handleNetworkPayload = (data, currentState) => {
    try {
        if (data && (data.type === 'joinAck' || data.type === 'joined' || data.type === 'update')) {
            if (data.player !== undefined) currentState.player = { ...currentState.player, ...data.player };
            if (data.game !== undefined) currentState.game = { ...currentState.game, ...data.game };
            
            updatePlayerInfo(currentState.player, true);
            updateGameInfo(currentState.game);
        } else if (data && data.type === 'kicked') {
            // handle reset properly handled in caller usually
        } else if (data && data.type === 'gameReset') {
            // caller callback triggers
        }
    } catch (err) {
        console.error('Payload parse error', err);
    }
};

export const handleDisconnectUI = () => {
    if (elements.customizationPanel) elements.customizationPanel.style.display = 'flex';
    const roomIdPanel = document.getElementById('room-id-panel');
    if (roomIdPanel) roomIdPanel.style.display = 'flex';
    if (elements.itemSection) elements.itemSection.style.display = 'none';
    updateUI(false);
    updatePlayerInfo(null, false);
    if (elements.btnJoin) elements.btnJoin.textContent = 'JOIN';
};

export const handleConnectUI = () => {
    updateUI(true);
    if (elements.customizationPanel) elements.customizationPanel.style.display = 'none';
    const roomIdPanel = document.getElementById('room-id-panel');
    if (roomIdPanel) roomIdPanel.style.display = 'none';
    if (elements.itemSection) elements.itemSection.style.display = 'flex';
    if (elements.btnJoin) elements.btnJoin.textContent = 'LEAVE';
};
