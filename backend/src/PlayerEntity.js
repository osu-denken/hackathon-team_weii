import { LivingEntity } from './entities/LivingEntity.js';

const DEFAULT_HP = 5;

class PlayerEntity extends LivingEntity {
  constructor({ id, number, color, maxHp = DEFAULT_HP }) {
    super({ id, x: 0, y: 0, hp: maxHp, maxHp });
    this.score = 0;
    this.attackPower = 1;
    this.powerUntil = 0;
    this.lastShotAt = 0;
    this.number = number;
    this.color = color;
    this.heldItem = null;
  }

  move(delta, minX, maxX) {
    this.x = Math.min(maxX, Math.max(minX, this.x + delta));
  }

  applyPower(now, durationMs, powerAttack) {
    this.attackPower = powerAttack;
    this.powerUntil = now + durationMs;
  }

  updatePower(now, baseAttack) {
    if (this.attackPower !== baseAttack && this.powerUntil <= now) {
      this.attackPower = baseAttack;
      this.powerUntil = 0;
    }
  }

  canShoot(now, cooldownMs) {
    return now - this.lastShotAt >= cooldownMs;
  }

  markShot(now) {
    this.lastShotAt = now;
  }

  setHeldItem(item) {
    if (this.heldItem) {
      return false;
    }

    this.heldItem = item;
    return true;
  }

  consumeHeldItem() {
    if (!this.heldItem) {
      return null;
    }

    const item = this.heldItem;
    this.heldItem = null;
    return item;
  }

  toPayload() {
    return {
      id: this.id,
      x: this.x,
      hp: this.hp,
      maxHp: this.maxHp,
      score: this.score,
      number: this.number,
      color: this.color,
    };
  }
}

export { PlayerEntity, DEFAULT_HP };
