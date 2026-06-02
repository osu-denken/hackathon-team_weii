import { AbstractItem } from './AbstractItem.js';
import { SCORE_DOUBLE_DURATION_MS } from '../constants/gameConfig.js';

class ScoreUpItem extends AbstractItem {
  constructor() {
    super('score_up');
  }

  applyUse(player, stage, now) {
    player.applyScoreDouble(now, SCORE_DOUBLE_DURATION_MS);
    player.lastControlAt = now;
  }
}

export { ScoreUpItem };
