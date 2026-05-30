import { LivingEntity } from './LivingEntity.js';

const DEFAULT_HP = 5;
const BASE_ATTACK = 1;
const POWER_ATTACK = 2;

class PlayerEntity extends LivingEntity {
  constructor({ id, number, color, maxHp = DEFAULT_HP }) {
    super({ id, x: 0, y: 0, hp: maxHp, maxHp });
    this.score = 0;
    this.attackPower = BASE_ATTACK;
    this.powerUntil = 0;
    this.shieldUntil = 0;
    this.tripleShotUntil = 0;
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

  applyShield(now, durationMs) {
    this.shieldUntil = Math.max(this.shieldUntil, now + durationMs);
  }

  applyTripleShot(now, durationMs) {
    this.tripleShotUntil = Math.max(this.tripleShotUntil, now + durationMs);
  }

  updatePower(now, baseAttack) {
    if (this.attackPower !== baseAttack && this.powerUntil <= now) {
      this.attackPower = baseAttack;
      this.powerUntil = 0;
    }
  }

  updateTimers(now) {
    if (this.shieldUntil > 0 && this.shieldUntil <= now) {
      this.shieldUntil = 0;
    }
    if (this.tripleShotUntil > 0 && this.tripleShotUntil <= now) {
      this.tripleShotUntil = 0;
    }
  }

  hasShield(now) {
    return this.shieldUntil > now;
  }

  consumeShield() {
    this.shieldUntil = 0;
  }

  hasTripleShot(now) {
    return this.tripleShotUntil > now;
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

export {
  PlayerEntity,
  DEFAULT_HP,
  BASE_ATTACK,
  POWER_ATTACK,
};
