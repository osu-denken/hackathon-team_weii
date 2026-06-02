import { PlayerEntity, DEFAULT_HP, BASE_ATTACK } from './entities/PlayerEntity.js';
import { BulletEntity } from './entities/BulletEntity.js';
import { Item } from './Item.js';
import { ItemEntity } from './entities/ItemEntity.js';
import { TICK_MS } from './constants/systemConfig.js';

import { CollisionSystem } from './systems/CollisionSystem.js';
import { SpawnSystem } from './systems/SpawnSystem.js';
import { PayloadBuilder } from './utils/PayloadBuilder.js';

import {
  X_MIN,
  X_MAX,
  PLAYER_COLORS,
  SHOOT_COOLDOWN_MS,
  MAX_ACTIVE_BULLETS_PER_PLAYER,
  TRIPLE_SHOT_DURATION_MS,
  SHIELD_DURATION_MS,
  SCORE_DOUBLE_DURATION_MS,
  RETURN_TO_TITLE_DELAY_MS,
  RESPAWN_MS,
  STAGE_CONFIG,
  DIFFICULTY_SETTINGS
} from './constants/gameConfig.js';

const dtFactor = TICK_MS / 40.0;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

class Stage {
  constructor() {
    this.players = new Map();
    this.enemies = new Map();
    this.bullets = new Map();
    this.itemEntity = null;

    this.enemyCounter = 0;
    this.bulletCounter = 0;
    this.itemCounter = 0;
    this.nextPlayerNumber = 1;
    this.lastEnemySpawnAt = Date.now();
    this.gameStartAt = null;
    this.gameStarted = false;
    this.startCountdownAt = null;
    this.startCountdownMs = 10000;
    this.difficulty = 'normal';
    this.emptySince = null;
    this.pausedAt = null;
    this.mode = 'title';
    this.currentStage = 1;
    this.stageCleared = false;
    this.stageScore = 0;
    this.gameOver = false;
    this.gameOverAt = null;
  }

  resetToTitle(now = Date.now()) {
    this.players.clear();
    this.enemies.clear();
    this.bullets.clear();
    this.itemEntity = null;
    this.enemyCounter = 0;
    this.bulletCounter = 0;
    this.itemCounter = 0;
    this.nextPlayerNumber = 1;
    this.gameStartAt = null;
    this.gameStarted = false;
    this.startCountdownAt = null;
    this.lastEnemySpawnAt = now;
    this.emptySince = null;
    this.pausedAt = null;
    this.mode = 'title';
    this.currentStage = 1;
    this.stageCleared = false;
    this.stageScore = 0;
    this.gameOver = false;
    this.gameOverAt = null;
  }

  addPlayer(id, now = Date.now()) {
    const existing = this.players.get(id);
    if (existing) {
      return existing;
    }

    if (this.players.size === 0) {
      if (this.mode === 'playing' && this.pausedAt !== null && this.gameStarted && this.gameStartAt !== null) {
        this.gameStartAt += now - this.pausedAt;
      } else if (this.mode === 'title') {
        this.lastEnemySpawnAt = now;
      }

      this.emptySince = null;
      this.pausedAt = null;
      this.mode = 'playing';
    }

    const number = this.nextPlayerNumber++;
    const color = PLAYER_COLORS[(number - 1) % PLAYER_COLORS.length];
    const player = new PlayerEntity({
      id,
      number,
      color,
      maxHp: DEFAULT_HP,
    });

    this.players.set(id, player);

    if (!this.gameStarted) {
      this.startCountdownAt = now;
    }

    return player;
  }

  setDifficulty(difficulty) {
    if (this.gameStarted) {
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(DIFFICULTY_SETTINGS, difficulty)) {
      return;
    }
    this.difficulty = difficulty;
  }

  removePlayer(id, now = Date.now()) {
    this.players.delete(id);
    if (this.players.size === 0) {
      this.nextPlayerNumber = 1;
      if (!this.gameStarted) {
        this.startCountdownAt = null;
      }
      this.emptySince = now;
      if (this.gameStarted) {
        this.pausedAt = now;
      }
      // ハードモードでは全員消滅で即ゲーム終了（タイトルへ戻す）
      if (this.difficulty === 'hard' && this.gameStarted) {
        this.resetToTitle(now);
      }
    }
  }

  getPlayer(id) {
    return this.players.get(id) || null;
  }

  movePlayer(id, delta, now = Date.now()) {
    const player = this.getPlayer(id);
    if (!player) {
      return;
    }
    if (player.isDead()) {
      return;
    }
    const moveDelta = clamp(Number(delta) || 0, -1, 1);
    player.move(moveDelta, X_MIN, X_MAX);
    if (moveDelta !== 0) {
      player.lastControlAt = now;
    }
  }

