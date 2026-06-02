class AbstractItem {
  /**
   * アイテムの抽象クラス
   * @param {string} type - アイテムの種類 (例: 'health_potion', 'shield', 'triple_shot')
   */
  constructor(type) {
    this.type = type;
  }

  /**
   * 拾った瞬間に即時発動するアイテムかどうかを判定します。
   * true の場合はストックされず、すぐに applyInstant() が呼ばれます。
   * @returns {boolean} 即時発動の場合は true
   */
  isInstant() {
    return false;
  }

  /**
   * 即時発動アイテムの場合に、拾得時に呼び出される処理です。
   * サブクラスでオーバーライドして具体的な効果（回復など）を実装してください。
   * @param {PlayerEntity} player - アイテムを取得したプレイヤー
   * @param {Stage} stage - 現在のゲームステージ
   * @param {number} now - 現在のタイムスタンプ(ミリ秒)
   */
  applyInstant(player, stage, now) {
    // Override in subclasses
  }

  /**
   * ストック可能なアイテムを、プレイヤーが任意のタイミングで使用した際に呼び出される処理です。
   * サブクラスでオーバーライドして具体的な効果（シールド付与など）を実装してください。
   * @param {PlayerEntity} player - アイテムを使用したプレイヤー
   * @param {Stage} stage - 現在のゲームステージ
   * @param {number} now - 現在のタイムスタンプ(ミリ秒)
   */
  applyUse(player, stage, now) {
    // Override in subclasses
  }
}

export { AbstractItem };
