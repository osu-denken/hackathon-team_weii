import { LivingEntity } from './entities/LivingEntity.js';

class EnemyEntity extends LivingEntity {
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
