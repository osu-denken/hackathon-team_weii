import { connectWebSocket, sendMove, sendShoot, sendLeave, sendDifficulty, sendUseItem, ws } from './network.js';
import { setupController, handleNetworkPayload, handleDisconnectUI, handleConnectUI } from './core.js';

let currentState = { player: null, game: null };

// Adapter to bridge controllerCore with network.js
const networkAdapter = {
    connect: (targetRoom, joinData, onGameReset) => {
        const resetCallback = () => {
            currentState = { player: null, game: null };
            handleDisconnectUI();
            if (onGameReset) onGameReset();
        };

        // Pass callbacks to connectWebSocket (needs to be adapted if connectWebSocket doesn't take callbacks)
        // Actually, connectWebSocket currently sets up its own listeners.
        // Let's rely on standard network.js but listen to WebSocket events here if possible.
        // network.js exports `connectWebSocket(url, joinData, onGameReset)`.
        connectWebSocket(targetRoom, joinData, {
            onConnect: () => {
                handleConnectUI();
            },
            onMessage: (data) => {
                if (data.type === 'gameReset') {
                    resetCallback();
                } else {
                    handleNetworkPayload(data, currentState);
                }
            },
            onDisconnect: () => {
                resetCallback();
            }
        });
    },
    isConnected: () => ws && ws.readyState === 1, // WebSocket.OPEN
    sendMove: (delta, angle, beta, gamma) => sendMove(delta, angle, beta, gamma),
    sendShoot: () => sendShoot(),
    sendLeave: () => sendLeave(),
    sendDifficulty: (diff) => sendDifficulty(diff),
    sendUseItem: () => sendUseItem(),
    onGameReset: (rejoinData) => {
        if (ws && ws.readyState === 1) {
            ws.send(JSON.stringify(rejoinData));
        }
    }
};

// Start UI controller logic
setupController(networkAdapter);

// Monkey-patch network.js to trigger our UI updates
// Since network.js assigns its own `ws.onmessage`, we should really just modify network.js to call our handlers,
// or we can overwrite `ws.onmessage` after it's connected.
// Actually, network.js exports `ws`. 
// It's cleaner to listen to a global event or just let network.js handle it.
// Let's modify network.js to not do UI updates, and instead we do it here.
// Wait, for now we will just use `setInterval` to check connection state, or better, we modify network.js!