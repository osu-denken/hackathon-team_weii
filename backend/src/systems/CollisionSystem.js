import { BULLET_HIT_RANGE, PLAYER_HIT_RANGE, ITEM_HIT_RANGE, HEAL_AMOUNT } from '../constants/gameConfig.js';

export class CollisionSystem {
  static handleBulletCollisions(stage) {
    const bulletsToRemove = new Set();
    const enemiesToRemove = new Set();
    const kills = [];

    stage.bullets.forEach((bullet) => {
      if (bullet.ownerType !== 'player') {
        return;
      }

      stage.enemies.forEach((enemy) => {
        const dx = Math.abs(bullet.x - enemy.x);
        const dy = Math.abs(bullet.y - enemy.y);
        if (dx <= BULLET_HIT_RANGE && dy <= BULLET_HIT_RANGE) {
          bulletsToRemove.add(bullet.id);
          enemy.damage(bullet.damage);
          if (enemy.isDead()) {
            enemiesToRemove.add(enemy.id);
            kills.push({ ownerId: bullet.ownerId, enemy });
          }
        }
      });
    });

    bulletsToRemove.forEach((id) => stage.bullets.delete(id));
    enemiesToRemove.forEach((id) => stage.enemies.delete(id));

    kills.forEach((kill) => {
      if (kill.ownerId) {
        const player = stage.players.get(kill.ownerId);
        if (player) {
          const baseScore = kill.enemy.type === 'big' ? 2 : 1;
          const multiplier = player.hasScoreDouble(Date.now()) ? 2 : 1;
          const earned = baseScore * multiplier;
          player.score += earned;       // プレイヤー累積スコア
          stage.stageScore += earned;    // ステージスコア
        }
      }

      if (kill.enemy.type === 'big' && !stage.itemEntity) {
        stage.spawnItem(kill.enemy.x, kill.enemy.y);
      }
    });
  }

  static handleEnemyBulletCollisions(stage, now) {
    const bulletsToRemove = new Set();

    stage.bullets.forEach((bullet) => {
      if (bullet.ownerType !== 'enemy') {
        return;
      }

      stage.players.forEach((player) => {
        if (player.isDead()) {
          return;
        }

        const dx = Math.abs(bullet.x - player.x);
        const dy = Math.abs(bullet.y - player.y);
        if (dx <= BULLET_HIT_RANGE && dy <= BULLET_HIT_RANGE) {
          bulletsToRemove.add(bullet.id);
          if (player.hasShield(now)) {
            player.consumeShield();
          } else {
            player.damage(bullet.damage);
          }
        }
      });
    });

    bulletsToRemove.forEach((id) => stage.bullets.delete(id));
  }

  static handleEnemyTouches(stage, now) {
    stage.enemies.forEach((enemy, enemyId) => {
      stage.players.forEach((player) => {
        const dx = Math.abs(enemy.x - player.x);
        const dy = Math.abs(enemy.y - player.y);
        if (dx <= PLAYER_HIT_RANGE && dy <= PLAYER_HIT_RANGE) {
          const attack = typeof enemy.attack === 'number' ? enemy.attack : 1;
          if (player.hasShield(now)) {
            player.consumeShield();
          } else {
            player.damage(attack);
          }
          stage.enemies.delete(enemyId);
        }
      });
    });
  }

  static handleItemPickup(stage) {
    if (!stage.itemEntity) {
      return;
    }

    const itemEntity = stage.itemEntity;
    if (!itemEntity) {
      return;
    }

    for (const player of stage.players.values()) {
      const dx = Math.abs(itemEntity.x - player.x);
      const dy = Math.abs(itemEntity.y - player.y);
      if (dx <= ITEM_HIT_RANGE && dy <= ITEM_HIT_RANGE) {
        const payload = itemEntity.toPayload();
        if (payload.type === 'health_potion') {
          player.heal(HEAL_AMOUNT);
          stage.itemEntity = null;
          break;
        }

        if (payload.type === 'health_increase') {
          player.maxHp += 1;
          player.heal(1);
          stage.itemEntity = null;
          break;
        }

        if (player.heldItem) {
          continue;
        }

        player.setHeldItem(payload);
        stage.itemEntity = null;
        break;
      }
    }
  }
}