  resetPlayerPosition(id, now = Date.now()) {
    const player = this.getPlayer(id);
    if (!player) {
      return;
    }
    if (player.isDead()) {
      return;
    }
    player.x = 0;
    player.lastControlAt = now;
  }

  shootPlayer(id, now) {
    const player = this.getPlayer(id);
    if (!player) {
      return false;
    }
    if (player.isDead()) {
      return false;
    }
    if (!player.canShoot(now, SHOOT_COOLDOWN_MS)) {
      return false;
    }

    if (this.countBulletsByOwner(player.id) >= MAX_ACTIVE_BULLETS_PER_PLAYER) {
      return false;
    }

    if (player.hasTripleShot(now)) {
      this.spawnTripleBullets(player, player.attackPower);
    } else {
      this.spawnSingleBullet(player, player.attackPower);
    }

    player.markShot(now);
    return true;
  }

  useHeldItem(id, now) {
    const player = this.getPlayer(id);
    if (!player) {
      return;
    }
    if (player.isDead()) {
      return;
    }
    const item = player.consumeHeldItem();
    if (!item) {
      return;
    }

    if (item.type === 'score_up') {
      player.applyScoreDouble(now, SCORE_DOUBLE_DURATION_MS);
      player.lastControlAt = now;
      return;
    }

    if (item.type === 'shield') {
      player.applyShield(now, SHIELD_DURATION_MS);
      player.lastControlAt = now;
      return;
    }

    if (item.type === 'triple_shot') {
      player.applyTripleShot(now, TRIPLE_SHOT_DURATION_MS);
      player.lastControlAt = now;
      return;
    }
  }

  update(now) {
    // 全ステージクリア後にタイトルへ戻るカウントダウン中
    if (this.stageCleared && this.currentStage >= 3 && this.emptySince !== null) {
      if (now - this.emptySince >= RETURN_TO_TITLE_DELAY_MS) {
        this.resetToTitle(now);
      }
      return;
    }

    if (this.players.size === 0) {
      if (this.emptySince !== null && now - this.emptySince >= RETURN_TO_TITLE_DELAY_MS) {
        this.resetToTitle(now);
      }
      return;
    }

    if (this.gameOver) {
      if (now - this.gameOverAt >= 5000) {
        this.resetToTitle(now);
      }
      return;
    }

    this.maybeStartGame(now);
    if (!this.gameStarted) {
      return;
    }

    this.updatePlayerPowers(now);

    this.maybeSpawnEnemy(now);
    this.updateEnemies(dtFactor);

    this.maybeSpawnEnemyBullets(now);
    this.updateBullets(dtFactor);

    this.updateItem(dtFactor);
    this.handleBulletCollisions();
    this.handleEnemyBulletCollisions(now);
    this.handleEnemyTouches(now);
    this.handleItemPickup();

    // Check if stage is cleared and advance to next stage
    const stageConfig = STAGE_CONFIG[this.currentStage] || STAGE_CONFIG[1];
    
    // Check game over by time limit
    const timeRemainingMs = Math.max(0, stageConfig.timeLimitMs - (now - this.gameStartAt));
    if (timeRemainingMs <= 0 && !this.stageCleared) {
      this.gameOver = true;
      this.gameOverAt = now;
      return;
    }

    if (this.stageScore >= stageConfig.targetScore && !this.stageCleared) {
      this.stageCleared = true;
      this.nextStage(now);
    }
    this.handlePlayerDeaths(now);
  }

  maybeStartGame(now) {
    if (this.gameStarted || this.players.size === 0 || this.startCountdownAt === null) {
      return;
    }

    if (now - this.startCountdownAt >= this.startCountdownMs) {
      this.gameStarted = true;
      this.gameStartAt = now;
      this.enemies.clear();
      this.bullets.clear();
      this.itemEntity = null;
      this.enemyCounter = 0;
      this.bulletCounter = 0;
      this.itemCounter = 0;
    }
  }

  nextStage(now) {
    if (this.currentStage >= 3) {
      // 全ステージクリア: タイトルへ戻るまでのカウントダウンを開始
      this.emptySince = now;
      return;
    }
    this.currentStage += 1;
    this.stageCleared = false;
    this.enemies.clear();
    this.bullets.clear();
    this.itemEntity = null;
    this.bulletCounter = 0;
    this.itemCounter = 0;
    this.gameStartAt = now;
    this.lastEnemySpawnAt = now;
    // ステージスコアをリセット（プレイヤーの累積スコアは保持）
    this.stageScore = 0;
  }

