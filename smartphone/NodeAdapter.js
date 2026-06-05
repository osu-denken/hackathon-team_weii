import NetworkAdapter from './NetworkAdapter.js';
import { handleNetworkPayload, handleDisconnectUI, handleConnectUI } from './core.js';

/**
 * NodeAdapter - WebSocket（サーバー経由）通信用のネットワークアダプター
 *
 * backend サーバーに WebSocket で接続し、コントローラーの入力を送信します。
 */
class NodeAdapter extends NetworkAdapter {
    constructor() {
        super();
        this._ws = null;
    }

    /**
     * @param {string} targetRoom - WebSocket サーバーの URL (例: "wss://example.com")
     * @param {object} joinData   - サーバーへ送信する join ペイロード
     * @param {function} onGameReset - ゲームリセット時のコールバック
     */
    connect(targetRoom, joinData, onGameReset) {
        const currentState = { player: null, game: null };

        const resetCallback = () => {
            Object.assign(currentState, { player: null, game: null });
            handleDisconnectUI();
            if (onGameReset) onGameReset();
        };

        this._ws = new WebSocket(targetRoom);

        this._ws.onopen = () => {
            handleConnectUI();
            this._ws.send(JSON.stringify(joinData));
        };

        this._ws.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.type === 'gameReset') {
                    resetCallback();
                } else {
                    handleNetworkPayload(data, currentState);
                }
            } catch (err) {
                console.error('ws.onmessage parse error', err);
            }
        };

        this._ws.onclose = () => {
            resetCallback();
        };

        this._ws.onerror = (err) => {
            console.error('WebSocket Error:', err);
            alert('WebSocket接続エラー。サーバーが起動しているか確認してください。');
            resetCallback();
        };
    }

    isConnected() {
        return this._ws !== null && this._ws.readyState === WebSocket.OPEN;
    }

    _sendMove(delta, angle, beta, gamma) {
        if (!this.isConnected()) return;
        this._ws.send(JSON.stringify({ type: 'move', delta, angle, beta, gamma }));
    }

    sendShoot() {
        if (!this.isConnected()) return;
        this._ws.send(JSON.stringify({ type: 'shoot' }));
    }

    sendLeave() {
        if (!this.isConnected()) return;
        this._ws.send(JSON.stringify({ type: 'leave' }));
        this._ws.close();
    }

    sendDifficulty(difficulty) {
        if (!this.isConnected()) return;
        this._ws.send(JSON.stringify({ type: 'setDifficulty', difficulty }));
    }

    sendUseItem() {
        if (!this.isConnected()) return;
        this._ws.send(JSON.stringify({ type: 'useItem' }));
    }

    onGameReset(rejoinData) {
        // ゲームリセット時は自動再参加する
        if (this.isConnected()) {
            this._ws.send(JSON.stringify(rejoinData));
        }
    }
}

export default NodeAdapter;
