import { AbstractItem } from './AbstractItem.js';
import { TRIPLE_SHOT_DURATION_MS } from '../constants/gameConfig.js';

class TripleShotItem extends AbstractItem {
  constructor() {
    super('triple_shot');
  }

  applyUse(player, stage, now) {
    player.applyTripleShot(now, TRIPLE_SHOT_DURATION_MS);
    player.lastControlAt = now;
  }
}

export { TripleShotItem };
