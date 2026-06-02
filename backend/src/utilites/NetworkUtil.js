const sendRaw = (ws, raw) => {
    ws.send(raw);
}

const send = (ws, msg) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    sendRaw(ws, JSON.stringify(msg));
}

const sendError = (ws, msg) => {
    send(ws, { type: 'error', reason: msg });
}

export { sendRaw, send, sendError };
