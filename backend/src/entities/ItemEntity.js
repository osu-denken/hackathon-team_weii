import { Entity } from './Entity.js';

class ItemEntity extends Entity {
  static SPEED = 0.06;

  constructor({ id, item, x, y, speed = ItemEntity.SPEED }) {
    super({ id, x, y });
    this.item = item;
    this.speed = speed;
  }

  get isPredictable() {
    return true;
  }

  update(dtFactor) {
    this.y -= this.speed * dtFactor;
  }

  toPayload() {
    return {
      ...super.toPayload(),
      type: this.item.type,
      vx: 0,
      vy: -this.speed,
    };
  }
}

export { ItemEntity };
