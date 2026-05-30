import { Entity } from './Entity.js';

class LivingEntity extends Entity {
  constructor({ id, x = 0, y = 0, hp = 1, maxHp = 1 }) {
    super({ id, x, y });
    this.hp = hp;
    this.maxHp = maxHp;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  damage(amount) {
    this.hp = Math.max(0, this.hp - amount);
  }

  isDead() {
    return this.hp <= 0;
  }

  toPayload() {
    return {
      ...super.toPayload(),
      hp: this.hp,
      maxHp: this.maxHp,
    };
  }
}

export { LivingEntity };
