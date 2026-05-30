import { Entity } from './entities/Entity.js';

class BulletEntity extends Entity {
  static SPEED = 0.2;
  static SPREAD = 0.05;
  static MAX_Y = 12;
  static MAX_X = 6;

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
