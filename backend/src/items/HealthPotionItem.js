import { AbstractItem } from './AbstractItem.js';
import { HEAL_AMOUNT } from '../constants/gameConfig.js';

class HealthPotionItem extends AbstractItem {
  constructor() {
    super('health_potion');
  }

  isInstant() {
    return true;
  }

  applyInstant(player, stage, now) {
    player.heal(HEAL_AMOUNT);
  }
}

export { HealthPotionItem };
