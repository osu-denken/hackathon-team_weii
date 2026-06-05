import Peer from 'peerjs';
import '../../smartphone/styles.css';
import { elements, updateCharPreview, updateFullscreenIcons, localState, setDifficultyUI, updateUI, updatePlayerInfo, updateGameInfo } from '../../smartphone/ui.js';

let peer = null;
let conn = null;
let lastMoveSendTime = 0;
const THROTTLE_MS = 20;

export let currentState = { player: null, game: null };

const myUUID = window.crypto && crypto.randomUUID ? crypto.randomUUID() : "local-test-uuid";
let selectedCharacterNumber = 0;
const CHAR_COUNT = 8;
let neutralBeta = null;

// Initialize
updateCharPreview(selectedCharacterNumber, CHAR_COUNT);

// Read room ID from URL
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');

if (elements.wsUrlInput) {
    elements.wsUrlInput.value = roomId || '';
    // Modify input label/placeholder
    const label = document.querySelector('label[for="ws-url"]');
    if (label) label.textContent = 'Room ID (ホストの画面を見てください)';
}

// PeerJS Connection Logic
const connectPeer = (targetRoomId, joinData, onGameReset) => {
    peer = new Peer({ host: '0.peerjs.com', port: 443, secure: true });
    
    peer.on('open', (id) => {
        console.log('My Peer ID is: ' + id);
        conn = peer.connect(targetRoomId);
        
        conn.on('open', () => {
            console.log('Connected to host:', targetRoomId);
            updateUI(true);
            if (elements.customizationPanel) elements.customizationPanel.style.display = 'none';
            const roomIdPanel = document.getElementById('room-id-panel');
            if (roomIdPanel) roomIdPanel.style.display = 'none';
            if (elements.itemSection) elements.itemSection.style.display = 'flex';
            conn.send(joinData);
        });

        conn.on('data', (data) => {
            try {
                if (data && (data.type === 'joined' || data.type === 'update')) {
                    // Host sends full payload on update or joined
                    if (data.player !== undefined) currentState.player = { ...currentState.player, ...data.player };
                    if (data.game !== undefined) currentState.game = { ...currentState.game, ...data.game };
                    
                    updatePlayerInfo(currentState.player, true);
                    updateGameInfo(currentState.game);
                } else if (data && data.type === 'kicked') {
                    currentState = { player: null, game: null };
                    if (onGameReset) onGameReset();
                }
            } catch (err) {
                console.error('conn.on data parse error', err);
            }
        });

        conn.on('close', () => {
            console.log('Connection closed');
            if (elements.customizationPanel) elements.customizationPanel.style.display = 'flex';
            const roomIdPanel = document.getElementById('room-id-panel');
            if (roomIdPanel) roomIdPanel.style.display = 'flex';
            if (elements.itemSection) elements.itemSection.style.display = 'none';
            updateUI(false);
            updatePlayerInfo(null, false);
        });
        
        conn.on('error', (err) => {
            console.error('Connection error', err);
        });
    });

    peer.on('error', (err) => {
        console.error("Peer Error:", err);
        alert("P2P接続エラー。ホストが起動しているか確認してください。");
        if (elements.customizationPanel) elements.customizationPanel.style.display = 'flex';
        const roomIdPanel = document.getElementById('room-id-panel');
        if (roomIdPanel) roomIdPanel.style.display = 'flex';
        if (elements.itemSection) elements.itemSection.style.display = 'none';
        updateUI(false);
    });
};

// Network functions
export const sendMove = (delta, angle, beta, gamma) => {
    if (!conn || !conn.open) return;
    const now = Date.now();
    if (now - lastMoveSendTime > THROTTLE_MS) {
        conn.send({ type: "move", delta, angle, beta, gamma });
        lastMoveSendTime = now;
    }
};

export const sendShoot = () => {
    if (conn && conn.open) {
        conn.send({ type: "shoot" });
    }
};

