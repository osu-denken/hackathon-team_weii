import { AbstractItem } from './AbstractItem.js';
import { SHIELD_DURATION_MS } from '../constants/gameConfig.js';

class ShieldItem extends AbstractItem {
  constructor() {
    super('shield');
  }

  applyUse(player, stage, now) {
    player.applyShield(now, SHIELD_DURATION_MS);
    player.lastControlAt = now;
  }
}

export { ShieldItem };
