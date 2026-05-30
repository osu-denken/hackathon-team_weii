import { Entity } from './entities/Entity.js';

class BulletEntity extends Entity {
  constructor({ id, x, y, vx, vy, ownerId, damage }) {
    super({ id, x, y });
    this.vx = vx;
    this.vy = vy;
    this.ownerId = ownerId;
    this.damage = damage;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
  }
}

export { BulletEntity };
