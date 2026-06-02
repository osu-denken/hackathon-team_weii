import { Entity } from './Entity.js';

class BulletEntity extends Entity {
  static SPEED = 0.2;
  static SPREAD = 0.05;
  static MAX_Y = 12;
  static MAX_X = 6;

  constructor({ id, x, y, vx, vy, ownerId, ownerType = 'player', damage }) {
    super({ id, x, y });
    this.vx = vx;
    this.vy = vy;
    this.ownerId = ownerId;
    this.ownerType = ownerType;
    this.damage = damage;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
  }

  toPayload() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      ownerId: this.ownerId,
      ownerType: this.ownerType,
      damage: this.damage,
    };
  }
}

export { BulletEntity };
