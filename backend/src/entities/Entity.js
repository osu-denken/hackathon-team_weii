class Entity {
  constructor({ id, x = 0, y = 0 }) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.createdAt = Date.now();
    this.startX = x;
    this.startY = y;
  }

  /**
   * 予測処理をするかどうか (処理回数を減らすため)
   * 予め、バックエンドで予測しておき、フロントエンドで動きを補間して描画する
   */
  get isPredictable() {
    return false;
  }

  toPayload() {
    if (this.isPredictable) {
      return {
        id: this.id,
        isPredictable: true,
        createdAt: this.createdAt,
        startX: this.startX,
        startY: this.startY,
      };
    }
    return {
      id: this.id,
      x: this.x,
      y: this.y,
    };
  }
}

export { Entity };
