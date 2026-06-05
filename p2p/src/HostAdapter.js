import NetworkAdapter from '../../smartphone/NetworkAdapter.js';

/**
 * HostAdapter - P2Pホスト側のビューワー用アダプター
 *
 * ホストはネットワーク経由ではなく Stage に直接アクセスして難易度を設定します。
 * initViewer(networkAdapter) の sendDifficulty インターフェースを満たすためのアダプターです。
 *
 * @param {Stage} stage - ゲームステージインスタンス
 */
class HostAdapter extends NetworkAdapter {
    constructor(stage) {
        super();
        this._stage = stage;
    }

    // ホストはブラウザ内でゲームを直接動かしているため、
    // 接続状態という概念は常に「接続済み」扱いにします。
    isConnected() {
        return true;
    }

    sendDifficulty(difficulty) {
        this._stage.setDifficulty(difficulty);
    }

    // ホスト側では以下のメソッドは不要なため、何もしない実装を提供します。
    _sendMove() {}
    sendShoot() {}
    sendLeave() {}
    sendUseItem() {}
    connect() {}
}

export default HostAdapter;
