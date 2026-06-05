import { elements } from './ui.js';
import { initViewer } from './core.js';
import NodeAdapter from './NodeAdapter.js';

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

const networkAdapter = new NodeAdapter();
initViewer(networkAdapter);
networkAdapter.connectViewer(wsUrl);