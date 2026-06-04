import { ENABLE_PREDICTION } from '../constants/systemConfig.js';

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

  /**
   * fx(), fy() は関数式
   * t を引数として、x, y を計算する
   */
  get fx() { return "startX"; }
  get fy() { return "startY"; }

  syncPrediction(now) {
    if (this.isPredictable && ENABLE_PREDICTION) {
      this.startX = this.x;
      this.startY = this.y;
      this.createdAt = now;
    }
  }

  toPayload() {
    if (this.isPredictable && ENABLE_PREDICTION) {
      return {
        id: this.id,
        isPredictable: true,
        createdAt: this.createdAt,
        startX: this.startX,
        startY: this.startY,
        fx: this.fx,
        fy: this.fy,
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
