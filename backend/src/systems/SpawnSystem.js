import { STAGE_CONFIG, DIFFICULTY_SETTINGS } from '../constants/gameConfig.js';
import { EnemyEntity } from '../entities/EnemyEntity.js';
import { BulletEntity } from '../entities/BulletEntity.js';

export class SpawnSystem {
  static maybeSpawnEnemy(stage, now) {
    const stageConfig = STAGE_CONFIG[stage.currentStage] || STAGE_CONFIG[1];
    const difficultySettings = DIFFICULTY_SETTINGS[stage.difficulty] || DIFFICULTY_SETTINGS.normal;
    
    if (stage.enemies.size >= stageConfig.enemySpawnLimit) {
      return;
    }

    if (now - stage.lastEnemySpawnAt < stageConfig.enemySpawnIntervalMs) {
      return;
    }

    const type = stage.enemyCounter % stageConfig.enemyBigEvery === 0 ? 'big' : 'normal';
    const baseHp = type === 'big' ? EnemyEntity.BIG_HP : EnemyEntity.NORMAL_HP;
    const hp = Math.max(1, Math.round(baseHp * (difficultySettings.enemyHpMultiplier || 1)));
    const attack = difficultySettings.enemyAttack || 1;
    const canShootBullets = stageConfig.canEnemiesShoot;
    
    const enemy = new EnemyEntity({
      id: `enemy-${stage.enemyCounter++}`,
      x: (Math.random() * 6) - 3,
      y: 12,
      type,
      hp,
      maxHp: hp,
      attack,
      canShootBullets,
      speed: difficultySettings.enemySpeed || EnemyEntity.SPEED,
    });
    stage.enemies.set(enemy.id, enemy);
    stage.lastEnemySpawnAt = now;
  }

  static maybeSpawnEnemyBullets(stage, now) {
    const stageConfig = STAGE_CONFIG[stage.currentStage] || STAGE_CONFIG[1];
    const shootCooldown = stageConfig.enemyShootCooldownMs || EnemyEntity.SHOOT_COOLDOWN_MS;
    const enemyBulletSpeed = stageConfig.enemyBulletSpeed || BulletEntity.SPEED;
    const disableBottomRow = stageConfig.enemyBottomRowShootDisabled;
    const bottomRowThreshold = 2.0;

    stage.enemies.forEach((enemy) => {
      if (!enemy.canShoot(now, shootCooldown)) {
        return;
      }

      if (disableBottomRow && enemy.y <= bottomRowThreshold) {
        return;
      }

      let targetPlayer = null;
      let closestDistance = Infinity;
      stage.players.forEach((player) => {
        if (player.isDead()) {
          return;
        }
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq < closestDistance) {
          closestDistance = distanceSq;
          targetPlayer = player;
        }
      });

      let vx = 0;
      let vy = -enemyBulletSpeed;
      if (targetPlayer) {
        const dx = targetPlayer.x - enemy.x;
        const dy = targetPlayer.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0.001) {
          vx = (dx / distance) * enemyBulletSpeed;
          vy = (dy / distance) * enemyBulletSpeed;
        }
      }

      const bullet = new BulletEntity({
        id: `enemy-bullet-${stage.bulletCounter++}`,
        x: enemy.x,
        y: enemy.y,
        vx,
        vy,
        ownerId: null,
        ownerType: 'enemy',
        damage: enemy.attack,
      });
      stage.bullets.set(bullet.id, bullet);
      enemy.markShot(now);
    });
  }
}
