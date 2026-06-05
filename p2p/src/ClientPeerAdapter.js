import Peer from 'peerjs';
import NetworkAdapter from '../../smartphone/NetworkAdapter.js';
import { handleNetworkPayload, handleDisconnectUI, handleConnectUI } from '../../smartphone/core.js';

/**
 * ClientPeerAdapter - PeerJS（P2P直接通信）用のネットワークアダプター
 *
 * PeerJS を使ってホストに直接接続し、コントローラーの入力を送信します。
 */
class ClientPeerAdapter extends NetworkAdapter {
    constructor() {
        super();
        this._peer = null;
        this._conn = null;
    }

    /**
     * @param {string} targetRoomId - ホストの PeerJS ID
     * @param {object} joinData     - ホストへ送信する join ペイロード
     * @param {function} onGameReset - ゲームリセット時のコールバック
     */
    connect(targetRoomId, joinData, onGameReset) {
        const currentState = { player: null, game: null };

        const resetCallback = () => {
            Object.assign(currentState, { player: null, game: null });
            handleDisconnectUI();
            if (onGameReset) onGameReset();
        };

        this._peer = new Peer({ host: '0.peerjs.com', port: 443, secure: true });

        this._peer.on('open', (id) => {
            console.log('My Peer ID is: ' + id);
            this._conn = this._peer.connect(targetRoomId);

            this._conn.on('open', () => {
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
                console.log('Connection closed');
                handleDisconnectUI();
            });

            this._conn.on('error', (err) => {
                console.error('Connection error', err);
            });
        });

        this._peer.on('error', (err) => {
            console.error('Peer Error:', err);
            alert('P2P接続エラー。ホストが起動しているか確認してください。');
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
