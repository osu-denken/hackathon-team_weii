import NetworkAdapter from '../smartphone/NetworkAdapter.js';
import { processViewerPayload, setViewerConnected } from './core.js';

/**
 * NodeAdapter - WebSocket接続のビューワー（モニター）用アダプター
 *
 * バックエンドサーバーに WebSocket で接続し、ゲーム状態を受信して
 * フロントエンドに反映します。また、難易度変更をサーバーへ送信します。
 */
class NodeAdapter extends NetworkAdapter {
    constructor() {
        super();
        this._socket = null;
    }

    /**
     * WebSocket でサーバーに接続します。
     * @param {string} wsUrl - WebSocket サーバーの URL
     * @param {function} onOpen   - 接続成功時のコールバック
     * @param {function} onClose  - 切断時のコールバック
     */
    connectViewer(wsUrl, { onOpen, onClose } = {}) {
        this._socket = new WebSocket(wsUrl);

        this._socket.addEventListener('open', () => {
            setViewerConnected(true);
            this._socket.send(JSON.stringify({ type: 'viewer' }));
            if (onOpen) onOpen();
        });

        this._socket.addEventListener('close', () => {
            setViewerConnected(false);
            if (onClose) onClose();
        });

        this._socket.addEventListener('error', () => {
            setViewerConnected(false);
            if (onClose) onClose();
        });

        this._socket.addEventListener('message', (e) => {
            let payload;
            try {
                payload = JSON.parse(e.data);
            } catch {
                return;
            }
            processViewerPayload(payload);
        });
    }

    isConnected() {
        return this._socket !== null && this._socket.readyState === WebSocket.OPEN;
    }

    sendDifficulty(difficulty) {
        if (!this.isConnected()) return;
        this._socket.send(JSON.stringify({ type: 'setDifficulty', difficulty }));
    }

    // ビューワーはゲーム操作を行わないため、以下は空実装
    _sendMove() { }
    sendShoot() { }
    sendLeave() { }
    sendUseItem() { }
    connect() { }
}

export default NodeAdapter;
