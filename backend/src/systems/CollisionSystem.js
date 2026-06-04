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

      if (kill.enemy.type === 'big') {
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
    for (const [itemId, itemEntity] of stage.itemEntities.entries()) {
      for (const player of stage.players.values()) {
        const dx = Math.abs(itemEntity.x - player.x);
        // アイテムの描画がY座標より上（画面上）にズレているため、
        // 当たり判定の中心点を上にシフトしつつ、判定範囲も少し広げる
        const hitCenterY = itemEntity.y + 0.8; 
        const dy = Math.abs(hitCenterY - player.y);
        if (dx <= ITEM_HIT_RANGE && dy <= ITEM_HIT_RANGE + 0.4) {
          if (itemEntity.item.isInstant()) {
            itemEntity.item.applyInstant(player, stage, Date.now());
            stage.itemEntities.delete(itemId);
            break;
          }

          if (player.heldItem) {
            continue;
          }

          player.setHeldItem(itemEntity.item);
          stage.itemEntities.delete(itemId);
          break;
        }
      }
    }
  }
}
