import { LivingEntity } from './entities/LivingEntity.js';

class EnemyEntity extends LivingEntity {
  static SPEED = 0.05;
  static NORMAL_HP = 1;
  static BIG_HP = 3;
  static BIG_EVERY = 8;
  static SPAWN_LIMIT = 5;
  static SPAWN_INTERVAL_MS = 1000;

  constructor({ id, x, y, type, hp, maxHp }) {
    super({ id, x, y, hp, maxHp });
    this.type = type;
  }

  update(speed) {
    this.y -= speed;
  }

  toPayload() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      hp: this.hp,
      maxHp: this.maxHp,
      type: this.type,
    };
  }
}

export { EnemyEntity };