export const sendLeave = () => {
    if (conn && conn.open) {
        conn.send({ type: "leave" });
        conn.close();
    }
    if (peer) {
        peer.destroy();
    }
};

export const sendDifficulty = (difficulty) => {
    if (conn && conn.open) {
        conn.send({ type: 'setDifficulty', difficulty });
    }
};

export const sendUseItem = () => {
    if (conn && conn.open) {
        conn.send({ type: "useItem" });
    }
};

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
    if (elements.customizationPanel) elements.customizationPanel.style.display = 'flex';
    const roomIdPanel = document.getElementById('room-id-panel');
    if (roomIdPanel) roomIdPanel.style.display = 'flex';
    if (elements.itemSection) elements.itemSection.style.display = 'none';
    updateUI(false);
    updatePlayerInfo(null, false);
    
    // Automatically leave
    sendLeave();
};

if (elements.btnJoin) {
    elements.btnJoin.addEventListener('click', async (e) => {
        e.preventDefault();

        if (conn && conn.open) {
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
            name: name,
            color: ['#22d3ee', '#fbbf24', '#f43f5e', '#a3e635', '#c084fc', '#facc15', '#60a5fa', '#f87171'][selectedCharacterNumber - 1] || '#ffffff',
            characterNumber: selectedCharacterNumber
        };

        const targetRoom = elements.wsUrlInput ? elements.wsUrlInput.value.trim() : roomId;
        
        if (!targetRoom) {
            alert('Room ID が入力されていません');
            return;
        }

        elements.btnJoin.disabled = true;
        elements.btnJoin.textContent = 'CONNECTING...';

        connectPeer(targetRoom, joinData, handleGameReset);

        setTimeout(() => {
            elements.btnJoin.disabled = false;
            elements.btnJoin.textContent = (conn && conn.open) ? 'LEAVE' : 'JOIN';
        }, 1500);
    });
}

if (elements.btnShoot) {
    const handleShootDown = (e) => {
        e.preventDefault();
        sendShoot();
        elements.btnShoot.classList.add('active');
    };
    const handleShootUp = (e) => {
        e.preventDefault();
        elements.btnShoot.classList.remove('active');
    };
    elements.btnShoot.addEventListener('touchstart', handleShootDown, { passive: false });
    elements.btnShoot.addEventListener('touchend', handleShootUp);
    elements.btnShoot.addEventListener('mousedown', handleShootDown);
    elements.btnShoot.addEventListener('mouseup', handleShootUp);
}

if (elements.btnUseItem) {
    elements.btnUseItem.addEventListener('click', (e) => {
        e.preventDefault();
        sendUseItem();
    });
}

document.addEventListener('keydown', (e) => {
    if (document.activeElement === elements.playerNameInput || document.activeElement === elements.wsUrlInput) return;
    if (e.code === 'Space') {
        e.preventDefault();
        sendShoot();
    } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        sendMove(-1, 0, 0, 0);
    } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        sendMove(1, 0, 0, 0);
    } else if (e.code === 'KeyE' || e.code === 'Enter') {
        e.preventDefault();
        sendUseItem();
    }
});

// Device Orientation Handling
const handleOrientation = (event) => {
    let { beta, gamma } = event;
    if (beta === null || gamma === null) return;
    
    if (neutralBeta === null) {
        neutralBeta = beta;
    }

    let tiltX = gamma;
    if (beta > 90) { tiltX = -gamma; }
    else if (beta < -90) { tiltX = -gamma; }
    
    let normalizedDelta = 0;
    const threshold = 10;
    if (Math.abs(tiltX) > threshold) {
        normalizedDelta = tiltX > 0 ? 1 : -1;
    }
    
    if (Math.abs(tiltX) > threshold) {
        sendMove(normalizedDelta, tiltX, beta, gamma);
    } else {
        sendMove(0, tiltX, beta, gamma);
    }
};

window.addEventListener('deviceorientation', handleOrientation);

const fs_display = () => {
    // Basic logic
};
window.addEventListener('resize', fs_display);
