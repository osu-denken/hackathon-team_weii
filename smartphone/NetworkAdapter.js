/**
 * NetworkAdapter - すべてのネットワーク通信アダプターの基底クラス
 *
 * 各サブクラスはこのクラスを継承し、通信方式ごとに
 * 以下のメソッドをオーバーライドして実装します。
 *
 * 必須インターフェース:
 *   - connect(targetRoom, joinData, onGameReset)
 *   - isConnected()
 *   - sendMove(delta, angle, beta, gamma)
 *   - sendShoot()
 *   - sendLeave()
 *   - sendDifficulty(difficulty)
 *   - sendUseItem()
 *   - onGameReset(rejoinData) [オプション]
 */
class NetworkAdapter {
    constructor() {
        this._lastMoveSendTime = 0;
        this.THROTTLE_MS = 20;
    }

    /**
     * 指定の接続先に接続します。
     * @param {string} targetRoom - 接続先のルームID または WebSocket URL
     * @param {object} joinData - サーバーへ送信するjoinデータ
     * @param {function} onGameReset - ゲームリセット時に呼ばれるコールバック
     */
    connect(targetRoom, joinData, onGameReset) {
        throw new Error('connect() must be implemented by subclass');
    }

    /**
     * 現在接続中かどうかを返します。
     * @returns {boolean}
     */
    isConnected() {
        throw new Error('isConnected() must be implemented by subclass');
    }

    /**
     * 移動入力を送信します。スロットリング付き。
     * @param {number} delta
     * @param {number} angle
     * @param {number} beta
     * @param {number} gamma
     */
    sendMove(delta, angle, beta, gamma) {
        const now = Date.now();
        if (now - this._lastMoveSendTime > this.THROTTLE_MS) {
            this._sendMove(delta, angle, beta, gamma);
            this._lastMoveSendTime = now;
        }
    }

    /**
     * 実際の移動送信処理。サブクラスでオーバーライドします。
     * @param {number} delta
     * @param {number} angle
     * @param {number} beta
     * @param {number} gamma
     */
    _sendMove(delta, angle, beta, gamma) {
        throw new Error('_sendMove() must be implemented by subclass');
    }

    /**
     * 射撃入力を送信します。
     */
    sendShoot() {
        throw new Error('sendShoot() must be implemented by subclass');
    }

    /**
     * 退出を送信し、接続を切断します。
     */
    sendLeave() {
        throw new Error('sendLeave() must be implemented by subclass');
    }

    /**
     * 難易度設定を送信します。
     * @param {string} difficulty - 'normal' | 'hard'
     */
    sendDifficulty(difficulty) {
        throw new Error('sendDifficulty() must be implemented by subclass');
    }

    /**
     * アイテム使用を送信します。
     */
    sendUseItem() {
        throw new Error('sendUseItem() must be implemented by subclass');
    }

    /**
     * ゲームリセット時の処理。必要に応じてサブクラスでオーバーライドします。
     * @param {object} rejoinData - 再参加用のデータ
     */
    onGameReset(rejoinData) {
        // デフォルトでは何もしない (サブクラスで必要に応じてオーバーライド)
    }
}

export default NetworkAdapter;
