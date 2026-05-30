import { Entity } from './entities/Entity.js';

class ItemEntity extends Entity {
  constructor({ id, item, x, y }) {
    super({ id, x, y });
    this.item = item;
  }

  update(speed) {
    this.y -= speed;
  }

  toPayload() {
    return {
      id: this.id,
      type: this.item.type,
      x: this.x,
      y: this.y,
    };
  }
}

export { ItemEntity };
