import { AbstractItem } from './AbstractItem.js';

class HealthIncreaseItem extends AbstractItem {
  constructor() {
    super('health_increase');
  }

  isInstant() {
    return true;
  }

  applyInstant(player, stage, now) {
    player.maxHp += 1;
    player.heal(1);
  }
}

export { HealthIncreaseItem };