  // ==== Payload Building (delegated) ====
  buildGameState(now) { return PayloadBuilder.buildGameState(this, now); }
  buildViewerPayload(now) { return PayloadBuilder.buildViewerPayload(this, now); }
  buildPlayerState(player, now) { return PayloadBuilder.buildPlayerState(this, player, now); }
  listPlayers() { return PayloadBuilder.listPlayers(this); }
  listPlayersRaw() { return Array.from(this.players.values()); }
  listEnemies() { return PayloadBuilder.listEnemies(this); }
  listBullets() { return PayloadBuilder.listBullets(this); }
  listItems() { return PayloadBuilder.listItems(this); }

  // ==== Score getters ====
  getTotalPlayerScore() {
    return Array.from(this.players.values()).reduce((sum, player) => sum + player.score, 0);
  }

  getStageScore() {
    return this.stageScore;
  }

  getStageNumber(totalScore, targetScore) {
    const stageTwoThreshold = Math.round(targetScore * 0.5);
    return totalScore >= stageTwoThreshold ? 2 : 1;
  }

  updatePlayerPowers(now) {
    this.players.forEach((player) => {
      player.updatePower(now, BASE_ATTACK);
      player.updateTimers(now);
    });
  }

  updateEnemies(dt) {
    const settings = DIFFICULTY_SETTINGS[this.difficulty] || DIFFICULTY_SETTINGS.normal;
    this.enemies.forEach((enemy, id) => {
      enemy.update(settings.enemySpeed * dt);
      if (enemy.y < -5) {
        this.enemies.delete(id);
      }
    });
  }

  updateBullets(dt) {
    this.bullets.forEach((bullet, id) => {
      bullet.update(dt);
      if (bullet.y > BulletEntity.MAX_Y || bullet.y < -5 || bullet.x < -BulletEntity.MAX_X || bullet.x > BulletEntity.MAX_X) {
        this.bullets.delete(id);
      }
    });
  }

  updateItem(dt) {
    if (!this.itemEntity) {
      return;
    }

    this.itemEntity.update(ItemEntity.SPEED * dt);
    if (this.itemEntity.y < -5) {
      this.itemEntity = null;
    }
  }

  handlePlayerDeaths(now) {
    for (const player of Array.from(this.players.values())) {
      if (!player.isDead()) {
        if (player.deadUntil) {
          player.deadUntil = 0;
        }
        continue;
      }

      if (this.difficulty === 'hard') {
        this.removePlayer(player.id, now);
        continue;
      }

      if (!player.deadUntil || player.deadUntil <= 0) {
        player.deadUntil = now + RESPAWN_MS;
      } else if (now >= player.deadUntil) {
        player.hp = player.maxHp;
        player.x = 0;
        player.lastControlAt = now;
        player.deadUntil = 0;
      }
    }
  }

  spawnSingleBullet(player, damage) {
    const bullet = new BulletEntity({
      id: `bullet-${this.bulletCounter++}`,
      x: player.x,
      y: 0,
      vx: 0,
      vy: BulletEntity.SPEED,
      ownerId: player.id,
      ownerType: 'player',
      damage,
    });
    this.bullets.set(bullet.id, bullet);
  }

  spawnTripleBullets(player, damage) {
    [-BulletEntity.SPREAD, 0, BulletEntity.SPREAD].forEach((vx) => {
      const bullet = new BulletEntity({
        id: `bullet-${this.bulletCounter++}`,
        x: player.x,
        y: 0,
        vx,
        vy: BulletEntity.SPEED,
        ownerId: player.id,
        ownerType: 'player',
        damage,
      });
      this.bullets.set(bullet.id, bullet);
    });
  }

  spawnItem(x, y) {
    const item = Item.random();
    this.itemEntity = new ItemEntity({
      id: `item-${this.itemCounter++}`,
      item,
      x,
      y,
    });
  }

  countBulletsByOwner(ownerId) {
    let count = 0;
    this.bullets.forEach((bullet) => {
      if (bullet.ownerId === ownerId) {
        count += 1;
      }
    });

    return count;
  }

  // ==== Spawning & Collisions (delegated) ====
  maybeSpawnEnemy(now) { SpawnSystem.maybeSpawnEnemy(this, now); }
  maybeSpawnEnemyBullets(now) { SpawnSystem.maybeSpawnEnemyBullets(this, now); }
  handleBulletCollisions() { CollisionSystem.handleBulletCollisions(this); }
  handleEnemyBulletCollisions(now) { CollisionSystem.handleEnemyBulletCollisions(this, now); }
  handleEnemyTouches(now) { CollisionSystem.handleEnemyTouches(this, now); }
  handleItemPickup() { CollisionSystem.handleItemPickup(this); }
}

export { Stage };
