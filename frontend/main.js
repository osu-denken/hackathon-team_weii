import { elements } from './ui.js';
import { initViewer, processViewerPayload, setViewerConnected } from './core.js';

const fallbackClientUrl = `${window.location.protocol}//${window.location.host}/client/`;
const setQrOverlay = (clientUrl) => {
    if (elements.qrOverlay)
        elements.qrOverlay.src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(clientUrl)}`;
};

const loadClientUrl = async () => {
    try {
        const response = await fetch('/api/client-url', { cache: 'no-store' });
        if (!response.ok)
            return fallbackClientUrl;

        const data = await response.json();
        return typeof data.clientUrl === 'string' && data.clientUrl ? data.clientUrl : fallbackClientUrl;
    } catch (error) {
        return fallbackClientUrl;
    }
};

loadClientUrl().then(setQrOverlay);

const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const wsUrl = `${wsProtocol}://${window.location.host}`;
const socket = new WebSocket(wsUrl);

const networkAdapter = {
    sendDifficulty: (difficulty) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'setDifficulty', difficulty }));
        }
    }
};

initViewer(networkAdapter);

socket.addEventListener('open', () => {
    setViewerConnected(true);
    socket.send(JSON.stringify({ type: 'viewer' }));
});

socket.addEventListener('close', () => {
    setViewerConnected(false);
});

socket.addEventListener('error', () => {
    setViewerConnected(false);
});

socket.addEventListener('message', (e) => {
    let payload;
    try {
        payload = JSON.parse(e.data);
    } catch (error) {
        return;
    }
    processViewerPayload(payload);
});