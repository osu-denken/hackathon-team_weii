import Peer from 'peerjs';
import '../../smartphone/styles.css';
import { setupController, handleNetworkPayload, handleDisconnectUI, handleConnectUI } from '../../smartphone/core.js';

let peer = null;
let conn = null;
let lastMoveSendTime = 0;
const THROTTLE_MS = 20;

let currentState = { player: null, game: null };

// Adapter to bridge controllerCore with PeerJS
const networkAdapter = {
    connect: (targetRoomId, joinData, onGameReset) => {
        peer = new Peer({ host: '0.peerjs.com', port: 443, secure: true });

        peer.on('open', (id) => {
            console.log('My Peer ID is: ' + id);
            conn = peer.connect(targetRoomId);

            conn.on('open', () => {
                console.log('Connected to host:', targetRoomId);
                handleConnectUI();
                conn.send(joinData);
            });

            conn.on('data', (data) => {
                try {
                    if (data && data.type === 'kicked') {
                        currentState = { player: null, game: null };
                        handleDisconnectUI();
                        if (onGameReset) onGameReset();
                    } else if (data && data.type === 'gameReset') {
                        currentState = { player: null, game: null };
                        handleDisconnectUI();
                        if (onGameReset) onGameReset();
                    } else {
                        handleNetworkPayload(data, currentState);
                    }
                } catch (err) {
                    console.error('conn.on data parse error', err);
                }
            });

            conn.on('close', () => {
                console.log('Connection closed');
                handleDisconnectUI();
            });

            conn.on('error', (err) => {
                console.error('Connection error', err);
            });
        });

        peer.on('error', (err) => {
            console.error("Peer Error:", err);
            alert("P2P接続エラー。ホストが起動しているか確認してください。");
            handleDisconnectUI();
        });
    },
    isConnected: () => conn && conn.open,
    sendMove: (delta, angle, beta, gamma) => {
        if (!conn || !conn.open) return;
        const now = Date.now();
        if (now - lastMoveSendTime > THROTTLE_MS) {
            conn.send({ type: "move", delta, angle, beta, gamma });
            lastMoveSendTime = now;
        }
    },
    sendShoot: () => {
        if (conn && conn.open) conn.send({ type: "shoot" });
    },
    sendLeave: () => {
        if (conn && conn.open) {
            conn.send({ type: "leave" });
            conn.close();
        }
        if (peer) peer.destroy();
    },
    sendDifficulty: (difficulty) => {
        if (conn && conn.open) conn.send({ type: 'setDifficulty', difficulty });
    },
    sendUseItem: () => {
        if (conn && conn.open) conn.send({ type: "useItem" });
    },
    onGameReset: (rejoinData) => {
        // Automatically leave in P2P since game reset effectively kicks everyone
        networkAdapter.sendLeave();
    }
};

// Start UI controller logic
setupController(networkAdapter);
