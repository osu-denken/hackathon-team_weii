const sendError = (ws, msg) => {
    send(ws, { type: 'error', reason: msg });
}

const send = (ws, msg) => {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
    }
}

export { sendError, send };