import Peer from 'peerjs';
import { fetchPeerConfig, watchIceState, debugLog, isDebug } from './iceServers.js';
import NetworkAdapter from '../../smartphone/NetworkAdapter.js';
import { handleNetworkPayload, handleDisconnectUI, handleConnectUI } from '../../smartphone/core.js';

/**
 * ClientPeerAdapter - PeerJS（P2P直接通信）用のネットワークアダプター
 *
 * PeerJS を使ってホストに直接接続し、コントローラーの入力を送信します。
 */
const CONNECT_TIMEOUT_MS = 20000;

class ClientPeerAdapter extends NetworkAdapter {
    constructor() {
        super();
        this._peer = null;
        this._conn = null;
        this._connecting = false;
        this._connectTimer = null;
    }

    isConnecting() {
        return this._connecting;
    }

    _endConnecting() {
        this._connecting = false;
        clearTimeout(this._connectTimer);
        this._connectTimer = null;
    }

    /**
     * @param {string} targetRoomId - ホストの PeerJS ID
     * @param {object} joinData     - ホストへ送信する join ペイロード
     * @param {function} onGameReset - ゲームリセット時のコールバック
     */
    async connect(targetRoomId, joinData, onGameReset) {
        // 接続中に JOIN が再度押されても、二重に接続しない
        if (this._connecting) return;
        this._connecting = true;
        if (this._peer) this._peer.destroy();

        const currentState = { player: null, game: null };

        const resetCallback = () => {
            Object.assign(currentState, { player: null, game: null });
            handleDisconnectUI();
            if (onGameReset) onGameReset();
        };

        const peerConfig = await fetchPeerConfig();

        // いつまでも CONNECTING のままにならないよう、一定時間で失敗として扱う
        this._connectTimer = setTimeout(() => {
            if (!this._connecting) return;
            this._endConnecting();
            debugLog('[client] 接続がタイムアウトしました');
            if (this._peer) this._peer.destroy();
            alert('接続がタイムアウトしました。ネットワークを確認して、もう一度お試しください。');
            handleDisconnectUI();
        }, CONNECT_TIMEOUT_MS);

        this._peer = new Peer({ host: '0.peerjs.com', port: 443, secure: true, config: peerConfig });

        this._peer.on('open', (id) => {
            console.log('My Peer ID is: ' + id);
            this._conn = this._peer.connect(targetRoomId);
            watchIceState(this._conn, 'client');

            this._conn.on('open', () => {
                this._endConnecting();
                console.log('Connected to host:', targetRoomId);
                handleConnectUI();
                this._conn.send(joinData);
            });

            this._conn.on('data', (data) => {
                try {
                    if (data && data.type === 'kicked') {
                        resetCallback();
                    } else if (data && data.type === 'gameReset') {
                        resetCallback();
                    } else {
                        handleNetworkPayload(data, currentState);
                    }
                } catch (err) {
                    console.error('conn.on data parse error', err);
                }
            });

            this._conn.on('close', () => {
                this._endConnecting();
                console.log('Connection closed');
                handleDisconnectUI();
            });

            this._conn.on('error', (err) => {
                console.error('Connection error', err);
            });
        });

        this._peer.on('error', (err) => {
            console.error('Peer Error:', err);
            this._endConnecting();
            debugLog('[client] peer error: ' + err.type);
            alert('P2P接続エラー。ホストが起動しているか確認してください。' + (isDebug() ? '(' + err.type + ')' : ''));
            handleDisconnectUI();
        });
    }

    isConnected() {
        return this._conn !== null && this._conn.open;
    }

    _sendMove(delta, angle, beta, gamma) {
        if (!this.isConnected()) return;
        this._conn.send({ type: 'move', delta, angle, beta, gamma });
    }

    sendShoot() {
        if (!this.isConnected()) return;
        this._conn.send({ type: 'shoot' });
    }

    sendLeave() {
        if (this.isConnected()) {
            this._conn.send({ type: 'leave' });
            this._conn.close();
        }
        if (this._peer) {
            this._peer.destroy();
        }
    }

    sendDifficulty(difficulty) {
        if (!this.isConnected()) return;
        this._conn.send({ type: 'setDifficulty', difficulty });
    }

    sendUseItem() {
        if (!this.isConnected()) return;
        this._conn.send({ type: 'useItem' });
    }

    onGameReset(rejoinData) {
        // P2P ではゲームリセットで全員切断されるので、退出処理を行う
        this.sendLeave();
    }
}

export default ClientPeerAdapter;
