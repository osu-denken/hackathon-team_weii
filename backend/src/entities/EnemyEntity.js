import { LivingEntity } from './LivingEntity.js';

class EnemyEntity extends LivingEntity {
  static SPEED = 0.05;
  static NORMAL_HP = 1;
  static BIG_HP = 3;
  static BIG_EVERY = 8;
  static SPAWN_LIMIT = 5;
  static SPAWN_INTERVAL_MS = 1000;
  static SHOOT_COOLDOWN_MS = 2000;

  constructor({ id, x, y, type, hp, maxHp, attack = 1, canShootBullets = false }) {
    super({ id, x, y, hp, maxHp });
    this.type = type;
    this.attack = attack;
    this.canShootBullets = canShootBullets;
    this.lastShotAt = null;
  }

  update(speed) {
    this.y -= speed;
  }

  canShoot(now, cooldownMs) {
    if (!this.canShootBullets) return false;
    if (this.lastShotAt === null) return true;
    return now - this.lastShotAt >= cooldownMs;
  }

  markShot(now) {
    this.lastShotAt = now;
  }

  toPayload() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      hp: this.hp,
      maxHp: this.maxHp,
      type: this.type,
      attack: this.attack,
    };
  }
}

export { EnemyEntity };
