

export let ws = null;
let lastMoveSendTime = 0;
const THROTTLE_MS = 20;

export let currentState = { player: null, game: null };

export const connectWebSocket = (url, joinData, callbacks) => {
    ws = new WebSocket(url);

    ws.onopen = () => {
        if (callbacks && callbacks.onConnect) callbacks.onConnect();
        ws.send(JSON.stringify(joinData));
    };

    ws.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if (callbacks && callbacks.onMessage) callbacks.onMessage(data);
        } catch (err) {
            console.error('ws.onmessage parse error', err);
        }
    };

    ws.onclose = () => {
        if (callbacks && callbacks.onDisconnect) callbacks.onDisconnect();
    };

    ws.onerror = (err) => {
        console.error("WebSocket Error:", err);
        alert("WebSocket接続エラー。サーバーが起動しているか確認してください。");
        if (callbacks && callbacks.onDisconnect) callbacks.onDisconnect();
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
