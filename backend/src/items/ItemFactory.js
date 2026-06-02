import { HealthPotionItem } from './HealthPotionItem.js';
import { HealthIncreaseItem } from './HealthIncreaseItem.js';
import { ScoreUpItem } from './ScoreUpItem.js';
import { ShieldItem } from './ShieldItem.js';
import { TripleShotItem } from './TripleShotItem.js';

class ItemFactory {
  static random() {
    if (Math.random() < 0.08) {
      return new HealthIncreaseItem();
    }
    
    const factories = [
      () => new HealthPotionItem(),
      () => new ScoreUpItem(),
      () => new ShieldItem(),
      () => new TripleShotItem(),
    ];
    const index = Math.floor(Math.random() * factories.length);
    
    return factories[index]();
  }
}

export { ItemFactory };
