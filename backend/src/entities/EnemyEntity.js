import { LivingEntity } from './LivingEntity.js';

class EnemyEntity extends LivingEntity {
  static SPEED = 0.05;
  static NORMAL_HP = 1;
  static BIG_HP = 3;
  static BIG_EVERY = 8;
  static SPAWN_LIMIT = 5;
  static SPAWN_INTERVAL_MS = 1000;
  static SHOOT_COOLDOWN_MS = 2000;

  constructor({ id, x, y, type, hp, maxHp, attack = 1, canShootBullets = false, speed = EnemyEntity.SPEED }) {
    super({ id, x, y, hp, maxHp });
    this.type = type;
    this.attack = attack;
    this.canShootBullets = canShootBullets;
    this.lastShotAt = null;
    this.speed = speed;
  }

  get isPredictable() {
    return true;
  }

  update(dtFactor) {
    this.y -= this.speed * dtFactor;
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
      ...super.toPayload(),
      hp: this.hp,
      maxHp: this.maxHp,
      type: this.type,
      attack: this.attack,
      vx: 0,
      vy: -this.speed,
    };
  }
}

export { EnemyEntity };
