import { updateUI, updatePlayerInfo, updateGameInfo, elements } from './ui.js';

export let ws = null;
let lastMoveSendTime = 0;
const THROTTLE_MS = 20;

export let currentState = { player: null, game: null };

export const connectWebSocket = (url, joinData, onGameReset) => {
    ws = new WebSocket(url);

    ws.onopen = () => {
        updateUI(true);
        if (elements.customizationPanel) elements.customizationPanel.style.display = 'none';
        if (elements.itemSection) elements.itemSection.style.display = 'flex';
        ws.send(JSON.stringify(joinData));
    };

    ws.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if (data && (data.type === 'joinAck' || data.type === 'playerState')) {
                if (data.isDelta) {
                    if (data.player) currentState.player = { ...currentState.player, ...data.player };
                    if (data.game) currentState.game = { ...currentState.game, ...data.game };
                } else {
                    if (data.player !== undefined) currentState.player = data.player;
                    if (data.game !== undefined) currentState.game = data.game;
                }
                updatePlayerInfo(currentState.player, true);
                updateGameInfo(currentState.game);
            } else if (data && data.type === 'gameReset') {
                currentState = { player: null, game: null };
                if (onGameReset) onGameReset();
            }
        } catch (err) {
            console.error('ws.onmessage parse error', err);
        }
    };

    ws.onclose = () => {
        if (elements.customizationPanel) elements.customizationPanel.style.display = 'flex';
        if (elements.itemSection) elements.itemSection.style.display = 'none';
        updateUI(false);
        updatePlayerInfo(null, false);
    };

    ws.onerror = (err) => {
        console.error("WebSocket Error:", err);
        alert("WebSocket接続エラー。サーバーが起動しているか確認してください。");
        if (elements.customizationPanel) elements.customizationPanel.style.display = 'flex';
        if (elements.itemSection) elements.itemSection.style.display = 'none';
        updateUI(false);
    };
};

export const sendMove = (delta, angle, beta, gamma) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const now = Date.now();
    if (now - lastMoveSendTime > THROTTLE_MS) {
        const moveData = { type: "move", delta: delta, angle: angle, beta: beta, gamma: gamma };
        ws.send(JSON.stringify(moveData));
        lastMoveSendTime = now;
    }
};

export const sendShoot = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "shoot" }));
    }
};

export const sendLeave = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "leave" }));
        ws.close();
    }
};

export const sendDifficulty = (difficulty) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'setDifficulty', difficulty: difficulty }));
    }
};

export const sendUseItem = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "useItem" }));
    }
};
