import { Entity } from './Entity.js';

class BulletEntity extends Entity {
  static SPEED = 0.2;
  static SPREAD = 0.05;
  static MAX_Y = 12;
  static MAX_X = 7;

  constructor({ id, x, y, vx, vy, ownerId, ownerType = 'player', damage }) {
    super({ id, x, y });
    this.vx = vx;
    this.vy = vy;
    this.ownerId = ownerId;
    this.ownerType = ownerType;
    this.damage = damage;
  }

  update(dtFactor = 1.0) {
    this.x += this.vx * dtFactor;
    this.y += this.vy * dtFactor;
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
