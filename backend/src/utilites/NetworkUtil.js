const send = (ws, msg) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(msg));
}

const sendError = (ws, msg) => {
    send(ws, { type: 'error', reason: msg });
}

export { sendError, send };